# ポケモン生成機能 核心アルゴリズム実装

## 4. 核心アルゴリズム実装

### 4.1 性格値乱数列エンジン（WASM実装）

**重要**: 計算ロジックは全てWASM側で実装し、TypeScript側はフォールバック実装を行わない。

```rust
// wasm-pkg/src/personality_rng.rs
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct PersonalityRNG {
    seed: u64,
}

#[wasm_bindgen]
impl PersonalityRNG {
    #[wasm_bindgen(constructor)]
    pub fn new(initial_seed: u64) -> PersonalityRNG {
        PersonalityRNG {
            seed: initial_seed,
        }
    }
    
    // BW仕様64bit線形合同法
    // S1[n+1] = S1[n] * 0x5D588B656C078965 + 0x269EC3
    pub fn next(&mut self) -> u32 {
        self.seed = self.seed
            .wrapping_mul(0x5D588B656C078965)
            .wrapping_add(0x269EC3);
        
        // 上位32bitを返す（実際の乱数として使用）
        (self.seed >> 32) as u32
    }
    
    // シンクロ判定用: (r1[n]*2)>>32
    pub fn sync_check(&mut self) -> bool {
        let rand = self.next();
        ((rand as u64 * 2) >> 32) == 0
    }
    
    // 性格決定用: (r1[n]*25)>>32
    pub fn nature_roll(&mut self) -> u32 {
        let rand = self.next();
        ((rand as u64 * 25) >> 32) as u32
    }
    
    // 遭遇スロット決定（BW用）: (seed*0xFFFF/0x290)>>32
    pub fn encounter_slot_bw(&mut self) -> u32 {
        let rand = self.next();
        ((rand as u64 * 0xFFFF / 0x290) >> 32) as u32
    }
    
    // 遭遇スロット決定（BW2用）: (seed*100)>>32
    pub fn encounter_slot_bw2(&mut self) -> u32 {
        let rand = self.next();
        ((rand as u64 * 100) >> 32) as u32
    }
    
    #[wasm_bindgen(getter)]
    pub fn current_seed(&self) -> u64 {
        self.seed
    }
    
    #[wasm_bindgen(setter)]
    pub fn set_seed(&mut self, seed: u64) {
        self.seed = seed;
    }
}
```

### 4.2 遭遇計算エンジン（WASM実装）

```rust
// wasm-pkg/src/encounter_calculator.rs
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
#[derive(Clone, Copy)]
pub enum GameVersion {
    BlackWhite,
    BlackWhite2,
}

#[wasm_bindgen]
pub struct EncounterCalculator {
    game_version: GameVersion,
}

#[wasm_bindgen]
impl EncounterCalculator {
    #[wasm_bindgen(constructor)]
    pub fn new(game_version: GameVersion) -> EncounterCalculator {
        EncounterCalculator { game_version }
    }
    
    // 遭遇スロット計算
    pub fn calculate_encounter_slot(&self, rand_value: u32) -> u32 {
        match self.game_version {
            GameVersion::BlackWhite => {
                // BW: (rand * 0xFFFF / 0x290) >> 32
                ((rand_value as u64 * 0xFFFF / 0x290) >> 32) as u32
            },
            GameVersion::BlackWhite2 => {
                // BW2: (rand * 100) >> 32
                ((rand_value as u64 * 100) >> 32) as u32
            },
        }
    }
    
    // スロット値をテーブルインデックスに変換
    pub fn slot_to_table_index(&self, slot_value: u32, encounter_type: u32) -> usize {
        match encounter_type {
            0 => self.normal_encounter_slot(slot_value),       // 通常(草むら・洞窟・ダンジョン共通)
            1 => self.surfing_slot_to_index(slot_value),       // なみのり
            2 => self.fishing_slot_to_index(slot_value),       // 釣り
            3 => self.shaking_grass_slot(slot_value),          // 揺れる草むら (特殊エンカウント)
            4 => self.dust_cloud_slot(slot_value),             // 砂煙 (特殊エンカウント)
            5 => self.pokemon_shadow_slot(slot_value),         // ポケモンの影 (特殊エンカウント)
            6 => self.surfing_bubble_slot(slot_value),         // 水泡 (なみのり版特殊エンカウント)
            7 => self.fishing_bubble_slot(slot_value),         // 水泡釣り(釣り版特殊エンカウント)
            _ => 0, // デフォルト
        }
    }
    
    fn normal_encounter_slot(&self, slot: u32) -> usize {
        // 通常遭遇テーブル（草むら・洞窟・ダンジョン共通、12スロット）
        match slot {
            0..=19 => 0,   // 20%
            20..=39 => 1,  // 20%
            40..=49 => 2,  // 10%
            50..=59 => 3,  // 10%
            60..=69 => 4,  // 10%
            70..=79 => 5,  // 10%
            80..=84 => 6,  // 5%
            85..=89 => 7,  // 5%
            90..=94 => 8,  // 5%
            95..=98 => 9,  // 4%
            99 => 10,      // 1%
            _ => 11,       // 残り1%
        }
    }
    
    fn surfing_slot_to_index(&self, slot: u32) -> usize {
        // なみのり遭遇テーブル（5スロット）
        match slot {
            0..=59 => 0,   // 60%
            60..=89 => 1,  // 30%
            90..=94 => 2,  // 5%
            95..=98 => 3,  // 4%
            _ => 4,        // 1%
        }
    }
    
    fn fishing_slot_to_index(&self, slot: u32) -> usize {
        // 釣り遭遇テーブル（5スロット）
        match slot {
            0..=69 => 0,   // 70%
            70..=84 => 1,  // 15%
            85..=94 => 2,  // 10%
            95..=99 => 3,  // 5%
            _ => 4,        // レア
        }
    }
    
    fn shaking_grass_slot(&self, slot: u32) -> usize {
        // 揺れる草むら（特殊エンカウント）
        // 通常より高レベル・レアポケモンが出現
        match slot {
            0..=39 => 0,   // 40%
            40..=59 => 1,  // 20%
            60..=79 => 2,  // 20%
            80..=94 => 3,  // 15%
            _ => 4,        // 5% (隠れ特性持ち等)
        }
    }
    
    fn dust_cloud_slot(&self, slot: u32) -> usize {
        // 砂煙（特殊エンカウント）
        // ポケモンまたはジュエル・進化石が出現
        match slot {
            0..=69 => 0,   // 70% ポケモン
            70..=89 => 1,  // 20% ジュエル類
            _ => 2,        // 10% 進化石類
        }
    }
    
    fn pokemon_shadow_slot(&self, slot: u32) -> usize {
        // ポケモンの影（特殊エンカウント）
        // 橋や建物の影で出現
        match slot {
            0..=49 => 0,   // 50%
            50..=79 => 1,  // 30%
            80..=94 => 2,  // 15%
            _ => 3,        // 5%
        }
    }
    
    fn surfing_bubble_slot(&self, slot: u32) -> usize {
        // 水泡（なみのり版特殊エンカウント）
        // なみのりエリアでの特殊遭遇
        match slot {
            0..=49 => 0,   // 50%
            50..=79 => 1,  // 30%
            80..=94 => 2,  // 15%
            _ => 3,        // 5%
        }
    }
    
    fn fishing_bubble_slot(&self, slot: u32) -> usize {
        // 水泡釣り（釣り版特殊エンカウント）
        // 釣りエリアでの特殊遭遇
        match slot {
            0..=59 => 0,   // 60%
            60..=84 => 1,  // 25%
            85..=94 => 2,  // 10%
            _ => 3,        // 5%
        }
    }
}
```

### 4.3 オフセット計算エンジン（WASM実装）

オフセット計算は、ゲーム起動時の初期seed（S0）から各種イベント（TID/SID決定等）までの乱数消費回数を正確に計算するエンジンです。

#### 4.3.1 基本的な乱数生成エンジン

```rust
// wasm-pkg/src/offset_calculator.rs
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct OffsetCalculator {
    seed: u64,
    advances: u32,
}

#[wasm_bindgen]
impl OffsetCalculator {
    #[wasm_bindgen(constructor)]
    pub fn new(initial_seed: u64) -> OffsetCalculator {
        OffsetCalculator {
            seed: initial_seed,
            advances: 0,
        }
    }
    
    // BW仕様64bit線形合同法
    // S[n+1] = (S[n] * 0x5D588B656C078965 + 0x269EC3) mod 2^64
    pub fn next_seed(&mut self) -> u32 {
        self.seed = self.seed
            .wrapping_mul(0x5D588B656C078965)
            .wrapping_add(0x269EC3);
        self.advances += 1;
        
        // 上位32bitを乱数値として返す
        (self.seed >> 32) as u32
    }
    
    #[wasm_bindgen(getter)]
    pub fn current_seed(&self) -> u64 {
        self.seed
    }
    
    #[wasm_bindgen(getter)]
    pub fn advances(&self) -> u32 {
        self.advances
    }
    
    #[wasm_bindgen(setter)]
    pub fn set_seed(&mut self, seed: u64) {
        self.seed = seed;
    }
    
    // Rand×n回の乱数消費
    pub fn consume_random(&mut self, count: u32) {
        for _ in 0..count {
            self.next_seed();
        }
    }
}
```

#### 4.3.2 Probability Table (PT) 操作エンジン

```rust
// PT操作の6段階テーブル定義
const PT_TABLES: [[u32; 5]; 6] = [
    [50, 100, 100, 100, 100],  // L1
    [50, 50, 100, 100, 100],   // L2
    [30, 50, 100, 100, 100],   // L3
    [25, 30, 50, 100, 100],    // L4
    [20, 25, 33, 50, 100],     // L5
    [100, 100, 100, 100, 100], // L6
];

#[wasm_bindgen]
impl OffsetCalculator {
    // PT操作×1回
    pub fn probability_table_process(&mut self) {
        for level in 0..6 {  // L1からL6まで
            for j in 0..5 {   // 各レベルで最大5つの閾値をチェック
                if PT_TABLES[level][j] == 100 {
                    // 確率が100なら、次のレベルへ
                    break;
                }
                
                let rand_value = self.next_seed();
                let r = ((rand_value as u64 * 101) >> 32) as u32;
                
                if r <= PT_TABLES[level][j] {
                    // 取得した確率がテーブルの値以下なら次のレベルへ
                    break;
                }
            }
        }
    }
    
    // PT操作×n回
    pub fn probability_table_process_multiple(&mut self, count: u32) {
        for _ in 0..count {
            self.probability_table_process();
        }
    }
}
```

#### 4.3.3 TID/SID決定処理

```rust
#[wasm_bindgen]
pub struct TidSidResult {
    pub tid: u16,
    pub sid: u16,
    pub advances_used: u32,
}

#[wasm_bindgen]
impl OffsetCalculator {
    // TID/SID決定
    pub fn calculate_tid_sid(&mut self) -> TidSidResult {
        let initial_advances = self.advances;
        let rand_value = self.next_seed();
        
        // (R * 0xFFFFFFFF) >> 32 の計算
        let tid_sid_combined = ((rand_value as u64 * 0xFFFFFFFF) >> 32) as u32;
        let tid = (tid_sid_combined & 0xFFFF) as u16;
        let sid = ((tid_sid_combined >> 16) & 0xFFFF) as u16;
        
        TidSidResult {
            tid,
            sid,
            advances_used: self.advances - initial_advances,
        }
    }
}
```

#### 4.3.4 ブラックシティ/ホワイトフォレスト住人決定

```rust
#[wasm_bindgen]
impl OffsetCalculator {
    // 表住人決定（10回の乱数消費）
    pub fn determine_front_residents(&mut self) {
        for _ in 0..10 {
            self.next_seed();
        }
    }
    
    // 裏住人決定（3回の乱数消費）
    pub fn determine_back_residents(&mut self) {
        for _ in 0..3 {
            self.next_seed();
        }
    }
    
    // 住人決定一括処理（BWのみ）
    pub fn determine_all_residents(&mut self) {
        self.determine_front_residents();  // 表住人10回
        self.determine_back_residents();   // 裏住人3回
    }
}
```

#### 4.3.5 Extra処理（BW2専用）

```rust
#[wasm_bindgen]
impl OffsetCalculator {
    // Extra処理（BW2の「続きから始める」でのみ使用）
    pub fn extra_process(&mut self) {
        loop {
            // 3つの値を生成
            let r1 = self.next_seed();
            let value1 = ((r1 as u64 * 15) >> 32) as u32;
            
            let r2 = self.next_seed();
            let value2 = ((r2 as u64 * 15) >> 32) as u32;
            
            let r3 = self.next_seed();
            let value3 = ((r3 as u64 * 15) >> 32) as u32;
            
            // 3つとも異なるかチェック
            if value1 != value2 && value2 != value3 && value3 != value1 {
                break;
            }
            // 同じ値が含まれている場合は継続
        }
    }
}
```

#### 4.3.6 ゲームバージョン・開始方式別オフセット計算

```rust
#[wasm_bindgen]
#[derive(Clone, Copy)]
pub enum GameMode {
    BwNewGameWithSave,      // BW 始めから（セーブ有り）
    BwNewGameNoSave,        // BW 始めから（セーブ無し）
    BwContinue,             // BW 続きから
    Bw2NewGameWithMemoryLinkSave,    // BW2 始めから（思い出リンク済みセーブ有り）
    Bw2NewGameNoMemoryLinkSave,      // BW2 始めから（思い出リンク無しセーブ有り）
    Bw2NewGameNoSave,               // BW2 始めから（セーブ無し）
    Bw2ContinueWithMemoryLink,      // BW2 続きから（思い出リンク済み）
    Bw2ContinueNoMemoryLink,        // BW2 続きから（思い出リンク無し）
}

#[wasm_bindgen]
impl OffsetCalculator {
    // ゲームモード別オフセット計算
    pub fn calculate_offset(&mut self, mode: GameMode) -> u32 {
        let initial_advances = self.advances;
        
        match mode {
            GameMode::BwNewGameWithSave => {
                // BW 始めから（セーブ有り）
                self.consume_random(1);                    // Rand×1
                self.probability_table_process_multiple(2); // PT×2
                self.generate_chiramii_pid();              // チラーミィPID決定
                self.generate_chiramii_id();               // チラーミィID決定
                self.calculate_tid_sid();                  // TID/SID決定
                self.probability_table_process_multiple(4); // PT×4
                self.determine_all_residents();            // 住人決定13回
            },
            
            GameMode::BwNewGameNoSave => {
                // BW 始めから（セーブ無し）
                self.consume_random(1);                    // Rand×1
                self.probability_table_process_multiple(3); // PT×3
                self.generate_chiramii_pid();              // チラーミィPID決定
                self.generate_chiramii_id();               // チラーミィID決定
                self.calculate_tid_sid();                  // TID/SID決定
                self.consume_random(1);                    // Rand×1
                self.probability_table_process_multiple(4); // PT×4
                self.determine_all_residents();            // 住人決定13回
            },
            
            GameMode::BwContinue => {
                // BW 続きから
                self.consume_random(1);                    // Rand×1
                self.probability_table_process_multiple(5); // PT×5
            },
            
            GameMode::Bw2NewGameWithMemoryLinkSave => {
                // BW2 始めから（思い出リンク済みセーブ有り）
                self.consume_random(1);                    // Rand×1
                self.probability_table_process_multiple(1); // PT×1
                self.consume_random(2);                    // Rand×2
                self.probability_table_process_multiple(1); // PT×1
                self.consume_random(2);                    // Rand×2
                self.generate_chirachino_pid();            // チラチーノPID決定
                self.generate_chirachino_id();             // チラチーノID決定
                self.calculate_tid_sid();                  // TID/SID決定
            },
            
            GameMode::Bw2NewGameNoMemoryLinkSave => {
                // BW2 始めから（思い出リンク無しセーブ有り）
                self.consume_random(1);                    // Rand×1
                self.probability_table_process_multiple(1); // PT×1
                self.consume_random(3);                    // Rand×3
                self.probability_table_process_multiple(1); // PT×1
                self.consume_random(2);                    // Rand×2
                self.generate_chirachino_pid();            // チラチーノPID決定
                self.generate_chirachino_id();             // チラチーノID決定
                self.calculate_tid_sid();                  // TID/SID決定
            },
            
            GameMode::Bw2NewGameNoSave => {
                // BW2 始めから（セーブ無し）
                self.consume_random(1);                    // Rand×1
                self.probability_table_process_multiple(1); // PT×1
                self.consume_random(2);                    // Rand×2
                self.probability_table_process_multiple(1); // PT×1
                self.consume_random(4);                    // Rand×4
                self.probability_table_process_multiple(1); // PT×1
                self.consume_random(2);                    // Rand×2
                self.generate_chirachino_pid();            // チラチーノPID決定
                self.generate_chirachino_id();             // チラチーノID決定
                self.calculate_tid_sid();                  // TID/SID決定
            },
            
            GameMode::Bw2ContinueWithMemoryLink => {
                // BW2 続きから（思い出リンク済み）
                self.consume_random(1);                    // Rand×1
                self.probability_table_process_multiple(1); // PT×1
                self.consume_random(2);                    // Rand×2
                self.probability_table_process_multiple(4); // PT×4
                self.extra_process();                      // Extra処理
            },
            
            GameMode::Bw2ContinueNoMemoryLink => {
                // BW2 続きから（思い出リンク無し）
                self.consume_random(1);                    // Rand×1
                self.probability_table_process_multiple(1); // PT×1
                self.consume_random(3);                    // Rand×3
                self.probability_table_process_multiple(4); // PT×4
                self.extra_process();                      // Extra処理
            },
        }
        
        self.advances - initial_advances
    }
    
    // チラーミィPID決定
    fn generate_chiramii_pid(&mut self) -> u32 {
        let rand_value = self.next_seed();
        // BWではxor 0x00010000の分岐あり（実装詳細は要確認）
        rand_value
    }
    
    // チラーミィID決定（0固定）
    fn generate_chiramii_id(&mut self) -> u32 {
        self.next_seed(); // 乱数消費はあるが結果は0固定
        0
    }
    
    // チラチーノPID決定（BW2）
    fn generate_chirachino_pid(&mut self) -> u32 {
        let rand_value = self.next_seed();
        rand_value
    }
    
    // チラチーノID決定（BW2）
    fn generate_chirachino_id(&mut self) -> u32 {
        self.next_seed(); // 乱数消費はあるが結果は0固定
        0
    }
}
```

#### 4.3.7 オフセット計算統合API

```rust
#[wasm_bindgen]
pub fn calculate_game_offset(initial_seed: u64, mode: GameMode) -> u32 {
    let mut calculator = OffsetCalculator::new(initial_seed);
    calculator.calculate_offset(mode)
}

#[wasm_bindgen]
pub fn calculate_tid_sid_from_seed(initial_seed: u64, mode: GameMode) -> TidSidResult {
    let mut calculator = OffsetCalculator::new(initial_seed);
    
    // 指定されたモードでTID/SID決定直前まで進める
    match mode {
        GameMode::BwNewGameWithSave => {
            calculator.consume_random(1);
            calculator.probability_table_process_multiple(2);
            calculator.generate_chiramii_pid();
            calculator.generate_chiramii_id();
        },
        GameMode::BwNewGameNoSave => {
            calculator.consume_random(1);
            calculator.probability_table_process_multiple(3);
            calculator.generate_chiramii_pid();
            calculator.generate_chiramii_id();
        },
        // BW2の各パターンも同様に実装
        _ => {
            // 他のモードは「続きから」なのでTID/SID決定なし
            return TidSidResult { tid: 0, sid: 0, advances_used: 0 };
        }
    }
    
    // TID/SID決定を実行
    calculator.calculate_tid_sid()
}
```

### 4.5 ポケモンデータ構造（WASM実装）

```rust
// wasm-pkg/src/pokemon_data.rs
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
#[derive(Debug, Clone)]
pub struct RawPokemonData {
    pub personality_value: u32,     // 性格値（PID）
    pub encounter_slot_value: u32,  // 遭遇スロット値
    pub nature_id: u32,             // 性格ID
    pub sync_applied: bool,         // シンクロ適用フラグ
    pub advances: u32,              // 進行度（乱数消費回数）
    pub level_rand_value: u32,      // 生のレベル乱数値（TypeScript側でレベル計算に使用）
    pub shiny_flag: bool,           // 色違いフラグ
    pub ability_slot: u32,          // 特性スロット
    pub gender_value: u8,           // 性別判定値
    pub rng_seed_used: u64,         // 使用された乱数シード
    pub encounter_type: u32,        // エンカウントタイプ
}
```

### 4.6 統合Pokemon Generator（WASM実装）

```rust
// wasm-pkg/src/pokemon_generator.rs
use wasm_bindgen::prelude::*;
use crate::personality_rng::PersonalityRNG;
use crate::encounter_calculator::{EncounterCalculator, GameVersion};
use crate::pokemon_data::RawPokemonData;

#[wasm_bindgen]
pub struct PokemonGenerator {
    rng: PersonalityRNG,
    encounter_calc: EncounterCalculator,
    game_version: GameVersion,
}

#[wasm_bindgen]
impl PokemonGenerator {
    #[wasm_bindgen(constructor)]
    pub fn new(initial_seed: u64, game_version: GameVersion) -> PokemonGenerator {
        PokemonGenerator {
            rng: PersonalityRNG::new(initial_seed),
            encounter_calc: EncounterCalculator::new(game_version),
            game_version,
        }
    }
    
    // メイン生成メソッド
    pub fn generate_pokemon_batch(
        &mut self,
        count: u32,
        encounter_type: u32,
        sync_enabled: bool,
        sync_nature_id: u32,
        trainer_id: u16,
        secret_id: u16,
    ) -> Vec<RawPokemonData> {
        let mut results = Vec::new();
        
        for advances in 0..count {
            if let Some(pokemon) = self.generate_single_pokemon(
                encounter_type,
                sync_enabled,
                sync_nature_id,
                trainer_id,
                secret_id,
                advances,
            ) {
                results.push(pokemon);
            }
        }
        
        results
    }
    
    fn generate_single_pokemon(
        &mut self,
        encounter_type: u32,
        sync_enabled: bool,
        sync_nature_id: u32,
        trainer_id: u16,
        secret_id: u16,
        advances: u32,
    ) -> Option<RawPokemonData> {
        let start_seed = self.rng.current_seed();
        
        // Step 1: シンクロ判定（野生エンカウントのみ）
        let (sync_applied, nature_id) = if encounter_type <= 7 {
            // 通常・なみのり・釣り・特殊エンカウント全般
            let sync_check = sync_enabled && self.rng.sync_check();
            if sync_check {
                (true, sync_nature_id)
            } else {
                (false, self.rng.nature_roll())
            }
        } else {
            // 固定シンボル・ギフト・徘徊ポケモンはシンクロ無効
            (false, self.rng.nature_roll())
        };
        
        // Step 2: 遭遇スロット決定
        let encounter_slot_value = match self.game_version {
            GameVersion::BlackWhite => self.rng.encounter_slot_bw(),
            GameVersion::BlackWhite2 => self.rng.encounter_slot_bw2(),
        };
        
        // Step 3: 性格値決定
        let personality_value = match encounter_type {
            0..=7 => {
                // 野生エンカウント（通常・特殊含む）: r1[n+1]^0x00010000
                let pid_base = self.rng.next();
                pid_base ^ 0x00010000
            },
            10..=11 => {
                // 固定シンボル・ギフト: r1[n] (XOR無し)
                self.rng.next()
            },
            20 => {
                // 徘徊ポケモン: r1[n] (XOR無し、固定シンボルと同様)
                self.rng.next()
            },
            _ => return None, // 未対応のエンカウントタイプ
        };
        
        // Step 4: レベル決定（乱数値保持、実際のレベル計算はTypeScript側で実行）
        let (level, level_rand) = self.calculate_level_with_rand(encounter_slot_value, encounter_type);
        
        // Step 5: 色違い判定
        let shiny_flag = self.check_shiny(personality_value, trainer_id, secret_id);
        
        // Step 6: 特性スロット決定
        let ability_slot = if (personality_value >> 16) & 1 == 0 { 1 } else { 2 };
        
        // Step 7: 性別判定値
        let gender_value = (personality_value & 0xFF) as u8;
        
        Some(RawPokemonData {
            personality_value, // 性格値（PID）
            encounter_slot_value, // 遭遇スロット値
            nature_id, // 性格ID
            sync_applied, // シンクロ適用フラグ
            advances, // 進行度（乱数消費回数）
            level_rand_value: level_rand, // 生のレベル乱数値（TypeScript側でレベル計算に使用）
            shiny_flag, // 色違いフラグ
            ability_slot, // 特性スロット
            gender_value, // 性別判定値
            rng_seed_used: start_seed, 
            encounter_type, 
        })
    }
    
    fn calculate_level_with_rand(&mut self, slot_value: u32, encounter_type: u32) -> (u8, u32) {
        // エンカウントタイプ別レベル決定とレベル乱数値の取得
        // 戻り値: (プレースホルダーレベル, 生の乱数値)
        match encounter_type {
            0 => {
                // 通常(草むら・洞窟・ダンジョン共通)：エンカウントテーブルに固定レベル埋め込み
                // レベル乱数生成は実行されるが結果は使用されない（スキップ扱い）
                let level_rand = self.rng.next(); // 乱数消費
                (127, level_rand) // 127はプレースホルダー、実際のレベルはエンカウントテーブルから決定
            },
            1 | 2 | 6 | 7 => {
                // なみのり・釣り・水泡系：レベル範囲からランダム選択
                // 生の乱数値をTypeScript側でエンカウントテーブル情報と組み合わせて計算
                let level_rand = self.rng.next();
                (0, level_rand) // 0はプレースホルダー、実際の計算はTypeScript側で実行
            },
            3 | 4 | 5 => {
                // 特殊エンカウント：エンカウントテーブルに固定レベル埋め込み
                // レベル乱数生成は実行されるが結果は使用されない（スキップ扱い）
                let level_rand = self.rng.next(); // 乱数消費
                (127, level_rand) // 127はプレースホルダー
            },
            10..=11 => {
                // 固定シンボル・ギフト：固定レベル（乱数消費なし）
                (255, 0) // 乱数消費なし、255は固定レベルのプレースホルダー
            },
            20 => {
                // 徘徊ポケモン：イベント発生時に個体決定、固定レベル（乱数消費なし）
                (255, 0) // 徘徊専用プレースホルダー、実際のレベルは固定
            },
            _ => (0, 0), // 未対応タイプ
        }
    }
    
    fn check_shiny(&self, pid: u32, trainer_id: u16, secret_id: u16) -> bool {
        let pid_high = (pid >> 16) as u16;
        let pid_low = (pid & 0xFFFF) as u16;
        let shiny_value = trainer_id ^ secret_id ^ pid_high ^ pid_low;
        shiny_value < 8
    }
    
    #[wasm_bindgen(getter)]
    pub fn current_seed(&self) -> u64 {
        self.rng.current_seed()
    }
    
    #[wasm_bindgen(setter)]
    pub fn set_seed(&mut self, seed: u64) {
        self.rng.set_seed(seed);
    }
}
```

## 5. 性格値・色違い判定の詳細実装

### 5.1 性格値（PID）生成の正確な仕様

BW/BW2では遭遇タイプによって性格値の生成アルゴリズムが異なる：

- **野生エンカウント（0-7）**: 通常・なみのり・釣り・特殊エンカウント全般
  - 通常（草むら・洞窟・ダンジョン共通）
  - なみのり
  - 釣り  
  - 揺れる草むら（特殊エンカウント）
  - 砂煙（特殊エンカウント）
  - ポケモンの影（特殊エンカウント）
  - 水泡（なみのり版特殊エンカウント）
  - 水泡釣り（釣り版特殊エンカウント）
- **固定シンボル・ギフト（10-11）**: 固定位置・イベントポケモン
- **徘徊ポケモン（20）**: イベント発生時に個体決定、陸上・海上統合

```rust
// wasm-pkg/src/pid_calculator.rs
use wasm_bindgen::prelude::*;
use crate::personality_rng::PersonalityRNG;

#[wasm_bindgen]
pub struct PIDCalculator {
    rng: PersonalityRNG,
}

#[wasm_bindgen]
impl PIDCalculator {
    #[wasm_bindgen(constructor)]
    pub fn new(seed: u64) -> PIDCalculator {
        PIDCalculator {
            rng: PersonalityRNG::new(seed),
        }
    }
    
    // 野生エンカウント全般（0-7）: PID = r1[n+1] ^ 0x00010000
    // 通常・なみのり・釣り・特殊エンカウント全て同じ処理
    pub fn generate_wild_pid(&mut self) -> u32 {
        let base_pid = self.rng.next();
        base_pid ^ 0x00010000
    }
    
    // 固定シンボル・ギフト（10-11）: PID = r1[n] (XOR処理無し)
    pub fn generate_static_pid(&mut self) -> u32 {
        self.rng.next()
    }
    
    // 徘徊ポケモン（20）: PID = r1[n] (XOR処理無し、固定シンボルと同様)
    // イベント発生時に個体決定され、以降の遭遇では同じ個体が出現
    pub fn generate_roaming_pid(&mut self) -> u32 {
        self.rng.next()
    }
}

#[wasm_bindgen]
pub struct ShinyChecker;

#[wasm_bindgen]
impl ShinyChecker {
    // 色違い判定: (TID ^ SID ^ PID_high ^ PID_low) < threshold
    pub fn is_shiny(pid: u32, trainer_id: u16, secret_id: u16) -> bool {
        Self::get_shiny_value(pid, trainer_id, secret_id) < 8
    }
    
    // 色違い値計算
    pub fn get_shiny_value(pid: u32, trainer_id: u16, secret_id: u16) -> u16 {
        let pid_high = (pid >> 16) as u16;
        let pid_low = (pid & 0xFFFF) as u16;
        trainer_id ^ secret_id ^ pid_high ^ pid_low
    }
    
    // 色違いタイプ判定（正方形・星型）
    pub fn get_shiny_type(pid: u32, trainer_id: u16, secret_id: u16) -> u32 {
        let shiny_value = Self::get_shiny_value(pid, trainer_id, secret_id);
        if shiny_value < 8 {
            if shiny_value == 0 { 1 } else { 0 } // 0=星型, 1=正方形
        } else {
            2 // 通常色
        }
    }
    
    // 国際孵化での色違い判定（参考）
    pub fn is_shiny_international(pid: u32, trainer_id: u16, secret_id: u16) -> bool {
        Self::get_shiny_value(pid, trainer_id, secret_id) < 6
    }
}
```

### 5.2 遭遇タイプ別PID生成パターン

```rust
// wasm-pkg/src/encounter_patterns.rs
use wasm_bindgen::prelude::*;
use crate::personality_rng::PersonalityRNG;
use crate::pid_calculator::{PIDCalculator, ShinyChecker};

#[wasm_bindgen]
#[derive(Clone, Copy)]
pub enum EncounterType {
    Normal = 0,              // 通常(草むら・洞窟・ダンジョン共通)
    Surfing = 1,             // なみのり
    Fishing = 2,             // 釣り
    ShakingGrass = 3,        // 揺れる草むら (特殊エンカウント)
    DustCloud = 4,           // 砂煙 (特殊エンカウント)
    PokemonShadow = 5,       // ポケモンの影 (特殊エンカウント)
    SurfingBubble = 6,       // 水泡 (なみのり版特殊エンカウント)
    FishingBubble = 7,       // 水泡釣り(釣り版特殊エンカウント)
    StaticSymbol = 10,       // 固定シンボル
    StaticGift = 11,         // ギフト（化石等）
    Roaming = 20,            // 徘徊（陸上・海上統合）
}

#[wasm_bindgen]
pub struct EncounterPatternEngine {
    rng: PersonalityRNG,
    pid_calc: PIDCalculator,
}

#[wasm_bindgen]
impl EncounterPatternEngine {
    #[wasm_bindgen(constructor)]
    pub fn new(seed: u64) -> EncounterPatternEngine {
        EncounterPatternEngine {
            rng: PersonalityRNG::new(seed),
            pid_calc: PIDCalculator::new(seed),
        }
    }
    
    // 遭遇パターン別の完全な乱数消費パターン
    pub fn process_encounter(
        &mut self,
        encounter_type: EncounterType,
        sync_enabled: bool,
        sync_nature: u32,
        trainer_id: u16,
        secret_id: u16,
    ) -> EncounterResult {
        
        let mut advances = 0;
        let start_seed = self.rng.current_seed();
        
        match encounter_type {
            EncounterType::WildGrass | EncounterType::WildSurf | 
            EncounterType::WildFish | EncounterType::WildCave => {
                self.process_wild_encounter(sync_enabled, sync_nature, trainer_id, secret_id)
            },
            
            EncounterType::StaticSymbol => {
                self.process_static_encounter(sync_enabled, sync_nature, trainer_id, secret_id)
            },
            
            EncounterType::RoamingLand | EncounterType::RoamingSea => {
                self.process_roaming_encounter(trainer_id, secret_id)
            },
            
            _ => EncounterResult::default(),
        }
    }
    
    fn process_wild_encounter(
        &mut self,
        sync_enabled: bool,
        sync_nature: u32,
        trainer_id: u16,
        secret_id: u16,
    ) -> EncounterResult {
        let mut result = EncounterResult::default();
        
        // Step 1: シンクロ判定 (r1[n])
        let sync_success = if sync_enabled {
            self.rng.sync_check()
        } else {
            false
        };
        result.advances += 1;
        
        // Step 2: 性格決定 (r1[n+1] or 固定)
        let nature_id = if sync_success {
            sync_nature
        } else {
            let nature = self.rng.nature_roll();
            result.advances += 1;
            nature
        };
        
        // Step 3: 遭遇スロット (r1[n+2])
        let encounter_slot = self.rng.encounter_slot_bw();
        result.advances += 1;
        
        // Step 4: レベル乱数 (r1[n+3], 範囲がある場合のみ)
        let level_rand = self.rng.next();
        result.advances += 1;
        
        // Step 5: 性格値生成 (r1[n+4])
        let pid = self.pid_calc.generate_wild_pid();
        result.advances += 1;
        
        // Step 6: 色違い判定
        let is_shiny = ShinyChecker::is_shiny(pid, trainer_id, secret_id);
        
        result.personality_value = pid;
        result.nature_id = nature_id;
        result.encounter_slot = encounter_slot;
        result.sync_applied = sync_success;
        result.is_shiny = is_shiny;
        
        result
    }
    
    fn process_static_encounter(
        &mut self,
        sync_enabled: bool,
        sync_nature: u32,
        trainer_id: u16,
        secret_id: u16,
    ) -> EncounterResult {
        // 固定シンボルは野生と同じパターン（遭遇スロット無し）
        let mut result = EncounterResult::default();
        
        // Step 1: シンクロ判定
        let sync_success = if sync_enabled {
            self.rng.sync_check()
        } else {
            false
        };
        result.advances += 1;
        
        // Step 2: 性格決定
        let nature_id = if sync_success {
            sync_nature
        } else {
            let nature = self.rng.nature_roll();
            result.advances += 1;
            nature
        };
        
        // Step 3: 性格値生成
        let pid = self.pid_calc.generate_static_pid();
        result.advances += 1;
        
        // 色違い判定
        let is_shiny = ShinyChecker::is_shiny(pid, trainer_id, secret_id);
        
        result.personality_value = pid;
        result.nature_id = nature_id;
        result.sync_applied = sync_success;
        result.is_shiny = is_shiny;
        result.encounter_slot = 0; // 固定シンボルはスロット概念なし
        
        result
    }
    
    fn process_roaming_encounter(
        &mut self,
        trainer_id: u16,
        secret_id: u16,
    ) -> EncounterResult {
        // 徘徊ポケモンは性格のみ先決定、PIDは遭遇時決定
        let mut result = EncounterResult::default();
        
        // Step 1: 性格決定（シンクロ無効）
        let nature_id = self.rng.nature_roll();
        result.advances += 1;
        
        // Step 2: 性格値生成（遭遇時）
        let pid = self.pid_calc.generate_roaming_pid();
        result.advances += 1;
        
        // 色違い判定
        let is_shiny = ShinyChecker::is_shiny(pid, trainer_id, secret_id);
        
        result.personality_value = pid;
        result.nature_id = nature_id;
        result.sync_applied = false; // 徘徊はシンクロ無効
        result.is_shiny = is_shiny;
        result.encounter_slot = 0;
        
        result
    }
}

#[wasm_bindgen]
#[derive(Default)]
pub struct EncounterResult {
    pub personality_value: u32,
    pub nature_id: u32,
    pub encounter_slot: u32,
    pub sync_applied: bool,
    pub is_shiny: bool,
    pub advances: u32,
}
```

## 6. 特殊エンカウントの詳細仕様

### 6.1 特殊エンカウントの種類と特徴

BW/BW2では通常の野生エンカウントに加えて、特殊条件で発生するエンカウントが存在する：

**揺れる草むら（ShakingGrass）**
- 通常の草むらより高レベルのポケモンが出現
- 隠れ特性を持つポケモンの出現率が高い
- レベル範囲: 35-50（通常草むらより約10-15レベル高い）

**砂煙（DustCloud）**
- ポケモンだけでなくジュエルや進化石も出現する可能性
- 出現内容の判定は性格値乱数で決定
- ドリュウズなど特定ポケモンの出現場所として重要

**ポケモンの影（PokemonShadow）**
- 橋や建物の影の下で発生
- エリア固有のポケモンが出現
- 通常エンカウントでは出現しないポケモンが含まれる場合

**水泡（SurfingBubble/FishingBubble）**
- なみのりエリア・釣りエリアでの特殊エンカウント
- 水上・水中での特殊条件で発生
- 通常の水上エンカウントより高レベル・レアポケモン

### 6.2 特殊エンカウントの乱数消費パターン

特殊エンカウントは通常エンカウントと同じ乱数消費パターンを使用：

```rust
// 特殊エンカウント共通処理
pub fn process_special_encounter(&mut self, encounter_type: u32) -> EncounterResult {
    // Step 1: シンクロ判定
    let sync_check = self.rng.sync_check(); // r1[n] 消費
    
    // Step 2: 性格決定
    let nature_id = if sync_check && sync_enabled {
        sync_nature_id // シンクロ成功
    } else {
        self.rng.nature_roll() // r1[n+1] 消費
    };
    
    // Step 3: 遭遇スロット決定
    let slot_value = match self.game_version {
        GameVersion::BlackWhite => self.rng.encounter_slot_bw(),   // r1[n+2] 消費
        GameVersion::BlackWhite2 => self.rng.encounter_slot_bw2(), // r1[n+2] 消費
    };
    
    // Step 4: レベル乱数生成（エンカウントタイプ依存）
    let level_rand = match encounter_type {
        0 | 3..=5 => {
            // 通常・特殊エンカウント: エンカウントテーブルに固定レベル埋め込み
            // 乱数は生成されるが結果は使用されない（スキップ扱い）
            self.rng.next() // r1[n+3] 消費（スキップ）
        },
        1 | 2 | 6 | 7 => {
            // なみのり・釣り・水泡系: レベル範囲からランダム選択
            self.rng.next() // r1[n+3] 消費（実際のレベル計算はTypeScript側）
        },
        _ => 0, // 固定シンボル等は乱数消費なし
    };
    
    // Step 5: 性格値生成（特殊エンカウントも野生扱い）
    let pid = self.rng.next() ^ 0x00010000; // r1[n+4] 消費
    
    // 生の乱数値をTypeScript側に渡して詳細計算を実行
}
```

### 6.3 レベル計算の実装方針

**WASM側（Rust）**:
- 乱数消費の管理のみ実行
- エンカウントタイプに応じて乱数を生成またはスキップ
- 生の乱数値をTypeScript側に渡す

**TypeScript側**:
- エンカウントテーブル情報の保持
- 生の乱数値とエンカウントテーブルを組み合わせてレベル計算
- エリア・バージョン・釣り竿タイプ等の詳細条件を考慮

### 6.4 実装上の注意点

- 特殊エンカウントは基本的に野生エンカウントと同じ乱数消費パターン
- 遭遇スロットテーブルのみが通常エンカウントと異なる
- レベル計算は実際のエンカウントテーブル情報が必要なためTypeScript側で実行
- 通常・特殊エンカウントではレベル乱数は生成されるがスキップ扱い
- なみのり・釣り・水泡系でのみレベル乱数値が実際に使用される
- 砂煙でのアイテム出現判定は別途実装が必要
```

---

**作成日**: 2025年8月3日  
**バージョン**: 1.0  
**作成者**: GitHub Copilot  
**依存**: pokemon-generation-feature-spec.md, pokemon-data-specification.md

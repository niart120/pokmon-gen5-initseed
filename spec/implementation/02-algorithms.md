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
            0 => self.grass_slot_to_index(slot_value),     // 草むら
            1 => self.surfing_slot_to_index(slot_value),   // なみのり  
            2 => self.fishing_slot_to_index(slot_value),   // つり
            3 => self.cave_slot_to_index(slot_value),      // 洞窟
            _ => 0, // デフォルト
        }
    }
    
    fn grass_slot_to_index(&self, slot: u32) -> usize {
        // 草むら遭遇テーブル（12スロット）
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
        // つり遭遇テーブル（5スロット）
        match slot {
            0..=69 => 0,   // 70%
            70..=84 => 1,  // 15%
            85..=94 => 2,  // 10%
            95..=99 => 3,  // 5%
            _ => 4,        // レア
        }
    }
    
    fn cave_slot_to_index(&self, slot: u32) -> usize {
        // 洞窟遭遇テーブル（12スロット、草むらと同様）
        self.grass_slot_to_index(slot)
    }
}
```

### 4.3 統合Pokemon Generator（WASM実装）

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
        
        // Step 1: シンクロ判定（固定シンボル・野生のみ）
        let (sync_applied, nature_id) = if encounter_type <= 1 {
            let sync_check = sync_enabled && self.rng.sync_check();
            if sync_check {
                (true, sync_nature_id)
            } else {
                (false, self.rng.nature_roll())
            }
        } else {
            // 徘徊ポケモンはシンクロ無効
            (false, self.rng.nature_roll())
        };
        
        // Step 2: 遭遇スロット決定
        let encounter_slot_value = match self.game_version {
            GameVersion::BlackWhite => self.rng.encounter_slot_bw(),
            GameVersion::BlackWhite2 => self.rng.encounter_slot_bw2(),
        };
        
        // Step 3: 性格値決定
        let personality_value = match encounter_type {
            0 | 1 => {
                // 野生・固定シンボル: r1[n+1]^0x00010000
                let pid_base = self.rng.next();
                pid_base ^ 0x00010000
            },
            2 => {
                // 徘徊ポケモン: r1[n] (XOR無し)
                self.rng.next()
            },
            _ => return None, // 未対応のエンカウントタイプ
        };
        
        // Step 4: レベル決定（簡易実装、実際は遭遇テーブル依存）
        let level = self.calculate_level(encounter_slot_value, encounter_type);
        
        // Step 5: 色違い判定
        let shiny_flag = self.check_shiny(personality_value, trainer_id, secret_id);
        
        // Step 6: 特性スロット決定
        let ability_slot = if (personality_value >> 16) & 1 == 0 { 1 } else { 2 };
        
        // Step 7: 性別判定値
        let gender_value = (personality_value & 0xFF) as u8;
        
        Some(RawPokemonData {
            personality_value,
            encounter_slot_value,
            nature_id,
            sync_applied,
            advances,
            level,
            shiny_flag,
            ability_slot,
            gender_value,
            rng_seed_used: start_seed,
            encounter_type,
        })
    }
    
    fn calculate_level(&mut self, slot_value: u32, encounter_type: u32) -> u8 {
        // 簡易実装：実際はエンカウントテーブルとレベル範囲に依存
        match encounter_type {
            0 => 25, // 草むら：固定レベル例
            1 => {
                // なみのり：レベル範囲からランダム選択
                let level_rand = self.rng.next();
                let min_lv = 25;
                let max_lv = 35;
                ((level_rand as u64 * (max_lv - min_lv + 1) as u64) >> 32) as u8 + min_lv
            },
            2 => 30, // 徘徊：固定レベル
            _ => 25,
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
    
    // 野生ポケモン: PID = r1[n+1] ^ 0x00010000
    pub fn generate_wild_pid(&mut self) -> u32 {
        let base_pid = self.rng.next();
        base_pid ^ 0x00010000
    }
    
    // 固定シンボル: PID = r1[n+1] ^ 0x00010000
    pub fn generate_static_pid(&mut self) -> u32 {
        let base_pid = self.rng.next();
        base_pid ^ 0x00010000
    }
    
    // 徘徊ポケモン: PID = r1[n] (XOR処理無し)
    pub fn generate_roaming_pid(&mut self) -> u32 {
        self.rng.next()
    }
    
    // ギフトポケモン（卵等）: PID = r1[n+1] ^ r1[n+2]
    pub fn generate_gift_pid(&mut self) -> u32 {
        let pid_low = self.rng.next();
        let pid_high = self.rng.next();
        ((pid_high as u64) << 32 | pid_low as u64) as u32
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
    WildGrass = 0,      // 草むら野生
    WildSurf = 1,       // なみのり野生
    WildFish = 2,       // つり野生
    WildCave = 3,       // 洞窟野生
    StaticSymbol = 10,  // 固定シンボル
    StaticGift = 11,    // ギフト（化石等）
    RoamingLand = 20,   // 徘徊（陸上）
    RoamingSea = 21,    // 徘徊（海上）
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

---

**作成日**: 2025年8月3日  
**バージョン**: 1.0  
**作成者**: GitHub Copilot  
**依存**: pokemon-generation-feature-spec.md, pokemon-data-specification.md

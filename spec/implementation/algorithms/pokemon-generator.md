# ポケモンデータ構造と統合Generator（WASM実装）

## ポケモンデータ構造

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

## 統合Pokemon Generator

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

## 主要な処理フロー

### 1. シンクロ判定
- 野生エンカウント（0-7）のみ適用
- 固定シンボル・ギフト・徘徊ポケモンはシンクロ無効

### 2. 遭遇スロット決定
- BW/BW2で計算式が異なる
- 各エンカウントタイプで使用されるスロット数が異なる

### 3. 性格値（PID）決定
- **野生エンカウント**: r1[n] ^ 0x00010000
- **固定シンボル・ギフト・徘徊**: r1[n] (XOR処理なし)

### 4. レベル決定
- **通常・特殊エンカウント**: 固定レベル（乱数はスキップ）
- **なみのり・釣り・水泡系**: レベル範囲内からランダム選択
- **固定シンボル・徘徊**: 乱数消費なし

### 5. その他の個体値
- **色違い判定**: (TID ^ SID ^ PID_high ^ PID_low) < 8
- **特性スロット**: PIDの16bit目で決定
- **性別判定値**: PIDの下位8bit

## 実装上の注意点

### WASM/TypeScript役割分担
- **WASM側**: 乱数生成・消費、基本的な判定処理
- **TypeScript側**: エンカウントテーブル情報、詳細レベル計算

### プレースホルダー値の意味
- **0**: TypeScript側でレベル計算が必要
- **127**: エンカウントテーブルに固定レベル埋め込み
- **255**: 固定レベル（レベル計算不要）

### パフォーマンス考慮
- バッチ処理による高速化
- 不要な計算の回避
- メモリ効率の良いデータ構造

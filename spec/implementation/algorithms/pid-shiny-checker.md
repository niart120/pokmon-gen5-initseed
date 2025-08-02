# 性格値・色違い判定の詳細実装

## 性格値（PID）生成の正確な仕様

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

## 遭遇タイプ別PID生成パターン

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
        match encounter_type {
            EncounterType::Normal | EncounterType::Surfing | 
            EncounterType::Fishing | EncounterType::ShakingGrass |
            EncounterType::DustCloud | EncounterType::PokemonShadow |
            EncounterType::SurfingBubble | EncounterType::FishingBubble => {
                self.process_wild_encounter(sync_enabled, sync_nature, trainer_id, secret_id)
            },
            
            EncounterType::StaticSymbol | EncounterType::StaticGift => {
                self.process_static_encounter(sync_enabled, sync_nature, trainer_id, secret_id)
            },
            
            EncounterType::Roaming => {
                self.process_roaming_encounter(trainer_id, secret_id)
            },
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

## 重要な仕様

### PID生成方式の違い
- **野生エンカウント（0-7）**: r1[n] ^ 0x00010000
- **固定シンボル・ギフト（10-11）**: r1[n] (XOR処理なし)
- **徘徊ポケモン（20）**: r1[n] (XOR処理なし)

### 色違い判定
- **判定式**: (TID ^ SID ^ PID_high ^ PID_low) < 8
- **色違いタイプ**: 値が0なら正方形、1-7なら星型
- **国際孵化**: 閾値が6に変更（参考実装）

### シンクロ適用範囲
- **野生エンカウント（0-7）**: シンクロ有効
- **固定シンボル・ギフト（10-11）**: シンクロ有効
- **徘徊ポケモン（20）**: シンクロ無効

### 実装上の注意点
- 遭遇タイプによる処理分岐の正確な実装
- シンクロ判定タイミングの統一
- 色違い判定アルゴリズムの実装精度
- PID生成時のXOR処理の適用/非適用の正確な判定

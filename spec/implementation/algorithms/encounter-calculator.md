# 遭遇計算エンジン（WASM実装）

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

## 遭遇タイプ定義

### 通常エンカウント（0-2）
- **通常（0）**: 草むら・洞窟・ダンジョン共通（12スロット）
- **なみのり（1）**: 水上エンカウント（5スロット）
- **釣り（2）**: 釣りエンカウント（5スロット）

### 特殊エンカウント（3-7）
- **揺れる草むら（3）**: 高レベル・隠れ特性ポケモン（5スロット）
- **砂煙（4）**: ポケモン・ジュエル・進化石（3カテゴリ）
- **ポケモンの影（5）**: 橋や建物の影（4スロット）
- **水泡なみのり（6）**: なみのり版特殊エンカウント（4スロット）
- **水泡釣り（7）**: 釣り版特殊エンカウント（4スロット）

## バージョン間の違い

### 遭遇スロット計算式
- **BW**: (rand * 0xFFFF / 0x290) >> 32
- **BW2**: (rand * 100) >> 32

### 実装上の注意点
- スロット値から実際の遭遇テーブルインデックスへの変換
- 各エンカウントタイプごとの確率分布を正確に実装
- 特殊エンカウントでのアイテム出現判定も含む

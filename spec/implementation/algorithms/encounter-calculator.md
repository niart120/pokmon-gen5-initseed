# 遭遇計算エンジン（WASM実装）

```rust
// wasm-pkg/src/encounter_calculator.rs
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
#[derive(Clone, Copy)]
pub enum GameVersion {
    BlackWhite = 0,
    BlackWhite2 = 1,
}

#[wasm_bindgen]
#[derive(Debug, Clone, Copy, PartialEq)]
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
    StaticGift = 11,         // 固定配布
}

/// 遭遇計算機（静的関数ベース）
pub struct EncounterCalculator;

impl EncounterCalculator {
    // ゲームバージョン別の遭遇スロット計算
    pub fn calculate_encounter_slot_by_game_version(version: GameVersion, rand_value: u32) -> u32 {
        match version {
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
    
    // 遭遇タイプ別スロット値計算
    pub fn calculate_encounter_slot(version: GameVersion, encounter_type: EncounterType, rand_value: u32) -> u8 {
        // 実装は内部で適切に処理
    }
    
    // スロット番号をテーブルインデックスに変換
    pub fn slot_to_table_index(encounter_type: EncounterType, slot: u8) -> usize {
        // 実装は内部で適切に処理
    }
    
    // 生スロット値計算（テスト・検証用）
    pub fn calculate_raw_encounter_slot(version: GameVersion, rand_value: u32) -> u32 {
        // 実装は内部で適切に処理
    }
    
    // スロット分布計算（検証用）
    pub fn calculate_slot_distribution(version: GameVersion, encounter_type: EncounterType) -> Vec<f64> {
        // 実装は内部で適切に処理
    }
    
    // 砂煙内容判定
    pub fn determine_dust_cloud_content(slot: u8) -> DustCloudContent {
        // 実装は内部で適切に処理
    }
}
```

## 砂煙内容列挙型

```rust
#[wasm_bindgen]
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum DustCloudContent {
    Pokemon = 0,     // ポケモン出現
    Jewel = 1,       // ジュエル類
    Evolution = 2,   // 進化石類
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

### 固定エンカウント（10-11）
- **固定シンボル（10）**: 徘徊・レジェンダリー等（1スロット）
- **固定配布（11）**: イベント・配布ポケモン等（1スロット）

## バージョン間の違い

### 遭遇スロット計算式
- **BW**: (rand * 0xFFFF / 0x290) >> 32
- **BW2**: (rand * 100) >> 32

### 実装上の注意点
- 静的関数ベースの設計
- EncounterType列挙型による型安全な遭遇タイプ指定
- 各エンカウントタイプごとの確率分布を正確に実装
- 特殊エンカウントでのアイテム出現判定も含む

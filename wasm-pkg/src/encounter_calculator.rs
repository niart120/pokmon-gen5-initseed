/// EncounterCalculator - BW/BW2遭遇計算エンジン
/// ポケモンBW/BW2の遭遇スロット決定と確率計算を実装
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

/// デバッグログ出力マクロ
macro_rules! console_log {
    ($($t:tt)*) => (log(&format_args!($($t)*).to_string()))
}

/// ゲームバージョン列挙型
#[wasm_bindgen]
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum GameVersion {
    BlackWhite = 0,
    BlackWhite2 = 1,
}

/// 遭遇タイプ列挙型
#[wasm_bindgen]
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum EncounterType {
    /// 通常エンカウント（草むらなど）
    Normal = 0,
    /// なみのり
    Surfing = 1,
    /// つりざお
    Fishing = 2,
    /// 特殊エンカウント（洞窟、砂漠など）
    Special = 3,
    /// 隠し穴
    HiddenGrotte = 4,
}

/// 遭遇計算エンジン
#[wasm_bindgen]
pub struct EncounterCalculator;

#[wasm_bindgen]
impl EncounterCalculator {
    /// 新しいEncounterCalculatorインスタンスを作成
    #[wasm_bindgen(constructor)]
    pub fn new() -> EncounterCalculator {
        EncounterCalculator
    }

    /// 遭遇スロットを計算
    /// 
    /// # Arguments
    /// * `version` - ゲームバージョン
    /// * `encounter_type` - 遭遇タイプ
    /// * `random_value` - 乱数値（0-99）
    /// 
    /// # Returns
    /// 遭遇スロット番号（0-11）
    pub fn calculate_encounter_slot(
        version: GameVersion,
        encounter_type: EncounterType,
        random_value: u32,
    ) -> u8 {
        // 乱数値を0-99の範囲に制限
        let rand_val = random_value % 100;

        match encounter_type {
            EncounterType::Normal => Self::calculate_normal_encounter(version, rand_val),
            EncounterType::Surfing => Self::calculate_surfing_encounter(version, rand_val),
            EncounterType::Fishing => Self::calculate_fishing_encounter(version, rand_val),
            EncounterType::Special => Self::calculate_special_encounter(version, rand_val),
            EncounterType::HiddenGrotte => Self::calculate_hidden_grotte_encounter(version, rand_val),
        }
    }

    /// スロット番号をテーブルインデックスに変換
    /// 
    /// # Arguments
    /// * `encounter_type` - 遭遇タイプ
    /// * `slot` - スロット番号
    /// 
    /// # Returns
    /// テーブルインデックス
    pub fn slot_to_table_index(encounter_type: EncounterType, slot: u8) -> u8 {
        match encounter_type {
            EncounterType::Normal => {
                // 通常エンカウント：12スロット（0-11）
                if slot < 12 { slot } else { 11 }
            },
            EncounterType::Surfing => {
                // なみのり：5スロット（0-4）
                if slot < 5 { slot } else { 4 }
            },
            EncounterType::Fishing => {
                // つりざお：5スロット（0-4）
                if slot < 5 { slot } else { 4 }
            },
            EncounterType::Special => {
                // 特殊エンカウント：場所により4-5スロット
                if slot < 5 { slot } else { 4 }
            },
            EncounterType::HiddenGrotte => {
                // 隠し穴：場所により異なる
                if slot < 3 { slot } else { 2 }
            },
        }
    }
}

impl EncounterCalculator {
    /// 通常エンカウントスロット計算
    /// 12スロット：20%/20%/10%/10%/10%/10%/5%/5%/4%/4%/1%/1%
    fn calculate_normal_encounter(_version: GameVersion, rand_val: u32) -> u8 {
        match rand_val {
            0..=19 => 0,    // 20%
            20..=39 => 1,   // 20%
            40..=49 => 2,   // 10%
            50..=59 => 3,   // 10%
            60..=69 => 4,   // 10%
            70..=79 => 5,   // 10%
            80..=84 => 6,   // 5%
            85..=89 => 7,   // 5%
            90..=93 => 8,   // 4%
            94..=97 => 9,   // 4%
            98 => 10,       // 1%
            99 => 11,       // 1%
            _ => 11,        // フォールバック
        }
    }

    /// なみのりエンカウントスロット計算
    /// 5スロット：60%/30%/5%/4%/1%
    fn calculate_surfing_encounter(_version: GameVersion, rand_val: u32) -> u8 {
        match rand_val {
            0..=59 => 0,    // 60%
            60..=89 => 1,   // 30%
            90..=94 => 2,   // 5%
            95..=98 => 3,   // 4%
            99 => 4,        // 1%
            _ => 4,         // フォールバック
        }
    }

    /// つりざおエンカウントスロット計算
    /// 5スロット：70%/15%/10%/5%
    /// 注：つりざおによって確率が変わる場合がある
    fn calculate_fishing_encounter(_version: GameVersion, rand_val: u32) -> u8 {
        match rand_val {
            0..=69 => 0,    // 70%
            70..=84 => 1,   // 15%
            85..=94 => 2,   // 10%
            95..=99 => 3,   // 5%
            _ => 3,         // フォールバック
        }
    }

    /// 特殊エンカウントスロット計算
    /// 場所により4-5スロット、確率分布が異なる
    fn calculate_special_encounter(_version: GameVersion, rand_val: u32) -> u8 {
        // 基本的な5スロット分布を使用
        match rand_val {
            0..=39 => 0,    // 40%
            40..=69 => 1,   // 30%
            70..=84 => 2,   // 15%
            85..=94 => 3,   // 10%
            95..=99 => 4,   // 5%
            _ => 4,         // フォールバック
        }
    }

    /// 隠し穴エンカウントスロット計算
    /// 3スロット：80%/15%/5%
    fn calculate_hidden_grotte_encounter(_version: GameVersion, rand_val: u32) -> u8 {
        match rand_val {
            0..=79 => 0,    // 80%
            80..=94 => 1,   // 15%
            95..=99 => 2,   // 5%
            _ => 2,         // フォールバック
        }
    }

    /// 遭遇確率の検証用関数
    /// 指定した乱数値範囲での各スロットの出現頻度を計算
    pub fn calculate_slot_distribution(
        encounter_type: EncounterType,
        version: GameVersion
    ) -> Vec<u32> {
        let mut distribution = vec![0u32; 12]; // 最大12スロット
        
        for rand_val in 0..100 {
            let slot = Self::calculate_encounter_slot(version, encounter_type, rand_val);
            if (slot as usize) < distribution.len() {
                distribution[slot as usize] += 1;
            }
        }
        
        distribution
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_normal_encounter_distribution() {
        let dist = EncounterCalculator::calculate_slot_distribution(
            EncounterType::Normal,
            GameVersion::BlackWhite
        );
        
        // 期待される分布を確認
        assert_eq!(dist[0], 20); // 20%
        assert_eq!(dist[1], 20); // 20%
        assert_eq!(dist[2], 10); // 10%
        assert_eq!(dist[3], 10); // 10%
        assert_eq!(dist[4], 10); // 10%
        assert_eq!(dist[5], 10); // 10%
        assert_eq!(dist[6], 5);  // 5%
        assert_eq!(dist[7], 5);  // 5%
        assert_eq!(dist[8], 4);  // 4%
        assert_eq!(dist[9], 4);  // 4%
        assert_eq!(dist[10], 1); // 1%
        assert_eq!(dist[11], 1); // 1%
    }

    #[test]
    fn test_surfing_encounter_distribution() {
        let dist = EncounterCalculator::calculate_slot_distribution(
            EncounterType::Surfing,
            GameVersion::BlackWhite
        );
        
        // 期待される分布を確認
        assert_eq!(dist[0], 60); // 60%
        assert_eq!(dist[1], 30); // 30%
        assert_eq!(dist[2], 5);  // 5%
        assert_eq!(dist[3], 4);  // 4%
        assert_eq!(dist[4], 1);  // 1%
        
        // 未使用スロットは0
        for i in 5..12 {
            assert_eq!(dist[i], 0);
        }
    }

    #[test]
    fn test_fishing_encounter_distribution() {
        let dist = EncounterCalculator::calculate_slot_distribution(
            EncounterType::Fishing,
            GameVersion::BlackWhite
        );
        
        // 期待される分布を確認
        assert_eq!(dist[0], 70); // 70%
        assert_eq!(dist[1], 15); // 15%
        assert_eq!(dist[2], 10); // 10%
        assert_eq!(dist[3], 5);  // 5%
        
        // 未使用スロットは0
        for i in 4..12 {
            assert_eq!(dist[i], 0);
        }
    }

    #[test]
    fn test_special_encounter_distribution() {
        let dist = EncounterCalculator::calculate_slot_distribution(
            EncounterType::Special,
            GameVersion::BlackWhite
        );
        
        // 期待される分布を確認
        assert_eq!(dist[0], 40); // 40%
        assert_eq!(dist[1], 30); // 30%
        assert_eq!(dist[2], 15); // 15%
        assert_eq!(dist[3], 10); // 10%
        assert_eq!(dist[4], 5);  // 5%
        
        // 未使用スロットは0
        for i in 5..12 {
            assert_eq!(dist[i], 0);
        }
    }

    #[test]
    fn test_hidden_grotte_encounter_distribution() {
        let dist = EncounterCalculator::calculate_slot_distribution(
            EncounterType::HiddenGrotte,
            GameVersion::BlackWhite
        );
        
        // 期待される分布を確認
        assert_eq!(dist[0], 80); // 80%
        assert_eq!(dist[1], 15); // 15%
        assert_eq!(dist[2], 5);  // 5%
        
        // 未使用スロットは0
        for i in 3..12 {
            assert_eq!(dist[i], 0);
        }
    }

    #[test]
    fn test_slot_to_table_index() {
        // 通常エンカウント
        assert_eq!(EncounterCalculator::slot_to_table_index(EncounterType::Normal, 5), 5);
        assert_eq!(EncounterCalculator::slot_to_table_index(EncounterType::Normal, 15), 11);
        
        // なみのり
        assert_eq!(EncounterCalculator::slot_to_table_index(EncounterType::Surfing, 3), 3);
        assert_eq!(EncounterCalculator::slot_to_table_index(EncounterType::Surfing, 10), 4);
        
        // つりざお
        assert_eq!(EncounterCalculator::slot_to_table_index(EncounterType::Fishing, 2), 2);
        assert_eq!(EncounterCalculator::slot_to_table_index(EncounterType::Fishing, 8), 4);
        
        // 隠し穴
        assert_eq!(EncounterCalculator::slot_to_table_index(EncounterType::HiddenGrotte, 1), 1);
        assert_eq!(EncounterCalculator::slot_to_table_index(EncounterType::HiddenGrotte, 5), 2);
    }

    #[test]
    fn test_edge_cases() {
        // 境界値のテスト
        assert_eq!(
            EncounterCalculator::calculate_encounter_slot(
                GameVersion::BlackWhite,
                EncounterType::Normal,
                0
            ),
            0
        );
        
        assert_eq!(
            EncounterCalculator::calculate_encounter_slot(
                GameVersion::BlackWhite,
                EncounterType::Normal,
                99
            ),
            11
        );
        
        // 範囲外の値のテスト
        assert_eq!(
            EncounterCalculator::calculate_encounter_slot(
                GameVersion::BlackWhite,
                EncounterType::Normal,
                150
            ),
            EncounterCalculator::calculate_encounter_slot(
                GameVersion::BlackWhite,
                EncounterType::Normal,
                50
            )
        );
    }

    #[test]
    fn test_version_consistency() {
        // BWとBW2で同じ結果が得られることを確認
        for encounter_type in [
            EncounterType::Normal,
            EncounterType::Surfing,
            EncounterType::Fishing,
            EncounterType::Special,
            EncounterType::HiddenGrotte,
        ] {
            for rand_val in 0..100 {
                let bw_result = EncounterCalculator::calculate_encounter_slot(
                    GameVersion::BlackWhite,
                    encounter_type,
                    rand_val
                );
                let bw2_result = EncounterCalculator::calculate_encounter_slot(
                    GameVersion::BlackWhite2,
                    encounter_type,
                    rand_val
                );
                assert_eq!(bw_result, bw2_result, 
                    "Mismatch for type {:?}, rand_val {}", encounter_type, rand_val);
            }
        }
    }

    #[test]
    fn test_deterministic_behavior() {
        // 同じ入力に対して同じ出力が得られることを確認
        let test_cases = [
            (EncounterType::Normal, 50),
            (EncounterType::Surfing, 75),
            (EncounterType::Fishing, 85),
            (EncounterType::Special, 95),
            (EncounterType::HiddenGrotte, 90),
        ];

        for (encounter_type, rand_val) in test_cases {
            let result1 = EncounterCalculator::calculate_encounter_slot(
                GameVersion::BlackWhite,
                encounter_type,
                rand_val
            );
            let result2 = EncounterCalculator::calculate_encounter_slot(
                GameVersion::BlackWhite,
                encounter_type,
                rand_val
            );
            assert_eq!(result1, result2);
        }
    }
}
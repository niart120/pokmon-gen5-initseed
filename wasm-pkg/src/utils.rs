/// 共通ユーティリティ関数
/// WASM Core Engine全体で使用される汎用的な機能を提供
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

/// エンディアン変換ユーティリティ
#[wasm_bindgen]
pub struct EndianUtils;

#[wasm_bindgen]
impl EndianUtils {
    /// 32bit値のバイトスワップ
    /// 
    /// # Arguments
    /// * `value` - 変換する32bit値
    /// 
    /// # Returns
    /// バイトスワップされた値
    pub fn swap_bytes_32(value: u32) -> u32 {
        value.swap_bytes()
    }

    /// 16bit値のバイトスワップ
    /// 
    /// # Arguments
    /// * `value` - 変換する16bit値
    /// 
    /// # Returns
    /// バイトスワップされた値
    pub fn swap_bytes_16(value: u16) -> u16 {
        value.swap_bytes()
    }

    /// 64bit値のバイトスワップ
    /// 
    /// # Arguments
    /// * `value` - 変換する64bit値
    /// 
    /// # Returns
    /// バイトスワップされた値
    pub fn swap_bytes_64(value: u64) -> u64 {
        value.swap_bytes()
    }

    /// ビッグエンディアン32bit値をリトルエンディアンに変換
    pub fn be32_to_le(value: u32) -> u32 {
        if cfg!(target_endian = "big") {
            value.swap_bytes()
        } else {
            value
        }
    }

    /// リトルエンディアン32bit値をビッグエンディアンに変換
    pub fn le32_to_be(value: u32) -> u32 {
        if cfg!(target_endian = "little") {
            value.swap_bytes()
        } else {
            value
        }
    }
}

/// ビット操作ユーティリティ
#[wasm_bindgen]
pub struct BitUtils;

#[wasm_bindgen]
impl BitUtils {
    /// 32bit値の左ローテート
    /// 
    /// # Arguments
    /// * `value` - ローテートする値
    /// * `count` - ローテート回数
    /// 
    /// # Returns
    /// ローテートされた値
    pub fn rotate_left_32(value: u32, count: u32) -> u32 {
        value.rotate_left(count)
    }

    /// 32bit値の右ローテート
    /// 
    /// # Arguments
    /// * `value` - ローテートする値
    /// * `count` - ローテート回数
    /// 
    /// # Returns
    /// ローテートされた値
    pub fn rotate_right_32(value: u32, count: u32) -> u32 {
        value.rotate_right(count)
    }

    /// 指定したビット位置の値を取得
    /// 
    /// # Arguments
    /// * `value` - 対象の値
    /// * `bit_position` - ビット位置（0-31）
    /// 
    /// # Returns
    /// 指定ビットの値（0または1）
    pub fn get_bit(value: u32, bit_position: u8) -> u32 {
        if bit_position >= 32 {
            return 0;
        }
        (value >> bit_position) & 1
    }

    /// 指定したビット位置を設定
    /// 
    /// # Arguments
    /// * `value` - 対象の値
    /// * `bit_position` - ビット位置（0-31）
    /// * `bit_value` - 設定する値（0または1）
    /// 
    /// # Returns
    /// ビットが設定された値
    pub fn set_bit(value: u32, bit_position: u8, bit_value: u32) -> u32 {
        if bit_position >= 32 {
            return value;
        }
        
        if bit_value == 0 {
            value & !(1 << bit_position)
        } else {
            value | (1 << bit_position)
        }
    }

    /// ビット数をカウント
    /// 
    /// # Arguments
    /// * `value` - 対象の値
    /// 
    /// # Returns
    /// 設定されているビット数
    pub fn count_bits(value: u32) -> u32 {
        value.count_ones()
    }

    /// ビットフィールドを抽出
    /// 
    /// # Arguments
    /// * `value` - 対象の値
    /// * `start_bit` - 開始ビット位置
    /// * `bit_count` - 抽出するビット数
    /// 
    /// # Returns
    /// 抽出されたビットフィールド
    pub fn extract_bits(value: u32, start_bit: u8, bit_count: u8) -> u32 {
        if start_bit >= 32 || bit_count == 0 || start_bit + bit_count > 32 {
            return 0;
        }
        
        let mask = (1u32 << bit_count) - 1;
        (value >> start_bit) & mask
    }
}

/// 数値変換ユーティリティ
#[wasm_bindgen]
pub struct NumberUtils;

#[wasm_bindgen]
impl NumberUtils {
    /// 16進数文字列を32bit整数に変換
    /// 
    /// # Arguments
    /// * `hex_str` - 16進数文字列（0xプレフィックス可）
    /// 
    /// # Returns
    /// 変換された整数値（エラー時は0）
    pub fn hex_string_to_u32(hex_str: &str) -> u32 {
        let cleaned = hex_str.trim_start_matches("0x").trim_start_matches("0X");
        u32::from_str_radix(cleaned, 16).unwrap_or(0)
    }

    /// 32bit整数を16進数文字列に変換
    /// 
    /// # Arguments
    /// * `value` - 変換する整数値
    /// * `uppercase` - 大文字で出力するか
    /// 
    /// # Returns
    /// 16進数文字列
    pub fn u32_to_hex_string(value: u32, uppercase: bool) -> String {
        if uppercase {
            format!("{:08X}", value)
        } else {
            format!("{:08x}", value)
        }
    }

    /// BCD（Binary Coded Decimal）エンコード
    /// 
    /// # Arguments
    /// * `value` - エンコードする値（0-99）
    /// 
    /// # Returns
    /// BCDエンコードされた値
    pub fn encode_bcd(value: u8) -> u8 {
        if value > 99 {
            return 0;
        }
        let tens = value / 10;
        let ones = value % 10;
        (tens << 4) | ones
    }

    /// BCD（Binary Coded Decimal）デコード
    /// 
    /// # Arguments
    /// * `bcd_value` - デコードするBCD値
    /// 
    /// # Returns
    /// デコードされた値
    pub fn decode_bcd(bcd_value: u8) -> u8 {
        let tens = (bcd_value >> 4) & 0x0F;
        let ones = bcd_value & 0x0F;
        if tens > 9 || ones > 9 {
            return 0;
        }
        tens * 10 + ones
    }

    /// パーセンテージを乱数閾値に変換
    /// 
    /// # Arguments
    /// * `percentage` - パーセンテージ（0.0-100.0）
    /// 
    /// # Returns
    /// 32bit乱数閾値
    pub fn percentage_to_threshold(percentage: f32) -> u32 {
        if percentage <= 0.0 {
            return 0;
        }
        if percentage >= 100.0 {
            return 0xFFFFFFFFu32;
        }
        ((percentage / 100.0) * (0xFFFFFFFFu32 as f32)) as u32
    }

    /// 32bit乱数閾値をパーセンテージに変換
    /// 
    /// # Arguments
    /// * `threshold` - 32bit乱数閾値
    /// 
    /// # Returns
    /// パーセンテージ
    pub fn threshold_to_percentage(threshold: u32) -> f32 {
        (threshold as f64 / 0xFFFFFFFFu32 as f64 * 100.0) as f32
    }
}

/// 配列操作ユーティリティ
#[wasm_bindgen]
pub struct ArrayUtils;

#[wasm_bindgen]
impl ArrayUtils {
    /// 32bit配列の合計値を計算
    /// 
    /// # Arguments
    /// * `array` - 対象配列
    /// 
    /// # Returns
    /// 合計値
    pub fn sum_u32_array(array: &[u32]) -> u64 {
        array.iter().map(|&x| x as u64).sum()
    }

    /// 32bit配列の平均値を計算
    /// 
    /// # Arguments
    /// * `array` - 対象配列
    /// 
    /// # Returns
    /// 平均値
    pub fn average_u32_array(array: &[u32]) -> f64 {
        if array.is_empty() {
            return 0.0;
        }
        let sum = Self::sum_u32_array(array);
        sum as f64 / array.len() as f64
    }

    /// 32bit配列の最大値を取得
    /// 
    /// # Arguments
    /// * `array` - 対象配列
    /// 
    /// # Returns
    /// 最大値（配列が空の場合は0）
    pub fn max_u32_array(array: &[u32]) -> u32 {
        array.iter().cloned().max().unwrap_or(0)
    }

    /// 32bit配列の最小値を取得
    /// 
    /// # Arguments
    /// * `array` - 対象配列
    /// 
    /// # Returns
    /// 最小値（配列が空の場合は0）
    pub fn min_u32_array(array: &[u32]) -> u32 {
        array.iter().cloned().min().unwrap_or(0)
    }

    /// 配列の重複要素を除去
    /// 
    /// # Arguments
    /// * `array` - 対象配列
    /// 
    /// # Returns
    /// 重複が除去された配列
    pub fn deduplicate_u32_array(array: &[u32]) -> Vec<u32> {
        use std::collections::BTreeSet;
        let mut set = BTreeSet::new();
        let mut result = Vec::new();
        
        for &item in array {
            if set.insert(item) {
                result.push(item);
            }
        }
        
        result
    }
}

/// バリデーションユーティリティ
#[wasm_bindgen]
pub struct ValidationUtils;

#[wasm_bindgen]
impl ValidationUtils {
    /// TIDの妥当性チェック
    /// 
    /// # Arguments
    /// * `tid` - トレーナーID
    /// 
    /// # Returns
    /// 妥当性
    pub fn is_valid_tid(_tid: u16) -> bool {
        true // u16は常に16bit範囲内
    }

    /// SIDの妥当性チェック
    /// 
    /// # Arguments
    /// * `sid` - シークレットID
    /// 
    /// # Returns
    /// 妥当性
    pub fn is_valid_sid(_sid: u16) -> bool {
        true // u16は常に16bit範囲内
    }

    /// 性格値の妥当性チェック
    /// 
    /// # Arguments
    /// * `nature` - 性格値
    /// 
    /// # Returns
    /// 妥当性
    pub fn is_valid_nature(nature: u8) -> bool {
        nature < 25 // 0-24の範囲
    }

    /// 特性スロットの妥当性チェック
    /// 
    /// # Arguments
    /// * `ability_slot` - 特性スロット
    /// 
    /// # Returns
    /// 妥当性
    pub fn is_valid_ability_slot(ability_slot: u8) -> bool {
        ability_slot <= 1 // 0または1
    }

    /// 16進数文字列の妥当性チェック
    /// 
    /// # Arguments
    /// * `hex_str` - 16進数文字列
    /// 
    /// # Returns
    /// 妥当性
    pub fn is_valid_hex_string(hex_str: &str) -> bool {
        let cleaned = hex_str.trim_start_matches("0x").trim_start_matches("0X");
        cleaned.chars().all(|c| c.is_ascii_hexdigit())
    }

    /// シード値の妥当性チェック
    /// 
    /// # Arguments
    /// * `seed` - シード値
    /// 
    /// # Returns
    /// 妥当性
    pub fn is_valid_seed(seed: u64) -> bool {
        seed > 0 // 0は一般的に無効とする
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_endian_utils() {
        let value = 0x12345678u32;
        let swapped = EndianUtils::swap_bytes_32(value);
        assert_eq!(swapped, 0x78563412);
        
        let value16 = 0x1234u16;
        let swapped16 = EndianUtils::swap_bytes_16(value16);
        assert_eq!(swapped16, 0x3412);
        
        let value64 = 0x123456789ABCDEFu64;
        let swapped64 = EndianUtils::swap_bytes_64(value64);
        assert_eq!(swapped64, 0xEFCDAB8967452301);
    }

    #[test]
    fn test_bit_utils() {
        let value = 0b11010110u32;
        
        // ビット取得
        assert_eq!(BitUtils::get_bit(value, 0), 0);
        assert_eq!(BitUtils::get_bit(value, 1), 1);
        assert_eq!(BitUtils::get_bit(value, 2), 1);
        
        // ビット設定
        let set_value = BitUtils::set_bit(value, 0, 1);
        assert_eq!(BitUtils::get_bit(set_value, 0), 1);
        
        // ビット数カウント
        assert_eq!(BitUtils::count_bits(0b11010110), 5);
        
        // ローテート
        assert_eq!(BitUtils::rotate_left_32(0x12345678, 4), 0x23456781);
        assert_eq!(BitUtils::rotate_right_32(0x12345678, 4), 0x81234567);
        
        // ビットフィールド抽出
        assert_eq!(BitUtils::extract_bits(0x12345678, 4, 8), 0x67);
    }

    #[test]
    fn test_number_utils() {
        // 16進数変換
        assert_eq!(NumberUtils::hex_string_to_u32("0x12345678"), 0x12345678);
        assert_eq!(NumberUtils::hex_string_to_u32("ABCDEF"), 0xABCDEF);
        assert_eq!(NumberUtils::u32_to_hex_string(0x12345678, false), "12345678");
        assert_eq!(NumberUtils::u32_to_hex_string(0x12345678, true), "12345678");
        
        // BCD変換
        assert_eq!(NumberUtils::encode_bcd(23), 0x23);
        assert_eq!(NumberUtils::encode_bcd(99), 0x99);
        assert_eq!(NumberUtils::decode_bcd(0x23), 23);
        assert_eq!(NumberUtils::decode_bcd(0x99), 99);
        
        // パーセンテージ変換
        let threshold_50 = NumberUtils::percentage_to_threshold(50.0);
        assert!(threshold_50 > 0x7FFFFFFF && threshold_50 < 0x90000000);
        
        let percentage = NumberUtils::threshold_to_percentage(0x80000000);
        assert!((percentage - 50.0).abs() < 1.0);
    }

    #[test]
    fn test_array_utils() {
        let array = [1, 2, 3, 4, 5];
        
        assert_eq!(ArrayUtils::sum_u32_array(&array), 15);
        assert_eq!(ArrayUtils::average_u32_array(&array), 3.0);
        assert_eq!(ArrayUtils::max_u32_array(&array), 5);
        assert_eq!(ArrayUtils::min_u32_array(&array), 1);
        
        let duplicated_array = [1, 2, 2, 3, 3, 3, 4];
        let deduplicated = ArrayUtils::deduplicate_u32_array(&duplicated_array);
        assert_eq!(deduplicated, vec![1, 2, 3, 4]);
    }

    #[test]
    fn test_validation_utils() {
        // TID/SID検証
        assert!(ValidationUtils::is_valid_tid(12345));
        assert!(ValidationUtils::is_valid_tid(65535));
        assert!(ValidationUtils::is_valid_sid(54321));
        
        // 性格検証
        assert!(ValidationUtils::is_valid_nature(0));
        assert!(ValidationUtils::is_valid_nature(24));
        assert!(!ValidationUtils::is_valid_nature(25));
        
        // 特性スロット検証
        assert!(ValidationUtils::is_valid_ability_slot(0));
        assert!(ValidationUtils::is_valid_ability_slot(1));
        assert!(!ValidationUtils::is_valid_ability_slot(2));
        
        // 16進数文字列検証
        assert!(ValidationUtils::is_valid_hex_string("0x12345678"));
        assert!(ValidationUtils::is_valid_hex_string("ABCDEF"));
        assert!(ValidationUtils::is_valid_hex_string("123abc"));
        assert!(!ValidationUtils::is_valid_hex_string("12G3"));
        assert!(!ValidationUtils::is_valid_hex_string("xyz"));
        
        // シード検証
        assert!(ValidationUtils::is_valid_seed(0x123456789ABCDEF0));
        assert!(!ValidationUtils::is_valid_seed(0));
    }

    #[test]
    fn test_edge_cases() {
        // 空配列
        let empty_array: [u32; 0] = [];
        assert_eq!(ArrayUtils::sum_u32_array(&empty_array), 0);
        assert_eq!(ArrayUtils::average_u32_array(&empty_array), 0.0);
        assert_eq!(ArrayUtils::max_u32_array(&empty_array), 0);
        assert_eq!(ArrayUtils::min_u32_array(&empty_array), 0);
        
        // 範囲外ビット操作
        assert_eq!(BitUtils::get_bit(0x12345678, 32), 0);
        assert_eq!(BitUtils::set_bit(0x12345678, 32, 1), 0x12345678);
        assert_eq!(BitUtils::extract_bits(0x12345678, 32, 8), 0);
        
        // 無効なBCD
        assert_eq!(NumberUtils::encode_bcd(100), 0);
        assert_eq!(NumberUtils::decode_bcd(0xAB), 0);
        
        // 境界値パーセンテージ
        assert_eq!(NumberUtils::percentage_to_threshold(0.0), 0);
        assert_eq!(NumberUtils::percentage_to_threshold(100.0), 0xFFFFFFFFu32);
        assert_eq!(NumberUtils::percentage_to_threshold(-10.0), 0);
        assert_eq!(NumberUtils::percentage_to_threshold(110.0), 0xFFFFFFFFu32);
    }
}
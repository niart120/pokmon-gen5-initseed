/// 日時コード事前計算システム
/// ポケモンBW/BW2の日時メッセージ生成における最大のボトルネック（BCD変換）を
/// 事前計算テーブルで解決し、劇的な性能向上を実現する
/// 時刻コード事前計算テーブル (86,400エントリ = 24*60*60秒)
/// 全ての時:分:秒の組み合わせを事前計算
pub struct TimeCodeGenerator;

impl TimeCodeGenerator {
    /// 全86,400秒分の時刻コードを事前計算する関数（24時間制ベース）
    /// 参考: yatsuna827/5genInitialSeedSearch
    const fn generate_all_time_codes() -> [u32; 86400] {
        let mut codes = [0u32; 86400];
        let mut index = 0;
        
        let mut hour = 0;
        while hour < 24 {
            // 時間のBCDエンコーディング（24時間制、PM flagなし）
            let h_tens = hour / 10;
            let h_ones = hour % 10;
            let h_code = (h_tens << 28) | (h_ones << 24);
            
            let mut minute = 0;
            while minute < 60 {
                // 分のBCDエンコーディング
                let min_code = ((minute / 10) << 20) | ((minute % 10) << 16);
                
                let mut second = 0;
                while second < 60 {
                    // 秒のBCDエンコーディング
                    let sec_code = ((second / 10) << 12) | ((second % 10) << 8);
                    
                    // 統合時刻コード
                    codes[index] = h_code | min_code | sec_code;
                    
                    index += 1;
                    second += 1;
                }
                minute += 1;
            }
            hour += 1;
        }
        
        codes
    }
    
    /// コンパイル時に事前計算されたテーブル（定数時間アクセス）
    pub const TIME_CODES: [u32; 86400] = Self::generate_all_time_codes();
    
    /// 時刻コードを高速取得（O(1)）
    #[inline]
    pub fn get_time_code(seconds_of_day: u32) -> u32 {
        let index = seconds_of_day as usize;
        if index < Self::TIME_CODES.len() {
            Self::TIME_CODES[index]
        } else {
            0 // エラー値
        }
    }

    /// Hardware-specific time code generation
    /// DS/DS_LITE applies PM flag (0x40000000) for afternoon hours (>=12), 3DS uses 24-hour format
    #[inline]
    pub fn get_time_code_for_hardware(seconds_of_day: u32, hardware: &str) -> u32 {
        let base_code = Self::get_time_code(seconds_of_day);
        
        // For DS and DS_LITE, add PM flag for afternoon hours
        match hardware {
            "DS" | "DS_LITE" => {
                let hour = seconds_of_day / 3600;
                if hour >= 12 {
                    base_code | 0x40000000 // Add PM flag for afternoon
                } else {
                    base_code // Keep base code for morning
                }
            },
            "3DS" => {
                base_code // 3DS uses 24-hour format (no PM flag)
            },
            _ => base_code, // Fallback to base code
        }
    }
}

/// 日付コード事前計算テーブル (36,525エントリ = 100年分)
/// 2000年1月1日から2099年12月31日まで
pub struct DateCodeGenerator;

impl DateCodeGenerator {
    /// 指定年がうるう年かどうか判定
    const fn is_leap_year(year: u32) -> bool {
        (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0)
    }
    
    /// 月の日数を取得
    const fn days_in_month(year: u32, month: u32) -> u32 {
        match month {
            1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
            4 | 6 | 9 | 11 => 30,
            2 => if Self::is_leap_year(year) { 29 } else { 28 },
            _ => 0,
        }
    }
    
    /// 曜日を計算 (0=Sunday, 1=Monday, etc.)
    /// 効率的なmod 7計算によるアプローチ
    const fn get_day_of_week(year: u32, month: u32, day: u32) -> u32 {
        // 各月の累積日数（非うるう年ベース）
        const DAYS_BEFORE_MONTH: [u32; 13] = [0, 0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
        
        // 2000年1月1日からの経過日数を計算
        let years_since_2000 = year - 2000;
        
        // 完全な年の日数
        let leap_years = (years_since_2000 + 3) / 4 - years_since_2000 / 100 + years_since_2000 / 400;
        let days_from_years = years_since_2000 * 365 + leap_years;
        
        // 月の日数
        let days_from_months = DAYS_BEFORE_MONTH[month as usize];
        
        // うるう年調整（3月以降の場合）
        let leap_adjustment = if month > 2 && Self::is_leap_year(year) { 1 } else { 0 };
        
        // 日の分（1日から数えるので-1）
        let total_days = days_from_years + days_from_months + leap_adjustment + day - 1;
        
        // 2000年1月1日は土曜日(6)なので、それに経過日数を加算してmod 7
        (6 + total_days) % 7
    }
    
    /// 全100年分（36,525日）の日付コードを事前計算
    const fn generate_all_date_codes() -> [u32; 36525] {
        let mut codes = [0u32; 36525];
        let mut index = 0;
        
        let mut year = 2000;
        while year < 2100 {
            let mut month = 1;
            while month <= 12 {
                let days = Self::days_in_month(year, month);
                let mut day = 1;
                while day <= days {
                    // 曜日を計算
                    let day_of_week = Self::get_day_of_week(year, month, day);
                    
                    // BCD-like encoding for YYMMDDWW format
                    let year_val = year % 100;
                    let yy_bcd = ((year_val / 10) << 4) | (year_val % 10);
                    let mm_bcd = ((month / 10) << 4) | (month % 10);
                    let dd_bcd = ((day / 10) << 4) | (day % 10);
                    let ww_bcd = ((day_of_week / 10) << 4) | (day_of_week % 10);
                    
                    // 統合日付コード (YYMMDDWW format)
                    codes[index] = (yy_bcd << 24) | (mm_bcd << 16) | (dd_bcd << 8) | ww_bcd;
                    
                    index += 1;
                    day += 1;
                }
                month += 1;
            }
            year += 1;
        }
        
        codes
    }
    
    /// コンパイル時に事前計算されたテーブル（定数時間アクセス）
    pub const DATE_CODES: [u32; 36525] = Self::generate_all_date_codes();
    
    /// 日付コードを高速取得（O(1)）
    #[inline]
    pub fn get_date_code(days_since_2000: u32) -> u32 {
        let index = days_since_2000 as usize;
        if index < Self::DATE_CODES.len() {
            Self::DATE_CODES[index]
        } else {
            0 // エラー値
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// テスト用ヘルパー関数: 2000/1/1からの日数を計算
    fn days_since_2000(year: u32, month: u32, day: u32) -> u32 {
        let mut total_days = 0;
        
        // 年の分
        let mut y = 2000;
        while y < year {
            total_days += if DateCodeGenerator::is_leap_year(y) { 366 } else { 365 };
            y += 1;
        }
        
        // 月の分
        let mut m = 1;
        while m < month {
            total_days += DateCodeGenerator::days_in_month(year, m);
            m += 1;
        }
        
        // 日の分（1日から数えるので-1）
        total_days + day - 1
    }

    #[test]
    fn test_time_code_generation() {
        // 境界値テスト - 新しいAPIを使用
        assert_eq!(TimeCodeGenerator::get_time_code(0), 0x00000000);  // 00:00:00
        assert_eq!(TimeCodeGenerator::get_time_code(12 * 3600 + 30 * 60 + 45), 0x12304500);  // 12:30:45
        assert_eq!(TimeCodeGenerator::get_time_code(23 * 3600 + 59 * 60 + 59), 0x23595900);  // 23:59:59
    }
    
    #[test]
    fn test_date_code_generation() {
        // 2000年1月1日のテスト (土曜日) - 新しいAPIを使用
        let result_2000_01_01 = DateCodeGenerator::get_date_code(0);
        println!("2000/1/1 result: 0x{:08X}", result_2000_01_01);
        
        // 手動でBCD計算を確認
        // year=2000: year%100=0 → yy_bcd=((0/10)<<4)|(0%10)=0x00
        // month=1: mm_bcd=((1/10)<<4)|(1%10)=0x01
        // day=1: dd_bcd=((1/10)<<4)|(1%10)=0x01
        // dayOfWeek=6 (土曜日): ww_bcd=((6/10)<<4)|(6%10)=0x06
        // 期待値: (0x00<<24)|(0x01<<16)|(0x01<<8)|0x06 = 0x00010106
        assert_eq!(result_2000_01_01, 0x00010106);
        
        // 2024年12月31日のテスト (火曜日) - 日数インデックス計算が必要
        let days_2024_12_31 = days_since_2000(2024, 12, 31);
        let result_2024_12_31 = DateCodeGenerator::get_date_code(days_2024_12_31);
        println!("2024/12/31 result: 0x{:08X}", result_2024_12_31);
        
        // 手動でBCD計算を確認
        // year=2024: year%100=24 → yy_bcd=((24/10)<<4)|(24%10)=(2<<4)|4=0x24
        // month=12: mm_bcd=((12/10)<<4)|(12%10)=(1<<4)|2=0x12
        // day=31: dd_bcd=((31/10)<<4)|(31%10)=(3<<4)|1=0x31
        // dayOfWeek=2 (火曜日): ww_bcd=((2/10)<<4)|(2%10)=0x02
        // 期待値: (0x24<<24)|(0x12<<16)|(0x31<<8)|0x02 = 0x24123102
        assert_eq!(result_2024_12_31, 0x24123102);
        
        // 2023年12月31日のテスト (日曜日) - TypeScript実装のテストケースと一致確認
        let days_2023_12_31 = days_since_2000(2023, 12, 31);
        let result_2023_12_31 = DateCodeGenerator::get_date_code(days_2023_12_31);
        println!("2023/12/31 result: 0x{:08X}", result_2023_12_31);
        
        // 手動でBCD計算を確認
        // year=2023: year%100=23 → yy_bcd=((23/10)<<4)|(23%10)=(2<<4)|3=0x23
        // month=12: mm_bcd=((12/10)<<4)|(12%10)=(1<<4)|2=0x12
        // day=31: dd_bcd=((31/10)<<4)|(31%10)=(3<<4)|1=0x31
        // dayOfWeek=0 (日曜日): ww_bcd=((0/10)<<4)|(0%10)=0x00
        // 期待値: (0x23<<24)|(0x12<<16)|(0x31<<8)|0x00 = 0x23123100
        assert_eq!(result_2023_12_31, 0x23123100);
    }
    
    #[test]
    fn test_day_of_week_calculation() {
        // 2000年1月1日は土曜日 (6)
        assert_eq!(DateCodeGenerator::get_day_of_week(2000, 1, 1), 6);
        
        // 2023年12月31日は日曜日 (0)
        assert_eq!(DateCodeGenerator::get_day_of_week(2023, 12, 31), 0);
        
        // 2024年12月31日は火曜日 (2)
        assert_eq!(DateCodeGenerator::get_day_of_week(2024, 12, 31), 2);
        
        // 2024年1月1日は月曜日 (1)
        assert_eq!(DateCodeGenerator::get_day_of_week(2024, 1, 1), 1);
    }
    
    #[test]
    fn test_leap_year() {
        assert!(DateCodeGenerator::is_leap_year(2000));
        assert!(!DateCodeGenerator::is_leap_year(1900));
        assert!(DateCodeGenerator::is_leap_year(2004));
        assert!(!DateCodeGenerator::is_leap_year(2001));
    }
}

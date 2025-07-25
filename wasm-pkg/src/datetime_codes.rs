/// 日時コード事前計算システム
/// ポケモンBW/BW2の日時メッセージ生成における最大のボトルネック（BCD変換）を
/// 事前計算テーブルで解決し、劇的な性能向上を実現する
/// 時刻コード事前計算テーブル (86,400エントリ = 24*60*60秒)
/// 全ての時:分:秒の組み合わせを事前計算
pub struct TimeCodeGenerator;

impl TimeCodeGenerator {
    /// 全86,400秒分の時刻コードを事前計算する関数
    /// 参考: yatsuna827/5genInitialSeedSearch
    const fn generate_all_time_codes() -> [u32; 86400] {
        let mut codes = [0u32; 86400];
        let mut index = 0;
        
        let mut hour = 0;
        while hour < 24 {
            // 時間のBCDエンコーディング
            let h_tens = hour / 10;
            let h_ones = hour % 10;
            let mut h_code = (h_tens << 28) | (h_ones << 24);
            
            // 12時間制フラグ（午後の場合）
            if hour >= 12 {
                h_code |= 0x40000000;
            }
            
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
    pub fn get_time_code(hour: u32, minute: u32, second: u32) -> u32 {
        let index = (hour * 3600 + minute * 60 + second) as usize;
        if index < Self::TIME_CODES.len() {
            Self::TIME_CODES[index]
        } else {
            0 // エラー値
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
                    // 日付のBCDエンコーディング
                    let d_code = ((day / 10) << 20) | ((day % 10) << 16);
                    let m_code = ((month / 10) << 12) | ((month % 10) << 8);
                    let y_ones = year % 10;
                    let y_tens = (year / 10) % 10;
                    let y_code = (y_tens << 4) | y_ones;
                    
                    // 統合日付コード
                    codes[index] = d_code | m_code | y_code;
                    
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
    
    /// 2000/1/1からの日数を計算
    const fn days_since_2000(year: u32, month: u32, day: u32) -> u32 {
        let mut total_days = 0;
        
        // 年の分
        let mut y = 2000;
        while y < year {
            total_days += if Self::is_leap_year(y) { 366 } else { 365 };
            y += 1;
        }
        
        // 月の分
        let mut m = 1;
        while m < month {
            total_days += Self::days_in_month(year, m);
            m += 1;
        }
        
        // 日の分（1日から数えるので-1）
        total_days + day - 1
    }
    
    /// 日付コードを高速取得（O(1)）
    #[inline]
    pub fn get_date_code(year: u32, month: u32, day: u32) -> u32 {
        if (2000..2100).contains(&year) && (1..=12).contains(&month) {
            let index = Self::days_since_2000(year, month, day) as usize;
            if index < Self::DATE_CODES.len() {
                return Self::DATE_CODES[index];
            }
        }
        0 // エラー値
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_time_code_generation() {
        // 境界値テスト
        assert_eq!(TimeCodeGenerator::get_time_code(0, 0, 0), 0x00000000);
        assert_eq!(TimeCodeGenerator::get_time_code(12, 30, 45), 0x52304500);
        assert_eq!(TimeCodeGenerator::get_time_code(23, 59, 59), 0x63595900);
    }
    
    #[test]
    fn test_date_code_generation() {
        // 2000年1月1日のテスト
        let result_2000_01_01 = DateCodeGenerator::get_date_code(2000, 1, 1);
        println!("2000/1/1 result: 0x{:08X}", result_2000_01_01);
        
        // 手動でBCD計算を確認
        // day=1: (1/10)<<20 | (1%10)<<16 = 0<<20 | 1<<16 = 0x00010000
        // month=1: (1/10)<<12 | (1%10)<<8 = 0<<12 | 1<<8 = 0x00000100  
        // year=2000: ((2000/10)%10)<<4 | (2000%10) = (200%10)<<4 | 0 = 0<<4 | 0 = 0x00000000
        // 期待値: 0x00010000 | 0x00000100 | 0x00000000 = 0x00010100
        assert_eq!(result_2000_01_01, 0x00010100);
        
        // 2024年12月31日のテスト
        let result_2024_12_31 = DateCodeGenerator::get_date_code(2024, 12, 31);
        println!("2024/12/31 result: 0x{:08X}", result_2024_12_31);
        
        // 手動でBCD計算を確認
        // day=31: (31/10)<<20 | (31%10)<<16 = 3<<20 | 1<<16 = 0x00310000
        // month=12: (12/10)<<12 | (12%10)<<8 = 1<<12 | 2<<8 = 0x00001200
        // year=2024: ((2024/10)%10)<<4 | (2024%10) = (202%10)<<4 | 4 = 2<<4 | 4 = 0x00000024
        // 期待値: 0x00310000 | 0x00001200 | 0x00000024 = 0x00311224
        assert_eq!(result_2024_12_31, 0x00311224);
    }
    
    #[test]
    fn test_leap_year() {
        assert!(DateCodeGenerator::is_leap_year(2000));
        assert!(!DateCodeGenerator::is_leap_year(1900));
        assert!(DateCodeGenerator::is_leap_year(2004));
        assert!(!DateCodeGenerator::is_leap_year(2001));
    }
}

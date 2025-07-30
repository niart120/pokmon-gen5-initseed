/// datetime_codes のテストコード
use crate::datetime_codes::{TimeCodeGenerator, DateCodeGenerator};

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

    #[test]
    fn test_time_code_hardware_variants() {
        // 12:30:45の基本時刻コード
        let basic_time_code = TimeCodeGenerator::get_time_code(12 * 3600 + 30 * 60 + 45);
        
        // ハードウェア別の時刻コード生成テスト
        let ds_time_code = TimeCodeGenerator::get_time_code_for_hardware(12 * 3600 + 30 * 60 + 45, "DS");
        let ds_lite_time_code = TimeCodeGenerator::get_time_code_for_hardware(12 * 3600 + 30 * 60 + 45, "DS_LITE");
        let _3ds_time_code = TimeCodeGenerator::get_time_code_for_hardware(12 * 3600 + 30 * 60 + 45, "3DS");
        
        // 3DSでは基本時刻コードと同じ（24時間形式、PM flagなし）
        assert_eq!(_3ds_time_code, basic_time_code);
        
        // DS/DS_LITEは午後（12時以降）にPM flag (0x40000000) が追加される
        // 12:30:45は午後なのでDS/DS_LITEではPM flagが設定される
        assert_ne!(ds_time_code, basic_time_code);
        assert_ne!(ds_lite_time_code, basic_time_code);
        
        // DSとDS_LITEは同じ処理
        assert_eq!(ds_time_code, ds_lite_time_code);
        
        // PM flagの確認（0x40000000が追加されていることを確認）
        assert_eq!(ds_time_code, basic_time_code | 0x40000000);
        
        // 午前の時刻テスト（10:15:30）- PM flagが設定されないことを確認
        let morning_time_index = 10 * 3600 + 15 * 60 + 30;
        let morning_basic_code = TimeCodeGenerator::get_time_code(morning_time_index);
        let morning_ds_code = TimeCodeGenerator::get_time_code_for_hardware(morning_time_index, "DS");
        let morning_3ds_code = TimeCodeGenerator::get_time_code_for_hardware(morning_time_index, "3DS");
        
        // 午前はDS/DS_LITEでもPM flagが設定されない
        assert_eq!(morning_ds_code, morning_basic_code);
        assert_eq!(morning_3ds_code, morning_basic_code);
    }

    #[test]
    fn test_date_code_boundary_values() {
        // 境界値テスト: 各月の最終日
        let days_feb_28_2001 = days_since_2000(2001, 2, 28); // 非うるう年
        let result_feb_28 = DateCodeGenerator::get_date_code(days_feb_28_2001);
        assert_ne!(result_feb_28, 0);
        
        let days_feb_29_2004 = days_since_2000(2004, 2, 29); // うるう年
        let result_feb_29 = DateCodeGenerator::get_date_code(days_feb_29_2004);
        assert_ne!(result_feb_29, 0);
        
        // 年末・年始の境界
        let days_dec_31_2020 = days_since_2000(2020, 12, 31);
        let result_dec_31 = DateCodeGenerator::get_date_code(days_dec_31_2020);
        assert_ne!(result_dec_31, 0);
        
        let days_jan_01_2021 = days_since_2000(2021, 1, 1);
        let result_jan_01 = DateCodeGenerator::get_date_code(days_jan_01_2021);
        assert_ne!(result_jan_01, 0);
    }

    #[test]
    fn test_time_code_boundary_values() {
        // 1日の境界値テスト
        assert_eq!(TimeCodeGenerator::get_time_code(0), 0x00000000);  // 00:00:00
        assert_eq!(TimeCodeGenerator::get_time_code(86399), 0x23595900);  // 23:59:59
        
        // 正午前後
        assert_eq!(TimeCodeGenerator::get_time_code(11 * 3600 + 59 * 60 + 59), 0x11595900);  // 11:59:59
        assert_eq!(TimeCodeGenerator::get_time_code(12 * 3600), 0x12000000);  // 12:00:00
    }

    #[test]
    fn test_days_in_month() {
        // 通常年
        assert_eq!(DateCodeGenerator::days_in_month(2001, 1), 31);
        assert_eq!(DateCodeGenerator::days_in_month(2001, 2), 28);
        assert_eq!(DateCodeGenerator::days_in_month(2001, 3), 31);
        assert_eq!(DateCodeGenerator::days_in_month(2001, 4), 30);
        
        // うるう年
        assert_eq!(DateCodeGenerator::days_in_month(2000, 2), 29);
        assert_eq!(DateCodeGenerator::days_in_month(2004, 2), 29);
        
        // 100年は平年、400年はうるう年
        assert_eq!(DateCodeGenerator::days_in_month(1900, 2), 28);
        assert_eq!(DateCodeGenerator::days_in_month(2000, 2), 29);
    }
}

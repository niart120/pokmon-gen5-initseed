/// 統合シード探索のテストコード
use crate::integrated_search::{SearchResult, IntegratedSeedSearcher};
use crate::sha1::{calculate_pokemon_sha1, calculate_pokemon_seed_from_hash, swap_bytes_32};
use wasm_bindgen_test::*;

wasm_bindgen_test_configure!(run_in_browser);

#[cfg(test)]
mod tests {
    use super::*;

    // ==== SearchResult のテスト ====
    
    #[wasm_bindgen_test]
    fn test_search_result() {
        let result = SearchResult::new(0x12345678, "abcdef1234567890abcdef1234567890abcdef12".to_string(), 2012, 6, 15, 10, 30, 45, 1120, 50);
        assert_eq!(result.seed(), 0x12345678);
        assert_eq!(result.hash(), "abcdef1234567890abcdef1234567890abcdef12");
        assert_eq!(result.year(), 2012);
        assert_eq!(result.month(), 6);
        assert_eq!(result.date(), 15);
        assert_eq!(result.hour(), 10);
        assert_eq!(result.minute(), 30);
        assert_eq!(result.second(), 45);
        assert_eq!(result.timer0(), 1120);
        assert_eq!(result.vcount(), 50);
    }

    // ==== IntegratedSeedSearcher のテスト ====

    #[wasm_bindgen_test]
    fn test_integrated_searcher_creation() {
        let mac = [0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC];
        let nazo = [0x02215f10, 0x01000000, 0xc0000000, 0x00007fff, 0x00000000];
        
        let searcher = IntegratedSeedSearcher::new(&mac, &nazo, "DS", 5, 8);
        assert!(searcher.is_ok());
    }

    #[wasm_bindgen_test]
    fn test_invalid_mac_length() {
        let mac = [0x12, 0x34, 0x56, 0x78, 0x9A]; // 5 bytes instead of 6
        let nazo = [0x02215f10, 0x01000000, 0xc0000000, 0x00007fff, 0x00000000];
        
        let result = IntegratedSeedSearcher::new(&mac, &nazo, "DS", 5, 8);
        assert!(result.is_err());
    }

    #[wasm_bindgen_test]
    fn test_invalid_nazo_length() {
        let mac = [0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC];
        let nazo = [0x02215f10, 0x01000000, 0xc0000000, 0x00007fff]; // 4 elements instead of 5
        
        let result = IntegratedSeedSearcher::new(&mac, &nazo, "DS", 5, 8);
        assert!(result.is_err());
    }

    #[wasm_bindgen_test]
    fn test_invalid_hardware() {
        let mac = [0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC];
        let nazo = [0x02215f10, 0x01000000, 0xc0000000, 0x00007fff, 0x00000000];
        
        let result = IntegratedSeedSearcher::new(&mac, &nazo, "INVALID", 5, 8);
        assert!(result.is_err());
    }

    // ==== パフォーマンステスト ====
    
    #[wasm_bindgen_test]
    fn test_performance_sha1_calculation() {
        use js_sys::Date;
        use crate::sha1::{calculate_pokemon_sha1, calculate_pokemon_seed_from_hash};
        
        web_sys::console::log_1(&"=== SHA-1計算パフォーマンステスト開始 ===".into());
        
        // テスト用メッセージ（実際のポケモンメッセージ形式）
        let test_message: [u32; 16] = [
            0x02215f10, 0x01000000, 0xc0000000, 0x00007fff, 0x00000000, // nazo部分
            0x12345678, 0x9ABCDEF0, 0x34561234, // MAC部分（サンプル）
            0x0C0F0F04, 0x00120000, // 日時部分（サンプル）
            0x00000000, 0x00000000, 0x00000005, // 固定値
            0x80000000, 0x00000000, 0x000001A0, // SHA-1パディング
        ];
        
        // 大量のSHA-1計算パフォーマンステスト
        let iterations = 100_000; // 元の規模に戻す
        let output = format!("{}回のSHA-1計算を実行します...", iterations);
        web_sys::console::log_1(&output.into());
        
        let start = Date::now();
        let mut total_seeds = 0u64;
        
        for i in 0u32..iterations {
            // 各イテレーションでメッセージを少し変更（Timer0/VCountをシミュレート）
            let mut message = test_message;
            message[8] = message[8].wrapping_add(i % 0x10000u32); // Timer0相当
            message[9] = message[9].wrapping_add(i % 263u32);     // VCount相当
            
            // SHA-1計算
            let (h0, h1, _h2, _h3, _h4) = calculate_pokemon_sha1(&message);
            let seed = calculate_pokemon_seed_from_hash(h0, h1);
            total_seeds = total_seeds.wrapping_add(seed as u64);
        }
        
        let end = Date::now();
        let duration_ms = end - start;
        
        // 結果出力
        web_sys::console::log_1(&"=== SHA-1計算パフォーマンス結果 ===".into());
        let output = format!("計算回数: {}", iterations);
        web_sys::console::log_1(&output.into());
        let output = format!("実行時間: {:.2}ms", duration_ms);
        web_sys::console::log_1(&output.into());
        let calc_per_sec = (iterations as f64) / (duration_ms / 1000.0);
        let output = format!("1秒あたりの計算数: {:.2} calculations/sec", calc_per_sec);
        web_sys::console::log_1(&output.into());
        let avg_time_ns = (duration_ms * 1_000_000.0) / iterations as f64;
        let output = format!("1回あたりの平均時間: {:.2} ns", avg_time_ns);
        web_sys::console::log_1(&output.into());
        let output = format!("チェックサム: 0x{:016X}", total_seeds);
        web_sys::console::log_1(&output.into());
        
        // パフォーマンス基準チェック（実性能の50%程度を基準とする）
        assert!(calc_per_sec > 350_000.0, "SHA-1計算性能が基準を下回りました: {:.2} calc/sec", calc_per_sec);
        
        web_sys::console::log_1(&"=== SHA-1計算パフォーマンステスト完了 ===".into());
    }

    #[wasm_bindgen_test]
    fn test_performance_datetime_lookup_comparison() {
        use js_sys::Date;
        use crate::datetime_codes::{TimeCodeGenerator, DateCodeGenerator};
        
        web_sys::console::log_1(&"=== 日時ルックアップ比較テスト開始 ===".into());
        
        let iterations = 100_000; // 元の規模に戻す
        
        // 1. 境界チェック付きルックアップ
        let start = Date::now();
        let mut total_codes = 0u64;
        
        for i in 0u32..iterations {
            let time_index = i % 86400;
            let date_index = i % 36525;
            
            let date_code = DateCodeGenerator::get_date_code(date_index);
            let time_code = TimeCodeGenerator::get_time_code(time_index);
            
            total_codes = total_codes.wrapping_add(date_code as u64 + time_code as u64);
        }
        
        let end = Date::now();
        let safe_duration = end - start;
        
        // 2. 境界チェックなしルックアップ
        let start = Date::now();
        let mut total_codes_unsafe = 0u64;
        
        for i in 0u32..iterations {
            let time_index = (i % 86400) as usize;
            let date_index = (i % 36525) as usize;
            
            let date_code = unsafe { *DateCodeGenerator::DATE_CODES.get_unchecked(date_index) };
            let time_code = unsafe { *TimeCodeGenerator::TIME_CODES.get_unchecked(time_index) };
            
            total_codes_unsafe = total_codes_unsafe.wrapping_add(date_code as u64 + time_code as u64);
        }
        
        let end = Date::now();
        let unsafe_duration = end - start;
        
        // 結果比較
        web_sys::console::log_1(&"=== 日時ルックアップ比較結果 ===".into());
        let output = format!("境界チェック付き: {:.2}ms ({:.2} ns/回)", safe_duration, (safe_duration * 1_000_000.0) / iterations as f64);
        web_sys::console::log_1(&output.into());
        let output = format!("境界チェックなし: {:.2}ms ({:.2} ns/回)", unsafe_duration, (unsafe_duration * 1_000_000.0) / iterations as f64);
        web_sys::console::log_1(&output.into());
        let speedup = safe_duration / unsafe_duration;
        let output = format!("性能向上: {:.1}倍", speedup);
        web_sys::console::log_1(&output.into());
        
        // チェックサムが同じことを確認
        assert_eq!(total_codes, total_codes_unsafe, "境界チェック有無で結果が異なる");
        
        web_sys::console::log_1(&"=== 日時ルックアップ比較テスト完了 ===".into());
    }

    #[wasm_bindgen_test]
    fn test_performance_integrated_search() {
        use js_sys::Date;
        use crate::datetime_codes::{TimeCodeGenerator, DateCodeGenerator};
        
        web_sys::console::log_1(&"=== 統合シード探索パフォーマンステスト開始 ===".into());
        
        // テスト用パラメータ
        let mac = [0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC];
        let nazo = [0x02215f10, 0x01000000, 0xc0000000, 0x00007fff, 0x00000000];
        let target_seeds = vec![0x12345678, 0x87654321, 0xABCDEF01, 0x11111111];
        let hardware = "DS";
        
        // 基本メッセージテンプレートを事前構築（統合探索器と同じロジック）
        let mut base_message = [0u32; 16];
        
        // data[0-4]: Nazo values
        for i in 0..5 {
            base_message[i] = swap_bytes_32(nazo[i]);
        }
        
        // MAC address setup
        let mac_lower = ((mac[4] as u32) << 8) | (mac[5] as u32);
        base_message[6] = mac_lower;
        let mac_upper = (mac[0] as u32) | ((mac[1] as u32) << 8) | ((mac[2] as u32) << 16) | ((mac[3] as u32) << 24);
        let gx_stat = 0x06000000u32;
        let frame = 8u32;
        let data7 = mac_upper ^ gx_stat ^ frame;
        base_message[7] = swap_bytes_32(data7);
        
        base_message[10] = 0x00000000;
        base_message[11] = 0x00000000;
        base_message[12] = swap_bytes_32(5); // key_input
        base_message[13] = 0x80000000;
        base_message[14] = 0x00000000;
        base_message[15] = 0x000001A0;
        
        // 探索範囲設定（2日間のテスト）
        let range_seconds = 2 * 24 * 3600; // 2日間
        let timer0_range = 6;   // 実用的なTimer0範囲
        let vcount_range = 2;   // 実用的なVCount範囲
        
        let total_calculations = range_seconds as u64 * timer0_range * vcount_range * target_seeds.len() as u64;
        let output = format!("探索範囲: {}秒 × Timer0({}) × VCount({}) × ターゲット({}) = {} 計算", 
                range_seconds, timer0_range, vcount_range, target_seeds.len(), total_calculations);
        web_sys::console::log_1(&output.into());
        
        // 開始日時設定（2012-06-15 12:00:00 UTC）
        let base_timestamp = 1339718400i64; // 2012-06-15 12:00:00 UTC
        let base_seconds_since_2000 = base_timestamp - 946684800i64; // EPOCH_2000_UNIX
        
        let start = Date::now();
        let mut matches_found = 0;
        let mut calculations_done = 0u64;
        
        // 統合探索のメインループ（WebAssembly部分を除く）
        for second_offset in 0..range_seconds {
            let current_seconds_since_2000 = base_seconds_since_2000 + second_offset as i64;
            
            if current_seconds_since_2000 < 0 {
                continue;
            }
            
            // 日時インデックス計算
            let time_index = (current_seconds_since_2000 % 86400) as u32;
            let date_index = (current_seconds_since_2000 / 86400) as u32;
            
            // 日時コード取得
            let time_code = TimeCodeGenerator::get_time_code_for_hardware(time_index, hardware);
            let date_code = DateCodeGenerator::get_date_code(date_index);
            
            // Timer0とVCount範囲探索
            for timer0 in 0..timer0_range {
                for vcount in 0..vcount_range {
                    // メッセージ構築
                    let mut message = base_message;
                    message[5] = swap_bytes_32(((vcount as u32) << 16) | (timer0 as u32));
                    message[8] = date_code;
                    message[9] = time_code;
                    
                    // SHA-1計算とシード生成
                    let (h0, h1, _h2, _h3, _h4) = calculate_pokemon_sha1(&message);
                    let seed = calculate_pokemon_seed_from_hash(h0, h1);
                    
                    // ターゲットシードとマッチング
                    for &target in &target_seeds {
                        if seed == target {
                            matches_found += 1;
                        }
                    }
                    
                    calculations_done += 1;
                }
            }
        }
        
        let end = Date::now();
        let duration_ms = end - start;
        
        // 結果出力
        web_sys::console::log_1(&"=== 統合シード探索パフォーマンス結果 ===".into());
        let output = format!("総計算回数: {}", calculations_done);
        web_sys::console::log_1(&output.into());
        let output = format!("実行時間: {:.2}ms", duration_ms);
        web_sys::console::log_1(&output.into());
        let output = format!("発見されたマッチ: {}", matches_found);
        web_sys::console::log_1(&output.into());
        let calc_per_sec = (calculations_done as f64) / (duration_ms / 1000.0);
        let output = format!("1秒あたりの計算数: {:.2} calculations/sec", calc_per_sec);
        web_sys::console::log_1(&output.into());
        
        if calculations_done > 0 {
            let avg_time_ns = (duration_ms * 1_000_000.0) / calculations_done as f64;
            let output = format!("1回あたりの平均時間: {:.2} ns", avg_time_ns);
            web_sys::console::log_1(&output.into());
        }
        
        // パフォーマンス基準チェック（実性能の50%程度を基準とする）
        assert!(calc_per_sec > 250_000.0, "統合探索性能が基準を下回りました: {:.2} calc/sec", calc_per_sec);
        
        web_sys::console::log_1(&"=== 統合シード探索パフォーマンステスト完了 ===".into());
    }

    // SearchResult テスト（元 search_result.rs から移行）
    #[wasm_bindgen_test]
    fn test_search_result_creation_and_getters() {
        let result = SearchResult::new(
            0x12345678, 
            "abcdef1234567890abcdef1234567890abcdef12".to_string(), 
            2012, 6, 15, 10, 30, 45, 1120, 50
        );
        
        assert_eq!(result.seed(), 0x12345678);
        assert_eq!(result.hash(), "abcdef1234567890abcdef1234567890abcdef12");
        assert_eq!(result.year(), 2012);
        assert_eq!(result.month(), 6);
        assert_eq!(result.date(), 15);
        assert_eq!(result.hour(), 10);
        assert_eq!(result.minute(), 30);
        assert_eq!(result.second(), 45);
        assert_eq!(result.timer0(), 1120);
        assert_eq!(result.vcount(), 50);
    }
}

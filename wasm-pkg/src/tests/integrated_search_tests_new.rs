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
        let iterations = 100_000; // 元の規模
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
        let output1 = format!("計算回数: {}", iterations);
        web_sys::console::log_1(&output1.into());
        let output2 = format!("実行時間: {:.2}ms", duration_ms);
        web_sys::console::log_1(&output2.into());
        let calc_per_sec = (iterations as f64) / (duration_ms / 1000.0);
        let output3 = format!("1秒あたりの計算数: {:.2} calculations/sec", calc_per_sec);
        web_sys::console::log_1(&output3.into());
        let avg_time_ns = (duration_ms * 1_000_000.0) / iterations as f64;
        let output4 = format!("1回あたりの平均時間: {:.2} ns", avg_time_ns);
        web_sys::console::log_1(&output4.into());
        let output5 = format!("チェックサム: 0x{:016X}", total_seeds);
        web_sys::console::log_1(&output5.into());
        
        // WebAssembly SHA-1性能評価
        if calc_per_sec > 100_000.0 {
            web_sys::console::log_1(&"SHA-1性能評価: 優秀 (>100K calc/sec)".into());
        } else if calc_per_sec > 50_000.0 {
            web_sys::console::log_1(&"SHA-1性能評価: 良好 (>50K calc/sec)".into());
        } else if calc_per_sec > 10_000.0 {
            web_sys::console::log_1(&"SHA-1性能評価: 標準 (>10K calc/sec)".into());
        } else {
            web_sys::console::log_1(&"SHA-1性能評価: 要改善 (<10K calc/sec)".into());
        }
        
        // パフォーマンス基準チェック
        assert!(calc_per_sec > 10_000.0, "SHA-1計算性能が基準を下回りました: {:.2} calc/sec", calc_per_sec);
        
        web_sys::console::log_1(&"=== SHA-1計算パフォーマンステスト完了 ===".into());
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

/// 統合シード探索システム
/// メッセージ生成とSHA-1計算を一体化し、WebAssembly内で完結する高速探索を実現
use wasm_bindgen::prelude::*;
use std::collections::BTreeSet;
use crate::datetime_codes::{TimeCodeGenerator, DateCodeGenerator};
use crate::sha1::{calculate_pokemon_sha1, swap_bytes_32};
use chrono::{NaiveDate, Datelike, Timelike};

// Import the `console.log` function from the browser console
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

/// 2000年1月1日 00:00:00 UTCのUnix時間戳
const EPOCH_2000_UNIX: i64 = 946684800;

/// 探索結果構造体
#[wasm_bindgen]
#[derive(Debug, Clone)]
pub struct SearchResult {
    seed: u32,
    year: u32,
    month: u32,
    date: u32,
    hour: u32,
    minute: u32,
    second: u32,
    timer0: u32,
    vcount: u32,
}

#[wasm_bindgen]
impl SearchResult {
    #[wasm_bindgen(constructor)]
    #[allow(clippy::too_many_arguments)]  // WebAssembly constructor requires all parameters
    pub fn new(seed: u32, year: u32, month: u32, date: u32, hour: u32, minute: u32, second: u32, timer0: u32, vcount: u32) -> SearchResult {
        SearchResult { seed, year, month, date, hour, minute, second, timer0, vcount }
    }
    
    #[wasm_bindgen(getter)]
    pub fn seed(&self) -> u32 { self.seed }
    #[wasm_bindgen(getter)]
    pub fn year(&self) -> u32 { self.year }
    #[wasm_bindgen(getter)]
    pub fn month(&self) -> u32 { self.month }
    #[wasm_bindgen(getter)]
    pub fn date(&self) -> u32 { self.date }
    #[wasm_bindgen(getter)]
    pub fn hour(&self) -> u32 { self.hour }
    #[wasm_bindgen(getter)]
    pub fn minute(&self) -> u32 { self.minute }
    #[wasm_bindgen(getter)]
    pub fn second(&self) -> u32 { self.second }
    #[wasm_bindgen(getter)]
    pub fn timer0(&self) -> u32 { self.timer0 }
    #[wasm_bindgen(getter)]
    pub fn vcount(&self) -> u32 { self.vcount }
}

/// 統合シード探索器
/// 固定パラメータを事前計算し、日時範囲を高速探索する
#[wasm_bindgen]
pub struct IntegratedSeedSearcher {
    // 実行時に必要なパラメータ
    hardware: String,
    
    // キャッシュされた基本メッセージ
    base_message: [u32; 16],
}

#[wasm_bindgen]
impl IntegratedSeedSearcher {
    /// コンストラクタ: 固定パラメータの事前計算
    #[wasm_bindgen(constructor)]
    pub fn new(mac: &[u8], nazo: &[u32], hardware: &str, key_input: u32, frame: u32) -> Result<IntegratedSeedSearcher, JsValue> {
        // バリデーション
        if mac.len() != 6 {
            return Err(JsValue::from_str("MAC address must be 6 bytes"));
        }
        if nazo.len() != 5 {
            return Err(JsValue::from_str("nazo must be 5 32-bit words"));
        }
        
        // Hardware type validation
        match hardware {
            "DS" | "DS_LITE" | "3DS" => {},
            _ => return Err(JsValue::from_str("Hardware must be DS, DS_LITE, or 3DS")),
        }

        // 基本メッセージテンプレートを事前構築（TypeScript側レイアウトに準拠）
        let mut base_message = [0u32; 16];
        
        // data[0-4]: Nazo values (little-endian conversion already applied)
        for i in 0..5 {
            base_message[i] = swap_bytes_32(nazo[i]);
        }
        
        // data[5]: (VCount << 16) | Timer0 - 動的に設定
        // data[6]: MAC address lower 16 bits (no endian conversion)
        let mac_lower = ((mac[4] as u32) << 8) | (mac[5] as u32);
        base_message[6] = mac_lower;
        
        // data[7]: MAC address upper 32 bits XOR GxStat XOR Frame (little-endian conversion needed)
        let mac_upper = (mac[0] as u32) | ((mac[1] as u32) << 8) | ((mac[2] as u32) << 16) | ((mac[3] as u32) << 24);
        let gx_stat = 0x06000000u32;
        let data7 = mac_upper ^ gx_stat ^ frame;
        base_message[7] = swap_bytes_32(data7);
        
        // data[8]: Date (YYMMDDWW format) - 動的に設定
        // data[9]: Time (HHMMSS00 format + PM flag) - 動的に設定
        // data[10-11]: Fixed values 0x00000000
        base_message[10] = 0x00000000;
        base_message[11] = 0x00000000;
        
        // data[12]: Key input (now configurable)
        base_message[12] = swap_bytes_32(key_input);
        
        // data[13-15]: SHA-1 padding
        base_message[13] = 0x80000000;
        base_message[14] = 0x00000000;
        base_message[15] = 0x000001A0;

        Ok(IntegratedSeedSearcher {
            hardware: hardware.to_string(),
            base_message,
        })
    }

    /// 統合シード探索メイン関数
    /// 日時範囲とTimer0/VCount範囲を指定して一括探索
    #[wasm_bindgen]
    #[allow(clippy::too_many_arguments)]  // Search function requires comprehensive parameters
    pub fn search_seeds_integrated(
        &self,
        year_start: u32,
        month_start: u32,
        date_start: u32,
        hour_start: u32,
        minute_start: u32,
        second_start: u32,
        range_seconds: u32,
        timer0_min: u32,
        timer0_max: u32,
        vcount_min: u32,
        vcount_max: u32,
        target_seeds: &[u32],
    ) -> js_sys::Array {
        
        let results = js_sys::Array::new();

        // Target seedsをBTreeSetに変換して高速ルックアップを実現
        let target_set: BTreeSet<u32> = target_seeds.iter().cloned().collect();

        // 開始日時をUnix時間に変換（ループ外で1回のみ実行）
        let start_datetime = match NaiveDate::from_ymd_opt(year_start as i32, month_start, date_start)
            .and_then(|date| date.and_hms_opt(hour_start, minute_start, second_start)) 
        {
            Some(datetime) => datetime,
            None => {
                return results;
            }
        };
        
        let start_unix = start_datetime.and_utc().timestamp();
        let base_seconds_since_2000 = start_unix - EPOCH_2000_UNIX;

        // 外側ループ: Timer0とVCount（SIMD版と同様の構造）
        for timer0 in timer0_min..=timer0_max {
            for vcount in vcount_min..=vcount_max {
                
                // 内側ループ: 日時範囲の探索
                for second_offset in 0..range_seconds {
                    let current_seconds_since_2000 = base_seconds_since_2000 + second_offset as i64;
                    
                    let (time_code, date_code) = match self.calculate_datetime_codes(current_seconds_since_2000) {
                        Some(result) => result,
                        None => continue,
                    };
                    
                    // メッセージを構築してSHA-1計算
                    let message = self.build_message(timer0, vcount, date_code, time_code);
                    let (h0, h1, _h2, _h3, _h4) = calculate_pokemon_sha1(&message);
                    let seed = crate::sha1::calculate_pokemon_seed_from_hash(h0, h1);
                    
                    // ターゲットシードマッチ時のみ日時を生成
                    self.check_and_add_result(seed, current_seconds_since_2000, timer0, vcount, &target_set, &results);
                }
            }
        }

        results
    }

    /// 統合シード探索SIMD版
    /// range_secondsを最内ループに配置してSIMD SHA-1計算を活用
    #[wasm_bindgen]
    #[allow(clippy::too_many_arguments)]  // SIMD search function requires comprehensive parameters
    pub fn search_seeds_integrated_simd(
        &self,
        year_start: u32,
        month_start: u32,
        date_start: u32,
        hour_start: u32,
        minute_start: u32,
        second_start: u32,
        range_seconds: u32,
        timer0_min: u32,
        timer0_max: u32,
        vcount_min: u32,
        vcount_max: u32,
        target_seeds: &[u32],
    ) -> js_sys::Array {
        
        let results = js_sys::Array::new();

        // Target seedsをBTreeSetに変換して高速ルックアップを実現
        let target_set: BTreeSet<u32> = target_seeds.iter().cloned().collect();

        // 開始日時をUnix時間に変換（ループ外で1回のみ実行）
        let start_datetime = match NaiveDate::from_ymd_opt(year_start as i32, month_start, date_start)
            .and_then(|date| date.and_hms_opt(hour_start, minute_start, second_start)) 
        {
            Some(datetime) => datetime,
            None => {
                return results;
            }
        };
        
        let start_unix = start_datetime.and_utc().timestamp();
        let base_seconds_since_2000 = start_unix - EPOCH_2000_UNIX;

        // 外側ループ: Timer0とVCount
        for timer0 in timer0_min..=timer0_max {
            for vcount in vcount_min..=vcount_max {
                for second_offset in (0..range_seconds).step_by(4) {
                    let batch_size = std::cmp::min(4, range_seconds - second_offset);
                    
                    if batch_size == 4 {
                        // 4つの秒を並列処理
                        self.process_simd_batch(
                            second_offset, 
                            base_seconds_since_2000, 
                            timer0, 
                            vcount, 
                            &target_set, 
                            &results
                        );
                    } else {
                        // 残りの秒を個別処理
                        self.process_remaining_seconds(
                            second_offset, 
                            batch_size, 
                            base_seconds_since_2000, 
                            timer0, 
                            vcount, 
                            &target_set, 
                            &results
                        );
                    }
                }
            }
        }

        results
    }

    /// SIMD バッチ処理（4つの秒を並列計算）
    fn process_simd_batch(
        &self,
        second_offset: u32,
        base_seconds_since_2000: i64,
        timer0: u32,
        vcount: u32,
        target_seeds: &BTreeSet<u32>,
        results: &js_sys::Array,
    ) {
        let mut messages = [0u32; 64]; // 4組 × 16ワード
        let mut valid_messages = [true; 4];
        let mut seconds_batch = [0i64; 4]; // 結果生成用
        
        // Timer0/VCountの値を事前に計算（SIMD用）
        let timer_vcount_value = (vcount << 16) | timer0;
        let swapped_timer_vcount = crate::sha1::swap_bytes_32(timer_vcount_value);
        
        // 4つのメッセージを準備
        for i in 0..4 {
            let current_second_offset = second_offset + i as u32;
            let current_seconds_since_2000 = base_seconds_since_2000 + current_second_offset as i64;
            
            let (time_code, date_code) = match self.calculate_datetime_codes(current_seconds_since_2000) {
                Some(result) => result,
                None => {
                    valid_messages[i] = false;
                    continue;
                }
            };
            
            seconds_batch[i] = current_seconds_since_2000;
            
            // メッセージを構築してバッチに追加（バイトスワップ済み値を使用）
            let mut message = self.base_message;
            message[5] = swapped_timer_vcount; // 事前計算済み
            message[8] = date_code;
            message[9] = time_code;
            
            let base_idx = i * 16;
            messages[base_idx..base_idx + 16].copy_from_slice(&message);
        }
        
        // SIMD SHA-1計算を実行
        let hash_results = crate::sha1_simd::calculate_pokemon_sha1_simd(&messages);
        
        // 各組の結果を処理
        for i in 0..4 {
            if !valid_messages[i] {
                continue;
            }
            
            let (h0, h1) = (hash_results[i * 5], hash_results[i * 5 + 1]);
            let seed = crate::sha1::calculate_pokemon_seed_from_hash(h0, h1);
            
            // マッチ時のみ日時を生成
            self.check_and_add_result(seed, seconds_batch[i], timer0, vcount, target_seeds, results);
        }
    }

    /// 端数秒の個別処理（非SIMD）
    fn process_remaining_seconds(
        &self,
        second_offset: u32,
        batch_size: u32,
        base_seconds_since_2000: i64,
        timer0: u32,
        vcount: u32,
        target_seeds: &BTreeSet<u32>,
        results: &js_sys::Array,
    ) {
        for i in 0..batch_size {
            let current_second_offset = second_offset + i;
            let current_seconds_since_2000 = base_seconds_since_2000 + current_second_offset as i64;
            
            let (time_code, date_code) = match self.calculate_datetime_codes(current_seconds_since_2000) {
                Some(result) => result,
                None => continue,
            };
            
            // メッセージを構築してSHA-1計算
            let message = self.build_message(timer0, vcount, date_code, time_code);
            let (h0, h1, _h2, _h3, _h4) = crate::sha1::calculate_pokemon_sha1(&message);
            let seed = crate::sha1::calculate_pokemon_seed_from_hash(h0, h1);
            
            // マッチ時のみ日時を生成
            self.check_and_add_result(seed, current_seconds_since_2000, timer0, vcount, target_seeds, results);
        }
    }

    /// 日時コード生成（結果表示用日時は遅延生成）
    fn calculate_datetime_codes(&self, seconds_since_2000: i64) -> Option<(u32, u32)> {
        if seconds_since_2000 < 0 {
            return None;
        }
        
        let time_index = (seconds_since_2000 % 86400) as u32;
        let date_index = (seconds_since_2000 / 86400) as u32;

        let time_code = TimeCodeGenerator::get_time_code_for_hardware(time_index, &self.hardware);
        let date_code = DateCodeGenerator::get_date_code(date_index);
        
        Some((time_code, date_code))
    }

    /// 結果表示用の日時を生成（マッチした場合のみ）
    fn generate_display_datetime(&self, seconds_since_2000: i64) -> Option<(u32, u32, u32, u32, u32, u32)> {
        let result_datetime = chrono::DateTime::from_timestamp(seconds_since_2000 + EPOCH_2000_UNIX, 0)?
            .naive_utc();
        
        Some((
            result_datetime.year() as u32,
            result_datetime.month(),
            result_datetime.day(),
            result_datetime.hour(),
            result_datetime.minute(),
            result_datetime.second()
        ))
    }

    /// メッセージ構築の共通処理
    fn build_message(&self, timer0: u32, vcount: u32, date_code: u32, time_code: u32) -> [u32; 16] {
        let mut message = self.base_message;
        message[5] = crate::sha1::swap_bytes_32((vcount << 16) | timer0);
        message[8] = date_code;
        message[9] = time_code;
        message
    }

    /// 結果チェックと追加（マッチ時のみ日時を生成）
    fn check_and_add_result(
        &self,
        seed: u32,
        seconds_since_2000: i64,
        timer0: u32,
        vcount: u32,
        target_seeds: &BTreeSet<u32>,
        results: &js_sys::Array,
    ) {
        if target_seeds.contains(&seed) {
            // マッチした場合のみ日時を生成
            if let Some(datetime) = self.generate_display_datetime(seconds_since_2000) {
                let (year, month, date, hour, minute, second) = datetime;
                let result = SearchResult::new(seed, year, month, date, hour, minute, second, timer0, vcount);
                results.push(&JsValue::from(result));
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_integrated_searcher_creation() {
        let mac = [0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC];
        let nazo = [0x02215f10, 0x01000000, 0xc0000000, 0x00007fff, 0x00000000];
        
        let searcher = IntegratedSeedSearcher::new(&mac, &nazo, "DS", 5, 8);
        assert!(searcher.is_ok());
    }
    
    #[test]
    fn test_search_result() {
        let result = SearchResult::new(0x12345678, 2012, 6, 15, 10, 30, 45, 1120, 50);
        assert_eq!(result.seed(), 0x12345678);
        assert_eq!(result.year(), 2012);
        assert_eq!(result.month(), 6);
    }

    #[test]
    fn test_performance_sha1_calculation() {
        use std::time::Instant;
        use crate::sha1::{calculate_pokemon_sha1, calculate_pokemon_seed_from_hash};
        
        println!("=== SHA-1計算パフォーマンステスト開始 ===");
        
        // テスト用メッセージ（実際のポケモンメッセージ形式）
        let test_message: [u32; 16] = [
            0x02215f10, 0x01000000, 0xc0000000, 0x00007fff, 0x00000000, // nazo部分
            0x12345678, 0x9ABCDEF0, 0x34561234, // MAC部分（サンプル）
            0x0C0F0F04, 0x00120000, // 日時部分（サンプル）
            0x00000000, 0x00000000, 0x00000005, // 固定値
            0x80000000, 0x00000000, 0x000001A0, // SHA-1パディング
        ];
        
        // 大量のSHA-1計算パフォーマンステスト
        let iterations = 100_000;
        println!("{}回のSHA-1計算を実行します...", iterations);
        
        let start = Instant::now();
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
        
        let duration = start.elapsed();
        
        // 結果出力
        println!("=== SHA-1計算パフォーマンス結果 ===");
        println!("計算回数: {}", iterations);
        println!("実行時間: {:?}", duration);
        println!("1秒あたりの計算数: {:.2} calculations/sec", iterations as f64 / duration.as_secs_f64());
        println!("1回あたりの平均時間: {:.2} ns", duration.as_nanos() as f64 / iterations as f64);
        println!("チェックサム: 0x{:016X}", total_seeds); // 計算が正しく実行されたことの確認
        
        // パフォーマンス基準チェック
        let calc_per_sec = iterations as f64 / duration.as_secs_f64();
        assert!(calc_per_sec > 50_000.0, "SHA-1計算性能が基準を下回りました: {:.2} calc/sec", calc_per_sec);
        
        println!("=== SHA-1計算パフォーマンステスト完了 ===");
    }

    #[test]
    fn test_performance_datetime_lookup_comparison() {
        use std::time::Instant;
        use crate::datetime_codes::{TimeCodeGenerator, DateCodeGenerator};
        
        println!("=== 日時ルックアップ比較テスト開始 ===");
        
        let iterations = 100_000;
        
        // 1. 境界チェック付きルックアップ
        let start = Instant::now();
        let mut total_codes = 0u64;
        
        for i in 0u32..iterations {
            let time_index = i % 86400;
            let date_index = i % 36525;
            
            let date_code = DateCodeGenerator::get_date_code(date_index);
            let time_code = TimeCodeGenerator::get_time_code(time_index);
            
            total_codes = total_codes.wrapping_add(date_code as u64 + time_code as u64);
        }
        
        let safe_duration = start.elapsed();
        
        // 2. 境界チェックなしルックアップ
        let start = Instant::now();
        let mut total_codes_unsafe = 0u64;
        
        for i in 0u32..iterations {
            let time_index = (i % 86400) as usize;
            let date_index = (i % 36525) as usize;
            
            let date_code = unsafe { *DateCodeGenerator::DATE_CODES.get_unchecked(date_index) };
            let time_code = unsafe { *TimeCodeGenerator::TIME_CODES.get_unchecked(time_index) };
            
            total_codes_unsafe = total_codes_unsafe.wrapping_add(date_code as u64 + time_code as u64);
        }
        
        let unsafe_duration = start.elapsed();
        
        // 結果比較
        println!("=== 日時ルックアップ比較結果 ===");
        println!("境界チェック付き: {:?} ({:.2} ns/回)", safe_duration, safe_duration.as_nanos() as f64 / iterations as f64);
        println!("境界チェックなし: {:?} ({:.2} ns/回)", unsafe_duration, unsafe_duration.as_nanos() as f64 / iterations as f64);
        println!("性能向上: {:.1}倍", safe_duration.as_nanos() as f64 / unsafe_duration.as_nanos() as f64);
        
        // チェックサムが同じことを確認
        assert_eq!(total_codes, total_codes_unsafe, "境界チェック有無で結果が異なる");
        
        println!("=== 日時ルックアップ比較テスト完了 ===");
    }

    #[test]
    fn test_performance_integrated_search() {
        use std::time::Instant;
        
        println!("=== 統合シード探索パフォーマンステスト開始 ===");
        
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
        
        // 探索範囲設定（実用的な範囲）
        let range_seconds = 5 * 24 * 3600; // 5日間
        let timer0_range = 6;   // 実用的なTimer0範囲
        let vcount_range = 2;   // 実用的なVCount範囲
        
        let total_calculations = range_seconds as u64 * timer0_range * vcount_range * target_seeds.len() as u64;
        println!("探索範囲: {}秒 × Timer0({}) × VCount({}) × ターゲット({}) = {} 計算", 
                range_seconds, timer0_range, vcount_range, target_seeds.len(), total_calculations);
        
        // 開始日時設定（2012-06-15 12:00:00 UTC）
        let base_timestamp = 1339718400i64; // 2012-06-15 12:00:00 UTC
        let base_seconds_since_2000 = base_timestamp - EPOCH_2000_UNIX;
        
        let start = Instant::now();
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
                    let seed = crate::sha1::calculate_pokemon_seed_from_hash(h0, h1);
                    
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
        
        let duration = start.elapsed();
        
        // 結果出力
        println!("=== 統合シード探索パフォーマンス結果 ===");
        println!("総計算回数: {}", calculations_done);
        println!("実行時間: {:?}", duration);
        println!("発見されたマッチ: {}", matches_found);
        println!("1秒あたりの計算数: {:.2} calculations/sec", calculations_done as f64 / duration.as_secs_f64());
        
        if calculations_done > 0 {
            println!("1回あたりの平均時間: {:.2} ns", duration.as_nanos() as f64 / calculations_done as f64);
        }
        
        // 5日分の計算量推定（実用範囲での実測値）
        let practical_timer0_range = 6; // 実用的なTimer0範囲
        let practical_vcount_range = 2; // 実用的なVCount範囲
        let practical_calculations = range_seconds as u64 * practical_timer0_range * practical_vcount_range * target_seeds.len() as u64;
        
        if duration.as_secs_f64() > 0.0 {
            let calc_per_sec = calculations_done as f64 / duration.as_secs_f64();
            let estimated_practical_time = practical_calculations as f64 / calc_per_sec;
            println!("実用範囲での5日分計算推定時間: {:.2} 秒 ({:.2} 分, {:.2} 時間)", 
                    estimated_practical_time, estimated_practical_time / 60.0, estimated_practical_time / 3600.0);
        }
        
        // パフォーマンス基準チェック
        let calc_per_sec = calculations_done as f64 / duration.as_secs_f64();
        assert!(calc_per_sec > 1000.0, "統合探索性能が基準を下回りました: {:.2} calc/sec", calc_per_sec);
        
        println!("=== 統合シード探索パフォーマンステスト完了 ===");
    }
}

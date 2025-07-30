/// 統合シード探索アルゴリズムの実装
use wasm_bindgen::prelude::*;
use std::collections::BTreeSet;
use crate::searcher::IntegratedSeedSearcher;
use crate::search_result::SearchResult;
use crate::datetime_codes::{TimeCodeGenerator, DateCodeGenerator};
use crate::sha1::calculate_pokemon_sha1;
use chrono::{NaiveDate, Datelike, Timelike};

/// 2000年1月1日 00:00:00 UTCのUnix時間戳
const EPOCH_2000_UNIX: i64 = 946684800;

// Import the `console.log` function from the browser console
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

/// 探索アルゴリズムの実装
#[wasm_bindgen]
impl IntegratedSeedSearcher {
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
                    let (h0, h1, h2, h3, h4) = calculate_pokemon_sha1(&message);
                    let seed = crate::sha1::calculate_pokemon_seed_from_hash(h0, h1);
                    
                    // ターゲットシードマッチ時のみ日時とハッシュを生成
                    self.check_and_add_result(seed, h0, h1, h2, h3, h4, current_seconds_since_2000, timer0, vcount, &target_set, &results);
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
            let mut message = *self.base_message();
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
            
            let h0 = hash_results[i * 5];
            let h1 = hash_results[i * 5 + 1];
            let h2 = hash_results[i * 5 + 2];
            let h3 = hash_results[i * 5 + 3];
            let h4 = hash_results[i * 5 + 4];
            let seed = crate::sha1::calculate_pokemon_seed_from_hash(h0, h1);
            
            // マッチ時のみ日時とハッシュを生成
            self.check_and_add_result(seed, h0, h1, h2, h3, h4, seconds_batch[i], timer0, vcount, target_seeds, results);
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
            let (h0, h1, h2, h3, h4) = calculate_pokemon_sha1(&message);
            let seed = crate::sha1::calculate_pokemon_seed_from_hash(h0, h1);
            
            // マッチ時のみ日時とハッシュを生成
            self.check_and_add_result(seed, h0, h1, h2, h3, h4, current_seconds_since_2000, timer0, vcount, target_seeds, results);
        }
    }

    /// 日時コード生成（結果表示用日時は遅延生成）
    fn calculate_datetime_codes(&self, seconds_since_2000: i64) -> Option<(u32, u32)> {
        if seconds_since_2000 < 0 {
            return None;
        }
        
        let time_index = (seconds_since_2000 % 86400) as u32;
        let date_index = (seconds_since_2000 / 86400) as u32;

        let time_code = TimeCodeGenerator::get_time_code_for_hardware(time_index, self.hardware());
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
        let mut message = *self.base_message();
        message[5] = crate::sha1::swap_bytes_32((vcount << 16) | timer0);
        message[8] = date_code;
        message[9] = time_code;
        message
    }

    /// ハッシュ値を16進数文字列に変換
    fn hash_to_hex_string(&self, h0: u32, h1: u32, h2: u32, h3: u32, h4: u32) -> String {
        format!("{:08x}{:08x}{:08x}{:08x}{:08x}", h0, h1, h2, h3, h4)
    }

    /// 結果チェックと追加（マッチ時のみ日時とハッシュを生成）
    fn check_and_add_result(
        &self,
        seed: u32,
        h0: u32,
        h1: u32,
        h2: u32,
        h3: u32,
        h4: u32,
        seconds_since_2000: i64,
        timer0: u32,
        vcount: u32,
        target_seeds: &BTreeSet<u32>,
        results: &js_sys::Array,
    ) {
        if target_seeds.contains(&seed) {
            // マッチした場合のみ日時とハッシュを生成
            if let Some(datetime) = self.generate_display_datetime(seconds_since_2000) {
                let (year, month, date, hour, minute, second) = datetime;
                let hash = self.hash_to_hex_string(h0, h1, h2, h3, h4);
                let result = SearchResult::new(seed, hash, year, month, date, hour, minute, second, timer0, vcount);
                results.push(&JsValue::from(result));
            }
        }
    }
}

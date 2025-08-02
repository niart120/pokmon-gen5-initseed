/// OffsetCalculator - BW/BW2オフセット計算エンジン
/// ゲーム初期化処理とProbability Table操作を実装
use wasm_bindgen::prelude::*;
use crate::personality_rng::PersonalityRNG;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

/// デバッグログ出力マクロ
macro_rules! console_log {
    ($($t:tt)*) => (log(&format_args!($($t)*).to_string()))
}

/// ゲームモード列挙型
#[wasm_bindgen]
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum GameMode {
    /// 続きから（Cギア有効）
    ContinueWithCGear = 0,
    /// 続きから（Cギア無効）
    ContinueWithoutCGear = 1,
    /// はじめから（Cギア有効）
    NewGameWithCGear = 2,
    /// はじめから（Cギア無効）
    NewGameWithoutCGear = 3,
    /// はじめから（メモリリンク有効、Cギア有効）
    NewGameWithMemoryLinkWithCGear = 4,
    /// はじめから（メモリリンク有効、Cギア無効）
    NewGameWithMemoryLinkWithoutCGear = 5,
    /// はじめから（チャレンジモード、Cギア有効）
    NewGameChallengeModeWithCGear = 6,
    /// はじめから（チャレンジモード、Cギア無効）
    NewGameChallengeModeWithoutCGear = 7,
}

/// Probability Table操作結果
#[wasm_bindgen]
#[derive(Debug, Clone, Copy)]
pub struct PTResult {
    /// 消費した乱数回数
    pub advances: u32,
    /// 最終的な値
    pub final_value: u32,
    /// 成功フラグ
    pub success: bool,
}

#[wasm_bindgen]
impl PTResult {
    #[wasm_bindgen(getter)]
    pub fn advances(&self) -> u32 { self.advances }
    
    #[wasm_bindgen(getter)]
    pub fn final_value(&self) -> u32 { self.final_value }
    
    #[wasm_bindgen(getter)]
    pub fn success(&self) -> bool { self.success }
}

/// オフセット計算エンジン
#[wasm_bindgen]
pub struct OffsetCalculator {
    advances: u32,
    rng: PersonalityRNG,
}

#[wasm_bindgen]
impl OffsetCalculator {
    /// 新しいOffsetCalculatorインスタンスを作成
    /// 
    /// # Arguments
    /// * `seed` - 初期シード値
    #[wasm_bindgen(constructor)]
    pub fn new(seed: u64) -> OffsetCalculator {
        OffsetCalculator {
            advances: 0,
            rng: PersonalityRNG::new(seed),
        }
    }

    /// 次のシード値を取得
    /// 
    /// # Returns
    /// 次のシード値
    pub fn next_seed(&mut self) -> u64 {
        self.advances += 1;
        self.rng.next_u64()
    }

    /// 指定回数だけ乱数を消費
    /// 
    /// # Arguments
    /// * `count` - 消費する回数
    pub fn consume_random(&mut self, count: u32) {
        self.rng.advance(count);
        self.advances += count;
    }

    /// 現在の進行回数を取得
    /// 
    /// # Returns
    /// 進行回数
    #[wasm_bindgen(getter)]
    pub fn advances(&self) -> u32 {
        self.advances
    }

    /// 現在のシード値を取得
    /// 
    /// # Returns
    /// 現在のシード値
    #[wasm_bindgen(getter)]
    pub fn current_seed(&self) -> u64 {
        self.rng.seed()
    }

    /// TID/SID決定処理
    /// 
    /// # Returns
    /// (TID, SID)のタプル
    pub fn calculate_tid_sid(&mut self) -> Vec<u32> {
        let tid = self.rng.next() & 0xFFFF;  // 下位16bit
        let sid = self.rng.next() & 0xFFFF;  // 下位16bit
        self.advances += 2;
        vec![tid, sid]
    }

    /// ブラックシティ住人決定処理（BW用）
    /// 
    /// # Returns
    /// 決定された住人数
    pub fn determine_front_residents(&mut self) -> u32 {
        // BW: ブラックシティの住人決定
        // 簡略化された実装（実際はより複雑）
        let resident_count = (self.rng.next() % 10) + 5; // 5-14人
        self.advances += 1;
        resident_count
    }

    /// ホワイトフォレスト住人決定処理（BW用）
    /// 
    /// # Returns
    /// 決定された住人数
    pub fn determine_back_residents(&mut self) -> u32 {
        // BW: ホワイトフォレストの住人決定
        // 簡略化された実装（実際はより複雑）
        let resident_count = (self.rng.next() % 8) + 3; // 3-10人
        self.advances += 1;
        resident_count
    }

    /// Extra処理（BW2専用）
    /// 重複値回避ループ
    /// 
    /// # Arguments
    /// * `target_value` - 回避したい値
    /// * `max_attempts` - 最大試行回数
    /// 
    /// # Returns
    /// PTResult
    pub fn extra_process(&mut self, target_value: u32, max_attempts: u32) -> PTResult {
        let mut attempts = 0;
        let mut current_value;
        
        loop {
            current_value = self.rng.next();
            attempts += 1;
            self.advances += 1;
            
            if current_value != target_value || attempts >= max_attempts {
                break;
            }
        }
        
        PTResult {
            advances: attempts,
            final_value: current_value,
            success: current_value != target_value,
        }
    }

    /// Probability Table処理（1回）
    /// L1-L6の6段階テーブル処理
    /// 
    /// # Arguments
    /// * `thresholds` - 確率閾値配列（6要素）
    /// 
    /// # Returns
    /// PTResult
    pub fn probability_table_process(&mut self, thresholds: &[u32]) -> PTResult {
        if thresholds.len() != 6 {
            return PTResult {
                advances: 0,
                final_value: 0,
                success: false,
            };
        }
        
        let rand_value = self.rng.next();
        self.advances += 1;
        
        // L1-L6の判定
        for (level, &threshold) in thresholds.iter().enumerate() {
            if rand_value < threshold {
                return PTResult {
                    advances: 1,
                    final_value: level as u32,
                    success: true,
                };
            }
        }
        
        // どの段階にも該当しない場合
        PTResult {
            advances: 1,
            final_value: 5, // L6として扱う
            success: true,
        }
    }

    /// Probability Table処理（複数回）
    /// 
    /// # Arguments
    /// * `thresholds` - 確率閾値配列（6要素）
    /// * `iterations` - 実行回数
    /// 
    /// # Returns
    /// 各回の結果配列
    pub fn probability_table_process_multiple(&mut self, thresholds: &[u32], iterations: u32) -> Vec<PTResult> {
        let mut results = Vec::with_capacity(iterations as usize);
        
        for _ in 0..iterations {
            let result = self.probability_table_process(thresholds);
            results.push(result);
        }
        
        results
    }

    /// ゲーム初期化処理の総合実行
    /// 
    /// # Arguments
    /// * `mode` - ゲームモード
    /// 
    /// # Returns
    /// 初期化完了時の進行回数
    pub fn execute_game_initialization(&mut self, mode: GameMode) -> u32 {
        let initial_advances = self.advances;
        
        match mode {
            GameMode::ContinueWithCGear => {
                // 続きから（Cギア有効）の処理
                self.consume_random(1); // Cギア関連の処理
            },
            GameMode::ContinueWithoutCGear => {
                // 続きから（Cギア無効）の処理
                // 最小限の処理として1回の乱数消費
                self.consume_random(1);
            },
            GameMode::NewGameWithCGear => {
                // はじめから（Cギア有効）の処理
                self.calculate_tid_sid();
                self.determine_front_residents();
                self.determine_back_residents();
                self.consume_random(1); // Cギア関連の処理
            },
            GameMode::NewGameWithoutCGear => {
                // はじめから（Cギア無効）の処理
                self.calculate_tid_sid();
                self.determine_front_residents();
                self.determine_back_residents();
            },
            GameMode::NewGameWithMemoryLinkWithCGear => {
                // メモリリンク有効時の追加処理
                self.calculate_tid_sid();
                self.determine_front_residents();
                self.determine_back_residents();
                self.consume_random(2); // メモリリンク + Cギア
            },
            GameMode::NewGameWithMemoryLinkWithoutCGear => {
                // メモリリンク有効（Cギア無効）
                self.calculate_tid_sid();
                self.determine_front_residents();
                self.determine_back_residents();
                self.consume_random(1); // メモリリンクのみ
            },
            GameMode::NewGameChallengeModeWithCGear => {
                // チャレンジモード有効時の追加処理
                self.calculate_tid_sid();
                self.determine_front_residents();
                self.determine_back_residents();
                self.consume_random(3); // チャレンジモード + Cギア
            },
            GameMode::NewGameChallengeModeWithoutCGear => {
                // チャレンジモード有効（Cギア無効）
                self.calculate_tid_sid();
                self.determine_front_residents();
                self.determine_back_residents();
                self.consume_random(2); // チャレンジモードのみ
            },
        }
        
        self.advances - initial_advances
    }

    /// 計算器をリセット
    /// 
    /// # Arguments
    /// * `new_seed` - 新しいシード値
    pub fn reset(&mut self, new_seed: u64) {
        self.rng.reset(new_seed);
        self.advances = 0;
    }
}

impl OffsetCalculator {
    /// デフォルトのProbability Table閾値
    /// 実際のゲームデータに基づく標準的な値
    pub fn default_pt_thresholds() -> [u32; 6] {
        [
            0x1999999A, // L1: ~10%
            0x33333333, // L2: ~20%
            0x4CCCCCCD, // L3: ~30%
            0x66666666, // L4: ~40%
            0x80000000, // L5: ~50%
            0xFFFFFFFF, // L6: 100%
        ]
    }

    /// BW2専用のExtra処理閾値
    pub fn bw2_extra_thresholds() -> [u32; 6] {
        [
            0x0CCCCCCD, // L1: ~5%
            0x1999999A, // L2: ~10%
            0x26666666, // L3: ~15%
            0x33333333, // L4: ~20%
            0x40000000, // L5: ~25%
            0xFFFFFFFF, // L6: 100%
        ]
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_offset_calculator_basic() {
        let mut calc = OffsetCalculator::new(0x123456789ABCDEF0);
        
        // 初期状態確認
        assert_eq!(calc.advances(), 0);
        assert_eq!(calc.current_seed(), 0x123456789ABCDEF0);
        
        // 乱数消費
        let seed1 = calc.next_seed();
        assert_eq!(calc.advances(), 1);
        assert_ne!(calc.current_seed(), 0x123456789ABCDEF0);
        
        let seed2 = calc.next_seed();
        assert_eq!(calc.advances(), 2);
        assert_ne!(seed1, seed2);
    }

    #[test]
    fn test_consume_random() {
        let mut calc = OffsetCalculator::new(0x123456789ABCDEF0);
        
        calc.consume_random(5);
        assert_eq!(calc.advances(), 5);
        
        calc.consume_random(3);
        assert_eq!(calc.advances(), 8);
    }

    #[test]
    fn test_tid_sid_calculation() {
        let mut calc = OffsetCalculator::new(0x123456789ABCDEF0);
        
        let tid_sid = calc.calculate_tid_sid();
        assert_eq!(tid_sid.len(), 2);
        assert_eq!(calc.advances(), 2);
        
        // TID/SIDは16bit値
        assert!(tid_sid[0] <= 0xFFFF);
        assert!(tid_sid[1] <= 0xFFFF);
    }

    #[test]
    fn test_residents_determination() {
        let mut calc = OffsetCalculator::new(0x123456789ABCDEF0);
        
        let front = calc.determine_front_residents();
        assert_eq!(calc.advances(), 1);
        assert!(front >= 5 && front <= 14);
        
        let back = calc.determine_back_residents();
        assert_eq!(calc.advances(), 2);
        assert!(back >= 3 && back <= 10);
    }

    #[test]
    fn test_extra_process() {
        let mut calc = OffsetCalculator::new(0x123456789ABCDEF0);
        
        let result = calc.extra_process(0x12345678, 10);
        assert!(result.advances <= 10);
        assert!(result.advances > 0);
        assert_eq!(calc.advances(), result.advances);
    }

    #[test]
    fn test_probability_table_process() {
        let mut calc = OffsetCalculator::new(0x123456789ABCDEF0);
        let thresholds = OffsetCalculator::default_pt_thresholds();
        
        let result = calc.probability_table_process(&thresholds);
        assert_eq!(result.advances, 1);
        assert!(result.success);
        assert!(result.final_value <= 5);
        assert_eq!(calc.advances(), 1);
    }

    #[test]
    fn test_probability_table_multiple() {
        let mut calc = OffsetCalculator::new(0x123456789ABCDEF0);
        let thresholds = OffsetCalculator::default_pt_thresholds();
        
        let results = calc.probability_table_process_multiple(&thresholds, 5);
        assert_eq!(results.len(), 5);
        assert_eq!(calc.advances(), 5);
        
        for result in results {
            assert_eq!(result.advances, 1);
            assert!(result.success);
            assert!(result.final_value <= 5);
        }
    }

    #[test]
    fn test_invalid_thresholds() {
        let mut calc = OffsetCalculator::new(0x123456789ABCDEF0);
        let invalid_thresholds = [0x11111111, 0x22222222]; // 長さが6でない
        
        let result = calc.probability_table_process(&invalid_thresholds);
        assert!(!result.success);
        assert_eq!(result.advances, 0);
        assert_eq!(calc.advances(), 0);
    }

    #[test]
    fn test_game_initialization_modes() {
        let test_modes = [
            GameMode::ContinueWithCGear,
            GameMode::ContinueWithoutCGear,
            GameMode::NewGameWithCGear,
            GameMode::NewGameWithoutCGear,
            GameMode::NewGameWithMemoryLinkWithCGear,
            GameMode::NewGameWithMemoryLinkWithoutCGear,
            GameMode::NewGameChallengeModeWithCGear,
            GameMode::NewGameChallengeModeWithoutCGear,
        ];

        for mode in test_modes {
            let mut calc = OffsetCalculator::new(0x123456789ABCDEF0);
            let advances = calc.execute_game_initialization(mode);
            
            assert!(advances > 0, "Mode {:?} should consume some advances", mode);
            assert_eq!(calc.advances(), advances);
        }
    }

    #[test]
    fn test_reset_functionality() {
        let initial_seed = 0x123456789ABCDEF0;
        let mut calc = OffsetCalculator::new(initial_seed);
        
        // 進行させる
        calc.consume_random(10);
        assert_eq!(calc.advances(), 10);
        assert_ne!(calc.current_seed(), initial_seed);
        
        // リセット
        calc.reset(initial_seed);
        assert_eq!(calc.advances(), 0);
        assert_eq!(calc.current_seed(), initial_seed);
    }

    #[test]
    fn test_deterministic_behavior() {
        let seed = 0x123456789ABCDEF0;
        let mut calc1 = OffsetCalculator::new(seed);
        let mut calc2 = OffsetCalculator::new(seed);
        
        // 同じ操作を実行
        calc1.consume_random(5);
        calc2.consume_random(5);
        
        assert_eq!(calc1.advances(), calc2.advances());
        assert_eq!(calc1.current_seed(), calc2.current_seed());
        
        // 同じPT処理
        let thresholds = OffsetCalculator::default_pt_thresholds();
        let result1 = calc1.probability_table_process(&thresholds);
        let result2 = calc2.probability_table_process(&thresholds);
        
        assert_eq!(result1.final_value, result2.final_value);
        assert_eq!(result1.success, result2.success);
    }

    #[test]
    fn test_default_thresholds() {
        let thresholds = OffsetCalculator::default_pt_thresholds();
        assert_eq!(thresholds.len(), 6);
        
        // 閾値が昇順であることを確認
        for i in 1..thresholds.len() {
            assert!(thresholds[i-1] <= thresholds[i]);
        }
        
        // 最後の閾値は0xFFFFFFFF
        assert_eq!(thresholds[5], 0xFFFFFFFF);
    }

    #[test]
    fn test_bw2_extra_thresholds() {
        let thresholds = OffsetCalculator::bw2_extra_thresholds();
        assert_eq!(thresholds.len(), 6);
        
        // 閾値が昇順であることを確認
        for i in 1..thresholds.len() {
            assert!(thresholds[i-1] <= thresholds[i]);
        }
        
        // 最後の閾値は0xFFFFFFFF
        assert_eq!(thresholds[5], 0xFFFFFFFF);
    }
}
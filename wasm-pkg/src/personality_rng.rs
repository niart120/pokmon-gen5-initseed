/// PersonalityRNG - BW/BW2仕様64bit線形合同法乱数生成器
/// ポケモンBW/BW2の性格・能力・遭遇判定に使用される乱数エンジン
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

/// PersonalityRNG構造体
/// BW仕様64bit線形合同法: S[n+1] = S[n] * 0x5D588B656C078965 + 0x269EC3
#[wasm_bindgen]
#[derive(Debug, Clone, Copy)]
pub struct PersonalityRNG {
    seed: u64,
}

#[wasm_bindgen]
impl PersonalityRNG {
    /// 新しいPersonalityRNGインスタンスを作成
    /// 
    /// # Arguments
    /// * `seed` - 初期シード値（64bit）
    #[wasm_bindgen(constructor)]
    pub fn new(seed: u64) -> PersonalityRNG {
        PersonalityRNG { seed }
    }

    /// 次の32bit乱数値を取得（上位32bit）
    /// 
    /// # Returns
    /// 上位32bitの乱数値
    pub fn next(&mut self) -> u32 {
        // BW仕様線形合同法
        self.seed = self.seed.wrapping_mul(0x5D588B656C078965).wrapping_add(0x269EC3);
        (self.seed >> 32) as u32
    }

    /// 次の64bit乱数値を取得
    /// 
    /// # Returns
    /// 64bit乱数値（内部状態そのもの）
    pub fn next_u64(&mut self) -> u64 {
        self.seed = self.seed.wrapping_mul(0x5D588B656C078965).wrapping_add(0x269EC3);
        self.seed
    }

    /// シンクロ判定用乱数生成
    /// (r1[n] * 2) >> 32 の計算
    /// 
    /// # Returns
    /// シンクロ判定用の値（0または1）
    pub fn sync_check(&mut self) -> u32 {
        let r1 = self.next();
        ((r1 as u64 * 2) >> 32) as u32
    }

    /// 性格決定用乱数生成
    /// (r1[n] * 25) >> 32 の計算
    /// 
    /// # Returns
    /// 性格値（0-24）
    pub fn nature_roll(&mut self) -> u32 {
        let r1 = self.next();
        ((r1 as u64 * 25) >> 32) as u32
    }

    /// 遭遇スロット決定（BW用）
    /// (r1[n] * 100) >> 32 の計算
    /// 
    /// # Returns
    /// 遭遇スロット判定値（0-99）
    pub fn encounter_slot_bw(&mut self) -> u32 {
        let r1 = self.next();
        ((r1 as u64 * 100) >> 32) as u32
    }

    /// 遭遇スロット決定（BW2用）
    /// BW2では計算式が若干異なる場合がある
    /// 
    /// # Returns
    /// 遭遇スロット判定値（0-99）
    pub fn encounter_slot_bw2(&mut self) -> u32 {
        let r1 = self.next();
        ((r1 as u64 * 100) >> 32) as u32
    }

    /// 現在のシード値を取得
    /// 
    /// # Returns
    /// 現在の内部シード値
    #[wasm_bindgen(getter)]
    pub fn seed(&self) -> u64 {
        self.seed
    }

    /// シード値を設定
    /// 
    /// # Arguments
    /// * `new_seed` - 新しいシード値
    #[wasm_bindgen(setter)]
    pub fn set_seed(&mut self, new_seed: u64) {
        self.seed = new_seed;
    }

    /// 指定回数だけ乱数を進める
    /// 
    /// # Arguments
    /// * `advances` - 進める回数
    pub fn advance(&mut self, advances: u32) {
        for _ in 0..advances {
            self.next();
        }
    }

    /// シードをリセット
    /// 
    /// # Arguments
    /// * `initial_seed` - リセット後のシード値
    pub fn reset(&mut self, initial_seed: u64) {
        self.seed = initial_seed;
    }
}

impl PersonalityRNG {
    /// 内部使用用：複数乱数値の同時生成
    /// バッチ処理での高速化用
    /// 
    /// # Arguments
    /// * `count` - 生成する乱数の個数
    /// 
    /// # Returns
    /// 生成された乱数値のベクタ
    pub fn generate_batch(&mut self, count: usize) -> Vec<u32> {
        let mut results = Vec::with_capacity(count);
        for _ in 0..count {
            results.push(self.next());
        }
        results
    }

    /// 内部使用用：シード値から指定ステップ後の値を計算
    /// ジャンプテーブルを使用した高速計算（将来的な最適化用）
    /// 
    /// # Arguments
    /// * `seed` - 初期シード値
    /// * `steps` - ジャンプするステップ数
    /// 
    /// # Returns
    /// ジャンプ後のシード値
    pub fn jump_seed(seed: u64, steps: u64) -> u64 {
        // 単純実装（将来的にマトリックス演算で最適化可能）
        let mut current_seed = seed;
        for _ in 0..steps {
            current_seed = current_seed.wrapping_mul(0x5D588B656C078965).wrapping_add(0x269EC3);
        }
        current_seed
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_personality_rng_basic() {
        let mut rng = PersonalityRNG::new(0);
        
        // 初期値確認
        assert_eq!(rng.seed(), 0);
        
        // 最初の乱数値を取得
        let first = rng.next();
        
        // 期待値の計算: 0 * 0x5D588B656C078965 + 0x269EC3 = 0x269EC3
        // 上位32bit: 0x269EC3 >> 32 = 0
        assert_eq!(first, 0); // シード0の場合、最初の乱数値は0
        
        // しかしシードは更新されている
        assert_eq!(rng.seed(), 0x269EC3);
        
        // 次の乱数値は0以外になる
        let second = rng.next();
        assert_ne!(second, 0);
    }

    #[test]
    fn test_bw_lcg_calculation() {
        let mut rng = PersonalityRNG::new(1);
        
        // 既知のシード値での計算結果を検証
        let expected_seed = 1u64.wrapping_mul(0x5D588B656C078965).wrapping_add(0x269EC3);
        let actual_value = rng.next();
        let expected_value = (expected_seed >> 32) as u32;
        
        assert_eq!(actual_value, expected_value);
        assert_eq!(rng.seed(), expected_seed);
    }

    #[test]
    fn test_nature_roll_range() {
        let mut rng = PersonalityRNG::new(0x123456789ABCDEF0);
        
        // 性格値が正しい範囲内にあることを確認
        for _ in 0..100 {
            let nature = rng.nature_roll();
            assert!(nature < 25, "Nature value {} should be less than 25", nature);
        }
    }

    #[test]
    fn test_sync_check_range() {
        let mut rng = PersonalityRNG::new(0x123456789ABCDEF0);
        
        // シンクロ判定値が0または1であることを確認
        for _ in 0..100 {
            let sync = rng.sync_check();
            assert!(sync <= 1, "Sync value {} should be 0 or 1", sync);
        }
    }

    #[test]
    fn test_encounter_slot_range() {
        let mut rng = PersonalityRNG::new(0x123456789ABCDEF0);
        
        // 遭遇スロット値が正しい範囲内にあることを確認
        for _ in 0..100 {
            let slot_bw = rng.encounter_slot_bw();
            assert!(slot_bw < 100, "BW encounter slot {} should be less than 100", slot_bw);
            
            let slot_bw2 = rng.encounter_slot_bw2();
            assert!(slot_bw2 < 100, "BW2 encounter slot {} should be less than 100", slot_bw2);
        }
    }

    #[test]
    fn test_deterministic_behavior() {
        let seed = 0x123456789ABCDEF0;
        let mut rng1 = PersonalityRNG::new(seed);
        let mut rng2 = PersonalityRNG::new(seed);
        
        // 同じシードから同じ値が生成されることを確認
        for _ in 0..10 {
            assert_eq!(rng1.next(), rng2.next());
        }
    }

    #[test]
    fn test_advance_function() {
        let seed = 0x123456789ABCDEF0;
        let mut rng1 = PersonalityRNG::new(seed);
        let mut rng2 = PersonalityRNG::new(seed);
        
        // 手動で進めた場合とadvance()の結果が一致することを確認
        for _ in 0..5 {
            rng1.next();
        }
        
        rng2.advance(5);
        
        assert_eq!(rng1.seed(), rng2.seed());
        assert_eq!(rng1.next(), rng2.next());
    }

    #[test]
    fn test_reset_function() {
        let initial_seed = 0x123456789ABCDEF0;
        let mut rng = PersonalityRNG::new(initial_seed);
        
        // 乱数を進める
        rng.advance(10);
        assert_ne!(rng.seed(), initial_seed);
        
        // リセット
        rng.reset(initial_seed);
        assert_eq!(rng.seed(), initial_seed);
    }

    #[test]
    fn test_batch_generation() {
        let mut rng1 = PersonalityRNG::new(0x123456789ABCDEF0);
        let mut rng2 = PersonalityRNG::new(0x123456789ABCDEF0);
        
        // バッチ生成と個別生成の結果が一致することを確認
        let batch_results = rng1.generate_batch(5);
        let mut individual_results = Vec::new();
        
        for _ in 0..5 {
            individual_results.push(rng2.next());
        }
        
        assert_eq!(batch_results, individual_results);
    }

    #[test]
    fn test_jump_seed() {
        let seed = 0x123456789ABCDEF0;
        let mut rng = PersonalityRNG::new(seed);
        
        // 手動で進めた場合とjump_seed()の結果が一致することを確認
        for _ in 0..10 {
            rng.next();
        }
        
        let jumped_seed = PersonalityRNG::jump_seed(seed, 10);
        assert_eq!(rng.seed(), jumped_seed);
    }
}
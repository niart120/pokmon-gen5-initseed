/// PID・色違い計算エンジン
/// ポケモンBW/BW2のPID生成と色違い判定を実装
use wasm_bindgen::prelude::*;

/// 色違いタイプ列挙型
#[wasm_bindgen]
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum ShinyType {
    /// 通常（色違いでない）
    Normal = 0,
    /// 四角い色違い（一般的な色違い）
    Square = 1,
    /// 星形色違い（特殊な色違い）
    Star = 2,
}

/// PID計算エンジン
#[wasm_bindgen]
pub struct PIDCalculator;

#[wasm_bindgen]
impl PIDCalculator {
    /// 新しいPIDCalculatorインスタンスを作成
    #[wasm_bindgen(constructor)]
    pub fn new() -> PIDCalculator {
        PIDCalculator
    }

    /// BW/BW2準拠 統一PID生成
    /// 32bit乱数 ^ 0x10000 の計算（固定・野生共通）
    /// 
    /// # Arguments
    /// * `r1` - 乱数値1
    /// 
    /// # Returns
    /// 基本PID（ID補正前）
    pub fn generate_base_pid(r1: u32) -> u32 {
        r1 ^ 0x10000
    }

    /// ID補正付きPID生成（内部使用）
    /// 基本PID生成後、ID補正処理を適用
    /// 
    /// # Arguments
    /// * `r1` - 乱数値1
    /// * `tid` - トレーナーID
    /// * `sid` - シークレットID
    /// * `apply_id_correction` - ID補正適用フラグ
    /// 
    /// # Returns
    /// 最終PID（ID補正後）
    fn generate_pid_with_correction(r1: u32, tid: u16, sid: u16, apply_id_correction: bool) -> u32 {
        let base_pid = Self::generate_base_pid(r1);
        
        if apply_id_correction {
            Self::apply_id_correction(base_pid, tid, sid)
        } else {
            base_pid
        }
    }

    /// ID補正処理
    /// 性格値下位 ^ トレーナーID ^ 裏ID の奇偶性で最上位bitを調整
    /// 
    /// # Arguments
    /// * `pid` - 基本PID
    /// * `tid` - トレーナーID
    /// * `sid` - シークレットID
    /// 
    /// # Returns
    /// ID補正後PID
    pub fn apply_id_correction(pid: u32, tid: u16, sid: u16) -> u32 {
        let pid_low = (pid & 0xFFFF) as u16;
        let xor_result = pid_low ^ tid ^ sid;
        
        if (xor_result & 1) == 1 {
            // 奇数の場合: 最上位bitを1に設定
            pid | 0x80000000
        } else {
            // 偶数の場合: 最上位bitを0に設定
            pid & 0x7FFFFFFF
        }
    }

    /// BW/BW2準拠 野生ポケモンのPID生成
    /// 32bit乱数 ^ 0x10000 + ID補正処理
    /// 
    /// # Arguments
    /// * `r1` - 乱数値1
    /// * `tid` - トレーナーID
    /// * `sid` - シークレットID
    /// 
    /// # Returns
    /// 生成されたPID（ID補正適用後）
    pub fn generate_wild_pid(r1: u32, tid: u16, sid: u16) -> u32 {
        Self::generate_pid_with_correction(r1, tid, sid, true)
    }

    /// BW/BW2準拠 固定シンボルポケモンのPID生成
    /// 32bit乱数 ^ 0x10000 + ID補正処理
    /// 
    /// # Arguments
    /// * `r1` - 乱数値1
    /// * `tid` - トレーナーID
    /// * `sid` - シークレットID
    /// 
    /// # Returns
    /// 生成されたPID（ID補正適用後）
    pub fn generate_static_pid(r1: u32, tid: u16, sid: u16) -> u32 {
        Self::generate_pid_with_correction(r1, tid, sid, true)
    }

    /// BW/BW2準拠 徘徊ポケモンのPID生成
    /// 32bit乱数 ^ 0x10000 + ID補正処理
    /// 
    /// # Arguments
    /// * `r1` - 乱数値1
    /// * `tid` - トレーナーID
    /// * `sid` - シークレットID
    /// 
    /// # Returns
    /// 生成されたPID（ID補正適用後）
    pub fn generate_roaming_pid(r1: u32, tid: u16, sid: u16) -> u32 {
        Self::generate_pid_with_correction(r1, tid, sid, true)
    }

    /// BW/BW2準拠 イベントポケモンのPID生成
    /// 32bit乱数 ^ 0x10000（ID補正なし - 先頭特性無効）
    /// 
    /// # Arguments
    /// * `r1` - 乱数値1
    /// 
    /// # Returns
    /// 生成されたPID（ID補正なし）
    pub fn generate_event_pid(r1: u32) -> u32 {
        r1 ^ 0x10000
    }

    /// ギフトポケモンのPID生成
    /// 特殊な計算式を使用
    /// 
    /// # Arguments
    /// * `r1` - 乱数値1
    /// * `r2` - 乱数値2
    /// 
    /// # Returns
    /// 生成されたPID
    pub fn generate_gift_pid(r1: u32, r2: u32) -> u32 {
        // ギフトポケモンは2つの乱数値を組み合わせる
        ((r1 & 0xFFFF) << 16) | (r2 & 0xFFFF)
    }

    /// タマゴのPID生成
    /// 特殊な計算式を使用
    /// 
    /// # Arguments
    /// * `r1` - 乱数値1
    /// * `r2` - 乱数値2
    /// 
    /// # Returns
    /// 生成されたPID
    pub fn generate_egg_pid(r1: u32, r2: u32) -> u32 {
        // タマゴは上位16bitと下位16bitを組み合わせる
        ((r1 & 0xFFFF0000) >> 16) | ((r2 & 0xFFFF0000))
    }
}

/// 色違い判定エンジン
#[wasm_bindgen]
pub struct ShinyChecker;

#[wasm_bindgen]
impl ShinyChecker {
    /// 新しいShinyCheckerインスタンスを作成
    #[wasm_bindgen(constructor)]
    pub fn new() -> ShinyChecker {
        ShinyChecker
    }

    /// 色違い判定
    /// 
    /// # Arguments
    /// * `tid` - トレーナーID
    /// * `sid` - シークレットID
    /// * `pid` - ポケモンのPID
    /// 
    /// # Returns
    /// 色違いかどうか
    pub fn is_shiny(tid: u16, sid: u16, pid: u32) -> bool {
        let shiny_value = Self::get_shiny_value(tid, sid, pid);
        shiny_value < 8
    }

    /// 色違い値の計算
    /// TID ^ SID ^ PID上位16bit ^ PID下位16bit
    /// 
    /// # Arguments
    /// * `tid` - トレーナーID
    /// * `sid` - シークレットID
    /// * `pid` - ポケモンのPID
    /// 
    /// # Returns
    /// 色違い値
    pub fn get_shiny_value(tid: u16, sid: u16, pid: u32) -> u16 {
        let pid_high = (pid >> 16) as u16;
        let pid_low = (pid & 0xFFFF) as u16;
        tid ^ sid ^ pid_high ^ pid_low
    }

    /// 色違いタイプの判定
    /// 
    /// # Arguments
    /// * `shiny_value` - 色違い値
    /// 
    /// # Returns
    /// 色違いタイプ
    pub fn get_shiny_type(shiny_value: u16) -> ShinyType {
        match shiny_value {
            0 => ShinyType::Star,      // 星形色違い
            1..=7 => ShinyType::Square, // 四角い色違い
            _ => ShinyType::Normal,    // 通常
        }
    }

    /// 色違い判定とタイプを同時に取得
    /// 
    /// # Arguments
    /// * `tid` - トレーナーID
    /// * `sid` - シークレットID
    /// * `pid` - ポケモンのPID
    /// 
    /// # Returns
    /// 色違いタイプ
    pub fn check_shiny_type(tid: u16, sid: u16, pid: u32) -> ShinyType {
        let shiny_value = Self::get_shiny_value(tid, sid, pid);
        Self::get_shiny_type(shiny_value)
    }

    /// 色違い確率の計算
    /// 通常の色違い確率を計算（参考用）
    /// 
    /// # Returns
    /// 色違い確率（分母）
    pub fn shiny_probability() -> u32 {
        // 第5世代の通常色違い確率: 1/8192 (色違い値 < 8の確率)
        8192
    }

    /// 光るお守り効果の確率計算
    /// 
    /// # Arguments
    /// * `has_shiny_charm` - 光るお守りを持っているか
    /// 
    /// # Returns
    /// 色違い確率（分母）
    pub fn shiny_probability_with_charm(has_shiny_charm: bool) -> u32 {
        if has_shiny_charm {
            // 光るお守りありの場合: 約1/2731
            2731
        } else {
            Self::shiny_probability()
        }
    }
}

impl PIDCalculator {
    /// 内部使用用：PIDからの個体値計算補助
    /// 実際の個体値は別の乱数で決まるが、PIDとの関係を確認
    pub fn extract_pid_components(pid: u32) -> (u16, u16) {
        let high = (pid >> 16) as u16;
        let low = (pid & 0xFFFF) as u16;
        (high, low)
    }

    /// 内部使用用：性格値の計算
    /// PID % 25 で性格を決定
    pub fn calculate_nature_from_pid(pid: u32) -> u8 {
        (pid % 25) as u8
    }

    /// 内部使用用：性別値の計算
    /// PID & 0xFF で性別判定値を取得
    pub fn calculate_gender_value_from_pid(pid: u32) -> u8 {
        (pid & 0xFF) as u8
    }

    /// 内部使用用：特性スロットの計算
    /// PID & 1 で特性スロット（0または1）を決定
    pub fn calculate_ability_slot_from_pid(pid: u32) -> u8 {
        (pid & 1) as u8
    }
}

impl ShinyChecker {
    /// 内部使用用：バッチ色違い判定
    /// 複数のPIDに対して一括で色違い判定を実行
    pub fn batch_shiny_check(tid: u16, sid: u16, pids: &[u32]) -> Vec<bool> {
        pids.iter().map(|&pid| Self::is_shiny(tid, sid, pid)).collect()
    }

    /// 内部使用用：バッチ色違いタイプ判定
    /// 複数のPIDに対して一括で色違いタイプ判定を実行
    pub fn batch_shiny_type_check(tid: u16, sid: u16, pids: &[u32]) -> Vec<ShinyType> {
        pids.iter().map(|&pid| Self::check_shiny_type(tid, sid, pid)).collect()
    }

    /// 内部使用用：色違い値の分布検証
    /// テスト用の統計情報生成
    pub fn analyze_shiny_distribution(tid: u16, sid: u16, pid_count: u32) -> (u32, u32, u32) {
        let mut normal_count = 0;
        let mut square_count = 0;
        let mut star_count = 0;

        for pid in 0..pid_count {
            match Self::check_shiny_type(tid, sid, pid) {
                ShinyType::Normal => normal_count += 1,
                ShinyType::Square => square_count += 1,
                ShinyType::Star => star_count += 1,
            }
        }

        (normal_count, square_count, star_count)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pid_generation_wild() {
        let r1 = 0x12345678;
        let tid = 12345;
        let sid = 54321;
        let pid = PIDCalculator::generate_wild_pid(r1, tid, sid);
        
        // 基本PID生成の確認
        let expected_base = 0x12345678 ^ 0x00010000;
        
        // ID補正の確認
        let pid_low = (expected_base & 0xFFFF) as u16;
        let xor_result = pid_low ^ tid ^ sid;
        
        if (xor_result & 1) == 1 {
            assert_eq!(pid, expected_base | 0x80000000);
        } else {
            assert_eq!(pid, expected_base & 0x7FFFFFFF);
        }
    }

    #[test]
    fn test_pid_generation_static() {
        let r1 = 0x12345678;
        let tid = 12345;
        let sid = 54321;
        let pid = PIDCalculator::generate_static_pid(r1, tid, sid);
        
        // 基本PID生成の確認（新仕様: 固定も ^ 0x10000 を適用）
        let expected_base = 0x12345678 ^ 0x10000;
        
        // ID補正の確認
        let pid_low = (expected_base & 0xFFFF) as u16;
        let xor_result = pid_low ^ tid ^ sid;
        
        if (xor_result & 1) == 1 {
            assert_eq!(pid, expected_base | 0x80000000);
        } else {
            assert_eq!(pid, expected_base & 0x7FFFFFFF);
        }
    }

    #[test]
    fn test_pid_generation_roaming() {
        let r1 = 0x12345678;
        let tid = 12345;
        let sid = 54321;
        let pid = PIDCalculator::generate_roaming_pid(r1, tid, sid);
        
        // 基本PID生成の確認（新仕様: 徘徊も ^ 0x10000 を適用）
        let expected_base = 0x12345678 ^ 0x10000;
        
        // ID補正の確認
        let pid_low = (expected_base & 0xFFFF) as u16;
        let xor_result = pid_low ^ tid ^ sid;
        
        if (xor_result & 1) == 1 {
            assert_eq!(pid, expected_base | 0x80000000);
        } else {
            assert_eq!(pid, expected_base & 0x7FFFFFFF);
        }
    }

    #[test]
    fn test_pid_generation_event() {
        let r1 = 0x12345678;
        let pid = PIDCalculator::generate_event_pid(r1);
        let expected = 0x12345678 ^ 0x10000;  // イベント系は基本PIDのみ（ID補正なし）
        assert_eq!(pid, expected);
    }

    #[test]
    fn test_pid_generation_gift() {
        let r1 = 0x12345678;
        let r2 = 0x9ABCDEF0;
        let pid = PIDCalculator::generate_gift_pid(r1, r2);
        let expected = ((r1 & 0xFFFF) << 16) | (r2 & 0xFFFF);
        assert_eq!(pid, expected);
    }

    #[test]
    fn test_pid_generation_egg() {
        let r1 = 0x12345678;
        let r2 = 0x9ABCDEF0;
        let pid = PIDCalculator::generate_egg_pid(r1, r2);
        let expected = ((r1 & 0xFFFF0000) >> 16) | (r2 & 0xFFFF0000);
        assert_eq!(pid, expected);
    }

    #[test]
    fn test_id_correction_function() {
        let base_pid = 0x12345678;
        let tid = 12345;
        let sid = 54321;
        
        let corrected_pid = PIDCalculator::apply_id_correction(base_pid, tid, sid);
        
        let pid_low = (base_pid & 0xFFFF) as u16;
        let xor_result = pid_low ^ tid ^ sid;
        
        if (xor_result & 1) == 1 {
            // 奇数の場合: 最上位bitが1になる
            assert!(corrected_pid & 0x80000000 != 0);
        } else {
            // 偶数の場合: 最上位bitが0になる
            assert!(corrected_pid & 0x80000000 == 0);
        }
    }

    #[test]
    fn test_shiny_value_calculation() {
        let tid = 12345;
        let sid = 54321;
        let pid = 0x12345678;
        
        let shiny_value = ShinyChecker::get_shiny_value(tid, sid, pid);
        let expected = tid ^ sid ^ ((pid >> 16) as u16) ^ ((pid & 0xFFFF) as u16);
        assert_eq!(shiny_value, expected);
    }

    #[test]
    fn test_shiny_detection() {
        // 色違いになるようなTID/SID/PIDの組み合わせ
        let tid = 0x0000;
        let sid = 0x0000;
        let pid = 0x00000000; // shiny value = 0
        
        assert!(ShinyChecker::is_shiny(tid, sid, pid));
        assert_eq!(ShinyChecker::check_shiny_type(tid, sid, pid), ShinyType::Star);
        
        // 色違いでない場合
        let pid_normal = 0x12345678;
        assert!(!ShinyChecker::is_shiny(tid, sid, pid_normal));
        assert_eq!(ShinyChecker::check_shiny_type(tid, sid, pid_normal), ShinyType::Normal);
    }

    #[test]
    fn test_shiny_type_classification() {
        assert_eq!(ShinyChecker::get_shiny_type(0), ShinyType::Star);
        assert_eq!(ShinyChecker::get_shiny_type(1), ShinyType::Square);
        assert_eq!(ShinyChecker::get_shiny_type(7), ShinyType::Square);
        assert_eq!(ShinyChecker::get_shiny_type(8), ShinyType::Normal);
        assert_eq!(ShinyChecker::get_shiny_type(100), ShinyType::Normal);
    }

    #[test]
    fn test_pid_component_extraction() {
        let pid = 0x12345678;
        let (high, low) = PIDCalculator::extract_pid_components(pid);
        assert_eq!(high, 0x1234);
        assert_eq!(low, 0x5678);
    }

    #[test]
    fn test_nature_calculation() {
        let pid = 50; // 50 % 25 = 0
        assert_eq!(PIDCalculator::calculate_nature_from_pid(pid), 0);
        
        let pid = 76; // 76 % 25 = 1
        assert_eq!(PIDCalculator::calculate_nature_from_pid(pid), 1);
        
        let pid = 124; // 124 % 25 = 24
        assert_eq!(PIDCalculator::calculate_nature_from_pid(pid), 24);
    }

    #[test]
    fn test_gender_value_calculation() {
        let pid = 0x12345678;
        assert_eq!(PIDCalculator::calculate_gender_value_from_pid(pid), 0x78);
        
        let pid = 0x000000FF;
        assert_eq!(PIDCalculator::calculate_gender_value_from_pid(pid), 0xFF);
    }

    #[test]
    fn test_ability_slot_calculation() {
        let pid_even = 0x12345678; // 偶数
        assert_eq!(PIDCalculator::calculate_ability_slot_from_pid(pid_even), 0);
        
        let pid_odd = 0x12345679; // 奇数
        assert_eq!(PIDCalculator::calculate_ability_slot_from_pid(pid_odd), 1);
    }

    #[test]
    fn test_batch_shiny_check() {
        let tid = 0x0000;
        let sid = 0x0000;
        let pids = vec![0x00000000, 0x12345678, 0x00000001];
        
        let results = ShinyChecker::batch_shiny_check(tid, sid, &pids);
        assert_eq!(results.len(), 3);
        assert!(results[0]);  // 0x00000000は色違い
        assert!(!results[1]); // 0x12345678は通常
        assert!(results[2]);  // 0x00000001は色違い
    }

    #[test]
    fn test_batch_shiny_type_check() {
        let tid = 0x0000;
        let sid = 0x0000;
        let pids = vec![0x00000000, 0x12345678, 0x00000001];
        
        let results = ShinyChecker::batch_shiny_type_check(tid, sid, &pids);
        assert_eq!(results.len(), 3);
        assert_eq!(results[0], ShinyType::Star);   // shiny value = 0
        assert_eq!(results[1], ShinyType::Normal); // 色違いでない
        assert_eq!(results[2], ShinyType::Square); // shiny value = 1
    }

    #[test]
    fn test_shiny_probability() {
        assert_eq!(ShinyChecker::shiny_probability(), 8192);
        assert_eq!(ShinyChecker::shiny_probability_with_charm(false), 8192);
        assert_eq!(ShinyChecker::shiny_probability_with_charm(true), 2731);
    }

    #[test]
    fn test_deterministic_behavior() {
        let tid = 12345;
        let sid = 54321;
        let pid = 0x12345678;
        
        // 同じ入力に対して同じ結果が得られることを確認
        let shiny1 = ShinyChecker::is_shiny(tid, sid, pid);
        let shiny2 = ShinyChecker::is_shiny(tid, sid, pid);
        assert_eq!(shiny1, shiny2);
        
        let type1 = ShinyChecker::check_shiny_type(tid, sid, pid);
        let type2 = ShinyChecker::check_shiny_type(tid, sid, pid);
        assert_eq!(type1, type2);
    }

    #[test]
    fn test_edge_cases() {
        // 最大値でのテスト
        let tid = 0xFFFF;
        let sid = 0xFFFF;
        let pid = 0xFFFFFFFF;
        
        let shiny_value = ShinyChecker::get_shiny_value(tid, sid, pid);
        assert_eq!(shiny_value, 0x0000); // すべてFFFFの場合、XORで0になる
        assert!(ShinyChecker::is_shiny(tid, sid, pid));
        assert_eq!(ShinyChecker::check_shiny_type(tid, sid, pid), ShinyType::Star);
        
        // 最小値でのテスト
        let tid = 0x0000;
        let sid = 0x0000;
        let pid = 0x00000000;
        
        let shiny_value = ShinyChecker::get_shiny_value(tid, sid, pid);
        assert_eq!(shiny_value, 0x0000);
        assert!(ShinyChecker::is_shiny(tid, sid, pid));
        assert_eq!(ShinyChecker::check_shiny_type(tid, sid, pid), ShinyType::Star);
        
        // 境界値テスト - 色違い閾値の境界
        let tid = 0x0000;
        let sid = 0x0000;
        
        // shiny_value = 7 (最大の色違い値)
        let pid_shiny_7 = 0x00070000; // XOR結果が7になるPID
        assert!(ShinyChecker::is_shiny(tid, sid, pid_shiny_7));
        assert_eq!(ShinyChecker::check_shiny_type(tid, sid, pid_shiny_7), ShinyType::Square);
        
        // shiny_value = 8 (色違いでない最小値)
        let pid_normal_8 = 0x00080000; // XOR結果が8になるPID
        assert!(!ShinyChecker::is_shiny(tid, sid, pid_normal_8));
        assert_eq!(ShinyChecker::check_shiny_type(tid, sid, pid_normal_8), ShinyType::Normal);
    }
}
/// OffsetCalculator - BW/BW2オフセット計算エンジン
/// ゲーム初期化処理とProbability Table操作を実装
use wasm_bindgen::prelude::*;
use crate::personality_rng::PersonalityRNG;

/// ゲームモード列挙型（仕様書準拠）
#[wasm_bindgen]
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum GameMode {
    /// BW 始めから（セーブ有り）
    BwNewGameWithSave = 0,
    /// BW 始めから（セーブ無し）
    BwNewGameNoSave = 1,
    /// BW 続きから
    BwContinue = 2,
    /// BW2 始めから（思い出リンク済みセーブ有り）
    Bw2NewGameWithMemoryLinkSave = 3,
    /// BW2 始めから（思い出リンク無しセーブ有り）
    Bw2NewGameNoMemoryLinkSave = 4,
    /// BW2 始めから（セーブ無し）
    Bw2NewGameNoSave = 5,
    /// BW2 続きから（思い出リンク済み）
    Bw2ContinueWithMemoryLink = 6,
    /// BW2 続きから（思い出リンク無し）
    Bw2ContinueNoMemoryLink = 7,
}

/// TID/SID決定結果
#[wasm_bindgen]
#[derive(Debug, Clone, Copy)]
pub struct TidSidResult {
    /// TID（トレーナーID下位16bit）
    pub tid: u16,
    /// SID（シークレットID上位16bit）
    pub sid: u16,
    /// 消費した乱数回数
    pub advances_used: u32,
}

#[wasm_bindgen]
impl TidSidResult {
    #[wasm_bindgen(getter)]
    pub fn get_tid(&self) -> u16 { self.tid }
    
    #[wasm_bindgen(getter)]
    pub fn get_sid(&self) -> u16 { self.sid }
    
    #[wasm_bindgen(getter)]
    pub fn get_advances_used(&self) -> u32 { self.advances_used }
}

/// Extra処理結果（BW2専用）
#[wasm_bindgen]
#[derive(Debug, Clone, Copy)]
pub struct ExtraResult {
    /// 消費した乱数回数
    pub advances: u32,
    /// 成功フラグ（重複回避完了）
    pub success: bool,
    /// 最終的な3つの値
    pub value1: u32,
    pub value2: u32,
    pub value3: u32,
}

#[wasm_bindgen]
impl ExtraResult {
    #[wasm_bindgen(getter)]
    pub fn get_advances(&self) -> u32 { self.advances }
    
    #[wasm_bindgen(getter)]
    pub fn get_success(&self) -> bool { self.success }
    
    #[wasm_bindgen(getter)]
    pub fn get_value1(&self) -> u32 { self.value1 }
    
    #[wasm_bindgen(getter)]
    pub fn get_value2(&self) -> u32 { self.value2 }
    
    #[wasm_bindgen(getter)]
    pub fn get_value3(&self) -> u32 { self.value3 }
}

/// オフセット計算エンジン
#[wasm_bindgen]
pub struct OffsetCalculator {
    rng: PersonalityRNG,
    advances: u32,
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
            rng: PersonalityRNG::new(seed),
            advances: 0,
        }
    }

    /// 次の32bit乱数値を取得（上位32bit）
    /// 
    /// # Returns
    /// 32bit乱数値
    pub fn next_rand(&mut self) -> u32 {
        self.advances += 1;
        self.rng.next()
    }

    /// 指定回数だけ乱数を消費（Rand×n）
    /// 
    /// # Arguments
    /// * `count` - 消費する回数
    pub fn consume_random(&mut self, count: u32) {
        for _ in 0..count {
            self.next_rand();
        }
    }

    /// 現在の進行回数を取得
    /// 
    /// # Returns
    /// 進行回数
    #[wasm_bindgen(getter)]
    pub fn get_advances(&self) -> u32 {
        self.advances
    }

    /// 現在のシード値を取得
    /// 
    /// # Returns
    /// 現在のシード値
    #[wasm_bindgen(getter)]
    pub fn get_current_seed(&self) -> u64 {
        self.rng.get_seed()
    }

    /// 計算器をリセット
    /// 
    /// # Arguments
    /// * `new_seed` - 新しいシード値
    pub fn reset(&mut self, new_seed: u64) {
        self.rng.reset(new_seed);
        self.advances = 0;
    }

    /// TID/SID決定処理（リファレンス実装準拠）
    /// 
    /// # Returns
    /// TidSidResult
    pub fn calculate_tid_sid(&mut self) -> TidSidResult {
        let rand_value = self.next_rand();
        
        // リファレンス実装の計算式: (R * 0xFFFFFFFF) >> 32
        let tid_sid_combined = ((rand_value as u64 * 0xFFFFFFFF) >> 32) as u32;
        let tid = (tid_sid_combined & 0xFFFF) as u16;
        let sid = ((tid_sid_combined >> 16) & 0xFFFF) as u16;
        
        TidSidResult {
            tid,
            sid,
            advances_used: self.advances, // TID/SID決定完了時点での累積進行数（offset）
        }
    }

    /// 表住人決定処理（BW：固定10回乱数消費）
    pub fn determine_front_residents(&mut self) {
        self.consume_random(10);
    }
    
    /// 裏住人決定処理（BW：固定3回乱数消費）
    pub fn determine_back_residents(&mut self) {
        self.consume_random(3);
    }

    /// 住人決定一括処理（BW専用）
    pub fn determine_all_residents(&mut self) {
        self.determine_front_residents();  // 表住人10回
        self.determine_back_residents();   // 裏住人3回
    }

    /// Probability Table処理（仕様書準拠の6段階テーブル処理）
    pub fn probability_table_process(&mut self) {
        // PT操作の6段階テーブル定義（仕様書準拠）
        const PT_TABLES: [[u32; 5]; 6] = [
            [50, 100, 100, 100, 100],  // L1
            [50, 50, 100, 100, 100],   // L2
            [30, 50, 100, 100, 100],   // L3
            [25, 30, 50, 100, 100],    // L4
            [20, 25, 33, 50, 100],     // L5
            [100, 100, 100, 100, 100], // L6
        ];

        for level in 0..6 {  // L1からL6まで
            for j in 0..5 {   // 各レベルで最大5つの閾値をチェック
                if PT_TABLES[level][j] == 100 {
                    // 確率が100なら、次のレベルへ
                    break;
                }
                
                let rand_value = self.next_rand();
                // 仕様書の計算式: r = ((rand_value as u64 * 101) >> 32) as u32
                let r = ((rand_value as u64 * 101) >> 32) as u32;
                
                if r <= PT_TABLES[level][j] {
                    // 取得した確率がテーブルの値以下なら次のレベルへ
                    break;
                }
            }
        }
    }
    
    /// PT操作×n回
    pub fn probability_table_process_multiple(&mut self, count: u32) {
        for _ in 0..count {
            self.probability_table_process();
        }
    }

    /// Extra処理（BW2専用：重複値回避ループ）
    /// 3つの値（0-14範囲）がすべて異なるまでループ
    pub fn extra_process(&mut self) -> ExtraResult {
        let initial_advances = self.advances;
        let mut value1;
        let mut value2;
        let mut value3;
        
        loop {
            // 3つの値を生成（仕様書の計算式）
            let r1 = self.next_rand();
            value1 = ((r1 as u64 * 15) >> 32) as u32;
            
            let r2 = self.next_rand();
            value2 = ((r2 as u64 * 15) >> 32) as u32;
            
            let r3 = self.next_rand();
            value3 = ((r3 as u64 * 15) >> 32) as u32;
            
            // 3つとも異なるかチェック
            if value1 != value2 && value2 != value3 && value3 != value1 {
                break;
            }
            // 同じ値が含まれている場合は継続
        }
        
        ExtraResult {
            advances: self.advances - initial_advances,
            success: true,
            value1,
            value2,
            value3,
        }
    }

    /// チラーミィPID決定（BW）
    fn generate_chiramii_pid(&mut self) -> u32 {
        let rand_value = self.next_rand();
        // BWではxor 0x00010000の分岐あり（実装詳細は要確認）
        rand_value
    }
    
    /// チラーミィID決定（BW：0固定）
    fn generate_chiramii_id(&mut self) -> u32 {
        self.next_rand(); // 乱数消費はあるが結果は0固定
        0
    }
    
    /// チラチーノPID決定（BW2）
    fn generate_chirachino_pid(&mut self) -> u32 {
        self.next_rand()
    }
    
    /// チラチーノID決定（BW2：0固定）
    fn generate_chirachino_id(&mut self) -> u32 {
        self.next_rand(); // 乱数消費はあるが結果は0固定
        0
    }

    /// ゲーム初期化処理の総合実行（仕様書準拠）
    /// 
    /// # Arguments
    /// * `mode` - ゲームモード
    /// 
    /// # Returns
    /// 初期化完了時の進行回数
    pub fn execute_game_initialization(&mut self, mode: GameMode) -> u32 {
        let initial_advances = self.advances;
        
        match mode {
            GameMode::BwNewGameWithSave => {
                // BW 始めから（セーブ有り）- リファレンス実装準拠
                self.probability_table_process_multiple(2); // PT×2
                self.generate_chiramii_pid();              // チラーミィPID決定
                self.generate_chiramii_id();               // チラーミィID決定
                self.calculate_tid_sid();                  // TID/SID決定
                self.probability_table_process_multiple(4); // PT×4
                // 住人決定は別途計算されるためoffsetには含めない
            },
            
            GameMode::BwNewGameNoSave => {
                // BW 始めから（セーブ無し）- リファレンス実装準拠
                self.probability_table_process_multiple(3); // PT×3
                self.generate_chiramii_pid();              // チラーミィPID決定
                self.generate_chiramii_id();               // チラーミィID決定
                self.calculate_tid_sid();                  // TID/SID決定
                self.consume_random(1);                    // Rand×1
                self.probability_table_process_multiple(4); // PT×4
                // 住人決定は別途計算されるためoffsetには含めない
            },
            
            GameMode::BwContinue => {
                // BW 続きから - リファレンス実装準拠（Rand×1なし）
                self.probability_table_process_multiple(5); // PT×5
            },
            
            GameMode::Bw2NewGameWithMemoryLinkSave => {
                // BW2 始めから（思い出リンク済みセーブ有り）
                self.consume_random(1);                    // Rand×1
                self.probability_table_process_multiple(1); // PT×1
                self.consume_random(2);                    // Rand×2
                self.probability_table_process_multiple(1); // PT×1
                self.consume_random(2);                    // Rand×2
                self.generate_chirachino_pid();            // チラチーノPID決定
                self.generate_chirachino_id();             // チラチーノID決定
                self.calculate_tid_sid();                  // TID/SID決定
            },
            
            GameMode::Bw2NewGameNoMemoryLinkSave => {
                // BW2 始めから（思い出リンク無しセーブ有り）
                self.consume_random(1);                    // Rand×1
                self.probability_table_process_multiple(1); // PT×1
                self.consume_random(3);                    // Rand×3
                self.probability_table_process_multiple(1); // PT×1
                self.consume_random(2);                    // Rand×2
                self.generate_chirachino_pid();            // チラチーノPID決定
                self.generate_chirachino_id();             // チラチーノID決定
                self.calculate_tid_sid();                  // TID/SID決定
            },
            
            GameMode::Bw2NewGameNoSave => {
                // BW2 始めから（セーブ無し）
                self.consume_random(1);                    // Rand×1
                self.probability_table_process_multiple(1); // PT×1
                self.consume_random(2);                    // Rand×2
                self.probability_table_process_multiple(1); // PT×1
                self.consume_random(4);                    // Rand×4
                self.probability_table_process_multiple(1); // PT×1
                self.consume_random(2);                    // Rand×2
                self.generate_chirachino_pid();            // チラチーノPID決定
                self.generate_chirachino_id();             // チラチーノID決定
                self.calculate_tid_sid();                  // TID/SID決定
            },
            
            GameMode::Bw2ContinueWithMemoryLink => {
                // BW2 続きから（思い出リンク済み）
                self.consume_random(1);                    // Rand×1
                self.probability_table_process_multiple(1); // PT×1
                self.consume_random(2);                    // Rand×2
                self.probability_table_process_multiple(4); // PT×4
                self.extra_process();                      // Extra処理
            },
            
            GameMode::Bw2ContinueNoMemoryLink => {
                // BW2 続きから（思い出リンク無し）
                self.consume_random(1);                    // Rand×1
                self.probability_table_process_multiple(1); // PT×1
                self.consume_random(3);                    // Rand×3
                self.probability_table_process_multiple(4); // PT×4
                self.extra_process();                      // Extra処理
            },
        }
        
        self.advances - initial_advances
    }
}

/// オフセット計算統合API（仕様書準拠）
#[wasm_bindgen]
pub fn calculate_game_offset(initial_seed: u64, mode: GameMode) -> u32 {
    let mut calculator = OffsetCalculator::new(initial_seed);
    calculator.execute_game_initialization(mode)
}

/// TID/SID決定処理統合API（仕様書準拠）
#[wasm_bindgen]
pub fn calculate_tid_sid_from_seed(initial_seed: u64, mode: GameMode) -> TidSidResult {
    let mut calculator = OffsetCalculator::new(initial_seed);
    
    // 指定されたモードでTID/SID決定直前まで進める
    match mode {
        GameMode::BwNewGameWithSave => {
            calculator.consume_random(1);
            calculator.probability_table_process_multiple(2);
            calculator.generate_chiramii_pid();
            calculator.generate_chiramii_id();
        },
        GameMode::BwNewGameNoSave => {
            calculator.consume_random(1);
            calculator.probability_table_process_multiple(3);
            calculator.generate_chiramii_pid();
            calculator.generate_chiramii_id();
        },
        GameMode::Bw2NewGameWithMemoryLinkSave => {
            calculator.consume_random(1);
            calculator.probability_table_process_multiple(1);
            calculator.consume_random(2);
            calculator.probability_table_process_multiple(1);
            calculator.consume_random(2);
            calculator.generate_chirachino_pid();
            calculator.generate_chirachino_id();
        },
        GameMode::Bw2NewGameNoMemoryLinkSave => {
            calculator.consume_random(1);
            calculator.probability_table_process_multiple(1);
            calculator.consume_random(3);
            calculator.probability_table_process_multiple(1);
            calculator.consume_random(2);
            calculator.generate_chirachino_pid();
            calculator.generate_chirachino_id();
        },
        GameMode::Bw2NewGameNoSave => {
            calculator.consume_random(1);
            calculator.probability_table_process_multiple(1);
            calculator.consume_random(2);
            calculator.probability_table_process_multiple(1);
            calculator.consume_random(4);
            calculator.probability_table_process_multiple(1);
            calculator.consume_random(2);
            calculator.generate_chirachino_pid();
            calculator.generate_chirachino_id();
        },
        _ => {
            // 「続きから」系のモードはTID/SID決定なし
            return TidSidResult { tid: 0, sid: 0, advances_used: 0 };
        }
    }
    
    // TID/SID決定を実行
    calculator.calculate_tid_sid()
}

impl OffsetCalculator {
    /// PT操作テーブル定数を取得（外部から参照可能）
    pub fn get_pt_tables() -> [[u32; 5]; 6] {
        [
            [50, 100, 100, 100, 100],  // L1
            [50, 50, 100, 100, 100],   // L2
            [30, 50, 100, 100, 100],   // L3
            [25, 30, 50, 100, 100],    // L4
            [20, 25, 33, 50, 100],     // L5
            [100, 100, 100, 100, 100], // L6
        ]
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // 実ツール出力結果に基づくテスト - BW1系統
    #[test]
    fn test_bw1_new_game_no_save_seed_0x12345678() {
        let seed = 0x12345678;
        
        let offset = calculate_game_offset(seed, GameMode::BwNewGameNoSave);
        assert_eq!(offset, 71, "BW1 最初から（セーブデータなし）のオフセットが一致しません");
        
        let tid_sid = calculate_tid_sid_from_seed(seed, GameMode::BwNewGameNoSave);
        assert_eq!(tid_sid.tid, 5432, "BW1 最初から（セーブデータなし）のTIDが一致しません");
        assert_eq!(tid_sid.sid, 12449, "BW1 最初から（セーブデータなし）のSIDが一致しません");
    }

    #[test]
    fn test_bw1_new_game_with_save_seed_0x12345678() {
        let seed = 0x12345678;
        
        let offset = calculate_game_offset(seed, GameMode::BwNewGameWithSave);
        assert_eq!(offset, 59, "BW1 最初から（セーブデータあり）のオフセットが一致しません");
        
        let tid_sid = calculate_tid_sid_from_seed(seed, GameMode::BwNewGameWithSave);
        assert_eq!(tid_sid.tid, 58399, "BW1 最初から（セーブデータあり）のTIDが一致しません");
        assert_eq!(tid_sid.sid, 27333, "BW1 最初から（セーブデータあり）のSIDが一致しません");
    }

    #[test]
    fn test_bw1_continue_seed_0x12345678() {
        let seed = 0x12345678;
        
        let offset = calculate_game_offset(seed, GameMode::BwContinue);
        assert_eq!(offset, 49, "BW1 続きからのオフセットが一致しません");
        
        // 続きからではTID/SID決定なし
        let tid_sid = calculate_tid_sid_from_seed(seed, GameMode::BwContinue);
        assert_eq!(tid_sid.tid, 0);
        assert_eq!(tid_sid.sid, 0);
        assert_eq!(tid_sid.advances_used, 0);
    }

    // 実ツール出力結果に基づくテスト - BW2系統
    #[test]
    fn test_bw2_new_game_no_save_seed_0x90abcdef() {
        let seed = 0x90ABCDEF;
        
        let offset = calculate_game_offset(seed, GameMode::Bw2NewGameNoSave);
        assert_eq!(offset, 44, "BW2 最初から（セーブデータなし）のオフセットが一致しません");
        
        let tid_sid = calculate_tid_sid_from_seed(seed, GameMode::Bw2NewGameNoSave);
        assert_eq!(tid_sid.tid, 910, "BW2 最初から（セーブデータなし）のTIDが一致しません");
        assert_eq!(tid_sid.sid, 42056, "BW2 最初から（セーブデータなし）のSIDが一致しません");
    }

    #[test]
    fn test_bw2_new_game_no_memory_link_save_seed_0x90abcdef() {
        let seed = 0x90ABCDEF;
        
        let offset = calculate_game_offset(seed, GameMode::Bw2NewGameNoMemoryLinkSave);
        assert_eq!(offset, 29, "BW2 最初から（セーブデータあり、思い出リンクなし）のオフセットが一致しません");
        
        let tid_sid = calculate_tid_sid_from_seed(seed, GameMode::Bw2NewGameNoMemoryLinkSave);
        assert_eq!(tid_sid.tid, 4043, "BW2 最初から（セーブデータあり、思い出リンクなし）のTIDが一致しません");
        assert_eq!(tid_sid.sid, 13882, "BW2 最初から（セーブデータあり、思い出リンクなし）のSIDが一致しません");
    }

    #[test]
    fn test_bw2_new_game_with_memory_link_save_seed_0x90abcdef() {
        let seed = 0x90ABCDEF;
        
        let offset = calculate_game_offset(seed, GameMode::Bw2NewGameWithMemoryLinkSave);
        assert_eq!(offset, 29, "BW2 最初から（セーブデータあり、思い出リンクあり）のオフセットが一致しません");
        
        let tid_sid = calculate_tid_sid_from_seed(seed, GameMode::Bw2NewGameWithMemoryLinkSave);
        assert_eq!(tid_sid.tid, 4043, "BW2 最初から（セーブデータあり、思い出リンクあり）のTIDが一致しません");
        assert_eq!(tid_sid.sid, 13882, "BW2 最初から（セーブデータあり、思い出リンクあり）のSIDが一致しません");
    }

    #[test]
    fn test_bw2_continue_no_memory_link_seed_0x90abcdef() {
        let seed = 0x90ABCDEF;
        
        let offset = calculate_game_offset(seed, GameMode::Bw2ContinueNoMemoryLink);
        assert_eq!(offset, 55, "BW2 続きから（思い出リンクなし）のオフセットが一致しません");
        
        // 続きからではTID/SID決定なし
        let tid_sid = calculate_tid_sid_from_seed(seed, GameMode::Bw2ContinueNoMemoryLink);
        assert_eq!(tid_sid.tid, 0);
        assert_eq!(tid_sid.sid, 0);
        assert_eq!(tid_sid.advances_used, 0);
    }

    #[test]
    fn test_bw2_continue_with_memory_link_seed_0x90abcdef() {
        let seed = 0x90ABCDEF;
        
        let offset = calculate_game_offset(seed, GameMode::Bw2ContinueWithMemoryLink);
        assert_eq!(offset, 55, "BW2 続きから（思い出リンクあり）のオフセットが一致しません");
        
        // 続きからではTID/SID決定なし
        let tid_sid = calculate_tid_sid_from_seed(seed, GameMode::Bw2ContinueWithMemoryLink);
        assert_eq!(tid_sid.tid, 0);
        assert_eq!(tid_sid.sid, 0);
        assert_eq!(tid_sid.advances_used, 0);
    }

    /// TID/SID決定処理のテスト（BW1 セーブなし - seed 0x12345678）
    #[test]
    fn test_calculate_tid_sid_bw1_no_save_seed_0x12345678() {
        let seed = 0x12345678;
        
        let tid_sid = calculate_tid_sid_from_seed(seed, GameMode::BwNewGameNoSave);
        
        // TID/SID値の確認
        assert_eq!(tid_sid.tid, 5432, "BW1 最初から（セーブなし）のTIDが一致しません (seed 0x12345678)");
        assert_eq!(tid_sid.sid, 12449, "BW1 最初から（セーブなし）のSIDが一致しません (seed 0x12345678)");
        
        // TID/SID決定完了時点での累積進行数（リファレンス実装のoffset値）
        assert_eq!(tid_sid.advances_used, 29, "TID/SID決定時点でのoffsetが期待値と一致しません");
    }

    /// TID/SID決定処理のテスト（BW1 セーブあり - seed 0x12345678）
    #[test]
    fn test_calculate_tid_sid_bw1_with_save_seed_0x12345678() {
        let seed = 0x12345678;
        
        let tid_sid = calculate_tid_sid_from_seed(seed, GameMode::BwNewGameWithSave);
        
        // TID/SID値の確認
        assert_eq!(tid_sid.tid, 58399, "BW1 最初から（セーブあり）のTIDが一致しません (seed 0x12345678)");
        assert_eq!(tid_sid.sid, 27333, "BW1 最初から（セーブあり）のSIDが一致しません (seed 0x12345678)");
        
        // TID/SID決定完了時点での累積進行数（リファレンス実装のoffset値）
        assert_eq!(tid_sid.advances_used, 21, "TID/SID決定時点でのoffsetが期待値と一致しません");
    }
}
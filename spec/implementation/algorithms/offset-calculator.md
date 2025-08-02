# オフセット計算エンジン（WASM実装）

オフセット計算は、ゲーム起動時の初期seed（S0）から各種イベント（TID/SID決定等）までの乱数消費回数を正確に計算するエンジンです。

## 基本的な乱数生成エンジン

```rust
// wasm-pkg/src/offset_calculator.rs
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct OffsetCalculator {
    seed: u64,
    advances: u32,
}

#[wasm_bindgen]
impl OffsetCalculator {
    #[wasm_bindgen(constructor)]
    pub fn new(initial_seed: u64) -> OffsetCalculator {
        OffsetCalculator {
            seed: initial_seed,
            advances: 0,
        }
    }
    
    // BW仕様64bit線形合同法
    // S[n+1] = (S[n] * 0x5D588B656C078965 + 0x269EC3) mod 2^64
    pub fn next_seed(&mut self) -> u32 {
        self.seed = self.seed
            .wrapping_mul(0x5D588B656C078965)
            .wrapping_add(0x269EC3);
        self.advances += 1;
        
        // 上位32bitを乱数値として返す
        (self.seed >> 32) as u32
    }
    
    #[wasm_bindgen(getter)]
    pub fn current_seed(&self) -> u64 {
        self.seed
    }
    
    #[wasm_bindgen(getter)]
    pub fn advances(&self) -> u32 {
        self.advances
    }
    
    #[wasm_bindgen(setter)]
    pub fn set_seed(&mut self, seed: u64) {
        self.seed = seed;
    }
    
    // Rand×n回の乱数消費
    pub fn consume_random(&mut self, count: u32) {
        for _ in 0..count {
            self.next_seed();
        }
    }
}
```

## Probability Table (PT) 操作エンジン

```rust
// PT操作の6段階テーブル定義
const PT_TABLES: [[u32; 5]; 6] = [
    [50, 100, 100, 100, 100],  // L1
    [50, 50, 100, 100, 100],   // L2
    [30, 50, 100, 100, 100],   // L3
    [25, 30, 50, 100, 100],    // L4
    [20, 25, 33, 50, 100],     // L5
    [100, 100, 100, 100, 100], // L6
];

#[wasm_bindgen]
impl OffsetCalculator {
    // PT操作×1回
    pub fn probability_table_process(&mut self) {
        for level in 0..6 {  // L1からL6まで
            for j in 0..5 {   // 各レベルで最大5つの閾値をチェック
                if PT_TABLES[level][j] == 100 {
                    // 確率が100なら、次のレベルへ
                    break;
                }
                
                let rand_value = self.next_seed();
                let r = ((rand_value as u64 * 101) >> 32) as u32;
                
                if r <= PT_TABLES[level][j] {
                    // 取得した確率がテーブルの値以下なら次のレベルへ
                    break;
                }
            }
        }
    }
    
    // PT操作×n回
    pub fn probability_table_process_multiple(&mut self, count: u32) {
        for _ in 0..count {
            self.probability_table_process();
        }
    }
}
```

## TID/SID決定処理

```rust
#[wasm_bindgen]
pub struct TidSidResult {
    pub tid: u16,
    pub sid: u16,
    pub advances_used: u32,
}

#[wasm_bindgen]
impl OffsetCalculator {
    // TID/SID決定
    pub fn calculate_tid_sid(&mut self) -> TidSidResult {
        let initial_advances = self.advances;
        let rand_value = self.next_seed();
        
        // (R * 0xFFFFFFFF) >> 32 の計算
        let tid_sid_combined = ((rand_value as u64 * 0xFFFFFFFF) >> 32) as u32;
        let tid = (tid_sid_combined & 0xFFFF) as u16;
        let sid = ((tid_sid_combined >> 16) & 0xFFFF) as u16;
        
        TidSidResult {
            tid,
            sid,
            advances_used: self.advances - initial_advances,
        }
    }
}
```

## ブラックシティ/ホワイトフォレスト住人決定

```rust
#[wasm_bindgen]
impl OffsetCalculator {
    // 表住人決定（10回の乱数消費）
    pub fn determine_front_residents(&mut self) {
        for _ in 0..10 {
            self.next_seed();
        }
    }
    
    // 裏住人決定（3回の乱数消費）
    pub fn determine_back_residents(&mut self) {
        for _ in 0..3 {
            self.next_seed();
        }
    }
    
    // 住人決定一括処理（BWのみ）
    pub fn determine_all_residents(&mut self) {
        self.determine_front_residents();  // 表住人10回
        self.determine_back_residents();   // 裏住人3回
    }
}
```

## Extra処理（BW2専用）

```rust
#[wasm_bindgen]
impl OffsetCalculator {
    // Extra処理（BW2の「続きから始める」でのみ使用）
    pub fn extra_process(&mut self) {
        loop {
            // 3つの値を生成
            let r1 = self.next_seed();
            let value1 = ((r1 as u64 * 15) >> 32) as u32;
            
            let r2 = self.next_seed();
            let value2 = ((r2 as u64 * 15) >> 32) as u32;
            
            let r3 = self.next_seed();
            let value3 = ((r3 as u64 * 15) >> 32) as u32;
            
            // 3つとも異なるかチェック
            if value1 != value2 && value2 != value3 && value3 != value1 {
                break;
            }
            // 同じ値が含まれている場合は継続
        }
    }
}
```

## ゲームバージョン・開始方式別オフセット計算

```rust
#[wasm_bindgen]
#[derive(Clone, Copy)]
pub enum GameMode {
    BwNewGameWithSave,      // BW 始めから（セーブ有り）
    BwNewGameNoSave,        // BW 始めから（セーブ無し）
    BwContinue,             // BW 続きから
    Bw2NewGameWithMemoryLinkSave,    // BW2 始めから（思い出リンク済みセーブ有り）
    Bw2NewGameNoMemoryLinkSave,      // BW2 始めから（思い出リンク無しセーブ有り）
    Bw2NewGameNoSave,               // BW2 始めから（セーブ無し）
    Bw2ContinueWithMemoryLink,      // BW2 続きから（思い出リンク済み）
    Bw2ContinueNoMemoryLink,        // BW2 続きから（思い出リンク無し）
}

#[wasm_bindgen]
impl OffsetCalculator {
    // ゲームモード別オフセット計算
    pub fn calculate_offset(&mut self, mode: GameMode) -> u32 {
        let initial_advances = self.advances;
        
        match mode {
            GameMode::BwNewGameWithSave => {
                // BW 始めから（セーブ有り）
                self.consume_random(1);                    // Rand×1
                self.probability_table_process_multiple(2); // PT×2
                self.generate_chiramii_pid();              // チラーミィPID決定
                self.generate_chiramii_id();               // チラーミィID決定
                self.calculate_tid_sid();                  // TID/SID決定
                self.probability_table_process_multiple(4); // PT×4
                self.determine_all_residents();            // 住人決定13回
            },
            
            GameMode::BwNewGameNoSave => {
                // BW 始めから（セーブ無し）
                self.consume_random(1);                    // Rand×1
                self.probability_table_process_multiple(3); // PT×3
                self.generate_chiramii_pid();              // チラーミィPID決定
                self.generate_chiramii_id();               // チラーミィID決定
                self.calculate_tid_sid();                  // TID/SID決定
                self.consume_random(1);                    // Rand×1
                self.probability_table_process_multiple(4); // PT×4
                self.determine_all_residents();            // 住人決定13回
            },
            
            GameMode::BwContinue => {
                // BW 続きから
                self.consume_random(1);                    // Rand×1
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
    
    // チラーミィPID決定
    fn generate_chiramii_pid(&mut self) -> u32 {
        let rand_value = self.next_seed();
        // BWではxor 0x00010000の分岐あり（実装詳細は要確認）
        rand_value
    }
    
    // チラーミィID決定（0固定）
    fn generate_chiramii_id(&mut self) -> u32 {
        self.next_seed(); // 乱数消費はあるが結果は0固定
        0
    }
    
    // チラチーノPID決定（BW2）
    fn generate_chirachino_pid(&mut self) -> u32 {
        let rand_value = self.next_seed();
        rand_value
    }
    
    // チラチーノID決定（BW2）
    fn generate_chirachino_id(&mut self) -> u32 {
        self.next_seed(); // 乱数消費はあるが結果は0固定
        0
    }
}
```

## オフセット計算統合API

```rust
#[wasm_bindgen]
pub fn calculate_game_offset(initial_seed: u64, mode: GameMode) -> u32 {
    let mut calculator = OffsetCalculator::new(initial_seed);
    calculator.calculate_offset(mode)
}

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
        // BW2の各パターンも同様に実装
        _ => {
            // 他のモードは「続きから」なのでTID/SID決定なし
            return TidSidResult { tid: 0, sid: 0, advances_used: 0 };
        }
    }
    
    // TID/SID決定を実行
    calculator.calculate_tid_sid()
}
```

## 重要な概念

### Probability Table (PT) 操作
- 6段階のレベル構造（L1-L6）
- 各レベルで最大5つの閾値をチェック
- 乱数消費パターンは初期化処理で使用される

### ゲームモード別乱数消費パターン
- **始めから（セーブあり/なし）**: TID/SID決定、住人決定を含む
- **続きから**: 初期化処理のみ
- **BW2のExtra処理**: 重複値回避ループによる可変消費

### 実装上の注意点
- 各処理での正確な乱数消費回数の管理
- バージョン間での処理差異の適切な実装
- セーブファイル状態に依存する処理分岐の考慮

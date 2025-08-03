# 性格値・色違い判定の詳細実装

## 性格値（PID）生成の正確な仕様

BW/BW2では遭遇タイプによって性格値の生成アルゴリズムが異なる：

- **野生エンカウント（0-7）**: 通常・なみのり・釣り・特殊エンカウント全般
  - 通常（草むら・洞窟・ダンジョン共通）
  - なみのり
  - 釣り  
  - 揺れる草むら（特殊エンカウント）
  - 砂煙（特殊エンカウント）
  - ポケモンの影（特殊エンカウント）
  - 水泡（なみのり版特殊エンカウント）
  - 水泡釣り（釣り版特殊エンカウント）
- **固定シンボル・ギフト（10-11）**: 固定位置・イベントポケモン
- **徘徊ポケモン（20）**: イベント発生時に個体決定、陸上・海上統合

```rust
// wasm-pkg/src/pid_calculator.rs
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct PIDCalculator;

#[wasm_bindgen]
impl PIDCalculator {
    #[wasm_bindgen(constructor)]
    pub fn new() -> PIDCalculator {
        PIDCalculator
    }
    
    // 野生エンカウント全般（0-7）: PID = r1[n] ^ 0x00010000
    // 通常・なみのり・釣り・特殊エンカウント全て同じ処理
    pub fn generate_wild_pid(r1: u32) -> u32 {
        r1 ^ 0x00010000
    }
    
    // 固定シンボル・ギフト（10-11）: PID = r1[n] (XOR処理無し)
    pub fn generate_static_pid(r1: u32) -> u32 {
        r1
    }
    
    // 徘徊ポケモン（20）: PID = r1[n] (XOR処理無し、固定シンボルと同様)
    // イベント発生時に個体決定され、以降の遭遇では同じ個体が出現
    pub fn generate_roaming_pid(r1: u32) -> u32 {
        r1
    }
    
    // ギフトポケモンのPID生成
    pub fn generate_gift_pid(r1: u32, r2: u32) -> u32 {
        ((r1 & 0xFFFF) << 16) | (r2 & 0xFFFF)
    }
    
    // タマゴのPID生成
    pub fn generate_egg_pid(r1: u32, r2: u32) -> u32 {
        ((r1 & 0xFFFF0000) >> 16) | ((r2 & 0xFFFF0000))
    }
}

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

#[wasm_bindgen]
pub struct ShinyChecker;

#[wasm_bindgen]
impl ShinyChecker {
    // 色違い判定: (TID ^ SID ^ PID_high ^ PID_low) < 8
    pub fn is_shiny(tid: u16, sid: u16, pid: u32) -> bool {
        Self::get_shiny_value(tid, sid, pid) < 8
    }
    
    // 色違い値計算
    pub fn get_shiny_value(tid: u16, sid: u16, pid: u32) -> u16 {
        let pid_high = (pid >> 16) as u16;
        let pid_low = (pid & 0xFFFF) as u16;
        tid ^ sid ^ pid_high ^ pid_low
    }
    
    // 色違いタイプ判定（星形・四角）
    pub fn get_shiny_type(shiny_value: u16) -> ShinyType {
        match shiny_value {
            0 => ShinyType::Star,      // 星形色違い
            1..=7 => ShinyType::Square, // 四角い色違い
            _ => ShinyType::Normal,    // 通常
        }
    }
    
    // 色違い判定とタイプを同時に取得
    pub fn check_shiny_type(tid: u16, sid: u16, pid: u32) -> ShinyType {
        let shiny_value = Self::get_shiny_value(tid, sid, pid);
        Self::get_shiny_type(shiny_value)
    }
}
```

## 遭遇タイプ別PID生成パターン

現在の実装では、シンプルな静的関数設計を採用し、PersonalityRNGと組み合わせて使用します：

```rust
// 実装例: pokemon_generator.rs での使用方法
use crate::personality_rng::PersonalityRNG;
use crate::pid_shiny_checker::{PIDCalculator, ShinyChecker, ShinyType};

// 野生ポケモンの場合
let mut rng = PersonalityRNG::new(seed);
let r1 = rng.next();
let pid = PIDCalculator::generate_wild_pid(r1);
let shiny_type = ShinyChecker::check_shiny_type(tid, sid, pid);

// 固定シンボルの場合
let mut rng = PersonalityRNG::new(seed);
let r1 = rng.next();
let pid = PIDCalculator::generate_static_pid(r1);
let shiny_type = ShinyChecker::check_shiny_type(tid, sid, pid);

// ギフトポケモンの場合
let mut rng = PersonalityRNG::new(seed);
let r1 = rng.next();
let r2 = rng.next();
let pid = PIDCalculator::generate_gift_pid(r1, r2);
let shiny_type = ShinyChecker::check_shiny_type(tid, sid, pid);
```
    
    fn process_wild_encounter(
        &mut self,
        sync_enabled: bool,
        sync_nature: u32,
        trainer_id: u16,
        secret_id: u16,
    ) -> EncounterResult {
        let mut result = EncounterResult::default();
        
        // Step 1: シンクロ判定 (r1[n])
        let sync_success = if sync_enabled {
            self.rng.sync_check()
        } else {
            false
        };
        result.advances += 1;
        
        // Step 2: 性格決定 (r1[n+1] or 固定)
        let nature_id = if sync_success {
            sync_nature
        } else {
            let nature = self.rng.nature_roll();
            result.advances += 1;
            nature
        };
        
        // Step 3: 遭遇スロット (r1[n+2])
        let encounter_slot = self.rng.encounter_slot_bw();
        result.advances += 1;
        
        // Step 4: レベル乱数 (r1[n+3], 範囲がある場合のみ)
        let level_rand = self.rng.next();
        result.advances += 1;
        
## 重要な仕様

### PID生成方式の違い
- **野生エンカウント（0-7）**: r1[n] ^ 0x00010000
- **固定シンボル・ギフト（10-11）**: r1[n] (XOR処理なし)
- **徘徊ポケモン（20）**: r1[n] (XOR処理なし)
- **ギフトポケモン**: ((r1 & 0xFFFF) << 16) | (r2 & 0xFFFF)
- **タマゴ**: ((r1 & 0xFFFF0000) >> 16) | (r2 & 0xFFFF0000)

### 色違い判定
- **判定式**: (TID ^ SID ^ PID_high ^ PID_low) < 8
- **色違いタイプ**: 
  - 値が0なら星形色違い（Star）
  - 値が1-7なら四角い色違い（Square）
  - 値が8以上なら通常色（Normal）

### シンクロ適用範囲
- **野生エンカウント（0-7）**: シンクロ有効
- **固定シンボル・ギフト（10-11）**: シンクロ有効  
- **徘徊ポケモン（20）**: シンクロ無効

### 実装上の注意点
- 遭遇タイプによる処理分岐の正確な実装
- シンクロ判定タイミングの統一
- 色違い判定アルゴリズムの実装精度（閾値8）
- PID生成時のXOR処理の適用/非適用の正確な判定
- 静的関数設計による高いテスタビリティと保守性の確保

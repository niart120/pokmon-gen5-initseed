# Phase 2B実装計画: メッセージ生成WebAssembly最適化

**作成日時**: 2025年7月26日  
**基準**: Phase 2A検証結果 + yatsuna827/5genInitialSeedSearch参考実装

---

## 🎯 **Phase 2A検証で確定した最適化対象**

### **ボトルネック詳細分析**
```
メッセージ生成が全体時間の35.9%を占有:
├── 日時・BCD変換: 12.2% ← 最重要ボトルネック
├── セットアップ: 11.8%
├── nazo変換: 10.7%
├── MAC処理: 7.9%
├── 配列操作: 7.6%
└── その他: 49.8%

現状性能:
- メッセージ生成: 589,258 gen/sec
- 全体処理: 990,589 calc/sec
- 200万件: 3.39秒
```

### **参考実装の革新的アプローチ (yatsuna827)**
1. **日時計算の完全排除**: ランタイム計算→事前計算テーブル
2. **SIMD並列化**: 4-8並列でのベクトル処理
3. **メモリ最適化**: 固定サイズテーブル+キャッシュ効率

---

## 🚀 **Phase 2B実装戦略**

### **戦略1: 日時コード事前計算システム**

#### **TimeCode事前計算** (86,400エントリ)
```rust
// Rust側実装
pub struct TimeCodeGenerator;

impl TimeCodeGenerator {
    // 全86,400秒分の時刻コードを事前計算
    const TIME_CODES: [u32; 86400] = Self::generate_all_time_codes();
    
    const fn generate_all_time_codes() -> [u32; 86400] {
        let mut codes = [0u32; 86400];
        let mut index = 0;
        
        let mut hour = 0;
        while hour < 24 {
            let h_code = (hour / 10) << 28 | (hour % 10) << 24;
            let h_code = if hour >= 12 { h_code | 0x40000000 } else { h_code };
            
            let mut minute = 0;
            while minute < 60 {
                let min_code = (minute / 10) << 20 | (minute % 10) << 16;
                
                let mut second = 0;
                while second < 60 {
                    let sec_code = (second / 10) << 12 | (second % 10) << 8;
                    codes[index] = h_code | min_code | sec_code;
                    index += 1;
                    second += 1;
                }
                minute += 1;
            }
            hour += 1;
        }
        codes
    }
    
    #[inline]
    pub fn get_time_code(hour: u8, minute: u8, second: u8) -> u32 {
        Self::TIME_CODES[(hour as usize * 3600) + (minute as usize * 60) + (second as usize)]
    }
}
```

#### **DateCode事前計算** (36,525エントリ = 100年分)
```rust
pub struct DateCodeGenerator;

impl DateCodeGenerator {
    const DATE_CODES: [u32; 36525] = Self::generate_all_date_codes();
    
    const fn generate_all_date_codes() -> [u32; 36525] {
        let mut codes = [0u32; 36525];
        let mut index = 0;
        
        // 月末日数（平年・うるう年）
        const MONTH_ENDS: [[u8; 13]; 2] = [
            [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31], // 平年
            [0, 31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31], // うるう年
        ];
        
        let mut year = 0;
        while year < 100 {
            let is_leap = year % 4 == 0;
            let month_end = if is_leap { MONTH_ENDS[1] } else { MONTH_ENDS[0] };
            
            let y_code = (year / 10) << 28 | (year % 10) << 24;
            
            // 曜日計算（Zellerの公式変形）
            let yy = 2000 + year - 1;
            let mut day = (yy + yy / 4 - yy / 100 + yy / 400 + (13 * 13 + 8) / 5 + 1) % 7;
            
            let mut month = 1;
            while month < 13 {
                let m_code = (month / 10) << 20 | (month % 10) << 16;
                
                let mut date = 1;
                while date < month_end[month] {
                    let d_code = (date / 10) << 12 | (date % 10) << 8;
                    codes[index] = y_code | m_code | d_code | day;
                    
                    index += 1;
                    date += 1;
                    day = (day + 1) % 7;
                }
                month += 1;
            }
            year += 1;
        }
        codes
    }
    
    #[inline]
    pub fn get_date_code(year: u8, month: u8, date: u8) -> u32 {
        // インデックス計算ロジック（効率的な方法で実装）
        // ...
    }
}
```

### **戦略2: 統合メッセージ生成+SHA-1計算**

#### **ゼロコピー統合処理**
```rust
#[wasm_bindgen]
pub struct IntegratedSeedSearcher {
    // 固定パラメータ（初期化時に設定）
    mac: [u8; 6],
    nazo: [u32; 5],
    version: u32,
    frame: u32,
    
    // SHA-1作業用バッファ（再利用）
    w_buffer: [u32; 80],
    
    // 結果バッファ（再利用）
    results: Vec<SearchResult>,
}

#[wasm_bindgen]
impl IntegratedSeedSearcher {
    #[wasm_bindgen(constructor)]
    pub fn new(
        mac: &[u8],
        nazo: &[u32],
        version: u32,
        frame: u32,
    ) -> IntegratedSeedSearcher {
        IntegratedSeedSearcher {
            mac: mac.try_into().unwrap(),
            nazo: nazo.try_into().unwrap(),
            version,
            frame,
            w_buffer: [0; 80],
            results: Vec::new(),
        }
    }
    
    #[wasm_bindgen]
    pub fn search_seeds_integrated(
        &mut self,
        year_start: u8,
        month_start: u8,
        date_start: u8,
        hour_start: u8,
        minute_start: u8,
        second_start: u8,
        range_seconds: u32,
        timer0_min: u16,
        timer0_max: u16,
        vcount_min: u16,
        vcount_max: u16,
        target_seeds: &[u32],
    ) -> js_sys::Array {
        self.results.clear();
        
        // 日時範囲の反復処理
        for offset_seconds in 0..range_seconds {
            let total_seconds = Self::datetime_to_seconds(
                year_start, month_start, date_start,
                hour_start, minute_start, second_start
            ) + offset_seconds;
            
            let (year, month, date, hour, minute, second) = 
                Self::seconds_to_datetime(total_seconds);
            
            // 事前計算テーブルから日時コード取得（超高速）
            let date_code = DateCodeGenerator::get_date_code(year, month, date);
            let time_code = TimeCodeGenerator::get_time_code(hour, minute, second);
            
            // Timer0/VCount範囲の反復処理
            for timer0 in timer0_min..=timer0_max {
                for vcount in vcount_min..=vcount_max {
                    // メッセージ生成（固定部分はキャッシュ済み）
                    let message = self.generate_message_optimized(
                        date_code, time_code, timer0, vcount
                    );
                    
                    // SHA-1計算（再利用バッファ使用）
                    let seed = self.calculate_sha1_optimized(&message);
                    
                    // ターゲット照合
                    if target_seeds.binary_search(&seed).is_ok() {
                        self.results.push(SearchResult {
                            seed,
                            year, month, date, hour, minute, second,
                            timer0, vcount,
                        });
                    }
                }
            }
        }
        
        // JavaScript配列として返却
        self.results_to_js_array()
    }
    
    #[inline]
    fn generate_message_optimized(
        &mut self,
        date_code: u32,
        time_code: u32,
        timer0: u16,
        vcount: u16,
    ) -> [u32; 16] {
        // 固定部分（事前計算済み）
        let mut message = [0u32; 16];
        message[0] = self.nazo[0].swap_bytes();
        message[1] = self.nazo[1].swap_bytes();
        message[2] = self.nazo[2].swap_bytes();
        message[3] = self.nazo[3].swap_bytes();
        message[4] = self.nazo[4].swap_bytes();
        message[5] = ((vcount as u32) << 16 | timer0 as u32).swap_bytes();
        message[6] = (self.mac[4] as u32) << 8 | self.mac[5] as u32;
        message[7] = (0x6000000_u32 ^ self.frame ^
            (self.mac[3] as u32) << 24 |
            (self.mac[2] as u32) << 16 |
            (self.mac[1] as u32) << 8 |
            self.mac[0] as u32).swap_bytes();
        message[8] = date_code;  // 事前計算済み
        message[9] = time_code;  // 事前計算済み
        message[10] = 0x00000000;
        message[11] = 0x00000000;
        message[12] = 0xFF2F0000;
        message[13] = 0x80000000;
        message[14] = 0x00000000;
        message[15] = 0x000001A0;
        
        message
    }
}
```

### **戦略3: SIMD並列化** (条件付き)

#### **Vector128活用 (4並列)**
```rust
#[cfg(target_feature = "sse2")]
use std::arch::x86_64::*;

impl IntegratedSeedSearcher {
    #[cfg(target_feature = "sse2")]
    fn search_seeds_simd_x4(
        &mut self,
        // ... パラメータ同じ
    ) -> js_sys::Array {
        // 4つの異なる時刻を同時処理
        unsafe {
            let h0 = _mm_set1_epi32(0x67452301_u32 as i32);
            let h1 = _mm_set1_epi32(0xEFCDAB89_u32 as i32);
            // ... SIMD SHA-1実装
        }
    }
}
```

### **戦略4: メモリ・キャッシュ最適化**

#### **固定パラメータキャッシュ**
```rust
pub struct CachedParameters {
    // nazo部分（5 x u32）
    nazo_bytes: [u32; 5],
    
    // MAC部分（一部固定）
    mac_w6: u32,      // mac[4] << 8 | mac[5]
    mac_w7_base: u32, // 0x6000000 ^ frame ^ mac[3..0]
    
    // 固定メッセージ部分
    w10_15: [u32; 6], // W[10]からW[15]まで
}

impl CachedParameters {
    fn new(mac: &[u8], nazo: &[u32], version: u32, frame: u32) -> Self {
        CachedParameters {
            nazo_bytes: [
                nazo[0].swap_bytes(),
                nazo[1].swap_bytes(),
                nazo[2].swap_bytes(),
                nazo[3].swap_bytes(),
                nazo[4].swap_bytes(),
            ],
            mac_w6: (mac[4] as u32) << 8 | mac[5] as u32,
            mac_w7_base: (0x6000000_u32 ^ frame ^
                (mac[3] as u32) << 24 |
                (mac[2] as u32) << 16 |
                (mac[1] as u32) << 8 |
                mac[0] as u32).swap_bytes(),
            w10_15: [0x00000000, 0x00000000, 0xFF2F0000, 0x80000000, 0x00000000, 0x000001A0],
        }
    }
}
```

---

## 📊 **予想性能改善**

### **改善効果計算**
```
現状ボトルネック分析:
日時・BCD変換: 12.2% → 事前計算により0.1%以下 (120倍高速化)
セットアップ: 11.8% → キャッシュにより2%以下 (6倍高速化)
nazo変換: 10.7% → 最適化により5%以下 (2倍高速化)

メッセージ生成全体: 35.9% → 10%以下 (3.6倍高速化)
→ 全体性能: 1 / (0.641 + 0.1) = 1.35倍向上

追加効果:
- FFI通信削減: +10-15%向上
- SIMD並列化: +50-100%向上 (条件付き)
- メモリ最適化: +5-10%向上

総合予想: 2-3倍性能向上
```

### **目標達成度**
```
現状 → 目標 (Phase 2B完了時)

メッセージ生成速度:
589,258 gen/sec → 2,000,000+ gen/sec (3.4倍)

全体処理速度:
990,589 calc/sec → 1,500,000+ calc/sec (1.5倍)

200万件処理時間:
3.39秒 → 1.3秒以下 (2.6倍)

メモリ効率:
現状維持またはさらなる改善
```

---

## 🛠️ **実装フェーズ**

### **Phase 2B-1: 基盤実装** (1-2日)
1. TimeCode/DateCode事前計算テーブル
2. 基本的な統合処理関数
3. キャッシュ機構

### **Phase 2B-2: 最適化実装** (2-3日)
1. SIMD並列化 (条件付き)
2. メモリレイアウト最適化
3. バッチ処理チューニング

### **Phase 2B-3: 検証・統合** (1日)
1. Phase 2A同等テスト実行
2. 性能向上確認
3. 回帰テスト

**Phase 2B完了予定**: 2025年7月30日頃

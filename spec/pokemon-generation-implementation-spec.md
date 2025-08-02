# ポケモン生成機能 実装仕様書

## 1. 概要

ポケモン生成機能の技術的な実装詳細、アーキテクチャ設計、および開発手順を定義する。

## 2. アーキテクチャ設計

### 2.1 全体構成（修正版）

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   UI Layer      │    │  Service Layer  │    │   Data Layer    │
│  (TypeScript)   │    │  (TypeScript)   │    │  (TypeScript)   │
│                 │    │                 │    │                 │
│ - React         │ ←→ │ - Result Parser │ ←→ │ - Species Data  │
│   Components    │    │ - Data Manager  │    │ - Encounter     │
│ - Form Handling │    │ - UI Controller │    │   Tables        │
│ - State Mgmt    │    │ - Export Logic  │    │ - Static Data   │
│   (Zustand)     │    │                 │    │   (JSON)        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │  WASM Layer     │
                    │     (Rust)      │
                    │                 │
                    │ - 64bit LCG     │
                    │ - Pokemon Gen   │
                    │ - Encounter     │
                    │   Calculation   │
                    │ - Raw Data Gen  │
                    └─────────────────┘
```

**重要な設計変更**:
- **計算ロジック**: 全てWASM側で実装
- **TypeScript側**: 結果のパース・UI表示のみ
- **フォールバック実装**: 提供しない

### 2.2 WASM-TypeScript データインターフェース

#### 2.2.1 WASM側出力データ構造

```rust
// wasm-pkg/src/pokemon_data.rs
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct RawPokemonData {
    // 基本データ
    personality_value: u32,      // 性格値（PID）
    encounter_slot_value: u32,   // 遭遇スロット値
    nature_id: u32,             // 性格ID（0-24）
    sync_applied: bool,         // シンクロ適用フラグ
    advances: u32,              // 消費数
    
    // 追加情報
    level: u8,                  // レベル
    shiny_flag: bool,           // 色違いフラグ
    ability_slot: u8,           // 特性スロット（1 or 2）
    gender_value: u8,           // 性別判定値
    
    // デバッグ情報
    rng_seed_used: u64,         // 使用されたseed
    encounter_type: u32,        // 遭遇タイプ
}

#[wasm_bindgen]
impl RawPokemonData {
    // Getter methods for JavaScript access
    #[wasm_bindgen(getter)]
    pub fn personality_value(&self) -> u32 { self.personality_value }
    
    #[wasm_bindgen(getter)]
    pub fn encounter_slot_value(&self) -> u32 { self.encounter_slot_value }
    
    #[wasm_bindgen(getter)]
    pub fn nature_id(&self) -> u32 { self.nature_id }
    
    #[wasm_bindgen(getter)]
    pub fn sync_applied(&self) -> bool { self.sync_applied }
    
    #[wasm_bindgen(getter)]
    pub fn advances(&self) -> u32 { self.advances }
    
    #[wasm_bindgen(getter)]
    pub fn level(&self) -> u8 { self.level }
    
    #[wasm_bindgen(getter)]
    pub fn shiny_flag(&self) -> bool { self.shiny_flag }
    
    #[wasm_bindgen(getter)]
    pub fn ability_slot(&self) -> u8 { self.ability_slot }
    
    #[wasm_bindgen(getter)]
    pub fn gender_value(&self) -> u8 { self.gender_value }
    
    #[wasm_bindgen(getter)]
    pub fn rng_seed_used(&self) -> u64 { self.rng_seed_used }
    
    #[wasm_bindgen(getter)]
    pub fn encounter_type(&self) -> u32 { self.encounter_type }
}
```

#### 2.2.2 TypeScript側データパーサー

```typescript
// src/lib/generation/result-parser.ts
interface GeneratedPokemon {
  // 基本情報
  species: string;
  level: number;
  nature: PokemonNature;
  ability: AbilityData;
  gender: Gender;
  isShiny: boolean;
  
  // 詳細情報
  personalityValue: number;
  encounterSlot: number;
  advances: number;
  
  // メタ情報
  synchronizeApplied: boolean;
  frame: number;
  rngSeedUsed: bigint;
}

class PokemonResultParser {
  constructor(
    private dataManager: GenerationDataManager,
    private gameVersion: GameVersion
  ) {}
  
  // WASM出力をTypeScript型に変換
  parseRawData(rawData: RawPokemonData, encounterParams: EncounterParams): GeneratedPokemon {
    return {
      // 出現ポケモン決定（遭遇スロット → エンカウントテーブル参照）
      species: this.determineSpecies(rawData.encounter_slot_value, encounterParams),
      
      // レベルはWASM側で計算済み
      level: rawData.level,
      
      // 性格は性格IDから変換
      nature: this.getNatureFromId(rawData.nature_id),
      
      // 特性決定（性格値の16bit目で判定）
      ability: this.determineAbility(rawData.personality_value, rawData.encounter_slot_value, encounterParams),
      
      // 性別決定（性格値下位8bit vs 種族閾値）
      gender: this.determineGender(rawData.personality_value, rawData.encounter_slot_value, encounterParams),
      
      // 色違いはWASM側で判定済み
      isShiny: rawData.shiny_flag,
      
      // 詳細情報
      personalityValue: rawData.personality_value,
      encounterSlot: rawData.encounter_slot_value,
      advances: rawData.advances,
      
      // メタ情報
      synchronizeApplied: rawData.sync_applied,
      frame: rawData.advances,
      rngSeedUsed: BigInt(rawData.rng_seed_used),
    };
  }
  
  private determineSpecies(slotValue: number, encounterParams: EncounterParams): string {
    const encounterTable = this.dataManager.getEncounterTable(encounterParams.location);
    if (!encounterTable) throw new Error(`Unknown location: ${encounterParams.location}`);
    
    // 遭遇スロット値をテーブルインデックスに変換
    const calculator = new EncounterCalculator(this.gameVersion);
    const tableIndex = calculator.slot_to_table_index(slotValue, encounterParams.type);
    
    return encounterTable.slots[tableIndex]?.pokemon || 'Unknown';
  }
  
  private determineAbility(pid: number, slotValue: number, encounterParams: EncounterParams): AbilityData {
    const species = this.determineSpecies(slotValue, encounterParams);
    const speciesData = this.dataManager.getSpecies(species);
    if (!speciesData) throw new Error(`Unknown species: ${species}`);
    
    // 性格値の16bit目で特性判定
    const abilitySlot = (pid >> 16) & 1;
    const abilityName = abilitySlot === 0 ? speciesData.abilities.ability1 : speciesData.abilities.ability2;
    
    return this.dataManager.getAbility(abilityName);
  }
  
  private determineGender(pid: number, slotValue: number, encounterParams: EncounterParams): Gender {
    const species = this.determineSpecies(slotValue, encounterParams);
    const speciesData = this.dataManager.getSpecies(species);
    if (!speciesData) throw new Error(`Unknown species: ${species}`);
    
    // 性別比率が固定の場合
    if (speciesData.genderRatio === 'genderless') return 'genderless';
    if (speciesData.genderRatio === 'male-only') return 'male';
    if (speciesData.genderRatio === 'female-only') return 'female';
    
    // 性格値下位8bit vs 種族閾値で判定
    const genderValue = pid & 0xFF;
    const threshold = this.getGenderThreshold(speciesData.genderRatio);
    
    return genderValue < threshold ? 'female' : 'male';
  }
  
  private getNatureFromId(natureId: number): PokemonNature {
    const natureList = [
      'Hardy', 'Lonely', 'Brave', 'Adamant', 'Naughty',
      'Bold', 'Docile', 'Relaxed', 'Impish', 'Lax',
      'Timid', 'Hasty', 'Serious', 'Jolly', 'Naive',
      'Modest', 'Mild', 'Quiet', 'Bashful', 'Rash',
      'Calm', 'Gentle', 'Sassy', 'Careful', 'Quirky'
    ];
    
    return natureList[natureId] as PokemonNature;
  }
  
  private getGenderThreshold(genderRatio: string): number {
    const ratioMap: Record<string, number> = {
      '87.5:12.5': 31,   // 87.5% male (starter等)
      '75:25': 63,       // 75% male
      '50:50': 127,      // 50% male
      '25:75': 191,      // 25% male
      '12.5:87.5': 225,  // 12.5% male
    };
    
    return ratioMap[genderRatio] || 127;
  }
}
```

### 2.3 モジュール設計（修正版）

```
src/
├── components/
│   └── generation/
│       ├── GenerationTab.tsx           # メインタブコンポーネント
│       ├── input/
│       │   ├── BasicParamsCard.tsx     # 基本パラメータ入力
│       │   ├── EncounterSettingsCard.tsx # 遭遇設定
│       │   ├── WildEncounterForm.tsx   # 野生遭遇フォーム
│       │   ├── StaticEncounterForm.tsx # 固定シンボルフォーム
│       │   ├── RoamingEncounterForm.tsx # 徘徊ポケモンフォーム
│       │   └── GenerationRangeCard.tsx # 生成範囲設定
│       ├── results/
│       │   ├── ResultsTable.tsx        # 結果テーブル
│       │   ├── ResultsCard.tsx         # カード表示
│       │   ├── PokemonDetails.tsx      # 詳細表示
│       │   ├── StatisticsPanel.tsx     # 統計パネル
│       │   └── FilterControls.tsx      # フィルター制御
│       └── controls/
│           ├── GenerationControls.tsx  # 生成制御ボタン
│           ├── ProgressDisplay.tsx     # 進捗表示
│           └── ExportControls.tsx      # エクスポート制御
├── lib/
│   └── generation/
│       ├── pokemon-generator-service.ts # WASMラッパーサービス
│       ├── result-parser.ts            # WASM結果パーサー
│       ├── data-manager.ts             # 静的データ管理
│       ├── validation.ts               # 入力検証
│       └── export-manager.ts           # エクスポート処理
├── data/
│   └── generation/
│       ├── species/                    # 種族データ
│       ├── encounters/                 # 遭遇データ
│       ├── game-data/                 # ゲームデータ
│       └── constants/                 # 定数データ
├── types/
│   └── generation.ts                  # 型定義
├── store/
│   └── generation-store.ts            # 状態管理
└── workers/
    └── pokemon-generation-worker.ts    # バックグラウンド処理

wasm-pkg/
├── src/
│   ├── lib.rs                         # WASMエントリーポイント
│   ├── personality_rng.rs             # 性格値乱数列エンジン
│   ├── encounter_calculator.rs        # 遭遇スロット計算
│   ├── pokemon_generator.rs           # メイン生成エンジン
│   ├── pokemon_data.rs                # データ構造定義
│   └── utils.rs                       # ユーティリティ
└── Cargo.toml                         # Rust設定
```

### 2.4 責任分離の原則

#### WASM側の責任
- **64bit線形合同法による乱数生成**
- **BW/BW2別の遭遇スロット計算**
- **性格値・性格・レベル決定**
- **色違い判定**
- **高速バッチ処理**

#### TypeScript側の責任
- **WASM結果のパース・変換**
- **エンカウントテーブルとの照合**
- **種族データとの統合**
- **UI表示・状態管理**
- **エクスポート・フィルタリング**

#### 境界の明確化
- **WASMはRawPokemonDataのみ返却**
- **TypeScriptは表示用データに変換**
- **計算ロジックの重複を完全に排除**

## 3. データフロー設計

### 3.1 状態管理（Zustand）

```typescript
interface GenerationStore {
  // 入力状態
  input: {
    basicParams: BasicParams;
    encounterSettings: EncounterSettings;
    generationRange: GenerationRange;
  };
  
  // 計算状態
  generation: {
    isRunning: boolean;
    isPaused: boolean;
    progress: GenerationProgress;
    results: GeneratedPokemon[];
    statistics: GenerationStatistics;
  };
  
  // UI状態
  ui: {
    activeView: 'table' | 'cards';
    filters: FilterSettings;
    sorting: SortSettings;
    selectedPokemon?: GeneratedPokemon;
    showDetails: boolean;
  };
  
  // アクション
  actions: {
    updateInput: (section: string, data: any) => void;
    startGeneration: () => Promise<void>;
    pauseGeneration: () => void;
    stopGeneration: () => void;
    applyFilters: (filters: FilterSettings) => void;
    exportResults: (format: ExportFormat) => void;
  };
}
```

### 3.2 WebWorker通信

```typescript
// メインスレッド → Worker
interface GenerationWorkerRequest {
  type: 'START' | 'PAUSE' | 'RESUME' | 'STOP';
  payload?: {
    initialSeed: number;
    encounterType: EncounterType;
    encounterParams: EncounterParams;
    generationRange: GenerationRange;
    trainerId: number;
    secretId: number;
    synchronize: SynchronizeSettings;
  };
}

// Worker → メインスレッド
interface GenerationWorkerResponse {
  type: 'PROGRESS' | 'RESULT' | 'COMPLETE' | 'ERROR' | 'PAUSED';
  payload?: {
    progress?: GenerationProgress;
    pokemon?: GeneratedPokemon;
    error?: string;
    statistics?: GenerationStatistics;
  };
}
```

## 4. 核心アルゴリズム実装

### 4.1 性格値乱数列エンジン（WASM実装）

**重要**: 計算ロジックは全てWASM側で実装し、TypeScript側はフォールバック実装を行わない。

```rust
// wasm-pkg/src/personality_rng.rs
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct PersonalityRNG {
    seed: u64,
}

#[wasm_bindgen]
impl PersonalityRNG {
    #[wasm_bindgen(constructor)]
    pub fn new(initial_seed: u64) -> PersonalityRNG {
        PersonalityRNG {
            seed: initial_seed,
        }
    }
    
    // BW仕様64bit線形合同法
    // S1[n+1] = S1[n] * 0x5D588B656C078965 + 0x269EC3
    pub fn next(&mut self) -> u32 {
        self.seed = self.seed
            .wrapping_mul(0x5D588B656C078965)
            .wrapping_add(0x269EC3);
        
        // 上位32bitを返す（実際の乱数として使用）
        (self.seed >> 32) as u32
    }
    
    // シンクロ判定用: (r1[n]*2)>>32
    pub fn sync_check(&mut self) -> bool {
        let rand = self.next();
        ((rand as u64 * 2) >> 32) == 0
    }
    
    // 性格決定用: (r1[n]*25)>>32
    pub fn nature_roll(&mut self) -> u32 {
        let rand = self.next();
        ((rand as u64 * 25) >> 32) as u32
    }
    
    // 遭遇スロット決定（BW用）: (seed*0xFFFF/0x290)>>32
    pub fn encounter_slot_bw(&mut self) -> u32 {
        let rand = self.next();
        ((rand as u64 * 0xFFFF / 0x290) >> 32) as u32
    }
    
    // 遭遇スロット決定（BW2用）: (seed*100)>>32
    pub fn encounter_slot_bw2(&mut self) -> u32 {
        let rand = self.next();
        ((rand as u64 * 100) >> 32) as u32
    }
    
    #[wasm_bindgen(getter)]
    pub fn current_seed(&self) -> u64 {
        self.seed
    }
    
    #[wasm_bindgen(setter)]
    pub fn set_seed(&mut self, seed: u64) {
        self.seed = seed;
    }
}
```

### 4.3 統合Pokemon Generator（WASM実装）

```rust
// wasm-pkg/src/pokemon_generator.rs
use wasm_bindgen::prelude::*;
use crate::personality_rng::PersonalityRNG;
use crate::encounter_calculator::{EncounterCalculator, GameVersion};
use crate::pokemon_data::RawPokemonData;

#[wasm_bindgen]
pub struct PokemonGenerator {
    rng: PersonalityRNG,
    encounter_calc: EncounterCalculator,
    game_version: GameVersion,
}

#[wasm_bindgen]
impl PokemonGenerator {
    #[wasm_bindgen(constructor)]
    pub fn new(initial_seed: u64, game_version: GameVersion) -> PokemonGenerator {
        PokemonGenerator {
            rng: PersonalityRNG::new(initial_seed),
            encounter_calc: EncounterCalculator::new(game_version),
            game_version,
        }
    }
    
    // メイン生成メソッド
    pub fn generate_pokemon_batch(
        &mut self,
        count: u32,
        encounter_type: u32,
        sync_enabled: bool,
        sync_nature_id: u32,
        trainer_id: u16,
        secret_id: u16,
    ) -> Vec<RawPokemonData> {
        let mut results = Vec::new();
        
        for advances in 0..count {
            if let Some(pokemon) = self.generate_single_pokemon(
                encounter_type,
                sync_enabled,
                sync_nature_id,
                trainer_id,
                secret_id,
                advances,
            ) {
                results.push(pokemon);
            }
        }
        
        results
    }
    
    fn generate_single_pokemon(
        &mut self,
        encounter_type: u32,
        sync_enabled: bool,
        sync_nature_id: u32,
        trainer_id: u16,
        secret_id: u16,
        advances: u32,
    ) -> Option<RawPokemonData> {
        let start_seed = self.rng.current_seed();
        
        // Step 1: シンクロ判定（固定シンボル・野生のみ）
        let (sync_applied, nature_id) = if encounter_type <= 1 {
            let sync_check = sync_enabled && self.rng.sync_check();
            if sync_check {
                (true, sync_nature_id)
            } else {
                (false, self.rng.nature_roll())
            }
        } else {
            // 徘徊ポケモンはシンクロ無効
            (false, self.rng.nature_roll())
        };
        
        // Step 2: 遭遇スロット決定
        let encounter_slot_value = match self.game_version {
            GameVersion::BlackWhite => self.rng.encounter_slot_bw(),
            GameVersion::BlackWhite2 => self.rng.encounter_slot_bw2(),
        };
        
        // Step 3: 性格値決定
        let personality_value = match encounter_type {
            0 | 1 => {
                // 野生・固定シンボル: r1[n+1]^0x00010000
                let pid_base = self.rng.next();
                pid_base ^ 0x00010000
            },
            2 => {
                // 徘徊ポケモン: r1[n] (XOR無し)
                self.rng.next()
            },
            _ => return None, // 未対応のエンカウントタイプ
        };
        
        // Step 4: レベル決定（簡易実装、実際は遭遇テーブル依存）
        let level = self.calculate_level(encounter_slot_value, encounter_type);
        
        // Step 5: 色違い判定
        let shiny_flag = self.check_shiny(personality_value, trainer_id, secret_id);
        
        // Step 6: 特性スロット決定
        let ability_slot = if (personality_value >> 16) & 1 == 0 { 1 } else { 2 };
        
        // Step 7: 性別判定値
        let gender_value = (personality_value & 0xFF) as u8;
        
        Some(RawPokemonData {
            personality_value,
            encounter_slot_value,
            nature_id,
            sync_applied,
            advances,
            level,
            shiny_flag,
            ability_slot,
            gender_value,
            rng_seed_used: start_seed,
            encounter_type,
        })
    }
    
    fn calculate_level(&mut self, slot_value: u32, encounter_type: u32) -> u8 {
        // 簡易実装：実際はエンカウントテーブルとレベル範囲に依存
        match encounter_type {
            0 => 25, // 草むら：固定レベル例
            1 => {
                // なみのり：レベル範囲からランダム選択
                let level_rand = self.rng.next();
                let min_lv = 25;
                let max_lv = 35;
                ((level_rand as u64 * (max_lv - min_lv + 1) as u64) >> 32) as u8 + min_lv
            },
            2 => 30, // 徘徊：固定レベル
            _ => 25,
        }
    }
    
    fn check_shiny(&self, pid: u32, trainer_id: u16, secret_id: u16) -> bool {
        let pid_high = (pid >> 16) as u16;
        let pid_low = (pid & 0xFFFF) as u16;
        let shiny_value = trainer_id ^ secret_id ^ pid_high ^ pid_low;
        shiny_value < 8
    }
    
    #[wasm_bindgen(getter)]
    pub fn current_seed(&self) -> u64 {
        self.rng.current_seed()
    }
    
    #[wasm_bindgen(setter)]
    pub fn set_seed(&mut self, seed: u64) {
        self.rng.set_seed(seed);
    }
}
```
```

## 5. 性格値・色違い判定の詳細実装

### 5.1 性格値（PID）生成の正確な仕様

BWにおける性格値生成は遭遇タイプによって異なるアルゴリズムを使用する。

```rust
// wasm-pkg/src/pid_generation.rs
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct PIDGenerator;

#[wasm_bindgen]
impl PIDGenerator {
    // 野生ポケモン・固定シンボル用PID生成
    pub fn generate_wild_static_pid(rng: &mut PersonalityRNG) -> u32 {
        // BW仕様: r1[n+1] ^ 0x00010000
        let pid_base = rng.next();
        pid_base ^ 0x00010000
    }
    
    // 一部の固定シンボル用PID生成（特殊ケース）
    pub fn generate_special_static_pid(rng: &mut PersonalityRNG) -> u32 {
        // 特殊ケース: r1[n+1] ^ 0x80010000
        let pid_base = rng.next();
        pid_base ^ 0x80010000
    }
    
    // 徘徊ポケモン用PID生成
    pub fn generate_roaming_pid(rng: &mut PersonalityRNG) -> u32 {
        // 徘徊: r1[n] (XOR処理なし)
        rng.next()
    }
    
    // タマゴ用PID生成（参考実装）
    pub fn generate_egg_pid(rng: &mut PersonalityRNG) -> u32 {
        // タマゴ: 特殊な生成ロジック（今回は対象外）
        // 実装時には別の計算が必要
        rng.next()
    }
}

#[wasm_bindgen]
pub struct ShinyChecker;

#[wasm_bindgen]
impl ShinyChecker {
    // 色違い判定の詳細実装
    pub fn is_shiny(pid: u32, trainer_id: u16, secret_id: u16) -> bool {
        let pid_high = (pid >> 16) as u16;
        let pid_low = (pid & 0xFFFF) as u16;
        
        // 色違い値計算: TID ^ SID ^ PIDHigh ^ PIDLow
        let shiny_value = trainer_id ^ secret_id ^ pid_high ^ pid_low;
        
        // BW: 色違い値が8未満で色違い（1/8192確率）
        shiny_value < 8
    }
    
    // デバッグ用: 色違い値を返す
    pub fn get_shiny_value(pid: u32, trainer_id: u16, secret_id: u16) -> u16 {
        let pid_high = (pid >> 16) as u16;
        let pid_low = (pid & 0xFFFF) as u16;
        trainer_id ^ secret_id ^ pid_high ^ pid_low
    }
    
    // 色違いの種類判定
    pub fn get_shiny_type(pid: u32, trainer_id: u16, secret_id: u16) -> u32 {
        let shiny_value = Self::get_shiny_value(pid, trainer_id, secret_id);
        
        match shiny_value {
            0 => 2,      // Square Shiny (正方形)
            1..=7 => 1,  // Star Shiny (星型)
            _ => 0,      // Not Shiny
        }
    }
}
```

### 5.2 遭遇タイプ別PID生成パターン

```rust
impl PokemonGenerator {
    fn generate_pid_by_encounter_type(&mut self, encounter_type: u32) -> u32 {
        match encounter_type {
            0 => {
                // 草むら野生ポケモン
                PIDGenerator::generate_wild_static_pid(&mut self.rng)
            },
            1 => {
                // 固定シンボル（通常）
                PIDGenerator::generate_wild_static_pid(&mut self.rng)
            },
            2 => {
                // 徘徊ポケモン（ボルトロス・トルネロス）
                PIDGenerator::generate_roaming_pid(&mut self.rng)
            },
            3 => {
                // なみのり
                PIDGenerator::generate_wild_static_pid(&mut self.rng)
            },
            4 => {
                // つり
                PIDGenerator::generate_wild_static_pid(&mut self.rng)
            },
            5 => {
                // 砂煙
                PIDGenerator::generate_wild_static_pid(&mut self.rng)
            },
            6 => {
                // 特殊固定シンボル（一部のレジェンダリー）
                PIDGenerator::generate_special_static_pid(&mut self.rng)
            },
            _ => {
                // デフォルト
                PIDGenerator::generate_wild_static_pid(&mut self.rng)
            }
        }
    }
}
```

## 6. 遭遇タイプ別乱数消費パターンの詳細

### 6.1 消費順序の正確な仕様

BWにおける乱数消費は遭遇タイプによって厳密に定義されている。

```rust
// wasm-pkg/src/encounter_patterns.rs
use wasm_bindgen::prelude::*;
use crate::personality_rng::PersonalityRNG;

#[wasm_bindgen]
pub struct EncounterPattern;

#[wasm_bindgen]
impl EncounterPattern {
    // 野生ポケモン（草むら）の消費パターン
    // シンクロ判定 → 出現ポケモン決定 → スキップ → 性格値決定 → 性格決定
    pub fn wild_grass_pattern(
        rng: &mut PersonalityRNG,
        sync_enabled: bool,
        sync_nature_id: u32,
    ) -> EncounterResult {
        // Step 1: シンクロ判定 (1消費)
        let sync_applied = sync_enabled && rng.sync_check();
        
        // Step 2: 出現ポケモン決定 (1消費)
        let encounter_slot = rng.encounter_slot_bw(); // またはbw2
        
        // Step 3: スキップ (1消費)
        rng.next(); // この値は使用されない
        
        // Step 4: 性格値決定 (1消費)
        let pid = rng.next() ^ 0x00010000;
        
        // Step 5: 性格決定 (1消費、シンクロ不発時のみ)
        let nature_id = if sync_applied {
            sync_nature_id
        } else {
            rng.nature_roll()
        };
        
        // 合計: 5消費（シンクロ成功時）/ 5消費（シンクロ失敗時）
        EncounterResult {
            pid,
            encounter_slot,
            nature_id,
            sync_applied,
            total_consumption: 5,
        }
    }
    
    // 固定シンボルの消費パターン
    // 野生と同じパターン
    pub fn static_symbol_pattern(
        rng: &mut PersonalityRNG,
        sync_enabled: bool,
        sync_nature_id: u32,
    ) -> EncounterResult {
        // 固定シンボルは野生と同じ消費パターン
        Self::wild_grass_pattern(rng, sync_enabled, sync_nature_id)
    }
    
    // 徘徊ポケモンの消費パターン
    // 性格値決定 → 性格決定（シンクロ無効）
    pub fn roaming_pattern(rng: &mut PersonalityRNG) -> EncounterResult {
        // Step 1: 性格値決定 (1消費、XOR無し)
        let pid = rng.next();
        
        // Step 2: 性格決定 (1消費)
        let nature_id = rng.nature_roll();
        
        // 合計: 2消費
        EncounterResult {
            pid,
            encounter_slot: 0, // 徘徊は遭遇スロット無し
            nature_id,
            sync_applied: false, // シンクロ無効
            total_consumption: 2,
        }
    }
    
    // なみのり・つりの消費パターン
    // シンクロ判定 → 出現ポケモン決定 → レベル決定 → 性格値決定 → 性格決定
    pub fn surfing_fishing_pattern(
        rng: &mut PersonalityRNG,
        sync_enabled: bool,
        sync_nature_id: u32,
        game_version: GameVersion,
    ) -> EncounterResult {
        // Step 1: シンクロ判定 (1消費)
        let sync_applied = sync_enabled && rng.sync_check();
        
        // Step 2: 出現ポケモン決定 (1消費)
        let encounter_slot = match game_version {
            GameVersion::BlackWhite => rng.encounter_slot_bw(),
            GameVersion::BlackWhite2 => rng.encounter_slot_bw2(),
        };
        
        // Step 3: レベル決定 (1消費)
        let level_rand = rng.next();
        
        // Step 4: 性格値決定 (1消費)
        let pid = rng.next() ^ 0x00010000;
        
        // Step 5: 性格決定 (1消費、シンクロ不発時のみ)
        let nature_id = if sync_applied {
            sync_nature_id
        } else {
            rng.nature_roll()
        };
        
        // 合計: 5消費（シンクロ成功時）/ 5消費（シンクロ失敗時）
        EncounterResult {
            pid,
            encounter_slot,
            nature_id,
            sync_applied,
            total_consumption: 5,
        }
    }
    
    // 大量発生の消費パターン
    // 通常野生 + 大量発生判定
    pub fn mass_outbreak_pattern(
        rng: &mut PersonalityRNG,
        sync_enabled: bool,
        sync_nature_id: u32,
    ) -> EncounterResult {
        // Step 1: 大量発生判定 (1消費)
        let outbreak_check = rng.next();
        let is_outbreak_pokemon = (outbreak_check as u64 * 100) >> 32 < 40; // 40%で大量発生
        
        // Step 2-6: 通常野生と同じパターン (5消費)
        let mut result = Self::wild_grass_pattern(rng, sync_enabled, sync_nature_id);
        
        // 大量発生時は遭遇スロットを書き換え
        if is_outbreak_pokemon {
            result.encounter_slot = 100; // 大量発生専用スロット
        }
        
        result.total_consumption += 1; // 大量発生判定分
        result
    }
}

#[wasm_bindgen]
pub struct EncounterResult {
    pub pid: u32,
    pub encounter_slot: u32,
    pub nature_id: u32,
    pub sync_applied: bool,
    pub total_consumption: u32,
}
```

### 6.2 消費パターン一覧表

| 遭遇タイプ | 消費順序 | 総消費数 | 備考 |
|-----------|---------|----------|------|
| 草むら野生 | シンクロ→出現→スキップ→性格値→性格 | 5 | スキップは固定 |
| 固定シンボル | シンクロ→出現→スキップ→性格値→性格 | 5 | 野生と同様 |
| 徘徊ポケモン | 性格値→性格 | 2 | シンクロ無効 |
| なみのり | シンクロ→出現→レベル→性格値→性格 | 5 | レベル判定追加 |
| つり | シンクロ→出現→レベル→性格値→性格 | 5 | なみのりと同様 |
| 砂煙 | シンクロ→出現→スキップ→性格値→性格 | 5 | 草むらと同様 |
| 大量発生 | 大量発生判定→(通常野生パターン) | 6 | 判定1消費追加 |

### 6.3 統合生成エンジンでの実装

```rust
impl PokemonGenerator {
    fn generate_by_encounter_type(
        &mut self,
        encounter_type: u32,
        sync_enabled: bool,
        sync_nature_id: u32,
    ) -> EncounterResult {
        match encounter_type {
            0 => {
                // 草むら野生
                EncounterPattern::wild_grass_pattern(
                    &mut self.rng, sync_enabled, sync_nature_id
                )
            },
            1 => {
                // 固定シンボル
                EncounterPattern::static_symbol_pattern(
                    &mut self.rng, sync_enabled, sync_nature_id
                )
            },
            2 => {
                // 徘徊ポケモン
                EncounterPattern::roaming_pattern(&mut self.rng)
            },
            3 | 4 => {
                // なみのり・つり
                EncounterPattern::surfing_fishing_pattern(
                    &mut self.rng, sync_enabled, sync_nature_id, self.game_version
                )
            },
            5 => {
                // 砂煙
                EncounterPattern::wild_grass_pattern(
                    &mut self.rng, sync_enabled, sync_nature_id
                )
            },
            6 => {
                // 大量発生
                EncounterPattern::mass_outbreak_pattern(
                    &mut self.rng, sync_enabled, sync_nature_id
                )
            },
            _ => {
                // デフォルト（野生扱い）
                EncounterPattern::wild_grass_pattern(
                    &mut self.rng, sync_enabled, sync_nature_id
                )
            }
        }
    }
}

## 7. データ管理実装（TypeScript側）

### 7.1 Generation Data Manager

```typescript
// src/lib/generation/data-manager.ts
export class GenerationDataManager {
  private speciesData: Map<string, PokemonSpeciesData> = new Map();
  private encounterTables: Map<string, EncounterTable> = new Map();
  private abilityData: Map<string, AbilityData> = new Map();
  private gameConstants: GameConstants;
  
  constructor(gameVersion: GameVersion) {
    this.gameConstants = this.loadGameConstants(gameVersion);
  }
  
  async initialize(): Promise<void> {
    await Promise.all([
      this.loadSpeciesData(),
      this.loadEncounterTables(),
      this.loadAbilityData(),
    ]);
  }
  
  private async loadSpeciesData(): Promise<void> {
    const response = await fetch('/data/generation/species/gen5-species.json');
    const data = await response.json();
    
    for (const species of data.species) {
      this.speciesData.set(species.name.toLowerCase(), species);
    }
  }
  
  private async loadEncounterTables(): Promise<void> {
    const response = await fetch('/data/generation/encounters/gen5-encounters.json');
    const data = await response.json();
    
    for (const [locationId, table] of Object.entries(data.tables)) {
      this.encounterTables.set(locationId, table as EncounterTable);
    }
  }
  
  private async loadAbilityData(): Promise<void> {
    const response = await fetch('/data/generation/abilities/gen5-abilities.json');
    const data = await response.json();
    
    for (const ability of data.abilities) {
      this.abilityData.set(ability.name.toLowerCase(), ability);
    }
  }
  
  // 種族データ取得
  getSpecies(name: string): PokemonSpeciesData | undefined {
    return this.speciesData.get(name.toLowerCase());
  }
  
  // 遭遇テーブル取得
  getEncounterTable(locationId: string): EncounterTable | undefined {
    return this.encounterTables.get(locationId);
  }
  
  // 特性データ取得
  getAbility(name: string): AbilityData | undefined {
    return this.abilityData.get(name.toLowerCase());
  }
  
  // 遭遇スロットからポケモン種族を特定
  getSpeciesFromSlot(slotIndex: number, encounterTable: EncounterTable): string {
    if (slotIndex >= encounterTable.slots.length) {
      throw new Error(`Invalid slot index: ${slotIndex}`);
    }
    
    return encounterTable.slots[slotIndex].pokemon;
  }
  
  // 性別比率の閾値取得
  getGenderThreshold(species: string): number {
    const speciesData = this.getSpecies(species);
    if (!speciesData) return 127; // デフォルト50:50
    
    const ratioMap: Record<string, number> = {
      'genderless': -1,
      'male-only': 256,
      'female-only': 0,
      '87.5:12.5': 31,   // 87.5% male (starter等)
      '75:25': 63,       // 75% male
      '50:50': 127,      // 50% male
      '25:75': 191,      // 25% male
      '12.5:87.5': 225,  // 12.5% male
    };
    
    return ratioMap[speciesData.genderRatio] ?? 127;
  }
  
  // データ整合性チェック
  validateDataIntegrity(): ValidationResult {
    const errors: string[] = [];
    
    // 遭遇テーブルの参照整合性チェック
    for (const [locationId, table] of this.encounterTables) {
      for (const slot of table.slots) {
        if (!this.speciesData.has(slot.pokemon.toLowerCase())) {
          errors.push(`Unknown pokemon: ${slot.pokemon} in ${locationId}`);
        }
        
        // 特性の存在チェック
        const species = this.getSpecies(slot.pokemon);
        if (species) {
          if (!this.abilityData.has(species.abilities.ability1.toLowerCase())) {
            errors.push(`Unknown ability1: ${species.abilities.ability1} for ${slot.pokemon}`);
          }
          if (species.abilities.ability2 && !this.abilityData.has(species.abilities.ability2.toLowerCase())) {
            errors.push(`Unknown ability2: ${species.abilities.ability2} for ${slot.pokemon}`);
          }
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  private loadGameConstants(gameVersion: GameVersion): GameConstants {
    // ゲームバージョン別の定数
    const constants = {
      [GameVersion.BlackWhite]: {
        encounterSlotDivisor: 0x290,
        encounterSlotMultiplier: 0xFFFF,
        vcount: { black: 0x60, white: 0x5f },
        nazo: { black: 0x2215f10, white: 0x2215f30 },
      },
      [GameVersion.BlackWhite2]: {
        encounterSlotDivisor: 1,
        encounterSlotMultiplier: 100,
        vcount: { black2: 0x60, white2: 0x5f }, // 要確認
        nazo: { black2: 0x2215f10, white2: 0x2215f30 }, // 要確認
      }
    };
    
    return constants[gameVersion];
  }
}

// 型定義
interface PokemonSpeciesData {
  name: string;
  pokedexNumber: number;
  types: { type1: string; type2?: string };
  baseStats: { hp: number; attack: number; defense: number; specialAttack: number; specialDefense: number; speed: number };
  abilities: { ability1: string; ability2?: string; hiddenAbility?: string };
  genderRatio: string;
  catchRate: number;
  baseExperience: number;
}

interface EncounterTable {
  location: string;
  encounterType: string;
  levelRange: { min: number; max: number };
  slots: EncounterSlot[];
}

interface EncounterSlot {
  index: number;
  pokemon: string;
  probability: number;
  levelRange?: { min: number; max: number };
}

interface AbilityData {
  name: string;
  description: string;
  effect: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

interface GameConstants {
  encounterSlotDivisor: number;
  encounterSlotMultiplier: number;
  vcount: Record<string, number>;
  nazo: Record<string, number>;
}
```
```


## 7. テスト戦略

### 7.1 Unit Tests

```typescript
// pokemon-generator.test.ts
describe('PokemonGenerator', () => {
  let generator: PokemonGenerator;
  
  beforeEach(() => {
    generator = new PokemonGenerator(0x12345678);
  });
  
  test('should generate consistent results with same seed', () => {
    const params = createTestParams();
    
    const result1 = generator.generateSinglePokemon(params, 0);
    generator.setSeed(0x12345678); // reset
    const result2 = generator.generateSinglePokemon(params, 0);
    
    expect(result1).toEqual(result2);
  });
  
  test('should respect synchronize settings', () => {
    const params = createTestParams({
      synchronize: { enabled: true, nature: 'Adamant' }
    });
    
    // 統計的テスト: 50%程度でAdamantが出るはず
    const results = Array.from({ length: 1000 }, (_, i) => 
      generator.generateSinglePokemon(params, i)
    );
    
    const adamantCount = results.filter(r => r.nature === 'Adamant').length;
    expect(adamantCount).toBeGreaterThan(400);
    expect(adamantCount).toBeLessThan(600);
  });
  
  test('should generate valid shiny Pokemon', () => {
    const params = createTestParams({ trainerId: 12345, secretId: 54321 });
    
    const results = Array.from({ length: 10000 }, (_, i) => 
      generator.generateSinglePokemon(params, i)
    );
    
    const shinyResults = results.filter(r => r.isShiny);
    
    // 期待値: 10000 / 8192 ≈ 1.22匹
    expect(shinyResults.length).toBeGreaterThan(0);
    expect(shinyResults.length).toBeLessThan(20); // 統計的範囲内
    
    // 色違い判定の正確性確認
    for (const shiny of shinyResults) {
      const shinyValue = params.trainerId ^ params.secretId ^ 
                        (shiny.pid >>> 16) ^ (shiny.pid & 0xFFFF);
      expect(shinyValue).toBeLessThan(8);
    }
  });
});
```

### 7.2 Integration Tests

```typescript
// generation-integration.test.ts
describe('Pokemon Generation Integration', () => {
  test('should generate realistic encounter distribution', async () => {
    const generator = new PokemonGenerator(0x12345678);
    const dataManager = new GenerationDataManager();
    await dataManager.initialize();
    
    const params = {
      encounterType: 'wild' as const,
      encounterParams: {
        location: 'route-1',
        timeOfDay: 'day' as const,
        season: 'spring' as const
      },
      maxCount: 1000,
      maxAdvances: 10000
    };
    
    const results = await generator.generatePokemon(params);
    
    // 遭遇分布の妥当性チェック
    const patratCount = results.filter(r => r.species === 'Patrat').length;
    const lillipupCount = results.filter(r => r.species === 'Lillipup').length;
    
    // Route 1の遭遇テーブルに基づく期待値
    expect(patratCount).toBeGreaterThan(400); // ~50%
    expect(lillipupCount).toBeGreaterThan(400); // ~50%
  });
});
```

## 8. 実装フェーズ

### 8.1 Phase 1: Core Engine（2週間）
1. 基本RNGエンジン実装
2. Pokemon Generator基本機能
3. 野生ポケモン生成
4. Unit Tests

### 8.2 Phase 2: Data Integration（1週間）
1. Data Manager実装
2. 種族データ・遭遇テーブル統合
3. データ検証機能
4. Integration Tests

### 8.3 Phase 3: UI Implementation（2週間）
1. React コンポーネント実装
2. 状態管理（Zustand）
3. 基本的な表示機能
4. UI Tests

### 8.4 Phase 4: Advanced Features（2週間）
1. 固定シンボル・つり対応
2. フィルタリング・ソート
3. エクスポート機能
4. パフォーマンス最適化

### 8.5 Phase 5: WebWorker & Performance（1週間）
1. WebWorker実装
2. WASM最適化
3. メモリ効率化
4. Performance Tests

### 8.6 Phase 6: Polish & Documentation（1週間）
1. エラーハンドリング強化
2. アクセシビリティ対応
3. ドキュメント整備
4. E2E Tests



---

**作成日**: 2025年8月2日  
**バージョン**: 1.0  
**作成者**: GitHub Copilot  
**依存**: pokemon-generation-feature-spec.md, pokemon-data-specification.md, pokemon-generation-ui-spec.md

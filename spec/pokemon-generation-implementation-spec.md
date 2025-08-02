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

### 4.3 WASM最適化版（Rust）

```rust
// wasm-pkg/src/pokemon_generation.rs

use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct PokemonGenerationEngine {
    rng_seed: u32,
}

#[wasm_bindgen]
impl PokemonGenerationEngine {
    #[wasm_bindgen(constructor)]
    pub fn new(initial_seed: u32) -> PokemonGenerationEngine {
        PokemonGenerationEngine {
            rng_seed: initial_seed,
        }
    }
    
    // 高速バッチ生成
    #[wasm_bindgen]
    pub fn generate_batch(
        &mut self,
        count: u32,
        encounter_type: u32,
        trainer_id: u16,
        secret_id: u16,
        sync_enabled: bool,
        sync_nature: u32,
    ) -> Vec<u32> {
        let mut results = Vec::new();
        
        for _ in 0..count {
            let pokemon_data = self.generate_single_pokemon(
                encounter_type,
                trainer_id,
                secret_id,
                sync_enabled,
                sync_nature,
            );
            
            // 結果をu32配列として格納（パフォーマンス重視）
            results.extend_from_slice(&pokemon_data);
        }
        
        results
    }
    
    fn generate_single_pokemon(
        &mut self,
        encounter_type: u32,
        trainer_id: u16,
        secret_id: u16,
        sync_enabled: bool,
        sync_nature: u32,
    ) -> [u32; 12] {  // 固定サイズ配列で効率化
        // [0]: species_id
        // [1]: level
        // [2]: nature_id
        // [3]: ability_id
        // [4]: hp_iv | (atk_iv << 8) | (def_iv << 16) | (spa_iv << 24)
        // [5]: spd_iv | (spe_iv << 8) | (pid_low << 16)
        // [6]: pid_high
        // [7]: encounter_slot
        // [8]: is_shiny | (gender << 1) | (sync_applied << 2)
        // [9]: advances
        // [10]: rng_value_1
        // [11]: rng_value_2
        
        let mut result = [0u32; 12];
        
        // 実装詳細...
        
        result
    }
    
    #[inline]
    fn next_rng(&mut self) -> u32 {
        self.rng_seed = self.rng_seed.wrapping_mul(0x41C64E6D).wrapping_add(0x6073);
        self.rng_seed
    }
    
    #[inline]
    fn next_u16(&mut self) -> u16 {
        (self.next_rng() >> 16) as u16
    }
}
```

## 5. データ管理実装

### 5.1 Data Manager

```typescript
class GenerationDataManager {
  private speciesData: Map<string, PokemonSpeciesData> = new Map();
  private encounterTables: Map<string, EncounterTable> = new Map();
  private natureData: NatureData[] = [];
  private abilityData: Map<string, AbilityData> = new Map();
  
  async initialize(): Promise<void> {
    await Promise.all([
      this.loadSpeciesData(),
      this.loadEncounterTables(),
      this.loadNatureData(),
      this.loadAbilityData(),
    ]);
  }
  
  private async loadSpeciesData(): Promise<void> {
    const response = await fetch('/data/generation/species/gen5-species.json');
    const data = await response.json();
    
    for (const species of data.species) {
      this.speciesData.set(species.name, species);
    }
  }
  
  getSpecies(name: string): PokemonSpeciesData | undefined {
    return this.speciesData.get(name);
  }
  
  getEncounterTable(locationId: string): EncounterTable | undefined {
    return this.encounterTables.get(locationId);
  }
  
  // データ整合性チェック
  validateDataIntegrity(): ValidationResult {
    const errors: string[] = [];
    
    // 参照整合性チェック
    for (const [locationId, table] of this.encounterTables) {
      for (const slot of table.slots) {
        if (!this.speciesData.has(slot.pokemon)) {
          errors.push(`Unknown pokemon: ${slot.pokemon} in ${locationId}`);
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
```

### 5.2 キャッシュ戦略

```typescript
class DataCacheManager {
  private cache = new Map<string, any>();
  private cacheExpiry = new Map<string, number>();
  private readonly TTL = 30 * 60 * 1000; // 30分
  
  set(key: string, value: any): void {
    this.cache.set(key, value);
    this.cacheExpiry.set(key, Date.now() + this.TTL);
  }
  
  get(key: string): any | undefined {
    const expiry = this.cacheExpiry.get(key);
    if (expiry && Date.now() > expiry) {
      this.cache.delete(key);
      this.cacheExpiry.delete(key);
      return undefined;
    }
    
    return this.cache.get(key);
  }
  
  // よく使用されるデータのプリロード
  async preloadCommonData(): Promise<void> {
    const commonLocations = ['route-1', 'route-2', 'dreamyard'];
    const commonPokemon = ['patrat', 'lillipup', 'purrloin'];
    
    await Promise.all([
      ...commonLocations.map(loc => this.preloadLocation(loc)),
      ...commonPokemon.map(pokemon => this.preloadSpecies(pokemon))
    ]);
  }
}
```

## 6. パフォーマンス最適化

### 6.1 WebWorker実装

```typescript
// pokemon-generation-worker.ts
import { PokemonGenerator } from '../lib/generation/pokemon-generator';

let generator: PokemonGenerator | null = null;
let isRunning = false;
let shouldStop = false;

self.onmessage = async (event: MessageEvent<GenerationWorkerRequest>) => {
  const { type, payload } = event.data;
  
  switch (type) {
    case 'START':
      if (payload) {
        generator = new PokemonGenerator(payload.initialSeed);
        isRunning = true;
        shouldStop = false;
        
        try {
          await generatePokemonBatch(payload);
        } catch (error) {
          self.postMessage({
            type: 'ERROR',
            payload: { error: error.message }
          });
        }
      }
      break;
      
    case 'STOP':
      shouldStop = true;
      isRunning = false;
      break;
      
    case 'PAUSE':
      isRunning = false;
      self.postMessage({ type: 'PAUSED' });
      break;
      
    case 'RESUME':
      isRunning = true;
      if (generator && payload) {
        await generatePokemonBatch(payload);
      }
      break;
  }
};

async function generatePokemonBatch(params: GenerationParams): Promise<void> {
  const batchSize = 100;
  let totalGenerated = 0;
  
  while (totalGenerated < params.maxCount && isRunning && !shouldStop) {
    const batchResults = await generator!.generateBatch(
      Math.min(batchSize, params.maxCount - totalGenerated),
      params
    );
    
    // 結果を逐次送信
    for (const pokemon of batchResults) {
      self.postMessage({
        type: 'RESULT',
        payload: { pokemon }
      });
    }
    
    totalGenerated += batchResults.length;
    
    // 進捗通知
    self.postMessage({
      type: 'PROGRESS',
      payload: {
        progress: {
          current: totalGenerated,
          total: params.maxCount,
          percentage: (totalGenerated / params.maxCount) * 100
        }
      }
    });
    
    // 一時停止チェック
    while (!isRunning && !shouldStop) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  if (!shouldStop) {
    self.postMessage({ type: 'COMPLETE' });
  }
}
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

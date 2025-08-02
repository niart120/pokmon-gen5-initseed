# ポケモン生成機能 アーキテクチャ設計

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
// src/store/generation-store.ts
interface GenerationState {
  // 入力パラメータ
  basicParams: BasicParams;
  encounterParams: EncounterParams;
  rangeParams: RangeParams;
  
  // 実行状態
  isGenerating: boolean;
  progress: number;
  currentFrame: number;
  estimatedTimeRemaining: number;
  
  // 結果データ
  generatedPokemon: GeneratedPokemon[];
  statistics: GenerationStatistics;
  filteredResults: GeneratedPokemon[];
  
  // UI状態
  selectedResultIndex: number | null;
  filterSettings: FilterSettings;
  sortConfig: SortConfig;
  exportSettings: ExportSettings;
}

interface GenerationActions {
  // パラメータ更新
  setBasicParams: (params: Partial<BasicParams>) => void;
  setEncounterParams: (params: Partial<EncounterParams>) => void;
  setRangeParams: (params: Partial<RangeParams>) => void;
  
  // 生成制御
  startGeneration: () => Promise<void>;
  pauseGeneration: () => void;
  stopGeneration: () => void;
  
  // 結果操作
  addGeneratedPokemon: (pokemon: GeneratedPokemon[]) => void;
  clearResults: () => void;
  selectResult: (index: number | null) => void;
  
  // フィルタリング
  updateFilter: (filter: Partial<FilterSettings>) => void;
  applyFilters: () => void;
  
  // エクスポート
  exportResults: (format: ExportFormat) => Promise<void>;
}

const useGenerationStore = create<GenerationState & GenerationActions>((set, get) => ({
  // 初期状態
  basicParams: {
    gameVersion: 'black-white',
    trainerId: 0,
    secretId: 0,
    synchronizeEnabled: false,
    synchronizeNature: 'Hardy',
  },
  
  encounterParams: {
    type: 'wild-grass',
    location: 'route-1',
    method: 'walking',
  },
  
  rangeParams: {
    startFrame: 1,
    endFrame: 10000,
    maxResults: 1000,
  },
  
  isGenerating: false,
  progress: 0,
  currentFrame: 0,
  estimatedTimeRemaining: 0,
  
  generatedPokemon: [],
  statistics: { total: 0, shiny: 0, byNature: {}, byAbility: {} },
  filteredResults: [],
  
  selectedResultIndex: null,
  filterSettings: { onlyShiny: false, natures: [], abilities: [] },
  sortConfig: { field: 'frame', direction: 'asc' },
  exportSettings: { format: 'csv', includeMetadata: true },
  
  // アクション実装
  setBasicParams: (params) => set(state => ({
    basicParams: { ...state.basicParams, ...params }
  })),
  
  startGeneration: async () => {
    const state = get();
    set({ isGenerating: true, progress: 0, currentFrame: state.rangeParams.startFrame });
    
    try {
      // WebWorkerでWASMを呼び出し
      const worker = new Worker('/workers/pokemon-generation-worker.js');
      
      worker.postMessage({
        action: 'generate',
        params: {
          basic: state.basicParams,
          encounter: state.encounterParams,
          range: state.rangeParams,
        }
      });
      
      worker.onmessage = (event) => {
        const { type, data } = event.data;
        
        switch (type) {
          case 'progress':
            set({ progress: data.progress, currentFrame: data.currentFrame });
            break;
            
          case 'results':
            get().addGeneratedPokemon(data.pokemon);
            break;
            
          case 'complete':
            set({ isGenerating: false });
            worker.terminate();
            break;
            
          case 'error':
            console.error('Generation error:', data.error);
            set({ isGenerating: false });
            worker.terminate();
            break;
        }
      };
    } catch (error) {
      set({ isGenerating: false });
      throw error;
    }
  },
  
  // 他のアクション...
}));
```

### 3.2 WebWorker通信

```typescript
// src/workers/pokemon-generation-worker.ts
import { PokemonGeneratorService } from '@/lib/generation/pokemon-generator-service';

const generatorService = new PokemonGeneratorService();

self.onmessage = async (event) => {
  const { action, params } = event.data;
  
  switch (action) {
    case 'generate':
      await handleGeneration(params);
      break;
      
    default:
      self.postMessage({ type: 'error', data: { error: `Unknown action: ${action}` } });
  }
};

async function handleGeneration(params: GenerationParams) {
  try {
    // WASM初期化
    await generatorService.initialize();
    
    const { basic, encounter, range } = params;
    const batchSize = 1000; // バッチサイズ
    const totalFrames = range.endFrame - range.startFrame + 1;
    
    for (let frame = range.startFrame; frame <= range.endFrame; frame += batchSize) {
      const endFrame = Math.min(frame + batchSize - 1, range.endFrame);
      
      // WASM でバッチ生成
      const results = await generatorService.generateBatch({
        startFrame: frame,
        endFrame: endFrame,
        basicParams: basic,
        encounterParams: encounter,
      });
      
      // 結果を送信
      self.postMessage({
        type: 'results',
        data: { pokemon: results }
      });
      
      // 進捗更新
      const progress = ((endFrame - range.startFrame + 1) / totalFrames) * 100;
      self.postMessage({
        type: 'progress',
        data: { progress, currentFrame: endFrame }
      });
    }
    
    self.postMessage({ type: 'complete' });
    
  } catch (error) {
    self.postMessage({
      type: 'error',
      data: { error: error.message }
    });
  }
}
```

---

**作成日**: 2025年8月3日  
**バージョン**: 1.0  
**作成者**: GitHub Copilot  
**依存**: pokemon-generation-feature-spec.md, pokemon-data-specification.md, pokemon-generation-ui-spec.md

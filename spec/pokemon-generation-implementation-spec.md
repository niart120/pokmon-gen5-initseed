# ポケモン生成機能 実装仕様書

## 1. 概要

ポケモン生成機能の技術的な実装詳細、アーキテクチャ設計、および開発手順を定義する。

## 2. アーキテクチャ設計

### 2.1 全体構成

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   UI Layer      │    │  Service Layer  │    │   Data Layer    │
│                 │    │                 │    │                 │
│ - React         │ ←→ │ - Pokemon Gen   │ ←→ │ - Species Data  │
│   Components    │    │   Service       │    │ - Encounter     │
│ - Form Handling │    │ - RNG Engine    │    │   Tables        │
│ - State Mgmt    │    │ - Calculation   │    │ - Static Data   │
│   (Zustand)     │    │   Workers       │    │   (JSON)        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │  WASM Layer     │
                    │                 │
                    │ - RNG Engine    │
                    │ - LCG Algorithm │
                    │ - SIMD Parallel │
                    │   Processing    │
                    └─────────────────┘
```

### 2.2 モジュール設計

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
│       │   ├── FishingEncounterForm.tsx # つりフォーム
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
│       ├── pokemon-generator.ts        # メイン生成エンジン
│       ├── rng-engine.ts              # 乱数生成エンジン
│       ├── encounter-calculator.ts     # 遭遇計算
│       ├── pokemon-calculator.ts       # ポケモン計算
│       ├── shiny-calculator.ts        # 色違い判定
│       └── data-manager.ts            # データ管理
├── data/
│   └── generation/
│       ├── species/                   # 種族データ
│       ├── encounters/                # 遭遇データ
│       ├── game-data/                # ゲームデータ
│       └── constants/                # 定数データ
├── types/
│   └── generation.ts                 # 型定義
├── store/
│   └── generation-store.ts           # 状態管理
└── workers/
    └── pokemon-generation-worker.ts   # バックグラウンド処理
```

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

### 4.1 RNG Engine（TypeScript）

```typescript
class PokemonRNGEngine {
  private seed: number;
  
  constructor(initialSeed: number) {
    this.seed = initialSeed >>> 0; // 32bit unsigned
  }
  
  // LCG乱数生成
  next(): number {
    this.seed = ((this.seed * 0x41C64E6D) + 0x6073) >>> 0;
    return this.seed;
  }
  
  // 上位16bit取得
  nextU16(): number {
    return this.next() >>> 16;
  }
  
  // 範囲指定乱数
  nextRange(max: number): number {
    return this.nextU16() % max;
  }
  
  // 現在のseed値取得
  getCurrentSeed(): number {
    return this.seed;
  }
  
  // seed値設定
  setSeed(seed: number): void {
    this.seed = seed >>> 0;
  }
}
```

### 4.2 Pokemon Generator

```typescript
class PokemonGenerator {
  private rng: PokemonRNGEngine;
  private dataManager: GenerationDataManager;
  
  constructor(initialSeed: number) {
    this.rng = new PokemonRNGEngine(initialSeed);
    this.dataManager = new GenerationDataManager();
  }
  
  // メイン生成メソッド
  async generatePokemon(params: GenerationParams): Promise<GeneratedPokemon[]> {
    const results: GeneratedPokemon[] = [];
    let advances = 0;
    
    while (results.length < params.maxCount && advances < params.maxAdvances) {
      const pokemon = await this.generateSinglePokemon(params, advances);
      if (pokemon) {
        results.push(pokemon);
      }
      advances++;
      
      // 進捗通知
      if (advances % 100 === 0) {
        this.notifyProgress(advances, params.maxAdvances, results.length);
      }
    }
    
    return results;
  }
  
  private async generateSinglePokemon(
    params: GenerationParams, 
    advances: number
  ): Promise<GeneratedPokemon | null> {
    const startSeed = this.rng.getCurrentSeed();
    
    // Step 1: 遭遇判定
    const encounterSlot = this.calculateEncounterSlot(params.encounterType, params.encounterParams);
    if (!encounterSlot) return null;
    
    // Step 2: ポケモン種族決定
    const species = this.determineSpecies(encounterSlot, params.encounterParams);
    
    // Step 3: レベル決定
    const level = this.determineLevel(encounterSlot, params.encounterParams);
    
    // Step 4: 性格決定
    const nature = this.determineNature(params.synchronize);
    
    // Step 5: 特性決定
    const ability = this.determineAbility(species);
    
    // Step 6: 個体値生成
    const ivs = this.generateIVs();
    
    // Step 7: PID生成・色違い判定
    const { pid, isShiny } = this.generatePIDAndShiny(params.trainerId, params.secretId);
    
    // Step 8: 性別決定
    const gender = this.determineGender(species, pid);
    
    return {
      species: species.name,
      level,
      nature,
      ability,
      gender,
      ivs,
      isShiny,
      pid,
      encounterSlot: encounterSlot.id,
      advances,
      rngValues: this.rng.getUsedValues(), // デバッグ用
      synchronizeApplied: params.synchronize.enabled && nature === params.synchronize.nature,
      frame: advances
    };
  }
  
  private determineNature(synchronize: SynchronizeSettings): PokemonNature {
    const random = this.rng.nextRange(100);
    
    if (synchronize.enabled && random < 50) {
      return synchronize.nature!;
    }
    
    const natureId = this.rng.nextRange(25);
    return NATURE_LIST[natureId];
  }
  
  private generateIVs(): IVSet {
    return {
      hp: this.rng.nextRange(32),
      attack: this.rng.nextRange(32),
      defense: this.rng.nextRange(32),
      specialAttack: this.rng.nextRange(32),
      specialDefense: this.rng.nextRange(32),
      speed: this.rng.nextRange(32)
    };
  }
  
  private generatePIDAndShiny(trainerId: number, secretId: number): { pid: number; isShiny: boolean } {
    const pidLow = this.rng.nextU16();
    const pidHigh = this.rng.nextU16();
    const pid = (pidHigh << 16) | pidLow;
    
    // 色違い判定: (TID ^ SID ^ PIDHigh ^ PIDLow) < 8
    const shinyValue = trainerId ^ secretId ^ pidHigh ^ pidLow;
    const isShiny = shinyValue < 8;
    
    return { pid, isShiny };
  }
}
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

# WebWorker並列化実装計画書

## 概要

ポケモンBW/BW2初期Seed探索アプリケーションにWebWorker並列化機能を実装し、CPU数に応じたスケーラブルな高速化を実現する。

## 背景と課題

### 現状の制約
- **Timer0範囲が狭い**: BWでは3193-3194（2値）、BW2でも最大8値程度
- **現在の並列化**: Timer0単位でのループ分割は非効率
- **主要計算負荷**: 時刻範囲の探索が支配的

### 解決方針
- **時刻範囲による分割**: Timer0制約を回避し、時刻軸で効率的並列化
- **CPU数自動最適化**: `navigator.hardwareConcurrency`に基づく動的調整
- **WebAssembly活用**: 各Workerで統合探索の高性能を維持

## 技術仕様

### アーキテクチャ設計

```
┌─────────────────────────────────────────────────────────┐
│                    Main Thread                          │
│  ┌─────────────────┐    ┌──────────────────────────┐   │
│  │ UI Components   │    │ MultiWorkerSearchManager │   │
│  │ - SearchControl │◄──►│ - Worker coordination    │   │
│  │ - Progress      │    │ - Progress aggregation   │   │
│  │ - Results       │    │ - Result collection      │   │
│  └─────────────────┘    └──────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    ▼             ▼             ▼
        ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
        │   Worker 1    │ │   Worker 2    │ │   Worker N    │
        │ Time Range A  │ │ Time Range B  │ │ Time Range Z  │
        │ - WASM Search │ │ - WASM Search │ │ - WASM Search │
        │ - Results     │ │ - Results     │ │ - Results     │
        └───────────────┘ └───────────────┘ └───────────────┘
```

### 分割戦略

#### 時刻範囲分割アルゴリズム
```typescript
function createTimeChunks(conditions: SearchConditions): WorkerChunk[] {
  const totalSeconds = calculateTotalSeconds(conditions.dateRange);
  const cpuCount = navigator.hardwareConcurrency || 4;
  const secondsPerWorker = Math.ceil(totalSeconds / cpuCount);
  
  // 各Workerが独立した時刻範囲を担当
  return chunks;
}
```

#### チャンク最適化
- **均等分割**: 各Workerの計算負荷を均等化
- **境界調整**: 秒単位での正確な境界設定
- **オーバーラップ回避**: 重複計算を防止

### パフォーマンス目標
- **理論値**: 4コアで4倍高速化
- **実測目標**: 3.5倍以上の実効高速化
- **メモリ制限**: 追加500MB以下
- **UI応答性**: 進捗更新500ms間隔維持

## 実装計画

### Phase 1: 基盤インフラストラクチャ (優先度: 最高)

#### Task 1.1: 型定義とインターフェース設計
**ファイル**: `src/types/pokemon.ts`

**作業内容**:
```typescript
// 新規型定義
export interface WorkerChunk {
  workerId: number;
  startDateTime: Date;
  endDateTime: Date;
  timer0Range: { min: number; max: number };
  vcountRange: { min: number; max: number };
}

export interface ParallelSearchSettings {
  enabled: boolean;
  maxWorkers: number;
  chunkStrategy: 'time-based' | 'hybrid' | 'auto';
}

export interface AggregatedProgress {
  totalCurrentStep: number;
  totalSteps: number;
  totalElapsedTime: number;
  totalEstimatedTimeRemaining: number;
  totalMatchesFound: number;
  activeWorkers: number;
  completedWorkers: number;
}
```

**検証基準**:
- [ ] 型定義の完全性確認
- [ ] 既存型との互換性確認
- [ ] TypeScript strict mode通過

#### Task 1.2: チャンク分割ロジック実装
**ファイル**: `src/lib/search/chunk-calculator.ts`

**作業内容**:
- 時刻範囲の最適分割アルゴリズム
- CPU数に基づく動的調整

**検証基準**:
- [ ] 4コア環境での均等分割確認
- [ ] 境界値での正確性確認

### Phase 2: Worker管理システム (優先度: 最高)

#### Task 2.1: MultiWorkerSearchManager実装
**ファイル**: `src/lib/search/multi-worker-manager.ts`

**作業内容**:
```typescript
export class MultiWorkerSearchManager {
  private workers: Map<number, Worker> = new Map();
  private workerProgresses: Map<number, WorkerProgress> = new Map();
  
  async startParallelSearch(
    conditions: SearchConditions,
    targetSeeds: number[],
    callbacks: SearchCallbacks
  ): Promise<void>
  
  private aggregateProgress(): AggregatedProgress
  private handleWorkerCompletion(workerId: number): void
  public terminateAll(): void
}
```

**検証基準**:
- [ ] 複数Worker同時起動確認
- [ ] 進捗集約の正確性確認
- [ ] リソース管理の適切性確認
- [ ] エラーハンドリングの網羅性確認

#### Task 2.2: 並列処理専用Worker実装
**ファイル**: `src/workers/parallel-search-worker.ts`

**作業内容**:
- 時刻チャンク専用処理ロジック
- WebAssembly統合探索の最適化
- 進捗レポート機能

**検証基準**:
- [ ] 単一チャンクでの正確性確認
- [ ] WebAssembly統合の動作確認
- [ ] メモリリーク防止確認

### Phase 3: 既存システム統合 (優先度: 高)

#### Task 3.1: SearchWorkerManager拡張
**ファイル**: `src/lib/search/search-worker-manager.ts`

**作業内容**:
```typescript
export class SearchWorkerManager {
  private singleWorkerMode: boolean = true;
  private multiWorkerManager: MultiWorkerSearchManager | null = null;

  public setParallelMode(enabled: boolean): void
  public startSearch(...): boolean // 並列/単独の動的切り替え
}
```

**検証基準**:
- [ ] 既存機能の互換性維持
- [ ] 並列/単独モードの適切な切り替え
- [ ] エラー時のフォールバック動作確認

#### Task 3.2: アプリケーション状態管理拡張
**ファイル**: `src/store/app-store.ts`

**作業内容**:
```typescript
interface AppStore {
  // 並列検索設定
  parallelSearchEnabled: boolean;
  maxWorkers: number;
  parallelProgress: AggregatedProgress;
  
  // 新規アクション
  setParallelSearchEnabled: (enabled: boolean) => void;
  setMaxWorkers: (count: number) => void;
  setParallelProgress: (progress: Partial<AggregatedProgress>) => void;
}
```

**検証基準**:
- [ ] 状態永続化の適切性確認
- [ ] 既存状態管理との互換性確認
- [ ] パフォーマンス影響の最小化確認

### Phase 4: UI実装 (優先度: 中)

#### Task 4.1: 並列検索制御UI実装
**ファイル**: `src/components/search/SearchControlCard.tsx`

**作業内容**:
- 並列検索ON/OFF切り替え
- Worker数調整スライダー
- 並列進捗表示

**UI設計**:
```tsx
// 設定セクション
<div className="space-y-4 border-t pt-4">
  <Checkbox id="parallel-search" />
  <Label>Enable Parallel Search (Experimental)</Label>
  
  <Slider 
    min={1} 
    max={navigator.hardwareConcurrency || 4}
    value={[maxWorkers]}
  />
  <p className="text-sm text-muted-foreground">
    More workers = faster search but higher memory usage
  </p>
</div>
```

**検証基準**:
- [ ] UI要素の適切な配置確認
- [ ] 設定値の即座反映確認
- [ ] アクセシビリティ要件準拠

#### Task 4.2: 並列進捗可視化実装
**ファイル**: `src/components/search/SearchProgressCard.tsx`

**作業内容**:
- Worker別進捗表示
- 集約進捗メトリクス
- パフォーマンス指標表示

**検証基準**:
- [ ] リアルタイム更新の確認
- [ ] 大量データでのパフォーマンス確認

### Phase 5: テストと最適化 (優先度: 中)

#### Task 5.1: 並列処理テスト実装
**ファイル**: `src/test/parallel-search.test.ts`

**作業内容**:
- 並列/単独での結果一致性テスト
- パフォーマンス回帰テスト
- エラー処理テスト

**検証基準**:
- [ ] 結果の完全一致確認
- [ ] パフォーマンス向上の定量化
- [ ] 長時間実行での安定性確認

### Phase 6: ドキュメントと統合 (優先度: 低)

#### Task 6.1: 並列処理テストページ追加
**ファイル**: `public/test-parallel.html`

**作業内容**:
- 並列処理専用テストページ
- デバッグ情報表示

#### Task 6.2: ドキュメント更新
**ファイル**: `README.md`, `IMPLEMENTATION_STATUS.md`

**作業内容**:
- 並列処理機能の説明追加
- 使用方法ガイド作成
- パフォーマンス情報更新

## リスク管理

### 技術的リスク
1. **メモリ不足**: 複数WebAssemblyインスタンス起動によるメモリ逼迫
   - **対策**: 動的Worker数調整
   
2. **同期オーバーヘッド**: Worker間通信コスト
   - **対策**: バッチ処理、進捗更新頻度最適化
   
3. **WebAssembly制約**: ブラウザ毎の動作差異
   - **対策**: フォールバック機能、互換性テスト

### スケジュールリスク
1. **依存関係**: 基盤実装の遅延が全体に影響
   - **対策**: Phase 1の優先実装、並行作業の最小化
   
2. **テスト不足**: 複雑な並列処理のバグ発見遅延
   - **対策**: 各Phaseでの段階的テスト、自動化推進

## 実装スケジュール

```
Phase 1: 基盤インフラストラクチャ
├── Task 1.1: 型定義
└── Task 1.2: チャンク分割

Phase 2: Worker管理システム
├── Task 2.1: MultiWorkerManager
└── Task 2.2: 並列Worker

Phase 3: 既存システム統合
├── Task 3.1: SearchWorkerManager拡張
└── Task 3.2: 状態管理拡張

Phase 4: UI実装
├── Task 4.1: 制御UI
└── Task 4.2: 進捗可視化

Phase 5: テストと最適化
├── Task 5.1: テスト実装


Phase 6: ドキュメント
├── Task 6.1: テストページ
└── Task 6.2: ドキュメント
```

## 引き継ぎ情報

### 開始前準備
1. 現在のWebWorker実装の理解
2. WebAssembly統合探索の動作確認
3. パフォーマンステスト環境の構築

### 重要な実装ポイント
1. **メモリ管理**: WebAssemblyインスタンスの適切な解放
2. **エラーハンドリング**: Worker障害時のグレースフルフォールバック
3. **進捗集約**: 複数Workerからの進捗の正確な統合

### テスト戦略
1. **段階的検証**: 各Phase完了時の動作確認
2. **回帰防止**: 既存機能への影響ゼロ
3. **パフォーマンス監視**: 各実装段階での性能測定

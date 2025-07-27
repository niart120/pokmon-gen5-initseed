# 並列検索UI統合技術ドキュメント

## 概要
並列検索設定を検索制御ボタンの上位に配置することで、ユーザーの設定フローを最適化した技術実装詳細。

## 設計変更の詳細

### SearchControlCard.tsx の構造変更

#### 変更前のレイアウト
```tsx
<Card>
  <CardContent>
    {/* 検索制御ボタン */}
    <SearchButtons />
    
    <Separator />
    
    {/* 並列検索設定 */}
    <ParallelSettings />
  </CardContent>
</Card>
```

#### 変更後のレイアウト
```tsx
<Card>
  <CardContent>
    {/* 並列検索設定 */}
    <ParallelSettings />
    
    <Separator />
    
    {/* 検索制御ボタン */}
    <SearchButtons />
  </CardContent>
</Card>
```

### コンポーネント構造

#### 並列検索設定エリア
```tsx
{/* 並列検索設定 */}
{isParallelAvailable && (
  <div className="space-y-3">
    {/* チェックボックス: 並列検索有効化 */}
    <div className="flex items-center space-x-2">
      <Checkbox
        id="parallel-search"
        checked={parallelSearchSettings.enabled}
        onCheckedChange={handleParallelModeChange}
        disabled={searchProgress.isRunning}
      />
      <Label htmlFor="parallel-search" className="text-sm font-medium">
        Enable Parallel Search {parallelSearchSettings.enabled ? '(Active)' : '(Experimental)'}
      </Label>
    </div>

    {/* ワーカー数設定: 並列検索有効時のみ表示 */}
    {parallelSearchSettings.enabled && (
      <div className="space-y-2 pl-6">
        <Label className="text-sm">
          Worker Count: {parallelSearchSettings.maxWorkers} / {maxCpuCores}
        </Label>
        <Slider
          value={[parallelSearchSettings.maxWorkers]}
          onValueChange={handleMaxWorkersChange}
          max={maxCpuCores}
          min={1}
          step={1}
          disabled={searchProgress.isRunning}
          className="w-full"
        />
        <p className="text-xs text-muted-foreground">
          More workers = faster search but higher memory usage
        </p>
      </div>
    )}
  </div>
)}
```

#### 検索制御ボタンエリア
```tsx
{/* 検索制御ボタン */}
<div className="flex gap-2">
  {!searchProgress.isRunning ? (
    <Button onClick={handleStartSearch} disabled={targetSeeds.seeds.length === 0}>
      <Play size={16} className="mr-2" />
      Start Search
    </Button>
  ) : (
    <>
      {searchProgress.isPaused ? (
        <Button onClick={handleResumeSearch}>
          <Play size={16} className="mr-2" />
          Resume
        </Button>
      ) : (
        <Button onClick={handlePauseSearch}>
          <Pause size={16} className="mr-2" />
          Pause
        </Button>
      )}
      <Button variant="destructive" onClick={handleStopSearch}>
        <Square size={16} className="mr-2" />
        Stop
      </Button>
    </>
  )}
</div>
```

## UI/UX設計理論

### 1. 設定完了感の向上
**問題**: 並列検索設定が検索ボタンの下にあると、ユーザーが設定の存在に気づかずに検索を開始してしまう可能性

**解決**: 設定を上部に配置することで、検索前に必要な設定を全て確認・完了させる自然なフロー

### 2. 認知的階層の最適化
**F字型読取パターン**に基づく配置:
```
1. 並列検索設定の確認 ← 左上（最初に注目）
2. ワーカー数の調整   ← 左中（詳細設定）
3. 検索ボタンの実行   ← 左下（アクション）
```

### 3. 視覚的グルーピング
関連する設定要素の近接配置:
- 並列検索ON/OFF
- ワーカー数設定
- メモリ使用量警告

これらを一つのセクションとして統合し、検索実行との明確な区別

## 技術実装詳細

### 状態管理の統合

#### Zustand Store Integration
```typescript
interface AppStore {
  // 並列検索設定
  parallelSearchSettings: ParallelSearchSettings;
  setParallelSearchEnabled: (enabled: boolean) => void;
  setMaxWorkers: (count: number) => void;
  
  // 並列検索進捗
  parallelProgress: AggregatedProgress | null;
  setParallelProgress: (progress: AggregatedProgress | null) => void;
}
```

#### 設定同期メカニズム
```typescript
// ワーカー数設定を初期化時に同期
useEffect(() => {
  const workerManager = getSearchWorkerManager();
  workerManager.setMaxWorkers(parallelSearchSettings.maxWorkers);
  workerManager.setParallelMode(parallelSearchSettings.enabled);
}, [parallelSearchSettings.maxWorkers, parallelSearchSettings.enabled]);
```

### イベントハンドリング

#### 並列モード変更
```typescript
const handleParallelModeChange = (enabled: boolean) => {
  if (searchProgress.isRunning) {
    alert('Cannot change parallel mode while search is running.');
    return;
  }
  setParallelSearchEnabled(enabled);
  
  // SearchWorkerManagerにも反映
  const workerManager = getSearchWorkerManager();
  workerManager.setParallelMode(enabled);
  
  console.log(`🔧 Parallel mode changed to: ${enabled ? 'enabled' : 'disabled'}`);
};
```

#### ワーカー数変更
```typescript
const handleMaxWorkersChange = (values: number[]) => {
  if (searchProgress.isRunning) {
    return;
  }
  const newWorkerCount = values[0];
  setMaxWorkers(newWorkerCount);
  
  // SearchWorkerManagerにも反映
  const workerManager = getSearchWorkerManager();
  workerManager.setMaxWorkers(newWorkerCount);
  
  console.log(`🔧 Worker count changed to: ${newWorkerCount}`);
};
```

### パフォーマンス最適化

#### 条件付きレンダリング
```typescript
// 並列検索が利用可能な場合のみ設定表示
const isParallelAvailable = getSearchWorkerManager().isParallelSearchAvailable();

{isParallelAvailable && (
  // 並列検索設定UI
)}
```

#### メモリ効率化
- 設定変更時のみ再レンダリング
- 検索実行中の設定変更防止
- ワーカー数の動的制限

## 関連コンポーネントとの連携

### SearchProgressCard.tsx
```typescript
// 並列検索進捗の表示
const isParallelMode = parallelSearchSettings.enabled && parallelProgress;

{isParallelMode && (
  <Badge variant="outline" className="text-xs">
    {parallelProgress.activeWorkers} Workers Active
  </Badge>
)}
```

### Multi-Worker Manager Integration
```typescript
// 並列検索の実際の実行管理
export class MultiWorkerSearchManager {
  private maxWorkers: number;
  
  public setMaxWorkers(count: number): void {
    if (this.searchRunning) {
      console.warn('⚠️ Cannot change worker count during active search');
      return;
    }
    this.maxWorkers = Math.max(1, Math.min(count, navigator.hardwareConcurrency || 4));
  }
}
```

## CSS/スタイリング

### レスポンシブ対応
```css
/* スマートフォン: 縦積み配置 */
.search-control-card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* デスクトップ: 同様の縦積みだが幅調整 */
@media (min-width: 1024px) {
  .search-control-card {
    max-width: 400px; /* 左パネルの幅制限 */
  }
}
```

### 視覚的階層
```css
/* 並列検索設定エリア */
.parallel-settings {
  padding-left: 1.5rem; /* インデント */
  border-left: 2px solid var(--border-color); /* 視覚的分離 */
}

/* 検索ボタンエリア */
.search-buttons {
  border-top: 1px solid var(--border-color);
  padding-top: 1rem;
}
```

## テストケース

### Unit Tests
```typescript
describe('SearchControlCard並列検索設定', () => {
  it('並列検索設定が検索ボタンの上に表示される', () => {
    render(<SearchControlCard />);
    
    const parallelSettings = screen.getByLabelText(/Enable Parallel Search/);
    const searchButton = screen.getByRole('button', { name: /Start Search/ });
    
    // DOMの順序確認
    expect(parallelSettings.compareDocumentPosition(searchButton))
      .toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });
  
  it('並列検索無効時はワーカー数設定が非表示', () => {
    // テスト実装
  });
});
```

### Integration Tests
```typescript
describe('並列検索設定統合テスト', () => {
  it('設定変更が即座にワーカーマネージャーに反映される', async () => {
    // テスト実装
  });
});
```

## 今後の改善計画

### Phase 2: 高度なUI
1. **設定完了インジケーター**
   - 各設定項目の完了状態表示
   - 検索準備完了の視覚的フィードバック

2. **スマート設定提案**
   - CPU性能に基づく推奨ワーカー数
   - メモリ使用量の予測表示

3. **設定プリセット統合**
   - 並列検索設定を含むプリセット保存
   - ハードウェア別最適設定

### Phase 3: アクセシビリティ強化
1. **キーボードナビゲーション**
2. **スクリーンリーダー対応**
3. **色覚バリアフリー**

## まとめ

この実装により、並列検索設定が自然なワークフローに統合され、ユーザーの設定完了感と操作効率が大幅に向上しました。技術的にも状態管理の一貫性とパフォーマンス最適化を両立した実装となっています。

# VCOUNTデータ構造改修計画

## 概要
ROMパラメータのVCOUNT/Timer0データ構造を辞書型からタプル型に変更し、VCOUNTずれ問題に対応する。

## 新しいデータ構造（案2: タプル型）

### 型定義
```typescript
interface ROMParameters {
  nazo: readonly [number, number, number, number, number];
  // 各要素: [vcount, timer0Min, timer0Max]
  // 通常版: 1要素、VCOUNTずれ版: 複数要素
  vcountTimerRanges: readonly (readonly [number, number, number])[];
}
```

### データ例
```typescript
// 通常版（日本ブラック）
"JPN": {
  nazo: [0x02215F10, 0x0221600C, 0x0221600C, 0x02216058, 0x02216058],
  vcountTimerRanges: [[0x60, 0xC79, 0xC7A]]
}

// VCOUNTずれ版（ドイツBW2）
"GER": {
  nazo: [0x0209AE28, 0x02039D69, 0x021FFF50, 0x021FFFA4, 0x021FFFA4],
  vcountTimerRanges: [
    [0x81, 0x10E5, 0x10E8],
    [0x82, 0x10E9, 0x10EC]
  ]
}
```

## 必要な修正事項

### 1. データファイル修正

#### 1.1 `src/data/rom-parameters.ts`
- **優先度**: 🔴 高
- **内容**: 
  - 全28バージョンのデータ構造を新形式に変更
  - ブログ表の正確な値に修正（現在のデータに多数の不正確な値）
  - `defaultVCount`, `timer0Min`, `timer0Max`, `vcountOffset` → `vcountTimerRanges`に統合

#### 1.2 ブログ表との突合・修正が必要なバージョン
- **B（ブラック）**: 全7地域のnazo値とTimer0範囲
- **W（ホワイト）**: 全7地域のnazo値とTimer0範囲  
- **B2（ブラック2）**: 全7地域、特にGER/ITAのVCOUNTずれ対応
- **W2（ホワイト2）**: 全7地域、特にKOR/ITAのVCOUNTずれ対応

### 2. 型定義修正

#### 2.1 `src/types/pokemon.ts`
- **優先度**: 🔴 高
- **修正内容**: 

```typescript
// 削除する型定義
export interface VCountOffsetRule {
  timer0Min: number;
  timer0Max: number;
  vcountValue: number;
}

// 現在のROMParameters（削除）
export interface ROMParameters {
  nazo: number[];
  defaultVCount: number;
  timer0Min: number;
  timer0Max: number;
  vcountOffset?: VCountOffsetRule[];
}

// 新しいROMParameters（置き換え）
export interface ROMParameters {
  nazo: readonly [number, number, number, number, number];
  // 各要素: [vcount, timer0Min, timer0Max]
  vcountTimerRanges: readonly (readonly [number, number, number])[];
}
```

### 3. データアクセス層修正

#### 3.1 確認済み修正対象ファイル

**🔴 高優先度 - コア機能**
- `src/lib/core/seed-calculator.ts` - ROMパラメータ取得・VCOUNT計算ロジック
- `src/workers/parallel-search-worker.ts` - 並列検索ワーカー
- `src/workers/search-worker.ts` - 検索ワーカー

**🟡 中優先度 - UI・コンポーネント**  
- `src/components/SearchPanel.tsx` - 検索パネル

**🟢 低優先度 - テスト・検証**
- `src/test/calculator-logic.test.ts` - 計算ロジックテスト
- `src/test-utils/verification/search-verification.ts` - 検索検証
- `src/test-utils/verification/wasm-verification.ts` - WebAssembly検証
- `src/test-utils/verification/test-calculator.ts` - テスト用計算機

#### 3.2 データアクセスパターン分析
```typescript
// 現在のアクセスパターン
const params = calculator.getROMParameters(version, region);
params.defaultVCount
params.timer0Min
params.timer0Max
params.vcountOffset // VCOUNTずれ版のみ

// 新しいアクセスパターン（ヘルパー関数経由）
const timer0Range = getTimer0Range(version, region, vcount);
const validVCounts = getValidVCounts(version, region);
```

### 4. ユーティリティ関数作成

#### 4.1 `src/lib/utils/rom-parameter-helpers.ts` (新規作成)
```typescript
// Timer0範囲取得
export function getTimer0Range(version: string, region: string, vcount: number): 
  { min: number; max: number } | null

// 有効VCOUNT値一覧取得  
export function getValidVCounts(version: string, region: string): number[]

// VCOUNT値のバリデーション
export function isValidVCount(version: string, region: string, vcount: number): boolean

// Timer0値からVCOUNT値を逆引き
export function getVCountFromTimer0(version: string, region: string, timer0: number): 
  number | null
```

### 5. テスト修正

#### 5.1 単体テスト
- **ファイル**: `src/test/rom-parameters.test.ts` (新規作成)
- **内容**: 新しいヘルパー関数のテスト、VCOUNTずれケースのテスト

#### 5.2 既存テスト修正
- データ構造変更に伴うテストケース更新
- VCOUNTずれ対応のテストケース追加

### 6. コンポーネント修正

#### 6.1 `src/components/search/Timer0VCountCard.tsx`
- **優先度**: 🟡 中
- **内容**: VCOUNTずれに対応したUI表示・入力バリデーション

#### 6.2 `src/components/search/ROMConfigurationCard.tsx`  
- **優先度**: 🟡 中
- **内容**: ROM選択時のVCOUNT/Timer0範囲表示更新

### 7. 計算エンジン修正

#### 7.1 `src/lib/core/seed-calculator.ts`
- **優先度**: 🔴 高
- **主要修正箇所**:
  - `getROMParameters()` メソッド - 戻り値の構造変更
  - `getVCountForTimer0()` メソッド - VCOUNTずれ対応ロジック
  - `vcountOffset` 処理の削除・置き換え

#### 7.2 Worker修正
- **ファイル**: 
  - `src/workers/parallel-search-worker.ts`
  - `src/workers/search-worker.ts`
- **内容**: getROMParameters使用箇所の修正

## 作業順序

### Phase 1: データ・型定義 (🔴 高優先度)
1. **型定義更新**: `src/types/pokemon.ts` - ROMParametersインターフェース
2. **データ構造変更**: `src/data/rom-parameters.ts` - 全28バージョンの値修正
3. **ヘルパー関数作成**: `src/lib/utils/rom-parameter-helpers.ts` - 新規作成

### Phase 2: コア機能修正 (🔴 高優先度)  
4. **計算エンジン**: `src/lib/core/seed-calculator.ts` - getROMParameters, getVCountForTimer0修正
5. **Worker修正**: `src/workers/*.ts` - 並列・検索ワーカーの対応

### Phase 3: UI・テスト (🟡 中優先度)
6. **UIコンポーネント**: `src/components/SearchPanel.tsx` - パラメータ使用箇所修正
7. **テスト修正**: `src/test/calculator-logic.test.ts` - 計算ロジックテスト更新
8. **検証ツール**: `src/test-utils/verification/*.ts` - 検証ツール修正

### Phase 4: 統合テスト・検証 (🟢 低優先度)
9. 全体動作確認・パフォーマンステスト
10. ドキュメント更新

## 注意事項

### VCOUNTずれ対応バージョン
- **ドイツBW2**: Timer0値により0x81/0x82を使い分け
- **イタリアBW2**: Timer0値により0x82/0x83を使い分け  
- **韓国W2**: 単一のVCOUNT値(0x81)
- **イタリアW2**: Timer0値により0x82/0x83を使い分け

### ブログ表との主要相違点
- Nazo計算式: BW（基準値+オフセット）、BW2（独立値）
- Timer0範囲: 現在のデータに多数の不正確な値
- VCOUNT値: 一部で±1のずれ

### 互換性維持
- WebAssembly側のインターフェースは変更しない
- 外部APIとの互換性を維持
- 既存の検索結果フォーマットは保持

## 完了条件
- [ ] 全28バージョンのデータが正確
- [ ] VCOUNTずれ4バージョンが正常動作  
- [ ] 既存テストが全て通過
- [ ] 新しいテストケースを追加
- [ ] パフォーマンス劣化なし

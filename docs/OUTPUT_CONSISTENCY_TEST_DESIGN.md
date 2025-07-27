# 出力結果整合性確認テスト設計書

## 概要
類似ツールの検索結果と当Webアプリケーションの出力結果の整合性を検証するテストケース設計。

## 提供データ分析

### 検索条件 (setting.txt)
```
MACアドレス: 00 11 22 88 22 77
ROM版本: ブラックJP (Pokemon Black Japanese)
Timer0範囲: c79 - c7a (3193 - 3194)
```

### 検索対象Seed (seedList.txt)
```
14b11ba6
8a30480d
fc4aa3ac
9e02b0ae
adfa2178
```

### 期待結果 (result.txt)
```
2066/06/27 03:02:48, 0xC79, 14B11BA6
2063/11/23 11:39:47, 0xC79, 8A30480D
2072/06/21 13:22:13, 0xC7A, ADFA2178
2073/08/30 03:55:06, 0xC7A, 9E02B0AE
2025/10/18 02:48:49, 0xC7A, FC4AA3AC
2041/05/25 17:17:59, 0xC7A, FC4AA3AC
```
注: 表記は `YYYY/MM/DD HH:MM:SS` 形式

## データマッピング分析

### 現在のアプリケーション構造との対応
- **ROM版本**: `B` (Black) + `JPN` (Japanese) ✅
- **MACアドレス**: `[0x00, 0x11, 0x22, 0x88, 0x22, 0x77]` ✅
- **Timer0**: `0xC79` (3193), `0xC7A` (3194) ✅
- **Hardware**: `DS` (初代DS) ✅ 確定
- **VCount**: `0x60` (96) ✅ 確定
- **キー入力**: `0x2FFF` (キー入力なし) ✅ 確定

### ROM Parameters確認
```typescript
"B": {
  "JPN": {
    "nazo": [0x02215F10, 0x0221600C, 0x0221600C, 0x02216058, 0x02216058],
    "vcountTimerRanges": [[0x60, 0xC79, 0xC7A]]
  }
}
```
- VCount: `0x60` (96)
- Timer0範囲: `0xC79` - `0xC7A` (3193 - 3194) ✅ 一致

## テストケース設計

### TestCase 1: 単一Seed検証 (単体テスト)
**目的**: 個別Seedに対する時刻逆算の正確性確認
**実装方式**: Vitest単体テスト（局所検索範囲）

**検証項目**:
1. Seed `0x14B11BA6` → `2066/06/27 03:02:48`, Timer0=`0xC79`
2. Seed `0x8A30480D` → `2063/11/23 11:39:47`, Timer0=`0xC79`
3. Seed `0x9E02B0AE` → `2073/08/30 03:55:06`, Timer0=`0xC7A`
4. Seed `0xADFA2178` → `2072/06/21 13:22:13`, Timer0=`0xC7A`

**検索範囲最適化**:
```typescript
// 例: Seed 0x14B11BA6 の場合
const localizedRange = {
  startYear: 2066, endYear: 2066,
  startMonth: 6, endMonth: 6,
  startDay: 27, endDay: 27,
  startHour: 3, endHour: 3,
  startMinute: 2, endMinute: 3,  // ±1分の余裕
  startSecond: 0, endSecond: 59
};
```

### TestCase 2: 複数Seed一括検証 (E2Eテスト)
**目的**: WebWorker・WASM統合環境での全Seedの一括検証
**実装方式**: Playwright-MCP + 実アプリケーション検証

**検証対象Seed** (重複Seed除外):
```typescript
const testSeeds = [
  0x14B11BA6, // 2066/06/27 03:02:48, Timer0=0xC79
  0x8A30480D, // 2063/11/23 11:39:47, Timer0=0xC79
  0x9E02B0AE, // 2073/08/30 03:55:06, Timer0=0xC7A
  0xADFA2178, // 2072/06/21 13:22:13, Timer0=0xC7A
  // 0xFC4AA3AC は重複解テストで別途検証
];
```

**Playwright-MCP実行例**:
```javascript
// Target Seedsを設定
await mcp_playwright_browser_type({
  element: "Target Seeds input field",
  ref: "e179",
  text: "0x14B11BA6\n0x8A30480D\n0x9E02B0AE\n0xADFA2178"
});

// 探索実行
await mcp_playwright_browser_click({
  element: "Start Search button",
  ref: "e543"
});

// 結果監視
await mcp_playwright_browser_wait_for({ time: 60 });
await mcp_playwright_browser_snapshot();
```

### TestCase 3: 重複Seed検証 (E2Eテスト)
**目的**: 同一Seedに対する複数解の正しい検出
**実装方式**: Playwright-MCP + 実アプリケーション検証

**検証対象**:
- Seed `0xFC4AA3AC` に対する2つの解
- `2025/10/18 02:48:49` と `2041/05/25 17:17:59`
- 両方とも Timer0=`0xC7A`

**Playwright-MCP実行例**:
```javascript
// 重複Seedを設定
await mcp_playwright_browser_type({
  element: "Target Seeds input field",
  ref: "e179", 
  text: "0xFC4AA3AC"
});

// 日付範囲を広めに設定
await mcp_playwright_browser_type({
  element: "Start Year input",
  ref: "e100",
  text: "2020"
});

await mcp_playwright_browser_type({
  element: "End Year input", 
  ref: "e122",
  text: "2050"
});

// 探索実行・複数解確認
await mcp_playwright_browser_click({
  element: "Start Search button",
  ref: "e543"
});

await mcp_playwright_browser_wait_for({ time: 120 });
await mcp_playwright_browser_snapshot();
```

## 未確定パラメータの推定 → 確定済み

### 確定済みパラメータ
- **Hardware種別**: `DS` (初代DS) ✅
- **VCount値**: `0x60` (96) ✅ ROM parametersと一致
- **キー入力状態**: `0x2FFF` (キー入力なし) ✅

### 残存確認事項
1. **時刻フォーマット変換**: `YYYY/MM/DD HH:MM:SS` ↔ `Date` オブジェクト間の正確な変換
2. **検索範囲**: 2000-2099年の全範囲検索に対応
3. **重複解処理**: 同一Seedに対する複数時刻の正しい検出・表示

## 実装戦略

### Phase 1: 単体テスト環境構築
1. 時刻フォーマット変換ユーティリティ実装 (`src/test-utils/consistency/`)
2. 期待データ定数定義 (`src/test-utils/consistency/test-data.ts`)
3. 局所検索範囲での単一Seed検証テスト

### Phase 2: E2Eテスト環境構築  
1. Playwright-MCP + 実アプリケーション検証スクリプト作成
2. 複数Seed一括検証の自動化
3. 重複Seed検証の自動化

### Phase 3: 統合検証
1. 単体テスト + E2Eテストの組み合わせ検証
2. パフォーマンス測定（E2E）
3. 継続的統合への組み込み

## 実装時の注意事項

### テストコード配置方針
- **単体テスト用ユーティリティ**: `src/test-utils/consistency/`
- **期待データ定数**: `src/test-utils/consistency/test-data.ts`
- **時刻変換ユーティリティ**: `src/test-utils/consistency/time-format.ts`
- **単体テスト**: `src/test/consistency-unit.test.ts`
- **E2Eテスト**: Playwright-MCP + メインアプリケーション (`http://localhost:5173/`)

### Playwright-MCP テスト詳細
**関連ドキュメント**:
- `docs/E2E_TESTING_WITH_PLAYWRIGHT_MCP.md` - 詳細実行手順
- `docs/PLAYWRIGHT_MCP_SCRIPTS.md` - 実行可能スクリプト集

**実行環境**:
- URL: `http://localhost:5173/`
- 実際のプロダクションアプリケーション使用
- 32並列Worker + WebAssembly統合環境

### 時刻フォーマット変換の実装
```typescript
// src/test-utils/consistency/time-format.ts
export function parseExpectedDateTime(dateStr: string): Date {
  // "2066/06/27 03:02:48" → Date
  const [datePart, timePart] = dateStr.split(' ');
  const [year, month, day] = datePart.split('/').map(Number);
  const [hour, minute, second] = timePart.split(':').map(Number);
  return new Date(year, month - 1, day, hour, minute, second);
}

export function formatDateTime(date: Date): string {
  // Date → "2066/06/27 03:02:48"
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  const second = String(date.getSeconds()).padStart(2, '0');
  return `${year}/${month}/${day} ${hour}:${minute}:${second}`;
}
```

### 期待データ定数の実装
```typescript
// src/test-utils/consistency/test-data.ts
export const CONSISTENCY_TEST_CONDITIONS = {
  romVersion: 'B' as const,
  romRegion: 'JPN' as const,
  hardware: 'DS' as const,
  macAddress: [0x00, 0x11, 0x22, 0x88, 0x22, 0x77],
  keyInput: 0x2FFF,
  timer0Range: { min: 3193, max: 3194, useAutoRange: false },
  vcountRange: { min: 96, max: 96, useAutoRange: false }
} as const;

export const UNIT_TEST_CASES = [
  { 
    seed: 0x14B11BA6, 
    expectedDatetime: '2066/06/27 03:02:48', 
    expectedTimer0: 0xC79,
    localRange: { year: 2066, month: 6, day: 27, hour: 3, minute: 2 }
  },
  // 他のテストケース...
] as const;

export const E2E_TEST_SEEDS = [
  0x14B11BA6, 0x8A30480D, 0x9E02B0AE, 0xADFA2178
] as const;

export const DUPLICATE_SEED_TEST = {
  seed: 0xFC4AA3AC,
  expectedResults: [
    { datetime: '2025/10/18 02:48:49', timer0: 0xC7A },
    { datetime: '2041/05/25 17:17:59', timer0: 0xC7A }
  ]
} as const;
```

## 成功基準

### 単体テスト成功基準
1. 各個別Seedに対して期待時刻が正確に算出される
2. Timer0値が期待値と完全一致する
3. 局所検索範囲内での効率的な検索実行
4. **誤差許容なし**: 期待結果と完全一致すること

### E2Eテスト成功基準
1. 複数Seed一括検索で全期待結果が検出される
2. 重複Seedの複数解が正しく検出・表示される
3. 実アプリUI上での正常動作確認
4. WebWorker・WASM統合環境での正確性確認

### 許容条件
1. 単体テスト実行時間: 局所範囲検索により数秒以内
2. E2Eテスト実行時間: 全範囲検索のため数分〜数十分は許容

## 次ステップ
1. 単体テスト用ユーティリティとデータ定数の実装
2. 局所検索範囲での単体テスト実装
3. Playwright-MCP E2Eテストスクリプト作成
4. 継続的統合への組み込み

## 実装方針まとめ

### 単体テスト (Phase 1)
- **対象**: 個別Seed検証（重複除く4つ）
- **範囲**: 局所検索（期待時刻周辺の狭い範囲）
- **実装**: Vitest + 専用ユーティリティ
- **利点**: 高速実行、詳細検証、デバッグ容易

### E2Eテスト (Phase 2)
- **対象**: 複数Seed一括検証 + 重複Seed検証
- **範囲**: 2000-2099年全範囲
- **実装**: Playwright-MCP + 実アプリ
- **利点**: 実運用環境での統合検証

### 技術的課題の解決
1. **検索範囲問題**: 単体テストで局所化、E2Eで全範囲
2. **計算量問題**: WebWorker・WASM最適化をE2Eで検証
3. **複雑性問題**: テストレベル分離により段階的検証
4. **配置問題**: 専用ディレクトリ構造で整理

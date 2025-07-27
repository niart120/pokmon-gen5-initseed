# 整合性確認 E2E テスト実行ガイド

## 概要
Playwright-MCPを使用して類似ツール結果との整合性を確認するE2Eテストの実行手順です。

**注意**: このドキュメントは`E2E_TESTING_WITH_PLAYWRIGHT_MCP.md`に統合・更新されています。最新の手順はそちらを参照してください。

## 移行完了

従来のJavaScriptベーステストページ（`test-consistency-e2e.html`）は削除され、Playwright-MCPによる自動化テストに移行しました。

### 新しいテスト手順

詳細は以下のドキュメントを参照：
- [E2Eテスト実行手順](E2E_TESTING_WITH_PLAYWRIGHT_MCP.md) - メインドキュメント
- [Playwright-MCPスクリプト集](PLAYWRIGHT_MCP_SCRIPTS.md) - 実行スクリプト

## 対象テストケース

Playwright-MCPで以下のテストが実行可能：

### Test Case 2: 複数Seed一括検証 ✅ 移行完了
- **対象**: 4つのSeed（重複除外）
- **検証範囲**: 2000-2099年
- **期待結果**: 
  - `0x14B11BA6` → `2066/06/27 03:02:48`, Timer0=`0xC79`
  - `0x8A30480D` → `2063/11/23 11:39:47`, Timer0=`0xC79`
  - `0x9E02B0AE` → `2073/08/30 03:55:06`, Timer0=`0xC7A`
  - `0xADFA2178` → `2072/06/21 13:22:13`, Timer0=`0xC7A`

### Test Case 3: 重複Seed検証 ✅ 移行完了
- **対象**: Seed `0xFC4AA3AC`
- **期待結果**: 2つの解
  - `2025/10/18 02:48:49`, Timer0=`0xC7A`
  - `2041/05/25 17:17:59`, Timer0=`0xC7A`

## Playwright-MCP実行例

```javascript
// 特定Seed検証テスト
await mcp_playwright_browser_navigate({ 
  url: "http://localhost:5173/" 
});

// Target Seedsを設定
await mcp_playwright_browser_type({
  element: "Target Seeds input field",
  ref: "e179",
  text: "0x14B11BA6"
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

## 成功基準

### E2Eテスト成功基準
1. ✅ 複数Seed一括検索で全期待結果検出
2. ✅ 重複Seedの複数解正しく検出・表示
3. ✅ 実アプリUI上での正常動作確認
4. ✅ WebWorker・WASM統合環境での正確性確認

### 許容条件
- **実行時間**: 数分〜数十分（全範囲検索のため）
- **誤差許容**: なし（期待結果と完全一致必須）

## 出力ファイル

### ログ・レポート
- `test-logs/e2e-test-report-[timestamp].json` - JSON形式の詳細レポート
- `test-logs/e2e-test-report-[timestamp].txt` - テキスト形式のレポート

### スクリーンショット
- `test-screenshots/bulk-test-result.png` - 複数Seed検証結果
- `test-screenshots/duplicate-test-result.png` - 重複Seed検証結果

## トラブルシューティング

### よくある問題

#### 1. 開発サーバーが起動していない
```
❌ 開発サーバーが起動していません
```
**解決方法**: 別ターミナルで `npm run dev` を実行

#### 2. WebAssemblyビルドエラー
```
❌ WebAssemblyファイルが見つかりません
```
**解決方法**: `npm run build` を実行してWebAssemblyをビルド

## 実行結果の確認

Playwright-MCPでは以下の方法で結果を確認できます：

### スナップショット確認
```javascript
// 探索結果のスナップショット取得
await mcp_playwright_browser_snapshot();
```

### コンソールログ監視
```javascript
// WebAssembly初期化・探索ログの確認
const messages = await mcp_playwright_browser_console_messages();
console.log("Search logs:", messages);
```

### スクリーンショット取得
```javascript
// 結果画面のスクリーンショット
await mcp_playwright_browser_take_screenshot({
  filename: "consistency-test-result.png",
  fullPage: true
});
```

## トラブルシューティング

### よくある問題

#### 1. 開発サーバーが起動していない
```bash
npm run dev
```

#### 2. WebAssemblyビルドエラー
```bash
npm run build:wasm
```

#### 3. Playwright-MCP接続エラー
Playwright-MCPが有効であることを確認してください。

### デバッグ手順
1. メインアプリケーション（http://localhost:5173/）で手動実行
2. ブラウザ開発者ツールでコンソールログ確認
3. Playwright-MCPでスクリーンショット取得
4. 詳細ログ分析

## 関連ファイル

### テストドキュメント
- `docs/E2E_TESTING_WITH_PLAYWRIGHT_MCP.md` - メインE2Eテストドキュメント
- `docs/PLAYWRIGHT_MCP_SCRIPTS.md` - Playwright-MCPスクリプト集
- `docs/OUTPUT_CONSISTENCY_TEST_DESIGN.md` - テスト設計書

### アプリケーション
- `http://localhost:5173/` - メインアプリケーション
- `public/test-development.html` - 開発テストページ
- `public/test-integration.html` - 統合テストページ

## 移行済み機能

### ❌ 削除された資材
- `public/test-consistency-e2e.html` - Playwright-MCPで代替
- `public/test-parallel.html` - Playwright-MCPで代替
- `scripts/run-e2e-consistency-test.js` - Playwright-MCPで代替

### ✅ 新しいテスト環境
- Playwright-MCP自動化テスト
- リアルタイム進捗監視
- 自動スクリーンショット取得
- エラー詳細レポート

詳細な実行手順は `E2E_TESTING_WITH_PLAYWRIGHT_MCP.md` を参照してください。

# 整合性確認 E2E テスト実行ガイド

## 概要
Playwright-MCPを使用して類似ツール結果との整合性を確認するE2Eテストの実行手順です。

## 前提条件

### 1. 開発環境セットアップ
```bash
# 依存関係インストール
npm install

# WebAssemblyビルド
npm run build
```

### 2. 開発サーバー起動
```bash
# 開発サーバーを起動（別ターミナル）
npm run dev
```
開発サーバーが `http://localhost:5173` で起動することを確認してください。

## テスト実行

### 手動テスト実行
1. ブラウザで以下のURLにアクセス
   ```
   http://localhost:5173/test-consistency-e2e.html
   ```

2. テストページで以下を実行
   - **Test Case 2**: 複数Seed一括検証
   - **Test Case 3**: 重複Seed検証
   - **統合検証**: 全テスト実行

### 自動化テスト実行（Playwright-MCP）

#### 基本実行
```bash
# E2Eテスト実行
npm run test:e2e:consistency
```

#### カスタムオプション
```bash
# タイムアウト設定（デフォルト: 10分）
node scripts/run-e2e-consistency-test.js --timeout 900000

# リトライ回数設定（デフォルト: 3回）
node scripts/run-e2e-consistency-test.js --retries 5

# ヘルプ表示
npm run test:e2e:help
```

## テスト内容

### Test Case 2: 複数Seed一括検証
- **対象**: 4つのSeed（重複除外）
- **検証範囲**: 2000-2099年
- **期待結果**: 
  - `0x14B11BA6` → `2066/06/27 03:02:48`, Timer0=`0xC79`
  - `0x8A30480D` → `2063/11/23 11:39:47`, Timer0=`0xC79`
  - `0x9E02B0AE` → `2073/08/30 03:55:06`, Timer0=`0xC7A`
  - `0xADFA2178` → `2072/06/21 13:22:13`, Timer0=`0xC7A`

### Test Case 3: 重複Seed検証
- **対象**: Seed `0xFC4AA3AC`
- **期待結果**: 2つの解
  - `2025/10/18 02:48:49`, Timer0=`0xC7A`
  - `2041/05/25 17:17:59`, Timer0=`0xC7A`

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

#### 3. テストタイムアウト
```
❌ テストタイムアウト
```
**解決方法**: `--timeout` オプションでタイムアウト時間を延長

### デバッグ手順
1. 手動テストで問題個所を特定
2. ブラウザ開発者ツールでログ確認
3. スクリーンショットで状態確認
4. レポートファイルで詳細分析

## Playwright-MCP 実装詳細

### ブラウザ操作シーケンス
1. テストページナビゲーション
2. WebAssembly初期化待機
3. テストボタンクリック
4. 実行完了待機
5. 結果抽出・検証
6. スクリーンショット撮影

### セレクタ一覧
- `#integrated-status` - WebAssembly初期化ステータス
- `#run-bulk-test` - 複数Seed検証ボタン
- `#bulk-status` - 複数Seed検証ステータス
- `#bulk-results .result-item` - 複数Seed検証結果
- `#run-duplicate-test` - 重複Seed検証ボタン
- `#duplicate-status` - 重複Seed検証ステータス
- `#duplicate-results .result-item` - 重複Seed検証結果

## 継続的統合

### CI/CD統合
```yaml
# .github/workflows/e2e-consistency.yml
name: E2E Consistency Test

on:
  push:
    branches: [ main, feature/output-consistency-verification ]
  pull_request:
    branches: [ main ]

jobs:
  e2e-consistency:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run build
      - run: npm run dev &
      - run: sleep 10
      - run: npm run test:e2e:consistency
```

### ローカル開発ワークフロー
1. 機能実装
2. 単体テスト実行 (`npm run test:run`)
3. E2Eテスト実行 (`npm run test:e2e:consistency`)
4. 結果確認・デバッグ
5. コミット・プッシュ

## 関連ファイル

### テストファイル
- `public/test-consistency-e2e.html` - E2Eテストページ
- `src/test-utils/consistency/e2e-test-script.js` - テストスクリプト
- `scripts/run-e2e-consistency-test.js` - 自動化実行スクリプト

### データ・ユーティリティ
- `src/test-utils/consistency/test-data.ts` - テストデータ定数
- `src/test-utils/consistency/time-format.ts` - 時刻フォーマット変換
- `src/test-utils/consistency/debug-utils.ts` - デバッグユーティリティ

### 設計文書
- `docs/OUTPUT_CONSISTENCY_TEST_DESIGN.md` - テスト設計書

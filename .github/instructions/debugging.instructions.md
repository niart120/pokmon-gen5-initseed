---
applyTo: "**"
---

# デバッグ・問題解決ガイド

## 基本デバッグ手順
1. ブラウザ開発者ツール (F12) でConsole/Networkタブ確認
2. `search-verification.ts`の詳細ログ確認
3. Rust側ログ (`console_log!`) 確認

## よくある問題
### WebAssembly読み込み失敗
```bash
npm run build:wasm
npm run build:copy-wasm
```

### 計算結果の不整合
1. `verifySearchImplementation()`実行
2. 参照実装との差分確認
3. `cargo test`でRust側確認

### パフォーマンス劣化
- `http://localhost:5174/test-performance.html`でテスト
- メモリリーク検査（Memory tab）

### UI表示・操作問題
- mcp-playwright: ブラウザ自動化によるUI動作確認
- スクリーンショット・要素検証による問題特定

## 緊急時リセット
```bash
npm run clean && npm run build
```

---
applyTo: "**/*.test.{ts,js}"
---

# テスト実行ガイド

## テスト環境
- Vitest使用
- WebAssemblyローダー: `initWasmForTesting`
- Node.js環境での実行

## 必須テストカテゴリ
1. **Rust側Unit Test**: `cargo test`
2. **TypeScript側Unit Test**: `npm run test:run`
3. **WebAssembly統合テスト**: `wasm-integration.test.ts`
4. **ブラウザ環境テスト**: `http://localhost:5174/test-performance.html`
5. **E2Eテスト**: mcp-playwright使用可能

## 品質維持
- 変更後は必ず `verifySearchImplementation()` 実行
- パフォーマンステストで性能確認
- 計算精度の検証必須

## E2Eテスト・ブラウザ自動化
- **mcp-playwright**: ブラウザ操作・スクリーンショット・UI検証に利用可能
- フロントエンドの動作確認・UI regression テストに活用
- パフォーマンステストページの自動実行にも対応

---
applyTo: "**/*.test.{ts,js}"
---

# テスト実行ガイド

## 新テストアーキテクチャ

### 開発テスト環境
- **開発テストページ**: `public/test-development.html`
  - ProductionPerformanceMonitor テスト
  - DevelopmentPerformanceAnalyzer テスト
  - WebAssembly統合テスト
  - メッセージ生成プロファイリング
  - スケーラビリティ分析
  - ボトルネック分析

### 統合テスト環境
- **統合テストページ**: `public/test-integration.html`
  - システム全体の統合テスト
  - WebAssembly読み込みテスト
  - 検索エンジン統合テスト
  - パフォーマンス監視統合テスト
  - データパイプライン統合テスト
  - エンドツーエンドワークフローテスト

## テスト環境
- Vitest使用
- WebAssemblyローダー: `initWasmForTesting`
- Node.js環境での実行

## 必須テストカテゴリ
1. **Rust側Unit Test**: `cargo test`
2. **TypeScript側Unit Test**: `npm run test:run`
3. **WebAssembly統合テスト**: `wasm-integration.test.ts`
4. **開発環境テスト**: `http://localhost:5173/test-development.html`
5. **統合テスト**: `http://localhost:5173/test-integration.html`
6. **E2Eテスト**: mcp-playwright使用可能

## パフォーマンス監視システム

### 本番用監視 (`src/lib/core/performance-monitor.ts`)
- リアルタイム測定機能
- 基本メトリクス (計算速度、メモリ、進捗)
- 軽量設計・本番環境最適化

### 開発用分析 (`src/test-utils/profiling/development-analyzer.ts`)
- 詳細パフォーマンス分析
- メッセージ生成プロファイリング
- スケーラビリティ測定
- 推奨事項生成

## 品質維持
- 変更後は必ず `verifySearchImplementation()` 実行
- 新テストページでパフォーマンス確認
- 計算精度の検証必須
- 本番・開発コードの適切な分離確認

## E2Eテスト・ブラウザ自動化
- **mcp-playwright**: ブラウザ操作・スクリーンショット・UI検証に利用可能
- フロントエンドの動作確認・UI regression テストに活用
- 新テストページの自動実行にも対応
- WebAssembly統合テストの自動化

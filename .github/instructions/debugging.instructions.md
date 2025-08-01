---
applyTo: "**"
---

# デバッグ・問題解決ガイド

## 基本デバッグ手順
1. ブラウザ開発者ツール (F12) でConsole/Networkタブ確認
2. `search-verification.ts`の詳細ログ確認
3. Rust側ログ (`console_log!`) 確認

## 新テストシステムでのデバッグ

### 開発テスト (`test-development.html`)
```bash
# Agent/E2Eテスト用軽量モード（詳細ログ無効化）
npm run dev:agent

# ブラウザで開発テスト実行
# http://localhost:5173/test-development.html
# → Individual test buttons で詳細確認
```

### 統合テスト (`test-integration.html`)  
```bash
# 統合テスト実行
# http://localhost:5173/test-integration.html
# → Run All Integration Tests で包括テスト
```

### SIMD機能テスト (`test-simd.html`)
```bash
# SIMD最適化テスト実行
# http://localhost:5173/test-simd.html
# → SIMD vs 通常実装のパフォーマンス比較
```

## パフォーマンス分析

### 本番パフォーマンス監視
```typescript
// 軽量監視 (本番環境)
import { ProductionPerformanceMonitor } from '@/lib/core/performance-monitor';
const monitor = new ProductionPerformanceMonitor();
monitor.startMeasurement();
```

### 開発詳細分析
```typescript
// 詳細分析 (開発環境)
import { DevelopmentPerformanceAnalyzer } from '@/test-utils/profiling/development-analyzer';
const analyzer = new DevelopmentPerformanceAnalyzer();
await analyzer.measureBasicPerformance(10000);
```

## Agent/E2Eテスト専用デバッグ

### Context圧迫回避
```bash
# 軽量モードでサーバー起動（ログ出力最小化）
npm run dev:agent

# 詳細ログが必要な場合のみ通常モード
npm run dev
```

### ログ出力制御
- `npm run dev:agent`: 検証ログを最小限に抑制（Context保護）
- `npm run dev`: 完全な検証ログ出力（開発・デバッグ用）

### Playwright-MCP使用時の推奨事項
1. 基本動作確認は軽量モードで実行
2. 問題発生時のみ詳細モードに切り替え
3. Context使用量監視（50,000文字で警告）

## よくある問題

### WebAssembly読み込み失敗
```bash
npm run build
```

### 計算結果の不整合
1. `verifySearchImplementation()`実行
2. 参照実装との差分確認
3. `npm run test:rust`でRust側確認
4. `npm run test:rust:browser`でブラウザ環境確認
5. `IntegratedSeedSearcher.search_seeds_integrated_simd`動作確認

### パフォーマンス劣化
- `test-development.html`でパフォーマンステスト
- `test-simd.html`でSIMD最適化効果確認
- DevelopmentPerformanceAnalyzerでボトルネック分析
- メモリリーク検査（Memory tab）

### UI表示・操作問題
- mcp-playwright: ブラウザ自動化によるUI動作確認
- スクリーンショット・要素検証による問題特定
- 新テストページでの自動操作テスト

### アーキテクチャ問題
- 本番コードとテストコードの依存関係確認
- 循環依存の検出・解決
- 適切な責任分離の維持

## 緊急時リセット
```bash
npm run clean && npm run build
```

## デバッグツール活用
- **本番監視**: リアルタイム性能測定
- **開発分析**: 詳細プロファイリング・推奨事項
- **統合テスト**: システム全体の動作確認
- **SIMD機能テスト**: SIMD最適化の性能検証
- **ブラウザ自動化**: UI regression テスト

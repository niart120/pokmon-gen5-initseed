---
applyTo: "src/**/*.{ts,tsx}"
---

# 開発ベストプラクティス

## 機能追加・変更時の原則

### 既存アーキテクチャの活用
```typescript
// ✅ 推奨: 直接WebAssemblyまたはTypeScriptフォールバック
import { SeedCalculator } from '@/lib/core/seed-calculator';
import { useAppStore } from '@/store/app-store';

// ✅ 本番用パフォーマンス監視
import { ProductionPerformanceMonitor } from '@/lib/core/performance-monitor';

// ✅ 開発用詳細分析（開発環境のみ）
import { DevelopmentPerformanceAnalyzer } from '@/test-utils/profiling/development-analyzer';
```

### アーキテクチャ分離の原則
- **本番コード**: `src/lib/core/` - 軽量・高速・本番最適化
- **開発ツール**: `src/test-utils/` - 詳細分析・デバッグ支援
- **循環依存禁止**: 本番コードは開発ツールに依存させない

### 禁止事項
- コア計算処理の新規TypeScript実装（WebAssembly使用必須）
- 既存の検証システムの無効化
- 本番コードから`src/test-utils/`への依存
- テストコードから本番状態への影響

## 計算エンジン構造
- **最高性能**: WebAssembly `IntegratedSeedSearcher` (事前計算テーブル活用)
- **フォールバック**: TypeScript `SeedCalculator` (WebAssembly失敗時)
- 中間レイヤーは避け、直接利用を推奨

## WebAssembly統合
- 高性能計算処理はWebAssemblyを活用
- TypeScript側はUI・状態管理に専念

## コード品質維持
- TypeScript strict mode準拠
- ESLint/Prettier設定準拠
- 既存のコメント・ドキュメント保持

## ドキュメント品質
- 技術文書は簡潔・客観的に記述
- 不要な装飾表現は避ける

---
applyTo: "src/**/*.{ts,tsx}"
---

# 開発ベストプラクティス

## 機能追加・変更時の原則

### 既存アーキテクチャの活用
```typescript
// ✅ 推奨: 既存の統合システムを活用
import { integratedSearchManager } from '@/lib/integrated-search-manager';
import { useAppStore } from '@/store/app-store';
```

### 禁止事項
- コア計算処理の新規TypeScript実装（WebAssembly使用必須）
- 既存の検証システムの無効化

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

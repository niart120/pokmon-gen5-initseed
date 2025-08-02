# ポケモン生成機能 実装仕様書 - 目次

## 実装ドキュメント構成


# 実装仕様ドキュメント


### 📁 `/spec/implementation/`

1. **[01-architecture.md](./01-architecture.md)** - アーキテクチャ設計
   - 全体構成設計
   - WASM-TypeScript データインターフェース
   - モジュール設計と責任分離
   - データフロー設計

2. **[02-algorithms.md](./02-algorithms.md)** - 核心アルゴリズム実装
   - 性格値乱数列エンジン（WASM実装）
   - 遭遇計算エンジン（WASM実装）
   - 統合Pokemon Generator（WASM実装）
   - 性格値・色違い判定の詳細実装

3. **[03-data-management.md](./03-data-management.md)** - データ管理実装
   - Generation Data Manager（TypeScript側）
   - 種族データ・遭遇テーブル・特性データ管理
   - データ整合性チェック
   - ゲーム定数管理

4. **[04-implementation-phases.md](./04-implementation-phases.md)** - 実装フェーズ
   - Phase 1: WASM Core Engine（3週間）
   - Phase 2: TypeScript Integration（2週間）
   - Phase 3: UI Components（2週間）
   - Phase 4: WebWorker & Performance（1週間）
   - Phase 5: Polish & Validation（1週間）

5. オフセット計算仕様（BW/BW2）

   - 05-offset-calculation.md：BW/BW2のオフセット計算全体仕様・用語・ロジック・検証方法
   - 05-offset-calculation-detailed.md：実装仕様詳細（手順・アルゴリズム・疑似コード）

 仕様詳細・ロジックは親ファイルから参照リンクあり

## 関連ドキュメント

- **[pokemon-generation-feature-spec.md](../pokemon-generation-feature-spec.md)** - 機能仕様書
- **[pokemon-data-specification.md](../pokemon-data-specification.md)** - データ仕様書
- **[pokemon-generation-ui-spec.md](../pokemon-generation-ui-spec.md)** - UI仕様書

## 実装時の注意事項

1. **WASM中心アーキテクチャ**: 全ての計算ロジックはWASM側で実装し、TypeScript側はフォールバック実装を行わない
2. **64bit LCG正確性**: BW/BW2の正確な64bit線形合同法の実装が最優先
3. **遭遇タイプ別実装**: 野生・固定シンボル・徘徊の各パターンを正確に再現
4. **段階的実装**: Phase 1（WASM Core）完了後にPhase 2以降を開始

---

**作成日**: 2025年8月3日  
**バージョン**: 1.0  
**作成者**: GitHub Copilot

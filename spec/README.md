src/
├── components/generation/     # React UI Components
├── lib/generation/           # Core Generation Logic
├── data/generation/          # Pokemon & Encounter Data
├── types/generation.ts       # TypeScript Type Definitions
├── store/generation-store.ts # State Management
└── workers/pokemon-generation-worker.ts # Background Processing

# ポケモン生成機能 仕様書 - 目次

## 仕様書ファイル一覧

### 1. [機能仕様書](./pokemon-generation-feature-spec.md)
- 機能概要・要件・UI設計・技術仕様

### 2. [データ仕様書](./pokemon-data-specification.md)
- ポケモン種族データ・遭遇テーブル・固定シンボル・性格・特性・乱数テーブル・データ管理

### 3. [UI仕様書](./pokemon-generation-ui-spec.md)
- 画面構成・入力/出力エリア・インタラクション・アクセシビリティ

### 4. [実装仕様書（分割）](./implementation/README.md)
- 01-architecture.md: アーキテクチャ設計・データフロー
- 02-algorithms.md: 核心アルゴリズム・RNG・遭遇計算・WASM連携
- 03-data-management.md: データ管理・整合性チェック・ゲーム定数
- 04-implementation-phases.md: 実装フェーズ・開発計画

## 技術スタック・アーキテクチャ概要
- フロントエンド: React 18 + TypeScript + Vite
- 計算エンジン: Rust + WebAssembly (SIMD最適化)
- 状態管理: Zustand
- UI: Radix UI + TailwindCSS
- バックグラウンド: Web Workers

## 実装計画（概要）
- Phase 1: WASM Core Engine
- Phase 2: TypeScript Integration
- Phase 3: UI Components
- Phase 4: WebWorker & Performance
- Phase 5: Polish & Validation

## 関連・統合
- 既存Seed探索機能との連携
- 共通インフラ（WASM, Web Workers, Zustand, データ管理）

---

**作成日**: 2025年8月3日  
**バージョン**: 1.0  
**作成者**: GitHub Copilot

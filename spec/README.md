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

## 実装済みWebAssemblyサービス

### コア計算エンジン（wasm-pkg/src/）

#### `PersonalityRNG` (personality_rng.rs)
BW/BW2仕様64bit線形合同法乱数生成器
- BW線形合同法: `S[n+1] = S[n] * 0x5D588B656C078965 + 0x269EC3`
- 32bit乱数値取得（上位32bit使用）
- シンクロ判定、性格決定、遭遇スロット計算

#### `EncounterCalculator` (encounter_calculator.rs)  
遭遇スロット計算エンジン
- BW/BW2別計算式対応
- 8種エンカウントタイプ（通常・なみのり・釣り・特殊4種）
- 確率分布: 12スロット通常、5スロット釣り等

#### `OffsetCalculator` (offset_calculator.rs)
ゲーム初期化処理とオフセット計算
- 8種ゲームモード対応（新規・続き・思い出リンク等）
- TID/SID決定処理
- Probability Table操作
- ブラックシティ/ホワイトフォレスト住人決定

#### `PIDCalculator` & `ShinyChecker` (pid_shiny_checker.rs)
PID生成と色違い判定システム
- 野生・固定・徘徊別PID生成
- 色違い判定: `(TID ^ SID ^ PID_high ^ PID_low) < 8`
- 色違いタイプ判定（正方形・星型）

#### `PokemonGenerator` (pokemon_generator.rs)
統合ポケモン生成エンジン
- `RawPokemonData`構造体による完全なポケモン情報生成
- バッチ処理対応
- エンカウントタイプ別処理分岐

#### `IntegratedSeedSearcher` (integrated_search.rs)
統合シード探索API（メインエントリーポイント）
- SIMD128最適化による高速SHA-1計算
- 事前計算テーブル活用
- 並列処理対応

## 実装計画（概要）
- Phase 1: WASM Core Engine ✅ **完了**
- Phase 2: TypeScript Integration ✅ **完了**  
- Phase 3: UI Components
- Phase 4: WebWorker & Performance
- Phase 5: Polish & Validation

## テスト・検証環境

### 実装検証
```bash
# WASM単体テスト（95テスト以上）
npm run test:rust

# WASM統合テスト（ブラウザ環境）
npm run test:rust:browser

# TypeScript統合テスト
npm run test

# 全テスト実行
npm run test:all
```

### 開発テストページ
```bash
npm run dev:agent  # 軽量モード起動

# ブラウザで以下にアクセス:
# http://localhost:5173/test-development.html - 個別機能テスト
# http://localhost:5173/test-integration.html - システム統合テスト  
# http://localhost:5173/test-parallel.html - 並列処理テスト
```

## データソース・実装基準

### WASM実装を正とする原則
計算精度・アルゴリズム仕様においてはWebAssembly（Rust）実装を正として扱います：
- 乱数生成アルゴリズム（PersonalityRNG）
- 遭遇確率計算（EncounterCalculator）  
- PID生成・色違い判定（PIDCalculator, ShinyChecker）
- オフセット計算（OffsetCalculator）

### エンカウントデータソース
- **Bulbapedia**: https://bulbapedia.bulbagarden.net/ (BW/BW2エンカウント情報)
- **Serebii.net**: https://serebii.net/ (固定シンボル・配布情報)
- **ポケモン公式**: 種族値・タイプ・特性データ
- **コミュニティ解析**: BW/BW2乱数アルゴリズム仕様

*取得日: 2025年1月（実装時点）*

## 関連・統合
- 既存Seed探索機能との連携
- 共通インフラ（WASM, Web Workers, Zustand, データ管理）

---

**作成日**: 2025年8月3日  
**バージョン**: 1.0  
**作成者**: GitHub Copilot

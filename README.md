# ポケモンBW/BW2 初期Seed探索webアプリ

第5世代ポケモン（ブラック・ホワイト/ブラック2・ホワイト2）の初期Seed値探索・検証を行うwebアプリケーションです。

**🌐 アプリを使用する: https://niart120.github.io/pokemon-gen5-initseed/**

## 概要

このアプリケーションは、ポケモンBW/BW2における初期Seed値の効率的な探索を実現します。ROMバージョン、リージョン、ハードウェア、日時、キー入力といった条件から生成されるメッセージをSHA-1ハッシュ化し、その上位32bitを初期Seedとして算出します。

## 主な機能

- **全28バージョン対応**: BW/BW2の全バージョン・リージョン組み合わせをサポート
- **超高速探索**: WebAssembly SIMD128 + Rust による最適化で2.7億回/秒を実現
- **並列処理**: CPU数に応じたWebWorker並列化による高速化（実験的機能）
- **リアルタイム進捗**: 探索状況の詳細表示と中断・再開機能
- **結果管理**: ソート・フィルタリング・詳細表示機能
- **エクスポート**: CSV/JSON/テキスト形式での結果出力
- **包括的テスト環境**: Playwright-MCP によるE2Eテスト自動化、開発・統合テストページによる品質保証

## 技術スタック

- **フロントエンド**: React 18 + TypeScript + Vite
- **UI**: Radix UI (shadcn/ui) + TailwindCSS
- **計算エンジン**: Rust + WebAssembly (wasm-pack) + SIMD128最適化
- **状態管理**: Zustand
- **バックグラウンド処理**: Web Workers + 並列処理対応
- **パフォーマンス監視**: 本番用軽量監視 + 開発用詳細分析

### WebAssembly計算エンジン（WASM実装を正とする）

本アプリケーションの計算処理は以下のRust WebAssemblyモジュールで実装されています：

- **IntegratedSeedSearcher**: 統合シード探索API（メイン検索エンジン）
- **PersonalityRNG**: BW/BW2仕様64bit線形合同法乱数生成器
- **EncounterCalculator**: 遭遇スロット計算エンジン（BW/BW2別対応）
- **OffsetCalculator**: ゲーム初期化処理とオフセット計算
- **PIDCalculator & ShinyChecker**: PID生成と色違い判定
- **PokemonGenerator**: 統合ポケモン生成エンジン

**注記**: 計算精度と仕様の正確性についてはWebAssembly（Rust）実装を正として扱います。TypeScript実装との乖離が生じた場合は、WASM実装に従います。

## 開発・ビルド・テスト

### 基本コマンド

```bash
# 依存関係のインストール
npm install

# 開発サーバー起動
npm run dev

# 開発サーバー起動（軽量モード・E2Eテスト用）
npm run dev:agent

# WebAssemblyビルド
npm run build:wasm

# プロダクションビルド
npm run build

# GitHub Pagesデプロイ
npm run deploy
```

### テスト・検証手順

#### 基本テスト実行

```bash
# TypeScriptテスト実行
npm run test

# Rustテスト実行（WASM単体）
npm run test:rust

# Rustブラウザテスト実行（WASM統合）
npm run test:rust:browser

# 全テスト実行（推奨）
npm run test:all
```

#### 開発・検証用テストページ

テストページでの詳細な動作確認・パフォーマンス測定：

```bash
# 開発サーバー起動後、ブラウザで以下にアクセス

# 開発テスト（個別機能・パフォーマンステスト）
http://localhost:5173/test-development.html

# 統合テスト（システム全体・ワークフローテスト）  
http://localhost:5173/test-integration.html

# 並列処理テスト（WebWorker・並列処理検証）
http://localhost:5173/test-parallel.html
```

### 品質保証

本プロジェクトは包括的なテスト環境により品質を保証しています：

- **WASM単体テスト**: Rust Cargoテスト（95テスト以上）
- **TypeScript単体テスト**: Vitestベース
- **統合テスト**: WebAssembly-TypeScript連携テスト
- **ブラウザテスト**: wasm-packによる実環境テスト
- **E2Eテスト**: Playwright-MCPによる自動化テスト

## テスト環境

### 開発テスト
```bash
npm run dev
# → http://localhost:5173/test-development.html
```
- 個別機能のパフォーマンステスト
- WebAssembly統合テスト
- 詳細プロファイリング分析

### 統合テスト
```bash
npm run dev
# → http://localhost:5173/test-integration.html
```
- システム全体の統合テスト
- エンドツーエンドワークフローテスト
- ストレステスト・ベンチマーク

### 並列処理テスト
```bash
npm run dev
# → http://localhost:5173/test-parallel.html
```
- WebAssembly-Worker統合テスト
- 実環境並列処理検証
- メモリ管理・パフォーマンス測定

## GitHub Copilot対応

このプロジェクトはGitHub Copilotの最適化された設定を含んでいます：

- `.github/copilot-instructions.md`: 基本的なプロジェクト情報
- `.github/instructions/`: ファイル固有の開発指示
- `.github/prompts/`: 再利用可能なプロンプト（実験的機能）
- `.github/copilot-meta.md`: AI Agent向けメンテナンス情報

### Copilot設定の構造
```
.github/
├── copilot-instructions.md        # リポジトリ全体の基本指示
├── instructions/                   # ファイル固有の指示（自動適用）
│   ├── development.instructions.md
│   ├── testing.instructions.md
│   └── debugging.instructions.md
└── prompts/                       # 手動選択可能なプロンプト
    └── *.prompt.md
```

## パフォーマンス詳細

### SIMD最適化による高速化
WebAssembly SIMD128命令を活用した4並列SHA-1処理により大幅な性能向上を実現：

- **統合探索（SIMD版）**: 約2.7億回/秒
- **従来版比較**: 約2.7倍の性能向上
- **並列処理との組み合わせ**: CPUコア数に応じてさらなる高速化

### ベンチマーク環境
- **CPU**: AMD Ryzen 9 9950X3D 16-Core Processor (16コア/32スレッド, 最大4.3GHz)
- **メモリ**: 64GB RAM
- **OS**: Windows 11 Pro
- **アーキテクチャ**: x64 (AMD64)
- **ブラウザ**: Chrome/Edge (WebAssembly SIMD128対応)

### 技術的特徴
- 4-way並列SHA-1ハッシュ計算
- WebAssembly SIMD128ベクトル命令最適化
- 効率的なバッチ処理アルゴリズム
- メモリ使用量の最適化

## 使用方法

1. ROMバージョン・リージョン・ハードウェアを選択
2. MACアドレスとキー入力を設定
3. 探索日時範囲を指定
4. 目標Seedリストを入力
5. 探索開始で高速検索を実行

## WebAssembly API仕様

### メイン検索API

#### `IntegratedSeedSearcher`
統合シード探索システムのメインAPI：

```typescript
// 基本的な使用例
const searcher = new IntegratedSeedSearcher(
  version, region, hardware, 
  macAddress, keyInput
);

const results = searcher.search_seeds_integrated_simd(
  startDateTime, endDateTime,
  timer0Min, timer0Max,
  vcountMin, vcountMax,
  targetSeeds
);
```

### ポケモン生成API

#### `PokemonGenerator`
BW/BW2準拠のポケモン生成エンジン：

```typescript
const generator = new PokemonGenerator();
const config = new BWGenerationConfig(
  GameVersion.BlackWhite2,
  EncounterType.Normal,
  tid, sid, syncEnabled, syncNatureId
);

const pokemon = generator.generate_single_pokemon_bw(seed, config);
```

#### `PersonalityRNG`
BW仕様64bit線形合同法乱数生成器：

```typescript
const rng = new PersonalityRNG(initialSeed);
const randomValue = rng.next(); // 32bit乱数値取得
rng.advance(10); // 10回進める
```

#### `EncounterCalculator`
遭遇スロット計算エンジン：

```typescript
const calculator = new EncounterCalculator();
const slotIndex = calculator.calculate_encounter_slot(
  randomValue, 
  GameVersion.BlackWhite2, 
  EncounterType.Normal
);
```

#### `OffsetCalculator`
ゲーム初期化処理：

```typescript
const calculator = new OffsetCalculator();
const offset = calculator.calculate_offset(GameMode.Bw2ContinueNoMemoryLink);
const tidSid = calculator.calculate_tid_sid(seed, gameMode);
```

#### `PIDCalculator` & `ShinyChecker`
PID生成と色違い判定：

```typescript
const pidCalc = new PIDCalculator();
const shinyChecker = new ShinyChecker();

const pid = pidCalc.generate_wild_pid(randomValue);
const isShiny = shinyChecker.is_shiny(pid, tid, sid);
const shinyType = shinyChecker.get_shiny_type(pid, tid, sid);
```

### データソース・出典

#### エンカウントデータ

本アプリケーションで使用するポケモンエンカウントデータは以下のソースを参照しています：

- **Bulbapedia**: https://bulbapedia.bulbagarden.net/
  - BW/BW2エンカウントテーブル、確率分布
  - 取得日: 2025年1月（実装時点）
  
- **Serebii.net**: https://serebii.net/
  - 固定シンボル、配布ポケモン情報
  - 取得日: 2025年1月（実装時点）

- **ポケモン公式データ**: 
  - 種族値、タイプ、特性等の基本データ

- **コミュニティ解析データ**:
  - BW/BW2乱数アルゴリズム仕様
  - エンカウント処理の詳細実装

**注記**: エンカウントデータの正確性については、WebAssembly（Rust）実装で定義された確率分布・計算ロジックを正として扱います。外部データソースとの乖離が生じた場合は、実装コードの動作を優先します。

## E2Eテスト

包括的なブラウザ自動化テストをPlaywright-MCPで実行できます：

```bash
# 開発サーバー起動
npm run dev

# E2Eテスト実行
# Playwright-MCPのコマンドを使用
```

詳細は以下のドキュメントを参照：
- [E2Eテスト実行手順](docs/E2E_TESTING_WITH_PLAYWRIGHT_MCP.md)
- [Playwright-MCPスクリプト集](docs/PLAYWRIGHT_MCP_SCRIPTS.md)

## ライセンス

MIT License - 詳細は [LICENSE](LICENSE) ファイルを参照

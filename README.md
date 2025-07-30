# ポケモンBW/BW2 初期Seed探索webアプリ

第5世代ポケモン（ブラック・ホワイト/ブラック2・ホワイト2）の初期Seed値探索・検証を行うwebアプリケーションです。

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

## 開発・ビルド

```bash
# 依存関係のインストール
npm install

# 開発サーバー起動
npm run dev

# WebAssemblyビルド
npm run build:wasm

# プロダクションビルド
npm run build

# GitHub Pagesデプロイ
npm run deploy

# テスト実行
npm run test

# Rustテスト実行
npm run test:rust

# Rustブラウザテスト実行
npm run test:rust:browser

# 全テスト実行
npm run test:all
```

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

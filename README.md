# ポケモンBW/BW2 初期Seed探索webアプリ

第5世代ポケモン（ブラック・ホワイト/ブラック2・ホワイト2）の初期Seed値探索・検証を行うwebアプリケーションです。

## 概要

このアプリケーションは、ポケモンBW/BW2における初期Seed値の効率的な探索を実現します。ROMバージョン、リージョン、ハードウェア、日時、キー入力といった条件から生成されるメッセージをSHA-1ハッシュ化し、その上位32bitを初期Seedとして算出します。

## 主な機能

- **全28バージョン対応**: BW/BW2の全バージョン・リージョン組み合わせをサポート
- **高速探索**: WebAssembly + Rust による最適化で1,158,078 calc/sec を実現
- **並列処理**: CPU数に応じたWebWorker並列化による高速化（実験的機能）
- **リアルタイム進捗**: 探索状況の詳細表示と中断・再開機能
- **結果管理**: ソート・フィルタリング・詳細表示機能
- **エクスポート**: CSV/JSON/テキスト形式での結果出力
- **包括的テスト環境**: Playwright-MCP によるE2Eテスト自動化、開発・統合テストページによる品質保証

## 技術スタック

- **フロントエンド**: React 18 + TypeScript + Vite
- **UI**: Radix UI (shadcn/ui) + TailwindCSS
- **計算エンジン**: Rust + WebAssembly (wasm-pack)
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

# テスト実行
npm run test:run
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

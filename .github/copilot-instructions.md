# ポケモン BW/BW2 初期Seed探索 WebApp

## プロジェクト概要
ポケットモンスター ブラック・ホワイト/ブラック2・ホワイト2の初期Seed値探索・検証を行うwebアプリケーション

## 技術スタック
- **フロントエンド**: React 18 + TypeScript + Vite
- **計算エンジン**: Rust + WebAssembly (wasm-pack + wasm-bindgen) 
- **UI**: Radix UI components
- **状態管理**: Zustand
- **暗号処理**: Rust `sha1` crate

## フォルダ構造
- `/src`: TypeScript source code and React components
- `/wasm-pkg`: Rust WebAssembly implementation
- `/public`: Static assets and test pages
  - `/public/wasm`: WebAssembly modules for distribution
  - `/public/test-development.html`: 開発・パフォーマンステスト
  - `/public/test-integration.html`: 統合テスト
- `/scripts`: Build automation scripts

## アーキテクチャ原則
- **本番・開発コードの分離**: 本番環境に不要なコードを含めない
- **適切な責任分離**: パフォーマンス監視とデバッグ分析の分離
- **テスト環境の整備**: 開発効率を高める包括的テストシステム
- **依存関係の整理**: 循環依存や不適切な依存を避ける

## コーディング規約
- TypeScript strict mode 使用
- React function-based components 使用
- 既存のWebAssembly実装を活用（計算処理の再実装禁止）
- ESLint/Prettier設定に準拠
- 技術文書は事実ベース・簡潔に記述

## パフォーマンス監視アーキテクチャ
### 本番用 (`src/lib/core/performance-monitor.ts`)
- 軽量・高速な設計
- 基本メトリクス (計算速度、メモリ、進捗)
- リアルタイム測定機能

### 開発用 (`src/test-utils/profiling/development-analyzer.ts`)
- 詳細なパフォーマンス分析
- メッセージ生成プロファイリング
- スケーラビリティ測定
- ボトルネック分析と推奨事項生成

## テストシステム
### 開発テスト (`public/test-development.html`)
- 個別機能テスト
- パフォーマンステスト
- WebAssembly統合テスト

### 統合テスト (`public/test-integration.html`)
- システム全体の統合テスト
- エンドツーエンドワークフローテスト
- ストレステスト

## 重要なライブラリ・フレームワーク
- **WebAssembly**: 高性能なSHA-1ハッシュ計算とバッチ処理
- **Zustand**: アプリケーション状態管理
- **Radix UI**: アクセシブルなUIコンポーネント
- **Vitest**: TypeScript/WebAssembly統合テスト

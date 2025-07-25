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
- `/public/wasm`: WebAssembly modules for distribution
- `/scripts`: Build automation scripts

## コーディング規約
- TypeScript strict mode 使用
- React function-based components 使用
- 既存のWebAssembly実装を活用（計算処理の再実装禁止）
- ESLint/Prettier設定に準拠
- 技術文書は事実ベース・簡潔に記述

## 重要なライブラリ・フレームワーク
- **WebAssembly**: 高性能なSHA-1ハッシュ計算とバッチ処理
- **Zustand**: アプリケーション状態管理
- **Radix UI**: アクセシブルなUIコンポーネント
- **Vitest**: TypeScript/WebAssembly統合テスト

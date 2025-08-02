# 核心アルゴリズム実装 - 分割ファイル構成

この階層には、ポケモン生成機能の核心アルゴリズムを実装するための詳細仕様が含まれています。

## ファイル構成

### [personality-rng.md](./personality-rng.md)
BW/BW2仕様の64bit線形合同法による乱数生成エンジン

**主要機能:**
- 基本的な乱数生成（S[n+1] = S[n] * 0x5D588B656C078965 + 0x269EC3）
- シンクロ判定用乱数生成
- 性格決定用乱数生成
- 遭遇スロット決定用乱数生成（BW/BW2対応）

### [encounter-calculator.md](./encounter-calculator.md)
遭遇スロット計算と各種エンカウントタイプの処理

**主要機能:**
- BW/BW2別の遭遇スロット計算式
- 通常・なみのり・釣り・特殊エンカウントの確率分布
- スロット値からテーブルインデックスへの変換

### [offset-calculator.md](./offset-calculator.md)
ゲーム起動時からポケモン生成直前までのオフセット計算

**主要機能:**
- Probability Table (PT) 操作エンジン
- TID/SID決定処理
- ブラックシティ/ホワイトフォレスト住人決定
- BW2のExtra処理
- ゲームモード別オフセット計算

### [pokemon-generator.md](./pokemon-generator.md)
ポケモンデータ構造と統合Generator

**主要機能:**
- 統合ポケモン生成エンジン
- 生成されるポケモンデータの構造定義
- バッチ処理によるパフォーマンス最適化
- WASM/TypeScript間の役割分担

### [pid-shiny-checker.md](./pid-shiny-checker.md)
性格値（PID）生成と色違い判定の詳細実装

**主要機能:**
- 遭遇タイプ別PID生成アルゴリズム
- 色違い判定処理
- シンクロ適用範囲の管理
- 遭遇パターン別の乱数消費処理

### [special-encounters.md](./special-encounters.md)
特殊エンカウントの詳細仕様

**主要機能:**
- 揺れる草むら、砂煙、ポケモンの影、水泡系の仕様
- 特殊エンカウントの遭遇テーブル
- レベル計算の実装方針
- アイテム出現判定（砂煙）

## 実装時の参照順序

1. **基盤となる乱数エンジン**: `personality-rng.md`
2. **エンカウント基本処理**: `encounter-calculator.md`
3. **オフセット計算**: `offset-calculator.md`
4. **PID・色違い処理**: `pid-shiny-checker.md`
5. **統合Generator**: `pokemon-generator.md`
6. **特殊エンカウント**: `special-encounters.md`

## 共通設計原則

- **WASM中心**: 計算ロジックは全てWASM側で実装
- **TypeScript補完**: エンカウントテーブル情報など詳細データはTypeScript側で管理
- **バッチ処理**: パフォーマンス最適化のためバッチ処理を活用
- **正確性重視**: ゲーム内アルゴリズムの正確な再現を最優先

## 技術的依存関係

- **wasm-bindgen**: WASM/JavaScript間のバインディング
- **WebAssembly**: 高性能な数値計算処理
- **64bit整数演算**: BW仕様の線形合同法に必要
- **TypeScript**: エンカウントテーブル管理と詳細レベル計算

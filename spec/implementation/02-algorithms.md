# ポケモン生成機能 核心アルゴリズム実装

## 概要

このドキュメントは、ポケモン BW/BW2 の初期Seed探索・検証機能における核心アルゴリズムの実装仕様を定義します。アルゴリズムの詳細は機能別に分割されたファイルに記載されています。

## アルゴリズム構成要素

### 4.1 性格値乱数列エンジン
**ファイル**: [algorithms/personality-rng.md](./algorithms/personality-rng.md)

BW/BW2仕様の64bit線形合同法による乱数生成エンジンの実装。

**主要機能**:
- S[n+1] = S[n] * 0x5D588B656C078965 + 0x269EC3
- シンクロ判定用乱数生成
- 性格決定用乱数生成
- 遭遇スロット決定用乱数生成（BW/BW2別）
### 4.2 遭遇計算エンジン
**ファイル**: [algorithms/encounter-calculator.md](./algorithms/encounter-calculator.md)

遭遇スロット計算と各種エンカウントタイプの処理エンジンの実装。

**主要機能**:
- BW/BW2別の遭遇スロット計算式
- 通常・なみのり・釣り・特殊エンカウントの確率分布
- スロット値からテーブルインデックスへの変換
- 各エンカウントタイプの遭遇テーブル定義

### 4.3 オフセット計算エンジン
**ファイル**: [algorithms/offset-calculator.md](./algorithms/offset-calculator.md)

ゲーム起動時の初期seed（S0）からポケモン生成直前までのオフセット計算。

**主要機能**:
- Probability Table (PT) 操作エンジン
- TID/SID決定処理
- ブラックシティ/ホワイトフォレスト住人決定
- BW2のExtra処理（重複値回避ループ）
- ゲームモード別オフセット計算

### 4.4 ポケモンデータ構造と統合Generator
**ファイル**: [algorithms/pokemon-generator.md](./algorithms/pokemon-generator.md)

ポケモン個体データの構造定義と統合生成エンジンの実装。

**主要機能**:
- RawPokemonData構造体の定義
- 統合ポケモン生成エンジン
- バッチ処理によるパフォーマンス最適化
- WASM/TypeScript間の役割分担
- レベル計算のプレースホルダー処理

## 5. 性格値・色違い判定の詳細実装
**ファイル**: [algorithms/pid-shiny-checker.md](./algorithms/pid-shiny-checker.md)

性格値（PID）生成と色違い判定の詳細実装仕様。

**主要機能**:
- 遭遇タイプ別PID生成アルゴリズム
- 野生・固定・徘徊での生成方式の違い
- 色違い判定処理
- シンクロ適用範囲の管理
- 遭遇パターン別の乱数消費処理

## 6. 特殊エンカウントの詳細仕様
**ファイル**: [algorithms/special-encounters.md](./algorithms/special-encounters.md)

特殊条件で発生するエンカウントの詳細仕様。

**主要機能**:
- 揺れる草むら、砂煙、ポケモンの影、水泡系の仕様
- 特殊エンカウントの遭遇テーブル
- レベル計算の実装方針
- アイテム出現判定（砂煙での進化石・ジュエル）
- 隠れ特性ポケモンの出現処理

## 実装時の注意事項

### WASM中心設計
- 計算ロジックは全てWASM側で実装
- TypeScript側はフォールバック実装を行わない
- エンカウントテーブル情報等の詳細データのみTypeScript側で管理

### パフォーマンス最適化
- バッチ処理による高速化
- 不要な計算の回避
- メモリ効率の良いデータ構造

### 正確性の保証
- ゲーム内アルゴリズムの正確な再現
- 乱数消費パターンの厳密な管理
- バージョン間の差異の適切な実装

## 技術的依存関係

- **wasm-bindgen**: WASM/JavaScript間のバインディング
- **WebAssembly**: 高性能な数値計算処理
- **64bit整数演算**: BW仕様の線形合同法に必要
- **TypeScript**: エンカウントテーブル管理と詳細レベル計算
---

**作成日**: 2025年8月3日  
**バージョン**: 1.0  
**作成者**: GitHub Copilot  
**依存**: pokemon-generation-feature-spec.md, pokemon-data-specification.md  
**更新**: 2025年8月3日 - アルゴリズム詳細を機能別ファイルに分割

## 分割ファイル一覧

詳細な実装仕様は以下のファイルを参照：

- [algorithms/personality-rng.md](./algorithms/personality-rng.md) - 性格値乱数列エンジン
- [algorithms/encounter-calculator.md](./algorithms/encounter-calculator.md) - 遭遇計算エンジン  
- [algorithms/offset-calculator.md](./algorithms/offset-calculator.md) - オフセット計算エンジン
- [algorithms/pokemon-generator.md](./algorithms/pokemon-generator.md) - ポケモンデータ構造と統合Generator
- [algorithms/pid-shiny-checker.md](./algorithms/pid-shiny-checker.md) - 性格値・色違い判定
- [algorithms/special-encounters.md](./algorithms/special-encounters.md) - 特殊エンカウント仕様
- [algorithms/README.md](./algorithms/README.md) - 分割ファイル構成の概要

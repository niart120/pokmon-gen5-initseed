# ポケモン生成機能 実装フェーズ

## 8. 実装フェーズ

### 8.1 Phase 1: WASM Core Engine（3週間）
1. **64bit LCG乱数エンジン実装**
   - 正確な線形合同法（0x5D588B656C078965 + 0x269EC3）
   - BW/BW2別の遭遇スロット計算
   - 性格値生成・色違い判定
2. **オフセット計算エンジン実装**
   - Probability Table（PT）操作の正確な実装
   - TID/SID決定処理
   - ブラックシティ/ホワイトフォレスト住人決定
   - Extra処理（BW2専用）
   - ゲームバージョン・開始方式別フロー
3. **遭遇パターン実装**
   - 野生・固定シンボル・徘徊・なみのり・つり・大量発生
   - 正確な乱数消費順序
4. **RawPokemonData構造体**
   - WASM-TypeScript間データインターフェース
5. **基本テスト**
   - 参照実装との一致確認
   - 各遭遇タイプの動作検証
   - オフセット計算の精度検証

### 8.2 Phase 2: TypeScript Integration（2週間）
1. **結果パーサー実装**
   - WASM出力のTypeScript型変換
   - 種族・特性・性別決定ロジック
2. **データ管理**
   - 種族データ・遭遇テーブル・特性データ読み込み
   - データ整合性チェック
3. **WASMラッパーサービス**
   - 生成パラメータの検証・変換
   - エラーハンドリング
4. **統合テスト**
   - WASM-TypeScript連携確認
   - データ変換の正確性検証

### 8.3 Phase 3: UI Components（2週間）
1. **入力コンポーネント**
   - 基本パラメータ・遭遇設定フォーム
   - バリデーション機能
2. **結果表示コンポーネント**
   - テーブル・カード表示
   - フィルタリング・ソート
3. **制御コンポーネント**
   - 生成開始・停止・進捗表示
   - エクスポート機能
4. **状態管理**
   - Zustand store実装

### 8.4 Phase 4: WebWorker & Performance（1週間）
1. **WebWorker実装**
   - WASM + WebWorker連携
   - バックグラウンド処理
2. **バッチ処理最適化**
   - 大量生成時のメモリ効率化
   - 進捗通知の最適化
3. **パフォーマンステスト**
   - 生成速度測定
   - メモリ使用量監視

### 8.5 Phase 5: Polish & Validation（1週間）
1. **品質向上**
   - エラーハンドリング強化
   - ユーザビリティ改善
2. **包括テスト**
   - E2Eテスト実装
   - 既知パターンとの検証
3. **ドキュメント整備**
   - API仕様書
   - 使用方法ガイド

### 8.6 実装優先順位

**最優先（Phase 1必須）**
- 64bit LCG実装
- オフセット計算エンジン（PT操作、TID/SID決定、住人決定、Extra処理）
- BW/BW2遭遇スロット計算
- 性格値・色違い判定

**高優先（Phase 2必須）**
- WASM結果パーサー
- 基本データ管理
- 統合テスト

**中優先（Phase 3-4）**
- UI実装
- WebWorker連携

**低優先（Phase 5）**
- 品質向上
- 詳細テスト

### 8.7 依存関係

```
Phase 1 (WASM Core) 
    ↓
Phase 2 (TS Integration) 
    ↓ 
Phase 3 (UI Components)
    ↓
Phase 4 (Performance)
    ↓
Phase 5 (Polish)
```

**重要**: Phase 1のWASM実装完了が全体の前提条件。TypeScript側はWASM結果の表示・変換のみを担当。

---

**作成日**: 2025年8月3日  
**バージョン**: 1.0  
**作成者**: GitHub Copilot  
**依存**: pokemon-generation-feature-spec.md, pokemon-data-specification.md

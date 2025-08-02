# ポケモン生成機能 実装フェーズ

## 8. 実装フェーズ（合計10週間）

### 8.1 Phase 1: WASM Core Engine（4週間）

#### 8.1.1 Week 1: 基盤乱数エンジン（personality-rng.md）
1. **PersonalityRNG構造体実装**
   - BW仕様64bit線形合同法（S[n+1] = S[n] * 0x5D588B656C078965 + 0x269EC3）
   - wrapping_mul/wrapping_add によるオーバーフロー対応
   - 上位32bitの乱数値取得
2. **特殊用途乱数生成**
   - sync_check(): シンクロ判定用（(r1[n] * 2) >> 32）
   - nature_roll(): 性格決定用（(r1[n] * 25) >> 32）
   - encounter_slot_bw/bw2(): 遭遇スロット決定（BW/BW2別計算式）
3. **wasm-bindgen統合**
   - getter/setterでJavaScript側からのシード操作
   - WebAssembly環境での64bit整数演算最適化

#### 8.1.2 Week 2: 遭遇計算エンジン（encounter-calculator.md）
1. **EncounterCalculator実装**
   - GameVersion enum（BW/BW2対応）
   - calculate_encounter_slot(): バージョン別スロット計算
   - slot_to_table_index(): 8種エンカウントタイプ対応
2. **遭遇スロット分布実装**
   - 通常エンカウント（12スロット、20%/20%/10%...）
   - なみのり（5スロット、60%/30%/5%/4%/1%）
   - 釣り（5スロット、70%/15%/10%/5%）
   - 特殊エンカウント（4-5スロット、タイプ別確率分布）

#### 8.1.3 Week 3: オフセット計算エンジン（offset-calculator.md）
1. **OffsetCalculator構造体**
   - 乱数消費回数管理（advances プロパティ）
   - next_seed(): BW仕様乱数生成とadvances更新
   - consume_random(): 指定回数の乱数消費
2. **Probability Table（PT）操作**
   - 6段階テーブル定義（L1-L6の確率閾値）
   - probability_table_process(): 1回のPT操作
   - probability_table_process_multiple(): 複数回PT操作
3. **ゲーム初期化処理**
   - calculate_tid_sid(): TID/SID決定処理
   - determine_front/back_residents(): ブラックシティ/ホワイトフォレスト住人決定
   - extra_process(): BW2専用Extra処理（重複値回避ループ）
4. **GameMode enum対応**
   - 8パターンのゲーム開始方式
   - calculate_offset(): モード別オフセット計算

#### 8.1.4 Week 4: PID・色違い処理と統合Generator
1. **PIDCalculator実装（pid-shiny-checker.md）**
   - generate_wild_pid(): 野生エンカウント（r1[n] ^ 0x00010000）
   - generate_static_pid(): 固定シンボル・ギフト（r1[n]）
   - generate_roaming_pid(): 徘徊ポケモン（r1[n]）
2. **ShinyChecker実装**
   - is_shiny(): 色違い判定（(TID ^ SID ^ PID_high ^ PID_low) < 8）
   - get_shiny_value(): 色違い値計算
   - get_shiny_type(): 正方形・星型判定
3. **PokemonGenerator統合（pokemon-generator.md）**
   - RawPokemonData構造体定義
   - generate_pokemon_batch(): バッチ処理メイン関数
   - 遭遇タイプ別処理分岐（0-7: 野生、10-11: 固定、20: 徘徊）
4. **特殊エンカウント対応（special-encounters.md）**
   - 揺れる草むら・砂煙・ポケモンの影・水泡系
   - エンカウントタイプ3-7の確率分布実装
5. **基本テスト**
   - 各アルゴリズム単体テスト
   - 参照実装との一致確認
   - 遭遇タイプ別動作検証

### 8.2 Phase 2: TypeScript Integration（2週間）

#### 8.2.1 Week 1: WASM結果処理とデータ管理
1. **RawPokemonDataパーサー実装**
   - WASM出力のTypeScript型変換
   - プレースホルダー値（0/127/255）の適切な処理
   - level_rand_value活用による詳細レベル計算
2. **エンカウントテーブル管理**
   - BW/BW2別エンカウントテーブル定義
   - エリア・バージョン・釣り竿タイプ別データ構造
   - レベル範囲情報とランダム選択アルゴリズム
3. **種族・特性・性別決定ロジック**
   - encounter_slot_value → 実際のポケモン種族
   - ability_slot → 特性決定（通常・隠れ特性）
   - gender_value → 性別決定（種族別性別比考慮）

#### 8.2.2 Week 2: WASMラッパーと統合テスト
1. **WASMラッパーサービス**
   - 生成パラメータの検証・変換
   - GameMode・EncounterType・GameVersionの適切な変換
   - エラーハンドリングとフォールバック処理
2. **データ統合処理**
   - WASM生の乱数値 + TypeScript詳細情報の結合
   - 特殊エンカウントでのアイテム出現判定（砂煙）
   - シンクロ適用範囲の管理（野生のみ、徘徊は無効）
3. **統合テスト**
   - WASM-TypeScript連携の正確性検証
   - 各エンカウントタイプでのデータ変換確認
   - レベル計算の精度テスト（固定・範囲別）

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

**最優先（Phase 1 Week 1-2必須）**
- PersonalityRNG: 64bit LCG乱数エンジン
- EncounterCalculator: BW/BW2遭遇スロット計算
- 基本的な遭遇タイプ対応（0-2: 通常・なみのり・釣り）

**高優先（Phase 1 Week 3-4必須）**
- OffsetCalculator: PT操作、TID/SID決定、住人決定、Extra処理
- PIDCalculator + ShinyChecker: 性格値・色違い判定
- PokemonGenerator: 統合生成エンジンとRawPokemonData

**中優先（Phase 1完了後）**
- 特殊エンカウント（3-7）: 揺れる草むら・砂煙・影・水泡系
- 固定シンボル・徘徊ポケモン対応（10-11, 20）
- WASM結果パーサーとTypeScript統合

**低優先（Phase 3-5）**
- UI実装とWebWorker連携
- パフォーマンス最適化
- 品質向上と詳細テスト

### 8.7 アルゴリズム実装依存関係

```
personality-rng.md (基盤乱数エンジン)
    ↓
encounter-calculator.md (遭遇計算)
    ↓
offset-calculator.md (オフセット計算)
    ↓
pid-shiny-checker.md (PID・色違い判定)
    ↓
pokemon-generator.md (統合Generator)
    ↓
special-encounters.md (特殊エンカウント)
    ↓
TypeScript Integration (データ処理・UI)
```

### 8.8 各Phaseでの成果物とテスト戦略

#### Phase 1成果物
- **Week 1**: PersonalityRNG + 単体テスト
- **Week 2**: EncounterCalculator + 遭遇スロット検証テスト
- **Week 3**: OffsetCalculator + オフセット計算精度テスト
- **Week 4**: PokemonGenerator統合 + 全体統合テスト

#### テスト戦略
1. **単体テスト**: 各アルゴリズムの個別動作確認
2. **精度テスト**: 既知の参照実装との数値一致確認
3. **統合テスト**: WASM間連携とバッチ処理動作確認
4. **パフォーマンステスト**: 大量生成時の速度・メモリ効率測定

#### 品質基準
- **精度**: 参照実装との100%一致
- **パフォーマンス**: 10,000件/秒以上の生成速度
- **メモリ効率**: バッチサイズ拡大時の線形メモリ増加
- **エラーハンドリング**: 不正パラメータの適切な検出・処理

---

**作成日**: 2025年8月3日  
**更新日**: 2025年8月3日 - アルゴリズム分割に基づく実装フェーズ詳細化  
**バージョン**: 2.0  
**作成者**: GitHub Copilot  
**依存**: algorithms/*.md, pokemon-generation-feature-spec.md, pokemon-data-specification.md

# PokemonGenerator BW/BW2準拠 完全移行計画

## 🎯 目標
ドキュメント仕様に完全準拠したBW/BW2実装への完全移行
既存の型安全性・パフォーマンス最適化を維持

## 📋 作業計画

### Phase 1: EncounterType列挙型の拡張 ✅
- [ ] `encounter_calculator.rs`に`Roaming = 20`を追加
- [ ] 関連する処理ロジックの更新

### Phase 2: データ構造の修正 ✅  
- [ ] `RawPokemonData`構造体の修正
  - [ ] `sync_applied: bool` フィールド追加
  - [ ] `encounter_type: u8` フィールド追加  
  - [ ] `level_rand_value: u32` 型修正（u8→u32）
  - [ ] getterメソッドの追加

### Phase 3: BW準拠設定構造体の実装 ✅
- [ ] `BWGenerationConfig`構造体の作成
  - [ ] 既存列挙型（GameVersion, EncounterType）の活用
  - [ ] `sync_enabled: bool`フィールド追加
  - [ ] `sync_nature_id: u8`フィールド追加

### Phase 4: メイン生成ロジックの完全書き直し ✅
- [ ] `generate_single_pokemon_bw()`メソッドの実装
  - [ ] 正しい乱数消費順序の実装
    - [ ] Step 1: シンクロ判定（野生のみ）
    - [ ] Step 2: 遭遇スロット決定  
    - [ ] Step 3: PID生成（encounter_type依存）
    - [ ] Step 4: レベル乱数（encounter_type依存）
    - [ ] Step 5-7: その他個体値計算
  - [ ] 既存エンジンの活用
    - [ ] PersonalityRNG::sync_check()
    - [ ] PersonalityRNG::nature_roll()
    - [ ] EncounterCalculator::calculate_encounter_slot()
    - [ ] PIDCalculator::generate_wild_pid()
    - [ ] PIDCalculator::generate_static_pid()
    - [ ] ShinyChecker::check_shiny_type()

### Phase 5: 便利メソッドの実装 ✅
- [ ] `is_wild_encounter()`メソッド
- [ ] `is_static_encounter()`メソッド  
- [ ] `calculate_level_rand_with_advances()`メソッド

### Phase 6: バッチ処理の実装 ✅
- [ ] `generate_pokemon_batch_bw()`メソッド
- [ ] 既存の高速化機能の活用

### Phase 7: テストケースの実装 ✅
- [ ] BW準拠テストの作成
- [ ] 乱数消費順序の検証
- [ ] 既存テストとの並行実行

### Phase 8: 既存APIの削除・クリーンアップ ✅
- [ ] 古い`generate_single_pokemon()`の削除
- [ ] `GenerationConfig`構造体の削除
- [ ] `PokemonType`列挙型の削除
- [ ] 不要なコードの除去

## 🔧 実装方針

### 既存活用要素
- ✅ **EncounterType列挙型**: 型安全な遭遇タイプ管理
- ✅ **GameVersion列挙型**: BW/BW2判定
- ✅ **PersonalityRNG**: 高精度乱数生成エンジン
- ✅ **EncounterCalculator**: 遭遇スロット計算エンジン
- ✅ **PIDCalculator**: PID生成エンジン（部分活用）
- ✅ **ShinyChecker**: 色違い判定エンジン

### BW/BW2仕様準拠ポイント
- ✅ **乱数消費順序**: ドキュメント仕様通りの順序実装
- ✅ **encounter_type分岐**: 数値範囲による分岐（0-7, 10-11, 20）
- ✅ **シンクロ処理**: 野生エンカウントのみ適用
- ✅ **PID生成式**: 野生（XOR適用）vs 固定（XOR無し）
- ✅ **レベル乱数**: エンカウントタイプ依存の消費パターン

## 📊 期待される改善点

### 正確性
- BW/BW2実機と同じ結果の生成
- 正しい乱数消費回数
- 適切なシンクロ動作

### 型安全性
- コンパイル時エラー検出
- 無効な設定値の排除
- パターンマッチングによる網羅性

### パフォーマンス
- 既存最適化の継承
- バッチ処理対応
- メモリ効率の維持

---
作業開始日: 2025-08-03
予定完了日: 2025-08-03

# GitHub Copilot Instructions - Pokémon BW/BW2 初期Seed探索webアプリ

## 📋 プロジェクト概要
このプロジェクトは、ポケットモンスターブラック・ホワイト/ブラック2・ホワイト2における初期Seed値の探索・検証を行うwebアプリケーションです。

**プロジェクト状態**: **完成・実用可能状態**

## 🎯 開発方針

### 基本原則
- ユーザーとのコミュニケーションは日本語を用いること
- ターミナルは PowerShell を使用
- **PRD.md** の要件定義書を最高優先度として開発を進める
- **IMPLEMENTATION_STATUS.md** の実装状況報告書に基づいて作業優先度を決定
- 技術仕様・機能要件・非機能要件すべてに準拠する

### 必須参照ドキュメント
1. **PRD.md** - プロダクト要件定義書（必読・最優先）
2. **IMPLEMENTATION_STATUS.md** - 現在の実装状況とプロジェクト完成度
3. 参考実装: [Project_Veni/InitSeedSearch.cs](https://github.com/niart120/Project_Veni/blob/master/VendingAbuser/InitSeedSearch.cs)

---

## 🎉 プロジェクト完成状況

### 技術スタック準拠状況
PRD.mdで指定された技術スタックに完全準拠:
- **フロントエンド**: React 18 + TypeScript + Vite ✅
- **計算エンジン**: Rust + WebAssembly (wasm-pack + wasm-bindgen) ✅
- **UI**: Radix UI (高品質代替) ✅
- **状態管理**: Zustand ✅
- **暗号処理**: Rustの`sha1`クレート ✅

### WebAssembly実装完了状況
- **Rust実装**: 完成済み（`wasm-pkg/src/`配下）
- **事前計算テーブル**: TimeCode(86,400) + DateCode(36,525)エントリ
- **統合探索**: IntegratedSeedSearcher完成
- **パフォーマンス**: 目標の417倍達成（1,158,078 calc/sec）
- **品質保証**: Project_Veni参照実装との厳密照合完了

---

## 📝 開発時のルール

### 機能追加・変更時
```typescript
// ✅ 推奨: 既存の堅牢なアーキテクチャを活用
import { integratedSearchManager } from '@/lib/integrated-search-manager';
import { useAppStore } from '@/store/app-store';

// ❌ 禁止: コア計算処理の新規実装
// 既存のWebAssembly実装が完成済み
```

### WebAssembly関連
```rust
// ✅ 許可: 既存Rust実装の拡張・改善
// wasm-pkg/src/ 配下のファイル編集

// ❌ 禁止: TypeScriptでの計算処理再実装
// WebAssemblyが完成済みのため不要
```

### 既存機能の変更時の注意
1. 既存の検証システム(`search-verification.ts`)でのテスト実行必須
2. `generateTestSeeds()`での動作確認
3. パフォーマンステストの継続実行
4. Rust側テスト(`cargo test`)の実行

---

## 🔄 現在の開発フェーズ

### プロジェクト完成状態
```
✅ Phase 1: MVP完成 (100%)
✅ Phase 2A: パフォーマンス分析 (100%)  
✅ Phase 2B: WebAssembly最適化 (100%)
✅ Phase 2C: 実用テスト・品質保証 (100%)
🏆 実用可能な完成プロダクト
```

### 可能な拡張作業 (オプション)
```
📋 プリセット・履歴機能追加
📱 PWA対応
📁 ファイルインポート機能
🎨 UI/UX改善
```

---

## 💻 実装時のベストプラクティス

### ファイル構造の維持
```
src/
├── wasm/              # WebAssemblyモジュール (完成済み)
├── lib/               # 計算ロジック (完成済み)
├── components/        # UI コンポーネント (完成済み)
├── store/            # 状態管理 (完成済み)
└── types/            # TypeScript型定義 (完成済み)

wasm-pkg/             # Rust WebAssemblyソース (完成済み)
├── src/              # Rust実装
└── Cargo.toml        # 依存関係
```

### テスト・検証の継続実行
```typescript
// プロジェクト完成後も品質維持のため実行推奨
verifySearchImplementation()    // 包括的検証
generateTestSeeds()            // テストデータ生成確認
testSeedCalculation()          // 基本計算テスト
```

### パフォーマンステスト自動化
```javascript
// ブラウザテスト (http://localhost:5174/test-performance.html)
// 以下のテストが実行可能:

1. 基本パフォーマンステスト     - 基礎性能測定
2. スケーラビリティテスト      - バッチサイズ別性能分析  
3. バッチ処理テスト           - WebAssembly性能確認
4. 大規模ストレステスト        - 100万計算での安定性確認
5. 包括的テスト              - 全機能連続実行

// 実績値:
// - 速度: 1,158,078 calc/sec (目標の417倍)
// - メモリ: 7.30MB (目標500MB以下を大幅クリア)
// - 100万計算: 0.86秒 (目標10分以内を大幅短縮)
```

### コード品質維持
- TypeScript strict mode準拠
- ESLint/Prettier設定維持
- 既存のコメント・ドキュメント保持
- Rust側の`cargo fmt`、`cargo clippy`実行

---

## 🎯 具体的な作業指示

### 開発サーバー起動
```powershell
if (-not (Get-NetTCPConnection -LocalPort 5174 -ErrorAction SilentlyContinue)) { npm run dev }
```

### テスト実行（品質保証）
```powershell
# Rust側テスト
cd wasm-pkg && cargo test

# TypeScript側テスト  
npm run test:run

# ブラウザテスト
# http://localhost:5174/test-performance.html にアクセス
```

### 新機能追加時の考慮点
1. 既存のアーキテクチャパターン踏襲
2. WebAssembly統合の活用
3. 既存の状態管理パターン利用
4. UI コンポーネントの一貫性維持

### デバッグ・問題解決時
1. ブラウザ開発者ツールでの検証実行ログ確認
2. `search-verification.ts` の詳細ログ活用
3. Project_Veni参照実装との差分確認
4. Rust側ログ(`console_log!`)の確認

---

## 🚀 プロジェクト成果

### 完成済み実績
- ✅ **PRD要件100%実装完了**
- ✅ **WebAssembly最適化による417倍高速化**
- ✅ **28ROMバージョン完全対応**
- ✅ **大規模処理安定性確保**
- ✅ **包括的テスト・品質保証システム**

### 技術的成果
- WebAssembly + Rust による最先端最適化実現
- yatsuna827参照実装を活用した専門的最適化
- 事前計算テーブルによる劇的パフォーマンス向上

### 実用的成果
- ポケモンプレイヤーの初期Seed探索を大幅効率化
- 100万計算規模の処理を実用的な時間で実行可能
- 全28バージョン対応による幅広い利用可能性

---

## ⚠️ 特別注意事項

### やってはいけないこと
1. **コア計算処理の再実装** - WebAssembly実装が完成済み
2. **PRD.mdの要件を無視した独自仕様追加** - 要件定義完全達成済み
3. **既存の検証システム無効化** - 品質担保システム破壊
4. **パフォーマンス最適化の複雑化** - 目標を417倍上回る実績で十分

### 重要な相談事項
新機能追加や大幅な変更を行う際は、既存の完成済み実装への影響を慎重に検討してください。

---

## 🧪 テスト戦略・品質保証

### 多層品質保証システム（完成済み）

#### 1. **Rust側Unit Test (cargo test)**
```bash
# Rust実装の詳細テスト（9テスト実装済み）
cd wasm-pkg && cargo test
```
- ✅ SHA-1ハッシュ計算の正確性
- ✅ バッチ処理と個別処理の結果一致
- ✅ エンディアン変換・左回転・オーバーフロー処理
- ✅ 同じ入力での一貫性・異なる入力での差分
- ✅ ポケモン特有値での動作確認

#### 2. **TypeScript側Unit Test (vitest)**
```bash
# TypeScript実装のロジックテスト
npm run test:run src/test/calculator-logic.test.ts
```
- ✅ SeedCalculator初期化・実装切り替え
- ✅ 基本シード計算・一貫性・差分
- ✅ メッセージ生成・エラーハンドリング
- ✅ パフォーマンス基準（250,000 calc/sec）

#### 3. **統合テスト (vitest)**
```bash
# WebAssembly統合テスト（フォールバック含む）
npm run test:run src/test/wasm-integration.test.ts
```
- ✅ WebAssembly初期化失敗時のTypeScript実装フォールバック
- ✅ 実際のポケモンBW/BW2シナリオでの動作
- ✅ 複数回実行での一貫性確認

#### 4. **ブラウザ環境統合テスト**
```bash
# 開発サーバー起動後にブラウザでテスト実行
npm run dev
# http://localhost:5174/test-performance.html でマニュアルテスト
```
- 🦀 WebAssembly読み込み・基本関数・一貫性テスト
- ⚡ 実際の探索パフォーマンステスト（スケーラビリティ・大規模ストレス）
- 📊 進捗オーバーヘッド分析・包括的品質確認

---

## 🏆 プロジェクト総括

このプロジェクトは、ポケモンBW/BW2初期Seed探索のwebアプリケーションとして、**完成した実用可能状態**にあります。

### 実用性
- **即座に利用可能**: ポケモンプレイヤーの実際の用途に対応
- **高性能**: 大規模探索を実用的な時間で実行
- **高品質**: 参照実装との照合による計算精度保証
- **高い拡張性**: 将来の機能追加に対応した堅牢な設計

このプロジェクトは、技術的にも実用的にも**成功したwebアプリケーション**として完成しています。追加開発は拡張機能の実装のみで、基本機能は完全に動作する状態です。

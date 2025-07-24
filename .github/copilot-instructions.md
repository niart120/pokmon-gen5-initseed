# GitHub Copilot Instructions - Pokémon BW/BW2 初期Seed探索webアプリ

## 📋 プロジェクト概要
このプロジェクトは、ポケットモンスターブラック・ホワイト/ブラック2・ホワイト2における初期Seed値の探索・検証を行うwebアプリケーションです。

## 🎯 開発方針

### 基本原則
- ユーザーとのコミュニケーションは日本語を用いること
- ターミナルは PowerShell を使用
- **PRD.md** の要件定義書を最高優先度として開発を進める
- **IMPLEMENTATION_STATUS.md** の実装状況報告書に基づいて作業優先度を決定する
- 技術仕様・機能要件・非機能要件すべてに準拠する

### 必須参照ドキュメント
1. **PRD.md** - プロダクト要件定義書（必読・最優先）
2. **IMPLEMENTATION_STATUS.md** - 現在の実装状況とアクションプラン
3. 参考実装: [Project_Veni/InitSeedSearch.cs](https://github.com/niart120/Project_Veni/blob/master/VendingAbuser/InitSeedSearch.cs)

---

## 🚨 重要な開発制約


### 技術スタック準拠
PRD.mdで指定された技術スタックに準拠:
- **フロントエンド**: React 18 + TypeScript + Vite
- **計算エンジン**: Rust + WebAssembly (wasm-pack + wasm-bindgen)
- **UI**: Material-UI v5 (現状はRadix UI使用 - 移行検討要)
- **状態管理**: Zustand ✅
- **暗号処理**: Rustの`sha1`クレートまたは`ring`クレート

### 計算処理の正確性維持
- Project_Veni参照実装との厳密な照合
- エンディアン変換・BCD変換・SHA-1処理の正確性
- 既存の検証システム(`search-verification.ts`)でのテスト継続

---

## 📝 コード変更時のルール

### WebAssembly実装関連
```rust
// Rust実装時の必須クレート
sha1 = "0.10"          # SHA-1実装
byteorder = "1.5"      # エンディアン変換
wasm-bindgen = "0.2"   # TypeScriptとのFFI
```

### TypeScript側での計算処理禁止
```typescript
// ❌ 禁止: 新しい計算処理をTypeScriptで実装
// ✅ 許可: WebAssemblyへのラッパー・インターフェース
```

### 既存機能の変更時の注意
1. `search-verification.ts`でのテスト実行必須
2. `generateTestSeeds()`での動作確認
3. エンドツーエンドテストの継続実行

---

## 🔄 開発フェーズ優先順位

### Phase 1A: WebAssembly実装 (最優先)
```
1. Rust + wasm-pack環境構築
2. SHA-1ハッシュ計算のWebAssembly移行
3. エンディアン変換処理の移行
4. TypeScript ← → WebAssembly FFI設計
5. 既存計算処理の置き換え
6. 検証システムでの動作確認
```

### Phase 1B: MVP機能完成
```
1. エクスポート機能 (CSV/JSON/テキスト)
2. Web Workers実装 (UIブロッキング対策)
3. プリセット・履歴機能
4. パフォーマンス最適化
```

### Phase 2: 技術仕様準拠・UX向上
```
1. Material-UI移行検討
2. PWA対応 (Service Worker)
3. レスポンシブ強化
4. アクセシビリティ向上
```

### Phase 3: 品質向上・運用準備
```
1. 包括的テスト実装
2. CI/CDパイプライン
3. ドキュメント整備
4. デプロイ環境構築
```

---

## 💻 実装時のベストプラクティス

### ファイル構造の維持
```
src/
├── wasm/              # 新規: WebAssembly関連
├── lib/               # 計算ロジック (WebAssemblyラッパー)
├── components/        # UI コンポーネント
├── store/            # 状態管理
└── types/            # TypeScript型定義
```

### 検証・テストの継続実行
```typescript
// 実装変更後は必ずこれらを実行
verifySearchImplementation()    // 包括的検証
generateTestSeeds()            // テストデータ生成確認
testSeedCalculation()          // 基本計算テスト
```

### パフォーマンス考慮
- 大規模探索でのメモリ効率
- UI レスポンシブネス維持
- WebAssembly最適化

### コード品質
- TypeScript strict mode準拠
- ESLint/Prettier設定維持
- 既存のコメント・ドキュメント保持

---

## 🎯 具体的な作業指示

### WebAssembly実装開始時
1. `wasm/` ディレクトリ作成
2. `Cargo.toml` 設定
3. `lib.rs` でのFFI定義
4. `wasm-pack build` 環境構築
5. TypeScriptでの型定義・インポート

### 機能追加時
1. PRD.mdでの要件確認
2. IMPLEMENTATION_STATUS.mdでの重複確認
3. 既存の状態管理パターン踏襲
4. UI コンポーネントの一貫性維持

### デバッグ・問題解決時
1. ブラウザ開発者ツールでの検証実行ログ確認
2. `search-verification.ts` の詳細ログ活用
3. Project_Veni参照実装との差分確認

---

## 🚀 成功基準

### WebAssembly移行完了判定
- [ ] 全計算処理がRust実装
- [ ] TypeScript側は純粋なインターフェース
- [ ] 検証システムで100%パス
- [ ] パフォーマンス向上確認

### MVP完成判定
- [ ] PRD.md Phase 1要件100%実装
- [ ] 技術仕様準拠
- [ ] エクスポート機能実装
- [ ] 長時間探索でのUI安定性

### プロダクション準備完了判定
- [ ] PWA対応完了
- [ ] 包括的テスト実装
- [ ] ドキュメント整備完了
- [ ] デプロイ環境準備完了

---

## ⚠️ 特別注意事項

### やってはいけないこと
1. **TypeScriptでの新規計算処理実装** - PRD違反
2. **PRD.mdの要件を無視した独自仕様追加** - 要件定義違反
3. **既存の検証システム無効化** - 品質担保システム破壊
4. **参照実装との非互換な変更** - アルゴリズム正確性損失

### 重要な相談事項
WebAssembly実装やパフォーマンス最適化など、複雑な技術変更を行う際は、事前に実装方針を確認してください。

このプロジェクトは高品質な実装が完成しており、WebAssembly実装により完全なMVPとして完成できる状態です。PRD.mdとIMPLEMENTATION_STATUS.mdを常に参照し、計画的に開発を進めてください。

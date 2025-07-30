---
applyTo: "wasm-pkg/**/*.rs"
---

# Rust WebAssembly開発ガイド

## 開発環境
- wasm-pack使用
- `cargo test`での単体テスト必須
- `wasm-pack test --chrome --headless`でのブラウザテスト実行

## コード品質
```bash
cargo fmt
cargo clippy
```

## 実装原則
- 既存実装の拡張・改善は許可
- SHA-1計算の精度維持必須
- バッチ処理と個別処理の結果一致保証

## デバッグ
```rust
console_log!("デバッグ情報: {}", value);
```

## ビルド
- `npm run build:wasm`で自動配置
- `src/wasm/`と`public/wasm/`への配置確認

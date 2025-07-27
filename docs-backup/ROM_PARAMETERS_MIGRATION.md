# ROM Parameters Migration from JSON to TOML

## 概要

ROMパラメータファイルをJSONからTOMLに移行しました。この変更により以下のメリットがあります：

1. **16進数完全サポート**: TOML v1.0.0の `0x` プレフィックスを使用した16進数表記が可能
2. **コメントサポート**: `#` を使用してファイル内にコメントを記述可能
3. **より読みやすい構造**: セクション形式でデータを整理
4. **型安全性**: TypeScript生成により厳密な型チェック

## ファイル構造

```
src/data/
├── rom-parameters.toml  # 元データ（手動編集対象）
└── rom-parameters.ts    # 自動生成ファイル（編集禁止）
```

## パラメータ更正

元データは [BZLさんのブログ記事](https://blog.bzl-web.com/entry/2020/09/18/235128) を参考に、以下の点を修正しました：

### BW (Black/White)
- Nazo値: 各バージョンに適切な値を設定
- VCount: バージョン/地域ごとの正確な値
- Timer0範囲: ROM解析結果に基づく範囲

### BW2 (Black 2/White 2)
- Nazo値: より正確な値に更新
- VCountオフセット: ドイツ版・イタリア版・スペイン版の特殊ルールを追加
- Timer0範囲: より精密な範囲設定

## 使用方法

### 開発時
```bash
npm run dev  # TOML → TypeScript変換も自動実行
```

### ビルド時
```bash
npm run build  # TOML → TypeScript変換 → WebAssembly → TypeScriptビルド
```

### 手動変換
```bash
npm run convert:toml  # TOML → TypeScript変換のみ
```

## パラメータ編集

`src/data/rom-parameters.toml` を編集してください。編集後は以下のいずれかを実行：

1. `npm run convert:toml` - 変換のみ
2. `npm run dev` - 変換 + 開発サーバー起動
3. `npm run build` - 変換 + フルビルド

⚠️ **注意**: `src/data/rom-parameters.ts` は自動生成ファイルのため直接編集しないでください。

## TOML構造例

```toml
[B.JPN]  # Black - Japanese
nazo = [0x02215F10, 0x02003F0A, 0x020038C6, 0x02215F56, 0x02003F5A]
defaultVCount = 0x60
timer0Min = 0xC79
timer0Max = 0xC7A

# VCountオフセットルール（特定バージョンのみ）
[[B2.GER.vcountOffset]]
timer0Min = 0x10E5
timer0Max = 0x10E8
vcountValue = 0x81
```

## 技術詳細

- **パーサー**: `@iarna/toml` パッケージ使用（TOML v1.0.0対応）
- **16進数サポート**: ネイティブサポートにより `0x` プレフィックス付き値を直接使用可能
- **ビルド統合**: 自動変換方式でTypeScript生成
- **型安全性**: 生成されたTypeScriptファイルで厳密な型チェック
- **パフォーマンス**: WebWorkerでの動作も考慮した実装

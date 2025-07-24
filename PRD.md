# ポケモンBW/BW2 初期Seed探索webアプリ 要件定義書

## 1. プロジェクト概要

### 1.1 目的
ポケットモンスターブラック・ホワイト/ブラック2・ホワイト2における初期Seed値の探索・検証を行うwebアプリケーションを開発する。
ユーザーが指定した条件（ROMバージョン、リージョン、ハードウェア、日時、キー入力）から生成されるメッセージをSHA-1ハッシュ化し、その上位32bitを初期Seedとして算出する。
算出された初期Seedが目標の初期Seedリストに含まれているかを検索・照合する機能を提供する。

### 1.2 対象ユーザー
- 第5世代ポケモンの初期Seed値を特定したいプレイヤー
- 乱数調整のための初期Seed探索を効率化したいプレイヤー
- 初期Seed生成アルゴリズムの理解・検証を目的とするプレイヤー

### 1.3 対象ゲーム
- ポケットモンスターブラック・ホワイト（第5世代）
- ポケットモンスターブラック2・ホワイト2（第5世代）

### 1.4 参考資料
- [【BW/BW2】全28バージョンパラメータ纏め](https://blog.bzl-web.com/entry/2020/09/18/235128) - 各バージョンのNazo値、VCount、Timer0範囲の詳細情報

## 2. 機能要件

### 2.1 初期Seed探索機能

#### 2.1.1 入力条件
- **ROMバージョン**: ブラック(B)/ホワイト(W)/ブラック2(B2)/ホワイト2(W2)
- **ROMリージョン**: 日本(JPN)/韓国(KOR)/米国(USA)/ドイツ(GER)/フランス(FRA)/スペイン(SPA)/イタリア(ITA)
- **利用ハードウェア**: DS/DS Lite/3DS（Frame値の決定に使用：DS=0x8, DS Lite=0x6, 3DS=0x9）
- **Timer0範囲**: 
  - **自動設定**: ROMバージョン・リージョンに応じた推奨範囲（例：日本版B 0xC79-0xC7A）
  - **手動設定**: ユーザーによる任意範囲指定も可能
- **VCount値**: 
  - **自動設定**: ROMバージョンに応じた固定値（例：BW 0x5F/0x60, BW2 0x81/0x82）
  - **手動設定**: ユーザーによる任意範囲指定も可能
- **日時範囲指定**: 
  - **対応範囲**: 2000/01/01/00:00:00 ～ 2099/12/31/23:59:59
  - **指定単位**: 年/月/日/時/分/秒の個別範囲指定
- **キー入力**: 起動時に押されているキーの組み合わせを示すビットマップ
  - **ビット配置**: bit0=A, bit1=B, bit2=Select, bit3=Start, bit4=Right, bit5=Left, bit6=Up, bit7=Down, bit8=R, bit9=L, bit10=X, bit11=Y
  - **XOR処理**: 実際の押下状態に対して0x2C00、0x3FFとのXOR演算を適用
  - **デフォルト値**: 0x2FFF（キーが押されていない状態）
- **MACアドレス**: 6バイトのMACアドレス
  - **入力方法**: ユーザーによる手動入力
  - **入力形式**: XX:XX:XX:XX:XX:XX形式（6つの2桁16進数をコロンで区切り）
  - **入力UI**: 6つの独立した2桁16進数入力フィールド
  - **扱い**: ハードウェア固有値として事実上固定値
  - **バリデーション**: 各フィールドは00-FFの16進数値のみ受け付け

#### 2.1.2 初期Seed生成処理
- **メッセージ生成**: 入力条件から以下のフォーマットでメッセージを生成
  - **32bit × 16個の配列構造** (data[0-15])
  - **data[0-4]**: ROMバージョン・リージョン固有のNazo値（エンディアン変換必要）
  - **data[5]**: (VCount << 16) | Timer0（Timer0部分のみエンディアン変換）
  - **data[6]**: MACアドレス下位16bit（エンディアン変換不要）
  - **data[7]**: MACアドレス上位32bit XOR GxStat XOR Frame（エンディアン変換必要）
  - **data[8]**: 日付・曜日（YYMMDDWW形式、10進数→16進数変換、エンディアン変換不要）
  - **data[9]**: 時刻（HHMMSS00形式、DS/DSLiteでは午後+0x40、10進数→16進数変換、エンディアン変換不要）
  - **data[10-11]**: 固定値0x00000000
  - **data[12]**: キー入力（エンディアン変換必要）
    - **ビット構成**: 下位から A, B, Select, Start, Right, Left, Up, Down, R, L, X, Y
    - **計算方法**: (押されたキーのビットマップ) XOR 0x2C00 XOR 0x3FF
    - **デフォルト値**: 0x2FFF（何も押していない状態）
  - **data[13-15]**: SHA-1パディング処理
    - **data[13]**: 0x80000000
    - **data[14]**: 0x00000000  
    - **data[15]**: 0x000001A0
- **詳細実装仕様**:
  - **エンディアン変換**: WebAssembly側で実装、採用言語のデファクトスタンダード手法を使用
  - **午後時刻処理**: DS/DSLiteハードウェアでのみ午後の時間に0x40を加算
  - **日時変換例**: 2023/12/31 23:59:59 日曜日 → data[8]=0x23123100, data[9]=0x23595900 (DS/DSLiteでは0x63595900)
  - **バイト順序**: メッセージ配列内はリトルエンディアンで統一
- **SHA-1ハッシュ化**: 生成されたメッセージをSHA-1アルゴリズムでハッシュ化
  - **実装方針**: 独自パディング処理またはWebAssembly対応暗号ライブラリを使用
  - **実装リファレンス**: [Project_Veni/InitSeedSearch.cs](https://github.com/niart120/Project_Veni/blob/master/VendingAbuser/InitSeedSearch.cs)
- **初期Seed抽出**: SHA-1ハッシュ結果（H0+A, H1+B）の上位32bitを初期Seedとして抽出

#### 2.1.3 探索・照合機能
- **目標Seedリスト管理**: 検索対象となる初期Seedのリスト管理
- **照合処理**: 生成された初期Seedが目標リストに含まれているかの検索
- **計算制御**: 
  - **進捗表示**: リアルタイムでの探索進捗表示
  - **途中中断**: 長時間計算の中断・再開機能
  - **結果更新**: 一致Seedの逐次表示
- **一致結果表示**: 一致した初期Seedの情報表示

### 2.2 結果表示機能

#### 2.2.1 探索結果表示
- **一致Seed情報**
  - 初期Seed値（16進数表記）
  - 対応日時
  - 入力条件詳細
  - 生成されたメッセージ内容
  - SHA-1ハッシュ値

#### 2.2.2 結果操作機能
- **ソート機能**
  - 日時順
  - Seed値順
- **フィルタリング機能**
  - 日時範囲による絞り込み
  - 重複除去
- **エクスポート機能**
  - CSV出力
  - JSON出力
  - テキスト出力

### 2.3 目標Seedリスト管理機能

#### 2.3.1 リスト入力機能
- **テキスト入力**: 改行区切りでの複数Seed値入力
  - **対応形式**: 16進数（大文字小文字不問、0xプレフィックス有無不問、0埋め有無不問）
  - **桁数**: 1-8桁（0xプレフィックス付きの場合は3-10桁）
  - **最大件数**: 1000件
- **形式検証**: 入力されたSeed値の自動形式チェック・正規化
- **エラー表示**: 不正な形式の行番号とエラー内容の表示

#### 2.3.2 リスト管理機能
- **リアルタイム検証**: 入力時の即座な形式チェック
- **重複除去**: 同一Seed値の自動重複除去
- **一括クリア**: リスト全体のクリア機能

### 2.4 設定・管理機能

#### 2.4.1 パラメータ設定管理
- **外部設定ファイル**: ROMバージョン・リージョン・ハードウェア別パラメータをJSONファイルで管理
  - **管理方法**: 外部設定ファイル（JSON）として管理
  - **設定ファイル形式**: 
    ```json
    {
      "BW": {
        "JPN": {
          "DS": { 
            "nazo": [0x12345678, 0x9ABCDEF0, ...],
            "vcount": [0x5F], 
            "timer0_min": 0x0900, 
            "timer0_max": 0x0F00 
          }
        }
      }
    }
    ```
  - **Nazo値**: 各ROM・リージョン組み合わせごとの固有パラメータ
  - **Timer0デフォルト範囲**: 推奨される範囲設定
  - **VCountデフォルト値**: バージョン別の標準値
  - **VCountオフセット**: BW2の一部バージョンで必要な補正値
- **自動設定**: ROMバージョン・リージョン・ハードウェア選択時の自動パラメータ適用
- **手動オーバーライド**: 
  - **Timer0範囲**: チェックボックスで手動設定を有効化、自動設定値をオーバーライド
  - **VCount値**: チェックボックスで手動設定を有効化、自動設定値をオーバーライド
  - **設定優先順位**: デフォルト（自動設定） → 手動設定（有効時）

#### 2.4.2 ユーザー設定
- **デフォルト値設定**
  - よく使用するROMバージョン・リージョン
  - デフォルト探索条件
  - 表示設定（テーマ、言語等）
- **保存機能**
  - 探索条件のプリセット保存
  - 結果の履歴保存

#### 2.4.3 データ管理
- **履歴管理**
  - 探索履歴
  - 成功実績
- **インポート/エクスポート**
  - 設定データの移行
  - 目標Seedリストの共有

## 3. 非機能要件

### 3.1 性能要件
- **応答時間**: 探索開始までの応答時間1秒以内
- **計算制御**: 長時間計算の途中中断・再開機能
- **進捗表示**: リアルタイムでの計算進捗・残り時間表示
- **同時実行**: 複数の探索を並行実行可能
- **メモリ使用量**: ブラウザのメモリ制限内での動作

### 3.2 ユーザビリティ要件
- **直感的操作**: 乱数調整初心者でも理解可能なUI
- **レスポンシブ対応**: PC・タブレット・スマートフォン対応
- **アクセシビリティ**: キーボード操作、スクリーンリーダー対応

### 3.3 互換性要件
- **ブラウザ対応**: Chrome, Firefox, Safari, Edge（最新版）
- **オフライン動作**: PWA対応による部分的オフライン機能

### 3.4 セキュリティ要件
- **クライアントサイド処理**: 個人データの外部送信なし
- **データ保護**: ローカルストレージの適切な利用

## 4. 技術仕様

### 4.1 アーキテクチャ
- **フロントエンド中心**: SPAとして実装
- **サーバーレス**: 静的ファイル配信のみ
- **モジュラー設計**: 機能別モジュール分割

### 4.2 技術スタック

#### 4.2.1 フロントエンド
- **フレームワーク**: React 18 + TypeScript
- **ビルドツール**: Vite
- **UI ライブラリ**: **Material-UI v5** (@mui/material)
  - **選択理由**: 豊富なコンポーネント、アクセシビリティ対応、数値入力フォームに適した機能
  - **追加パッケージ**: @mui/icons-material, @mui/x-data-grid（結果表示用）
- **状態管理**: **Zustand**
  - **選択理由**: シンプルな状態管理、TypeScript対応良好、フォーム中心アプリに適している
  - **管理対象**: 探索条件、計算進捗、結果データ、UI状態
- **ルーティング**: React Router v6

#### 4.2.2 計算エンジン
- **言語**: TypeScript（フロントエンド）+ WebAssembly（計算処理）
- **WebAssembly**:
  - **用途**: エンディアン変換、SHA-1ハッシュ計算の高速化
  - **実装言語**: **Rust**（第一候補、wasm-packでビルド）
    - **選択理由**: メモリ安全性、WebAssembly生態系の充実、豊富な暗号ライブラリ（sha1クレート等）
  - **暗号処理**: Rustの`sha1`クレートまたは`ring`クレートを使用 
  - **エンディアン変換**: Rustの`byteorder`クレートを使用
  - **ビルドツール**: `wasm-pack` + `wasm-bindgen`
- **数値計算**: BigInt対応
- **並行処理**: Web Workers活用
- **参考実装**: パフォーマンス最適化のため各種実装をフルスクラッチ実装する場合は次のC#実装を参考にすること。各種計算処理は **決して** TypeScriptで実装しないこと。 [Project_Veni/InitSeedSearch.cs](https://github.com/niart120/Project_Veni/blob/master/VendingAbuser/InitSeedSearch.cs) 

#### 4.2.3 データ管理
- **ローカルストレージ**: localStorage/IndexedDB
- **データ形式**: JSON
- **キャッシュ戦略**: LRU キャッシュ

### 4.3 データ構造

#### 4.3.1 探索条件
```typescript
interface SearchConditions {
  romVersion: 'B' | 'W' | 'B2' | 'W2';
  romRegion: 'JPN' | 'KOR' | 'USA' | 'GER' | 'FRA' | 'SPA' | 'ITA';
  hardware: 'DS' | 'DS_LITE' | '3DS';
  
  // Timer0/VCount条件
  timer0Range: {
    min: number;
    max: number;
    useAutoRange: boolean;  // 自動範囲設定の使用フラグ
  };
  vcountRange: {
    min: number;
    max: number;
    useAutoRange: boolean;  // 自動範囲設定の使用フラグ
  };
  
  // 日時条件（2000-2099年対応）
  dateRange: {
    startYear: number;    // 2000-2099
    endYear: number;      // 2000-2099
    startMonth: number;   // 1-12
    endMonth: number;     // 1-12
    startDay: number;     // 1-31
    endDay: number;       // 1-31
    startHour: number;    // 0-23
    endHour: number;      // 0-23
    startMinute: number;  // 0-59
    endMinute: number;    // 0-59
    startSecond: number;  // 0-59
    endSecond: number;    // 0-59
  };
  
  // キー入力状態（ビットマップ）
  keyInput: number;  // 12bitのビットマップ（A,B,Select,Start,Right,Left,Up,Down,R,L,X,Y）
  
  // MACアドレス（6バイト）
  macAddress: number[];  // [0xNN, 0xNN, 0xNN, 0xNN, 0xNN, 0xNN]
}
```

#### 4.3.2 ROMパラメータ定義
```typescript
interface ROMParameters {
  nazo: number[];           // Nazo値配列（5要素）
  defaultVCount: number;    // デフォルトVCount値
  timer0Min: number;        // Timer0最小値
  timer0Max: number;        // Timer0最大値
  vcountOffset?: VCountOffsetRule[];  // VCountズレ補正ルール（BW2の一部バージョンのみ）
}

interface VCountOffsetRule {
  timer0Min: number;        // 適用するTimer0範囲の最小値
  timer0Max: number;        // 適用するTimer0範囲の最大値
  vcountValue: number;      // 該当範囲でのVCount値
}

// VCountズレの具体例（外部JSONファイル）
{
  "BW2": {
    "GER": {
      "DS": {
        "nazo": [...],
        "defaultVCount": 0x81,
        "timer0Min": 0x10E5,
        "timer0Max": 0x10EC,
        "vcountOffset": [
          { "timer0Min": 0x10E5, "timer0Max": 0x10E8, "vcountValue": 0x81 },
          { "timer0Min": 0x10E9, "timer0Max": 0x10EC, "vcountValue": 0x82 }
        ]
      }
    },
    "ITA": {
      "DS": {
        "nazo": [...],
        "defaultVCount": 0x82,
        "timer0Min": 0x1107,
        "timer0Max": 0x110D,
        "vcountOffset": [
          { "timer0Min": 0x1107, "timer0Max": 0x1109, "vcountValue": 0x82 },
          { "timer0Min": 0x1109, "timer0Max": 0x110D, "vcountValue": 0x83 }
        ]
      }
    }
  }
}
```
```typescript
interface ROMParameters {
  nazo: number[];        // Nazo値配列（5個）
  vcount: number;        // VCount値
  timer0Range: {         // Timer0の範囲
    min: number;
    max: number;
  };
  vcountOffset?: number; // VCountズレ対応（BW2の一部）
}

// 外部JSONファイルでの管理例
interface ParameterConfig {
  [romVersion: string]: {  // 'B', 'W', 'B2', 'W2'
    [romRegion: string]: { // 'JPN', 'KOR', 'USA', 'GER', 'FRA', 'SPA', 'ITA'
      nazo: number[];      // 5個のNazo値
      vcount: number;      // デフォルトVCount値
      timer0Range: {       // デフォルトTimer0範囲
        min: number;
        max: number;
      };
      vcountOffset?: number; // 必要な場合のみ
    };
  };
}
```

#### 4.3.3 初期Seed情報
```typescript
interface InitialSeedResult {
  seed: number;              // 初期Seed値（32bit）
  datetime: Date;            // 対応日時
  timer0: number;            // Timer0値
  conditions: SearchConditions; // 生成条件
  message: number[];         // 生成されたメッセージ（32bit × 16個）
  sha1Hash: string;          // SHA-1ハッシュ値（16進数）
  isMatch: boolean;          // 目標リストとの一致フラグ
}
```

#### 4.3.4 目標Seedリスト
```typescript
interface TargetSeedList {
  seeds: number[];           // 目標となる初期Seed配列（32bit値）
}

// 入力形式の例
interface SeedInputFormat {
  rawInput: string;          // ユーザー入力の生テキスト（改行区切り）
  validSeeds: number[];      // 正規化済みの有効なSeed配列
  errors: {                  // 入力エラー情報
    line: number;
    value: string;
    error: string;
  }[];
}
```

## 5. 画面設計

### 5.1 画面構成
1. **メイン画面**: 探索条件入力・実行
2. **結果画面**: 探索結果表示・操作
3. **目標Seedリスト管理画面**: 目標Seedの管理
4. **設定画面**: アプリ設定・プリセット管理
5. **ヘルプ画面**: 使い方説明・FAQ

### 5.2 画面遷移
- タブベースナビゲーション
- モーダルによる詳細表示
- ブラウザ履歴との連携

## 6. 実装計画

### 6.1 開発フェーズ

#### Phase 1: MVP（最小実行可能プロダクト）実装
**目標**: 基本的な初期Seed探索機能の実現

1. **プロジェクト初期化・環境構築**
   - Vite + React + TypeScript環境構築
   - Material-UI v5セットアップ
   - WebAssembly (Rust) 開発環境構築

2. **WebAssembly計算エンジン実装**
   - Rustでのエンディアン変換機能
   - SHA-1ハッシュ計算機能
   - メッセージ生成ロジック
   - wasm-packによるビルド設定

3. **基本UI実装**
   - 探索条件入力フォーム（ROMバージョン・リージョン・ハードウェア選択）
   - 日時範囲指定UI（年月日時分秒の個別指定）
   - Timer0/VCount自動設定・手動オーバーライドUI
   - MACアドレス入力フィールド（6つの16進数入力）
   - キー入力設定UI

4. **初期Seed探索・照合機能**
   - 目標Seedリスト管理（テキスト入力・形式検証）
   - 探索実行・進捗表示
   - 中断・再開機能
   - 基本結果表示テーブル

5. **外部設定ファイル管理**
   - ROMパラメータJSON設定ファイル
   - VCountズレ補正ルール適用

**MVP完成基準**: 
- 全28バージョンでの基本的な初期Seed探索が動作
- 目標Seedとの照合結果が正確に表示
- 長時間計算の中断・再開が可能

#### Phase 2: 機能拡張
**※MVP完成後に実装**

1. **結果操作機能**
   - ソート・フィルタリング機能
   - CSV・JSON・テキストエクスポート機能
   - 重複除去・結果統計表示

2. **ユーザー設定・プリセット機能**
   - 探索条件のプリセット保存・呼び出し
   - よく使用する設定のデフォルト化
   - 履歴管理機能

3. **ファイルインポート/エクスポート機能**
   - 目標Seedリストのファイル読み込み
   - 設定データの移行機能

#### Phase 3: UX向上
**※Phase 2完成後に実装**

1. **レスポンシブ対応**
   - タブレット・スマートフォン対応
   - Material-UIブレークポイント活用

2. **PWA対応**
   - オフライン動作機能
   - アプリケーション化

3. **パフォーマンス最適化**
   - WebAssembly最適化
   - Bundle分割・遅延読み込み

4. **エラーハンドリング強化**
   - ユーザーフレンドリーなエラーメッセージ
   - 回復処理の自動化

#### Phase 4: 仕上げ
**※Phase 3完成後に実装**

1. **テスト実装**
   - Unit Test（Jest + React Testing Library）
   - WebAssembly関数のテスト
   - E2E Test（Playwright）

2. **ドキュメント整備**
   - ユーザーマニュアル
   - 開発者向けドキュメント
   - API仕様書

3. **デプロイ・運用準備**
   - CI/CDパイプライン構築
   - 静的サイトホスティング設定
   - 監視・分析ツール導入

### 6.2 品質管理
- **テスト戦略**: Unit Test、Integration Test、E2E Test
- **コード品質**: ESLint、Prettier、TypeScript strict mode
- **パフォーマンス**: Lighthouse、Bundle Analyzer

## 7. 運用・保守

### 7.1 デプロイ
- **静的サイトホスティング**: Vercel、Netlify、GitHub Pages等
- **CI/CD**: GitHub Actions
- **ドメイン**: カスタムドメイン設定

### 7.2 監視・分析
- **エラー監視**: Sentry等
- **使用状況分析**: Google Analytics等（プライバシー配慮）

### 7.3 更新・保守
- **定期更新**: 依存関係の更新
- **機能追加**: ユーザーフィードバックに基づく改善
- **バグ修正**: 迅速な対応体制

---

## 付録

### A. 用語集
- **初期Seed**: SHA-1ハッシュから生成される乱数生成の初期値（32bit）
- **SHA-1**: セキュアハッシュアルゴリズム1、メッセージから160bitのハッシュ値を生成
- **Nazo値**: ROMバージョン・リージョン固有のパラメータ（5個の32bit値）
- **Timer0**: DS起動時のタイマー値（ROMバージョン・リージョンにより範囲が異なる）
- **VCount**: 垂直同期カウンタ値（ROMバージョンにより固定値が異なる）
- **VCountズレ**: BW2の一部バージョンで発生するVCount値の補正現象
- **Frame値**: ハードウェア依存のパラメータ（DS=8, DS Lite=6, 3DS=9）
- **GxStat**: グラフィックス統計値（固定値0x06000000）
- **エンディアン変換**: バイト順序の変換（0xPpQqRrSs → 0xSsRrQqPp）

### B. 参考資料
- ポケモン第5世代初期Seed生成アルゴリズム資料
  - https://sugarchud1152.hatenablog.com/entry/2025/05/11/130050
  - https://rusted-coil.sakura.ne.jp/pokemon/ran/ran_2.htm
  - https://xxsakixx.com/archives/53922673.html
- SHA-1ハッシュアルゴリズム仕様
  - https://github.com/niart120/Project_Veni/blob/master/VendingAbuser/InitSeedSearch.cs
- 各ROMバージョン・リージョンによる差分資料
  - https://blog.bzl-web.com/entry/2020/09/18/235128

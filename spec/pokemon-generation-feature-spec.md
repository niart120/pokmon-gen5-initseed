# ポケモン生成機能 仕様書

## 1. 概要

### 1.1 目的
LCG初期Seed値から、ポケモンBW/BW2において遭遇するポケモンの詳細情報（性格、特性、個体値、色違い等）を計算・表示する機能を実装する。

### 1.2 対象ゲーム
- ポケットモンスターブラック・ホワイト（第5世代）
- ポケットモンスターブラック2・ホワイト2（第5世代）

### 1.3 対象遭遇方法
- 野生ポケモン（草むら、洞窟等）
- 固定シンボル（伝説ポケモン、配布ポケモン等）
- つりポケモン（つりざお使用）

## 2. 機能要件

### 2.1 入力条件

#### 2.1.1 基本パラメータ
- **初期Seed値**: 64bit値（16進数表記）
- **遭遇方法**: 野生/固定シンボル/つり
- **シンクロ設定**: シンクロ有効/無効、対象性格
- **表ID**: トレーナーID（16bit、0-65535）
- **裏ID**: 秘密ID（16bit、0-65535）

#### 2.1.2 遭遇方法別パラメータ

##### 野生ポケモン
- **出現場所**: エリア情報（ルート、ダンジョン名等）
- **出現方法**: 通常, 揺れる草むら、泡、砂ぼこり、ポケモンの影

##### 固定シンボル
- **ポケモン種族**: 具体的なポケモン名
- **固定レベル**: 遭遇時のレベル
- **配布イベント情報**: 該当する場合

##### つりポケモン
- **つり場所**: 水域の場所情報
- **出現方法**: 通常、泡

### 2.2 出力情報

#### 2.2.1 基本ポケモン情報
- **ポケモン名**: 種族名
- **レベル**: 遭遇時レベル
- **性格**: 25種類の性格のいずれか
- **特性**: 通常特性1/2
- **個体値**: HP/攻撃/防御/特攻/特防/素早さ（各0-31）

#### 2.2.2 乱数関連情報
- **色違い判定**: 色違い/通常色
- **性別**: オス/メス/性別不明（種族による）
- **実乱数値**: 生成された乱数値（デバッグ用）
- **消費乱数**: 初期Seedからの消費数

#### 2.2.3 追加情報
- **シンクロ効果**: シンクロが適用されたかの判定
- **レポ針位置**: セーブデータの位置（該当する場合）

### 2.3 表示機能

#### 2.3.1 リスト表示
- **表形式**: 複数の生成結果を一覧表示
- **ソート機能**: 消費乱数順、性格順、色違い優先等
- **フィルタリング**: 検索条件によるフィルタリング、色違いのみ、特定性格のみ等

#### 2.3.2 詳細表示
- **個別詳細**: 各ポケモンの詳細情報

## 3. 技術仕様

### 3.1 データ構造

#### 3.1.1 入力パラメータ
```typescript
interface PokemonGenerationInput {
  // 基本パラメータ
  initialSeed: number;          // 初期Seed値（32bit）
  encounterType: EncounterType; // 遭遇方法
  trainerId: number;            // 表ID（0-65535）
  secretId: number;             // 裏ID（0-65535）
  
  // シンクロ設定
  synchronize: {
    enabled: boolean;           // シンクロ有効/無効
    nature?: PokemonNature;     // 対象性格（有効時）
  };
  
  // 遭遇方法別パラメータ
  encounterParams: WildEncounter | StaticEncounter | FishingEncounter;
  
  // 生成範囲
  generationRange: {
    maxCount: number;           // 最大生成数（デフォルト100）
    maxAdvances: number;        // 最大乱数消費数（デフォルト10000）
  };
}

type EncounterType = 'wild' | 'static' | 'fishing';

interface WildEncounter {
  location: string;             // 出現場所
  levelRange: {
    min: number;
    max: number;
  };
}

interface StaticEncounter {
  pokemonSpecies: string;       // ポケモン種族名
  level: number;                // 固定レベル
  eventInfo?: string;           // 配布イベント情報
}

interface FishingEncounter {
  location: string;             // つり場所
  levelRange: {
    min: number;
    max: number;
  };
}
```

#### 3.1.2 出力データ
```typescript
interface GeneratedPokemon {
  // 基本情報
  species: string;              // ポケモン種族名
  level: number;                // レベル
  nature: PokemonNature;        // 性格
  ability: PokemonAbility;      // 特性
  gender: 'male' | 'female' | 'genderless'; // 性別
  
  // 個体値
  ivs: {
    hp: number;                 // HP個体値（0-31）
    attack: number;             // 攻撃個体値（0-31）
    defense: number;            // 防御個体値（0-31）
    specialAttack: number;      // 特攻個体値（0-31）
    specialDefense: number;     // 特防個体値（0-31）
    speed: number;              // 素早さ個体値（0-31）
  };
  
  // 乱数関連
  isShiny: boolean;             // 色違い判定
  pid: number;                  // ポケモンID（32bit）
  encounterSlot: number;        // 遭遇スロット
  
  // メタ情報
  advances: number;             // 乱数消費数
  rngValues: number[];          // 使用された乱数値（デバッグ用）
  synchronizeApplied: boolean;  // シンクロ適用フラグ
  frame: number;                // フレーム数（計算用）
}

type PokemonNature = 
  'Hardy' | 'Lonely' | 'Brave' | 'Adamant' | 'Naughty' |
  'Bold' | 'Docile' | 'Relaxed' | 'Impish' | 'Lax' |
  'Timid' | 'Hasty' | 'Serious' | 'Jolly' | 'Naive' |
  'Modest' | 'Mild' | 'Quiet' | 'Bashful' | 'Rash' |
  'Calm' | 'Gentle' | 'Sassy' | 'Careful' | 'Quirky';

interface PokemonAbility {
  name: string;                 // 特性名
  slot: 1 | 2 | 'hidden';       // 特性スロット
}
```

### 3.2 計算アルゴリズム

#### 3.2.1 LCG（線形合同法）
ポケモンBW/BW2で使用される乱数生成式：
```
次の乱数 = (現在の乱数 × 0x41C64E6D + 0x6073) & 0xFFFFFFFF
```

#### 3.2.2 ポケモン生成手順(WIP)

##### Step 1: 遭遇判定
1. 野生の場合：遭遇スロット決定（乱数消費1回）
2. つりの場合：つり成功判定 + スロット決定
3. 固定の場合：スキップ

##### Step 2: ポケモン基本情報生成
1. **性格決定**（乱数消費1回）
   - シンクロ有効時：50%で指定性格、50%でランダム
   - シンクロ無効時：25種類からランダム選択
   
2. **特性決定**（乱数消費1回）
   - 通常特性：0-1で特性1/2決定
   - 隠れ特性：遭遇方法により判定

##### Step 3: 個体値生成
各能力値の個体値を順次生成（乱数消費6回）
- HP、攻撃、防御、特攻、特防、素早さの順

##### Step 4: 色違い・性別判定
1. **PID生成**（乱数消費2回）
   - 上位16bit、下位16bitを別々に生成
   
2. **色違い判定**
   ```
   shinyValue = (trainerId ^ secretId ^ pidHigh ^ pidLow) < 8
   ```
   
3. **性別判定**
   - 種族の性別比率に基づいて判定

### 3.3 実装方針

#### 3.3.1 計算エンジン
- **WebAssembly（Rust）**: 高速な乱数生成・計算処理
- **TypeScript**: UI・データ管理・表示処理

#### 3.3.2 ポケモンデータ
- **データベース**: 種族情報、特性、レベル範囲等
- **JSON形式**: 静的データとして管理
- **遭遇テーブル**: 場所別の出現ポケモン情報

#### 3.3.3 パフォーマンス考慮
- **バッチ処理**: 大量生成時の効率化
- **プログレス表示**: 長時間計算の進捗表示
- **結果キャッシュ**: 同条件での再計算回避

## 4. UI設計

### 4.1 入力画面
- **シンプルなフォーム**: 必要最小限の入力項目
- **プリセット機能**: よく使用する設定の保存
- **バリデーション**: 入力値の検証・エラー表示

### 4.2 結果画面
- **表形式表示**: スプレッドシート風の見やすい表示
- **色分け**: 色違い、理想個体値等の強調表示
- **エクスポート**: CSV、JSON形式での出力

### 4.3 設定画面
- **詳細設定**: 上級者向けオプション
- **データ管理**: ポケモンデータの更新・管理

## 5. データ要件

### 5.1 ポケモン種族データ
```typescript
interface PokemonSpecies {
  id: number;                   // 全国図鑑番号
  name: string;                 // ポケモン名
  abilities: string[];          // 通常特性1, 2, 隠れ特性
  genderRatio: number;          // 性別比率（-1:性別不明, 0-254）
}
```

### 5.2 遭遇テーブル(WIP)
```typescript
interface EncounterTable {
  location: string;             // 場所名
  encounterType: EncounterType; // 遭遇方法
  slots: EncounterSlot[];       // 遭遇スロット情報
}

interface EncounterSlot {
  pokemon: string;              // ポケモン種族名
  probability: number;          // 出現確率（%）
  levelRange: {
    min: number;
    max: number;
  };
  conditions?: {                // 出現条件
    timeOfDay?: string[];
    season?: string[];
    special?: string;           // 特殊条件
  };
}
```

## 6. 拡張性考慮

### 6.1 将来対応
- **新機能追加**: めざめるパワー等

### 6.2 モジュール設計
- **計算エンジン分離**: 他プロジェクトでの再利用
- **データ層分離**: ポケモンデータの独立管理
- **UI層分離**: 表示形式の柔軟な変更

## 7. テスト要件

### 7.1 単体テスト
- **乱数生成テスト**: 正確性の検証
- **ポケモン生成テスト**: 各パラメータの正確性
- **色違い判定テスト**: 色違い計算の検証

### 7.2 統合テスト
- **大量データテスト**: パフォーマンス検証
- **エッジケーステスト**: 境界値の動作確認

### 7.3 受け入れテスト
- **実用性テスト**: 実際の乱数調整での使用
- **UI操作テスト**: ユーザビリティの確認

## 8. 参考資料

### 8.1 技術資料
- [ポケモン第5世代乱数調整](https://rusted-coil.sakura.ne.jp/pokemon/ran/ran_5.htm) : 乱数調整の基礎
- [BWなみのり、つり、大量発生野生乱数](https://xxsakixx.com/archives/53402929.html) :
  なみのりやつり、大量発生の個体生成
- [BW出現スロットの閾値](https://xxsakixx.com/archives/53962575.html) : 出現スロットの計算方法


### 8.2 データソース
- [ポケモン攻略DE.com](http://blog.game-de.com/pokedata/pokemon-data/) : ポケモン種族データ
- [ポケモンの友(B)](https://pokebook.jp/data/sp5/enc_b) : ブラックの遭遇テーブル
- [ポケモンの友(W)](https://pokebook.jp/data/sp5/enc_w) : ホワイトの遭遇テーブル
- [ポケモンの友(B2)](https://pokebook.jp/data/sp5/enc_b2) : ブラック2の遭遇テーブル
- [ポケモンの友(W2)](https://pokebook.jp/data/sp5/enc_w2) : ホワイト2の遭遇テーブル

---

**作成日**: 2025年8月2日  
**バージョン**: 1.0  
**作成者**: GitHub Copilot  
**レビュー状況**: 初版

# ポケモン生成機能 データ仕様書

## 1. 概要

ポケモンBW/BW2のポケモン生成機能で使用するデータ構造と、それらのデータファイルの仕様を定義する。

## 2. ポケモン種族データ

### 2.1 基本種族情報

```typescript
interface PokemonSpeciesData {
  // 基本情報
  nationalId: number;           // 全国図鑑番号
  name: {
    japanese: string;           // 日本語名
    english: string;            // 英語名
  };
  
  // 生物学的情報
  types: [PokemonType] | [PokemonType, PokemonType]; // タイプ
  abilities: {
    ability1: string;           // 通常特性1
    ability2?: string;          // 通常特性2（存在する場合）
    hidden?: string;            // 隠れ特性（存在する場合）
  };
  
  // 性別・遭遇情報
  genderRatio: GenderRatio;     // 性別比率
  encounterRate: number;        // 基本遭遇率
  baseStats: BaseStats;         // 種族値
}

type PokemonType = 
  'Normal' | 'Fire' | 'Water' | 'Electric' | 'Grass' | 'Ice' |
  'Fighting' | 'Poison' | 'Ground' | 'Flying' | 'Psychic' | 'Bug' |
  'Rock' | 'Ghost' | 'Dragon' | 'Dark' | 'Steel';

interface GenderRatio {
  type: 'fixed' | 'ratio' | 'genderless';
  // type: 'fixed' -> 単性（オスのみ、メスのみ）
  // type: 'ratio' -> 性別比率あり
  // type: 'genderless' -> 性別不明
  
  maleRatio?: number;           // オス率（0.0-1.0、ratioの場合のみ）
  fixedGender?: 'male' | 'female'; // 固定性別（fixedの場合のみ）
}

interface BaseStats {
  hp: number;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
}
```

### 2.2 JSONファイル例

```json
{
  "species": [
    {
      "nationalId": 1,
      "name": {
        "japanese": "フシギダネ",
        "english": "Bulbasaur"
      },
      "types": ["Grass", "Poison"],
      "abilities": {
        "ability1": "しんりょく",
        "hidden": "ようりょくそ"
      },
      "genderRatio": {
        "type": "ratio",
        "maleRatio": 0.875
      },
      "encounterRate": 45,
      "baseStats": {
        "hp": 45,
        "attack": 49,
        "defense": 49,
        "specialAttack": 65,
        "specialDefense": 65,
        "speed": 45
      }
    }
  ]
}
```

## 3. 遭遇テーブルデータ

### 3.1 場所別遭遇情報

```typescript
interface LocationEncounterData {
  locationId: string;           // 場所ID
  locationName: {
    japanese: string;
    english: string;
  };
  
  encounters: {
    wild?: WildEncounterData;   // 野生遭遇データ
    fishing?: FishingEncounterData; // つり遭遇データ
    surfing?: SurfingEncounterData; // なみのり遭遇データ
  };
}

interface WildEncounterData {
  encounterType: 'grass' | 'cave' | 'building'; // 遭遇場所タイプ
  
  slots: EncounterSlot[];       // 遭遇スロット（通常12スロット）
}

interface FishingEncounterData {
  slots: EncounterSlot[];
}

interface SurfingEncounterData {
  slots: EncounterSlot[];
}

// エンカウントタイプ定義（WASM実装に準拠）
type EncounterType =
  | 0  // Normal: 通常(草むら・洞窟・ダンジョン)
  | 1  // Surfing: なみのり
  | 2  // Fishing: 釣り
  | 3  // ShakingGrass: 揺れる草むら
  | 4  // DustCloud: 砂煙
  | 5  // PokemonShadow: ポケモンの影
  | 6  // SurfingBubble: 水泡(なみのり)
  | 7  // FishingBubble: 水泡(釣り)
  | 10 // StaticSymbol: 固定シンボル
  | 11 // StaticGift: ギフト
  | 20 // Roaming: 徘徊

interface EncounterSlot {
  slotId: number;               // スロット番号（0-11通常、つりは異なる）
  pokemon: string;              // ポケモン種族名
  probability: number;          // 出現確率（%）
  levelRange: {                 // レベル範囲(通常は固定、釣りは変動)
    min: number;
    max: number;
  };
  encounterType: EncounterType; // エンカウントタイプ（WASM実装に準拠）
  levelRandValue?: number;      // WASMから受け取る生乱数値（TypeScript側でレベル計算に使用）
  // 特殊条件
  conditions?: {
    gameVersion?: ('B' | 'W' | 'B2' | 'W2')[];
    special?: string;           // 特殊な出現条件
  };
}
```

### 3.2 JSONファイル例

```json
{
  "locations": [
    {
      "locationId": "route-1",
      "locationName": {
        "japanese": "1番道路",
        "english": "Route 1"
      },
      "region": "unova",
      "encounters": {
        "wild": {
          "encounterType": "grass",
          "slots": [
            {
              "slotId": 0,
              "pokemon": "Patrat",
              "probability": 50,
              "levelRange": { "min": 2, "max": 4 }
            },
            {
              "slotId": 1,
              "pokemon": "Lillipup",
              "probability": 50,
              "levelRange": { "min": 2, "max": 4 }
            }
          ]
        }
      }
    }
  ]
}
```

## 4. 固定シンボルデータ

### 4.1 固定シンボル情報

```typescript
interface StaticEncounterData {
  encounterId: string;          // 遭遇ID
  pokemon: string;              // ポケモン種族名
  encounterName: {
    japanese: string;
    english: string;
  };
  level: number;                // 固定レベル
  location: string;             // 遭遇場所ID
  encounterType: EncounterType; // エンカウントタイプ（10:固定, 11:ギフト, 20:徘徊等）
  levelRandValue?: number;      // WASMから受け取る生乱数値（徘徊等で使用）
  // 特殊情報
  isLegendary: boolean;         // 伝説ポケモンフラグ
  isMythical: boolean;          // 幻のポケモンフラグ
  isEvent: boolean;             // 配布イベントフラグ
  isBlockRoutine: boolean;      // ブロックルーチンフラグ（色違いブロック）
  // 出現条件
  conditions?: {
    gameVersion?: ('B' | 'W' | 'B2' | 'W2')[];
  };
}

interface IVSet {
  hp: number;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
}
```

### 4.2 JSONファイル例

```json
{
  "staticEncounters": [
    {
      "encounterId": "reshiram-n-castle",
      "pokemon": "Reshiram",
      "encounterName": {
        "japanese": "Nの城のレシラム",
        "english": "Reshiram at N's Castle"
      },
      "level": 50,
      "location": "n-castle",
      "isLegendary": true,
      "isMythical": false,
      "isEvent": false,
    　"isBlockRoutine": true,
      "conditions": {
        "gameVersion": ["B"]
      }
    }
  ]
}
```

## 5. 性格・特性データ

### 5.1 性格データ

```typescript
interface NatureData {
  id: number;                   // 性格ID（0-24）
  name: {
    japanese: string;
    english: string;
  };
  statModifier: {
    increased?: StatType;       // 上昇ステータス
    decreased?: StatType;       // 下降ステータス
  };
  synchronizable: boolean;      // シンクロ対象フラグ
  syncApplied?: boolean;        // シンクロ判定結果（WASM側で決定）
}

type StatType = 'hp' | 'attack' | 'defense' | 'specialAttack' | 'specialDefense' | 'speed';
```

### 5.2 特性データ

```typescript
interface AbilityData {
  id: number;                   // 特性ID
  name: {
    japanese: string;
    english: string;
  };
  description: {
    japanese: string;
    english: string;
  };
  
  // 戦闘・フィールドでの効果フラグ
  effects: {
    battle: boolean;
    field: boolean;
    encounter: boolean;         // 遭遇時効果
  };
}
```

## 6. 乱数テーブルデータ

### 6.1 遭遇スロットテーブル(WIP)

```typescript
interface EncounterSlotTable {
  tableType: 'standard' | 'fishing' | 'surfing';
  
  // 標準12スロットテーブル（野生）
  standardSlots?: {
    slot: number;               // スロット番号
    rngRange: [number, number]; // 乱数範囲
    probability: number;        // 確率（%）
  }[];
  
  // つり専用テーブル
  fishingSlots?: {
    slots: {
      slot: number;
      rngRange: [number, number];
      probability: number;
    }[];
  }[];
}
```

## 7. データファイル構成

```
/src/data/pokemon-generation/
├── species/
│   ├── gen5-species.json           # BW/BW2ポケモン種族データ
│   └── species-index.json          # 種族データインデックス
├── encounters/
│   ├── bw-encounters.json          # BWの遭遇データ
│   ├── bw2-encounters.json         # BW2の遭遇データ
│   └── static-encounters.json      # 固定シンボルデータ
├── game-data/
│   ├── natures.json                # 性格データ
│   ├── abilities.json              # 特性データ
│   └── encounter-tables.json       # 遭遇テーブル定義
└── constants/
    ├── game-constants.json         # ゲーム定数
    └── rng-constants.json          # 乱数関連定数
```

## 8. データ検証

### 8.1 整合性チェック
- ポケモン種族データと遭遇データの整合性
- 参照の正当性（存在しないポケモン名の参照等）
- レベル範囲の妥当性

### 8.2 データソース
- **ポケモン公式データ**: 種族値、タイプ、特性
- **解析データ**: 遭遇テーブル、乱数アルゴリズム
- **コミュニティ検証**: 実機での動作確認結果

## 9. データ更新・管理
## 10. WASM連携用ポケモン生成データ構造

WASM実装の RawPokemonData 構造に準拠したデータ定義：

```typescript
interface RawPokemonData {
  personalityValue: number;     // 性格値（PID）
  encounterSlotValue: number;   // 遭遇スロット値
  natureId: number;             // 性格ID
  syncApplied: boolean;         // シンクロ適用フラグ
  advances: number;             // 乱数消費回数
  levelRandValue: number;       // 生のレベル乱数値（TypeScript側でレベル計算に使用）
  shinyFlag: boolean;           // 色違いフラグ
  abilitySlot: number;          // 特性スロット（(personalityValue >> 16) & 1 で決定、1/2）
  genderValue: number;          // 性別判定値
  rngSeedUsed: number;          // 使用された乱数シード
  encounterType: EncounterType; // エンカウントタイプ
}
```

### 色違い判定仕様
- 色違い判定は `shinyFlag` フィールドで管理し、判定ロジックは `(TID ^ SID ^ PID_high ^ PID_low) < 8` に準拠。
- 必要に応じて `shinyValue: number` フィールドを追加可能。

### 9.1 バージョン管理
- データファイルのバージョン番号
- 変更履歴の記録
- 後方互換性の維持

### 9.2 データ検証ツール
- JSONスキーマによる構造検証
- データ整合性チェックスクリプト
- 自動テストによる品質保証

---

**作成日**: 2025年8月2日  
**バージョン**: 1.0  
**作成者**: GitHub Copilot  
**依存**: pokemon-generation-feature-spec.md

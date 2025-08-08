/**
 * RawPokemonData - WASM出力データの型定義
 * WASM RawPokemonData構造体に対応するTypeScript型定義
 */

/**
 * 生ポケモンデータ - WASM出力の直接的な型表現
 * Rust側のRawPokemonData構造体のgetter methodsと対応
 */
export interface RawPokemonData {
  /** 初期シード値 */
  seed: bigint;
  /** PID (32bit) */
  pid: number;
  /** 性格値 (0-24) */
  nature: number;
  /** シンクロ適用フラグ */
  sync_applied: boolean;
  /** 特性スロット (0-1) */
  ability_slot: number;
  /** 性別値 (0-255) */
  gender_value: number;
  /** 遭遇スロット値 */
  encounter_slot_value: number;
  /** エンカウントタイプ (0-7: 野生, 10-13: 固定, 20: 徘徊) */
  encounter_type: number;
  /** レベル乱数値 */
  level_rand_value: number;
  /** 色違いタイプ (0: NotShiny, 1: Square, 2: Star) */
  shiny_type: number;
}

/**
 * 解析済みポケモンデータ - placeholder値処理とユーティリティ情報を含む
 */
export interface ParsedPokemonData extends RawPokemonData {
  /** 計算済みレベル (level_rand_valueから算出) */
  calculated_level?: number;
  /** 実際のポケモン種族ID (encounter_slot_valueから変換) */
  species_id?: number;
  /** 性別 ('M' | 'F' | 'N') - gender_valueから判定 */
  gender?: 'M' | 'F' | 'N';
  /** 特性名またはID - ability_slotから決定 */
  ability?: string | number;
  /** 性格名 - natureから変換 */
  nature_name?: string;
  /** 色違い状態の詳細情報 */
  shiny_info?: ShinyInfo;
}

/**
 * 色違い情報
 */
export interface ShinyInfo {
  /** 色違いかどうか */
  is_shiny: boolean;
  /** 色違いタイプ */
  type: 'normal' | 'square' | 'star';
  /** 色違い値 (TID ^ SID ^ PID_high ^ PID_low) */
  shiny_value?: number;
}

/**
 * placeholder値の種類
 * 0, 127, 255など特別な意味を持つ値
 */
export enum PlaceholderValue {
  /** 無効値・未設定 */
  INVALID = 0,
  /** 中間値・デフォルト */
  DEFAULT = 127,
  /** 最大値・確定 */
  MAX = 255,
}

/**
 * エンカウントタイプ列挙
 * WASM側のEncounterTypeと対応
 */
export enum EncounterType {
  Normal = 0,
  Surfing = 1,
  Fishing = 2,
  ShakingGrass = 3,
  DustCloud = 4,
  PokemonShadow = 5,
  SurfingBubble = 6,
  FishingBubble = 7,
  StaticSymbol = 10,
  StaticStarter = 11,
  StaticFossil = 12,
  StaticEvent = 13,
  Roaming = 20,
}

/**
 * 色違いタイプ列挙
 * WASM側のShinyTypeと対応
 */
export enum ShinyType {
  Normal = 0,
  Square = 1,
  Star = 2,
}

/**
 * 性格ID→性格名マッピング
 */
export const NATURE_NAMES: readonly string[] = [
  'がんばりや', 'さみしがり', 'ゆうかん', 'いじっぱり', 'やんちゃ',
  'ずぶとい', 'すなお', 'のんき', 'わんぱく', 'のうてんき',
  'おくびょう', 'せっかち', 'まじめ', 'ようき', 'むじゃき',
  'ひかえめ', 'おっとり', 'れいせい', 'てれや', 'うっかりや',
  'おだやか', 'おとなしい', 'なまいき', 'しんちょう', 'きまぐれ'
] as const;

/**
 * WASM RawPokemonDataから取得可能なプロパティ名
 */
export type WasmRawPokemonDataProperty = 
  | 'get_seed'
  | 'get_pid'
  | 'get_nature'
  | 'get_ability_slot'
  | 'get_gender_value'
  | 'get_encounter_slot_value'
  | 'get_level_rand_value'
  | 'get_shiny_type'
  | 'get_sync_applied'
  | 'get_encounter_type';

/**
 * レベル計算設定
 */
export interface LevelCalculationConfig {
  /** 最小レベル */
  min_level: number;
  /** 最大レベル */
  max_level: number;
  /** 固定レベル（範囲でない場合） */
  fixed_level?: number;
}

/**
 * ポケモン種族データ（エンカウントテーブル用）
 */
export interface EncounterSpecies {
  /** 種族ID */
  species_id: number;
  /** 種族名 */
  name: string;
  /** レベル設定 */
  level_config: LevelCalculationConfig;
  /** 出現確率 (%) */
  probability: number;
}

/**
 * エンカウントテーブル
 */
export interface EncounterTable {
  /** エンカウントタイプ */
  encounter_type: EncounterType;
  /** エリア名 */
  area_name: string;
  /** ゲームバージョン */
  version: 'BW' | 'BW2';
  /** 出現ポケモンリスト */
  species_list: EncounterSpecies[];
}

/**
 * 性別比設定
 */
export interface GenderRatio {
  /** 雌確率閾値 (0-255) - この値未満なら雌 */
  male_ratio: number;
  /** 雄確率 (0-255) - 計算用 */
  female_ratio: number;
  /** 性別不明かどうか */
  genderless: boolean;
}

/**
 * パーサー設定
 */
export interface RawPokemonParserConfig {
  /** エンカウントテーブル */
  encounter_table?: EncounterTable;
  /** 性別比データ */
  gender_ratios?: Map<number, GenderRatio>;
  /** 特性データ */
  ability_data?: Map<number, string[]>;
  /** placeholder値処理を有効にするか */
  process_placeholders: boolean;
  /** 詳細情報を計算するか */
  calculate_details: boolean;
}
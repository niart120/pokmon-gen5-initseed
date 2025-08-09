/**
 * Pokemon BW/BW2 Encounter Table Types and Interfaces
 * 
 * Data Sources (Retrieved: August 8, 2025):
 * - https://pokebook.jp/data/sp5/enc_b (BW Black)
 * - https://pokebook.jp/data/sp5/enc_w (BW White)
 * - https://pokebook.jp/data/sp5/enc_b2 (BW2 Black2)
 * - https://pokebook.jp/data/sp5/enc_w2 (BW2 White2)
 */

import type { ROMVersion } from '../../types/pokemon';

/** エンカウントタイプ定義 - BW/BW2仕様に基づく */
export enum EncounterType {
  // 通常エンカウント (0-2)
  Normal = 0,        // 通常（草むら・洞窟）
  Surfing = 1,       // なみのり
  Fishing = 2,       // つりざお

  // 特殊エンカウント (3-7)
  ShakingGrass = 3,  // 揺れる草むら
  DustCloud = 4,     // 砂煙
  Shadow = 5,        // ポケモンの影
  Ripple = 6,        // 水泡
  Special = 7,       // その他特殊

  // 固定シンボル・ギフト (10-11)
  StaticSymbol = 10, // 固定シンボル
  Gift = 11,         // ギフト

  // 徘徊ポケモン (20)
  Roaming = 20
}

/** 釣り竿タイプ */
export enum FishingRodType {
  Old = 'old',       // ボロのつりざお
  Good = 'good',     // いいつりざお
  Super = 'super'    // すごいつりざお
}

/** 遭遇スロット確率分布 */
export interface EncounterSlot {
  /** スロット番号 (0-11) */
  slot: number;
  /** 出現確率 (%) */
  rate: number;
  /** ポケモン種族ID */
  speciesId: number;
  /** レベル範囲 */
  levelRange: {
    min: number;
    max: number;
  };
}

/** エリア別エンカウントテーブル */
export interface AreaEncounterTable {
  /** エリアID */
  areaId: string;
  /** エリア名 */
  areaName: string;
  /** 対応バージョン */
  versions: ROMVersion[];
  /** エンカウントタイプ別データ */
  encounters: {
    [K in EncounterType]?: EncounterSlot[];
  };
  /** 釣りタイプ別データ（Fishing用） */
  fishingData?: {
    [K in FishingRodType]?: EncounterSlot[];
  };
}

/** エンカウント選択結果 */
export interface EncounterSelection {
  /** 選択されたスロット */
  slot: EncounterSlot;
  /** 選択されたレベル */
  level: number;
  /** エンカウントタイプ */
  encounterType: EncounterType;
  /** 釣り竿タイプ（該当する場合） */
  fishingRod?: FishingRodType;
}

/** エンカウント確率検証結果 */
export interface EncounterRateValidation {
  /** 確率合計 */
  totalRate: number;
  /** 100%との一致 */
  isValid: boolean;
  /** エラーメッセージ */
  errors: string[];
}

/** 統計的分布テスト結果 */
export interface DistributionTestResult {
  /** テスト実行回数 */
  sampleSize: number;
  /** 期待分布と実測分布の差異 */
  chiSquareValue: number;
  /** p値 */
  pValue: number;
  /** 統計的に有意かどうか */
  isSignificant: boolean;
  /** スロット別実測頻度 */
  observedFrequencies: Map<number, number>;
  /** スロット別期待頻度 */
  expectedFrequencies: Map<number, number>;
}
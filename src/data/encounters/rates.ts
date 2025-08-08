/**
 * Pokemon BW/BW2 Encounter Rate Definitions
 * 
 * Data Sources (Retrieved: August 8, 2025):
 * - https://pokebook.jp/data/sp5/enc_b (BW Black)
 * - https://pokebook.jp/data/sp5/enc_w (BW White)
 * - https://pokebook.jp/data/sp5/enc_b2 (BW2 Black2)
 * - https://pokebook.jp/data/sp5/enc_w2 (BW2 White2)
 * 
 * All probabilities verified to sum to 100% for each encounter type.
 */

import { EncounterType } from './types';

/** BW/BW2共通の遭遇スロット確率分布 */
export const ENCOUNTER_RATES = {
  /** 通常エンカウント（草むら・洞窟） - 12スロット */
  [EncounterType.Normal]: [
    { slot: 0, rate: 20 },   // スロット0: 20%
    { slot: 1, rate: 20 },   // スロット1: 20%
    { slot: 2, rate: 10 },   // スロット2: 10%
    { slot: 3, rate: 10 },   // スロット3: 10%
    { slot: 4, rate: 10 },   // スロット4: 10%
    { slot: 5, rate: 10 },   // スロット5: 10%
    { slot: 6, rate: 5 },    // スロット6: 5%
    { slot: 7, rate: 5 },    // スロット7: 5%
    { slot: 8, rate: 4 },    // スロット8: 4%
    { slot: 9, rate: 4 },    // スロット9: 4%
    { slot: 10, rate: 1 },   // スロット10: 1%
    { slot: 11, rate: 1 }    // スロット11: 1%
  ],

  /** なみのりエンカウント - 5スロット */
  [EncounterType.Surfing]: [
    { slot: 0, rate: 60 },   // スロット0: 60%
    { slot: 1, rate: 30 },   // スロット1: 30%
    { slot: 2, rate: 5 },    // スロット2: 5%
    { slot: 3, rate: 4 },    // スロット3: 4%
    { slot: 4, rate: 1 }     // スロット4: 1%
  ],

  /** つりざおエンカウント - 5スロット */
  [EncounterType.Fishing]: [
    { slot: 0, rate: 70 },   // スロット0: 70%
    { slot: 1, rate: 15 },   // スロット1: 15%
    { slot: 2, rate: 10 },   // スロット2: 10%
    { slot: 3, rate: 4 },    // スロット3: 4%
    { slot: 4, rate: 1 }     // スロット4: 1%
  ],

  /** 揺れる草むらエンカウント - 4スロット */
  [EncounterType.ShakingGrass]: [
    { slot: 0, rate: 40 },   // スロット0: 40%
    { slot: 1, rate: 35 },   // スロット1: 35%
    { slot: 2, rate: 20 },   // スロット2: 20%
    { slot: 3, rate: 5 }     // スロット3: 5%
  ],

  /** 砂煙エンカウント - 4スロット */
  [EncounterType.DustCloud]: [
    { slot: 0, rate: 50 },   // スロット0: 50%
    { slot: 1, rate: 30 },   // スロット1: 30%
    { slot: 2, rate: 15 },   // スロット2: 15%
    { slot: 3, rate: 5 }     // スロット3: 5%
  ],

  /** ポケモンの影エンカウント - 4スロット */
  [EncounterType.Shadow]: [
    { slot: 0, rate: 60 },   // スロット0: 60%
    { slot: 1, rate: 30 },   // スロット1: 30%
    { slot: 2, rate: 5 },    // スロット2: 5%
    { slot: 3, rate: 5 }     // スロット3: 5%
  ],

  /** 水泡エンカウント - 4スロット */
  [EncounterType.Ripple]: [
    { slot: 0, rate: 60 },   // スロット0: 60%
    { slot: 1, rate: 30 },   // スロット1: 30%
    { slot: 2, rate: 5 },    // スロット2: 5%
    { slot: 3, rate: 5 }     // スロット3: 5%
  ],

  /** その他特殊エンカウント - 5スロット */
  [EncounterType.Special]: [
    { slot: 0, rate: 50 },   // スロット0: 50%
    { slot: 1, rate: 25 },   // スロット1: 25%
    { slot: 2, rate: 15 },   // スロット2: 15%
    { slot: 3, rate: 8 },    // スロット3: 8%
    { slot: 4, rate: 2 }     // スロット4: 2%
  ]
} as const;

/** BW/BW2バージョン別スロット計算式の定数 */
export const SLOT_CALCULATION_CONSTANTS = {
  /** BW（ブラック・ホワイト）*/
  BW: {
    // encounter_slot_bw: ((rnd * (max_slot + 1)) >> 16)
    maxSlotMultiplier: 1,
    bitShift: 16
  },
  /** BW2（ブラック2・ホワイト2）*/
  BW2: {
    // encounter_slot_bw2: ((rnd * max_slot) >> 16)  
    maxSlotMultiplier: 0,
    bitShift: 16
  }
} as const;

/** 確率分布の数学的検証 */
export function validateEncounterRates(): { [key in EncounterType]?: { total: number; isValid: boolean } } {
  const results: { [key in EncounterType]?: { total: number; isValid: boolean } } = {};
  
  for (const [encounterType, rates] of Object.entries(ENCOUNTER_RATES)) {
    const total = rates.reduce((sum, rate) => sum + rate.rate, 0);
    results[encounterType as unknown as EncounterType] = {
      total,
      isValid: total === 100
    };
  }
  
  return results;
}
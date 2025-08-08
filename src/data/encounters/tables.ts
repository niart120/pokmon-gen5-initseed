/**
 * Sample Encounter Table Data for BW/BW2
 * 
 * Data Sources (Retrieved: August 8, 2025):
 * - https://pokebook.jp/data/sp5/enc_b (BW Black)
 * - https://pokebook.jp/data/sp5/enc_w (BW White)
 * - https://pokebook.jp/data/sp5/enc_b2 (BW2 Black2)  
 * - https://pokebook.jp/data/sp5/enc_w2 (BW2 White2)
 * 
 * Note: This is a sample implementation. Full data would be extracted from the above sources.
 */

import type { AreaEncounterTable } from './types';
import { EncounterType, FishingRodType } from './types';

/** サンプルエンカウントテーブル - Route 1 (BW) */
export const SAMPLE_ROUTE_1_BW: AreaEncounterTable = {
  areaId: 'route_1',
  areaName: 'Route 1 (1番道路)',
  versions: ['B', 'W'],
  encounters: {
    [EncounterType.Normal]: [
      { slot: 0, rate: 20, speciesId: 504, levelRange: { min: 2, max: 4 } },   // ミネズミ
      { slot: 1, rate: 20, speciesId: 504, levelRange: { min: 2, max: 4 } },   // ミネズミ
      { slot: 2, rate: 10, speciesId: 506, levelRange: { min: 2, max: 4 } },   // ヨーテリー
      { slot: 3, rate: 10, speciesId: 506, levelRange: { min: 2, max: 4 } },   // ヨーテリー
      { slot: 4, rate: 10, speciesId: 504, levelRange: { min: 3, max: 4 } },   // ミネズミ
      { slot: 5, rate: 10, speciesId: 504, levelRange: { min: 3, max: 4 } },   // ミネズミ
      { slot: 6, rate: 5, speciesId: 506, levelRange: { min: 3, max: 4 } },    // ヨーテリー
      { slot: 7, rate: 5, speciesId: 506, levelRange: { min: 3, max: 4 } },    // ヨーテリー
      { slot: 8, rate: 4, speciesId: 504, levelRange: { min: 2, max: 3 } },    // ミネズミ
      { slot: 9, rate: 4, speciesId: 504, levelRange: { min: 2, max: 3 } },    // ミネズミ
      { slot: 10, rate: 1, speciesId: 506, levelRange: { min: 2, max: 3 } },   // ヨーテリー
      { slot: 11, rate: 1, speciesId: 506, levelRange: { min: 2, max: 3 } }    // ヨーテリー
    ],
    [EncounterType.ShakingGrass]: [
      { slot: 0, rate: 40, speciesId: 507, levelRange: { min: 5, max: 7 } },    // ハーデリア
      { slot: 1, rate: 35, speciesId: 505, levelRange: { min: 5, max: 7 } },    // ミルホッグ
      { slot: 2, rate: 20, speciesId: 16, levelRange: { min: 5, max: 7 } },     // ポッポ
      { slot: 3, rate: 5, speciesId: 132, levelRange: { min: 5, max: 7 } }      // メタモン
    ]
  }
};

/** サンプルエンカウントテーブル - Route 6 (BW) - つりざお対応 */
export const SAMPLE_ROUTE_6_BW: AreaEncounterTable = {
  areaId: 'route_6',
  areaName: 'Route 6 (6番道路)',
  versions: ['B', 'W'],
  encounters: {
    [EncounterType.Surfing]: [
      { slot: 0, rate: 60, speciesId: 550, levelRange: { min: 25, max: 28 } },  // バスラオ
      { slot: 1, rate: 30, speciesId: 550, levelRange: { min: 25, max: 28 } },  // バスラオ
      { slot: 2, rate: 5, speciesId: 550, levelRange: { min: 25, max: 28 } },   // バスラオ
      { slot: 3, rate: 4, speciesId: 550, levelRange: { min: 25, max: 28 } },   // バスラオ
      { slot: 4, rate: 1, speciesId: 550, levelRange: { min: 25, max: 28 } }    // バスラオ
    ]
  },
  fishingData: {
    [FishingRodType.Old]: [
      { slot: 0, rate: 70, speciesId: 129, levelRange: { min: 5, max: 15 } },   // コイキング
      { slot: 1, rate: 15, speciesId: 129, levelRange: { min: 5, max: 15 } },   // コイキング
      { slot: 2, rate: 10, speciesId: 129, levelRange: { min: 5, max: 15 } },   // コイキング
      { slot: 3, rate: 4, speciesId: 129, levelRange: { min: 5, max: 15 } },    // コイキング
      { slot: 4, rate: 1, speciesId: 129, levelRange: { min: 5, max: 15 } }     // コイキング
    ],
    [FishingRodType.Good]: [
      { slot: 0, rate: 70, speciesId: 550, levelRange: { min: 10, max: 30 } },  // バスラオ
      { slot: 1, rate: 15, speciesId: 129, levelRange: { min: 10, max: 25 } },  // コイキング
      { slot: 2, rate: 10, speciesId: 550, levelRange: { min: 10, max: 30 } },  // バスラオ
      { slot: 3, rate: 4, speciesId: 550, levelRange: { min: 10, max: 30 } },   // バスラオ
      { slot: 4, rate: 1, speciesId: 550, levelRange: { min: 10, max: 30 } }    // バスラオ
    ],
    [FishingRodType.Super]: [
      { slot: 0, rate: 70, speciesId: 550, levelRange: { min: 35, max: 55 } },  // バスラオ
      { slot: 1, rate: 15, speciesId: 550, levelRange: { min: 30, max: 55 } },  // バスラオ
      { slot: 2, rate: 10, speciesId: 550, levelRange: { min: 35, max: 55 } },  // バスラオ
      { slot: 3, rate: 4, speciesId: 550, levelRange: { min: 35, max: 55 } },   // バスラオ
      { slot: 4, rate: 1, speciesId: 550, levelRange: { min: 35, max: 55 } }    // バスラオ
    ]
  }
};

/** 全エンカウントテーブルのインデックス */
export const ENCOUNTER_TABLES: Record<string, AreaEncounterTable> = {
  'route_1': SAMPLE_ROUTE_1_BW,
  'route_6': SAMPLE_ROUTE_6_BW
};

/** バージョン・エリア別テーブル検索 */
export function getEncounterTable(areaId: string, version: string): AreaEncounterTable | null {
  const table = ENCOUNTER_TABLES[areaId];
  if (!table || !table.versions.includes(version as any)) {
    return null;
  }
  return table;
}
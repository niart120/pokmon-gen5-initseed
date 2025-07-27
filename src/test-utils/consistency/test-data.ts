/**
 * 整合性確認テスト用のデータ定数
 * 類似ツールの検索結果との比較検証用データ
 */

import type { SearchConditions } from '../../types/pokemon';

/**
 * 整合性テスト用の基本検索条件
 * 類似ツールと同じパラメータ設定
 */
export const CONSISTENCY_TEST_CONDITIONS: Omit<SearchConditions, 'dateRange'> = {
  romVersion: 'B',
  romRegion: 'JPN',
  hardware: 'DS',
  macAddress: [0x00, 0x11, 0x22, 0x88, 0x22, 0x77],
  keyInput: 0x2FFF,
  timer0Range: { min: 3193, max: 3194, useAutoRange: false },
  vcountRange: { min: 96, max: 96, useAutoRange: false }
} as const;

/**
 * 単体テスト用のテストケース
 * 重複Seedを除外した個別検証用データ
 */
export const UNIT_TEST_CASES = [
  {
    seed: 0x14B11BA6,
    expectedDatetime: '2066/06/27 03:02:48',
    expectedTimer0: 0xC79,
    localRange: { year: 2066, month: 6, day: 27, hour: 3, minute: 2 }
  },
  {
    seed: 0x8A30480D,
    expectedDatetime: '2063/11/23 11:39:47',
    expectedTimer0: 0xC79,
    localRange: { year: 2063, month: 11, day: 23, hour: 11, minute: 39 }
  },
  {
    seed: 0x9E02B0AE,
    expectedDatetime: '2073/08/30 03:55:06',
    expectedTimer0: 0xC7A,
    localRange: { year: 2073, month: 8, day: 30, hour: 3, minute: 55 }
  },
  {
    seed: 0xADFA2178,
    expectedDatetime: '2072/06/21 13:22:13',
    expectedTimer0: 0xC7A,
    localRange: { year: 2072, month: 6, day: 21, hour: 13, minute: 22 }
  }
] as const;

/**
 * E2Eテスト用のSeedリスト
 * 複数Seed一括検証用（重複Seed除外）
 */
export const E2E_TEST_SEEDS = [
  0x14B11BA6, // 2066/06/27 03:02:48, Timer0=0xC79
  0x8A30480D, // 2063/11/23 11:39:47, Timer0=0xC79
  0x9E02B0AE, // 2073/08/30 03:55:06, Timer0=0xC7A
  0xADFA2178  // 2072/06/21 13:22:13, Timer0=0xC7A
] as const;

/**
 * 重複Seed検証用のテストデータ
 * 同一Seedに対する複数解の検証
 */
export const DUPLICATE_SEED_TEST = {
  seed: 0xFC4AA3AC,
  expectedResults: [
    { datetime: '2025/10/18 02:48:49', timer0: 0xC7A },
    { datetime: '2041/05/25 17:17:59', timer0: 0xC7A }
  ]
} as const;

/**
 * 全期待結果データ（参照用）
 * 類似ツールの完全な出力結果
 */
export const ALL_EXPECTED_RESULTS = [
  { seed: 0x14B11BA6, datetime: '2066/06/27 03:02:48', timer0: 0xC79 },
  { seed: 0x8A30480D, datetime: '2063/11/23 11:39:47', timer0: 0xC79 },
  { seed: 0xFC4AA3AC, datetime: '2025/10/18 02:48:49', timer0: 0xC7A },
  { seed: 0x9E02B0AE, datetime: '2073/08/30 03:55:06', timer0: 0xC7A },
  { seed: 0xADFA2178, datetime: '2072/06/21 13:22:13', timer0: 0xC7A },
  { seed: 0xFC4AA3AC, datetime: '2041/05/25 17:17:59', timer0: 0xC7A } // 重複解
] as const;

/**
 * 全範囲検索用の日付範囲設定
 * 類似ツールと同等の2000-2099年検索範囲
 */
export const FULL_RANGE_DATE_SEARCH = {
  startYear: 2000, endYear: 2099,
  startMonth: 1, endMonth: 12,
  startDay: 1, endDay: 31,
  startHour: 0, endHour: 23,
  startMinute: 0, endMinute: 59,
  startSecond: 0, endSecond: 59
} as const;

/**
 * 元の検索対象Seedリスト（類似ツールの入力データ）
 */
export const ORIGINAL_TARGET_SEEDS = [
  0x14B11BA6, // 14b11ba6
  0x8A30480D, // 8a30480d
  0xFC4AA3AC, // fc4aa3ac
  0x9E02B0AE, // 9e02b0ae
  0xADFA2178  // adfa2178
] as const;

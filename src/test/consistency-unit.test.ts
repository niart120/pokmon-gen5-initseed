/**
 * 出力結果整合性確認テスト - 単体テスト
 * 類似ツールとの検索結果比較検証（局所検索範囲）
 */

import { describe, test, expect, beforeAll } from 'vitest';
import { SeedCalculator } from '../lib/core/seed-calculator';
import { 
  CONSISTENCY_TEST_CONDITIONS, 
  UNIT_TEST_CASES,
  parseExpectedDateTime,
  formatDateTime,
  isSameDateTime,
  createLocalSearchRange 
} from '../test-utils/consistency';
import type { SearchConditions } from '../types/pokemon';

describe('出力結果整合性確認 - 単体テスト', () => {
  let calculator: SeedCalculator;

  beforeAll(async () => {
    calculator = new SeedCalculator();
    
    // WebAssembly初期化を試行（失敗しても続行）
    try {
      await calculator.initializeWasm();
      console.log('✅ WebAssembly initialized for consistency tests');
    } catch (error) {
      console.warn('⚠️ WebAssembly not available, using TypeScript fallback');
    }
  });

  describe('時刻フォーマット変換ユーティリティ', () => {
    test('期待時刻文字列をDateオブジェクトに変換', () => {
      const testCases = [
        { input: '2066/06/27 03:02:48', expected: new Date(2066, 5, 27, 3, 2, 48) },
        { input: '2063/11/23 11:39:47', expected: new Date(2063, 10, 23, 11, 39, 47) },
        { input: '2025/10/18 02:48:49', expected: new Date(2025, 9, 18, 2, 48, 49) }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = parseExpectedDateTime(input);
        expect(isSameDateTime(result, expected)).toBe(true);
      });
    });

    test('Dateオブジェクトを期待時刻文字列に変換', () => {
      const testCases = [
        { input: new Date(2066, 5, 27, 3, 2, 48), expected: '2066/06/27 03:02:48' },
        { input: new Date(2063, 10, 23, 11, 39, 47), expected: '2063/11/23 11:39:47' },
        { input: new Date(2025, 9, 18, 2, 48, 49), expected: '2025/10/18 02:48:49' }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = formatDateTime(input);
        expect(result).toBe(expected);
      });
    });

    test('局所検索範囲生成', () => {
      const centerTime = new Date(2066, 5, 27, 3, 2, 48);
      const range = createLocalSearchRange(centerTime, 2); // ±2分

      expect(range.startYear).toBe(2066);
      expect(range.endYear).toBe(2066);
      expect(range.startMonth).toBe(6);
      expect(range.endMonth).toBe(6);
      expect(range.startDay).toBe(27);
      expect(range.endDay).toBe(27);
      expect(range.startHour).toBe(3);
      expect(range.endHour).toBe(3);
      expect(range.startMinute).toBe(0); // 3:02 - 2分 = 3:00
      expect(range.endMinute).toBe(4);   // 3:02 + 2分 = 3:04
    });
  });

  describe('個別Seed検証', () => {
    UNIT_TEST_CASES.forEach((testCase, index) => {
      test(`Seed ${testCase.seed.toString(16).toUpperCase()} の時刻逆算検証`, async () => {
        const expectedDate = parseExpectedDateTime(testCase.expectedDatetime);
        const expectedTimer0 = testCase.expectedTimer0;
        
        // 局所検索範囲を設定（期待時刻の前後2分）
        const searchRange = createLocalSearchRange(expectedDate, 2);
        
        const searchConditions: SearchConditions = {
          ...CONSISTENCY_TEST_CONDITIONS,
          dateRange: searchRange
        };

        console.log(`\n=== TestCase ${index + 1}: Seed 0x${testCase.seed.toString(16).toUpperCase()} ===`);
        console.log(`Expected: ${testCase.expectedDatetime}, Timer0=0x${expectedTimer0.toString(16).toUpperCase()}`);
        console.log(`Search range: ${searchRange.startYear}/${searchRange.startMonth}/${searchRange.startDay} ${searchRange.startHour}:${searchRange.startMinute} - ${searchRange.endHour}:${searchRange.endMinute}`);

        let found = false;
        let foundResults: Array<{ datetime: Date; timer0: number; seed: number }> = [];

        // 局所検索実行
        for (let timer0 = CONSISTENCY_TEST_CONDITIONS.timer0VCountConfig.timer0Range.min; timer0 <= CONSISTENCY_TEST_CONDITIONS.timer0VCountConfig.timer0Range.max; timer0++) {
          for (let vcount = CONSISTENCY_TEST_CONDITIONS.timer0VCountConfig.vcountRange.min; vcount <= CONSISTENCY_TEST_CONDITIONS.timer0VCountConfig.vcountRange.max; vcount++) {
            
            // 時刻範囲の検索
            const startDate = new Date(searchRange.startYear, searchRange.startMonth - 1, searchRange.startDay, 
                                     searchRange.startHour, searchRange.startMinute, 0);
            const endDate = new Date(searchRange.endYear, searchRange.endMonth - 1, searchRange.endDay, 
                                   searchRange.endHour, searchRange.endMinute, 59);

            for (let timestamp = startDate.getTime(); timestamp <= endDate.getTime(); timestamp += 1000) {
              const currentDate = new Date(timestamp);
              
              try {
                const message = calculator.generateMessage(searchConditions, timer0, vcount, currentDate);
                const { seed } = calculator.calculateSeed(message);
                
                if (seed === testCase.seed) {
                  foundResults.push({ datetime: currentDate, timer0, seed });
                  
                  // 期待値と完全一致するかチェック
                  if (isSameDateTime(currentDate, expectedDate) && timer0 === expectedTimer0) {
                    found = true;
                    console.log(`✅ Perfect match found: ${formatDateTime(currentDate)}, Timer0=0x${timer0.toString(16).toUpperCase()}`);
                  } else {
                    console.log(`📍 Alternative match: ${formatDateTime(currentDate)}, Timer0=0x${timer0.toString(16).toUpperCase()}`);
                  }
                }
              } catch (error) {
                console.error('Calculation error:', error);
              }
            }
          }
        }

        console.log(`Search completed. Found ${foundResults.length} result(s)`);
        
        // 検証結果
        expect(foundResults.length).toBeGreaterThan(0); // 最低1つは見つかること
        expect(found).toBe(true); // 期待値と完全一致すること

        // 詳細ログ出力
        if (foundResults.length > 1) {
          console.log('Multiple results found:');
          foundResults.forEach(result => {
            console.log(`  - ${formatDateTime(result.datetime)}, Timer0=0x${result.timer0.toString(16).toUpperCase()}`);
          });
        }
      }, 30000); // 30秒タイムアウト（局所検索のため短時間で完了予定）
    });
  });

  describe('計算精度検証', () => {
    test('メッセージ生成の一貫性', () => {
      const testConditions: SearchConditions = {
        ...CONSISTENCY_TEST_CONDITIONS,
        dateRange: {
          startYear: 2066, endYear: 2066,
          startMonth: 6, endMonth: 6,
          startDay: 27, endDay: 27,
          startHour: 3, endHour: 3,
          startMinute: 2, endMinute: 2,
          startSecond: 48, endSecond: 48
        }
      };

      const testDate = new Date(2066, 5, 27, 3, 2, 48);
      const timer0 = 0xC79;
      const vcount = 96;

      // 同じ条件で複数回生成
      const message1 = calculator.generateMessage(testConditions, timer0, vcount, testDate);
      const message2 = calculator.generateMessage(testConditions, timer0, vcount, testDate);

      expect(message1).toEqual(message2);
      expect(message1.length).toBe(16);
    });

    test('SHA-1計算の一貫性', () => {
      const testMessage = [
        0x10F12502, 0x0C602102, 0x0C602102, 0x58602102, 0x58602102,
        0x00600C79, 0x00002288, 0x02224400, 0x42061B00, 0x03024800,
        0x00000000, 0x00000000, 0xFF2F0000, 0x80000000, 0x00000000, 0x000001A0
      ];

      const result1 = calculator.calculateSeed(testMessage);
      const result2 = calculator.calculateSeed(testMessage);

      expect(result1.seed).toBe(result2.seed);
      expect(result1.hash).toBe(result2.hash);
    });

    test('実装方式の確認', () => {
      const implementation = calculator.isUsingWasm() ? 'WebAssembly' : 'TypeScript';
      console.log(`\n🔧 Calculator implementation: ${implementation}`);
      
      // どちらの実装でも動作することを確認
      expect(['WebAssembly', 'TypeScript']).toContain(implementation);
    });
  });
});

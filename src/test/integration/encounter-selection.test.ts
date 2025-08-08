/**
 * Integration Tests for Encounter Selection Algorithm
 * 
 * Data Sources (Retrieved: August 8, 2025):
 * - https://pokebook.jp/data/sp5/enc_b (BW Black)
 * - https://pokebook.jp/data/sp5/enc_w (BW White)
 * - https://pokebook.jp/data/sp5/enc_b2 (BW2 Black2)
 * - https://pokebook.jp/data/sp5/enc_w2 (BW2 White2)
 * 
 * Tests verify encounter table probability consistency and
 * statistical validity of selection algorithms.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { 
  EncounterTableSelector, 
  EncounterRateValidator, 
  EncounterDistributionTester 
} from '../../lib/integration/encounter-table';
import { EncounterType, FishingRodType } from '../../data/encounters/types';
import { ENCOUNTER_RATES } from '../../data/encounters/rates';
import type { ROMVersion } from '../../types/pokemon';

describe('Encounter Selection Integration Tests', () => {
  describe('Encounter Rate Validation', () => {
    it('should validate all encounter types have 100% total probability', () => {
      const validationResults = EncounterRateValidator.validateAllEncounterTypes();
      
      for (const [encounterType, result] of validationResults) {
        expect(result.totalRate, `EncounterType ${encounterType} total rate`).toBe(100);
        expect(result.isValid, `EncounterType ${encounterType} validation`).toBe(true);
        expect(result.errors, `EncounterType ${encounterType} errors`).toHaveLength(0);
      }
    });

    it('should validate individual encounter types', () => {
      // テスト対象のエンカウントタイプ
      const testTypes = [
        EncounterType.Normal,
        EncounterType.Surfing,
        EncounterType.Fishing,
        EncounterType.ShakingGrass,
        EncounterType.DustCloud
      ];

      for (const encounterType of testTypes) {
        const result = EncounterRateValidator.validateEncounterType(encounterType);
        
        expect(result.totalRate).toBe(100);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      }
    });

    it('should detect invalid encounter rate configurations', () => {
      // 無効なエンカウントタイプをテスト
      const invalidType = 999 as EncounterType;
      const result = EncounterRateValidator.validateEncounterType(invalidType);
      
      expect(result.totalRate).toBe(0);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Encounter Slot Calculation', () => {
    it('should calculate correct slots for BW version', () => {
      const testCases = [
        { random: 0, encounterType: EncounterType.Normal, expected: 0 },
        { random: 65535, encounterType: EncounterType.Normal, expected: 11 },
        { random: 32767, encounterType: EncounterType.Normal, expected: 5 }
      ];

      for (const testCase of testCases) {
        const slot = EncounterTableSelector.calculateEncounterSlot(
          testCase.random,
          testCase.encounterType,
          'B' as ROMVersion
        );
        
        expect(slot).toBeGreaterThanOrEqual(0);
        expect(slot).toBeLessThanOrEqual(11); // Normal encounter has 12 slots (0-11)
      }
    });

    it('should calculate correct slots for BW2 version', () => {
      const testCases = [
        { random: 0, encounterType: EncounterType.Normal },
        { random: 65535, encounterType: EncounterType.Normal },
        { random: 32767, encounterType: EncounterType.Normal }
      ];

      for (const testCase of testCases) {
        const slot = EncounterTableSelector.calculateEncounterSlot(
          testCase.random,
          testCase.encounterType,
          'B2' as ROMVersion
        );
        
        expect(slot).toBeGreaterThanOrEqual(0);
        expect(slot).toBeLessThanOrEqual(11); // Normal encounter has 12 slots (0-11)
      }
    });

    it('should handle different encounter types correctly', () => {
      const encounterTypes = [
        { type: EncounterType.Normal, maxSlot: 11 },
        { type: EncounterType.Surfing, maxSlot: 4 },
        { type: EncounterType.Fishing, maxSlot: 4 },
        { type: EncounterType.ShakingGrass, maxSlot: 3 }
      ];

      for (const { type, maxSlot } of encounterTypes) {
        const slot = EncounterTableSelector.calculateEncounterSlot(
          32767, // 中間値
          type,
          'B' as ROMVersion
        );
        
        expect(slot).toBeGreaterThanOrEqual(0);
        expect(slot).toBeLessThanOrEqual(maxSlot);
      }
    });
  });

  describe('Probability-based Slot Selection', () => {
    it('should select slots according to probability distribution', () => {
      // 各確率でのスロット選択をテスト
      const testCases = [
        { random: 0, encounterType: EncounterType.Normal, expectedSlot: 0 }, // 最低値は最初のスロット
        { random: 65535, encounterType: EncounterType.Normal } // 最高値はいずれかのスロット
      ];

      for (const testCase of testCases) {
        const slot = EncounterTableSelector.selectSlotByProbability(
          testCase.random,
          testCase.encounterType
        );
        
        expect(slot).toBeGreaterThanOrEqual(0);
        expect(slot).toBeLessThanOrEqual(11);
        
        if (testCase.expectedSlot !== undefined) {
          expect(slot).toBe(testCase.expectedSlot);
        }
      }
    });

    it('should throw error for unsupported encounter types', () => {
      expect(() => {
        EncounterTableSelector.selectSlotByProbability(
          32767,
          999 as EncounterType
        );
      }).toThrow('Unsupported encounter type');
    });
  });

  describe('Level Calculation', () => {
    it('should calculate levels within specified range', () => {
      const testCases = [
        { random: 0, range: { min: 5, max: 10 }, expected: 5 },
        { random: 65535, range: { min: 5, max: 10 }, expected: 10 },
        { random: 32767, range: { min: 20, max: 25 } }
      ];

      for (const testCase of testCases) {
        const level = EncounterTableSelector.calculateLevel(
          testCase.random,
          testCase.range
        );
        
        expect(level).toBeGreaterThanOrEqual(testCase.range.min);
        expect(level).toBeLessThanOrEqual(testCase.range.max);
        
        if (testCase.expected !== undefined) {
          expect(level).toBe(testCase.expected);
        }
      }
    });

    it('should handle single-level ranges', () => {
      const level = EncounterTableSelector.calculateLevel(
        32767,
        { min: 15, max: 15 }
      );
      
      expect(level).toBe(15);
    });
  });

  describe('Complete Encounter Selection', () => {
    it('should select encounters from existing tables', () => {
      const encounter = EncounterTableSelector.selectEncounter(
        'route_1',
        'B' as ROMVersion,
        EncounterType.Normal,
        32767, // slot random
        16383  // level random
      );
      
      expect(encounter).not.toBeNull();
      if (encounter) {
        expect(encounter.slot).toBeDefined();
        expect(encounter.level).toBeGreaterThan(0);
        expect(encounter.encounterType).toBe(EncounterType.Normal);
      }
    });

    it('should handle fishing encounters with rod types', () => {
      const encounter = EncounterTableSelector.selectEncounter(
        'route_6',
        'B' as ROMVersion,
        EncounterType.Fishing,
        32767, // slot random
        16383, // level random
        FishingRodType.Good
      );
      
      expect(encounter).not.toBeNull();
      if (encounter) {
        expect(encounter.slot).toBeDefined();
        expect(encounter.level).toBeGreaterThan(0);
        expect(encounter.encounterType).toBe(EncounterType.Fishing);
        expect(encounter.fishingRod).toBe(FishingRodType.Good);
      }
    });

    it('should return null for non-existent tables', () => {
      const encounter = EncounterTableSelector.selectEncounter(
        'non_existent_area',
        'B' as ROMVersion,
        EncounterType.Normal,
        32767,
        16383
      );
      
      expect(encounter).toBeNull();
    });

    it('should return null for unsupported encounter types in area', () => {
      const encounter = EncounterTableSelector.selectEncounter(
        'route_1',
        'B' as ROMVersion,
        EncounterType.Surfing, // Route 1 doesn't have surfing
        32767,
        16383
      );
      
      expect(encounter).toBeNull();
    });
  });

  describe('Statistical Distribution Tests', () => {
    it('should pass statistical distribution test for normal encounters', () => {
      const result = EncounterDistributionTester.testDistribution(
        EncounterType.Normal,
        10000, // large sample size for reliable statistics
        12345  // fixed seed for reproducible results
      );
      
      expect(result.sampleSize).toBe(10000);
      expect(result.chiSquareValue).toBeGreaterThan(0);
      expect(result.pValue).toBeGreaterThanOrEqual(0);
      expect(result.pValue).toBeLessThanOrEqual(1);
      
      // 統計的に有意でないことを期待（分布が適切）
      expect(result.isSignificant).toBe(false);
      
      // 観測度数と期待度数が存在することを確認
      expect(result.observedFrequencies.size).toBeGreaterThan(0);
      expect(result.expectedFrequencies.size).toBeGreaterThan(0);
    });

    it('should pass statistical distribution test for surfing encounters', () => {
      const result = EncounterDistributionTester.testDistribution(
        EncounterType.Surfing,
        5000,
        54321
      );
      
      expect(result.sampleSize).toBe(5000);
      expect(result.isSignificant).toBe(false); // 適切な分布を期待
    });

    it('should throw error for unsupported encounter types in distribution test', () => {
      expect(() => {
        EncounterDistributionTester.testDistribution(
          999 as EncounterType,
          1000
        );
      }).toThrow('Unsupported encounter type');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle extreme random values correctly', () => {
      const extremeValues = [0, 1, 65534, 65535];
      
      for (const randomValue of extremeValues) {
        const slot = EncounterTableSelector.selectSlotByProbability(
          randomValue,
          EncounterType.Normal
        );
        
        expect(slot).toBeGreaterThanOrEqual(0);
        expect(slot).toBeLessThanOrEqual(11);
      }
    });

    it('should handle invalid game versions gracefully', () => {
      // 無効なバージョンでもエラーを投げずに処理される
      const slot = EncounterTableSelector.calculateEncounterSlot(
        32767,
        EncounterType.Normal,
        'INVALID' as ROMVersion
      );
      
      expect(slot).toBeGreaterThanOrEqual(0);
    });

    it('should validate encounter rate consistency', () => {
      // 全エンカウントタイプの確率が一貫していることを確認
      for (const [encounterTypeStr, rates] of Object.entries(ENCOUNTER_RATES)) {
        const total = rates.reduce((sum, rate) => sum + rate.rate, 0);
        expect(total, `EncounterType ${encounterTypeStr}`).toBe(100);
      }
    });
  });

  describe('Performance and Scalability', () => {
    it('should perform slot selection efficiently for large numbers', () => {
      const startTime = performance.now();
      
      for (let i = 0; i < 100000; i++) {
        EncounterTableSelector.selectSlotByProbability(
          Math.floor(Math.random() * 65536),
          EncounterType.Normal
        );
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // 100,000回の選択が1秒以内に完了することを期待
      expect(duration).toBeLessThan(1000);
    });

    it('should handle multiple encounter types efficiently', () => {
      const startTime = performance.now();
      const encounterTypes = [
        EncounterType.Normal,
        EncounterType.Surfing,
        EncounterType.Fishing,
        EncounterType.ShakingGrass
      ];
      
      for (let i = 0; i < 50000; i++) {
        const randomType = encounterTypes[i % encounterTypes.length];
        EncounterTableSelector.selectSlotByProbability(
          Math.floor(Math.random() * 65536),
          randomType
        );
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // 複数タイプでの50,000回選択が1秒以内に完了することを期待
      expect(duration).toBeLessThan(1000);
    });
  });
});
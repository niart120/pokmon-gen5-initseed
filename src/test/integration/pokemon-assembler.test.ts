/**
 * Pokemon Assembler Integration Test Suite
 * 
 * Tests for Phase 2-5: データ統合処理
 * Validates data integration, special encounters, and sync rule enforcement
 */

import { describe, test, expect, beforeEach } from 'vitest';
import {
  PokemonAssembler,
  EncounterType,
  DustCloudContent,
  createSampleEncounterTables,
  type RawPokemonData,
  type EnhancedPokemonData,
  type EncounterTableEntry,
} from '../../lib/integration/pokemon-assembler';

describe('Pokemon Assembler - Phase 2-5: データ統合処理', () => {
  let assembler: PokemonAssembler;
  
  beforeEach(() => {
    assembler = new PokemonAssembler('B', 'JPN', createSampleEncounterTables());
  });
  
  describe('基本データ統合', () => {
    test('Raw WASM データを正しく拡張して返す', () => {
      const rawData: RawPokemonData = {
        seed: 0x12345678,
        pid: 0x87654321,
        nature: 12, // Hasty
        syncApplied: false,
        abilitySlot: 1,
        genderValue: 100,
        encounterSlotValue: 0,
        encounterType: EncounterType.Normal,
        levelRandValue: 2,
        shinyType: 0,
      };
      
      const enhanced = assembler.assembleData(rawData);
      
      // 基本データの保持
      expect(enhanced.seed).toBe(0x12345678);
      expect(enhanced.pid).toBe(0x87654321);
      expect(enhanced.nature).toBe(12);
      expect(enhanced.syncApplied).toBe(false);
      
      // 拡張データの生成
      expect(enhanced.species).toBe(1); // Bulbasaur from encounter table
      expect(enhanced.level).toBeGreaterThanOrEqual(5);
      expect(enhanced.level).toBeLessThanOrEqual(7);
      expect(enhanced.ability).toBe(2); // abilitySlot 1 -> ability 2
      expect(enhanced.gender).toBe(0); // Male (genderValue 100 < genderRatio 87 is false)
      expect(enhanced.isShiny).toBe(false);
      expect(enhanced.shinyType).toBe('normal');
    });
    
    test('色違いポケモンを正しく処理する', () => {
      const rawData: RawPokemonData = {
        seed: 0x12345678,
        pid: 0x87654321,
        nature: 0,
        syncApplied: false,
        abilitySlot: 0,
        genderValue: 50,
        encounterSlotValue: 1,
        encounterType: EncounterType.Normal,
        levelRandValue: 0,
        shinyType: 1, // Square shiny
      };
      
      const enhanced = assembler.assembleData(rawData);
      
      expect(enhanced.isShiny).toBe(true);
      expect(enhanced.shinyType).toBe('square');
    });
    
    test('Star色違いを正しく処理する', () => {
      const rawData: RawPokemonData = {
        seed: 0x12345678,
        pid: 0x87654321,
        nature: 0,
        syncApplied: false,
        abilitySlot: 0,
        genderValue: 50,
        encounterSlotValue: 1,
        encounterType: EncounterType.Normal,
        levelRandValue: 0,
        shinyType: 2, // Star shiny
      };
      
      const enhanced = assembler.assembleData(rawData);
      
      expect(enhanced.isShiny).toBe(true);
      expect(enhanced.shinyType).toBe('star');
    });
  });
  
  describe('エンカウントタイプ別処理', () => {
    test('通常エンカウントでシンクロ適用可能', () => {
      const rawData: RawPokemonData = {
        seed: 0x12345678,
        pid: 0x87654321,
        nature: 0,
        syncApplied: true,
        abilitySlot: 0,
        genderValue: 50,
        encounterSlotValue: 0,
        encounterType: EncounterType.Normal,
        levelRandValue: 0,
        shinyType: 0,
      };
      
      const enhanced = assembler.assembleData(rawData);
      
      expect(enhanced.syncEligible).toBe(true);
      expect(enhanced.syncAppliedCorrectly).toBe(true);
    });
    
    test('なみのりエンカウントでシンクロ適用可能', () => {
      const rawData: RawPokemonData = {
        seed: 0x12345678,
        pid: 0x87654321,
        nature: 0,
        syncApplied: true,
        abilitySlot: 0,
        genderValue: 50,
        encounterSlotValue: 0,
        encounterType: EncounterType.Surfing,
        levelRandValue: 0,
        shinyType: 0,
      };
      
      const enhanced = assembler.assembleData(rawData);
      
      expect(enhanced.syncEligible).toBe(true);
      expect(enhanced.syncAppliedCorrectly).toBe(true);
    });
    
    test('釣りエンカウントでシンクロ適用可能', () => {
      const rawData: RawPokemonData = {
        seed: 0x12345678,
        pid: 0x87654321,
        nature: 0,
        syncApplied: true,
        abilitySlot: 0,
        genderValue: 50,
        encounterSlotValue: 0,
        encounterType: EncounterType.Fishing,
        levelRandValue: 0,
        shinyType: 0,
      };
      
      const enhanced = assembler.assembleData(rawData);
      
      expect(enhanced.syncEligible).toBe(true);
      expect(enhanced.syncAppliedCorrectly).toBe(true);
    });
    
    test('固定シンボルでシンクロ適用可能', () => {
      const rawData: RawPokemonData = {
        seed: 0x12345678,
        pid: 0x87654321,
        nature: 0,
        syncApplied: true,
        abilitySlot: 0,
        genderValue: 50,
        encounterSlotValue: 0,
        encounterType: EncounterType.StaticSymbol,
        levelRandValue: 0,
        shinyType: 0,
      };
      
      const enhanced = assembler.assembleData(rawData);
      
      expect(enhanced.syncEligible).toBe(true);
      expect(enhanced.syncAppliedCorrectly).toBe(true);
    });
  });
  
  describe('シンクロ適用範囲の厳密化', () => {
    test('徘徊ポケモンではシンクロ適用不可（重要な仕様）', () => {
      const rawData: RawPokemonData = {
        seed: 0x12345678,
        pid: 0x87654321,
        nature: 0,
        syncApplied: false, // 正しく適用されていない
        abilitySlot: 0,
        genderValue: 50,
        encounterSlotValue: 0,
        encounterType: EncounterType.Roaming,
        levelRandValue: 0,
        shinyType: 0,
      };
      
      const enhanced = assembler.assembleData(rawData);
      
      expect(enhanced.syncEligible).toBe(false);
      expect(enhanced.syncAppliedCorrectly).toBe(true);
    });
    
    test('徘徊ポケモンにシンクロが誤って適用された場合は検出される', () => {
      const rawData: RawPokemonData = {
        seed: 0x12345678,
        pid: 0x87654321,
        nature: 0,
        syncApplied: true, // 誤って適用されている
        abilitySlot: 0,
        genderValue: 50,
        encounterSlotValue: 0,
        encounterType: EncounterType.Roaming,
        levelRandValue: 0,
        shinyType: 0,
      };
      
      const enhanced = assembler.assembleData(rawData);
      
      expect(enhanced.syncEligible).toBe(false);
      expect(enhanced.syncAppliedCorrectly).toBe(false); // 誤適用を検出
    });
    
    test('御三家受け取りではシンクロ適用不可', () => {
      const rawData: RawPokemonData = {
        seed: 0x12345678,
        pid: 0x87654321,
        nature: 0,
        syncApplied: false,
        abilitySlot: 0,
        genderValue: 50,
        encounterSlotValue: 0,
        encounterType: EncounterType.StaticStarter,
        levelRandValue: 0,
        shinyType: 0,
      };
      
      const enhanced = assembler.assembleData(rawData);
      
      expect(enhanced.syncEligible).toBe(false);
      expect(enhanced.syncAppliedCorrectly).toBe(true);
    });
    
    test('化石復元ではシンクロ適用不可', () => {
      const rawData: RawPokemonData = {
        seed: 0x12345678,
        pid: 0x87654321,
        nature: 0,
        syncApplied: false,
        abilitySlot: 0,
        genderValue: 50,
        encounterSlotValue: 0,
        encounterType: EncounterType.StaticFossil,
        levelRandValue: 0,
        shinyType: 0,
      };
      
      const enhanced = assembler.assembleData(rawData);
      
      expect(enhanced.syncEligible).toBe(false);
      expect(enhanced.syncAppliedCorrectly).toBe(true);
    });
    
    test('イベント配布ではシンクロ適用不可', () => {
      const rawData: RawPokemonData = {
        seed: 0x12345678,
        pid: 0x87654321,
        nature: 0,
        syncApplied: false,
        abilitySlot: 0,
        genderValue: 50,
        encounterSlotValue: 0,
        encounterType: EncounterType.StaticEvent,
        levelRandValue: 0,
        shinyType: 0,
      };
      
      const enhanced = assembler.assembleData(rawData);
      
      expect(enhanced.syncEligible).toBe(false);
      expect(enhanced.syncAppliedCorrectly).toBe(true);
    });
  });
  
  describe('特殊エンカウント処理', () => {
    test('砂煙エンカウントでアイテム出現判定', () => {
      const rawData: RawPokemonData = {
        seed: 0x12345678,
        pid: 0x87654321, // Will result in item appearance
        nature: 0,
        syncApplied: true,
        abilitySlot: 0,
        genderValue: 50,
        encounterSlotValue: 0,
        encounterType: EncounterType.DustCloud,
        levelRandValue: 0,
        shinyType: 0,
      };
      
      const enhanced = assembler.assembleData(rawData);
      
      expect(enhanced.syncEligible).toBe(true);
      expect(enhanced.dustCloudContent).toBeDefined();
      expect([
        DustCloudContent.Pokemon,
        DustCloudContent.Item,
        DustCloudContent.Gem
      ]).toContain(enhanced.dustCloudContent);
      
      if (enhanced.dustCloudContent !== DustCloudContent.Pokemon) {
        expect(enhanced.itemId).toBeDefined();
        expect(enhanced.itemId).toBeGreaterThan(0);
      }
    });
    
    test('砂煙でポケモン出現の場合', () => {
      const rawData: RawPokemonData = {
        seed: 0x12345678,
        pid: 0x12345600, // Will result in pokemon appearance (0x00 % 100 = 0 < 60)
        nature: 0,
        syncApplied: true,
        abilitySlot: 0,
        genderValue: 50,
        encounterSlotValue: 0,
        encounterType: EncounterType.DustCloud,
        levelRandValue: 0,
        shinyType: 0,
      };
      
      const enhanced = assembler.assembleData(rawData);
      
      expect(enhanced.dustCloudContent).toBe(DustCloudContent.Pokemon);
      expect(enhanced.itemId).toBeUndefined();
    });
    
    test('揺れる草むらエンカウントでシンクロ適用可能', () => {
      const rawData: RawPokemonData = {
        seed: 0x12345678,
        pid: 0x87654321,
        nature: 0,
        syncApplied: true,
        abilitySlot: 0,
        genderValue: 50,
        encounterSlotValue: 0,
        encounterType: EncounterType.ShakingGrass,
        levelRandValue: 0,
        shinyType: 0,
      };
      
      const enhanced = assembler.assembleData(rawData);
      
      expect(enhanced.syncEligible).toBe(true);
      expect(enhanced.syncAppliedCorrectly).toBe(true);
    });
  });
  
  describe('バッチ処理', () => {
    test('複数のRawPokemonDataを一括処理できる', () => {
      const rawDataArray: RawPokemonData[] = [
        {
          seed: 0x12345678,
          pid: 0x87654321,
          nature: 0,
          syncApplied: true,
          abilitySlot: 0,
          genderValue: 50,
          encounterSlotValue: 0,
          encounterType: EncounterType.Normal,
          levelRandValue: 0,
          shinyType: 0,
        },
        {
          seed: 0x87654321,
          pid: 0x12345678,
          nature: 12,
          syncApplied: false,
          abilitySlot: 1,
          genderValue: 200,
          encounterSlotValue: 1,
          encounterType: EncounterType.Roaming,
          levelRandValue: 5,
          shinyType: 1,
        },
      ];
      
      const enhancedArray = assembler.assembleBatch(rawDataArray);
      
      expect(enhancedArray).toHaveLength(2);
      expect(enhancedArray[0].encounterType).toBe(EncounterType.Normal);
      expect(enhancedArray[0].syncEligible).toBe(true);
      expect(enhancedArray[1].encounterType).toBe(EncounterType.Roaming);
      expect(enhancedArray[1].syncEligible).toBe(false);
    });
  });
  
  describe('シンクロルール検証', () => {
    test('シンクロルール違反を検出する', () => {
      const enhancedDataArray: EnhancedPokemonData[] = [
        {
          seed: 0x12345678,
          pid: 0x87654321,
          nature: 0,
          syncApplied: true,
          abilitySlot: 0,
          genderValue: 50,
          encounterSlotValue: 0,
          encounterType: EncounterType.Roaming, // シンクロ不適用なのに
          levelRandValue: 0,
          rawShinyType: 0,
          species: 144,
          level: 40,
          ability: 1,
          gender: 2,
          isShiny: false,
          shinyType: 'normal',
          syncEligible: false,
          syncAppliedCorrectly: false, // 誤適用
        },
        {
          seed: 0x87654321,
          pid: 0x12345678,
          nature: 12,
          syncApplied: true,
          abilitySlot: 1,
          genderValue: 200,
          encounterSlotValue: 0,
          encounterType: EncounterType.Normal,
          levelRandValue: 5,
          rawShinyType: 1,
          species: 1,
          level: 7,
          ability: 2,
          gender: 0,
          isShiny: true,
          shinyType: 'square',
          syncEligible: true,
          syncAppliedCorrectly: true, // 正しく適用
        },
      ];
      
      const validation = assembler.validateSyncRules(enhancedDataArray);
      
      expect(validation.isValid).toBe(false);
      expect(validation.violations).toHaveLength(1);
      expect(validation.violations[0].index).toBe(0);
      expect(validation.violations[0].encounterType).toBe(EncounterType.Roaming);
      expect(validation.violations[0].violation).toBe('Sync incorrectly applied to roaming encounter');
    });
    
    test('正しいシンクロ適用では違反なし', () => {
      const enhancedDataArray: EnhancedPokemonData[] = [
        {
          seed: 0x12345678,
          pid: 0x87654321,
          nature: 0,
          syncApplied: true,
          abilitySlot: 0,
          genderValue: 50,
          encounterSlotValue: 0,
          encounterType: EncounterType.Normal,
          levelRandValue: 0,
          rawShinyType: 0,
          species: 1,
          level: 5,
          ability: 1,
          gender: 0,
          isShiny: false,
          shinyType: 'normal',
          syncEligible: true,
          syncAppliedCorrectly: true,
        },
        {
          seed: 0x87654321,
          pid: 0x12345678,
          nature: 12,
          syncApplied: false,
          abilitySlot: 1,
          genderValue: 200,
          encounterSlotValue: 0,
          encounterType: EncounterType.Roaming,
          levelRandValue: 5,
          rawShinyType: 1,
          species: 144,
          level: 40,
          ability: 2,
          gender: 2,
          isShiny: true,
          shinyType: 'square',
          syncEligible: false,
          syncAppliedCorrectly: true,
        },
      ];
      
      const validation = assembler.validateSyncRules(enhancedDataArray);
      
      expect(validation.isValid).toBe(true);
      expect(validation.violations).toHaveLength(0);
    });
  });
  
  describe('エンカウントテーブル管理', () => {
    test('エンカウントテーブルを設定・取得できる', () => {
      const customTable: EncounterTableEntry[] = [
        { species: 25, minLevel: 10, maxLevel: 15, abilityRatio: [1, 0], genderRatio: 50 },
      ];
      
      assembler.setEncounterTable(EncounterType.Normal, customTable);
      
      const tables = assembler.getEncounterTables();
      expect(tables[EncounterType.Normal]).toBe(customTable);
    });
    
    test('空のエンカウントテーブルでもデフォルト値で動作する', () => {
      const emptyAssembler = new PokemonAssembler('B', 'JPN', {});
      
      const rawData: RawPokemonData = {
        seed: 0x12345678,
        pid: 0x87654321,
        nature: 0,
        syncApplied: false,
        abilitySlot: 0,
        genderValue: 50,
        encounterSlotValue: 0,
        encounterType: EncounterType.Normal,
        levelRandValue: 0,
        shinyType: 0,
      };
      
      const enhanced = emptyAssembler.assembleData(rawData);
      
      expect(enhanced.species).toBe(1); // デフォルトのBulbasaur
      expect(enhanced.level).toBe(5); // デフォルトレベル
    });
  });
  
  describe('代表エンカウントタイプでの期待構造検証', () => {
    test('通常エンカウントの出力構造が期待通り', () => {
      const rawData: RawPokemonData = {
        seed: 0x12345678,
        pid: 0x87654321,
        nature: 6, // Docile
        syncApplied: true,
        abilitySlot: 1,
        genderValue: 100,
        encounterSlotValue: 1,
        encounterType: EncounterType.Normal,
        levelRandValue: 1,
        shinyType: 2,
      };
      
      const enhanced = assembler.assembleData(rawData);
      
      // 必須フィールドの存在確認
      expect(enhanced).toHaveProperty('seed');
      expect(enhanced).toHaveProperty('pid');
      expect(enhanced).toHaveProperty('nature');
      expect(enhanced).toHaveProperty('syncApplied');
      expect(enhanced).toHaveProperty('species');
      expect(enhanced).toHaveProperty('level');
      expect(enhanced).toHaveProperty('ability');
      expect(enhanced).toHaveProperty('gender');
      expect(enhanced).toHaveProperty('isShiny');
      expect(enhanced).toHaveProperty('shinyType');
      expect(enhanced).toHaveProperty('syncEligible');
      expect(enhanced).toHaveProperty('syncAppliedCorrectly');
      
      // 値の妥当性確認
      expect(enhanced.syncEligible).toBe(true);
      expect(enhanced.syncAppliedCorrectly).toBe(true);
      expect(enhanced.isShiny).toBe(true);
      expect(enhanced.shinyType).toBe('star');
    });
    
    test('徘徊エンカウントの出力構造が期待通り', () => {
      const rawData: RawPokemonData = {
        seed: 0x87654321,
        pid: 0x12345678,
        nature: 0, // Hardy
        syncApplied: false,
        abilitySlot: 0,
        genderValue: 128,
        encounterSlotValue: 0,
        encounterType: EncounterType.Roaming,
        levelRandValue: 0,
        shinyType: 0,
      };
      
      const enhanced = assembler.assembleData(rawData);
      
      // 徘徊特有の検証
      expect(enhanced.syncEligible).toBe(false);
      expect(enhanced.syncAppliedCorrectly).toBe(true);
      expect(enhanced.encounterType).toBe(EncounterType.Roaming);
      
      // dustCloudContentは徘徊では未定義
      expect(enhanced.dustCloudContent).toBeUndefined();
      
      // 基本構造の確認
      expect(enhanced).toHaveProperty('species');
      expect(enhanced).toHaveProperty('level');
      expect(enhanced).toHaveProperty('ability');
      expect(enhanced).toHaveProperty('gender');
    });
    
    test('砂煙エンカウントの出力構造が期待通り', () => {
      const rawData: RawPokemonData = {
        seed: 0xABCDEF01,
        pid: 0xFEDCBA98,
        nature: 12, // Hasty
        syncApplied: true,
        abilitySlot: 1,
        genderValue: 75,
        encounterSlotValue: 2,
        encounterType: EncounterType.DustCloud,
        levelRandValue: 3,
        shinyType: 1,
      };
      
      const enhanced = assembler.assembleData(rawData);
      
      // 砂煙特有の検証
      expect(enhanced.syncEligible).toBe(true);
      expect(enhanced.dustCloudContent).toBeDefined();
      expect([
        DustCloudContent.Pokemon,
        DustCloudContent.Item,
        DustCloudContent.Gem
      ]).toContain(enhanced.dustCloudContent);
      
      if (enhanced.dustCloudContent !== DustCloudContent.Pokemon) {
        expect(enhanced.itemId).toBeDefined();
      }
      
      // 基本構造の確認
      expect(enhanced.isShiny).toBe(true);
      expect(enhanced.shinyType).toBe('square');
    });
  });
});

describe('createSampleEncounterTables ユーティリティ', () => {
  test('サンプルエンカウントテーブルを正しく作成する', () => {
    const tables = createSampleEncounterTables();
    
    expect(tables[EncounterType.Normal]).toBeDefined();
    expect(tables[EncounterType.Roaming]).toBeDefined();
    expect(tables[EncounterType.DustCloud]).toBeDefined();
    
    expect(tables[EncounterType.Normal]!.length).toBeGreaterThan(0);
    expect(tables[EncounterType.Roaming]!.length).toBeGreaterThan(0);
    
    // 通常エンカウントテーブルの構造確認
    const normalEntry = tables[EncounterType.Normal]![0];
    expect(normalEntry).toHaveProperty('species');
    expect(normalEntry).toHaveProperty('minLevel');
    expect(normalEntry).toHaveProperty('maxLevel');
    expect(normalEntry).toHaveProperty('abilityRatio');
    expect(normalEntry).toHaveProperty('genderRatio');
    
    // 徘徊エンカウントテーブルの構造確認（伝説ポケモン）
    const roamingEntry = tables[EncounterType.Roaming]![0];
    expect(roamingEntry.species).toBeGreaterThan(140); // 伝説ポケモンの範囲
    expect(roamingEntry.genderRatio).toBe(-1); // 性別不明
  });
});
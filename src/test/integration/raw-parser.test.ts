/**
 * RawPokemonDataParser テスト
 * Phase 2-1: placeholder値処理とWASM→TypeScript変換のテスト
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  RawPokemonDataParser,
  WasmRawPokemonDataInstance,
  createRawPokemonDataParser,
  parseWasmToPokemon,
  isPlaceholderValue,
  getPlaceholderInfo
} from '@/lib/integration/raw-parser';
import {
  RawPokemonData,
  PlaceholderValue,
  EncounterType,
  ShinyType,
  RawPokemonParserConfig,
  EncounterTable,
  GenderRatio
} from '@/types/raw-pokemon';

// モックWASMインスタンス作成ヘルパー
function createMockWasmInstance(data: Partial<RawPokemonData>): WasmRawPokemonDataInstance {
  const defaultData: RawPokemonData = {
    seed: 0x123456789ABCDEFn,
    pid: 0x12345678,
    nature: 0,
    sync_applied: false,
    ability_slot: 0,
    gender_value: 128,
    encounter_slot_value: 0,
    encounter_type: EncounterType.Normal,
    level_rand_value: 0x80000000,
    shiny_type: ShinyType.Normal,
  };

  const merged = { ...defaultData, ...data };

  return {
    get_seed: () => merged.seed,
    get_pid: () => merged.pid,
    get_nature: () => merged.nature,
    get_ability_slot: () => merged.ability_slot,
    get_gender_value: () => merged.gender_value,
    get_encounter_slot_value: () => merged.encounter_slot_value,
    get_level_rand_value: () => merged.level_rand_value,
    get_shiny_type: () => merged.shiny_type,
    get_sync_applied: () => merged.sync_applied,
    get_encounter_type: () => merged.encounter_type,
  };
}

// テスト用エンカウントテーブル
const testEncounterTable: EncounterTable = {
  encounter_type: EncounterType.Normal,
  area_name: 'テストエリア',
  version: 'BW',
  species_list: [
    {
      species_id: 495, // ツタージャ
      name: 'ツタージャ',
      level_config: { min_level: 2, max_level: 4 },
      probability: 20
    },
    {
      species_id: 498, // ポカブ
      name: 'ポカブ',
      level_config: { min_level: 2, max_level: 4 },
      probability: 20
    },
    {
      species_id: 501, // ミジュマル
      name: 'ミジュマル',
      level_config: { min_level: 3, max_level: 5 },
      probability: 10
    },
  ]
};

// テスト用性別比データ
// 87.5% male ratio = 31/255 threshold for female (255 * 0.125 = 31.875)
const testGenderRatios = new Map<number, GenderRatio>([
  [495, { male_ratio: 31, female_ratio: 224, genderless: false }], // ツタージャ (♂87.5%: < 31 is female)
  [498, { male_ratio: 31, female_ratio: 224, genderless: false }], // ポカブ (♂87.5%: < 31 is female)
  [501, { male_ratio: 31, female_ratio: 224, genderless: false }], // ミジュマル (♂87.5%: < 31 is female)
]);

describe('RawPokemonDataParser', () => {
  let parser: RawPokemonDataParser;

  beforeEach(() => {
    parser = new RawPokemonDataParser({
      encounter_table: testEncounterTable,
      gender_ratios: testGenderRatios,
      process_placeholders: true,
      calculate_details: true,
    });
  });

  describe('WASM変換機能', () => {
    it('WASMインスタンスから基本データを正しく変換する', () => {
      const mockWasm = createMockWasmInstance({
        seed: 0xABCDEF123456789n,
        pid: 0x87654321,
        nature: 5,
        sync_applied: true,
        ability_slot: 1,
        gender_value: 100,
        encounter_slot_value: 2,
        encounter_type: EncounterType.Normal,
        level_rand_value: 0xC0000000,
        shiny_type: ShinyType.Square,
      });

      const result = parser.parseFromWasm(mockWasm);

      expect(result.seed).toBe(0xABCDEF123456789n);
      expect(result.pid).toBe(0x87654321);
      expect(result.nature).toBe(5);
      expect(result.sync_applied).toBe(true);
      expect(result.ability_slot).toBe(1);
      expect(result.gender_value).toBe(100);
      expect(result.encounter_slot_value).toBe(2);
      expect(result.encounter_type).toBe(EncounterType.Normal);
      expect(result.level_rand_value).toBe(0xC0000000);
      expect(result.shiny_type).toBe(ShinyType.Square);
    });

    it('WASM変換でエラーが発生した場合適切にハンドリングする', () => {
      const faultyWasm = {
        get_seed: () => { throw new Error('WASM error'); },
        get_pid: () => 0,
        get_nature: () => 0,
        get_ability_slot: () => 0,
        get_gender_value: () => 0,
        get_encounter_slot_value: () => 0,
        get_level_rand_value: () => 0,
        get_shiny_type: () => 0,
        get_sync_applied: () => false,
        get_encounter_type: () => 0,
      };

      expect(() => parser.parseFromWasm(faultyWasm)).toThrow('WASM RawPokemonData parsing failed');
    });
  });

  describe('placeholder値処理', () => {
    it('無効値(0)を文脈に応じて適切に処理する', () => {
      // エンカウントスロット0は有効
      expect(parser.processPlaceholderValue(PlaceholderValue.INVALID, 'encounter_slot')).toBe(0);
      
      // 特性スロット0は有効
      expect(parser.processPlaceholderValue(PlaceholderValue.INVALID, 'ability')).toBe(0);
      
      // レベルでは無効
      expect(parser.processPlaceholderValue(PlaceholderValue.INVALID, 'level')).toBeNull();
      
      // その他では無効
      expect(parser.processPlaceholderValue(PlaceholderValue.INVALID, 'general')).toBeNull();
    });

    it('デフォルト値(127)を文脈に応じて適切に処理する', () => {
      // 性別値では有効
      expect(parser.processPlaceholderValue(PlaceholderValue.DEFAULT, 'gender')).toBe(127);
      
      // レベルでは無効
      expect(parser.processPlaceholderValue(PlaceholderValue.DEFAULT, 'level')).toBeNull();
      
      // その他では有効
      expect(parser.processPlaceholderValue(PlaceholderValue.DEFAULT, 'general')).toBe(127);
    });

    it('最大値(255)を文脈に応じて適切に処理する', () => {
      // 性別値では有効
      expect(parser.processPlaceholderValue(PlaceholderValue.MAX, 'gender')).toBe(255);
      
      // エンカウントスロットでは無効
      expect(parser.processPlaceholderValue(PlaceholderValue.MAX, 'encounter_slot')).toBeNull();
      
      // その他では有効
      expect(parser.processPlaceholderValue(PlaceholderValue.MAX, 'general')).toBe(255);
    });

    it('通常値はそのまま返す', () => {
      expect(parser.processPlaceholderValue(50, 'level')).toBe(50);
      expect(parser.processPlaceholderValue(100, 'gender')).toBe(100);
      expect(parser.processPlaceholderValue(7, 'encounter_slot')).toBe(7);
    });

    it('placeholder処理を無効にできる', () => {
      const parserNoPlaceholder = new RawPokemonDataParser({
        process_placeholders: false,
      });

      expect(parserNoPlaceholder.processPlaceholderValue(PlaceholderValue.INVALID, 'level')).toBe(0);
      expect(parserNoPlaceholder.processPlaceholderValue(PlaceholderValue.DEFAULT, 'level')).toBe(127);
      expect(parserNoPlaceholder.processPlaceholderValue(PlaceholderValue.MAX, 'level')).toBe(255);
    });
  });

  describe('詳細データ変換', () => {
    it('基本的な詳細データを正しく計算する', () => {
      const rawData: RawPokemonData = {
        seed: 0x123456789ABCDEFn,
        pid: 0x12345678,
        nature: 5, // ずぶとい
        sync_applied: false,
        ability_slot: 1,
        gender_value: 50, // 雄
        encounter_slot_value: 0, // ツタージャ
        encounter_type: EncounterType.Normal,
        level_rand_value: 0x80000000, // 中間値
        shiny_type: ShinyType.Normal,
      };

      const result = parser.parseToDetailed(rawData);

      expect(result.nature_name).toBe('ずぶとい');
      expect(result.species_id).toBe(495); // ツタージャ
      expect(result.gender).toBe('M'); // 雄
      expect(result.calculated_level).toBe(3); // min_level(2) + 中間値 = 3
      expect(result.shiny_info?.is_shiny).toBe(false);
      expect(result.shiny_info?.type).toBe('normal');
    });

    it('性別判定を正しく行う', () => {
      const baseData: RawPokemonData = {
        seed: 0x123456789ABCDEFn,
        pid: 0x12345678,
        nature: 0,
        sync_applied: false,
        ability_slot: 0,
        gender_value: 50, // 雄確定値
        encounter_slot_value: 0,
        encounter_type: EncounterType.Normal,
        level_rand_value: 0x80000000,
        shiny_type: ShinyType.Normal,
      };

      // 雄の場合 (50 > 31)
      const maleResult = parser.parseToDetailed({ ...baseData, gender_value: 50 });
      expect(maleResult.gender).toBe('M');

      // 雌の場合 (20 < 31)
      const femaleResult = parser.parseToDetailed({ ...baseData, gender_value: 20 });
      expect(femaleResult.gender).toBe('F');

      // placeholder値の場合
      const unknownResult = parser.parseToDetailed({ ...baseData, gender_value: PlaceholderValue.INVALID });
      expect(unknownResult.gender).toBe('N');
    });

    it('色違い情報を正しく分析する', () => {
      const shinyData: RawPokemonData = {
        seed: 0x123456789ABCDEFn,
        pid: 0x12345678,
        nature: 0,
        sync_applied: false,
        ability_slot: 0,
        gender_value: 128,
        encounter_slot_value: 0,
        encounter_type: EncounterType.Normal,
        level_rand_value: 0x80000000,
        shiny_type: ShinyType.Square,
      };

      const result = parser.parseToDetailed(shinyData);

      expect(result.shiny_info?.is_shiny).toBe(true);
      expect(result.shiny_info?.type).toBe('square');
      expect(result.shiny_info?.shiny_value).toBe(0x1234 ^ 0x5678); // PID high ^ PID low
    });

    it('固定エンカウントのレベルを正しく設定する', () => {
      const staticData: RawPokemonData = {
        seed: 0x123456789ABCDEFn,
        pid: 0x12345678,
        nature: 0,
        sync_applied: false,
        ability_slot: 0,
        gender_value: 128,
        encounter_slot_value: 0,
        encounter_type: EncounterType.StaticStarter,
        level_rand_value: 0x80000000,
        shiny_type: ShinyType.Normal,
      };

      const result = parser.parseToDetailed(staticData);

      expect(result.calculated_level).toBe(5); // 御三家の固定レベル
    });

    it('詳細計算を無効にできる', () => {
      const parserNoDetails = new RawPokemonDataParser({
        calculate_details: false,
      });

      const rawData: RawPokemonData = {
        seed: 0x123456789ABCDEFn,
        pid: 0x12345678,
        nature: 5,
        sync_applied: false,
        ability_slot: 1,
        gender_value: 50,
        encounter_slot_value: 0,
        encounter_type: EncounterType.Normal,
        level_rand_value: 0x80000000,
        shiny_type: ShinyType.Normal,
      };

      const result = parserNoDetails.parseToDetailed(rawData);

      expect(result.nature_name).toBeUndefined();
      expect(result.species_id).toBeUndefined();
      expect(result.gender).toBeUndefined();
      expect(result.calculated_level).toBeUndefined();
      expect(result.shiny_info).toBeUndefined();
    });
  });

  describe('レベル計算', () => {
    it('野生エンカウントのレベル範囲計算', () => {
      const testCases = [
        { level_rand_value: 0x00000000, expected: 2 }, // 最小値
        { level_rand_value: 0x80000000, expected: 3 }, // 中間値
        { level_rand_value: 0xFFFFFFFF, expected: 4 }, // 最大値
      ];

      testCases.forEach(({ level_rand_value, expected }) => {
        const rawData: RawPokemonData = {
          seed: 0x123456789ABCDEFn,
          pid: 0x12345678,
          nature: 0,
          sync_applied: false,
          ability_slot: 0,
          gender_value: 128,
          encounter_slot_value: 0, // ツタージャ (レベル2-4)
          encounter_type: EncounterType.Normal,
          level_rand_value,
          shiny_type: ShinyType.Normal,
        };

        const result = parser.parseToDetailed(rawData);
        expect(result.calculated_level).toBe(expected);
      });
    });

    it('placeholder値のレベル乱数は無効として扱う', () => {
      const rawData: RawPokemonData = {
        seed: 0x123456789ABCDEFn,
        pid: 0x12345678,
        nature: 0,
        sync_applied: false,
        ability_slot: 0,
        gender_value: 128,
        encounter_slot_value: 0,
        encounter_type: EncounterType.Normal,
        level_rand_value: PlaceholderValue.DEFAULT, // 127は無効
        shiny_type: ShinyType.Normal,
      };

      const result = parser.parseToDetailed(rawData);
      expect(result.calculated_level).toBeUndefined();
    });
  });

  describe('バッチ処理', () => {
    it('複数のWASMインスタンスを一括変換する', () => {
      const wasmInstances = [
        createMockWasmInstance({ nature: 0, pid: 0x11111111 }),
        createMockWasmInstance({ nature: 5, pid: 0x22222222 }),
        createMockWasmInstance({ nature: 10, pid: 0x33333333 }),
      ];

      const results = parser.parseFromWasmBatch(wasmInstances);

      expect(results).toHaveLength(3);
      expect(results[0].nature).toBe(0);
      expect(results[0].pid).toBe(0x11111111);
      expect(results[1].nature).toBe(5);
      expect(results[1].pid).toBe(0x22222222);
      expect(results[2].nature).toBe(10);
      expect(results[2].pid).toBe(0x33333333);
    });

    it('複数のRawPokemonDataを詳細データに一括変換する', () => {
      const rawDataArray: RawPokemonData[] = [
        {
          seed: 0x123456789ABCDEFn,
          pid: 0x11111111,
          nature: 0,
          sync_applied: false,
          ability_slot: 0,
          gender_value: 50,
          encounter_slot_value: 0,
          encounter_type: EncounterType.Normal,
          level_rand_value: 0x40000000,
          shiny_type: ShinyType.Normal,
        },
        {
          seed: 0x123456789ABCDEFn,
          pid: 0x22222222,
          nature: 5,
          sync_applied: true,
          ability_slot: 1,
          gender_value: 20, // 雌 (20 < 31)
          encounter_slot_value: 1,
          encounter_type: EncounterType.Normal,
          level_rand_value: 0xC0000000,
          shiny_type: ShinyType.Star,
        },
      ];

      const results = parser.parseToDetailedBatch(rawDataArray);

      expect(results).toHaveLength(2);
      expect(results[0].nature_name).toBe('がんばりや');
      expect(results[0].gender).toBe('M');
      expect(results[1].nature_name).toBe('ずぶとい');
      expect(results[1].gender).toBe('F');
      expect(results[1].shiny_info?.type).toBe('star');
    });
  });

  describe('設定管理', () => {
    it('設定を動的に更新できる', () => {
      const newTable: EncounterTable = {
        encounter_type: EncounterType.Surfing,
        area_name: '新しいエリア',
        version: 'BW2',
        species_list: [
          {
            species_id: 550, // バスラオ
            name: 'バスラオ',
            level_config: { fixed_level: 30 },
            probability: 100
          }
        ]
      };

      parser.updateConfig({ encounter_table: newTable });

      const rawData: RawPokemonData = {
        seed: 0x123456789ABCDEFn,
        pid: 0x12345678,
        nature: 0,
        sync_applied: false,
        ability_slot: 0,
        gender_value: 128,
        encounter_slot_value: 0,
        encounter_type: EncounterType.Surfing,
        level_rand_value: 0x80000000,
        shiny_type: ShinyType.Normal,
      };

      const result = parser.parseToDetailed(rawData);
      expect(result.species_id).toBe(550); // バスラオ
    });
  });
});

describe('ユーティリティ関数', () => {
  describe('createRawPokemonDataParser', () => {
    it('デフォルト設定でパーサーを作成する', () => {
      const parser = createRawPokemonDataParser();
      expect(parser).toBeInstanceOf(RawPokemonDataParser);
    });

    it('カスタム設定でパーサーを作成する', () => {
      const config: Partial<RawPokemonParserConfig> = {
        process_placeholders: false,
        calculate_details: false,
      };
      const parser = createRawPokemonDataParser(config);
      expect(parser).toBeInstanceOf(RawPokemonDataParser);
    });
  });

  describe('parseWasmToPokemon', () => {
    it('WASMインスタンスから直接ParsedPokemonDataを取得する', () => {
      const mockWasm = createMockWasmInstance({
        nature: 5,
        gender_value: 100,
        encounter_slot_value: 0,
        encounter_type: EncounterType.Normal,
        level_rand_value: 0x80000000,
      });

      const config: Partial<RawPokemonParserConfig> = {
        encounter_table: testEncounterTable,
        gender_ratios: testGenderRatios,
      };

      const result = parseWasmToPokemon(mockWasm, config);

      expect(result.nature_name).toBe('ずぶとい');
      expect(result.species_id).toBe(495);
      expect(result.gender).toBe('M');
    });
  });

  describe('isPlaceholderValue', () => {
    it('placeholder値を正しく判定する', () => {
      expect(isPlaceholderValue(0)).toBe(true);
      expect(isPlaceholderValue(127)).toBe(true);
      expect(isPlaceholderValue(255)).toBe(true);
      expect(isPlaceholderValue(50)).toBe(false);
      expect(isPlaceholderValue(200)).toBe(false);
    });
  });

  describe('getPlaceholderInfo', () => {
    it('placeholder値の情報を取得する', () => {
      const info0 = getPlaceholderInfo(0);
      expect(info0?.type).toBe(PlaceholderValue.INVALID);
      expect(info0?.description).toBe('無効値・未設定');

      const info127 = getPlaceholderInfo(127);
      expect(info127?.type).toBe(PlaceholderValue.DEFAULT);
      expect(info127?.description).toBe('中間値・デフォルト');

      const info255 = getPlaceholderInfo(255);
      expect(info255?.type).toBe(PlaceholderValue.MAX);
      expect(info255?.description).toBe('最大値・確定');

      const infoNormal = getPlaceholderInfo(100);
      expect(infoNormal).toBeNull();
    });
  });
});

describe('エラーケース', () => {
  it('エンカウントテーブルなしでも正常動作する', () => {
    const parserNoTable = new RawPokemonDataParser({
      encounter_table: undefined,
    });

    const rawData: RawPokemonData = {
      seed: 0x123456789ABCDEFn,
      pid: 0x12345678,
      nature: 0,
      sync_applied: false,
      ability_slot: 0,
      gender_value: 128,
      encounter_slot_value: 0,
      encounter_type: EncounterType.Normal,
      level_rand_value: 0x80000000,
      shiny_type: ShinyType.Normal,
    };

    const result = parserNoTable.parseToDetailed(rawData);
    expect(result.species_id).toBeUndefined();
    expect(result.calculated_level).toBeUndefined();
  });

  it('不正な性格IDを処理する', () => {
    const parser = createRawPokemonDataParser();
    const rawData: RawPokemonData = {
      seed: 0x123456789ABCDEFn,
      pid: 0x12345678,
      nature: 99, // 不正な性格ID
      sync_applied: false,
      ability_slot: 0,
      gender_value: 128,
      encounter_slot_value: 0,
      encounter_type: EncounterType.Normal,
      level_rand_value: 0x80000000,
      shiny_type: ShinyType.Normal,
    };

    const result = parser.parseToDetailed(rawData);
    expect(result.nature_name).toBe('Unknown(99)');
  });

  it('範囲外のエンカウントスロットを処理する', () => {
    const parser = new RawPokemonDataParser({
      encounter_table: testEncounterTable,
    });

    const rawData: RawPokemonData = {
      seed: 0x123456789ABCDEFn,
      pid: 0x12345678,
      nature: 0,
      sync_applied: false,
      ability_slot: 0,
      gender_value: 128,
      encounter_slot_value: 99, // 範囲外
      encounter_type: EncounterType.Normal,
      level_rand_value: 0x80000000,
      shiny_type: ShinyType.Normal,
    };

    const result = parser.parseToDetailed(rawData);
    expect(result.species_id).toBeUndefined();
  });
});
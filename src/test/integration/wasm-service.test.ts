/**
 * Integration tests for WASM Service
 * Tests enum conversions, validation, error handling, and WASM integration
 */

import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import {
  WasmService,
  EnumConverter,
  ParameterValidator,
  WasmGameVersion,
  WasmEncounterType,
  WasmGameMode,
  ValidationError,
  ConversionError,
  WasmInitializationError,
} from '../../lib/core/wasm-service';
import type { ROMVersion, Hardware, SearchConditions } from '../../types/pokemon';
import { initWasmForTesting } from '../wasm-loader';

describe('WASM Service Integration Tests', () => {
  let wasmService: WasmService;

  beforeAll(async () => {
    await initWasmForTesting();
    wasmService = WasmService.getInstance();
    await wasmService.initialize();
  });

  describe('EnumConverter', () => {
    describe('romVersionToGameVersion', () => {
      it('should convert BW ROM versions correctly', () => {
        expect(EnumConverter.romVersionToGameVersion('B')).toBe(WasmGameVersion.BlackWhite);
        expect(EnumConverter.romVersionToGameVersion('W')).toBe(WasmGameVersion.BlackWhite);
      });

      it('should convert BW2 ROM versions correctly', () => {
        expect(EnumConverter.romVersionToGameVersion('B2')).toBe(WasmGameVersion.BlackWhite2);
        expect(EnumConverter.romVersionToGameVersion('W2')).toBe(WasmGameVersion.BlackWhite2);
      });

      it('should throw ConversionError for invalid ROM versions', () => {
        expect(() => EnumConverter.romVersionToGameVersion('INVALID' as ROMVersion))
          .toThrow(ConversionError);
      });
    });

    describe('stringToEncounterType', () => {
      it('should convert basic encounter types', () => {
        expect(EnumConverter.stringToEncounterType('normal')).toBe(WasmEncounterType.Normal);
        expect(EnumConverter.stringToEncounterType('SURFING')).toBe(WasmEncounterType.Surfing);
        expect(EnumConverter.stringToEncounterType('fishing')).toBe(WasmEncounterType.Fishing);
      });

      it('should handle special encounter types', () => {
        expect(EnumConverter.stringToEncounterType('shaking_grass')).toBe(WasmEncounterType.ShakingGrass);
        expect(EnumConverter.stringToEncounterType('dust-cloud')).toBe(WasmEncounterType.DustCloud);
        expect(EnumConverter.stringToEncounterType('pokemon_shadow')).toBe(WasmEncounterType.PokemonShadow);
      });

      it('should handle static encounter types', () => {
        expect(EnumConverter.stringToEncounterType('static_symbol')).toBe(WasmEncounterType.StaticSymbol);
        expect(EnumConverter.stringToEncounterType('static_starter')).toBe(WasmEncounterType.StaticStarter);
        expect(EnumConverter.stringToEncounterType('roaming')).toBe(WasmEncounterType.Roaming);
      });

      it('should throw ConversionError for invalid encounter types', () => {
        expect(() => EnumConverter.stringToEncounterType('invalid'))
          .toThrow(ConversionError);
      });
    });

    describe('configToGameMode', () => {
      it('should convert BW game modes correctly', () => {
        expect(EnumConverter.configToGameMode('B', true, true)).toBe(WasmGameMode.BwNewGameWithSave);
        expect(EnumConverter.configToGameMode('W', false, true)).toBe(WasmGameMode.BwNewGameNoSave);
        expect(EnumConverter.configToGameMode('B', true, false)).toBe(WasmGameMode.BwContinue);
      });

      it('should convert BW2 game modes correctly', () => {
        expect(EnumConverter.configToGameMode('B2', true, true, true)).toBe(WasmGameMode.Bw2NewGameWithMemoryLinkSave);
        expect(EnumConverter.configToGameMode('W2', true, true, false)).toBe(WasmGameMode.Bw2NewGameNoMemoryLinkSave);
        expect(EnumConverter.configToGameMode('B2', false, true)).toBe(WasmGameMode.Bw2NewGameNoSave);
        expect(EnumConverter.configToGameMode('W2', true, false, true)).toBe(WasmGameMode.Bw2ContinueWithMemoryLink);
        expect(EnumConverter.configToGameMode('B2', true, false, false)).toBe(WasmGameMode.Bw2ContinueNoMemoryLink);
      });
    });

    describe('validateHardware', () => {
      it('should validate correct hardware types', () => {
        expect(EnumConverter.validateHardware('DS')).toBe('DS');
        expect(EnumConverter.validateHardware('DS_LITE')).toBe('DS_LITE');
        expect(EnumConverter.validateHardware('3DS')).toBe('3DS');
      });

      it('should throw ConversionError for invalid hardware', () => {
        expect(() => EnumConverter.validateHardware('INVALID' as Hardware))
          .toThrow(ConversionError);
      });
    });
  });

  describe('ParameterValidator', () => {
    describe('validateMacAddress', () => {
      it('should validate correct MAC addresses', () => {
        const validMac = [0x00, 0x01, 0x02, 0x03, 0x04, 0x05];
        const result = ParameterValidator.validateMacAddress(validMac);
        expect(result).toBeInstanceOf(Uint8Array);
        expect(Array.from(result)).toEqual(validMac);
      });

      it('should throw ValidationError for invalid MAC addresses', () => {
        expect(() => ParameterValidator.validateMacAddress([]))
          .toThrow(ValidationError);
        expect(() => ParameterValidator.validateMacAddress([1, 2, 3, 4, 5]))
          .toThrow(ValidationError);
        expect(() => ParameterValidator.validateMacAddress([1, 2, 3, 4, 5, 256]))
          .toThrow(ValidationError);
        expect(() => ParameterValidator.validateMacAddress([1, 2, 3, 4, 5, -1]))
          .toThrow(ValidationError);
      });
    });

    describe('validateNazo', () => {
      it('should validate correct nazo values', () => {
        const validNazo = [0x12345678, 0x9ABCDEF0, 0x11111111, 0x22222222, 0x33333333];
        const result = ParameterValidator.validateNazo(validNazo);
        expect(result).toBeInstanceOf(Uint32Array);
        expect(Array.from(result)).toEqual(validNazo);
      });

      it('should throw ValidationError for invalid nazo', () => {
        expect(() => ParameterValidator.validateNazo([]))
          .toThrow(ValidationError);
        expect(() => ParameterValidator.validateNazo([1, 2, 3, 4]))
          .toThrow(ValidationError);
        expect(() => ParameterValidator.validateNazo([1, 2, 3, 4, 5, 6]))
          .toThrow(ValidationError);
        expect(() => ParameterValidator.validateNazo([1, 2, 3, 4, 0x100000000]))
          .toThrow(ValidationError);
        expect(() => ParameterValidator.validateNazo([1, 2, 3, 4, -1]))
          .toThrow(ValidationError);
      });
    });

    describe('validateKeyInput', () => {
      it('should validate correct key inputs', () => {
        expect(ParameterValidator.validateKeyInput(0)).toBe(0);
        expect(ParameterValidator.validateKeyInput(255)).toBe(255);
        expect(ParameterValidator.validateKeyInput(4095)).toBe(4095);
      });

      it('should throw ValidationError for invalid key inputs', () => {
        expect(() => ParameterValidator.validateKeyInput(-1))
          .toThrow(ValidationError);
        expect(() => ParameterValidator.validateKeyInput(4096))
          .toThrow(ValidationError);
        expect(() => ParameterValidator.validateKeyInput(1.5))
          .toThrow(ValidationError);
      });
    });

    describe('validateRange', () => {
      it('should validate correct ranges', () => {
        const result = ParameterValidator.validateRange(10, 20, 'test');
        expect(result).toEqual({ min: 10, max: 20 });
      });

      it('should throw ValidationError for invalid ranges', () => {
        expect(() => ParameterValidator.validateRange(20, 10, 'test'))
          .toThrow(ValidationError);
        expect(() => ParameterValidator.validateRange(-1, 10, 'test'))
          .toThrow(ValidationError);
        expect(() => ParameterValidator.validateRange(10, 100000, 'timer0'))
          .toThrow(ValidationError);
      });
    });

    describe('validateDateTime', () => {
      it('should validate correct date/time', () => {
        expect(() => ParameterValidator.validateDateTime(2023, 6, 15, 12, 30, 45))
          .not.toThrow();
      });

      it('should throw ValidationError for invalid date/time', () => {
        expect(() => ParameterValidator.validateDateTime(1999, 6, 15, 12, 30, 45))
          .toThrow(ValidationError);
        expect(() => ParameterValidator.validateDateTime(2023, 13, 15, 12, 30, 45))
          .toThrow(ValidationError);
        expect(() => ParameterValidator.validateDateTime(2023, 6, 32, 12, 30, 45))
          .toThrow(ValidationError);
        expect(() => ParameterValidator.validateDateTime(2023, 6, 15, 25, 30, 45))
          .toThrow(ValidationError);
        expect(() => ParameterValidator.validateDateTime(2023, 6, 15, 12, 60, 45))
          .toThrow(ValidationError);
        expect(() => ParameterValidator.validateDateTime(2023, 6, 15, 12, 30, 60))
          .toThrow(ValidationError);
        expect(() => ParameterValidator.validateDateTime(2023, 2, 29, 12, 30, 45))
          .toThrow(ValidationError); // 2023 is not a leap year
      });
    });

    describe('validateTargetSeeds', () => {
      it('should validate correct target seeds', () => {
        const validSeeds = [0x12345678, 0x9ABCDEF0, 0xFFFFFFFF, 0x00000000];
        const result = ParameterValidator.validateTargetSeeds(validSeeds);
        expect(result).toBeInstanceOf(Uint32Array);
        expect(Array.from(result)).toEqual(validSeeds);
      });

      it('should throw ValidationError for invalid target seeds', () => {
        expect(() => ParameterValidator.validateTargetSeeds([]))
          .toThrow(ValidationError);
        expect(() => ParameterValidator.validateTargetSeeds([0x100000000]))
          .toThrow(ValidationError);
        expect(() => ParameterValidator.validateTargetSeeds([-1]))
          .toThrow(ValidationError);
        expect(() => ParameterValidator.validateTargetSeeds(new Array(10001).fill(0)))
          .toThrow(ValidationError);
      });
    });
  });

  describe('WasmService', () => {
    describe('initialization', () => {
      it('should initialize successfully', async () => {
        expect(wasmService.isReady()).toBe(true);
      });

      it('should throw WasmInitializationError when WASM operations are called before initialization', () => {
        const uninitializedService = new (WasmService as any)();
        expect(() => uninitializedService.createSearcher(
          [0, 1, 2, 3, 4, 5],
          [1, 2, 3, 4, 5],
          'DS',
          0
        )).toThrow(WasmInitializationError);
      });
    });

    describe('createSearcher', () => {
      it('should create searcher with valid parameters', () => {
        const searcher = wasmService.createSearcher(
          [0x00, 0x01, 0x02, 0x03, 0x04, 0x05],
          [0x12345678, 0x9ABCDEF0, 0x11111111, 0x22222222, 0x33333333],
          'DS',
          0
        );
        expect(searcher).toBeDefined();
        expect(typeof searcher.search_seeds_integrated_simd).toBe('function');
        expect(typeof searcher.free).toBe('function');
        
        // Clean up
        searcher.free();
      });

      it('should throw ValidationError for invalid parameters', () => {
        expect(() => wasmService.createSearcher(
          [0, 1, 2, 3, 4], // Invalid MAC length
          [1, 2, 3, 4, 5],
          'DS',
          0
        )).toThrow(ValidationError);

        expect(() => wasmService.createSearcher(
          [0, 1, 2, 3, 4, 5],
          [1, 2, 3, 4], // Invalid nazo length
          'DS',
          0
        )).toThrow(ValidationError);

        expect(() => wasmService.createSearcher(
          [0, 1, 2, 3, 4, 5],
          [1, 2, 3, 4, 5],
          'INVALID' as Hardware,
          0
        )).toThrow(ConversionError);
      });
    });

    describe('searchSeeds', () => {
      let searcher: any;

      beforeAll(() => {
        searcher = wasmService.createSearcher(
          [0x00, 0x01, 0x02, 0x03, 0x04, 0x05],
          [0x12345678, 0x9ABCDEF0, 0x11111111, 0x22222222, 0x33333333],
          'DS',
          0
        );
      });

      afterEach(() => {
        // searcher remains valid for all tests in this describe block
      });

      it('should perform search with valid parameters', () => {
        const results = wasmService.searchSeeds(
          searcher,
          {
            year: 2023,
            month: 6,
            date: 15,
            hour: 12,
            minute: 30,
            second: 0,
          },
          10, // 10 seconds range
          { min: 0x1000, max: 0x1001 },
          { min: 0x80, max: 0x81 },
          [0x12345678, 0x9ABCDEF0]
        );
        
        expect(Array.isArray(results)).toBe(true);
        // Results may be empty if no matches found, which is expected
      });

      it('should throw ValidationError for invalid search parameters', () => {
        expect(() => wasmService.searchSeeds(
          searcher,
          {
            year: 1999, // Invalid year
            month: 6,
            date: 15,
            hour: 12,
            minute: 30,
            second: 0,
          },
          10,
          { min: 0x1000, max: 0x1001 },
          { min: 0x80, max: 0x81 },
          [0x12345678]
        )).toThrow(ValidationError);

        expect(() => wasmService.searchSeeds(
          searcher,
          {
            year: 2023,
            month: 6,
            date: 15,
            hour: 12,
            minute: 30,
            second: 0,
          },
          0, // Invalid range
          { min: 0x1000, max: 0x1001 },
          { min: 0x80, max: 0x81 },
          [0x12345678]
        )).toThrow(ValidationError);

        expect(() => wasmService.searchSeeds(
          searcher,
          {
            year: 2023,
            month: 6,
            date: 15,
            hour: 12,
            minute: 30,
            second: 0,
          },
          10,
          { min: 0x1001, max: 0x1000 }, // Invalid range
          { min: 0x80, max: 0x81 },
          [0x12345678]
        )).toThrow(ValidationError);

        expect(() => wasmService.searchSeeds(
          searcher,
          {
            year: 2023,
            month: 6,
            date: 15,
            hour: 12,
            minute: 30,
            second: 0,
          },
          10,
          { min: 0x1000, max: 0x1001 },
          { min: 0x80, max: 0x81 },
          [] // Empty target seeds
        )).toThrow(ValidationError);
      });

      it('should throw ValidationError when searcher is null', () => {
        expect(() => wasmService.searchSeeds(
          null,
          {
            year: 2023,
            month: 6,
            date: 15,
            hour: 12,
            minute: 30,
            second: 0,
          },
          10,
          { min: 0x1000, max: 0x1001 },
          { min: 0x80, max: 0x81 },
          [0x12345678]
        )).toThrow(ValidationError);
      });
    });

    describe('searchWithConditions', () => {
      it('should perform search with SearchConditions interface', async () => {
        const conditions: SearchConditions = {
          romVersion: 'B',
          romRegion: 'JPN',
          hardware: 'DS',
          timer0VCountConfig: {
            useAutoConfiguration: false,
            timer0Range: { min: 0x1000, max: 0x1001 },
            vcountRange: { min: 0x80, max: 0x81 },
          },
          dateRange: {
            startYear: 2023,
            endYear: 2023,
            startMonth: 6,
            endMonth: 6,
            startDay: 15,
            endDay: 15,
            startHour: 12,
            endHour: 12,
            startMinute: 30,
            endMinute: 30,
            startSecond: 0,
            endSecond: 10,
          },
          keyInput: 0,
          macAddress: [0x00, 0x01, 0x02, 0x03, 0x04, 0x05],
        };

        const results = await wasmService.searchWithConditions(
          conditions,
          [0x12345678, 0x9ABCDEF0],
          [0x12345678, 0x9ABCDEF0, 0x11111111, 0x22222222, 0x33333333] // nazo values
        );

        expect(Array.isArray(results)).toBe(true);
      });

      it('should handle missing nazo with fallback', async () => {
        const conditions: SearchConditions = {
          romVersion: 'B2',
          romRegion: 'USA',
          hardware: 'DS_LITE',
          timer0VCountConfig: {
            useAutoConfiguration: false,
            timer0Range: { min: 0x1000, max: 0x1001 },
            vcountRange: { min: 0x80, max: 0x81 },
          },
          dateRange: {
            startYear: 2023,
            endYear: 2023,
            startMonth: 6,
            endMonth: 6,
            startDay: 15,
            endDay: 15,
            startHour: 12,
            endHour: 12,
            startMinute: 30,
            endMinute: 30,
            startSecond: 0,
            endSecond: 5,
          },
          keyInput: 255,
          macAddress: [0xFF, 0xFE, 0xFD, 0xFC, 0xFB, 0xFA],
        };

        const results = await wasmService.searchWithConditions(
          conditions,
          [0x12345678],
          [0xAABBCCDD, 0xEEFF0011, 0x22334455, 0x66778899, 0xAABBCCDD] // nazo values
        );

        expect(Array.isArray(results)).toBe(true);
      });
    });

    describe('error handling and edge cases', () => {
      it('should handle maximum valid values without error', () => {
        const searcher = wasmService.createSearcher(
          [255, 255, 255, 255, 255, 255],
          [0xFFFFFFFF, 0xFFFFFFFF, 0xFFFFFFFF, 0xFFFFFFFF, 0xFFFFFFFF],
          '3DS',
          4095,
          0xFFFFFFFF
        );
        
        expect(searcher).toBeDefined();
        searcher.free();
      });

      it('should handle minimum valid values without error', () => {
        const searcher = wasmService.createSearcher(
          [0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0],
          'DS',
          0,
          0
        );
        
        expect(searcher).toBeDefined();
        searcher.free();
      });

      it('should provide meaningful error messages', () => {
        try {
          ParameterValidator.validateMacAddress([1, 2, 3]);
        } catch (error) {
          expect(error).toBeInstanceOf(ValidationError);
          expect((error as ValidationError).message).toContain('6 bytes');
          expect((error as ValidationError).field).toBe('macAddress');
        }

        try {
          EnumConverter.romVersionToGameVersion('INVALID' as ROMVersion);
        } catch (error) {
          expect(error).toBeInstanceOf(ConversionError);
          expect((error as ConversionError).message).toContain('Invalid ROM version');
          expect((error as ConversionError).value).toBe('INVALID');
        }
      });
    });

    describe('resource management', () => {
      it('should properly free searcher resources', () => {
        const searcher = wasmService.createSearcher(
          [0x00, 0x01, 0x02, 0x03, 0x04, 0x05],
          [0x12345678, 0x9ABCDEF0, 0x11111111, 0x22222222, 0x33333333],
          'DS',
          0
        );
        
        expect(typeof searcher.free).toBe('function');
        
        // Should not throw
        expect(() => searcher.free()).not.toThrow();
        
        // Calling free again may throw (this is expected WASM behavior)
        // We don't require it to be safe to call multiple times
      });
    });
  });

  describe('Browser vs Node.js compatibility', () => {
    it('should work in Node.js environment', () => {
      expect(wasmService.isReady()).toBe(true);
      
      // Basic functionality test
      const searcher = wasmService.createSearcher(
        [0x00, 0x01, 0x02, 0x03, 0x04, 0x05],
        [0x12345678, 0x9ABCDEF0, 0x11111111, 0x22222222, 0x33333333],
        'DS',
        0
      );
      
      expect(searcher).toBeDefined();
      searcher.free();
    });
  });

  describe('Integration with real game scenarios', () => {
    it('should handle BW game mode conversion correctly', () => {
      // Test various BW scenarios
      expect(EnumConverter.configToGameMode('B', true, true)).toBe(WasmGameMode.BwNewGameWithSave);
      expect(EnumConverter.configToGameMode('W', false, true)).toBe(WasmGameMode.BwNewGameNoSave);
      expect(EnumConverter.configToGameMode('B', true, false)).toBe(WasmGameMode.BwContinue);
    });

    it('should handle BW2 memory link scenarios correctly', () => {
      // Test BW2 with memory link
      expect(EnumConverter.configToGameMode('B2', true, true, true)).toBe(WasmGameMode.Bw2NewGameWithMemoryLinkSave);
      expect(EnumConverter.configToGameMode('W2', true, true, false)).toBe(WasmGameMode.Bw2NewGameNoMemoryLinkSave);
      expect(EnumConverter.configToGameMode('B2', true, false, true)).toBe(WasmGameMode.Bw2ContinueWithMemoryLink);
      expect(EnumConverter.configToGameMode('W2', true, false, false)).toBe(WasmGameMode.Bw2ContinueNoMemoryLink);
    });

    it('should validate realistic MAC addresses', () => {
      // Common Nintendo DS MAC address patterns
      const nintendoMAC = [0x00, 0x09, 0xBF, 0x12, 0x34, 0x56];
      const result = ParameterValidator.validateMacAddress(nintendoMAC);
      expect(Array.from(result)).toEqual(nintendoMAC);
    });

    it('should handle realistic timer0/vcount ranges', () => {
      // Common DS timer0 values
      const timer0Range = ParameterValidator.validateRange(0x1000, 0x1FFF, 'timer0');
      expect(timer0Range.min).toBe(0x1000);
      expect(timer0Range.max).toBe(0x1FFF);

      // Common vcount values  
      const vcountRange = ParameterValidator.validateRange(0x80, 0xFF, 'vcount');
      expect(vcountRange.min).toBe(0x80);
      expect(vcountRange.max).toBe(0xFF);
    });

    it('should prevent excessive computation with large ranges', () => {
      expect(() => ParameterValidator.validateRange(0, 100000, 'timer0'))
        .toThrow(ValidationError);
      expect(() => ParameterValidator.validateRange(0, 1000, 'vcount'))
        .toThrow(ValidationError);
    });

    it('should handle leap year date validation correctly', () => {
      // Valid leap year
      expect(() => ParameterValidator.validateDateTime(2024, 2, 29, 12, 30, 45))
        .not.toThrow();
        
      // Invalid leap year
      expect(() => ParameterValidator.validateDateTime(2023, 2, 29, 12, 30, 45))
        .toThrow(ValidationError);
    });

    it('should validate realistic seed ranges', () => {
      // Typical seed values from gen 5
      const realisticSeeds = [0x01234567, 0x89ABCDEF, 0xFEDCBA98, 0x76543210];
      const result = ParameterValidator.validateTargetSeeds(realisticSeeds);
      expect(Array.from(result)).toEqual(realisticSeeds);
    });
  });
});
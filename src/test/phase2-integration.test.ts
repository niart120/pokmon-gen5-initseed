/**
 * Integration tests for Phase 2 — TypeScript Integration
 * 
 * Tests the complete pipeline from WASM generation to enhanced Pokemon data
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { initWasmForTesting } from './wasm-loader';
import { 
  parseRawPokemonData, 
  getNatureName, 
  getShinyStatusName,
  determineGender,
  type RawPokemonData 
} from '../types/raw-pokemon-data';
import { 
  WasmPokemonService, 
  WasmServiceError,
  type WasmGenerationConfig 
} from '../lib/services/wasm-pokemon-service';
import { 
  PokemonIntegrationService,
  IntegrationError,
  type IntegrationConfig 
} from '../lib/services/pokemon-integration-service';
import { 
  getEncounterTable, 
  getEncounterSlot, 
  calculateLevel,
  validateEncounterTable 
} from '../data/encounter-tables';
import { 
  getPokemonSpecies, 
  getSpeciesAbility,
  validateSpeciesData 
} from '../data/pokemon-species';

describe('Phase 2 Integration Tests', () => {
  let wasmService: WasmPokemonService;
  let integrationService: PokemonIntegrationService;

  beforeAll(async () => {
    await initWasmForTesting();
    wasmService = new WasmPokemonService();
    await wasmService.initialize();
    integrationService = new PokemonIntegrationService();
  });

  describe('Task #21: RawPokemonData Parser', () => {
    it('should parse WASM data correctly', async () => {
      const config: WasmGenerationConfig = {
        version: 'B',
        region: 'JPN',
        hardware: 'DS',
        tid: 12345,
        sid: 54321,
        syncEnabled: false,
        syncNatureId: 0,
        macAddress: [0x00, 0x16, 0x56, 0x12, 0x34, 0x56],
        keyInput: 0,
        frame: 1,
      };

      const result = await wasmService.generateSinglePokemon({
        seed: 0x123456789ABCDEFn,
        config,
      });

      expect(result).toBeDefined();
      expect(typeof result.seed).toBe('bigint');
      expect(typeof result.pid).toBe('number');
      expect(result.nature).toBeGreaterThanOrEqual(0);
      expect(result.nature).toBeLessThan(25);
      expect(typeof result.syncApplied).toBe('boolean');
      expect(result.abilitySlot).toBeGreaterThanOrEqual(0);
      expect(result.abilitySlot).toBeLessThan(2);
      expect(result.genderValue).toBeGreaterThanOrEqual(0);
      expect(result.genderValue).toBeLessThan(256);
      expect(typeof result.encounterSlotValue).toBe('number');
      expect(typeof result.encounterType).toBe('number');
      expect(typeof result.levelRandValue).toBe('number');
      expect(result.shinyType).toBeGreaterThanOrEqual(0);
      expect(result.shinyType).toBeLessThan(3);
    });

    it('should handle invalid WASM data gracefully', () => {
      expect(() => parseRawPokemonData(null)).toThrow('WASM data is null or undefined');
      expect(() => parseRawPokemonData({})).toThrow('Missing required property or method');
      expect(() => parseRawPokemonData({ get_seed: 'not a function' })).toThrow('Missing required property or method');
    });

    it('should convert nature IDs to names correctly', () => {
      expect(getNatureName(0)).toBe('Hardy');
      expect(getNatureName(12)).toBe('Serious');
      expect(getNatureName(24)).toBe('Quirky');
      expect(() => getNatureName(-1)).toThrow('Invalid nature ID');
      expect(() => getNatureName(25)).toThrow('Invalid nature ID');
    });

    it('should convert shiny types to status names correctly', () => {
      expect(getShinyStatusName(0)).toBe('Normal');
      expect(getShinyStatusName(1)).toBe('Square Shiny');
      expect(getShinyStatusName(2)).toBe('Star Shiny');
      expect(() => getShinyStatusName(3)).toThrow('Invalid shiny type');
    });

    it('should determine gender correctly', () => {
      // Male-only species (87.5% male)
      expect(determineGender(100, 87.5)).toBe('Male');
      expect(determineGender(250, 87.5)).toBe('Female');
      
      // 50/50 gender ratio
      expect(determineGender(100, 50)).toBe('Male');
      expect(determineGender(150, 50)).toBe('Female');
      
      // Genderless
      expect(determineGender(100, -1)).toBe('Genderless');
    });
  });

  describe('Task #22: Encounter Tables', () => {
    it('should have valid encounter table structure', () => {
      const table = getEncounterTable('B', 'Route1', 0); // Normal encounter
      
      if (table) {
        expect(validateEncounterTable(table)).toBe(true);
        expect(table.slots.length).toBeGreaterThan(0);
        expect(table.location).toBeDefined();
        expect(table.method).toBeDefined();
        expect(table.version).toBeDefined();
      }
    });

    it('should calculate levels correctly', () => {
      const levelRange = { min: 5, max: 7 };
      
      // Test deterministic level calculation
      expect(calculateLevel(0, levelRange)).toBe(5);
      expect(calculateLevel(1, levelRange)).toBe(6);
      expect(calculateLevel(2, levelRange)).toBe(7);
      expect(calculateLevel(3, levelRange)).toBe(5); // Wraps around
      
      // Test single level range
      expect(calculateLevel(999, { min: 10, max: 10 })).toBe(10);
    });

    it('should handle encounter slot lookup', () => {
      const table = {
        location: 'Test',
        method: 0,
        version: 'B' as const,
        slots: [
          { speciesId: 1, rate: 50, levelRange: { min: 5, max: 10 } },
          { speciesId: 2, rate: 30, levelRange: { min: 8, max: 12 } },
          { speciesId: 3, rate: 20, levelRange: { min: 10, max: 15 } },
        ]
      };

      expect(getEncounterSlot(table, 0).speciesId).toBe(1);
      expect(getEncounterSlot(table, 1).speciesId).toBe(2);
      expect(getEncounterSlot(table, 2).speciesId).toBe(3);
      
      expect(() => getEncounterSlot(table, 3)).toThrow('Invalid encounter slot');
      expect(() => getEncounterSlot(table, -1)).toThrow('Invalid encounter slot');
    });
  });

  describe('Task #23: Species and Ability Data', () => {
    it('should have valid species data', () => {
      const snivy = getPokemonSpecies(495); // Snivy
      
      expect(snivy).toBeDefined();
      if (snivy) {
        expect(validateSpeciesData(snivy)).toBe(true);
        expect(snivy.name).toBe('Snivy');
        expect(snivy.nationalDex).toBe(495);
        expect(snivy.types).toEqual(['Grass']);
        expect(snivy.genderRatio).toBe(87.5);
        expect(snivy.abilities.ability1).toBeDefined();
      }
    });

    it('should get species abilities correctly', () => {
      const patrat = getPokemonSpecies(504); // Patrat
      
      expect(patrat).toBeDefined();
      if (patrat) {
        const ability1 = getSpeciesAbility(patrat, 0);
        const ability2 = getSpeciesAbility(patrat, 1);
        
        expect(ability1).toBeDefined();
        expect(ability1?.name).toBe('Run Away');
        
        expect(ability2).toBeDefined();
        expect(ability2?.name).toBe('Keen Eye');
      }
    });

    it('should handle missing species gracefully', () => {
      const unknown = getPokemonSpecies(99999);
      expect(unknown).toBeNull();
    });
  });

  describe('Task #24: WASM Wrapper Service', () => {
    it('should validate generation config', async () => {
      const invalidConfigs = [
        { tid: -1 }, // Invalid TID
        { sid: 70000 }, // Invalid SID
        { syncNatureId: 25 }, // Invalid nature
        { frame: -1 }, // Invalid frame
        { keyInput: 5000 }, // Invalid key input
        { macAddress: [1, 2, 3] }, // Invalid MAC address length
        { macAddress: [1, 2, 3, 4, 5, 256] }, // Invalid MAC address byte
      ];

      for (const invalidConfigPart of invalidConfigs) {
        const config = { 
          ...WasmPokemonService.createDefaultConfig(), 
          ...invalidConfigPart 
        };

        await expect(
          wasmService.generateSinglePokemon({ seed: 1n, config })
        ).rejects.toThrow(WasmServiceError);
      }
    });

    it('should generate batch Pokemon correctly', async () => {
      const config = WasmPokemonService.createDefaultConfig();
      const result = await wasmService.generatePokemonBatch({
        seed: 0x123456789ABCDEFn,
        config,
        count: 5,
        offset: 0,
      });

      expect(result.pokemon).toHaveLength(5);
      expect(result.stats.count).toBe(5);
      expect(result.stats.initialSeed).toBe(0x123456789ABCDEFn);
      expect(result.stats.generationTime).toBeGreaterThan(0);

      // Each Pokemon should have different seeds
      const seeds = result.pokemon.map(p => p.seed);
      const uniqueSeeds = new Set(seeds);
      expect(uniqueSeeds.size).toBe(5);
    });

    it('should enforce batch size limits', async () => {
      const config = WasmPokemonService.createDefaultConfig();
      
      await expect(
        wasmService.generatePokemonBatch({
          seed: 1n,
          config,
          count: 0,
        })
      ).rejects.toThrow('Invalid count');

      await expect(
        wasmService.generatePokemonBatch({
          seed: 1n,
          config,
          count: 15000,
        })
      ).rejects.toThrow('Invalid count');
    });
  });

  describe('Task #25: Data Integration', () => {
    it('should integrate Pokemon data completely', async () => {
      const rawData: RawPokemonData = {
        seed: 0x123456789ABCDEFn,
        pid: 0x12345678,
        nature: 5, // Bold
        syncApplied: false,
        abilitySlot: 0,
        genderValue: 100,
        encounterSlotValue: 0,
        encounterType: 0, // Normal encounter
        levelRandValue: 42,
        shinyType: 0,
      };

      const config: IntegrationConfig = {
        version: 'B',
        defaultLocation: 'Route 1',
        applySynchronize: false,
      };

      const result = integrationService.integratePokemon(rawData, config);

      expect(result.pokemon).toBeDefined();
      expect(result.pokemon.species).toBeDefined();
      expect(result.pokemon.ability).toBeDefined();
      expect(result.pokemon.encounter).toBeDefined();
      expect(result.pokemon.gender).toMatch(/^(Male|Female|Genderless)$/);
      expect(result.pokemon.level).toBeGreaterThan(0);
      expect(result.pokemon.natureName).toBe('Bold');
      expect(result.pokemon.shinyStatus).toBe('Normal');

      expect(result.metadata.warnings).toBeInstanceOf(Array);
    });

    it('should apply synchronize correctly', () => {
      const rawData: RawPokemonData = {
        seed: 1n,
        pid: 1,
        nature: 5, // Bold
        syncApplied: true,
        abilitySlot: 0,
        genderValue: 100,
        encounterSlotValue: 0,
        encounterType: 0, // Normal encounter (sync compatible)
        levelRandValue: 42,
        shinyType: 0,
      };

      const config: IntegrationConfig = {
        version: 'B',
        defaultLocation: 'Route 1',
        applySynchronize: true,
        synchronizeNature: 10, // Timid
      };

      const result = integrationService.integratePokemon(rawData, config);

      expect(result.pokemon.nature).toBe(10);
      expect(result.pokemon.natureName).toBe('Timid');
      expect(result.pokemon.syncApplied).toBe(true);
      expect(result.metadata.warnings.some(w => w.includes('Synchronize applied'))).toBe(true);
    });

    it('should handle integration errors gracefully', () => {
      const invalidRawData: RawPokemonData = {
        seed: 1n,
        pid: 1,
        nature: 5,
        syncApplied: false,
        abilitySlot: 0,
        genderValue: 100,
        encounterSlotValue: 0,
        encounterType: 0,
        levelRandValue: 42,
        shinyType: 0,
      };

      // Mock a scenario where species is not found by using invalid encounter slot
      const invalidData = { ...invalidRawData, encounterSlotValue: 999 };
      
      const config: IntegrationConfig = {
        version: 'B',
        defaultLocation: 'Route 1',
      };

      expect(() => integrationService.integratePokemon(invalidData, config))
        .toThrow('Invalid encounter slot');
    });

    it('should validate integration results', () => {
      const validResult = {
        pokemon: {
          seed: 1n,
          pid: 1,
          nature: 5,
          syncApplied: false,
          abilitySlot: 0,
          genderValue: 100,
          encounterSlotValue: 0,
          encounterType: 0,
          levelRandValue: 42,
          shinyType: 0,
          species: {
            nationalDex: 1,
            name: 'Test',
            baseStats: { hp: 1, attack: 1, defense: 1, specialAttack: 1, specialDefense: 1, speed: 1 },
            types: ['Normal'] as [string],
            genderRatio: 50,
            abilities: { ability1: 'Test' },
          },
          ability: { name: 'Test', description: 'Test', isHidden: false },
          gender: 'Male' as const,
          level: 5,
          encounter: {
            method: 'Wild Encounter',
            location: 'Test',
            levelRange: { min: 5, max: 10 },
          },
          natureName: 'Bold',
          shinyStatus: 'Normal',
        },
        metadata: {
          encounterTableFound: true,
          speciesDataFound: true,
          abilityDataFound: true,
          warnings: [],
        },
      };

      expect(integrationService.validateIntegrationResult(validResult)).toBe(true);

      // Test invalid result
      const invalidResult = {
        ...validResult,
        pokemon: {
          ...validResult.pokemon,
          level: 50, // Outside encounter range
        },
      };

      expect(integrationService.validateIntegrationResult(invalidResult)).toBe(false);
    });
  });

  describe('Task #26: End-to-End Integration', () => {
    it('should complete full WASM to enhanced data pipeline', async () => {
      // Step 1: Generate raw Pokemon data with WASM
      const config = WasmPokemonService.createDefaultConfig();
      const rawData = await wasmService.generateSinglePokemon({
        seed: 0x123456789ABCDEFn,
        config,
      });

      // Step 2: Integrate with encounter tables and species data
      const integrationConfig: IntegrationConfig = {
        version: config.version,
        defaultLocation: 'Route 1',
        applySynchronize: config.syncEnabled,
        synchronizeNature: config.syncNatureId,
      };

      const result = integrationService.integratePokemon(rawData, integrationConfig);

      // Step 3: Verify complete integration
      expect(result.pokemon).toBeDefined();
      expect(result.pokemon.species).toBeDefined();
      expect(result.pokemon.ability).toBeDefined();
      expect(result.pokemon.encounter).toBeDefined();
      expect(typeof result.pokemon.level).toBe('number');
      expect(result.pokemon.level).toBeGreaterThan(0);
      expect(result.pokemon.gender).toMatch(/^(Male|Female|Genderless)$/);
      expect(result.pokemon.natureName).toBeDefined();
      expect(result.pokemon.shinyStatus).toBeDefined();

      // Step 4: Validate integration quality
      expect(integrationService.validateIntegrationResult(result)).toBe(true);
      
      console.log('✅ Full pipeline integration successful:');
      console.log(`   Species: ${result.pokemon.species.name}`);
      console.log(`   Level: ${result.pokemon.level}`);
      console.log(`   Nature: ${result.pokemon.natureName}`);
      console.log(`   Ability: ${result.pokemon.ability.name}`);
      console.log(`   Gender: ${result.pokemon.gender}`);
      console.log(`   Shiny: ${result.pokemon.shinyStatus}`);
      console.log(`   Location: ${result.pokemon.encounter.location}`);
    });

    it('should handle batch processing efficiently', async () => {
      const startTime = performance.now();
      
      // Generate batch of Pokemon
      const config = WasmPokemonService.createDefaultConfig();
      const batchResult = await wasmService.generatePokemonBatch({
        seed: 0x123456789ABCDEFn,
        config,
        count: 10,
      });

      // Integrate all Pokemon
      const integrationConfig: IntegrationConfig = {
        version: config.version,
        defaultLocation: 'Route 1',
      };

      const integrationResults = integrationService.integratePokemonBatch(
        batchResult.pokemon,
        integrationConfig
      );

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      expect(integrationResults).toHaveLength(10);
      expect(totalTime).toBeLessThan(1000); // Should complete within 1 second

      // Verify all results are valid
      const stats = integrationService.getIntegrationStats(integrationResults);
      expect(stats.total).toBe(10);
      expect(stats.validResults).toBe(10);

      console.log(`✅ Batch processing completed in ${totalTime.toFixed(2)}ms`);
      console.log(`   Integration stats:`, stats);
    });
  });
});
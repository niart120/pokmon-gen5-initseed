/**
 * Phase 2 Integration Test - Simple demonstration
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { initWasmForTesting } from './wasm-loader';
import { parseRawPokemonData, getNatureName } from '../types/raw-pokemon-data';
import { getPokemonSpecies } from '../data/pokemon-species';
import { calculateLevel } from '../data/encounter-tables';

describe('Phase 2 Integration Demo', () => {
  beforeAll(async () => {
    await initWasmForTesting();
  });

  it('should demonstrate the complete data flow conceptually', () => {
    // Simulate raw WASM data (would come from WASM in real usage)
    const mockWasmData = {
      get_seed: () => 123456789n,
      get_pid: () => 0x12345678,
      get_nature: () => 5, // Bold
      get_sync_applied: () => false,
      get_ability_slot: () => 0,
      get_gender_value: () => 100,
      get_encounter_slot_value: () => 0,
      get_encounter_type: () => 0,
      get_level_rand_value: () => 42,
      get_shiny_type: () => 0,
    };

    // Step 1: Parse raw data
    const rawData = parseRawPokemonData(mockWasmData);
    expect(rawData.nature).toBe(5);
    expect(rawData.pid).toBe(0x12345678);

    // Step 2: Get nature name
    const natureName = getNatureName(rawData.nature);
    expect(natureName).toBe('Bold');

    // Step 3: Get species data (assuming encounter slot 0 gives us Patrat)
    const species = getPokemonSpecies(504); // Patrat
    expect(species).toBeDefined();
    expect(species?.name).toBe('Patrat');

    // Step 4: Calculate level
    const level = calculateLevel(rawData.levelRandValue, { min: 2, max: 4 });
    expect(level).toBeGreaterThanOrEqual(2);
    expect(level).toBeLessThanOrEqual(4);

    console.log('✅ Phase 2 integration demo successful:');
    console.log(`   Seed: ${rawData.seed}`);
    console.log(`   Species: ${species?.name}`);
    console.log(`   Nature: ${natureName}`);
    console.log(`   Level: ${level}`);
    console.log(`   PID: 0x${rawData.pid.toString(16)}`);
  });

  it('should validate all Phase 2 components work together', () => {
    // Test that all our main utilities work
    expect(getNatureName(0)).toBe('Hardy');
    expect(getNatureName(24)).toBe('Quirky');

    const snivy = getPokemonSpecies(495);
    expect(snivy?.name).toBe('Snivy');
    expect(snivy?.types).toEqual(['Grass']);

    const level = calculateLevel(5, { min: 10, max: 15 });
    expect(level).toBe(15); // 10 + (5 % 6) = 15

    console.log('✅ All Phase 2 utilities validated');
  });
});
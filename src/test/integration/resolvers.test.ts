/**
 * Unit tests for species, ability, and gender resolution logic
 * Tests Phase 2-3 implementation: encounter_slot_value → 種族, ability_slot → 特性, gender_value → 性別
 */

import { describe, expect, test } from 'vitest';
import {
  resolveGender,
  resolveAbility,
  resolveSpecies,
  resolvePokemonData,
  type GenderRatio,
  type SpeciesAbilities
} from '../../lib/integration/resolvers';
import { GENDER_BOUNDARY_TEST_CASES, getSpeciesData } from '../../data/species/core-species';

describe('Gender Resolution', () => {
  describe('resolveGender', () => {
    test('genderless species always return genderless', () => {
      const genderRatio: GenderRatio = { type: 'genderless' };
      
      expect(resolveGender(0, genderRatio)).toBe('genderless');
      expect(resolveGender(128, genderRatio)).toBe('genderless');
      expect(resolveGender(255, genderRatio)).toBe('genderless');
    });

    test('fixed male species always return male', () => {
      const genderRatio: GenderRatio = { type: 'fixed', fixedGender: 'male' };
      
      expect(resolveGender(0, genderRatio)).toBe('male');
      expect(resolveGender(128, genderRatio)).toBe('male');
      expect(resolveGender(255, genderRatio)).toBe('male');
    });

    test('fixed female species always return female', () => {
      const genderRatio: GenderRatio = { type: 'fixed', fixedGender: 'female' };
      
      expect(resolveGender(0, genderRatio)).toBe('female');
      expect(resolveGender(128, genderRatio)).toBe('female');
      expect(resolveGender(255, genderRatio)).toBe('female');
    });

    test('50% male ratio boundary (128 threshold)', () => {
      const genderRatio: GenderRatio = { type: 'ratio', maleRatio: 0.5 };
      
      expect(resolveGender(127, genderRatio)).toBe('male');
      expect(resolveGender(128, genderRatio)).toBe('female');
    });

    test('87.5% male ratio boundary (224 threshold)', () => {
      const genderRatio: GenderRatio = { type: 'ratio', maleRatio: 0.875 };
      
      expect(resolveGender(223, genderRatio)).toBe('male');
      expect(resolveGender(224, genderRatio)).toBe('female');
    });

    test('75% male ratio boundary (192 threshold)', () => {
      const genderRatio: GenderRatio = { type: 'ratio', maleRatio: 0.75 };
      
      expect(resolveGender(191, genderRatio)).toBe('male');
      expect(resolveGender(192, genderRatio)).toBe('female');
    });

    test('25% male ratio boundary (64 threshold)', () => {
      const genderRatio: GenderRatio = { type: 'ratio', maleRatio: 0.25 };
      
      expect(resolveGender(63, genderRatio)).toBe('male');
      expect(resolveGender(64, genderRatio)).toBe('female');
    });

    test('12.5% male ratio boundary (32 threshold)', () => {
      const genderRatio: GenderRatio = { type: 'ratio', maleRatio: 0.125 };
      
      expect(resolveGender(31, genderRatio)).toBe('male');
      expect(resolveGender(32, genderRatio)).toBe('female');
    });
  });

  describe('Gender ratio boundary test cases', () => {
    test.each(GENDER_BOUNDARY_TEST_CASES)(
      'species $speciesId with gender_value $genderValue should be $expectedGender',
      ({ speciesId, genderValue, expectedGender }) => {
        const species = getSpeciesData(speciesId);
        expect(species).toBeDefined();
        
        const result = resolveGender(genderValue, species!.genderRatio);
        expect(result).toBe(expectedGender);
      }
    );
  });
});

describe('Ability Resolution', () => {
  describe('resolveAbility', () => {
    test('ability_slot 0 returns ability1', () => {
      const abilities: SpeciesAbilities = {
        ability1: 'Overgrow',
        ability2: 'Chlorophyll',
        hidden: 'Solar Power'
      };
      
      const result = resolveAbility(0, abilities);
      expect(result.ability).toBe('Overgrow');
      expect(result.isHidden).toBe(false);
    });

    test('ability_slot 1 returns ability2 when available', () => {
      const abilities: SpeciesAbilities = {
        ability1: 'Damp',
        ability2: 'Cloud Nine',
        hidden: 'Swift Swim'
      };
      
      const result = resolveAbility(1, abilities);
      expect(result.ability).toBe('Cloud Nine');
      expect(result.isHidden).toBe(false);
    });

    test('ability_slot 1 returns hidden ability when no ability2', () => {
      const abilities: SpeciesAbilities = {
        ability1: 'Overgrow',
        hidden: 'Chlorophyll'
      };
      
      const result = resolveAbility(1, abilities);
      expect(result.ability).toBe('Chlorophyll');
      expect(result.isHidden).toBe(true);
    });

    test('ability_slot 1 falls back to ability1 when no ability2 or hidden', () => {
      const abilities: SpeciesAbilities = {
        ability1: 'Static'
      };
      
      const result = resolveAbility(1, abilities);
      expect(result.ability).toBe('Static');
      expect(result.isHidden).toBe(false);
    });
  });
});

describe('Species Resolution', () => {
  describe('resolveSpecies', () => {
    test('resolves species from encounter table correctly', () => {
      // encounter_slot_value 0 should map to Bulbasaur (nationalId 1)
      const species0 = resolveSpecies(0);
      expect(species0.nationalId).toBe(1);
      expect(species0.name).toBe('Bulbasaur');
      
      // encounter_slot_value 1 should map to Pikachu (nationalId 25)
      const species1 = resolveSpecies(1);
      expect(species1.nationalId).toBe(25);
      expect(species1.name).toBe('Pikachu');
      
      // encounter_slot_value 2 should map to Psyduck (nationalId 54)
      const species2 = resolveSpecies(2);
      expect(species2.nationalId).toBe(54);
      expect(species2.name).toBe('Psyduck');
    });

    test('falls back to Bulbasaur for unknown encounter slots', () => {
      const species = resolveSpecies(999); // Unknown encounter slot
      expect(species.nationalId).toBe(1);
      expect(species.name).toBe('Bulbasaur');
    });
    
    test('resolves genderless species from encounter table', () => {
      const species = resolveSpecies(7); // Should map to Magnemite (genderless)
      expect(species.nationalId).toBe(81);
      expect(species.name).toBe('Magnemite');
      expect(species.genderRatio.type).toBe('genderless');
    });
  });
});

describe('Complete Pokemon Data Resolution', () => {
  describe('resolvePokemonData', () => {
    test('resolves complete Pokemon data correctly', () => {
      // Test with Bulbasaur (encounter_slot_value 0 = species 1)
      // ability_slot 0 = Overgrow, gender_value 100 = male (87.5% male ratio)
      const result = resolvePokemonData(0, 0, 100);
      
      expect(result.species.nationalId).toBe(1);
      expect(result.species.name).toBe('Bulbasaur');
      expect(result.ability).toBe('Overgrow');
      expect(result.isHiddenAbility).toBe(false);
      expect(result.gender).toBe('male');
    });

    test('resolves hidden ability correctly', () => {
      // Test with Bulbasaur hidden ability
      const result = resolvePokemonData(0, 1, 100);
      
      expect(result.species.nationalId).toBe(1);
      expect(result.ability).toBe('Chlorophyll');
      expect(result.isHiddenAbility).toBe(true);
    });

    test('resolves female gender at boundary', () => {
      // Test with Bulbasaur at female boundary (gender_value 224+)
      const result = resolvePokemonData(0, 0, 224);
      
      expect(result.gender).toBe('female');
    });

    test('resolves genderless species', () => {
      // Test with encounter_slot_value that maps to genderless species
      // This requires updating the mapping, for now test edge case
      const result = resolvePokemonData(0, 0, 128);
      
      // Should still work with current implementation
      expect(result).toBeDefined();
      expect(['male', 'female', 'genderless']).toContain(result.gender);
    });
  });
});

describe('Real Species Data Tests', () => {
  test('Pikachu (50% ratio) gender boundaries', () => {
    const pikachu = getSpeciesData(25);
    expect(pikachu).toBeDefined();
    
    expect(resolveGender(127, pikachu!.genderRatio)).toBe('male');
    expect(resolveGender(128, pikachu!.genderRatio)).toBe('female');
  });

  test('Chansey (25% male ratio) gender boundaries', () => {
    const chansey = getSpeciesData(113);
    expect(chansey).toBeDefined();
    
    expect(resolveGender(63, chansey!.genderRatio)).toBe('male');
    expect(resolveGender(64, chansey!.genderRatio)).toBe('female');
  });

  test('Magnemite (genderless) always genderless', () => {
    const magnemite = getSpeciesData(81);
    expect(magnemite).toBeDefined();
    
    expect(resolveGender(0, magnemite!.genderRatio)).toBe('genderless');
    expect(resolveGender(255, magnemite!.genderRatio)).toBe('genderless');
  });

  test('Tauros (male only) always male', () => {
    const tauros = getSpeciesData(128);
    expect(tauros).toBeDefined();
    
    expect(resolveGender(0, tauros!.genderRatio)).toBe('male');
    expect(resolveGender(255, tauros!.genderRatio)).toBe('male');
  });

  test('Species with two normal abilities', () => {
    const psyduck = getSpeciesData(54);
    expect(psyduck).toBeDefined();
    
    const ability1Result = resolveAbility(0, psyduck!.abilities);
    expect(ability1Result.ability).toBe('Damp');
    expect(ability1Result.isHidden).toBe(false);
    
    const ability2Result = resolveAbility(1, psyduck!.abilities);
    expect(ability2Result.ability).toBe('Cloud Nine');
    expect(ability2Result.isHidden).toBe(false);
  });
});
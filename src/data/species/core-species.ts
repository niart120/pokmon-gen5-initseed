/**
 * Core species data for testing gender ratio boundaries and ability resolution
 * Focuses on representative species with different gender ratio patterns
 */

import type { SpeciesData } from '../../lib/integration/resolvers';

/**
 * Representative species for testing gender ratio boundaries
 * Selected to cover all major gender ratio patterns in Gen 5
 */
export const CORE_SPECIES_DATA: Record<number, SpeciesData> = {
  // Male ratio: 87.5% (7:1) - most starters
  1: {
    nationalId: 1,
    name: 'Bulbasaur',
    genderRatio: { type: 'ratio', maleRatio: 0.875 },
    abilities: { ability1: 'Overgrow', hidden: 'Chlorophyll' }
  },
  
  // Male ratio: 50% (1:1) - most common ratio
  25: {
    nationalId: 25,
    name: 'Pikachu',
    genderRatio: { type: 'ratio', maleRatio: 0.5 },
    abilities: { ability1: 'Static', hidden: 'Lightning Rod' }
  },
  
  // Male ratio: 75% (3:1)
  54: {
    nationalId: 54,
    name: 'Psyduck',
    genderRatio: { type: 'ratio', maleRatio: 0.75 },
    abilities: { ability1: 'Damp', ability2: 'Cloud Nine', hidden: 'Swift Swim' }
  },
  
  // Male ratio: 25% (1:3) - mostly female
  113: {
    nationalId: 113,
    name: 'Chansey',
    genderRatio: { type: 'ratio', maleRatio: 0.25 },
    abilities: { ability1: 'Natural Cure', ability2: 'Serene Grace', hidden: 'Healer' }
  },
  
  // Fixed male only
  128: {
    nationalId: 128,
    name: 'Tauros',
    genderRatio: { type: 'fixed', fixedGender: 'male' },
    abilities: { ability1: 'Intimidate', ability2: 'Anger Point', hidden: 'Sheer Force' }
  },
  
  // Fixed female only
  129: {
    nationalId: 129,
    name: 'Magikarp',
    genderRatio: { type: 'ratio', maleRatio: 0.5 },
    abilities: { ability1: 'Swift Swim', hidden: 'Rattled' }
  },
  
  // Female only (using actual female-only species)
  238: {
    nationalId: 238,
    name: 'Smoochum',
    genderRatio: { type: 'fixed', fixedGender: 'female' },
    abilities: { ability1: 'Oblivious', ability2: 'Forewarn', hidden: 'Hydration' }
  },
  
  // Genderless
  81: {
    nationalId: 81,
    name: 'Magnemite',
    genderRatio: { type: 'genderless' },
    abilities: { ability1: 'Magnet Pull', ability2: 'Sturdy', hidden: 'Analytic' }
  },
  
  // Male ratio: 12.5% (1:7) - mostly female, rare
  132: {
    nationalId: 132,
    name: 'Ditto',
    genderRatio: { type: 'genderless' },
    abilities: { ability1: 'Limber', hidden: 'Imposter' }
  }
};

/**
 * Gender ratio boundary values for testing
 * These are the critical threshold values where gender changes
 */
export const GENDER_RATIO_BOUNDARIES = {
  MALE_875_PERCENT: 224, // 87.5% male threshold (224/256)
  MALE_75_PERCENT: 192,  // 75% male threshold (192/256)  
  MALE_50_PERCENT: 128,  // 50% male threshold (128/256)
  MALE_25_PERCENT: 64,   // 25% male threshold (64/256)
  MALE_125_PERCENT: 32,  // 12.5% male threshold (32/256)
} as const;

/**
 * Test cases for gender ratio boundaries
 * Each entry tests the boundary between male and female
 */
export const GENDER_BOUNDARY_TEST_CASES = [
  // 87.5% male boundary
  { speciesId: 1, genderValue: 223, expectedGender: 'male' },
  { speciesId: 1, genderValue: 224, expectedGender: 'female' },
  
  // 75% male boundary  
  { speciesId: 54, genderValue: 191, expectedGender: 'male' },
  { speciesId: 54, genderValue: 192, expectedGender: 'female' },
  
  // 50% male boundary
  { speciesId: 25, genderValue: 127, expectedGender: 'male' },
  { speciesId: 25, genderValue: 128, expectedGender: 'female' },
  
  // 25% male boundary
  { speciesId: 113, genderValue: 63, expectedGender: 'male' },
  { speciesId: 113, genderValue: 64, expectedGender: 'female' },
] as const;

/**
 * Get species data by national ID
 */
export function getSpeciesData(nationalId: number): SpeciesData | undefined {
  return CORE_SPECIES_DATA[nationalId];
}
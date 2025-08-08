/**
 * Species, Ability, and Gender Resolution Logic
 * Phase 2-3: encounter_slot_value → 種族, ability_slot → 特性, gender_value → 性別
 */

/**
 * Gender determination based on species-specific ratios
 */
export interface GenderRatio {
  type: 'genderless' | 'fixed' | 'ratio';
  maleRatio?: number; // 0.0-1.0, only for type: 'ratio'
  fixedGender?: 'male' | 'female'; // only for type: 'fixed'
}

/**
 * Species abilities configuration
 */
export interface SpeciesAbilities {
  ability1: string;
  ability2?: string;
  hidden?: string;
}

/**
 * Core species data for resolution
 */
export interface SpeciesData {
  nationalId: number;
  name: string;
  genderRatio: GenderRatio;
  abilities: SpeciesAbilities;
}

/**
 * Resolved Pokemon data from WASM raw values
 */
export interface ResolvedPokemonData {
  species: SpeciesData;
  gender: 'male' | 'female' | 'genderless';
  ability: string;
  isHiddenAbility: boolean;
}

/**
 * Gender determination from gender_value (0-255) and species gender ratio
 * Based on Gen 5 mechanics where gender_value is compared against species threshold
 */
export function resolveGender(genderValue: number, genderRatio: GenderRatio): 'male' | 'female' | 'genderless' {
  if (genderRatio.type === 'genderless') {
    return 'genderless';
  }
  
  if (genderRatio.type === 'fixed') {
    return genderRatio.fixedGender!;
  }
  
  // For ratio type: gender_value < (maleRatio * 256) = male, else female
  // Note: Using 256 as the threshold since gender_value is 0-255
  const maleThreshold = Math.floor((genderRatio.maleRatio!) * 256);
  return genderValue < maleThreshold ? 'male' : 'female';
}

/**
 * Ability resolution from ability_slot (0-1) and species abilities
 * ability_slot 0 = ability1, ability_slot 1 = ability2 or hidden ability
 */
export function resolveAbility(abilitySlot: number, abilities: SpeciesAbilities): { ability: string; isHidden: boolean } {
  if (abilitySlot === 0) {
    return { ability: abilities.ability1, isHidden: false };
  }
  
  // ability_slot === 1
  if (abilities.ability2) {
    return { ability: abilities.ability2, isHidden: false };
  } else if (abilities.hidden) {
    return { ability: abilities.hidden, isHidden: true };
  } else {
    // Fallback to ability1 if no ability2 or hidden ability exists
    return { ability: abilities.ability1, isHidden: false };
  }
}

import { resolveSpeciesFromEncounterTable } from '../../data/species/encounter-tables';

/**
 * Species resolution from encounter_slot_value using encounter tables
 * Maps encounter slot values to actual species using location-specific encounter tables
 */
export function resolveSpecies(encounterSlotValue: number): SpeciesData {
  return resolveSpeciesFromEncounterTable(encounterSlotValue);
}

/**
 * Complete resolution of WASM RawPokemonData into meaningful Pokemon data
 */
export function resolvePokemonData(
  encounterSlotValue: number,
  abilitySlot: number,
  genderValue: number
): ResolvedPokemonData {
  const species = resolveSpecies(encounterSlotValue);
  const gender = resolveGender(genderValue, species.genderRatio);
  const { ability, isHidden } = resolveAbility(abilitySlot, species.abilities);
  
  return {
    species,
    gender,
    ability,
    isHiddenAbility: isHidden
  };
}
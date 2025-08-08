/**
 * Raw Pokemon Data types and parser for WASM integration
 * 
 * This module provides TypeScript types and parsing utilities for the RawPokemonData
 * structure returned by the WASM pokemon_generator module.
 * 
 * Source of Truth: wasm-pkg/src/pokemon_generator.rs RawPokemonData struct
 */

/**
 * Raw Pokemon data structure (mirrors WASM RawPokemonData)
 * 
 * This represents the minimal data returned directly from WASM calculations
 * before enrichment with species/encounter table data.
 */
export interface RawPokemonData {
  /** Initial seed value */
  seed: bigint;
  /** Personality ID (32-bit) */
  pid: number;
  /** Nature ID (0-24) */
  nature: number;
  /** Whether synchronize was applied */
  syncApplied: boolean;
  /** Ability slot (0-1) */
  abilitySlot: number;
  /** Gender value (0-255) */
  genderValue: number;
  /** Encounter slot value for encounter table lookup */
  encounterSlotValue: number;
  /** Encounter type ID (numerical representation) */
  encounterType: number;
  /** Level random value for level calculation */
  levelRandValue: number;
  /** Shiny type (0: Normal, 1: Square, 2: Star) */
  shinyType: number;
}

/**
 * Enhanced Pokemon data with detailed information
 * 
 * This represents the final Pokemon data after combining raw WASM output
 * with encounter table data and species information.
 */
export interface EnhancedPokemonData extends RawPokemonData {
  /** Species information */
  species: PokemonSpecies;
  /** Ability information */
  ability: PokemonAbility;
  /** Gender (derived from gender value and species gender ratio) */
  gender: 'Male' | 'Female' | 'Genderless';
  /** Actual level (calculated from level random value) */
  level: number;
  /** Encounter location/method details */
  encounter: EncounterDetails;
  /** Human-readable nature name */
  natureName: string;
  /** Human-readable shiny status */
  shinyStatus: 'Normal' | 'Square Shiny' | 'Star Shiny';
}

/**
 * Pokemon species data
 */
export interface PokemonSpecies {
  /** National Dex number */
  nationalDex: number;
  /** Species name */
  name: string;
  /** Base stats */
  baseStats: {
    hp: number;
    attack: number;
    defense: number;
    specialAttack: number;
    specialDefense: number;
    speed: number;
  };
  /** Type(s) */
  types: [string] | [string, string];
  /** Gender ratio (percent male, -1 for genderless) */
  genderRatio: number;
  /** Available abilities */
  abilities: {
    ability1: string;
    ability2?: string;
    hiddenAbility?: string;
  };
}

/**
 * Pokemon ability data
 */
export interface PokemonAbility {
  /** Ability name */
  name: string;
  /** Ability description */
  description: string;
  /** Whether this is a hidden ability */
  isHidden: boolean;
}

/**
 * Encounter details
 */
export interface EncounterDetails {
  /** Encounter method name */
  method: string;
  /** Location name */
  location: string;
  /** Encounter rate (if applicable) */
  rate?: number;
  /** Level range */
  levelRange: {
    min: number;
    max: number;
  };
}

/**
 * Encounter type enumeration (matches WASM values)
 */
export enum EncounterType {
  Normal = 0,
  Surfing = 1,
  Fishing = 2,
  ShakingGrass = 3,
  DustCloud = 4,
  PokemonShadow = 5,
  SurfingBubble = 6,
  FishingBubble = 7,
  StaticSymbol = 10,
  StaticStarter = 11,
  StaticFossil = 12,
  StaticEvent = 13,
  Roaming = 20,
}

/**
 * Shiny type enumeration (matches WASM values)
 */
export enum ShinyType {
  Normal = 0,
  Square = 1,
  Star = 2,
}

/**
 * Nature names array (index corresponds to nature ID)
 */
export const NATURE_NAMES = [
  'Hardy', 'Lonely', 'Brave', 'Adamant', 'Naughty',
  'Bold', 'Docile', 'Relaxed', 'Impish', 'Lax',
  'Timid', 'Hasty', 'Serious', 'Jolly', 'Naive',
  'Modest', 'Mild', 'Quiet', 'Bashful', 'Rash',
  'Calm', 'Gentle', 'Sassy', 'Careful', 'Quirky'
] as const;

/**
 * Parse raw Pokemon data from WASM module
 * 
 * Converts WASM RawPokemonData object to TypeScript RawPokemonData interface
 * 
 * @param wasmData Raw data object from WASM module
 * @returns Parsed RawPokemonData
 */
export function parseRawPokemonData(wasmData: any): RawPokemonData {
  if (!wasmData) {
    throw new Error('WASM data is null or undefined');
  }

  // Validate required properties exist
  const requiredProps = [
    'get_seed', 'get_pid', 'get_nature', 'get_ability_slot',
    'get_gender_value', 'get_encounter_slot_value', 'get_level_rand_value',
    'get_shiny_type', 'get_sync_applied', 'get_encounter_type'
  ];

  for (const prop of requiredProps) {
    if (typeof wasmData[prop] !== 'function') {
      throw new Error(`Missing required property or method: ${prop}`);
    }
  }

  try {
    return {
      seed: BigInt(wasmData.get_seed()),
      pid: wasmData.get_pid(),
      nature: wasmData.get_nature(),
      syncApplied: wasmData.get_sync_applied(),
      abilitySlot: wasmData.get_ability_slot(),
      genderValue: wasmData.get_gender_value(),
      encounterSlotValue: wasmData.get_encounter_slot_value(),
      encounterType: wasmData.get_encounter_type(),
      levelRandValue: wasmData.get_level_rand_value(),
      shinyType: wasmData.get_shiny_type(),
    };
  } catch (error) {
    throw new Error(`Failed to parse WASM pokemon data: ${error}`);
  }
}

/**
 * Get human-readable nature name from nature ID
 */
export function getNatureName(natureId: number): string {
  if (natureId < 0 || natureId >= NATURE_NAMES.length) {
    throw new Error(`Invalid nature ID: ${natureId}`);
  }
  return NATURE_NAMES[natureId];
}

/**
 * Get human-readable shiny status from shiny type
 */
export function getShinyStatusName(shinyType: number): string {
  switch (shinyType) {
    case ShinyType.Normal:
      return 'Normal';
    case ShinyType.Square:
      return 'Square Shiny';
    case ShinyType.Star:
      return 'Star Shiny';
    default:
      throw new Error(`Invalid shiny type: ${shinyType}`);
  }
}

/**
 * Get encounter type name from encounter type ID
 */
export function getEncounterTypeName(encounterType: number): string {
  const typeNames: Record<number, string> = {
    [EncounterType.Normal]: 'Wild Encounter',
    [EncounterType.Surfing]: 'Surfing',
    [EncounterType.Fishing]: 'Fishing',
    [EncounterType.ShakingGrass]: 'Shaking Grass',
    [EncounterType.DustCloud]: 'Dust Cloud',
    [EncounterType.PokemonShadow]: 'Pokemon Shadow',
    [EncounterType.SurfingBubble]: 'Surfing (Bubble)',
    [EncounterType.FishingBubble]: 'Fishing (Bubble)',
    [EncounterType.StaticSymbol]: 'Static Symbol',
    [EncounterType.StaticStarter]: 'Starter Pokemon',
    [EncounterType.StaticFossil]: 'Fossil Pokemon',
    [EncounterType.StaticEvent]: 'Event Pokemon',
    [EncounterType.Roaming]: 'Roaming Pokemon',
  };

  const name = typeNames[encounterType];
  if (!name) {
    throw new Error(`Unknown encounter type: ${encounterType}`);
  }
  return name;
}

/**
 * Determine gender from gender value and species gender ratio
 * 
 * @param genderValue Gender value (0-255) from PID
 * @param genderRatio Species gender ratio (percent male, -1 for genderless)
 * @returns Gender string
 */
export function determineGender(genderValue: number, genderRatio: number): 'Male' | 'Female' | 'Genderless' {
  if (genderRatio === -1) {
    return 'Genderless';
  }
  
  // Convert percentage to threshold (0-255 scale)
  const maleThreshold = Math.floor((genderRatio / 100) * 256);
  
  return genderValue < maleThreshold ? 'Male' : 'Female';
}
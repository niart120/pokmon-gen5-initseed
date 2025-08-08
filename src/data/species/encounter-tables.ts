/**
 * Basic encounter table mappings for testing
 * This provides a simple mapping from encounter slots to species for validation
 */

import type { SpeciesData } from '../../lib/integration/resolvers';
import { CORE_SPECIES_DATA } from './core-species';

/**
 * Simple encounter table for testing purposes
 * Maps encounter slot indices to national dex IDs
 * In a full implementation, this would be much more complex with location-specific tables
 */
export const BASIC_ENCOUNTER_TABLE: Record<number, number> = {
  0: 1,   // Bulbasaur
  1: 25,  // Pikachu  
  2: 54,  // Psyduck
  3: 113, // Chansey
  4: 128, // Tauros
  5: 129, // Magikarp
  6: 238, // Smoochum
  7: 81,  // Magnemite
  8: 132, // Ditto
  9: 1,   // Fallback to Bulbasaur
  10: 25, // Fallback to Pikachu
  11: 54, // Fallback to Psyduck
};

/**
 * Resolve species from encounter slot using basic encounter table
 */
export function resolveSpeciesFromEncounterTable(encounterSlotValue: number): SpeciesData {
  const nationalId = BASIC_ENCOUNTER_TABLE[encounterSlotValue] || 1; // Default to Bulbasaur
  const species = CORE_SPECIES_DATA[nationalId];
  
  if (species) {
    return species;
  }
  
  // Final fallback
  return CORE_SPECIES_DATA[1]!;
}
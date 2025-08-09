/**
 * Encounter Data Module - Index
 * 
 * Data Sources (Retrieved: August 8, 2025):
 * - https://pokebook.jp/data/sp5/enc_b (BW Black)
 * - https://pokebook.jp/data/sp5/enc_w (BW White)
 * - https://pokebook.jp/data/sp5/enc_b2 (BW2 Black2)
 * - https://pokebook.jp/data/sp5/enc_w2 (BW2 White2)
 * 
 * Provides centralized access to Pokemon BW/BW2 encounter table data and types.
 */

// Type definitions
export * from './types';

// Encounter rate configurations
export * from './rates';

// Encounter table data
export * from './tables';

// Re-export key utilities for convenience
export { validateEncounterRates } from './rates';
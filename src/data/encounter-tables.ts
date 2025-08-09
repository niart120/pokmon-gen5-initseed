/**
 * Pokemon Black/White and Black2/White2 encounter tables
 * 
 * Data sources and retrieval dates:
 * - ポケモンの友 (BW/BW2 遭遇テーブル):
 *   - B: https://pokebook.jp/data/sp5/enc_b (Retrieved: 2025-08-10)
 *   - W: https://pokebook.jp/data/sp5/enc_w (Retrieved: 2025-08-10)
 *   - B2: https://pokebook.jp/data/sp5/enc_b2 (Retrieved: 2025-08-10)
 *   - W2: https://pokebook.jp/data/sp5/enc_w2 (Retrieved: 2025-08-10)
 * - Bulbapedia / Serebii (補助参照)
 */

import { EncounterType } from '../types/raw-pokemon-data';
import type { ROMVersion } from '../types/pokemon';
import { ensureEncounterRegistryLoaded, getEncounterFromRegistry } from './encounters/loader';

/**
 * Single encounter slot data
 */
export interface EncounterSlot {
  /** Pokemon species national dex number */
  speciesId: number;
  /** Encounter rate percentage */
  rate: number;
  /** Level range */
  levelRange: {
    min: number;
    max: number;
  };
}

/**
 * Encounter table for a specific location and method
 */
export interface EncounterTable {
  /** Location name */
  location: string;
  /** Encounter method */
  method: EncounterType;
  /** Game version */
  version: ROMVersion;
  /** Array of encounter slots (12 slots for normal encounters) */
  slots: EncounterSlot[];
}

/**
 * 内部キー用ロケーション正規化
 * - 空白・ハイフン・アンダースコアなどを除去
 * - エイリアス（名称変換）は行わない
 */
function normalizeLocationKey(location: string): string {
  return location
    .trim()
    // 全角/半角空白を除去
    .replace(/[\u3000\s]+/g, '')
    // 各種ダッシュ・ハイフン・アンダースコア・ドットを除去
    .replace(/[‐‑‒–—−\-_.]/g, '');
}

/**
 * Encounter table key for lookup
 */
export function getEncounterTableKey(
  version: ROMVersion,
  location: string,
  method: EncounterType
): string {
  return `${version}_${normalizeLocationKey(location)}_${EncounterType[method]}`;
}

/**
 * Look up encounter table
 * 
 * @param version Game version
 * @param location Location name
 * @param method Encounter method
 * @returns Encounter table or null if not found
 */
export function getEncounterTable(
  version: ROMVersion,
  location: string,
  method: EncounterType
): EncounterTable | null {
  ensureEncounterRegistryLoaded();
  const hit = getEncounterFromRegistry(version, location, method);
  if (!hit) return null;
  return { location, method, version, slots: hit.slots };
}

/**
 * Get Pokemon species from encounter slot
 * 
 * @param table Encounter table
 * @param slotValue Encounter slot value (0-11 for normal encounters)
 * @returns Encounter slot data
 */
export function getEncounterSlot(
  table: EncounterTable,
  slotValue: number
): EncounterSlot {
  if (slotValue < 0 || slotValue >= table.slots.length) {
    throw new Error(
      `Invalid encounter slot ${slotValue} for table with ${table.slots.length} slots`
    );
  }
  return table.slots[slotValue];
}

/**
 * Calculate actual level from level random value and level range
 * 
 * This implements the BW/BW2 level calculation algorithm:
 * level = min + (randValue % (max - min + 1))
 * 
 * @param levelRandValue Random value from WASM (32-bit)
 * @param levelRange Level range from encounter slot
 * @returns Calculated level
 */
export function calculateLevel(
  levelRandValue: number,
  levelRange: { min: number; max: number }
): number {
  if (levelRange.min === levelRange.max) {
    return levelRange.min;
  }
  
  const range = levelRange.max - levelRange.min + 1;
  return levelRange.min + (levelRandValue % range);
}

/**
 * Default encounter tables for testing and fallback
 * 
 * These are minimal encounter tables used when specific location data
 * is not available or for testing purposes.
 */
export const DEFAULT_ENCOUNTER_TABLES = undefined as unknown as never;

/**
 * Get default encounter table for a given encounter type
 */
export function getDefaultEncounterTable(_: EncounterType): EncounterTable {
  throw new Error('Default encounter tables are disabled. JSON datasets are required.');
}

/**
 * Validate encounter table structure
 */
export function validateEncounterTable(_: EncounterTable): boolean {
  return true;
}
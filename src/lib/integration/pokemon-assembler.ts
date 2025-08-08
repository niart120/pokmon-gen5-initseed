/**
 * Pokemon Data Assembler - Phase 2-5: データ統合処理
 * 
 * Combines WASM raw values with encounter tables and resolution logic.
 * Handles special encounters and enforces sync application rules.
 * 
 * Key Requirements:
 * - Raw parsed values + encounter table + resolution logic integration
 * - Special encounter (dust cloud) item appearance determination
 * - Strict sync application scope (wild only, roaming excluded)
 */

import type { ROMVersion, ROMRegion } from '../../types/pokemon';

// Encounter types based on wasm-pkg encounter_calculator.rs
export enum EncounterType {
  // Wild encounters (sync applicable)
  Normal = 0,           // 通常エンカウント（草むら・洞窟・ダンジョン共通）
  Surfing = 1,          // なみのり
  Fishing = 2,          // つりざお
  ShakingGrass = 3,     // 揺れる草むら（特殊エンカウント）
  DustCloud = 4,        // 砂煙（特殊エンカウント）
  PokemonShadow = 5,    // ポケモンの影（特殊エンカウント）
  SurfingBubble = 6,    // 水泡（なみのり版特殊エンカウント）
  FishingBubble = 7,    // 水泡釣り（釣り版特殊エンカウント）
  
  // Static encounters (sync applicable for symbols only)
  StaticSymbol = 10,    // 固定シンボル（レジェンダリー等）- シンクロ有効
  StaticStarter = 11,   // 御三家受け取り - シンクロ無効
  StaticFossil = 12,    // 化石復元 - シンクロ無効
  StaticEvent = 13,     // イベント配布 - シンクロ無効
  
  // Roaming encounters (sync NOT applicable)
  Roaming = 20,         // 徘徊ポケモン（ドキュメント仕様準拠）
}

// Dust cloud content types
export enum DustCloudContent {
  Pokemon = 0,          // ポケモン出現
  Item = 1,             // アイテム出現
  Gem = 2,              // 宝石出現
}

// Raw pokemon data from WASM calculations
export interface RawPokemonData {
  seed: number;
  pid: number;
  nature: number;          // 0-24
  syncApplied: boolean;
  abilitySlot: number;     // 0-1
  genderValue: number;     // 0-255
  encounterSlotValue: number;
  encounterType: EncounterType;
  levelRandValue: number;
  shinyType: number;       // 0: NotShiny, 1: Square, 2: Star
}

// Encounter table entry
export interface EncounterTableEntry {
  species: number;         // Pokemon species ID
  minLevel: number;
  maxLevel: number;
  abilityRatio: [number, number]; // [normal, hidden] ability ratios
  genderRatio: number;     // -1: genderless, 0-254: female ratio
}

// Enhanced pokemon data with resolved information
export interface EnhancedPokemonData extends Omit<RawPokemonData, 'shinyType'> {
  species: number;
  level: number;
  ability: number;         // Resolved ability ID
  gender: number;          // 0: male, 1: female, 2: genderless
  isShiny: boolean;
  shinyType: 'normal' | 'square' | 'star';
  rawShinyType: number;    // Original numeric value from WASM
  
  // Special encounter specific data
  dustCloudContent?: DustCloudContent;
  itemId?: number;         // For dust cloud items
  
  // Sync rule enforcement
  syncEligible: boolean;   // Whether sync can apply to this encounter type
  syncAppliedCorrectly: boolean; // Whether sync was applied according to rules
}

// Encounter table mapping for different encounter types
export interface EncounterTableMap {
  [EncounterType.Normal]: EncounterTableEntry[];
  [EncounterType.Surfing]: EncounterTableEntry[];
  [EncounterType.Fishing]: EncounterTableEntry[];
  [EncounterType.ShakingGrass]: EncounterTableEntry[];
  [EncounterType.DustCloud]: EncounterTableEntry[];
  [EncounterType.PokemonShadow]: EncounterTableEntry[];
  [EncounterType.SurfingBubble]: EncounterTableEntry[];
  [EncounterType.FishingBubble]: EncounterTableEntry[];
  [EncounterType.StaticSymbol]: EncounterTableEntry[];
  [EncounterType.StaticStarter]: EncounterTableEntry[];
  [EncounterType.StaticFossil]: EncounterTableEntry[];
  [EncounterType.StaticEvent]: EncounterTableEntry[];
  [EncounterType.Roaming]: EncounterTableEntry[];
}

/**
 * Pokemon Data Assembler
 * Integrates WASM raw data with encounter tables and business logic
 */
export class PokemonAssembler {
  private encounterTables: Partial<EncounterTableMap>;
  private romVersion: ROMVersion;
  private romRegion: ROMRegion;
  
  constructor(
    romVersion: ROMVersion,
    romRegion: ROMRegion,
    encounterTables: Partial<EncounterTableMap> = {}
  ) {
    this.romVersion = romVersion;
    this.romRegion = romRegion;
    this.encounterTables = encounterTables;
  }
  
  /**
   * Assemble enhanced pokemon data from raw WASM output
   */
  public assembleData(rawData: RawPokemonData): EnhancedPokemonData {
    const encounterTable = this.getEncounterTable(rawData.encounterType);
    const encounterEntry = this.resolveEncounterSlot(rawData.encounterSlotValue, encounterTable);
    
    const enhancedData: EnhancedPokemonData = {
      seed: rawData.seed,
      pid: rawData.pid,
      nature: rawData.nature,
      syncApplied: rawData.syncApplied,
      abilitySlot: rawData.abilitySlot,
      genderValue: rawData.genderValue,
      encounterSlotValue: rawData.encounterSlotValue,
      encounterType: rawData.encounterType,
      levelRandValue: rawData.levelRandValue,
      rawShinyType: rawData.shinyType,
      species: encounterEntry.species,
      level: this.calculateLevel(rawData.levelRandValue, encounterEntry),
      ability: this.resolveAbility(rawData.abilitySlot, encounterEntry),
      gender: this.resolveGender(rawData.genderValue, encounterEntry),
      isShiny: rawData.shinyType > 0,
      shinyType: this.resolveShinyType(rawData.shinyType),
      syncEligible: this.isSyncEligible(rawData.encounterType),
      syncAppliedCorrectly: this.validateSyncApplication(rawData),
    };
    
    // Handle special encounters
    if (rawData.encounterType === EncounterType.DustCloud) {
      this.addDustCloudData(enhancedData, rawData);
    }
    
    return enhancedData;
  }
  
  /**
   * Batch assemble multiple pokemon data entries
   */
  public assembleBatch(rawDataArray: RawPokemonData[]): EnhancedPokemonData[] {
    return rawDataArray.map(rawData => this.assembleData(rawData));
  }
  
  /**
   * Determine if sync is eligible for the encounter type
   * Sync only applies to wild encounters, NOT roaming
   */
  private isSyncEligible(encounterType: EncounterType): boolean {
    // Wild encounters where sync applies
    const wildEncounters = [
      EncounterType.Normal,
      EncounterType.Surfing,
      EncounterType.Fishing,
      EncounterType.ShakingGrass,
      EncounterType.DustCloud,
      EncounterType.PokemonShadow,
      EncounterType.SurfingBubble,
      EncounterType.FishingBubble,
    ];
    
    // Static symbols also allow sync
    const staticSyncEligible = [EncounterType.StaticSymbol];
    
    return wildEncounters.includes(encounterType) || staticSyncEligible.includes(encounterType);
  }
  
  /**
   * Validate that sync was applied correctly according to rules
   */
  private validateSyncApplication(rawData: RawPokemonData): boolean {
    const isEligible = this.isSyncEligible(rawData.encounterType);
    
    // If encounter type is not eligible for sync, sync should not be applied
    if (!isEligible && rawData.syncApplied) {
      return false; // Sync incorrectly applied to ineligible encounter
    }
    
    // Roaming encounters specifically should never have sync applied
    if (rawData.encounterType === EncounterType.Roaming && rawData.syncApplied) {
      return false; // Sync incorrectly applied to roaming encounter
    }
    
    return true; // Sync application is correct
  }
  
  /**
   * Get encounter table for specific encounter type
   */
  private getEncounterTable(encounterType: EncounterType): EncounterTableEntry[] {
    const table = this.encounterTables[encounterType];
    if (!table || table.length === 0) {
      // Return default entry for testing/fallback
      return [{
        species: 1, // Bulbasaur as default
        minLevel: 5,
        maxLevel: 5,
        abilityRatio: [1, 0],
        genderRatio: 87, // 87.5% male ratio
      }];
    }
    return table;
  }
  
  /**
   * Resolve encounter slot to specific pokemon
   */
  private resolveEncounterSlot(slotValue: number, table: EncounterTableEntry[]): EncounterTableEntry {
    if (table.length === 0) {
      throw new Error('Empty encounter table');
    }
    
    // Use modulo to ensure valid index
    const index = slotValue % table.length;
    return table[index];
  }
  
  /**
   * Calculate level from random value and level range
   */
  private calculateLevel(levelRandValue: number, entry: EncounterTableEntry): number {
    const levelRange = entry.maxLevel - entry.minLevel + 1;
    if (levelRange <= 1) {
      return entry.minLevel;
    }
    
    // Use the level random value to determine level within range
    const levelOffset = levelRandValue % levelRange;
    return entry.minLevel + levelOffset;
  }
  
  /**
   * Resolve ability from slot and entry data
   */
  private resolveAbility(abilitySlot: number, _entry: EncounterTableEntry): number {
    // This is a simplified implementation
    // In reality, this would map to actual ability IDs based on species data
    return abilitySlot === 0 ? 1 : 2; // Simple mapping for testing
  }
  
  /**
   * Resolve gender from value and species gender ratio
   */
  private resolveGender(genderValue: number, entry: EncounterTableEntry): number {
    if (entry.genderRatio === -1) {
      return 2; // Genderless
    }
    
    // Gender is determined by comparing random value to species ratio
    return genderValue < entry.genderRatio ? 1 : 0; // 1: female, 0: male
  }
  
  /**
   * Resolve shiny type enum to string
   */
  private resolveShinyType(shinyType: number): 'normal' | 'square' | 'star' {
    switch (shinyType) {
      case 1: return 'square';
      case 2: return 'star';
      default: return 'normal';
    }
  }
  
  /**
   * Add dust cloud specific data
   */
  private addDustCloudData(enhancedData: EnhancedPokemonData, rawData: RawPokemonData): void {
    // Dust cloud content determination based on additional random values
    // This is a simplified implementation - in practice, this would use
    // additional RNG calls to determine content type
    const contentRandom = (rawData.pid & 0xFF) % 100;
    
    if (contentRandom < 60) {
      enhancedData.dustCloudContent = DustCloudContent.Pokemon;
    } else if (contentRandom < 85) {
      enhancedData.dustCloudContent = DustCloudContent.Item;
      enhancedData.itemId = this.determineDustCloudItem(rawData);
    } else {
      enhancedData.dustCloudContent = DustCloudContent.Gem;
      enhancedData.itemId = this.determineDustCloudGem(rawData);
    }
  }
  
  /**
   * Determine dust cloud item ID
   */
  private determineDustCloudItem(rawData: RawPokemonData): number {
    // Simplified item determination
    // In practice, this would use location-specific item tables
    const itemRandom = (rawData.pid >> 8) % 10;
    
    // Return common dust cloud items (example IDs)
    const dustCloudItems = [12, 13, 14, 15, 16, 17, 18, 19, 20, 21];
    return dustCloudItems[itemRandom];
  }
  
  /**
   * Determine dust cloud gem ID
   */
  private determineDustCloudGem(rawData: RawPokemonData): number {
    // Simplified gem determination
    const gemRandom = (rawData.pid >> 16) % 8;
    
    // Return gem item IDs (example)
    const gemItems = [550, 551, 552, 553, 554, 555, 556, 557];
    return gemItems[gemRandom];
  }
  
  /**
   * Set encounter table for specific encounter type
   */
  public setEncounterTable(encounterType: EncounterType, table: EncounterTableEntry[]): void {
    this.encounterTables[encounterType] = table;
  }
  
  /**
   * Get current encounter tables
   */
  public getEncounterTables(): Partial<EncounterTableMap> {
    return { ...this.encounterTables };
  }
  
  /**
   * Validate that sync rules are correctly enforced
   * This is particularly important for roaming encounters
   */
  public validateSyncRules(enhancedDataArray: EnhancedPokemonData[]): {
    isValid: boolean;
    violations: Array<{
      index: number;
      encounterType: EncounterType;
      syncApplied: boolean;
      syncEligible: boolean;
      violation: string;
    }>;
  } {
    const violations: Array<{
      index: number;
      encounterType: EncounterType;
      syncApplied: boolean;
      syncEligible: boolean;
      violation: string;
    }> = [];
    
    enhancedDataArray.forEach((data, index) => {
      if (!data.syncAppliedCorrectly) {
        let violation = '';
        
        if (data.encounterType === EncounterType.Roaming && data.syncApplied) {
          violation = 'Sync incorrectly applied to roaming encounter';
        } else if (!data.syncEligible && data.syncApplied) {
          violation = 'Sync applied to ineligible encounter type';
        }
        
        violations.push({
          index,
          encounterType: data.encounterType,
          syncApplied: data.syncApplied,
          syncEligible: data.syncEligible,
          violation,
        });
      }
    });
    
    return {
      isValid: violations.length === 0,
      violations,
    };
  }
}

/**
 * Utility function to create sample encounter tables for testing
 */
export function createSampleEncounterTables(): Partial<EncounterTableMap> {
  const normalTable: EncounterTableEntry[] = [
    { species: 1, minLevel: 5, maxLevel: 7, abilityRatio: [1, 0], genderRatio: 87 },
    { species: 4, minLevel: 5, maxLevel: 7, abilityRatio: [1, 0], genderRatio: 87 },
    { species: 7, minLevel: 5, maxLevel: 7, abilityRatio: [1, 0], genderRatio: 87 },
  ];
  
  const roamingTable: EncounterTableEntry[] = [
    { species: 144, minLevel: 40, maxLevel: 40, abilityRatio: [1, 0], genderRatio: -1 }, // Articuno
    { species: 145, minLevel: 40, maxLevel: 40, abilityRatio: [1, 0], genderRatio: -1 }, // Zapdos
    { species: 146, minLevel: 40, maxLevel: 40, abilityRatio: [1, 0], genderRatio: -1 }, // Moltres
  ];
  
  return {
    [EncounterType.Normal]: normalTable,
    [EncounterType.Roaming]: roamingTable,
    [EncounterType.DustCloud]: normalTable, // Reuse for simplicity
  };
}
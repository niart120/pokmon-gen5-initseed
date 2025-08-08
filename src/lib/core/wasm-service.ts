/**
 * WASM Service Wrapper
 * Provides input validation, enum conversion, and error handling for WASM operations
 * Uses IntegratedSeedSearcher as the sole WASM interface
 */

import { initWasm, getWasm, isWasmReady } from './wasm-interface';
import type { ROMVersion, ROMRegion, Hardware, SearchConditions } from '../../types/pokemon';

// Enum mappings based on Rust implementations
export enum WasmGameVersion {
  BlackWhite = 0,
  BlackWhite2 = 1,
}

export enum WasmEncounterType {
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

export enum WasmGameMode {
  BwNewGameWithSave = 0,
  BwNewGameNoSave = 1,
  BwContinue = 2,
  Bw2NewGameWithMemoryLinkSave = 3,
  Bw2NewGameNoMemoryLinkSave = 4,
  Bw2NewGameNoSave = 5,
  Bw2ContinueWithMemoryLink = 6,
  Bw2ContinueNoMemoryLink = 7,
}

// Validation error types
export class WasmServiceError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'WasmServiceError';
  }
}

export class ValidationError extends WasmServiceError {
  constructor(message: string, public readonly field?: string) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class ConversionError extends WasmServiceError {
  constructor(message: string, public readonly value?: unknown) {
    super(message, 'CONVERSION_ERROR');
    this.name = 'ConversionError';
  }
}

export class WasmInitializationError extends WasmServiceError {
  constructor(message: string, public readonly cause?: Error) {
    super(message, 'WASM_INIT_ERROR');
    this.name = 'WasmInitializationError';
  }
}

// Conversion utilities
export class EnumConverter {
  /**
   * Convert ROM version to WASM GameVersion
   */
  static romVersionToGameVersion(romVersion: ROMVersion): WasmGameVersion {
    switch (romVersion) {
      case 'B':
      case 'W':
        return WasmGameVersion.BlackWhite;
      case 'B2':
      case 'W2':
        return WasmGameVersion.BlackWhite2;
      default:
        throw new ConversionError(`Invalid ROM version: ${romVersion}`, romVersion);
    }
  }

  /**
   * Convert string encounter type to WASM EncounterType
   */
  static stringToEncounterType(encounterType: string): WasmEncounterType {
    const normalized = encounterType.toUpperCase().replace(/[_-]/g, '');
    
    switch (normalized) {
      case 'NORMAL':
        return WasmEncounterType.Normal;
      case 'SURFING':
        return WasmEncounterType.Surfing;
      case 'FISHING':
        return WasmEncounterType.Fishing;
      case 'SHAKINGGRASS':
        return WasmEncounterType.ShakingGrass;
      case 'DUSTCLOUD':
        return WasmEncounterType.DustCloud;
      case 'POKEMONSHADOW':
        return WasmEncounterType.PokemonShadow;
      case 'SURFINGBUBBLE':
        return WasmEncounterType.SurfingBubble;
      case 'FISHINGBUBBLE':
        return WasmEncounterType.FishingBubble;
      case 'STATICSYMBOL':
        return WasmEncounterType.StaticSymbol;
      case 'STATICSTARTER':
        return WasmEncounterType.StaticStarter;
      case 'STATICFOSSIL':
        return WasmEncounterType.StaticFossil;
      case 'STATICEVENT':
        return WasmEncounterType.StaticEvent;
      case 'ROAMING':
        return WasmEncounterType.Roaming;
      default:
        throw new ConversionError(`Invalid encounter type: ${encounterType}`, encounterType);
    }
  }

  /**
   * Convert game start configuration to WASM GameMode
   */
  static configToGameMode(
    romVersion: ROMVersion,
    hasExistingSave: boolean,
    isNewGame: boolean,
    hasMemoryLink?: boolean
  ): WasmGameMode {
    const isBW2 = romVersion === 'B2' || romVersion === 'W2';
    
    if (isBW2) {
      if (isNewGame) {
        if (hasExistingSave) {
          return hasMemoryLink 
            ? WasmGameMode.Bw2NewGameWithMemoryLinkSave 
            : WasmGameMode.Bw2NewGameNoMemoryLinkSave;
        } else {
          return WasmGameMode.Bw2NewGameNoSave;
        }
      } else {
        return hasMemoryLink 
          ? WasmGameMode.Bw2ContinueWithMemoryLink 
          : WasmGameMode.Bw2ContinueNoMemoryLink;
      }
    } else {
      // BW
      if (isNewGame) {
        return hasExistingSave 
          ? WasmGameMode.BwNewGameWithSave 
          : WasmGameMode.BwNewGameNoSave;
      } else {
        return WasmGameMode.BwContinue;
      }
    }
  }

  /**
   * Validate and normalize hardware type
   */
  static validateHardware(hardware: Hardware): string {
    switch (hardware) {
      case 'DS':
        return 'DS';
      case 'DS_LITE':
        return 'DS_LITE';
      case '3DS':
        return '3DS';
      default:
        throw new ConversionError(`Invalid hardware type: ${hardware}`, hardware);
    }
  }
}

// Parameter validation utilities
export class ParameterValidator {
  /**
   * Validate MAC address
   */
  static validateMacAddress(macAddress: number[]): Uint8Array {
    if (!Array.isArray(macAddress)) {
      throw new ValidationError('MAC address must be an array', 'macAddress');
    }
    
    if (macAddress.length !== 6) {
      throw new ValidationError('MAC address must be exactly 6 bytes', 'macAddress');
    }
    
    for (let i = 0; i < macAddress.length; i++) {
      const byte = macAddress[i];
      if (!Number.isInteger(byte) || byte < 0 || byte > 255) {
        throw new ValidationError(`MAC address byte ${i} must be 0-255, got: ${byte}`, 'macAddress');
      }
    }
    
    return new Uint8Array(macAddress);
  }

  /**
   * Validate nazo values
   */
  static validateNazo(nazo: number[]): Uint32Array {
    if (!Array.isArray(nazo)) {
      throw new ValidationError('Nazo must be an array', 'nazo');
    }
    
    if (nazo.length !== 5) {
      throw new ValidationError('Nazo must be exactly 5 32-bit values', 'nazo');
    }
    
    for (let i = 0; i < nazo.length; i++) {
      const value = nazo[i];
      if (!Number.isInteger(value) || value < 0 || value > 0xFFFFFFFF) {
        throw new ValidationError(`Nazo value ${i} must be 0-4294967295, got: ${value}`, 'nazo');
      }
    }
    
    return new Uint32Array(nazo);
  }

  /**
   * Validate key input
   */
  static validateKeyInput(keyInput: number): number {
    if (!Number.isInteger(keyInput) || keyInput < 0 || keyInput > 0xFFF) {
      throw new ValidationError(`Key input must be 0-4095, got: ${keyInput}`, 'keyInput');
    }
    return keyInput;
  }

  /**
   * Validate timer0/vcount ranges
   */
  static validateRange(min: number, max: number, fieldName: string): { min: number; max: number } {
    if (!Number.isInteger(min) || !Number.isInteger(max)) {
      throw new ValidationError(`${fieldName} min and max must be integers`, fieldName);
    }
    
    if (min < 0 || max < 0) {
      throw new ValidationError(`${fieldName} values must be non-negative`, fieldName);
    }
    
    if (min > max) {
      throw new ValidationError(`${fieldName} min must be less than or equal to max`, fieldName);
    }
    
    // Reasonable limits to prevent excessive computation
    const maxValue = fieldName.toLowerCase().includes('timer0') ? 0xFFFF : 0xFF;
    if (min > maxValue || max > maxValue) {
      throw new ValidationError(`${fieldName} values must not exceed ${maxValue}`, fieldName);
    }
    
    return { min, max };
  }

  /**
   * Validate date/time values
   */
  static validateDateTime(
    year: number,
    month: number,
    date: number,
    hour: number,
    minute: number,
    second: number
  ): void {
    if (!Number.isInteger(year) || year < 2000 || year > 2099) {
      throw new ValidationError(`Year must be 2000-2099, got: ${year}`, 'year');
    }
    
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      throw new ValidationError(`Month must be 1-12, got: ${month}`, 'month');
    }
    
    if (!Number.isInteger(date) || date < 1 || date > 31) {
      throw new ValidationError(`Date must be 1-31, got: ${date}`, 'date');
    }
    
    if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
      throw new ValidationError(`Hour must be 0-23, got: ${hour}`, 'hour');
    }
    
    if (!Number.isInteger(minute) || minute < 0 || minute > 59) {
      throw new ValidationError(`Minute must be 0-59, got: ${minute}`, 'minute');
    }
    
    if (!Number.isInteger(second) || second < 0 || second > 59) {
      throw new ValidationError(`Second must be 0-59, got: ${second}`, 'second');
    }

    // Additional validation: check if date is valid
    try {
      const testDate = new Date(year, month - 1, date, hour, minute, second);
      if (testDate.getFullYear() !== year ||
          testDate.getMonth() !== month - 1 ||
          testDate.getDate() !== date ||
          testDate.getHours() !== hour ||
          testDate.getMinutes() !== minute ||
          testDate.getSeconds() !== second) {
        throw new ValidationError('Invalid date/time combination', 'dateTime');
      }
    } catch (error) {
      throw new ValidationError('Invalid date/time combination', 'dateTime');
    }
  }

  /**
   * Validate target seeds
   */
  static validateTargetSeeds(targetSeeds: number[]): Uint32Array {
    if (!Array.isArray(targetSeeds)) {
      throw new ValidationError('Target seeds must be an array', 'targetSeeds');
    }
    
    if (targetSeeds.length === 0) {
      throw new ValidationError('Target seeds array cannot be empty', 'targetSeeds');
    }
    
    if (targetSeeds.length > 10000) {
      throw new ValidationError('Target seeds array cannot exceed 10000 elements', 'targetSeeds');
    }
    
    for (let i = 0; i < targetSeeds.length; i++) {
      const seed = targetSeeds[i];
      if (!Number.isInteger(seed) || seed < 0 || seed > 0xFFFFFFFF) {
        throw new ValidationError(`Target seed ${i} must be 0-4294967295, got: ${seed}`, 'targetSeeds');
      }
    }
    
    return new Uint32Array(targetSeeds);
  }
}

// Main WASM Service
export class WasmService {
  private static instance: WasmService | null = null;
  private initialized = false;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): WasmService {
    if (!WasmService.instance) {
      WasmService.instance = new WasmService();
    }
    return WasmService.instance;
  }

  /**
   * Initialize WASM module
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      await initWasm();
      this.initialized = true;
    } catch (error) {
      throw new WasmInitializationError(
        `Failed to initialize WebAssembly module: ${error}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Check if WASM is ready
   */
  isReady(): boolean {
    return this.initialized && isWasmReady();
  }

  /**
   * Create IntegratedSeedSearcher with validation
   */
  createSearcher(
    macAddress: number[],
    nazo: number[],
    hardware: Hardware,
    keyInput: number,
    frame: number = 0
  ): any {
    if (!this.isReady()) {
      throw new WasmInitializationError('WASM module not initialized');
    }

    try {
      // Validate parameters
      const validatedMac = ParameterValidator.validateMacAddress(macAddress);
      const validatedNazo = ParameterValidator.validateNazo(nazo);
      const validatedKeyInput = ParameterValidator.validateKeyInput(keyInput);
      const validatedHardware = EnumConverter.validateHardware(hardware);

      // Validate frame
      if (!Number.isInteger(frame) || frame < 0 || frame > 0xFFFFFFFF) {
        throw new ValidationError(`Frame must be 0-4294967295, got: ${frame}`, 'frame');
      }

      const wasm = getWasm();
      return new wasm.IntegratedSeedSearcher(
        validatedMac,
        validatedNazo,
        validatedHardware,
        validatedKeyInput,
        frame
      );
    } catch (error) {
      if (error instanceof WasmServiceError) {
        throw error;
      }
      throw new WasmServiceError(`Failed to create searcher: ${error}`, 'SEARCHER_CREATION_ERROR');
    }
  }

  /**
   * Perform integrated seed search with comprehensive validation
   */
  searchSeeds(
    searcher: any,
    startDateTime: {
      year: number;
      month: number;
      date: number;
      hour: number;
      minute: number;
      second: number;
    },
    rangeSeconds: number,
    timer0Range: { min: number; max: number },
    vcountRange: { min: number; max: number },
    targetSeeds: number[]
  ): any[] {
    if (!this.isReady()) {
      throw new WasmInitializationError('WASM module not initialized');
    }

    if (!searcher) {
      throw new ValidationError('Searcher instance is required', 'searcher');
    }

    try {
      // Validate date/time
      ParameterValidator.validateDateTime(
        startDateTime.year,
        startDateTime.month,
        startDateTime.date,
        startDateTime.hour,
        startDateTime.minute,
        startDateTime.second
      );

      // Validate range seconds
      if (!Number.isInteger(rangeSeconds) || rangeSeconds < 1 || rangeSeconds > 86400) {
        throw new ValidationError('Range seconds must be 1-86400', 'rangeSeconds');
      }

      // Validate ranges
      const validatedTimer0Range = ParameterValidator.validateRange(
        timer0Range.min,
        timer0Range.max,
        'timer0Range'
      );
      const validatedVcountRange = ParameterValidator.validateRange(
        vcountRange.min,
        vcountRange.max,
        'vcountRange'
      );

      // Validate target seeds
      const validatedTargetSeeds = ParameterValidator.validateTargetSeeds(targetSeeds);

      // Perform search
      return searcher.search_seeds_integrated_simd(
        startDateTime.year,
        startDateTime.month,
        startDateTime.date,
        startDateTime.hour,
        startDateTime.minute,
        startDateTime.second,
        rangeSeconds,
        validatedTimer0Range.min,
        validatedTimer0Range.max,
        validatedVcountRange.min,
        validatedVcountRange.max,
        validatedTargetSeeds
      );
    } catch (error) {
      if (error instanceof WasmServiceError) {
        throw error;
      }
      throw new WasmServiceError(`Search failed: ${error}`, 'SEARCH_ERROR');
    }
  }

  /**
   * High-level search with SearchConditions interface
   */
  async searchWithConditions(
    conditions: SearchConditions,
    targetSeeds: number[],
    nazo?: number[]
  ): Promise<any[]> {
    await this.initialize();

    try {
      // Convert conditions to WASM parameters
      const hardware = EnumConverter.validateHardware(conditions.hardware);
      const validatedKeyInput = ParameterValidator.validateKeyInput(conditions.keyInput);

      // Use provided nazo or fallback
      const nazovalues = nazo || [0, 0, 0, 0, 0];

      // Create searcher
      const searcher = this.createSearcher(
        conditions.macAddress,
        nazovalues,
        conditions.hardware,
        validatedKeyInput
      );

      try {
        // Perform search
        const results = this.searchSeeds(
          searcher,
          {
            year: conditions.dateRange.startYear,
            month: conditions.dateRange.startMonth,
            date: conditions.dateRange.startDay,
            hour: conditions.dateRange.startHour,
            minute: conditions.dateRange.startMinute,
            second: conditions.dateRange.startSecond,
          },
          // Calculate range seconds from end date/time
          Math.max(1, Math.floor(
            (new Date(
              conditions.dateRange.endYear,
              conditions.dateRange.endMonth - 1,
              conditions.dateRange.endDay,
              conditions.dateRange.endHour,
              conditions.dateRange.endMinute,
              conditions.dateRange.endSecond
            ).getTime() -
            new Date(
              conditions.dateRange.startYear,
              conditions.dateRange.startMonth - 1,
              conditions.dateRange.startDay,
              conditions.dateRange.startHour,
              conditions.dateRange.startMinute,
              conditions.dateRange.startSecond
            ).getTime()) / 1000
          )),
          conditions.timer0VCountConfig.timer0Range,
          conditions.timer0VCountConfig.vcountRange,
          targetSeeds
        );

        return results;
      } finally {
        // Clean up searcher
        if (searcher && typeof searcher.free === 'function') {
          searcher.free();
        }
      }
    } catch (error) {
      if (error instanceof WasmServiceError) {
        throw error;
      }
      throw new WasmServiceError(`Search with conditions failed: ${error}`, 'CONDITIONS_SEARCH_ERROR');
    }
  }
}

// Export default instance
export const wasmService = WasmService.getInstance();
/**
 * WASM Wrapper Service for Pokemon Generation
 * 
 * This service provides a high-level interface to the WASM pokemon generation
 * functionality with proper TypeScript integration, validation, and error handling.
 * 
 * Architecture principle: Use direct PokemonGenerator for deterministic generation
 */

import { initWasm, getWasm, isWasmReady } from '../core/wasm-interface';
import type { ROMVersion, ROMRegion, Hardware } from '../../types/pokemon';
import { parseRawPokemonData, type RawPokemonData } from '../../types/raw-pokemon-data';

/**
 * WASM generation configuration
 */
export interface WasmGenerationConfig {
  /** Game version */
  version: ROMVersion;
  /** Game region */
  region: ROMRegion;
  /** Hardware type */
  hardware: Hardware;
  /** Trainer ID */
  tid: number;
  /** Secret ID */
  sid: number;
  /** Enable synchronize */
  syncEnabled: boolean;
  /** Synchronize nature ID (0-24) */
  syncNatureId: number;
  /** MAC address (6 bytes) */
  macAddress: number[];
  /** Key input value */
  keyInput: number;
  /** Frame number for generation */
  frame: number;
}

/**
 * Pokemon generation request
 */
export interface PokemonGenerationRequest {
  /** Initial seed value */
  seed: bigint;
  /** Generation configuration */
  config: WasmGenerationConfig;
  /** Number of Pokemon to generate (for batch operations) */
  count?: number;
  /** Offset from initial seed (for batch operations) */
  offset?: number;
}

/**
 * Pokemon generation result
 */
export interface PokemonGenerationResult {
  /** Generated Pokemon data */
  pokemon: RawPokemonData[];
  /** Generation statistics */
  stats: {
    /** Total generation time in milliseconds */
    generationTime: number;
    /** Number of Pokemon generated */
    count: number;
    /** Initial seed used */
    initialSeed: bigint;
  };
}

/**
 * WASM service error types
 */
export class WasmServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'WasmServiceError';
  }
}

/**
 * WASM Pokemon Generation Service
 * 
 * Provides high-level TypeScript interface to WASM pokemon generation
 * with proper validation, error handling, and type conversion.
 */
export class WasmPokemonService {
  private isInitialized = false;

  /**
   * Initialize the WASM service
   */
  async initialize(): Promise<void> {
    try {
      await initWasm();
      this.isInitialized = true;
    } catch (error) {
      throw new WasmServiceError(
        'Failed to initialize WASM module',
        'WASM_INIT_FAILED',
        error as Error
      );
    }
  }

  /**
   * Check if service is ready
   */
  isReady(): boolean {
    return this.isInitialized && isWasmReady();
  }

  /**
   * Generate single Pokemon
   * 
   * @param request Generation request
   * @returns Single Pokemon data
   */
  async generateSinglePokemon(request: PokemonGenerationRequest): Promise<RawPokemonData> {
    this.validateInitialized();
    this.validateGenerationRequest(request);

    const startTime = performance.now();

    try {
      const wasm = getWasm();

      // Build BWGenerationConfig (use Normal encounter as default)
      const bwConfig = new wasm.BWGenerationConfig(
        this.toGameVersion(request.config.version),
        wasm.EncounterType.Normal,
        request.config.tid,
        request.config.sid,
        request.config.syncEnabled,
        request.config.syncNatureId
      );

      try {
        const wasmRaw = wasm.PokemonGenerator.generate_single_pokemon_bw(
          BigInt.asUintN(64, request.seed),
          bwConfig
        );
        const rawData = parseRawPokemonData(wasmRaw);
        const endTime = performance.now();
        console.log(`WASM single Pokemon generation completed in ${endTime - startTime}ms`);
        return rawData;
      } finally {
        bwConfig.free();
      }
    } catch (error) {
      throw new WasmServiceError(
        `Pokemon generation failed: ${error}`,
        'GENERATION_FAILED',
        error as Error
      );
    }
  }

  /**
   * Generate batch of Pokemon
   * 
   * @param request Generation request with count and offset
   * @returns Batch generation result
   */
  async generatePokemonBatch(request: PokemonGenerationRequest): Promise<PokemonGenerationResult> {
    this.validateInitialized();
    this.validateGenerationRequest(request);

    // Use nullish coalescing to preserve 0 as an explicit (invalid) value
    const count = request.count ?? 1;
    const offset = request.offset ?? 0;

    if (count <= 0 || count > 10000) {
      throw new WasmServiceError(
        `Invalid count: ${count}. Must be between 1 and 10000`,
        'INVALID_COUNT'
      );
    }

    const startTime = performance.now();

    try {
      const wasm = getWasm();
      const bwConfig = new wasm.BWGenerationConfig(
        this.toGameVersion(request.config.version),
        wasm.EncounterType.Normal,
        request.config.tid,
        request.config.sid,
        request.config.syncEnabled,
        request.config.syncNatureId
      );

      try {
        // 連続する内部シードから count 件生成（offsetは開始シードに加味）
        const startSeed = BigInt.asUintN(64, request.seed + BigInt(offset));
        const wasmList = wasm.PokemonGenerator.generate_pokemon_batch_bw(
          startSeed,
          count,
          bwConfig
        );

        if (!wasmList || wasmList.length === 0) {
          throw new WasmServiceError(
            'No Pokemon generated from WASM batch operation',
            'NO_BATCH_RESULTS'
          );
        }

        const pokemon = wasmList.map(item => parseRawPokemonData(item));
        const endTime = performance.now();
        const generationTime = endTime - startTime;

        return {
          pokemon,
          stats: {
            generationTime,
            count: pokemon.length,
            initialSeed: request.seed,
          },
        };
      } finally {
        bwConfig.free();
      }
    } catch (error) {
      throw new WasmServiceError(
        `Batch Pokemon generation failed: ${error}`,
        'BATCH_GENERATION_FAILED',
        error as Error
      );
    }
  }

  /**
   * Validate that service is initialized
   */
  private validateInitialized(): void {
    if (!this.isReady()) {
      throw new WasmServiceError(
        'WASM service not initialized. Call initialize() first.',
        'NOT_INITIALIZED'
      );
    }
  }

  /**
   * Validate generation request
   */
  private validateGenerationRequest(request: PokemonGenerationRequest): void {
    if (!request.config) {
      throw new WasmServiceError('Generation config is required', 'MISSING_CONFIG');
    }

    const config = request.config;

    // Validate TID/SID
    if (config.tid < 0 || config.tid > 65535) {
      throw new WasmServiceError(`Invalid TID: ${config.tid}. Must be 0-65535`, 'INVALID_TID');
    }

    if (config.sid < 0 || config.sid > 65535) {
      throw new WasmServiceError(`Invalid SID: ${config.sid}. Must be 0-65535`, 'INVALID_SID');
    }

    // Validate nature ID
    if (config.syncNatureId < 0 || config.syncNatureId > 24) {
      throw new WasmServiceError(
        `Invalid sync nature ID: ${config.syncNatureId}. Must be 0-24`,
        'INVALID_NATURE'
      );
    }

    // Validate frame
    if (config.frame < 0 || config.frame > 1000000) {
      throw new WasmServiceError(
        `Invalid frame: ${config.frame}. Must be 0-1000000`,
        'INVALID_FRAME'
      );
    }

    // Validate key input
    if (config.keyInput < 0 || config.keyInput > 4095) {
      throw new WasmServiceError(
        `Invalid key input: ${config.keyInput}. Must be 0-4095`,
        'INVALID_KEY_INPUT'
      );
    }

    // MACは現状未使用だが形式チェックは残す
    this.validateAndConvertMacAddress(config.macAddress);
  }

  /**
   * Validate and convert MAC address
   */
  private validateAndConvertMacAddress(macAddress: number[]): Uint8Array {
    if (!Array.isArray(macAddress) || macAddress.length !== 6) {
      throw new WasmServiceError(
        'MAC address must be an array of 6 numbers',
        'INVALID_MAC_ADDRESS'
      );
    }

    for (let i = 0; i < 6; i++) {
      if (macAddress[i] < 0 || macAddress[i] > 255 || !Number.isInteger(macAddress[i])) {
        throw new WasmServiceError(
          `Invalid MAC address byte ${i}: ${macAddress[i]}. Must be 0-255`,
          'INVALID_MAC_BYTE'
        );
      }
    }

    return new Uint8Array(macAddress);
  }

  /**
   * Map ROMVersion ('B' | 'W' | 'B2' | 'W2') to GameVersion enum value
   */
  private toGameVersion(version: ROMVersion): number {
    const wasm = getWasm();
    switch (version) {
      case 'B':
      case 'W':
        return wasm.GameVersion.BlackWhite ?? wasm.GameVersion["BlackWhite"] ?? 0;
      case 'B2':
      case 'W2':
        return wasm.GameVersion.BlackWhite2 ?? wasm.GameVersion["BlackWhite2"] ?? 1;
      default:
        return wasm.GameVersion.BlackWhite ?? 0;
    }
  }

  /**
   * Create default generation config for testing
   */
  static createDefaultConfig(): WasmGenerationConfig {
    return {
      version: 'B',
      region: 'JPN',
      hardware: 'DS',
      tid: 12345,
      sid: 54321,
      syncEnabled: false,
      syncNatureId: 0,
      macAddress: [0x00, 0x16, 0x56, 0x12, 0x34, 0x56],
      keyInput: 0,
      frame: 1,
    };
  }
}

/**
 * Global WASM service instance
 */
let globalWasmService: WasmPokemonService | null = null;

/**
 * Get or create global WASM service instance
 */
export async function getWasmPokemonService(): Promise<WasmPokemonService> {
  if (!globalWasmService) {
    globalWasmService = new WasmPokemonService();
    await globalWasmService.initialize();
  }
  return globalWasmService;
}

/**
 * Utility function for quick single Pokemon generation
 */
export async function generatePokemon(
  seed: bigint,
  config?: Partial<WasmGenerationConfig>
): Promise<RawPokemonData> {
  const service = await getWasmPokemonService();
  const fullConfig = { ...WasmPokemonService.createDefaultConfig(), ...config };
  
  return service.generateSinglePokemon({
    seed,
    config: fullConfig,
  });
}

/**
 * Utility function for quick batch Pokemon generation
 */
export async function generatePokemonBatch(
  seed: bigint,
  count: number,
  config?: Partial<WasmGenerationConfig>
): Promise<PokemonGenerationResult> {
  const service = await getWasmPokemonService();
  const fullConfig = { ...WasmPokemonService.createDefaultConfig(), ...config };
  
  return service.generatePokemonBatch({
    seed,
    config: fullConfig,
    count,
    offset: 0,
  });
}
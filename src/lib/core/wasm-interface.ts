/**
 * WebAssembly module wrapper for Pokemon BW/BW2 seed calculation
 * This module provides high-performance calculation functions using Rust + WebAssembly
 */

// WebAssembly module interface - 統合検索とポケモン生成API
interface WasmModule {
  // 統合検索機能（従来実装）
  IntegratedSeedSearcher: new (
    mac: Uint8Array,
    nazo: Uint32Array,
    hardware: string,
    key_input: number,
    frame: number
  ) => {
    search_seeds_integrated_simd(
      year_start: number,
      month_start: number,
      date_start: number,
      hour_start: number,
      minute_start: number,
      second_start: number,
      range_seconds: number,
      timer0_min: number,
      timer0_max: number,
      vcount_min: number,
      vcount_max: number,
      target_seeds: Uint32Array
    ): any[];
    free(): void;
  };

  // 追加: ポケモン生成API
  BWGenerationConfig: new (
    version: number, // GameVersion
    encounter_type: number, // EncounterType
    tid: number,
    sid: number,
    sync_enabled: boolean,
    sync_nature_id: number
  ) => { free(): void };
  PokemonGenerator: {
    generate_single_pokemon_bw(seed: bigint, config: any): any;
    generate_pokemon_batch_bw(start_seed: bigint, count: number, config: any): any[];
  };

  // 追加: 列挙（数値）
  EncounterType: { [k: string]: number };
  GameVersion: { [k: string]: number };
}

let wasmModule: WasmModule | null = null;
let wasmPromise: Promise<WasmModule> | null = null;

/**
 * Initialize WebAssembly module
 */
export async function initWasm(): Promise<WasmModule> {
  if (wasmModule) {
    return wasmModule;
  }

  if (wasmPromise) {
    return wasmPromise;
  }

  wasmPromise = (async (): Promise<WasmModule> => {
    try {
      // Import the WebAssembly module
      const module = await import('../../wasm/wasm_pkg.js');
      await module.default();
      
      wasmModule = {
        IntegratedSeedSearcher: module.IntegratedSeedSearcher,
        BWGenerationConfig: module.BWGenerationConfig,
        PokemonGenerator: module.PokemonGenerator,
        EncounterType: module.EncounterType,
        GameVersion: module.GameVersion,
      } as unknown as WasmModule;
      
      return wasmModule;
    } catch (error) {
      console.error('Failed to load WebAssembly module:', error);
      wasmModule = null;
      wasmPromise = null;
      throw error;
    }
  })();

  return wasmPromise;
}

/**
 * Get WebAssembly module (must be initialized first)
 */
export function getWasm(): WasmModule {
  if (!wasmModule) {
    throw new Error('WebAssembly module not initialized. Call initWasm() first.');
  }
  return wasmModule;
}

/**
 * Check if WebAssembly is available and initialized
 */
export function isWasmReady(): boolean {
  return wasmModule !== null;
}

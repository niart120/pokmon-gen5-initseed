/**
 * WebAssembly module wrapper for Pokemon BW/BW2 seed calculation
 * This module provides high-performance calculation functions using Rust + WebAssembly
 */

// WebAssembly module interface - 統合検索のみ
interface WasmModule {
  // 統合検索機能（実際に使用される）
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
      };
      
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

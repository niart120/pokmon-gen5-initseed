/**
 * WebAssembly module wrapper for Pokemon BW/BW2 seed calculation
 * This module provides high-performance calculation functions using Rust + WebAssembly
 */

// WebAssembly module interface
interface WasmModule {
  to_little_endian_32(value: number): number;
  to_little_endian_16(value: number): number;
  calculate_sha1_hash(message: Uint32Array): Uint32Array;
  calculate_sha1_batch(messages: Uint32Array, batch_size: number): Uint32Array;
  test_wasm(): string;
  
  // Phase 2B: Precalculated datetime optimization functions
  test_precalculated_codes(): any[];
  
  // Phase 2B: Integrated seed searcher class
  IntegratedSeedSearcher: new (
    mac: Uint8Array,
    nazo: Uint32Array,
    version: number,
    frame: number
  ) => {
    search_seeds_integrated(
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

  wasmPromise = (async () => {
    try {
      // Import the WebAssembly module
      const module = await import('../wasm/wasm_pkg.js');
      await module.default();
      
      wasmModule = {
        to_little_endian_32: module.to_little_endian_32,
        to_little_endian_16: module.to_little_endian_16,
        calculate_sha1_hash: module.calculate_sha1_hash,
        calculate_sha1_batch: module.calculate_sha1_batch,
        test_wasm: module.test_wasm,
        
        // Phase 2B functions
        test_precalculated_codes: module.test_precalculated_codes,
        IntegratedSeedSearcher: module.IntegratedSeedSearcher,
      };

      console.log('🦀 WebAssembly module loaded:', wasmModule.test_wasm());
      
      // Test Phase 2B functions
      try {
        console.log('🚀 Phase 2B functions available:', wasmModule.test_precalculated_codes());
      } catch (error) {
        console.log('⚠️ Phase 2B functions test failed:', error);
      }
      
      return wasmModule;
    } catch (error) {
      console.error('Failed to load WebAssembly module:', error);
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

/**
 * High-level wrapper functions for Pokemon BW/BW2 calculations
 */
export class WasmSeedCalculator {
  private wasm: WasmModule;

  constructor(wasm: WasmModule) {
    this.wasm = wasm;
  }

  /**
   * Convert 32-bit value to little-endian
   */
  toLittleEndian32(value: number): number {
    return this.wasm.to_little_endian_32(value);
  }

  /**
   * Convert 16-bit value to little-endian
   */
  toLittleEndian16(value: number): number {
    return this.wasm.to_little_endian_16(value);
  }

  /**
   * Calculate SHA-1 hash for Pokemon BW/BW2 seed generation
   * @param message Array of 16 32-bit words
   * @returns Object containing seed (h0) and hash (hex string)
   */
  calculateSeed(message: number[]): { seed: number; hash: string } {
    if (message.length !== 16) {
      throw new Error('Message must be exactly 16 32-bit words');
    }

    // Convert to Uint32Array for WebAssembly
    const messageArray = new Uint32Array(message);
    const result = this.wasm.calculate_sha1_hash(messageArray);
    
    if (result.length !== 2) {
      throw new Error('WebAssembly returned invalid result');
    }

    const h0 = result[0];
    const h1 = result[1];
    
    // Convert to hex string (similar to existing implementation)
    const hash = h0.toString(16).padStart(8, '0') + h1.toString(16).padStart(8, '0');
    
    return { seed: h0, hash };
  }

  /**
   * Batch calculate SHA-1 hashes for improved performance
   * @param messages Array of messages (each 16 32-bit words)
   * @returns Array of seed/hash objects
   */
  calculateSeedBatch(messages: number[][]): Array<{ seed: number; hash: string }> {
    if (messages.length === 0) {
      return [];
    }

    // Validate all messages are 16 words
    for (let i = 0; i < messages.length; i++) {
      if (messages[i].length !== 16) {
        throw new Error(`Message ${i} must be exactly 16 32-bit words`);
      }
    }

    // Flatten messages into single array
    const flatMessages = new Uint32Array(messages.length * 16);
    for (let i = 0; i < messages.length; i++) {
      flatMessages.set(messages[i], i * 16);
    }

    // Call WebAssembly batch function
    const results = this.wasm.calculate_sha1_batch(flatMessages, messages.length);
    
    if (results.length !== messages.length * 2) {
      throw new Error('WebAssembly batch calculation failed');
    }

    // Convert results to seed/hash objects
    const output: Array<{ seed: number; hash: string }> = [];
    for (let i = 0; i < messages.length; i++) {
      const h0 = results[i * 2];
      const h1 = results[i * 2 + 1];
      const seed = h0;
      const hash = `${h0.toString(16).padStart(8, '0')}${h1.toString(16).padStart(8, '0')}`;
      output.push({ seed, hash });
    }

    return output;
  }
}

/**
 * Create a new WasmSeedCalculator instance
 * @param wasm WebAssembly module (from getWasm())
 */
export function createWasmCalculator(wasm: WasmModule): WasmSeedCalculator {
  return new WasmSeedCalculator(wasm);
}

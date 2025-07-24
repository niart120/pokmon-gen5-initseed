/**
 * WebAssembly module wrapper for Pokemon BW/BW2 seed calculation
 * This module provides high-performance calculation functions using Rust + WebAssembly
 */

// WebAssembly module interface
interface WasmModule {
  to_little_endian_32(value: number): number;
  to_little_endian_16(value: number): number;
  calculate_sha1_hash(message: Uint32Array): Uint32Array;
  test_wasm(): string;
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
        test_wasm: module.test_wasm,
      };

      console.log('🦀 WebAssembly module loaded:', wasmModule.test_wasm());
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
}

/**
 * Create a new WasmSeedCalculator instance
 * @param wasm WebAssembly module (from getWasm())
 */
export function createWasmCalculator(wasm: WasmModule): WasmSeedCalculator {
  return new WasmSeedCalculator(wasm);
}

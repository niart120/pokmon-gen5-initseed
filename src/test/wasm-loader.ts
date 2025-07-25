/**
 * Node.js環境でのWebAssembly読み込み用ユーティリティ
 */

import { readFileSync } from 'fs'
import { join } from 'path'

// WebAssembly module interface
interface WasmModule {
  to_little_endian_32_wasm(value: number): number;
  to_little_endian_16_wasm(value: number): number;
  calculate_sha1_hash(message: Uint32Array): Uint32Array;
  calculate_sha1_batch(messages: Uint32Array, batch_size: number): Uint32Array;
}

let wasmModuleInstance: WasmModule | null = null;

/**
 * Node.js環境でWebAssemblyモジュールを読み込み
 */
export async function initWasmForTesting(): Promise<WasmModule> {
  if (wasmModuleInstance) {
    return wasmModuleInstance;
  }

  try {
    // WebAssemblyファイルのパス
    const wasmPath = join(process.cwd(), 'src/wasm/wasm_pkg_bg.wasm');
    
    // WebAssemblyファイルを読み込み
    const wasmBytes = readFileSync(wasmPath);
    const wasmResult = await WebAssembly.instantiate(wasmBytes);
    
    // JSバインディングモジュールを読み込み（Node.js環境用）
    const jsModulePath = join(process.cwd(), 'src/wasm/wasm_pkg.js');
    
    // 動的にJSモジュールをrequireではなくimportで読み込み
    const jsModule = await import(jsModulePath);
    
    // WebAssemblyモジュールをJSモジュールに設定
    await jsModule.default();
    
    wasmModuleInstance = {
      to_little_endian_32_wasm: jsModule.to_little_endian_32_wasm,
      to_little_endian_16_wasm: jsModule.to_little_endian_16_wasm,
      calculate_sha1_hash: jsModule.calculate_sha1_hash,
      calculate_sha1_batch: jsModule.calculate_sha1_batch,
    };

    console.log('🦀 WebAssembly module loaded for testing');
    return wasmModuleInstance;
  } catch (error) {
    console.error('Failed to load WebAssembly module for testing:', error);
    throw error;
  }
}

/**
 * テスト用のWebAssemblyモジュール取得
 */
export function getWasmForTesting(): WasmModule {
  if (!wasmModuleInstance) {
    throw new Error('WebAssembly module not initialized. Call initWasmForTesting() first.');
  }
  return wasmModuleInstance;
}

/**
 * WebAssemblyが利用可能かチェック
 */
export function isWasmAvailableForTesting(): boolean {
  return wasmModuleInstance !== null;
}

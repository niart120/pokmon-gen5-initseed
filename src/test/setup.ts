/**
 * vitest グローバル設定
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

// WebAssemblyのテスト用のグローバル設定
global.TextDecoder = global.TextDecoder || require('util').TextDecoder;
global.TextEncoder = global.TextEncoder || require('util').TextEncoder;

// WebAssembly環境のモック
if (typeof global.WebAssembly === 'undefined') {
  console.warn('WebAssembly not available in test environment');
}

// ファイルシステムからWASMを読み込むヘルパー
(global as any).loadWasmFromFile = async (wasmPath: string) => {
  try {
    const wasmFile = readFileSync(resolve(wasmPath));
    const wasmModule = await WebAssembly.instantiate(wasmFile);
    return wasmModule.instance;
  } catch (error) {
    console.error('WASM loading error:', error);
    throw error;
  }
};

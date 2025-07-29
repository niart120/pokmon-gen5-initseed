#!/usr/bin/env node

/**
 * WebAssembly高性能ビルドスクリプト
 * 最大パフォーマンスを追求したビルドオプション
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

console.log('🚀 WebAssembly高性能ビルド開始...');

const wasmPkgDir = 'wasm-pkg';

// RUSTFLAGS環境変数での追加最適化
const optimizedRustFlags = [
  '-C target-cpu=generic',           // Generic WASM target optimization
  '-C target-feature=+simd128',      // Enable SIMD128 for vectorized operations
  '-C embed-bitcode=yes',            // Embed LLVM bitcode for LTO
  '-C overflow-checks=no',           // Disable overflow checks in release
  '-C debug-assertions=no'           // Disable debug assertions
].join(' ');

// wasm-packでの基本オプション
const wasmPackArgs = [
  '--target web',
  '--out-dir pkg',
  '--release'
];

try {
  console.log('📦 Rustコンパイラ最適化フラグ設定...');
  console.log(`📋 RUSTFLAGS: ${optimizedRustFlags}`);
  process.env.RUSTFLAGS = optimizedRustFlags;
  
  console.log('🔧 wasm-packによる最適化ビルド実行...');
  const buildCommand = `cd ${wasmPkgDir} && wasm-pack build ${wasmPackArgs.join(' ')}`;
  console.log(`実行コマンド: ${buildCommand}`);
  
  execSync(buildCommand, { 
    stdio: 'inherit',
    env: process.env
  });
  
  console.log('✅ WebAssembly高性能ビルド完了');
  
  // ビルド成果物のサイズ確認
  try {
    const wasmFile = join(wasmPkgDir, 'pkg', 'wasm_pkg_bg.wasm');
    const wasmStats = readFileSync(wasmFile);
    const sizeKB = Math.round(wasmStats.length / 1024);
    console.log(`📊 最適化WASM サイズ: ${sizeKB} KB`);
  } catch (err) {
    console.warn('⚠️ WASMファイルサイズ確認できませんでした:', err.message);
  }
  
} catch (error) {
  console.error('❌ WebAssembly高性能ビルドエラー:', error.message);
  process.exit(1);
}

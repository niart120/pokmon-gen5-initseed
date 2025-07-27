/**
 * WebAssembly基本動作テスト (vitest + Node.js環境)
 */

import { describe, test, expect, beforeAll } from 'vitest'
import { initWasmForTesting } from './wasm-loader'

// Node.js環境でのWASM読み込み
let wasm: Awaited<ReturnType<typeof initWasmForTesting>>;

describe('WebAssembly基本動作テスト', () => {
  beforeAll(async () => {
    // Node.js環境でのWebAssembly初期化
    wasm = await initWasmForTesting()
  }, 10000) // 10秒のタイムアウト

  test('WebAssemblyモジュールが正常に読み込まれる', () => {
    expect(wasm).toBeTruthy()
    expect(typeof wasm.calculate_sha1_hash).toBe('function')
  })

  test('基本的なSHA-1ハッシュ計算が正常に動作する', () => {
    const message = new Uint32Array(16)
    const result = wasm.calculate_sha1_hash(message)
    console.log('🔍 calculate_sha1_hash result:', result, 'type:', typeof result, 'isArray:', Array.isArray(result))
    expect(result).toBeDefined()
    expect(result.length).toBe(6)
  })

  test('必要な関数が全て存在する', () => {
    const requiredFunctions = [
      'swap_bytes_32_wasm',
      'swap_bytes_16_wasm', 
      'calculate_sha1_hash',
      'calculate_sha1_batch'
    ]
    
    for (const funcName of requiredFunctions) {
      expect(typeof (wasm as any)[funcName]).toBe('function')
    }
  })

  test('バイトスワップが動作する', () => {
    const testValue32 = 0x12345678
    const result32 = wasm.swap_bytes_32_wasm(testValue32)
    expect(typeof result32).toBe('number')
    expect(result32).not.toBe(0)
    
    const testValue16 = 0x1234
    const result16 = wasm.swap_bytes_16_wasm(testValue16)
    expect(typeof result16).toBe('number')
    expect(result16).not.toBe(0)
  })

  test('SHA-1ハッシュ計算が動作する', () => {
    // オール0のメッセージでテスト
    const message = new Uint32Array(16)
    const result = wasm.calculate_sha1_hash(message)
    
    expect(result instanceof Uint32Array).toBe(true)
    expect(result.length).toBe(6)
    expect(result[0] !== 0 || result[1] !== 0).toBe(true) // 少なくとも一つは非ゼロ
  })

  test('SHA-1バッチ計算が動作する', () => {
    const batchSize = 3
    const messages = new Uint32Array(16 * batchSize)
    // 各メッセージに異なる値を設定
    for (let i = 0; i < batchSize; i++) {
      messages[i * 16] = i + 1
    }
    
    const result = wasm.calculate_sha1_batch(messages, batchSize)
    
    expect(result instanceof Uint32Array).toBe(true)
    expect(result.length).toBe(batchSize * 6)
    expect(result.some(x => x !== 0)).toBe(true) // 少なくとも一つは非ゼロ
  })

  test('同じ入力で一貫した結果が得られる', () => {
    const message = new Uint32Array([
      0x12345678, 0x9ABCDEF0, 0x11111111, 0x22222222,
      0x33333333, 0x44444444, 0x55555555, 0x66666666,
      0x77777777, 0x88888888, 0x99999999, 0xAAAAAAAA,
      0xBBBBBBBB, 0xCCCCCCCC, 0xDDDDDDDD, 0xEEEEEEEE
    ])
    
    const result1 = wasm.calculate_sha1_hash(message)
    const result2 = wasm.calculate_sha1_hash(message)
    
    expect(result1[0]).toBe(result2[0])
    expect(result1[1]).toBe(result2[1])
  })

  test('異なる入力で異なる結果が得られる', () => {
    const message1 = new Uint32Array(16) // オール0
    const message2 = new Uint32Array(16)
    message2[0] = 1 // 最初の要素だけ変更
    
    const result1 = wasm.calculate_sha1_hash(message1)
    const result2 = wasm.calculate_sha1_hash(message2)
    
    expect(result1[0] !== result2[0] || result1[1] !== result2[1]).toBe(true)
  })

  test('バッチ処理と個別処理で同じ結果が得られる', () => {
    const message1 = new Uint32Array(16)
    for (let i = 0; i < 16; i++) message1[i] = 0x12345678
    
    const message2 = new Uint32Array(16)
    for (let i = 0; i < 16; i++) message2[i] = 0xABCDEF00
    
    // 個別処理
    const individual1 = wasm.calculate_sha1_hash(message1)
    const individual2 = wasm.calculate_sha1_hash(message2)
    
    // バッチ処理
    const batchMessages = new Uint32Array(32)
    batchMessages.set(message1, 0)
    batchMessages.set(message2, 16)
    const batchResults = wasm.calculate_sha1_batch(batchMessages, 2)
    
    // 結果の比較 (seed, h0, h1, h2, h3, h4)
    expect(individual1[0]).toBe(batchResults[0])  // seed1
    expect(individual1[1]).toBe(batchResults[1])  // h0_1
    expect(individual1[2]).toBe(batchResults[2])  // h1_1
    expect(individual1[3]).toBe(batchResults[3])  // h2_1
    expect(individual1[4]).toBe(batchResults[4])  // h3_1
    expect(individual1[5]).toBe(batchResults[5])  // h4_1
    expect(individual2[0]).toBe(batchResults[6])  // seed2
    expect(individual2[1]).toBe(batchResults[7])  // h0_2
    expect(individual2[2]).toBe(batchResults[8])  // h1_2
    expect(individual2[3]).toBe(batchResults[9])  // h2_2
    expect(individual2[4]).toBe(batchResults[10]) // h3_2
    expect(individual2[5]).toBe(batchResults[11]) // h4_2
  })
})

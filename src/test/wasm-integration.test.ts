/**
 * WebAssembly実装の統合テスト（Node.js環境対応版）
 * Node.js環境でのWASM読み込みとTypeScriptフォールバックをテスト
 */

import { describe, test, expect, beforeAll } from 'vitest'
import { SeedCalculator } from '../lib/core/seed-calculator'
import { initWasmForTesting, isWasmAvailableForTesting, getWasmForTesting } from './wasm-loader'

describe('WebAssembly統合テスト', () => {
  let calculator: SeedCalculator
  let wasmInitialized: boolean = false

  beforeAll(async () => {
    try {
      // Node.js環境でのWebAssembly初期化を試行
      await initWasmForTesting()
      console.log('🦀 WebAssembly module loaded for testing')
      
      calculator = new SeedCalculator()
      // WebAssemblyの初期化を試行
      wasmInitialized = await calculator.initializeWasm()
      console.log(`🔧 SeedCalculator WebAssembly初期化: ${wasmInitialized ? '成功' : '失敗'}`)
    } catch (error) {
      console.warn('WebAssembly初期化エラー:', error)
      calculator = new SeedCalculator()
      wasmInitialized = false
    }
  }, 15000) // 15秒のタイムアウト

  test('WebAssembly直接アクセステスト', () => {
    if (isWasmAvailableForTesting()) {
      const wasm = getWasmForTesting()
      expect(wasm).toBeDefined()
      expect(typeof wasm.calculate_sha1_hash).toBe('function')
      
      // 基本的なSHA-1計算テスト
      const message = new Uint32Array(16)
      const result = wasm.calculate_sha1_hash(message)
      expect(result instanceof Uint32Array).toBe(true)
      expect(result.length).toBe(6)
      console.log(`🦀 直接アクセス結果: SHA-1計算成功 [${result[0]}, ${result[1]}, ${result[2]}, ${result[3]}, ${result[4]}, ${result[5]}]`)
    } else {
      console.log('⏭️ WebAssemblyが利用できないため直接アクセステストをスキップ')
    }
  })

  test('WebAssemblyの初期化状態を確認', () => {
    expect(typeof wasmInitialized).toBe('boolean')
    expect(calculator.isUsingWasm()).toBe(wasmInitialized)
    
    if (wasmInitialized) {
      console.log('✅ WebAssembly が正常に初期化されました')
    } else {
      console.log('⚠️ WebAssembly の初期化に失敗しました（TypeScript実装を使用）')
    }
  })

  test('WebAssembly個別関数の動作確認', () => {
    if (isWasmAvailableForTesting()) {
      const wasm = getWasmForTesting()
      
      // バイトスワップテスト
      const endian32 = wasm.swap_bytes_32_wasm(0x12345678)
      const endian16 = wasm.swap_bytes_16_wasm(0x1234)
      expect(typeof endian32).toBe('number')
      expect(typeof endian16).toBe('number')
      console.log(`🔄 バイトスワップ: 32bit=0x${endian32.toString(16)}, 16bit=0x${endian16.toString(16)}`)

      // SHA-1ハッシュテスト
      const testMessage = new Uint32Array([0x12345678, 0x9ABCDEF0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
      const hashResult = wasm.calculate_sha1_hash(testMessage)
      expect(hashResult.length).toBe(6)
      console.log(`🔐 SHA-1ハッシュ: [0x${hashResult[0].toString(16)}, 0x${hashResult[1].toString(16)}, 0x${hashResult[2].toString(16)}, 0x${hashResult[3].toString(16)}, 0x${hashResult[4].toString(16)}, 0x${hashResult[5].toString(16)}]`)

      // バッチ計算テスト
      const batchMessages = new Uint32Array(32) // 2メッセージ
      batchMessages.set([0x11111111, 0x22222222, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 0)
      batchMessages.set([0x33333333, 0x44444444, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 16)
      const batchResult = wasm.calculate_sha1_batch(batchMessages, 2)
      expect(batchResult.length).toBe(12)
      console.log(`📦 バッチ計算: [${Array.from(batchResult as Uint32Array).map(x => '0x' + x.toString(16)).join(', ')}]`)
    } else {
      console.log('⏭️ WebAssemblyが利用できないため個別関数テストをスキップ')
    }
  })

  test('SeedCalculatorとWebAssemblyの統合確認', () => {
    if (!wasmInitialized) {
      console.log('⏭️ WebAssemblyが利用できないため統合テストをスキップ')
      return
    }

    const testMessage = [
      0x12345678, 0x9ABCDEF0, 0x11111111, 0x22222222,
      0x33333333, 0x44444444, 0x55555555, 0x66666666,
      0x77777777, 0x88888888, 0x99999999, 0xAAAAAAAA,
      0xBBBBBBBB, 0xCCCCCCCC, 0xDDDDDDDD, 0xEEEEEEEE
    ]

    // SeedCalculator経由での計算
    const calculatorResult = calculator.calculateSeed(testMessage)
    expect(calculatorResult).toBeDefined()
    expect(typeof calculatorResult.seed).toBe('number')
    expect(typeof calculatorResult.hash).toBe('string')

    // WebAssembly直接計算（利用可能な場合）
    if (isWasmAvailableForTesting()) {
      const wasmModule = getWasmForTesting()
      const wasmMessage = new Uint32Array(testMessage)
      const wasmResult = wasmModule.calculate_sha1_hash(wasmMessage)
      
      // 結果の比較（SeedCalculatorはh0をseedとして返す）
      expect(calculatorResult.seed).toBe(wasmResult[0])
      
      console.log(`🔗 統合確認: SeedCalculator.seed=${calculatorResult.seed.toString(16)}, WASM.h0=${wasmResult[0].toString(16)}`)
      console.log(`🔗 統合確認: 一致=${calculatorResult.seed === wasmResult[0] ? '✅' : '❌'}`)
    } else {
      console.log('⏭️ WebAssemblyが利用できないため直接比較はスキップ')
    }
  })

  test('WebAssemblyでのパフォーマンステスト', () => {
    if (!wasmInitialized) {
      console.log('⏭️ WebAssemblyが利用できないためパフォーマンステストをスキップ')
      return
    }

    const testMessage = [0x12345678, 0x9ABCDEF0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    
    const startTime = Date.now()
    
    // 5000回計算（WebAssemblyの性能をテスト）
    for (let i = 0; i < 5000; i++) {
      calculator.calculateSeed(testMessage)
    }
    
    const elapsedTime = Date.now() - startTime
    const calcPerSec = Math.round(5000 / elapsedTime * 1000)
    
    console.log(`🚀 WebAssembly 5000回計算: ${elapsedTime}ms (${calcPerSec} calc/sec)`)
    
    // パフォーマンス要件: 5000回の計算が10秒以内
    expect(elapsedTime).toBeLessThan(10000)
    
    // 最低限のパフォーマンス要件: 1000 calc/sec以上
    expect(calcPerSec).toBeGreaterThan(1000)
  })

  test('複数回実行での一貫性テスト', () => {
    const testMessage = [0xDEADBEEF, 0xCAFEBABE, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    
    const results: string[] = []
    
    // 同じメッセージで10回計算
    for (let i = 0; i < 10; i++) {
      const result = calculator.calculateSeed(testMessage)
      results.push(`${result.seed}-${result.hash}`)
    }
    
    // 全ての結果が同じであることを確認
    const uniqueResults = new Set(results)
    expect(uniqueResults.size).toBe(1)
    
    console.log(`🔄 一貫性テスト: ${results[0]} (${wasmInitialized ? 'WebAssembly' : 'TypeScript'})`)
  })

  test('実際のポケモンBW/BW2シナリオでのテスト', () => {
    const conditions = {
      romVersion: 'B' as const,
      romRegion: 'JPN' as const,
      hardware: 'DS' as const,
      timer0Range: { min: 1000, max: 1000, useAutoRange: false },
      vcountRange: { min: 95, max: 95, useAutoRange: false },
      dateRange: {
        startYear: 2011,
        startMonth: 3,
        startDay: 6,
        startHour: 12,
        startMinute: 0,
        startSecond: 0,
        endYear: 2011,
        endMonth: 3,
        endDay: 6,
        endHour: 12,
        endMinute: 0,
        endSecond: 0
      },
      keyInput: 0,
      macAddress: [0x00, 0x09, 0xBF, 0x12, 0x34, 0x56]
    }

    const datetime = new Date(2011, 2, 6, 12, 0, 0)
    
    // メッセージ生成
    const message = calculator.generateMessage(conditions, 1000, 95, datetime)
    expect(message.length).toBe(16)
    
    // シード計算
    const result = calculator.calculateSeed(message)
    expect(result.seed).toBeGreaterThan(0)
    expect(result.hash.length).toBeGreaterThan(0)
    
    console.log(`🎮 ポケモンシナリオ: seed=0x${result.seed.toString(16)}, hash=${result.hash}`)
    console.log(`🔧 実装: ${wasmInitialized ? 'WebAssembly' : 'TypeScript'}`)
  })
})

/**
 * WebAssembly実装の論理テスト
 * 実際のWASMファイル読み込みをせずに、計算ロジックをテスト
 */

import { describe, test, expect, beforeEach } from 'vitest'
import { SeedCalculator } from '../lib/core/seed-calculator'
import romParameters from '../data/rom-parameters'

describe('WebAssembly計算ロジックテスト', () => {
  let calculator: SeedCalculator

  beforeEach(() => {
    calculator = new SeedCalculator()
  })

  test('SeedCalculatorが初期化される', () => {
    expect(calculator).toBeDefined()
    expect(typeof calculator.calculateSeed).toBe('function')
    expect(typeof calculator.generateMessage).toBe('function')
  })

  test('TypeScript実装とWebAssembly実装の切り替え', () => {
    // 初期状態ではTypeScript実装を使用
    expect(calculator.isUsingWasm()).toBe(false)
    
    // WebAssemblyが利用可能でない場合の処理
    const hasWasm = calculator.isUsingWasm()
    expect(typeof hasWasm).toBe('boolean')
  })

  test('基本的なシード計算が動作する', () => {
    // テスト用のメッセージ
    const testMessage = [
      0x12345678, 0x9ABCDEF0, 0x11111111, 0x22222222,
      0x33333333, 0x44444444, 0x55555555, 0x66666666,
      0x77777777, 0x88888888, 0x99999999, 0xAAAAAAAA,
      0xBBBBBBBB, 0xCCCCCCCC, 0xDDDDDDDD, 0xEEEEEEEE
    ]

    const result = calculator.calculateSeed(testMessage)
    
    expect(result).toBeDefined()
    expect(typeof result.seed).toBe('number')
    expect(typeof result.hash).toBe('string')
    expect(result.hash.length).toBeGreaterThan(0)
  })

  test('同じメッセージで一貫した結果が得られる', () => {
    const testMessage = [0x12345678, 0x9ABCDEF0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]

    const result1 = calculator.calculateSeed(testMessage)
    const result2 = calculator.calculateSeed(testMessage)

    expect(result1.seed).toBe(result2.seed)
    expect(result1.hash).toBe(result2.hash)
  })

  test('異なるメッセージで異なる結果が得られる', () => {
    const message1 = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    const message2 = [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]

    const result1 = calculator.calculateSeed(message1)
    const result2 = calculator.calculateSeed(message2)

    expect(result1.seed).not.toBe(result2.seed)
    expect(result1.hash).not.toBe(result2.hash)
  })

  test('メッセージ生成が正常に動作する', () => {
    // デバッグ用: romParameters の中身を確認
    console.log('romParameters:', Object.keys(romParameters))
    console.log('romParameters.B:', romParameters.B)
    
    const conditions = {
      romVersion: 'B' as const,
      romRegion: 'JPN' as const,
      hardware: 'DS' as const,
      timer0VCountConfig: {
    useAutoConfiguration: false,
    timer0Range: { min: 1000, max: 1100 },
    vcountRange: { min: 90, max: 100 }
  },
      dateRange: {
        startYear: 2011,
        startMonth: 3,
        startDay: 6,
        startHour: 0,
        startMinute: 0,
        startSecond: 0,
        endYear: 2011,
        endMonth: 3,
        endDay: 6,
        endHour: 0,
        endMinute: 0,
        endSecond: 0
      },
      keyInput: 0,
      macAddress: [0x01, 0x23, 0x45, 0x67, 0x89, 0xAB]
    }

    const datetime = new Date(2011, 2, 6, 0, 0, 0) // 2011/03/06 00:00:00
    
    const message = calculator.generateMessage(conditions, 1000, 95, datetime)
    
    expect(Array.isArray(message)).toBe(true)
    expect(message.length).toBe(16)
    expect(message.every(x => typeof x === 'number')).toBe(true)
  })

  test('エラーハンドリングが正常に動作する', () => {
    // 不正な長さのメッセージでエラーが発生することを確認
    expect(() => {
      calculator.calculateSeed([1, 2, 3]) // 16要素未満
    }).toThrow()

    expect(() => {
      calculator.calculateSeed(new Array(20).fill(0)) // 16要素を超過
    }).toThrow()
  })

  test('パフォーマンスの基本チェック', () => {
    const testMessage = [0x12345678, 0x9ABCDEF0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    
    const startTime = Date.now()
    
    // 1000回計算
    for (let i = 0; i < 1000; i++) {
      calculator.calculateSeed(testMessage)
    }
    
    const elapsedTime = Date.now() - startTime
    
    // 1000回の計算が5秒以内に完了することを確認
    expect(elapsedTime).toBeLessThan(5000)
    
    console.log(`📊 1000回計算: ${elapsedTime}ms (${(1000 / elapsedTime * 1000).toFixed(0)} calc/sec)`)
  })
})

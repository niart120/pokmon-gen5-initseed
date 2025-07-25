/**
 * WebAssembly Implementation Unit Tests
 * 段階的にWebAssembly実装の動作を検証
 */

import { initWasm, getWasm, isWasmReady, WasmSeedCalculator } from '../lib/core/wasm-interface';

/**
 * Level 1: WebAssembly基本読み込みテスト
 */
export async function testLevel1_WasmLoading(): Promise<boolean> {
  console.log('=== Level 1: WebAssembly基本読み込みテスト ===');
  
  try {
    // WebAssemblyモジュールの読み込み
    console.log('📦 WebAssemblyモジュールを読み込み中...');
    const wasm = await initWasm();
    
    if (!wasm) {
      console.error('❌ WebAssemblyモジュールの読み込みに失敗');
      return false;
    }
    
    // 基本的な関数が存在するかチェック
    const requiredFunctions = [
      'test_wasm',
      'to_little_endian_32',
      'to_little_endian_16', 
      'calculate_sha1_hash',
      'calculate_sha1_batch'
    ];
    
    console.log('🔍 必要な関数の存在確認...');
    for (const funcName of requiredFunctions) {
      if (typeof (wasm as any)[funcName] !== 'function') {
        console.error(`❌ 関数が見つかりません: ${funcName}`);
        return false;
      }
      console.log(`✅ 関数確認: ${funcName}`);
    }
    
    // test_wasm関数の動作確認
    console.log('🧪 test_wasm関数の動作確認...');
    const testResult = wasm.test_wasm();
    console.log(`📝 test_wasm結果: "${testResult}"`);
    
    if (!testResult || !testResult.includes('successfully')) {
      console.error('❌ test_wasm関数が期待される結果を返しませんでした');
      return false;
    }
    
    // isWasmReady関数の確認
    if (!isWasmReady()) {
      console.error('❌ isWasmReady()がfalseを返しました');
      return false;
    }
    
    console.log('✅ Level 1: WebAssembly基本読み込みテスト - 合格');
    return true;
    
  } catch (error) {
    console.error('❌ Level 1テスト中にエラーが発生:', error);
    return false;
  }
}

/**
 * Level 2: エンディアン変換テスト
 */
export async function testLevel2_EndianConversion(): Promise<boolean> {
  console.log('\n=== Level 2: エンディアン変換テスト ===');
  
  try {
    const wasm = getWasm();
    
    // 32ビットエンディアン変換テスト
    console.log('🔄 32ビットエンディアン変換テスト...');
    const test32Values = [
      0x12345678,
      0x00000001,
      0xFFFFFFFF,
      0x80000000,
      0x7FFFFFFF
    ];
    
    for (const value of test32Values) {
      const result = wasm.to_little_endian_32(value);
      console.log(`  入力: 0x${value.toString(16).padStart(8, '0')} → 出力: 0x${result.toString(16).padStart(8, '0')}`);
      
      // 結果が数値であることを確認
      if (typeof result !== 'number' || result < 0 || result > 0xFFFFFFFF) {
        console.error(`❌ 無効な32ビット変換結果: ${result}`);
        return false;
      }
    }
    
    // 16ビットエンディアン変換テスト
    console.log('🔄 16ビットエンディアン変換テスト...');
    const test16Values = [
      0x1234,
      0x0001,
      0xFFFF,
      0x8000,
      0x7FFF
    ];
    
    for (const value of test16Values) {
      const result = wasm.to_little_endian_16(value);
      console.log(`  入力: 0x${value.toString(16).padStart(4, '0')} → 出力: 0x${result.toString(16).padStart(4, '0')}`);
      
      // 結果が数値であることを確認
      if (typeof result !== 'number' || result < 0 || result > 0xFFFF) {
        console.error(`❌ 無効な16ビット変換結果: ${result}`);
        return false;
      }
    }
    
    console.log('✅ Level 2: エンディアン変換テスト - 合格');
    return true;
    
  } catch (error) {
    console.error('❌ Level 2テスト中にエラーが発生:', error);
    return false;
  }
}

/**
 * Level 3: SHA-1単一計算テスト
 */
export async function testLevel3_SHA1Single(): Promise<boolean> {
  console.log('\n=== Level 3: SHA-1単一計算テスト ===');
  
  try {
    const wasm = getWasm();
    const calculator = new WasmSeedCalculator(wasm);
    
    // 基本的なテストケース
    console.log('🔐 SHA-1単一計算テスト...');
    
    const testCases = [
      {
        name: 'すべて0のメッセージ',
        message: new Array(16).fill(0)
      },
      {
        name: 'すべて1のメッセージ',
        message: new Array(16).fill(1)
      },
      {
        name: '連続する数値のメッセージ',
        message: Array.from({length: 16}, (_, i) => i)
      },
      {
        name: 'ランダムなメッセージ',
        message: [
          0x12345678, 0x9ABCDEF0, 0x11111111, 0x22222222,
          0x33333333, 0x44444444, 0x55555555, 0x66666666,
          0x77777777, 0x88888888, 0x99999999, 0xAAAAAAAA,
          0xBBBBBBBB, 0xCCCCCCCC, 0xDDDDDDDD, 0xEEEEEEEE
        ]
      }
    ];
    
    for (const testCase of testCases) {
      console.log(`  テストケース: ${testCase.name}`);
      
      try {
        const result = calculator.calculateSeed(testCase.message);
        
        // 結果の検証
        if (typeof result.seed !== 'number') {
          console.error(`❌ seedが数値ではありません: ${typeof result.seed}`);
          return false;
        }
        
        if (typeof result.hash !== 'string') {
          console.error(`❌ hashが文字列ではありません: ${typeof result.hash}`);
          return false;
        }
        
        if (result.hash.length !== 16) {
          console.error(`❌ hashの長さが正しくありません: ${result.hash.length} (期待値: 16)`);
          return false;
        }
        
        // hexadecimalかチェック
        if (!/^[0-9a-f]+$/i.test(result.hash)) {
          console.error(`❌ hashが16進数文字列ではありません: ${result.hash}`);
          return false;
        }
        
        console.log(`    seed: 0x${result.seed.toString(16).padStart(8, '0')}`);
        console.log(`    hash: ${result.hash}`);
        console.log(`    ✅ 合格`);
        
      } catch (error) {
        console.error(`❌ テストケース "${testCase.name}" でエラー:`, error);
        return false;
      }
    }
    
    // 不正な入力のテスト
    console.log('🚫 不正な入力のテスト...');
    
    const invalidInputs = [
      { name: '空の配列', message: [] },
      { name: '短すぎる配列', message: [1, 2, 3] },
      { name: '長すぎる配列', message: new Array(20).fill(0) }
    ];
    
    for (const invalid of invalidInputs) {
      try {
        calculator.calculateSeed(invalid.message);
        console.error(`❌ 不正な入力 "${invalid.name}" でエラーが発生しませんでした`);
        return false;
      } catch (error) {
        console.log(`  ✅ 不正な入力 "${invalid.name}" で期待通りエラーが発生`);
      }
    }
    
    console.log('✅ Level 3: SHA-1単一計算テスト - 合格');
    return true;
    
  } catch (error) {
    console.error('❌ Level 3テスト中にエラーが発生:', error);
    return false;
  }
}

/**
 * Level 4: SHA-1バッチ計算テスト
 */
export async function testLevel4_SHA1Batch(): Promise<boolean> {
  console.log('\n=== Level 4: SHA-1バッチ計算テスト ===');
  
  try {
    const wasm = getWasm();
    const calculator = new WasmSeedCalculator(wasm);
    
    // バッチサイズのテスト
    console.log('📦 バッチ計算テスト...');
    
    const batchSizes = [1, 3, 10, 100];
    
    for (const batchSize of batchSizes) {
      console.log(`  バッチサイズ: ${batchSize}`);
      
      // テストメッセージの生成
      const messages: number[][] = [];
      for (let i = 0; i < batchSize; i++) {
        messages.push(Array.from({length: 16}, (_, j) => i * 16 + j));
      }
      
      try {
        const results = calculator.calculateSeedBatch(messages);
        
        // 結果数の確認
        if (results.length !== batchSize) {
          console.error(`❌ 結果数が正しくありません: ${results.length} (期待値: ${batchSize})`);
          return false;
        }
        
        // 各結果の検証
        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          
          if (typeof result.seed !== 'number') {
            console.error(`❌ 結果[${i}]のseedが数値ではありません`);
            return false;
          }
          
          if (typeof result.hash !== 'string' || result.hash.length !== 16) {
            console.error(`❌ 結果[${i}]のhashが正しくありません`);
            return false;
          }
          
          if (!/^[0-9a-f]+$/i.test(result.hash)) {
            console.error(`❌ 結果[${i}]のhashが16進数文字列ではありません`);
            return false;
          }
        }
        
        console.log(`    ✅ バッチサイズ ${batchSize} - 合格`);
        
        // 単一計算との比較テスト (最初の3つまで)
        const compareCount = Math.min(batchSize, 3);
        for (let i = 0; i < compareCount; i++) {
          const singleResult = calculator.calculateSeed(messages[i]);
          const batchResult = results[i];
          
          if (singleResult.seed !== batchResult.seed || singleResult.hash !== batchResult.hash) {
            console.error(`❌ 単一計算とバッチ計算の結果が一致しません (インデックス: ${i})`);
            console.error(`  単一: seed=0x${singleResult.seed.toString(16)}, hash=${singleResult.hash}`);
            console.error(`  バッチ: seed=0x${batchResult.seed.toString(16)}, hash=${batchResult.hash}`);
            return false;
          }
        }
        
      } catch (error) {
        console.error(`❌ バッチサイズ ${batchSize} でエラー:`, error);
        return false;
      }
    }
    
    console.log('✅ Level 4: SHA-1バッチ計算テスト - 合格');
    return true;
    
  } catch (error) {
    console.error('❌ Level 4テスト中にエラーが発生:', error);
    return false;
  }
}

/**
 * Level 5: 統合テスト（SeedCalculatorとの連携）
 */
export async function testLevel5_Integration(): Promise<boolean> {
  console.log('\n=== Level 5: 統合テスト（SeedCalculatorとの連携） ===');
  
  try {
    // SeedCalculatorを使用したテスト
    const { SeedCalculator } = await import('../lib/core/seed-calculator');
    const calculator = new SeedCalculator();
    
    // WebAssembly初期化
    console.log('🔄 SeedCalculatorでWebAssembly初期化...');
    const initResult = await calculator.initializeWasm();
    
    if (!initResult) {
      console.error('❌ SeedCalculator経由でのWebAssembly初期化に失敗');
      return false;
    }
    
    if (!calculator.isUsingWasm()) {
      console.error('❌ SeedCalculatorがWebAssemblyを使用していません');
      return false;
    }
    
    console.log('✅ SeedCalculator経由でWebAssembly初期化成功');
    
    // 実際のポケモンの計算パラメータでテスト
    console.log('🎮 実際のポケモン計算パラメータでテスト...');
    
    const testConditions = {
      romVersion: 'B' as const,
      romRegion: 'JPN' as const,
      hardware: 'DS' as const,
      macAddress: [0x00, 0x16, 0x56, 0xAE, 0xBB, 0xCC],
      keyInput: 0x02000000,
      timer0Range: { min: 1000, max: 1000, useAutoRange: false },
      vcountRange: { min: 100, max: 100, useAutoRange: false },
      dateRange: {
        startYear: 2023, startMonth: 12, startDay: 31,
        startHour: 23, startMinute: 59, startSecond: 59,
        endYear: 2023, endMonth: 12, endDay: 31,
        endHour: 23, endMinute: 59, endSecond: 59
      }
    };
    
    const timer0 = 1000;
    const vcount = 100;
    const datetime = new Date(2023, 11, 31, 23, 59, 59);
    
    try {
      // メッセージ生成テスト
      const message = calculator.generateMessage(testConditions, timer0, vcount, datetime);
      console.log(`  生成されたメッセージ長: ${message.length}`);
      
      if (message.length !== 16) {
        console.error(`❌ メッセージの長さが正しくありません: ${message.length}`);
        return false;
      }
      
      // 計算テスト
      const result = calculator.calculateSeed(message);
      console.log(`  計算結果: seed=0x${result.seed.toString(16)}, hash=${result.hash}`);
      
      if (typeof result.seed !== 'number' || typeof result.hash !== 'string') {
        console.error('❌ 計算結果の型が正しくありません');
        return false;
      }
      
      console.log('✅ 実際のポケモン計算パラメータでのテスト - 合格');
      
    } catch (error) {
      console.error('❌ 実際のポケモン計算でエラー:', error);
      return false;
    }
    
    console.log('✅ Level 5: 統合テスト - 合格');
    return true;
    
  } catch (error) {
    console.error('❌ Level 5テスト中にエラーが発生:', error);
    return false;
  }
}

/**
 * 全レベルのテストを実行
 */
export async function runAllUnitTests(): Promise<boolean> {
  console.log('🧪 WebAssembly実装 - 段階的テスト開始');
  console.log('='.repeat(50));
  
  const tests = [
    { name: 'Level 1: WebAssembly基本読み込み', test: testLevel1_WasmLoading },
    { name: 'Level 2: エンディアン変換', test: testLevel2_EndianConversion },
    { name: 'Level 3: SHA-1単一計算', test: testLevel3_SHA1Single },
    { name: 'Level 4: SHA-1バッチ計算', test: testLevel4_SHA1Batch },
    { name: 'Level 5: 統合テスト', test: testLevel5_Integration }
  ];
  
  let allPassed = true;
  
  for (const { name, test } of tests) {
    const startTime = Date.now();
    const passed = await test();
    const duration = Date.now() - startTime;
    
    if (passed) {
      console.log(`\n🟢 ${name} - 合格 (${duration}ms)`);
    } else {
      console.log(`\n🔴 ${name} - 失敗 (${duration}ms)`);
      allPassed = false;
      break; // 失敗したら後続テストは実行しない
    }
  }
  
  console.log('\n' + '='.repeat(50));
  if (allPassed) {
    console.log('🎉 全てのテストが合格しました！WebAssembly実装は正常に動作しています。');
  } else {
    console.log('💥 テストに失敗しました。WebAssembly実装に問題があります。');
  }
  
  return allPassed;
}

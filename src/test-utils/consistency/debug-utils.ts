/**
 * 整合性確認テスト用デバッグユーティリティ
 * 実際の計算結果を確認して期待値との差異を分析
 */

import { SeedCalculator } from '../../lib/core/seed-calculator';
import { 
  CONSISTENCY_TEST_CONDITIONS, 
  UNIT_TEST_CASES,
  parseExpectedDateTime,
  formatDateTime 
} from '../consistency';
import type { SearchConditions } from '../../types/pokemon';

export async function debugConsistencyTest() {
  console.log('=== 整合性確認テスト デバッグ ===\n');

  const calculator = new SeedCalculator();
  
  // WebAssembly初期化を試行
  try {
    await calculator.initializeWasm();
    console.log('✅ WebAssembly initialized');
  } catch (error) {
    console.warn('⚠️ WebAssembly not available, using TypeScript fallback');
  }

  console.log(`🔧 Implementation: ${calculator.isUsingWasm() ? 'WebAssembly' : 'TypeScript'}\n`);

  // 1つのテストケースで詳細確認
  const testCase = UNIT_TEST_CASES[0]; // Seed 0x14B11BA6
  const expectedDate = parseExpectedDateTime(testCase.expectedDatetime);
  
  console.log(`📍 Target: Seed 0x${testCase.seed.toString(16).toUpperCase()}`);
  console.log(`📅 Expected datetime: ${testCase.expectedDatetime}`);
  console.log(`⏰ Expected timer0: 0x${testCase.expectedTimer0.toString(16).toUpperCase()}`);
  console.log('');

  // 期待値の条件でメッセージ生成と計算
  const searchConditions: SearchConditions = {
    ...CONSISTENCY_TEST_CONDITIONS,
    dateRange: {
      startYear: expectedDate.getFullYear(),
      endYear: expectedDate.getFullYear(),
      startMonth: expectedDate.getMonth() + 1,
      endMonth: expectedDate.getMonth() + 1,
      startDay: expectedDate.getDate(),
      endDay: expectedDate.getDate(),
      startHour: expectedDate.getHours(),
      endHour: expectedDate.getHours(),
      startMinute: expectedDate.getMinutes(),
      endMinute: expectedDate.getMinutes(),
      startSecond: expectedDate.getSeconds(),
      endSecond: expectedDate.getSeconds()
    }
  };

  console.log('🔍 Testing exact expected conditions...');
  console.log(`Date: ${formatDateTime(expectedDate)}`);
  console.log(`Timer0: 0x${testCase.expectedTimer0.toString(16)} (${testCase.expectedTimer0})`);
  console.log(`VCount: 0x${CONSISTENCY_TEST_CONDITIONS.timer0VCountConfig.vcountRange.min.toString(16)} (${CONSISTENCY_TEST_CONDITIONS.timer0VCountConfig.vcountRange.min})`);
  console.log('');

  try {
    const message = calculator.generateMessage(
      searchConditions, 
      testCase.expectedTimer0, 
      CONSISTENCY_TEST_CONDITIONS.timer0VCountConfig.vcountRange.min, 
      expectedDate
    );
    
    console.log('📨 Generated message:');
    message.forEach((word, i) => {
      console.log(`  data[${i.toString().padStart(2, ' ')}]: 0x${word.toString(16).padStart(8, '0')} (${word})`);
    });
    console.log('');

    const result = calculator.calculateSeed(message);
    console.log('🧮 Calculation result:');
    console.log(`  Seed: 0x${result.seed.toString(16).padStart(8, '0')} (${result.seed})`);
    console.log(`  Hash: ${result.hash}`);
    console.log('');

    if (result.seed === testCase.seed) {
      console.log('✅ PERFECT MATCH! Calculation is correct.');
    } else {
      console.log('❌ MISMATCH! Need to investigate the differences.');
      console.log(`Expected: 0x${testCase.seed.toString(16).padStart(8, '0')}`);
      console.log(`Actual:   0x${result.seed.toString(16).padStart(8, '0')}`);
      console.log(`Diff:     ${Math.abs(result.seed - testCase.seed)}`);
    }

  } catch (error) {
    console.error('❌ Calculation failed:', error);
  }

  console.log('\n=== Debug completed ===');
}

export async function debugSearchRangeSample() {
  console.log('\n=== 検索範囲サンプル確認 ===\n');

  const calculator = new SeedCalculator();
  
  try {
    await calculator.initializeWasm();
  } catch (error) {
    // Fallback to TypeScript
  }

  const testCase = UNIT_TEST_CASES[0];
  const expectedDate = parseExpectedDateTime(testCase.expectedDatetime);
  
  // 期待時刻の前後1分の範囲でサンプリング
  const startTime = new Date(expectedDate.getTime() - 60 * 1000); // -1分
  const endTime = new Date(expectedDate.getTime() + 60 * 1000);   // +1分

  console.log(`Sampling around expected time: ${formatDateTime(expectedDate)}`);
  console.log(`Range: ${formatDateTime(startTime)} - ${formatDateTime(endTime)}`);
  console.log('');

  const searchConditions: SearchConditions = {
    ...CONSISTENCY_TEST_CONDITIONS,
    dateRange: {
      startYear: 2066, endYear: 2066,
      startMonth: 6, endMonth: 6,
      startDay: 27, endDay: 27,
      startHour: 0, endHour: 23,
      startMinute: 0, endMinute: 59,
      startSecond: 0, endSecond: 59
    }
  };

  let sampleCount = 0;
  const maxSamples = 10;

  for (let timestamp = startTime.getTime(); timestamp <= endTime.getTime() && sampleCount < maxSamples; timestamp += 10000) { // 10秒間隔
    const currentDate = new Date(timestamp);
    
    for (let timer0 = CONSISTENCY_TEST_CONDITIONS.timer0VCountConfig.timer0Range.min; timer0 <= CONSISTENCY_TEST_CONDITIONS.timer0VCountConfig.timer0Range.max; timer0++) {
      try {
        const message = calculator.generateMessage(
          searchConditions, 
          timer0, 
          CONSISTENCY_TEST_CONDITIONS.timer0VCountConfig.vcountRange.min, 
          currentDate
        );
        
        const result = calculator.calculateSeed(message);
        
        console.log(`Sample ${sampleCount + 1}:`);
        console.log(`  Time: ${formatDateTime(currentDate)}`);
        console.log(`  Timer0: 0x${timer0.toString(16)} (${timer0})`);
        console.log(`  Seed: 0x${result.seed.toString(16).padStart(8, '0')}`);
        console.log(`  Target: 0x${testCase.seed.toString(16).padStart(8, '0')} ${result.seed === testCase.seed ? '✅ MATCH!' : ''}`);
        console.log('');
        
        sampleCount++;
        if (sampleCount >= maxSamples) break;
      } catch (error) {
        console.error('Sample calculation failed:', error);
      }
    }
  }

  console.log('=== Sampling completed ===');
}

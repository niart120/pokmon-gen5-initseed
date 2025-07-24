import { SeedCalculator } from './seed-calculator';
import type { ROMVersion, ROMRegion, Hardware } from '../types/pokemon';

// Minimal interface for testing
interface TestConditions {
  romVersion: ROMVersion;
  romRegion: ROMRegion;
  hardware: Hardware;
  macAddress: number[];
  keyInput: number;
}

/**
 * WebAssembly vs TypeScript comparison test
 * This function specifically tests whether WebAssembly and TypeScript implementations
 * produce identical results for the same inputs
 */
export async function verifyWebAssemblyImplementation(): Promise<boolean> {
  console.log('=== WebAssembly vs TypeScript Verification ===');
  
  const calculator = new SeedCalculator();
  let allTestsPassed = true;

  // Initialize WebAssembly
  console.log('\n1. Initializing WebAssembly...');
  const wasmResult = await calculator.initializeWasm();
  
  if (!wasmResult) {
    console.error('❌ WebAssembly initialization failed');
    return false;
  }
  
  console.log('✅ WebAssembly initialized successfully');
  console.log('Using WebAssembly:', calculator.isUsingWasm());

  // Test conditions for comprehensive comparison
  const testConditions: TestConditions = {
    romVersion: 'B',
    romRegion: 'JPN',
    hardware: 'DS',
    macAddress: [0x00, 0x16, 0x56, 0xAE, 0xBB, 0xCC],
    keyInput: 0x02000000
  };
  
  const testDates = [
    new Date(2023, 11, 31, 23, 59, 59), // Dec 31, 2023 23:59:59
    new Date(2023, 0, 1, 0, 0, 0),      // Jan 1, 2023 00:00:00
    new Date(2023, 5, 15, 12, 30, 45),  // Jun 15, 2023 12:30:45
  ];
  
  const testTimers = [4320, 5000, 6789];
  const testVCounts = [128, 156, 200];

  console.log('\n2. Comparing WebAssembly vs TypeScript results...');
  
  let testCaseCount = 0;
  let passedTests = 0;

  for (const date of testDates) {
    for (const timer0 of testTimers) {
      for (const vcount of testVCounts) {
        testCaseCount++;
        
        // Generate message manually for testing
        const params = calculator.getROMParameters(testConditions.romVersion, testConditions.romRegion);
        if (!params) continue;
        
        const message = calculator.generateMessage(testConditions as any, timer0, vcount, date);
        
        // Test with WebAssembly
        calculator.setUseWasm(true);
        const wasmResult = calculator.calculateSeed(message);
        
        // Test with TypeScript
        calculator.setUseWasm(false);
        const tsResult = calculator.calculateSeed(message);
        
        // Compare results
        const seedMatch = wasmResult.seed === tsResult.seed;
        const hashMatch = wasmResult.hash === tsResult.hash;
        
        if (seedMatch && hashMatch) {
          passedTests++;
          console.log(`✅ Test ${testCaseCount}: WASM=${wasmResult.hash.slice(0,8)} TS=${tsResult.hash.slice(0,8)} MATCH`);
        } else {
          allTestsPassed = false;
          console.error(`❌ Test ${testCaseCount}: MISMATCH`);
          console.error(`   WASM: seed=0x${wasmResult.seed.toString(16)}, hash=${wasmResult.hash}`);
          console.error(`   TS:   seed=0x${tsResult.seed.toString(16)}, hash=${tsResult.hash}`);
          console.error(`   Message: [${message.slice(0, 3).map(x => '0x' + x.toString(16)).join(', ')}, ...]`);
          console.error(`   Date: ${date.toISOString()}, Timer0: ${timer0}, VCount: ${vcount}`);
        }
      }
    }
  }

  // Re-enable WebAssembly for normal use
  calculator.setUseWasm(true);

  console.log(`\n3. Summary: ${passedTests}/${testCaseCount} tests passed`);
  
  if (allTestsPassed) {
    console.log('🎉 All WebAssembly vs TypeScript tests PASSED! Implementation is correct.');
  } else {
    console.error('💥 Some WebAssembly tests FAILED! Implementation needs debugging.');
  }

  return allTestsPassed;
}

/**
 * Performance comparison between WebAssembly and TypeScript
 */
export async function comparePerformance(): Promise<void> {
  console.log('\n=== Performance Comparison ===');
  
  const calculator = new SeedCalculator();
  await calculator.initializeWasm();
  
  const testConditions: TestConditions = {
    romVersion: 'B',
    romRegion: 'JPN',
    hardware: 'DS',
    macAddress: [0x00, 0x16, 0x56, 0xAE, 0xBB, 0xCC],
    keyInput: 0x02000000
  };
  
  const testDate = new Date(2023, 11, 31, 23, 59, 59);
  const iterations = 10000;

  console.log(`Running ${iterations} calculations each...`);

  // Generate test messages
  const messages: number[][] = [];
  for (let i = 0; i < iterations; i++) {
    const timer0 = 4320 + (i % 100);
    const vcount = 128 + (i % 50);
    messages.push(calculator.generateMessage(testConditions as any, timer0, vcount, testDate));
  }

  // Test TypeScript performance
  calculator.setUseWasm(false);
  const tsStart = performance.now();
  for (const message of messages) {
    calculator.calculateSeed(message);
  }
  const tsEnd = performance.now();
  const tsTime = tsEnd - tsStart;

  // Test WebAssembly performance
  calculator.setUseWasm(true);
  const wasmStart = performance.now();
  for (const message of messages) {
    calculator.calculateSeed(message);
  }
  const wasmEnd = performance.now();
  const wasmTime = wasmEnd - wasmStart;

  console.log(`TypeScript: ${tsTime.toFixed(2)}ms (${(iterations / tsTime * 1000).toFixed(0)} calc/sec)`);
  console.log(`WebAssembly: ${wasmTime.toFixed(2)}ms (${(iterations / wasmTime * 1000).toFixed(0)} calc/sec)`);
  console.log(`Speedup: ${(tsTime / wasmTime).toFixed(2)}x`);
}

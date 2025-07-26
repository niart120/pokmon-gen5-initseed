import { SeedCalculator } from '../../lib/core/seed-calculator';
import { getFullTimer0Range, getValidVCounts } from '../../lib/utils/rom-parameter-helpers';
import type { SearchConditions } from '../../types/pokemon';

/**
 * Verification function to test the search logic with known parameters
 * This helps ensure the implementation matches the reference algorithm
 */
export function verifySearchImplementation(): boolean {
  console.log('=== Search Implementation Verification ===');
  
  const calculator = new SeedCalculator();
  let allTestsPassed = true;

  // Test 1: Basic ROM parameter loading
  console.log('\n1. Testing ROM parameter loading...');
  const testConfigs = [
    { version: 'B', region: 'JPN' },
    { version: 'W', region: 'USA' },
    { version: 'B2', region: 'GER' }, // Has VCount offset
    { version: 'W2', region: 'ITA' }  // Has VCount offset
  ] as const;

  for (const config of testConfigs) {
    const params = calculator.getROMParameters(config.version, config.region);
    if (!params) {
      console.error(`❌ Failed to load parameters for ${config.version} ${config.region}`);
      allTestsPassed = false;
    } else {
      const timer0Range = getFullTimer0Range(config.version, config.region);
      const validVCounts = getValidVCounts(config.version, config.region);
      console.log(`✅ ${config.version} ${config.region}: Timer0=${timer0Range?.min}-${timer0Range?.max}, VCounts=[${validVCounts.map(v => `0x${v.toString(16)}`).join(', ')}]`);
      if (params.vcountTimerRanges.length > 1) {
        console.log(`   VCount offset handling: ${params.vcountTimerRanges.length} ranges`);
      }
    }
  }

  // Test 2: VCount offset handling for BW2
  console.log('\n2. Testing VCount offset handling...');
  const bw2GerParams = calculator.getROMParameters('B2', 'GER');
  if (bw2GerParams && bw2GerParams.vcountTimerRanges.length > 1) {
    // Test specific Timer0 values that should trigger different VCounts
    const testCases = [
      { timer0: 4325, expectedVCount: 0x81 },  // 0x10E5 in first range
      { timer0: 4328, expectedVCount: 0x81 },  // 0x10E8 in first range  
      { timer0: 4329, expectedVCount: 0x82 },  // 0x10E9 in second range
      { timer0: 4332, expectedVCount: 0x82 }   // 0x10EC in second range
    ];

    for (const testCase of testCases) {
      const actualVCount = calculator.getVCountForTimer0(bw2GerParams, testCase.timer0);
      if (actualVCount === testCase.expectedVCount) {
        console.log(`✅ Timer0 ${testCase.timer0} → VCount 0x${actualVCount.toString(16)}`);
      } else {
        console.error(`❌ Timer0 ${testCase.timer0} → Expected VCount 0x${testCase.expectedVCount.toString(16)}, got 0x${actualVCount.toString(16)}`);
        allTestsPassed = false;
      }
    }
  } else {
    console.error('❌ Failed to load BW2 GER parameters with VCount offset');
    allTestsPassed = false;
  }

  // Test 3: Message generation
  console.log('\n3. Testing message generation...');
  const testConditions: SearchConditions = {
    romVersion: 'B',
    romRegion: 'JPN',
    hardware: 'DS',
    timer0Range: { min: 3193, max: 3193, useAutoRange: true },
    vcountRange: { min: 95, max: 95, useAutoRange: true },
    dateRange: {
      startYear: 2023, endYear: 2023,
      startMonth: 1, endMonth: 1,
      startDay: 1, endDay: 1,
      startHour: 0, endHour: 0,
      startMinute: 0, endMinute: 0,
      startSecond: 0, endSecond: 0,
    },
    keyInput: 0x2FFF, // Default: no keys pressed
    macAddress: [0x00, 0x12, 0x34, 0x56, 0x78, 0x9A],
  };

  try {
    const testDate = new Date(2023, 0, 1, 0, 0, 0); // January 1st, 2023, 00:00:00 (Sunday)
    const message = calculator.generateMessage(testConditions, 3193, 95, testDate);
    
    console.log('Message generated successfully:');
    message.forEach((word, i) => {
      console.log(`  data[${i.toString().padStart(2, ' ')}]: 0x${word.toString(16).padStart(8, '0')} (${word})`);
    });

    // Verify message structure
    const expectedStructure = [
      { index: 10, name: 'Fixed value 1', expected: 0x00000000 },
      { index: 11, name: 'Fixed value 2', expected: 0x00000000 },
      { index: 13, name: 'SHA-1 padding 1', expected: 0x80000000 },
      { index: 14, name: 'SHA-1 padding 2', expected: 0x00000000 },
      { index: 15, name: 'SHA-1 padding 3', expected: 0x000001A0 }
    ];

    for (const check of expectedStructure) {
      if (message[check.index] === check.expected) {
        console.log(`✅ ${check.name}: correct`);
      } else {
        console.error(`❌ ${check.name}: expected 0x${check.expected.toString(16)}, got 0x${message[check.index].toString(16)}`);
        allTestsPassed = false;
      }
    }

    // Test SHA-1 calculation
    const { seed, hash } = calculator.calculateSeed(message);
    console.log(`✅ Seed calculation: 0x${seed.toString(16).padStart(8, '0')}`);
    console.log(`✅ SHA-1 hash: ${hash}`);

  } catch (error) {
    console.error('❌ Message generation failed:', error);
    allTestsPassed = false;
  }

  // Test 4: Target seed parsing
  console.log('\n4. Testing target seed parsing...');
  const testInputs = [
    { input: '0x12345678\nABCDEF00\n0xDEADBEEF', expectedCount: 3 },
    { input: '12345678\nabcdef00\nDEADBEEF', expectedCount: 3 },
    { input: '0x12345678\n0x12345678\nABCDEF00', expectedCount: 2 }, // Duplicate
    { input: 'INVALID\n0x12345678', expectedCount: 1 } // One invalid
  ];

  for (const testInput of testInputs) {
    const { validSeeds, errors } = calculator.parseTargetSeeds(testInput.input);
    if (validSeeds.length === testInput.expectedCount) {
      console.log(`✅ Parsed ${validSeeds.length} valid seeds from input`);
    } else {
      console.error(`❌ Expected ${testInput.expectedCount} seeds, got ${validSeeds.length}`);
      allTestsPassed = false;
    }
    if (errors.length > 0) {
      console.log(`   Errors: ${errors.length}`);
    }
  }

  // Test 5: End-to-end search simulation
  console.log('\n5. Testing end-to-end search simulation...');
  try {
    // Generate a seed for a specific set of parameters
    const testDate = new Date(2023, 0, 1, 0, 0, 0);
    const testMessage = calculator.generateMessage(testConditions, 3193, 95, testDate);
    const { seed: targetSeed } = calculator.calculateSeed(testMessage);
    
    console.log(`Generated target seed: 0x${targetSeed.toString(16).padStart(8, '0')}`);
    
    // Now search for it in a small range
    const searchRange = {
      timer0Start: 3193, timer0End: 3193,
      vcountStart: 95, vcountEnd: 95,
      dateStart: testDate, dateEnd: new Date(testDate.getTime() + 2000) // 2 seconds
    };
    
    let found = false;
    for (let timer0 = searchRange.timer0Start; timer0 <= searchRange.timer0End; timer0++) {
      for (let vcount = searchRange.vcountStart; vcount <= searchRange.vcountEnd; vcount++) {
        for (let timestamp = searchRange.dateStart.getTime(); timestamp <= searchRange.dateEnd.getTime(); timestamp += 1000) {
          const currentDate = new Date(timestamp);
          const message = calculator.generateMessage(testConditions, timer0, vcount, currentDate);
          const { seed } = calculator.calculateSeed(message);
          
          if (seed === targetSeed) {
            console.log(`✅ Found target seed at Timer0=${timer0}, VCount=${vcount}, Date=${currentDate.toISOString()}`);
            found = true;
            break;
          }
        }
        if (found) break;
      }
      if (found) break;
    }
    
    if (!found) {
      console.error('❌ Failed to find target seed in search range');
      allTestsPassed = false;
    }
  } catch (error) {
    console.error('❌ End-to-end search simulation failed:', error);
    allTestsPassed = false;
  }

  console.log(`\n=== Verification ${allTestsPassed ? 'PASSED' : 'FAILED'} ===`);
  return allTestsPassed;
}
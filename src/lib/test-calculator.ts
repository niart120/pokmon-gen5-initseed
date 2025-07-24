import { SeedCalculator } from '../lib/seed-calculator';
import type { SearchConditions } from '../types/pokemon';

// Test function to validate the seed calculator
export function testSeedCalculation() {
  const calculator = new SeedCalculator();
  
  // Test ROM parameters loading
  const params = calculator.getROMParameters('B', 'JPN');
  console.log('ROM Parameters for B JPN:', params);
  
  if (!params) {
    console.error('Failed to load ROM parameters');
    return false;
  }
  
  // Test seed parsing
  const testInput = '0x12345678\nABCDEF00\n0xDEADBEEF';
  const { validSeeds, errors } = calculator.parseTargetSeeds(testInput);
  console.log('Parsed seeds:', validSeeds.map(s => '0x' + s.toString(16).padStart(8, '0')));
  console.log('Parse errors:', errors);
  
  // Test seed calculation with sample conditions
  const testConditions: SearchConditions = {
    romVersion: 'B',
    romRegion: 'JPN',
    hardware: 'DS',
    timer0Range: { min: 3193, max: 3193, useAutoRange: true },
    vcountRange: { min: 95, max: 95, useAutoRange: true },
    dateRange: {
      startYear: 2023,
      endYear: 2023,
      startMonth: 1,
      endMonth: 1,
      startDay: 1,
      endDay: 1,
      startHour: 0,
      endHour: 0,
      startMinute: 0,
      endMinute: 0,
      startSecond: 0,
      endSecond: 0,
    },
    keyInput: 0x2FFF, // Default: no keys pressed
    macAddress: [0x00, 0x12, 0x34, 0x56, 0x78, 0x9A],
  };
  
  try {
    const testDate = new Date(2023, 0, 1, 0, 0, 0); // January 1st, 2023, 00:00:00
    console.log('Test date:', testDate.toISOString());
    
    const message = calculator.generateMessage(testConditions, 3193, 95, testDate);
    const result = calculator.calculateSeed(message);
    
    console.log('Test message (32-bit words):');
    message.forEach((word, i) => {
      console.log(`  data[${i}]: 0x${word.toString(16).padStart(8, '0')} (${word})`);
    });
    
    console.log('Test seed result:');
    console.log(`  Seed: 0x${result.seed.toString(16).padStart(8, '0')} (${result.seed})`);
    console.log(`  Hash: ${result.hash}`);
    
    // Test VCount offset handling for BW2
    const bw2Params = calculator.getROMParameters('B2', 'GER');
    if (bw2Params && bw2Params.vcountOffset) {
      console.log('Testing VCount offset for B2 GER:');
      for (let timer0 = 4325; timer0 <= 4332; timer0++) {
        const vcount = calculator.getVCountForTimer0(bw2Params, timer0);
        console.log(`  Timer0 ${timer0}: VCount ${vcount}`);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Test failed:', error);
    return false;
  }
}
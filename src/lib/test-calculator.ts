import { SeedCalculator } from '../lib/seed-calculator';
import type { SearchConditions } from '../types/pokemon';

// Test function to validate the seed calculator
export function testSeedCalculation() {
  const calculator = new SeedCalculator();
  
  // Test ROM parameters loading
  const params = calculator.getROMParameters('B', 'JPN');
  console.log('ROM Parameters for B JPN:', params);
  
  // Test seed parsing
  const testInput = '0x12345678\nABCDEF00\n0xDEADBEEF';
  const { validSeeds, errors } = calculator.parseTargetSeeds(testInput);
  console.log('Parsed seeds:', validSeeds);
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
    keyInput: 0x2FFF,
    macAddress: [0x00, 0x12, 0x34, 0x56, 0x78, 0x9A],
  };
  
  try {
    const testDate = new Date(2023, 0, 1, 0, 0, 0);
    const message = calculator.generateMessage(testConditions, 3193, 95, testDate);
    const result = calculator.calculateSeed(message);
    
    console.log('Test message:', message);
    console.log('Test seed result:', result);
    
    return true;
  } catch (error) {
    console.error('Test failed:', error);
    return false;
  }
}
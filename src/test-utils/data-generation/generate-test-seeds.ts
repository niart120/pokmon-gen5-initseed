import { SeedCalculator } from '../../lib/core/seed-calculator';
import type { SearchConditions } from '../../types/pokemon';

/**
 * Generate some test seeds for our test date range to verify search is working
 */
export function generateTestSeeds(): number[] {
  const calculator = new SeedCalculator();
  const testSeeds: number[] = [];
  
  // Test conditions matching our default setup
  const testConditions: SearchConditions = {
    romVersion: 'B',
    romRegion: 'JPN', 
    hardware: 'DS',
    timer0Range: { min: 3193, max: 3194, useAutoRange: true },
    vcountRange: { min: 95, max: 95, useAutoRange: true },
    dateRange: {
      startYear: 2023, endYear: 2023,
      startMonth: 6, endMonth: 6,
      startDay: 15, endDay: 15,
      startHour: 12, endHour: 12,
      startMinute: 0, endMinute: 5,
      startSecond: 0, endSecond: 59
    },
    keyInput: 0x2FFF,
    macAddress: [0x00, 0x1B, 0x2C, 0x3D, 0x4E, 0x5F]
  };

  const params = calculator.getROMParameters(testConditions.romVersion, testConditions.romRegion);
  if (!params) {
    console.error('Could not load ROM parameters for test seed generation');
    return [];
  }

  // Generate a few seeds from our test date range
  const testDate = new Date(2023, 5, 15, 12, 0, 0); // June 15, 2023 12:00:00
  
  // Test a few different times and timer0 values
  for (let timer0 = 3193; timer0 <= 3194; timer0++) {
    for (let second = 0; second < 10; second += 5) {
      const currentDate = new Date(testDate.getTime() + second * 1000);
      const vcount = calculator.getVCountForTimer0(params, timer0);
      
      try {
        const message = calculator.generateMessage(testConditions, timer0, vcount, currentDate);
        const { seed } = calculator.calculateSeed(message);
        testSeeds.push(seed);
        
        console.log(`Generated test seed: 0x${seed.toString(16).padStart(8, '0')} for ${currentDate.toISOString()}, Timer0: ${timer0}`);
      } catch (error) {
        console.error('Error generating test seed:', error);
      }
    }
  }
  
  return testSeeds.slice(0, 3); // Return first 3 for testing
}
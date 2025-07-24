/**
 * Web Worker for Pokemon BW/BW2 Initial Seed Search
 * Performs heavy computation off the main thread to prevent UI blocking
 */

import { SeedCalculator } from '../lib/seed-calculator';
import type { SearchConditions, InitialSeedResult } from '../types/pokemon';

// Worker message types
export interface WorkerRequest {
  type: 'START_SEARCH' | 'PAUSE_SEARCH' | 'RESUME_SEARCH' | 'STOP_SEARCH';
  conditions?: SearchConditions;
  targetSeeds?: number[];
}

export interface WorkerResponse {
  type: 'PROGRESS' | 'RESULT' | 'COMPLETE' | 'ERROR' | 'PAUSED' | 'RESUMED' | 'STOPPED' | 'READY';
  progress?: {
    currentStep: number;
    totalSteps: number;
    elapsedTime: number;
    estimatedTimeRemaining: number;
    matchesFound: number;
    currentDateTime?: string;
  };
  result?: InitialSeedResult;
  error?: string;
  message?: string;
}

// Worker state
let searchState = {
  isRunning: false,
  isPaused: false,
  shouldStop: false
};

let calculator: SeedCalculator;

// Initialize calculator
async function initializeCalculator() {
  if (!calculator) {
    calculator = new SeedCalculator();
    // Try to initialize WebAssembly
    try {
      await calculator.initializeWasm();
      console.log('🦀 WebAssembly initialized in worker');
    } catch (error) {
      console.warn('⚠️ WebAssembly failed in worker, using TypeScript fallback:', error);
    }
  }
}

// Main search function
async function performSearch(conditions: SearchConditions, targetSeeds: number[]) {
  try {
    await initializeCalculator();
    
    // Get ROM parameters
    const params = calculator.getROMParameters(conditions.romVersion, conditions.romRegion);
    if (!params) {
      throw new Error(`No parameters found for ${conditions.romVersion} ${conditions.romRegion}`);
    }

    // Calculate search space
    const timer0Range = conditions.timer0Range.max - conditions.timer0Range.min + 1;
    const vcountRange = conditions.vcountRange.max - conditions.vcountRange.min + 1;
    
    const startDate = new Date(
      conditions.dateRange.startYear,
      conditions.dateRange.startMonth - 1,
      conditions.dateRange.startDay,
      conditions.dateRange.startHour,
      conditions.dateRange.startMinute,
      conditions.dateRange.startSecond
    );
    
    const endDate = new Date(
      conditions.dateRange.endYear,
      conditions.dateRange.endMonth - 1,
      conditions.dateRange.endDay,
      conditions.dateRange.endHour,
      conditions.dateRange.endMinute,
      conditions.dateRange.endSecond
    );

    if (startDate > endDate) {
      throw new Error('Start date must be before or equal to end date');
    }

    const dateRange = Math.floor((endDate.getTime() - startDate.getTime()) / 1000) + 1;
    const totalSteps = timer0Range * vcountRange * dateRange;

    // Convert target seeds to Set for faster lookup
    const targetSeedSet = new Set(targetSeeds);

    let currentStep = 0;
    let matchesFound = 0;
    const startTime = Date.now();

    // Search loop
    outerLoop: for (let timer0 = conditions.timer0Range.min; timer0 <= conditions.timer0Range.max; timer0++) {
      if (searchState.shouldStop) break;
      
      // Get actual VCount value with offset handling for BW2
      const actualVCount = calculator.getVCountForTimer0(params, timer0);
      
      for (let timestamp = startDate.getTime(); timestamp <= endDate.getTime(); timestamp += 1000) {
        if (searchState.shouldStop) break outerLoop;
        
        // Handle pause
        while (searchState.isPaused && !searchState.shouldStop) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        if (searchState.shouldStop) break outerLoop;

        const currentDateTime = new Date(timestamp);
        currentStep++;

        try {
          // Generate message and calculate seed
          const message = calculator.generateMessage(conditions, timer0, actualVCount, currentDateTime);
          const { seed, hash } = calculator.calculateSeed(message);

          // Check if seed matches any target
          const isMatch = targetSeedSet.has(seed);

          if (isMatch) {
            matchesFound++;
            
            // Send result immediately
            const result: InitialSeedResult = {
              seed,
              datetime: currentDateTime,
              timer0,
              vcount: actualVCount,
              conditions,
              message,
              sha1Hash: hash,
              isMatch: true,
            };

            postMessage({
              type: 'RESULT',
              result
            } as WorkerResponse);
          }

          // Send progress update every 100 iterations for better performance
          if (currentStep % 100 === 0) {
            const elapsedTime = Date.now() - startTime;
            const estimatedTimeRemaining = currentStep > 0 ? 
              elapsedTime * (totalSteps - currentStep) / currentStep : 0;

            postMessage({
              type: 'PROGRESS',
              progress: {
                currentStep,
                totalSteps,
                elapsedTime,
                estimatedTimeRemaining,
                matchesFound,
                currentDateTime: currentDateTime.toISOString()
              }
            } as WorkerResponse);

            // Small yield to allow message processing
            await new Promise(resolve => setTimeout(resolve, 1));
          }
        } catch (error) {
          console.error('Error calculating seed in worker:', error);
        }
      }
    }

    // Send completion message
    if (searchState.shouldStop) {
      postMessage({
        type: 'STOPPED',
        message: `Search stopped. Found ${matchesFound} matches out of ${currentStep} tested combinations.`
      } as WorkerResponse);
    } else {
      postMessage({
        type: 'COMPLETE',
        message: `Search completed. Found ${matchesFound} matches out of ${totalSteps} combinations.`,
        progress: {
          currentStep: totalSteps,
          totalSteps,
          elapsedTime: Date.now() - startTime,
          estimatedTimeRemaining: 0,
          matchesFound
        }
      } as WorkerResponse);
    }

  } catch (error) {
    postMessage({
      type: 'ERROR',
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    } as WorkerResponse);
  } finally {
    searchState.isRunning = false;
    searchState.isPaused = false;
    searchState.shouldStop = false;
  }
}

// Message handler
self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { type, conditions, targetSeeds } = event.data;

  switch (type) {
    case 'START_SEARCH':
      if (!conditions || !targetSeeds) {
        postMessage({
          type: 'ERROR',
          error: 'Missing conditions or target seeds'
        } as WorkerResponse);
        return;
      }

      if (searchState.isRunning) {
        postMessage({
          type: 'ERROR',
          error: 'Search is already running'
        } as WorkerResponse);
        return;
      }

      searchState.isRunning = true;
      searchState.isPaused = false;
      searchState.shouldStop = false;

      performSearch(conditions, targetSeeds);
      break;

    case 'PAUSE_SEARCH':
      if (searchState.isRunning && !searchState.isPaused) {
        searchState.isPaused = true;
        postMessage({
          type: 'PAUSED',
          message: 'Search paused'
        } as WorkerResponse);
      }
      break;

    case 'RESUME_SEARCH':
      if (searchState.isRunning && searchState.isPaused) {
        searchState.isPaused = false;
        postMessage({
          type: 'RESUMED',
          message: 'Search resumed'
        } as WorkerResponse);
      }
      break;

    case 'STOP_SEARCH':
      if (searchState.isRunning) {
        searchState.shouldStop = true;
        // The search loop will handle the actual stopping
      }
      break;

    default:
      postMessage({
        type: 'ERROR',
        error: `Unknown message type: ${type}`
      } as WorkerResponse);
  }
};

// Worker ready signal
postMessage({
  type: 'READY',
  message: 'Search worker initialized'
} as WorkerResponse);

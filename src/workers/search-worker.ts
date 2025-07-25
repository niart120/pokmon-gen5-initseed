/**
 * Web Worker for Pokemon BW/BW2 Initial Seed Search
 * Performs heavy computation off the main thread to prevent UI blocking
 */

import { SeedCalculator } from '../lib/core/seed-calculator';
import { ProductionPerformanceMonitor } from '../lib/core/performance-monitor';
import type { SearchConditions, InitialSeedResult } from '../types/pokemon';

// Performance optimization: Use larger batch sizes for better WASM utilization
const BATCH_SIZE_SECONDS = 2592000;   // 30日


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
    // Initialize WebAssembly for integrated search
    try {
      await calculator.initializeWasm();
      console.log('🦀 WebAssembly initialized in worker');
    } catch (error) {
      console.warn('⚠️ WebAssembly failed in worker, using TypeScript fallback:', error);
    }
  }
}

/**
 * Process batch using integrated search for maximum performance
 */
async function processBatchIntegrated(
  conditions: SearchConditions,
  startTimestamp: number,
  endTimestamp: number,
  timer0Min: number,
  timer0Max: number,
  vcountMin: number,
  vcountMax: number,
  targetSeedSet: Set<number>,
  onResult: (result: InitialSeedResult) => void
): Promise<void> {
  const wasmModule = calculator.getWasmModule();
  
  if (wasmModule && wasmModule.IntegratedSeedSearcher) {
    try {
      const params = calculator.getROMParameters(conditions.romVersion, conditions.romRegion);
      if (!params) {
        throw new Error(`No parameters found for ${conditions.romVersion} ${conditions.romRegion}`);
      }

      const searcher = new wasmModule.IntegratedSeedSearcher(
        conditions.macAddress,
        new Uint32Array(params.nazo),
        5, // version
        8  // frame
      );

      const startDate = new Date(startTimestamp);
      const rangeSeconds = Math.floor((endTimestamp - startTimestamp) / 1000);

      const results = searcher.search_seeds_integrated(
        startDate.getFullYear(),
        startDate.getMonth() + 1,
        startDate.getDate(),
        startDate.getHours(),
        startDate.getMinutes(),
        startDate.getSeconds(),
        rangeSeconds,
        timer0Min,
        timer0Max,
        vcountMin,
        vcountMax,
        new Uint32Array(Array.from(targetSeedSet))
      );

      // Process results
      for (const result of results) {
        const resultDate = new Date(result.year, result.month - 1, result.date, result.hour, result.minute, result.second);
        const message = calculator.generateMessage(conditions, result.timer0, result.vcount, resultDate);
        const { hash } = calculator.calculateSeed(message);

        const searchResult: InitialSeedResult = {
          seed: result.seed,
          datetime: resultDate,
          timer0: result.timer0,
          vcount: result.vcount,
          conditions,
          message,
          sha1Hash: hash,
          isMatch: true,
        };
        onResult(searchResult);
      }

      searcher.free();
      return;
    } catch (error) {
      console.error('Integrated search failed, falling back to individual processing:', error);
    }
  }

  // Fallback to individual processing
  await processBatchIndividual(
    [startTimestamp, endTimestamp],
    conditions,
    timer0Min,
    vcountMin,
    targetSeedSet,
    calculator,
    onResult
  );
}

/**
 * Process batch using individual calculations (fallback method)
 */
async function processBatchIndividual(
  timestampRange: number[],
  conditions: SearchConditions,
  timer0: number,
  actualVCount: number,
  targetSeedSet: Set<number>,
  calculator: SeedCalculator,
  onResult: (result: InitialSeedResult) => void
): Promise<void> {
  const [startTimestamp, endTimestamp] = timestampRange;
  
  for (let timestamp = startTimestamp; timestamp <= endTimestamp; timestamp += 1000) {
    const currentDateTime = new Date(timestamp);
    
    try {
      // Generate message and calculate seed
      const message = calculator.generateMessage(conditions, timer0, actualVCount, currentDateTime);
      const { seed, hash } = calculator.calculateSeed(message);

      // Check if seed matches any target
      if (targetSeedSet.has(seed)) {
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
        onResult(result);
      }
    } catch (error) {
      console.error('Error calculating seed:', error);
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
    const totalSteps = timer0Range * dateRange;

    // Convert target seeds to Set for faster lookup
    const targetSeedSet = new Set(targetSeeds);

    let currentStep = 0;
    let matchesFound = 0;
    const startTime = Date.now();
    let lastProgressUpdate = startTime;
    const progressUpdateInterval = 500; // Update progress every 500ms

    // Search using integrated approach
    console.log(`🚀 Using integrated search (WebAssembly: ${calculator.isUsingWasm()})`);

    // Search loop using integrated search
    for (let timer0 = conditions.timer0Range.min; timer0 <= conditions.timer0Range.max; timer0++) {
      if (searchState.shouldStop) break;
      
      // Get actual VCount value with offset handling for BW2
      const actualVCount = calculator.getVCountForTimer0(params, timer0);
      
      // Process in time ranges using integrated search with optimized batch size
      const timeRangeSize = Math.min(BATCH_SIZE_SECONDS, dateRange);
      
      for (let timeStart = 0; timeStart < dateRange; timeStart += timeRangeSize) {
        if (searchState.shouldStop) break;
        
        // Handle pause
        while (searchState.isPaused && !searchState.shouldStop) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        if (searchState.shouldStop) break;

        const timeEnd = Math.min(timeStart + timeRangeSize, dateRange);
        const rangeStartTime = startDate.getTime() + timeStart * 1000;
        const rangeEndTime = startDate.getTime() + (timeEnd - 1) * 1000;
        
        try {
          await processBatchIntegrated(
            conditions,
            rangeStartTime,
            rangeEndTime,
            timer0,
            timer0,
            actualVCount,
            actualVCount,
            targetSeedSet,
            (result) => {
              matchesFound++;
              postMessage({ type: 'RESULT', result } as WorkerResponse);
            }
          );

          currentStep += (timeEnd - timeStart);

          // Send progress update only at specified intervals or on completion
          const now = Date.now();
          const shouldUpdateProgress = 
            (now - lastProgressUpdate >= progressUpdateInterval) || 
            (currentStep >= totalSteps);

          if (shouldUpdateProgress) {
            lastProgressUpdate = now;
            
            const elapsedTime = now - startTime;
            
            // More accurate estimated time remaining calculation
            let estimatedTimeRemaining = 0;
            if (currentStep > 0 && currentStep < totalSteps) {
              const avgTimePerStep = elapsedTime / currentStep;
              const remainingSteps = totalSteps - currentStep;
              estimatedTimeRemaining = Math.round(avgTimePerStep * remainingSteps);
            }

            postMessage({
              type: 'PROGRESS',
              progress: {
                currentStep,
                totalSteps,
                elapsedTime,
                estimatedTimeRemaining,
                matchesFound,
                currentDateTime: new Date(rangeEndTime).toISOString()
              }
            } as WorkerResponse);
          }

        } catch (error) {
          console.error('Search batch error:', error);
        }
      }
    }

    // Send completion message
    const finalElapsedTime = Date.now() - startTime;
    
    if (searchState.shouldStop) {
      postMessage({
        type: 'STOPPED',
        message: `Search stopped. Found ${matchesFound} matches out of ${currentStep} tested combinations.`,
        progress: {
          currentStep,
          totalSteps,
          elapsedTime: finalElapsedTime,
          estimatedTimeRemaining: 0,
          matchesFound
        }
      } as WorkerResponse);
    } else {
      postMessage({
        type: 'COMPLETE',
        message: `Search completed. Found ${matchesFound} matches out of ${totalSteps} combinations.`,
        progress: {
          currentStep: totalSteps,
          totalSteps,
          elapsedTime: finalElapsedTime,
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

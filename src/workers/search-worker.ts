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

/**
 * Process batch using WebAssembly for maximum performance
 */
async function processBatchWebAssembly(
  timestamps: number[],
  conditions: SearchConditions,
  timer0: number,
  actualVCount: number,
  targetSeedSet: Set<number>,
  calculator: SeedCalculator,
  onResult: (result: InitialSeedResult) => void
): Promise<void> {
  // Generate all messages for the batch
  const messages: number[][] = [];
  const datetimes: Date[] = [];
  
  for (const timestamp of timestamps) {
    const datetime = new Date(timestamp);
    const message = calculator.generateMessage(conditions, timer0, actualVCount, datetime);
    messages.push(message);
    datetimes.push(datetime);
  }

  // Get WebAssembly calculator for batch processing
  const wasmCalculator = calculator.getWasmCalculator();
  if (wasmCalculator && wasmCalculator.calculateSeedBatch) {
    try {
      // Use WebAssembly batch calculation
      const results = wasmCalculator.calculateSeedBatch(messages);
      
      // Process results
      for (let i = 0; i < results.length; i++) {
        const { seed, hash } = results[i];
        
        if (targetSeedSet.has(seed)) {
          const result: InitialSeedResult = {
            seed,
            datetime: datetimes[i],
            timer0,
            vcount: actualVCount,
            conditions,
            message: messages[i],
            sha1Hash: hash,
            isMatch: true,
          };
          onResult(result);
        }
      }
    } catch (error) {
      console.error('WebAssembly batch processing failed, falling back to individual:', error);
      // Fallback to individual processing
      await processBatchIndividual(timestamps, conditions, timer0, actualVCount, targetSeedSet, calculator, onResult);
    }
  } else {
    // Fallback to individual processing
    await processBatchIndividual(timestamps, conditions, timer0, actualVCount, targetSeedSet, calculator, onResult);
  }
}

/**
 * Process batch using individual calculations (fallback method)
 */
async function processBatchIndividual(
  timestamps: number[],
  conditions: SearchConditions,
  timer0: number,
  actualVCount: number,
  targetSeedSet: Set<number>,
  calculator: SeedCalculator,
  onResult: (result: InitialSeedResult) => void
): Promise<void> {
  for (const timestamp of timestamps) {
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
    const totalSteps = timer0Range * vcountRange * dateRange;

    // Convert target seeds to Set for faster lookup
    const targetSeedSet = new Set(targetSeeds);

    let currentStep = 0;
    let matchesFound = 0;
    const startTime = Date.now();

    // Batch processing configuration - Optimized for performance
    const BATCH_SIZE = calculator.isUsingWasm() ? 10000 : 2000; // Significantly larger batches for better performance
    const PROGRESS_UPDATE_INTERVAL = Math.max(Math.floor(BATCH_SIZE * 5), 5000); // Update every 5 batches or 5000+ calculations
    console.log(`🚀 Using batch size: ${BATCH_SIZE} (WebAssembly: ${calculator.isUsingWasm()})`);
    console.log(`📊 Progress update interval: ${PROGRESS_UPDATE_INTERVAL} calculations`);

    // Pre-calculate timestamps for better performance
    const timestamps: number[] = [];
    for (let timestamp = startDate.getTime(); timestamp <= endDate.getTime(); timestamp += 1000) {
      timestamps.push(timestamp);
    }
    console.log(`📅 Pre-calculated ${timestamps.length} timestamps`);

    // Search loop with batch processing
    outerLoop: for (let timer0 = conditions.timer0Range.min; timer0 <= conditions.timer0Range.max; timer0++) {
      if (searchState.shouldStop) break;
      
      // Get actual VCount value with offset handling for BW2
      const actualVCount = calculator.getVCountForTimer0(params, timer0);
      
      // Process timestamps in batches
      for (let timestampStart = 0; timestampStart < timestamps.length; timestampStart += BATCH_SIZE) {
        if (searchState.shouldStop) break outerLoop;
        
        // Handle pause
        while (searchState.isPaused && !searchState.shouldStop) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        if (searchState.shouldStop) break outerLoop;

        const timestampEnd = Math.min(timestampStart + BATCH_SIZE, timestamps.length);
        const batchTimestamps = timestamps.slice(timestampStart, timestampEnd);
        
        try {
          if (calculator.isUsingWasm() && batchTimestamps.length > 10) {
            // Use WebAssembly batch processing for significant speedup
            await processBatchWebAssembly(
              batchTimestamps, conditions, timer0, actualVCount, 
              targetSeedSet, calculator, (result) => {
                matchesFound++;
                postMessage({ type: 'RESULT', result } as WorkerResponse);
              }
            );
          } else {
            // Use individual processing for smaller batches or TypeScript fallback
            await processBatchIndividual(
              batchTimestamps, conditions, timer0, actualVCount,
              targetSeedSet, calculator, (result) => {
                matchesFound++;
                postMessage({ type: 'RESULT', result } as WorkerResponse);
              }
            );
          }

          currentStep += batchTimestamps.length;

          // Send progress update based on optimized interval (not every batch)
          if (currentStep % PROGRESS_UPDATE_INTERVAL < batchTimestamps.length || 
              timestampEnd >= timestamps.length) { // Also update on completion
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
                currentDateTime: new Date(batchTimestamps[batchTimestamps.length - 1]).toISOString()
              }
            } as WorkerResponse);
          }

          // Reduced yield frequency for better performance
          if (currentStep % (BATCH_SIZE * 10) === 0) {
            await new Promise(resolve => setTimeout(resolve, 1));
          }

        } catch (error) {
          console.error('Error processing batch in worker:', error);
          // Continue with next batch instead of stopping completely
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

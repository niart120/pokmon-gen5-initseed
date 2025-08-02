/**
 * 並列検索専用WebWorker
 * 割り当てられた時刻チャンクを高速処理
 */

import { SeedCalculator } from '../lib/core/seed-calculator';
import type { 
  SearchConditions, 
  InitialSeedResult, 
  ParallelWorkerRequest, 
  ParallelWorkerResponse,
  WorkerChunk 
} from '../types/pokemon';

// Timer state for accurate elapsed time calculation
interface TimerState {
  cumulativeRunTime: number;  // 累積実行時間（ミリ秒）
  segmentStartTime: number;   // 現在セグメント開始時刻
  isPaused: boolean;          // 一時停止状態
}

// Worker状態
let searchState = {
  isRunning: false,
  isPaused: false,
  shouldStop: false,
  workerId: -1,
  chunk: null as WorkerChunk | null,
  startTime: 0
};

// Timer state for elapsed time management
let timerState: TimerState = {
  cumulativeRunTime: 0,
  segmentStartTime: 0,
  isPaused: false
};

let calculator: SeedCalculator;

/**
 * Timer management functions for accurate elapsed time calculation
 */
function startTimer() {
  timerState.cumulativeRunTime = 0;
  timerState.segmentStartTime = Date.now();
  timerState.isPaused = false;
}

function pauseTimer() {
  if (!timerState.isPaused) {
    timerState.cumulativeRunTime += Date.now() - timerState.segmentStartTime;
    timerState.isPaused = true;
  }
}

function resumeTimer() {
  if (timerState.isPaused) {
    timerState.segmentStartTime = Date.now();
    timerState.isPaused = false;
  }
}

function getElapsedTime(): number {
  return timerState.isPaused 
    ? timerState.cumulativeRunTime
    : timerState.cumulativeRunTime + (Date.now() - timerState.segmentStartTime);
}

/**
 * Calculator初期化
 */
async function initializeCalculator(): Promise<void> {
  if (!calculator) {
    calculator = new SeedCalculator();
    try {
      await calculator.initializeWasm();
    } catch (error) {
      console.warn(`Worker ${searchState.workerId}: WebAssembly failed, using TypeScript fallback:`, error);
    }
  }
}

/**
 * チャンク検索メイン処理
 */
async function processChunk(
  conditions: SearchConditions,
  targetSeeds: number[]
): Promise<void> {
  if (!searchState.chunk) {
    throw new Error('No chunk assigned to worker');
  }

  searchState.startTime = Date.now();
  let processedOperations = 0;
  let matchesFound = 0;

  try {
    // WebAssembly統合検索を使用（可能な場合）
    if (calculator.isUsingWasm()) {
      const results = await processChunkWithWasm(conditions, targetSeeds);
      matchesFound = results.length;
      
      // 結果送信
      for (const result of results) {
        postMessage({
          type: 'RESULT',
          workerId: searchState.workerId,
          result: {
            ...result,
            datetime: result.datetime.toISOString() // シリアライゼーション
          }
        } as ParallelWorkerResponse);
      }
    } else {
      // TypeScriptフォールバック
      matchesFound = await processChunkWithTypeScript(conditions, targetSeeds);
    }

    // 完了通知
    postMessage({
      type: 'COMPLETE',
      workerId: searchState.workerId,
      message: `Worker ${searchState.workerId} completed with ${matchesFound} matches`
    } as ParallelWorkerResponse);

  } catch (error) {
    console.error(`❌ Worker ${searchState.workerId}: Processing error:`, error);
    postMessage({
      type: 'ERROR',
      workerId: searchState.workerId,
      error: error instanceof Error ? error.message : 'Unknown error'
    } as ParallelWorkerResponse);
  }
}

/**
 * WebAssembly統合検索による処理
 */
async function processChunkWithWasm(
  conditions: SearchConditions,
  targetSeeds: number[]
): Promise<InitialSeedResult[]> {
  const wasmModule = calculator.getWasmModule()!;
  const params = calculator.getROMParameters(conditions.romVersion, conditions.romRegion);
  
  if (!params) {
    throw new Error(`No ROM parameters found for ${conditions.romVersion} ${conditions.romRegion}`);
  }

  // Hardware別のframe値を設定
  const HARDWARE_FRAME_VALUES: Record<string, number> = {
    'DS': 8,
    'DS_LITE': 6,
    '3DS': 9
  };
  const frameValue = HARDWARE_FRAME_VALUES[conditions.hardware] || 8;

  // WebAssembly searcher作成
  const searcher = new wasmModule.IntegratedSeedSearcher(
    conditions.macAddress,
    new Uint32Array(params.nazo),
    conditions.hardware,
    conditions.keyInput,
    frameValue
  );

  try {
    const chunk = searchState.chunk!;
    const startDate = chunk.startDateTime;
    const endDate = chunk.endDateTime;
    const rangeSeconds = Math.floor((endDate.getTime() - startDate.getTime()) / 1000) + 1;
    const totalOperations = rangeSeconds * 
      (conditions.timer0VCountConfig.timer0Range.max - conditions.timer0VCountConfig.timer0Range.min + 1) *
      (conditions.timer0VCountConfig.vcountRange.max - conditions.timer0VCountConfig.vcountRange.min + 1);

    // 初期進捗報告
    reportProgress(0, totalOperations, 0);

    // サブチャンク分割 (5日)
    const subChunkSeconds = Math.min(5 * 24 * 60 * 60, rangeSeconds);
    const allResults: InitialSeedResult[] = [];
    let processedOperations = 0;

    for (let offset = 0; offset < rangeSeconds; offset += subChunkSeconds) {
      // 停止チェック
      if (searchState.shouldStop) {
        break;
      }
      
      // 一時停止チェック
      if (searchState.isPaused) {
        // 一時停止状態をUIに通知
        postMessage({
          type: 'PAUSED',
          workerId: searchState.workerId
        } as ParallelWorkerResponse);
        
        while (searchState.isPaused && !searchState.shouldStop) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // 再開時にUIに通知
        if (!searchState.shouldStop) {
          postMessage({
            type: 'RESUMED',
            workerId: searchState.workerId
          } as ParallelWorkerResponse);
        }
      }
      
      if (searchState.shouldStop) {
        break;
      }
      
      const subChunkStart = new Date(startDate.getTime() + offset * 1000);
      const subChunkEnd = new Date(Math.min(
        startDate.getTime() + (offset + subChunkSeconds) * 1000,
        endDate.getTime() + 1000
      ));
      const subChunkRange = Math.floor((subChunkEnd.getTime() - subChunkStart.getTime()) / 1000);
      
      if (subChunkRange <= 0) break;

      // WebAssembly呼び出し前に非同期yield
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // WebAssembly呼び出し前の一時停止チェック
      if (searchState.isPaused) {
        while (searchState.isPaused && !searchState.shouldStop) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        if (searchState.shouldStop) break;
      }

      // サブチャンクの統合検索実行（SIMD版）
      const subResults = searcher.search_seeds_integrated_simd(
        subChunkStart.getFullYear(),
        subChunkStart.getMonth() + 1,
        subChunkStart.getDate(),
        subChunkStart.getHours(),
        subChunkStart.getMinutes(),
        subChunkStart.getSeconds(),
        subChunkRange,
        conditions.timer0VCountConfig.timer0Range.min,
        conditions.timer0VCountConfig.timer0Range.max,
        conditions.timer0VCountConfig.vcountRange.min,
        conditions.timer0VCountConfig.vcountRange.max,
        new Uint32Array(targetSeeds)
      );
      
      // WebAssembly呼び出し後に非同期yield
      await new Promise(resolve => setTimeout(resolve, 0));

      // サブチャンクの結果を統合
      for (const result of subResults) {
        const resultDate = new Date(
          result.year, 
          result.month - 1, 
          result.date, 
          result.hour, 
          result.minute, 
          result.second
        );
        
        const message = calculator.generateMessage(conditions, result.timer0, result.vcount, resultDate);
        const { hash } = calculator.calculateSeed(message);

        allResults.push({
          seed: result.seed,
          datetime: resultDate,
          timer0: result.timer0,
          vcount: result.vcount,
          conditions,
          message,
          sha1Hash: hash,
          isMatch: true,
        });
      }

      // サブチャンク完了後の進捗報告
      const subChunkOperations = subChunkRange * 
        (conditions.timer0VCountConfig.timer0Range.max - conditions.timer0VCountConfig.timer0Range.min + 1) *
        (conditions.timer0VCountConfig.vcountRange.max - conditions.timer0VCountConfig.vcountRange.min + 1);
      processedOperations += subChunkOperations;
      reportProgress(processedOperations, totalOperations, allResults.length);
    }

    return allResults;
    
  } finally {
    searcher.free(); // メモリ解放
  }
}

/**
 * TypeScriptフォールバック処理
 */
async function processChunkWithTypeScript(
  conditions: SearchConditions,
  targetSeeds: number[]
): Promise<number> {
  const chunk = searchState.chunk!;
  const targetSeedSet = new Set(targetSeeds);
  let matchesFound = 0;
  let processedCount = 0;
  
  const params = calculator.getROMParameters(conditions.romVersion, conditions.romRegion);
  if (!params) {
    throw new Error(`No ROM parameters found for ${conditions.romVersion} ${conditions.romRegion}`);
  }

  const startTime = chunk.startDateTime.getTime();
  const endTime = chunk.endDateTime.getTime();
  const totalSeconds = Math.floor((endTime - startTime) / 1000) + 1;
  const totalOperations = totalSeconds * 
    (conditions.timer0VCountConfig.timer0Range.max - conditions.timer0VCountConfig.timer0Range.min + 1);

  // Timer0範囲をループ
  for (let timer0 = conditions.timer0VCountConfig.timer0Range.min; timer0 <= conditions.timer0VCountConfig.timer0Range.max; timer0++) {
    if (searchState.shouldStop) break;
    
    // VCount値取得（BW2のオフセット処理含む）
    const actualVCount = calculator.getVCountForTimer0(params, timer0);
    
    // 時刻範囲をループ
    for (let timestamp = startTime; timestamp <= endTime; timestamp += 1000) {
      if (searchState.shouldStop) break;
      
      // 一時停止処理
      while (searchState.isPaused && !searchState.shouldStop) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      if (searchState.shouldStop) break;
      
      const currentDateTime = new Date(timestamp);
      
      try {
        // Seed計算
        const message = calculator.generateMessage(conditions, timer0, actualVCount, currentDateTime);
        const { seed, hash } = calculator.calculateSeed(message);

        // マッチチェック
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
          
          // 結果送信
          postMessage({
            type: 'RESULT',
            workerId: searchState.workerId,
            result: {
              ...result,
              datetime: result.datetime.toISOString()
            }
          } as ParallelWorkerResponse);
          
          matchesFound++;
        }
        
        processedCount++;
        
        // 進捗報告と一時停止チェック (1000操作ごと)
        if (processedCount % 1000 === 0) {
          reportProgress(processedCount, totalOperations, matchesFound);
          
          // 追加の一時停止チェック
          if (searchState.isPaused) {
            while (searchState.isPaused && !searchState.shouldStop) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          }
          
          // Event Loop yield
          await new Promise(resolve => setTimeout(resolve, 0));
        }
        
      } catch (error) {
        console.error(`Worker ${searchState.workerId}: Error calculating seed:`, error);
      }
    }
  }
  
  // 最終進捗報告
  reportProgress(processedCount, totalOperations, matchesFound);
  
  return matchesFound;
}

/**
 * 進捗報告
 */
function reportProgress(current: number, total: number, matches: number): void {
  const elapsedTime = getElapsedTime();
  const progressRatio = current / total;
  const estimatedTimeRemaining = progressRatio > 0 ? 
    Math.round((elapsedTime / progressRatio) * (1 - progressRatio)) : 0;

  postMessage({
    type: 'PROGRESS',
    workerId: searchState.workerId,
    progress: {
      currentStep: current,
      totalSteps: total,
      elapsedTime,
      estimatedTimeRemaining,
      matchesFound: matches,
      currentDateTime: searchState.chunk?.startDateTime.toISOString()
    }
  } as ParallelWorkerResponse);
}

/**
 * メッセージハンドラー
 */
self.onmessage = async (event: MessageEvent<ParallelWorkerRequest>) => {
  const { type, conditions, targetSeeds, workerId, chunk } = event.data;

  // Worker ID設定
  if (workerId !== undefined) {
    searchState.workerId = workerId;
  }

  switch (type) {
    case 'START_SEARCH':
      if (!conditions || !targetSeeds || !chunk) {
        postMessage({
          type: 'ERROR',
          workerId: searchState.workerId,
          error: 'Missing required parameters for search'
        } as ParallelWorkerResponse);
        return;
      }

      searchState.chunk = chunk;
      searchState.isRunning = true;
      searchState.shouldStop = false;
      searchState.isPaused = false;
      
      // Start accurate timer for elapsed time calculation
      startTimer();

      try {
        await initializeCalculator();
        await processChunk(conditions, targetSeeds);
      } catch (error) {
        postMessage({
          type: 'ERROR',
          workerId: searchState.workerId,
          error: error instanceof Error ? error.message : 'Unknown error'
        } as ParallelWorkerResponse);
      } finally {
        searchState.isRunning = false;
      }
      break;

    case 'PAUSE_SEARCH':
      searchState.isPaused = true;
      pauseTimer(); // タイマーを一時停止
      postMessage({
        type: 'PAUSED',
        workerId: searchState.workerId
      } as ParallelWorkerResponse);
      break;

    case 'RESUME_SEARCH':
      searchState.isPaused = false;
      resumeTimer(); // タイマーを再開
      postMessage({
        type: 'RESUMED',
        workerId: searchState.workerId
      } as ParallelWorkerResponse);
      break;

    case 'STOP_SEARCH':
      searchState.shouldStop = true;
      searchState.isRunning = false;
      postMessage({
        type: 'STOPPED',
        workerId: searchState.workerId
      } as ParallelWorkerResponse);
      break;

    case 'PING':
      // テスト用通信確認
      postMessage({
        type: 'INITIALIZED',
        workerId: searchState.workerId,
        message: `Pong from worker ${searchState.workerId}`
      } as ParallelWorkerResponse);
      break;

    default:
      // Unknown message type - ignore silently
  }
};

// Worker準備完了通知
postMessage({
  type: 'READY',
  workerId: searchState.workerId,
  message: `Parallel worker ${searchState.workerId} initialized`
} as ParallelWorkerResponse);

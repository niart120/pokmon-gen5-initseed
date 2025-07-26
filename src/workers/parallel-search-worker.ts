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

// Worker状態
let searchState = {
  isRunning: false,
  isPaused: false,
  shouldStop: false,
  workerId: -1,
  chunk: null as WorkerChunk | null,
  startTime: 0
};

let calculator: SeedCalculator;

/**
 * Calculator初期化
 */
async function initializeCalculator(): Promise<void> {
  if (!calculator) {
    calculator = new SeedCalculator();
    try {
      await calculator.initializeWasm();
      console.log(`🦀 Worker ${searchState.workerId}: WebAssembly initialized`);
    } catch (error) {
      console.warn(`⚠️ Worker ${searchState.workerId}: WebAssembly failed, using TypeScript fallback:`, error);
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

  console.log(`🚀 Worker ${searchState.workerId}: Starting chunk processing`);
  
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

  // WebAssembly searcher作成
  const searcher = new wasmModule.IntegratedSeedSearcher(
    conditions.macAddress,
    new Uint32Array(params.nazo),
    5, // version
    8  // frame
  );

  try {
    const chunk = searchState.chunk!;
    const startDate = chunk.startDateTime;
    const endDate = chunk.endDateTime;
    const rangeSeconds = Math.floor((endDate.getTime() - startDate.getTime()) / 1000) + 1;

    console.log(`🔍 Worker ${searchState.workerId}: Processing ${rangeSeconds} seconds with WebAssembly`);

    // 統合検索実行
    const results = searcher.search_seeds_integrated(
      startDate.getFullYear(),
      startDate.getMonth() + 1,
      startDate.getDate(),
      startDate.getHours(),
      startDate.getMinutes(),
      startDate.getSeconds(),
      rangeSeconds,
      conditions.timer0Range.min,
      conditions.timer0Range.max,
      conditions.vcountRange.min,
      conditions.vcountRange.max,
      new Uint32Array(targetSeeds)
    );

    // 結果変換
    const searchResults: InitialSeedResult[] = [];
    for (const result of results) {
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

      searchResults.push({
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

    return searchResults;
    
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
    (conditions.timer0Range.max - conditions.timer0Range.min + 1);

  console.log(`🔍 Worker ${searchState.workerId}: Processing ${totalOperations} operations with TypeScript`);

  // Timer0範囲をループ
  for (let timer0 = conditions.timer0Range.min; timer0 <= conditions.timer0Range.max; timer0++) {
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
        
        // 進捗報告 (1000操作ごと)
        if (processedCount % 1000 === 0) {
          reportProgress(processedCount, totalOperations, matchesFound);
        }
        
      } catch (error) {
        console.error(`Worker ${searchState.workerId}: Error calculating seed:`, error);
      }
    }
  }
  
  return matchesFound;
}

/**
 * 進捗報告
 */
function reportProgress(current: number, total: number, matches: number): void {
  const elapsedTime = Date.now() - searchState.startTime;
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
      postMessage({
        type: 'PAUSED',
        workerId: searchState.workerId
      } as ParallelWorkerResponse);
      break;

    case 'RESUME_SEARCH':
      searchState.isPaused = false;
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
      console.warn(`Worker ${searchState.workerId}: Unknown message type:`, type);
  }
};

// Worker準備完了通知
postMessage({
  type: 'READY',
  workerId: searchState.workerId,
  message: `Parallel worker ${searchState.workerId} initialized`
} as ParallelWorkerResponse);

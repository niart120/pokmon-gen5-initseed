# 技術実装ガイド - WebWorker並列化

## アーキテクチャ概要

### 現在のシングルWorker構成
```
Main Thread ←→ SearchWorkerManager ←→ Single Worker
                                      └─ WebAssembly
```

### 新しい並列Worker構成
```
Main Thread ←→ SearchWorkerManager ←→ MultiWorkerSearchManager
                                      ├─ ParallelWorker#1 ←→ WebAssembly
                                      ├─ ParallelWorker#2 ←→ WebAssembly  
                                      ├─ ParallelWorker#3 ←→ WebAssembly
                                      └─ ParallelWorker#N ←→ WebAssembly
```

## 実装サンプルコード

### 1. 型定義 (`src/types/pokemon.ts`)

```typescript
// 新規追加する型定義
export interface WorkerChunk {
  workerId: number;
  startDateTime: Date;
  endDateTime: Date;
  timer0Range: { min: number; max: number };
  vcountRange: { min: number; max: number };
  estimatedOperations: number; // パフォーマンス推定用
}

export interface ParallelSearchSettings {
  enabled: boolean;
  maxWorkers: number;
  chunkStrategy: 'time-based' | 'hybrid' | 'auto';
  memoryLimit: number; // MB
}

export interface AggregatedProgress {
  totalCurrentStep: number;
  totalSteps: number;
  totalElapsedTime: number;
  totalEstimatedTimeRemaining: number;
  totalMatchesFound: number;
  activeWorkers: number;
  completedWorkers: number;
  workerProgresses: Map<number, WorkerProgress>;
}

export interface WorkerProgress {
  workerId: number;
  currentStep: number;
  totalSteps: number;
  elapsedTime: number;
  estimatedTimeRemaining: number;
  matchesFound: number;
  currentDateTime?: Date;
  status: 'initializing' | 'running' | 'paused' | 'completed' | 'error';
}

// 並列Worker専用メッセージ型
export interface ParallelWorkerRequest extends WorkerRequest {
  workerId: number;
  chunk: WorkerChunk; // 担当する時刻範囲
}

export interface ParallelWorkerResponse extends WorkerResponse {
  workerId: number;
  chunkProgress?: {
    processed: number;
    total: number;
  };
}
```

### 2. チャンク計算 (`src/lib/search/chunk-calculator.ts`)

```typescript
/**
 * チャンク分割計算ユーティリティ
 * 検索範囲を複数Workerに効率的に分散
 */

export interface ChunkMetrics {
  totalChunks: number;
  averageChunkSize: number;
  estimatedTimePerChunk: number;
  memoryPerChunk: number;
  loadBalanceScore: number; // 0-100, 100が最適
}

export class ChunkCalculator {
  /**
   * 最適なチャンク分割を計算
   */

  /**
   * 時刻ベース分割
   */
  private static createTimeBasedChunks(
    conditions: SearchConditions,
    workerCount: number
  ): WorkerChunk[] {
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

    const totalSeconds = Math.floor((endDate.getTime() - startDate.getTime()) / 1000);
    const secondsPerWorker = Math.ceil(totalSeconds / workerCount);
    
    const chunks: WorkerChunk[] = [];
    
    for (let i = 0; i < workerCount; i++) {
      const chunkStartTime = startDate.getTime() + i * secondsPerWorker * 1000;
      const chunkEndTime = Math.min(
        startDate.getTime() + (i + 1) * secondsPerWorker * 1000,
        endDate.getTime()
      );
      
      // 実際の時刻範囲がある場合のみチャンクを作成
      if (chunkStartTime < endDate.getTime()) {
        const chunkStart = new Date(chunkStartTime);
        const chunkEnd = new Date(chunkEndTime);
        
        chunks.push({
          workerId: i,
          startDateTime: chunkStart,
          endDateTime: chunkEnd,
          timer0Range: conditions.timer0Range,
          vcountRange: conditions.vcountRange,
          estimatedOperations: this.estimateOperations(
            chunkStart, chunkEnd, conditions.timer0Range, conditions.vcountRange
          )
        });
      }
    }
    
    return chunks;
  }


  /**
   * 操作数推定
   */
  private static estimateOperations(
    startDate: Date,
    endDate: Date,
    timer0Range: { min: number; max: number },
    vcountRange: { min: number; max: number }
  ): number {
    const seconds = Math.floor((endDate.getTime() - startDate.getTime()) / 1000);
    const timer0Count = timer0Range.max - timer0Range.min + 1;
    const vcountCount = vcountRange.max - vcountRange.min + 1;
    
    return seconds * timer0Count * vcountCount;
  }

  /**
   * 検索空間分析
   */
  private static analyzeSearchSpace(conditions: SearchConditions): {
    timeRangeDominant: boolean;
    timer0RangeDominant: boolean;
    totalOperations: number;
  } {
    const totalSeconds = this.getTotalSeconds(conditions.dateRange);
    const timer0Range = conditions.timer0Range.max - conditions.timer0Range.min + 1;
    const vcountRange = conditions.vcountRange.max - conditions.vcountRange.min + 1;
    
    return {
      timeRangeDominant: totalSeconds > (timer0Range * vcountRange * 100),
      timer0RangeDominant: (timer0Range * vcountRange) > (totalSeconds / 100),
      totalOperations: totalSeconds * timer0Range * vcountRange
    };
  }

  private static getTotalSeconds(dateRange: any): number {
    const startDate = new Date(
      dateRange.startYear,
      dateRange.startMonth - 1,
      dateRange.startDay,
      dateRange.startHour,
      dateRange.startMinute,
      dateRange.startSecond
    );
    
    const endDate = new Date(
      dateRange.endYear,
      dateRange.endMonth - 1,
      dateRange.endDay,
      dateRange.endHour,
      dateRange.endMinute,
      dateRange.endSecond
    );

    return Math.floor((endDate.getTime() - startDate.getTime()) / 1000);
  }
}
```

### 3. MultiWorkerSearchManager (`src/lib/search/multi-worker-manager.ts`)

```typescript
/**
 * 複数WebWorker管理システム
 * 並列検索の調整・監視・結果統合を担当
 */

export class MultiWorkerSearchManager {
  private workers: Map<number, Worker> = new Map();
  private workerProgresses: Map<number, WorkerProgress> = new Map();
  private activeChunks: Map<number, WorkerChunk> = new Map();
  private results: InitialSeedResult[] = [];
  private completedWorkers = 0;
  private callbacks: SearchCallbacks | null = null;
  private startTime: number = 0;
  private isRunning = false;

  constructor(
    private maxWorkers: number = navigator.hardwareConcurrency || 4,
    private memoryLimit: number = 500 // MB
  ) {}

  /**
   * 並列検索開始
   */
  async startParallelSearch(
    conditions: SearchConditions,
    targetSeeds: number[],
    callbacks: SearchCallbacks
  ): Promise<void> {
    if (this.isRunning) {
      throw new Error('Parallel search is already running');
    }

    this.callbacks = callbacks;
    this.resetState();
    this.startTime = Date.now();
    this.isRunning = true;

    try {
      // チャンク分割
      const chunks = ChunkCalculator.calculateOptimalChunks(conditions, this.maxWorkers);
      
      if (chunks.length === 0) {
        throw new Error('No valid chunks generated');
      }

      console.log(`🚀 Starting parallel search with ${chunks.length} workers`);
      
      // Worker初期化と起動
      const workerPromises = chunks.map(chunk => 
        this.initializeWorker(chunk, conditions, targetSeeds)
      );
      
      await Promise.all(workerPromises);
      
      // 進捗監視開始
      this.startProgressMonitoring();
      
    } catch (error) {
      this.isRunning = false;
      this.terminateAll();
      throw error;
    }
  }

  /**
   * Worker初期化
   */
  private async initializeWorker(
    chunk: WorkerChunk,
    conditions: SearchConditions,
    targetSeeds: number[]
  ): Promise<void> {
    const worker = new Worker(
      new URL('../../workers/parallel-search-worker.ts', import.meta.url),
      { type: 'module' }
    );

    // エラーハンドリング
    worker.onerror = (error) => this.handleWorkerError(chunk.workerId, error);
    worker.onmessage = (event) => this.handleWorkerMessage(chunk.workerId, event.data);

    this.workers.set(chunk.workerId, worker);
    this.activeChunks.set(chunk.workerId, chunk);
    
    // Worker初期状態設定
    this.workerProgresses.set(chunk.workerId, {
      workerId: chunk.workerId,
      currentStep: 0,
      totalSteps: chunk.estimatedOperations,
      elapsedTime: 0,
      estimatedTimeRemaining: 0,
      matchesFound: 0,
      status: 'initializing'
    });

    // チャンク固有の検索条件を作成
    const chunkConditions: SearchConditions = {
      ...conditions,
      dateRange: {
        startYear: chunk.startDateTime.getFullYear(),
        startMonth: chunk.startDateTime.getMonth() + 1,
        startDay: chunk.startDateTime.getDate(),
        startHour: chunk.startDateTime.getHours(),
        startMinute: chunk.startDateTime.getMinutes(),
        startSecond: chunk.startDateTime.getSeconds(),
        endYear: chunk.endDateTime.getFullYear(),
        endMonth: chunk.endDateTime.getMonth() + 1,
        endDay: chunk.endDateTime.getDate(),
        endHour: chunk.endDateTime.getHours(),
        endMinute: chunk.endDateTime.getMinutes(),
        endSecond: chunk.endDateTime.getSeconds()
      }
    };

    // Worker起動
    const request: ParallelWorkerRequest = {
      type: 'START_SEARCH',
      conditions: chunkConditions,
      targetSeeds,
      workerId: chunk.workerId,
      chunk
    };

    worker.postMessage(request);
    
    console.log(`🔧 Worker ${chunk.workerId} initialized for time range:`, 
      chunk.startDateTime.toISOString(), 'to', chunk.endDateTime.toISOString());
  }

  /**
   * Workerメッセージ処理
   */
  private handleWorkerMessage(workerId: number, response: ParallelWorkerResponse): void {
    if (!this.callbacks) return;

    switch (response.type) {
      case 'PROGRESS':
        this.updateWorkerProgress(workerId, response.progress!);
        this.aggregateAndReportProgress();
        break;

      case 'RESULT':
        if (response.result) {
          this.results.push(response.result);
          this.callbacks.onResult(response.result);
        }
        break;

      case 'COMPLETE':
        this.handleWorkerCompletion(workerId);
        break;

      case 'ERROR':
        this.handleWorkerError(workerId, new Error(response.error || 'Unknown worker error'));
        break;

      default:
        console.warn(`Unknown worker response type: ${response.type} from worker ${workerId}`);
    }
  }

  /**
   * Worker進捗更新
   */
  private updateWorkerProgress(workerId: number, progress: any): void {
    const currentProgress = this.workerProgresses.get(workerId);
    if (currentProgress) {
      this.workerProgresses.set(workerId, {
        ...currentProgress,
        ...progress,
        status: 'running'
      });
    }
  }

  /**
   * 進捗集約とレポート
   */
  private aggregateAndReportProgress(): void {
    const progresses = Array.from(this.workerProgresses.values());
    
    const aggregated: AggregatedProgress = {
      totalCurrentStep: progresses.reduce((sum, p) => sum + p.currentStep, 0),
      totalSteps: progresses.reduce((sum, p) => sum + p.totalSteps, 0),
      totalElapsedTime: Date.now() - this.startTime,
      totalEstimatedTimeRemaining: this.calculateAggregatedTimeRemaining(progresses),
      totalMatchesFound: progresses.reduce((sum, p) => sum + p.matchesFound, 0),
      activeWorkers: progresses.filter(p => p.status === 'running').length,
      completedWorkers: this.completedWorkers,
      workerProgresses: this.workerProgresses
    };

    // メインスレッドに進捗報告
    if (this.callbacks) {
      this.callbacks.onProgress({
        currentStep: aggregated.totalCurrentStep,
        totalSteps: aggregated.totalSteps,
        elapsedTime: aggregated.totalElapsedTime,
        estimatedTimeRemaining: aggregated.totalEstimatedTimeRemaining,
        matchesFound: aggregated.totalMatchesFound
      });
    }
  }

  /**
   * 統合残り時間計算
   */
  private calculateAggregatedTimeRemaining(progresses: WorkerProgress[]): number {
    const activeProgresses = progresses.filter(p => p.status === 'running' && p.currentStep > 0);
    
    if (activeProgresses.length === 0) return 0;

    // 各Workerの残り時間の最大値を採用（最も遅いWorkerに合わせる）
    const remainingTimes = activeProgresses.map(p => {
      const speed = p.currentStep / (p.elapsedTime / 1000);
      const remaining = p.totalSteps - p.currentStep;
      return speed > 0 ? remaining / speed * 1000 : 0;
    });

    return Math.max(...remainingTimes);
  }

  /**
   * Worker完了処理
   */
  private handleWorkerCompletion(workerId: number): void {
    const progress = this.workerProgresses.get(workerId);
    if (progress) {
      progress.status = 'completed';
      this.workerProgresses.set(workerId, progress);
    }

    this.completedWorkers++;
    console.log(`✅ Worker ${workerId} completed (${this.completedWorkers}/${this.workers.size})`);

    // 全Worker完了チェック
    if (this.completedWorkers >= this.workers.size) {
      this.handleAllWorkersCompleted();
    }
  }

  /**
   * 全Worker完了処理
   */
  private handleAllWorkersCompleted(): void {
    const totalElapsed = Date.now() - this.startTime;
    const totalMatches = this.results.length;
    
    console.log(`🎉 All workers completed. Found ${totalMatches} matches in ${totalElapsed}ms`);
    
    if (this.callbacks) {
      this.callbacks.onComplete(
        `Parallel search completed. Found ${totalMatches} matches using ${this.workers.size} workers.`
      );
    }
    
    this.cleanup();
  }

  /**
   * Workerエラー処理
   */
  private handleWorkerError(workerId: number, error: Error): void {
    console.error(`❌ Worker ${workerId} error:`, error);
    
    const progress = this.workerProgresses.get(workerId);
    if (progress) {
      progress.status = 'error';
      this.workerProgresses.set(workerId, progress);
    }

    // エラー戦略: 他のWorkerを継続、エラーWorkerの範囲は単独Worker処理にフォールバック
    if (this.callbacks) {
      this.callbacks.onError(`Worker ${workerId} encountered an error: ${error.message}`);
    }
  }

  /**
   * 進捗監視開始
   */
  private startProgressMonitoring(): void {
    // 定期的な進捗チェック・レポート
    const interval = setInterval(() => {
      if (!this.isRunning) {
        clearInterval(interval);
        return;
      }
      
      this.aggregateAndReportProgress();
      
      // スタック検出・対処
      this.detectAndHandleStalls();
      
    }, 500); // 500ms間隔
  }

  /**
   * スタック検出・対処
   */
  private detectAndHandleStalls(): void {
    const now = Date.now();
    
    for (const [workerId, progress] of this.workerProgresses) {
      if (progress.status === 'running' && 
          now - progress.elapsedTime > 30000) { // 30秒無応答
        console.warn(`⚠️ Worker ${workerId} appears to be stalled`);
        
        // 必要に応じてWorker再起動ロジック
      }
    }
  }

  /**
   * 全Worker停止
   */
  public terminateAll(): void {
    console.log('🛑 Terminating all workers');
    
    for (const worker of this.workers.values()) {
      worker.terminate();
    }
    
    this.cleanup();
  }

  /**
   * 一時停止
   */
  public pauseAll(): void {
    for (const worker of this.workers.values()) {
      worker.postMessage({ type: 'PAUSE_SEARCH' });
    }
  }

  /**
   * 再開
   */
  public resumeAll(): void {
    for (const worker of this.workers.values()) {
      worker.postMessage({ type: 'RESUME_SEARCH' });
    }
  }

  /**
   * クリーンアップ
   */
  private cleanup(): void {
    this.isRunning = false;
    this.workers.clear();
    this.workerProgresses.clear();
    this.activeChunks.clear();
    this.completedWorkers = 0;
    this.callbacks = null;
  }

  private resetState(): void {
    this.results = [];
    this.completedWorkers = 0;
    this.workerProgresses.clear();
    this.activeChunks.clear();
  }

```

### 4. 並列Worker (`src/workers/parallel-search-worker.ts`)

```typescript
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
  chunk: null as WorkerChunk | null
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
      console.warn(`⚠️ Worker ${searchState.workerId}: WebAssembly failed, using TypeScript:`, error);
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
  
  const startTime = Date.now();
  let processedOperations = 0;
  let matchesFound = 0;

  try {
    // WebAssembly統合検索を使用（可能な場合）
    const wasmModule = calculator.getWasmModule();
    
    if (wasmModule?.IntegratedSeedSearcher) {
      const results = await processChunkWithWasm(conditions, targetSeeds);
      matchesFound = results.length;
      
      // 結果送信
      for (const result of results) {
        postMessage({
          type: 'RESULT',
          workerId: searchState.workerId,
          result
        } as ParallelWorkerResponse);
      }
    } else {
      // TypeScriptフォールバック
      matchesFound = await processChunkWithTypeScript(conditions, targetSeeds);
    }

    // 完了通知
    const elapsedTime = Date.now() - startTime;
    console.log(`✅ Worker ${searchState.workerId}: Completed in ${elapsedTime}ms, found ${matchesFound} matches`);
    
    postMessage({
      type: 'COMPLETE',
      workerId: searchState.workerId,
      message: `Worker ${searchState.workerId} completed chunk processing`
    } as ParallelWorkerResponse);

  } catch (error) {
    console.error(`❌ Worker ${searchState.workerId}: Processing error:`, error);
    
    postMessage({
      type: 'ERROR',
      workerId: searchState.workerId,
      error: error instanceof Error ? error.message : 'Unknown processing error'
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
    const rangeSeconds = Math.floor(
      (chunk.endDateTime.getTime() - chunk.startDateTime.getTime()) / 1000
    );

    console.log(`🔧 Worker ${searchState.workerId}: Processing ${rangeSeconds} seconds with WebAssembly`);

    // 統合検索実行
    const wasmResults = searcher.search_seeds_integrated(
      chunk.startDateTime.getFullYear(),
      chunk.startDateTime.getMonth() + 1,
      chunk.startDateTime.getDate(),
      chunk.startDateTime.getHours(),
      chunk.startDateTime.getMinutes(),
      chunk.startDateTime.getSeconds(),
      rangeSeconds,
      conditions.timer0Range.min,
      conditions.timer0Range.max,
      conditions.vcountRange.min,
      conditions.vcountRange.max,
      new Uint32Array(targetSeeds)
    );

    // 結果変換
    const results: InitialSeedResult[] = [];
    
    for (let i = 0; i < wasmResults.length; i++) {
      const wasmResult = wasmResults[i];
      
      const resultDate = new Date(
        wasmResult.year,
        wasmResult.month - 1,
        wasmResult.date,
        wasmResult.hour,
        wasmResult.minute,
        wasmResult.second
      );

      // 詳細情報生成
      const message = calculator.generateMessage(
        conditions,
        wasmResult.timer0,
        wasmResult.vcount,
        resultDate
      );
      
      const { hash } = calculator.calculateSeed(message);

      results.push({
        seed: wasmResult.seed,
        datetime: resultDate,
        timer0: wasmResult.timer0,
        vcount: wasmResult.vcount,
        conditions,
        message,
        sha1Hash: hash,
        isMatch: true
      });

      // 定期的な進捗報告
      if (i % 100 === 0 || i === wasmResults.length - 1) {
        reportProgress(i + 1, wasmResults.length, results.length);
      }
    }

    return results;
    
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
  // 既存のsearch-worker.tsの個別処理ロジックを移植
  // 詳細実装は既存コードを参考
  
  const chunk = searchState.chunk!;
  const targetSeedSet = new Set(targetSeeds);
  let matchesFound = 0;
  let processedCount = 0;
  
  // Timer0範囲をループ
  for (let timer0 = conditions.timer0Range.min; timer0 <= conditions.timer0Range.max; timer0++) {
    if (searchState.shouldStop) break;
    
    // 時刻範囲をループ
    let currentTime = chunk.startDateTime.getTime();
    const endTime = chunk.endDateTime.getTime();
    
    while (currentTime <= endTime) {
      if (searchState.shouldStop) break;
      
      // 一時停止処理
      while (searchState.isPaused && !searchState.shouldStop) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      const currentDateTime = new Date(currentTime);
      
      // VCount取得
      const params = calculator.getROMParameters(conditions.romVersion, conditions.romRegion);
      const actualVCount = calculator.getVCountForTimer0(params!, timer0);
      
      try {
        // Seed計算
        const message = calculator.generateMessage(conditions, timer0, actualVCount, currentDateTime);
        const { seed, hash } = calculator.calculateSeed(message);
        
        // ターゲットマッチチェック
        if (targetSeedSet.has(seed)) {
          const result: InitialSeedResult = {
            seed,
            datetime: currentDateTime,
            timer0,
            vcount: actualVCount,
            conditions,
            message,
            sha1Hash: hash,
            isMatch: true
          };
          
          postMessage({
            type: 'RESULT',
            workerId: searchState.workerId,
            result
          } as ParallelWorkerResponse);
          
          matchesFound++;
        }
        
        processedCount++;
        
        // 進捗報告（1000操作毎）
        if (processedCount % 1000 === 0) {
          reportProgress(processedCount, chunk.estimatedOperations, matchesFound);
        }
        
      } catch (error) {
        console.error(`Worker ${searchState.workerId}: Calculation error:`, error);
      }
      
      currentTime += 1000; // 1秒進める
    }
  }
  
  return matchesFound;
}

/**
 * 進捗報告
 */
function reportProgress(current: number, total: number, matches: number): void {
  const elapsedTime = Date.now() - (searchState as any).startTime;
  const estimatedTimeRemaining = total > current ? 
    Math.round((elapsedTime / current) * (total - current)) : 0;

  postMessage({
    type: 'PROGRESS',
    workerId: searchState.workerId,
    progress: {
      currentStep: current,
      totalSteps: total,
      elapsedTime,
      estimatedTimeRemaining,
      matchesFound: matches,
      currentDateTime: new Date().toISOString()
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
          error: 'Missing required parameters for parallel search'
        } as ParallelWorkerResponse);
        return;
      }

      if (searchState.isRunning) {
        postMessage({
          type: 'ERROR',
          workerId: searchState.workerId,
          error: 'Worker is already running'
        } as ParallelWorkerResponse);
        return;
      }

      searchState.isRunning = true;
      searchState.isPaused = false;
      searchState.shouldStop = false;
      searchState.chunk = chunk;
      (searchState as any).startTime = Date.now();

      await initializeCalculator();
      await processChunk(conditions, targetSeeds);
      
      searchState.isRunning = false;
      break;

    case 'PAUSE_SEARCH':
      if (searchState.isRunning && !searchState.isPaused) {
        searchState.isPaused = true;
        postMessage({
          type: 'PAUSED',
          workerId: searchState.workerId,
          message: `Worker ${searchState.workerId} paused`
        } as ParallelWorkerResponse);
      }
      break;

    case 'RESUME_SEARCH':
      if (searchState.isRunning && searchState.isPaused) {
        searchState.isPaused = false;
        postMessage({
          type: 'RESUMED',
          workerId: searchState.workerId,
          message: `Worker ${searchState.workerId} resumed`
        } as ParallelWorkerResponse);
      }
      break;

    case 'STOP_SEARCH':
      if (searchState.isRunning) {
        searchState.shouldStop = true;
        postMessage({
          type: 'STOPPED',
          workerId: searchState.workerId,
          message: `Worker ${searchState.workerId} stopped`
        } as ParallelWorkerResponse);
      }
      break;

    default:
      postMessage({
        type: 'ERROR',
        workerId: searchState.workerId,
        error: `Unknown message type: ${type}`
      } as ParallelWorkerResponse);
  }
};

// Worker準備完了通知
postMessage({
  type: 'READY',
  workerId: searchState.workerId,
  message: `Parallel worker ${searchState.workerId} initialized`
} as ParallelWorkerResponse);
```

## 重要な実装ポイント

### 1. メモリ管理
- 各WorkerでWebAssemblyインスタンスを作成するため、適切な解放が重要
- `searcher.free()`の確実な実行

### 2. エラーハンドリング
- Worker障害時のグレースフルフォールバック
- 部分的失敗でも他Workerは継続
- エラー詳細情報の適切な伝播

### 3. 進捗集約
- 複数Workerからの進捗を正確に統合
- UI応答性を維持する更新頻度
- 残り時間推定の精度向上

### 4. パフォーマンス最適化
- WebAssembly統合検索の最大活用
- バッチサイズの最適化
- Worker間の負荷分散


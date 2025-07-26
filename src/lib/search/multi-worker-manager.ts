/**
 * 複数WebWorker管理システム
 * 並列検索の調整・監視・結果統合を担当
 */

import { ChunkCalculator } from './chunk-calculator';
import type { 
  SearchConditions, 
  InitialSeedResult, 
  WorkerChunk,
  AggregatedProgress,
  WorkerProgress,
  ParallelWorkerRequest,
  ParallelWorkerResponse
} from '../../types/pokemon';

export interface SearchCallbacks {
  onProgress: (progress: AggregatedProgress) => void;
  onResult: (result: InitialSeedResult) => void;
  onComplete: (message: string) => void;
  onError: (error: string) => void;
  onPaused: () => void;
  onResumed: () => void;
  onStopped: () => void;
}

export class MultiWorkerSearchManager {
  private workers: Map<number, Worker> = new Map();
  private workerProgresses: Map<number, WorkerProgress> = new Map();
  private activeChunks: Map<number, WorkerChunk> = new Map();
  private results: InitialSeedResult[] = [];
  private completedWorkers = 0;
  private callbacks: SearchCallbacks | null = null;
  private startTime: number = 0;
  private searchRunning = false;
  private progressUpdateTimer: number | NodeJS.Timeout | null = null;
  private lastProgressCheck: Map<number, number> = new Map();

  constructor(
    private maxWorkers: number = navigator.hardwareConcurrency || 4
  ) {}

  /**
   * ワーカー数設定
   */
  public setMaxWorkers(count: number): void {
    if (this.searchRunning) {
      console.warn('⚠️ Cannot change worker count during active search');
      return;
    }
    this.maxWorkers = Math.max(1, Math.min(count, navigator.hardwareConcurrency || 4));
    console.log(`🔧 Updated max workers to: ${this.maxWorkers}`);
  }

  /**
   * 現在のワーカー数設定を取得
   */
  public getMaxWorkers(): number {
    return this.maxWorkers;
  }

  /**
   * 並列検索開始
   */
  async startParallelSearch(
    conditions: SearchConditions,
    targetSeeds: number[],
    callbacks: SearchCallbacks
  ): Promise<void> {
    if (this.searchRunning) {
      throw new Error('Search is already running');
    }

    this.callbacks = callbacks;
    this.searchRunning = true;
    this.startTime = Date.now();
    this.resetState();

    try {
      console.log('🚀 Starting parallel search with', this.maxWorkers, 'workers');

      // チャンク分割計算
      const chunks = ChunkCalculator.calculateOptimalChunks(
        conditions, 
        this.maxWorkers
      );

      if (chunks.length === 0) {
        throw new Error('No valid chunks created for search');
      }

      console.log(`📊 Created ${chunks.length} chunks for processing (${this.maxWorkers} workers)`);
      const metrics = ChunkCalculator.evaluateChunkDistribution(chunks);
      console.log(`📈 Load balance score: ${metrics.loadBalanceScore}/100`);

      // 各チャンクに対してWorker初期化
      for (const chunk of chunks) {
        await this.initializeWorker(chunk, conditions, targetSeeds);
      }

      // 進捗監視開始
      this.startProgressMonitoring();

      console.log('✅ All workers initialized and started');

    } catch (error) {
      console.error('❌ Failed to start parallel search:', error);
      this.cleanup();
      callbacks.onError(error instanceof Error ? error.message : 'Unknown error');
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
    try {
      const worker = new Worker(
        new URL('../../workers/parallel-search-worker.ts', import.meta.url),
        { type: 'module' }
      );

      worker.onmessage = (event: MessageEvent<ParallelWorkerResponse>) => {
        this.handleWorkerMessage(chunk.workerId, event.data);
      };

      worker.onerror = (error) => {
        console.error(`❌ Worker ${chunk.workerId} error:`, error);
        this.handleWorkerError(chunk.workerId, new Error(`Worker error: ${error.message}`));
      };

      this.workers.set(chunk.workerId, worker);
      this.activeChunks.set(chunk.workerId, chunk);

      // Worker進捗初期化
      this.workerProgresses.set(chunk.workerId, {
        workerId: chunk.workerId,
        currentStep: 0,
        totalSteps: chunk.estimatedOperations,
        elapsedTime: 0,
        estimatedTimeRemaining: 0,
        matchesFound: 0,
        status: 'initializing'
      });

      // 検索開始メッセージ送信
      const request: ParallelWorkerRequest = {
        type: 'START_SEARCH',
        workerId: chunk.workerId,
        conditions,
        targetSeeds,
        chunk
      };

      worker.postMessage(request);

    } catch (error) {
      console.error(`❌ Failed to initialize worker ${chunk.workerId}:`, error);
      throw error;
    }
  }

  /**
   * Workerメッセージ処理
   */
  private handleWorkerMessage(workerId: number, response: ParallelWorkerResponse): void {
    if (!this.callbacks) return;

    switch (response.type) {
      case 'READY':
        console.log(`✅ Worker ${workerId} ready`);
        break;

      case 'PROGRESS':
        if (response.progress) {
          this.updateWorkerProgress(workerId, response.progress);
        }
        break;

      case 'RESULT':
        if (response.result) {
          // 結果のDateオブジェクト復元
          const result: InitialSeedResult = {
            ...response.result,
            datetime: new Date(response.result.datetime)
          };
          this.results.push(result);
          this.callbacks.onResult(result);

          // マッチ数更新
          const progress = this.workerProgresses.get(workerId);
          if (progress) {
            progress.matchesFound++;
          }
        }
        break;

      case 'COMPLETE':
        console.log(`✅ Worker ${workerId} completed`);
        this.handleWorkerCompletion(workerId);
        break;

      case 'ERROR':
        console.error(`❌ Worker ${workerId} error:`, response.error);
        this.handleWorkerError(workerId, new Error(response.error || 'Unknown worker error'));
        break;

      case 'PAUSED':
        const pausedProgress = this.workerProgresses.get(workerId);
        if (pausedProgress) {
          pausedProgress.status = 'paused';
        }
        break;

      case 'RESUMED':
        const resumedProgress = this.workerProgresses.get(workerId);
        if (resumedProgress) {
          resumedProgress.status = 'running';
        }
        break;

      case 'STOPPED':
        const stoppedProgress = this.workerProgresses.get(workerId);
        if (stoppedProgress) {
          stoppedProgress.status = 'completed';
        }
        break;

      default:
        console.warn(`Unknown worker response type from ${workerId}:`, response);
    }
  }

  /**
   * Worker進捗更新
   */
  private updateWorkerProgress(workerId: number, progressData: any): void {
    const currentProgress = this.workerProgresses.get(workerId);
    if (!currentProgress) return;

    // 進捗データ更新
    currentProgress.currentStep = progressData.currentStep;
    currentProgress.elapsedTime = progressData.elapsedTime;
    currentProgress.estimatedTimeRemaining = progressData.estimatedTimeRemaining;
    currentProgress.matchesFound = progressData.matchesFound;
    currentProgress.status = 'running';

    if (progressData.currentDateTime) {
      currentProgress.currentDateTime = new Date(progressData.currentDateTime);
    }

    // スタック検出用の最終更新時刻記録
    this.lastProgressCheck.set(workerId, Date.now());
  }

  /**
   * 進捗集約とレポート
   */
  private aggregateAndReportProgress(): void {
    // 検索が終了している場合は進捗レポートを停止
    if (!this.searchRunning || !this.callbacks) {
      return;
    }

    const progresses = Array.from(this.workerProgresses.values());
    
    if (progresses.length === 0) return;

    // 集約計算
    const totalCurrentStep = progresses.reduce((sum, p) => sum + p.currentStep, 0);
    const totalSteps = progresses.reduce((sum, p) => sum + p.totalSteps, 0);
    const totalElapsedTime = Date.now() - this.startTime;
    const totalMatchesFound = progresses.reduce((sum, p) => sum + p.matchesFound, 0);
    
    const activeWorkers = progresses.filter(p => 
      p.status === 'running' || p.status === 'initializing'
    ).length;
    
    const completedWorkers = progresses.filter(p => 
      p.status === 'completed'
    ).length;

    // 統合残り時間計算
    const totalEstimatedTimeRemaining = this.calculateAggregatedTimeRemaining(progresses);

    const aggregatedProgress: AggregatedProgress = {
      totalCurrentStep,
      totalSteps,
      totalElapsedTime,
      totalEstimatedTimeRemaining,
      totalMatchesFound,
      activeWorkers,
      completedWorkers,
      workerProgresses: new Map(this.workerProgresses)
    };

    // コールバック実行
    this.callbacks?.onProgress(aggregatedProgress);
  }

  /**
   * 統合残り時間計算
   */
  private calculateAggregatedTimeRemaining(progresses: WorkerProgress[]): number {
    const activeProgresses = progresses.filter(p => 
      p.status === 'running' && p.currentStep > 0
    );

    if (activeProgresses.length === 0) return 0;

    // 各アクティブWorkerの残り時間推定
    const remainingTimes = activeProgresses.map(p => {
      if (p.currentStep === 0) return 0;
      
      const progressRatio = p.currentStep / p.totalSteps;
      if (progressRatio === 0) return 0;
      
      const estimatedTotalTime = p.elapsedTime / progressRatio;
      return Math.max(0, estimatedTotalTime - p.elapsedTime);
    });

    // 最長時間を全体の推定残り時間とする
    return Math.max(...remainingTimes);
  }

  /**
   * Worker完了処理
   */
  private handleWorkerCompletion(workerId: number): void {
    const progress = this.workerProgresses.get(workerId);
    if (progress) {
      progress.status = 'completed';
      progress.currentStep = progress.totalSteps;
    }

    this.completedWorkers++;

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
    const totalResults = this.results.length;
    
    console.log(`🎉 Parallel search completed in ${totalElapsed}ms with ${totalResults} results`);
    
    // 最終進捗状態をクリア（全ワーカー完了状態）
    const finalProgress: AggregatedProgress = {
      totalCurrentStep: 0,
      totalSteps: 0,
      totalElapsedTime: totalElapsed,
      totalEstimatedTimeRemaining: 0,
      totalMatchesFound: totalResults,
      activeWorkers: 0,
      completedWorkers: this.workers.size,
      workerProgresses: new Map()
    };
    
    // 並列進捗をクリア
    this.callbacks?.onProgress(finalProgress);
    
    // onCompleteコールバックを先に実行してからクリーンアップ
    console.log('🔄 About to call onComplete callback:', this.callbacks?.onComplete ? 'exists' : 'missing');
    this.callbacks?.onComplete(
      `Parallel search completed. Found ${totalResults} matches in ${Math.round(totalElapsed / 1000)}s`
    );
    console.log('✅ onComplete callback called');
    
    // コールバック実行後にクリーンアップ
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
    }

    // エラーしたWorkerを除外して継続
    const worker = this.workers.get(workerId);
    if (worker) {
      worker.terminate();
      this.workers.delete(workerId);
    }

    // 残りWorkerが0になった場合は終了
    if (this.workers.size === 0) {
      this.cleanup();
      this.callbacks?.onError('All workers failed');
    }
  }

  /**
   * 進捗監視開始
   */
  private startProgressMonitoring(): void {
    // Node.js環境での互換性
    this.progressUpdateTimer = setInterval(() => {
      this.aggregateAndReportProgress();
      this.detectAndHandleStalls();
    }, 500); // 500ms間隔
  }

  /**
   * スタック検出・対処
   */
  private detectAndHandleStalls(): void {
    const now = Date.now();
    const stallThreshold = 60000; // 60秒

    for (const [workerId, lastUpdate] of this.lastProgressCheck.entries()) {
      if (now - lastUpdate > stallThreshold) {
        const progress = this.workerProgresses.get(workerId);
        if (progress && progress.status === 'running') {
          console.warn(`⚠️ Worker ${workerId} has not reported progress for ${stallThreshold/1000}s (possibly heavy computation)`);
          
          // Note: Worker restart is not implemented - this is just a monitoring warning
          // Heavy WASM calculations may legitimately take longer than the threshold
        }
      }
    }
  }

  /**
   * 全Worker停止
   */
  public terminateAll(): void {
    console.log('🛑 Terminating all workers');
    const callbacks = this.callbacks; // コールバックを保存
    this.cleanup();
    callbacks?.onStopped();
  }

  /**
   * 一時停止
   */
  public pauseAll(): void {
    console.log('⏸️ Pausing all workers');
    for (const worker of this.workers.values()) {
      const request: ParallelWorkerRequest = {
        type: 'PAUSE_SEARCH',
        workerId: -1 // Will be ignored
      };
      worker.postMessage(request);
    }
    this.callbacks?.onPaused();
  }

  /**
   * 再開
   */
  public resumeAll(): void {
    console.log('▶️ Resuming all workers');
    for (const worker of this.workers.values()) {
      const request: ParallelWorkerRequest = {
        type: 'RESUME_SEARCH',
        workerId: -1 // Will be ignored
      };
      worker.postMessage(request);
    }
    this.callbacks?.onResumed();
  }

  /**
   * 実行状態取得
   */
  public isRunning(): boolean {
    return this.searchRunning;
  }

  /**
   * アクティブWorker数取得
   */
  public getActiveWorkerCount(): number {
    return this.workers.size;
  }

  /**
   * 結果数取得
   */
  public getResultsCount(): number {
    return this.results.length;
  }

  /**
   * クリーンアップ
   */
  private cleanup(): void {
    // 進捗監視停止
    if (this.progressUpdateTimer) {
      clearInterval(this.progressUpdateTimer);
      this.progressUpdateTimer = null;
    }

    // 全Worker終了
    for (const worker of this.workers.values()) {
      worker.terminate();
    }

    this.searchRunning = false;
    this.callbacks = null;
  }

  /**
   * 状態リセット
   */
  private resetState(): void {
    this.workers.clear();
    this.workerProgresses.clear();
    this.activeChunks.clear();
    this.results = [];
    this.completedWorkers = 0;
    this.lastProgressCheck.clear();
    
    // 進捗監視タイマーも確実に停止
    if (this.progressUpdateTimer) {
      clearInterval(this.progressUpdateTimer);
      this.progressUpdateTimer = null;
    }
  }
}

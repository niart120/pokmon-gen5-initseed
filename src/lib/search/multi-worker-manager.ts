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
import { log } from 'console';

export interface SearchCallbacks {
  onProgress: (progress: AggregatedProgress) => void;
  onResult: (result: InitialSeedResult) => void;
  onComplete: (message: string) => void;
  onError: (error: string) => void;
  onPaused: () => void;
  onResumed: () => void;
  onStopped: () => void;
}

// Timer state for accurate elapsed time calculation
interface ManagerTimerState {
  cumulativeRunTime: number;  // 累積実行時間（ミリ秒）
  segmentStartTime: number;   // 現在セグメント開始時刻
  isPaused: boolean;          // 一時停止状態
}

export class MultiWorkerSearchManager {
  private workers: Map<number, Worker> = new Map();
  private workerProgresses: Map<number, WorkerProgress> = new Map();
  private activeChunks: Map<number, WorkerChunk> = new Map();
  private results: InitialSeedResult[] = [];
  private completedWorkers = 0;
  private callbacks: SearchCallbacks | null = null;
  private startTime: number = 0; // 後方互換性のため保持
  private searchRunning = false;
  private progressUpdateTimer: number | NodeJS.Timeout | null = null;
  private lastProgressCheck: Map<number, number> = new Map();
  
  // Manager timer state for elapsed time management
  private timerState: ManagerTimerState = {
    cumulativeRunTime: 0,
    segmentStartTime: 0,
    isPaused: false
  };

  constructor(
    private maxWorkers: number = navigator.hardwareConcurrency || 4
  ) {}

  /**
   * Timer management functions for accurate elapsed time calculation
   */
  private startManagerTimer(): void {
    this.timerState.cumulativeRunTime = 0;
    this.timerState.segmentStartTime = Date.now();
    this.timerState.isPaused = false;
  }

  private pauseManagerTimer(): void {
    if (!this.timerState.isPaused) {
      this.timerState.cumulativeRunTime += Date.now() - this.timerState.segmentStartTime;
      this.timerState.isPaused = true;
    }
  }

  private resumeManagerTimer(): void {
    if (this.timerState.isPaused) {
      this.timerState.segmentStartTime = Date.now();
      this.timerState.isPaused = false;
    }
  }

  private getManagerElapsedTime(): number {
    return this.timerState.isPaused 
      ? this.timerState.cumulativeRunTime
      : this.timerState.cumulativeRunTime + (Date.now() - this.timerState.segmentStartTime);
  }

  /**
   * ワーカー数設定
   */
  public setMaxWorkers(count: number): void {
    if (this.searchRunning) {
      console.warn('Cannot change worker count during active search');
      return;
    }
    this.maxWorkers = Math.max(1, Math.min(count, navigator.hardwareConcurrency || 4));
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

    // 🧹 開始前に前回のリソースを安全にクリーンアップ
    this.safeCleanup();

    this.callbacks = callbacks;
    this.searchRunning = true;
    this.startTime = Date.now(); // 後方互換性のため保持
    
    // Start accurate manager timer for elapsed time calculation
    this.startManagerTimer();
    
    // resetState()は不要（safeCleanupで実行済み）

    try {
      // チャンク分割計算
      const chunks = ChunkCalculator.calculateOptimalChunks(
        conditions, 
        this.maxWorkers
      );

      if (chunks.length === 0) {
        throw new Error('No valid chunks created for search');
      }

      // 各チャンクに対してWorker初期化
      for (const chunk of chunks) {
        await this.initializeWorker(chunk, conditions, targetSeeds);
      }

      // 進捗監視開始
      this.startProgressMonitoring();

    } catch (error) {
      console.error('Failed to start parallel search:', error);
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
    const totalElapsedTime = this.getManagerElapsedTime(); // マネージャータイマーを使用
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
    const totalElapsed = this.getManagerElapsedTime(); // 一時停止時間を除外した正確な時間
    const totalResults = this.results.length;
    
    console.log(`🎉 Parallel search completed in ${totalElapsed}ms with ${totalResults} results`);
    
    // 完了時の実際の進捗数を計算（Speed表示保持のため）
    const progresses = Array.from(this.workerProgresses.values());
    const finalTotalCurrentStep = progresses.reduce((sum, p) => sum + p.currentStep, 0);
    const finalTotalSteps = progresses.reduce((sum, p) => sum + p.totalSteps, 0);
    
    // 最終進捗状態（統計表示用にworkerProgressesを保持）
    const finalProgress: AggregatedProgress = {
      totalCurrentStep: finalTotalCurrentStep, // 実際の処理済み数を保持
      totalSteps: finalTotalSteps, // 実際の総ステップ数を保持
      totalElapsedTime: totalElapsed,
      totalEstimatedTimeRemaining: 0,
      totalMatchesFound: totalResults,
      activeWorkers: 0,
      completedWorkers: this.workers.size,
      workerProgresses: this.workerProgresses // 🧊 統計表示のため保持
    };
    
    // 最終進捗を送信（統計情報含む）
    this.callbacks?.onProgress(finalProgress);
    
    // onCompleteコールバックを先に実行してからクリーンアップ
    this.callbacks?.onComplete(
      `Parallel search completed. Found ${totalResults} matches in ${Math.round(totalElapsed / 1000)}s`
    );
    
    // 統計表示保持のため最小限クリーンアップのみ
    this.minimalCleanup();
  }

  /**
   * Workerエラー処理
   */
  private handleWorkerError(workerId: number, error: Error): void {
    console.error(`Worker ${workerId} error:`, error);
    
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
    const callbacks = this.callbacks; // コールバックを保存
    this.cleanup();
    callbacks?.onStopped();
  }

  /**
   * 一時停止
   */
  public pauseAll(): void {
    // マネージャータイマーを一時停止
    this.pauseManagerTimer();
    
    console.info('Pausing all workers...');
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
    // マネージャータイマーを再開
    this.resumeManagerTimer();
    
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
   * 最小限クリーンアップ（統計情報完全保持）
   * 完了時に呼び出してメモリリークを防止しつつ統計表示を維持
   */
  private minimalCleanup(): void {
    // 進捗監視停止
    if (this.progressUpdateTimer) {
      clearInterval(this.progressUpdateTimer);
      this.progressUpdateTimer = null;
    }

    // Worker終了＋参照クリア（メモリリーク防止の核心）
    for (const worker of this.workers.values()) {
      worker.terminate();
    }
    this.workers.clear();

    // コールバック切断・実行状態解除
    this.callbacks = null;
    this.searchRunning = false;

    // 🧊 統計表示用データは全て保持（検索完了後の確認を可能にする）
    // this.workerProgresses.clear(); ← 保持して統計表示継続
    // this.completedWorkers = 0; ← 保持して完了状態維持
    
    // 🗑️ 最小限のクリア（次回検索で初期化されるため影響なし）
    this.activeChunks.clear();
    this.lastProgressCheck.clear();
    this.results = [];
  }

  /**
   * 安全なクリーンアップ（統計情報保持）
   * 次回検索開始時に呼び出して、メモリリークを防止しつつ統計表示を維持
   */
  public safeCleanup(): void {
    // 進捗監視停止
    if (this.progressUpdateTimer) {
      clearInterval(this.progressUpdateTimer);
      this.progressUpdateTimer = null;
    }

    // Worker終了＋参照クリア（メモリリーク防止の核心）
    for (const worker of this.workers.values()) {
      worker.terminate();
    }
    this.workers.clear();

    // コールバック切断
    this.callbacks = null;
    this.searchRunning = false;

    // 統計表示用データは保持（検索完了直後の確認を可能にする）
    // this.workerProgresses.clear(); ← 保持して統計表示継続
    
    // 🗑️ 不要データのクリア
    this.activeChunks.clear();
    this.lastProgressCheck.clear();
    this.results = [];
    this.completedWorkers = 0;
  }

  /**
   * 完全クリーンアップ
   */
  private cleanup(): void {
    this.safeCleanup();
    
    // 統計情報も完全クリア
    this.workerProgresses.clear();
  }
}

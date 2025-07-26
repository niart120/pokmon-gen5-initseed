/**
 * Manager for search Web Worker
 * Handles communication between main thread and search worker
 * Extended with parallel search capabilities
 */

import type { SearchConditions, InitialSeedResult, AggregatedProgress } from '../../types/pokemon';
import type { WorkerRequest, WorkerResponse } from '../../workers/search-worker';
import { MultiWorkerSearchManager } from './multi-worker-manager';

export interface SearchCallbacks {
  onProgress: (progress: {
    currentStep: number;
    totalSteps: number;
    elapsedTime: number;
    estimatedTimeRemaining: number;
    matchesFound: number;
    currentDateTime?: Date;
  }) => void;
  onResult: (result: InitialSeedResult) => void;
  onComplete: (message: string) => void;
  onError: (error: string) => void;
  onPaused: () => void;
  onResumed: () => void;
  onStopped: () => void;
  onParallelProgress?: (progress: AggregatedProgress | null) => void;
}

export class SearchWorkerManager {
  private worker: Worker | null = null;
  private callbacks: SearchCallbacks | null = null;
  private singleWorkerMode: boolean = true;
  private multiWorkerManager: MultiWorkerSearchManager | null = null;

  constructor() {
    this.initializeWorker();
  }

  private initializeWorker() {
    try {
      // Create worker with Vite's URL constructor
      this.worker = new Worker(
        new URL('../../workers/search-worker.ts', import.meta.url),
        { type: 'module' }
      );

      this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        this.handleWorkerMessage(event.data);
      };

      this.worker.onerror = (error) => {
        console.error('Worker error:', error);
        this.callbacks?.onError('Worker error occurred');
      };

    } catch (error) {
      console.error('Failed to initialize search worker:', error);
      this.worker = null;
    }
  }

  private handleWorkerMessage(response: WorkerResponse) {
    if (!this.callbacks) return;

    switch (response.type) {
      case 'READY':
        console.log('🚀 Search worker ready');
        break;

      case 'PROGRESS':
        if (response.progress) {
          this.callbacks.onProgress({
            ...response.progress,
            currentDateTime: response.progress.currentDateTime ? 
              new Date(response.progress.currentDateTime) : undefined
          });
        }
        break;

      case 'RESULT':
        if (response.result) {
          // Convert ISO string back to Date object
          const result: InitialSeedResult = {
            ...response.result,
            datetime: new Date(response.result.datetime)
          };
          this.callbacks.onResult(result);
        }
        break;

      case 'COMPLETE':
        this.callbacks.onComplete(response.message || 'Search completed');
        break;

      case 'ERROR':
        this.callbacks.onError(response.error || 'Unknown error');
        break;

      case 'PAUSED':
        this.callbacks.onPaused();
        break;

      case 'RESUMED':
        this.callbacks.onResumed();
        break;

      case 'STOPPED':
        this.callbacks.onStopped();
        break;

      default:
        console.warn('Unknown worker response type:', response);
    }
  }

  public startSearch(
    conditions: SearchConditions, 
    targetSeeds: number[], 
    callbacks: SearchCallbacks
  ): boolean {
    this.callbacks = callbacks;

    // 並列検索モードの場合
    if (!this.singleWorkerMode) {
      return this.startParallelSearch(conditions, targetSeeds, callbacks);
    }

    // 従来の単一Workerモード
    if (!this.worker) {
      callbacks.onError('Worker not available. Falling back to main thread.');
      return false;
    }

    const request: WorkerRequest = {
      type: 'START_SEARCH',
      conditions,
      targetSeeds
    };

    this.worker.postMessage(request);
    return true;
  }

  /**
   * 並列検索開始
   */
  private startParallelSearch(
    conditions: SearchConditions,
    targetSeeds: number[],
    callbacks: SearchCallbacks
  ): boolean {
    try {
      if (!this.multiWorkerManager) {
        this.multiWorkerManager = new MultiWorkerSearchManager();
      }

      // アプリストアから現在のワーカー数設定を取得
      // 注意: ここでは直接importを避けて、公開APIを使用
      const currentMaxWorkers = this.getMaxWorkers();
      this.multiWorkerManager.setMaxWorkers(currentMaxWorkers);

      // 並列検索用のコールバック変換
      const parallelCallbacks = {
        onProgress: (aggregatedProgress: AggregatedProgress) => {
          // 既存の進捗フォーマットに変換
          callbacks.onProgress({
            currentStep: aggregatedProgress.totalCurrentStep,
            totalSteps: aggregatedProgress.totalSteps,
            elapsedTime: aggregatedProgress.totalElapsedTime,
            estimatedTimeRemaining: aggregatedProgress.totalEstimatedTimeRemaining,
            matchesFound: aggregatedProgress.totalMatchesFound
          });

          // 並列進捗情報も送信（利用可能な場合）
          if (callbacks.onParallelProgress) {
            callbacks.onParallelProgress(aggregatedProgress);
          }
        },
        onResult: callbacks.onResult,
        onComplete: (message: string) => {
          // 並列進捗をクリア
          if (callbacks.onParallelProgress) {
            callbacks.onParallelProgress(null);
          }
          callbacks.onComplete(message);
        },
        onError: (error: string) => {
          // 並列進捗をクリア
          if (callbacks.onParallelProgress) {
            callbacks.onParallelProgress(null);
          }
          callbacks.onError(error);
        },
        onPaused: callbacks.onPaused,
        onResumed: callbacks.onResumed,
        onStopped: callbacks.onStopped
      };

      this.multiWorkerManager.startParallelSearch(conditions, targetSeeds, parallelCallbacks);
      return true;

    } catch (error) {
      console.error('Failed to start parallel search:', error);
      callbacks.onError('Failed to start parallel search. Falling back to single worker mode.');
      
      // フォールバック: 単一Workerモードに切り替え
      this.singleWorkerMode = true;
      return this.startSearch(conditions, targetSeeds, callbacks);
    }
  }

  public pauseSearch() {
    if (!this.singleWorkerMode && this.multiWorkerManager) {
      this.multiWorkerManager.pauseAll();
    } else if (this.worker) {
      const request: WorkerRequest = { type: 'PAUSE_SEARCH' };
      this.worker.postMessage(request);
    }
  }

  public resumeSearch() {
    if (!this.singleWorkerMode && this.multiWorkerManager) {
      this.multiWorkerManager.resumeAll();
    } else if (this.worker) {
      const request: WorkerRequest = { type: 'RESUME_SEARCH' };
      this.worker.postMessage(request);
    }
  }

  public stopSearch() {
    if (!this.singleWorkerMode && this.multiWorkerManager) {
      this.multiWorkerManager.terminateAll();
    } else if (this.worker) {
      const request: WorkerRequest = { type: 'STOP_SEARCH' };
      this.worker.postMessage(request);
    }
  }

  /**
   * 並列検索モードの設定
   */
  public setParallelMode(enabled: boolean): void {
    this.singleWorkerMode = !enabled;
    
    if (enabled && !this.multiWorkerManager) {
      this.multiWorkerManager = new MultiWorkerSearchManager();
    }
    
    console.log(`🔧 Search mode: ${enabled ? 'Parallel' : 'Single'} worker`);
  }

  /**
   * ワーカー数設定
   */
  public setMaxWorkers(count: number): void {
    if (!this.multiWorkerManager) {
      this.multiWorkerManager = new MultiWorkerSearchManager();
    }
    this.multiWorkerManager.setMaxWorkers(count);
  }

  /**
   * 現在のワーカー数設定を取得
   */
  public getMaxWorkers(): number {
    if (!this.multiWorkerManager) {
      return navigator.hardwareConcurrency || 4;
    }
    return this.multiWorkerManager.getMaxWorkers();
  }

  /**
   * 並列検索の利用可能性確認
   */
  public isParallelSearchAvailable(): boolean {
    return (navigator.hardwareConcurrency ?? 1) > 1;
  }

  /**
   * 現在のモード取得
   */
  public isParallelMode(): boolean {
    return !this.singleWorkerMode;
  }

  public terminate() {
    if (this.multiWorkerManager) {
      this.multiWorkerManager.terminateAll();
      this.multiWorkerManager = null;
    }
    
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.callbacks = null;
  }

  public isWorkerAvailable(): boolean {
    return this.worker !== null;
  }
}

// Singleton instance
let workerManager: SearchWorkerManager | null = null;

export function getSearchWorkerManager(): SearchWorkerManager {
  if (!workerManager) {
    workerManager = new SearchWorkerManager();
  }
  return workerManager;
}

/**
 * ワーカーマネージャーのシングルトンインスタンスを完全にリセット
 * メモリリーク防止のため、検索完了時に呼び出し推奨
 */
export function resetSearchWorkerManager(): void {
  if (workerManager) {
    workerManager.terminate();
    workerManager = null;
  }
}

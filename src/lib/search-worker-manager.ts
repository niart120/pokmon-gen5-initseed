/**
 * Manager for search Web Worker
 * Handles communication between main thread and search worker
 */

import type { SearchConditions, InitialSeedResult } from '../types/pokemon';
import type { WorkerRequest, WorkerResponse } from '../workers/search-worker';

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
}

export class SearchWorkerManager {
  private worker: Worker | null = null;
  private callbacks: SearchCallbacks | null = null;

  constructor() {
    this.initializeWorker();
  }

  private initializeWorker() {
    try {
      // Create worker with Vite's URL constructor
      this.worker = new Worker(
        new URL('../workers/search-worker.ts', import.meta.url),
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
    if (!this.worker) {
      callbacks.onError('Worker not available. Falling back to main thread.');
      return false;
    }

    this.callbacks = callbacks;

    const request: WorkerRequest = {
      type: 'START_SEARCH',
      conditions,
      targetSeeds
    };

    this.worker.postMessage(request);
    return true;
  }

  public pauseSearch() {
    if (this.worker) {
      const request: WorkerRequest = { type: 'PAUSE_SEARCH' };
      this.worker.postMessage(request);
    }
  }

  public resumeSearch() {
    if (this.worker) {
      const request: WorkerRequest = { type: 'RESUME_SEARCH' };
      this.worker.postMessage(request);
    }
  }

  public stopSearch() {
    if (this.worker) {
      const request: WorkerRequest = { type: 'STOP_SEARCH' };
      this.worker.postMessage(request);
    }
  }

  public terminate() {
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

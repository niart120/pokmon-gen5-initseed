import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useAppStore } from '../store/app-store';

describe('Phase 4: 並列検索UI統合テスト', () => {
  beforeEach(() => {
    // Zustandストアをリセット
    const store = useAppStore.getState();
    store.clearSearchResults();
    store.setSearchProgress({
      isRunning: false,
      isPaused: false,
      currentStep: 0,
      totalSteps: 0,
      elapsedTime: 0,
      estimatedTimeRemaining: 0,
      matchesFound: 0,
      currentDateTime: null,
    });
    store.setParallelProgress(null);
  });

  describe('並列検索設定ストア', () => {
    it('並列検索の有効/無効を切り替えできる', () => {
      const store = useAppStore.getState();
      
      // 初期状態は無効
      expect(store.parallelSearchSettings.enabled).toBe(false);
      
      // 有効化
      store.setParallelSearchEnabled(true);
      expect(useAppStore.getState().parallelSearchSettings.enabled).toBe(true);
      
      // 無効化
      store.setParallelSearchEnabled(false);
      expect(useAppStore.getState().parallelSearchSettings.enabled).toBe(false);
    });

    it('Worker数を適切に設定できる', () => {
      const store = useAppStore.getState();
      const maxCpuCores = navigator.hardwareConcurrency || 4;
      
      // 最大値まで設定可能
      store.setMaxWorkers(maxCpuCores);
      expect(useAppStore.getState().parallelSearchSettings.maxWorkers).toBe(maxCpuCores);
      
      // 最小値チェック
      store.setMaxWorkers(1);
      expect(useAppStore.getState().parallelSearchSettings.maxWorkers).toBe(1);
      
      // 中間値チェック
      const midValue = Math.floor(maxCpuCores / 2);
      store.setMaxWorkers(midValue);
      expect(useAppStore.getState().parallelSearchSettings.maxWorkers).toBe(midValue);
    });

    it('検索設定の状態管理が正しく動作する', () => {
      const store = useAppStore.getState();
      
      // 並列検索を有効化し、Worker数を設定
      store.setParallelSearchEnabled(true);
      store.setMaxWorkers(4);
      
      const state = useAppStore.getState();
      expect(state.parallelSearchSettings.enabled).toBe(true);
      expect(state.parallelSearchSettings.maxWorkers).toBe(4);
    });
  });

  describe('並列進捗管理', () => {
    it('Worker別進捗を正しく保存・取得する', () => {
      const store = useAppStore.getState();
      
      // 並列進捗データを設定
      const mockParallelProgress = {
        totalCurrentStep: 500,
        totalSteps: 1000,
        totalElapsedTime: 2000,
        totalEstimatedTimeRemaining: 2000,
        totalMatchesFound: 2,
        activeWorkers: 2,
        completedWorkers: 0,
        workerProgresses: new Map([
          [1, {
            workerId: 1,
            currentStep: 300,
            totalSteps: 500,
            elapsedTime: 1200,
            estimatedTimeRemaining: 800,
            matchesFound: 1,
            status: 'running' as const,
            currentDateTime: new Date('2025-01-01T10:00:00Z'),
          }],
          [2, {
            workerId: 2,
            currentStep: 200,
            totalSteps: 500,
            elapsedTime: 800,
            estimatedTimeRemaining: 1200,
            matchesFound: 1,
            status: 'running' as const,
            currentDateTime: new Date('2025-01-01T10:05:00Z'),
          }],
        ]),
      };
      
      store.setParallelProgress(mockParallelProgress);
      
      const state = useAppStore.getState();
      expect(state.parallelProgress).toEqual(mockParallelProgress);
      expect(state.parallelProgress?.activeWorkers).toBe(2);
      expect(state.parallelProgress?.totalMatchesFound).toBe(2);
      
      // Worker個別進捗の確認
      const worker1 = state.parallelProgress?.workerProgresses.get(1);
      expect(worker1?.workerId).toBe(1);
      expect(worker1?.currentStep).toBe(300);
      expect(worker1?.status).toBe('running');
    });

    it('パフォーマンス指標を正しく管理する', () => {
      const store = useAppStore.getState();
      
      const mockProgress = {
        totalCurrentStep: 1000,
        totalSteps: 10000,
        totalElapsedTime: 5000, // 5秒
        totalEstimatedTimeRemaining: 45000,
        totalMatchesFound: 3,
        activeWorkers: 4,
        completedWorkers: 0,
        workerProgresses: new Map(),
      };
      
      store.setParallelProgress(mockProgress);
      
      const state = useAppStore.getState();
      expect(state.parallelProgress).toBeDefined();
      
      // 計算速度の確認（UI側で計算される想定）
      const speed = mockProgress.totalCurrentStep / (mockProgress.totalElapsedTime / 1000);
      expect(speed).toBe(200); // 200 calc/sec
      
      // マッチ率の確認
      const matchRate = (mockProgress.totalMatchesFound / mockProgress.totalCurrentStep) * 100;
      expect(matchRate).toBe(0.3); // 0.3%
    });

    it('並列進捗のクリアが正しく動作する', () => {
      const store = useAppStore.getState();
      
      // 進捗データを設定
      const mockProgress = {
        totalCurrentStep: 100,
        totalSteps: 1000,
        totalElapsedTime: 1000,
        totalEstimatedTimeRemaining: 9000,
        totalMatchesFound: 1,
        activeWorkers: 2,
        completedWorkers: 0,
        workerProgresses: new Map(),
      };
      
      store.setParallelProgress(mockProgress);
      expect(useAppStore.getState().parallelProgress).toBeDefined();
      
      // クリア
      store.setParallelProgress(null);
      expect(useAppStore.getState().parallelProgress).toBeNull();
    });
  });

  describe('Worker状態管理', () => {
    it('異なるWorker状態を正しく管理する', () => {
      const store = useAppStore.getState();
      
      // 複数状態のWorkerを含む進捗
      const mixedStatusProgress = {
        totalCurrentStep: 300,
        totalSteps: 1000,
        totalElapsedTime: 3000,
        totalEstimatedTimeRemaining: 7000,
        totalMatchesFound: 1,
        activeWorkers: 2,
        completedWorkers: 1,
        workerProgresses: new Map([
          [1, {
            workerId: 1,
            currentStep: 100,
            totalSteps: 333,
            elapsedTime: 1000,
            estimatedTimeRemaining: 2330,
            matchesFound: 1,
            status: 'completed' as const,
            currentDateTime: undefined,
          }],
          [2, {
            workerId: 2,
            currentStep: 100,
            totalSteps: 333,
            elapsedTime: 1000,
            estimatedTimeRemaining: 2330,
            matchesFound: 0,
            status: 'running' as const,
            currentDateTime: new Date(),
          }],
          [3, {
            workerId: 3,
            currentStep: 50,
            totalSteps: 334,
            elapsedTime: 500,
            estimatedTimeRemaining: 3000,
            matchesFound: 0,
            status: 'error' as const,
            currentDateTime: undefined,
          }],
        ]),
      };
      
      store.setParallelProgress(mixedStatusProgress);
      
      const state = useAppStore.getState();
      expect(state.parallelProgress?.completedWorkers).toBe(1);
      expect(state.parallelProgress?.activeWorkers).toBe(2);
      
      // 各Worker状態の確認
      const workers = state.parallelProgress?.workerProgresses;
      expect(workers?.get(1)?.status).toBe('completed');
      expect(workers?.get(2)?.status).toBe('running');
      expect(workers?.get(3)?.status).toBe('error');
    });
  });

  describe('UI計算ロジック検証', () => {
    it('パフォーマンス指標の計算が正確', () => {
      // 計算速度テスト
      const elapsedMs = 5000;
      const currentStep = 1000;
      const expectedSpeed = Math.round(currentStep / (elapsedMs / 1000));
      expect(expectedSpeed).toBe(200);
      
      // マッチ率テスト
      const matches = 3;
      const total = 1000;
      const expectedRate = Number(((matches / total) * 100).toFixed(4));
      expect(expectedRate).toBe(0.3);
      
      // 進捗パーセンテージテスト
      const progress = 250;
      const totalSteps = 1000;
      const expectedPercentage = Number(((progress / totalSteps) * 100).toFixed(2));
      expect(expectedPercentage).toBe(25);
    });

    it('効率性指標の計算が正確', () => {
      const maxCpuCores = navigator.hardwareConcurrency || 4;
      
      // フル活用の場合
      const activeWorkers = maxCpuCores;
      const efficiency = Math.round((activeWorkers / maxCpuCores) * 100);
      expect(efficiency).toBe(100);
      
      // 部分利用の場合
      const partialWorkers = Math.floor(maxCpuCores / 2);
      const partialEfficiency = Math.round((partialWorkers / maxCpuCores) * 100);
      expect(partialEfficiency).toBe(Math.round(50));
    });

    it('メモリ使用量推定が適切', () => {
      const workersCount = 4;
      const memoryPerWorker = 15; // MB
      const expectedMemory = workersCount * memoryPerWorker;
      expect(expectedMemory).toBe(60);
    });
  });

  describe('エラーケース処理', () => {
    it('不正なWorker数設定を適切に処理', () => {
      const store = useAppStore.getState();
      
      // 0以下の値（実際のUIでは防がれる想定だが、ストアレベルでのテスト）
      store.setMaxWorkers(0);
      // Zustandはそのまま保存するが、UI側で制限する想定
      expect(useAppStore.getState().parallelSearchSettings.maxWorkers).toBe(0);
      
      // 負の値
      store.setMaxWorkers(-1);
      expect(useAppStore.getState().parallelSearchSettings.maxWorkers).toBe(-1);
      
      // 正常値に復旧
      store.setMaxWorkers(2);
      expect(useAppStore.getState().parallelSearchSettings.maxWorkers).toBe(2);
    });

    it('不完全な並列進捗データでもエラーなし', () => {
      const store = useAppStore.getState();
      
      // 空のWorkerMapでもエラーにならない
      const emptyProgress = {
        totalCurrentStep: 0,
        totalSteps: 1000,
        totalElapsedTime: 0,
        totalEstimatedTimeRemaining: 0,
        totalMatchesFound: 0,
        activeWorkers: 0,
        completedWorkers: 0,
        workerProgresses: new Map(),
      };
      
      expect(() => {
        store.setParallelProgress(emptyProgress);
      }).not.toThrow();
      
      const state = useAppStore.getState();
      expect(state.parallelProgress?.activeWorkers).toBe(0);
      expect(state.parallelProgress?.workerProgresses.size).toBe(0);
    });
  });
});

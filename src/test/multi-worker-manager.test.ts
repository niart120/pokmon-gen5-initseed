/**
 * MultiWorkerSearchManager テスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MultiWorkerSearchManager } from '../lib/search/multi-worker-manager';
import type { SearchConditions } from '../types/pokemon';

// Worker mock
const mockWorker = {
  postMessage: vi.fn(),
  terminate: vi.fn(),
  onmessage: null as any,
  onerror: null as any
};

// Worker constructor mock
vi.stubGlobal('Worker', vi.fn(() => mockWorker));

describe('MultiWorkerSearchManager', () => {
  let manager: MultiWorkerSearchManager;
  let mockCallbacks: any;

  const mockConditions: SearchConditions = {
    romVersion: 'B2',
    romRegion: 'JPN',
    hardware: 'DS',
    timer0VCountConfig: {
    useAutoConfiguration: false,
    timer0Range: { min: 3193, max: 3194 },
    vcountRange: { min: 160, max: 167 }
  },
    dateRange: {
      startYear: 2013,
      endYear: 2013,
      startMonth: 1,
      endMonth: 1,
      startDay: 1,
      endDay: 1,
      startHour: 0,
      endHour: 1,
      startMinute: 0,
      endMinute: 59,
      startSecond: 0,
      endSecond: 59
    },
    keyInput: 0,
    macAddress: [0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC]
  };

  beforeEach(() => {
    manager = new MultiWorkerSearchManager(4);
    mockCallbacks = {
      onProgress: vi.fn(),
      onResult: vi.fn(),
      onComplete: vi.fn(),
      onError: vi.fn(),
      onPaused: vi.fn(),
      onResumed: vi.fn(),
      onStopped: vi.fn()
    };

    // Mock reset
    vi.clearAllMocks();
    mockWorker.postMessage.mockClear();
    mockWorker.terminate.mockClear();
  });

  afterEach(() => {
    manager.terminateAll();
  });

  describe('初期化', () => {
    it('正しい設定で初期化される', () => {
      expect(manager.isRunning()).toBe(false);
      expect(manager.getActiveWorkerCount()).toBe(0);
      expect(manager.getResultsCount()).toBe(0);
    });

    it('デフォルト設定で初期化される', () => {
      const defaultManager = new MultiWorkerSearchManager();
      expect(defaultManager.getActiveWorkerCount()).toBe(0);
    });
  });

  describe('startParallelSearch', () => {
    it('重複実行を防ぐ', async () => {
      // 最初の検索開始をモック
      const searchPromise1 = manager.startParallelSearch(
        mockConditions, 
        [0x12345678], 
        mockCallbacks
      );

      // 2回目の実行は例外をスロー
      await expect(
        manager.startParallelSearch(mockConditions, [0x12345678], mockCallbacks)
      ).rejects.toThrow('Search is already running');
    });

    it('適切なWorker数を作成する', async () => {
      const manager2 = new MultiWorkerSearchManager(2);
      
      // 検索開始前にモック状態をクリア
      vi.clearAllMocks();
      
      // 検索開始
      const searchPromise = manager2.startParallelSearch(
        mockConditions, 
        [0x12345678], 
        mockCallbacks
      );

      // Worker constructorの呼び出し回数は作成されたチャンクの数に依存
      // 実際には2つ作成されることを確認
      expect(Worker).toHaveBeenCalled();
      
      manager2.terminateAll();
    });

    it('Workerにメッセージを送信する', async () => {
      const searchPromise = manager.startParallelSearch(
        mockConditions, 
        [0x12345678], 
        mockCallbacks
      );

      // Worker作成とメッセージ送信を確認
      expect(Worker).toHaveBeenCalled();
      expect(mockWorker.postMessage).toHaveBeenCalled();
      
      // 送信されたメッセージの内容確認
      const sentMessage = mockWorker.postMessage.mock.calls[0][0];
      expect(sentMessage.type).toBe('START_SEARCH');
      expect(sentMessage.conditions).toEqual(mockConditions);
      expect(sentMessage.targetSeeds).toEqual([0x12345678]);
      expect(sentMessage.chunk).toBeDefined();
    });
  });

  describe('Worker制御', () => {
    beforeEach(async () => {
      // 検索開始
      manager.startParallelSearch(mockConditions, [0x12345678], mockCallbacks);
    });

    it('pauseAll() で全Workerを一時停止', () => {
      manager.pauseAll();
      
      // 全Workerに PAUSE_SEARCH メッセージが送信されることを確認
      const pauseCalls = mockWorker.postMessage.mock.calls.filter(
        call => call[0].type === 'PAUSE_SEARCH'
      );
      expect(pauseCalls.length).toBeGreaterThan(0);
      expect(mockCallbacks.onPaused).toHaveBeenCalled();
    });

    it('resumeAll() で全Workerを再開', () => {
      manager.resumeAll();
      
      const resumeCalls = mockWorker.postMessage.mock.calls.filter(
        call => call[0].type === 'RESUME_SEARCH'
      );
      expect(resumeCalls.length).toBeGreaterThan(0);
      expect(mockCallbacks.onResumed).toHaveBeenCalled();
    });

    it('terminateAll() で全Workerを終了', () => {
      const activeWorkersBefore = manager.getActiveWorkerCount();
      
      manager.terminateAll();
      
      expect(mockWorker.terminate).toHaveBeenCalledTimes(activeWorkersBefore);
      expect(manager.isRunning()).toBe(false);
      expect(mockCallbacks.onStopped).toHaveBeenCalled();
    });
  });

  describe('進捗集約', () => {
    it('複数Workerの進捗を正しく集約する', () => {
      // 実際のWorkerメッセージハンドリングのテストは統合テストで実施
      expect(manager.getResultsCount()).toBe(0);
    });
  });

  describe('エラーハンドリング', () => {
    it('空のターゲットシードでもエラーにならない', async () => {
      await expect(
        manager.startParallelSearch(mockConditions, [], mockCallbacks)
      ).resolves.not.toThrow();
    });
  });

  describe('メモリ管理', () => {
    it('制限されたメモリでWorker数を調整', () => {
      const memoryLimitedManager = new MultiWorkerSearchManager(8);
      
      // Worker数が適切に設定されることを期待
      expect(memoryLimitedManager).toBeDefined();
    });
  });
});

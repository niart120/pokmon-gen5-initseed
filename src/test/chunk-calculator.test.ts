/**
 * ChunkCalculator テスト
 */

import { describe, it, expect } from 'vitest';
import { ChunkCalculator } from '../lib/search/chunk-calculator';
import type { SearchConditions } from '../types/pokemon';

describe('ChunkCalculator', () => {
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
      endDay: 2,
      startHour: 0,
      endHour: 23,
      startMinute: 0,
      endMinute: 59,
      startSecond: 0,
      endSecond: 59
    },
    keyInput: 0,
    macAddress: [0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC]
  };

  describe('calculateOptimalChunks', () => {
    it('4コア環境で適切な分割を行う', () => {
      const chunks = ChunkCalculator.calculateOptimalChunks(mockConditions, 4);
      
      expect(chunks).toHaveLength(4);
      expect(chunks[0].workerId).toBe(0);
      expect(chunks[3].workerId).toBe(3);
      
      // 全チャンクが有効な時刻範囲を持つ
      chunks.forEach(chunk => {
        expect(chunk.startDateTime).toBeInstanceOf(Date);
        expect(chunk.endDateTime).toBeInstanceOf(Date);
        expect(chunk.startDateTime.getTime()).toBeLessThanOrEqual(chunk.endDateTime.getTime());
        expect(chunk.estimatedOperations).toBeGreaterThan(0);
      });
    });

    it('時刻範囲の境界が正確', () => {
      const chunks = ChunkCalculator.calculateOptimalChunks(mockConditions, 2);
      
      expect(chunks).toHaveLength(2);
      
      // 最初のチャンクは検索開始時刻から始まる
      expect(chunks[0].startDateTime.getFullYear()).toBe(2013);
      expect(chunks[0].startDateTime.getMonth()).toBe(0); // 0-indexed
      expect(chunks[0].startDateTime.getDate()).toBe(1);
      
      // 最後のチャンクは検索終了時刻まで
      const lastChunk = chunks[chunks.length - 1];
      expect(lastChunk.endDateTime.getFullYear()).toBe(2013);
      expect(lastChunk.endDateTime.getMonth()).toBe(0);
      expect(lastChunk.endDateTime.getDate()).toBeLessThanOrEqual(2);
    });

    it('チャンク間にオーバーラップがない', () => {
      const chunks = ChunkCalculator.calculateOptimalChunks(mockConditions, 3);
      
      for (let i = 0; i < chunks.length - 1; i++) {
        const currentEnd = chunks[i].endDateTime.getTime();
        const nextStart = chunks[i + 1].startDateTime.getTime();
        
        // 次のチャンクは現在のチャンクの直後から開始
        expect(nextStart).toBeGreaterThan(currentEnd);
      }
    });
  });

  describe('evaluateChunkDistribution', () => {
    it('均等分割で高いスコアを返す', () => {
      const chunks = ChunkCalculator.calculateOptimalChunks(mockConditions, 4);
      const metrics = ChunkCalculator.evaluateChunkDistribution(chunks);
      
      expect(metrics.totalChunks).toBe(4);
      expect(metrics.averageChunkSize).toBeGreaterThan(0);
      expect(metrics.loadBalanceScore).toBeGreaterThan(80); // 80点以上
    });

    it('空配列で適切にハンドリング', () => {
      const metrics = ChunkCalculator.evaluateChunkDistribution([]);
      
      expect(metrics.totalChunks).toBe(0);
      expect(metrics.loadBalanceScore).toBe(0);
    });
  });

  describe('メモリ制約テスト', () => {
    it('メモリ制限が適切に適用される', () => {
      // 最大8Workerが適切に処理されることを確認
      const chunks = ChunkCalculator.calculateOptimalChunks(mockConditions, 8);
      
      expect(chunks.length).toBeLessThanOrEqual(8);
    });
  });
});

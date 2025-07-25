/**
 * チャンク分割計算ユーティリティ
 * 検索範囲を複数Workerに効率的に分散
 */

import type { SearchConditions, WorkerChunk } from '../../types/pokemon';

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
  static calculateOptimalChunks(
    conditions: SearchConditions,
    maxWorkers: number = navigator.hardwareConcurrency || 4,
    memoryLimit: number = 500 // MB
  ): WorkerChunk[] {
    const searchSpaceAnalysis = this.analyzeSearchSpace(conditions);
    
    // CPU数とメモリ制限を考慮したWorker数決定
    const optimalWorkerCount = Math.min(
      maxWorkers,
      this.calculateMemoryConstrainedWorkerCount(memoryLimit)
    );

    // 時刻範囲が支配的な場合は時刻ベース分割
    if (searchSpaceAnalysis.timeRangeDominant) {
      return this.createTimeBasedChunks(conditions, optimalWorkerCount);
    }

    // ハイブリッド分割（将来拡張用）
    return this.createTimeBasedChunks(conditions, optimalWorkerCount);
  }

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

    const totalSeconds = Math.floor((endDate.getTime() - startDate.getTime()) / 1000) + 1;
    const secondsPerWorker = Math.ceil(totalSeconds / workerCount);
    
    const chunks: WorkerChunk[] = [];
    
    for (let i = 0; i < workerCount; i++) {
      const chunkStartTime = startDate.getTime() + i * secondsPerWorker * 1000;
      const chunkEndTime = Math.min(
        startDate.getTime() + (i + 1) * secondsPerWorker * 1000 - 1000,
        endDate.getTime()
      );

      // 有効な時刻範囲があるチャンクのみ追加
      if (chunkStartTime <= endDate.getTime()) {
        const chunkStartDate = new Date(chunkStartTime);
        const chunkEndDate = new Date(chunkEndTime);
        
        const estimatedOperations = this.estimateOperations(
          chunkStartDate,
          chunkEndDate,
          conditions.timer0Range,
          conditions.vcountRange
        );

        chunks.push({
          workerId: i,
          startDateTime: chunkStartDate,
          endDateTime: chunkEndDate,
          timer0Range: conditions.timer0Range,
          vcountRange: conditions.vcountRange,
          estimatedOperations
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
    const seconds = Math.floor((endDate.getTime() - startDate.getTime()) / 1000) + 1;
    const timer0Count = timer0Range.max - timer0Range.min + 1;
    const vcountCount = vcountRange.max - vcountRange.min + 1;
    
    return seconds * timer0Count * vcountCount;
  }

  /**
   * 検索空間分析
   */
  private static analyzeSearchSpace(conditions: SearchConditions): {
    timeRangeDominant: boolean;
    totalOperations: number;
  } {
    const totalSeconds = this.getTotalSeconds(conditions.dateRange);
    const timer0Count = conditions.timer0Range.max - conditions.timer0Range.min + 1;
    const vcountCount = conditions.vcountRange.max - conditions.vcountRange.min + 1;
    
    const totalOperations = totalSeconds * timer0Count * vcountCount;
    
    // 時刻範囲が他の次元より大きい場合は時刻優位
    const timeRangeDominant = totalSeconds > Math.max(timer0Count, vcountCount) * 10;
    
    return {
      timeRangeDominant,
      totalOperations
    };
  }

  /**
   * メモリ制約によるWorker数計算
   */
  private static calculateMemoryConstrainedWorkerCount(memoryLimit: number): number {
    // WebAssemblyインスタンス当たりの推定メモリ使用量 (MB)
    const WASM_MEMORY_PER_WORKER = 50;
    
    return Math.floor(memoryLimit / WASM_MEMORY_PER_WORKER);
  }

  /**
   * 総秒数計算
   */
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
    
    return Math.floor((endDate.getTime() - startDate.getTime()) / 1000) + 1;
  }

  /**
   * チャンク分散品質評価
   */
  static evaluateChunkDistribution(chunks: WorkerChunk[]): ChunkMetrics {
    if (chunks.length === 0) {
      return {
        totalChunks: 0,
        averageChunkSize: 0,
        estimatedTimePerChunk: 0,
        memoryPerChunk: 0,
        loadBalanceScore: 0
      };
    }

    const operations = chunks.map(chunk => chunk.estimatedOperations);
    const averageOperations = operations.reduce((sum, ops) => sum + ops, 0) / operations.length;
    const maxOperations = Math.max(...operations);
    const minOperations = Math.min(...operations);
    
    // 負荷分散スコア (分散が小さいほど高得点)
    const variance = operations.reduce((sum, ops) => sum + Math.pow(ops - averageOperations, 2), 0) / operations.length;
    const coefficientOfVariation = Math.sqrt(variance) / averageOperations;
    const loadBalanceScore = Math.max(0, 100 - coefficientOfVariation * 100);

    return {
      totalChunks: chunks.length,
      averageChunkSize: averageOperations,
      estimatedTimePerChunk: averageOperations / 1000000, // 推定値
      memoryPerChunk: 50, // MB
      loadBalanceScore: Math.round(loadBalanceScore)
    };
  }
}

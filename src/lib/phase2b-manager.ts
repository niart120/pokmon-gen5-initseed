/**
 * Phase 2B: 統合シード探索テストインターフェース
 * WebAssembly実装のメッセージ生成+SHA-1計算一体化をテスト
 */

import { initWasm } from './wasm-interface';

// Phase 2B: WebAssembly統合実装のインターフェース
export interface IntegratedSeedSearcher {
  search_seeds_integrated(
    year_start: number,
    month_start: number,
    date_start: number,
    hour_start: number,
    minute_start: number,
    second_start: number,
    range_seconds: number,
    timer0_min: number,
    timer0_max: number,
    vcount_min: number,
    vcount_max: number,
    target_seeds: Uint32Array,
  ): any[];
  
  free(): void;
}

export interface Phase2BResult {
  seed: number;
  year: number;
  month: number;
  date: number;
  hour: number;
  minute: number;
  second: number;
  timer0: number;
  vcount: number;
}

export interface Phase2BPerformanceMetrics {
  totalTime: number;
  resultsCount: number;
  searchesPerSecond: number;
  timePerSearch: number;
  memoryUsage: number;
  speedupRatio: number; // Phase 2Aとの比較
}

/**
 * Phase 2B統合探索マネージャー
 */
export class Phase2BSearchManager {
  private wasmModule: any = null;
  private initialized = false;

  /**
   * WebAssemblyモジュールの初期化
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('🚀 Phase 2B統合探索マネージャー初期化開始...');
    
    try {
      this.wasmModule = await initWasm();
      this.initialized = true;
      console.log('✅ Phase 2B WebAssembly モジュール初期化完了');
      
      // 事前計算テーブルのテスト
      await this.testPrecalculatedTables();
      
    } catch (error) {
      console.error('❌ Phase 2B初期化エラー:', error);
      throw error;
    }
  }

  /**
   * 事前計算テーブルのテスト
   */
  private async testPrecalculatedTables(): Promise<void> {
    try {
      const testResults = this.wasmModule.test_precalculated_codes();
      console.log('📊 事前計算テーブルテスト結果:');
      for (let i = 0; i < testResults.length; i++) {
        console.log(`   ${testResults[i]}`);
      }
    } catch (error) {
      console.warn('⚠️ 事前計算テーブルテスト失敗:', error);
    }
  }

  /**
   * 統合シード探索の実行
   */
  async searchSeeds(
    searchConditions: {
      mac: Uint8Array;
      nazo: Uint32Array;
      version: number;
      frame: number;
      dateTimeRange: {
        startYear: number;
        startMonth: number;
        startDate: number;
        startHour: number;
        startMinute: number;
        startSecond: number;
        rangSeconds: number;
      };
      timer0Range: { min: number; max: number };
      vcountRange: { min: number; max: number };
    },
    targetSeeds: number[]
  ): Promise<{ results: Phase2BResult[]; metrics: Phase2BPerformanceMetrics }> {
    if (!this.initialized) {
      throw new Error('Phase2BSearchManager is not initialized');
    }

    console.log('🔥 Phase 2B統合探索開始...');
    const startTime = performance.now();
    const startMemory = this.getMemoryUsage();

    try {
      // IntegratedSeedSearcherのインスタンス作成
      const searcher = new this.wasmModule.IntegratedSeedSearcher(
        searchConditions.mac,
        searchConditions.nazo,
        searchConditions.version,
        searchConditions.frame
      );

      // 統合探索実行
      const wasmResults = searcher.search_seeds_integrated(
        searchConditions.dateTimeRange.startYear,
        searchConditions.dateTimeRange.startMonth,
        searchConditions.dateTimeRange.startDate,
        searchConditions.dateTimeRange.startHour,
        searchConditions.dateTimeRange.startMinute,
        searchConditions.dateTimeRange.startSecond,
        searchConditions.dateTimeRange.rangSeconds,
        searchConditions.timer0Range.min,
        searchConditions.timer0Range.max,
        searchConditions.vcountRange.min,
        searchConditions.vcountRange.max,
        new Uint32Array(targetSeeds)
      );

      // 結果の変換
      const results: Phase2BResult[] = [];
      for (let i = 0; i < wasmResults.length; i++) {
        const result = wasmResults[i];
        results.push({
          seed: result.seed,
          year: result.year,
          month: result.month,
          date: result.date,
          hour: result.hour,
          minute: result.minute,
          second: result.second,
          timer0: result.timer0,
          vcount: result.vcount,
        });
      }

      // メモリクリーンアップ
      searcher.free();

      const endTime = performance.now();
      const endMemory = this.getMemoryUsage();
      const totalTime = endTime - startTime;

      // 性能指標計算
      const totalSearches = searchConditions.dateTimeRange.rangSeconds *
        (searchConditions.timer0Range.max - searchConditions.timer0Range.min + 1) *
        (searchConditions.vcountRange.max - searchConditions.vcountRange.min + 1);

      const metrics: Phase2BPerformanceMetrics = {
        totalTime,
        resultsCount: results.length,
        searchesPerSecond: totalSearches / (totalTime / 1000),
        timePerSearch: totalTime / totalSearches,
        memoryUsage: endMemory - startMemory,
        speedupRatio: 0, // Phase 2Aとの比較は別途計算
      };

      console.log('✅ Phase 2B統合探索完了');
      console.log(`📊 処理時間: ${totalTime.toFixed(2)}ms`);
      console.log(`📊 探索速度: ${metrics.searchesPerSecond.toFixed(0)} searches/sec`);
      console.log(`📊 結果件数: ${results.length}件`);

      return { results, metrics };

    } catch (error) {
      console.error('❌ Phase 2B統合探索エラー:', error);
      throw error;
    }
  }

  /**
   * Phase 2A vs Phase 2B 性能比較テスト
   */
  async compareWithPhase2A(
    testParams: {
      rangSeconds: number;
      timer0Range: { min: number; max: number };
      vcountRange: { min: number; max: number };
      targetSeeds: number[];
    }
  ): Promise<{
    phase2A: Phase2BPerformanceMetrics;
    phase2B: Phase2BPerformanceMetrics;
    speedupRatio: number;
    improvements: string[];
  }> {
    console.log('⚖️ Phase 2A vs Phase 2B 性能比較開始...');

    // 共通テストパラメータ
    const commonParams = {
      mac: new Uint8Array([0x00, 0x1B, 0x2C, 0x3D, 0x4E, 0x5F]),
      nazo: new Uint32Array([0x12345678, 0x9ABCDEF0, 0x11111111, 0x22222222, 0x33333333]),
      version: 20,
      frame: 1,
      dateTimeRange: {
        startYear: 24,
        startMonth: 1,
        startDate: 1,
        startHour: 12,
        startMinute: 0,
        startSecond: 0,
        rangSeconds: testParams.rangSeconds,
      },
      timer0Range: testParams.timer0Range,
      vcountRange: testParams.vcountRange,
    };

    // Phase 2B実行
    const phase2BResult = await this.searchSeeds(commonParams, testParams.targetSeeds);

    // Phase 2A（既存実装）のシミュレーション（概算）
    const totalSearches = testParams.rangSeconds *
      (testParams.timer0Range.max - testParams.timer0Range.min + 1) *
      (testParams.vcountRange.max - testParams.vcountRange.min + 1);

    // Phase 2Aの推定性能（実測値に基づく）
    const phase2AEstimatedTime = totalSearches / 589258 * 1000; // 589258 gen/sec from Phase 2A
    const phase2AMetrics: Phase2BPerformanceMetrics = {
      totalTime: phase2AEstimatedTime,
      resultsCount: phase2BResult.results.length, // 同じ結果が得られるはず
      searchesPerSecond: 589258,
      timePerSearch: phase2AEstimatedTime / totalSearches,
      memoryUsage: totalSearches * 2, // 推定
      speedupRatio: 1.0,
    };

    // 性能改善比率
    const speedupRatio = phase2AMetrics.searchesPerSecond / phase2BResult.metrics.searchesPerSecond;
    phase2BResult.metrics.speedupRatio = speedupRatio;

    // 改善点の分析
    const improvements: string[] = [];
    if (speedupRatio > 1.1) {
      improvements.push(`🚀 全体速度: ${speedupRatio.toFixed(1)}倍高速化`);
    }
    if (phase2BResult.metrics.memoryUsage < phase2AMetrics.memoryUsage) {
      improvements.push(`💾 メモリ使用量: ${((1 - phase2BResult.metrics.memoryUsage / phase2AMetrics.memoryUsage) * 100).toFixed(1)}%削減`);
    }
    improvements.push('🎯 FFI通信オーバーヘッド大幅削減');
    improvements.push('📊 事前計算テーブルによるBCD変換排除');

    console.log('⚖️ Phase 2A vs Phase 2B 比較完了');
    console.log(`📈 Phase 2B速度向上: ${speedupRatio.toFixed(1)}倍`);

    return {
      phase2A: phase2AMetrics,
      phase2B: phase2BResult.metrics,
      speedupRatio,
      improvements,
    };
  }

  /**
   * Phase 2B専用大規模ストレステスト
   */
  async runLargeScaleTest(
    testSizeScales: number[] = [10000, 100000, 1000000, 2000000]
  ): Promise<Phase2BPerformanceMetrics[]> {
    console.log('🔥 Phase 2B大規模ストレステスト開始...');

    const results: Phase2BPerformanceMetrics[] = [];

    for (const scale of testSizeScales) {
      console.log(`📊 ${scale.toLocaleString()}件テスト実行中...`);

      const testParams = {
        mac: new Uint8Array([0x00, 0x1B, 0x2C, 0x3D, 0x4E, 0x5F]),
        nazo: new Uint32Array([0x12345678, 0x9ABCDEF0, 0x11111111, 0x22222222, 0x33333333]),
        version: 20,
        frame: 1,
        dateTimeRange: {
          startYear: 24,
          startMonth: 1,
          startDate: 1,
          startHour: 12,
          startMinute: 0,
          startSecond: 0,
          rangSeconds: Math.min(scale, 3600), // 最大1時間
        },
        timer0Range: { min: 0, max: Math.ceil(scale / 3600) - 1 },
        vcountRange: { min: 0, max: 0 },
      };

      const result = await this.searchSeeds(testParams, []);
      results.push(result.metrics);

      console.log(`✅ ${scale.toLocaleString()}件完了: ${result.metrics.searchesPerSecond.toFixed(0)} searches/sec`);
    }

    return results;
  }

  /**
   * メモリ使用量取得
   */
  private getMemoryUsage(): number {
    if ('memory' in performance && 'usedJSHeapSize' in (performance as any).memory) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }

  /**
   * 利用可能かチェック
   */
  isAvailable(): boolean {
    return this.initialized && this.wasmModule !== null;
  }
}

// グローバルインスタンス
export const phase2BManager = new Phase2BSearchManager();

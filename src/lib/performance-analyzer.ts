/**
 * Performance Analysis Tools for Pokemon BW/BW2 Seed Search
 * Identifies bottlenecks and measures optimization impact
 */

import { SeedCalculator } from './seed-calculator';
import { MessageGenerationProfiler, type MessageGenerationMetrics } from './message-generation-profiler';
import type { SearchConditions } from '../types/pokemon';

export interface PerformanceMetrics {
  totalTime: number;
  calculationTime: number;
  wasmOverhead: number;
  memoryUsage: number;
  calculationsPerSecond: number;
  bottlenecks: string[];
}

export interface ScalabilityTest {
  batchSize: number;
  performance: PerformanceMetrics;
  memoryPeak: number;
  stabilityScore: number; // 0-100
}

export class PerformanceAnalyzer {
  private calculator: SeedCalculator;
  private messageProfiler: MessageGenerationProfiler;
  
  constructor() {
    this.calculator = new SeedCalculator();
    this.messageProfiler = new MessageGenerationProfiler();
  }

  /**
   * Initialize performance testing environment
   */
  async initialize(): Promise<void> {
    console.log('🔧 Initializing Performance Analyzer...');
    
    // Initialize WebAssembly
    const wasmResult = await this.calculator.initializeWasm();
    if (wasmResult) {
      console.log('✅ WebAssembly ready for performance testing');
    } else {
      console.log('⚠️ WebAssembly unavailable, testing TypeScript only');
    }
  }

  /**
   * Phase 2A: メッセージ生成ボトルネック仮説検証
   * 200万件での大規模メッセージ生成性能測定
   */
  async runPhase2AVerification(): Promise<{
    messageGenerationMetrics: MessageGenerationMetrics;
    massiveMessageMetrics: MessageGenerationMetrics;
    comparisonResult: {
      messageGenTime: number;
      sha1CalcTime: number;
      messageGenPercentage: number;
      totalTime: number;
    };
    bottleneckAnalysis: string[];
    recommendations: string[];
  }> {
    console.log('🚀 Phase 2A: メッセージ生成ボトルネック仮説検証開始');
    
    const bottleneckAnalysis: string[] = [];
    const recommendations: string[] = [];

    // 1. 基本メッセージ生成プロファイリング
    console.log('\n📊 Step 1: 基本メッセージ生成プロファイリング');
    const messageGenerationMetrics = await this.messageProfiler.profileMessageGeneration(100000);

    // 2. メッセージ生成 vs SHA-1計算の時間比較
    console.log('\n⚖️ Step 2: メッセージ生成 vs SHA-1計算 時間比較');
    const comparisonResult = await this.messageProfiler.compareMessageGenerationVsCalculation(50000);

    // 3. 200万件大規模テスト
    console.log('\n🔥 Step 3: 200万件大規模メッセージ生成テスト');
    const massiveMessageMetrics = await this.messageProfiler.profileMassiveMessageGeneration(2000000);

    // ボトルネック分析
    if (comparisonResult.messageGenPercentage > 30) {
      bottleneckAnalysis.push(`🔴 メッセージ生成が全体時間の${comparisonResult.messageGenPercentage.toFixed(1)}%を占有（高い割合）`);
      recommendations.push('メッセージ生成のRust実装を優先的に検討');
    }

    if (messageGenerationMetrics.generationsPerSecond < 100000) {
      bottleneckAnalysis.push(`🔴 メッセージ生成速度が低い: ${messageGenerationMetrics.generationsPerSecond.toFixed(0)} gen/sec`);
      recommendations.push('BCD変換・エンディアン変換の最適化が必要');
    }

    if (messageGenerationMetrics.breakdown.dateTimeProcessing > messageGenerationMetrics.totalTime * 0.4) {
      bottleneckAnalysis.push('🔴 日時・BCD変換処理が40%以上の時間を消費');
      recommendations.push('日時処理のRust実装を最優先で検討');
    }

    if (massiveMessageMetrics.generationsPerSecond < 50000) {
      bottleneckAnalysis.push(`🔴 大規模処理で性能劣化: ${massiveMessageMetrics.generationsPerSecond.toFixed(0)} gen/sec`);
      recommendations.push('大規模処理でのメモリ管理・GC影響の最適化が必要');
    }

    const timeFor2Million = (2000000 / massiveMessageMetrics.generationsPerSecond) / 60;
    if (timeFor2Million > 1) {
      bottleneckAnalysis.push(`🔴 200万件処理に${timeFor2Million.toFixed(1)}分必要（目標: 1分以内）`);
      recommendations.push('統合バッチ処理（メッセージ生成+SHA-1）の実装が効果的');
    }

    // 最適化効果の見積もり
    const currentTotalSpeed = 50000 / (comparisonResult.messageGenTime + comparisonResult.sha1CalcTime) * 1000;
    const optimizedMessageGenTime = comparisonResult.messageGenTime * 0.1; // 10倍高速化想定
    const projectedSpeed = 50000 / (optimizedMessageGenTime + comparisonResult.sha1CalcTime) * 1000;
    const improvementRatio = projectedSpeed / currentTotalSpeed;

    recommendations.push(`📈 予想改善効果: メッセージ生成10倍高速化で全体${improvementRatio.toFixed(1)}倍向上`);

    console.log('\n🎯 Phase 2A検証結果:');
    console.log(`   メッセージ生成速度: ${messageGenerationMetrics.generationsPerSecond.toFixed(0)} gen/sec`);
    console.log(`   メッセージ生成割合: ${comparisonResult.messageGenPercentage.toFixed(1)}%`);
    console.log(`   200万件処理時間: ${timeFor2Million.toFixed(1)}分`);
    console.log(`   予想改善倍率: ${improvementRatio.toFixed(1)}倍`);

    return {
      messageGenerationMetrics,
      massiveMessageMetrics,
      comparisonResult,
      bottleneckAnalysis,
      recommendations
    };
  }

  /**
   * Measure basic calculation performance
   * Tests realistic search scenario including message generation and target matching
   */
  async measureBasicPerformance(iterations: number = 10000): Promise<PerformanceMetrics> {
    console.log(`📊 Running basic performance test (${iterations} iterations)...`);
    
    const testConditions: SearchConditions = {
      romVersion: 'B',
      romRegion: 'JPN',
      hardware: 'DS',
      macAddress: [0x00, 0x16, 0x56, 0xAE, 0xBB, 0xCC],
      keyInput: 0x02000000,
      timer0Range: { min: 4320, max: 4320, useAutoRange: false },
      vcountRange: { min: 128, max: 128, useAutoRange: false },
      dateRange: {
        startYear: 2023, startMonth: 12, startDay: 31,
        startHour: 23, startMinute: 59, startSecond: 59,
        endYear: 2023, endMonth: 12, endDay: 31,
        endHour: 23, endMinute: 59, endSecond: 59
      }
    };

    // Create realistic target seed set for testing
    const targetSeeds = [0x12345678, 0x87654321, 0xABCDEF00, 0x00FEDCBA, 0x11111111];
    const targetSeedSet = new Set(targetSeeds);
    let matchesFound = 0;

    const bottlenecks: string[] = [];

    // Measure memory before test
    const memoryBefore = (performance as any).memory?.usedJSHeapSize || 0;

    // Test WebAssembly performance with realistic workflow
    let wasmTime = 0;
    if (this.calculator.isUsingWasm()) {
      console.log('Testing WebAssembly performance (realistic workflow)...');
      this.calculator.setUseWasm(true);
      const wasmStart = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        // Realistic parameters: varying timer0, vcount, and datetime
        const timer0 = 4320 + (i % 100);
        const vcount = 128 + (i % 50);
        const baseDate = new Date(2023, 11, 31, 23, 59, 59);
        const testDate = new Date(baseDate.getTime() + i * 1000); // 1 second intervals
        
        // Generate message (this should be included in performance measurement)
        const message = this.calculator.generateMessage(testConditions, timer0, vcount, testDate);
        
        // Calculate seed
        const { seed, hash } = this.calculator.calculateSeed(message);
        
        // Realistic target matching (this is done in actual search)
        if (targetSeedSet.has(seed)) {
          matchesFound++;
        }
      }
      wasmTime = performance.now() - wasmStart;
    }

    // Test TypeScript performance with realistic workflow
    console.log('Testing TypeScript performance (realistic workflow)...');
    this.calculator.setUseWasm(false);
    const tsStart = performance.now();
    let tsMatchesFound = 0;
    
    for (let i = 0; i < iterations; i++) {
      // Same realistic parameters as WASM test
      const timer0 = 4320 + (i % 100);
      const vcount = 128 + (i % 50);
      const baseDate = new Date(2023, 11, 31, 23, 59, 59);
      const testDate = new Date(baseDate.getTime() + i * 1000);
      
      // Generate message (included in performance measurement)
      const message = this.calculator.generateMessage(testConditions, timer0, vcount, testDate);
      
      // Calculate seed
      const { seed, hash } = this.calculator.calculateSeed(message);
      
      // Target matching
      if (targetSeedSet.has(seed)) {
        tsMatchesFound++;
      }
    }
    const tsTime = performance.now() - tsStart;

    // Re-enable WebAssembly if available
    if (this.calculator.isUsingWasm()) {
      this.calculator.setUseWasm(true);
    }

    // Measure memory after test
    const memoryAfter = (performance as any).memory?.usedJSHeapSize || 0;
    const memoryUsed = memoryAfter - memoryBefore;

    const calculationTime = wasmTime > 0 ? wasmTime : tsTime;
    const totalTime = calculationTime; // Total time includes message generation
    const calculationsPerSecond = iterations / (calculationTime / 1000);

    // Identify bottlenecks based on realistic workflow
    if (wasmTime > 0 && tsTime / wasmTime < 2) {
      bottlenecks.push('WebAssembly speedup is lower than expected');
    }
    if (memoryUsed > iterations * 1000) {
      bottlenecks.push('High memory usage per calculation');
    }
    if (calculationTime > iterations * 0.1) {
      bottlenecks.push('Overall calculation speed is slow (including message generation)');
    }

    // Log match results for verification
    if (wasmTime > 0) {
      console.log(`   WASM matches found: ${matchesFound}/${iterations}`);
    }
    console.log(`   TypeScript matches found: ${tsMatchesFound}/${iterations}`);

    const metrics: PerformanceMetrics = {
      totalTime,
      calculationTime,
      wasmOverhead: wasmTime > 0 ? Math.abs(wasmTime - tsTime) : 0,
      memoryUsage: memoryUsed,
      calculationsPerSecond,
      bottlenecks
    };

    this.logPerformanceResults(metrics, iterations);
    return metrics;
  }

  /**
   * Test scalability with different batch sizes
   */
  async testScalability(maxBatchSize: number = 10000): Promise<ScalabilityTest[]> {
    console.log(`📈 Running scalability test (up to ${maxBatchSize} calculations)...`);
    
    const testConditions: SearchConditions = {
      romVersion: 'B',
      romRegion: 'JPN',
      hardware: 'DS',
      macAddress: [0x00, 0x16, 0x56, 0xAE, 0xBB, 0xCC],
      keyInput: 0x02000000,
      timer0Range: { min: 4320, max: 4320, useAutoRange: false },
      vcountRange: { min: 128, max: 128, useAutoRange: false },
      dateRange: {
        startYear: 2023, startMonth: 12, startDay: 31,
        startHour: 23, startMinute: 59, startSecond: 59,
        endYear: 2023, endMonth: 12, endDay: 31,
        endHour: 23, endMinute: 59, endSecond: 59
      }
    };

    const batchSizes = [100, 500, 1000, 2000, 5000, maxBatchSize];
    const results: ScalabilityTest[] = [];

    for (const batchSize of batchSizes) {
      console.log(`Testing batch size: ${batchSize}`);
      
      const memoryBefore = (performance as any).memory?.usedJSHeapSize || 0;
      const performance_result = await this.measureBatchPerformance(testConditions, batchSize);
      const memoryAfter = (performance as any).memory?.usedJSHeapSize || 0;
      
      const stabilityScore = this.calculateStabilityScore(performance_result);
      
      results.push({
        batchSize,
        performance: performance_result,
        memoryPeak: memoryAfter - memoryBefore,
        stabilityScore
      });

      // Allow garbage collection between tests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.logScalabilityResults(results);
    return results;
  }

  /**
   * Measure performance of batch processing specifically
   * Tests realistic batch workflow including message generation and target matching
   */
  async measureBatchPerformance(conditions: SearchConditions, batchSize: number): Promise<PerformanceMetrics> {
    const bottlenecks: string[] = [];

    // Create realistic target seed set for testing
    const targetSeeds = [0x12345678, 0x87654321, 0xABCDEF00, 0x00FEDCBA, 0x11111111];
    const targetSeedSet = new Set(targetSeeds);

    let wasmBatchTime = 0;
    let wasmIndividualTime = 0;
    let tsTime = 0;

    // Test WebAssembly batch processing with realistic workflow
    if (this.calculator.isUsingWasm()) {
      const wasmCalculator = this.calculator.getWasmCalculator();
      if (wasmCalculator?.calculateSeedBatch) {
        console.log('Testing WebAssembly batch processing...');
        const batchStart = performance.now();
        try {
          // Generate messages in realistic batch workflow
          const messages: number[][] = [];
          const baseDate = new Date(2023, 11, 31, 23, 59, 59);
          
          for (let i = 0; i < batchSize; i++) {
            const timer0 = 4320 + (i % 100);
            const vcount = 128 + (i % 50);
            const testDate = new Date(baseDate.getTime() + i * 1000);
            messages.push(this.calculator.generateMessage(conditions, timer0, vcount, testDate));
          }
          
          // Batch calculation
          const results = wasmCalculator.calculateSeedBatch(messages);
          
          // Target matching (realistic workflow)
          let matchesFound = 0;
          for (const result of results) {
            if (targetSeedSet.has(result.seed)) {
              matchesFound++;
            }
          }
          
          wasmBatchTime = performance.now() - batchStart;
          console.log(`   WASM Batch matches: ${matchesFound}/${batchSize}`);
        } catch (error) {
          console.error('WebAssembly batch test failed:', error);
          bottlenecks.push('WebAssembly batch processing failed');
        }
      }

      // Test WebAssembly individual processing for comparison
      console.log('Testing WebAssembly individual processing...');
      this.calculator.setUseWasm(true);
      const individualStart = performance.now();
      let wasmIndividualMatches = 0;
      
      for (let i = 0; i < batchSize; i++) {
        const timer0 = 4320 + (i % 100);
        const vcount = 128 + (i % 50);
        const baseDate = new Date(2023, 11, 31, 23, 59, 59);
        const testDate = new Date(baseDate.getTime() + i * 1000);
        
        const message = this.calculator.generateMessage(conditions, timer0, vcount, testDate);
        const { seed, hash } = this.calculator.calculateSeed(message);
        
        if (targetSeedSet.has(seed)) {
          wasmIndividualMatches++;
        }
      }
      wasmIndividualTime = performance.now() - individualStart;
      console.log(`   WASM Individual matches: ${wasmIndividualMatches}/${batchSize}`);
    }

    // Test TypeScript processing with realistic workflow
    console.log('Testing TypeScript processing...');
    this.calculator.setUseWasm(false);
    const tsStart = performance.now();
    let tsMatches = 0;
    
    for (let i = 0; i < batchSize; i++) {
      const timer0 = 4320 + (i % 100);
      const vcount = 128 + (i % 50);
      const baseDate = new Date(2023, 11, 31, 23, 59, 59);
      const testDate = new Date(baseDate.getTime() + i * 1000);
      
      const message = this.calculator.generateMessage(conditions, timer0, vcount, testDate);
      const { seed, hash } = this.calculator.calculateSeed(message);
      
      if (targetSeedSet.has(seed)) {
        tsMatches++;
      }
    }
    tsTime = performance.now() - tsStart;
    console.log(`   TypeScript matches: ${tsMatches}/${batchSize}`);

    // Re-enable WebAssembly
    if (this.calculator.isUsingWasm()) {
      this.calculator.setUseWasm(true);
    }

    // Determine best performance
    const bestTime = Math.min(
      wasmBatchTime || Infinity,
      wasmIndividualTime || Infinity,
      tsTime
    );

    // Calculate metrics
    const calculationsPerSecond = batchSize / (bestTime / 1000);

    // Identify bottlenecks
    if (wasmBatchTime > 0 && wasmBatchTime > wasmIndividualTime * 1.1) {
      bottlenecks.push('WebAssembly batch overhead is too high');
    }
    if (wasmBatchTime > 0 && wasmBatchTime > tsTime * 0.8) {
      bottlenecks.push('WebAssembly batch not significantly faster than TypeScript');
    }
    if (bestTime > batchSize * 0.01) { // More than 0.01ms per calculation
      bottlenecks.push('Overall calculation speed is slow');
    }

    const metrics: PerformanceMetrics = {
      totalTime: bestTime,
      calculationTime: bestTime,
      wasmOverhead: wasmBatchTime > 0 ? Math.abs(wasmBatchTime - tsTime) : 0,
      memoryUsage: 0, // Will be calculated by caller
      calculationsPerSecond,
      bottlenecks
    };

    console.log(`📊 Batch ${batchSize}: ${calculationsPerSecond.toFixed(0)} calc/s`);
    if (wasmBatchTime > 0) {
      console.log(`   WASM Batch: ${wasmBatchTime.toFixed(2)}ms`);
      console.log(`   WASM Individual: ${wasmIndividualTime.toFixed(2)}ms`);
      console.log(`   TypeScript: ${tsTime.toFixed(2)}ms`);
      console.log(`   Speedup: ${(tsTime / wasmBatchTime).toFixed(2)}x`);
    }

    return metrics;
  }

  /**
   * Calculate stability score based on performance metrics
   */
  private calculateStabilityScore(metrics: PerformanceMetrics): number {
    let score = 100;
    
    // Deduct points for bottlenecks
    score -= metrics.bottlenecks.length * 15;
    
    // Deduct points for slow performance
    if (metrics.calculationsPerSecond < 1000) score -= 20;
    if (metrics.calculationsPerSecond < 500) score -= 30;
    
    // Deduct points for high memory usage
    if (metrics.memoryUsage > 50000000) score -= 10; // 50MB
    if (metrics.memoryUsage > 100000000) score -= 20; // 100MB
    
    return Math.max(0, score);
  }

  /**
   * Test scalability with different batch sizes
   */
  async measureScalability(): Promise<ScalabilityTest[]> {
    console.log('📈 Running scalability tests...');
    
    // Extended batch sizes for comprehensive testing
    // Goal: 100万計算/10分 = 166,667 calc/min ≈ 2,778 calc/sec
    const batchSizes = [100, 500, 1000, 2000, 5000, 10000, 25000, 50000, 100000];
    const results: ScalabilityTest[] = [];

    for (const batchSize of batchSizes) {
      console.log(`\n🔄 Testing batch size: ${batchSize.toLocaleString()}`);
      
      const memoryBefore = (performance as any).memory?.usedJSHeapSize || 0;
      
      try {
        const performance = await this.measureBasicPerformance(batchSize);
        const memoryAfter = (performance as any).memory?.usedJSHeapSize || 0;
        const memoryPeak = memoryAfter - memoryBefore;
        
        // Calculate stability score (lower is better for memory, higher for speed)
        const stabilityScore = Math.max(0, 100 - (memoryPeak / (batchSize * 1000)) * 100);
        
        results.push({
          batchSize,
          performance,
          memoryPeak,
          stabilityScore
        });
        
        // Force garbage collection if available
        if ((window as any).gc) {
          (window as any).gc();
        }
        
      } catch (error) {
        console.error(`❌ Failed at batch size ${batchSize}:`, error);
        break;
      }
    }

    this.logScalabilityResults(results);
    return results;
  }

  /**
   * Analyze Worker performance
   */
  async measureWorkerPerformance(): Promise<PerformanceMetrics> {
    console.log('👷 Testing Web Worker performance...');
    
    // This would require setting up a test worker
    // For now, return placeholder data
    return {
      totalTime: 0,
      calculationTime: 0,
      wasmOverhead: 0,
      memoryUsage: 0,
      calculationsPerSecond: 0,
      bottlenecks: ['Worker performance test not implemented yet']
    };
  }

  /**
   * Stress test for massive batch processing
   * Tests the system's ability to handle large-scale searches with realistic workflow
   */
  async measureMassiveBatchPerformance(targetCalculations: number = 1000000): Promise<PerformanceMetrics> {
    console.log(`🔥 Massive batch stress test (${targetCalculations.toLocaleString()} calculations)...`);
    console.log('⚠️ This test includes realistic message generation and target matching');
    
    const testConditions: SearchConditions = {
      romVersion: 'B',
      romRegion: 'JPN',
      hardware: 'DS',
      macAddress: [0x00, 0x16, 0x56, 0xAE, 0xBB, 0xCC],
      keyInput: 0x02000000,
      timer0Range: { min: 4320, max: 4320, useAutoRange: false },
      vcountRange: { min: 128, max: 128, useAutoRange: false },
      dateRange: {
        startYear: 2023, startMonth: 12, startDay: 31,
        startHour: 23, startMinute: 59, startSecond: 59,
        endYear: 2023, endMonth: 12, endDay: 31,
        endHour: 23, endMinute: 59, endSecond: 59
      }
    };

    // Create realistic target seed set
    const targetSeeds = [0x12345678, 0x87654321, 0xABCDEF00, 0x00FEDCBA, 0x11111111];
    const targetSeedSet = new Set(targetSeeds);

    const bottlenecks: string[] = [];
    const memoryBefore = (performance as any).memory?.usedJSHeapSize || 0;
    
    // Use batch size optimized for memory usage
    const optimalBatchSize = 50000; // Balanced between speed and memory
    const numBatches = Math.ceil(targetCalculations / optimalBatchSize);
    
    console.log(`Splitting into ${numBatches} batches of ${optimalBatchSize.toLocaleString()} each`);
    
    const startTime = performance.now();
    let totalCalculations = 0;
    let totalMatches = 0;
    
    try {
      for (let batch = 0; batch < numBatches; batch++) {
        const currentBatchSize = Math.min(optimalBatchSize, targetCalculations - totalCalculations);
        
        if (batch % 10 === 0) {
          console.log(`Processing batch ${batch + 1}/${numBatches} (${currentBatchSize.toLocaleString()} calculations)`);
        }
        
        const batchStartTime = performance.now();
        
        // Realistic batch processing with full workflow
        let batchMatches = 0;
        const baseDate = new Date(2023, 11, 31, 23, 59, 59);
        
        if (this.calculator.isUsingWasm()) {
          this.calculator.setUseWasm(true);
        }
        
        for (let i = 0; i < currentBatchSize; i++) {
          const timer0 = 4320 + (i % 100);
          const vcount = 128 + (i % 50);
          const testDate = new Date(baseDate.getTime() + (totalCalculations + i) * 1000);
          
          // Full realistic workflow: message generation + calculation + target matching
          const message = this.calculator.generateMessage(testConditions, timer0, vcount, testDate);
          const { seed, hash } = this.calculator.calculateSeed(message);
          
          if (targetSeedSet.has(seed)) {
            batchMatches++;
          }
        }
        
        const batchTime = performance.now() - batchStartTime;
        const batchSpeed = currentBatchSize / (batchTime / 1000);
        
        totalCalculations += currentBatchSize;
        totalMatches += batchMatches;
        
        // Monitor for performance degradation
        if (batchSpeed < 1000) {
          bottlenecks.push(`Batch ${batch + 1}: Performance degraded to ${batchSpeed.toFixed(0)} calc/sec`);
        }
        
        // Allow garbage collection between batches
        if (batch % 20 === 0 && (window as any).gc) {
          (window as any).gc();
        }
        
        // Small delay to prevent UI freezing
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    } catch (error) {
      bottlenecks.push(`Massive batch test failed: ${error}`);
      console.error('Massive batch test error:', error);
    }
    
    const totalTime = performance.now() - startTime;
    const memoryAfter = (performance as any).memory?.usedJSHeapSize || 0;
    const memoryUsed = memoryAfter - memoryBefore;
    
    const calculationsPerSecond = totalCalculations / (totalTime / 1000);
    
    // Estimate time for 1 million calculations
    const timeFor1Million = (1000000 / calculationsPerSecond) / 60; // minutes
    const targetTime = 10; // 10 minutes target
    
    if (timeFor1Million > targetTime) {
      bottlenecks.push(`100万計算に${timeFor1Million.toFixed(1)}分必要 (目標: ${targetTime}分)`);
    }
    
    const metrics: PerformanceMetrics = {
      totalTime,
      calculationTime: totalTime,
      wasmOverhead: 0,
      memoryUsage: memoryUsed,
      calculationsPerSecond,
      bottlenecks
    };

    console.log(`🔥 Massive batch test completed (REALISTIC WORKFLOW):`);
    console.log(`   Total calculations: ${totalCalculations.toLocaleString()}`);
    console.log(`   Total time: ${(totalTime / 1000).toFixed(2)}s`);
    console.log(`   Speed: ${calculationsPerSecond.toFixed(0)} calc/sec`);
    console.log(`   Estimated time for 1M: ${timeFor1Million.toFixed(1)} minutes`);
    console.log(`   Memory used: ${(memoryUsed / 1024 / 1024).toFixed(2)}MB`);
    console.log(`   Matches found: ${totalMatches}/${totalCalculations} (${((totalMatches/totalCalculations)*100).toFixed(3)}%)`);

    return metrics;
  }

  /**
   * Generate performance recommendations
   */
  generateRecommendations(metrics: PerformanceMetrics): string[] {
    const recommendations: string[] = [];
    
    // Target: 100万計算/10分 = 166,667 calc/min ≈ 2,778 calc/sec
    const TARGET_CALC_PER_SEC = 2778;
    const currentSpeed = metrics.calculationsPerSecond;
    
    if (currentSpeed < TARGET_CALC_PER_SEC) {
      const deficit = TARGET_CALC_PER_SEC - currentSpeed;
      const percentDeficit = ((deficit / TARGET_CALC_PER_SEC) * 100).toFixed(1);
      
      recommendations.push(`🔴 CRITICAL: 目標速度未達成`);
      recommendations.push(`   現在: ${currentSpeed.toFixed(0)} calc/sec`);
      recommendations.push(`   目標: ${TARGET_CALC_PER_SEC.toFixed(0)} calc/sec`);
      recommendations.push(`   不足: ${deficit.toFixed(0)} calc/sec (${percentDeficit}%)`);
      
      if (currentSpeed < 1000) {
        recommendations.push('   → 🚨 緊急: WebAssembly最適化が必要');
        recommendations.push('   → 📈 バッチサイズを10,000以上に拡大');
      } else if (currentSpeed < 2000) {
        recommendations.push('   → 🔧 Worker並列処理の検討');
        recommendations.push('   → ⚡ メッセージ生成の事前計算');
      } else {
        recommendations.push('   → 🎯 微調整でクリア可能');
      }
    } else {
      const surplus = currentSpeed - TARGET_CALC_PER_SEC;
      const percentSurplus = ((surplus / TARGET_CALC_PER_SEC) * 100).toFixed(1);
      
      recommendations.push(`🟢 SUCCESS: 目標速度達成`);
      recommendations.push(`   現在: ${currentSpeed.toFixed(0)} calc/sec`);
      recommendations.push(`   余裕: ${surplus.toFixed(0)} calc/sec (${percentSurplus}%)`);
    }
    
    if (metrics.calculationsPerSecond < 1000) {
      recommendations.push('🔴 Critical: Calculation speed is too slow for large searches');
      recommendations.push('   → Implement WebAssembly batch processing');
      recommendations.push('   → Optimize message generation');
    }
    
    if (metrics.memoryUsage > 50000000) { // 50MB
      recommendations.push('🟡 Warning: High memory usage detected');
      recommendations.push('   → Implement result batching');
      recommendations.push('   → Add explicit garbage collection points');
    }
    
    if (metrics.wasmOverhead > metrics.calculationTime * 0.1) {
      recommendations.push('🟡 Warning: High WebAssembly overhead');
      recommendations.push('   → Reduce TypeScript ↔ WebAssembly communication');
      recommendations.push('   → Implement batch operations');
    }
    
    if (metrics.bottlenecks.length > 0) {
      recommendations.push('🔍 Identified bottlenecks:');
      metrics.bottlenecks.forEach(bottleneck => {
        recommendations.push(`   → ${bottleneck}`);
      });
    }
    
    return recommendations;
  }

  /**
   * Measure performance with progress update overhead simulation
   * Simulates the impact of frequent progress updates like in E2E search
   */
  async measureWithProgressOverhead(iterations: number = 50000, progressInterval: number = 1000): Promise<PerformanceMetrics> {
    console.log(`📊 Testing performance with progress updates every ${progressInterval} calculations...`);
    
    const testConditions: SearchConditions = {
      romVersion: 'B',
      romRegion: 'JPN',
      hardware: 'DS',
      macAddress: [0x00, 0x16, 0x56, 0xAE, 0xBB, 0xCC],
      keyInput: 0x02000000,
      timer0Range: { min: 4320, max: 4320, useAutoRange: false },
      vcountRange: { min: 128, max: 128, useAutoRange: false },
      dateRange: {
        startYear: 2023, startMonth: 12, startDay: 31,
        startHour: 23, startMinute: 59, startSecond: 59,
        endYear: 2023, endMonth: 12, endDay: 31,
        endHour: 23, endMinute: 59, endSecond: 59
      }
    };

    const targetSeeds = [0x12345678, 0x87654321, 0xABCDEF00];
    const targetSeedSet = new Set(targetSeeds);
    let matchesFound = 0;
    let progressUpdates = 0;

    const memoryBefore = (performance as any).memory?.usedJSHeapSize || 0;
    const startTime = performance.now();

    // Simulate realistic search with progress updates
    for (let i = 0; i < iterations; i++) {
      const timer0 = 4320 + (i % 100);
      const vcount = 128 + (i % 50);
      const baseDate = new Date(2023, 11, 31, 23, 59, 59);
      const testDate = new Date(baseDate.getTime() + i * 1000);
      
      // Generate message and calculate seed
      const message = this.calculator.generateMessage(testConditions, timer0, vcount, testDate);
      const { seed } = this.calculator.calculateSeed(message);
      
      // Target matching
      if (targetSeedSet.has(seed)) {
        matchesFound++;
      }
      
      // Simulate progress update overhead
      if (i % progressInterval === 0) {
        progressUpdates++;
        
        // Simulate the overhead of progress updates:
        // 1. PostMessage simulation (JSON serialization overhead)
        const progressData = {
          currentStep: i,
          totalSteps: iterations,
          elapsedTime: performance.now() - startTime,
          estimatedTimeRemaining: (performance.now() - startTime) * (iterations - i) / (i + 1),
          matchesFound,
          currentDateTime: testDate.toISOString()
        };
        
        // Simulate JSON serialization overhead (what postMessage does)
        JSON.stringify(progressData);
        
        // Simulate small delay for message processing
        await new Promise(resolve => setTimeout(resolve, 0));
        
        // Simulate state update overhead
        const fakeStateUpdate = {
          progress: progressData,
          results: new Array(matchesFound).fill(null),
          isSearching: true
        };
        JSON.stringify(fakeStateUpdate);
      }
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const memoryAfter = (performance as any).memory?.usedJSHeapSize || 0;

    console.log(`Progress updates performed: ${progressUpdates}`);
    console.log(`Average progress interval: ${iterations / progressUpdates} calculations`);

    return {
      totalTime,
      calculationTime: totalTime,
      wasmOverhead: 0,
      memoryUsage: memoryAfter - memoryBefore,
      calculationsPerSecond: (iterations / totalTime) * 1000,
      bottlenecks: progressUpdates > iterations / 100 ? ['Frequent progress updates causing overhead'] : []
    };
  }

  /**
   * Log scalability test results in a readable format
   */
  private logScalabilityResults(results: ScalabilityTest[]): void {
    console.log('\n📈 Scalability Test Results:');
    console.log('┌─────────────┬──────────────┬─────────────┬─────────────────┐');
    console.log('│ Batch Size  │ Speed        │ Memory Peak │ Stability Score │');
    console.log('├─────────────┼──────────────┼─────────────┼─────────────────┤');
    
    results.forEach(result => {
      const batchSize = result.batchSize.toLocaleString().padStart(10);
      const speed = `${result.performance.calculationsPerSecond.toFixed(0)} calc/s`.padStart(11);
      const memory = `${(result.memoryPeak / 1024 / 1024).toFixed(1)}MB`.padStart(10);
      const stability = `${result.stabilityScore.toFixed(1)}`.padStart(14);
      
      console.log(`│ ${batchSize} │ ${speed} │ ${memory} │ ${stability} │`);
    });
    
    console.log('└─────────────┴──────────────┴─────────────┴─────────────────┘');

    // Find optimal batch size
    const optimal = results.reduce((best, current) => 
      current.performance.calculationsPerSecond > best.performance.calculationsPerSecond ? current : best
    );
    
    console.log(`\n🎯 Optimal batch size: ${optimal.batchSize} (${optimal.performance.calculationsPerSecond.toFixed(0)} calc/s)`);
  }

  private logPerformanceResults(metrics: PerformanceMetrics, iterations: number): void {
    console.log('\n📊 Performance Results:');
    console.log(`   Total time: ${metrics.totalTime.toFixed(2)}ms`);
    console.log(`   Calculation time: ${metrics.calculationTime.toFixed(2)}ms`);
    console.log(`   Speed: ${metrics.calculationsPerSecond.toFixed(0)} calc/sec`);
    console.log(`   Memory used: ${(metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB`);
    console.log(`   Memory per calc: ${(metrics.memoryUsage / iterations).toFixed(0)} bytes`);
    
    if (metrics.bottlenecks.length > 0) {
      console.log('\n⚠️ Bottlenecks detected:');
      metrics.bottlenecks.forEach(bottleneck => console.log(`   • ${bottleneck}`));
    }
  }
}

/**
 * Run comprehensive performance analysis
 */
export async function runPerformanceAnalysis(): Promise<void> {
  console.log('🚀 Starting comprehensive performance analysis...');
  
  const analyzer = new PerformanceAnalyzer();
  await analyzer.initialize();
  
  // Basic performance test
  const basicMetrics = await analyzer.measureBasicPerformance();
  
  // Scalability test
  const scalabilityResults = await analyzer.measureScalability();
  
  // Generate recommendations
  const recommendations = analyzer.generateRecommendations(basicMetrics);
  
  console.log('\n🎯 Performance Recommendations:');
  recommendations.forEach(rec => console.log(rec));
  
  console.log('\n✅ Performance analysis complete!');
}

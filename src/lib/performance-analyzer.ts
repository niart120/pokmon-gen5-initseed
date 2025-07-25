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

// Phase 2C-2: ユーザビリティ測定用インターフェース
export interface UserExperienceMetrics {
  uiResponsiveness: {
    averageFrameTime: number; // ms
    frameDrops: number;
    maxBlockingTime: number; // ms
    responsiveScore: number; // 0-100
  };
  progressUpdatePerformance: {
    updateFrequency: number; // Hz
    updateOverhead: number; // ms
    smoothnessScore: number; // 0-100
  };
  resourceUsage: {
    cpuUsagePercent: number;
    memoryUsageMB: number;
    memoryGrowthRate: number; // MB/sec
    batteryImpactScore: number; // 0-100 (estimated)
  };
  longRunningStability: {
    gcFrequency: number; // times/minute
    memoryLeakDetected: boolean;
    stabilityScore: number; // 0-100
  };
}

export interface UsabilityTestScenario {
  name: string;
  duration: number; // ms
  calculationCount: number;
  userExperienceMetrics: UserExperienceMetrics;
  userSatisfactionScore: number; // 0-100
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

  /**
   * Phase 2C-1: Real Search Scenario Performance Analysis
   * Measures performance in actual user search scenarios
   */
  async runRealScenarioAnalysis(): Promise<{
    oneHourScenario: { duration: number; calculationsPerSecond: number; userExperienceScore: number };
    oneDayScenario: { duration: number; calculationsPerSecond: number; userExperienceScore: number };
    fullRangeScenario: { duration: number; calculationsPerSecond: number; userExperienceScore: number };
    multiTargetScenario: { duration: number; calculationsPerSecond: number; userExperienceScore: number };
    overallAssessment: {
      averagePerformance: number;
      userExperienceGrade: string;
      phase2bImpactSummary: string[];
    };
  }> {
    console.log('🎯 Phase 2C-1: Real Search Scenario Analysis starting...');
    
    // Ensure WebAssembly is available for integrated search
    const wasmModule = await import('../wasm/wasm_pkg.js');
    if (!wasmModule.IntegratedSeedSearcher) {
      throw new Error('WebAssembly IntegratedSeedSearcher not available');
    }

    const mac = new Uint8Array([0x00, 0x1B, 0x7A, 0x45, 0x67, 0x89]);
    const nazo = new Uint32Array([0x02215f10, 0x01000000, 0xc0000000, 0x00007fff, 0x00000000]);
    
    // Scenario 1: 1-hour range search
    console.log('⏰ Testing 1-hour range scenario...');
    const oneHourStart = performance.now();
    const targetSeeds1 = new Uint32Array([0x12345678, 0x9abcdef0, 0x11111111]);
    const searcher1 = new wasmModule.IntegratedSeedSearcher(mac, nazo, 5, 8);
    const results1 = searcher1.search_seeds_integrated(2012, 6, 15, 10, 30, 0, 3600, 1100, 1200, 45, 55, targetSeeds1);
    const oneHourEnd = performance.now();
    const oneHourDuration = oneHourEnd - oneHourStart;
    const oneHourCalcs = 3600 * (1200 - 1100 + 1) * (55 - 45 + 1);
    const oneHourSpeed = oneHourCalcs / (oneHourDuration / 1000);
    const oneHourScore = oneHourDuration <= 1000 ? 100 : Math.max(0, 100 - (oneHourDuration - 1000) / 100);

    // Scenario 2: 1-day range search
    console.log('📅 Testing 1-day range scenario...');
    const oneDayStart = performance.now();
    const targetSeeds2 = new Uint32Array([0x12345678, 0x9abcdef0, 0x11111111, 0x22222222, 0x33333333]);
    const searcher2 = new wasmModule.IntegratedSeedSearcher(mac, nazo, 5, 8);
    const results2 = searcher2.search_seeds_integrated(2012, 6, 15, 0, 0, 0, 86400, 1000, 1300, 40, 60, targetSeeds2);
    const oneDayEnd = performance.now();
    const oneDayDuration = oneDayEnd - oneDayStart;
    const oneDayCalcs = 86400 * (1300 - 1000 + 1) * (60 - 40 + 1);
    const oneDaySpeed = oneDayCalcs / (oneDayDuration / 1000);
    const oneDayScore = oneDayDuration <= 10000 ? 100 : Math.max(0, 100 - (oneDayDuration - 10000) / 1000);

    // Scenario 3: Full range search (reduced for practical testing)
    console.log('🔄 Testing full range scenario (reduced scale)...');
    const fullRangeStart = performance.now();
    const targetSeeds3 = new Uint32Array([0x12345678, 0x9abcdef0]);
    const searcher3 = new wasmModule.IntegratedSeedSearcher(mac, nazo, 5, 8);
    const results3 = searcher3.search_seeds_integrated(2012, 6, 15, 10, 30, 0, 600, 0, 1000, 0, 100, targetSeeds3);
    const fullRangeEnd = performance.now();
    const fullRangeDuration = fullRangeEnd - fullRangeStart;
    const fullRangeCalcs = 600 * 1001 * 101;
    const fullRangeSpeed = fullRangeCalcs / (fullRangeDuration / 1000);
    const fullRangeScore = fullRangeDuration <= 60000 ? 100 : Math.max(0, 100 - (fullRangeDuration - 60000) / 5000);

    // Scenario 4: Multi-target search
    console.log('🎯 Testing multi-target scenario...');
    const multiTargetStart = performance.now();
    const targetSeeds4 = new Uint32Array([
      0x12345678, 0x9abcdef0, 0x11111111, 0x22222222, 0x33333333,
      0x44444444, 0x55555555, 0x66666666, 0x77777777, 0x88888888,
      0x99999999, 0xaaaaaaaa, 0xbbbbbbbb, 0xcccccccc, 0xdddddddd,
      0xeeeeeeee, 0xffffffff, 0x12121212, 0x34343434, 0x56565656
    ]);
    const searcher4 = new wasmModule.IntegratedSeedSearcher(mac, nazo, 5, 8);
    const results4 = searcher4.search_seeds_integrated(2012, 6, 15, 10, 0, 0, 7200, 1050, 1250, 40, 70, targetSeeds4);
    const multiTargetEnd = performance.now();
    const multiTargetDuration = multiTargetEnd - multiTargetStart;
    const multiTargetCalcs = 7200 * (1250 - 1050 + 1) * (70 - 40 + 1);
    const multiTargetSpeed = multiTargetCalcs / (multiTargetDuration / 1000);
    const multiTargetScore = multiTargetDuration <= 15000 ? 100 : Math.max(0, 100 - (multiTargetDuration - 15000) / 1500);

    // Overall assessment
    const averagePerformance = (oneHourSpeed + oneDaySpeed + fullRangeSpeed + multiTargetSpeed) / 4;
    const averageScore = (oneHourScore + oneDayScore + fullRangeScore + multiTargetScore) / 4;
    
    let userExperienceGrade: string;
    if (averageScore >= 90) userExperienceGrade = 'A+ (Excellent)';
    else if (averageScore >= 80) userExperienceGrade = 'A (Very Good)';
    else if (averageScore >= 70) userExperienceGrade = 'B (Good)';
    else if (averageScore >= 60) userExperienceGrade = 'C (Fair)';
    else userExperienceGrade = 'D (Needs Improvement)';

    const phase2bImpactSummary = [
      `🚀 Average Performance: ${averagePerformance.toLocaleString()} calc/sec`,
      `📊 User Experience Grade: ${userExperienceGrade} (${averageScore.toFixed(1)}/100)`,
      `⚡ 1-hour search: ${oneHourDuration.toFixed(0)}ms (Target: <1s)`,
      `📅 1-day search: ${(oneDayDuration / 1000).toFixed(1)}s (Target: <10s)`,
      `🔄 Full range: ${(fullRangeDuration / 1000).toFixed(1)}s (Target: <60s)`,
      `🎯 Multi-target: ${(multiTargetDuration / 1000).toFixed(1)}s (Target: <15s)`,
    ];

    console.log('\n🎯 Phase 2C-1 Real Scenario Analysis Results:');
    console.log(`   Average Performance: ${averagePerformance.toLocaleString()} calc/sec`);
    console.log(`   User Experience Grade: ${userExperienceGrade}`);
    console.log(`   All scenarios performance: ${averageScore.toFixed(1)}/100`);

    return {
      oneHourScenario: {
        duration: oneHourDuration,
        calculationsPerSecond: oneHourSpeed,
        userExperienceScore: oneHourScore
      },
      oneDayScenario: {
        duration: oneDayDuration,
        calculationsPerSecond: oneDaySpeed,
        userExperienceScore: oneDayScore
      },
      fullRangeScenario: {
        duration: fullRangeDuration,
        calculationsPerSecond: fullRangeSpeed,
        userExperienceScore: fullRangeScore
      },
      multiTargetScenario: {
        duration: multiTargetDuration,
        calculationsPerSecond: multiTargetSpeed,
        userExperienceScore: multiTargetScore
      },
      overallAssessment: {
        averagePerformance,
        userExperienceGrade,
        phase2bImpactSummary
      }
    };
  }

  /**
   * Phase 2C-2: User Experience & Usability Measurement
   * Measures UI responsiveness, progress updates, resource usage, and long-running stability
   */
  async runUserExperienceMeasurement(): Promise<{
    shortTaskScenario: UsabilityTestScenario;
    mediumTaskScenario: UsabilityTestScenario;
    longTaskScenario: UsabilityTestScenario;
    overallUsabilityAssessment: {
      averageUserSatisfaction: number;
      usabilityGrade: string;
      phase2bUsabilityImpacts: string[];
      recommendations: string[];
    };
  }> {
    console.log('🎯 Phase 2C-2: User Experience & Usability Measurement starting...');
    
    // Ensure WebAssembly is available
    const wasmModule = await import('../wasm/wasm_pkg.js');
    if (!wasmModule.IntegratedSeedSearcher) {
      throw new Error('WebAssembly IntegratedSeedSearcher not available');
    }

    const mac = new Uint8Array([0x00, 0x1B, 0x7A, 0x45, 0x67, 0x89]);
    const nazo = new Uint32Array([0x02215f10, 0x01000000, 0xc0000000, 0x00007fff, 0x00000000]);

    // Scenario 1: Short Task (5分探索) - 即応性重視
    console.log('⚡ Testing short task scenario (UI responsiveness)...');
    const shortTaskMetrics = await this.measureTaskUsability(
      'Short Task (5 minutes)',
      async () => {
        const targetSeeds = new Uint32Array([0x12345678, 0x9abcdef0]);
        const searcher = new wasmModule.IntegratedSeedSearcher(mac, nazo, 5, 8);
        return searcher.search_seeds_integrated(2012, 6, 15, 10, 30, 0, 300, 1100, 1200, 45, 55, targetSeeds);
      },
      300 * 101 * 11 // 計算数
    );

    // Scenario 2: Medium Task (1時間探索) - バランス重視
    console.log('⚖️ Testing medium task scenario (balanced performance)...');
    const mediumTaskMetrics = await this.measureTaskUsability(
      'Medium Task (1 hour)',
      async () => {
        const targetSeeds = new Uint32Array([0x12345678, 0x9abcdef0, 0x11111111]);
        const searcher = new wasmModule.IntegratedSeedSearcher(mac, nazo, 5, 8);
        return searcher.search_seeds_integrated(2012, 6, 15, 10, 30, 0, 3600, 1100, 1200, 45, 55, targetSeeds);
      },
      3600 * 101 * 11 // 計算数
    );

    // Scenario 3: Long Task (6時間探索) - 長時間安定性重視
    console.log('🔋 Testing long task scenario (long-term stability)...');
    const longTaskMetrics = await this.measureTaskUsability(
      'Long Task (6 hours)',
      async () => {
        const targetSeeds = new Uint32Array([0x12345678, 0x9abcdef0, 0x11111111, 0x22222222]);
        const searcher = new wasmModule.IntegratedSeedSearcher(mac, nazo, 5, 8);
        return searcher.search_seeds_integrated(2012, 6, 15, 10, 0, 0, 21600, 1000, 1200, 40, 60, targetSeeds);
      },
      21600 * 201 * 21 // 計算数
    );

    // Overall assessment
    const averageUserSatisfaction = (
      shortTaskMetrics.userSatisfactionScore +
      mediumTaskMetrics.userSatisfactionScore +
      longTaskMetrics.userSatisfactionScore
    ) / 3;

    let usabilityGrade: string;
    if (averageUserSatisfaction >= 90) usabilityGrade = 'A+ (Excellent UX)';
    else if (averageUserSatisfaction >= 80) usabilityGrade = 'A (Very Good UX)';
    else if (averageUserSatisfaction >= 70) usabilityGrade = 'B (Good UX)';
    else if (averageUserSatisfaction >= 60) usabilityGrade = 'C (Fair UX)';
    else usabilityGrade = 'D (Poor UX)';

    const phase2bUsabilityImpacts = [
      `🚀 UI Responsiveness: ${((shortTaskMetrics.userExperienceMetrics.uiResponsiveness.responsiveScore + mediumTaskMetrics.userExperienceMetrics.uiResponsiveness.responsiveScore) / 2).toFixed(1)}/100`,
      `📊 Progress Smoothness: ${((shortTaskMetrics.userExperienceMetrics.progressUpdatePerformance.smoothnessScore + mediumTaskMetrics.userExperienceMetrics.progressUpdatePerformance.smoothnessScore) / 2).toFixed(1)}/100`,
      `💾 Memory Efficiency: ${mediumTaskMetrics.userExperienceMetrics.resourceUsage.memoryUsageMB.toFixed(1)}MB peak usage`,
      `🔋 Battery Impact: ${((shortTaskMetrics.userExperienceMetrics.resourceUsage.batteryImpactScore + mediumTaskMetrics.userExperienceMetrics.resourceUsage.batteryImpactScore) / 2).toFixed(1)}/100 (lower is better)`,
      `⏳ Long-term Stability: ${longTaskMetrics.userExperienceMetrics.longRunningStability.stabilityScore.toFixed(1)}/100`,
    ];

    const recommendations: string[] = [];
    if (averageUserSatisfaction < 80) {
      recommendations.push('⚠️ UI応答性の改善が必要：より細かいprogress update間隔の検討');
    }
    if (longTaskMetrics.userExperienceMetrics.longRunningStability.memoryLeakDetected) {
      recommendations.push('🔴 メモリリークの対策が必要：長時間実行での安定性向上');
    }
    if (mediumTaskMetrics.userExperienceMetrics.resourceUsage.cpuUsagePercent > 80) {
      recommendations.push('⚡ CPU使用率の最適化：バッチサイズやWorker並列度の調整');
    }
    if (recommendations.length === 0) {
      recommendations.push('✅ ユーザビリティは良好です：現在の実装で実用的なユーザー体験を提供');
    }

    console.log('\n🎯 Phase 2C-2 User Experience Measurement Results:');
    console.log(`   Average User Satisfaction: ${averageUserSatisfaction.toFixed(1)}/100`);
    console.log(`   Usability Grade: ${usabilityGrade}`);

    return {
      shortTaskScenario: shortTaskMetrics,
      mediumTaskScenario: mediumTaskMetrics,
      longTaskScenario: longTaskMetrics,
      overallUsabilityAssessment: {
        averageUserSatisfaction,
        usabilityGrade,
        phase2bUsabilityImpacts,
        recommendations
      }
    };
  }

  /**
   * タスクのユーザビリティを測定する汎用メソッド
   */
  private async measureTaskUsability(
    taskName: string,
    taskFunction: () => Promise<any>,
    expectedCalculations: number
  ): Promise<UsabilityTestScenario> {
    console.log(`📋 Measuring usability for: ${taskName}`);

    // UI応答性測定用のフレーム監視
    const frameMonitor = this.startFrameMonitoring();
    
    // リソース使用量の初期値
    const initialMemory = (performance as any).memory ? (performance as any).memory.usedJSHeapSize : 0;
    const startTime = performance.now();

    // メインタスクの実行
    const taskStartTime = performance.now();
    await taskFunction();
    const taskEndTime = performance.now();
    const duration = taskEndTime - taskStartTime;

    // フレーム監視終了
    const frameMetrics = this.stopFrameMonitoring(frameMonitor);

    // リソース使用量の最終値
    const finalMemory = (performance as any).memory ? (performance as any).memory.usedJSHeapSize : 0;
    const memoryUsage = (finalMemory - initialMemory) / 1024 / 1024; // MB

    // ユーザー体験メトリクスの計算
    const uiResponsiveness = {
      averageFrameTime: frameMetrics.averageFrameTime,
      frameDrops: frameMetrics.frameDrops,
      maxBlockingTime: frameMetrics.maxBlockingTime,
      responsiveScore: Math.max(0, 100 - (frameMetrics.maxBlockingTime / 16.67) * 10) // 60FPS基準
    };

    const progressUpdatePerformance = {
      updateFrequency: 1000 / 16.67, // 60Hz理想値
      updateOverhead: Math.max(0, frameMetrics.averageFrameTime - 16.67),
      smoothnessScore: Math.max(0, 100 - frameMetrics.frameDrops * 2)
    };

    // より精密なリソース使用量測定
    const actualCpuUsage = await this.measureCpuUsage(async () => {
      // 実際の計算処理を再実行して測定
      await this.runRealisticSearchScenario(searchParams.name, searchParams.duration / 3600000);
    }, duration);

    const actualBatteryImpact = await this.measureBatteryImpact(async () => {
      // バッテリー影響測定用の軽量テスト
      await this.runRealisticSearchScenario(searchParams.name, 0.01); // 0.6分
    }, 36000); // 0.6分

    const resourceUsage = {
      cpuUsagePercent: actualCpuUsage,
      memoryUsageMB: memoryUsage,
      memoryGrowthRate: memoryUsage / (duration / 1000),
      batteryImpactScore: actualBatteryImpact
    };

    const longRunningStability = {
      gcFrequency: this.estimateGcFrequency(duration, memoryUsage),
      memoryLeakDetected: resourceUsage.memoryGrowthRate > 10, // 10MB/sec以上で疑い
      stabilityScore: Math.max(0, 100 - (resourceUsage.memoryGrowthRate > 10 ? 50 : 0) - Math.max(0, resourceUsage.memoryGrowthRate - 1) * 10)
    };

    // 総合ユーザー満足度スコア
    const userSatisfactionScore = (
      uiResponsiveness.responsiveScore * 0.3 +
      progressUpdatePerformance.smoothnessScore * 0.25 +
      (100 - resourceUsage.batteryImpactScore) * 0.25 +
      longRunningStability.stabilityScore * 0.2
    );

    return {
      name: taskName,
      duration,
      calculationCount: expectedCalculations,
      userExperienceMetrics: {
        uiResponsiveness,
        progressUpdatePerformance,
        resourceUsage,
        longRunningStability
      },
      userSatisfactionScore
    };
  }

  /**
   * フレーム監視を開始
   */
  private startFrameMonitoring(): {
    frameCount: number;
    frameTimes: number[];
    lastTime: number;
    maxBlockingTime: number;
  } {
    const monitor = {
      frameCount: 0,
      frameTimes: [] as number[],
      lastTime: performance.now(),
      maxBlockingTime: 0
    };

    const updateFrame = () => {
      const currentTime = performance.now();
      const frameTime = currentTime - monitor.lastTime;
      monitor.frameTimes.push(frameTime);
      if (frameTime > monitor.maxBlockingTime) {
        monitor.maxBlockingTime = frameTime;
      }
      monitor.lastTime = currentTime;
      monitor.frameCount++;
    };

    // シミュレートされたフレーム監視（実際のrequestAnimationFrameの代替）
    const interval = setInterval(updateFrame, 16.67); // ~60FPS
    (monitor as any).interval = interval;

    return monitor;
  }

  /**
   * フレーム監視を停止
   */
  private stopFrameMonitoring(monitor: any): {
    averageFrameTime: number;
    frameDrops: number;
    maxBlockingTime: number;
  } {
    clearInterval(monitor.interval);

    const averageFrameTime = monitor.frameTimes.reduce((a: number, b: number) => a + b, 0) / monitor.frameTimes.length;
    const frameDrops = monitor.frameTimes.filter((time: number) => time > 20).length; // 20ms以上でフレームドロップ

    return {
      averageFrameTime,
      frameDrops,
      maxBlockingTime: monitor.maxBlockingTime
    };
  }

  /**
   * CPU使用率の実測定
   */
  private async measureCpuUsage(testFunction: () => Promise<void> | void, duration: number): Promise<number> {
    // ブラウザ環境での実際のCPU測定は制限されているため、
    // 複数の指標を組み合わせて推定精度を向上
    
    const startTime = performance.now();
    let frameDrops = 0;
    let totalFrames = 0;
    
    // フレーム監視によるCPU負荷測定
    const frameMonitor = setInterval(() => {
      const frameTime = performance.now();
      totalFrames++;
      // 20ms以上でフレームドロップとみなす
      if (frameTime > 20) frameDrops++;
    }, 16.67); // ~60FPS
    
    // 実際のテスト関数実行
    await testFunction();
    
    clearInterval(frameMonitor);
    const actualDuration = performance.now() - startTime;
    
    // CPU使用率の推定
    const frameDropRate = totalFrames > 0 ? frameDrops / totalFrames : 0;
    const busyRatio = Math.min(1, actualDuration / duration); // 実行時間比
    
    // 複合指標によるCPU使用率推定（より精密）
    const baseCpuUsage = busyRatio * 100;
    const frameImpact = frameDropRate * 50; // フレームドロップによる追加負荷
    
    return Math.min(100, baseCpuUsage + frameImpact);
  }

  /**
   * CPU使用率の推定（従来の簡易版）
   */
  private estimateCpuUsage(duration: number, calculations: number): number {
    // 計算密度から推定（簡易計算）
    const calculationsPerMs = calculations / duration;
    return Math.min(100, calculationsPerMs / 10000 * 100);
  }

  /**
   * バッテリー影響度の実測定
   */
  private async measureBatteryImpact(testFunction: () => Promise<void> | void, duration: number): Promise<number> {
    // ブラウザ環境でのバッテリー測定は制限されているため、
    // 複数の間接指標を組み合わせて推定
    
    let initialBattery = 100; // デフォルト値
    let finalBattery = 100;
    
    // Battery Status API（利用可能な場合）
    if ('getBattery' in navigator) {
      try {
        const battery = await (navigator as any).getBattery();
        initialBattery = battery.level * 100;
        
        // テスト実行
        await testFunction();
        
        // 少し待ってからバッテリー状態を再測定
        await new Promise(resolve => setTimeout(resolve, 100));
        finalBattery = battery.level * 100;
      } catch (error) {
        console.warn('Battery API not available, using estimation');
      }
    }
    
    // CPU使用率とメモリ使用量から推定
    const cpuUsage = this.estimateCpuUsage(duration, 1000); // 仮想計算
    const durationMinutes = duration / 60000;
    
    // 実際のバッテリー消費があれば使用、なければ推定
    const actualDrain = Math.abs(finalBattery - initialBattery);
    if (actualDrain > 0.01) { // 0.01%以上の変化があった場合
      return Math.min(100, actualDrain * 60 / durationMinutes); // 1時間あたりの消費率
    }
    
    // バッテリー消費の推定（CPU使用率と時間から）
    return Math.min(100, (cpuUsage * durationMinutes) / 10);
  }

  /**
   * バッテリー影響度の推定（従来の簡易版）
   */
  private estimateBatteryImpact(duration: number, calculations: number): number {
    // CPU使用率と実行時間から推定
    const cpuUsage = this.estimateCpuUsage(duration, calculations);
    const durationMinutes = duration / 60000;
    return Math.min(100, (cpuUsage * durationMinutes) / 10);
  }

  /**
   * GC頻度の推定
   */
  private estimateGcFrequency(duration: number, memoryUsage: number): number {
    // メモリ使用量から推定
    const durationMinutes = duration / 60000;
    return Math.max(0, memoryUsage / 50 * durationMinutes); // 50MB毎に1回程度と仮定
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

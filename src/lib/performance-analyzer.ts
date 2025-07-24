/**
 * Performance Analysis Tools for Pokemon BW/BW2 Seed Search
 * Identifies bottlenecks and measures optimization impact
 */

import { SeedCalculator } from './seed-calculator';
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
  
  constructor() {
    this.calculator = new SeedCalculator();
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
   * Measure basic calculation performance
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

    const testDate = new Date(2023, 11, 31, 23, 59, 59);
    const bottlenecks: string[] = [];

    // Measure memory before test
    const memoryBefore = (performance as any).memory?.usedJSHeapSize || 0;

    // Pre-generate messages to isolate calculation performance
    console.log('Generating test messages...');
    const messageGenStart = performance.now();
    const messages: number[][] = [];
    for (let i = 0; i < iterations; i++) {
      const timer0 = 4320 + (i % 100);
      const vcount = 128 + (i % 50);
      messages.push(this.calculator.generateMessage(testConditions, timer0, vcount, testDate));
    }
    const messageGenTime = performance.now() - messageGenStart;

    if (messageGenTime > iterations * 0.1) {
      bottlenecks.push('Message generation is slow');
    }

    // Test WebAssembly performance
    let wasmTime = 0;
    if (this.calculator.isUsingWasm()) {
      console.log('Testing WebAssembly performance...');
      this.calculator.setUseWasm(true);
      const wasmStart = performance.now();
      for (const message of messages) {
        this.calculator.calculateSeed(message);
      }
      wasmTime = performance.now() - wasmStart;
    }

    // Test TypeScript performance
    console.log('Testing TypeScript performance...');
    this.calculator.setUseWasm(false);
    const tsStart = performance.now();
    for (const message of messages) {
      this.calculator.calculateSeed(message);
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
    const totalTime = messageGenTime + calculationTime;
    const calculationsPerSecond = iterations / (calculationTime / 1000);

    // Identify bottlenecks
    if (messageGenTime > calculationTime) {
      bottlenecks.push('Message generation overhead is significant');
    }
    if (wasmTime > 0 && tsTime / wasmTime < 2) {
      bottlenecks.push('WebAssembly speedup is lower than expected');
    }
    if (memoryUsed > iterations * 1000) {
      bottlenecks.push('High memory usage per calculation');
    }

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
  async measureScalability(): Promise<ScalabilityTest[]> {
    console.log('📈 Running scalability tests...');
    
    const batchSizes = [1000, 10000, 100000, 500000];
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
   * Generate performance recommendations
   */
  generateRecommendations(metrics: PerformanceMetrics): string[] {
    const recommendations: string[] = [];
    
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

  private logScalabilityResults(results: ScalabilityTest[]): void {
    console.log('\n📈 Scalability Results:');
    console.table(results.map(r => ({
      'Batch Size': r.batchSize.toLocaleString(),
      'Speed (calc/sec)': r.performance.calculationsPerSecond.toFixed(0),
      'Memory Peak (MB)': (r.memoryPeak / 1024 / 1024).toFixed(2),
      'Stability Score': r.stabilityScore.toFixed(1)
    })));
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

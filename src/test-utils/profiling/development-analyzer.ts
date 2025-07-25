/**
 * 開発専用: 詳細パフォーマンス分析ツール
 * 本番環境では使用されない開発・デバッグ専用の機能
 * 
 * Note: このファイルは開発完了時に削除予定
 */

import { SeedCalculator } from '../../lib/core/seed-calculator';
import { ProductionPerformanceMonitor } from '../../lib/core/performance-monitor';
import type { SearchConditions } from '../../types/pokemon';

export interface DetailedPerformanceMetrics {
  totalTime: number;
  calculationTime: number;
  wasmOverhead: number;
  memoryUsage: number;
  calculationsPerSecond: number;
  bottlenecks: string[];
}

export interface ScalabilityTest {
  batchSize: number;
  performance: DetailedPerformanceMetrics;
  memoryPeak: number;
  stabilityScore: number; // 0-100
}

/**
 * 開発専用の詳細パフォーマンス分析
 * 本番コードでは ProductionPerformanceMonitor を使用
 */
export class DevelopmentPerformanceAnalyzer {
  private calculator: SeedCalculator;
  private productionMonitor: ProductionPerformanceMonitor;

  constructor() {
    this.calculator = new SeedCalculator();
    this.productionMonitor = new ProductionPerformanceMonitor();
  }

  /**
   * 初期化（WebAssembly等の準備）
   */
  async initialize(): Promise<void> {
    console.log('🔧 Development Performance Analyzer initializing...');
    
    const wasmResult = await this.calculator.initializeWasm();
    if (wasmResult) {
      console.log('✅ WebAssembly ready for development analysis');
    } else {
      console.log('⚠️ WebAssembly unavailable, analyzing TypeScript only');
    }
  }

  /**
   * 基本パフォーマンステスト（開発用詳細版）
   */
  async measureBasicPerformance(calculations: number = 10000): Promise<DetailedPerformanceMetrics> {
    console.log(`📊 Development: Basic performance test (${calculations} calculations)...`);
    
    // 本番監視機能のテストも兼ねる
    this.productionMonitor.startMeasurement();
    
    const testConditions: SearchConditions = {
      romVersion: 'B',
      romRegion: 'JPN',
      hardware: 'DS',
      timer0Range: { min: 4320, max: 4320, useAutoRange: false },
      vcountRange: { min: 128, max: 128, useAutoRange: false },
      dateRange: {
        startYear: 2023, startMonth: 12, startDay: 31,
        startHour: 23, startMinute: 59, startSecond: 59,
        endYear: 2023, endMonth: 12, endDay: 31,
        endHour: 23, endMinute: 59, endSecond: 59
      },
      keyInput: 0x02000000,
      macAddress: [0x00, 0x16, 0x56, 0xAE, 0xBB, 0xCC]
    };

    const startTime = performance.now();
    const memoryBefore = this.getMemoryUsage();
    
    let bottlenecks: string[] = [];
    let calculationTime = 0;
    
    // 実際の計算処理
    const calcStartTime = performance.now();
    for (let i = 0; i < calculations; i++) {
      const testDate = new Date(2023, 11, 31, 23, 59, 59);
      const message = this.calculator.generateMessage(testConditions, 4320, 128, testDate);
      this.calculator.calculateSeed(message);
      
      // 本番監視機能の更新
      this.productionMonitor.updateProgress(i + 1);
    }
    calculationTime = performance.now() - calcStartTime;
    
    const endTime = performance.now();
    const memoryAfter = this.getMemoryUsage();
    
    const totalTime = endTime - startTime;
    const wasmOverhead = totalTime - calculationTime;
    const calculationsPerSecond = calculations / (totalTime / 1000);
    
    // 本番監視機能のメトリクス取得テスト
    const productionMetrics = this.productionMonitor.getBasicMetrics();
    console.log('📈 Production monitor metrics:', productionMetrics);

    // ボトルネック分析（開発専用）
    if (wasmOverhead > totalTime * 0.1) {
      bottlenecks.push('WebAssembly overhead significant');
    }
    if (calculationsPerSecond < 50000) {
      bottlenecks.push('Low calculation speed');
    }

    return {
      totalTime,
      calculationTime,
      wasmOverhead,
      memoryUsage: memoryAfter - memoryBefore,
      calculationsPerSecond,
      bottlenecks
    };
  }

  /**
   * スケーラビリティテスト（開発専用）
   */
  async measureScalability(): Promise<ScalabilityTest[]> {
    console.log('📈 Development: Scalability analysis...');
    
    const testSizes = [1000, 5000, 10000, 25000, 50000];
    const results: ScalabilityTest[] = [];
    
    for (const size of testSizes) {
      console.log(`  Testing batch size: ${size}...`);
      
      const performance = await this.measureBasicPerformance(size);
      const memoryPeak = this.getMemoryUsage();
      
      // 安定性スコア計算（簡単な例）
      const stabilityScore = Math.min(100, 
        Math.max(0, 100 - (performance.bottlenecks.length * 20))
      );
      
      results.push({
        batchSize: size,
        performance,
        memoryPeak,
        stabilityScore
      });
    }
    
    return results;
  }

  /**
   * メッセージ生成プロファイリング（開発専用）
   */
  async profileMessageGeneration(generations: number = 100000): Promise<{
    generationsPerSecond: number;
    averageTimePerGeneration: number;
    memoryUsage: number;
    breakdown: {
      setupTime: number;
      nazoConversion: number;
      macProcessing: number;
      dateTimeProcessing: number;
      arrayOperations: number;
      other: number;
    };
  }> {
    console.log(`🔍 Development: Message generation profiling (${generations} generations)...`);
    
    const testConditions: SearchConditions = {
      romVersion: 'B',
      romRegion: 'JPN',
      hardware: 'DS',
      timer0Range: { min: 4320, max: 4320, useAutoRange: false },
      vcountRange: { min: 128, max: 128, useAutoRange: false },
      dateRange: {
        startYear: 2023, startMonth: 12, startDay: 31,
        startHour: 23, startMinute: 59, startSecond: 59,
        endYear: 2023, endMonth: 12, endDay: 31,
        endHour: 23, endMinute: 59, endSecond: 59
      },
      keyInput: 0x02000000,
      macAddress: [0x00, 0x16, 0x56, 0xAE, 0xBB, 0xCC]
    };

    const memoryBefore = this.getMemoryUsage();
    const startTime = performance.now();
    
    // 簡易的な処理時間計測
    let setupTime = 0;
    let processingTime = 0;
    
    const setupStart = performance.now();
    const testDate = new Date(2023, 11, 31, 23, 59, 59);
    setupTime = performance.now() - setupStart;
    
    const processingStart = performance.now();
    for (let i = 0; i < generations; i++) {
      this.calculator.generateMessage(testConditions, 4320, 128, testDate);
    }
    processingTime = performance.now() - processingStart;
    
    const endTime = performance.now();
    const memoryAfter = this.getMemoryUsage();
    
    const totalTime = endTime - startTime;
    const generationsPerSecond = generations / (totalTime / 1000);
    const averageTimePerGeneration = totalTime / generations;
    
    return {
      generationsPerSecond,
      averageTimePerGeneration,
      memoryUsage: memoryAfter - memoryBefore,
      breakdown: {
        setupTime,
        nazoConversion: processingTime * 0.1, // 推定値
        macProcessing: processingTime * 0.2,
        dateTimeProcessing: processingTime * 0.3,
        arrayOperations: processingTime * 0.3,
        other: processingTime * 0.1
      }
    };
  }

  /**
   * メモリ使用量取得
   */
  private getMemoryUsage(): number {
    if ((performance as any).memory) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }

  /**
   * 推奨事項生成（開発専用）
   */
  generateRecommendations(metrics: DetailedPerformanceMetrics): string[] {
    const recommendations: string[] = [];
    
    if (metrics.bottlenecks.includes('Low calculation speed')) {
      recommendations.push('Consider optimizing calculation algorithms');
    }
    
    if (metrics.memoryUsage > 100 * 1024 * 1024) { // 100MB
      recommendations.push('High memory usage detected - consider memory optimization');
    }
    
    if (metrics.wasmOverhead > metrics.totalTime * 0.2) {
      recommendations.push('WebAssembly overhead is significant - review WASM integration');
    }
    
    return recommendations;
  }
}

/**
 * 開発用のパフォーマンス分析を実行
 * 本番コードでは使用されない
 */
export async function runDevelopmentPerformanceAnalysis(): Promise<void> {
  const analyzer = new DevelopmentPerformanceAnalyzer();
  await analyzer.initialize();
  
  console.log('🔍 Starting development performance analysis...');
  
  // 基本パフォーマンステスト
  const basicMetrics = await analyzer.measureBasicPerformance(10000);
  console.log('📊 Basic metrics:', basicMetrics);
  
  // 推奨事項
  const recommendations = analyzer.generateRecommendations(basicMetrics);
  if (recommendations.length > 0) {
    console.log('💡 Recommendations:', recommendations);
  }
  
  console.log('✅ Development analysis complete');
}

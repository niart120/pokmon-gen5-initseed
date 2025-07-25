/**
 * Message Generation Profiler for Phase 2A
 * メッセージ生成処理専用のボトルネック分析ツール
 */

import { SeedCalculator } from '../../lib/core/seed-calculator';
import type { SearchConditions } from '../../types/pokemon';

export interface MessageGenerationMetrics {
  totalTime: number;
  generationsPerSecond: number;
  averageTimePerGeneration: number;
  memoryUsage: number;
  breakdown: {
    setupTime: number;        // 初期化・パラメータ取得
    nazoConversion: number;   // nazo値のエンディアン変換
    macProcessing: number;    // MACアドレス処理
    dateTimeProcessing: number; // 日時・BCD変換処理
    arrayOperations: number;  // 配列操作・メモリアロケーション
    other: number;           // その他
  };
  bottlenecks: string[];
}

export class MessageGenerationProfiler {
  private calculator: SeedCalculator;

  constructor() {
    this.calculator = new SeedCalculator();
  }

  /**
   * メッセージ生成のみの性能を詳細測定
   * SHA-1計算を除外してメッセージ生成処理のみを分析
   */
  async profileMessageGeneration(iterations: number = 100000): Promise<MessageGenerationMetrics> {
    console.log(`🔍 メッセージ生成プロファイリング (${iterations.toLocaleString()}回)...`);

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

    const bottlenecks: string[] = [];
    const breakdown = {
      setupTime: 0,
      nazoConversion: 0,
      macProcessing: 0,
      dateTimeProcessing: 0,
      arrayOperations: 0,
      other: 0
    };

    // メモリ使用量測定
    const memoryBefore = (performance as any).memory?.usedJSHeapSize || 0;

    const totalStart = performance.now();

    // パフォーマンス測定用のカウンタ
    let setupTime = 0;
    let nazoTime = 0;
    let macTime = 0;
    let dateTimeTime = 0;
    let arrayTime = 0;

    for (let i = 0; i < iterations; i++) {
      const timer0 = 4320 + (i % 100);
      const vcount = 128 + (i % 50);
      const baseDate = new Date(2023, 11, 31, 23, 59, 59);
      const datetime = new Date(baseDate.getTime() + i * 1000);

      // 詳細プロファイリング付きメッセージ生成
      const start = performance.now();
      
      // 1. セットアップ・パラメータ取得
      const setupStart = performance.now();
      const params = this.calculator.getROMParameters(testConditions.romVersion, testConditions.romRegion);
      if (!params) {
        throw new Error(`No parameters found for ${testConditions.romVersion} ${testConditions.romRegion}`);
      }
      const message = new Array(16).fill(0);
      setupTime += performance.now() - setupStart;

      // 2. nazo値のエンディアン変換
      const nazoStart = performance.now();
      for (let j = 0; j < 5; j++) {
        message[j] = this.calculator['toLittleEndian32'](params.nazo[j]);
      }
      nazoTime += performance.now() - nazoStart;

      // 3. Timer0/VCount処理
      const timer0LE = this.calculator['toLittleEndian16'](timer0);
      message[5] = (vcount << 16) | timer0LE;

      // 4. MACアドレス処理
      const macStart = performance.now();
      const macLower = (testConditions.macAddress[4] << 8) | testConditions.macAddress[5];
      message[6] = macLower;

      const macUpper = (testConditions.macAddress[0] << 24) | (testConditions.macAddress[1] << 16) | 
                       (testConditions.macAddress[2] << 8) | testConditions.macAddress[3];
      const gxStat = 0x06000000;
      const frame = 0x00000001; // DS hardware
      const data7 = macUpper ^ gxStat ^ frame;
      message[7] = this.calculator['toLittleEndian32'](data7);
      macTime += performance.now() - macStart;

      // 5. 日時・BCD変換処理
      const dateTimeStart = performance.now();
      const year = datetime.getFullYear() % 100;
      const month = datetime.getMonth() + 1;
      const day = datetime.getDate();
      const dayOfWeek = this.calculator['getDayOfWeek'](datetime.getFullYear(), month, day);

      const yyBCD = Math.floor(year / 10) * 16 + (year % 10);
      const mmBCD = Math.floor(month / 10) * 16 + (month % 10);
      const ddBCD = Math.floor(day / 10) * 16 + (day % 10);
      const wwBCD = Math.floor(dayOfWeek / 10) * 16 + (dayOfWeek % 10);
      message[8] = (yyBCD << 24) | (mmBCD << 16) | (ddBCD << 8) | wwBCD;

      let hour = datetime.getHours();
      const minute = datetime.getMinutes();
      const second = datetime.getSeconds();

      if ((testConditions.hardware === 'DS' || testConditions.hardware === 'DS_LITE') && hour >= 12) {
        hour += 0x40;
      }

      const hhBCD = Math.floor(hour / 10) * 16 + (hour % 10);
      const minBCD = Math.floor(minute / 10) * 16 + (minute % 10);
      const secBCD = Math.floor(second / 10) * 16 + (second % 10);
      message[9] = (hhBCD << 24) | (minBCD << 16) | (secBCD << 8) | 0x00;
      dateTimeTime += performance.now() - dateTimeStart;

      // 6. 配列操作・その他
      const arrayStart = performance.now();
      message[10] = 0x00000000;
      message[11] = 0x00000000;
      message[12] = this.calculator['toLittleEndian32'](testConditions.keyInput);
      message[13] = 0x80000000;
      message[14] = 0x00000000;
      message[15] = 0x000001A0;
      arrayTime += performance.now() - arrayStart;

      // メッセージの有効性チェック（最適化の検証）
      if (message.length !== 16) {
        bottlenecks.push('Invalid message length generated');
      }
    }

    const totalTime = performance.now() - totalStart;
    const memoryAfter = (performance as any).memory?.usedJSHeapSize || 0;
    const memoryUsed = memoryAfter - memoryBefore;

    // breakdown計算
    breakdown.setupTime = setupTime;
    breakdown.nazoConversion = nazoTime;
    breakdown.macProcessing = macTime;
    breakdown.dateTimeProcessing = dateTimeTime;
    breakdown.arrayOperations = arrayTime;
    breakdown.other = totalTime - (setupTime + nazoTime + macTime + dateTimeTime + arrayTime);

    // ボトルネック分析
    const generationsPerSecond = iterations / (totalTime / 1000);
    const averageTimePerGeneration = totalTime / iterations;

    if (generationsPerSecond < 50000) {
      bottlenecks.push('メッセージ生成速度が低い (< 50,000 gen/sec)');
    }

    if (breakdown.dateTimeProcessing > totalTime * 0.4) {
      bottlenecks.push('日時・BCD変換処理が全体の40%以上を占有');
    }

    if (breakdown.nazoConversion > totalTime * 0.3) {
      bottlenecks.push('nazo値エンディアン変換が全体の30%以上を占有');
    }

    if (breakdown.setupTime > totalTime * 0.2) {
      bottlenecks.push('セットアップ・パラメータ取得が全体の20%以上を占有');
    }

    if (memoryUsed > iterations * 500) {
      bottlenecks.push('メモリ使用量が過大 (1回あたり500バイト以上)');
    }

    const metrics: MessageGenerationMetrics = {
      totalTime,
      generationsPerSecond,
      averageTimePerGeneration,
      memoryUsage: memoryUsed,
      breakdown,
      bottlenecks
    };

    this.logDetailedResults(metrics, iterations);
    return metrics;
  }

  /**
   * 200万件での大規模メッセージ生成テスト
   */
  async profileMassiveMessageGeneration(targetGenerations: number = 2000000): Promise<MessageGenerationMetrics> {
    console.log(`🔥 大規模メッセージ生成テスト (${targetGenerations.toLocaleString()}回)...`);
    console.log('⚠️ この処理は数分かかる場合があります');

    const batchSize = 100000; // バッチごとに処理
    const numBatches = Math.ceil(targetGenerations / batchSize);
    
    let totalTime = 0;
    let totalMemoryUsed = 0;
    const aggregatedBreakdown = {
      setupTime: 0,
      nazoConversion: 0,
      macProcessing: 0,
      dateTimeProcessing: 0,
      arrayOperations: 0,
      other: 0
    };
    const allBottlenecks: string[] = [];

    console.log(`${numBatches}個のバッチで処理を分割します...`);

    const overallStart = performance.now();

    for (let batch = 0; batch < numBatches; batch++) {
      const currentBatchSize = Math.min(batchSize, targetGenerations - batch * batchSize);
      
      console.log(`バッチ ${batch + 1}/${numBatches}: ${currentBatchSize.toLocaleString()}件処理中...`);

      const batchMetrics = await this.profileMessageGeneration(currentBatchSize);
      
      totalTime += batchMetrics.totalTime;
      totalMemoryUsed += batchMetrics.memoryUsage;
      
      // breakdown累積
      aggregatedBreakdown.setupTime += batchMetrics.breakdown.setupTime;
      aggregatedBreakdown.nazoConversion += batchMetrics.breakdown.nazoConversion;
      aggregatedBreakdown.macProcessing += batchMetrics.breakdown.macProcessing;
      aggregatedBreakdown.dateTimeProcessing += batchMetrics.breakdown.dateTimeProcessing;
      aggregatedBreakdown.arrayOperations += batchMetrics.breakdown.arrayOperations;
      aggregatedBreakdown.other += batchMetrics.breakdown.other;

      // ボトルネック集約
      batchMetrics.bottlenecks.forEach(b => {
        if (!allBottlenecks.includes(b)) {
          allBottlenecks.push(b);
        }
      });

      // ガベージコレクション促進
      if (batch % 5 === 0 && (window as any).gc) {
        (window as any).gc();
      }

      // 少し待機してUIをブロックしないように
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    const overallTime = performance.now() - overallStart;
    const generationsPerSecond = targetGenerations / (overallTime / 1000);

    // 200万件特有のボトルネック分析
    const estimatedTimeFor2Million = (2000000 / generationsPerSecond) / 60; // 分
    if (estimatedTimeFor2Million > 1) {
      allBottlenecks.push(`200万件処理に${estimatedTimeFor2Million.toFixed(1)}分必要 (目標: 1分以内)`);
    }

    if (totalMemoryUsed > 100 * 1024 * 1024) { // 100MB
      allBottlenecks.push(`大規模処理でのメモリ使用量が過大: ${(totalMemoryUsed / 1024 / 1024).toFixed(1)}MB`);
    }

    const massiveMetrics: MessageGenerationMetrics = {
      totalTime: overallTime,
      generationsPerSecond,
      averageTimePerGeneration: overallTime / targetGenerations,
      memoryUsage: totalMemoryUsed,
      breakdown: aggregatedBreakdown,
      bottlenecks: allBottlenecks
    };

    this.logMassiveResults(massiveMetrics, targetGenerations);
    return massiveMetrics;
  }

  /**
   * メッセージ生成 vs SHA-1計算の時間比較
   */
  async compareMessageGenerationVsCalculation(iterations: number = 50000): Promise<{
    messageGenTime: number;
    sha1CalcTime: number;
    messageGenPercentage: number;
    totalTime: number;
  }> {
    console.log(`⚖️ メッセージ生成 vs SHA-1計算 時間比較 (${iterations.toLocaleString()}回)`);

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

    const messages: number[][] = [];
    let messageGenTime = 0;
    let sha1CalcTime = 0;

    // 1. メッセージ生成時間のみ測定
    const genStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      const timer0 = 4320 + (i % 100);
      const vcount = 128 + (i % 50);
      const baseDate = new Date(2023, 11, 31, 23, 59, 59);
      const datetime = new Date(baseDate.getTime() + i * 1000);

      const message = this.calculator.generateMessage(testConditions, timer0, vcount, datetime);
      messages.push(message);
    }
    messageGenTime = performance.now() - genStart;

    // 2. SHA-1計算時間のみ測定
    const calcStart = performance.now();
    for (const message of messages) {
      this.calculator.calculateSeed(message);
    }
    sha1CalcTime = performance.now() - calcStart;

    const totalTime = messageGenTime + sha1CalcTime;
    const messageGenPercentage = (messageGenTime / totalTime) * 100;

    console.log(`📊 時間比較結果:`);
    console.log(`   メッセージ生成: ${messageGenTime.toFixed(2)}ms (${messageGenPercentage.toFixed(1)}%)`);
    console.log(`   SHA-1計算: ${sha1CalcTime.toFixed(2)}ms (${(100 - messageGenPercentage).toFixed(1)}%)`);
    console.log(`   合計時間: ${totalTime.toFixed(2)}ms`);

    if (messageGenPercentage > 20) {
      console.log(`⚠️ メッセージ生成が全体時間の${messageGenPercentage.toFixed(1)}%を占有（最適化対象）`);
    }

    return {
      messageGenTime,
      sha1CalcTime,
      messageGenPercentage,
      totalTime
    };
  }

  private logDetailedResults(metrics: MessageGenerationMetrics, iterations: number): void {
    console.log('\n📊 メッセージ生成プロファイリング結果:');
    console.log(`   総時間: ${metrics.totalTime.toFixed(2)}ms`);
    console.log(`   生成速度: ${metrics.generationsPerSecond.toFixed(0)} gen/sec`);
    console.log(`   1回あたり: ${(metrics.averageTimePerGeneration * 1000).toFixed(3)}μs`);
    console.log(`   メモリ使用量: ${(metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB`);
    console.log(`   1回あたりメモリ: ${(metrics.memoryUsage / iterations).toFixed(0)} bytes`);

    console.log('\n🔍 処理時間内訳:');
    const total = metrics.totalTime;
    console.log(`   セットアップ: ${metrics.breakdown.setupTime.toFixed(2)}ms (${(metrics.breakdown.setupTime/total*100).toFixed(1)}%)`);
    console.log(`   nazo変換: ${metrics.breakdown.nazoConversion.toFixed(2)}ms (${(metrics.breakdown.nazoConversion/total*100).toFixed(1)}%)`);
    console.log(`   MAC処理: ${metrics.breakdown.macProcessing.toFixed(2)}ms (${(metrics.breakdown.macProcessing/total*100).toFixed(1)}%)`);
    console.log(`   日時・BCD変換: ${metrics.breakdown.dateTimeProcessing.toFixed(2)}ms (${(metrics.breakdown.dateTimeProcessing/total*100).toFixed(1)}%)`);
    console.log(`   配列操作: ${metrics.breakdown.arrayOperations.toFixed(2)}ms (${(metrics.breakdown.arrayOperations/total*100).toFixed(1)}%)`);
    console.log(`   その他: ${metrics.breakdown.other.toFixed(2)}ms (${(metrics.breakdown.other/total*100).toFixed(1)}%)`);

    if (metrics.bottlenecks.length > 0) {
      console.log('\n⚠️ 検出されたボトルネック:');
      metrics.bottlenecks.forEach(bottleneck => console.log(`   • ${bottleneck}`));
    }
  }

  private logMassiveResults(metrics: MessageGenerationMetrics, iterations: number): void {
    console.log('\n🔥 大規模メッセージ生成テスト結果:');
    console.log(`   総処理件数: ${iterations.toLocaleString()}`);
    console.log(`   総時間: ${(metrics.totalTime / 1000).toFixed(2)}秒`);
    console.log(`   生成速度: ${metrics.generationsPerSecond.toFixed(0)} gen/sec`);
    console.log(`   メモリ使用量: ${(metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB`);

    const timeFor2Million = (2000000 / metrics.generationsPerSecond) / 60;
    console.log(`   200万件処理予想時間: ${timeFor2Million.toFixed(1)}分`);

    if (metrics.bottlenecks.length > 0) {
      console.log('\n⚠️ 大規模処理での問題点:');
      metrics.bottlenecks.forEach(bottleneck => console.log(`   • ${bottleneck}`));
    }
  }
}

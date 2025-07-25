/**
 * 本番環境で使用する基本的なパフォーマンス監視機能
 * 開発専用の詳細分析機能は含まない
 */

export interface BasicPerformanceMetrics {
  totalTime: number;
  calculationsPerSecond: number;
  memoryUsageMB: number;
}

export interface SearchProgressMetrics {
  processed: number;
  total: number;
  elapsedTime: number;
  estimatedTimeRemaining: number;
  currentSpeed: number; // calculations per second
}

/**
 * 本番環境での基本的なパフォーマンス測定
 */
export class ProductionPerformanceMonitor {
  private startTime: number = 0;
  private processedCount: number = 0;
  private lastUpdateTime: number = 0;
  private recentCalculations: number[] = [];

  /**
   * パフォーマンス測定開始
   */
  startMeasurement(): void {
    this.startTime = performance.now();
    this.processedCount = 0;
    this.lastUpdateTime = this.startTime;
    this.recentCalculations = [];
  }

  /**
   * 処理進捗の更新
   */
  updateProgress(processedCount: number): void {
    this.processedCount = processedCount;
    
    const currentTime = performance.now();
    const timeDiff = currentTime - this.lastUpdateTime;
    
    // 1秒間隔で速度を記録
    if (timeDiff >= 1000) {
      const countDiff = processedCount - (this.recentCalculations[this.recentCalculations.length - 1] || 0);
      const speed = countDiff / (timeDiff / 1000);
      this.recentCalculations.push(speed);
      
      // 直近10秒間のデータのみ保持
      if (this.recentCalculations.length > 10) {
        this.recentCalculations.shift();
      }
      
      this.lastUpdateTime = currentTime;
    }
  }

  /**
   * 基本的なパフォーマンスメトリクスを取得
   */
  getBasicMetrics(): BasicPerformanceMetrics {
    const currentTime = performance.now();
    const totalTime = currentTime - this.startTime;
    const calculationsPerSecond = this.processedCount / (totalTime / 1000);
    
    // メモリ使用量（利用可能な場合）
    const memoryUsageMB = (performance as any).memory 
      ? (performance as any).memory.usedJSHeapSize / 1024 / 1024 
      : 0;

    return {
      totalTime,
      calculationsPerSecond,
      memoryUsageMB
    };
  }

  /**
   * 進捗メトリクスを取得
   */
  getProgressMetrics(totalExpected: number): SearchProgressMetrics {
    const currentTime = performance.now();
    const elapsedTime = currentTime - this.startTime;
    
    // 直近の速度から残り時間を推定
    const currentSpeed = this.recentCalculations.length > 0
      ? this.recentCalculations.reduce((a, b) => a + b, 0) / this.recentCalculations.length
      : this.processedCount / (elapsedTime / 1000);
    
    const remaining = totalExpected - this.processedCount;
    const estimatedTimeRemaining = remaining > 0 && currentSpeed > 0 
      ? remaining / currentSpeed * 1000 
      : 0;

    return {
      processed: this.processedCount,
      total: totalExpected,
      elapsedTime,
      estimatedTimeRemaining,
      currentSpeed
    };
  }

  /**
   * 測定をリセット
   */
  reset(): void {
    this.startTime = 0;
    this.processedCount = 0;
    this.lastUpdateTime = 0;
    this.recentCalculations = [];
  }
}

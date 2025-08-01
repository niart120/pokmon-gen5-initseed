/**
 * Feature flags for controlling hook migration phases
 * Phase 3a: フラグベース切り替え機能の有効化
 */

interface FeatureFlagsConfig {
  /** Phase 3a: 最適化されたhookを特定コンポーネントで有効化 */
  enableOptimizedHooksForMainContent: boolean;
  enableOptimizedHooksForSearchPanel: boolean;
  
  /** Phase 3b準備: グローバル切り替え */
  enableOptimizedHooksGlobally: boolean;
  
  /** Debug/Testing flags */
  enableA11yTesting: boolean;
  logPerformanceMetrics: boolean;
  
  /** Development environment controls */
  isDevelopmentMode: boolean;
}

class FeatureFlags {
  private static instance: FeatureFlags;
  private config: FeatureFlagsConfig;

  private constructor() {
    this.config = {
      // Phase 3a: 段階的コンポーネント有効化
      enableOptimizedHooksForMainContent: false,  // 開始時は無効
      enableOptimizedHooksForSearchPanel: false,  // 開始時は無効
      
      // Phase 3b準備
      enableOptimizedHooksGlobally: false,
      
      // Debug flags
      enableA11yTesting: import.meta.env.DEV,
      logPerformanceMetrics: import.meta.env.DEV,
      
      // Environment detection
      isDevelopmentMode: import.meta.env.DEV,
    };
  }

  static getInstance(): FeatureFlags {
    if (!FeatureFlags.instance) {
      FeatureFlags.instance = new FeatureFlags();
    }
    return FeatureFlags.instance;
  }

  // Phase 3a getter methods
  isOptimizedHooksEnabledForMainContent(): boolean {
    return this.config.enableOptimizedHooksForMainContent;
  }

  isOptimizedHooksEnabledForSearchPanel(): boolean {
    return this.config.enableOptimizedHooksForSearchPanel;
  }

  isOptimizedHooksEnabledGlobally(): boolean {
    return this.config.enableOptimizedHooksGlobally;
  }

  // Debug/Testing getter methods
  isA11yTestingEnabled(): boolean {
    return this.config.enableA11yTesting;
  }

  isPerformanceMetricsEnabled(): boolean {
    return this.config.logPerformanceMetrics;
  }

  isDevelopmentMode(): boolean {
    return this.config.isDevelopmentMode;
  }

  // Phase 3a control methods
  enableOptimizedHooksForMainContent(): void {
    this.config.enableOptimizedHooksForMainContent = true;
    console.log('🚀 Phase 3a: MainContent最適化hook有効化');
  }

  enableOptimizedHooksForSearchPanel(): void {
    this.config.enableOptimizedHooksForSearchPanel = true;
    console.log('🚀 Phase 3a: SearchPanel最適化hook有効化');
  }

  enableOptimizedHooksForAllComponents(): void {
    this.config.enableOptimizedHooksForMainContent = true;
    this.config.enableOptimizedHooksForSearchPanel = true;
    console.log('🚀 Phase 3a: 全コンポーネント最適化hook有効化');
  }

  // Phase 3b control methods
  enableOptimizedHooksGlobally(): void {
    this.config.enableOptimizedHooksGlobally = true;
    console.log('🚀 Phase 3b: グローバル最適化hook有効化');
  }

  // Rollback methods
  disableOptimizedHooks(): void {
    this.config.enableOptimizedHooksForMainContent = false;
    this.config.enableOptimizedHooksForSearchPanel = false;
    this.config.enableOptimizedHooksGlobally = false;
    console.log('🔄 最適化hook無効化（ロールバック）');
  }

  // Configuration inspection
  getConfig(): Readonly<FeatureFlagsConfig> {
    return { ...this.config };
  }

  // Runtime configuration update (for testing)
  updateConfig(updates: Partial<FeatureFlagsConfig>): void {
    this.config = { ...this.config, ...updates };
    console.log('🔧 Feature flags updated:', updates);
  }
}

// Singleton instance export
export const featureFlags = FeatureFlags.getInstance();

// Type exports
export type { FeatureFlagsConfig };

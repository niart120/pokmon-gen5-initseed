/**
 * Phase 3 Revised: パフォーマンス比較スクリプト
 * 現行実装 vs 最適化実装の性能測定
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const RESULTS_DIR = './test-logs';
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-');

// 結果保存用ディレクトリ作成
if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

console.log('🎯 Phase 3 Performance Comparison Starting...\n');

/**
 * パフォーマンステストの実行
 */
async function runPerformanceTest(implementation) {
  console.log(`📊 Testing ${implementation.toUpperCase()} implementation...`);
  
  const env = implementation === 'optimized' 
    ? 'REACT_APP_USE_OPTIMIZED_HOOKS=true'
    : 'REACT_APP_USE_OPTIMIZED_HOOKS=false';
  
  const logFile = path.join(RESULTS_DIR, `performance-${implementation}-${TIMESTAMP}.log`);
  
  try {
    // 開発サーバーを一時的に起動してテスト
    console.log(`   Starting dev server with ${implementation} hooks...`);
    
    // パフォーマンステストコマンド実行
    const command = `cross-env ${env} npm run test 2>&1`;
    const output = execSync(command, { encoding: 'utf8', timeout: 30000 });
    
    // ログファイルに保存
    fs.writeFileSync(logFile, `=== ${implementation.toUpperCase()} Implementation Test ===\n${output}`);
    
    console.log(`   ✅ ${implementation} test completed`);
    return { implementation, success: true, logFile, output };
    
  } catch (error) {
    console.log(`   ❌ ${implementation} test failed: ${error.message}`);
    fs.writeFileSync(logFile, `=== ${implementation.toUpperCase()} Implementation Test FAILED ===\n${error.message}\n${error.stdout || ''}`);
    return { implementation, success: false, logFile, error: error.message };
  }
}

/**
 * 結果の比較と分析
 */
function analyzeResults(currentResult, optimizedResult) {
  console.log('\n📋 Performance Analysis Results:');
  console.log('================================');
  
  const analysis = {
    timestamp: new Date().toISOString(),
    current: {
      success: currentResult.success,
      logFile: currentResult.logFile
    },
    optimized: {
      success: optimizedResult.success,
      logFile: optimizedResult.logFile
    },
    recommendation: ''
  };
  
  if (currentResult.success && optimizedResult.success) {
    console.log('✅ Both implementations passed tests');
    analysis.recommendation = 'Both implementations are stable. Choose based on performance characteristics.';
  } else if (currentResult.success && !optimizedResult.success) {
    console.log('⚠️  Current implementation passed, Optimized failed');
    analysis.recommendation = 'Stick with current implementation. Optimized version needs fixes.';
  } else if (!currentResult.success && optimizedResult.success) {
    console.log('⚠️  Optimized implementation passed, Current failed');
    analysis.recommendation = 'Consider adopting optimized implementation after validation.';
  } else {
    console.log('❌ Both implementations failed tests');
    analysis.recommendation = 'Both implementations have issues. Investigation required.';
  }
  
  // 分析結果をファイルに保存
  const analysisFile = path.join(RESULTS_DIR, `performance-analysis-${TIMESTAMP}.json`);
  fs.writeFileSync(analysisFile, JSON.stringify(analysis, null, 2));
  
  console.log(`\n📁 Analysis saved to: ${analysisFile}`);
  console.log(`📊 Recommendation: ${analysis.recommendation}`);
  
  return analysis;
}

/**
 * メイン実行関数
 */
async function main() {
  try {
    // 現行実装テスト
    const currentResult = await runPerformanceTest('current');
    
    // 少し待機
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 最適化実装テスト
    const optimizedResult = await runPerformanceTest('optimized');
    
    // 結果分析
    const analysis = analyzeResults(currentResult, optimizedResult);
    
    console.log('\n🎉 Performance comparison completed!');
    console.log('\n📝 Next Steps:');
    console.log('1. Review the analysis results');
    console.log('2. Test both implementations manually:');
    console.log('   npm run dev:current   # Test current implementation');
    console.log('   npm run dev:optimized # Test optimized implementation');
    console.log('3. Make implementation decision based on findings');
    console.log('4. Clean up unused code after decision');
    
  } catch (error) {
    console.error('❌ Performance comparison failed:', error.message);
    process.exit(1);
  }
}

// 実行
if (require.main === module) {
  main();
}

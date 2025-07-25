/**
 * Copilot Instructions バリデーションスクリプト
 */

/**
 * ValidationResult
 * @typedef {Object} ValidationResult
 * @property {boolean} passed
 * @property {string[]} issues
 * @property {string[]} suggestions
 * @property {Object} stats
 * @property {number} stats.lineCount
 * @property {number} stats.fileSize
 */

/**
 * Copilot Instructions の内容を検証
 * @param {string} content 
 * @returns {ValidationResult}
 */
export function validateCopilotInstructions(content) {
  const issues = [];
  const suggestions = [];
  
  // 基本統計
  const lines = content.split('\n');
  const lineCount = lines.length;
  const fileSize = content.length;
  
  // 行数チェック（GitHub推奨: 簡潔性）
  if (lineCount > 30) {
    issues.push(`行数超過: ${lineCount}行（推奨: 30行以内）`);
    suggestions.push('詳細な指示はInstructions FilesまたはPrompt Filesに移動');
  }
  
  // アンチパターン検出
  const antiPatterns = [
    { 
      pattern: /(日本語で|Japanese|in Japanese)/i, 
      message: 'スタイル指定検出: 言語指定は避ける' 
    },
    { 
      pattern: /(参照して|refer to|see|check)/i, 
      message: '外部参照指示検出: 自己完結性を保つ' 
    },
    { 
      pattern: /```[\s\S]*?(npm run|powershell|cmd|bash)/m, 
      message: '具体的コマンド検出: Prompt Filesに移動' 
    },
    { 
      pattern: /(always|必ず|絶対に).*(answer|回答|respond)/i, 
      message: '回答スタイル指定検出: 避けるべき' 
    },
    { 
      pattern: /(\d{1,3}行|\d{1,4}\s*lines)/i, 
      message: '具体的な行数言及: 詳細すぎる可能性' 
    }
  ];
  
  antiPatterns.forEach(({ pattern, message }) => {
    if (pattern.test(content)) {
      issues.push(message);
    }
  });
  
  // ベストプラクティスチェック
  const bestPractices = [
    {
      pattern: /プロジェクト概要|Project Overview/i,
      message: 'プロジェクト概要が含まれている ✓'
    },
    {
      pattern: /技術スタック|Technology Stack/i,
      message: '技術スタックが含まれている ✓'
    },
    {
      pattern: /フォルダ構造|Folder Structure/i,
      message: 'フォルダ構造が含まれている ✓'
    }
  ];
  
  const missingBestPractices = bestPractices.filter(({ pattern }) => 
    !pattern.test(content)
  );
  
  if (missingBestPractices.length > 0) {
    suggestions.push(`推奨要素が不足: ${missingBestPractices.map(bp => bp.message).join(', ')}`);
  }
  
  return {
    passed: issues.length === 0,
    issues,
    suggestions,
    stats: {
      lineCount,
      fileSize
    }
  };
}

// Node.js環境での実行用
if (typeof require !== 'undefined' && require.main === module) {
  const fs = require('fs');
  const path = require('path');
  
  const instructionsPath = path.join(__dirname, '..', 'copilot-instructions.md');
  
  try {
    const content = fs.readFileSync(instructionsPath, 'utf-8');
    const result = validateCopilotInstructions(content);
    
    console.log('📋 Copilot Instructions バリデーション結果');
    console.log('='.repeat(50));
    console.log(`✅ ステータス: ${result.passed ? 'PASS' : 'FAIL'}`);
    console.log(`📊 統計: ${result.stats.lineCount}行, ${result.stats.fileSize}文字`);
    
    if (result.issues.length > 0) {
      console.log('\n❌ 問題点:');
      result.issues.forEach((issue, i) => console.log(`  ${i + 1}. ${issue}`));
    }
    
    if (result.suggestions.length > 0) {
      console.log('\n💡 改善提案:');
      result.suggestions.forEach((suggestion, i) => console.log(`  ${i + 1}. ${suggestion}`));
    }
    
    process.exit(result.passed ? 0 : 1);
    
  } catch (error) {
    console.error('❌ ファイル読み込みエラー:', error.message);
    process.exit(1);
  }
}

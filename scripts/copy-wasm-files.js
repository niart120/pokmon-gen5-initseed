#!/usr/bin/env node

/**
 * WASM ファイル自動コピースクリプト
 * wasm-pkg/pkg/ から src/wasm/ と public/wasm/ にWASMファイルをコピー
 */

import { copyFile, mkdir, access, readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// コピー対象ファイル一覧
const WASM_FILES = [
  'wasm_pkg.js',
  'wasm_pkg.d.ts', 
  'wasm_pkg_bg.wasm',
  'wasm_pkg_bg.wasm.d.ts',
  'package.json'
];

// コピー先ディレクトリ
const DEST_DIRS = [
  join(projectRoot, 'src', 'wasm'),
  join(projectRoot, 'public', 'wasm')
];

const SOURCE_DIR = join(projectRoot, 'wasm-pkg', 'pkg');

/**
 * ディレクトリが存在するかチェック、なければ作成
 */
async function ensureDir(dirPath) {
  try {
    await access(dirPath);
  } catch {
    await mkdir(dirPath, { recursive: true });
    console.log(`📁 ディレクトリを作成: ${dirPath}`);
  }
}

/**
 * ファイルの存在確認
 */
async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * WASMファイルをコピー
 */
async function copyWasmFiles() {
  console.log('🦀 WASM ファイルコピー開始...');

  // ソースディレクトリの確認
  if (!(await fileExists(SOURCE_DIR))) {
    console.error(`❌ ソースディレクトリが見つかりません: ${SOURCE_DIR}`);
    console.error('💡 先に "cd wasm-pkg && wasm-pack build --target web --out-dir pkg" を実行してください');
    process.exit(1);
  }

  // ソースディレクトリのファイル一覧確認
  const sourceFiles = await readdir(SOURCE_DIR);
  console.log(`📂 ソースディレクトリのファイル: ${sourceFiles.join(', ')}`);

  // 各コピー先ディレクトリの作成とファイルコピー
  for (const destDir of DEST_DIRS) {
    await ensureDir(destDir);
    console.log(`\n📋 ${destDir} へコピー中...`);

    for (const fileName of WASM_FILES) {
      const sourcePath = join(SOURCE_DIR, fileName);
      const destPath = join(destDir, fileName);

      if (await fileExists(sourcePath)) {
        await copyFile(sourcePath, destPath);
        console.log(`  ✅ ${fileName}`);
      } else {
        console.warn(`  ⚠️  ${fileName} が見つかりません (スキップ)`);
      }
    }
  }

  console.log('\n🎉 WASM ファイルコピー完了!');
}

/**
 * メイン処理
 */
async function main() {
  try {
    await copyWasmFiles();
  } catch (error) {
    console.error('❌ エラーが発生しました:', error.message);
    console.error('スタックトレース:', error.stack);
    process.exit(1);
  }
}

// メイン処理を実行
main();

export { copyWasmFiles };

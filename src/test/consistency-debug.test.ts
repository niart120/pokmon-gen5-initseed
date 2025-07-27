/**
 * 整合性確認テスト - デバッグ実行
 */

import { test } from 'vitest';
import { debugConsistencyTest, debugSearchRangeSample } from '../test-utils/consistency';

test('整合性確認デバッグ - 期待値条件での計算確認', async () => {
  await debugConsistencyTest();
}, 60000);

test('整合性確認デバッグ - 検索範囲サンプリング', async () => {
  await debugSearchRangeSample();
}, 60000);

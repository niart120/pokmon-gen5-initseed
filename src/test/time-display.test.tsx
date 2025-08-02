import { describe, it, expect } from 'vitest';
import { formatElapsedTime, formatRemainingTime, formatProcessingRate } from '../lib/utils/format-helpers';

describe('TimeDisplay format helpers', () => {
  describe('formatElapsedTime', () => {
    it('時間を正しくフォーマットする', () => {
      expect(formatElapsedTime(150000)).toBe('2m 30s'); // 2分30秒
      expect(formatElapsedTime(3661000)).toBe('1h 1m 1s'); // 1時間1分1秒
      expect(formatElapsedTime(5000)).toBe('5s'); // 5秒
      expect(formatElapsedTime(0)).toBe('0s'); // 0秒
    });

    it('負の値でも適切に処理する', () => {
      expect(formatElapsedTime(-1000)).toBe('-1s'); // 負の値もそのまま表示
    });
  });

  describe('formatRemainingTime', () => {
    it('残り時間を正しくフォーマットする', () => {
      expect(formatRemainingTime(195000)).toBe('3m 15s'); // 3分15秒
      expect(formatRemainingTime(7323000)).toBe('2h 2m 3s'); // 2時間2分3秒
      expect(formatRemainingTime(30000)).toBe('30s'); // 30秒
    });

    it('0以下の値で--を返す', () => {
      expect(formatRemainingTime(0)).toBe('--');
      expect(formatRemainingTime(-5000)).toBe('--');
    });
  });

  describe('formatProcessingRate', () => {
    it('処理速度を正しく計算・フォーマットする', () => {
      expect(formatProcessingRate(1000, 10000)).toBe('100/s'); // 1000 steps / 10秒 = 100/s
      expect(formatProcessingRate(5000, 25000)).toBe('200/s'); // 5000 steps / 25秒 = 200/s
    });

    it('0や負の値で--/sを返す', () => {
      expect(formatProcessingRate(0, 10000)).toBe('--/s');
      expect(formatProcessingRate(1000, 0)).toBe('--/s');
      expect(formatProcessingRate(-1000, 10000)).toBe('--/s');
    });

    it('一時停止を含む検索でのSpeed計算', () => {
      // 一時停止を含む場合のシミュレーション
      const processedSteps = 1000;
      const cumulativeRunTime = 10000; // 10秒間の実際の実行時間（一時停止期間は除外）
      
      expect(formatProcessingRate(processedSteps, cumulativeRunTime)).toBe('100/s');
      
      // 長時間の一時停止があった場合でも正確
      const longPauseScenario = 500;
      const shortRunTime = 5000; // 5秒間の実行時間
      expect(formatProcessingRate(longPauseScenario, shortRunTime)).toBe('100/s');
    });

    it('完了時の不正な値での計算を防ぐ', () => {
      // 問題のケース：完了時にcurrentStepがtotalStepsに置き換えられる
      const actualProcessedSteps = 1000;
      const totalStepsWrong = 50000; // 不正に設定されたtotalSteps
      const elapsedTime = 10000; // 10秒
      
      // 間違った値での計算
      const wrongSpeed = formatProcessingRate(totalStepsWrong, elapsedTime);
      expect(wrongSpeed).toBe('5,000/s'); // 過大評価
      
      // 正しい値での計算
      const correctSpeed = formatProcessingRate(actualProcessedSteps, elapsedTime);
      expect(correctSpeed).toBe('100/s'); // 正確
    });
  });
});

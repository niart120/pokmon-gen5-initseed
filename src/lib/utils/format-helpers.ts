/**
 * 時間表示とパフォーマンス表示のフォーマットヘルパー関数
 */

/**
 * 一時停止時間を考慮したリアルタイム経過時間を計算
 */
export function calculateAdjustedElapsedTime(
  rawElapsedTime: number,
  totalPausedTime: number,
  pauseStartTime: number | null
): number {
  const currentPauseDuration = pauseStartTime ? Date.now() - pauseStartTime : 0;
  return Math.max(0, rawElapsedTime - totalPausedTime - currentPauseDuration);
}

/**
 * ミリ秒を時間/分/秒形式にフォーマット (1h 2m 3s形式)
 * 上位の単位が0の場合は省略 (例: 2m 3s, 3s)
 */
export function formatElapsedTime(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  const parts: string[] = [];
  
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0) parts.push(`${mins}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
  
  return parts.join(' ');
}

/**
 * 残り時間をフォーマット（0以下の場合は"--"を返す）
 */
export function formatRemainingTime(milliseconds: number): string {
  if (milliseconds <= 0) return '--';
  
  const seconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  const parts: string[] = [];
  
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0) parts.push(`${mins}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
  
  return parts.join(' ');
}

/**
 * 処理速度を計算してフォーマット
 */
export function formatProcessingRate(currentStep: number, elapsedTimeMs: number): string {
  if (elapsedTimeMs <= 0 || currentStep <= 0) return '--/s';
  
  const rate = Math.round(currentStep / (elapsedTimeMs / 1000));
  return `${rate.toLocaleString()}/s`;
}

/**
 * 全体の処理速度を計算
 */
export function calculateOverallProcessingRate(totalCurrentStep: number, totalElapsedTime: number): number {
  if (totalElapsedTime <= 0 || totalCurrentStep <= 0) return 0;
  return Math.round(totalCurrentStep / (totalElapsedTime / 1000));
}

/**
 * 個別ワーカーの処理速度を計算
 */
export function calculateWorkerProcessingRate(currentStep: number, elapsedTime: number): number {
  if (elapsedTime <= 0 || currentStep <= 0) return 0;
  return Math.round(currentStep / (elapsedTime / 1000));
}

/**
 * 時刻フォーマット変換ユーティリティ
 * 類似ツールの出力形式と当アプリケーションのDate形式間の変換
 */

/**
 * 類似ツールの時刻形式をDateオブジェクトに変換
 * @param dateStr 類似ツール形式の時刻文字列 "YYYY/MM/DD HH:MM:SS"
 * @returns Dateオブジェクト
 * @example parseExpectedDateTime("2066/06/27 03:02:48") → Date(2066, 5, 27, 3, 2, 48)
 */
export function parseExpectedDateTime(dateStr: string): Date {
  const [datePart, timePart] = dateStr.split(' ');
  if (!datePart || !timePart) {
    throw new Error(`Invalid date format: ${dateStr}. Expected "YYYY/MM/DD HH:MM:SS"`);
  }

  const [year, month, day] = datePart.split('/').map(Number);
  const [hour, minute, second] = timePart.split(':').map(Number);

  if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hour) || isNaN(minute) || isNaN(second)) {
    throw new Error(`Invalid date components in: ${dateStr}`);
  }

  // Dateコンストラクタの月は0ベース
  return new Date(year, month - 1, day, hour, minute, second);
}

/**
 * Dateオブジェクトを類似ツールの時刻形式に変換
 * @param date Dateオブジェクト
 * @returns 類似ツール形式の時刻文字列 "YYYY/MM/DD HH:MM:SS"
 * @example formatDateTime(new Date(2066, 5, 27, 3, 2, 48)) → "2066/06/27 03:02:48"
 */
export function formatDateTime(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  const second = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}/${month}/${day} ${hour}:${minute}:${second}`;
}

/**
 * 2つのDateオブジェクトが同じ時刻を表すかチェック（秒単位の精度）
 * @param date1 比較対象1
 * @param date2 比較対象2
 * @returns 同じ時刻の場合true
 */
export function isSameDateTime(date1: Date, date2: Date): boolean {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate() &&
         date1.getHours() === date2.getHours() &&
         date1.getMinutes() === date2.getMinutes() &&
         date1.getSeconds() === date2.getSeconds();
}

/**
 * 指定された時刻を中心とした局所検索範囲を生成
 * @param centerTime 中心時刻
 * @param minuteRange 前後の分数範囲（デフォルト: ±2分）
 * @returns 検索範囲オブジェクト
 */
export function createLocalSearchRange(centerTime: Date, minuteRange: number = 2) {
  const startTime = new Date(centerTime.getTime() - minuteRange * 60 * 1000);
  const endTime = new Date(centerTime.getTime() + minuteRange * 60 * 1000);

  return {
    startYear: startTime.getFullYear(),
    endYear: endTime.getFullYear(),
    startMonth: startTime.getMonth() + 1,
    endMonth: endTime.getMonth() + 1,
    startDay: startTime.getDate(),
    endDay: endTime.getDate(),
    startHour: startTime.getHours(),
    endHour: endTime.getHours(),
    startMinute: startTime.getMinutes(),
    endMinute: endTime.getMinutes(),
    startSecond: 0,
    endSecond: 59
  };
}

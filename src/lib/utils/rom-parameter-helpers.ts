/**
 * ROM Parameters Helper Functions
 * 新しいタプル型ROMParametersデータ構造のアクセス関数
 */
import type { ROMParameters } from '@/types/pokemon';
import romParameters from '@/data/rom-parameters';

/**
 * 指定されたVCOUNT値に対応するTimer0範囲を取得
 * @param version ROM version
 * @param region ROM region  
 * @param vcount VCOUNT value
 * @returns Timer0範囲、または該当なしの場合null
 */
export function getTimer0Range(version: string, region: string, vcount: number): 
  { min: number; max: number } | null {
  
  const params = getROMParameters(version, region);
  if (!params) return null;
  
  for (const [vcountValue, timer0Min, timer0Max] of params.vcountTimerRanges) {
    if (vcountValue === vcount) {
      return { min: timer0Min, max: timer0Max };
    }
  }
  
  return null;
}

/**
 * 指定されたROMで有効なVCOUNT値の一覧を取得
 * @param version ROM version
 * @param region ROM region
 * @returns 有効なVCOUNT値の配列
 */
export function getValidVCounts(version: string, region: string): number[] {
  const params = getROMParameters(version, region);
  if (!params) return [];
  
  return params.vcountTimerRanges.map(([vcount]) => vcount);
}

/**
 * 指定されたVCOUNT値が有効かチェック
 * @param version ROM version
 * @param region ROM region
 * @param vcount VCOUNT value to validate
 * @returns true if valid
 */
export function isValidVCount(version: string, region: string, vcount: number): boolean {
  const validVCounts = getValidVCounts(version, region);
  return validVCounts.includes(vcount);
}

/**
 * Timer0値から対応するVCOUNT値を逆引き
 * @param version ROM version
 * @param region ROM region
 * @param timer0 Timer0 value
 * @returns 対応するVCOUNT値、または該当なしの場合null
 */
export function getVCountFromTimer0(version: string, region: string, timer0: number): 
  number | null {
  
  const params = getROMParameters(version, region);
  if (!params) return null;
  
  for (const [vcount, timer0Min, timer0Max] of params.vcountTimerRanges) {
    if (timer0 >= timer0Min && timer0 <= timer0Max) {
      return vcount;
    }
  }
  
  return null;
}

/**
 * ROMParametersを取得（型安全）
 * @param version ROM version
 * @param region ROM region
 * @returns ROMParameters or null if not found
 */
function getROMParameters(version: string, region: string): ROMParameters | null {
  const versionData = (romParameters as any)[version];
  if (!versionData) return null;
  
  const regionData = versionData[region];
  if (!regionData) return null;
  
  return regionData as ROMParameters;
}

/**
 * 指定されたROMで利用可能なTimer0の全範囲を取得
 * @param version ROM version
 * @param region ROM region
 * @returns Timer0の最小・最大値、または該当なしの場合null
 */
export function getFullTimer0Range(version: string, region: string): 
  { min: number; max: number } | null {
  
  const params = getROMParameters(version, region);
  if (!params || params.vcountTimerRanges.length === 0) return null;
  
  let min = Number.MAX_SAFE_INTEGER;
  let max = Number.MIN_SAFE_INTEGER;
  
  for (const [, timer0Min, timer0Max] of params.vcountTimerRanges) {
    min = Math.min(min, timer0Min);
    max = Math.max(max, timer0Max);
  }
  
  return { min, max };
}

/**
 * VCOUNTずれ対応バージョンかどうかを判定
 * @param version ROM version
 * @param region ROM region
 * @returns true if VCOUNT offset version
 */
export function hasVCountOffset(version: string, region: string): boolean {
  const params = getROMParameters(version, region);
  if (!params) return false;
  
  return params.vcountTimerRanges.length > 1;
}

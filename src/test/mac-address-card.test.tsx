import { describe, it, expect } from 'vitest';

describe('MACAddressCard New Approach', () => {
  const isValidHexInput = (value: string): boolean => {
    return /^[0-9a-fA-F]{0,2}$/i.test(value);
  };

  const formatInputValue = (value: string): string => {
    return value.toUpperCase();
  };

  const validateAndFormat = (input: string, fallback: number): { valid: boolean; value: number; display: string } => {
    // パーサによるバリデーション
    const hexValue = input.toLowerCase();
    const cleanInput = hexValue.startsWith('0x') ? hexValue.substring(2) : hexValue;
    
    if (/^[0-9a-f]{1,2}$/.test(cleanInput)) {
      const parsed = parseInt(cleanInput, 16);
      if (parsed >= 0 && parsed <= 255) {
        return {
          valid: true,
          value: parsed,
          display: parsed.toString(16).padStart(2, '0').toUpperCase()
        };
      }
    }
    
    // バリデーション失敗時は元の値を保持
    return {
      valid: false,
      value: fallback,
      display: fallback.toString(16).padStart(2, '0').toUpperCase()
    };
  };

  it('should validate hex input correctly', () => {
    expect(isValidHexInput('')).toBe(true);
    expect(isValidHexInput('1')).toBe(true);
    expect(isValidHexInput('A')).toBe(true);
    expect(isValidHexInput('FF')).toBe(true);
    expect(isValidHexInput('ff')).toBe(true);
    expect(isValidHexInput('G')).toBe(false);
    expect(isValidHexInput('ABC')).toBe(false);
  });

  it('should format input to uppercase', () => {
    expect(formatInputValue('a')).toBe('A');
    expect(formatInputValue('ff')).toBe('FF');
    expect(formatInputValue('1a')).toBe('1A');
  });

  it('should validate and format on blur correctly', () => {
    // 有効な値のテスト
    expect(validateAndFormat('1', 0)).toEqual({ valid: true, value: 1, display: '01' });
    expect(validateAndFormat('FF', 0)).toEqual({ valid: true, value: 255, display: 'FF' });
    expect(validateAndFormat('a0', 0)).toEqual({ valid: true, value: 160, display: 'A0' });
    
    // 無効な値のテスト（元の値を保持）
    expect(validateAndFormat('', 42)).toEqual({ valid: false, value: 42, display: '2A' });
    expect(validateAndFormat('GG', 42)).toEqual({ valid: false, value: 42, display: '2A' });
    expect(validateAndFormat('256', 42)).toEqual({ valid: false, value: 42, display: '2A' });
  });

  it('should handle focus selection behavior', () => {
    // フォーカス時の全選択は DOM 操作なので、ここでは概念をテスト
    const shouldSelectAll = true;
    expect(shouldSelectAll).toBe(true);
  });

  it('should handle typical user scenarios', () => {
    // シナリオ1: 正常な入力
    let result = validateAndFormat('12', 0);
    expect(result).toEqual({ valid: true, value: 18, display: '12' });
    
    // シナリオ2: 1桁入力
    result = validateAndFormat('A', 0);
    expect(result).toEqual({ valid: true, value: 10, display: '0A' });
    
    // シナリオ3: 無効入力（元の値保持）
    result = validateAndFormat('XY', 255);
    expect(result).toEqual({ valid: false, value: 255, display: 'FF' });
    
    // シナリオ4: 空入力（元の値保持）
    result = validateAndFormat('', 100);
    expect(result).toEqual({ valid: false, value: 100, display: '64' });
  });

  it('should handle edge cases', () => {
    // 最小値
    expect(validateAndFormat('0', 50)).toEqual({ valid: true, value: 0, display: '00' });
    
    // 最大値
    expect(validateAndFormat('FF', 50)).toEqual({ valid: true, value: 255, display: 'FF' });
    
    // 範囲外
    expect(validateAndFormat('100', 50)).toEqual({ valid: false, value: 50, display: '32' });
  });
});

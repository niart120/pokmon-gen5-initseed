import { describe, it, expect } from 'vitest';

describe('Timer0VCountCard Input Logic', () => {
  const isValidTimer0Input = (value: string): boolean => {
    return /^[0-9a-fA-F]{0,4}$/i.test(value);
  };

  const isValidVCountInput = (value: string): boolean => {
    return /^[0-9a-fA-F]{0,2}$/i.test(value);
  };

  const validateTimer0 = (input: string, fallback: number): { valid: boolean; value: number; display: string } => {
    const hexValue = input.toLowerCase();
    const cleanInput = hexValue.startsWith('0x') ? hexValue.substring(2) : hexValue;
    
    if (/^[0-9a-f]{1,4}$/.test(cleanInput)) {
      const parsed = parseInt(cleanInput, 16);
      if (parsed >= 0 && parsed <= 0xFFFF) {
        return {
          valid: true,
          value: parsed,
          display: parsed.toString(16).toUpperCase()
        };
      }
    }
    
    return {
      valid: false,
      value: fallback,
      display: fallback.toString(16).toUpperCase()
    };
  };

  const validateVCount = (input: string, fallback: number): { valid: boolean; value: number; display: string } => {
    const hexValue = input.toLowerCase();
    const cleanInput = hexValue.startsWith('0x') ? hexValue.substring(2) : hexValue;
    
    if (/^[0-9a-f]{1,2}$/.test(cleanInput)) {
      const parsed = parseInt(cleanInput, 16);
      if (parsed >= 0 && parsed <= 0xFF) {
        return {
          valid: true,
          value: parsed,
          display: parsed.toString(16).toUpperCase()
        };
      }
    }
    
    return {
      valid: false,
      value: fallback,
      display: fallback.toString(16).toUpperCase()
    };
  };

  describe('Timer0 Input Validation', () => {
    it('should validate Timer0 hex input correctly', () => {
      expect(isValidTimer0Input('')).toBe(true);
      expect(isValidTimer0Input('1')).toBe(true);
      expect(isValidTimer0Input('AB')).toBe(true);
      expect(isValidTimer0Input('1234')).toBe(true);
      expect(isValidTimer0Input('FFFF')).toBe(true);
      expect(isValidTimer0Input('G')).toBe(false);
      expect(isValidTimer0Input('12345')).toBe(false); // Too long
    });

    it('should validate and format Timer0 values on blur', () => {
      // 有効な値のテスト
      expect(validateTimer0('1', 0)).toEqual({ valid: true, value: 1, display: '1' });
      expect(validateTimer0('AB', 0)).toEqual({ valid: true, value: 171, display: 'AB' });
      expect(validateTimer0('FFFF', 0)).toEqual({ valid: true, value: 65535, display: 'FFFF' });
      
      // 無効な値のテスト（元の値を保持）
      expect(validateTimer0('', 1000)).toEqual({ valid: false, value: 1000, display: '3E8' });
      expect(validateTimer0('GG', 1000)).toEqual({ valid: false, value: 1000, display: '3E8' });
      expect(validateTimer0('10000', 1000)).toEqual({ valid: false, value: 1000, display: '3E8' });
    });

    it('should handle Timer0 edge cases', () => {
      // 最小値
      expect(validateTimer0('0', 50)).toEqual({ valid: true, value: 0, display: '0' });
      
      // 最大値
      expect(validateTimer0('FFFF', 50)).toEqual({ valid: true, value: 65535, display: 'FFFF' });
      
      // 範囲外
      expect(validateTimer0('10000', 50)).toEqual({ valid: false, value: 50, display: '32' });
    });
  });

  describe('VCount Input Validation', () => {
    it('should validate VCount hex input correctly', () => {
      expect(isValidVCountInput('')).toBe(true);
      expect(isValidVCountInput('1')).toBe(true);
      expect(isValidVCountInput('A')).toBe(true);
      expect(isValidVCountInput('FF')).toBe(true);
      expect(isValidVCountInput('ff')).toBe(true);
      expect(isValidVCountInput('G')).toBe(false);
      expect(isValidVCountInput('ABC')).toBe(false); // Too long
    });

    it('should validate and format VCount values on blur', () => {
      // 有効な値のテスト
      expect(validateVCount('1', 0)).toEqual({ valid: true, value: 1, display: '1' });
      expect(validateVCount('A0', 0)).toEqual({ valid: true, value: 160, display: 'A0' });
      expect(validateVCount('FF', 0)).toEqual({ valid: true, value: 255, display: 'FF' });
      
      // 無効な値のテスト（元の値を保持）
      expect(validateVCount('', 100)).toEqual({ valid: false, value: 100, display: '64' });
      expect(validateVCount('GG', 100)).toEqual({ valid: false, value: 100, display: '64' });
      expect(validateVCount('100', 100)).toEqual({ valid: false, value: 100, display: '64' });
    });

    it('should handle VCount edge cases', () => {
      // 最小値
      expect(validateVCount('0', 50)).toEqual({ valid: true, value: 0, display: '0' });
      
      // 最大値
      expect(validateVCount('FF', 50)).toEqual({ valid: true, value: 255, display: 'FF' });
      
      // 範囲外
      expect(validateVCount('100', 50)).toEqual({ valid: false, value: 50, display: '32' });
    });
  });

  describe('User Scenarios', () => {
    it('should handle typical Timer0 input scenarios', () => {
      // シナリオ1: 4桁入力
      let result = validateTimer0('1A2B', 0);
      expect(result).toEqual({ valid: true, value: 6699, display: '1A2B' });
      
      // シナリオ2: 短い入力
      result = validateTimer0('5', 0);
      expect(result).toEqual({ valid: true, value: 5, display: '5' });
      
      // シナリオ3: 無効入力（元の値保持）
      result = validateTimer0('XYZ', 1000);
      expect(result).toEqual({ valid: false, value: 1000, display: '3E8' });
    });

    it('should handle typical VCount input scenarios', () => {
      // シナリオ1: 2桁入力
      let result = validateVCount('A5', 0);
      expect(result).toEqual({ valid: true, value: 165, display: 'A5' });
      
      // シナリオ2: 1桁入力
      result = validateVCount('C', 0);
      expect(result).toEqual({ valid: true, value: 12, display: 'C' });
      
      // シナリオ3: 無効入力（元の値保持）
      result = validateVCount('XY', 200);
      expect(result).toEqual({ valid: false, value: 200, display: 'C8' });
    });
  });
});

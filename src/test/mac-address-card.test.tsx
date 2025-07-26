import { describe, it, expect } from 'vitest';

describe('MACAddressCard Logic', () => {
  const isValidHexInput = (value: string): boolean => {
    return /^[0-9a-fA-F]{0,2}$/i.test(value);
  };

  const formatInputValue = (value: string): string => {
    return value.toUpperCase();
  };

  const shouldRemoveLeadingZero = (value: string): boolean => {
    return value.length === 2 && value.startsWith('0') && value !== '00';
  };

  const formatOnBlur = (value: string): string => {
    if (value === '') {
      return '00';
    } else if (value.length === 1) {
      return '0' + value;
    }
    return value;
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

  it('should identify leading zero removal cases', () => {
    expect(shouldRemoveLeadingZero('01')).toBe(true);
    expect(shouldRemoveLeadingZero('0A')).toBe(true);
    expect(shouldRemoveLeadingZero('00')).toBe(false);
    expect(shouldRemoveLeadingZero('10')).toBe(false);
    expect(shouldRemoveLeadingZero('1')).toBe(false);
  });

  it('should format values correctly on blur', () => {
    expect(formatOnBlur('')).toBe('00');
    expect(formatOnBlur('1')).toBe('01');
    expect(formatOnBlur('A')).toBe('0A');
    expect(formatOnBlur('FF')).toBe('FF');
    expect(formatOnBlur('12')).toBe('12');
  });

  it('should handle continuous input scenarios correctly', () => {
    // Scenario: User wants to input "12"
    // 1. Focus on field showing "00"
    // 2. Clear and type "1" -> should show "1"
    // 3. Type "2" -> should show "12"
    // 4. Blur -> should show "12" (not "01")
    
    let currentValue = '00';
    
    // Focus removes leading zero for editing
    if (shouldRemoveLeadingZero(currentValue)) {
      currentValue = currentValue[1];
    }
    expect(currentValue).toBe('00'); // "00" doesn't change on focus
    
    // User clears and types "1"
    currentValue = '1';
    expect(isValidHexInput(currentValue)).toBe(true);
    
    // User continues typing "2"
    currentValue = '12';
    expect(isValidHexInput(currentValue)).toBe(true);
    
    // Blur should keep "12" as is
    expect(formatOnBlur(currentValue)).toBe('12');
  });
});

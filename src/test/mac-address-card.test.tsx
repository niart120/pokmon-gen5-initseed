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
});

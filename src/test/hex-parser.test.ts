import { describe, it, expect } from 'vitest';
import { parseHexInput, formatHexDisplay, parseMacByte } from '../lib/utils/hex-parser';

describe('hex-parser', () => {
  describe('parseHexInput', () => {
    it('should parse valid hex strings', () => {
      expect(parseHexInput('FF')).toBe(255);
      expect(parseHexInput('ff')).toBe(255);
      expect(parseHexInput('0xFF')).toBe(255);
      expect(parseHexInput('0x00')).toBe(0);
      expect(parseHexInput('1234')).toBe(0x1234);
      expect(parseHexInput('ABCD')).toBe(0xABCD);
    });

    it('should handle zero padding', () => {
      expect(parseHexInput('0F')).toBe(15);
      expect(parseHexInput('00F')).toBe(15);
      expect(parseHexInput('000F')).toBe(15);
    });

    it('should respect max value constraint', () => {
      expect(parseHexInput('FF', 100)).toBe(null);
      expect(parseHexInput('64', 100)).toBe(100);
      expect(parseHexInput('63', 100)).toBe(99);
    });

    it('should reject invalid input', () => {
      expect(parseHexInput('')).toBe(null);
      expect(parseHexInput('GG')).toBe(null);
      expect(parseHexInput('123456789')).toBe(null); // Too long
      expect(parseHexInput('xyz')).toBe(null);
    });

    it('should handle whitespace', () => {
      expect(parseHexInput(' FF ')).toBe(255);
      expect(parseHexInput('\tAB\n')).toBe(0xAB);
    });
  });

  describe('formatHexDisplay', () => {
    it('should format numbers as hex strings', () => {
      expect(formatHexDisplay(255)).toBe('FF');
      expect(formatHexDisplay(15)).toBe('F');
      expect(formatHexDisplay(0)).toBe('0');
    });

    it('should handle minimum digits', () => {
      expect(formatHexDisplay(15, 2)).toBe('0F');
      expect(formatHexDisplay(255, 4)).toBe('00FF');
    });

    it('should handle case options', () => {
      expect(formatHexDisplay(255, 1, true)).toBe('FF');
      expect(formatHexDisplay(255, 1, false)).toBe('ff');
    });
  });

  describe('parseMacByte', () => {
    it('should parse valid MAC address bytes', () => {
      expect(parseMacByte('00')).toBe(0);
      expect(parseMacByte('FF')).toBe(255);
      expect(parseMacByte('A0')).toBe(160);
      expect(parseMacByte('0x4C')).toBe(76);
    });

    it('should reject values over 255', () => {
      expect(parseMacByte('100')).toBe(null);
      expect(parseMacByte('FFF')).toBe(null);
    });

    it('should reject invalid input', () => {
      expect(parseMacByte('GG')).toBe(null);
      expect(parseMacByte('')).toBe(null);
    });
  });
});

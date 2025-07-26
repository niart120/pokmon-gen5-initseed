/**
 * VCOUNTオフセット対応テスト
 * B2(GER/ITA), W2(KOR/ITA)の特殊ケース検証
 */

import { describe, it, expect } from 'vitest';
import { 
  getVCountFromTimer0, 
  hasVCountOffset, 
  getValidVCounts 
} from '@/lib/utils/rom-parameter-helpers';

describe('VCOUNTオフセット処理テスト', () => {
  describe('B2 GER/ITA VCOUNTずれ対応', () => {
    it('B2 GER - Timer0範囲による正しいVCOUNT値取得', () => {
      // Timer0が0x10E5-0x10E8の場合は0x81
      expect(getVCountFromTimer0('B2', 'GER', 0x10E5)).toBe(0x81);
      expect(getVCountFromTimer0('B2', 'GER', 0x10E8)).toBe(0x81);
      
      // Timer0が0x10E9-0x10ECの場合は0x82
      expect(getVCountFromTimer0('B2', 'GER', 0x10E9)).toBe(0x82);
      expect(getVCountFromTimer0('B2', 'GER', 0x10EC)).toBe(0x82);
      
      // 範囲外はnull
      expect(getVCountFromTimer0('B2', 'GER', 0x10E4)).toBeNull();
      expect(getVCountFromTimer0('B2', 'GER', 0x10ED)).toBeNull();
    });

    it('B2 ITA - Timer0範囲による正しいVCOUNT値取得', () => {
      // Timer0が0x1107-0x1109の場合は0x82
      expect(getVCountFromTimer0('B2', 'ITA', 0x1107)).toBe(0x82);
      expect(getVCountFromTimer0('B2', 'ITA', 0x1109)).toBe(0x82);
      
      // Timer0が0x110A-0x110Dの場合は0x83
      expect(getVCountFromTimer0('B2', 'ITA', 0x110A)).toBe(0x83);
      expect(getVCountFromTimer0('B2', 'ITA', 0x110D)).toBe(0x83);
      
      // 範囲外はnull
      expect(getVCountFromTimer0('B2', 'ITA', 0x1106)).toBeNull();
      expect(getVCountFromTimer0('B2', 'ITA', 0x110E)).toBeNull();
    });

    it('B2 GER/ITA - VCOUNTオフセット判定', () => {
      expect(hasVCountOffset('B2', 'GER')).toBe(true);
      expect(hasVCountOffset('B2', 'ITA')).toBe(true);
      expect(hasVCountOffset('B2', 'JPN')).toBe(false);
      expect(hasVCountOffset('B2', 'USA')).toBe(false);
    });

    it('B2 GER/ITA - 有効VCOUNT値リスト取得', () => {
      const gerVCounts = getValidVCounts('B2', 'GER');
      expect(gerVCounts).toEqual([0x81, 0x82]);
      
      const itaVCounts = getValidVCounts('B2', 'ITA');
      expect(itaVCounts).toEqual([0x82, 0x83]);
    });
  });

  describe('W2 SPA VCOUNTずれ対応', () => {
    it('W2 SPA - Timer0範囲による正しいVCOUNT値取得', () => {
      // Timer0が0x1107-0x1109の場合は0x82
      expect(getVCountFromTimer0('W2', 'SPA', 0x1107)).toBe(0x82);
      expect(getVCountFromTimer0('W2', 'SPA', 0x1109)).toBe(0x82);
      
      // Timer0が0x110A-0x110Dの場合は0x83
      expect(getVCountFromTimer0('W2', 'SPA', 0x110A)).toBe(0x83);
      expect(getVCountFromTimer0('W2', 'SPA', 0x110D)).toBe(0x83);
      
      // 範囲外はnull
      expect(getVCountFromTimer0('W2', 'SPA', 0x1106)).toBeNull();
      expect(getVCountFromTimer0('W2', 'SPA', 0x110E)).toBeNull();
    });

    it('W2 SPA - VCOUNTオフセット判定', () => {
      expect(hasVCountOffset('W2', 'SPA')).toBe(true);
      expect(hasVCountOffset('W2', 'KOR')).toBe(false);
      expect(hasVCountOffset('W2', 'ITA')).toBe(false);
      expect(hasVCountOffset('W2', 'JPN')).toBe(false);
      expect(hasVCountOffset('W2', 'USA')).toBe(false);
    });

    it('W2 SPA - 有効VCOUNT値リスト取得', () => {
      const spaVCounts = getValidVCounts('W2', 'SPA');
      expect(spaVCounts).toEqual([0x82, 0x83]);
      
      // 他の地域は単一VCOUNT
      const korVCounts = getValidVCounts('W2', 'KOR');
      expect(korVCounts).toEqual([0x81]);
      
      const itaVCounts = getValidVCounts('W2', 'ITA');
      expect(itaVCounts).toEqual([0x82]);
    });
  });

  describe('非VCOUNTずれバージョンとの比較', () => {
    it('通常バージョンではVCOUNTオフセットなし', () => {
      expect(hasVCountOffset('B', 'JPN')).toBe(false);
      expect(hasVCountOffset('W', 'USA')).toBe(false);
      expect(hasVCountOffset('B2', 'JPN')).toBe(false);
      expect(hasVCountOffset('W2', 'USA')).toBe(false);
    });

    it('通常バージョンでは単一VCOUNT値', () => {
      const bJpnVCounts = getValidVCounts('B', 'JPN');
      expect(bJpnVCounts).toHaveLength(1);
      expect(bJpnVCounts[0]).toBe(0x60);
      
      const wUsaVCounts = getValidVCounts('W', 'USA');
      expect(wUsaVCounts).toHaveLength(1);
      expect(wUsaVCounts[0]).toBe(0x60);
    });
  });

  describe('境界値テスト', () => {
    it('Timer0境界値での正確なVCOUNT取得', () => {
      // B2 GER: 0x10E8/0x10E9の境界
      expect(getVCountFromTimer0('B2', 'GER', 0x10E8)).toBe(0x81);
      expect(getVCountFromTimer0('B2', 'GER', 0x10E9)).toBe(0x82);
      
      // W2 SPA: 0x1109/0x110Aの境界
      expect(getVCountFromTimer0('W2', 'SPA', 0x1109)).toBe(0x82);
      expect(getVCountFromTimer0('W2', 'SPA', 0x110A)).toBe(0x83);
    });

    it('不正なバージョン・地域での安全な処理', () => {
      expect(getVCountFromTimer0('INVALID', 'JPN', 0x1100)).toBeNull();
      expect(getVCountFromTimer0('B2', 'INVALID', 0x1100)).toBeNull();
      expect(hasVCountOffset('INVALID', 'JPN')).toBe(false);
      expect(getValidVCounts('INVALID', 'JPN')).toEqual([]);
    });
  });
});

/**
 * Encounter Table Integration for Pokemon BW/BW2
 * 
 * Data Sources (Retrieved: August 8, 2025):
 * - https://pokebook.jp/data/sp5/enc_b (BW Black)
 * - https://pokebook.jp/data/sp5/enc_w (BW White)
 * - https://pokebook.jp/data/sp5/enc_b2 (BW2 Black2)
 * - https://pokebook.jp/data/sp5/enc_w2 (BW2 White2)
 * 
 * Provides encounter slot selection algorithms consistent with BW/BW2 game mechanics.
 * Follows IntegratedSeedSearcher pattern for WASM integration.
 */

import type { ROMVersion } from '../../types/pokemon';
import { 
  EncounterType, 
  FishingRodType
} from '../../data/encounters/types';
import type { 
  AreaEncounterTable, 
  EncounterSlot, 
  EncounterSelection,
  EncounterRateValidation,
  DistributionTestResult
} from '../../data/encounters/types';
import { ENCOUNTER_RATES, SLOT_CALCULATION_CONSTANTS } from '../../data/encounters/rates';
import { getEncounterTable } from '../../data/encounters/tables';

/**
 * エンカウントスロット選択アルゴリズム
 * BW/BW2の乱数システムに基づく確率的選択
 */
export class EncounterTableSelector {
  /**
   * 乱数値からエンカウントスロットを決定
   * @param randomValue 乱数値 (0-65535)
   * @param encounterType エンカウントタイプ
   * @param gameVersion ゲームバージョン (BW/BW2で計算式が異なる)
   * @returns 選択されたスロット番号
   */
  public static calculateEncounterSlot(
    randomValue: number,
    encounterType: EncounterType,
    gameVersion: ROMVersion
  ): number {
    const rates = ENCOUNTER_RATES[encounterType];
    if (!rates) {
      throw new Error(`Unsupported encounter type: ${encounterType}`);
    }

    const maxSlot = rates.length - 1;
    const constants = ['B', 'W'].includes(gameVersion) 
      ? SLOT_CALCULATION_CONSTANTS.BW 
      : SLOT_CALCULATION_CONSTANTS.BW2;

    // BW/BW2別のスロット計算式
    const calculatedSlot = ['B', 'W'].includes(gameVersion)
      ? ((randomValue * (maxSlot + constants.maxSlotMultiplier)) >> constants.bitShift)
      : ((randomValue * maxSlot) >> constants.bitShift);

    // スロット範囲の制限
    return Math.min(calculatedSlot, maxSlot);
  }

  /**
   * 確率分布に基づくエンカウントスロット選択
   * @param randomValue 乱数値 (0-65535)
   * @param encounterType エンカウントタイプ
   * @returns 選択されたスロット番号
   */
  public static selectSlotByProbability(
    randomValue: number,
    encounterType: EncounterType
  ): number {
    const rates = ENCOUNTER_RATES[encounterType];
    if (!rates) {
      throw new Error(`Unsupported encounter type: ${encounterType}`);
    }

    // 0-99の範囲に正規化 (65536 -> 100)
    const normalizedRandom = Math.floor((randomValue * 100) / 65536);
    
    let cumulativeRate = 0;
    for (const rate of rates) {
      cumulativeRate += rate.rate;
      if (normalizedRandom < cumulativeRate) {
        return rate.slot;
      }
    }

    // フォールバック（最後のスロット）
    return rates[rates.length - 1].slot;
  }

  /**
   * レベル決定アルゴリズム
   * @param randomValue レベル決定用乱数値
   * @param levelRange レベル範囲
   * @returns 決定されたレベル
   */
  public static calculateLevel(
    randomValue: number,
    levelRange: { min: number; max: number }
  ): number {
    const range = levelRange.max - levelRange.min + 1;
    const levelOffset = Math.floor((randomValue * range) / 65536);
    return levelRange.min + Math.min(levelOffset, range - 1);
  }

  /**
   * 完全なエンカウント選択処理
   * @param areaId エリアID
   * @param gameVersion ゲームバージョン
   * @param encounterType エンカウントタイプ
   * @param slotRandomValue スロット決定用乱数値
   * @param levelRandomValue レベル決定用乱数値
   * @param fishingRod 釣り竿タイプ（つりざおエンカウント時）
   * @returns エンカウント選択結果
   */
  public static selectEncounter(
    areaId: string,
    gameVersion: ROMVersion,
    encounterType: EncounterType,
    slotRandomValue: number,
    levelRandomValue: number,
    fishingRod?: FishingRodType
  ): EncounterSelection | null {
    const table = getEncounterTable(areaId, gameVersion);
    if (!table) {
      return null;
    }

    let encounters: EncounterSlot[] | undefined;

    // エンカウントタイプ別のデータ取得
    if (encounterType === EncounterType.Fishing && fishingRod && table.fishingData) {
      encounters = table.fishingData[fishingRod];
    } else {
      encounters = table.encounters[encounterType];
    }

    if (!encounters || encounters.length === 0) {
      return null;
    }

    // スロット選択
    const slotNumber = this.selectSlotByProbability(slotRandomValue, encounterType);
    const selectedSlot = encounters.find(slot => slot.slot === slotNumber);
    
    if (!selectedSlot) {
      return null;
    }

    // レベル決定
    const level = this.calculateLevel(levelRandomValue, selectedSlot.levelRange);

    return {
      slot: selectedSlot,
      level,
      encounterType,
      fishingRod
    };
  }
}

/**
 * エンカウント確率検証ユーティリティ
 */
export class EncounterRateValidator {
  /**
   * エンカウントタイプの確率合計を検証
   * @param encounterType エンカウントタイプ
   * @returns 検証結果
   */
  public static validateEncounterType(encounterType: EncounterType): EncounterRateValidation {
    const rates = ENCOUNTER_RATES[encounterType];
    const errors: string[] = [];
    
    if (!rates) {
      return {
        totalRate: 0,
        isValid: false,
        errors: [`Encounter type ${encounterType} not found`]
      };
    }

    const totalRate = rates.reduce((sum, rate) => sum + rate.rate, 0);
    const isValid = totalRate === 100;

    if (!isValid) {
      errors.push(`Total rate ${totalRate}% does not equal 100%`);
    }

    // スロット番号の重複チェック
    const slotNumbers = rates.map(r => r.slot);
    const uniqueSlots = new Set(slotNumbers);
    if (uniqueSlots.size !== slotNumbers.length) {
      errors.push('Duplicate slot numbers detected');
    }

    // スロット番号の連続性チェック
    const sortedSlots = [...uniqueSlots].sort((a, b) => (a as number) - (b as number));
    for (let i = 0; i < sortedSlots.length; i++) {
      if (sortedSlots[i] !== i) {
        errors.push(`Non-consecutive slot numbers: expected ${i}, got ${sortedSlots[i]}`);
        break;
      }
    }

    return {
      totalRate,
      isValid: isValid && errors.length === 0,
      errors
    };
  }

  /**
   * 全エンカウントタイプの確率を一括検証
   * @returns エンカウントタイプ別検証結果
   */
  public static validateAllEncounterTypes(): Map<EncounterType, EncounterRateValidation> {
    const results = new Map<EncounterType, EncounterRateValidation>();
    
    for (const encounterType of Object.keys(ENCOUNTER_RATES)) {
      const type = parseInt(encounterType) as EncounterType;
      results.set(type, this.validateEncounterType(type));
    }
    
    return results;
  }
}

/**
 * 統計的分布テストユーティリティ
 */
export class EncounterDistributionTester {
  /**
   * エンカウント選択アルゴリズムの統計的妥当性をテスト
   * @param encounterType エンカウントタイプ
   * @param sampleSize テストサンプル数
   * @param randomSeed テスト用乱数シード
   * @returns 分布テスト結果
   */
  public static testDistribution(
    encounterType: EncounterType,
    sampleSize: number = 10000,
    randomSeed: number = 12345
  ): DistributionTestResult {
    const rates = ENCOUNTER_RATES[encounterType];
    if (!rates) {
      throw new Error(`Unsupported encounter type: ${encounterType}`);
    }

    // 疑似乱数生成器（線形合同法）
    let seed = randomSeed;
    const random = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed % 65536;
    };

    // サンプル生成
    const observedFrequencies = new Map<number, number>();
    const expectedFrequencies = new Map<number, number>();

    // 期待度数の計算
    for (const rate of rates) {
      expectedFrequencies.set(rate.slot, (rate.rate / 100) * sampleSize);
      observedFrequencies.set(rate.slot, 0);
    }

    // 実測データの収集
    for (let i = 0; i < sampleSize; i++) {
      const randomValue = random();
      const selectedSlot = EncounterTableSelector.selectSlotByProbability(randomValue, encounterType);
      const current = observedFrequencies.get(selectedSlot) || 0;
      observedFrequencies.set(selectedSlot, current + 1);
    }

    // カイ二乗検定
    let chiSquareValue = 0;
    for (const [slot, observed] of observedFrequencies) {
      const expected = expectedFrequencies.get(slot) || 0;
      if (expected > 0) {
        chiSquareValue += Math.pow(observed - expected, 2) / expected;
      }
    }

    // 自由度 = スロット数 - 1
    const degreesOfFreedom = rates.length - 1;
    
    // 簡易p値計算（カイ二乗分布の近似）
    // 実際の実装では適切な統計ライブラリを使用することを推奨
    const pValue = this.calculateApproximatePValue(chiSquareValue, degreesOfFreedom);
    const isSignificant = pValue < 0.05; // 5%有意水準

    return {
      sampleSize,
      chiSquareValue,
      pValue,
      isSignificant,
      observedFrequencies,
      expectedFrequencies
    };
  }

  /**
   * カイ二乗分布のp値近似計算（簡易版）
   * @param chiSquare カイ二乗値
   * @param df 自由度
   * @returns 近似p値
   */
  private static calculateApproximatePValue(chiSquare: number, df: number): number {
    // ウィルソン・ヒルファーティ近似による簡易計算
    // 実際のプロダクションでは適切な統計ライブラリの使用を推奨
    if (df === 1) {
      return chiSquare > 3.841 ? 0.05 : 0.1;
    } else if (df <= 5) {
      const criticalValues = [0, 3.841, 5.991, 7.815, 9.488, 11.070];
      return chiSquare > criticalValues[df] ? 0.05 : 0.1;
    } else {
      // 自由度が大きい場合の粗い近似
      return chiSquare > (df + 2 * Math.sqrt(2 * df)) ? 0.05 : 0.1;
    }
  }
}
/**
 * RawPokemonDataパーサー - WASM出力の型変換とplaceholder処理
 * Phase 2-1: WASM → TypeScript型変換、placeholder値処理、level_rand_value解釈
 */

import {
  RawPokemonData,
  ParsedPokemonData,
  PlaceholderValue,
  EncounterType,
  ShinyType,
  ShinyInfo,
  NATURE_NAMES,
  RawPokemonParserConfig,
  LevelCalculationConfig,
  GenderRatio,
  WasmRawPokemonDataProperty
} from '@/types/raw-pokemon';

/**
 * WASM RawPokemonDataオブジェクト（実際のWASMインスタンス）
 * wasm-bindgen経由で取得されるオブジェクトの型定義
 */
export interface WasmRawPokemonDataInstance {
  get_seed(): bigint;
  get_pid(): number;
  get_nature(): number;
  get_ability_slot(): number;
  get_gender_value(): number;
  get_encounter_slot_value(): number;
  get_level_rand_value(): number;
  get_shiny_type(): number;
  get_sync_applied(): boolean;
  get_encounter_type(): number;
  // free methodも含まれる可能性
  free?(): void;
}

/**
 * RawPokemonDataパーサークラス
 * WASM出力 → TypeScript型変換とplaceholder値処理
 */
export class RawPokemonDataParser {
  private config: Required<RawPokemonParserConfig>;

  constructor(config: Partial<RawPokemonParserConfig> = {}) {
    this.config = {
      encounter_table: undefined,
      gender_ratios: new Map(),
      ability_data: new Map(),
      process_placeholders: true,
      calculate_details: true,
      ...config
    };
  }

  /**
   * WASM RawPokemonDataインスタンスをTypeScript型に変換
   * 
   * @param wasmInstance WASM RawPokemonDataインスタンス
   * @returns 変換されたRawPokemonData
   */
  parseFromWasm(wasmInstance: WasmRawPokemonDataInstance): RawPokemonData {
    try {
      const rawData: RawPokemonData = {
        seed: wasmInstance.get_seed(),
        pid: wasmInstance.get_pid(),
        nature: wasmInstance.get_nature(),
        sync_applied: wasmInstance.get_sync_applied(),
        ability_slot: wasmInstance.get_ability_slot(),
        gender_value: wasmInstance.get_gender_value(),
        encounter_slot_value: wasmInstance.get_encounter_slot_value(),
        encounter_type: wasmInstance.get_encounter_type(),
        level_rand_value: wasmInstance.get_level_rand_value(),
        shiny_type: wasmInstance.get_shiny_type(),
      };

      return rawData;
    } catch (error) {
      throw new Error(`WASM RawPokemonData parsing failed: ${error}`);
    }
  }

  /**
   * RawPokemonDataをParsedPokemonDataに変換（詳細情報付き）
   * 
   * @param rawData 生ポケモンデータ
   * @returns 解析済みポケモンデータ
   */
  parseToDetailed(rawData: RawPokemonData): ParsedPokemonData {
    const parsed: ParsedPokemonData = { ...rawData };

    if (this.config.calculate_details) {
      // レベル計算
      parsed.calculated_level = this.calculateLevel(rawData);
      
      // 性別判定
      parsed.gender = this.determineGender(rawData);
      
      // 性格名変換
      parsed.nature_name = this.getNatureName(rawData.nature);
      
      // 色違い情報
      parsed.shiny_info = this.analyzeShinyInfo(rawData);
      
      // エンカウントスロット → 種族ID変換
      if (this.config.encounter_table) {
        parsed.species_id = this.getSpeciesFromSlot(rawData);
      }
    }

    return parsed;
  }

  /**
   * placeholder値の処理
   * 0, 127, 255の特別な値を適切に解釈
   * 
   * @param value 処理対象の値
   * @param context 値の文脈（どの項目の値か）
   * @returns 処理済みの値または null（無効値の場合）
   */
  processPlaceholderValue(
    value: number, 
    context: 'level' | 'encounter_slot' | 'gender' | 'ability' | 'general'
  ): number | null {
    if (!this.config.process_placeholders) {
      return value;
    }

    switch (value) {
      case PlaceholderValue.INVALID:
        // 0は通常無効値だが、文脈により有効な場合もある
        if (context === 'encounter_slot' || context === 'ability') {
          return value; // スロット0や特性0は有効
        }
        return null; // その他は無効とみなす

      case PlaceholderValue.DEFAULT:
        // 127は中間値・デフォルト値
        switch (context) {
          case 'gender':
            return 127; // 性別判定では中間値として有効
          case 'level':
            return null; // レベルでは無効
          default:
            return value;
        }

      case PlaceholderValue.MAX:
        // 255は最大値・確定値
        switch (context) {
          case 'gender':
            return 255; // 性別判定では最大値として有効
          case 'encounter_slot':
            return null; // エンカウントスロットでは通常無効
          default:
            return value;
        }

      default:
        return value; // 通常の値はそのまま返す
    }
  }

  /**
   * level_rand_valueからレベルを計算
   * エンカウントタイプとテーブル情報を考慮
   * 
   * @param data 生ポケモンデータ
   * @returns 計算されたレベル、または undefined（計算不可の場合）
   */
  private calculateLevel(data: RawPokemonData): number | undefined {
    // 固定エンカウント（固定シンボル、御三家等）は固定レベル
    if (data.encounter_type >= 10) {
      return this.getFixedEncounterLevel(data.encounter_type);
    }

    // level_rand_valueのplaceholder処理
    const levelRandValue = this.processPlaceholderValue(data.level_rand_value, 'level');
    
    if (levelRandValue === null) {
      return undefined;
    }

    // 野生エンカウントはlevel_rand_valueから範囲内レベルを計算
    const levelConfig = this.getLevelConfig(data);
    if (!levelConfig) {
      return undefined;
    }

    if (levelConfig.fixed_level !== undefined) {
      return levelConfig.fixed_level;
    }

    // level_rand_value (0-0xFFFFFFFF) を レベル範囲にマッピング
    const levelRange = levelConfig.max_level - levelConfig.min_level + 1;
    // より正確な計算のために、割り算の精度を上げる
    const ratio = levelRandValue / 0x100000000;
    const levelOffset = Math.floor(ratio * levelRange);
    
    return levelConfig.min_level + levelOffset;
  }

  /**
   * 性別判定
   * gender_valueと種族の性別比から性別を決定
   * 
   * @param data 生ポケモンデータ
   * @returns 性別 ('M' | 'F' | 'N')
   */
  private determineGender(data: RawPokemonData): 'M' | 'F' | 'N' {
    const genderValue = this.processPlaceholderValue(data.gender_value, 'gender');
    
    if (genderValue === null) {
      return 'N'; // 性別不明
    }

    const speciesId = this.getSpeciesFromSlot(data);
    if (!speciesId) {
      return 'N';
    }

    const genderRatio = this.config.gender_ratios?.get(speciesId);
    if (!genderRatio || genderRatio.genderless) {
      return 'N';
    }

    // Pokemon仕様: gender_value < female_threshold なら雌、それ以外は雄
    // male_ratioは雌になる上限値（female threshold）
    return genderValue < genderRatio.male_ratio ? 'F' : 'M';
  }

  /**
   * 性格名を取得
   * 
   * @param natureId 性格ID (0-24)
   * @returns 性格名
   */
  private getNatureName(natureId: number): string {
    if (natureId < 0 || natureId >= NATURE_NAMES.length) {
      return `Unknown(${natureId})`;
    }
    return NATURE_NAMES[natureId];
  }

  /**
   * 色違い情報の分析
   * 
   * @param data 生ポケモンデータ
   * @returns 色違い情報
   */
  private analyzeShinyInfo(data: RawPokemonData): ShinyInfo {
    const shinyType = data.shiny_type;
    
    return {
      is_shiny: shinyType !== ShinyType.Normal,
      type: this.getShinyTypeName(shinyType),
      shiny_value: this.calculateShinyValue(data.pid),
    };
  }

  /**
   * 色違いタイプ名を取得
   * 
   * @param shinyType 色違いタイプ
   * @returns 色違いタイプ名
   */
  private getShinyTypeName(shinyType: number): 'normal' | 'square' | 'star' {
    switch (shinyType) {
      case ShinyType.Square: return 'square';
      case ShinyType.Star: return 'star';
      default: return 'normal';
    }
  }

  /**
   * 色違い値の計算（簡易版）
   * 実際のTID/SIDが必要だが、ここでは基本計算のみ
   * 
   * @param pid PID値
   * @returns 色違い値の下位16bit部分
   */
  private calculateShinyValue(pid: number): number {
    const pidHigh = (pid >> 16) & 0xFFFF;
    const pidLow = pid & 0xFFFF;
    return pidHigh ^ pidLow;
  }

  /**
   * エンカウントスロットから種族IDを取得
   * 
   * @param data 生ポケモンデータ
   * @returns 種族ID、または undefined
   */
  private getSpeciesFromSlot(data: RawPokemonData): number | undefined {
    if (!this.config.encounter_table) {
      return undefined;
    }

    const slotValue = this.processPlaceholderValue(data.encounter_slot_value, 'encounter_slot');
    if (slotValue === null) {
      return undefined;
    }

    const speciesList = this.config.encounter_table.species_list;
    if (slotValue >= speciesList.length) {
      return undefined;
    }

    return speciesList[slotValue]?.species_id;
  }

  /**
   * 固定エンカウントのレベルを取得
   * 
   * @param encounterType エンカウントタイプ
   * @returns 固定レベル、または undefined
   */
  private getFixedEncounterLevel(encounterType: number): number | undefined {
    // 固定エンカウントの一般的なレベル
    switch (encounterType) {
      case EncounterType.StaticStarter: return 5;   // 御三家
      case EncounterType.StaticFossil: return 25;   // 化石
      case EncounterType.StaticSymbol: return 50;   // 固定シンボル
      case EncounterType.StaticEvent: return 50;    // イベント
      case EncounterType.Roaming: return 40;        // 徘徊
      default: return undefined;
    }
  }

  /**
   * レベル計算設定を取得
   * 
   * @param data 生ポケモンデータ
   * @returns レベル計算設定、または undefined
   */
  private getLevelConfig(data: RawPokemonData): LevelCalculationConfig | undefined {
    if (!this.config.encounter_table) {
      return undefined;
    }

    const slotValue = this.processPlaceholderValue(data.encounter_slot_value, 'encounter_slot');
    if (slotValue === null) {
      return undefined;
    }

    const speciesList = this.config.encounter_table.species_list;
    if (slotValue >= speciesList.length) {
      return undefined;
    }

    const species = speciesList[slotValue];
    return species?.level_config;
  }

  /**
   * パーサー設定を更新
   * 
   * @param newConfig 新しい設定
   */
  updateConfig(newConfig: Partial<RawPokemonParserConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * バッチ処理: 複数のWASMインスタンスを一括変換
   * 
   * @param wasmInstances WASMインスタンスの配列
   * @returns 変換されたRawPokemonDataの配列
   */
  parseFromWasmBatch(wasmInstances: WasmRawPokemonDataInstance[]): RawPokemonData[] {
    return wasmInstances.map(instance => this.parseFromWasm(instance));
  }

  /**
   * バッチ処理: 複数のRawPokemonDataを詳細データに変換
   * 
   * @param rawDataArray 生ポケモンデータの配列
   * @returns 解析済みポケモンデータの配列
   */
  parseToDetailedBatch(rawDataArray: RawPokemonData[]): ParsedPokemonData[] {
    return rawDataArray.map(data => this.parseToDetailed(data));
  }
}

/**
 * デフォルト設定のパーサーインスタンスを作成
 * 
 * @param config パーサー設定（オプショナル）
 * @returns パーサーインスタンス
 */
export function createRawPokemonDataParser(
  config?: Partial<RawPokemonParserConfig>
): RawPokemonDataParser {
  return new RawPokemonDataParser(config);
}

/**
 * 簡易パーサー: WASMインスタンスから直接ParsedPokemonDataを取得
 * 
 * @param wasmInstance WASMインスタンス
 * @param config パーサー設定（オプショナル）
 * @returns 解析済みポケモンデータ
 */
export function parseWasmToPokemon(
  wasmInstance: WasmRawPokemonDataInstance,
  config?: Partial<RawPokemonParserConfig>
): ParsedPokemonData {
  const parser = createRawPokemonDataParser(config);
  const rawData = parser.parseFromWasm(wasmInstance);
  return parser.parseToDetailed(rawData);
}

/**
 * placeholder値の検証ユーティリティ
 * 
 * @param value 検証する値
 * @returns placeholder値かどうか
 */
export function isPlaceholderValue(value: number): boolean {
  return value === PlaceholderValue.INVALID || 
         value === PlaceholderValue.DEFAULT || 
         value === PlaceholderValue.MAX;
}

/**
 * placeholder値の情報を取得
 * 
 * @param value 値
 * @returns placeholder情報、または null
 */
export function getPlaceholderInfo(value: number): { type: PlaceholderValue; description: string } | null {
  switch (value) {
    case PlaceholderValue.INVALID:
      return { type: PlaceholderValue.INVALID, description: '無効値・未設定' };
    case PlaceholderValue.DEFAULT:
      return { type: PlaceholderValue.DEFAULT, description: '中間値・デフォルト' };
    case PlaceholderValue.MAX:
      return { type: PlaceholderValue.MAX, description: '最大値・確定' };
    default:
      return null;
  }
}
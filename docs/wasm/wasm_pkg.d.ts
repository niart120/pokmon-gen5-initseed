/* tslint:disable */
/* eslint-disable */
/**
 * 統合シード探索器
 * 固定パラメータを事前計算し、日時範囲を高速探索する
 */
export class IntegratedSeedSearcher {
  free(): void;
  /**
   * コンストラクタ: 固定パラメータの事前計算
   */
  constructor(mac: Uint8Array, nazo: Uint32Array, hardware: string, key_input: number, frame: number);
  /**
   * 統合シード探索メイン関数
   * 日時範囲とTimer0/VCount範囲を指定して一括探索
   */
  search_seeds_integrated(year_start: number, month_start: number, date_start: number, hour_start: number, minute_start: number, second_start: number, range_seconds: number, timer0_min: number, timer0_max: number, vcount_min: number, vcount_max: number, target_seeds: Uint32Array): Array<any>;
  /**
   * 統合シード探索SIMD版
   * range_secondsを最内ループに配置してSIMD SHA-1計算を活用
   */
  search_seeds_integrated_simd(year_start: number, month_start: number, date_start: number, hour_start: number, minute_start: number, second_start: number, range_seconds: number, timer0_min: number, timer0_max: number, vcount_min: number, vcount_max: number, target_seeds: Uint32Array): Array<any>;
}
/**
 * 探索結果構造体
 */
export class SearchResult {
  free(): void;
  constructor(seed: number, hash: string, year: number, month: number, date: number, hour: number, minute: number, second: number, timer0: number, vcount: number);
  readonly seed: number;
  readonly hash: string;
  readonly year: number;
  readonly month: number;
  readonly date: number;
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
  readonly timer0: number;
  readonly vcount: number;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly __wbg_searchresult_free: (a: number, b: number) => void;
  readonly searchresult_new: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number) => number;
  readonly searchresult_seed: (a: number) => number;
  readonly searchresult_hash: (a: number, b: number) => void;
  readonly searchresult_year: (a: number) => number;
  readonly searchresult_month: (a: number) => number;
  readonly searchresult_date: (a: number) => number;
  readonly searchresult_hour: (a: number) => number;
  readonly searchresult_minute: (a: number) => number;
  readonly searchresult_second: (a: number) => number;
  readonly searchresult_timer0: (a: number) => number;
  readonly searchresult_vcount: (a: number) => number;
  readonly __wbg_integratedseedsearcher_free: (a: number, b: number) => void;
  readonly integratedseedsearcher_new: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number) => void;
  readonly integratedseedsearcher_search_seeds_integrated: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number, l: number, m: number, n: number) => number;
  readonly integratedseedsearcher_search_seeds_integrated_simd: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number, l: number, m: number, n: number) => number;
  readonly __wbindgen_export_0: (a: number, b: number) => number;
  readonly __wbindgen_export_1: (a: number, b: number, c: number, d: number) => number;
  readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
  readonly __wbindgen_export_2: (a: number, b: number, c: number) => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
*
* @returns {InitOutput}
*/
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;

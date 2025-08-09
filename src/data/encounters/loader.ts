import type { EncounterLocationsJson, EncounterSlotJson, EncounterMethod } from './schema';
import { EncounterType } from '@/types/raw-pokemon-data';
import type { ROMVersion } from '@/types/pokemon';

function normalizeLocationKey(location: string): string {
  return location.trim().replace(/[\u3000\s]+/g, '').replace(/[‐‑‒–—−\-_.]/g, '');
}

// 英語名→日本語キーの簡易エイリアス
function applyLocationAlias(input: string): string {
  const s = input.trim();
  // Route N → N番道路
  const m = s.match(/^route\s*(\d+)$/i);
  if (m) return `${parseInt(m[1], 10)}番道路`;
  return s;
}

const methodName = (method: EncounterType): EncounterMethod => (EncounterType[method] as EncounterMethod);

export type EncounterRegistry = Record<string, { displayName: string; slots: EncounterSlotJson[] }>

let registry: Record<string, EncounterRegistry> | null = null; // key: `${version}_${method}`

// 同期初期化（ビルド時取り込み済みJSONのみ）
(function initRegistry() {
  const modules = import.meta.glob('./generated/v1/**/**/*.json', { eager: true }) as Record<string, { default: EncounterLocationsJson } | EncounterLocationsJson>;
  const acc: Record<string, EncounterRegistry> = {};
  for (const [, mod] of Object.entries(modules)) {
    const data: EncounterLocationsJson = (mod as any).default ?? (mod as any);
    const key = `${data.version}_${data.method}`;
    if (!acc[key]) acc[key] = {};
    for (const [locKey, payload] of Object.entries(data.locations)) {
      acc[key][normalizeLocationKey(locKey)] = payload;
    }
  }
  registry = acc;
})();

export function ensureEncounterRegistryLoaded(): void {
  if (!registry) throw new Error('Encounter registry not initialized.');
}

export function getEncounterFromRegistry(version: ROMVersion, location: string, method: EncounterType) {
  ensureEncounterRegistryLoaded();
  const key = `${version}_${methodName(method)}`;
  // 入力ロケーションに英語→日本語の簡易エイリアスを適用してから正規化
  const loc = normalizeLocationKey(applyLocationAlias(location));
  const hit = registry![key]?.[loc];
  return hit ?? null;
}

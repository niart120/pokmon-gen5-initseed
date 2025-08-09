import type { EncounterLocationsJson, EncounterSlotJson, EncounterMethod } from './schema';
import { EncounterType } from '@/types/raw-pokemon-data';
import type { ROMVersion } from '@/types/pokemon';

function normalizeLocationKey(location: string): string {
  return location.trim().replace(/[\u3000\s]+/g, '').replace(/[‐‑‒–—−\-_.]/g, '');
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
  const loc = normalizeLocationKey(location);
  const hit = registry![key]?.[loc];
  return hit ?? null;
}

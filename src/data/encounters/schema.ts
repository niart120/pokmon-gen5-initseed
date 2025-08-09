export type EncounterMethod =
  | 'Normal'
  | 'Surfing'
  | 'Fishing'
  | 'ShakingGrass'
  | 'DustCloud'
  | 'PokemonShadow'
  | 'SurfingBubble'
  | 'FishingBubble'
  | 'StaticSymbol'
  | 'StaticStarter'
  | 'StaticFossil'
  | 'StaticEvent'
  | 'Roaming';

export interface EncounterSlotJson {
  speciesId: number;
  rate: number;
  levelRange: { min: number; max: number };
}

export interface EncounterLocationsJson {
  version: 'B' | 'W' | 'B2' | 'W2';
  method: EncounterMethod;
  source: { name: string; url: string; retrievedAt: string };
  locations: Record<string, { displayName: string; slots: EncounterSlotJson[] }>;
}

export type ROMVersion = 'B' | 'W' | 'B2' | 'W2';
export type ROMRegion = 'JPN' | 'KOR' | 'USA' | 'GER' | 'FRA' | 'SPA' | 'ITA';
export type Hardware = 'DS' | 'DS_LITE' | '3DS';

export interface VCountOffsetRule {
  timer0Min: number;
  timer0Max: number;
  vcountValue: number;
}

export interface ROMParameters {
  nazo: number[];
  defaultVCount: number;
  timer0Min: number;
  timer0Max: number;
  vcountOffset?: VCountOffsetRule[];
}

export interface SearchConditions {
  romVersion: ROMVersion;
  romRegion: ROMRegion;
  hardware: Hardware;
  
  timer0Range: {
    min: number;
    max: number;
    useAutoRange: boolean;
  };
  
  vcountRange: {
    min: number;
    max: number;
    useAutoRange: boolean;
  };
  
  dateRange: {
    startYear: number;
    endYear: number;
    startMonth: number;
    endMonth: number;
    startDay: number;
    endDay: number;
    startHour: number;
    endHour: number;
    startMinute: number;
    endMinute: number;
    startSecond: number;
    endSecond: number;
  };
  
  keyInput: number;
  macAddress: number[];
}

export interface InitialSeedResult {
  seed: number;
  datetime: Date;
  timer0: number;
  vcount: number;
  conditions: SearchConditions;
  message: number[];
  sha1Hash: string;
  isMatch: boolean;
}

export interface SearchResult {
  seed: number;
  dateTime: Date;
  timer0: number;
  vcount: number;
  romVersion: ROMVersion;
  romRegion: ROMRegion;
  hardware: Hardware;
  macAddress?: number[];
  keyInput?: number;
  message?: number[];
  hash?: string;
}

export interface TargetSeedList {
  seeds: number[];
}

export interface SeedInputFormat {
  rawInput: string;
  validSeeds: number[];
  errors: {
    line: number;
    value: string;
    error: string;
  }[];
}

export interface SearchProgress {
  isRunning: boolean;
  currentStep: number;
  totalSteps: number;
  currentDateTime: Date | null;
  elapsedTime: number;
  estimatedTimeRemaining: number;
  matchesFound: number;
  canPause: boolean;
  isPaused: boolean;
}

export interface SearchPreset {
  id: string;
  name: string;
  description?: string;
  conditions: SearchConditions;
  createdAt: Date;
  lastUsed?: Date;
}

export const KEY_MAPPINGS = {
  A: 0,
  B: 1,
  SELECT: 2,
  START: 3,
  RIGHT: 4,
  LEFT: 5,
  UP: 6,
  DOWN: 7,
  R: 8,
  L: 9,
  X: 10,
  Y: 11
} as const;

export type KeyName = keyof typeof KEY_MAPPINGS;
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SearchConditions, InitialSeedResult, TargetSeedList, SearchProgress, SearchPreset, ROMVersion, ROMRegion, Hardware, ParallelSearchSettings, AggregatedProgress } from '../types/pokemon';
import { DEMO_TARGET_SEEDS } from '../data/default-seeds';

interface AppStore {
  // Search conditions
  searchConditions: SearchConditions;
  setSearchConditions: (conditions: Partial<SearchConditions>) => void;
  resetSearchConditions: () => void;

  // Target seeds
  targetSeeds: TargetSeedList;
  setTargetSeeds: (seeds: number[]) => void;
  addTargetSeed: (seed: number) => void;
  removeTargetSeed: (seed: number) => void;
  clearTargetSeeds: () => void;

  // Search results
  searchResults: InitialSeedResult[];
  setSearchResults: (results: InitialSeedResult[]) => void;
  addSearchResult: (result: InitialSeedResult) => void;
  clearSearchResults: () => void;

  // Search progress
  searchProgress: SearchProgress;
  setSearchProgress: (progress: Partial<SearchProgress>) => void;
  startSearch: () => void;
  pauseSearch: () => void;
  resumeSearch: () => void;
  stopSearch: () => void;

  // Parallel search settings
  parallelSearchSettings: ParallelSearchSettings;
  setParallelSearchEnabled: (enabled: boolean) => void;
  setMaxWorkers: (count: number) => void;
  setChunkStrategy: (strategy: ParallelSearchSettings['chunkStrategy']) => void;

  // Parallel search progress
  parallelProgress: AggregatedProgress | null;
  setParallelProgress: (progress: AggregatedProgress | null) => void;

  // UI state
  activeTab: string;
  setActiveTab: (tab: string) => void;
  
  // Raw target seed input
  targetSeedInput: string;
  setTargetSeedInput: (input: string) => void;

  // Presets
  presets: SearchPreset[];
  setPresets: (presets: SearchPreset[]) => void;
  addPreset: (preset: SearchPreset) => void;
  removePreset: (presetId: string) => void;
  loadPreset: (presetId: string) => void;
}

const defaultSearchConditions: SearchConditions = {
  romVersion: 'B' as ROMVersion,
  romRegion: 'JPN' as ROMRegion,
  hardware: 'DS' as Hardware,
  
  timer0VCountConfig: {
    useAutoConfiguration: true,
    timer0Range: {
      min: 3193,
      max: 3194,
    },
    vcountRange: {
      min: 95,
      max: 95,
    },
  },
  
  dateRange: {
    startYear: 2000,
    endYear: 2099,
    startMonth: 1,
    endMonth: 12,
    startDay: 1,
    endDay: 31,
    startHour: 0,
    endHour: 23,
    startMinute: 0,
    endMinute: 59,
    startSecond: 0,
    endSecond: 59,
  },
  
  keyInput: 0x2FFF, // Default: no keys pressed
  macAddress: [0x00, 0x1B, 0x2C, 0x3D, 0x4E, 0x5F],
};

const defaultSearchProgress: SearchProgress = {
  isRunning: false,
  currentStep: 0,
  totalSteps: 0,
  currentDateTime: null,
  elapsedTime: 0,
  estimatedTimeRemaining: 0,
  matchesFound: 0,
  canPause: false,
  isPaused: false,
};

const defaultParallelSearchSettings: ParallelSearchSettings = {
  enabled: false,
  maxWorkers: navigator.hardwareConcurrency || 4,
  chunkStrategy: 'time-based',
};

// Use demo seeds for initial setup
console.log('Using demo target seeds:', DEMO_TARGET_SEEDS.map(s => '0x' + s.toString(16).padStart(8, '0')));

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // Search conditions
      searchConditions: defaultSearchConditions,
      setSearchConditions: (conditions) =>
        set((state) => ({
          searchConditions: { ...state.searchConditions, ...conditions },
        })),
      resetSearchConditions: () =>
        set({ searchConditions: defaultSearchConditions }),

      // Target seeds
      targetSeeds: { seeds: DEMO_TARGET_SEEDS },
      setTargetSeeds: (seeds) => set({ targetSeeds: { seeds } }),
      addTargetSeed: (seed) =>
        set((state) => ({
          targetSeeds: {
            seeds: [...new Set([...state.targetSeeds.seeds, seed])],
          },
        })),
      removeTargetSeed: (seed) =>
        set((state) => ({
          targetSeeds: {
            seeds: state.targetSeeds.seeds.filter((s) => s !== seed),
          },
        })),
      clearTargetSeeds: () => set({ targetSeeds: { seeds: [] } }),

      // Search results
      searchResults: [],
      setSearchResults: (results) => set({ searchResults: results }),
      addSearchResult: (result) =>
        set((state) => {
          // 効率的な配列追加：スプレッド演算子による新配列作成を避ける
          const newResults = state.searchResults.slice();
          newResults.push(result);
          return { searchResults: newResults };
        }),
      clearSearchResults: () => set({ searchResults: [] }),

      // Search progress
      searchProgress: defaultSearchProgress,
      setSearchProgress: (progress) =>
        set((state) => ({
          searchProgress: { ...state.searchProgress, ...progress },
        })),
      startSearch: () =>
        set((state) => ({
          searchProgress: {
            ...state.searchProgress,
            isRunning: true,
            isPaused: false,
            currentStep: 0,
            elapsedTime: 0,
            matchesFound: 0,
          },
        })),
      pauseSearch: () =>
        set((state) => ({
          searchProgress: { ...state.searchProgress, isPaused: true, canPause: true },
        })),
      resumeSearch: () =>
        set((state) => ({
          searchProgress: { ...state.searchProgress, isPaused: false },
        })),
      stopSearch: () =>
        set((state) => ({
          searchProgress: {
            ...defaultSearchProgress,
            matchesFound: state.searchProgress.matchesFound,
          },
        })),

      // Parallel search settings
      parallelSearchSettings: defaultParallelSearchSettings,
      setParallelSearchEnabled: (enabled) =>
        set((state) => ({
          parallelSearchSettings: { ...state.parallelSearchSettings, enabled },
        })),
      setMaxWorkers: (count) =>
        set((state) => ({
          parallelSearchSettings: { ...state.parallelSearchSettings, maxWorkers: count },
        })),
      setChunkStrategy: (strategy) =>
        set((state) => ({
          parallelSearchSettings: { ...state.parallelSearchSettings, chunkStrategy: strategy },
        })),

      // Parallel search progress
      parallelProgress: null,
      setParallelProgress: (progress) => set({ parallelProgress: progress }),

      // UI state
      activeTab: 'search',
      setActiveTab: (tab) => set({ activeTab: tab }),
      
      // Raw target seed input
      targetSeedInput: DEMO_TARGET_SEEDS.map(s => '0x' + s.toString(16).padStart(8, '0')).join('\n'),
      setTargetSeedInput: (input) => set({ targetSeedInput: input }),

      // Presets
      presets: [],
      setPresets: (presets) => set({ presets }),
      addPreset: (preset) =>
        set((state) => ({
          presets: [...state.presets, preset],
        })),
      removePreset: (presetId) =>
        set((state) => ({
          presets: state.presets.filter((p) => p.id !== presetId),
        })),
      loadPreset: (presetId) =>
        set((state) => {
          const preset = state.presets.find((p) => p.id === presetId);
          if (preset) {
            return {
              searchConditions: preset.conditions,
              presets: state.presets.map((p) =>
                p.id === presetId ? { ...p, lastUsed: new Date() } : p
              ),
            };
          }
          return state;
        }),
    }),
    {
      name: 'pokemon-seed-app',
      partialize: (state) => ({
        searchConditions: state.searchConditions,
        targetSeeds: state.targetSeeds,
        targetSeedInput: state.targetSeedInput,
        presets: state.presets,
        parallelSearchSettings: state.parallelSearchSettings,
      }),
      migrate: (persistedState: any, version: number) => {
        // データ移行: 旧timer0Range/vcountRange構造から新timer0VCountConfig構造へ
        if (persistedState?.searchConditions) {
          const conditions = persistedState.searchConditions;
          
          // 旧構造を新構造に移行
          if (conditions.timer0Range && conditions.vcountRange) {
            conditions.timer0VCountConfig = {
              useAutoConfiguration: conditions.timer0Range.useAutoRange || conditions.vcountRange.useAutoRange,
              timer0Range: {
                min: conditions.timer0Range.min,
                max: conditions.timer0Range.max,
              },
              vcountRange: {
                min: conditions.vcountRange.min,
                max: conditions.vcountRange.max,
              },
            };
            
            // 旧フィールドを削除
            delete conditions.timer0Range;
            delete conditions.vcountRange;
          }
          
          // プリセットも同様に移行
          if (persistedState.presets) {
            persistedState.presets = persistedState.presets.map((preset: any) => {
              if (preset.conditions?.timer0Range && preset.conditions?.vcountRange) {
                const newConditions = { ...preset.conditions };
                newConditions.timer0VCountConfig = {
                  useAutoConfiguration: newConditions.timer0Range.useAutoRange || newConditions.vcountRange.useAutoRange,
                  timer0Range: {
                    min: newConditions.timer0Range.min,
                    max: newConditions.timer0Range.max,
                  },
                  vcountRange: {
                    min: newConditions.vcountRange.min,
                    max: newConditions.vcountRange.max,
                  },
                };
                delete newConditions.timer0Range;
                delete newConditions.vcountRange;
                return { ...preset, conditions: newConditions };
              }
              return preset;
            });
          }
        }
        
        return persistedState;
      },
    }
  )
);
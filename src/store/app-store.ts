import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SearchConditions, InitialSeedResult, TargetSeedList, SearchProgress, ROMVersion, ROMRegion, Hardware } from '../types/pokemon';

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

  // UI state
  activeTab: string;
  setActiveTab: (tab: string) => void;
  
  // Raw target seed input
  targetSeedInput: string;
  setTargetSeedInput: (input: string) => void;
}

const defaultSearchConditions: SearchConditions = {
  romVersion: 'B' as ROMVersion,
  romRegion: 'JPN' as ROMRegion,
  hardware: 'DS' as Hardware,
  
  timer0Range: {
    min: 3193,
    max: 3194,
    useAutoRange: true,
  },
  
  vcountRange: {
    min: 95,
    max: 95,
    useAutoRange: true,
  },
  
  dateRange: {
    startYear: 2023,
    endYear: 2023,
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
  macAddress: [0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
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
      targetSeeds: { seeds: [] },
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
        set((state) => ({
          searchResults: [...state.searchResults, result],
        })),
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
          searchProgress: { ...state.searchProgress, isPaused: true },
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

      // UI state
      activeTab: 'search',
      setActiveTab: (tab) => set({ activeTab: tab }),
      
      // Raw target seed input
      targetSeedInput: '',
      setTargetSeedInput: (input) => set({ targetSeedInput: input }),
    }),
    {
      name: 'pokemon-seed-app',
      partialize: (state) => ({
        searchConditions: state.searchConditions,
        targetSeeds: state.targetSeeds,
        targetSeedInput: state.targetSeedInput,
      }),
    }
  )
);
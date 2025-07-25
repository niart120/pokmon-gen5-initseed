import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Pause, Square } from '@phosphor-icons/react';
import { useAppStore } from '../../store/app-store';
import { getSearchWorkerManager } from '../../lib/search/search-worker-manager';
import type { InitialSeedResult } from '../../types/pokemon';

export function SearchControlCard() {
  const {
    searchConditions,
    searchProgress,
    startSearch,
    pauseSearch,
    resumeSearch,
    stopSearch,
    targetSeeds,
    addSearchResult,
    clearSearchResults,
  } = useAppStore();

  // Worker management functions
  const handlePauseSearch = () => {
    pauseSearch();
    const workerManager = getSearchWorkerManager();
    workerManager.pauseSearch();
  };

  const handleResumeSearch = () => {
    resumeSearch();
    const workerManager = getSearchWorkerManager();
    workerManager.resumeSearch();
  };

  const handleStopSearch = () => {
    stopSearch();
    const workerManager = getSearchWorkerManager();
    workerManager.stopSearch();
  };

  const handleStartSearch = async () => {
    if (targetSeeds.seeds.length === 0) {
      alert('Please add target seeds before starting the search.');
      return;
    }

    console.log('🚀 Starting search with conditions:', searchConditions);
    console.log('🎯 Target seeds:', targetSeeds.seeds.map(s => '0x' + s.toString(16).padStart(8, '0')));

    clearSearchResults();
    startSearch();

    try {
      // Get the worker manager
      const workerManager = getSearchWorkerManager();
      
      // Start search with worker
      await workerManager.startSearch(
        searchConditions,
        targetSeeds.seeds,
        {
          onProgress: (progress) => {
            useAppStore.getState().setSearchProgress({
              currentStep: progress.currentStep,
              totalSteps: progress.totalSteps,
              elapsedTime: progress.elapsedTime,
              estimatedTimeRemaining: progress.estimatedTimeRemaining,
              matchesFound: progress.matchesFound,
              currentDateTime: progress.currentDateTime,
            });
          },
          onResult: (result: InitialSeedResult) => {
            console.log(`🎉 Found match from worker! Seed: 0x${result.seed.toString(16).padStart(8, '0')}`);
            addSearchResult(result);
          },
          onComplete: (message: string) => {
            console.log('✅ Search completed:', message);
            const matchesFound = useAppStore.getState().searchProgress.matchesFound;
            const totalSteps = useAppStore.getState().searchProgress.totalSteps;
            
            if (matchesFound === 0) {
              alert(`Search completed. No matches found in ${totalSteps.toLocaleString()} combinations.\n\nTry:\n- Expanding the date range\n- Checking Timer0/VCount ranges\n- Verifying target seed format\n\nCheck browser console for detailed debug information.`);
            } else {
              alert(`🎉 Search completed successfully!\n\nFound ${matchesFound} matching seed${matchesFound === 1 ? '' : 's'} out of ${totalSteps.toLocaleString()} combinations.\n\nCheck the Results tab for details.`);
            }
            stopSearch();
          },
          onError: (error: string) => {
            console.error('Search error:', error);
            alert(`Search failed: ${error}`);
            stopSearch();
          },
          onPaused: () => {
            console.log('🔻 Search paused by worker');
          },
          onResumed: () => {
            console.log('▶️ Search resumed by worker');
          },
          onStopped: () => {
            console.log('⏹️ Search stopped by worker');
            stopSearch();
          }
        }
      );
    } catch (error) {
      console.error('Failed to start worker search:', error);
      alert(`Failed to start search: ${error instanceof Error ? error.message : 'Unknown error'}`);
      stopSearch();
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex gap-2">
          {!searchProgress.isRunning ? (
            <Button onClick={handleStartSearch} disabled={targetSeeds.seeds.length === 0}>
              <Play size={16} className="mr-2" />
              Start Search
            </Button>
          ) : (
            <>
              {searchProgress.isPaused ? (
                <Button onClick={handleResumeSearch}>
                  <Play size={16} className="mr-2" />
                  Resume
                </Button>
              ) : (
                <Button onClick={handlePauseSearch}>
                  <Pause size={16} className="mr-2" />
                  Pause
                </Button>
              )}
              <Button variant="destructive" onClick={handleStopSearch}>
                <Square size={16} className="mr-2" />
                Stop
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

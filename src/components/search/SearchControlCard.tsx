import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
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
    parallelSearchSettings,
    setParallelSearchEnabled,
    setMaxWorkers,
    setParallelProgress,
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
      
      // Set parallel mode based on settings
      workerManager.setParallelMode(parallelSearchSettings.enabled);
      
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
          onParallelProgress: (aggregatedProgress) => {
            // 並列検索の詳細進捗を保存
            setParallelProgress(aggregatedProgress);
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
            setParallelProgress(null); // 並列進捗をクリア
            stopSearch();
          }
        }
      );
    } catch (error) {
      console.error('Failed to start worker search:', error);
      alert(`Failed to start search: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setParallelProgress(null);
      stopSearch();
    }
  };

  // 並列検索設定の変更
  const handleParallelModeChange = (enabled: boolean) => {
    if (searchProgress.isRunning) {
      alert('Cannot change parallel mode while search is running.');
      return;
    }
    setParallelSearchEnabled(enabled);
  };

  const handleMaxWorkersChange = (values: number[]) => {
    if (searchProgress.isRunning) {
      return;
    }
    setMaxWorkers(values[0]);
  };

  const maxCpuCores = navigator.hardwareConcurrency || 4;
  const isParallelAvailable = getSearchWorkerManager().isParallelSearchAvailable();

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* 検索制御ボタン */}
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

          {/* 並列検索設定 */}
          {isParallelAvailable && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="parallel-search"
                    checked={parallelSearchSettings.enabled}
                    onCheckedChange={handleParallelModeChange}
                    disabled={searchProgress.isRunning}
                  />
                  <Label htmlFor="parallel-search" className="text-sm font-medium">
                    Enable Parallel Search {parallelSearchSettings.enabled ? '(Active)' : '(Experimental)'}
                  </Label>
                </div>

                {parallelSearchSettings.enabled && (
                  <div className="space-y-3 pl-6 border-l-2 border-blue-200 dark:border-blue-800">
                    {/* Worker数設定 */}
                    <div className="space-y-2">
                      <Label className="text-sm">
                        Worker Count: {parallelSearchSettings.maxWorkers} / {maxCpuCores}
                      </Label>
                      <Slider
                        value={[parallelSearchSettings.maxWorkers]}
                        onValueChange={handleMaxWorkersChange}
                        max={maxCpuCores}
                        min={1}
                        step={1}
                        disabled={searchProgress.isRunning}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Conservative</span>
                        <span>Maximum Performance</span>
                      </div>
                    </div>

                    {/* パフォーマンス予測 */}
                    <div className="p-2 bg-blue-50 dark:bg-blue-950/20 rounded text-xs">
                      <div className="font-medium mb-1">Performance Estimation:</div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-muted-foreground">Speed boost: </span>
                          <span className="font-mono">~{Math.round(parallelSearchSettings.maxWorkers * 0.85)}x</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Memory: </span>
                          <span className="font-mono">~{(parallelSearchSettings.maxWorkers * 15).toFixed(0)}MB</span>
                        </div>
                      </div>
                      <p className="mt-1 text-muted-foreground">
                        More workers = faster search but higher memory usage. 
                        {parallelSearchSettings.maxWorkers >= maxCpuCores && " Maximum CPU utilization enabled."}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

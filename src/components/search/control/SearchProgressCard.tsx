import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CaretDown, CaretUp } from '@phosphor-icons/react';
import { useAppStore } from '../../../store/app-store';
import { 
  formatElapsedTime, 
  formatRemainingTime, 
  formatProcessingRate,
  calculateOverallProcessingRate,
  calculateWorkerProcessingRate
} from '../../../lib/utils/format-helpers';
import { TimeDisplay } from './TimeDisplay';

export function SearchProgressCard() {
  const { searchProgress, parallelProgress, parallelSearchSettings } = useAppStore();
  const [isWorkerDetailsExpanded, setIsWorkerDetailsExpanded] = useState(true);

  const isParallelMode = parallelSearchSettings.enabled;
  const isRunning = searchProgress.isRunning;
  
  // 起動したワーカー総数を基準にする（停止・完了含む）
  const totalWorkerCount = parallelProgress?.workerProgresses?.size || 0;

  // ワーカー数に応じたレイアウト決定
  const getWorkerLayout = (count: number) => {
    if (count <= 4) return { cols: 2, showProgress: true };
    if (count <= 8) return { cols: 2, showProgress: true };
    if (count <= 16) return { cols: 3, showProgress: true };
    if (count <= 32) return { cols: 4, showProgress: true };
    return { cols: 4, showProgress: false }; // 32超過は簡略化
  };

  const workerLayout = getWorkerLayout(totalWorkerCount);

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-3 flex-shrink-0">
        <CardTitle className="flex items-center justify-between text-base">
          Search Progress
          {isParallelMode && parallelProgress && totalWorkerCount > 0 && (
            <Badge variant="outline" className="text-xs">
              {totalWorkerCount} Workers
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 flex-1 flex flex-col min-h-0">
        {/* 基本進捗表示 - 実行中・完了後も表示 */}
        {(isRunning || (isParallelMode && parallelProgress)) && (
          <>
            <Progress value={(searchProgress.currentStep / searchProgress.totalSteps) * 100} />
            
            {/* 時間表示 - 直列・並列共通 */}
            <TimeDisplay
              elapsedTime={isParallelMode ? parallelProgress?.totalElapsedTime || 0 : searchProgress.elapsedTime}
              estimatedTimeRemaining={isParallelMode ? parallelProgress?.totalEstimatedTimeRemaining || 0 : searchProgress.estimatedTimeRemaining}
              currentStep={isParallelMode ? parallelProgress?.totalCurrentStep || 0 : searchProgress.currentStep}
              totalSteps={isParallelMode ? parallelProgress?.totalSteps : searchProgress.totalSteps}
            />
            
            {/* 進捗・マッチ情報 - 直列時のみ表示 */}
            {!isParallelMode && (
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-muted-foreground">Progress</div>
                  <div className="font-mono text-sm">
                    {searchProgress.currentStep.toLocaleString()} / {searchProgress.totalSteps.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {((searchProgress.currentStep / searchProgress.totalSteps) * 100).toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Matches</div>
                  <Badge variant={searchProgress.matchesFound > 0 ? "default" : "secondary"} className="text-sm">
                    {searchProgress.matchesFound}
                  </Badge>
                </div>
              </div>
            )}
          </>
        )}

        {/* 検索未実行時のメッセージ */}
        {!isRunning && (!isParallelMode || !parallelProgress || totalWorkerCount === 0) && searchProgress.totalSteps === 0 && (
          <div className="text-center py-4 text-muted-foreground text-sm">
            Ready to search
          </div>
        )}

        {/* 並列検索ワーカー情報 - 常時表示 (検索完了後も表示維持) */}
        {isParallelMode && parallelProgress && totalWorkerCount > 0 && (
          <div className="space-y-3 flex-1 flex flex-col">
            {/* ワーカー統計情報 */}
            <div className="text-xs text-muted-foreground flex justify-between">
              <span>Workers: {parallelProgress.activeWorkers} active, {parallelProgress.completedWorkers} completed</span>
              <span>Total: {totalWorkerCount}</span>
            </div>
            
            {/* ワーカー詳細表示 - 折りたたみ可能 */}
            <div className="space-y-2 flex-1 flex flex-col">
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">Individual Worker Progress</div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsWorkerDetailsExpanded(!isWorkerDetailsExpanded)}
                  className="h-6 w-6 p-0"
                >
                  {isWorkerDetailsExpanded ? (
                    <CaretUp size={12} />
                  ) : (
                    <CaretDown size={12} />
                  )}
                </Button>
              </div>
              
              {isWorkerDetailsExpanded && (
                <>
                  {workerLayout.showProgress ? (
                    // プログレスバー表示：2-4列可変、カード内スクロール
                    <div className="space-y-2 flex-1 flex flex-col">
                      <div className="flex-1 overflow-y-auto pr-1 min-h-0">
                        <div className={`grid gap-2 ${
                          workerLayout.cols === 2 ? 'grid-cols-2' :
                          workerLayout.cols === 3 ? 'grid-cols-3' :
                          'grid-cols-4'
                        }`}>
                          {Array.from(parallelProgress.workerProgresses.entries()).map(([workerId, progress]) => (
                            <div
                              key={workerId}
                              className="p-2 rounded border bg-muted/20 space-y-1.5 min-h-[4rem]"
                            >
                              <div className="flex justify-between items-center text-xs">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono font-medium">W{workerId}</span>
                                  {progress.matchesFound > 0 && (
                                    <span className="px-1 py-0.5 bg-green-100 text-green-800 rounded text-[9px] font-medium">
                                      [{progress.matchesFound}]
                                    </span>
                                  )}
                                </div>
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${
                                  progress.status === 'completed' 
                                    ? 'bg-green-100 text-green-800' 
                                    : progress.status === 'running'
                                      ? 'bg-blue-100 text-blue-800'
                                      : progress.status === 'error'
                                        ? 'bg-red-100 text-red-800'
                                        : 'bg-gray-100 text-gray-600'
                                }`}>
                                  {progress.status === 'completed' ? 'Done' : 
                                   progress.status === 'error' ? 'Error' :
                                   progress.status === 'running' ? 'Run' : 'Init'}
                                </span>
                              </div>
                              <Progress 
                                value={progress.status === 'completed' ? 100 : (progress.currentStep / progress.totalSteps) * 100} 
                                className="h-1.5"
                              />
                              <div className="flex justify-between text-[10px] text-muted-foreground">
                                <span>
                                  {progress.status === 'completed' ? '100%' : 
                                   `${Math.round((progress.currentStep / progress.totalSteps) * 100)}%`}
                                </span>
                                <span className="font-mono">
                                  {formatProcessingRate(progress.currentStep, progress.elapsedTime)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="text-[10px] text-muted-foreground pt-1 border-t">
                        Running: {Array.from(parallelProgress.workerProgresses.values()).filter(p => p.status === 'running').length}, 
                        Completed: {Array.from(parallelProgress.workerProgresses.values()).filter(p => p.status === 'completed').length}, 
                        Total Matches: {Array.from(parallelProgress.workerProgresses.values()).reduce((sum, p) => sum + p.matchesFound, 0)}
                      </div>
                    </div>
                  ) : (
                    // 簡略化表示：大量ワーカー向け
                    <div className="space-y-2">
                      <div className="text-xs text-muted-foreground">Worker Overview ({totalWorkerCount} workers)</div>
                      <Progress 
                        value={(parallelProgress.completedWorkers / totalWorkerCount) * 100} 
                        className="h-2"
                      />
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>{parallelProgress.completedWorkers} / {totalWorkerCount} completed</span>
                        <span>{Array.from(parallelProgress.workerProgresses.values()).reduce((sum, p) => sum + p.matchesFound, 0)} total matches</span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CaretDown, CaretRight } from '@phosphor-icons/react';
import { useAppStore } from '../../store/app-store';

export function SearchProgressCard() {
  const { searchProgress, parallelProgress, parallelSearchSettings } = useAppStore();
  const [showWorkerDetails, setShowWorkerDetails] = React.useState(false);

  if (!searchProgress.isRunning) {
    return null;
  }

  const isParallelMode = parallelSearchSettings.enabled && parallelProgress;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Search Progress
          {isParallelMode && (
            <Badge variant="outline" className="text-xs">
              {parallelProgress.activeWorkers} Workers Active
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={(searchProgress.currentStep / searchProgress.totalSteps) * 100} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">Progress</div>
            <div className="font-mono">
              {searchProgress.currentStep.toLocaleString()} / {searchProgress.totalSteps.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">
              {((searchProgress.currentStep / searchProgress.totalSteps) * 100).toFixed(2)}%
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Matches Found</div>
            <Badge variant={searchProgress.matchesFound > 0 ? "default" : "secondary"}>
              {searchProgress.matchesFound}
            </Badge>
            {isParallelMode && (
              <div className="text-xs text-muted-foreground mt-1">
                Rate: {searchProgress.totalSteps > 0 
                  ? ((searchProgress.matchesFound / searchProgress.totalSteps) * 100).toFixed(4)
                  : '0.00'
                }%
              </div>
            )}
          </div>
          <div>
            <div className="text-muted-foreground">Elapsed Time</div>
            <div className="font-mono">{Math.floor(searchProgress.elapsedTime / 1000)}s</div>
            {isParallelMode && (
              <div className="text-xs text-muted-foreground">
                Speed: {searchProgress.elapsedTime > 0 
                  ? Math.round(searchProgress.currentStep / (searchProgress.elapsedTime / 1000)).toLocaleString()
                  : '0'
                } calc/sec
              </div>
            )}
          </div>
          <div>
            <div className="text-muted-foreground">Est. Remaining</div>
            <div className="font-mono">
              {searchProgress.estimatedTimeRemaining > 0 ? `${Math.floor(searchProgress.estimatedTimeRemaining / 1000)}s` : '--'}
            </div>
          </div>
        </div>

        {/* 並列検索の詳細情報 */}
        {isParallelMode && (
          <Collapsible open={showWorkerDetails} onOpenChange={setShowWorkerDetails}>
            <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors">
              {showWorkerDetails ? <CaretDown size={16} /> : <CaretRight size={16} />}
              Worker Details ({parallelProgress.activeWorkers} active, {parallelProgress.completedWorkers} completed)
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              {/* 並列検索パフォーマンス指標 */}
              <div className="grid grid-cols-2 gap-2 mb-3 p-2 bg-blue-50 dark:bg-blue-950/20 rounded text-xs">
                <div>
                  <div className="text-muted-foreground">Total Speed</div>
                  <div className="font-mono">
                    {parallelProgress.totalElapsedTime > 0 
                      ? Math.round(parallelProgress.totalCurrentStep / (parallelProgress.totalElapsedTime / 1000)).toLocaleString()
                      : '0'
                    } calc/sec
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Efficiency</div>
                  <div className="font-mono">
                    {parallelProgress.activeWorkers > 0 
                      ? Math.round((parallelProgress.activeWorkers / (navigator.hardwareConcurrency || 4)) * 100)
                      : 0
                    }% CPU
                  </div>
                </div>
              </div>

              {/* Worker詳細リスト */}
              <div className="space-y-2">
                {Array.from(parallelProgress.workerProgresses.entries()).map(([workerId, progress]) => (
                  <div key={workerId} className="p-2 bg-muted rounded text-xs">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium">Worker {workerId}</span>
                      <div className="flex items-center gap-2">
                        {/* Worker速度 */}
                        <span className="text-muted-foreground">
                          {progress.elapsedTime > 0 
                            ? Math.round(progress.currentStep / (progress.elapsedTime / 1000)).toLocaleString()
                            : '0'
                          } calc/sec
                        </span>
                        <Badge variant={
                          progress.status === 'completed' ? 'default' :
                          progress.status === 'running' ? 'secondary' :
                          progress.status === 'error' ? 'destructive' : 'outline'
                        } className="text-xs">
                          {progress.status}
                        </Badge>
                      </div>
                    </div>
                    <Progress 
                      value={(progress.currentStep / progress.totalSteps) * 100} 
                      className="h-1 mb-1"
                    />
                    <div className="flex justify-between text-muted-foreground">
                      <span>{progress.currentStep.toLocaleString()} / {progress.totalSteps.toLocaleString()}</span>
                      <span>{progress.matchesFound} matches</span>
                    </div>
                    {/* Worker時刻範囲表示 */}
                    {progress.currentDateTime && (
                      <div className="mt-1 text-muted-foreground">
                        Current: {progress.currentDateTime.toLocaleString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {searchProgress.currentDateTime && (
          <div className="mt-4 p-3 bg-muted rounded text-sm">
            <div className="text-muted-foreground mb-1">Currently Testing:</div>
            <div className="font-mono">
              {searchProgress.currentDateTime.toLocaleString()} 
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

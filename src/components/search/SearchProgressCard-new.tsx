import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '../../store/app-store';

export function SearchProgressCard() {
  const { searchProgress, parallelProgress, parallelSearchSettings } = useAppStore();

  const isParallelMode = parallelSearchSettings.enabled && parallelProgress;
  const isRunning = searchProgress.isRunning;

  return (
    <Card className="h-fit">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          Search Progress
          {isParallelMode && (
            <Badge variant="outline" className="text-xs">
              {parallelProgress.activeWorkers} Workers
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isRunning ? (
          <>
            <Progress value={(searchProgress.currentStep / searchProgress.totalSteps) * 100} />
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
          </>
        ) : (
          <div className="text-center py-4 text-muted-foreground text-sm">
            Ready to search
          </div>
        )}

        {/* 並列検索ワーカー情報 - 常時表示 */}
        {isParallelMode && parallelProgress && (
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">
              Workers: {parallelProgress.activeWorkers} active, {parallelProgress.completedWorkers} completed
            </div>
            {parallelProgress.totalElapsedTime > 0 && (
              <div className="text-xs text-muted-foreground">
                Rate: {Math.round(parallelProgress.totalCurrentStep / (parallelProgress.totalElapsedTime / 1000)).toLocaleString()} calc/sec
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '../../store/app-store';

export function SearchProgressCard() {
  const { searchProgress } = useAppStore();

  if (!searchProgress.isRunning) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Search Progress</CardTitle>
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
          </div>
          <div>
            <div className="text-muted-foreground">Elapsed Time</div>
            <div className="font-mono">{Math.floor(searchProgress.elapsedTime / 1000)}s</div>
          </div>
          <div>
            <div className="text-muted-foreground">Est. Remaining</div>
            <div className="font-mono">
              {searchProgress.estimatedTimeRemaining > 0 ? `${Math.floor(searchProgress.estimatedTimeRemaining / 1000)}s` : '--'}
            </div>
          </div>
        </div>
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

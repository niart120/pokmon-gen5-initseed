import React from 'react';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/store/app-store';

export function AppHeader() {
  const { targetSeeds, searchResults, searchProgress } = useAppStore();

  return (
    <header className="border-b bg-card">
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">
              Pokémon BW/BW2 Initial Seed Search
            </h1>
            <p className="text-muted-foreground text-xs mt-0.5">
              Advanced seed calculation for competitive RNG
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Target Seeds</div>
              <Badge variant="secondary">{targetSeeds.seeds.length}</Badge>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Matches Found</div>
              <Badge variant={searchResults.length > 0 ? "default" : "secondary"}>
                {searchResults.length}
              </Badge>
            </div>
            {searchProgress.isRunning && (
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Status</div>
                <Badge variant="outline" className="animate-pulse">
                  {searchProgress.isPaused ? 'Paused' : 'Searching...'}
                </Badge>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

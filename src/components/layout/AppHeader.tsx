import React from 'react';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/store/app-store';

export function AppHeader() {
  const { targetSeeds, searchResults, searchProgress } = useAppStore();

  return (
    <header className="border-b bg-card">
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-xl font-bold text-foreground truncate">
              Pokémon BW/BW2 Initial Seed Search
            </h1>
            <p className="text-muted-foreground text-xs mt-0.5 hidden sm:block">
              Advanced seed calculation for competitive RNG
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            <div className="text-right">
              <div className="text-xs sm:text-sm text-muted-foreground">Target Seeds</div>
              <Badge variant="secondary">{targetSeeds.seeds.length}</Badge>
            </div>
            <div className="text-right">
              <div className="text-xs sm:text-sm text-muted-foreground">Matches Found</div>
              <Badge variant={searchResults.length > 0 ? "default" : "secondary"}>
                {searchResults.length}
              </Badge>
            </div>
            {searchProgress.isRunning && (
              <div className="text-right hidden sm:block">
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

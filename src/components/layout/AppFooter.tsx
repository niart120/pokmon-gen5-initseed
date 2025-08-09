import React from 'react';

export function AppFooter() {
  return (
    <footer className="border-t bg-muted/50 mt-1">
      <div className="container mx-auto px-4 py-1">
        <div className="text-center text-xs text-muted-foreground">
          <p>Pokémon BW/BW2 Initial Seed Search - Educational & competitive RNG research tool</p>
          {/* Data source attribution */}
          <p className="mt-1">
            Encounter data source: <a href="https://pokebook.jp/" target="_blank" rel="noreferrer" className="underline">ポケモンの友 (Pokebook)</a>
          </p>
        </div>
      </div>
    </footer>
  );
}

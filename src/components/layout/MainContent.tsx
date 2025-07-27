import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { MagnifyingGlass, Info, Gear } from '@phosphor-icons/react';
import { useAppStore } from '@/store/app-store';
import { SearchPanel } from './SearchPanel';
import { OptionPanel } from './OptionPanel';
import { HelpPanel } from './HelpPanel';

export function MainContent() {
  const { activeTab, setActiveTab, targetSeeds, searchResults } = useAppStore();

  return (
    <main className="px-1 py-2 max-w-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3">
        <TabsList className="grid grid-cols-3 w-full max-w-6xl mx-auto">
          <TabsTrigger value="search" className="flex items-center gap-2">
            <MagnifyingGlass size={16} />
            Search
            {targetSeeds.seeds.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {targetSeeds.seeds.length}
              </Badge>
            )}
            {searchResults.length > 0 && (
              <Badge variant="default" className="ml-1">
                {searchResults.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <Gear size={16} />
            Option
          </TabsTrigger>
          <TabsTrigger value="help" className="flex items-center gap-2">
            <Info size={16} />
            Help
          </TabsTrigger>
        </TabsList>

        <TabsContent value="search">
          <SearchPanel />
        </TabsContent>

        <TabsContent value="history">
          <OptionPanel />
        </TabsContent>

        <TabsContent value="help">
          <HelpPanel />
        </TabsContent>
      </Tabs>
    </main>
  );
}

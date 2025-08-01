import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { MagnifyingGlass, Info, Gear } from '@phosphor-icons/react';
import { useAppStore } from '@/store/app-store';
import { useIsStackLayout } from '@/hooks/use-mobile';
import { SearchPanel } from './SearchPanel';
import { OptionPanel } from './OptionPanel';
import { HelpPanel } from './HelpPanel';

export function MainContent() {
  const { activeTab, setActiveTab, targetSeeds, searchResults } = useAppStore();
  const { isStack } = useIsStackLayout();

  // レスポンシブに応じたoverflow設定
  const overflowClasses = isStack 
    ? "overflow-x-hidden overflow-y-auto" // 縦スタック時：水平スクロール無し、垂直スクロール有り
    : "overflow-x-auto overflow-y-hidden"; // 横並び時：水平スクロール有り、垂直スクロール無し

  return (
    <main className={`px-2 sm:px-3 lg:px-4 xl:px-6 2xl:px-8 py-1 max-w-none flex-1 flex flex-col ${overflowClasses}`}>
      <div className="max-w-screen-2xl mx-auto w-full flex-1 flex flex-col min-w-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-2 flex flex-col flex-1 min-h-0">
          <TabsList className="grid grid-cols-3 w-full max-w-6xl mx-auto flex-shrink-0 h-9">
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

        <TabsContent value="search" className="flex-1 min-h-0">
          <SearchPanel />
        </TabsContent>

        <TabsContent value="history" className="flex-1 min-h-0">
          <OptionPanel />
        </TabsContent>

        <TabsContent value="help" className="flex-1 min-h-0">
          <HelpPanel />
        </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}

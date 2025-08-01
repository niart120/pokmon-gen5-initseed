import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { MagnifyingGlass, Info, Gear } from '@phosphor-icons/react';
import { useAppStore } from '@/store/app-store';
import { useIsStackLayout } from '@/hooks/use-mobile-new';
import { SearchPanel } from './SearchPanel';
import { OptionPanel } from './OptionPanel';
import { HelpPanel } from './HelpPanel';

export function MainContent() {
  const { activeTab, setActiveTab, targetSeeds, searchResults } = useAppStore();
  const { isStack } = useIsStackLayout();

  // MainContentデバッグログ追加
  console.log('🏠 MainContent Hook result:', { isStack });

  // レスポンシブに応じたoverflow設定とレイアウト
  const overflowClasses = isStack 
    ? "overflow-y-auto overflow-x-hidden" // 縦スタック時：垂直スクロール有り、水平スクロール無し
    : "overflow-x-auto overflow-y-auto"; // 横並び時：両方向スクロール有り（必要に応じて）

  const layoutClasses = isStack
    ? "flex flex-col" // モバイル: 縦積み
    : "flex flex-col"; // デスクトップも一旦flex-colのまま（SearchPanelが内部で横並びを制御）

  return (
    <main className={`px-2 sm:px-3 lg:px-4 xl:px-6 2xl:px-8 py-1 max-w-none flex-1 ${layoutClasses} ${overflowClasses}`}>
      <div className="max-w-screen-2xl mx-auto w-full flex-1 flex flex-col min-w-0 min-h-0">
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

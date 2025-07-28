import React, { useState, useMemo } from 'react';
import { useAppStore } from '../../store/app-store';
import { 
  ROMConfigurationCard, 
  Timer0VCountCard, 
  DateRangeCard, 
  MACAddressCard, 
  TargetSeedsCard 
} from '../search/configuration';
import { SearchControlCard, SearchProgressCard } from '../search/control';
import { ResultsControlCard, ResultsHeaderCard, ResultsTableCard, ResultDetailsDialog, type SortField } from '../search/results';
import { useIsStackLayout } from '../../hooks/use-mobile';
import type { InitialSeedResult, SearchResult } from '../../types/pokemon';

export function SearchPanel() {
  const { searchConditions, setSearchConditions, searchResults } = useAppStore();
  const isStackLayout = useIsStackLayout();

  // Results state management (moved from ResultsPanel)
  const [filterSeed, setFilterSeed] = useState('');
  const [sortField, setSortField] = useState<SortField>('datetime');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedResult, setSelectedResult] = useState<InitialSeedResult | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Convert InitialSeedResult to SearchResult for export
  const convertToSearchResults: SearchResult[] = useMemo(() => {
    return searchResults.map(result => ({
      seed: result.seed,
      dateTime: result.datetime,
      timer0: result.timer0,
      vcount: result.vcount,
      romVersion: result.conditions.romVersion,
      romRegion: result.conditions.romRegion,
      hardware: result.conditions.hardware,
      macAddress: result.conditions.macAddress,
      keyInput: result.conditions.keyInput,
      message: result.message,
      hash: result.sha1Hash,
    }));
  }, [searchResults]);

  // Filter results based on seed filter
  const filteredResults = useMemo(() => {
    if (!filterSeed.trim()) return searchResults;
    
    const filterValue = filterSeed.trim().toLowerCase();
    return searchResults.filter(result => {
      const seedHex = result.seed.toString(16).toLowerCase();
      const seedDec = result.seed.toString();
      return seedHex.includes(filterValue) || seedDec.includes(filterValue);
    });
  }, [searchResults, filterSeed]);

  // Sort results
  const filteredAndSortedResults = useMemo(() => {
    const sorted = [...filteredResults].sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortField) {
        case 'datetime':
          aValue = a.datetime.getTime();
          bValue = b.datetime.getTime();
          break;
        case 'seed':
          aValue = a.seed;
          bValue = b.seed;
          break;
        case 'timer0':
          aValue = a.timer0;
          bValue = b.timer0;
          break;
        case 'vcount':
          aValue = a.vcount;
          bValue = b.vcount;
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    
    return sorted;
  }, [filteredResults, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleShowDetails = (result: InitialSeedResult) => {
    setSelectedResult(result);
    setIsDetailsOpen(true);
  };

  if (isStackLayout) {
    // スマートフォン・縦長画面: 縦スタック配置
    return (
      <div className="space-y-3 h-full overflow-y-auto flex flex-col">
        <ROMConfigurationCard />
        <Timer0VCountCard />
        <DateRangeCard />
        <MACAddressCard />
        <TargetSeedsCard />
        <SearchControlCard />
        <SearchProgressCard />
        <ResultsControlCard
          filteredResultsCount={filteredAndSortedResults.length}
          convertedResults={convertToSearchResults}
          filterSeed={filterSeed}
          setFilterSeed={setFilterSeed}
          sortField={sortField}
          setSortField={setSortField}
        />
        <ResultsHeaderCard
          filteredResultsCount={filteredAndSortedResults.length}
      />
        <ResultsTableCard
          filteredAndSortedResults={filteredAndSortedResults}
          searchResultsLength={searchResults.length}
          sortField={sortField}
          sortOrder={sortOrder}
          onSort={handleSort}
          onShowDetails={handleShowDetails}
        />
      </div>
    );
  }

  // PC: 3カラム配置（設定 | 検索制御・進捗 | 結果）
  return (
    <div className="flex gap-2 max-w-full h-full min-h-0 min-w-fit">
      {/* 左カラム: 設定エリア */}
      <div className="flex-1 flex flex-col gap-3 min-w-0 sm:min-w-64" style={{ minHeight: 0 }}>
        <div className="flex-none">
          <ROMConfigurationCard />
        </div>
        <div className="flex-none">
          <Timer0VCountCard />
        </div>
        <div className="flex-none">
          <DateRangeCard />
        </div>
        <div className="flex-none">
          <MACAddressCard />
        </div>
        <div className="flex-1 min-h-0">
          <TargetSeedsCard />
        </div>
      </div>
      
      {/* 中央カラム: 検索制御・進捗エリア */}
      <div className="flex-1 flex flex-col gap-3 min-w-0 sm:min-w-64" style={{ minHeight: 0 }}>
        <div className="flex-none">
          <SearchControlCard />
        </div>
        <div className="flex-1 min-h-0">
          <SearchProgressCard />
        </div>
      </div>
      
      {/* 右カラム: 結果エリア */}
      <div className="flex-1 flex flex-col gap-3 min-w-0 sm:min-w-64" style={{ minHeight: 0 }}>
        <div className="flex-none">
          <ResultsControlCard
            filteredResultsCount={filteredAndSortedResults.length}
            convertedResults={convertToSearchResults}
            filterSeed={filterSeed}
            setFilterSeed={setFilterSeed}
            sortField={sortField}
            setSortField={setSortField}
          />
        </div>
        <div className="flex-none">
          <ResultsHeaderCard
            filteredResultsCount={filteredAndSortedResults.length}
          />
        </div>
        <div className="flex-1 min-h-0">
          <ResultsTableCard
            filteredAndSortedResults={filteredAndSortedResults}
            searchResultsLength={searchResults.length}
            sortField={sortField}
            sortOrder={sortOrder}
            onSort={handleSort}
            onShowDetails={handleShowDetails}
          />
        </div>
      </div>

      {/* Results Details Dialog */}
      <ResultDetailsDialog
        result={selectedResult}
        isOpen={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
      />
    </div>
  );
}

import React, { useState, useMemo } from 'react';
import { useAppStore } from '../../store/app-store';
import { getFullTimer0Range, getValidVCounts } from '../../lib/utils/rom-parameter-helpers';
import { ROMConfigurationCard } from '../search/ROMConfigurationCard';
import { Timer0VCountCard } from '../search/Timer0VCountCard';
import { DateRangeCard } from '../search/DateRangeCard';
import { MACAddressCard } from '../search/MACAddressCard';
import { SearchProgressCard } from '../search/SearchProgressCard';
import { SearchControlCard } from '../search/SearchControlCard';
import { TargetSeedsInput } from '../search/TargetSeedsInput';
import { ResultsControlCard, ResultsHeaderCard, ResultsTableCard, ResultDetailsDialog, type SortField } from '../results';
import { useIsMobile } from '../../hooks/use-mobile';
import type { InitialSeedResult, SearchResult } from '../../types/pokemon';

export function SearchPanel() {
  const { searchConditions, setSearchConditions, searchResults } = useAppStore();
  const isMobile = useIsMobile();

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

  // Update auto-parameters when ROM version/region changes
  React.useEffect(() => {
    if (searchConditions.timer0Range.useAutoRange) {
      const timer0Range = getFullTimer0Range(searchConditions.romVersion, searchConditions.romRegion);
      if (timer0Range) {
        setSearchConditions({
          timer0Range: {
            ...searchConditions.timer0Range,
            min: timer0Range.min,
            max: timer0Range.max,
          },
        });
      }
    }
    
    if (searchConditions.vcountRange.useAutoRange) {
      const validVCounts = getValidVCounts(searchConditions.romVersion, searchConditions.romRegion);
      if (validVCounts.length > 0) {
        // 通常版は最初のVCOUNT値、VCOUNTずれ版は全範囲を使用
        const minVCount = Math.min(...validVCounts);
        const maxVCount = Math.max(...validVCounts);
        setSearchConditions({
          vcountRange: {
            ...searchConditions.vcountRange,
            min: minVCount,
            max: maxVCount,
          },
        });
      }
    }
  }, [searchConditions.romVersion, searchConditions.romRegion]);

  if (isMobile) {
    // スマートフォン: 縦スタック配置
    return (
      <div className="space-y-3">
        <ROMConfigurationCard />
        <Timer0VCountCard />
        <DateRangeCard />
        <MACAddressCard />
        <TargetSeedsInput />
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
    <div className="grid grid-cols-3 gap-3 max-w-full">
      {/* 左カラム: 設定エリア */}
      <div className="space-y-3 min-w-0">
        <ROMConfigurationCard />
        <Timer0VCountCard />
        <DateRangeCard />
        <MACAddressCard />
        <TargetSeedsInput />
      </div>
      
      {/* 中央カラム: 検索制御・進捗エリア */}
      <div className="space-y-3 min-w-0 flex flex-col">
        <SearchControlCard />
        <SearchProgressCard />
      </div>
      
      {/* 右カラム: 結果エリア */}
      <div className="space-y-3 min-w-0">
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

      {/* Results Details Dialog */}
      <ResultDetailsDialog
        result={selectedResult}
        isOpen={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
      />
    </div>
  );
}

import { useState, useMemo } from 'react';
import { useAppStore } from '../../store/app-store';
import { ResultsHeaderCard, type SortField } from '../results/ResultsHeaderCard';
import { ResultsTableCard } from '../results/ResultsTableCard';
import { ResultDetailsDialog } from '../results/ResultDetailsDialog';
import type { InitialSeedResult, SearchResult } from '../../types/pokemon';

export function ResultsPanel() {
  const { searchResults } = useAppStore();
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

  return (
    <div className="space-y-6">
      <ResultsHeaderCard
        filteredResultsCount={filteredAndSortedResults.length}
        convertedResults={convertToSearchResults}
        filterSeed={filterSeed}
        setFilterSeed={setFilterSeed}
        sortField={sortField}
        setSortField={setSortField}
      />

      <ResultsTableCard
        filteredAndSortedResults={filteredAndSortedResults}
        searchResultsLength={searchResults.length}
        sortField={sortField}
        sortOrder={sortOrder}
        onSort={handleSort}
        onShowDetails={handleShowDetails}
      />

      <ResultDetailsDialog
        result={selectedResult}
        isOpen={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
      />
    </div>
  );
}

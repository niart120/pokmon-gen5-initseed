import React from 'react';
import { useAppStore } from '../store/app-store';
import { getFullTimer0Range, getValidVCounts } from '../lib/utils/rom-parameter-helpers';
import { ROMConfigurationCard } from './search/ROMConfigurationCard';
import { Timer0VCountCard } from './search/Timer0VCountCard';
import { DateRangeCard } from './search/DateRangeCard';
import { MACAddressCard } from './search/MACAddressCard';
import { SearchProgressCard } from './search/SearchProgressCard';
import { SearchControlCard } from './search/SearchControlCard';
import { PresetManager } from './search/PresetManager';
import { SearchHistory } from './search/SearchHistory';

export function SearchPanel() {
  const { searchConditions, setSearchConditions } = useAppStore();

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

  return (
    <div className="space-y-6">
      <PresetManager />
      <SearchHistory />
      <ROMConfigurationCard />
      <Timer0VCountCard />
      <DateRangeCard />
      <MACAddressCard />
      <SearchProgressCard />
      <SearchControlCard />
    </div>
  );
}

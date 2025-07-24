import React from 'react';
import { useAppStore } from '../store/app-store';
import { SeedCalculator } from '../lib/seed-calculator';
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
  const calculator = new SeedCalculator();

  // Update auto-parameters when ROM version/region changes
  React.useEffect(() => {
    const params = calculator.getROMParameters(searchConditions.romVersion, searchConditions.romRegion);
    if (params && searchConditions.timer0Range.useAutoRange) {
      setSearchConditions({
        timer0Range: {
          ...searchConditions.timer0Range,
          min: params.timer0Min,
          max: params.timer0Max,
        },
      });
    }
    if (params && searchConditions.vcountRange.useAutoRange) {
      setSearchConditions({
        vcountRange: {
          ...searchConditions.vcountRange,
          min: params.defaultVCount,
          max: params.defaultVCount,
        },
      });
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

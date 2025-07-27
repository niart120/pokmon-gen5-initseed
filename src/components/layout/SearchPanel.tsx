import React from 'react';
import { useAppStore } from '../../store/app-store';
import { getFullTimer0Range, getValidVCounts } from '../../lib/utils/rom-parameter-helpers';
import { ROMConfigurationCard } from '../search/ROMConfigurationCard';
import { Timer0VCountCard } from '../search/Timer0VCountCard';
import { DateRangeCard } from '../search/DateRangeCard';
import { MACAddressCard } from '../search/MACAddressCard';
import { SearchProgressCard } from '../search/SearchProgressCard';
import { SearchControlCard } from '../search/SearchControlCard';
import { TargetSeedsInput } from '../search/TargetSeedsInput';
import { ResultsPanel } from './ResultsPanel';
import { useIsMobile } from '../../hooks/use-mobile';

export function SearchPanel() {
  const { searchConditions, setSearchConditions } = useAppStore();
  const isMobile = useIsMobile();

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
        <ResultsPanel />
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
        <ResultsPanel />
      </div>
    </div>
  );
}

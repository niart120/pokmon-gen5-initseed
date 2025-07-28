import React from 'react';
import { formatElapsedTime, formatRemainingTime, formatProcessingRate } from '@/lib/utils/format-helpers';

interface TimeDisplayProps {
  elapsedTime: number;
  estimatedTimeRemaining: number;
  currentStep: number;
  totalSteps?: number;
}

/**
 * 統一時間表示コンポーネント
 * 直列・並列検索の両方で共通の時間情報を表示
 */
export function TimeDisplay({ 
  elapsedTime, 
  estimatedTimeRemaining, 
  currentStep, 
  totalSteps 
}: TimeDisplayProps) {
  const processingRate = formatProcessingRate(currentStep, elapsedTime);
  
  return (
    <div className="grid grid-cols-3 gap-3 text-xs">
      <div>
        <div className="text-muted-foreground">Elapsed</div>
        <div className="font-mono text-sm">
          {formatElapsedTime(elapsedTime)}
        </div>
      </div>
      <div>
        <div className="text-muted-foreground">Remaining</div>
        <div className="font-mono text-sm">
          {formatRemainingTime(estimatedTimeRemaining)}
        </div>
      </div>
      <div>
        <div className="text-muted-foreground">Speed</div>
        <div className="font-mono text-sm">
          {processingRate}
        </div>
      </div>
    </div>
  );
}

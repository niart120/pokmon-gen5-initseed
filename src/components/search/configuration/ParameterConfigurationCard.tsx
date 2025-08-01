import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Gear } from '@phosphor-icons/react';
import { useResponsiveLayout } from '../../../hooks/use-mobile';
import { Timer0VCountParam } from './params/Timer0VCountParam';
import { DateRangeParam } from './params/DateRangeParam';
import { MACAddressParam } from './params/MACAddressParam';

export function ParameterConfigurationCard() {
  const { isStack } = useResponsiveLayout();

  return (
    <Card className="py-2 flex flex-col h-full gap-2">
      <CardHeader className="pb-0 flex-shrink-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Gear size={20} />
          Parameters
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 flex-1 flex flex-col min-h-0 overflow-y-auto">
        {/* Timer0 & VCount 設定 */}
        <Timer0VCountParam />
        
        <Separator />
        
        {/* 日付範囲設定 */}
        <DateRangeParam />
        
        <Separator />
        
        {/* MACアドレス設定 */}
        <MACAddressParam />
      </CardContent>
    </Card>
  );
}

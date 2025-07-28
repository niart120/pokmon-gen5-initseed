import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppStore } from '../../../store/app-store';

export function DateRangeCard() {
  const { searchConditions, setSearchConditions } = useAppStore();

  // Date型からYYYY-MM-DD形式の文字列に変換
  const formatDateForInput = (year: number, month: number, day: number): string => {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  // YYYY-MM-DD形式の文字列から年月日を抽出
  const parseDateFromInput = (dateString: string) => {
    const date = new Date(dateString);
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
    };
  };

  const startDate = formatDateForInput(
    searchConditions.dateRange.startYear,
    searchConditions.dateRange.startMonth,
    searchConditions.dateRange.startDay
  );

  const endDate = formatDateForInput(
    searchConditions.dateRange.endYear,
    searchConditions.dateRange.endMonth,
    searchConditions.dateRange.endDay
  );

  const handleStartDateChange = (dateString: string) => {
    if (!dateString) return;
    
    const { year, month, day } = parseDateFromInput(dateString);
    setSearchConditions({
      dateRange: {
        ...searchConditions.dateRange,
        startYear: year,
        startMonth: month,
        startDay: day,
        startHour: 0,
        startMinute: 0,
        startSecond: 0,
      },
    });
  };

  const handleEndDateChange = (dateString: string) => {
    if (!dateString) return;
    
    const { year, month, day } = parseDateFromInput(dateString);
    setSearchConditions({
      dateRange: {
        ...searchConditions.dateRange,
        endYear: year,
        endMonth: month,
        endDay: day,
        endHour: 23,
        endMinute: 59,
        endSecond: 59,
      },
    });
  };

  return (
    <Card className="py-2 flex flex-col h-full gap-2">
      <CardHeader className="pb-0 flex-shrink-0">
        <CardTitle className="text-base">Date & Time Range</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 flex-1 min-h-0 flex flex-col">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-shrink-0">
          <div className="space-y-2">
            <Label htmlFor="start-date" className="text-sm font-medium">Start Date</Label>
            <Input
              id="start-date"
              type="date"
              min="2000-01-01"
              max="2099-12-31"
              className="h-9"
              value={startDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="end-date" className="text-sm font-medium">End Date</Label>
            <Input
              id="end-date"
              type="date"
              min="2000-01-01"
              max="2099-12-31"
              className="h-9"
              value={endDate}
              onChange={(e) => handleEndDateChange(e.target.value)}
            />
          </div>
        </div>
        
        <div className="text-xs text-muted-foreground flex-shrink-0">
          Current range: {startDate} to {endDate}
        </div>
      </CardContent>
    </Card>
  );
}

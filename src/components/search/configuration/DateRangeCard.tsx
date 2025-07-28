import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppStore } from '../../../store/app-store';

export function DateRangeCard() {
  const { searchConditions, setSearchConditions } = useAppStore();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Date & Time Range</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Start Date/Time</h4>
            <div className="grid grid-cols-6 gap-2">
              <div className="col-span-2">
                <Label htmlFor="start-year" className="text-xs sm:text-sm">Year</Label>
                <Input
                  id="start-year"
                  type="number"
                  min={2000}
                  max={2099}
                  className="h-9 text-sm"
                  value={searchConditions.dateRange.startYear}
                  onChange={(e) =>
                    setSearchConditions({
                      dateRange: { ...searchConditions.dateRange, startYear: parseInt(e.target.value) || 2000 },
                    })
                  }
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="start-month" className="text-xs sm:text-sm">Month</Label>
                <Input
                  id="start-month"
                  type="number"
                  min={1}
                  max={12}
                  className="h-9 text-sm"
                  value={searchConditions.dateRange.startMonth}
                  onChange={(e) =>
                    setSearchConditions({
                      dateRange: { ...searchConditions.dateRange, startMonth: parseInt(e.target.value) || 1 },
                    })
                  }
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="start-day" className="text-xs sm:text-sm">Day</Label>
                <Input
                  id="start-day"
                  type="number"
                  min={1}
                  max={31}
                  className="h-9 text-sm"
                  value={searchConditions.dateRange.startDay}
                  onChange={(e) =>
                    setSearchConditions({
                      dateRange: { 
                        ...searchConditions.dateRange, 
                        startDay: parseInt(e.target.value) || 1,
                        startHour: 0,
                        startMinute: 0,
                        startSecond: 0
                      },
                    })
                  }
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-medium">End Date/Time</h4>
            <div className="grid grid-cols-6 gap-2">
              <div className="col-span-2">
                <Label htmlFor="end-year" className="text-xs sm:text-sm">Year</Label>
                <Input
                  id="end-year"
                  type="number"
                  min={2000}
                  max={2099}
                  className="h-9 text-sm"
                  value={searchConditions.dateRange.endYear}
                  onChange={(e) =>
                    setSearchConditions({
                      dateRange: { ...searchConditions.dateRange, endYear: parseInt(e.target.value) || 2099 },
                    })
                  }
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="end-month" className="text-xs sm:text-sm">Month</Label>
                <Input
                  id="end-month"
                  type="number"
                  min={1}
                  max={12}
                  className="h-9 text-sm"
                  value={searchConditions.dateRange.endMonth}
                  onChange={(e) =>
                    setSearchConditions({
                      dateRange: { ...searchConditions.dateRange, endMonth: parseInt(e.target.value) || 12 },
                    })
                  }
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="end-day" className="text-xs sm:text-sm">Day</Label>
                <Input
                  id="end-day"
                  type="number"
                  min={1}
                  max={31}
                  className="h-9 text-sm"
                  value={searchConditions.dateRange.endDay}
                  onChange={(e) =>
                    setSearchConditions({
                      dateRange: { 
                        ...searchConditions.dateRange, 
                        endDay: parseInt(e.target.value) || 31,
                        endHour: 23,
                        endMinute: 59,
                        endSecond: 59
                      },
                    })
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

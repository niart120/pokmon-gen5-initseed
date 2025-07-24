import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppStore } from '../../store/app-store';

export function DateRangeCard() {
  const { searchConditions, setSearchConditions } = useAppStore();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Date & Time Range</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="font-medium">Start Date/Time</h4>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label htmlFor="start-year">Year</Label>
                <Input
                  id="start-year"
                  type="number"
                  min={2000}
                  max={2099}
                  value={searchConditions.dateRange.startYear}
                  onChange={(e) =>
                    setSearchConditions({
                      dateRange: { ...searchConditions.dateRange, startYear: parseInt(e.target.value) || 2000 },
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="start-month">Month</Label>
                <Input
                  id="start-month"
                  type="number"
                  min={1}
                  max={12}
                  value={searchConditions.dateRange.startMonth}
                  onChange={(e) =>
                    setSearchConditions({
                      dateRange: { ...searchConditions.dateRange, startMonth: parseInt(e.target.value) || 1 },
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="start-day">Day</Label>
                <Input
                  id="start-day"
                  type="number"
                  min={1}
                  max={31}
                  value={searchConditions.dateRange.startDay}
                  onChange={(e) =>
                    setSearchConditions({
                      dateRange: { ...searchConditions.dateRange, startDay: parseInt(e.target.value) || 1 },
                    })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label htmlFor="start-hour">Hour</Label>
                <Input
                  id="start-hour"
                  type="number"
                  min={0}
                  max={23}
                  value={searchConditions.dateRange.startHour}
                  onChange={(e) =>
                    setSearchConditions({
                      dateRange: { ...searchConditions.dateRange, startHour: parseInt(e.target.value) || 0 },
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="start-minute">Minute</Label>
                <Input
                  id="start-minute"
                  type="number"
                  min={0}
                  max={59}
                  value={searchConditions.dateRange.startMinute}
                  onChange={(e) =>
                    setSearchConditions({
                      dateRange: { ...searchConditions.dateRange, startMinute: parseInt(e.target.value) || 0 },
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="start-second">Second</Label>
                <Input
                  id="start-second"
                  type="number"
                  min={0}
                  max={59}
                  value={searchConditions.dateRange.startSecond}
                  onChange={(e) =>
                    setSearchConditions({
                      dateRange: { ...searchConditions.dateRange, startSecond: parseInt(e.target.value) || 0 },
                    })
                  }
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium">End Date/Time</h4>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label htmlFor="end-year">Year</Label>
                <Input
                  id="end-year"
                  type="number"
                  min={2000}
                  max={2099}
                  value={searchConditions.dateRange.endYear}
                  onChange={(e) =>
                    setSearchConditions({
                      dateRange: { ...searchConditions.dateRange, endYear: parseInt(e.target.value) || 2099 },
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="end-month">Month</Label>
                <Input
                  id="end-month"
                  type="number"
                  min={1}
                  max={12}
                  value={searchConditions.dateRange.endMonth}
                  onChange={(e) =>
                    setSearchConditions({
                      dateRange: { ...searchConditions.dateRange, endMonth: parseInt(e.target.value) || 12 },
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="end-day">Day</Label>
                <Input
                  id="end-day"
                  type="number"
                  min={1}
                  max={31}
                  value={searchConditions.dateRange.endDay}
                  onChange={(e) =>
                    setSearchConditions({
                      dateRange: { ...searchConditions.dateRange, endDay: parseInt(e.target.value) || 31 },
                    })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label htmlFor="end-hour">Hour</Label>
                <Input
                  id="end-hour"
                  type="number"
                  min={0}
                  max={23}
                  value={searchConditions.dateRange.endHour}
                  onChange={(e) =>
                    setSearchConditions({
                      dateRange: { ...searchConditions.dateRange, endHour: parseInt(e.target.value) || 23 },
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="end-minute">Minute</Label>
                <Input
                  id="end-minute"
                  type="number"
                  min={0}
                  max={59}
                  value={searchConditions.dateRange.endMinute}
                  onChange={(e) =>
                    setSearchConditions({
                      dateRange: { ...searchConditions.dateRange, endMinute: parseInt(e.target.value) || 59 },
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="end-second">Second</Label>
                <Input
                  id="end-second"
                  type="number"
                  min={0}
                  max={59}
                  value={searchConditions.dateRange.endSecond}
                  onChange={(e) =>
                    setSearchConditions({
                      dateRange: { ...searchConditions.dateRange, endSecond: parseInt(e.target.value) || 59 },
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

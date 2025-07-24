import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAppStore } from '../../store/app-store';

export function Timer0VCountCard() {
  const { searchConditions, setSearchConditions } = useAppStore();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Timer0 & VCount Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="auto-timer0"
                checked={searchConditions.timer0Range.useAutoRange}
                onCheckedChange={(checked) =>
                  setSearchConditions({
                    timer0Range: { ...searchConditions.timer0Range, useAutoRange: !!checked },
                  })
                }
              />
              <Label htmlFor="auto-timer0">Use auto Timer0 range</Label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="timer0-min">Timer0 Min</Label>
                <Input
                  id="timer0-min"
                  type="number"
                  value={searchConditions.timer0Range.min}
                  onChange={(e) =>
                    setSearchConditions({
                      timer0Range: { ...searchConditions.timer0Range, min: parseInt(e.target.value) || 0 },
                    })
                  }
                  disabled={searchConditions.timer0Range.useAutoRange}
                />
              </div>
              <div>
                <Label htmlFor="timer0-max">Timer0 Max</Label>
                <Input
                  id="timer0-max"
                  type="number"
                  value={searchConditions.timer0Range.max}
                  onChange={(e) =>
                    setSearchConditions({
                      timer0Range: { ...searchConditions.timer0Range, max: parseInt(e.target.value) || 0 },
                    })
                  }
                  disabled={searchConditions.timer0Range.useAutoRange}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="auto-vcount"
                checked={searchConditions.vcountRange.useAutoRange}
                onCheckedChange={(checked) =>
                  setSearchConditions({
                    vcountRange: { ...searchConditions.vcountRange, useAutoRange: !!checked },
                  })
                }
              />
              <Label htmlFor="auto-vcount">Use auto VCount range</Label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="vcount-min">VCount Min</Label>
                <Input
                  id="vcount-min"
                  type="number"
                  value={searchConditions.vcountRange.min}
                  onChange={(e) =>
                    setSearchConditions({
                      vcountRange: { ...searchConditions.vcountRange, min: parseInt(e.target.value) || 0 },
                    })
                  }
                  disabled={searchConditions.vcountRange.useAutoRange}
                />
              </div>
              <div>
                <Label htmlFor="vcount-max">VCount Max</Label>
                <Input
                  id="vcount-max"
                  type="number"
                  value={searchConditions.vcountRange.max}
                  onChange={(e) =>
                    setSearchConditions({
                      vcountRange: { ...searchConditions.vcountRange, max: parseInt(e.target.value) || 0 },
                    })
                  }
                  disabled={searchConditions.vcountRange.useAutoRange}
                />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

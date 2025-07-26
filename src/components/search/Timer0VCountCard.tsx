import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAppStore } from '../../store/app-store';
import { parseHexInput, formatHexDisplay } from '../../lib/utils/hex-parser';

export function Timer0VCountCard() {
  const { searchConditions, setSearchConditions } = useAppStore();

  const handleTimer0Change = (field: 'min' | 'max', value: string) => {
    const parsed = parseHexInput(value, 0xFFFF); // Timer0 max value
    if (parsed !== null) {
      setSearchConditions({
        timer0Range: { ...searchConditions.timer0Range, [field]: parsed },
      });
    }
  };

  const handleVCountChange = (field: 'min' | 'max', value: string) => {
    const parsed = parseHexInput(value, 0xFF); // VCount max value
    if (parsed !== null) {
      setSearchConditions({
        vcountRange: { ...searchConditions.vcountRange, [field]: parsed },
      });
    }
  };

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
                <Label htmlFor="timer0-min">Timer0 Min (hex)</Label>
                <Input
                  id="timer0-min"
                  type="text"
                  placeholder="0"
                  value={formatHexDisplay(searchConditions.timer0Range.min)}
                  onChange={(e) => handleTimer0Change('min', e.target.value)}
                  disabled={searchConditions.timer0Range.useAutoRange}
                  className="font-mono"
                />
              </div>
              <div>
                <Label htmlFor="timer0-max">Timer0 Max (hex)</Label>
                <Input
                  id="timer0-max"
                  type="text"
                  placeholder="FFFF"
                  value={formatHexDisplay(searchConditions.timer0Range.max)}
                  onChange={(e) => handleTimer0Change('max', e.target.value)}
                  disabled={searchConditions.timer0Range.useAutoRange}
                  className="font-mono"
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
                <Label htmlFor="vcount-min">VCount Min (hex)</Label>
                <Input
                  id="vcount-min"
                  type="text"
                  placeholder="0"
                  value={formatHexDisplay(searchConditions.vcountRange.min)}
                  onChange={(e) => handleVCountChange('min', e.target.value)}
                  disabled={searchConditions.vcountRange.useAutoRange}
                  className="font-mono"
                />
              </div>
              <div>
                <Label htmlFor="vcount-max">VCount Max (hex)</Label>
                <Input
                  id="vcount-max"
                  type="text"
                  placeholder="FF"
                  value={formatHexDisplay(searchConditions.vcountRange.max)}
                  onChange={(e) => handleVCountChange('max', e.target.value)}
                  disabled={searchConditions.vcountRange.useAutoRange}
                  className="font-mono"
                />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

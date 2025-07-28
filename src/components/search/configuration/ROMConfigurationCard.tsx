import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { MagnifyingGlass } from '@phosphor-icons/react';
import { useAppStore } from '../../../store/app-store';
import type { ROMVersion, ROMRegion, Hardware } from '../../../types/pokemon';

const ROM_VERSIONS: { value: ROMVersion; label: string }[] = [
  { value: 'B', label: 'B' },
  { value: 'W', label: 'W' },
  { value: 'B2', label: 'B2' },
  { value: 'W2', label: 'W2' },
];

const ROM_REGIONS: { value: ROMRegion; label: string }[] = [
  { value: 'JPN', label: 'JPN' },
  { value: 'KOR', label: 'KOR' },
  { value: 'USA', label: 'USA' },
  { value: 'GER', label: 'GER' },
  { value: 'FRA', label: 'FRA' },
  { value: 'SPA', label: 'SPA' },
  { value: 'ITA', label: 'ITA' },
];

const HARDWARE_OPTIONS: { value: Hardware; label: string }[] = [
  { value: 'DS', label: 'DS' },
  { value: 'DS_LITE', label: 'DS Lite' },
  { value: '3DS', label: '3DS' },
];

export function ROMConfigurationCard() {
  const { searchConditions, setSearchConditions } = useAppStore();

  return (
    <Card className="py-3">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <MagnifyingGlass size={18} />
          ROM Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1">
            <Label htmlFor="rom-version" className="text-xs sm:text-sm">ROM Version</Label>
            <Select
              value={searchConditions.romVersion}
              onValueChange={(value) => setSearchConditions({ romVersion: value as ROMVersion })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select ROM version" />
              </SelectTrigger>
              <SelectContent>
                {ROM_VERSIONS.map((version) => (
                  <SelectItem key={version.value} value={version.value}>
                    {version.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1">
            <Label htmlFor="rom-region" className="text-xs sm:text-sm">ROM Region</Label>
            <Select
              value={searchConditions.romRegion}
              onValueChange={(value) => setSearchConditions({ romRegion: value as ROMRegion })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select region" />
              </SelectTrigger>
              <SelectContent>
                {ROM_REGIONS.map((region) => (
                  <SelectItem key={region.value} value={region.value}>
                    {region.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1">
            <Label htmlFor="hardware" className="text-xs sm:text-sm">Hardware Version</Label>
            <Select
              value={searchConditions.hardware}
              onValueChange={(value) => setSearchConditions({ hardware: value as Hardware })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select hardware" />
              </SelectTrigger>
              <SelectContent>
                {HARDWARE_OPTIONS.map((hardware) => (
                  <SelectItem key={hardware.value} value={hardware.value}>
                    {hardware.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

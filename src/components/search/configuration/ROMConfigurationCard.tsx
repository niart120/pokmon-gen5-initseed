import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { MagnifyingGlass } from '@phosphor-icons/react';
import { useAppStore } from '../../../store/app-store';
import type { ROMVersion, ROMRegion, Hardware } from '../../../types/pokemon';

const ROM_VERSIONS: { value: ROMVersion; label: string }[] = [
  { value: 'B', label: 'Black (B)' },
  { value: 'W', label: 'White (W)' },
  { value: 'B2', label: 'Black 2 (B2)' },
  { value: 'W2', label: 'White 2 (W2)' },
];

const ROM_REGIONS: { value: ROMRegion; label: string }[] = [
  { value: 'JPN', label: 'Japan (JPN)' },
  { value: 'KOR', label: 'Korea (KOR)' },
  { value: 'USA', label: 'USA (USA)' },
  { value: 'GER', label: 'Germany (GER)' },
  { value: 'FRA', label: 'France (FRA)' },
  { value: 'SPA', label: 'Spain (SPA)' },
  { value: 'ITA', label: 'Italy (ITA)' },
];

const HARDWARE_OPTIONS: { value: Hardware; label: string }[] = [
  { value: 'DS', label: 'Nintendo DS' },
  { value: 'DS_LITE', label: 'Nintendo DS Lite' },
  { value: '3DS', label: 'Nintendo 3DS' },
];

export function ROMConfigurationCard() {
  const { searchConditions, setSearchConditions } = useAppStore();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MagnifyingGlass size={20} />
          ROM Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="rom-version">ROM Version</Label>
            <Select
              value={searchConditions.romVersion}
              onValueChange={(value) => setSearchConditions({ romVersion: value as ROMVersion })}
            >
              <SelectTrigger>
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

          <div>
            <Label htmlFor="rom-region">ROM Region</Label>
            <Select
              value={searchConditions.romRegion}
              onValueChange={(value) => setSearchConditions({ romRegion: value as ROMRegion })}
            >
              <SelectTrigger>
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

          <div>
            <Label htmlFor="hardware">Hardware</Label>
            <Select
              value={searchConditions.hardware}
              onValueChange={(value) => setSearchConditions({ hardware: value as Hardware })}
            >
              <SelectTrigger>
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

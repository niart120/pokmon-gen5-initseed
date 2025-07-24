import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Play, Pause, Square, MagnifyingGlass } from '@phosphor-icons/react';
import { useAppStore } from '../store/app-store';
import { SeedCalculator } from '../lib/seed-calculator';
import { getSearchWorkerManager } from '../lib/search-worker-manager';
import type { ROMVersion, ROMRegion, Hardware, InitialSeedResult } from '../types/pokemon';

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

export function SearchPanel() {
  const {
    searchConditions,
    setSearchConditions,
    searchProgress,
    startSearch,
    pauseSearch,
    resumeSearch,
    stopSearch,
    targetSeeds,
    addSearchResult,
    clearSearchResults,
  } = useAppStore();

  const calculator = new SeedCalculator();

  // Worker management functions
  const handlePauseSearch = () => {
    pauseSearch();
    const workerManager = getSearchWorkerManager();
    workerManager.pauseSearch();
  };

  const handleResumeSearch = () => {
    resumeSearch();
    const workerManager = getSearchWorkerManager();
    workerManager.resumeSearch();
  };

  const handleStopSearch = () => {
    stopSearch();
    const workerManager = getSearchWorkerManager();
    workerManager.stopSearch();
  };

  // Update auto-parameters when ROM version/region changes
  React.useEffect(() => {
    const params = calculator.getROMParameters(searchConditions.romVersion, searchConditions.romRegion);
    if (params && searchConditions.timer0Range.useAutoRange) {
      setSearchConditions({
        timer0Range: {
          ...searchConditions.timer0Range,
          min: params.timer0Min,
          max: params.timer0Max,
        },
      });
    }
    if (params && searchConditions.vcountRange.useAutoRange) {
      setSearchConditions({
        vcountRange: {
          ...searchConditions.vcountRange,
          min: params.defaultVCount,
          max: params.defaultVCount,
        },
      });
    }
  }, [searchConditions.romVersion, searchConditions.romRegion]);

  const handleStartSearch = async () => {
    if (targetSeeds.seeds.length === 0) {
      alert('Please add target seeds before starting the search.');
      return;
    }

    console.log('🚀 Starting search with conditions:', searchConditions);
    console.log('🎯 Target seeds:', targetSeeds.seeds.map(s => '0x' + s.toString(16).padStart(8, '0')));

    clearSearchResults();
    startSearch();

    try {
      // Get the worker manager
      const workerManager = getSearchWorkerManager();
      
      // Start search with worker
      await workerManager.startSearch(
        searchConditions,
        targetSeeds.seeds,
        {
          onProgress: (progress) => {
            useAppStore.getState().setSearchProgress({
              currentStep: progress.currentStep,
              totalSteps: progress.totalSteps,
              elapsedTime: progress.elapsedTime,
              estimatedTimeRemaining: progress.estimatedTimeRemaining,
              matchesFound: progress.matchesFound,
              currentDateTime: progress.currentDateTime,
            });
          },
          onResult: (result: InitialSeedResult) => {
            console.log(`🎉 Found match from worker! Seed: 0x${result.seed.toString(16).padStart(8, '0')}`);
            addSearchResult(result);
          },
          onComplete: (message: string) => {
            console.log('✅ Search completed:', message);
            const matchesFound = useAppStore.getState().searchProgress.matchesFound;
            const totalSteps = useAppStore.getState().searchProgress.totalSteps;
            
            if (matchesFound === 0) {
              alert(`Search completed. No matches found in ${totalSteps.toLocaleString()} combinations.\n\nTry:\n- Expanding the date range\n- Checking Timer0/VCount ranges\n- Verifying target seed format\n\nCheck browser console for detailed debug information.`);
            } else {
              alert(`🎉 Search completed successfully!\n\nFound ${matchesFound} matching seed${matchesFound === 1 ? '' : 's'} out of ${totalSteps.toLocaleString()} combinations.\n\nCheck the Results tab for details.`);
            }
            stopSearch();
          },
          onError: (error: string) => {
            console.error('Search error:', error);
            alert(`Search failed: ${error}`);
            stopSearch();
          },
          onPaused: () => {
            console.log('🔻 Search paused by worker');
          },
          onResumed: () => {
            console.log('▶️ Search resumed by worker');
          },
          onStopped: () => {
            console.log('⏹️ Search stopped by worker');
            stopSearch();
          }
        }
      );
    } catch (error) {
      console.error('Failed to start worker search:', error);
      alert(`Failed to start search: ${error instanceof Error ? error.message : 'Unknown error'}`);
      stopSearch();
    }
  };

  const handleMacAddressChange = (index: number, value: string) => {
    const macAddress = [...searchConditions.macAddress];
    const parsed = parseInt(value || '0', 16);
    if (parsed >= 0 && parsed <= 255) {
      macAddress[index] = parsed;
      setSearchConditions({ macAddress });
    }
  };

  return (
    <div className="space-y-6">
      {/* ROM Configuration */}
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

      {/* Timer0 and VCount Configuration */}
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

      {/* Date Range Configuration */}
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

      {/* MAC Address */}
      <Card>
        <CardHeader>
          <CardTitle>MAC Address</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-6 gap-2">
            {searchConditions.macAddress.map((byte, index) => (
              <div key={index}>
                <Label htmlFor={`mac-${index}`}>Byte {index + 1}</Label>
                <Input
                  id={`mac-${index}`}
                  placeholder="00"
                  maxLength={2}
                  value={byte.toString(16).padStart(2, '0').toUpperCase()}
                  onChange={(e) => handleMacAddressChange(index, e.target.value)}
                  className="font-mono text-center"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Search Progress */}
      {searchProgress.isRunning && (
        <Card>
          <CardHeader>
            <CardTitle>Search Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={(searchProgress.currentStep / searchProgress.totalSteps) * 100} />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Progress</div>
                <div className="font-mono">
                  {searchProgress.currentStep.toLocaleString()} / {searchProgress.totalSteps.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">
                  {((searchProgress.currentStep / searchProgress.totalSteps) * 100).toFixed(2)}%
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Matches Found</div>
                <Badge variant={searchProgress.matchesFound > 0 ? "default" : "secondary"}>
                  {searchProgress.matchesFound}
                </Badge>
              </div>
              <div>
                <div className="text-muted-foreground">Elapsed Time</div>
                <div className="font-mono">{Math.floor(searchProgress.elapsedTime / 1000)}s</div>
              </div>
              <div>
                <div className="text-muted-foreground">Est. Remaining</div>
                <div className="font-mono">
                  {searchProgress.estimatedTimeRemaining > 0 ? `${Math.floor(searchProgress.estimatedTimeRemaining / 1000)}s` : '--'}
                </div>
              </div>
            </div>
            {searchProgress.currentDateTime && (
              <div className="mt-4 p-3 bg-muted rounded text-sm">
                <div className="text-muted-foreground mb-1">Currently Testing:</div>
                <div className="font-mono">
                  {searchProgress.currentDateTime.toLocaleString()} 
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Search Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            {!searchProgress.isRunning ? (
              <Button onClick={handleStartSearch} disabled={targetSeeds.seeds.length === 0}>
                <Play size={16} className="mr-2" />
                Start Search
              </Button>
            ) : (
              <>
                {searchProgress.isPaused ? (
                  <Button onClick={handleResumeSearch}>
                    <Play size={16} className="mr-2" />
                    Resume
                  </Button>
                ) : (
                  <Button onClick={handlePauseSearch}>
                    <Pause size={16} className="mr-2" />
                    Pause
                  </Button>
                )}
                <Button variant="destructive" onClick={handleStopSearch}>
                  <Square size={16} className="mr-2" />
                  Stop
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
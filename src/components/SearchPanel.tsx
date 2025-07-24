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
import { Play, Pause, Square, Search } from '@phosphor-icons/react';
import { useAppStore } from '../store/app-store';
import { SeedCalculator } from '../lib/seed-calculator';
import type { ROMVersion, ROMRegion, Hardware } from '../types/pokemon';

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

    console.log('Starting search with conditions:', searchConditions);
    console.log('Target seeds:', targetSeeds.seeds.map(s => '0x' + s.toString(16).padStart(8, '0')));

    clearSearchResults();
    startSearch();

    try {
      // Get ROM parameters
      const params = calculator.getROMParameters(searchConditions.romVersion, searchConditions.romRegion);
      if (!params) {
        throw new Error(`No parameters found for ${searchConditions.romVersion} ${searchConditions.romRegion}`);
      }

      // Calculate total search space
      const timer0Range = searchConditions.timer0Range.max - searchConditions.timer0Range.min + 1;
      const vcountRange = searchConditions.vcountRange.max - searchConditions.vcountRange.min + 1;
      
      // Date range calculation
      const startDate = new Date(
        searchConditions.dateRange.startYear,
        searchConditions.dateRange.startMonth - 1,
        searchConditions.dateRange.startDay,
        searchConditions.dateRange.startHour,
        searchConditions.dateRange.startMinute,
        searchConditions.dateRange.startSecond
      );
      
      const endDate = new Date(
        searchConditions.dateRange.endYear,
        searchConditions.dateRange.endMonth - 1,
        searchConditions.dateRange.endDay,
        searchConditions.dateRange.endHour,
        searchConditions.dateRange.endMinute,
        searchConditions.dateRange.endSecond
      );

      if (startDate > endDate) {
        throw new Error('Start date must be before or equal to end date');
      }

      const dateRange = Math.floor((endDate.getTime() - startDate.getTime()) / 1000) + 1;
      const totalSteps = timer0Range * vcountRange * dateRange;

      console.log(`Starting search with ${totalSteps.toLocaleString()} total combinations`);
      console.log(`Timer0: ${searchConditions.timer0Range.min}-${searchConditions.timer0Range.max} (${timer0Range} values)`);
      console.log(`VCount: ${searchConditions.vcountRange.min}-${searchConditions.vcountRange.max} (${vcountRange} values)`);
      console.log(`Date range: ${startDate.toISOString()} to ${endDate.toISOString()} (${dateRange} seconds)`);
      console.log(`ROM parameters:`, params);

      // Set initial progress
      useAppStore.getState().setSearchProgress({
        totalSteps,
        currentStep: 0,
        canPause: true,
      });

      let currentStep = 0;
      let matchesFound = 0;
      const startTime = Date.now();

      // Convert target seeds to Set for faster lookup
      const targetSeedSet = new Set(targetSeeds.seeds);

      // Iterate through all combinations
      outerLoop: for (let timer0 = searchConditions.timer0Range.min; timer0 <= searchConditions.timer0Range.max; timer0++) {
        let currentState = useAppStore.getState().searchProgress;
        if (!currentState.isRunning) {
          console.log('Search stopped by user');
          break;
        }

        for (let vcount = searchConditions.vcountRange.min; vcount <= searchConditions.vcountRange.max; vcount++) {
          currentState = useAppStore.getState().searchProgress;
          if (!currentState.isRunning) {
            console.log('Search stopped by user');
            break outerLoop;
          }

          // Handle pause/resume
          while (currentState.isPaused && currentState.isRunning) {
            await new Promise(resolve => setTimeout(resolve, 100));
            currentState = useAppStore.getState().searchProgress;
          }

          // Get actual VCount value with offset handling for BW2
          const actualVCount = calculator.getVCountForTimer0(params, timer0);

          for (let timestamp = startDate.getTime(); timestamp <= endDate.getTime(); timestamp += 1000) {
            currentState = useAppStore.getState().searchProgress;
            if (!currentState.isRunning) {
              console.log('Search stopped by user');
              break outerLoop;
            }

            // Handle pause/resume
            while (currentState.isPaused && currentState.isRunning) {
              await new Promise(resolve => setTimeout(resolve, 100));
              currentState = useAppStore.getState().searchProgress;
            }

            const currentDateTime = new Date(timestamp);
            currentStep++;

            // Generate message and calculate seed
            try {
              const message = calculator.generateMessage(searchConditions, timer0, actualVCount, currentDateTime);
              const { seed, hash } = calculator.calculateSeed(message);

              // Check if seed matches any target (using Set for O(1) lookup)
              const isMatch = targetSeedSet.has(seed);

              if (isMatch) {
                matchesFound++;
                console.log(`Found match! Seed: 0x${seed.toString(16).padStart(8, '0')}, Timer0: ${timer0}, VCount: ${actualVCount}, Date: ${currentDateTime.toISOString()}`);
                
                addSearchResult({
                  seed,
                  datetime: currentDateTime,
                  timer0,
                  vcount: actualVCount,
                  conditions: searchConditions,
                  message,
                  sha1Hash: hash,
                  isMatch: true,
                });
              }

              // Update progress every 50 iterations for better responsiveness
              if (currentStep % 50 === 0) {
                const elapsedTime = Date.now() - startTime;
                const estimatedTimeRemaining = currentStep > 0 ? elapsedTime * (totalSteps - currentStep) / currentStep : 0;

                useAppStore.getState().setSearchProgress({
                  currentStep,
                  currentDateTime,
                  elapsedTime,
                  estimatedTimeRemaining,
                  matchesFound,
                });

                // Allow UI to update more frequently
                await new Promise(resolve => setTimeout(resolve, 1));
              }
            } catch (error) {
              console.error('Error calculating seed:', error, {
                timer0,
                vcount: actualVCount,
                datetime: currentDateTime.toISOString()
              });
            }
          }
        }
      }

      console.log(`Search completed. Found ${matchesFound} matches out of ${totalSteps} combinations.`);
      
      // Show completion message to user
      if (matchesFound === 0) {
        alert(`Search completed. No matches found in ${totalSteps.toLocaleString()} combinations.\n\nTry:\n- Expanding the date range\n- Checking Timer0/VCount ranges\n- Verifying target seed format`);
      } else {
        alert(`Search completed successfully!\n\nFound ${matchesFound} matching seed${matchesFound === 1 ? '' : 's'} out of ${totalSteps.toLocaleString()} combinations.\n\nCheck the Results tab for details.`);
      }
    } catch (error) {
      console.error('Search error:', error);
      alert(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
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
            <Search size={20} />
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
                  <Button onClick={resumeSearch}>
                    <Play size={16} className="mr-2" />
                    Resume
                  </Button>
                ) : (
                  <Button onClick={pauseSearch}>
                    <Pause size={16} className="mr-2" />
                    Pause
                  </Button>
                )}
                <Button variant="destructive" onClick={stopSearch}>
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
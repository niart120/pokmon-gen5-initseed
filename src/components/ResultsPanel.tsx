import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Download, SortAscending, SortDescending, Eye, Calendar, Hash } from '@phosphor-icons/react';
import { useAppStore } from '../store/app-store';
import type { InitialSeedResult } from '../types/pokemon';

type SortField = 'seed' | 'datetime' | 'timer0' | 'vcount';
type SortDirection = 'asc' | 'desc';

export function ResultsPanel() {
  const { searchResults, clearSearchResults } = useAppStore();
  
  const [sortField, setSortField] = React.useState<SortField>('datetime');
  const [sortDirection, setSortDirection] = React.useState<SortDirection>('asc');
  const [filterSeed, setFilterSeed] = React.useState('');
  const [selectedResult, setSelectedResult] = React.useState<InitialSeedResult | null>(null);

  // Filter and sort results
  const filteredAndSortedResults = React.useMemo(() => {
    let filtered = searchResults;

    // Apply seed filter
    if (filterSeed.trim()) {
      const filterValue = filterSeed.toLowerCase().replace('0x', '');
      filtered = filtered.filter(result => 
        result.seed.toString(16).toLowerCase().includes(filterValue)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'seed':
          aValue = a.seed;
          bValue = b.seed;
          break;
        case 'datetime':
          aValue = a.datetime.getTime();
          bValue = b.datetime.getTime();
          break;
        case 'timer0':
          aValue = a.timer0;
          bValue = b.timer0;
          break;
        case 'vcount':
          aValue = a.vcount;
          bValue = b.vcount;
          break;
        default:
          return 0;
      }

      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [searchResults, filterSeed, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleExportCSV = () => {
    if (filteredAndSortedResults.length === 0) return;

    const headers = [
      'Seed (Hex)',
      'Seed (Dec)',
      'Date/Time',
      'Timer0',
      'VCount',
      'ROM Version',
      'ROM Region',
      'Hardware',
      'SHA1 Hash'
    ];

    const csvContent = [
      headers.join(','),
      ...filteredAndSortedResults.map(result => [
        `0x${result.seed.toString(16).toUpperCase().padStart(8, '0')}`,
        result.seed.toString(),
        result.datetime.toISOString(),
        result.timer0.toString(),
        result.vcount.toString(),
        result.conditions.romVersion,
        result.conditions.romRegion,
        result.conditions.hardware,
        result.sha1Hash
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `pokemon-seed-results-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    if (filteredAndSortedResults.length === 0) return;

    const jsonContent = JSON.stringify(filteredAndSortedResults, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `pokemon-seed-results-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatDateTime = (date: Date) => {
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <SortAscending size={16} /> : <SortDescending size={16} />;
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Hash size={20} />
              Search Results
              <Badge variant="secondary">
                {filteredAndSortedResults.length} result{filteredAndSortedResults.length !== 1 ? 's' : ''}
              </Badge>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleExportCSV}
                disabled={filteredAndSortedResults.length === 0}
              >
                <Download size={16} className="mr-2" />
                Export CSV
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleExportJSON}
                disabled={filteredAndSortedResults.length === 0}
              >
                <Download size={16} className="mr-2" />
                Export JSON
              </Button>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={clearSearchResults}
                disabled={searchResults.length === 0}
              >
                Clear Results
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="filter-seed">Filter by Seed</Label>
              <Input
                id="filter-seed"
                placeholder="Enter seed value (hex)"
                value={filterSeed}
                onChange={(e) => setFilterSeed(e.target.value)}
                className="font-mono"
              />
            </div>
            <div>
              <Label htmlFor="sort-field">Sort by</Label>
              <Select value={sortField} onValueChange={(value) => setSortField(value as SortField)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="datetime">Date/Time</SelectItem>
                  <SelectItem value="seed">Seed Value</SelectItem>
                  <SelectItem value="timer0">Timer0</SelectItem>
                  <SelectItem value="vcount">VCount</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card>
        <CardContent className="p-0">
          {filteredAndSortedResults.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {searchResults.length === 0 
                ? "No search results yet. Run a search to see results here."
                : "No results match the current filter criteria."
              }
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer select-none"
                      onClick={() => handleSort('seed')}
                    >
                      <div className="flex items-center gap-1">
                        Seed Value {getSortIcon('seed')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer select-none"
                      onClick={() => handleSort('datetime')}
                    >
                      <div className="flex items-center gap-1">
                        Date/Time {getSortIcon('datetime')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer select-none"
                      onClick={() => handleSort('timer0')}
                    >
                      <div className="flex items-center gap-1">
                        Timer0 {getSortIcon('timer0')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer select-none"
                      onClick={() => handleSort('vcount')}
                    >
                      <div className="flex items-center gap-1">
                        VCount {getSortIcon('vcount')}
                      </div>
                    </TableHead>
                    <TableHead>ROM Info</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedResults.map((result, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono">
                        0x{result.seed.toString(16).toUpperCase().padStart(8, '0')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar size={16} className="text-muted-foreground" />
                          <span className="font-mono text-sm">
                            {formatDateTime(result.datetime)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono">{result.timer0}</TableCell>
                      <TableCell className="font-mono">{result.vcount}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge variant="outline">
                            {result.conditions.romVersion} {result.conditions.romRegion}
                          </Badge>
                          <div className="text-xs text-muted-foreground">
                            {result.conditions.hardware}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setSelectedResult(result)}
                            >
                              <Eye size={16} className="mr-1" />
                              Details
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Seed Result Details</DialogTitle>
                            </DialogHeader>
                            {selectedResult && (
                              <div className="space-y-6">
                                {/* Basic Info */}
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label>Initial Seed</Label>
                                    <div className="font-mono text-lg">
                                      0x{selectedResult.seed.toString(16).toUpperCase().padStart(8, '0')}
                                    </div>
                                    <div className="text-sm text-muted-foreground font-mono">
                                      {selectedResult.seed} (decimal)
                                    </div>
                                  </div>
                                  <div>
                                    <Label>Date/Time</Label>
                                    <div className="font-mono">
                                      {formatDateTime(selectedResult.datetime)}
                                    </div>
                                  </div>
                                </div>

                                {/* Parameters */}
                                <div className="grid grid-cols-4 gap-4">
                                  <div>
                                    <Label>Timer0</Label>
                                    <div className="font-mono">{selectedResult.timer0}</div>
                                  </div>
                                  <div>
                                    <Label>VCount</Label>
                                    <div className="font-mono">{selectedResult.vcount}</div>
                                  </div>
                                  <div>
                                    <Label>ROM</Label>
                                    <div>{selectedResult.conditions.romVersion} {selectedResult.conditions.romRegion}</div>
                                  </div>
                                  <div>
                                    <Label>Hardware</Label>
                                    <div>{selectedResult.conditions.hardware}</div>
                                  </div>
                                </div>

                                {/* SHA-1 Hash */}
                                <div>
                                  <Label>SHA-1 Hash</Label>
                                  <div className="font-mono text-sm break-all p-2 bg-muted rounded">
                                    {selectedResult.sha1Hash}
                                  </div>
                                </div>

                                {/* Message Array */}
                                <div>
                                  <Label>Generated Message (32-bit words)</Label>
                                  <div className="grid grid-cols-4 gap-2 mt-2">
                                    {selectedResult.message.map((word, index) => (
                                      <div key={index} className="text-center">
                                        <div className="text-xs text-muted-foreground">data[{index}]</div>
                                        <div className="font-mono text-sm p-1 bg-muted rounded">
                                          0x{word.toString(16).toUpperCase().padStart(8, '0')}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
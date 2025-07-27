import { Calendar, ChevronDown, ChevronUp, Eye, Filter } from 'lucide-react';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Card, CardContent } from '../../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import type { InitialSeedResult } from '../../../types/pokemon';
import type { SortField } from './ResultsControlCard';

interface ResultsTableCardProps {
  filteredAndSortedResults: InitialSeedResult[];
  searchResultsLength: number;
  sortField: SortField;
  sortOrder: 'asc' | 'desc';
  onSort: (field: SortField) => void;
  onShowDetails: (result: InitialSeedResult) => void;
}

export function ResultsTableCard({
  filteredAndSortedResults,
  searchResultsLength,
  sortField,
  sortOrder,
  onSort,
  onShowDetails,
}: ResultsTableCardProps) {
  const formatDateTime = (date: Date): string => {
    return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />;
  };

  const handleSort = (field: SortField) => {
    onSort(field);
  };

  return (
    <Card>
      <CardContent className="p-0">
        {filteredAndSortedResults.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {searchResultsLength === 0 
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
                      Timer0 (Hex) {getSortIcon('timer0')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer select-none"
                    onClick={() => handleSort('vcount')}
                  >
                    <div className="flex items-center gap-1">
                      VCount (Hex) {getSortIcon('vcount')}
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
                    <TableCell className="font-mono">0x{result.timer0.toString(16).toUpperCase().padStart(4, '0')}</TableCell>
                    <TableCell className="font-mono">0x{result.vcount.toString(16).toUpperCase().padStart(2, '0')}</TableCell>
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
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => onShowDetails(result)}
                      >
                        <Eye size={16} className="mr-1" />
                        Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

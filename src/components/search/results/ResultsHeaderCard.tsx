import { Hash } from 'lucide-react';
import { Badge } from '../../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { useAppStore } from '../../../store/app-store';
import { formatElapsedTime } from '../../../lib/utils/format-helpers';

interface ResultsHeaderCardProps {
  filteredResultsCount: number;
}

export function ResultsHeaderCard({
  filteredResultsCount,
}: ResultsHeaderCardProps) {
  const { lastSearchDuration } = useAppStore();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 flex-wrap">
          <Hash size={20} className="flex-shrink-0" />
          <span className="flex-shrink-0">Search Results</span>
          <Badge variant="secondary" className="flex-shrink-0">
            {filteredResultsCount} result{filteredResultsCount !== 1 ? 's' : ''}
          </Badge>
          {lastSearchDuration !== null && (
            <Badge variant="outline" className="flex-shrink-0 text-xs">
              Search completed in {(lastSearchDuration / 1000).toFixed(1)}s
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
    </Card>
  );
}

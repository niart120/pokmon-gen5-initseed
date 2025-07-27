import { Hash } from 'lucide-react';
import { Badge } from '../../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';

interface ResultsHeaderCardProps {
  filteredResultsCount: number;
}

export function ResultsHeaderCard({
  filteredResultsCount,
}: ResultsHeaderCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Hash size={20} />
          Search Results
          <Badge variant="secondary">
            {filteredResultsCount} result{filteredResultsCount !== 1 ? 's' : ''}
          </Badge>
        </CardTitle>
      </CardHeader>
    </Card>
  );
}

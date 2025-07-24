import { Eye } from 'lucide-react';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Label } from '../ui/label';
import type { InitialSeedResult } from '../../types/pokemon';

interface ResultDetailsDialogProps {
  result: InitialSeedResult | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ResultDetailsDialog({
  result,
  isOpen,
  onOpenChange,
}: ResultDetailsDialogProps) {
  const formatDateTime = (date: Date): string => {
    return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
  };

  if (!result) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Seed Result Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Initial Seed</Label>
              <div className="font-mono text-lg">
                0x{result.seed.toString(16).toUpperCase().padStart(8, '0')}
              </div>
              <div className="text-sm text-muted-foreground font-mono">
                {result.seed} (decimal)
              </div>
            </div>
            <div>
              <Label>Date/Time</Label>
              <div className="font-mono">
                {formatDateTime(result.datetime)}
              </div>
            </div>
          </div>

          {/* Parameters */}
          <div className="grid grid-cols-4 gap-4">
            <div>
              <Label>Timer0</Label>
              <div className="font-mono">{result.timer0}</div>
            </div>
            <div>
              <Label>VCount</Label>
              <div className="font-mono">{result.vcount}</div>
            </div>
            <div>
              <Label>ROM</Label>
              <div>{result.conditions.romVersion} {result.conditions.romRegion}</div>
            </div>
            <div>
              <Label>Hardware</Label>
              <div>{result.conditions.hardware}</div>
            </div>
          </div>

          {/* SHA-1 Hash */}
          <div>
            <Label>SHA-1 Hash</Label>
            <div className="font-mono text-sm break-all p-2 bg-muted rounded">
              {result.sha1Hash}
            </div>
          </div>

          {/* Message Array */}
          <div>
            <Label>Generated Message (32-bit words)</Label>
            <div className="grid grid-cols-4 gap-2 mt-2">
              {result.message.map((word, index) => (
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
      </DialogContent>
    </Dialog>
  );
}

// Trigger button component for use in the table
interface ResultDetailsButtonProps {
  result: InitialSeedResult;
  onClick: () => void;
}

export function ResultDetailsButton({ result, onClick }: ResultDetailsButtonProps) {
  return (
    <Button 
      variant="outline" 
      size="sm"
      onClick={onClick}
    >
      <Eye size={16} className="mr-1" />
      Details
    </Button>
  );
}

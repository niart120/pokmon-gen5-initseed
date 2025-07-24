import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Trash, Upload, Download, Warning } from '@phosphor-icons/react';
import { useAppStore } from '../store/app-store';
import { SeedCalculator } from '../lib/seed-calculator';

export function TargetSeedsPanel() {
  const {
    targetSeeds,
    setTargetSeeds,
    clearTargetSeeds,
    targetSeedInput,
    setTargetSeedInput,
  } = useAppStore();

  const [parseErrors, setParseErrors] = React.useState<{ line: number; value: string; error: string }[]>([]);
  const calculator = new SeedCalculator();

  // Parse input and update seeds when input changes
  React.useEffect(() => {
    if (targetSeedInput.trim() === '') {
      setParseErrors([]);
      return;
    }

    const { validSeeds, errors } = calculator.parseTargetSeeds(targetSeedInput);
    setParseErrors(errors);
    
    if (errors.length === 0) {
      setTargetSeeds(validSeeds);
    }
  }, [targetSeedInput]);

  const handleClearAll = () => {
    setTargetSeedInput('');
    clearTargetSeeds();
    setParseErrors([]);
  };

  const handleImportFromFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setTargetSeedInput(content);
    };
    reader.readAsText(file);
    
    // Reset file input
    event.target.value = '';
  };

  const handleExportToFile = () => {
    if (targetSeeds.seeds.length === 0) return;

    const content = targetSeeds.seeds.map(seed => `0x${seed.toString(16).toUpperCase().padStart(8, '0')}`).join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'target-seeds.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exampleSeeds = [
    '0x12345678',
    'ABCDEF00',
    '0xDEADBEEF',
    '1A2B3C4D',
  ];

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Target Seed Input</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => document.getElementById('file-input')?.click()}>
                <Upload size={16} className="mr-2" />
                Import
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleExportToFile}
                disabled={targetSeeds.seeds.length === 0}
              >
                <Download size={16} className="mr-2" />
                Export
              </Button>
              <Button variant="destructive" size="sm" onClick={handleClearAll}>
                <Trash size={16} className="mr-2" />
                Clear All
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="seed-input">
              Enter target seeds (one per line, hex format)
            </Label>
            <Textarea
              id="seed-input"
              placeholder={`Enter hexadecimal seed values, one per line:\n\nExamples:\n${exampleSeeds.join('\n')}`}
              value={targetSeedInput}
              onChange={(e) => setTargetSeedInput(e.target.value)}
              className="font-mono min-h-32 mt-2"
              rows={8}
            />
          </div>
          
          {/* Format Examples */}
          <div className="text-sm text-muted-foreground">
            <div className="font-medium mb-2">Supported formats:</div>
            <ul className="list-disc list-inside space-y-1">
              <li><span className="font-mono">0x12345678</span> - With 0x prefix</li>
              <li><span className="font-mono">ABCDEF00</span> - Without prefix</li>
              <li><span className="font-mono">12a3b4c5</span> - Mixed case (will be normalized)</li>
              <li><span className="font-mono">0x123</span> - Short values (will be padded)</li>
            </ul>
          </div>

          {/* Hidden file input */}
          <input
            id="file-input"
            type="file"
            accept=".txt,.csv"
            onChange={handleImportFromFile}
            className="hidden"
          />
        </CardContent>
      </Card>

      {/* Parse Errors */}
      {parseErrors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Warning size={20} />
              Input Errors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {parseErrors.map((error, index) => (
                <Alert key={index} variant="destructive">
                  <AlertDescription>
                    <span className="font-medium">Line {error.line}:</span> {error.error}
                    <br />
                    <span className="font-mono text-sm">"{error.value}"</span>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Seeds List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Current Target Seeds</span>
            <Badge variant="secondary">
              {targetSeeds.seeds.length} seed{targetSeeds.seeds.length !== 1 ? 's' : ''}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {targetSeeds.seeds.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No target seeds added yet. Enter seeds in the input field above.
            </div>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                {targetSeeds.seeds.map((seed, index) => (
                  <div
                    key={index}
                    className="p-2 bg-muted rounded font-mono text-sm text-center"
                  >
                    0x{seed.toString(16).toUpperCase().padStart(8, '0')}
                  </div>
                ))}
              </div>
              
              {targetSeeds.seeds.length >= 1000 && (
                <Alert>
                  <Warning size={16} />
                  <AlertDescription>
                    Maximum of 1000 target seeds reached. Additional seeds will be ignored.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistics */}
      {targetSeeds.seeds.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Total Seeds</div>
                <div className="text-2xl font-bold">{targetSeeds.seeds.length}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Unique Seeds</div>
                <div className="text-2xl font-bold">{new Set(targetSeeds.seeds).size}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Min Value</div>
                <div className="text-sm font-mono">
                  0x{Math.min(...targetSeeds.seeds).toString(16).toUpperCase().padStart(8, '0')}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Max Value</div>
                <div className="text-sm font-mono">
                  0x{Math.max(...targetSeeds.seeds).toString(16).toUpperCase().padStart(8, '0')}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
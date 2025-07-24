import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Search, Target, BarChart, Info } from '@phosphor-icons/react';
import { useAppStore } from './store/app-store';
import { SearchPanel } from './components/SearchPanel';
import { TargetSeedsPanel } from './components/TargetSeedsPanel';
import { ResultsPanel } from './components/ResultsPanel';
import { testSeedCalculation } from './lib/test-calculator';

function App() {
  const { activeTab, setActiveTab, targetSeeds, searchResults, searchProgress } = useAppStore();

  // Run test on component mount
  React.useEffect(() => {
    console.log('Running seed calculator test...');
    const testPassed = testSeedCalculation();
    console.log('Test result:', testPassed ? 'PASSED' : 'FAILED');
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Pokémon BW/BW2 Initial Seed Search
              </h1>
              <p className="text-muted-foreground mt-1">
                Advanced seed calculation and matching for competitive RNG manipulation
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Target Seeds</div>
                <Badge variant="secondary">{targetSeeds.seeds.length}</Badge>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Matches Found</div>
                <Badge variant={searchResults.length > 0 ? "default" : "secondary"}>
                  {searchResults.length}
                </Badge>
              </div>
              {searchProgress.isRunning && (
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Status</div>
                  <Badge variant="outline" className="animate-pulse">
                    {searchProgress.isPaused ? 'Paused' : 'Searching...'}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-4 w-full max-w-2xl mx-auto">
            <TabsTrigger value="search" className="flex items-center gap-2">
              <Search size={16} />
              Search Setup
            </TabsTrigger>
            <TabsTrigger value="targets" className="flex items-center gap-2">
              <Target size={16} />
              Target Seeds
              {targetSeeds.seeds.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {targetSeeds.seeds.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="results" className="flex items-center gap-2">
              <BarChart size={16} />
              Results
              {searchResults.length > 0 && (
                <Badge variant="default" className="ml-1">
                  {searchResults.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="help" className="flex items-center gap-2">
              <Info size={16} />
              Help
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search">
            <SearchPanel />
          </TabsContent>

          <TabsContent value="targets">
            <TargetSeedsPanel />
          </TabsContent>

          <TabsContent value="results">
            <ResultsPanel />
          </TabsContent>

          <TabsContent value="help">
            <Card>
              <CardHeader>
                <CardTitle>How to Use</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Getting Started</h3>
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>Go to the <strong>Target Seeds</strong> tab and enter the initial seed values you want to find</li>
                    <li>Return to the <strong>Search Setup</strong> tab and configure your ROM parameters</li>
                    <li>Set your search date range and other parameters</li>
                    <li>Click <strong>Start Search</strong> to begin the calculation</li>
                    <li>View matches in the <strong>Results</strong> tab</li>
                  </ol>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-2">ROM Configuration</h3>
                  <div className="space-y-2 text-sm">
                    <p><strong>ROM Version:</strong> Select your game version (Black, White, Black 2, White 2)</p>
                    <p><strong>ROM Region:</strong> Choose your game's region (JPN, USA, EUR, etc.)</p>
                    <p><strong>Hardware:</strong> Select the system you're using (DS, DS Lite, 3DS)</p>
                    <p><strong>Auto Parameters:</strong> Enable to use recommended Timer0 and VCount ranges for your ROM</p>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-2">Target Seed Format</h3>
                  <div className="space-y-2 text-sm">
                    <p>Enter one seed per line in hexadecimal format:</p>
                    <div className="bg-muted p-3 rounded font-mono text-sm">
                      0x12345678<br />
                      ABCDEF00<br />
                      0xDEADBEEF
                    </div>
                    <p>Both uppercase and lowercase are accepted. The 0x prefix is optional.</p>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-2">MAC Address</h3>
                  <div className="text-sm">
                    <p>Enter your DS system's MAC address in the 6-byte format. This is hardware-specific and typically remains constant for your searches. You can find this in your DS system settings or use a network scanner.</p>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-2">Search Performance</h3>
                  <div className="space-y-2 text-sm">
                    <p>Search time depends on your date range and parameter ranges:</p>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>Narrow date ranges search faster</li>
                      <li>Auto Timer0/VCount ranges are optimized for each ROM</li>
                      <li>You can pause and resume long searches</li>
                      <li>Results are displayed in real-time as matches are found</li>
                    </ul>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-2">Algorithm Reference</h3>
                  <div className="text-sm">
                    <p>
                      This tool implements the SHA-1 based initial seed generation algorithm used by 
                      Pokémon Black/White and Black2/White2. The implementation is based on the 
                      Project_Veni reference and generates seeds identical to the original games.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/50 mt-12">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center text-sm text-muted-foreground">
            <p>
              Pokémon BW/BW2 Initial Seed Search Tool - For educational and competitive play purposes
            </p>
            <p className="mt-1">
              Based on the SHA-1 algorithm research and Project_Veni implementation
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
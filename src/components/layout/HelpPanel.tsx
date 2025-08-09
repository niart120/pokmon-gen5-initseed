import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export function HelpPanel() {
  return (
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

        <Separator />

        <div>
          <h3 className="text-lg font-semibold mb-2">Credits & Notices</h3>
          <div className="text-sm space-y-1">
            <p>
              Encounter data source: <a href="https://pokebook.jp/" target="_blank" rel="noreferrer" className="underline">ポケモンの友 (Pokebook)</a>
            </p>
            <p>
              This is an unofficial tool and is provided without warranty. Data may contain errors; please verify with in-game results.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

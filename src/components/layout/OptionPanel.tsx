import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PresetManager } from '../search/PresetManager';
import { SearchHistory } from '../search/SearchHistory';

export function OptionPanel() {
  return (
    <div className="space-y-6">
      <PresetManager />
      <SearchHistory />
    </div>
  );
}

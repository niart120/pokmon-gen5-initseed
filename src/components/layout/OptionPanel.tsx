import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PresetManager, SearchHistory } from '../options';

export function OptionPanel() {
  return (
    <div className="space-y-6">
      <PresetManager />
      <SearchHistory />
    </div>
  );
}

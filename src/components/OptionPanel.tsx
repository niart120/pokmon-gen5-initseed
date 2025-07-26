import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PresetManager } from './search/PresetManager';
import { SearchHistory } from './search/SearchHistory';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

export function OptionPanel() {
  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Work in Progress:</strong> プリセット・履歴機能は現在開発中です。基本的なUI実装は完了していますが、実際の保存・読み込み機能はまだ実装されていません。
        </AlertDescription>
      </Alert>
      
      <PresetManager />
      <SearchHistory />
    </div>
  );
}

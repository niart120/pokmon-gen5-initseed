import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PresetManager, SearchHistory } from '../options';
import { resetApplicationState } from '../../lib/utils/error-recovery';

export function OptionPanel() {
  const handleReset = () => {
    if (window.confirm('すべての設定とデータをリセットしますか？\n\n※ この操作は取り消せません')) {
      resetApplicationState();
    }
  };

  return (
    <div className="space-y-6">
      <PresetManager />
      <SearchHistory />
      
      <Card>
        <CardHeader>
          <CardTitle>データリセット</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              設定データに問題がある場合、アプリケーションを初期状態にリセットできます。
            </p>
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
            >
              すべてリセット
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

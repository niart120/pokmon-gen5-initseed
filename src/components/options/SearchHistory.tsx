import React, { useState } from 'react';
import { useAppStore } from '../../store/app-store';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { History, Download, Trash2, Clock } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';

export interface SearchHistoryEntry {
  id: string;
  searchConditions: any; // SearchConditions型
  searchDate: Date;
  resultsCount: number;
  duration: number; // milliseconds
  matchedSeeds: number[];
}

export function SearchHistory() {
  const { searchConditions, setSearchConditions } = useAppStore();
  const [history, setHistory] = useState<SearchHistoryEntry[]>(() => {
    const saved = localStorage.getItem('pokemon-seed-search-history');
    return saved ? JSON.parse(saved).map((entry: any) => ({
      ...entry,
      searchDate: new Date(entry.searchDate)
    })) : [];
  });
  
  const [selectedEntryId, setSelectedEntryId] = useState<string>('');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);

  // 履歴エントリを追加（探索完了時に呼び出される想定）
  const addHistoryEntry = (entry: SearchHistoryEntry) => {
    const updatedHistory = [entry, ...history].slice(0, 50); // 最新50件まで保持
    setHistory(updatedHistory);
    localStorage.setItem('pokemon-seed-search-history', JSON.stringify(updatedHistory));
  };

  // 条件を履歴から復元
  const loadFromHistory = (entryId: string) => {
    const entry = history.find(h => h.id === entryId);
    if (!entry) {
      setMessage({ type: 'error', text: '履歴エントリが見つかりません' });
      return;
    }

    setSearchConditions(entry.searchConditions);
    setMessage({ type: 'success', text: `履歴から条件を復元しました（${entry.searchDate.toLocaleDateString()}）` });
    
    // 3秒後にメッセージをクリア
    setTimeout(() => setMessage(null), 3000);
  };

  // 履歴エントリを削除
  const deleteHistoryEntry = (entryId: string) => {
    const entry = history.find(h => h.id === entryId);
    if (!entry) return;

    if (confirm(`${entry.searchDate.toLocaleDateString()}の履歴を削除しますか？`)) {
      const updatedHistory = history.filter(h => h.id !== entryId);
      setHistory(updatedHistory);
      localStorage.setItem('pokemon-seed-search-history', JSON.stringify(updatedHistory));
      setMessage({ type: 'success', text: '履歴を削除しました' });
      
      // 3秒後にメッセージをクリア
      setTimeout(() => setMessage(null), 3000);
    }
  };

  // 全履歴をクリア
  const clearAllHistory = () => {
    if (confirm('すべての履歴を削除しますか？この操作は取り消せません。')) {
      setHistory([]);
      localStorage.removeItem('pokemon-seed-search-history');
      setMessage({ type: 'success', text: 'すべての履歴を削除しました' });
      
      // 3秒後にメッセージをクリア
      setTimeout(() => setMessage(null), 3000);
    }
  };

  // 詳細表示用のエントリ
  const selectedEntry = history.find(h => h.id === selectedEntryId);

  // 条件の要約文字列を生成
  const formatConditionsSummary = (conditions: any) => {
    return `${conditions.romVersion}-${conditions.romRegion} (${conditions.hardware}) | ${conditions.dateRange.startYear}/${conditions.dateRange.startMonth}/${conditions.dateRange.startDay}`;
  };

  // 実行時間の表示
  const formatDuration = (milliseconds: number) => {
    if (milliseconds < 1000) return `${milliseconds}ms`;
    if (milliseconds < 60000) return `${(milliseconds / 1000).toFixed(1)}秒`;
    return `${(milliseconds / 60000).toFixed(1)}分`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Search History (WIP)
          {history.length > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {history.length}件
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* メッセージ表示 */}
        {message && (
          <Alert className={message.type === 'error' ? 'border-red-500 bg-red-50' : 'border-green-500 bg-green-50'}>
            <AlertDescription>
              {message.text}
            </AlertDescription>
          </Alert>
        )}

        {history.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>まだ探索履歴がありません</p>
            <p className="text-sm">探索を実行すると、ここに履歴が表示されます</p>
          </div>
        ) : (
          <>
            {/* 履歴リスト */}
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {history.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium">
                        {entry.searchDate.toLocaleDateString()} {entry.searchDate.toLocaleTimeString()}
                      </span>
                      <span className="text-xs text-gray-500">
                        ({formatDistanceToNow(entry.searchDate, { locale: ja, addSuffix: true })})
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 truncate">
                      {formatConditionsSummary(entry.searchConditions)}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <Badge variant={entry.matchedSeeds.length > 0 ? "default" : "secondary"}>
                        {entry.matchedSeeds.length}件ヒット
                      </Badge>
                      <span className="text-xs text-gray-500">
                        実行時間: {formatDuration(entry.duration)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex gap-1 ml-4">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedEntryId(entry.id)}
                        >
                          詳細
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>探索履歴詳細</DialogTitle>
                        </DialogHeader>
                        {selectedEntry && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <h4 className="font-medium mb-2">実行情報</h4>
                                <div className="text-sm space-y-1">
                                  <div>実行日時: {selectedEntry.searchDate.toLocaleString()}</div>
                                  <div>実行時間: {formatDuration(selectedEntry.duration)}</div>
                                  <div>結果件数: {selectedEntry.resultsCount}件</div>
                                  <div>マッチ数: {selectedEntry.matchedSeeds.length}件</div>
                                </div>
                              </div>
                              <div>
                                <h4 className="font-medium mb-2">ROM設定</h4>
                                <div className="text-sm space-y-1">
                                  <div>バージョン: {selectedEntry.searchConditions.romVersion}</div>
                                  <div>リージョン: {selectedEntry.searchConditions.romRegion}</div>
                                  <div>ハードウェア: {selectedEntry.searchConditions.hardware}</div>
                                </div>
                              </div>
                            </div>
                            
                            <div>
                              <h4 className="font-medium mb-2">探索範囲</h4>
                              <div className="text-sm space-y-1">
                                <div>
                                  日時: {selectedEntry.searchConditions.dateRange.startYear}/{selectedEntry.searchConditions.dateRange.startMonth}/{selectedEntry.searchConditions.dateRange.startDay} 
                                  ～ {selectedEntry.searchConditions.dateRange.endYear}/{selectedEntry.searchConditions.dateRange.endMonth}/{selectedEntry.searchConditions.dateRange.endDay}
                                </div>
                                <div>
                                  Timer0: {selectedEntry.searchConditions.timer0Range.min} - {selectedEntry.searchConditions.timer0Range.max}
                                </div>
                                <div>
                                  VCount: {selectedEntry.searchConditions.vcountRange.min} - {selectedEntry.searchConditions.vcountRange.max}
                                </div>
                              </div>
                            </div>
                            
                            {selectedEntry.matchedSeeds.length > 0 && (
                              <div>
                                <h4 className="font-medium mb-2">マッチしたSeed</h4>
                                <div className="bg-gray-50 p-3 rounded text-sm font-mono">
                                  {selectedEntry.matchedSeeds.map(seed => '0x' + seed.toString(16).padStart(8, '0')).join(', ')}
                                </div>
                              </div>
                            )}
                            
                            <div className="flex gap-2 pt-4 border-t">
                              <Button 
                                onClick={() => loadFromHistory(selectedEntry.id)}
                                className="flex-1"
                              >
                                <Download className="h-4 w-4 mr-2" />
                                この条件を復元
                              </Button>
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                    
                    <Button
                      onClick={() => loadFromHistory(entry.id)}
                      size="sm"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => deleteHistoryEntry(entry.id)}
                      variant="outline"
                      size="sm"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* 全削除ボタン */}
            <div className="pt-4 border-t">
              <Button
                onClick={clearAllHistory}
                variant="outline"
                className="w-full text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                すべての履歴を削除
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

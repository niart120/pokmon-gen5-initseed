import React, { useState } from 'react';
import { useAppStore } from '../../store/app-store';
import { SearchPreset } from '../../types/pokemon';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Label } from '../ui/label';
import { Trash2, Save, Download } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';

export function PresetManager() {
  const { 
    searchConditions, 
    setSearchConditions, 
    presets, 
    setPresets, 
    addPreset, 
    removePreset, 
    loadPreset: loadPresetFromStore 
  } = useAppStore();
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [presetDescription, setPresetDescription] = useState('');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // プリセット保存
  const savePreset = () => {
    if (!presetName.trim()) {
      setMessage({ type: 'error', text: 'プリセット名を入力してください' });
      return;
    }

    const newPreset: SearchPreset = {
      id: Date.now().toString(),
      name: presetName.trim(),
      description: presetDescription.trim() || undefined,
      conditions: { ...searchConditions },
      createdAt: new Date(),
    };

    addPreset(newPreset);
    
    setPresetName('');
    setPresetDescription('');
    setIsCreateDialogOpen(false);
    setMessage({ type: 'success', text: `プリセット「${newPreset.name}」を保存しました` });
    
    // 3秒後にメッセージをクリア
    setTimeout(() => setMessage(null), 3000);
  };

  // プリセット読み込み
  const loadPreset = (presetId: string) => {
    const preset = presets.find(p => p.id === presetId);
    if (!preset) {
      setMessage({ type: 'error', text: 'プリセットが見つかりません' });
      return;
    }

    loadPresetFromStore(presetId);
    
    setSelectedPresetId('');
    setMessage({ type: 'success', text: `プリセット「${preset.name}」を読み込みました` });
    
    // 3秒後にメッセージをクリア
    setTimeout(() => setMessage(null), 3000);
  };

  // プリセット削除
  const deletePreset = (presetId: string) => {
    const preset = presets.find(p => p.id === presetId);
    if (!preset) return;

    if (confirm(`プリセット「${preset.name}」を削除しますか？`)) {
      removePreset(presetId);
      setMessage({ type: 'success', text: `プリセット「${preset.name}」を削除しました` });
      
      // 3秒後にメッセージをクリア
      setTimeout(() => setMessage(null), 3000);
    }
  };

  // プリセット情報の文字列化（表示用）
  const formatPresetInfo = (preset: SearchPreset) => {
    const { conditions } = preset;
    return `${conditions.romVersion}-${conditions.romRegion} (${conditions.hardware}) | ${conditions.dateRange.startYear}/${conditions.dateRange.startMonth}/${conditions.dateRange.startDay}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Save className="h-5 w-5" />
          探索条件プリセット
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

        <div className="flex gap-2">
          {/* プリセット選択 */}
          <div className="flex-1">
            <Label htmlFor="preset-select">保存済みプリセット</Label>
            <Select value={selectedPresetId} onValueChange={setSelectedPresetId}>
              <SelectTrigger id="preset-select">
                <SelectValue placeholder="プリセットを選択..." />
              </SelectTrigger>
              <SelectContent>
                {presets.length === 0 ? (
                  <SelectItem value="no-presets" disabled>
                    保存されたプリセットはありません
                  </SelectItem>
                ) : (
                  presets
                    .sort((a, b) => new Date(b.lastUsed || b.createdAt).getTime() - new Date(a.lastUsed || a.createdAt).getTime())
                    .map((preset) => (
                      <SelectItem key={preset.id} value={preset.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{preset.name}</span>
                          <span className="text-xs text-gray-500">{formatPresetInfo(preset)}</span>
                        </div>
                      </SelectItem>
                    ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* アクションボタン */}
          <div className="flex gap-1 items-end">
            <Button
              onClick={() => loadPreset(selectedPresetId)}
              disabled={!selectedPresetId}
              size="sm"
            >
              <Download className="h-4 w-4 mr-1" />
              読み込み
            </Button>
            <Button
              onClick={() => deletePreset(selectedPresetId)}
              disabled={!selectedPresetId}
              variant="outline"
              size="sm"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* 新規プリセット作成 */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full" variant="outline">
              <Save className="h-4 w-4 mr-2" />
              現在の条件をプリセットとして保存
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新しいプリセットを作成</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="preset-name">プリセット名 *</Label>
                <Input
                  id="preset-name"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  placeholder="例: BW日本版デイリー検索"
                  maxLength={50}
                />
              </div>
              <div>
                <Label htmlFor="preset-description">説明（任意）</Label>
                <Input
                  id="preset-description"
                  value={presetDescription}
                  onChange={(e) => setPresetDescription(e.target.value)}
                  placeholder="例: 日常的な初期Seed探索用の設定"
                  maxLength={100}
                />
              </div>
              
              {/* 現在の条件プレビュー */}
              <div className="bg-gray-50 p-3 rounded-md">
                <h4 className="font-medium text-sm mb-2">保存される条件:</h4>
                <div className="text-xs space-y-1 text-gray-600">
                  <div>ROM: {searchConditions.romVersion}-{searchConditions.romRegion} ({searchConditions.hardware})</div>
                  <div>Timer0: {searchConditions.timer0Range.min}-{searchConditions.timer0Range.max}</div>
                  <div>VCount: {searchConditions.vcountRange.min}-{searchConditions.vcountRange.max}</div>
                  <div>
                    日時: {searchConditions.dateRange.startYear}/{searchConditions.dateRange.startMonth}/{searchConditions.dateRange.startDay} 
                    ～ {searchConditions.dateRange.endYear}/{searchConditions.dateRange.endMonth}/{searchConditions.dateRange.endDay}
                  </div>
                  <div>MAC: {searchConditions.macAddress.map(b => b.toString(16).padStart(2, '0')).join(':')}</div>
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  キャンセル
                </Button>
                <Button onClick={savePreset}>
                  保存
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* プリセット一覧（数が多い場合の補助表示） */}
        {presets.length > 0 && (
          <div className="text-xs text-gray-500">
            保存済み: {presets.length}件のプリセット
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAppStore } from '../../../store/app-store';
import { parseHexInput, formatHexDisplay } from '../../../lib/utils/hex-parser';
import { getFullTimer0Range, getValidVCounts, isValidTimer0VCountPair } from '../../../lib/utils/rom-parameter-helpers';
import { resetApplicationState } from '../../../lib/utils/error-recovery';

export function Timer0VCountCard() {
  const { searchConditions, setSearchConditions } = useAppStore();

  // 統合設定へのショートカット（防御的チェック）
  const config = searchConditions.timer0VCountConfig;
  
  // 旧データ構造との互換性チェック
  if (!config) {
    console.error('timer0VCountConfig is missing from searchConditions:', searchConditions);
    
    return (
      <Card>
        <CardHeader>
          <CardTitle>Timer0 & VCount Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-600 p-4 space-y-4">
            <div className="font-semibold">設定データの読み込みエラー</div>
            <div className="text-sm">
              古いバージョンのデータが残っているため、設定を正しく読み込めません。
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={resetApplicationState}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                設定をリセットして修復
              </button>
              <div className="text-xs text-gray-600">
                ※ 保存された設定とプリセットがクリアされ、初期設定に戻ります
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Timer0 の入力状態を管理
  const [timer0InputValues, setTimer0InputValues] = useState({
    min: formatHexDisplay(config.timer0Range.min),
    max: formatHexDisplay(config.timer0Range.max)
  });

  // VCount の入力状態を管理
  const [vcountInputValues, setVcountInputValues] = useState({
    min: formatHexDisplay(config.vcountRange.min),
    max: formatHexDisplay(config.vcountRange.max)
  });

  // searchConditionsが外部から変更された場合、inputValuesを同期
  useEffect(() => {
    setTimer0InputValues({
      min: formatHexDisplay(config.timer0Range.min),
      max: formatHexDisplay(config.timer0Range.max)
    });
    setVcountInputValues({
      min: formatHexDisplay(config.vcountRange.min),
      max: formatHexDisplay(config.vcountRange.max)
    });
  }, [config.timer0Range, config.vcountRange]);

  // useAutoConfigurationフラグ変更時の自動範囲適用
  useEffect(() => {
    if (config.useAutoConfiguration) {
      const timer0Range = getFullTimer0Range(searchConditions.romVersion, searchConditions.romRegion);
      const validVCounts = getValidVCounts(searchConditions.romVersion, searchConditions.romRegion);
      
      if (timer0Range && validVCounts.length > 0) {
        const minVCount = Math.min(...validVCounts);
        const maxVCount = Math.max(...validVCounts);
        
        setSearchConditions({
          timer0VCountConfig: {
            ...config,
            timer0Range: {
              min: timer0Range.min,
              max: timer0Range.max,
            },
            vcountRange: {
              min: minVCount,
              max: maxVCount,
            },
          },
        });
      }
    }
  }, [config.useAutoConfiguration, searchConditions.romVersion, searchConditions.romRegion]);

  const handleTimer0InputChange = (field: 'min' | 'max', value: string) => {
    // 最大4桁(Timer0)の16進数文字のみ許可
    if (/^[0-9a-fA-F]{0,4}$/i.test(value)) {
      setTimer0InputValues(prev => ({
        ...prev,
        [field]: value.toUpperCase()
      }));
    }
  };

  const handleVCountInputChange = (field: 'min' | 'max', value: string) => {
    // 最大2桁(VCount)の16進数文字のみ許可
    if (/^[0-9a-fA-F]{0,2}$/i.test(value)) {
      setVcountInputValues(prev => ({
        ...prev,
        [field]: value.toUpperCase()
      }));
    }
  };

  const handleTimer0Focus = (field: 'min' | 'max') => {
    // フォーカス時に全選択
    setTimeout(() => {
      const input = document.getElementById(`timer0-${field}`) as HTMLInputElement;
      if (input) {
        input.select();
      }
    }, 0);
  };

  const handleVCountFocus = (field: 'min' | 'max') => {
    // フォーカス時に全選択
    setTimeout(() => {
      const input = document.getElementById(`vcount-${field}`) as HTMLInputElement;
      if (input) {
        input.select();
      }
    }, 0);
  };

  const handleTimer0Blur = (field: 'min' | 'max') => {
    // バリデーション実行
    const currentInput = timer0InputValues[field];
    const parsed = parseHexInput(currentInput, 0xFFFF);
    
    if (parsed !== null) {
      // バリデーション成功: ストア更新 & フォーマット
      setSearchConditions({
        timer0VCountConfig: {
          ...config,
          timer0Range: { ...config.timer0Range, [field]: parsed },
        },
      });
      
      setTimer0InputValues(prev => ({
        ...prev,
        [field]: formatHexDisplay(parsed)
      }));
    } else {
      // バリデーション失敗: 元の値に戻す
      setTimer0InputValues(prev => ({
        ...prev,
        [field]: formatHexDisplay(config.timer0Range[field])
      }));
    }
  };

  const handleVCountBlur = (field: 'min' | 'max') => {
    // バリデーション実行
    const currentInput = vcountInputValues[field];
    const parsed = parseHexInput(currentInput, 0xFF);
    
    if (parsed !== null) {
      // バリデーション成功: ストア更新 & フォーマット
      setSearchConditions({
        timer0VCountConfig: {
          ...config,
          vcountRange: { ...config.vcountRange, [field]: parsed },
        },
      });
      
      setVcountInputValues(prev => ({
        ...prev,
        [field]: formatHexDisplay(parsed)
      }));
    } else {
      // バリデーション失敗: 元の値に戻す
      setVcountInputValues(prev => ({
        ...prev,
        [field]: formatHexDisplay(config.vcountRange[field])
      }));
    }
  };

  // 範囲妥当性チェック
  const isTimer0RangeValid = config.timer0Range.min <= config.timer0Range.max;
  const isVCountRangeValid = config.vcountRange.min <= config.vcountRange.max;
  
  // Timer0/VCountペア妥当性チェック (ROM複雑性対応)
  const isPairValidForROM = isValidTimer0VCountPair(
    searchConditions.romVersion,
    searchConditions.romRegion,
    config.timer0Range.min,
    config.vcountRange.min
  );

  return (
    <Card className="py-3">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Timer0 & VCount Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 統合自動設定チェックボックス */}
        <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg">
          <Checkbox
            id="auto-configuration"
            checked={config.useAutoConfiguration}
            onCheckedChange={(checked) =>
              setSearchConditions({
                timer0VCountConfig: { 
                  ...config, 
                  useAutoConfiguration: !!checked 
                },
              })
            }
          />
          <Label htmlFor="auto-configuration" className="font-medium">
            Use automatic configuration
          </Label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Timer0設定 */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Timer0 Range</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="timer0-min">Min (hex)</Label>
                <Input
                  id="timer0-min"
                  type="text"
                  placeholder="0"
                  maxLength={4}
                  value={timer0InputValues.min}
                  onChange={(e) => handleTimer0InputChange('min', e.target.value)}
                  onFocus={() => handleTimer0Focus('min')}
                  onBlur={() => handleTimer0Blur('min')}
                  disabled={config.useAutoConfiguration}
                  className="font-mono"
                />
              </div>
              <div>
                <Label htmlFor="timer0-max">Max (hex)</Label>
                <Input
                  id="timer0-max"
                  type="text"
                  placeholder="FFFF"
                  maxLength={4}
                  value={timer0InputValues.max}
                  onChange={(e) => handleTimer0InputChange('max', e.target.value)}
                  onFocus={() => handleTimer0Focus('max')}
                  onBlur={() => handleTimer0Blur('max')}
                  disabled={config.useAutoConfiguration}
                  className="font-mono"
                />
              </div>
            </div>
          </div>

          {/* VCount設定 */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">VCount Range</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="vcount-min">Min (hex)</Label>
                <Input
                  id="vcount-min"
                  type="text"
                  placeholder="0"
                  maxLength={2}
                  value={vcountInputValues.min}
                  onChange={(e) => handleVCountInputChange('min', e.target.value)}
                  onFocus={() => handleVCountFocus('min')}
                  onBlur={() => handleVCountBlur('min')}
                  disabled={config.useAutoConfiguration}
                  className="font-mono"
                />
              </div>
              <div>
                <Label htmlFor="vcount-max">Max (hex)</Label>
                <Input
                  id="vcount-max"
                  type="text"
                  placeholder="FF"
                  maxLength={2}
                  value={vcountInputValues.max}
                  onChange={(e) => handleVCountInputChange('max', e.target.value)}
                  onFocus={() => handleVCountFocus('max')}
                  onBlur={() => handleVCountBlur('max')}
                  disabled={config.useAutoConfiguration}
                  className="font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 警告メッセージ */}
        {!config.useAutoConfiguration && (
          <div className="space-y-2">
            {!isTimer0RangeValid && (
              <p className="text-sm text-red-600">
                Warning: Timer0 Min value (0x{config.timer0Range.min.toString(16).toUpperCase()}) is greater than Max value (0x{config.timer0Range.max.toString(16).toUpperCase()})
              </p>
            )}
            {!isVCountRangeValid && (
              <p className="text-sm text-red-600">
                Warning: VCount Min value (0x{config.vcountRange.min.toString(16).toUpperCase()}) is greater than Max value (0x{config.vcountRange.max.toString(16).toUpperCase()})
              </p>
            )}
            {isTimer0RangeValid && isVCountRangeValid && !isPairValidForROM && (
              <p className="text-sm text-amber-600">
                Note: Current Timer0/VCount combination may not be optimal for {searchConditions.romVersion} {searchConditions.romRegion}. 
                Consider using automatic configuration for best results.
              </p>
            )}
          </div>
        )}

        {/* 現在設定の表示 */}
        <div className="text-xs text-gray-500 p-2 bg-gray-50 rounded">
          Current: Timer0 0x{config.timer0Range.min.toString(16).toUpperCase()}-0x{config.timer0Range.max.toString(16).toUpperCase()}, 
          VCount 0x{config.vcountRange.min.toString(16).toUpperCase()}-0x{config.vcountRange.max.toString(16).toUpperCase()}
          {config.useAutoConfiguration && ' (Auto)'}
        </div>
      </CardContent>
    </Card>
  );
}

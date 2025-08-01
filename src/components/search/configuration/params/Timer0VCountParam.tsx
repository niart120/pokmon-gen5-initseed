import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAppStore } from '../../../../store/app-store';
import { parseHexInput, formatHexDisplay } from '../../../../lib/utils/hex-parser';
import { getFullTimer0Range, getValidVCounts, isValidTimer0VCountPair } from '../../../../lib/utils/rom-parameter-helpers';
import { resetApplicationState } from '../../../../lib/utils/error-recovery';

export function Timer0VCountParam() {
  const { searchConditions, setSearchConditions } = useAppStore();

  // 統合設定へのショートカット（防御的チェック）
  const config = searchConditions.timer0VCountConfig;
  
  // 旧データ構造との互換性チェック
  if (!config) {
    console.error('timer0VCountConfig is missing from searchConditions:', searchConditions);
    
    return (
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
    setTimer0InputValues(prev => ({ ...prev, [field]: value }));
  };

  const handleTimer0InputBlur = (field: 'min' | 'max', value: string) => {
    const parsed = parseHexInput(value);
    if (parsed !== null) {
      setSearchConditions({
        timer0VCountConfig: {
          ...config,
          timer0Range: {
            ...config.timer0Range,
            [field]: parsed,
          },
        },
      });
    }
    // 常に表示用フォーマットに戻す
    setTimer0InputValues(prev => ({ 
      ...prev, 
      [field]: formatHexDisplay(config.timer0Range[field])
    }));
  };

  const handleVcountInputChange = (field: 'min' | 'max', value: string) => {
    setVcountInputValues(prev => ({ ...prev, [field]: value }));
  };

  const handleVcountInputBlur = (field: 'min' | 'max', value: string) => {
    const parsed = parseHexInput(value);
    if (parsed !== null) {
      setSearchConditions({
        timer0VCountConfig: {
          ...config,
          vcountRange: {
            ...config.vcountRange,
            [field]: parsed,
          },
        },
      });
    }
    // 常に表示用フォーマットに戻す
    setVcountInputValues(prev => ({ 
      ...prev, 
      [field]: formatHexDisplay(config.vcountRange[field])
    }));
  };

  const handleAutoConfigurationToggle = (checked: boolean) => {
    setSearchConditions({
      timer0VCountConfig: {
        ...config,
        useAutoConfiguration: checked,
      },
    });
  };

  // 現在の設定の表示用文字列
  const currentConfigDisplay = () => {
    const timer0Display = `Timer0 0x${config.timer0Range.min.toString(16).toUpperCase()}-0x${config.timer0Range.max.toString(16).toUpperCase()}`;
    const vcountDisplay = `VCount 0x${config.vcountRange.min.toString(16).toUpperCase()}-0x${config.vcountRange.max.toString(16).toUpperCase()}`;
    
    return `Current: ${timer0Display}, ${vcountDisplay}`;
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-medium">Timer0 Range</Label>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <div>
              <Label htmlFor="timer0-min" className="text-xs">Min (hex)</Label>
              <Input
                id="timer0-min"
                value={timer0InputValues.min}
                onChange={(e) => handleTimer0InputChange('min', e.target.value)}
                onBlur={(e) => handleTimer0InputBlur('min', e.target.value)}
                className="text-xs font-mono"
                disabled={config.useAutoConfiguration}
              />
            </div>
            <div>
              <Label htmlFor="timer0-max" className="text-xs">Max (hex)</Label>
              <Input
                id="timer0-max"
                value={timer0InputValues.max}
                onChange={(e) => handleTimer0InputChange('max', e.target.value)}
                onBlur={(e) => handleTimer0InputBlur('max', e.target.value)}
                className="text-xs font-mono"
                disabled={config.useAutoConfiguration}
              />
            </div>
          </div>
        </div>
        
        <div>
          <Label className="text-sm font-medium">VCount Range</Label>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <div>
              <Label htmlFor="vcount-min" className="text-xs">Min (hex)</Label>
              <Input
                id="vcount-min"
                value={vcountInputValues.min}
                onChange={(e) => handleVcountInputChange('min', e.target.value)}
                onBlur={(e) => handleVcountInputBlur('min', e.target.value)}
                className="text-xs font-mono"
                disabled={config.useAutoConfiguration}
              />
            </div>
            <div>
              <Label htmlFor="vcount-max" className="text-xs">Max (hex)</Label>
              <Input
                id="vcount-max"
                value={vcountInputValues.max}
                onChange={(e) => handleVcountInputChange('max', e.target.value)}
                onBlur={(e) => handleVcountInputBlur('max', e.target.value)}
                className="text-xs font-mono"
                disabled={config.useAutoConfiguration}
              />
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          {currentConfigDisplay()}
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="auto-config"
            checked={config.useAutoConfiguration}
            onCheckedChange={handleAutoConfigurationToggle}
          />
          <Label htmlFor="auto-config" className="text-xs">Auto</Label>
        </div>
      </div>
    </div>
  );
}

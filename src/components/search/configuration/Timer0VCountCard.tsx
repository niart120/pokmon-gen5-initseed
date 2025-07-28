import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAppStore } from '../../../store/app-store';
import { parseHexInput, formatHexDisplay } from '../../../lib/utils/hex-parser';
import { getFullTimer0Range, getValidVCounts } from '../../../lib/utils/rom-parameter-helpers';

export function Timer0VCountCard() {
  const { searchConditions, setSearchConditions } = useAppStore();

  // Timer0 の入力状態を管理
  const [timer0InputValues, setTimer0InputValues] = useState({
    min: formatHexDisplay(searchConditions.timer0Range.min),
    max: formatHexDisplay(searchConditions.timer0Range.max)
  });

  // VCount の入力状態を管理
  const [vcountInputValues, setVcountInputValues] = useState({
    min: formatHexDisplay(searchConditions.vcountRange.min),
    max: formatHexDisplay(searchConditions.vcountRange.max)
  });

  // searchConditionsが外部から変更された場合、inputValuesを同期
  useEffect(() => {
    setTimer0InputValues({
      min: formatHexDisplay(searchConditions.timer0Range.min),
      max: formatHexDisplay(searchConditions.timer0Range.max)
    });
    setVcountInputValues({
      min: formatHexDisplay(searchConditions.vcountRange.min),
      max: formatHexDisplay(searchConditions.vcountRange.max)
    });
  }, [searchConditions.timer0Range, searchConditions.vcountRange]);

  // useAutoRangeフラグ変更時の自動範囲適用
  useEffect(() => {
    if (searchConditions.timer0Range.useAutoRange) {
      const timer0Range = getFullTimer0Range(searchConditions.romVersion, searchConditions.romRegion);
      if (timer0Range) {
        setSearchConditions({
          timer0Range: {
            ...searchConditions.timer0Range,
            min: timer0Range.min,
            max: timer0Range.max,
          },
        });
      }
    }
  }, [searchConditions.timer0Range.useAutoRange, searchConditions.romVersion, searchConditions.romRegion]);

  useEffect(() => {
    if (searchConditions.vcountRange.useAutoRange) {
      const validVCounts = getValidVCounts(searchConditions.romVersion, searchConditions.romRegion);
      if (validVCounts.length > 0) {
        const minVCount = Math.min(...validVCounts);
        const maxVCount = Math.max(...validVCounts);
        setSearchConditions({
          vcountRange: {
            ...searchConditions.vcountRange,
            min: minVCount,
            max: maxVCount,
          },
        });
      }
    }
  }, [searchConditions.vcountRange.useAutoRange, searchConditions.romVersion, searchConditions.romRegion]);

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
        timer0Range: { ...searchConditions.timer0Range, [field]: parsed },
      });
      
      setTimer0InputValues(prev => ({
        ...prev,
        [field]: formatHexDisplay(parsed)
      }));
    } else {
      // バリデーション失敗: 元の値に戻す
      setTimer0InputValues(prev => ({
        ...prev,
        [field]: formatHexDisplay(searchConditions.timer0Range[field])
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
        vcountRange: { ...searchConditions.vcountRange, [field]: parsed },
      });
      
      setVcountInputValues(prev => ({
        ...prev,
        [field]: formatHexDisplay(parsed)
      }));
    } else {
      // バリデーション失敗: 元の値に戻す
      setVcountInputValues(prev => ({
        ...prev,
        [field]: formatHexDisplay(searchConditions.vcountRange[field])
      }));
    }
  };

  // 範囲妥当性チェック
  const isTimer0RangeValid = searchConditions.timer0Range.min <= searchConditions.timer0Range.max;
  const isVCountRangeValid = searchConditions.vcountRange.min <= searchConditions.vcountRange.max;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Timer0 & VCount Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="auto-timer0"
                checked={searchConditions.timer0Range.useAutoRange}
                onCheckedChange={(checked) =>
                  setSearchConditions({
                    timer0Range: { ...searchConditions.timer0Range, useAutoRange: !!checked },
                  })
                }
              />
              <Label htmlFor="auto-timer0">Use auto Timer0 range</Label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="timer0-min">Timer0 Min (hex)</Label>
                <Input
                  id="timer0-min"
                  type="text"
                  placeholder="0"
                  maxLength={4}
                  value={timer0InputValues.min}
                  onChange={(e) => handleTimer0InputChange('min', e.target.value)}
                  onFocus={() => handleTimer0Focus('min')}
                  onBlur={() => handleTimer0Blur('min')}
                  disabled={searchConditions.timer0Range.useAutoRange}
                  className="font-mono"
                />
              </div>
              <div>
                <Label htmlFor="timer0-max">Timer0 Max (hex)</Label>
                <Input
                  id="timer0-max"
                  type="text"
                  placeholder="FFFF"
                  maxLength={4}
                  value={timer0InputValues.max}
                  onChange={(e) => handleTimer0InputChange('max', e.target.value)}
                  onFocus={() => handleTimer0Focus('max')}
                  onBlur={() => handleTimer0Blur('max')}
                  disabled={searchConditions.timer0Range.useAutoRange}
                  className="font-mono"
                />
              </div>
            </div>
            {!isTimer0RangeValid && !searchConditions.timer0Range.useAutoRange && (
              <p className="text-sm text-red-600">
                Warning: Min value (0x{searchConditions.timer0Range.min.toString(16).toUpperCase()}) is greater than Max value (0x{searchConditions.timer0Range.max.toString(16).toUpperCase()})
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="auto-vcount"
                checked={searchConditions.vcountRange.useAutoRange}
                onCheckedChange={(checked) =>
                  setSearchConditions({
                    vcountRange: { ...searchConditions.vcountRange, useAutoRange: !!checked },
                  })
                }
              />
              <Label htmlFor="auto-vcount">Use auto VCount range</Label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="vcount-min">VCount Min (hex)</Label>
                <Input
                  id="vcount-min"
                  type="text"
                  placeholder="0"
                  maxLength={2}
                  value={vcountInputValues.min}
                  onChange={(e) => handleVCountInputChange('min', e.target.value)}
                  onFocus={() => handleVCountFocus('min')}
                  onBlur={() => handleVCountBlur('min')}
                  disabled={searchConditions.vcountRange.useAutoRange}
                  className="font-mono"
                />
              </div>
              <div>
                <Label htmlFor="vcount-max">VCount Max (hex)</Label>
                <Input
                  id="vcount-max"
                  type="text"
                  placeholder="FF"
                  maxLength={2}
                  value={vcountInputValues.max}
                  onChange={(e) => handleVCountInputChange('max', e.target.value)}
                  onFocus={() => handleVCountFocus('max')}
                  onBlur={() => handleVCountBlur('max')}
                  disabled={searchConditions.vcountRange.useAutoRange}
                  className="font-mono"
                />
              </div>
            </div>
            {!isVCountRangeValid && !searchConditions.vcountRange.useAutoRange && (
              <p className="text-sm text-red-600">
                Warning: Min value (0x{searchConditions.vcountRange.min.toString(16).toUpperCase()}) is greater than Max value (0x{searchConditions.vcountRange.max.toString(16).toUpperCase()})
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

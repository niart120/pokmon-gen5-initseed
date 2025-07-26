import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppStore } from '../../store/app-store';
import { parseMacByte, formatHexDisplay } from '../../lib/utils/hex-parser';

export function MACAddressCard() {
  const { searchConditions, setSearchConditions } = useAppStore();
  
  // 入力中の表示値を管理（フォーマットされていない生の値）
  const [inputValues, setInputValues] = useState<string[]>(
    searchConditions.macAddress.map(byte => formatHexDisplay(byte, 2))
  );

  // searchConditionsが外部から変更された場合、inputValuesを同期
  useEffect(() => {
    setInputValues(searchConditions.macAddress.map(byte => formatHexDisplay(byte, 2)));
  }, [searchConditions.macAddress]);

  const handleInputChange = (index: number, value: string) => {
    // 入力中は生の値を保持（16進数文字のみ許可、最大2文字）
    if (/^[0-9a-fA-F]{0,2}$/i.test(value)) {
      const newInputValues = [...inputValues];
      newInputValues[index] = value.toUpperCase();
      setInputValues(newInputValues);
      
      // 有効な値の場合のみストアを更新
      const parsed = parseMacByte(value);
      if (parsed !== null) {
        const macAddress = [...searchConditions.macAddress];
        macAddress[index] = parsed;
        setSearchConditions({ macAddress });
      }
    }
  };

  const handleBlur = (index: number) => {
    // フォーカス離脱時に正規化して表示
    const newInputValues = [...inputValues];
    newInputValues[index] = formatHexDisplay(searchConditions.macAddress[index], 2);
    setInputValues(newInputValues);
  };

  const handleFocus = (index: number) => {
    // フォーカス時に0パディングを削除（01 → 1）
    const currentValue = inputValues[index];
    if (currentValue.length === 2 && currentValue.startsWith('0') && currentValue !== '00') {
      const newInputValues = [...inputValues];
      newInputValues[index] = currentValue[1];
      setInputValues(newInputValues);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>MAC Address</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-6 gap-2">
          {searchConditions.macAddress.map((byte, index) => (
            <div key={index}>
              <Label htmlFor={`mac-${index}`}>Byte {index + 1}</Label>
              <Input
                id={`mac-${index}`}
                type="text"
                placeholder="00"
                maxLength={2}
                value={inputValues[index]}
                onChange={(e) => handleInputChange(index, e.target.value)}
                onBlur={() => handleBlur(index)}
                onFocus={() => handleFocus(index)}
                className="font-mono text-center"
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

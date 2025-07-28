import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppStore } from '../../../store/app-store';
import { parseMacByte, formatHexDisplay } from '../../../lib/utils/hex-parser';

export function MACAddressCard() {
  const { searchConditions, setSearchConditions } = useAppStore();
  
  // 各フィールドの表示値を管理
  const [inputValues, setInputValues] = useState<string[]>(
    searchConditions.macAddress.map(byte => formatHexDisplay(byte, 2))
  );

  // searchConditionsが外部から変更された場合、inputValuesを同期
  useEffect(() => {
    setInputValues(searchConditions.macAddress.map(byte => formatHexDisplay(byte, 2)));
  }, [searchConditions.macAddress]);

  const handleInputChange = (index: number, value: string) => {
    // 最大2桁の16進数文字のみ許可
    if (/^[0-9a-fA-F]{0,2}$/i.test(value)) {
      const newInputValues = [...inputValues];
      newInputValues[index] = value.toUpperCase();
      setInputValues(newInputValues);
    }
  };

  const handleFocus = (index: number) => {
    // フォーカス時に全選択
    setTimeout(() => {
      const input = document.getElementById(`mac-${index}`) as HTMLInputElement;
      if (input) {
        input.select();
      }
    }, 0);
  };

  const handleBlur = (index: number) => {
    // バリデーション実行
    const currentInput = inputValues[index];
    const parsed = parseMacByte(currentInput);
    
    if (parsed !== null) {
      // バリデーション成功: ストア更新 & 2桁フォーマット
      const macAddress = [...searchConditions.macAddress];
      macAddress[index] = parsed;
      setSearchConditions({ macAddress });
      
      const newInputValues = [...inputValues];
      newInputValues[index] = formatHexDisplay(parsed, 2);
      setInputValues(newInputValues);
    } else {
      // バリデーション失敗: 元の値に戻す
      const newInputValues = [...inputValues];
      newInputValues[index] = formatHexDisplay(searchConditions.macAddress[index], 2);
      setInputValues(newInputValues);
    }
  };

  return (
    <Card className="py-2 flex flex-col h-full gap-2">
      <CardHeader className="pb-0 flex-shrink-0">
        <CardTitle className="text-base">MAC Address</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 flex flex-col">
        <div className="grid grid-cols-6 gap-2 flex-shrink-0">
          {searchConditions.macAddress.map((byte, index) => (
            <div key={index}>
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

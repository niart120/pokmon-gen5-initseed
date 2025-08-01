import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { useAppStore } from '../../../../store/app-store';
import { parseMacByte, formatHexDisplay } from '../../../../lib/utils/hex-parser';

export function MACAddressParam() {
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
    <div className="space-y-3">
      <div className="text-sm font-medium">MAC Address</div>
      
      <div className="grid grid-cols-6 gap-1 sm:gap-2">
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
              className="font-mono text-center min-w-[48px] text-sm"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

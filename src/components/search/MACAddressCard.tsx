import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppStore } from '../../store/app-store';
import { parseMacByte, formatHexDisplay } from '../../lib/utils/hex-parser';

export function MACAddressCard() {
  const { searchConditions, setSearchConditions } = useAppStore();

  const handleMacAddressChange = (index: number, value: string) => {
    const parsed = parseMacByte(value);
    if (parsed !== null) {
      const macAddress = [...searchConditions.macAddress];
      macAddress[index] = parsed;
      setSearchConditions({ macAddress });
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
                value={formatHexDisplay(byte, 2)}
                onChange={(e) => handleMacAddressChange(index, e.target.value)}
                className="font-mono text-center"
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

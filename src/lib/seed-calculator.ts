import { SHA1 } from './sha1';
import { initWasm, getWasm, isWasmReady, createWasmCalculator, type WasmSeedCalculator } from './wasm-interface';
import type { SearchConditions, ROMParameters, Hardware } from '../types/pokemon';
import romParametersData from '../data/rom-parameters.json';

const HARDWARE_FRAME_VALUES: Record<Hardware, number> = {
  DS: 8,
  DS_LITE: 6,
  '3DS': 9
};

/**
 * Utility functions for Pokemon BW/BW2 initial seed calculation
 * Supports both TypeScript and WebAssembly implementations
 */

export class SeedCalculator {
  private sha1: SHA1;
  private wasmCalculator: WasmSeedCalculator | null = null;
  private useWasm: boolean = false;

  constructor() {
    this.sha1 = new SHA1();
  }

  /**
   * Initialize WebAssembly support (optional)
   * If successful, calculations will use WebAssembly for better performance
   */
  public async initializeWasm(): Promise<boolean> {
    try {
      console.log('🔧 Initializing WebAssembly module...');
      const wasm = await initWasm();
      this.wasmCalculator = createWasmCalculator(wasm);
      this.useWasm = true;
      console.log('✅ WebAssembly module initialized successfully');
      return true;
    } catch (error) {
      console.warn('⚠️ WebAssembly initialization failed, falling back to TypeScript:', error);
      this.useWasm = false;
      return false;
    }
  }

  /**
   * Check if WebAssembly is being used
   */
  public isUsingWasm(): boolean {
    return this.useWasm && this.wasmCalculator !== null;
  }

  /**
   * Force enable/disable WebAssembly usage
   */
  public setUseWasm(use: boolean): void {
    if (use && !this.wasmCalculator) {
      console.warn('Cannot enable WebAssembly: module not initialized');
      return;
    }
    this.useWasm = use;
  }

  /**
   * Get ROM parameters for the specified version and region
   */
  public getROMParameters(version: string, region: string): ROMParameters | null {
    const versionData = romParametersData[version as keyof typeof romParametersData];
    if (!versionData) {
      console.error(`ROM version not found: ${version}`);
      return null;
    }
    
    const regionData = versionData[region as keyof typeof versionData];
    if (!regionData) {
      console.error(`ROM region not found: ${region} for version ${version}`);
      return null;
    }
    
    return regionData as ROMParameters;
  }

  /**
   * Convert little-endian 32-bit integer
   * Uses WebAssembly if available for better performance
   */
  private toLittleEndian32(value: number): number {
    if (this.useWasm && this.wasmCalculator) {
      try {
        return this.wasmCalculator.toLittleEndian32(value);
      } catch (error) {
        console.warn('WebAssembly endian conversion failed, using TypeScript:', error);
      }
    }

    // TypeScript implementation (fallback)
    return ((value & 0xFF) << 24) | 
           (((value >> 8) & 0xFF) << 16) | 
           (((value >> 16) & 0xFF) << 8) | 
           ((value >> 24) & 0xFF);
  }

  /**
   * Convert little-endian 16-bit integer
   * Uses WebAssembly if available for better performance
   */
  private toLittleEndian16(value: number): number {
    if (this.useWasm && this.wasmCalculator) {
      try {
        return this.wasmCalculator.toLittleEndian16(value);
      } catch (error) {
        console.warn('WebAssembly endian conversion failed, using TypeScript:', error);
      }
    }

    // TypeScript implementation (fallback)
    return ((value & 0xFF) << 8) | ((value >> 8) & 0xFF);
  }

  /**
   * Calculate day of week (0=Sunday, 1=Monday, etc.)
   */
  private getDayOfWeek(year: number, month: number, day: number): number {
    const date = new Date(year, month - 1, day);
    return date.getDay();
  }

  /**
   * Generate message array for SHA-1 calculation
   */
  public generateMessage(conditions: SearchConditions, timer0: number, vcount: number, datetime: Date): number[] {
    const params = this.getROMParameters(conditions.romVersion, conditions.romRegion);
    if (!params) {
      throw new Error(`No parameters found for ${conditions.romVersion} ${conditions.romRegion}`);
    }

    const message = new Array(16).fill(0);
    
    // data[0-4]: Nazo values (little-endian conversion needed)
    for (let i = 0; i < 5; i++) {
      message[i] = this.toLittleEndian32(params.nazo[i]);
    }
    
    // data[5]: (VCount << 16) | Timer0 (Timer0 part needs little-endian conversion)
    const timer0LE = this.toLittleEndian16(timer0);
    message[5] = (vcount << 16) | timer0LE;
    
    // data[6]: MAC address lower 16 bits (no endian conversion)
    const macLower = (conditions.macAddress[4] << 8) | conditions.macAddress[5];
    message[6] = macLower;
    
    // data[7]: MAC address upper 32 bits XOR GxStat XOR Frame (little-endian conversion needed)
    const macUpper = (conditions.macAddress[0] << 24) | (conditions.macAddress[1] << 16) | 
                     (conditions.macAddress[2] << 8) | conditions.macAddress[3];
    const gxStat = 0x06000000;
    const frame = HARDWARE_FRAME_VALUES[conditions.hardware];
    const data7 = macUpper ^ gxStat ^ frame;
    message[7] = this.toLittleEndian32(data7);
    
    // data[8]: Date and day of week (YYMMDDWW format, 10進数→16進数変換, no endian conversion)
    const year = datetime.getFullYear() % 100;
    const month = datetime.getMonth() + 1;
    const day = datetime.getDate();
    const dayOfWeek = this.getDayOfWeek(datetime.getFullYear(), month, day);
    
    // Build BCD-like decimal representation then treat as hex
    // Example: 2023/12/31 Sunday → 23123100 (decimal) → 0x160D05C4 (hex)
    const yyBCD = Math.floor(year / 10) * 16 + (year % 10);
    const mmBCD = Math.floor(month / 10) * 16 + (month % 10);
    const ddBCD = Math.floor(day / 10) * 16 + (day % 10);
    const wwBCD = Math.floor(dayOfWeek / 10) * 16 + (dayOfWeek % 10);
    message[8] = (yyBCD << 24) | (mmBCD << 16) | (ddBCD << 8) | wwBCD;
    
    // data[9]: Time (HHMMSS00 format, DS/DS Lite adds 0x40 for PM, 10進数→16進数変換, no endian conversion)
    let hour = datetime.getHours();
    const minute = datetime.getMinutes();
    const second = datetime.getSeconds();
    
    // DS/DS Lite hardware adds 0x40 for PM (hours >= 12)
    if ((conditions.hardware === 'DS' || conditions.hardware === 'DS_LITE') && hour >= 12) {
      hour += 0x40;
    }
    
    // Build BCD-like decimal representation then treat as hex
    // Example: 23:59:59 → 63595900 (DS/DS Lite PM) → 0x3C98BC04 (hex)
    const hhBCD = Math.floor(hour / 10) * 16 + (hour % 10);
    const minBCD = Math.floor(minute / 10) * 16 + (minute % 10);
    const secBCD = Math.floor(second / 10) * 16 + (second % 10);
    message[9] = (hhBCD << 24) | (minBCD << 16) | (secBCD << 8) | 0x00;
    
    // data[10-11]: Fixed values 0x00000000
    message[10] = 0x00000000;
    message[11] = 0x00000000;
    
    // data[12]: Key input (little-endian conversion needed)
    message[12] = this.toLittleEndian32(conditions.keyInput);
    
    // data[13-15]: SHA-1 padding
    message[13] = 0x80000000;
    message[14] = 0x00000000;
    message[15] = 0x000001A0;
    
    return message;
  }

  /**
   * Calculate initial seed from message
   * Uses WebAssembly if available, otherwise falls back to TypeScript
   */
  public calculateSeed(message: number[]): { seed: number; hash: string } {
    // Use WebAssembly implementation if available
    if (this.useWasm && this.wasmCalculator) {
      try {
        return this.wasmCalculator.calculateSeed(message);
      } catch (error) {
        console.warn('WebAssembly calculation failed, falling back to TypeScript:', error);
        // Fall through to TypeScript implementation
      }
    }

    // TypeScript implementation (fallback)
    const result = this.sha1.calculateHash(message);
    
    // Extract upper 32 bits as initial seed (H0 + A)
    const seed = result.h0;
    const hash = SHA1.hashToHex(result.h0, result.h1);
    
    return { seed, hash };
  }

  /**
   * Parse and validate target seed input
   */
  public parseTargetSeeds(input: string): { validSeeds: number[]; errors: { line: number; value: string; error: string }[] } {
    const lines = input.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const validSeeds: number[] = [];
    const errors: { line: number; value: string; error: string }[] = [];
    const seenSeeds = new Set<number>();

    lines.forEach((line, index) => {
      try {
        // Remove 0x prefix if present
        let cleanLine = line.toLowerCase();
        if (cleanLine.startsWith('0x')) {
          cleanLine = cleanLine.substring(2);
        }

        // Validate hex format
        if (!/^[0-9a-f]{1,8}$/.test(cleanLine)) {
          errors.push({
            line: index + 1,
            value: line,
            error: 'Invalid hexadecimal format. Expected 1-8 hex digits.'
          });
          return;
        }

        const seedValue = parseInt(cleanLine, 16);
        
        // Check for duplicates
        if (seenSeeds.has(seedValue)) {
          return; // Skip duplicates silently
        }
        
        seenSeeds.add(seedValue);
        validSeeds.push(seedValue);
      } catch (err) {
        errors.push({
          line: index + 1,
          value: line,
          error: 'Failed to parse as hexadecimal number.'
        });
      }
    });

    return { validSeeds, errors };
  }

  /**
   * Get VCount value with offset handling for BW2
   */
  public getVCountForTimer0(params: ROMParameters, timer0: number): number {
    if (!params.vcountOffset) {
      return params.defaultVCount;
    }

    // Check if Timer0 falls within any offset range
    for (const offset of params.vcountOffset) {
      if (timer0 >= offset.timer0Min && timer0 <= offset.timer0Max) {
        return offset.vcountValue;
      }
    }

    return params.defaultVCount;
  }
}
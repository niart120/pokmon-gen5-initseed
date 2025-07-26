/**
 * Utility functions for parsing hexadecimal input values
 */

/**
 * Parse hexadecimal string with flexible format support
 * Supports: prefix optional (0x), zero-fill optional, case insensitive
 * 
 * @param input - Input string to parse
 * @param maxValue - Maximum allowed value (optional)
 * @returns Parsed number or null if invalid
 */
export function parseHexInput(input: string, maxValue?: number): number | null {
  if (!input || typeof input !== 'string') {
    return null;
  }

  // Remove whitespace and convert to lowercase
  let cleanInput = input.trim().toLowerCase();
  
  // Remove 0x prefix if present
  if (cleanInput.startsWith('0x')) {
    cleanInput = cleanInput.substring(2);
  }

  // Validate hex format (1-8 hex digits)
  if (!/^[0-9a-f]{1,8}$/.test(cleanInput)) {
    return null;
  }

  try {
    const value = parseInt(cleanInput, 16);
    
    // Check bounds
    if (isNaN(value) || value < 0) {
      return null;
    }
    
    if (maxValue !== undefined && value > maxValue) {
      return null;
    }
    
    return value;
  } catch {
    return null;
  }
}

/**
 * Format number as hexadecimal string for display
 * 
 * @param value - Number to format
 * @param minDigits - Minimum number of digits (default: 1)
 * @param uppercase - Use uppercase letters (default: true)
 * @returns Formatted hex string
 */
export function formatHexDisplay(value: number, minDigits: number = 1, uppercase: boolean = true): string {
  const hex = value.toString(16).padStart(minDigits, '0');
  return uppercase ? hex.toUpperCase() : hex;
}

/**
 * Parse MAC address byte with flexible hex format
 * 
 * @param input - Input string to parse
 * @returns Parsed byte value (0-255) or null if invalid
 */
export function parseMacByte(input: string): number | null {
  return parseHexInput(input, 255);
}

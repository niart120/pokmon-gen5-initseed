/**
 * SHA-1 implementation for Pokemon BW/BW2 initial seed calculation
 * Based on the reference implementation from Project_Veni
 */

export class SHA1 {
  /**
   * Calculate SHA-1 hash for a 64-byte (16 x 32-bit) message
   * This is specifically designed for Pokemon BW/BW2 seed generation
   */
  public calculateHash(message: number[]): { h0: number; h1: number; h2: number; h3: number; h4: number} {
    if (message.length !== 16) {
      throw new Error('Message must be exactly 16 32-bit words (64 bytes)');
    }

    // Reset hash values
    const H0 = 0x67452301;
    const H1 = 0xEFCDAB89;
    const H2 = 0x98BADCFE;
    const H3 = 0x10325476;
    const H4 = 0xC3D2E1F0;

    // Extend the 16 words to 80 words
    const w = new Array(80);
    
    // Copy original message
    for (let i = 0; i < 16; i++) {
      w[i] = message[i];
    }

    // Extend to 80 words
    for (let i = 16; i < 80; i++) {
      w[i] = this.leftRotate(w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16], 1);
    }

    // Initialize working variables
    let a = H0;
    let b = H1;
    let c = H2;
    let d = H3;
    let e = H4;

    // Main loop
    for (let i = 0; i < 80; i++) {
      let temp: number;

      if (i < 20) {
        temp = (this.leftRotate(a, 5) + (b & c | ~b & d) + e + w[i] + 0x5A827999) & 0xFFFFFFFF;
      } else if (i < 40) {
        temp = (this.leftRotate(a, 5) + (b ^ c ^ d) + e + w[i] + 0x6ED9EBA1) & 0xFFFFFFFF;
      } else if (i < 60) {
        temp = (this.leftRotate(a, 5) + (b & c | b & d | c & d) + e + w[i] + 0x8F1BBCDC) & 0xFFFFFFFF;
      } else {
        temp = (this.leftRotate(a, 5) + (b ^ c ^ d) + e + w[i] + 0xCA62C1D6) & 0xFFFFFFFF;
      }

      e = d;
      d = c;
      c = this.leftRotate(b, 30);
      b = a;
      a = temp;
    }

    // Add this chunk's hash to result
    let h0 = this.add32(H0, a);
    let h1 = this.add32(H1, b);
    let h2 = this.add32(H2, c);
    let h3 = this.add32(H3, d);
    let h4 = this.add32(H4, e);

    return { h0, h1, h2, h3, h4 };
  }

  /**
   * 32-bit left rotation
   */
  private leftRotate(value: number, amount: number): number {
    return ((value << amount) | (value >>> (32 - amount))) >>> 0;
  }

  /**
   * 32-bit addition with overflow handling
   */
  private add32(a: number, b: number): number {
    return ((a + b) & 0xFFFFFFFF) >>> 0;
  }

  /**
   * Convert hash result to hex string
   */
  public static hashToHex(h0: number, h1: number, h2: number, h3: number, h4: number): string {
    return h0.toString(16).padStart(8, '0') + h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0') + h3.toString(16).padStart(8, '0') + h4.toString(16).padStart(8, '0');
  }
}
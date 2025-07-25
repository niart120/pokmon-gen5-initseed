/**
 * SHA-1 implementation for Pokemon BW/BW2 initial seed calculation
 * Based on the reference implementation from Project_Veni
 */

export class SHA1 {
  private h0: number = 0x67452301;
  private h1: number = 0xEFCDAB89;
  private h2: number = 0x98BADCFE;
  private h3: number = 0x10325476;
  private h4: number = 0xC3D2E1F0;

  /**
   * Calculate SHA-1 hash for a 64-byte (16 x 32-bit) message
   * This is specifically designed for Pokemon BW/BW2 seed generation
   */
  public calculateHash(message: number[]): { h0: number; h1: number } {
    if (message.length !== 16) {
      throw new Error('Message must be exactly 16 32-bit words (64 bytes)');
    }

    // Reset hash values
    this.h0 = 0x67452301;
    this.h1 = 0xEFCDAB89;
    this.h2 = 0x98BADCFE;
    this.h3 = 0x10325476;
    this.h4 = 0xC3D2E1F0;

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
    let a = this.h0;
    let b = this.h1;
    let c = this.h2;
    let d = this.h3;
    let e = this.h4;

    // Main loop
    for (let i = 0; i < 80; i++) {
      let f: number;
      let k: number;

      if (i < 20) {
        f = (b & c) | ((~b) & d);
        k = 0x5A827999;
      } else if (i < 40) {
        f = b ^ c ^ d;
        k = 0x6ED9EBA1;
      } else if (i < 60) {
        f = (b & c) | (b & d) | (c & d);
        k = 0x8F1BBCDC;
      } else {
        f = b ^ c ^ d;
        k = 0xCA62C1D6;
      }

      const temp = this.add32(
        this.add32(this.leftRotate(a, 5), f),
        this.add32(this.add32(e, w[i]), k)
      );

      e = d;
      d = c;
      c = this.leftRotate(b, 30);
      b = a;
      a = temp;
    }

    // Add this chunk's hash to result
    this.h0 = this.add32(this.h0, a);
    this.h1 = this.add32(this.h1, b);
    this.h2 = this.add32(this.h2, c);
    this.h3 = this.add32(this.h3, d);
    this.h4 = this.add32(this.h4, e);

    return { h0: this.h0, h1: this.h1 };
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
    return (a + b) >>> 0;
  }

  /**
   * Convert hash result to hex string
   */
  public static hashToHex(h0: number, h1: number): string {
    return h0.toString(16).padStart(8, '0') + h1.toString(16).padStart(8, '0');
  }
}
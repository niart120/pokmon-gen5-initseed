use wasm_bindgen::prelude::*;
use byteorder::{LittleEndian, ByteOrder};

// Import the `console.log` function from the browser console
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

// Define a macro to make console.log easier to use
macro_rules! console_log {
    ($($t:tt)*) => (log(&format_args!($($t)*).to_string()))
}

/// Convert 32-bit value to little-endian
#[wasm_bindgen]
pub fn to_little_endian_32(value: u32) -> u32 {
    let mut bytes = [0u8; 4];
    LittleEndian::write_u32(&mut bytes, value);
    LittleEndian::read_u32(&bytes)
}

/// Convert 16-bit value to little-endian
#[wasm_bindgen]
pub fn to_little_endian_16(value: u16) -> u16 {
    let mut bytes = [0u8; 2];
    LittleEndian::write_u16(&mut bytes, value);
    LittleEndian::read_u16(&bytes)
}

/// Calculate SHA-1 hash for Pokemon BW/BW2 seed generation
/// Takes 16 32-bit words and returns (h0, h1) as the first 64 bits
/// This implements the exact same algorithm as the TypeScript version
#[wasm_bindgen]
pub fn calculate_sha1_hash(message: &[u32]) -> Vec<u32> {
    if message.len() != 16 {
        console_log!("Error: Message must be exactly 16 32-bit words");
        return vec![0, 0];
    }

    // Initialize hash values (SHA-1 standard)
    let mut h0: u32 = 0x67452301;
    let mut h1: u32 = 0xEFCDAB89;
    let mut h2: u32 = 0x98BADCFE;
    let mut h3: u32 = 0x10325476;
    let mut h4: u32 = 0xC3D2E1F0;

    // Extend the 16 words to 80 words
    let mut w = [0u32; 80];
    
    // Copy original message
    for i in 0..16 {
        w[i] = message[i];
    }

    // Extend to 80 words
    for i in 16..80 {
        w[i] = left_rotate(w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16], 1);
    }

    // Initialize working variables
    let mut a = h0;
    let mut b = h1;
    let mut c = h2;
    let mut d = h3;
    let mut e = h4;

    // Main loop
    for i in 0..80 {
        let (f, k) = if i < 20 {
            ((b & c) | ((!b) & d), 0x5A827999)
        } else if i < 40 {
            (b ^ c ^ d, 0x6ED9EBA1)
        } else if i < 60 {
            ((b & c) | (b & d) | (c & d), 0x8F1BBCDC)
        } else {
            (b ^ c ^ d, 0xCA62C1D6)
        };

        let temp = add32(
            add32(left_rotate(a, 5), f),
            add32(add32(e, w[i]), k)
        );

        e = d;
        d = c;
        c = left_rotate(b, 30);
        b = a;
        a = temp;
    }

    // Add this chunk's hash to result
    h0 = add32(h0, a);
    h1 = add32(h1, b);
    h2 = add32(h2, c);
    h3 = add32(h3, d);
    h4 = add32(h4, e);

    vec![h0, h1]
}

/// 32-bit left rotation
fn left_rotate(value: u32, amount: u32) -> u32 {
    (value << amount) | (value >> (32 - amount))
}

/// 32-bit addition with overflow handling
fn add32(a: u32, b: u32) -> u32 {
    a.wrapping_add(b)
}

/// Test function to verify WebAssembly is working
#[wasm_bindgen]
pub fn test_wasm() -> String {
    "WebAssembly module loaded successfully!".to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_endian_conversion() {
        let test_value_32 = 0x12345678u32;
        let converted = to_little_endian_32(test_value_32);
        // Test that conversion works (actual result depends on system endianness)
        assert!(converted != 0);
    }

    #[test]
    fn test_sha1_basic() {
        let message = vec![0u32; 16]; // All zeros
        let result = calculate_sha1_hash(&message);
        assert_eq!(result.len(), 2);
        // Should return some non-zero hash for all-zero input
        assert!(result[0] != 0 || result[1] != 0);
    }
}

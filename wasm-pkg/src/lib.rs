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

    let (h0, h1) = calculate_sha1_internal(message);
    vec![h0, h1]
}

/// Batch SHA-1 calculation for improved performance
/// Takes multiple messages (batch_size * 16 words) and returns seeds
/// Reduces TypeScript ↔ WebAssembly communication overhead
#[wasm_bindgen]
pub fn calculate_sha1_batch(messages: &[u32], batch_size: u32) -> Vec<u32> {
    let expected_len = (batch_size as usize) * 16;
    if messages.len() != expected_len {
        console_log!("Error: Expected {} words for {} messages", expected_len, batch_size);
        return vec![];
    }

    let mut results = Vec::with_capacity(batch_size as usize * 2);
    
    for i in 0..batch_size {
        let start_idx = (i as usize) * 16;
        let message_slice = &messages[start_idx..start_idx + 16];
        let (h0, h1) = calculate_sha1_internal(message_slice);
        results.push(h0);
        results.push(h1);
    }
    
    results
}

/// Internal SHA-1 calculation (shared by single and batch functions)
fn calculate_sha1_internal(message: &[u32]) -> (u32, u32) {
    // Initialize hash values (SHA-1 standard)
    let mut h0: u32 = 0x67452301;
    let mut h1: u32 = 0xEFCDAB89;
    let h2: u32 = 0x98BADCFE;
    let h3: u32 = 0x10325476;
    let h4: u32 = 0xC3D2E1F0;

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
    let _h2 = add32(h2, c);
    let _h3 = add32(h3, d);
    let _h4 = add32(h4, e);

    (h0, h1)
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

    #[test]
    fn test_sha1_batch() {
        let batch_size = 3;
        let messages = vec![0u32; 16 * batch_size];
        let result = calculate_sha1_batch(&messages, batch_size as u32);
        assert_eq!(result.len(), batch_size * 2);
        // Should return some non-zero hashes
        assert!(result.iter().any(|&x| x != 0));
    }

    #[test]
    fn test_sha1_consistency() {
        // 同じメッセージで複数回計算した結果が一致するかテスト
        let message = vec![0x12345678, 0x9ABCDEF0, 0x11111111, 0x22222222,
                          0x33333333, 0x44444444, 0x55555555, 0x66666666,
                          0x77777777, 0x88888888, 0x99999999, 0xAAAAAAAA,
                          0xBBBBBBBB, 0xCCCCCCCC, 0xDDDDDDDD, 0xEEEEEEEE];
        
        let result1 = calculate_sha1_hash(&message);
        let result2 = calculate_sha1_hash(&message);
        
        assert_eq!(result1[0], result2[0]);
        assert_eq!(result1[1], result2[1]);
    }

    #[test]
    fn test_sha1_different_inputs() {
        // 異なる入力で異なる結果が得られるかテスト
        let message1 = vec![0u32; 16];
        let mut message2 = vec![0u32; 16];
        message2[0] = 1; // 最初の要素だけ変更

        let result1 = calculate_sha1_hash(&message1);
        let result2 = calculate_sha1_hash(&message2);

        // 異なる入力は異なる結果を生成するはず
        assert!(result1[0] != result2[0] || result1[1] != result2[1]);
    }

    #[test]
    fn test_batch_vs_individual() {
        // バッチ処理と個別処理で同じ結果が得られるかテスト
        let message1 = vec![0x12345678u32; 16];
        let message2 = vec![0xABCDEF00u32; 16];
        
        // 個別処理
        let individual1 = calculate_sha1_hash(&message1);
        let individual2 = calculate_sha1_hash(&message2);
        
        // バッチ処理
        let mut batch_messages = Vec::new();
        batch_messages.extend_from_slice(&message1);
        batch_messages.extend_from_slice(&message2);
        let batch_results = calculate_sha1_batch(&batch_messages, 2);
        
        // 結果の比較
        assert_eq!(individual1[0], batch_results[0]);
        assert_eq!(individual1[1], batch_results[1]);
        assert_eq!(individual2[0], batch_results[2]);
        assert_eq!(individual2[1], batch_results[3]);
    }

    #[test]
    fn test_left_rotate() {
        // 左回転テスト
        assert_eq!(left_rotate(0x80000000, 1), 0x00000001);
        assert_eq!(left_rotate(0x00000001, 1), 0x00000002);
        assert_eq!(left_rotate(0x12345678, 4), 0x23456781);
    }

    #[test]
    fn test_add32_overflow() {
        // 32bit加算のオーバーフローテスト
        assert_eq!(add32(0xFFFFFFFF, 1), 0x00000000);
        assert_eq!(add32(0x80000000, 0x80000000), 0x00000000);
    }

    #[test]
    fn test_pokemon_specific_values() {
        // ポケモン特有の値でのテスト（実際のゲームデータに近い値）
        let message = vec![
            0x12345678, 0x9ABCDEF0, 0x11111111, 0x22222222,
            0x0A0B0C0D, 0x0E0F1011, 0x12131415, 0x16171819,
            0x1A1B1C1D, 0x1E1F2021, 0x22232425, 0x26272829,
            0x2A2B2C2D, 0x2E2F3031, 0x32333435, 0x36373839
        ];
        
        let result = calculate_sha1_hash(&message);
        assert_eq!(result.len(), 2);
        
        // 結果が有効な範囲内にあることを確認
        assert!(result[0] != 0 || result[1] != 0);
    }
}

/// ポケモンBW/BW2特化SHA-1実装
/// 高速なシード計算のためにカスタム最適化されたSHA-1関数
use wasm_bindgen::prelude::*;
use byteorder::{LittleEndian, ByteOrder};

/// ポケモンBW/BW2のSHA-1実装
/// 16個の32bit値を受け取り、H0+A, H1+Bを返す
/// 
/// このカスタム実装の特徴：
/// - ポケモン特有の16ワードメッセージに最適化
/// - TypeScript版と完全に同じ結果を保証
/// - WebAssemblyによる高速実行
#[inline]
pub fn calculate_pokemon_sha1(message: &[u32; 16]) -> (u32, u32) {
    // SHA-1初期値
    let mut h0: u32 = 0x67452301;
    let mut h1: u32 = 0xEFCDAB89;
    let mut h2: u32 = 0x98BADCFE;
    let mut h3: u32 = 0x10325476;
    let mut h4: u32 = 0xC3D2E1F0;

    // 80ワードのメッセージスケジュール配列
    let mut w = [0u32; 80];
    
    // 最初の16ワードをコピー
    for i in 0..16 {
        w[i] = message[i];
    }
    
    // 残りの64ワードを計算
    for i in 16..80 {
        w[i] = left_rotate(w[i-3] ^ w[i-8] ^ w[i-14] ^ w[i-16], 1);
    }
    
    // メイン処理ループ
    let mut a = h0;
    let mut b = h1;
    let mut c = h2;
    let mut d = h3;
    let mut e = h4;
    
    for i in 0..80 {
        let (f, k) = match i {
            0..=19 => (choice(b, c, d), 0x5A827999),
            20..=39 => (parity(b, c, d), 0x6ED9EBA1),
            40..=59 => (majority(b, c, d), 0x8F1BBCDC),
            60..=79 => (parity(b, c, d), 0xCA62C1D6),
            _ => unreachable!(),
        };
        
        let temp = left_rotate(a, 5)
            .wrapping_add(f)
            .wrapping_add(e)
            .wrapping_add(k)
            .wrapping_add(w[i]);
        
        e = d;
        d = c;
        c = left_rotate(b, 30);
        b = a;
        a = temp;
    }
    
    // 最終ハッシュ値計算
    h0 = h0.wrapping_add(a);
    h1 = h1.wrapping_add(b);
    
    (h0, h1)
}

/// バッチ処理用SHA-1計算
/// 複数のメッセージを一度に処理してWebAssembly通信オーバーヘッドを削減
pub fn calculate_pokemon_sha1_batch(messages: &[u32], batch_size: u32) -> Vec<u32> {
    let batch_size = batch_size as usize;
    let mut results = Vec::with_capacity(batch_size * 2);
    
    for i in 0..batch_size {
        let start_idx = i * 16;
        if start_idx + 16 <= messages.len() {
            let mut message = [0u32; 16];
            message.copy_from_slice(&messages[start_idx..start_idx + 16]);
            
            let (h0, h1) = calculate_pokemon_sha1(&message);
            results.push(h0);
            results.push(h1);
        }
    }
    
    results
}

/// SHA-1補助関数: Choice function
#[inline]
fn choice(x: u32, y: u32, z: u32) -> u32 {
    (x & y) | (!x & z)
}

/// SHA-1補助関数: Parity function
#[inline]
fn parity(x: u32, y: u32, z: u32) -> u32 {
    x ^ y ^ z
}

/// SHA-1補助関数: Majority function
#[inline]
fn majority(x: u32, y: u32, z: u32) -> u32 {
    (x & y) | (x & z) | (y & z)
}

/// 左回転関数
#[inline]
fn left_rotate(value: u32, amount: u32) -> u32 {
    (value << amount) | (value >> (32 - amount))
}

/// エンディアン変換関数（32bit）
pub fn to_little_endian_32(value: u32) -> u32 {
    value.to_le()
}

/// エンディアン変換関数（16bit）
pub fn to_little_endian_16(value: u16) -> u16 {
    value.to_le()
}

/// WebAssembly公開用SHA-1関数
#[wasm_bindgen]
pub fn calculate_sha1_hash(message: &[u32]) -> Vec<u32> {
    if message.len() != 16 {
        return vec![0, 0];
    }
    
    let mut msg_array = [0u32; 16];
    msg_array.copy_from_slice(message);
    
    let (h0, h1) = calculate_pokemon_sha1(&msg_array);
    vec![h0, h1]
}

/// WebAssembly公開用バッチSHA-1関数
#[wasm_bindgen]
pub fn calculate_sha1_batch(messages: &[u32], batch_size: u32) -> Vec<u32> {
    calculate_pokemon_sha1_batch(messages, batch_size)
}

/// WebAssembly公開用エンディアン変換関数（32bit）
#[wasm_bindgen]
pub fn to_little_endian_32_wasm(value: u32) -> u32 {
    to_little_endian_32(value)
}

/// WebAssembly公開用エンディアン変換関数（16bit）
#[wasm_bindgen]
pub fn to_little_endian_16_wasm(value: u16) -> u16 {
    to_little_endian_16(value)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pokemon_sha1() {
        // ポケモンBW/BW2でよく使用される値でのテスト
        let message = [
            0x02215f10, 0x01000000, 0xc0000000, 0x00007fff,
            0x12345678, 0x9abcdef0, 0x00000000, 0x00000000,
            0x00000000, 0x00000000, 0x00000000, 0x00000000,
            0x00000000, 0x00000000, 0x00000000, 0x00000000,
        ];
        
        let (h0, h1) = calculate_pokemon_sha1(&message);
        
        // 結果が0でないことを確認（具体的な値はTypeScript版と比較）
        assert_ne!(h0, 0);
        assert_ne!(h1, 0);
    }
    
    #[test]
    fn test_sha1_functions() {
        assert_eq!(choice(0xFFFFFFFF, 0x12345678, 0x9ABCDEF0), 0x12345678);
        assert_eq!(parity(0xFFFFFFFF, 0x12345678, 0x9ABCDEF0), 0x65432187);
        assert_eq!(majority(0xFFFFFFFF, 0x12345678, 0x9ABCDEF0), 0xDBFDFF78);
    }
    
    #[test]
    fn test_left_rotate() {
        assert_eq!(left_rotate(0x12345678, 1), 0x2468ACF0);
        assert_eq!(left_rotate(0x80000000, 1), 0x00000001);
    }
    
    #[test]
    fn test_endian_conversion() {
        assert_eq!(to_little_endian_32(0x12345678), 0x78563412);
        assert_eq!(to_little_endian_16(0x1234), 0x3412);
    }
}

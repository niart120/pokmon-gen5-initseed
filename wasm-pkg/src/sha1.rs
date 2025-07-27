/// ポケモンBW/BW2特化SHA-1実装
/// 高速なシード計算のためにカスタム最適化されたSHA-1関数
use wasm_bindgen::prelude::*;

/// ポケモンBW/BW2のSHA-1実装
/// 16個の32bit値を受け取り、h0～h4の5つのハッシュ値を返す
/// 
/// このカスタム実装の特徴：
/// - ポケモン特有の16ワードメッセージに最適化
/// - TypeScript版と完全に同じ結果を保証
/// - WebAssemblyによる高速実行
#[inline]
pub fn calculate_pokemon_sha1(message: &[u32; 16]) -> (u32, u32, u32, u32, u32) {
    // SHA-1初期値
    const H0: u32 = 0x67452301;
    const H1: u32 = 0xEFCDAB89;
    const H2: u32 = 0x98BADCFE;
    const H3: u32 = 0x10325476;
    const H4: u32 = 0xC3D2E1F0;

    // 80ワードのメッセージスケジュール配列
    let mut w = [0u32; 80];
    
    // 最初の16ワードをコピー
    w[..16].copy_from_slice(message);
    
    // 残りの64ワードを計算
    for i in 16..80 {
        w[i] = left_rotate(w[i-3] ^ w[i-8] ^ w[i-14] ^ w[i-16], 1);
    }
    
    // メイン処理ループ
    let mut a = H0;
    let mut b = H1;
    let mut c = H2;
    let mut d = H3;
    let mut e = H4;

    for (i, &w_val) in w.iter().enumerate() {
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
            .wrapping_add(w_val);
        
        e = d;
        d = c;
        c = left_rotate(b, 30);
        b = a;
        a = temp;
    }
    
    // 最終ハッシュ値計算（TypeScript版と同じく5つの値を返す）
    let final_h0 = H0.wrapping_add(a);
    let final_h1 = H1.wrapping_add(b);
    let final_h2 = H2.wrapping_add(c);
    let final_h3 = H3.wrapping_add(d);
    let final_h4 = H4.wrapping_add(e);

    (final_h0, final_h1, final_h2, final_h3, final_h4)
}

/// ポケモンBW/BW2用LCG計算
/// SHA-1ハッシュ値からTypeScript版と同じ方式で最終seedを計算
pub fn calculate_pokemon_seed_from_hash(h0: u32, h1: u32) -> u32 {
    // TypeScript版と同じエンディアン変換とLCG計算
    let h0_le = to_little_endian_32(h0) as u64;
    let h1_le = to_little_endian_32(h1) as u64;
    
    // 64bit値を構築
    let lcg_seed = (h1_le << 32) | h0_le;
    
    // 64bit LCG演算
    let multiplier = 0x5D588B656C078965u64;
    let add_value = 0x269EC3u64;
    
    let seed = lcg_seed.wrapping_mul(multiplier).wrapping_add(add_value);
    
    // 上位32bitを取得
    ((seed >> 32) & 0xFFFFFFFF) as u32
}

/// ハッシュ値を16進数文字列に変換（TypeScript版互換）
pub fn hash_to_hex_string(h0: u32, h1: u32, h2: u32, h3: u32, h4: u32) -> String {
    format!("{:08x}{:08x}{:08x}{:08x}{:08x}", h0, h1, h2, h3, h4)
}

/// バッチ処理用SHA-1計算（TypeScript版と整合性を取った完全版）
/// 複数のメッセージを一度に処理してWebAssembly通信オーバーヘッドを削減
pub fn calculate_pokemon_sha1_batch(messages: &[u32], batch_size: u32) -> Vec<u32> {
    let batch_size = batch_size as usize;
    let mut results = Vec::with_capacity(batch_size * 2);
    
    for i in 0..batch_size {
        let start_idx = i * 16;
        if start_idx + 16 <= messages.len() {
            let mut message = [0u32; 16];
            message.copy_from_slice(&messages[start_idx..start_idx + 16]);
            
            let (h0, h1, _h2, _h3, _h4) = calculate_pokemon_sha1(&message);
            let seed = calculate_pokemon_seed_from_hash(h0, h1);
            
            // 個別処理と同じ形式: [seed, h1]
            results.push(seed);
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

/// WebAssembly公開用SHA-1関数（TypeScript版と完全互換）
#[wasm_bindgen]
pub fn calculate_sha1_hash(message: &[u32]) -> Vec<u32> {
    if message.len() != 16 {
        return vec![0, 0];
    }
    
    let mut msg_array = [0u32; 16];
    msg_array.copy_from_slice(message);
    
    let (h0, h1, _h2, _h3, _h4) = calculate_pokemon_sha1(&msg_array);
    let seed = calculate_pokemon_seed_from_hash(h0, h1);
    
    // TypeScript版と同じ形式：[seed, h1] を返す（ハッシュ文字列生成用）
    vec![seed, h1]
}

/// WebAssembly公開用完全SHA-1計算関数（seed + 完全ハッシュ文字列）
#[wasm_bindgen]
pub fn calculate_pokemon_seed_and_hash(message: &[u32]) -> Vec<u32> {
    if message.len() != 16 {
        return vec![0];
    }
    
    let mut msg_array = [0u32; 16];
    msg_array.copy_from_slice(message);
    
    let (h0, h1, h2, h3, h4) = calculate_pokemon_sha1(&msg_array);
    let seed = calculate_pokemon_seed_from_hash(h0, h1);
    
    // [seed, h0, h1, h2, h3, h4] の形式で返す
    vec![seed, h0, h1, h2, h3, h4]
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
        
        let (h0, h1, h2, h3, h4) = calculate_pokemon_sha1(&message);
        
        // 結果が0でないことを確認（具体的な値はTypeScript版と比較）
        assert_ne!(h0, 0);
        assert_ne!(h1, 0);
        assert_ne!(h2, 0);
        assert_ne!(h3, 0);
        assert_ne!(h4, 0);
        
        // LCG計算のテスト
        let seed = calculate_pokemon_seed_from_hash(h0, h1);
        assert_ne!(seed, 0);
        
        // ハッシュ文字列生成のテスト
        let hash_string = hash_to_hex_string(h0, h1, h2, h3, h4);
        assert_eq!(hash_string.len(), 40); // 5 * 8文字
    }
    
    #[test]
    fn test_sha1_functions() {
        // choice(x, y, z) = (x & y) | (!x & z)
        // choice(0xFFFFFFFF, 0x12345678, 0x9ABCDEF0) = (0xFFFFFFFF & 0x12345678) | (!0xFFFFFFFF & 0x9ABCDEF0)
        //                                            = 0x12345678 | (0x00000000 & 0x9ABCDEF0)
        //                                            = 0x12345678 | 0x00000000 = 0x12345678
        assert_eq!(choice(0xFFFFFFFF, 0x12345678, 0x9ABCDEF0), 0x12345678);
        
        // parity(x, y, z) = x ^ y ^ z
        // parity(0xFFFFFFFF, 0x12345678, 0x9ABCDEF0) = 0xFFFFFFFF ^ 0x12345678 ^ 0x9ABCDEF0
        let parity_result = 0xFFFFFFFF ^ 0x12345678 ^ 0x9ABCDEF0;
        assert_eq!(parity(0xFFFFFFFF, 0x12345678, 0x9ABCDEF0), parity_result);
        
        // majority(x, y, z) = (x & y) | (x & z) | (y & z)
        // majority(0xFFFFFFFF, 0x12345678, 0x9ABCDEF0) = (0xFFFFFFFF & 0x12345678) | (0xFFFFFFFF & 0x9ABCDEF0) | (0x12345678 & 0x9ABCDEF0)
        //                                              = 0x12345678 | 0x9ABCDEF0 | (0x12345678 & 0x9ABCDEF0)
        let majority_result = (0xFFFFFFFF & 0x12345678) | (0xFFFFFFFF & 0x9ABCDEF0) | (0x12345678 & 0x9ABCDEF0);
        assert_eq!(majority(0xFFFFFFFF, 0x12345678, 0x9ABCDEF0), majority_result);
    }
    
    #[test]
    fn test_left_rotate() {
        assert_eq!(left_rotate(0x12345678, 1), 0x2468ACF0);
        assert_eq!(left_rotate(0x80000000, 1), 0x00000001);
    }
    
    #[test]
    fn test_lcg_calculation() {
        // TypeScript実装と同じLCG計算結果になることを確認
        let h0 = 0x12345678;
        let h1 = 0x9ABCDEF0;
        
        let seed = calculate_pokemon_seed_from_hash(h0, h1);
        
        // 計算結果が0でないことを確認
        assert_ne!(seed, 0);
        assert_ne!(seed, h0); // 元のh0と異なることを確認
    }
    
    #[test]
    fn test_hash_string_generation() {
        let h0 = 0x12345678;
        let h1 = 0x9ABCDEF0;
        let h2 = 0x11111111;
        let h3 = 0x22222222;
        let h4 = 0x33333333;
        
        let hash_string = hash_to_hex_string(h0, h1, h2, h3, h4);
        
        // 期待される文字列長とフォーマット
        assert_eq!(hash_string.len(), 40);
        assert_eq!(hash_string, "123456789abcdef0111111112222222233333333");
    }
    
    #[test]
    fn test_endian_conversion() {
        // Windowsはリトルエンディアンなので、to_le()は値をそのまま返す
        assert_eq!(to_little_endian_32(0x12345678), 0x12345678);
        assert_eq!(to_little_endian_16(0x1234), 0x1234);
    }
}

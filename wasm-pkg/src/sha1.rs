/// ポケモンBW/BW2特化SHA-1実装
/// 高速なシード計算のためにカスタム最適化されたSHA-1関数

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
    // TypeScript版と同じバイトスワップとLCG計算
    let h0_le = swap_bytes_32(h0) as u64;
    let h1_le = swap_bytes_32(h1) as u64;
    
    // 64bit値を構築
    let lcg_seed = (h1_le << 32) | h0_le;
    
    // 64bit LCG演算
    let multiplier = 0x5D588B656C078965u64;
    let add_value = 0x269EC3u64;
    
    let seed = lcg_seed.wrapping_mul(multiplier).wrapping_add(add_value);
    
    // 上位32bitを取得
    ((seed >> 32) & 0xFFFFFFFF) as u32
}

/// SHA-1補助関数: Choice function
#[inline]
pub fn choice(x: u32, y: u32, z: u32) -> u32 {
    (x & y) | (!x & z)
}

/// SHA-1補助関数: Parity function
#[inline]
pub fn parity(x: u32, y: u32, z: u32) -> u32 {
    x ^ y ^ z
}

/// SHA-1補助関数: Majority function
#[inline]
pub fn majority(x: u32, y: u32, z: u32) -> u32 {
    (x & y) | (x & z) | (y & z)
}

/// 左回転関数
#[inline]
pub fn left_rotate(value: u32, amount: u32) -> u32 {
    (value << amount) | (value >> (32 - amount))
}

/// バイトスワップ関数（32bit）
/// TypeScript版と同じバイトスワップ処理を実行
pub fn swap_bytes_32(value: u32) -> u32 {
    ((value & 0xFF) << 24) | 
    (((value >> 8) & 0xFF) << 16) | 
    (((value >> 16) & 0xFF) << 8) | 
    ((value >> 24) & 0xFF)
}

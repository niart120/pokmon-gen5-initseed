/// ポケモンBW/BW2特化SHA-1のSIMD実装
/// WebAssembly SIMD命令を使用して4つのメッセージを並列処理
use wasm_bindgen::prelude::*;
use crate::sha1::calculate_pokemon_seed_from_hash;

#[cfg(target_arch = "wasm32")]
use core::arch::wasm32::*;

/// 非SIMD環境用のフォールバック実装
#[cfg(not(target_arch = "wasm32"))]
pub fn calculate_pokemon_sha1_simd(messages: &[u32; 64]) -> [u32; 20] {
    let mut results = [0u32; 20];
    
    // 4組のメッセージを通常のSHA-1で処理
    for i in 0..4 {
        let start_idx = i * 16;
        let mut message = [0u32; 16];
        message.copy_from_slice(&messages[start_idx..start_idx + 16]);
        
        let (h0, h1, h2, h3, h4) = crate::sha1::calculate_pokemon_sha1(&message);
        
        let base_idx = i * 5;
        results[base_idx] = h0;
        results[base_idx + 1] = h1;
        results[base_idx + 2] = h2;
        results[base_idx + 3] = h3;
        results[base_idx + 4] = h4;
    }
    
    results
}

/// WASM環境用の本格的SIMD実装
/// 4組の16ワードメッセージを並列処理し、4組のハッシュ値を返す
#[cfg(target_arch = "wasm32")]
pub fn calculate_pokemon_sha1_simd(messages: &[u32; 64]) -> [u32; 20] {
    // SHA-1初期値をSIMDベクトルとして準備
    let h0_init = u32x4_splat(0x67452301);
    let h1_init = u32x4_splat(0xEFCDAB89);
    let h2_init = u32x4_splat(0x98BADCFE);
    let h3_init = u32x4_splat(0x10325476);
    let h4_init = u32x4_splat(0xC3D2E1F0);

    // 80ワードのメッセージスケジュール配列（4組分並列）
    let mut w = [u32x4_splat(0); 80];
    
    // 最初の16ワードを4組分並列でロード
    for i in 0..16 {
        let lane0 = messages[i];           // 1組目
        let lane1 = messages[16 + i];      // 2組目
        let lane2 = messages[32 + i];      // 3組目
        let lane3 = messages[48 + i];      // 4組目
        
        w[i] = u32x4(lane0, lane1, lane2, lane3);
    }
    
    // 残りの64ワードを計算（メッセージ拡張）
    for i in 16..80 {
        let w3 = w[i-3];
        let w8 = w[i-8];
        let w14 = w[i-14];
        let w16 = w[i-16];
        
        // w[i] = left_rotate(w[i-3] ^ w[i-8] ^ w[i-14] ^ w[i-16], 1)
        let xor_result = v128_xor(v128_xor(v128_xor(w3, w8), w14), w16);
        w[i] = simd_left_rotate(xor_result, 1);
    }
    
    // メイン処理ループ用変数
    let mut a = h0_init;
    let mut b = h1_init;
    let mut c = h2_init;
    let mut d = h3_init;
    let mut e = h4_init;

    // ラウンド定数
    let k1 = u32x4_splat(0x5A827999);
    let k2 = u32x4_splat(0x6ED9EBA1);
    let k3 = u32x4_splat(0x8F1BBCDC);
    let k4 = u32x4_splat(0xCA62C1D6);

    // 80ラウンドの処理
    for i in 0..80 {
        let (f, k) = match i {
            0..=19 => (simd_choice(b, c, d), k1),
            20..=39 => (simd_parity(b, c, d), k2),
            40..=59 => (simd_majority(b, c, d), k3),
            60..=79 => (simd_parity(b, c, d), k4),
            _ => unreachable!(),
        };
        
        // temp = left_rotate(a, 5) + f + e + k + w[i]
        let temp = u32x4_add(
            u32x4_add(
                u32x4_add(
                    u32x4_add(simd_left_rotate(a, 5), f),
                    e
                ),
                k
            ),
            w[i]
        );
        
        e = d;
        d = c;
        c = simd_left_rotate(b, 30);
        b = a;
        a = temp;
    }
    
    // 最終ハッシュ値計算
    let h0_final = u32x4_add(h0_init, a);
    let h1_final = u32x4_add(h1_init, b);
    let h2_final = u32x4_add(h2_init, c);
    let h3_final = u32x4_add(h3_init, d);
    let h4_final = u32x4_add(h4_init, e);
    
    // 結果を配列に展開
    let mut results = [0u32; 20];
    
    // 各レーンから値を抽出
    for lane in 0..4 {
        let base_idx = lane * 5;
        match lane {
            0 => {
                results[base_idx] = u32x4_extract_lane::<0>(h0_final);
                results[base_idx + 1] = u32x4_extract_lane::<0>(h1_final);
                results[base_idx + 2] = u32x4_extract_lane::<0>(h2_final);
                results[base_idx + 3] = u32x4_extract_lane::<0>(h3_final);
                results[base_idx + 4] = u32x4_extract_lane::<0>(h4_final);
            },
            1 => {
                results[base_idx] = u32x4_extract_lane::<1>(h0_final);
                results[base_idx + 1] = u32x4_extract_lane::<1>(h1_final);
                results[base_idx + 2] = u32x4_extract_lane::<1>(h2_final);
                results[base_idx + 3] = u32x4_extract_lane::<1>(h3_final);
                results[base_idx + 4] = u32x4_extract_lane::<1>(h4_final);
            },
            2 => {
                results[base_idx] = u32x4_extract_lane::<2>(h0_final);
                results[base_idx + 1] = u32x4_extract_lane::<2>(h1_final);
                results[base_idx + 2] = u32x4_extract_lane::<2>(h2_final);
                results[base_idx + 3] = u32x4_extract_lane::<2>(h3_final);
                results[base_idx + 4] = u32x4_extract_lane::<2>(h4_final);
            },
            3 => {
                results[base_idx] = u32x4_extract_lane::<3>(h0_final);
                results[base_idx + 1] = u32x4_extract_lane::<3>(h1_final);
                results[base_idx + 2] = u32x4_extract_lane::<3>(h2_final);
                results[base_idx + 3] = u32x4_extract_lane::<3>(h3_final);
                results[base_idx + 4] = u32x4_extract_lane::<3>(h4_final);
            },
            _ => unreachable!(),
        }
    }
    
    results
}

/// SIMD版choice関数: (x & y) | (!x & z)
#[cfg(target_arch = "wasm32")]
#[inline]
fn simd_choice(x: v128, y: v128, z: v128) -> v128 {
    v128_or(v128_and(x, y), v128_andnot(z, x))
}

/// SIMD版parity関数: x ^ y ^ z
#[cfg(target_arch = "wasm32")]
#[inline]
fn simd_parity(x: v128, y: v128, z: v128) -> v128 {
    v128_xor(v128_xor(x, y), z)
}

/// SIMD版majority関数: (x & y) | (x & z) | (y & z)
#[cfg(target_arch = "wasm32")]
#[inline]
fn simd_majority(x: v128, y: v128, z: v128) -> v128 {
    v128_or(v128_or(v128_and(x, y), v128_and(x, z)), v128_and(y, z))
}

/// SIMD版左回転関数
#[cfg(target_arch = "wasm32")]
#[inline]
fn simd_left_rotate(value: v128, amount: u32) -> v128 {
    let left = u32x4_shl(value, amount);
    let right = u32x4_shr(value, 32 - amount);
    v128_or(left, right)
}

/// SIMD版バイトスワップ（32bit × 4）
#[cfg(target_arch = "wasm32")]
#[inline]
fn simd_swap_bytes_32(value: v128) -> v128 {
    // バイトシャッフルマスク: 3,2,1,0, 7,6,5,4, 11,10,9,8, 15,14,13,12
    let shuffle_mask = i8x16(3,2,1,0, 7,6,5,4, 11,10,9,8, 15,14,13,12);
    i8x16_swizzle(value, shuffle_mask)
}

/// WebAssembly公開用SIMD SHA-1関数
#[wasm_bindgen]
pub fn calculate_sha1_simd(messages: &[u32]) -> Vec<u32> {
    if messages.len() != 64 {
        return vec![0];
    }
    
    let mut msg_array = [0u32; 64];
    msg_array.copy_from_slice(messages);
    
    let hash_results = calculate_pokemon_sha1_simd(&msg_array);
    
    // 各組のseedも計算して含める
    let mut results = Vec::with_capacity(24); // 4組 × (seed + 5 hash values)
    
    for i in 0..4 {
        let base_idx = i * 5;
        let h0 = hash_results[base_idx];
        let h1 = hash_results[base_idx + 1];
        let h2 = hash_results[base_idx + 2];
        let h3 = hash_results[base_idx + 3];
        let h4 = hash_results[base_idx + 4];
        
        // 通常のLCG計算を使用
        let seed = calculate_pokemon_seed_from_hash(h0, h1);
        
        results.push(seed);
        results.push(h0);
        results.push(h1);
        results.push(h2);
        results.push(h3);
        results.push(h4);
    }
    
    results
}

/// バッチ処理用関数（SIMD版を内部で使用）
#[wasm_bindgen]
pub fn calculate_sha1_batch_simd(messages: &[u32], batch_size: u32) -> Vec<u32> {
    let batch_size = batch_size as usize;
    let mut results = Vec::with_capacity(batch_size * 6);
    
    // 4組ずつSIMDで処理
    let simd_batches = batch_size / 4;
    let remainder = batch_size % 4;
    
    for batch in 0..simd_batches {
        let start_idx = batch * 64;
        if start_idx + 64 <= messages.len() {
            let simd_results = calculate_sha1_simd(&messages[start_idx..start_idx + 64]);
            results.extend_from_slice(&simd_results);
        }
    }
    
    // 残りは通常の処理
    if remainder > 0 {
        let start_idx = simd_batches * 64;
        for i in 0..remainder {
            let msg_start = start_idx + i * 16;
            if msg_start + 16 <= messages.len() {
                let single_result = crate::sha1::calculate_sha1_hash(&messages[msg_start..msg_start + 16]);
                results.extend_from_slice(&single_result);
            }
        }
    }
    
    results
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_simd_sha1_consistency() {
        // 4組の同じメッセージでテスト
        let message = [
            0x02215f10, 0x01000000, 0xc0000000, 0x00007fff,
            0x12345678, 0x9abcdef0, 0x00000000, 0x00000000,
            0x00000000, 0x00000000, 0x00000000, 0x00000000,
            0x00000000, 0x00000000, 0x00000000, 0x00000000,
        ];
        
        let mut messages = [0u32; 64];
        for i in 0..4 {
            messages[i*16..(i+1)*16].copy_from_slice(&message);
        }
        
        let simd_results = calculate_pokemon_sha1_simd(&messages);
        
        // 通常版の結果と比較
        let (h0, h1, h2, h3, h4) = crate::sha1::calculate_pokemon_sha1(&message);
        
        // 4組とも同じ結果になるはず
        for i in 0..4 {
            assert_eq!(simd_results[i*5], h0);
            assert_eq!(simd_results[i*5 + 1], h1);
            assert_eq!(simd_results[i*5 + 2], h2);
            assert_eq!(simd_results[i*5 + 3], h3);
            assert_eq!(simd_results[i*5 + 4], h4);
        }
    }

    #[test]
    fn test_simd_basic_performance() {
        use std::time::Instant;
        
        // 基本的なパフォーマンステスト（小規模）
        let messages = [
            // 4組の異なるメッセージ
            0x02215f10, 0x01000000, 0xc0000000, 0x00007fff,
            0x12345678, 0x9abcdef0, 0x00000000, 0x00000000,
            0x00000000, 0x00000000, 0x00000000, 0x00000000,
            0x00000000, 0x00000000, 0x00000000, 0x00000000,
            
            0x12345678, 0x87654321, 0xabcdef01, 0x23456789,
            0x01234567, 0x89abcdef, 0x00000000, 0x00000000,
            0x00000000, 0x00000000, 0x00000000, 0x00000000,
            0x00000000, 0x00000000, 0x00000000, 0x00000000,
            
            0xfedcba98, 0x76543210, 0x13579bdf, 0x2468ace0,
            0xffeeddcc, 0xbbaa9988, 0x00000000, 0x00000000,
            0x00000000, 0x00000000, 0x00000000, 0x00000000,
            0x00000000, 0x00000000, 0x00000000, 0x00000000,
            
            0x11223344, 0x55667788, 0x99aabbcc, 0xddeeff00,
            0xa1b2c3d4, 0xe5f6a7b8, 0x00000000, 0x00000000,
            0x00000000, 0x00000000, 0x00000000, 0x00000000,
            0x00000000, 0x00000000, 0x00000000, 0x00000000,
        ];
        
        let iterations = 1000;  // 小規模テスト
        
        // SIMD実装のテスト
        let start = Instant::now();
        let mut simd_checksum = 0u64;
        
        for _ in 0..iterations {
            let simd_results = calculate_pokemon_sha1_simd(&messages);
            for i in 0..4 {
                let base_idx = i * 5;
                simd_checksum = simd_checksum.wrapping_add(simd_results[base_idx] as u64);
            }
        }
        
        let simd_duration = start.elapsed();
        
        // 通常実装のテスト
        let start = Instant::now();
        let mut normal_checksum = 0u64;
        
        for _ in 0..iterations {
            for i in 0..4 {
                let start_idx = i * 16;
                let mut message = [0u32; 16];
                message.copy_from_slice(&messages[start_idx..start_idx + 16]);
                
                let (h0, _h1, _h2, _h3, _h4) = crate::sha1::calculate_pokemon_sha1(&message);
                normal_checksum = normal_checksum.wrapping_add(h0 as u64);
            }
        }
        
        let normal_duration = start.elapsed();
        
        // 基本的な整合性チェック
        assert_ne!(simd_checksum, 0, "SIMD実装の結果が0");
        assert_ne!(normal_checksum, 0, "通常実装の結果が0");
        
        // 計算時間が妥当であることを確認（10秒以内）
        assert!(simd_duration.as_secs() < 10, "SIMD実装が10秒以上かかっている");
        assert!(normal_duration.as_secs() < 10, "通常実装が10秒以上かかっている");
        
        println!("SIMD基本性能テスト完了 - SIMD: {:?}, Normal: {:?}", simd_duration, normal_duration);
    }
}
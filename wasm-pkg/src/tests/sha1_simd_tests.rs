/// SHA-1 SIMD実装のテストコード
use crate::sha1_simd::calculate_pokemon_sha1_simd;

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Instant;

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
    fn test_simd_different_messages() {
        // 4組の異なるメッセージでテスト
        let messages = [
            // Message 1
            0x02215f10, 0x01000000, 0xc0000000, 0x00007fff,
            0x12345678, 0x9abcdef0, 0x00000000, 0x00000000,
            0x00000000, 0x00000000, 0x00000000, 0x00000000,
            0x00000000, 0x00000000, 0x00000000, 0x00000000,
            
            // Message 2
            0x12345678, 0x87654321, 0xabcdef01, 0x23456789,
            0x01234567, 0x89abcdef, 0x00000000, 0x00000000,
            0x00000000, 0x00000000, 0x00000000, 0x00000000,
            0x00000000, 0x00000000, 0x00000000, 0x00000000,
            
            // Message 3
            0xfedcba98, 0x76543210, 0x13579bdf, 0x2468ace0,
            0xffeeddcc, 0xbbaa9988, 0x00000000, 0x00000000,
            0x00000000, 0x00000000, 0x00000000, 0x00000000,
            0x00000000, 0x00000000, 0x00000000, 0x00000000,
            
            // Message 4
            0x11223344, 0x55667788, 0x99aabbcc, 0xddeeff00,
            0xa1b2c3d4, 0xe5f6a7b8, 0x00000000, 0x00000000,
            0x00000000, 0x00000000, 0x00000000, 0x00000000,
            0x00000000, 0x00000000, 0x00000000, 0x00000000,
        ];
        
        let simd_results = calculate_pokemon_sha1_simd(&messages);
        
        // 各メッセージを個別に通常版で計算して比較
        for i in 0..4 {
            let start_idx = i * 16;
            let mut message = [0u32; 16];
            message.copy_from_slice(&messages[start_idx..start_idx + 16]);
            
            let (h0, h1, h2, h3, h4) = crate::sha1::calculate_pokemon_sha1(&message);
            
            let result_base = i * 5;
            assert_eq!(simd_results[result_base], h0, "h0 mismatch for message {}", i);
            assert_eq!(simd_results[result_base + 1], h1, "h1 mismatch for message {}", i);
            assert_eq!(simd_results[result_base + 2], h2, "h2 mismatch for message {}", i);
            assert_eq!(simd_results[result_base + 3], h3, "h3 mismatch for message {}", i);
            assert_eq!(simd_results[result_base + 4], h4, "h4 mismatch for message {}", i);
        }
    }

    #[test]
    fn test_simd_basic_performance() {
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

    #[test]
    fn test_simd_deterministic() {
        // SIMD実装が決定的な結果を返すことを確認
        let messages = [
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

        let results_1 = calculate_pokemon_sha1_simd(&messages);
        let results_2 = calculate_pokemon_sha1_simd(&messages);

        // 全ての結果が同じことを確認
        for i in 0..20 {  // 4 messages × 5 hash values
            assert_eq!(results_1[i], results_2[i], "Deterministic test failed at index {}", i);
        }
    }

    #[test]
    fn test_simd_output_format() {
        // SIMD実装の出力フォーマットが正しいことを確認
        let messages = [
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

        let results = calculate_pokemon_sha1_simd(&messages);

        // 結果配列の長さが正しいことを確認 (4 messages × 5 hash values = 20)
        assert_eq!(results.len(), 20);

        // 各ハッシュ値が0でないことを確認
        for i in 0..4 {
            let base_idx = i * 5;
            assert_ne!(results[base_idx], 0, "h0 is 0 for message {}", i);
            assert_ne!(results[base_idx + 1], 0, "h1 is 0 for message {}", i);
            assert_ne!(results[base_idx + 2], 0, "h2 is 0 for message {}", i);
            assert_ne!(results[base_idx + 3], 0, "h3 is 0 for message {}", i);
            assert_ne!(results[base_idx + 4], 0, "h4 is 0 for message {}", i);
        }
    }
}

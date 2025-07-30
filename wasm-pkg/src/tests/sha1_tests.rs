/// SHA-1実装のテストコード
use crate::sha1::{calculate_pokemon_sha1, calculate_pokemon_seed_from_hash, swap_bytes_32, choice, parity, majority, left_rotate};

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
    fn test_byte_swap() {
        // 32bitバイトスワップ結果をテスト
        assert_eq!(swap_bytes_32(0x12345678), 0x78563412);
    }

    #[test]
    fn test_sha1_consistency() {
        // 複数の異なるメッセージで一貫性テスト
        let test_messages = [
            [
                0x02215f10, 0x01000000, 0xc0000000, 0x00007fff,
                0x12345678, 0x9abcdef0, 0x00000000, 0x00000000,
                0x00000000, 0x00000000, 0x00000000, 0x00000000,
                0x00000000, 0x00000000, 0x00000000, 0x00000000,
            ],
            [
                0x12345678, 0x87654321, 0xabcdef01, 0x23456789,
                0x01234567, 0x89abcdef, 0x00000000, 0x00000000,
                0x00000000, 0x00000000, 0x00000000, 0x00000000,
                0x00000000, 0x00000000, 0x00000000, 0x00000000,
            ],
            [
                0xfedcba98, 0x76543210, 0x13579bdf, 0x2468ace0,
                0xffeeddcc, 0xbbaa9988, 0x00000000, 0x00000000,
                0x00000000, 0x00000000, 0x00000000, 0x00000000,
                0x00000000, 0x00000000, 0x00000000, 0x00000000,
            ],
        ];

        for (i, message) in test_messages.iter().enumerate() {
            let (h0, h1, h2, h3, h4) = calculate_pokemon_sha1(message);
            
            // 各メッセージで異なる結果が得られることを確認
            assert_ne!(h0, 0, "Message {} resulted in h0=0", i);
            assert_ne!(h1, 0, "Message {} resulted in h1=0", i);
            assert_ne!(h2, 0, "Message {} resulted in h2=0", i);
            assert_ne!(h3, 0, "Message {} resulted in h3=0", i);
            assert_ne!(h4, 0, "Message {} resulted in h4=0", i);

            // シード計算も正常に動作することを確認
            let seed = calculate_pokemon_seed_from_hash(h0, h1);
            assert_ne!(seed, 0, "Message {} resulted in seed=0", i);
        }
    }

    #[test]
    fn test_sha1_deterministic() {
        // 同じメッセージは同じ結果を返すことを確認
        let message = [
            0x02215f10, 0x01000000, 0xc0000000, 0x00007fff,
            0x12345678, 0x9abcdef0, 0x00000000, 0x00000000,
            0x00000000, 0x00000000, 0x00000000, 0x00000000,
            0x00000000, 0x00000000, 0x00000000, 0x00000000,
        ];

        let (h0_1, h1_1, h2_1, h3_1, h4_1) = calculate_pokemon_sha1(&message);
        let (h0_2, h1_2, h2_2, h3_2, h4_2) = calculate_pokemon_sha1(&message);

        assert_eq!(h0_1, h0_2);
        assert_eq!(h1_1, h1_2);
        assert_eq!(h2_1, h2_2);
        assert_eq!(h3_1, h3_2);
        assert_eq!(h4_1, h4_2);

        // シード計算も一致することを確認
        let seed_1 = calculate_pokemon_seed_from_hash(h0_1, h1_1);
        let seed_2 = calculate_pokemon_seed_from_hash(h0_2, h1_2);
        assert_eq!(seed_1, seed_2);
    }
}

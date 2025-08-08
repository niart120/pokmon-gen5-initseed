/// オフセット計算と個体生成を統合したエンドツーエンドテスト

use crate::pokemon_generator::{PokemonGenerator, BWGenerationConfig};
use crate::offset_calculator::{GameMode, calculate_game_offset};
use crate::encounter_calculator::{GameVersion, EncounterType};
use crate::personality_rng::PersonalityRNG;
use crate::pid_shiny_checker::ShinyChecker;

/// 実ツール検証パターン1のテスト
/// 初期シード: 0x11111, ゲームモード: BW2続きから(思い出リンク無し), 遭遇タイプ: 通常エンカウント
#[test]
fn test_integrated_generation_pattern1_bw2_continue_no_memory_link() {
    // テストケース設定
    let initial_seed = 0x11111u64;
    let game_mode = GameMode::Bw2ContinueNoMemoryLink;
    let encounter_type = EncounterType::Normal;
    let tid = 54321u16;
    let sid = 12345u16;
    
    // 期待値（実ツール検証結果）
    let expected_generation_seed = 0x181A996368932CFCu64;
    let expected_pid = 0x5642E610u32;
    let expected_nature = 1u8; // さみしがり（Lonely）
    let expected_ability_slot = 0u8;
    let expected_gender_value = 0x10u8;
    let expected_encounter_slot = 0u8;
    let expected_is_shiny = false;
    
    // Step 1: オフセット計算
    let offset = calculate_game_offset(initial_seed, game_mode);
    println!("Pattern1 Debug: Initial seed: 0x{:016X}", initial_seed);
    println!("Pattern1 Debug: Calculated offset: {}", offset);
    
    // Step 2: オフセット後のシード値計算
    let generation_seed = PersonalityRNG::jump_seed(initial_seed, offset as u64);
    println!("Pattern1 Debug: Generation seed: 0x{:016X}", generation_seed);
    println!("Pattern1 Debug: Expected seed: 0x{:016X}", expected_generation_seed);
    
    // Step 3: 計算されたシード値が期待値と一致することを確認
    assert_eq!(
        generation_seed, 
        expected_generation_seed,
        "Pattern1: 生成時のシード値が期待値と一致しません。calculated: 0x{:016X}, expected: 0x{:016X}",
        generation_seed,
        expected_generation_seed
    );
    
    // Step 4: ポケモン生成設定
    let config = BWGenerationConfig::new(
        GameVersion::BlackWhite2,
        encounter_type,
        tid,
        sid,
        false, // シンクロ無効
        0,     // シンクロ性格（未使用）
    );
    
    // Step 5: ポケモン生成実行
    let pokemon = PokemonGenerator::generate_single_pokemon_bw(generation_seed, &config);
    
    // Step 6: 検証
    assert_eq!(
        pokemon.get_pid(), 
        expected_pid,
        "Pattern1: PIDが期待値と一致しません。calculated: 0x{:08X}, expected: 0x{:08X}",
        pokemon.get_pid(),
        expected_pid
    );
    
    assert_eq!(
        pokemon.get_nature(), 
        expected_nature,
        "Pattern1: 性格が期待値と一致しません。calculated: {}, expected: {} (さみしがり)",
        pokemon.get_nature(),
        expected_nature
    );
    
    assert_eq!(
        pokemon.get_ability_slot(), 
        expected_ability_slot,
        "Pattern1: 特性スロットが期待値と一致しません。calculated: {}, expected: {}",
        pokemon.get_ability_slot(),
        expected_ability_slot
    );
    
    assert_eq!(
        pokemon.get_gender_value(), 
        expected_gender_value,
        "Pattern1: 性別値が期待値と一致しません。calculated: 0x{:02X}, expected: 0x{:02X}",
        pokemon.get_gender_value(),
        expected_gender_value
    );
    
    assert_eq!(
        pokemon.get_encounter_slot_value(), 
        expected_encounter_slot,
        "Pattern1: 遭遇スロット値が期待値と一致しません。calculated: {}, expected: {}",
        pokemon.get_encounter_slot_value(),
        expected_encounter_slot
    );
    
    assert_eq!(
        pokemon.get_shiny_type() != 0,
        expected_is_shiny,
        "Pattern1: 色違い種別が期待値と一致しません。calculated type: {}, expected is_shiny: {}",
        pokemon.get_shiny_type(),
        expected_is_shiny
    );
    
    // Step 7: シンクロ無効確認
    assert!(!pokemon.get_sync_applied(), "Pattern1: シンクロが無効化されていません");
    
    // Step 8: エンカウントタイプ確認
    assert_eq!(
        pokemon.get_encounter_type(), 
        0,  // Normal encounter type
        "Pattern1: エンカウントタイプが期待値と一致しません"
    );
    
    println!("✓ Pattern1 (BW2続きから思い出リンク無し + 通常エンカウント) デバッグ完了");
}

/// 実ツール検証パターン2のテスト
/// 初期シード: 0x77777, ゲームモード: BW続きから, 遭遇タイプ: なみのり
#[test]
fn test_integrated_generation_pattern2_bw_continue_surfing() {
    // テストケース設定
    let initial_seed = 0x77777u64;
    let game_mode = GameMode::BwContinue;
    let encounter_type = EncounterType::Surfing;
    let tid = 54321u16;
    let sid = 12345u16;
    
    // 期待値（実ツール検証結果）
    let expected_generation_seed = 0x30CB71FDDDA5E880u64;
    let expected_pid = 0x8E0F06F1u32;
    let expected_nature = 17u8; // れいせい（Quiet）
    let expected_ability_slot = 1u8;
    let expected_gender_value = 0xF1u8;
    let expected_encounter_slot = 1u8;
    let expected_is_shiny = false;
    
    // Step 1: オフセット計算
    let offset = calculate_game_offset(initial_seed, game_mode);
    println!("Pattern2 Debug: Initial seed: 0x{:016X}", initial_seed);
    println!("Pattern2 Debug: Calculated offset: {}", offset);
    
    // Step 2: オフセット後のシード値計算
    let generation_seed = PersonalityRNG::jump_seed(initial_seed, offset as u64);
    println!("Pattern2 Debug: Generation seed: 0x{:016X}", generation_seed);
    println!("Pattern2 Debug: Expected seed: 0x{:016X}", expected_generation_seed);
    
    // Step 3: 計算されたシード値が期待値と一致することを確認
    assert_eq!(
        generation_seed, 
        expected_generation_seed,
        "Pattern2: 生成時のシード値が期待値と一致しません。calculated: 0x{:016X}, expected: 0x{:016X}",
        generation_seed,
        expected_generation_seed
    );
    
    // Step 4: ポケモン生成設定
    let config = BWGenerationConfig::new(
        GameVersion::BlackWhite,
        encounter_type,
        tid,
        sid,
        false, // シンクロ無効
        0,     // シンクロ性格（未使用）
    );
    
    // Step 5: ポケモン生成実行
    let pokemon = PokemonGenerator::generate_single_pokemon_bw(generation_seed, &config);
    
    // Step 6: 検証（デバッグのため一時的にコメントアウト）
    assert_eq!(
        pokemon.get_pid(), 
        expected_pid,
        "Pattern2: PIDが期待値と一致しません。calculated: 0x{:08X}, expected: 0x{:08X}",
        pokemon.get_pid(),
        expected_pid
    );
    
    assert_eq!(
        pokemon.get_nature(), 
        expected_nature,
        "Pattern2: 性格が期待値と一致しません。calculated: {}, expected: {} (れいせい)",
        pokemon.get_nature(),
        expected_nature
    );
    
    assert_eq!(
        pokemon.get_ability_slot(), 
        expected_ability_slot,
        "Pattern2: 特性スロットが期待値と一致しません。calculated: {}, expected: {}",
        pokemon.get_ability_slot(),
        expected_ability_slot
    );
    
    assert_eq!(
        pokemon.get_gender_value(), 
        expected_gender_value,
        "Pattern2: 性別値が期待値と一致しません。calculated: 0x{:02X}, expected: 0x{:02X}",
        pokemon.get_gender_value(),
        expected_gender_value
    );
    
    assert_eq!(
        pokemon.get_encounter_slot_value(), 
        expected_encounter_slot,
        "Pattern2: 遭遇スロット値が期待値と一致しません。calculated: {}, expected: {}",
        pokemon.get_encounter_slot_value(),
        expected_encounter_slot
    );
    
    assert_eq!(
        pokemon.get_shiny_type() != 0,
        expected_is_shiny,
        "Pattern2: 色違い種別が期待値と一致しません。calculated type: {}, expected is_shiny: {}",
        pokemon.get_shiny_type(),
        expected_is_shiny
    );
    
    // Step 7: シンクロ無効確認
    assert!(!pokemon.get_sync_applied(), "Pattern2: シンクロが無効化されていません");
    
    // Step 8: エンカウントタイプ確認
    assert_eq!(
        pokemon.get_encounter_type(), 
        1,  // Surfing encounter type
        "Pattern2: エンカウントタイプが期待値と一致しません"
    );
    
    println!("✓ Pattern2 (BW続きから + なみのりエンカウント) デバッグ完了");
}

/// 実ツール検証パターン3のテスト
/// 初期シード: 0x99999, ゲームモード: BW2続きから(思い出リンク有り), 遭遇タイプ: 固定シンボル(伝説)
#[test]
fn test_integrated_generation_pattern3_bw2_continue_with_memory_link_static() {
    // テストケース設定
    let initial_seed = 0x99999u64;
    let game_mode = GameMode::Bw2ContinueWithMemoryLink;
    let encounter_type = EncounterType::StaticSymbol;
    let tid = 54321u16;
    let sid = 12345u16;
    
    // 期待値（実ツール検証結果）
    let expected_generation_seed = 0xC8824BE7D559A178u64;
    let expected_pid = 0x59E0C098u32;
    let expected_nature = 15u8; // ひかえめ（Modest）
    let expected_gender_value = 0x98u8;
    let expected_is_shiny = false;

    // Step 1: オフセット計算
    let offset = calculate_game_offset(initial_seed, game_mode);
    println!("Pattern3 Debug: Initial seed: 0x{:016X}", initial_seed);
    println!("Pattern3 Debug: Calculated offset: {}", offset);
    
    // Step 2: オフセット後のシード値計算
    let generation_seed = PersonalityRNG::jump_seed(initial_seed, offset as u64);
    println!("Pattern3 Debug: Generation seed: 0x{:016X}", generation_seed);
    println!("Pattern3 Debug: Expected seed: 0x{:016X}", expected_generation_seed);
    
    // Step 3: 計算されたシード値が期待値と一致することを確認
    assert_eq!(
        generation_seed, 
        expected_generation_seed,
        "Pattern3: 生成時のシード値が期待値と一致しません。calculated: 0x{:016X}, expected: 0x{:016X}",
        generation_seed,
        expected_generation_seed
    );
    
    // Step 4: ポケモン生成設定
    let config = BWGenerationConfig::new(
        GameVersion::BlackWhite2,
        encounter_type,
        tid,
        sid,
        false, // シンクロ無効
        0,     // シンクロ性格（未使用）
    );
    
    // Step 5: ポケモン生成実行
    let pokemon = PokemonGenerator::generate_single_pokemon_bw(generation_seed, &config);
    
    // Step 6: 検証（デバッグのため一時的にコメントアウト）
    assert_eq!(
        pokemon.get_pid(), 
        expected_pid,
        "Pattern3: PIDが期待値と一致しません。calculated: 0x{:08X}, expected: 0x{:08X}",
        pokemon.get_pid(),
        expected_pid
    );
    
    assert_eq!(
        pokemon.get_nature(), 
        expected_nature,
        "Pattern3: 性格が期待値と一致しません。calculated: {}, expected: {} (ひかえめ)",
        pokemon.get_nature(),
        expected_nature
    );
    
    assert_eq!(
        pokemon.get_gender_value(), 
        expected_gender_value,
        "Pattern3: 性別値が期待値と一致しません。calculated: 0x{:02X}, expected: 0x{:02X}",
        pokemon.get_gender_value(),
        expected_gender_value
    );
    
    assert_eq!(
        pokemon.get_shiny_type() != 0, 
        expected_is_shiny,
        "Pattern3: 色違い種別が期待値と一致しません。calculated type: {}, expected is_shiny: {}",
        pokemon.get_shiny_type(),
        expected_is_shiny
    );
    
    // Step 7: シンクロ無効確認
    assert!(!pokemon.get_sync_applied(), "Pattern3: シンクロが無効化されていません");
    
    // Step 8: エンカウントタイプ確認
    assert_eq!(
        pokemon.get_encounter_type(), 
        10,  // StaticSymbol encounter type
        "Pattern3: エンカウントタイプが期待値と一致しません"
    );
    
    println!("✓ Pattern3 (BW2続きから思い出リンク有り + 固定シンボル) デバッグ完了");
}

/// パターン4: BW2続きから(思い出リンクなし) + ギフト(御三家)
/// 実ツール検証結果との突合テスト
#[test]
fn test_integrated_generation_pattern4_bw2_continue_no_memory_link_static_starter() {
    // テスト設定
    let initial_seed = 0xBBBBB;
    let game_mode = GameMode::Bw2ContinueNoMemoryLink;
    let tid = 54321;
    let sid = 12345;
    let expected_generation_seed = 0x9D0FFB4952563CF0;
    let expected_pid = 0xC4235DBEu32;
    let expected_nature = 9; // のうてんき
    let expected_gender_value = 0xBE;
    
    println!("\n===== Pattern 4: BW2続きから(思い出リンクなし) + ギフト(御三家) =====");
    println!("初期シード: 0x{:X}", initial_seed);
    println!("期待生成時seed: 0x{:016X}", expected_generation_seed);
    println!("期待PID: 0x{:08X}", expected_pid);
    println!("期待性格: {} (のうてんき)", expected_nature);
    println!("期待性別値: 0x{:02X}", expected_gender_value);
    
    // Step 1: オフセット計算
    let offset = calculate_game_offset(initial_seed, game_mode);
    println!("Pattern4 Debug: Initial seed: 0x{:016X}", initial_seed);
    println!("Pattern4 Debug: Calculated offset: {}", offset);
    
    // Step 2: オフセット後のシード値計算
    let generation_seed = PersonalityRNG::jump_seed(initial_seed, offset as u64);
    println!("Pattern4 Debug: Generation seed: 0x{:016X}", generation_seed);
    println!("Pattern4 Debug: Expected seed: 0x{:016X}", expected_generation_seed);
    
    // Step 3: 計算されたシード値が期待値と一致することを確認
    assert_eq!(
        generation_seed, 
        expected_generation_seed,
        "Pattern4: 生成時のシード値が期待値と一致しません。calculated: 0x{:016X}, expected: 0x{:016X}",
        generation_seed,
        expected_generation_seed
    );
    
    // Step 4: ポケモン生成設定
    let config = BWGenerationConfig::new(
        GameVersion::BlackWhite2,
        EncounterType::StaticStarter,
        tid,
        sid,
        false, // シンクロ無効
        0,     // シンクロ性格（未使用）
    );
    
    // Step 5: ポケモン生成実行
    let pokemon = PokemonGenerator::generate_single_pokemon_bw(generation_seed, &config);
    
    // Step 6: 検証
    assert_eq!(
        pokemon.get_pid(), 
        expected_pid,
        "Pattern4: PIDが期待値と一致しません。calculated: 0x{:08X}, expected: 0x{:08X}",
        pokemon.get_pid(),
        expected_pid
    );
    
    assert_eq!(
        pokemon.get_nature(), 
        expected_nature,
        "Pattern4: 性格が期待値と一致しません。calculated: {}, expected: {} (のうてんき)",
        pokemon.get_nature(),
        expected_nature
    );
    
    assert_eq!(
        pokemon.get_gender_value(), 
        expected_gender_value,
        "Pattern4: 性別値が期待値と一致しません。calculated: 0x{:02X}, expected: 0x{:02X}",
        pokemon.get_gender_value(),
        expected_gender_value
    );
    
}


/// 複数パターンの統合テスト（バッチ処理）
#[test]
fn test_integrated_generation_multiple_patterns() {
    let test_cases = vec![
        // (初期シード, ゲームモード, エンカウントタイプ, 期待生成シード)
        (0x11111u64, GameMode::Bw2ContinueNoMemoryLink, EncounterType::Normal, 0x181A996368932CFCu64),
        (0x77777u64, GameMode::BwContinue, EncounterType::Surfing, 0x30CB71FDDDA5E880u64),
        (0x99999u64, GameMode::Bw2ContinueWithMemoryLink, EncounterType::StaticSymbol, 0xC8824BE7D559A178u64),
    ];
    
    for (i, (initial_seed, game_mode, encounter_type, expected_generation_seed)) in test_cases.iter().enumerate() {
        let offset = calculate_game_offset(*initial_seed, *game_mode);
        let generation_seed = PersonalityRNG::jump_seed(*initial_seed, offset as u64);
        
        assert_eq!(
            generation_seed, 
            *expected_generation_seed,
            "Test case {}: 生成シードが期待値と一致しません", 
            i + 1
        );
        
        let config = BWGenerationConfig::new(
            if matches!(game_mode, GameMode::Bw2ContinueNoMemoryLink | GameMode::Bw2ContinueWithMemoryLink) { 
                GameVersion::BlackWhite2 
            } else { 
                GameVersion::BlackWhite 
            },
            *encounter_type,
            54321,
            12345,
            false,
            0,
        );
        
        let pokemon = PokemonGenerator::generate_single_pokemon_bw(generation_seed, &config);
        
        // 基本的な妥当性検証
        assert!(pokemon.get_nature() < 25, "Test case {}: 無効な性格値", i + 1);
        assert!(pokemon.get_ability_slot() <= 1, "Test case {}: 無効な特性スロット", i + 1);
        assert!(!pokemon.get_sync_applied(), "Test case {}: シンクロが意図せず適用されました", i + 1);
    }
    
    println!("✓ 複数パターンの統合テスト完了");
}

/// エラーケースの統合テスト
#[test]
fn test_integrated_generation_edge_cases() {
    // ゼロシードでの生成テスト
    let zero_seed = 0u64;
    let offset = calculate_game_offset(zero_seed, GameMode::BwContinue);
    let generation_seed = PersonalityRNG::jump_seed(zero_seed, offset as u64);
    
    let config = BWGenerationConfig::new(
        GameVersion::BlackWhite,
        EncounterType::Normal,
        0,
        0,
        false,
        0,
    );
    
    let pokemon = PokemonGenerator::generate_single_pokemon_bw(generation_seed, &config);
    
    // ゼロシードでも正常な値が生成されることを確認（advances関連の検証は削除）
    assert!(pokemon.get_nature() < 25, "ゼロシード: 無効な性格値");
    assert!(pokemon.get_ability_slot() <= 1, "ゼロシード: 無効な特性スロット");
    
    // 最大シードでの生成テスト
    let max_seed = u64::MAX;
    let offset_max = calculate_game_offset(max_seed, GameMode::BwContinue);
    let generation_seed_max = PersonalityRNG::jump_seed(max_seed, offset_max as u64);
    
    let pokemon_max = PokemonGenerator::generate_single_pokemon_bw(generation_seed_max, &config);
    
    // 最大シードでも正常な値が生成されることを確認（advances関連の検証は削除）
    assert!(pokemon_max.get_nature() < 25, "最大シード: 無効な性格値");
    assert!(pokemon_max.get_ability_slot() <= 1, "最大シード: 無効な特性スロット");
    
    println!("✓ エッジケースの統合テスト完了");
}

/// 色違い判定の統合テスト
#[test]
fn test_integrated_generation_shiny_verification() {
    // 色違いになる可能性のあるTID/SIDの組み合わせでテスト
    let config = BWGenerationConfig::new(
        GameVersion::BlackWhite,
        EncounterType::Normal,
        12345,  // 特定のTID
        54321,  // 特定のSID
        false,
        0,
    );
    
    // 複数のシードで色違い判定が正常に動作することを確認
    for seed_offset in 0..100 {
        let test_seed = 0x123456789ABCDEF0u64 + seed_offset;
        let pokemon = PokemonGenerator::generate_single_pokemon_bw(test_seed, &config);
        
        // ShinyCheckerでの直接検証
        let shiny_type = ShinyChecker::check_shiny_type(config.get_tid(), config.get_sid(), pokemon.get_pid());
        
        // 期待する色違いタイプと一致
        assert_eq!(
            pokemon.get_shiny_type(),
            shiny_type as u8,
            "Seed offset {}: 色違いタイプが一致しません",
            seed_offset
        );
    }
    
    println!("✓ 色違い判定の統合テスト完了");
}

/// PokemonGenerator - BW/BW2統合ポケモン生成エンジン
/// 全ての計算エンジンを統合し、完全なポケモンデータを生成
use wasm_bindgen::prelude::*;
use crate::personality_rng::PersonalityRNG;
use crate::encounter_calculator::{EncounterCalculator, GameVersion, EncounterType};
use crate::pid_shiny_checker::{PIDCalculator, ShinyChecker, ShinyType};

/// 生ポケモンデータ構造体
#[wasm_bindgen]
#[derive(Debug, Clone)]
pub struct RawPokemonData {
    /// 初期シード値
    seed: u64,
    /// 総乱数消費回数
    advances: u32,
    /// PID
    pid: u32,
    /// 性格値（0-24）
    nature: u8,
    /// シンクロ適用フラグ
    sync_applied: bool,
    /// 特性スロット（0-1）
    ability_slot: u8,
    /// 性別値（0-255）
    gender_value: u8,
    /// 遭遇スロット値
    encounter_slot_value: u8,
    /// エンカウントタイプ（数値保存）
    encounter_type: u8,
    /// レベル乱数値
    level_rand_value: u32,
    /// 色違いフラグ
    is_shiny: bool,
    /// 色違いタイプ
    shiny_type: u8,
}

#[wasm_bindgen]
impl RawPokemonData {
    /// getter methods for JavaScript access
    #[wasm_bindgen(getter)]
    pub fn get_seed(&self) -> u64 { self.seed }
    
    #[wasm_bindgen(getter)]
    pub fn get_pid(&self) -> u32 { self.pid }
    
    #[wasm_bindgen(getter)]
    pub fn get_nature(&self) -> u8 { self.nature }
    
    #[wasm_bindgen(getter)]
    pub fn get_ability_slot(&self) -> u8 { self.ability_slot }
    
    #[wasm_bindgen(getter)]
    pub fn get_gender_value(&self) -> u8 { self.gender_value }
    
    #[wasm_bindgen(getter)]
    pub fn get_encounter_slot_value(&self) -> u8 { self.encounter_slot_value }
    
    #[wasm_bindgen(getter)]
    pub fn get_level_rand_value(&self) -> u32 { self.level_rand_value }
    
    #[wasm_bindgen(getter)]
    pub fn get_is_shiny(&self) -> bool { self.is_shiny }
    
    #[wasm_bindgen(getter)]
    pub fn get_shiny_type(&self) -> u8 { self.shiny_type }
    
    #[wasm_bindgen(getter)]
    pub fn get_advances(&self) -> u32 { self.advances }
    
    #[wasm_bindgen(getter)]
    pub fn get_sync_applied(&self) -> bool { self.sync_applied }
    
    #[wasm_bindgen(getter)]
    pub fn get_encounter_type(&self) -> u8 { self.encounter_type }
}

/// BW/BW2準拠設定構造体
#[wasm_bindgen]
#[derive(Debug, Clone)]
pub struct BWGenerationConfig {
    /// ゲームバージョン
    version: GameVersion,
    /// 遭遇タイプ
    encounter_type: EncounterType,
    /// トレーナーID
    tid: u16,
    /// シークレットID
    sid: u16,
    /// シンクロ有効フラグ
    sync_enabled: bool,
    /// シンクロ性格ID（0-24）
    sync_nature_id: u8,
}

#[wasm_bindgen]
impl BWGenerationConfig {
    /// 新しいBW準拠設定を作成
    #[wasm_bindgen(constructor)]
    pub fn new(
        version: GameVersion,
        encounter_type: EncounterType,
        tid: u16,
        sid: u16,
        sync_enabled: bool,
        sync_nature_id: u8,
    ) -> BWGenerationConfig {
        BWGenerationConfig {
            version,
            encounter_type,
            tid,
            sid,
            sync_enabled,
            sync_nature_id,
        }
    }

    /// getter methods
    #[wasm_bindgen(getter)]
    pub fn get_version(&self) -> GameVersion { self.version }
    
    #[wasm_bindgen(getter)]
    pub fn get_encounter_type(&self) -> EncounterType { self.encounter_type }
    
    #[wasm_bindgen(getter)]
    pub fn get_tid(&self) -> u16 { self.tid }
    
    #[wasm_bindgen(getter)]
    pub fn get_sid(&self) -> u16 { self.sid }
    
    #[wasm_bindgen(getter)]
    pub fn get_sync_enabled(&self) -> bool { self.sync_enabled }
    
    #[wasm_bindgen(getter)]
    pub fn get_sync_nature_id(&self) -> u8 { self.sync_nature_id }
}

/// ポケモン生成エンジン
#[wasm_bindgen]
pub struct PokemonGenerator;

#[wasm_bindgen]
impl PokemonGenerator {
    /// 新しいPokemonGeneratorインスタンスを作成
    #[wasm_bindgen(constructor)]
    pub fn new() -> PokemonGenerator {
        PokemonGenerator
    }

    /// BW/BW2準拠 単体ポケモン生成
    /// 
    /// # Arguments
    /// * `seed` - 初期シード値
    /// * `config` - BW準拠設定
    /// 
    /// # Returns
    /// 生成されたポケモンデータ
    pub fn generate_single_pokemon_bw(
        seed: u64, 
        config: &BWGenerationConfig
    ) -> RawPokemonData {
        let mut rng = PersonalityRNG::new(seed);
        let start_seed = seed;
        let mut total_advances = 0;
        
        // Step 1: シンクロ判定・性格決定
        let (sync_applied, nature_id) = Self::resolve_sync_and_nature(
            &mut rng, 
            &mut total_advances, 
            config.encounter_type, 
            config.sync_enabled, 
            config.sync_nature_id
        );
        
        // Step 2: 遭遇スロット決定
        let encounter_slot_value = EncounterCalculator::calculate_encounter_slot(
            config.version,
            config.encounter_type,
            rng.next()
        );
        total_advances += 1;
        
        // Step 3: PID生成（encounter_type依存）
        let pid = if Self::is_wild_encounter(config.encounter_type) {
            // 野生エンカウント: r1[n] ^ 0x00010000
            let pid_base = rng.next();
            total_advances += 1;
            PIDCalculator::generate_wild_pid(pid_base)
        } else {
            // 固定・徘徊: r1[n] (XOR無し)
            let pid_base = rng.next();
            total_advances += 1;
            PIDCalculator::generate_static_pid(pid_base)
        };
        
        // Step 4: レベル乱数決定（encounter_type依存）
        let level_rand_value = Self::calculate_level_rand_with_advances(
            &mut rng, 
            &mut total_advances, 
            config.encounter_type
        );
        
        // Step 5-7: その他計算
        let ability_slot = ((pid >> 16) & 1) as u8;
        let gender_value = (pid & 0xFF) as u8;
        
        let shiny_type_enum = ShinyChecker::check_shiny_type(config.tid, config.sid, pid);
        let is_shiny = shiny_type_enum != ShinyType::Normal;
        let shiny_type = shiny_type_enum as u8;
        
        RawPokemonData {
            seed: start_seed,
            advances: total_advances,
            pid,
            nature: nature_id,
            sync_applied,
            ability_slot,
            gender_value,
            encounter_slot_value,
            encounter_type: Self::encounter_type_to_u8(config.encounter_type),
            level_rand_value,
            is_shiny,
            shiny_type,
        }
    }

    /// BW/BW2準拠 バッチポケモン生成
    /// 
    /// # Arguments
    /// * `start_seed` - 開始シード値
    /// * `count` - 生成数
    /// * `config` - BW準拠設定
    /// 
    /// # Returns
    /// 生成されたポケモンデータの配列
    pub fn generate_pokemon_batch_bw(
        start_seed: u64,
        count: u32,
        config: &BWGenerationConfig,
    ) -> Vec<RawPokemonData> {
        let mut results = Vec::with_capacity(count as usize);
        
        for i in 0..count {
            let current_seed = PersonalityRNG::jump_seed(start_seed, i as u64);
            let pokemon = Self::generate_single_pokemon_bw(current_seed, config);
            results.push(pokemon);
        }
        
        results
    }

    /// 内部使用：シンクロ対応エンカウント判定
    fn supports_sync(encounter_type: EncounterType) -> bool {
        matches!(encounter_type, 
            EncounterType::Normal | EncounterType::Surfing | EncounterType::Fishing |
            EncounterType::ShakingGrass | EncounterType::DustCloud | 
            EncounterType::PokemonShadow | EncounterType::SurfingBubble | 
            EncounterType::FishingBubble | EncounterType::StaticSymbol
        )
    }

    /// 内部使用：野生エンカウント判定
    fn is_wild_encounter(encounter_type: EncounterType) -> bool {
        matches!(encounter_type, 
            EncounterType::Normal | EncounterType::Surfing | EncounterType::Fishing |
            EncounterType::ShakingGrass | EncounterType::DustCloud | 
            EncounterType::PokemonShadow | EncounterType::SurfingBubble | 
            EncounterType::FishingBubble
        )
    }

    /// 内部使用：シンクロ判定・性格決定の統合処理（状態ベースmatch版）
    /// 
    /// # Arguments
    /// * `rng` - 乱数生成器
    /// * `advances` - 乱数消費回数
    /// * `encounter_type` - 遭遇タイプ
    /// * `sync_enabled` - シンクロ有効フラグ
    /// * `sync_nature_id` - シンクロ性格ID
    /// 
    /// # Returns
    /// (シンクロ適用フラグ, 性格ID)
    fn resolve_sync_and_nature(
        rng: &mut PersonalityRNG,
        advances: &mut u32,
        encounter_type: EncounterType,
        sync_enabled: bool,
        sync_nature_id: u8,
    ) -> (bool, u8) {
        // シンクロ処理状態を定義
        #[derive(Debug)]
        enum SyncState {
            Disabled,        // シンクロ無効エンカウント
            NotConfigured,   // シンクロ設定無効
            Active,          // シンクロ判定実行
        }
        
        let sync_state = match (Self::supports_sync(encounter_type), sync_enabled) {
            (false, _) => SyncState::Disabled,
            (true, false) => SyncState::NotConfigured,
            (true, true) => SyncState::Active,
        };
        
        match sync_state {
            SyncState::Disabled => {
                // シンクロ無効: 通常の性格決定のみ
                (false, Self::roll_nature(rng, advances))
            }
            SyncState::NotConfigured | SyncState::Active => {
                // シンクロ有効エンカウント: 常にシンクロ判定→性格決定の両方を実行
                let sync_success = rng.sync_check();
                *advances += 1;
                
                if sync_success && matches!(sync_state, SyncState::Active) {
                    // シンクロ成功 & 設定有効時のみ特性で上書き
                    (true, sync_nature_id)
                } else {
                    // シンクロ失敗 or 設定無効時は通常の性格決定
                    (false, Self::roll_nature(rng, advances))
                }
            }
        }
    }

    /// 内部使用：性格決定（乱数消費込み）
    fn roll_nature(rng: &mut PersonalityRNG, advances: &mut u32) -> u8 {
        let nature = rng.nature_roll();
        *advances += 1;
        nature as u8
    }

    /// 内部使用：EncounterType → u8 変換
    fn encounter_type_to_u8(encounter_type: EncounterType) -> u8 {
        match encounter_type {
            EncounterType::Normal => 0,
            EncounterType::Surfing => 1,
            EncounterType::Fishing => 2,
            EncounterType::ShakingGrass => 3,
            EncounterType::DustCloud => 4,
            EncounterType::PokemonShadow => 5,
            EncounterType::SurfingBubble => 6,
            EncounterType::FishingBubble => 7,
            EncounterType::StaticSymbol => 10,
            EncounterType::StaticStarter => 11,
            EncounterType::StaticFossil => 12,
            EncounterType::StaticEvent => 13,
            EncounterType::Roaming => 20,
        }
    }

    /// 内部使用：レベル乱数処理（ドキュメント仕様準拠）
    fn calculate_level_rand_with_advances(
        rng: &mut PersonalityRNG,
        advances: &mut u32,
        encounter_type: EncounterType,
    ) -> u32 {
        match encounter_type {
            // 固定レベル（乱数消費するが結果未使用）
            EncounterType::Normal | EncounterType::ShakingGrass | 
            EncounterType::DustCloud | EncounterType::PokemonShadow => {
                let level_rand = rng.next();
                *advances += 1;
                level_rand  // プレースホルダー値
            },
            
            // 可変レベル（乱数値を実際に使用）
            EncounterType::Surfing | EncounterType::Fishing | 
            EncounterType::SurfingBubble | EncounterType::FishingBubble => {
                let level_rand = rng.next();
                *advances += 1;
                level_rand  // TypeScript側で実際のレベル計算に使用
            },
            
            // 乱数消費なし
            EncounterType::StaticSymbol | EncounterType::StaticStarter | 
            EncounterType::StaticFossil | EncounterType::StaticEvent | EncounterType::Roaming => {
                0  // 乱数消費なし
            },
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_bw_test_config() -> BWGenerationConfig {
        BWGenerationConfig::new(
            GameVersion::BlackWhite,
            EncounterType::Normal,
            12345,
            54321,
            false, // シンクロなし
            0,
        )
    }

    #[test]
    fn test_bw_single_pokemon_generation() {
        let config = create_bw_test_config();
        let pokemon = PokemonGenerator::generate_single_pokemon_bw(0x123456789ABCDEF0, &config);
        
        assert_ne!(pokemon.pid, 0);
        assert!(pokemon.nature < 25);
        assert!(pokemon.ability_slot <= 1);
        assert!(pokemon.encounter_slot_value < 12); // Normal encounter has 12 slots
        assert!(pokemon.advances > 0);
        assert_eq!(pokemon.encounter_type, 0); // Normal encounter type
        assert!(!pokemon.sync_applied); // シンクロ無効設定
    }

    #[test]
    fn test_bw_correct_rng_consumption_order() {
        let config = create_bw_test_config();
        let pokemon = PokemonGenerator::generate_single_pokemon_bw(0x123456789ABCDEF0, &config);
        
        // 通常エンカウント（シンクロなし）: 性格(1) + 遭遇スロット(1) + PID(1) + レベル(1) = 4
        assert_eq!(pokemon.advances, 4);
        assert!(!pokemon.sync_applied);
    }

    #[test]
    fn test_bw_sync_enabled_consumption() {
        let mut config = create_bw_test_config();
        config.sync_enabled = true;
        config.sync_nature_id = 10;
        
        let pokemon = PokemonGenerator::generate_single_pokemon_bw(0x123456789ABCDEF0, &config);
        
        // シンクロ有効時の乱数消費確認
        // シンクロ成功: シンクロ判定(1) + 遭遇スロット(1) + PID(1) + レベル(1) = 4
        // シンクロ失敗: シンクロ判定(1) + 性格(1) + 遭遇スロット(1) + PID(1) + レベル(1) = 5
        assert!(pokemon.advances == 4 || pokemon.advances == 5);
        
        if pokemon.sync_applied {
            assert_eq!(pokemon.nature, 10); // シンクロ成功時は指定性格
            assert_eq!(pokemon.advances, 4);
        } else {
            assert_eq!(pokemon.advances, 5);
        }
    }

    #[test] 
    fn test_bw_encounter_type_pid_generation() {
        let mut config = create_bw_test_config();
        
        // 野生エンカウント
        config.encounter_type = EncounterType::Normal;
        let wild = PokemonGenerator::generate_single_pokemon_bw(0x123456789ABCDEF0, &config);
        
        // 固定シンボル
        config.encounter_type = EncounterType::StaticSymbol;
        let static_pokemon = PokemonGenerator::generate_single_pokemon_bw(0x123456789ABCDEF0, &config);
        
        // 同じシードでも異なるPID生成方式で結果が変わることを確認
        assert_ne!(wild.pid, static_pokemon.pid);
        assert_eq!(wild.encounter_type, 0);
        assert_eq!(static_pokemon.encounter_type, 10);
    }

    #[test]
    fn test_bw_batch_generation() {
        let config = create_bw_test_config();
        let pokemon_list = PokemonGenerator::generate_pokemon_batch_bw(
            0x123456789ABCDEF0,
            5,
            &config,
        );
        
        assert_eq!(pokemon_list.len(), 5);
        
        // 各ポケモンが異なるシードから生成されていることを確認
        for i in 1..pokemon_list.len() {
            assert_ne!(pokemon_list[i-1].seed, pokemon_list[i].seed);
        }
    }

    #[test]
    fn test_bw_roaming_encounter() {
        let mut config = create_bw_test_config();
        config.encounter_type = EncounterType::Roaming;
        
        let pokemon = PokemonGenerator::generate_single_pokemon_bw(0x123456789ABCDEF0, &config);
        
        assert_eq!(pokemon.encounter_type, 20); // Roaming encounter type
        assert_eq!(pokemon.encounter_slot_value, 0); // 徘徊は常にスロット0
        assert!(!pokemon.sync_applied); // 徘徊はシンクロ無効
        assert_eq!(pokemon.level_rand_value, 0); // 徘徊は乱数消費なし
    }

    #[test]
    fn test_bw_deterministic_generation() {
        let config = create_bw_test_config();
        let seed = 0x123456789ABCDEF0;
        
        let pokemon1 = PokemonGenerator::generate_single_pokemon_bw(seed, &config);
        let pokemon2 = PokemonGenerator::generate_single_pokemon_bw(seed, &config);
        
        // 同じシードから同じ結果が生成されることを確認
        assert_eq!(pokemon1.pid, pokemon2.pid);
        assert_eq!(pokemon1.nature, pokemon2.nature);
        assert_eq!(pokemon1.is_shiny, pokemon2.is_shiny);
        assert_eq!(pokemon1.advances, pokemon2.advances);
        assert_eq!(pokemon1.sync_applied, pokemon2.sync_applied);
    }

    #[test]
    fn test_bw_encounter_type_conversion() {
        // 内部関数のテスト
        assert_eq!(PokemonGenerator::encounter_type_to_u8(EncounterType::Normal), 0);
        assert_eq!(PokemonGenerator::encounter_type_to_u8(EncounterType::Surfing), 1);
        assert_eq!(PokemonGenerator::encounter_type_to_u8(EncounterType::StaticSymbol), 10);
        assert_eq!(PokemonGenerator::encounter_type_to_u8(EncounterType::Roaming), 20);
    }

    #[test]
    fn test_bw_sync_specificity() {
        let seed = 0x123456789ABCDEF0;
        
        // 固定シンボル（シンクロ有効）
        let mut config_symbol = BWGenerationConfig::new(
            GameVersion::BlackWhite,
            EncounterType::StaticSymbol,
            12345,
            54321,
            true,  // シンクロ有効
            10,    // シンクロ性格ID
        );
        let symbol_pokemon = PokemonGenerator::generate_single_pokemon_bw(seed, &config_symbol);
        
        // 御三家（シンクロ無効）
        config_symbol.encounter_type = EncounterType::StaticStarter;
        let starter_pokemon = PokemonGenerator::generate_single_pokemon_bw(seed, &config_symbol);
        
        // 化石（シンクロ無効）
        config_symbol.encounter_type = EncounterType::StaticFossil;
        let fossil_pokemon = PokemonGenerator::generate_single_pokemon_bw(seed, &config_symbol);
        
        // 御三家と化石では設定に関係なくシンクロが無効化される
        assert!(!starter_pokemon.sync_applied);
        assert!(!fossil_pokemon.sync_applied);
        
        // 固定シンボルではシンクロ判定が実行される（成功・失敗は乱数次第）
        // 最低でもシンクロ判定の乱数消費分は差が出る
        assert_ne!(symbol_pokemon.advances, starter_pokemon.advances);
    }

    #[test]
    fn test_bw_encounter_type_conversion_updated() {
        // 新しいエンカウントタイプの変換テスト
        assert_eq!(PokemonGenerator::encounter_type_to_u8(EncounterType::Normal), 0);
        assert_eq!(PokemonGenerator::encounter_type_to_u8(EncounterType::Surfing), 1);
        assert_eq!(PokemonGenerator::encounter_type_to_u8(EncounterType::StaticSymbol), 10);
        assert_eq!(PokemonGenerator::encounter_type_to_u8(EncounterType::StaticStarter), 11);
        assert_eq!(PokemonGenerator::encounter_type_to_u8(EncounterType::StaticFossil), 12);
        assert_eq!(PokemonGenerator::encounter_type_to_u8(EncounterType::StaticEvent), 13);
        assert_eq!(PokemonGenerator::encounter_type_to_u8(EncounterType::Roaming), 20);
    }

    #[test]
    fn test_bw_encounter_type_detection() {
        // 野生エンカウント判定テスト
        assert!(PokemonGenerator::is_wild_encounter(EncounterType::Normal));
        assert!(PokemonGenerator::is_wild_encounter(EncounterType::Surfing));
        assert!(PokemonGenerator::is_wild_encounter(EncounterType::FishingBubble));
        
        // 固定エンカウント判定テスト
        assert!(!PokemonGenerator::is_wild_encounter(EncounterType::StaticSymbol));
        assert!(!PokemonGenerator::is_wild_encounter(EncounterType::StaticStarter));
        assert!(!PokemonGenerator::is_wild_encounter(EncounterType::StaticFossil));
        assert!(!PokemonGenerator::is_wild_encounter(EncounterType::StaticEvent));
        assert!(!PokemonGenerator::is_wild_encounter(EncounterType::Roaming));
        
        // シンクロ対応判定テスト
        assert!(PokemonGenerator::supports_sync(EncounterType::Normal));
        assert!(PokemonGenerator::supports_sync(EncounterType::StaticSymbol)); // 固定シンボルはシンクロ有効
        
        // シンクロ無効判定テスト
        assert!(!PokemonGenerator::supports_sync(EncounterType::StaticStarter)); // 御三家はシンクロ無効
        assert!(!PokemonGenerator::supports_sync(EncounterType::StaticFossil));  // 化石はシンクロ無効
        assert!(!PokemonGenerator::supports_sync(EncounterType::StaticEvent));   // イベントはシンクロ無効
        assert!(!PokemonGenerator::supports_sync(EncounterType::Roaming));       // 徘徊はシンクロ無効
    }
}

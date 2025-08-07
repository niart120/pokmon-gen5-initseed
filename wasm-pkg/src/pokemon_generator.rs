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

    /// BW/BW2準拠 単体ポケモン生成（統括関数）
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
        match config.encounter_type {
            // 固定シンボル
            EncounterType::StaticSymbol => {
                Self::generate_static_symbol(seed, config)
            },
            
            // 徘徊
            EncounterType::Roaming => {
                Self::generate_roaming(seed, config)
            },
            
            // イベント系（御三家・化石）
            EncounterType::StaticStarter | EncounterType::StaticFossil | EncounterType::StaticEvent => {
                Self::generate_event_pokemon(seed, config)
            },
            
            // 野生系（草むら・洞窟）
            EncounterType::Normal | EncounterType::ShakingGrass | 
            EncounterType::DustCloud | EncounterType::PokemonShadow => {
                Self::generate_wild_pokemon(seed, config)
            },
            
            // なみのり系
            EncounterType::Surfing | EncounterType::SurfingBubble => {
                Self::generate_surfing_pokemon(seed, config)
            },
            
            // 釣り系
            EncounterType::Fishing | EncounterType::FishingBubble => {
                Self::generate_fishing_pokemon(seed, config)
            },
        }
    }

    /// 固定シンボル生成
    fn generate_static_symbol(seed: u64, config: &BWGenerationConfig) -> RawPokemonData {
        let mut rng = PersonalityRNG::new(seed);
        
        // シンクロ判定
        let sync_success = Self::perform_sync_check(
            &mut rng, 
            config.encounter_type, 
            config.sync_enabled
        );
        
        // PID生成（BW/BW2統一仕様: 32bit乱数 ^ 0x10000 + ID補正）
        let pid_base = rng.next();
        let pid = PIDCalculator::generate_static_pid(
            pid_base, 
            config.tid, 
            config.sid
        );
        
        // 性格生成・シンクロ適用
        let (sync_applied, nature_id) = Self::generate_nature_with_sync(
            &mut rng,
            sync_success,
            config.encounter_type,
            config.sync_enabled,
            config.sync_nature_id
        );
        
        // 持ち物判定（固定シンボルは持ち物判定あり）
        let _item_check = rng.next();
        
        // 距離計算で消費回数を算出
        let advances = rng.distance_from(seed) as u32;
        
        Self::build_pokemon_data(
            seed, advances, pid, nature_id, sync_applied, 
            0, // 固定シンボルは遭遇スロット0
            0, // レベル乱数なし
            config
        )
    }

    /// 徘徊生成
    fn generate_roaming(seed: u64, config: &BWGenerationConfig) -> RawPokemonData {
        let mut rng = PersonalityRNG::new(seed);
        
        // 徘徊はシンクロ無効
        
        // PID生成（BW/BW2統一仕様: 32bit乱数 ^ 0x10000 + ID補正）
        let pid_base = rng.next();
        let pid = PIDCalculator::generate_roaming_pid(
            pid_base, 
            config.tid, 
            config.sid
        );
        
        // 性格生成（徘徊はシンクロ無効なので通常性格のみ）
        let nature_id = Self::nature_roll(&mut rng);
        
        // 距離計算で消費回数を算出
        let advances = rng.distance_from(seed) as u32;
        
        Self::build_pokemon_data(
            seed, advances, pid, nature_id, false, // sync_applied = false
            0, // 徘徊は遭遇スロット0
            0, // レベル乱数なし
            config
        )
    }

    /// イベント系ポケモン生成（御三家・化石）
    fn generate_event_pokemon(seed: u64, config: &BWGenerationConfig) -> RawPokemonData {
        let mut rng = PersonalityRNG::new(seed);
        
        // イベント系はシンクロ無効
        
        // PID生成（BW/BW2統一仕様: 32bit乱数 ^ 0x10000、ただしID補正なし）
        let pid_base = rng.next();
        let pid = PIDCalculator::generate_event_pid(pid_base);
        
        // 性格生成（イベント系はシンクロ無効なので通常性格のみ）
        let nature_id = Self::nature_roll(&mut rng);
        
        // 距離計算で消費回数を算出
        let advances = rng.distance_from(seed) as u32;
        
        Self::build_pokemon_data(
            seed, advances, pid, nature_id, false, // sync_applied = false
            0, // イベント系は遭遇スロット0
            0, // レベル乱数なし
            config
        )
    }

    /// 野生ポケモン生成（草むら・洞窟）
    fn generate_wild_pokemon(seed: u64, config: &BWGenerationConfig) -> RawPokemonData {
        let mut rng = PersonalityRNG::new(seed);
        
        // シンクロ判定
        let sync_success = Self::perform_sync_check(
            &mut rng, 
            config.encounter_type, 
            config.sync_enabled
        );
        
        // 遭遇スロット決定
        let encounter_slot_value = EncounterCalculator::calculate_encounter_slot(
            config.version,
            config.encounter_type,
            rng.next()
        );

        // レベル決定(野生は空消費)
        rng.next();
        
        // PID生成（BW/BW2統一仕様: 32bit乱数 ^ 0x10000 + ID補正）
        let pid_base = rng.next();
        let pid = PIDCalculator::generate_wild_pid(
            pid_base, 
            config.tid, 
            config.sid
        );
        
        // 性格生成・シンクロ適用
        let (sync_applied, nature_id) = Self::generate_nature_with_sync(
            &mut rng,
            sync_success,
            config.encounter_type,
            config.sync_enabled,
            config.sync_nature_id
        );
        
        // 持ち物判定（土煙のみ）
        if config.encounter_type == EncounterType::DustCloud {
            let _item_check = rng.next();
        }
        
        // 距離計算で消費回数を算出
        let advances = rng.distance_from(seed) as u32;
        
        Self::build_pokemon_data(
            seed, advances, pid, nature_id, sync_applied, 
            encounter_slot_value,
            0, // 野生は固定レベル（乱数値は未使用）
            config
        )
    }

    /// なみのりポケモン生成
    fn generate_surfing_pokemon(seed: u64, config: &BWGenerationConfig) -> RawPokemonData {
        let mut rng = PersonalityRNG::new(seed);
        
        // シンクロ判定
        let sync_success = Self::perform_sync_check(
            &mut rng, 
            config.encounter_type, 
            config.sync_enabled
        );
        
        // 遭遇スロット決定
        let encounter_slot_value = EncounterCalculator::calculate_encounter_slot(
            config.version,
            config.encounter_type,
            rng.next()
        );
        
        // レベル決定
        let level_rand_value = rng.next();
        
        // PID生成（BW/BW2統一仕様: 32bit乱数 ^ 0x10000 + ID補正）
        let pid_base = rng.next();
        let pid = PIDCalculator::generate_wild_pid(
            pid_base, 
            config.tid, 
            config.sid
        );
        
        // 性格生成・シンクロ適用
        let (sync_applied, nature_id) = Self::generate_nature_with_sync(
            &mut rng,
            sync_success,
            config.encounter_type,
            config.sync_enabled,
            config.sync_nature_id
        );
        
        // 持ち物判定（なみのりは持ち物判定あり）
        let _item_check = rng.next();
        
        // 距離計算で消費回数を算出
        let advances = rng.distance_from(seed) as u32;
        
        Self::build_pokemon_data(
            seed, advances, pid, nature_id, sync_applied, 
            encounter_slot_value,
            level_rand_value,
            config
        )
    }

    /// 釣りポケモン生成
    fn generate_fishing_pokemon(seed: u64, config: &BWGenerationConfig) -> RawPokemonData {
        let mut rng = PersonalityRNG::new(seed);
        
        // シンクロ判定
        let sync_success = Self::perform_sync_check(
            &mut rng, 
            config.encounter_type, 
            config.sync_enabled
        );
        
        // 釣り成功判定
        let _fishing_success = rng.next();
        
        // 遭遇スロット決定
        let encounter_slot_value = EncounterCalculator::calculate_encounter_slot(
            config.version,
            config.encounter_type,
            rng.next()
        );
        
        // レベル決定
        let level_rand_value = rng.next();
        
        // PID生成（BW/BW2統一仕様: 32bit乱数 ^ 0x10000 + ID補正）
        let pid_base = rng.next();
        let pid = PIDCalculator::generate_wild_pid(
            pid_base, 
            config.tid, 
            config.sid
        );
        
        // 性格生成・シンクロ適用
        let (sync_applied, nature_id) = Self::generate_nature_with_sync(
            &mut rng,
            sync_success,
            config.encounter_type,
            config.sync_enabled,
            config.sync_nature_id
        );
        
        // 持ち物判定（釣りは持ち物判定あり）
        let _item_check = rng.next();
        
        // 距離計算で消費回数を算出
        let advances = rng.distance_from(seed) as u32;
        
        Self::build_pokemon_data(
            seed, advances, pid, nature_id, sync_applied, 
            encounter_slot_value,
            level_rand_value,
            config
        )
    }

    /// ポケモンデータ構築ヘルパー
    fn build_pokemon_data(
        seed: u64,
        advances: u32,
        pid: u32,
        nature: u8,
        sync_applied: bool,
        encounter_slot_value: u8,
        level_rand_value: u32,
        config: &BWGenerationConfig,
    ) -> RawPokemonData {
        let ability_slot = ((pid >> 16) & 1) as u8;
        let gender_value = (pid & 0xFF) as u8;
        
        let shiny_type_enum = ShinyChecker::check_shiny_type(config.tid, config.sid, pid);
        let is_shiny = shiny_type_enum != ShinyType::Normal;
        let shiny_type = shiny_type_enum as u8;
        
        RawPokemonData {
            seed,
            advances,
            pid,
            nature,
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

    /// 内部使用：シンクロ判定処理
    /// PersonalityRNGから移管：ゲーム固有ロジックをPokemonGeneratorに集約
    /// 
    /// # Arguments
    /// * `rng` - 乱数生成器
    /// 
    /// # Returns
    /// シンクロ判定結果（true: シンクロ成功, false: シンクロ失敗）
    fn sync_check(rng: &mut PersonalityRNG) -> bool {
        let rand = rng.next();
        ((rand as u64 * 2) >> 32) == 0
    }

    /// 内部使用：性格決定処理
    /// PersonalityRNGから移管：ゲーム固有ロジックをPokemonGeneratorに集約
    /// 
    /// # Arguments
    /// * `rng` - 乱数生成器
    /// 
    /// # Returns
    /// 性格ID（0-24）
    fn nature_roll(rng: &mut PersonalityRNG) -> u8 {
        let r1 = rng.next();
        ((r1 as u64 * 25) >> 32) as u8
    }

    /// 内部使用：シンクロ判定のみ実行
    /// 
    /// # Arguments
    /// * `rng` - 乱数生成器
    /// * `encounter_type` - 遭遇タイプ
    /// * `sync_enabled` - シンクロ有効フラグ
    /// 
    /// # Returns
    /// シンクロ成功フラグ（シンクロ無効エンカウントでは常にfalse）
    fn perform_sync_check(
        rng: &mut PersonalityRNG,
        encounter_type: EncounterType,
        sync_enabled: bool,
    ) -> bool {
        // シンクロ対応エンカウントかつシンクロ有効時のみ判定実行
        if Self::supports_sync(encounter_type) && sync_enabled {
            Self::sync_check(rng)
        } else if Self::supports_sync(encounter_type) {
            // シンクロ対応エンカウントだがシンクロ無効の場合も乱数消費
            Self::sync_check(rng);
            false // シンクロ無効なので常にfalse
        } else {
            // シンクロ無効エンカウント（御三家、化石、イベント、徘徊等）
            false // 乱数消費もなし
        }
    }

    /// 内部使用：PIDベース性格生成とシンクロ適用
    /// 
    /// # Arguments
    /// * `rng` - 乱数生成器
    /// * `sync_success` - シンクロ判定結果
    /// * `encounter_type` - 遭遇タイプ
    /// * `sync_enabled` - シンクロ有効フラグ
    /// * `sync_nature_id` - シンクロ性格ID
    /// 
    /// # Returns
    /// (シンクロ適用フラグ, 最終性格ID)
    fn generate_nature_with_sync(
        rng: &mut PersonalityRNG,
        sync_success: bool,
        encounter_type: EncounterType,
        sync_enabled: bool,
        sync_nature_id: u8,
    ) -> (bool, u8) {
        // シンクロ適用条件：シンクロ対応エンカウント && シンクロ有効 && シンクロ成功
        let sync_applied = Self::supports_sync(encounter_type) && sync_enabled && sync_success;
        
        // 乱数消費は常に発生（シンクロ成功時も失敗時も）
        let rng_nature = Self::nature_roll(rng);
        
        let final_nature = if sync_applied {
            // シンクロ成功時は乱数結果を無視してシンクロ性格を適用
            sync_nature_id
        } else {
            // シンクロ失敗時またはシンクロ無効時は乱数結果を使用
            rng_nature
        };
        
        (sync_applied, final_nature)
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

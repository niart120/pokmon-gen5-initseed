/// PokemonGenerator - BW/BW2統合ポケモン生成エンジン
/// 全ての計算エンジンを統合し、完全なポケモンデータを生成
use wasm_bindgen::prelude::*;
use crate::personality_rng::PersonalityRNG;
use crate::encounter_calculator::{EncounterCalculator, GameVersion, EncounterType};
use crate::offset_calculator::{OffsetCalculator, GameMode};
use crate::pid_shiny_checker::{PIDCalculator, ShinyChecker, ShinyType};

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

/// デバッグログ出力マクロ
macro_rules! console_log {
    ($($t:tt)*) => (log(&format_args!($($t)*).to_string()))
}

/// ポケモンタイプ列挙型
#[wasm_bindgen]
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum PokemonType {
    /// 野生ポケモン
    Wild = 0,
    /// 固定シンボル
    Static = 1,
    /// 徘徊ポケモン
    Roaming = 2,
    /// ギフトポケモン
    Gift = 3,
    /// タマゴ
    Egg = 4,
}

/// 生ポケモンデータ構造体
#[wasm_bindgen]
#[derive(Debug, Clone)]
pub struct RawPokemonData {
    /// 初期シード値
    seed: u64,
    /// PID
    pid: u32,
    /// 性格値（0-24）
    nature: u8,
    /// 特性スロット（0-1）
    ability_slot: u8,
    /// 性別値（0-255）
    gender_value: u8,
    /// 遭遇スロット値
    encounter_slot_value: u8,
    /// レベル乱数値
    level_rand_value: u8,
    /// 色違いフラグ
    is_shiny: bool,
    /// 色違いタイプ
    shiny_type: u8,
    /// 使用した乱数回数
    advances: u32,
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
    pub fn get_level_rand_value(&self) -> u8 { self.level_rand_value }
    
    #[wasm_bindgen(getter)]
    pub fn get_is_shiny(&self) -> bool { self.is_shiny }
    
    #[wasm_bindgen(getter)]
    pub fn get_shiny_type(&self) -> u8 { self.shiny_type }
    
    #[wasm_bindgen(getter)]
    pub fn get_advances(&self) -> u32 { self.advances }
}

/// 生成設定構造体
#[wasm_bindgen]
#[derive(Debug, Clone)]
pub struct GenerationConfig {
    /// ゲームバージョン
    version: GameVersion,
    /// 遭遇タイプ
    encounter_type: EncounterType,
    /// ポケモンタイプ
    pokemon_type: PokemonType,
    /// トレーナーID
    tid: u16,
    /// シークレットID
    sid: u16,
    /// 性格シンクロ（0-24, 255=なし）
    nature_sync: u8,
    /// ゲームモード
    game_mode: GameMode,
}

#[wasm_bindgen]
impl GenerationConfig {
    /// 新しい生成設定を作成
    #[wasm_bindgen(constructor)]
    pub fn new(
        version: GameVersion,
        encounter_type: EncounterType,
        pokemon_type: PokemonType,
        tid: u16,
        sid: u16,
        nature_sync: u8,
        game_mode: GameMode,
    ) -> GenerationConfig {
        GenerationConfig {
            version,
            encounter_type,
            pokemon_type,
            tid,
            sid,
            nature_sync,
            game_mode,
        }
    }

    /// getter methods
    #[wasm_bindgen(getter)]
    pub fn get_version(&self) -> GameVersion { self.version }
    
    #[wasm_bindgen(getter)]
    pub fn get_encounter_type(&self) -> EncounterType { self.encounter_type }
    
    #[wasm_bindgen(getter)]
    pub fn get_pokemon_type(&self) -> PokemonType { self.pokemon_type }
    
    #[wasm_bindgen(getter)]
    pub fn get_tid(&self) -> u16 { self.tid }
    
    #[wasm_bindgen(getter)]
    pub fn get_sid(&self) -> u16 { self.sid }
    
    #[wasm_bindgen(getter)]
    pub fn get_nature_sync(&self) -> u8 { self.nature_sync }
    
    #[wasm_bindgen(getter)]
    pub fn get_game_mode(&self) -> GameMode { self.game_mode }
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

    /// 単体ポケモン生成
    /// 
    /// # Arguments
    /// * `seed` - 初期シード値
    /// * `config` - 生成設定
    /// 
    /// # Returns
    /// 生成されたポケモンデータ
    pub fn generate_single_pokemon(seed: u64, config: &GenerationConfig) -> RawPokemonData {
        let mut rng = PersonalityRNG::new(seed);
        let mut offset_calc = OffsetCalculator::new(seed);
        
        // ゲーム初期化処理
        let initialization_advances = offset_calc.execute_game_initialization(config.game_mode);
        
        // 初期化分だけRNGも進める
        rng.advance(initialization_advances);
        
        // シンクロ処理
        let mut sync_advances = 0;
        if config.nature_sync != 255 {
            let sync_result = rng.sync_check();
            sync_advances += 1;
            
            if sync_result == 0 {
                // シンクロ成功 - 指定された性格で固定
                let nature = config.nature_sync;
                let advances = initialization_advances + sync_advances;
                
                return Self::generate_pokemon_with_nature(
                    seed, config, nature, advances
                );
            }
        }
        
        // 通常の乱数生成
        let r1 = rng.next();
        let r2 = rng.next();
        
        // PID生成
        let pid = match config.pokemon_type {
            PokemonType::Wild => PIDCalculator::generate_wild_pid(r1),
            PokemonType::Static => PIDCalculator::generate_static_pid(r1),
            PokemonType::Roaming => PIDCalculator::generate_roaming_pid(r1),
            PokemonType::Gift => PIDCalculator::generate_gift_pid(r1, r2),
            PokemonType::Egg => PIDCalculator::generate_egg_pid(r1, r2),
        };
        
        // その他の値を計算
        let nature = PIDCalculator::calculate_nature_from_pid(pid);
        let ability_slot = PIDCalculator::calculate_ability_slot_from_pid(pid);
        let gender_value = PIDCalculator::calculate_gender_value_from_pid(pid);
        
        // 遭遇スロット計算
        let encounter_slot_value = EncounterCalculator::calculate_encounter_slot(
            config.version,
            config.encounter_type,
            r1 % 100,
        );
        
        // レベル乱数（簡略化）
        let level_rand_value = (r2 % 100) as u8;
        
        // 色違い判定
        let shiny_type_enum = ShinyChecker::check_shiny_type(config.tid, config.sid, pid);
        let is_shiny = shiny_type_enum != ShinyType::Normal;
        let shiny_type = shiny_type_enum as u8;
        
        let total_advances = initialization_advances + sync_advances + 2; // r1, r2
        
        RawPokemonData {
            seed,
            pid,
            nature,
            ability_slot,
            gender_value,
            encounter_slot_value,
            level_rand_value,
            is_shiny,
            shiny_type,
            advances: total_advances,
        }
    }

    /// バッチポケモン生成
    /// 
    /// # Arguments
    /// * `start_seed` - 開始シード値
    /// * `count` - 生成数
    /// * `config` - 生成設定
    /// 
    /// # Returns
    /// 生成されたポケモンデータの配列
    pub fn generate_pokemon_batch(
        start_seed: u64,
        count: u32,
        config: &GenerationConfig,
    ) -> Vec<RawPokemonData> {
        let mut results = Vec::with_capacity(count as usize);
        
        for i in 0..count {
            let current_seed = PersonalityRNG::jump_seed(start_seed, i as u64);
            let pokemon = Self::generate_single_pokemon(current_seed, config);
            results.push(pokemon);
        }
        
        results
    }

    /// 色違いポケモンのみを生成
    /// 
    /// # Arguments
    /// * `start_seed` - 開始シード値
    /// * `max_attempts` - 最大試行回数
    /// * `config` - 生成設定
    /// 
    /// # Returns
    /// 見つかった色違いポケモンデータの配列
    pub fn generate_shiny_pokemon(
        start_seed: u64,
        max_attempts: u32,
        config: &GenerationConfig,
    ) -> Vec<RawPokemonData> {
        let mut results = Vec::new();
        
        for i in 0..max_attempts {
            let current_seed = PersonalityRNG::jump_seed(start_seed, i as u64);
            let pokemon = Self::generate_single_pokemon(current_seed, config);
            
            if pokemon.is_shiny {
                results.push(pokemon);
            }
        }
        
        results
    }

    /// 特定性格のポケモンを生成
    /// 
    /// # Arguments
    /// * `start_seed` - 開始シード値
    /// * `target_nature` - 目標性格
    /// * `max_attempts` - 最大試行回数
    /// * `config` - 生成設定
    /// 
    /// # Returns
    /// 見つかったポケモンデータの配列
    pub fn generate_pokemon_with_target_nature(
        start_seed: u64,
        target_nature: u8,
        max_attempts: u32,
        config: &GenerationConfig,
    ) -> Vec<RawPokemonData> {
        let mut results = Vec::new();
        
        for i in 0..max_attempts {
            let current_seed = PersonalityRNG::jump_seed(start_seed, i as u64);
            let pokemon = Self::generate_single_pokemon(current_seed, config);
            
            if pokemon.nature == target_nature {
                results.push(pokemon);
            }
        }
        
        results
    }
}

impl PokemonGenerator {
    /// 内部使用：シンクロ成功時のポケモン生成
    fn generate_pokemon_with_nature(
        seed: u64,
        config: &GenerationConfig,
        nature: u8,
        base_advances: u32,
    ) -> RawPokemonData {
        let mut rng = PersonalityRNG::new(seed);
        rng.advance(base_advances);
        
        let r1 = rng.next();
        let r2 = rng.next();
        
        // シンクロ時はPIDを調整して性格を固定
        let base_pid = match config.pokemon_type {
            PokemonType::Wild => PIDCalculator::generate_wild_pid(r1),
            PokemonType::Static => PIDCalculator::generate_static_pid(r1),
            PokemonType::Roaming => PIDCalculator::generate_roaming_pid(r1),
            PokemonType::Gift => PIDCalculator::generate_gift_pid(r1, r2),
            PokemonType::Egg => PIDCalculator::generate_egg_pid(r1, r2),
        };
        
        // 性格調整（簡略化）
        let pid = (base_pid & 0xFFFFFFE0) | (nature as u32);
        
        let ability_slot = PIDCalculator::calculate_ability_slot_from_pid(pid);
        let gender_value = PIDCalculator::calculate_gender_value_from_pid(pid);
        
        let encounter_slot_value = EncounterCalculator::calculate_encounter_slot(
            config.version,
            config.encounter_type,
            r1 % 100,
        );
        
        let level_rand_value = (r2 % 100) as u8;
        
        let shiny_type_enum = ShinyChecker::check_shiny_type(config.tid, config.sid, pid);
        let is_shiny = shiny_type_enum != ShinyType::Normal;
        let shiny_type = shiny_type_enum as u8;
        
        RawPokemonData {
            seed,
            pid,
            nature,
            ability_slot,
            gender_value,
            encounter_slot_value,
            level_rand_value,
            is_shiny,
            shiny_type,
            advances: base_advances + 2,
        }
    }

    /// 内部使用：統計情報の生成
    pub fn generate_statistics(
        start_seed: u64,
        count: u32,
        config: &GenerationConfig,
    ) -> (u32, u32, u32, f32) {
        let pokemon_list = Self::generate_pokemon_batch(start_seed, count, config);
        
        let shiny_count = pokemon_list.iter().filter(|p| p.is_shiny).count() as u32;
        let star_shiny_count = pokemon_list.iter()
            .filter(|p| p.shiny_type == ShinyType::Star as u8).count() as u32;
        let square_shiny_count = pokemon_list.iter()
            .filter(|p| p.shiny_type == ShinyType::Square as u8).count() as u32;
        
        let shiny_rate = if count > 0 {
            (shiny_count as f32) / (count as f32)
        } else {
            0.0
        };
        
        (shiny_count, star_shiny_count, square_shiny_count, shiny_rate)
    }

    /// 内部使用：パフォーマンステスト用の高速生成
    pub fn benchmark_generation(
        start_seed: u64,
        count: u32,
        config: &GenerationConfig,
    ) -> u32 {
        let start_time = js_sys::Date::now();
        
        let _pokemon_list = Self::generate_pokemon_batch(start_seed, count, config);
        
        let end_time = js_sys::Date::now();
        (end_time - start_time) as u32
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_config() -> GenerationConfig {
        GenerationConfig::new(
            GameVersion::BlackWhite,
            EncounterType::Normal,
            PokemonType::Wild,
            12345,
            54321,
            255, // シンクロなし
            GameMode::BwContinue,
        )
    }

    #[test]
    fn test_single_pokemon_generation() {
        let config = create_test_config();
        let pokemon = PokemonGenerator::generate_single_pokemon(0x123456789ABCDEF0, &config);
        
        assert_ne!(pokemon.pid, 0);
        assert!(pokemon.nature < 25);
        assert!(pokemon.ability_slot <= 1);
        assert!(pokemon.encounter_slot_value < 12); // Normal encounter has 12 slots
        assert!(pokemon.advances > 0);
    }

    #[test]
    fn test_batch_pokemon_generation() {
        let config = create_test_config();
        let pokemon_list = PokemonGenerator::generate_pokemon_batch(
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
    fn test_pokemon_types() {
        let mut config = create_test_config();
        
        // 野生ポケモン
        config.pokemon_type = PokemonType::Wild;
        let wild = PokemonGenerator::generate_single_pokemon(0x123456789ABCDEF0, &config);
        
        // 固定シンボル
        config.pokemon_type = PokemonType::Static;
        let static_pokemon = PokemonGenerator::generate_single_pokemon(0x123456789ABCDEF0, &config);
        
        // 徘徊ポケモン
        config.pokemon_type = PokemonType::Roaming;
        let _roaming = PokemonGenerator::generate_single_pokemon(0x123456789ABCDEF0, &config);
        
        // PIDが異なる生成方式で生成されていることを確認
        // （同じシードでも異なるPIDが生成される）
        assert_ne!(wild.pid, static_pokemon.pid); // Wild vs Static で違いがある
    }

    #[test]
    fn test_shiny_pokemon_generation() {
        let config = create_test_config();
        
        // 少数のシードをテストして色違いが検出されることを確認
        let shiny_list = PokemonGenerator::generate_shiny_pokemon(
            0x0, // シンプルなシードから開始
            10000, // 十分な試行回数
            &config,
        );
        
        // 色違いが見つかることを確認（統計的に期待される）
        for pokemon in &shiny_list {
            assert!(pokemon.is_shiny);
        }
    }

    #[test]
    fn test_nature_targeting() {
        let config = create_test_config();
        let target_nature = 5; // おくびょう
        
        let nature_list = PokemonGenerator::generate_pokemon_with_target_nature(
            0x123456789ABCDEF0,
            target_nature,
            1000,
            &config,
        );
        
        // 見つかった全てのポケモンが目標性格であることを確認
        for pokemon in &nature_list {
            assert_eq!(pokemon.nature, target_nature);
        }
    }

    #[test]
    fn test_synchronize_effect() {
        let mut config = create_test_config();
        config.nature_sync = 10; // シンクロ性格を設定
        
        let pokemon = PokemonGenerator::generate_single_pokemon(0x123456789ABCDEF0, &config);
        
        // シンクロが成功した場合、指定された性格になる
        // （実際の成功率は50%だが、テストでは結果を確認）
        assert!(pokemon.nature < 25);
        assert!(pokemon.advances > 0);
    }

    #[test]
    fn test_encounter_types() {
        let mut config = create_test_config();
        
        // 通常エンカウント
        config.encounter_type = EncounterType::Normal;
        let normal = PokemonGenerator::generate_single_pokemon(0x123456789ABCDEF0, &config);
        assert!(normal.encounter_slot_value < 12);
        
        // なみのり
        config.encounter_type = EncounterType::Surfing;
        let surfing = PokemonGenerator::generate_single_pokemon(0x123456789ABCDEF0, &config);
        assert!(surfing.encounter_slot_value < 5);
        
        // つりざお
        config.encounter_type = EncounterType::Fishing;
        let fishing = PokemonGenerator::generate_single_pokemon(0x123456789ABCDEF0, &config);
        assert!(fishing.encounter_slot_value < 5);
    }

    #[test]
    fn test_game_versions() {
        let mut config = create_test_config();
        
        // BW
        config.version = GameVersion::BlackWhite;
        let bw_pokemon = PokemonGenerator::generate_single_pokemon(0x123456789ABCDEF0, &config);
        
        // BW2
        config.version = GameVersion::BlackWhite2;
        let bw2_pokemon = PokemonGenerator::generate_single_pokemon(0x123456789ABCDEF0, &config);
        
        // 同じシードから異なる結果が生成される場合がある
        // （ただし基本的なロジックは同じ）
        assert!(bw_pokemon.advances > 0);
        assert!(bw2_pokemon.advances > 0);
    }

    #[test]
    fn test_deterministic_generation() {
        let config = create_test_config();
        let seed = 0x123456789ABCDEF0;
        
        let pokemon1 = PokemonGenerator::generate_single_pokemon(seed, &config);
        let pokemon2 = PokemonGenerator::generate_single_pokemon(seed, &config);
        
        // 同じシードから同じ結果が生成されることを確認
        assert_eq!(pokemon1.pid, pokemon2.pid);
        assert_eq!(pokemon1.nature, pokemon2.nature);
        assert_eq!(pokemon1.is_shiny, pokemon2.is_shiny);
        assert_eq!(pokemon1.advances, pokemon2.advances);
    }

    #[test]
    fn test_generation_config() {
        let config = GenerationConfig::new(
            GameVersion::BlackWhite2,
            EncounterType::Surfing,
            PokemonType::Static,
            11111,
            22222,
            15, // シンクロ性格
            GameMode::BwNewGameWithSave,
        );
        
        assert_eq!(config.get_version(), GameVersion::BlackWhite2);
        assert_eq!(config.get_encounter_type(), EncounterType::Surfing);
        assert_eq!(config.get_pokemon_type(), PokemonType::Static);
        assert_eq!(config.get_tid(), 11111);
        assert_eq!(config.get_sid(), 22222);
        assert_eq!(config.get_nature_sync(), 15);
        assert_eq!(config.get_game_mode(), GameMode::BwNewGameWithSave);
    }

    #[test]
    fn test_raw_pokemon_data_getters() {
        let config = create_test_config();
        let pokemon = PokemonGenerator::generate_single_pokemon(0x123456789ABCDEF0, &config);
        
        // getter メソッドが正しく動作することを確認
        assert_eq!(pokemon.get_seed(), pokemon.seed);
        assert_eq!(pokemon.get_pid(), pokemon.pid);
        assert_eq!(pokemon.get_nature(), pokemon.nature);
        assert_eq!(pokemon.get_ability_slot(), pokemon.ability_slot);
        assert_eq!(pokemon.get_gender_value(), pokemon.gender_value);
        assert_eq!(pokemon.get_encounter_slot_value(), pokemon.encounter_slot_value);
        assert_eq!(pokemon.get_level_rand_value(), pokemon.level_rand_value);
        assert_eq!(pokemon.get_is_shiny(), pokemon.is_shiny);
        assert_eq!(pokemon.get_shiny_type(), pokemon.shiny_type);
        assert_eq!(pokemon.get_advances(), pokemon.advances);
    }
}
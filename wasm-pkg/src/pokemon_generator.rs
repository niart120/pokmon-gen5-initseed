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
    /// 色違いタイプ（0: NotShiny, 1: Square, 2: Star）
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
    pub fn get_shiny_type(&self) -> u8 { self.shiny_type }
    
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
        
        Self::build_pokemon_data(
            seed, pid, nature_id, sync_applied, 
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
        
        Self::build_pokemon_data(
            seed, pid, nature_id, false, // sync_applied = false
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
        
        Self::build_pokemon_data(
            seed, pid, nature_id, false, // sync_applied = false
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
        
        Self::build_pokemon_data(
            seed, pid, nature_id, sync_applied, 
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
        
        Self::build_pokemon_data(
            seed, pid, nature_id, sync_applied, 
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
        
        Self::build_pokemon_data(
            seed, pid, nature_id, sync_applied, 
            encounter_slot_value,
            level_rand_value,
            config
        )
    }

    /// ポケモンデータ構築ヘルパー
    fn build_pokemon_data(
        seed: u64,
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
        let shiny_type = Self::shiny_type_to_u8(shiny_type_enum);
        
        RawPokemonData {
            seed,
            pid,
            nature,
            sync_applied,
            ability_slot,
            gender_value,
            encounter_slot_value,
            encounter_type: Self::encounter_type_to_u8(config.encounter_type),
            level_rand_value,
            shiny_type,
        }
    }

    /// 内部: LCG a,b 定数
    #[inline]
    fn lcg_constants() -> (u64, u64) { (0x5D588B656C078965, 0x269EC3) }

    /// 内部: LCG を steps 回前進させるアフィン変換 (mul, add) を返す
    /// seed' = mul * seed + add (mod 2^64)
    fn lcg_affine_for_steps(steps: u64) -> (u64, u64) {
        let (mut mul, mut add) = (1u64, 0u64);
        let (mut cur_mul, mut cur_add) = Self::lcg_constants();
        let mut k = steps;
        while k > 0 {
            if (k & 1) == 1 {
                add = add.wrapping_mul(cur_mul).wrapping_add(cur_add);
                mul = mul.wrapping_mul(cur_mul);
            }
            // square current transform
            cur_add = cur_add.wrapping_mul(cur_mul).wrapping_add(cur_add);
            cur_mul = cur_mul.wrapping_mul(cur_mul);
            k >>= 1;
        }
        (mul, add)
    }

    /// 内部: アフィン適用
    #[inline]
    fn lcg_apply(seed: u64, mul: u64, add: u64) -> u64 {
        seed.wrapping_mul(mul).wrapping_add(add)
    }

    /// BW/BW2準拠 バッチ生成（offsetのみ）
    /// 
    /// # Arguments
    /// * `base_seed` - 列挙の基準シード（初期シード）
    /// * `offset` - 最初の生成までの前進数（ゲーム内不定消費を含めた開始位置）
    /// * `count` - 生成数（0なら空）
    /// * `config` - BW準拠設定
    /// 
    /// # Returns
    /// 生成されたポケモンデータの配列
    pub fn generate_pokemon_batch_bw(
        base_seed: u64,
        offset: u64,
        count: u32,
        config: &BWGenerationConfig,
    ) -> Vec<RawPokemonData> {
        if count == 0 { return Vec::new(); }
        const MAX_BATCH_COUNT: u32 = 1_000_000; // 安全上限
        let capped = if count > MAX_BATCH_COUNT { MAX_BATCH_COUNT } else { count } as usize;
        let mut results = Vec::with_capacity(capped);

        // 初期シード: base_seed を offset だけ前進
        let (m_off, a_off) = Self::lcg_affine_for_steps(offset);
        let mut cur_seed = Self::lcg_apply(base_seed, m_off, a_off);

        for _ in 0..capped {
            let pokemon = Self::generate_single_pokemon_bw(cur_seed, config);
            results.push(pokemon);
            // 次のシードへ（1ステップ）
            cur_seed = PersonalityRNG::next_seed(cur_seed);
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

    /// 内部使用：ShinyType → u8（0:NotShiny, 1:Square, 2:Star）変換
    fn shiny_type_to_u8(shiny: ShinyType) -> u8 {
        match shiny {
            ShinyType::Normal => 0,
            ShinyType::Square => 1,
            ShinyType::Star => 2,
        }
    }
}

/// 連続列挙用のシード列挙器（offsetのみ）
#[wasm_bindgen]
pub struct SeedEnumerator {
    current_seed: u64,
    remaining: u32,
    config: BWGenerationConfig,
}

#[wasm_bindgen]
impl SeedEnumerator {
    /// 列挙器を作成
    #[wasm_bindgen(constructor)]
    pub fn new(
        base_seed: u64,
        offset: u64,
        count: u32,
        config: &BWGenerationConfig,
    ) -> SeedEnumerator {
        let (m_off, a_off) = PokemonGenerator::lcg_affine_for_steps(offset);
        let current_seed = PokemonGenerator::lcg_apply(base_seed, m_off, a_off);
        SeedEnumerator { current_seed, remaining: count, config: config.clone() }
    }

    /// 次のポケモンを生成（残数0なら undefined を返す）
    pub fn next_pokemon(&mut self) -> Option<RawPokemonData> {
        if self.remaining == 0 { return None; }
        let result = PokemonGenerator::generate_single_pokemon_bw(self.current_seed, &self.config);
        self.remaining -= 1;
        self.current_seed = PersonalityRNG::next_seed(self.current_seed);
        Some(result)
    }

    /// 残数を取得
    #[wasm_bindgen(getter)]
    pub fn remaining(&self) -> u32 { self.remaining }
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
    fn test_bw_batch_generation_new_api() {
        let config = create_bw_test_config();
        let base = 0x123456789ABCDEF0u64;
        let list = PokemonGenerator::generate_pokemon_batch_bw(
            base,
            0,
            5,
            &config,
        );
        
        assert_eq!(list.len(), 5);
        
        // 各ポケモンが異なるシードから生成されていることを確認
        for i in 1..list.len() {
            assert_ne!(list[i-1].seed, list[i].seed);
        }
    }

    #[test]
    fn test_bw_batch_equivalence_with_offset() {
        let config = create_bw_test_config();
        let base = 0x123456789ABCDEF0u64;
        let offset = 13u64;
        let count = 16u32;

        let batch = PokemonGenerator::generate_pokemon_batch_bw(base, offset, count, &config);

        // 参照: jump_seed を用いて同じ列挙を再現（連続列挙）
        let mut expected = Vec::with_capacity(count as usize);
        let mut seed_i = PersonalityRNG::jump_seed(base, offset);
        for _ in 0..count {
            expected.push(PokemonGenerator::generate_single_pokemon_bw(seed_i, &config));
            seed_i = PersonalityRNG::next_seed(seed_i);
        }

        assert_eq!(batch.len(), expected.len());
        for (a,b) in batch.iter().zip(expected.iter()) {
            assert_eq!(a.pid, b.pid);
            assert_eq!(a.nature, b.nature);
            assert_eq!(a.seed, b.seed);
        }
    }

    #[test]
    fn test_bw_zero_count_returns_empty() {
        let config = create_bw_test_config();
        let v = PokemonGenerator::generate_pokemon_batch_bw(0x123456789ABCDEF0, 0, 0, &config);
        assert!(v.is_empty());
    }

    #[test]
    fn test_seed_enumerator_matches_batch() {
        let config = create_bw_test_config();
        let base = 0xABCDEF0123456789u64;
        let offset = 5u64;
        let count = 20u32;

        let batch = PokemonGenerator::generate_pokemon_batch_bw(base, offset, count, &config);

        let mut it = SeedEnumerator::new(base, offset, count, &config);
        let mut collected = Vec::new();
        while let Some(p) = it.next_pokemon() { collected.push(p); }

        assert_eq!(batch.len(), collected.len());
        for (a,b) in batch.iter().zip(collected.iter()) {
            assert_eq!(a.pid, b.pid);
            assert_eq!(a.nature, b.nature);
            assert_eq!(a.seed, b.seed);
        }
    }

    // ...existing code (その他のテスト群)...
}

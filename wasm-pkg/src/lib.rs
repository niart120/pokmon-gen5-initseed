mod datetime_codes;
mod sha1;
mod sha1_simd;
mod integrated_search;
mod personality_rng;
mod encounter_calculator;
mod offset_calculator;

#[cfg(test)]
mod tests;

// Re-export main functionality - 統合検索のみ（内部でsha1/sha1_simdは使用）
pub use datetime_codes::{TimeCodeGenerator, DateCodeGenerator};
pub use integrated_search::{SearchResult, IntegratedSeedSearcher};
pub use personality_rng::PersonalityRNG;
pub use encounter_calculator::{EncounterCalculator, GameVersion, EncounterType};
pub use offset_calculator::{OffsetCalculator, GameMode, PTResult};

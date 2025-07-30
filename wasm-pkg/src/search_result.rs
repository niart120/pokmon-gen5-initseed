/// 探索結果構造体
use wasm_bindgen::prelude::*;

/// 探索結果構造体
#[wasm_bindgen]
#[derive(Debug, Clone)]
pub struct SearchResult {
    seed: u32,
    hash: String,
    year: u32,
    month: u32,
    date: u32,
    hour: u32,
    minute: u32,
    second: u32,
    timer0: u32,
    vcount: u32,
}

#[wasm_bindgen]
impl SearchResult {
    #[wasm_bindgen(constructor)]
    #[allow(clippy::too_many_arguments)]  // WebAssembly constructor requires all parameters
    pub fn new(seed: u32, hash: String, year: u32, month: u32, date: u32, hour: u32, minute: u32, second: u32, timer0: u32, vcount: u32) -> SearchResult {
        SearchResult { seed, hash, year, month, date, hour, minute, second, timer0, vcount }
    }
    
    #[wasm_bindgen(getter)]
    pub fn seed(&self) -> u32 { self.seed }
    #[wasm_bindgen(getter)]
    pub fn hash(&self) -> String { self.hash.clone() }
    #[wasm_bindgen(getter)]
    pub fn year(&self) -> u32 { self.year }
    #[wasm_bindgen(getter)]
    pub fn month(&self) -> u32 { self.month }
    #[wasm_bindgen(getter)]
    pub fn date(&self) -> u32 { self.date }
    #[wasm_bindgen(getter)]
    pub fn hour(&self) -> u32 { self.hour }
    #[wasm_bindgen(getter)]
    pub fn minute(&self) -> u32 { self.minute }
    #[wasm_bindgen(getter)]
    pub fn second(&self) -> u32 { self.second }
    #[wasm_bindgen(getter)]
    pub fn timer0(&self) -> u32 { self.timer0 }
    #[wasm_bindgen(getter)]
    pub fn vcount(&self) -> u32 { self.vcount }
}

# Pokemon Assembler Integration - Phase 2-5

## Overview

This module implements the Pokemon data assembler for Phase 2-5: データ統合処理, which integrates WASM raw values with encounter tables and business logic.

## Key Features

### 1. Data Integration
- Combines raw WASM data (`RawPokemonData`) with encounter table information
- Resolves encounter slot values to actual Pokemon species
- Calculates levels, abilities, and gender based on random values
- Provides enhanced Pokemon data with complete metadata

### 2. Special Encounter Handling
- **Dust Cloud Encounters**: Determines content type (Pokemon, Item, or Gem)
- **Item Appearance Logic**: Calculates specific item IDs for dust cloud encounters
- **Encounter Type Support**: Handles all encounter types from normal wild to roaming

### 3. Sync Rule Enforcement
- **Wild Encounters**: Sync applies to normal, surfing, fishing, and special encounters
- **Static Encounters**: Sync applies only to static symbols, not starters/fossils/events
- **Roaming Encounters**: **Sync explicitly does NOT apply** (critical requirement)
- **Validation**: Detects and reports incorrect sync applications

## Usage

```typescript
import { PokemonAssembler, createSampleEncounterTables, EncounterType } from '@/lib/integration/pokemon-assembler';

// Create assembler with encounter tables
const assembler = new PokemonAssembler('B', 'JPN', createSampleEncounterTables());

// Process raw WASM data
const rawData: RawPokemonData = {
  seed: 0x12345678,
  pid: 0x87654321,
  nature: 12,
  syncApplied: true,
  abilitySlot: 1,
  genderValue: 100,
  encounterSlotValue: 0,
  encounterType: EncounterType.Normal,
  levelRandValue: 2,
  shinyType: 0,
};

// Get enhanced data
const enhanced = assembler.assembleData(rawData);

// Validate sync rules
const validation = assembler.validateSyncRules([enhanced]);
if (!validation.isValid) {
  console.log('Sync rule violations:', validation.violations);
}
```

## Type Definitions

### `RawPokemonData`
Raw data from WASM calculations:
- `seed`: Initial seed value
- `pid`: Pokemon ID
- `nature`: Nature value (0-24)
- `syncApplied`: Whether sync was applied
- `abilitySlot`: Ability slot (0-1)
- `genderValue`: Gender random value (0-255)
- `encounterSlotValue`: Encounter slot index
- `encounterType`: Type of encounter
- `levelRandValue`: Level random value
- `shinyType`: Shiny type (0: normal, 1: square, 2: star)

### `EnhancedPokemonData`
Enhanced data with resolved information:
- All fields from `RawPokemonData` (except `shinyType` replaced with string version)
- `species`: Resolved Pokemon species ID
- `level`: Calculated level
- `ability`: Resolved ability ID
- `gender`: Resolved gender (0: male, 1: female, 2: genderless)
- `isShiny`: Boolean shiny status
- `shinyType`: String shiny type ('normal', 'square', 'star')
- `rawShinyType`: Original numeric shiny value
- `dustCloudContent?`: Dust cloud content type (for dust cloud encounters)
- `itemId?`: Item ID (for dust cloud items/gems)
- `syncEligible`: Whether sync can apply to this encounter type
- `syncAppliedCorrectly`: Whether sync was applied according to rules

## Encounter Types

### Wild Encounters (Sync Eligible)
- `Normal` (0): Grass, cave, dungeon encounters
- `Surfing` (1): Water surface encounters
- `Fishing` (2): Fishing rod encounters
- `ShakingGrass` (3): Special grass encounters
- `DustCloud` (4): Dust cloud encounters (with item logic)
- `PokemonShadow` (5): Shadow encounters
- `SurfingBubble` (6): Special water encounters
- `FishingBubble` (7): Special fishing encounters

### Static Encounters
- `StaticSymbol` (10): Legendary Pokemon (sync eligible)
- `StaticStarter` (11): Starter Pokemon (sync NOT eligible)
- `StaticFossil` (12): Fossil Pokemon (sync NOT eligible)
- `StaticEvent` (13): Event Pokemon (sync NOT eligible)

### Roaming Encounters (Sync NOT Eligible)
- `Roaming` (20): Roaming legendary Pokemon (**critical**: sync never applies)

## Special Features

### Dust Cloud Logic
For `EncounterType.DustCloud`, determines content based on PID:
- 60% chance: Pokemon encounter
- 25% chance: Item encounter (with specific item ID)
- 15% chance: Gem encounter (with gem item ID)

### Sync Rule Validation
The `validateSyncRules()` method ensures:
1. Roaming encounters never have sync applied
2. Static starters/fossils/events don't have sync applied
3. Only eligible encounter types can have sync

## Testing

Comprehensive test suite covers:
- Basic data integration and transformation
- All encounter type processing
- Sync rule enforcement (especially roaming encounter validation)
- Special encounter logic (dust cloud content determination)
- Batch processing capabilities
- Representative encounter type output structure validation

## Implementation Notes

- **Source of Truth**: WASM implementation is authoritative
- **Integration Strategy**: Uses IntegratedSeedSearcher approach (no direct WASM calls)
- **Minimal Changes**: Focus on TypeScript integration layer only
- **Type Safety**: Full TypeScript typing with proper interfaces
- **Validation**: Built-in validation for sync rule compliance

## Constraints Satisfied

✅ **Raw parsed values + encounter table + resolution logic integration**  
✅ **Special encounter (dust cloud) item appearance determination**  
✅ **Strict sync application scope (wild only, roaming excluded)**  
✅ **Roaming sync non-application testing**  
✅ **Representative encounter type validation**  
✅ **Source of Truth: wasm-pkg (Rust) implementation**  
✅ **IntegratedSeedSearcher approach (no individual WASM calls)**
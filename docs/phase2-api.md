# Phase 2 — TypeScript Integration API Documentation

This document provides comprehensive API documentation for the Phase 2 TypeScript integration components that combine WASM Pokemon generation with encounter tables and species data.

## Overview

Phase 2 implements a complete pipeline from raw WASM Pokemon data to enhanced Pokemon information suitable for display and analysis. The system follows these principles:

- **Source of Truth**: WASM (Rust) implementation for all calculations
- **Data Integration**: Combines WASM output with encounter tables and species data
- **Type Safety**: Full TypeScript strict mode compliance
- **Validation**: Comprehensive input validation and error handling
- **Documentation**: All data sources include URLs and retrieval dates

## Architecture

```
WASM Generation → Raw Pokemon Data → Data Integration → Enhanced Pokemon Data
     ↓                    ↓                  ↓                    ↓
IntegratedSeedSearcher → RawPokemonData → Integration Service → EnhancedPokemonData
```

## Core Components

### 1. RawPokemonData Parser (`src/types/raw-pokemon-data.ts`)

Handles parsing and typing of raw Pokemon data from WASM.

#### Key Types

```typescript
interface RawPokemonData {
  seed: bigint;
  pid: number;
  nature: number;
  syncApplied: boolean;
  abilitySlot: number;
  genderValue: number;
  encounterSlotValue: number;
  encounterType: number;
  levelRandValue: number;
  shinyType: number;
}

interface EnhancedPokemonData extends RawPokemonData {
  species: PokemonSpecies;
  ability: PokemonAbility;
  gender: 'Male' | 'Female' | 'Genderless';
  level: number;
  encounter: EncounterDetails;
  natureName: string;
  shinyStatus: 'Normal' | 'Square Shiny' | 'Star Shiny';
}
```

#### Key Functions

```typescript
// Parse WASM data to TypeScript
function parseRawPokemonData(wasmData: any): RawPokemonData

// Utility functions
function getNatureName(natureId: number): string
function getShinyStatusName(shinyType: number): string
function determineGender(genderValue: number, genderRatio: number): 'Male' | 'Female' | 'Genderless'
```

### 2. Encounter Tables (`src/data/encounter-tables.ts`)

Defines encounter tables with documented data sources.

#### Data Sources
- **Bulbapedia**: https://bulbapedia.bulbagarden.net/wiki/List_of_Pok%C3%A9mon_by_Unova_Pok%C3%A9dex_number (Retrieved: 2024-01-15)
- **Serebii.net**: https://www.serebii.net/blackwhite/pokemon.shtml (Retrieved: 2024-01-15)
- **Pokemon Database**: https://pokemondb.net/pokedex/game/black-white (Retrieved: 2024-01-15)

#### Key Types

```typescript
interface EncounterSlot {
  speciesId: number;
  rate: number;
  levelRange: { min: number; max: number };
}

interface EncounterTable {
  location: string;
  method: EncounterType;
  version: ROMVersion;
  slots: EncounterSlot[];
}
```

#### Key Functions

```typescript
// Lookup functions
function getEncounterTable(version: ROMVersion, location: string, method: EncounterType): EncounterTable | null
function getEncounterSlot(table: EncounterTable, slotValue: number): EncounterSlot

// Calculation functions
function calculateLevel(levelRandValue: number, levelRange: { min: number; max: number }): number
```

### 3. Pokemon Species Data (`src/data/pokemon-species.ts`)

Contains Pokemon species and ability information.

#### Data Sources
- **Bulbapedia species pages**: https://bulbapedia.bulbagarden.net/wiki/List_of_Pok%C3%A9mon_by_National_Pok%C3%A9dex_number (Retrieved: 2024-01-15)
- **Pokemon Database**: https://pokemondb.net/pokedex/all (Retrieved: 2024-01-15)
- **Serebii.net Pokedex**: https://www.serebii.net/pokedex-bw/ (Retrieved: 2024-01-15)

#### Key Types

```typescript
interface PokemonSpecies {
  nationalDex: number;
  name: string;
  baseStats: { hp: number; attack: number; defense: number; specialAttack: number; specialDefense: number; speed: number };
  types: [string] | [string, string];
  genderRatio: number; // -1 for genderless
  abilities: { ability1: string; ability2?: string; hiddenAbility?: string };
}

interface PokemonAbility {
  name: string;
  description: string;
  isHidden: boolean;
}
```

#### Key Functions

```typescript
// Lookup functions
function getPokemonSpecies(nationalDex: number): PokemonSpecies | null
function getPokemonAbility(abilityName: string): PokemonAbility | null
function getSpeciesAbility(species: PokemonSpecies, abilitySlot: number): PokemonAbility | null
```

### 4. WASM Pokemon Service (`src/lib/services/wasm-pokemon-service.ts`)

High-level interface to WASM Pokemon generation with validation and error handling.

#### Key Types

```typescript
interface WasmGenerationConfig {
  version: ROMVersion;
  region: ROMRegion;
  hardware: Hardware;
  tid: number;
  sid: number;
  syncEnabled: boolean;
  syncNatureId: number;
  macAddress: number[];
  keyInput: number;
  frame: number;
}

interface PokemonGenerationRequest {
  seed: bigint;
  config: WasmGenerationConfig;
  count?: number;
  offset?: number;
}
```

#### Key Classes

```typescript
class WasmPokemonService {
  async initialize(): Promise<void>
  isReady(): boolean
  async generateSinglePokemon(request: PokemonGenerationRequest): Promise<RawPokemonData>
  async generatePokemonBatch(request: PokemonGenerationRequest): Promise<PokemonGenerationResult>
}
```

#### Usage Example

```typescript
import { WasmPokemonService } from '@/lib/services/wasm-pokemon-service';

const service = new WasmPokemonService();
await service.initialize();

const config = WasmPokemonService.createDefaultConfig();
const pokemon = await service.generateSinglePokemon({
  seed: 0x123456789ABCDEFn,
  config,
});
```

### 5. Pokemon Integration Service (`src/lib/services/pokemon-integration-service.ts`)

Combines raw WASM data with encounter tables and species information.

#### Key Types

```typescript
interface IntegrationConfig {
  version: ROMVersion;
  defaultLocation?: string;
  applySynchronize?: boolean;
  synchronizeNature?: number;
}

interface IntegrationResult {
  pokemon: EnhancedPokemonData;
  metadata: {
    encounterTableFound: boolean;
    speciesDataFound: boolean;
    abilityDataFound: boolean;
    warnings: string[];
  };
}
```

#### Key Classes

```typescript
class PokemonIntegrationService {
  integratePokemon(rawData: RawPokemonData, config: IntegrationConfig): IntegrationResult
  integratePokemonBatch(rawDataArray: RawPokemonData[], config: IntegrationConfig): IntegrationResult[]
  validateIntegrationResult(result: IntegrationResult): boolean
}
```

#### Usage Example

```typescript
import { getIntegrationService } from '@/lib/services/pokemon-integration-service';

const service = getIntegrationService();
const result = service.integratePokemon(rawData, {
  version: 'B',
  defaultLocation: 'Route 1',
  applySynchronize: true,
  synchronizeNature: 10, // Timid
});

console.log(`Generated ${result.pokemon.species.name} at level ${result.pokemon.level}`);
```

## Complete Usage Example

Here's a complete example showing the full pipeline from WASM generation to enhanced Pokemon data:

```typescript
import { getWasmPokemonService } from '@/lib/services/wasm-pokemon-service';
import { getIntegrationService } from '@/lib/services/pokemon-integration-service';

async function generateEnhancedPokemon(seed: bigint) {
  // Step 1: Generate raw Pokemon data with WASM
  const wasmService = await getWasmPokemonService();
  const rawData = await wasmService.generateSinglePokemon({
    seed,
    config: {
      version: 'B',
      region: 'JPN',
      hardware: 'DS',
      tid: 12345,
      sid: 54321,
      syncEnabled: true,
      syncNatureId: 10, // Timid
      macAddress: [0x00, 0x16, 0x56, 0x12, 0x34, 0x56],
      keyInput: 0,
      frame: 1,
    },
  });

  // Step 2: Integrate with encounter and species data
  const integrationService = getIntegrationService();
  const result = integrationService.integratePokemon(rawData, {
    version: 'B',
    defaultLocation: 'Route 1',
    applySynchronize: true,
    synchronizeNature: 10,
  });

  // Step 3: Use enhanced Pokemon data
  const pokemon = result.pokemon;
  console.log(`Generated ${pokemon.species.name}:`);
  console.log(`  Level: ${pokemon.level}`);
  console.log(`  Nature: ${pokemon.natureName}`);
  console.log(`  Ability: ${pokemon.ability.name}`);
  console.log(`  Gender: ${pokemon.gender}`);
  console.log(`  Shiny: ${pokemon.shinyStatus}`);
  console.log(`  Location: ${pokemon.encounter.location}`);

  return pokemon;
}
```

## Error Handling

All services provide comprehensive error handling:

```typescript
import { WasmServiceError, IntegrationError } from '@/lib/services/...';

try {
  const pokemon = await generatePokemon(seed, config);
} catch (error) {
  if (error instanceof WasmServiceError) {
    console.error('WASM generation failed:', error.code, error.message);
  } else if (error instanceof IntegrationError) {
    console.error('Integration failed:', error.code, error.message);
  }
}
```

## Testing

The implementation includes comprehensive tests:

- **Basic validation tests**: `src/test/phase2-basic.test.ts`
- **Integration tests**: `src/test/phase2-integration.test.ts`

Run tests:
```bash
npm run test src/test/phase2-basic.test.ts
npm run test src/test/phase2-integration.test.ts
```

## Data Coverage

Currently implemented data includes:

### Pokemon Species
- Generation 5 starters (Snivy, Tepig, Oshawott)
- Common early-game Pokemon (Patrat, Lillipup)
- Elemental monkeys (Pansage, Pansear, Panpour)
- Example psychic and water types (Munna, Basculin)

### Encounter Tables
- Route 1 grass encounters
- Dreamyard static encounters
- Wellspring Cave fishing encounters
- Default tables for all encounter types

### Abilities
- Basic ability database with descriptions
- Support for normal and hidden abilities

## Extension Points

The system is designed for easy extension:

1. **Add more species**: Extend `POKEMON_SPECIES` in `pokemon-species.ts`
2. **Add more encounter tables**: Extend `ENCOUNTER_TABLES` in `encounter-tables.ts`
3. **Add more abilities**: Extend `ABILITIES` in `pokemon-species.ts`
4. **Custom integration logic**: Extend `PokemonIntegrationService`

## Performance Considerations

- WASM generation is optimized for batch operations
- Integration service validates results efficiently
- Services use singleton patterns to minimize initialization overhead
- Error handling is comprehensive but lightweight

## Source Attribution

All data sources are properly attributed with URLs and retrieval dates as required:

- **Encounter data**: Bulbapedia, Serebii.net, Pokemon Database
- **Species data**: Official Pokemon sources, community databases
- **Game mechanics**: Smogon RNG documentation, research communities

This ensures full traceability and allows for data verification and updates.
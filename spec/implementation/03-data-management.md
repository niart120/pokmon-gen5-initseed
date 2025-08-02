# ポケモン生成機能 データ管理実装

## 7. データ管理実装（TypeScript側）

### 7.1 Generation Data Manager

```typescript
// src/lib/generation/data-manager.ts
export class GenerationDataManager {
  private speciesData: Map<string, PokemonSpeciesData> = new Map();
  private encounterTables: Map<string, EncounterTable> = new Map();
  private abilityData: Map<string, AbilityData> = new Map();
  private gameConstants: GameConstants;
  
  constructor(gameVersion: GameVersion) {
    this.gameConstants = this.loadGameConstants(gameVersion);
  }
  
  async initialize(): Promise<void> {
    await Promise.all([
      this.loadSpeciesData(),
      this.loadEncounterTables(),
      this.loadAbilityData(),
    ]);
  }
  
  private async loadSpeciesData(): Promise<void> {
    const response = await fetch('/data/generation/species/gen5-species.json');
    const data = await response.json();
    
    for (const species of data.species) {
      this.speciesData.set(species.name.toLowerCase(), species);
    }
  }
  
  private async loadEncounterTables(): Promise<void> {
    const response = await fetch('/data/generation/encounters/gen5-encounters.json');
    const data = await response.json();
    
    for (const [locationId, table] of Object.entries(data.tables)) {
      this.encounterTables.set(locationId, table as EncounterTable);
    }
  }
  
  private async loadAbilityData(): Promise<void> {
    const response = await fetch('/data/generation/abilities/gen5-abilities.json');
    const data = await response.json();
    
    for (const ability of data.abilities) {
      this.abilityData.set(ability.name.toLowerCase(), ability);
    }
  }
  
  // 種族データ取得
  getSpecies(name: string): PokemonSpeciesData | undefined {
    return this.speciesData.get(name.toLowerCase());
  }
  
  // 遭遇テーブル取得
  getEncounterTable(locationId: string): EncounterTable | undefined {
    return this.encounterTables.get(locationId);
  }
  
  // 特性データ取得
  getAbility(name: string): AbilityData | undefined {
    return this.abilityData.get(name.toLowerCase());
  }
  
  // 遭遇スロットからポケモン種族を特定
  getSpeciesFromSlot(slotIndex: number, encounterTable: EncounterTable): string {
    if (slotIndex >= encounterTable.slots.length) {
      throw new Error(`Invalid slot index: ${slotIndex}`);
    }
    
    return encounterTable.slots[slotIndex].pokemon;
  }
  
  // 性別比率の閾値取得
  getGenderThreshold(species: string): number {
    const speciesData = this.getSpecies(species);
    if (!speciesData) return 127; // デフォルト50:50
    
    const ratioMap: Record<string, number> = {
      'genderless': -1,
      'male-only': 256,
      'female-only': 0,
      '87.5:12.5': 31,   // 87.5% male (starter等)
      '75:25': 63,       // 75% male
      '50:50': 127,      // 50% male
      '25:75': 191,      // 25% male
      '12.5:87.5': 225,  // 12.5% male
    };
    
    return ratioMap[speciesData.genderRatio] ?? 127;
  }
  
  // データ整合性チェック
  validateDataIntegrity(): ValidationResult {
    const errors: string[] = [];
    
    // 遭遇テーブルの参照整合性チェック
    for (const [locationId, table] of this.encounterTables) {
      for (const slot of table.slots) {
        if (!this.speciesData.has(slot.pokemon.toLowerCase())) {
          errors.push(`Unknown pokemon: ${slot.pokemon} in ${locationId}`);
        }
        
        // 特性の存在チェック
        const species = this.getSpecies(slot.pokemon);
        if (species) {
          if (!this.abilityData.has(species.abilities.ability1.toLowerCase())) {
            errors.push(`Unknown ability1: ${species.abilities.ability1} for ${slot.pokemon}`);
          }
          if (species.abilities.ability2 && !this.abilityData.has(species.abilities.ability2.toLowerCase())) {
            errors.push(`Unknown ability2: ${species.abilities.ability2} for ${slot.pokemon}`);
          }
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  private loadGameConstants(gameVersion: GameVersion): GameConstants {
    // ゲームバージョン別の定数
    const constants = {
      [GameVersion.BlackWhite]: {
        encounterSlotDivisor: 0x290,
        encounterSlotMultiplier: 0xFFFF,
        vcount: { black: 0x60, white: 0x5f },
        nazo: { black: 0x2215f10, white: 0x2215f30 },
      },
      [GameVersion.BlackWhite2]: {
        encounterSlotDivisor: 1,
        encounterSlotMultiplier: 100,
        vcount: { black2: 0x60, white2: 0x5f }, // 要確認
        nazo: { black2: 0x2215f10, white2: 0x2215f30 }, // 要確認
      }
    };
    
    return constants[gameVersion];
  }
}

// 型定義
interface PokemonSpeciesData {
  name: string;
  pokedexNumber: number;
  types: { type1: string; type2?: string };
  baseStats: { hp: number; attack: number; defense: number; specialAttack: number; specialDefense: number; speed: number };
  abilities: { ability1: string; ability2?: string; hiddenAbility?: string };
  genderRatio: string;
  catchRate: number;
  baseExperience: number;
}

interface EncounterTable {
  location: string;
  encounterType: string;
  levelRange: { min: number; max: number };
  slots: EncounterSlot[];
}

interface EncounterSlot {
  index: number;
  pokemon: string;
  probability: number;
  levelRange?: { min: number; max: number };
}

interface AbilityData {
  name: string;
  description: string;
  effect: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

interface GameConstants {
  encounterSlotDivisor: number;
  encounterSlotMultiplier: number;
  vcount: Record<string, number>;
  nazo: Record<string, number>;
}
```

---

**作成日**: 2025年8月3日  
**バージョン**: 1.0  
**作成者**: GitHub Copilot  
**依存**: pokemon-generation-feature-spec.md, pokemon-data-specification.md

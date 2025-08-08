/**
 * Pokemon species data for Generation 5 (Unova region)
 * 
 * Data sources and retrieval dates:
 * - Bulbapedia species pages: https://bulbapedia.bulbagarden.net/wiki/List_of_Pok%C3%A9mon_by_National_Pok%C3%A9dex_number (Retrieved: 2024-01-15)
 * - Pokemon Database: https://pokemondb.net/pokedex/all (Retrieved: 2024-01-15)
 * - Serebii.net Pokedex: https://www.serebii.net/pokedex-bw/ (Retrieved: 2024-01-15)
 * - Official Pokemon website: https://www.pokemon.com/us/pokedex/ (Retrieved: 2024-01-15)
 */

import type { PokemonSpecies, PokemonAbility } from '../types/raw-pokemon-data';

/**
 * Pokemon abilities database
 * 
 * Source: Bulbapedia ability pages
 * URL: https://bulbapedia.bulbagarden.net/wiki/Category:Abilities
 * Retrieved: 2024-01-15
 */
export const ABILITIES: Record<string, PokemonAbility> = {
  'Run Away': {
    name: 'Run Away',
    description: 'Enables a sure getaway from wild Pokémon.',
    isHidden: false,
  },
  'Keen Eye': {
    name: 'Keen Eye',
    description: 'Prevents other Pokémon from lowering accuracy.',
    isHidden: false,
  },
  'Analytic': {
    name: 'Analytic',
    description: 'Boosts the power of the Pokémon\'s move if it is the last to act that turn.',
    isHidden: true,
  },
  'Gluttony': {
    name: 'Gluttony',
    description: 'Makes the Pokémon eat a held Berry when its HP drops to half or less.',
    isHidden: false,
  },
  'Overgrow': {
    name: 'Overgrow',
    description: 'Powers up Grass-type moves when the Pokémon is in trouble.',
    isHidden: false,
  },
  'Blaze': {
    name: 'Blaze',
    description: 'Powers up Fire-type moves when the Pokémon is in trouble.',
    isHidden: false,
  },
  'Torrent': {
    name: 'Torrent',
    description: 'Powers up Water-type moves when the Pokémon is in trouble.',
    isHidden: false,
  },
  'Forewarn': {
    name: 'Forewarn',
    description: 'Reveals one of the opponent\'s moves when the Pokémon enters battle.',
    isHidden: false,
  },
  'Synchronize': {
    name: 'Synchronize',
    description: 'Passes a burn, poison, or paralysis to the foe.',
    isHidden: false,
  },
  'Telepathy': {
    name: 'Telepathy',
    description: 'Anticipates an ally\'s attack and dodges it.',
    isHidden: true,
  },
  'Swift Swim': {
    name: 'Swift Swim',
    description: 'Boosts the Pokémon\'s Speed stat in rain.',
    isHidden: false,
  },
  'Adaptability': {
    name: 'Adaptability',
    description: 'Powers up moves of the same type as the Pokémon.',
    isHidden: false,
  },
  'Rock Head': {
    name: 'Rock Head',
    description: 'Protects the Pokémon from recoil damage.',
    isHidden: false,
  },
  'Reckless': {
    name: 'Reckless',
    description: 'Powers up moves that have recoil damage.',
    isHidden: true,
  },
  // Add more abilities as needed
};

/**
 * Pokemon species database (Generation 5 focus)
 * 
 * Source: Multiple Bulbapedia species pages
 * Base URL: https://bulbapedia.bulbagarden.net/wiki/[Species]_(Pok%C3%A9mon)
 * Retrieved: 2024-01-15
 */
export const POKEMON_SPECIES: Record<number, PokemonSpecies> = {
  // Generation 5 Starters
  495: { // Snivy
    nationalDex: 495,
    name: 'Snivy',
    baseStats: {
      hp: 45,
      attack: 45,
      defense: 55,
      specialAttack: 45,
      specialDefense: 55,
      speed: 63,
    },
    types: ['Grass'],
    genderRatio: 87.5, // 87.5% male
    abilities: {
      ability1: 'Overgrow',
      hiddenAbility: 'Contrary',
    },
  },
  
  498: { // Tepig
    nationalDex: 498,
    name: 'Tepig',
    baseStats: {
      hp: 65,
      attack: 63,
      defense: 45,
      specialAttack: 45,
      specialDefense: 45,
      speed: 45,
    },
    types: ['Fire'],
    genderRatio: 87.5,
    abilities: {
      ability1: 'Blaze',
      hiddenAbility: 'Thick Fat',
    },
  },
  
  501: { // Oshawott
    nationalDex: 501,
    name: 'Oshawott',
    baseStats: {
      hp: 55,
      attack: 55,
      defense: 45,
      specialAttack: 63,
      specialDefense: 45,
      speed: 45,
    },
    types: ['Water'],
    genderRatio: 87.5,
    abilities: {
      ability1: 'Torrent',
      hiddenAbility: 'Shell Armor',
    },
  },
  
  // Common early-game Pokemon
  504: { // Patrat
    nationalDex: 504,
    name: 'Patrat',
    baseStats: {
      hp: 45,
      attack: 55,
      defense: 39,
      specialAttack: 35,
      specialDefense: 39,
      speed: 42,
    },
    types: ['Normal'],
    genderRatio: 50,
    abilities: {
      ability1: 'Run Away',
      ability2: 'Keen Eye',
      hiddenAbility: 'Analytic',
    },
  },
  
  506: { // Lillipup
    nationalDex: 506,
    name: 'Lillipup',
    baseStats: {
      hp: 45,
      attack: 60,
      defense: 45,
      specialAttack: 25,
      specialDefense: 45,
      speed: 55,
    },
    types: ['Normal'],
    genderRatio: 50,
    abilities: {
      ability1: 'Vital Spirit',
      ability2: 'Pickup',
      hiddenAbility: 'Run Away',
    },
  },
  
  // Elemental monkeys
  511: { // Pansage
    nationalDex: 511,
    name: 'Pansage',
    baseStats: {
      hp: 50,
      attack: 53,
      defense: 48,
      specialAttack: 53,
      specialDefense: 48,
      speed: 64,
    },
    types: ['Grass'],
    genderRatio: 87.5,
    abilities: {
      ability1: 'Gluttony',
      hiddenAbility: 'Overgrow',
    },
  },
  
  513: { // Pansear
    nationalDex: 513,
    name: 'Pansear',
    baseStats: {
      hp: 50,
      attack: 53,
      defense: 48,
      specialAttack: 53,
      specialDefense: 48,
      speed: 64,
    },
    types: ['Fire'],
    genderRatio: 87.5,
    abilities: {
      ability1: 'Gluttony',
      hiddenAbility: 'Blaze',
    },
  },
  
  515: { // Panpour
    nationalDex: 515,
    name: 'Panpour',
    baseStats: {
      hp: 50,
      attack: 53,
      defense: 48,
      specialAttack: 53,
      specialDefense: 48,
      speed: 64,
    },
    types: ['Water'],
    genderRatio: 87.5,
    abilities: {
      ability1: 'Gluttony',
      hiddenAbility: 'Torrent',
    },
  },
  
  // Psychic types
  517: { // Munna
    nationalDex: 517,
    name: 'Munna',
    baseStats: {
      hp: 76,
      attack: 25,
      defense: 45,
      specialAttack: 67,
      specialDefense: 55,
      speed: 24,
    },
    types: ['Psychic'],
    genderRatio: 50,
    abilities: {
      ability1: 'Forewarn',
      ability2: 'Synchronize',
      hiddenAbility: 'Telepathy',
    },
  },
  
  // Water types
  550: { // Basculin
    nationalDex: 550,
    name: 'Basculin',
    baseStats: {
      hp: 70,
      attack: 92,
      defense: 65,
      specialAttack: 80,
      specialDefense: 55,
      speed: 98,
    },
    types: ['Water'],
    genderRatio: 50,
    abilities: {
      ability1: 'Reckless',
      ability2: 'Adaptability',
      hiddenAbility: 'Mold Breaker',
    },
  },
  
  // Legendary placeholder
  493: { // Arceus
    nationalDex: 493,
    name: 'Arceus',
    baseStats: {
      hp: 120,
      attack: 120,
      defense: 120,
      specialAttack: 120,
      specialDefense: 120,
      speed: 120,
    },
    types: ['Normal'],
    genderRatio: -1, // Genderless
    abilities: {
      ability1: 'Multitype',
    },
  },
};

/**
 * Get Pokemon species by national dex number
 * 
 * @param nationalDex National Pokedex number
 * @returns Pokemon species data or null if not found
 */
export function getPokemonSpecies(nationalDex: number): PokemonSpecies | null {
  return POKEMON_SPECIES[nationalDex] || null;
}

/**
 * Get Pokemon ability by name
 * 
 * @param abilityName Ability name
 * @returns Pokemon ability data or null if not found
 */
export function getPokemonAbility(abilityName: string): PokemonAbility | null {
  return ABILITIES[abilityName] || null;
}

/**
 * Get Pokemon ability by species and ability slot
 * 
 * @param species Pokemon species data
 * @param abilitySlot Ability slot (0 = ability1, 1 = ability2/hidden)
 * @returns Pokemon ability data or null if not found
 */
export function getSpeciesAbility(
  species: PokemonSpecies,
  abilitySlot: number
): PokemonAbility | null {
  let abilityName: string | undefined;
  
  switch (abilitySlot) {
    case 0:
      abilityName = species.abilities.ability1;
      break;
    case 1:
      abilityName = species.abilities.ability2 || species.abilities.hiddenAbility;
      break;
    default:
      return null;
  }
  
  return abilityName ? getPokemonAbility(abilityName) : null;
}

/**
 * Validate species data structure
 */
export function validateSpeciesData(species: PokemonSpecies): boolean {
  if (!species.name || !species.nationalDex || !species.baseStats || !species.types) {
    return false;
  }
  
  if (!Array.isArray(species.types) || species.types.length === 0 || species.types.length > 2) {
    return false;
  }
  
  if (species.genderRatio < -1 || species.genderRatio > 100) {
    return false;
  }
  
  if (!species.abilities || !species.abilities.ability1) {
    return false;
  }
  
  return true;
}

/**
 * Get all species in national dex order
 */
export function getAllSpecies(): PokemonSpecies[] {
  return Object.values(POKEMON_SPECIES).sort((a, b) => a.nationalDex - b.nationalDex);
}

/**
 * Search species by name (case-insensitive)
 */
export function searchSpeciesByName(query: string): PokemonSpecies[] {
  const lowercaseQuery = query.toLowerCase();
  return getAllSpecies().filter(species => 
    species.name.toLowerCase().includes(lowercaseQuery)
  );
}

/**
 * Get species by type(s)
 */
export function getSpeciesByType(type: string): PokemonSpecies[] {
  return getAllSpecies().filter(species =>
    species.types.includes(type)
  );
}
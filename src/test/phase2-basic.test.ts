/**
 * Simple Phase 2 validation test
 */

import { describe, it, expect } from 'vitest';
import { 
  getNatureName, 
  getShinyStatusName,
  determineGender 
} from '../types/raw-pokemon-data';
import { 
  getEncounterTable, 
  calculateLevel 
} from '../data/encounter-tables';
import { 
  getPokemonSpecies 
} from '../data/pokemon-species';

describe('Phase 2 Basic Validation', () => {
  describe('Raw Pokemon Data utilities', () => {
    it('should convert nature IDs correctly', () => {
      expect(getNatureName(0)).toBe('Hardy');
      expect(getNatureName(12)).toBe('Serious');
      expect(getNatureName(24)).toBe('Quirky');
    });

    it('should convert shiny types correctly', () => {
      expect(getShinyStatusName(0)).toBe('Normal');
      expect(getShinyStatusName(1)).toBe('Square Shiny');
      expect(getShinyStatusName(2)).toBe('Star Shiny');
    });

    it('should determine gender correctly', () => {
      expect(determineGender(100, 50)).toBe('Male');
      expect(determineGender(150, 50)).toBe('Female');
      expect(determineGender(100, -1)).toBe('Genderless');
    });
  });

  describe('Encounter Tables', () => {
    it('should calculate levels correctly', () => {
      expect(calculateLevel(0, { min: 5, max: 7 })).toBe(5);
      expect(calculateLevel(1, { min: 5, max: 7 })).toBe(6);
      expect(calculateLevel(2, { min: 5, max: 7 })).toBe(7);
      expect(calculateLevel(10, { min: 10, max: 10 })).toBe(10);
    });
  });

  describe('Pokemon Species', () => {
    it('should have species data for Gen 5 starters', () => {
      const snivy = getPokemonSpecies(495);
      expect(snivy).toBeDefined();
      expect(snivy?.name).toBe('Snivy');
      expect(snivy?.types).toEqual(['Grass']);

      const tepig = getPokemonSpecies(498);
      expect(tepig).toBeDefined();
      expect(tepig?.name).toBe('Tepig');
      expect(tepig?.types).toEqual(['Fire']);

      const oshawott = getPokemonSpecies(501);
      expect(oshawott).toBeDefined();
      expect(oshawott?.name).toBe('Oshawott');
      expect(oshawott?.types).toEqual(['Water']);
    });

    it('should return null for unknown species', () => {
      expect(getPokemonSpecies(99999)).toBeNull();
    });
  });
});
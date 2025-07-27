/**
 * Application initialization logic
 * Handles WebAssembly setup and basic initialization
 * Production-focused with minimal overhead
 */

export interface InitializationResult {
  wasmEnabled: boolean;
  integratedSearchAvailable: boolean;
  calculator?: any;
}

export async function initializeApplication(): Promise<InitializationResult> {
  try {
    const { SeedCalculator } = await import('@/lib/core/seed-calculator');
    const calculator = new SeedCalculator();
    const wasmSuccess = await calculator.initializeWasm();
    
    if (wasmSuccess) {
      // Test integrated search availability
      const wasmModule = calculator.getWasmModule();
      const integratedSearchAvailable = wasmModule && wasmModule.IntegratedSeedSearcher;

      return {
        wasmEnabled: true,
        integratedSearchAvailable: !!integratedSearchAvailable,
        calculator
      };
    } else {
      return {
        wasmEnabled: false,
        integratedSearchAvailable: false,
        calculator
      };
    }
  } catch (error) {
    console.warn('Failed to initialize WebAssembly, using TypeScript fallback:', error);
    return {
      wasmEnabled: false,
      integratedSearchAvailable: false
    };
  }
}

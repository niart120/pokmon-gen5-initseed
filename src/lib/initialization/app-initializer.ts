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
  console.log('🚀 Initializing Pokemon BW/BW2 Seed Search App...');

  try {
    const { SeedCalculator } = await import('@/lib/core/seed-calculator');
    const calculator = new SeedCalculator();
    const wasmSuccess = await calculator.initializeWasm();
    
    if (wasmSuccess) {
      console.log('🦀 WebAssembly acceleration enabled!');
      
      // Test integrated search availability
      const wasmModule = calculator.getWasmModule();
      const integratedSearchAvailable = wasmModule && wasmModule.IntegratedSeedSearcher;
      
      if (integratedSearchAvailable) {
        console.log('🚀 Integrated search available for optimal performance');
      }

      return {
        wasmEnabled: true,
        integratedSearchAvailable: !!integratedSearchAvailable,
        calculator
      };
    } else {
      console.log('⚠️ Running with TypeScript implementation');
      return {
        wasmEnabled: false,
        integratedSearchAvailable: false,
        calculator
      };
    }
  } catch (error) {
    console.warn('⚠️ Failed to initialize WebAssembly, using TypeScript fallback:', error);
    return {
      wasmEnabled: false,
      integratedSearchAvailable: false
    };
  }
}

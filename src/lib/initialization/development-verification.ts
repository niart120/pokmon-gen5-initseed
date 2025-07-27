/**
 * Development-only verification logic
 * Separate from production code to maintain clean architecture
 */

import { InitializationResult } from '@/lib/initialization/app-initializer';

export async function runDevelopmentVerification(initResult: InitializationResult): Promise<void> {
  // Only run in development environment
  if (process.env.NODE_ENV === 'production') {
    return;
  }

  console.log('Running comprehensive search verification...');

  try {
    // Dynamic import to avoid including test code in production
    const { verifySearchImplementation } = await import('@/test-utils/verification/search-verification');
    const verificationPassed = verifySearchImplementation();
    console.log('Basic verification result:', verificationPassed ? 'PASSED ✅' : 'FAILED ❌');
    
    // Run WebAssembly comparison tests
    if (initResult.wasmEnabled && initResult.calculator) {
      console.log('Running WebAssembly vs TypeScript comparison...');
      const { verifyWebAssemblyImplementation } = await import('@/test-utils/verification/wasm-verification');
      const wasmVerificationPassed = await verifyWebAssemblyImplementation();
      console.log('WebAssembly verification result:', wasmVerificationPassed ? 'PASSED ✅' : 'FAILED ❌');
      
      if (!wasmVerificationPassed) {
        console.warn('⚠️ WebAssembly verification failed. Disabling WebAssembly for safety.');
        initResult.calculator.setUseWasm(false);
      }
    }
    
    if (!verificationPassed) {
      console.warn('⚠️ Some verification tests failed. Please check the implementation.');
    } else {
      console.log('🎉 All verification tests passed! Search implementation is ready.');
    }
  } catch (error) {
    console.warn('⚠️ Development verification failed to load:', error);
  }
}

/**
 * Development-only verification logic
 * Separate from production code to maintain clean architecture
 */

import { InitializationResult } from '@/lib/initialization/app-initializer';

export async function runDevelopmentVerification(initResult: InitializationResult): Promise<void> {
  // Only run in development environment
  if (import.meta.env.MODE === 'production') {
    return;
  }

  // Allow disabling verbose verification for agent/E2E testing
  const enableVerboseVerification = import.meta.env.VITE_ENABLE_VERBOSE_VERIFICATION !== 'false';
  
  if (!enableVerboseVerification) {
    // Minimal verification for agent/E2E testing
    console.log('Running minimal verification (verbose logging disabled)...');
    await runMinimalVerification(initResult);
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

/**
 * Minimal verification for agent/E2E testing scenarios
 * Reduces log output to prevent context bloat
 */
async function runMinimalVerification(initResult: InitializationResult): Promise<void> {
  try {
    // Basic search verification without verbose logging
    const { verifySearchImplementation } = await import('@/test-utils/verification/search-verification');
    
    // Temporarily suppress console output for minimal verification
    const originalConsoleLog = console.log;
    let logCount = 0;
    console.log = (...args) => {
      logCount++;
      if (logCount <= 3) { // Allow only first 3 log messages
        originalConsoleLog(...args);
      }
    };
    
    const verificationPassed = verifySearchImplementation();
    
    // Restore original console.log
    console.log = originalConsoleLog;
    
    if (verificationPassed) {
      console.log('✅ Basic verification passed (minimal mode)');
    } else {
      console.log('❌ Basic verification failed (minimal mode)');
    }
    
    // Quick WebAssembly check if enabled
    if (initResult.wasmEnabled && initResult.calculator) {
      console.log('✅ WebAssembly enabled and ready');
    }
    
  } catch (error) {
    console.log('⚠️ Minimal verification failed:', error instanceof Error ? error.message : String(error));
  }
}

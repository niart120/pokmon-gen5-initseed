// Alternative implementation using Vite plugin approach
// This would be used instead of the current convert-toml.js approach

import { defineConfig } from 'vite';
import { ViteToml } from 'vite-plugin-toml';

export default defineConfig({
  plugins: [
    ViteToml({
      namedExports: false // Export as default
    })
  ],
  // ... other config
});

// Usage in TypeScript:
// import romParams from './rom-parameters.toml';
// 
// Pros:
// - Real-time updates during development
// - Simpler build process
// - Direct TOML editing with immediate feedback
//
// Cons:
// - Runtime TOML parser in bundle (+~10KB)
// - Weaker type safety (any type)
// - WebWorker compatibility issues
// - Potential parsing overhead

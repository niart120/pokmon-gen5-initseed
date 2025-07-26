// Hybrid approach example
// Development: Direct TOML loading
// Production: Pre-compiled constants

let romParameters: typeof import('./rom-parameters').default;

if (import.meta.env.DEV) {
  // Development: Direct TOML loading for hot reload
  const toml = await import('@iarna/toml');
  const response = await fetch('./rom-parameters.toml');
  const tomlText = await response.text();
  romParameters = toml.parse(tomlText);
} else {
  // Production: Pre-compiled constants
  romParameters = (await import('./rom-parameters')).default;
}

export { romParameters };

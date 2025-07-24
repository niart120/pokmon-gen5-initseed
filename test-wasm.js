// Quick WebAssembly test
console.log('Testing WebAssembly functionality...');

// Run in Node.js
import('./src/lib/seed-calculator.js').then(async ({ SeedCalculator }) => {
  const calculator = new SeedCalculator();
  
  console.log('1. Testing WebAssembly initialization...');
  const wasmResult = await calculator.initializeWasm();
  console.log('WebAssembly init result:', wasmResult);
  console.log('Using WebAssembly:', calculator.isUsingWasm());
  
  console.log('\n2. Testing calculation...');
  
  // Test conditions
  const testConditions = {
    romVersion: 'B',
    romRegion: 'JPN',
    hardware: 'DS',
    macAddress: [0x00, 0x16, 0x56, 0xAE, 0xBB, 0xCC],
    keyInput: 0x02000000
  };
  
  // Test date
  const testDate = new Date(2023, 11, 31, 23, 59, 59); // Dec 31, 2023 23:59:59
  
  // Generate message
  const message = calculator.generateMessage(testConditions, 5000, 156, testDate);
  console.log('Generated message length:', message.length);
  console.log('Message (first 5 elements):', message.slice(0, 5).map(x => '0x' + x.toString(16)));
  
  // Calculate seed
  const result = calculator.calculateSeed(message);
  console.log('Calculation result:', result);
  console.log('Seed (hex):', '0x' + result.seed.toString(16).padStart(8, '0'));
  console.log('Hash:', result.hash);
  
}).catch(error => {
  console.error('Test failed:', error);
});

// debug/run-debug.js - Simple Node.js debug runner
const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 FlexFinance Debug Suite');
console.log('==========================\n');

console.log('🔧 Running debug tests with Expo environment...\n');

// Use npx to run the debug script with Expo's environment
const debugProcess = spawn('npx', ['expo', 'start', '--dev-client'], {
  cwd: path.join(__dirname, '..'),
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'development' }
});

debugProcess.on('error', (error) => {
  console.error('❌ Failed to start debug process:', error);
  process.exit(1);
});

debugProcess.on('close', (code) => {
  if (code !== 0) {
    console.error(`❌ Debug process exited with code ${code}`);
    process.exit(code);
  }
  console.log('✅ Debug process completed successfully');
});

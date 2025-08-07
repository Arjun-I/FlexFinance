// Simulate Expo's environment variable loading
require('dotenv').config();

console.log('🔍 Testing API Key Configuration (Expo Style)...\n');

// Test environment variables as Expo would load them
const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
const FINNHUB_API_KEY = process.env.EXPO_PUBLIC_FINNHUB_API_KEY;

console.log('🤖 OpenAI API Key Status:');
console.log('  Has Key:', !!OPENAI_API_KEY);
console.log('  Key Length:', OPENAI_API_KEY ? OPENAI_API_KEY.length : 0);
console.log('  Key Start:', OPENAI_API_KEY ? OPENAI_API_KEY.substring(0, 10) + '...' : 'none');
console.log('  Is Valid:', OPENAI_API_KEY && OPENAI_API_KEY.startsWith('sk-'));
console.log('');

console.log('📈 Finnhub API Key Status:');
console.log('  Has Key:', !!FINNHUB_API_KEY);
console.log('  Key Length:', FINNHUB_API_KEY ? FINNHUB_API_KEY.length : 0);
console.log('  Key Start:', FINNHUB_API_KEY ? FINNHUB_API_KEY.substring(0, 10) + '...' : 'none');
console.log('  Is Valid:', FINNHUB_API_KEY && FINNHUB_API_KEY.length > 20);
console.log('');

// Summary
console.log('📋 Summary:');
if (OPENAI_API_KEY && OPENAI_API_KEY.startsWith('sk-')) {
  console.log('✅ OpenAI API key configured correctly');
} else {
  console.log('❌ OpenAI API key not configured or invalid');
}

if (FINNHUB_API_KEY && FINNHUB_API_KEY.length > 20) {
  console.log('✅ Finnhub API key configured correctly');
} else {
  console.log('❌ Finnhub API key not configured or invalid');
}

console.log('\n🎯 The issue might be:');
console.log('1. Expo development server needs to be restarted to pick up .env changes');
console.log('2. The app is running in a different environment (web vs mobile)');
console.log('3. The LLM service is failing for a different reason');

console.log('\n🔧 Try this:');
console.log('1. Stop your Expo server (Ctrl+C)');
console.log('2. Run: npx expo start --clear');
console.log('3. Test the stock generation again'); 
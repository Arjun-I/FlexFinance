console.log('🔍 Testing API Key Configuration...\n');

// Test environment variables directly
const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
const FINNHUB_API_KEY = process.env.EXPO_PUBLIC_FINNHUB_API_KEY;

console.log('🤖 OpenAI API Key Status:');
console.log('  Has Key:', !!OPENAI_API_KEY);
console.log('  Key Length:', OPENAI_API_KEY ? OPENAI_API_KEY.length : 0);
console.log('  Key Start:', OPENAI_API_KEY ? OPENAI_API_KEY.substring(0, 10) + '...' : 'none');
console.log('  Is Placeholder:', OPENAI_API_KEY === "sk-placeholder-key" || OPENAI_API_KEY === "your_openai_api_key_here" || OPENAI_API_KEY?.includes("placeholder"));
console.log('');

console.log('📈 Finnhub API Key Status:');
console.log('  Has Key:', !!FINNHUB_API_KEY);
console.log('  Key Length:', FINNHUB_API_KEY ? FINNHUB_API_KEY.length : 0);
console.log('  Key Start:', FINNHUB_API_KEY ? FINNHUB_API_KEY.substring(0, 10) + '...' : 'none');
console.log('  Is Placeholder:', FINNHUB_API_KEY === "your_finnhub_api_key_here" || FINNHUB_API_KEY?.includes("placeholder"));
console.log('');

// Summary
console.log('📋 Summary:');
if (!OPENAI_API_KEY || OPENAI_API_KEY === "your_openai_api_key_here") {
  console.log('❌ OpenAI API key not configured - LLM recommendations will fail');
  console.log('💡 To fix: Get a free API key from https://platform.openai.com/api-keys');
  console.log('💡 Then add EXPO_PUBLIC_OPENAI_API_KEY=your_key_here to your .env file');
} else {
  console.log('✅ OpenAI API key configured');
}

if (!FINNHUB_API_KEY || FINNHUB_API_KEY === "your_finnhub_api_key_here") {
  console.log('❌ Finnhub API key not configured - Real-time data will fail');
  console.log('💡 To fix: Get a free API key from https://finnhub.io/');
  console.log('💡 Then add EXPO_PUBLIC_FINNHUB_API_KEY=your_key_here to your .env file');
} else {
  console.log('✅ Finnhub API key configured');
}

console.log('\n🔧 Next Steps:');
console.log('1. Create a .env file in your project root if it doesn\'t exist');
console.log('2. Add your API keys to the .env file');
console.log('3. Restart your Expo development server');
console.log('4. Test the stock generation again'); 
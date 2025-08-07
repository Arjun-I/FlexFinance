// debug/test-groq.js - Test Groq API independently
import groqService from '../services/groqService.js';

async function testGroqAPI() {
  console.log('🧪 Testing Groq API...\n');
  
  try {
    // Test 1: Basic API connectivity
    console.log('1️⃣ Testing basic LLM call...');
    const basicPrompt = 'Respond with exactly: {"test": "success"}';
    const basicResponse = await groqService.callLLM(basicPrompt, 100);
    console.log('✅ Basic response:', basicResponse);
    console.log('');

    // Test 2: Stock recommendations without context
    console.log('2️⃣ Testing stock recommendations (no context)...');
    const noContextRecs = await groqService.getRecommendations(3);
    console.log('✅ No-context recommendations count:', noContextRecs.length);
    console.log('✅ Sample recommendation:', noContextRecs[0]);
    console.log('');

    // Test 3: Stock recommendations with mock risk context
    console.log('3️⃣ Testing stock recommendations (with risk context)...');
    const mockContext = {
      riskProfile: {
        volatility: 3, // Conservative
        timeHorizon: 'long-term',
        knowledge: 'beginner',
        ethics: 'neutral',
        liquidity: 'high'
      },
      userPreferences: {
        likedStocks: ['AAPL', 'MSFT'],
        rejectedStocks: ['TSLA'],
        portfolio: [{ symbol: 'SPY', shares: 10 }]
      }
    };
    
    const contextRecs = await groqService.getRecommendations(3, mockContext);
    console.log('✅ Context-aware recommendations count:', contextRecs.length);
    console.log('✅ Sample context recommendation:', contextRecs[0]);
    console.log('');

    // Test 4: Verify context snippet generation
    console.log('4️⃣ Testing context snippet generation...');
    const contextSnippet = groqService.getContextSnippet(mockContext);
    console.log('✅ Generated context snippet:');
    console.log(contextSnippet);
    console.log('');

    console.log('🎉 All Groq tests passed!');
    return true;

  } catch (error) {
    console.error('❌ Groq test failed:', error.message);
    console.error('🔍 Full error:', error);
    return false;
  }
}

// Export for use in other scripts
export { testGroqAPI };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testGroqAPI()
    .then(success => process.exit(success ? 0 : 1))
    .catch(err => {
      console.error('💥 Unexpected error:', err);
      process.exit(1);
    });
}

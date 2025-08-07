// debug/test-generation.js - Test end-to-end stock generation
import StockGenerationService from '../services/stockGenerationService.js';

async function testStockGeneration() {
  console.log('🧪 Testing end-to-end stock generation...\n');
  
  try {
    // Test user data
    const testUserId = 'debug-user-' + Date.now();
    const mockRiskProfile = {
      volatility: 4, // Moderate risk
      timeHorizon: 'long-term',
      knowledge: 'intermediate',
      ethics: 'neutral',
      liquidity: 'medium'
    };

    const mockUserPreferences = {
      likedStocks: ['AAPL', 'MSFT'],
      rejectedStocks: ['GME', 'AMC'],
      portfolio: [
        { symbol: 'SPY', shares: 20, averagePrice: 420.00 },
        { symbol: 'QQQ', shares: 10, averagePrice: 350.00 }
      ]
    };

    console.log('👤 Test user setup:', {
      userId: testUserId,
      riskVolatility: mockRiskProfile.volatility,
      likedStocks: mockUserPreferences.likedStocks.length,
      portfolioHoldings: mockUserPreferences.portfolio.length
    });
    console.log('');

    // Initialize service
    console.log('🔧 Initializing StockGenerationService...');
    const service = new StockGenerationService();
    await service.initialize(testUserId, mockRiskProfile, mockUserPreferences);
    console.log('✅ Service initialized');
    console.log('');

    // Test 1: Clear existing stocks
    console.log('1️⃣ Testing clear stocks operation...');
    await service.clearAllStocks();
    console.log('✅ Stocks cleared');
    console.log('');

    // Test 2: Generate initial recommendations
    console.log('2️⃣ Testing initial recommendations generation...');
    console.log('⏳ This may take 30-60 seconds due to API calls...');
    
    const startTime = Date.now();
    const initialStocks = await service.generateInitialRecommendations();
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log('✅ Initial recommendations completed in', duration, 'seconds');
    console.log('✅ Generated stocks count:', initialStocks.length);
    
    if (initialStocks.length > 0) {
      console.log('✅ Sample generated stock:', {
        symbol: initialStocks[0].symbol,
        name: initialStocks[0].name,
        sector: initialStocks[0].sector,
        price: initialStocks[0].price,
        riskLevel: initialStocks[0].riskLevel,
        confidence: initialStocks[0].confidence
      });
    }
    console.log('');

    // Test 3: Get generated stocks from Firebase
    console.log('3️⃣ Testing stock retrieval from Firebase...');
    const retrievedStocks = await service.getGeneratedStocks();
    console.log('✅ Retrieved stocks count:', retrievedStocks.length);
    
    if (retrievedStocks.length !== initialStocks.length) {
      console.log('⚠️ Mismatch between generated and retrieved counts');
    } else {
      console.log('✅ Generated and retrieved counts match');
    }
    console.log('');

    // Test 4: Test personalized generation
    console.log('4️⃣ Testing personalized recommendations...');
    
    // Simulate some user interactions first
    await service.handleStockSwipe('AAPL', 'like');
    await service.handleStockSwipe('TSLA', 'reject');
    console.log('✅ Simulated user swipes');
    
    const personalizedStocks = await service.generatePersonalizedRecommendations(5);
    console.log('✅ Personalized recommendations count:', personalizedStocks.length);
    
    if (personalizedStocks.length > 0) {
      console.log('✅ Sample personalized stock:', {
        symbol: personalizedStocks[0].symbol,
        name: personalizedStocks[0].name,
        riskLevel: personalizedStocks[0].riskLevel
      });
    }
    console.log('');

    // Test 5: Test stock analysis generation
    console.log('5️⃣ Testing individual stock analysis...');
    const analysisSymbol = 'AAPL';
    const mockCompanyData = {
      name: 'Apple Inc.',
      country: 'US',
      currency: 'USD',
      exchange: 'NASDAQ',
      marketCapitalization: 3000000
    };
    const mockQuoteData = {
      symbol: analysisSymbol,
      price: 150.00,
      change: 2.50,
      changePercent: 1.69
    };
    
    const analysis = await service.generateStockAnalysis(analysisSymbol, mockCompanyData, mockQuoteData);
    console.log('✅ Generated analysis for', analysisSymbol);
    console.log('✅ Analysis preview:', analysis.substring(0, 200) + '...');
    console.log('');

    // Test 6: Cleanup
    console.log('6️⃣ Cleaning up test data...');
    await service.clearAllStocks();
    console.log('✅ Test data cleaned up');
    console.log('');

    // Summary
    console.log('📊 Generation Test Summary:');
    console.log('- Initial recommendations:', initialStocks.length);
    console.log('- Firebase retrieval:', retrievedStocks.length);
    console.log('- Personalized recommendations:', personalizedStocks.length);
    console.log('- Analysis generation: ✅');
    console.log('- Total duration:', duration, 'seconds');
    console.log('');

    console.log('🎉 Stock generation tests completed successfully!');
    return true;

  } catch (error) {
    console.error('❌ Stock generation test failed:', error.message);
    console.error('🔍 Full error:', error);
    console.error('📋 Stack trace:', error.stack);
    return false;
  }
}

// Export for use in other scripts
export { testStockGeneration };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testStockGeneration()
    .then(success => process.exit(success ? 0 : 1))
    .catch(err => {
      console.error('💥 Unexpected error:', err);
      process.exit(1);
    });
}

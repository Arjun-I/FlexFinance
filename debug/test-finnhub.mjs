// debug/test-finnhub.js - Test Finnhub API independently
import { getStockQuote, getCompanyProfile, getMultipleQuotes } from '../services/finnhubService.js';

async function testFinnhubAPI() {
  console.log('🧪 Testing Finnhub API...\n');
  
  const testSymbols = ['AAPL', 'MSFT', 'GOOGL'];
  
  try {
    // Test 1: Single stock quote
    console.log('1️⃣ Testing single stock quote...');
    const quote = await getStockQuote('AAPL');
    console.log('✅ AAPL quote:', {
      symbol: quote.symbol,
      price: quote.price,
      change: quote.change,
      changePercent: quote.changePercent,
      hasAllFields: !!(quote.price && quote.change !== undefined && quote.changePercent !== undefined)
    });
    console.log('');

    // Test 2: Company profile
    console.log('2️⃣ Testing company profile...');
    const profile = await getCompanyProfile('AAPL');
    console.log('✅ AAPL profile:', {
      name: profile.name,
      country: profile.country,
      currency: profile.currency,
      exchange: profile.exchange,
      ipo: profile.ipo,
      marketCapitalization: profile.marketCapitalization,
      shareOutstanding: profile.shareOutstanding,
      hasBasicFields: !!(profile.name && profile.country)
    });
    console.log('');

    // Test 3: Multiple quotes
    console.log('3️⃣ Testing multiple quotes...');
    const quotes = await getMultipleQuotes(testSymbols);
    console.log('✅ Multiple quotes result type:', Array.isArray(quotes) ? 'Array' : typeof quotes);
    console.log('✅ Quotes count:', Array.isArray(quotes) ? quotes.length : 'N/A');
    
    if (Array.isArray(quotes) && quotes.length > 0) {
      console.log('✅ Sample quote from batch:', {
        symbol: quotes[0].symbol,
        price: quotes[0].price,
        change: quotes[0].change,
        changePercent: quotes[0].changePercent
      });
    }
    console.log('');

    // Test 4: Error handling for invalid symbol
    console.log('4️⃣ Testing error handling (invalid symbol)...');
    try {
      const invalidQuote = await getStockQuote('INVALID_SYMBOL_XYZ');
      console.log('⚠️ Invalid symbol returned:', invalidQuote);
    } catch (error) {
      console.log('✅ Invalid symbol correctly threw error:', error.message);
    }
    console.log('');

    // Test 5: Rate limiting behavior
    console.log('5️⃣ Testing rapid successive calls...');
    const rapidCalls = await Promise.allSettled([
      getStockQuote('AAPL'),
      getStockQuote('MSFT'),
      getStockQuote('GOOGL'),
      getStockQuote('TSLA'),
      getStockQuote('AMZN')
    ]);
    
    const successCount = rapidCalls.filter(result => result.status === 'fulfilled').length;
    const errorCount = rapidCalls.filter(result => result.status === 'rejected').length;
    
    console.log('✅ Rapid calls results:', {
      successful: successCount,
      failed: errorCount,
      total: rapidCalls.length
    });
    
    if (errorCount > 0) {
      console.log('⚠️ Some calls failed - potential rate limiting:');
      rapidCalls.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.log(`   Call ${index + 1}: ${result.reason.message}`);
        }
      });
    }
    console.log('');

    console.log('🎉 Finnhub tests completed!');
    return true;

  } catch (error) {
    console.error('❌ Finnhub test failed:', error.message);
    console.error('🔍 Full error:', error);
    return false;
  }
}

// Export for use in other scripts
export { testFinnhubAPI };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testFinnhubAPI()
    .then(success => process.exit(success ? 0 : 1))
    .catch(err => {
      console.error('💥 Unexpected error:', err);
      process.exit(1);
    });
}

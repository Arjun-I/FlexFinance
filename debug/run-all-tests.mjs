// debug/run-all-tests.js - Main debug runner script
import { testGroqAPI } from './test-groq.mjs';
import { testFinnhubAPI } from './test-finnhub.mjs';
import { testFirebaseOperations } from './test-firebase.mjs';
import { testStockGeneration } from './test-generation.mjs';

async function runAllTests() {
  console.log('🚀 FlexFinance Debug Suite');
  console.log('==========================\n');
  
  const results = {
    groq: false,
    finnhub: false,
    firebase: false,
    generation: false
  };
  
  const startTime = Date.now();
  
  try {
    // Test 1: Groq API
    console.log('🧪 RUNNING GROQ API TESTS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━');
    results.groq = await testGroqAPI();
    console.log('');
    
    // Test 2: Finnhub API
    console.log('🧪 RUNNING FINNHUB API TESTS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    results.finnhub = await testFinnhubAPI();
    console.log('');
    
    // Test 3: Firebase Operations
    console.log('🧪 RUNNING FIREBASE TESTS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━');
    results.firebase = await testFirebaseOperations();
    console.log('');
    
    // Test 4: End-to-End Stock Generation (only if dependencies pass)
    if (results.groq && results.finnhub && results.firebase) {
      console.log('🧪 RUNNING END-TO-END GENERATION TESTS');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      results.generation = await testStockGeneration();
    } else {
      console.log('🧪 SKIPPING END-TO-END TESTS');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('❌ Dependencies failed - skipping comprehensive test');
      results.generation = false;
    }
    console.log('');
    
  } catch (error) {
    console.error('💥 Critical error in test suite:', error);
  }
  
  // Summary Report
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log('📊 FINAL TEST RESULTS');
  console.log('━━━━━━━━━━━━━━━━━━━━');
  console.log(`🕒 Total Duration: ${duration} seconds`);
  console.log(`📈 Tests Passed: ${passedTests}/${totalTests}`);
  console.log('');
  
  console.log('Individual Results:');
  console.log(`${results.groq ? '✅' : '❌'} Groq API: ${results.groq ? 'PASS' : 'FAIL'}`);
  console.log(`${results.finnhub ? '✅' : '❌'} Finnhub API: ${results.finnhub ? 'PASS' : 'FAIL'}`);
  console.log(`${results.firebase ? '✅' : '❌'} Firebase: ${results.firebase ? 'PASS' : 'FAIL'}`);
  console.log(`${results.generation ? '✅' : '❌'} Stock Generation: ${results.generation ? 'PASS' : 'FAIL'}`);
  console.log('');
  
  // Diagnosis
  if (passedTests === totalTests) {
    console.log('🎉 ALL SYSTEMS OPERATIONAL!');
    console.log('The stock generation pipeline should work correctly.');
    console.log('If you\'re still seeing "No Stocks Available", the issue may be:');
    console.log('- User authentication not completed');
    console.log('- Risk quiz not completed');
    console.log('- App cache/state issues');
    console.log('');
    console.log('🔧 Recommended actions:');
    console.log('1. Clear app cache: npx expo start --clear');
    console.log('2. Complete login and risk quiz');
    console.log('3. Check console logs during generation');
  } else {
    console.log('⚠️ ISSUES DETECTED');
    console.log('The following systems have problems:');
    if (!results.groq) console.log('- Groq API (LLM recommendations)');
    if (!results.finnhub) console.log('- Finnhub API (stock data)');
    if (!results.firebase) console.log('- Firebase (data storage)');
    if (!results.generation) console.log('- Stock Generation Pipeline');
    console.log('');
    console.log('🔧 Fix these issues before trying to generate stocks in the app.');
  }
  
  return passedTests === totalTests;
}

// Export for use in other scripts
export { runAllTests };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests()
    .then(success => {
      console.log(success ? '🎯 All tests passed!' : '💥 Some tests failed!');
      process.exit(success ? 0 : 1);
    })
    .catch(err => {
      console.error('💥 Unexpected error in test runner:', err);
      process.exit(1);
    });
}

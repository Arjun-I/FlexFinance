// components/DebugPanel.js - In-app debug panel
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import groqService from '../services/groqService';
import { getStockQuote, getCompanyProfile, getMultipleQuotes } from '../services/finnhubService';
import StockGenerationService from '../services/stockGenerationService';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import Constants from 'expo-constants';

const DebugPanel = ({ user }) => {
  const [results, setResults] = useState([]);
  const [isRunning, setIsRunning] = useState(false);

  const log = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setResults(prev => [...prev, { timestamp, message, type }]);
    console.log(`[${timestamp}] ${message}`);
  };

  const clearResults = () => {
    setResults([]);
  };

  const testGroqAPI = async () => {
    try {
      log('🧪 Testing Groq API...', 'info');
      
      // Basic test
      const basicResponse = await groqService.callLLM('Respond with exactly: {"test": "success"}', 100);
      log('✅ Basic Groq response received', 'success');
      
      // Test raw LLM response first
      log('🔍 Testing raw LLM response...', 'info');
      const testPrompt = `Generate 2 stock recommendations. Return ONLY a JSON array like:
[
  {
    "symbol": "AAPL",
    "name": "Apple Inc",
    "sector": "Technology",
    "industry": "Consumer Electronics",
    "reason": "Strong fundamentals",
    "analysis": "Market leader",
    "riskLevel": "medium",
    "confidence": 0.8,
    "marketCap": "large",
    "growthPotential": "medium",
    "investmentHorizon": "long-term",
    "keyRisks": ["Competition"],
    "keyBenefits": ["Innovation"],
    "targetPrice": "$200.00",
    "dividendYield": "0.5%",
    "recommendation": "buy"
  }
]`;
      
      const rawResponse = await groqService.callLLM(testPrompt, 500);
      log('📝 Raw LLM response preview:', 'info');
      log(rawResponse.substring(0, 300) + '...', 'info');
      
      // Test parsing specifically
      try {
        const parsed = groqService.parseRecommendations(rawResponse);
        log(`✅ Successfully parsed ${parsed.length} from raw response`, 'success');
      } catch (parseError) {
        log(`❌ Parse error: ${parseError.message}`, 'error');
        log('🔍 Full raw response:', 'info');
        log(rawResponse, 'info');
      }
      
      // Now test full recommendations
      const mockContext = {
        riskProfile: { volatility: 3, timeHorizon: 'long-term' },
        userPreferences: { likedStocks: ['AAPL'], rejectedStocks: ['TSLA'] }
      };
      
      const recs = await groqService.getRecommendations(3, mockContext);
      log(`✅ Generated ${recs.length} risk-aware recommendations`, 'success');
      if (recs.length > 0) {
        log(`Sample: ${recs[0]?.symbol} - ${recs[0]?.name}`, 'info');
      } else {
        log('⚠️ No recommendations returned', 'error');
      }
      
    } catch (error) {
      log(`❌ Groq test failed: ${error.message}`, 'error');
    }
  };

  const testFinnhubAPI = async () => {
    try {
      log('🧪 Testing Finnhub API...', 'info');
      
      // Single quote test
      const quote = await getStockQuote('AAPL');
      log(`✅ AAPL quote: $${quote.price} (${quote.changePercent}%)`, 'success');
      
      // Multiple quotes test
      const quotes = await getMultipleQuotes(['AAPL', 'MSFT', 'GOOGL']);
      log(`✅ Retrieved ${quotes.length} quotes in batch`, 'success');
      
      // Company profile test
      const profile = await getCompanyProfile('AAPL');
      log(`✅ Company profile: ${profile.name} (${profile.country})`, 'success');
      
    } catch (error) {
      log(`❌ Finnhub test failed: ${error.message}`, 'error');
    }
  };

  const testFirebase = async () => {
    try {
      log('🧪 Testing Firebase...', 'info');
      
      if (!user) {
        log('❌ No authenticated user for Firebase test', 'error');
        return;
      }
      
      // Initialize Firebase
      const firebaseConfig = {
        apiKey: Constants.expoConfig?.extra?.EXPO_PUBLIC_FIREBASE_API_KEY,
        authDomain: Constants.expoConfig?.extra?.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: Constants.expoConfig?.extra?.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: Constants.expoConfig?.extra?.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: Constants.expoConfig?.extra?.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: Constants.expoConfig?.extra?.EXPO_PUBLIC_FIREBASE_APP_ID
      };
      
      const app = initializeApp(firebaseConfig);
      const db = getFirestore(app);
      
      // Test document write/read
      const testDoc = { test: true, timestamp: Date.now() };
      await setDoc(doc(db, 'users', user.uid, 'debug', 'test'), testDoc);
      log('✅ Firebase write successful', 'success');
      
      const readDoc = await getDoc(doc(db, 'users', user.uid, 'debug', 'test'));
      if (readDoc.exists()) {
        log('✅ Firebase read successful', 'success');
        // Cleanup
        await deleteDoc(doc(db, 'users', user.uid, 'debug', 'test'));
        log('✅ Firebase cleanup successful', 'success');
      } else {
        log('❌ Firebase read failed', 'error');
      }
      
    } catch (error) {
      log(`❌ Firebase test failed: ${error.message}`, 'error');
    }
  };

  const testStockGeneration = async () => {
    try {
      log('🧪 Testing Stock Generation...', 'info');
      
      if (!user) {
        log('❌ No authenticated user for generation test', 'error');
        return;
      }
      
      const mockRiskProfile = {
        volatility: 4,
        timeHorizon: 'long-term',
        knowledge: 'intermediate'
      };
      
      const mockPreferences = {
        likedStocks: ['AAPL'],
        rejectedStocks: ['TSLA'],
        portfolio: []
      };
      
      const service = StockGenerationService;
      
      // Load user context (the service will automatically load it)
      const contextLoaded = await service.loadUserContext();
      if (contextLoaded) {
        log('✅ StockGenerationService context loaded', 'success');
      } else {
        log('❌ Failed to load user context', 'error');
        return;
      }
      
      // Clear existing stocks
      await service.clearAllStocks();
      log('✅ Existing stocks cleared', 'success');
      
      // Generate recommendations
      log('⏳ Generating recommendations (this may take 30-60s)...', 'info');
      
      // Override parseRecommendations temporarily to log the raw response
      const originalParse = groqService.parseRecommendations;
      groqService.parseRecommendations = function(response) {
        log('🔍 Full generation raw response:', 'info');
        log(response.substring(0, 500) + '...', 'info');
        return originalParse.call(this, response);
      };
      
      const stocks = await service.generateInitialRecommendations();
      
      // Restore original method
      groqService.parseRecommendations = originalParse;
      log(`✅ Generated ${stocks.length} recommendations`, 'success');
      
      if (stocks.length > 0) {
        log(`Sample: ${stocks[0].symbol} - ${stocks[0].name} (${stocks[0].riskLevel} risk)`, 'info');
      }
      
      // Test retrieval
      const retrieved = await service.getGeneratedStocks();
      log(`✅ Retrieved ${retrieved.length} stocks from Firebase`, 'success');
      
      // Test stock pairs functionality
      const pairs = await service.getStockPairs();
      log(`✅ Stock pairs: ${pairs.length} pairs available`, 'success');
      
      // Test recording a choice (simulate accepting first stock)
      if (retrieved.length > 0) {
        const testStock = retrieved[0];
        await service.recordUserChoice(testStock.symbol, 'like', testStock);
        log(`✅ Recorded test choice: liked ${testStock.symbol}`, 'success');
      }
      
    } catch (error) {
      log(`❌ Stock generation test failed: ${error.message}`, 'error');
    }
  };

  const runAllTests = async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    clearResults();
    
    log('🚀 Starting comprehensive debug tests...', 'info');
    
    await testGroqAPI();
    await testFinnhubAPI();
    await testFirebase();
    await testStockGeneration();
    
    log('🎉 All tests completed!', 'info');
    setIsRunning(false);
  };

  const getStatusColor = (type) => {
    switch (type) {
      case 'success': return '#00C851';
      case 'error': return '#ff4444';
      case 'info': default: return '#33b5e5';
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔧 Debug Panel</Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, isRunning && styles.buttonDisabled]} 
          onPress={runAllTests}
          disabled={isRunning}
        >
          <Text style={styles.buttonText}>
            {isRunning ? '⏳ Running Tests...' : '🚀 Run All Tests'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.clearButton} onPress={clearResults}>
          <Text style={styles.buttonText}>🗑️ Clear</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.resultsContainer}>
        {results.map((result, index) => (
          <View key={index} style={styles.resultItem}>
            <Text style={[styles.timestamp, { color: getStatusColor(result.type) }]}>
              [{result.timestamp}]
            </Text>
            <Text style={[styles.message, { color: getStatusColor(result.type) }]}>
              {result.message}
            </Text>
          </View>
        ))}
      </ScrollView>
      
      {!user && (
        <Text style={styles.warning}>
          ⚠️ Please log in to run Firebase and generation tests
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    flex: 1,
    marginRight: 10,
  },
  clearButton: {
    backgroundColor: '#FF3B30',
    padding: 15,
    borderRadius: 8,
    flex: 0.3,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  resultsContainer: {
    flex: 1,
    backgroundColor: '#000',
    borderRadius: 8,
    padding: 10,
  },
  resultItem: {
    marginBottom: 5,
  },
  timestamp: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
  message: {
    fontSize: 14,
    fontFamily: 'monospace',
    marginLeft: 10,
  },
  warning: {
    textAlign: 'center',
    color: '#FF9500',
    fontWeight: 'bold',
    marginTop: 10,
  },
});

export default DebugPanel;

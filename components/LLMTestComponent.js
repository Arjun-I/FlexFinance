// LLMTestComponent.js - Test LLM Integration
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import stockGenerationService from '../services/stockGenerationService';
import llmService from '../services/llmService';
import Constants from 'expo-constants';

export default function LLMTestComponent() {
  const [loading, setLoading] = useState(false);
  const [generatedStocks, setGeneratedStocks] = useState([]);
  const [userContext, setUserContext] = useState(null);
  const [testResults, setTestResults] = useState([]);
  const [cacheStats, setCacheStats] = useState(null);

  // Test LLM service functionality
  const testLLMService = async () => {
    setLoading(true);
    const results = [];

    try {
      // Test 1: Load user context
      results.push('🔄 Testing user context loading...');
      const contextLoaded = await llmService.loadUserContext();
      if (contextLoaded) {
        results.push('✅ User context loaded successfully');
        setUserContext(llmService.userPreferences);
      } else {
        results.push('❌ Failed to load user context');
      }

      // Test 2: Get investment recommendations
      results.push('🔄 Testing LLM investment recommendations...');
      const recommendations = await llmService.getRecommendations(3);
      if (recommendations && recommendations.length > 0) {
        results.push(`✅ Generated ${recommendations.length} investment recommendations`);
        console.log('Investment Recommendations:', recommendations);
        
        // Test the quality of recommendations
        const hasAnalysis = recommendations.some(r => r.analysis || r.reason);
        const hasRisks = recommendations.some(r => r.keyRisks);
        const hasBenefits = recommendations.some(r => r.keyBenefits);
        
        if (hasAnalysis) results.push('✅ Recommendations include investment analysis');
        if (hasRisks) results.push('✅ Recommendations include risk assessment');
        if (hasBenefits) results.push('✅ Recommendations include key benefits');
        
        setGeneratedStocks(recommendations);
      } else {
        results.push('❌ Failed to generate investment recommendations');
      }

      // Test 3: Stock analysis
      results.push('🔄 Testing detailed stock analysis...');
      const analysis = await llmService.getStockAnalysis('AAPL');
      if (analysis && analysis.analysis) {
        results.push('✅ Detailed stock analysis generated successfully');
        console.log('Stock Analysis:', analysis);
      } else {
        results.push('❌ Failed to generate detailed stock analysis');
      }

    } catch (error) {
      results.push(`❌ Error: ${error.message}`);
      console.error('LLM Test Error:', error);
    }

    setTestResults(results);
    setLoading(false);
  };

  // Test stock generation service
  const testStockGeneration = async () => {
    setLoading(true);
    const results = [];

    try {
      // Test 1: Load user context
      results.push('🔄 Testing stock generation context...');
      const contextLoaded = await stockGenerationService.loadUserContext();
      if (contextLoaded) {
        results.push('✅ Stock generation context loaded');
      } else {
        results.push('❌ Failed to load stock generation context');
      }

      // Test 2: Generate personalized stocks
      results.push('🔄 Testing personalized stock generation...');
      const stocks = await stockGenerationService.generatePersonalizedStocks(5);
      if (stocks && stocks.length > 0) {
        results.push(`✅ Generated ${stocks.length} personalized stocks`);
        setGeneratedStocks(stocks);
        console.log('Generated stocks:', stocks);
      } else {
        results.push('❌ Failed to generate personalized stocks');
      }

      // Test 3: Generate daily stocks
      results.push('🔄 Testing daily stock generation...');
      const dailyStocks = await stockGenerationService.generateDailyStocks();
      if (dailyStocks && dailyStocks.length > 0) {
        results.push(`✅ Generated ${dailyStocks.length} daily stocks`);
        console.log('Daily stocks:', dailyStocks);
      } else {
        results.push('❌ Failed to generate daily stocks');
      }

    } catch (error) {
      results.push(`❌ Error: ${error.message}`);
      console.error('Stock Generation Test Error:', error);
    }

    setTestResults(results);
    setLoading(false);
  };

  // Test cache management
  const testCacheManagement = async () => {
    setLoading(true);
    const results = [];

    try {
      // Get cache statistics
      results.push('🔄 Testing cache management...');
      const stats = stockGenerationService.getCacheStats();
      setCacheStats(stats);
      results.push(`✅ Cache stats: ${stats.totalEntries} entries, ${stats.priceValid} price valid, ${stats.marketCapValid} market cap valid`);

      // Test cache cleanup
      results.push('🔄 Testing cache cleanup...');
      stockGenerationService.cleanupCache();
      const statsAfter = stockGenerationService.getCacheStats();
      results.push(`✅ Cache cleanup completed: ${statsAfter.totalEntries} entries remaining`);

      // Test force refresh
      results.push('🔄 Testing force refresh for AAPL...');
      const refreshedData = await stockGenerationService.forceRefreshCache('AAPL');
      if (refreshedData) {
        results.push('✅ Force refresh successful for AAPL');
      } else {
        results.push('❌ Force refresh failed for AAPL');
      }

    } catch (error) {
      results.push(`❌ Error: ${error.message}`);
      console.error('Cache Management Test Error:', error);
    }

    setTestResults(results);
    setLoading(false);
  };

  // Test API connectivity
  const testAPIConnectivity = async () => {
    setLoading(true);
    const results = [];

    try {
      // Test OpenAI API
      results.push('🔄 Testing OpenAI API connectivity...');
      const openaiKey = Constants.expoConfig?.extra?.EXPO_PUBLIC_OPENAI_API_KEY || process.env.EXPO_PUBLIC_OPENAI_API_KEY;
      if (openaiKey && openaiKey !== 'sk-placeholder-key' && openaiKey !== 'sk-your-actual-openai-key-here' && !openaiKey.includes('placeholder')) {
        results.push('✅ OpenAI API key configured (4o mini model)');
      } else {
        results.push('⚠️ OpenAI API key not configured or using placeholder');
      }

          // Test Yahoo Finance API
    results.push('🔄 Testing Yahoo Finance API connectivity...');
    const yahooEnabled = Constants.expoConfig?.extra?.EXPO_PUBLIC_YAHOO_FINANCE_ENABLED;
    if (yahooEnabled === 'true') {
      results.push('✅ Yahoo Finance API enabled (free, no key required)');
    } else {
      results.push('⚠️ Yahoo Finance API not enabled');
    }

      // Test Firebase connectivity
      results.push('🔄 Testing Firebase connectivity...');
      const firebaseKey = Constants.expoConfig?.extra?.EXPO_PUBLIC_FIREBASE_API_KEY;
      if (firebaseKey) {
        results.push('✅ Firebase API key configured');
      } else {
        results.push('❌ Firebase API key not configured');
      }

    } catch (error) {
      results.push(`❌ Error: ${error.message}`);
    }

    setTestResults(results);
    setLoading(false);
  };

  // Test Yahoo Finance API connectivity
  const testYahooFinanceAPI = async () => {
    setLoading(true);
    const results = [];

    try {
      results.push('🔄 Testing Yahoo Finance API connectivity...');
      
      // Test basic connectivity
      const connectivityTest = await fetch('https://www.google.com', { 
        method: 'HEAD',
        timeout: 5000 
      });
      if (connectivityTest.ok) {
        results.push('✅ Basic internet connectivity confirmed');
      } else {
        results.push('❌ Basic internet connectivity failed');
      }

      // Test Yahoo Finance API directly
      const yahooTestUrl = 'https://query1.finance.yahoo.com/v8/finance/chart/AAPL?interval=1d&range=1d';
      results.push(`🔄 Testing Yahoo Finance API: ${yahooTestUrl}`);
      
      try {
        // Create platform-safe fetch options
        const fetchOptions = {
          headers: {
            'Accept': 'application/json'
          }
        };

        // Only add User-Agent for non-web platforms
        if (typeof window === 'undefined' || !window.document) {
          fetchOptions.headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
        }

        const yahooResponse = await fetch(yahooTestUrl, fetchOptions);
        
        results.push(`📡 Yahoo Finance response status: ${yahooResponse.status}`);
        
        if (yahooResponse.ok) {
          const yahooData = await yahooResponse.json();
          if (yahooData.chart && yahooData.chart.result && yahooData.chart.result.length > 0) {
            results.push('✅ Yahoo Finance API is working correctly');
            results.push(`📊 AAPL price data available: ${yahooData.chart.result[0].meta.regularMarketPrice}`);
          } else {
            results.push('⚠️ Yahoo Finance API responded but no data found');
          }
        } else {
          results.push(`❌ Yahoo Finance API error: ${yahooResponse.status} - ${yahooResponse.statusText}`);
        }
      } catch (error) {
        results.push(`❌ Yahoo Finance API test failed: ${error.message}`);
      }

    } catch (error) {
      results.push(`❌ Network test error: ${error.message}`);
    }

    setTestResults(results);
    setLoading(false);
  };

  // Comprehensive test for debugging
  const runComprehensiveTest = async () => {
    setLoading(true);
    const results = [];

    try {
      results.push('🔍 Starting comprehensive LLM and stock generation test...');
      
      // Test 1: API Configuration
      results.push('🔄 Testing API configuration...');
      const openaiKey = Constants.expoConfig?.extra?.EXPO_PUBLIC_OPENAI_API_KEY || process.env.EXPO_PUBLIC_OPENAI_API_KEY;
      if (openaiKey && openaiKey !== 'sk-placeholder-key') {
        results.push('✅ OpenAI API key configured');
      } else {
        results.push('❌ OpenAI API key not configured');
      }

      // Test 2: User Context Loading
      results.push('🔄 Testing user context loading...');
      const contextLoaded = await llmService.loadUserContext();
      if (contextLoaded) {
        results.push('✅ User context loaded successfully');
        results.push(`📊 Risk profile: ${JSON.stringify(llmService.riskProfile)}`);
        results.push(`📊 User preferences: ${JSON.stringify(llmService.userPreferences)}`);
      } else {
        results.push('❌ Failed to load user context');
      }

      // Test 3: LLM Recommendations
      results.push('🔄 Testing LLM recommendations...');
      const recommendations = await llmService.getRecommendations(3);
      if (recommendations && recommendations.length > 0) {
        results.push(`✅ Generated ${recommendations.length} LLM recommendations`);
        results.push(`📊 Sample recommendation: ${JSON.stringify(recommendations[0])}`);
      } else {
        results.push('❌ Failed to generate LLM recommendations');
      }

      // Test 4: Stock Generation Service
      results.push('🔄 Testing stock generation service...');
      const stockContextLoaded = await stockGenerationService.loadUserContext();
      if (stockContextLoaded) {
        results.push('✅ Stock generation context loaded');
      } else {
        results.push('❌ Failed to load stock generation context');
      }

      // Test 5: Personalized Stock Generation
      results.push('🔄 Testing personalized stock generation...');
      const personalizedStocks = await stockGenerationService.generatePersonalizedStocks(3);
      if (personalizedStocks && personalizedStocks.length > 0) {
        results.push(`✅ Generated ${personalizedStocks.length} personalized stocks`);
        results.push(`📊 Sample personalized stock: ${JSON.stringify(personalizedStocks[0])}`);
      } else {
        results.push('❌ Failed to generate personalized stocks');
      }

      // Test 6: Daily Stock Generation
      results.push('🔄 Testing daily stock generation...');
      const dailyStocks = await stockGenerationService.generateDailyStocks();
      if (dailyStocks && dailyStocks.length > 0) {
        results.push(`✅ Generated ${dailyStocks.length} daily stocks`);
        results.push(`📊 Sample daily stock: ${JSON.stringify(dailyStocks[0])}`);
      } else {
        results.push('❌ Failed to generate daily stocks');
      }

      // Test 7: Real-time Stock Data
      results.push('🔄 Testing real-time stock data fetching...');
      try {
        const stockData = await stockGenerationService.fetchStockData('AAPL');
        results.push(`✅ Successfully fetched real-time data for AAPL`);
        results.push(`📊 AAPL data: ${JSON.stringify(stockData)}`);
      } catch (error) {
        results.push(`❌ Failed to fetch real-time data: ${error.message}`);
      }

      // Test 8: Cache Management
      results.push('🔄 Testing cache management...');
      const cacheStats = stockGenerationService.getCacheStats();
      results.push(`📊 Cache stats: ${JSON.stringify(cacheStats)}`);

      results.push('✅ Comprehensive test completed!');

    } catch (error) {
      results.push(`❌ Comprehensive test error: ${error.message}`);
      console.error('Comprehensive Test Error:', error);
    }

    setTestResults(results);
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={true}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <Text style={styles.title}>LLM Integration Test</Text>
          <Text style={styles.subtitle}>Test LLM and API functionality</Text>
        </View>

      <View style={styles.testSection}>
        <Text style={styles.sectionTitle}>API Configuration</Text>
        <TouchableOpacity
          style={styles.testButton}
          onPress={testAPIConnectivity}
          disabled={loading}
        >
          <Ionicons name="wifi" size={20} color="#ffffff" />
          <Text style={styles.buttonText}>Test API Connectivity</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.testSection}>
        <Text style={styles.sectionTitle}>LLM Service Tests</Text>
        <TouchableOpacity
          style={styles.testButton}
          onPress={testLLMService}
          disabled={loading}
        >
          <Ionicons name="brain" size={20} color="#ffffff" />
          <Text style={styles.buttonText}>Test LLM Service</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.testSection}>
        <Text style={styles.sectionTitle}>Stock Generation Tests</Text>
        <TouchableOpacity
          style={styles.testButton}
          onPress={testStockGeneration}
          disabled={loading}
        >
          <Ionicons name="trending-up" size={20} color="#ffffff" />
          <Text style={styles.buttonText}>Test Stock Generation</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.testSection}>
        <Text style={styles.sectionTitle}>Cache Management Tests</Text>
        <TouchableOpacity
          style={styles.testButton}
          onPress={testCacheManagement}
          disabled={loading}
        >
          <Ionicons name="hardware-chip" size={20} color="#ffffff" />
          <Text style={styles.buttonText}>Test Cache Management</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.testButton, { marginTop: 10, backgroundColor: '#ef4444' }]}
          onPress={async () => {
            setLoading(true);
            try {
              await stockGenerationService.forceRefreshCache('AAPL');
              setTestResults(['✅ Force refreshed AAPL cache']);
            } catch (error) {
              setTestResults([`❌ Force refresh failed: ${error.message}`]);
            }
            setLoading(false);
          }}
          disabled={loading}
        >
          <Ionicons name="refresh" size={20} color="#ffffff" />
          <Text style={styles.buttonText}>Force Refresh AAPL Cache</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.testSection}>
        <Text style={styles.sectionTitle}>Yahoo Finance API Tests</Text>
        <TouchableOpacity
          style={[styles.testButton, { backgroundColor: '#059669' }]}
          onPress={testYahooFinanceAPI}
          disabled={loading}
        >
          <Ionicons name="wifi" size={20} color="#ffffff" />
          <Text style={styles.buttonText}>Test Yahoo Finance API</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.testSection}>
        <Text style={styles.sectionTitle}>Comprehensive Test</Text>
        <TouchableOpacity
          style={styles.testButton}
          onPress={runComprehensiveTest}
          disabled={loading}
        >
          <Ionicons name="flask" size={20} color="#ffffff" />
          <Text style={styles.buttonText}>Run Comprehensive Test</Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Running tests...</Text>
        </View>
      )}

      {testResults.length > 0 && (
        <View style={styles.resultsSection}>
          <Text style={styles.sectionTitle}>Test Results</Text>
          {testResults.map((result, index) => (
            <Text key={index} style={styles.resultText}>
              {result}
            </Text>
          ))}
        </View>
      )}

      {userContext && (
        <View style={styles.contextSection}>
          <Text style={styles.sectionTitle}>User Context</Text>
          <Text style={styles.contextText}>
            Risk Profile: {JSON.stringify(userContext.riskProfile)}
          </Text>
          <Text style={styles.contextText}>
            Liked Stocks: {userContext.likedStocks?.length || 0}
          </Text>
          <Text style={styles.contextText}>
            Cash Balance: ${userContext.cashBalance?.toLocaleString() || '0'}
          </Text>
        </View>
      )}

      {generatedStocks.length > 0 && (
        <View style={styles.stocksSection}>
          <Text style={styles.sectionTitle}>Generated Stocks</Text>
          {generatedStocks.map((stock, index) => (
            <View key={index} style={styles.stockItem}>
              <Text style={styles.stockSymbol}>{stock.symbol}</Text>
              <Text style={styles.stockSector}>{stock.sector}</Text>
              <Text style={styles.stockReason}>{stock.reason}</Text>
            </View>
          ))}
        </View>
      )}

      {cacheStats && (
        <View style={styles.cacheSection}>
          <Text style={styles.sectionTitle}>Cache Statistics</Text>
          <View style={styles.cacheStats}>
            <Text style={styles.cacheStat}>Total Entries: {cacheStats.totalEntries}</Text>
            <Text style={styles.cacheStat}>Price Valid: {cacheStats.priceValid}</Text>
            <Text style={styles.cacheStat}>Market Cap Valid: {cacheStats.marketCapValid}</Text>
            <Text style={styles.cacheStat}>Expired: {cacheStats.expired}</Text>
            <Text style={styles.cacheStat}>Max Size: {cacheStats.maxSize}</Text>
          </View>
        </View>
      )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
  },
  testSection: {
    backgroundColor: '#1e293b',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    minHeight: 100,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 15,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366f1',
    padding: 15,
    borderRadius: 8,
    justifyContent: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 10,
  },
  resultsSection: {
    backgroundColor: '#1e293b',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    minHeight: 150,
  },
  resultText: {
    color: '#e2e8f0',
    fontSize: 14,
    marginBottom: 5,
  },
  contextSection: {
    backgroundColor: '#1e293b',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    minHeight: 120,
  },
  contextText: {
    color: '#94a3b8',
    fontSize: 14,
    marginBottom: 5,
  },
  stocksSection: {
    backgroundColor: '#1e293b',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    minHeight: 200,
  },
  stockItem: {
    backgroundColor: '#334155',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  stockSymbol: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 5,
  },
  stockSector: {
    fontSize: 14,
    color: '#10b981',
    marginBottom: 5,
  },
  stockReason: {
    fontSize: 12,
    color: '#94a3b8',
  },
  cacheSection: {
    backgroundColor: '#1e293b',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    minHeight: 100,
  },
  cacheStats: {
    marginTop: 10,
  },
  cacheStat: {
    color: '#94a3b8',
    fontSize: 14,
    marginBottom: 3,
  },
}); 
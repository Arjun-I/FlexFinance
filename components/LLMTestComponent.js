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

export default function LLMTestComponent() {
  const [loading, setLoading] = useState(false);
  const [generatedStocks, setGeneratedStocks] = useState([]);
  const [userContext, setUserContext] = useState(null);
  const [testResults, setTestResults] = useState([]);

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

      // Test 2: Get recommendations
      results.push('🔄 Testing LLM recommendations...');
      const recommendations = await llmService.getRecommendations(5);
      if (recommendations && recommendations.length > 0) {
        results.push(`✅ Generated ${recommendations.length} recommendations`);
        console.log('Recommendations:', recommendations);
      } else {
        results.push('❌ Failed to generate recommendations');
      }

      // Test 3: Stock analysis
      results.push('🔄 Testing stock analysis...');
      const analysis = await llmService.getStockAnalysis('AAPL');
      if (analysis && analysis.analysis) {
        results.push('✅ Stock analysis generated successfully');
        console.log('Analysis:', analysis);
      } else {
        results.push('❌ Failed to generate stock analysis');
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

  // Test API connectivity
  const testAPIConnectivity = async () => {
    setLoading(true);
    const results = [];

    try {
      // Test OpenAI API
      results.push('🔄 Testing OpenAI API connectivity...');
      const openaiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
      if (openaiKey && openaiKey !== 'sk-placeholder-key' && openaiKey !== 'sk-your-actual-openai-key-here') {
        results.push('✅ OpenAI API key configured');
      } else {
        results.push('⚠️ OpenAI API key not configured or using placeholder');
      }

      // Test Alpha Vantage API
      results.push('🔄 Testing Alpha Vantage API connectivity...');
      const alphaKey = process.env.EXPO_PUBLIC_ALPHA_VANTAGE_KEY;
      if (alphaKey && alphaKey !== 'placeholder_key' && alphaKey !== 'your-actual-alpha-vantage-key-here') {
        results.push('✅ Alpha Vantage API key configured');
      } else {
        results.push('⚠️ Alpha Vantage API key not configured or using placeholder');
      }

      // Test Firebase connectivity
      results.push('🔄 Testing Firebase connectivity...');
      const firebaseKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
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
}); 
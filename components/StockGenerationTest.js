// StockGenerationTest.js - Test stock generation with debugging
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import stockGenerationService from '../services/stockGenerationService';

export default function StockGenerationTest() {
  const [testResults, setTestResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const testStockGeneration = async () => {
    setLoading(true);
    const results = [];

    try {
      results.push('🧪 Testing Stock Generation Process...');
      
      // Test loading user context
      results.push('📊 Loading user context...');
      const contextLoaded = await stockGenerationService.loadUserContext();
      results.push(`✅ User context loaded: ${contextLoaded}`);
      
      // Test generating stocks
      results.push('🔄 Generating personalized stocks...');
      const stocks = await stockGenerationService.generatePersonalizedStocks(3);
      results.push(`✅ Generated ${stocks.length} stocks`);
      
      if (stocks.length > 0) {
        const stock = stocks[0];
        results.push(`📊 Sample stock: ${stock.symbol}`);
        results.push(`   Name: ${stock.name}`);
        results.push(`   Price: ${stock.priceFormatted}`);
        results.push(`   Change: ${stock.changePercent}`);
        results.push(`   Market Cap: ${stock.marketCap}`);
        results.push(`   PE Ratio: ${stock.peRatio}`);
        results.push(`   Sector: ${stock.sector}`);
        results.push(`   Analysis: ${stock.analysis?.substring(0, 50)}...`);
        results.push(`   Source: ${stock.source}`);
      }
      
      results.push('🎉 Stock generation test completed!');
      
    } catch (error) {
      results.push(`❌ Stock generation test failed: ${error.message}`);
      results.push(`   Error details: ${error.stack}`);
    }

    setTestResults(results);
    setLoading(false);
  };

  const testDailyStocks = async () => {
    setLoading(true);
    const results = [];

    try {
      results.push('🧪 Testing Daily Stock Generation...');
      
      const stocks = await stockGenerationService.generateDailyStocks();
      results.push(`✅ Generated ${stocks.length} daily stocks`);
      
      if (stocks.length > 0) {
        const stock = stocks[0];
        results.push(`📊 Sample daily stock: ${stock.symbol}`);
        results.push(`   Price: ${stock.priceFormatted}`);
        results.push(`   Market Cap: ${stock.marketCap}`);
        results.push(`   Source: ${stock.source}`);
      }
      
      results.push('🎉 Daily stock generation test completed!');
      
    } catch (error) {
      results.push(`❌ Daily stock generation failed: ${error.message}`);
    }

    setTestResults(results);
    setLoading(false);
  };

  const testGetStocks = async () => {
    setLoading(true);
    const results = [];

    try {
      results.push('🧪 Testing Get Generated Stocks...');
      
      const stocks = await stockGenerationService.getGeneratedStocks();
      results.push(`✅ Retrieved ${stocks.length} stored stocks`);
      
      if (stocks.length > 0) {
        const stock = stocks[0];
        results.push(`📊 Sample stored stock: ${stock.symbol}`);
        results.push(`   Price: ${stock.priceFormatted}`);
        results.push(`   Generated: ${stock.generatedAt}`);
      }
      
      results.push('🎉 Get stocks test completed!');
      
    } catch (error) {
      results.push(`❌ Get stocks failed: ${error.message}`);
    }

    setTestResults(results);
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Stock Generation Test</Text>
        <Text style={styles.subtitle}>Debug stock generation process</Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.testButton}
          onPress={testStockGeneration}
          disabled={loading}
        >
          <Ionicons name="refresh" size={20} color="#ffffff" />
          <Text style={styles.buttonText}>Test Stock Generation</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.testButton, { backgroundColor: '#059669', marginTop: 10 }]}
          onPress={testDailyStocks}
          disabled={loading}
        >
          <Ionicons name="calendar" size={20} color="#ffffff" />
          <Text style={styles.buttonText}>Test Daily Stocks</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.testButton, { backgroundColor: '#dc2626', marginTop: 10 }]}
          onPress={testGetStocks}
          disabled={loading}
        >
          <Ionicons name="folder" size={20} color="#ffffff" />
          <Text style={styles.buttonText}>Test Get Stocks</Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Running tests...</Text>
        </View>
      )}

      {testResults.length > 0 && (
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsTitle}>Test Results</Text>
          <ScrollView style={styles.resultsScroll}>
            {testResults.map((result, index) => (
              <Text key={index} style={styles.resultText}>
                {result}
              </Text>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 20,
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
  buttonContainer: {
    marginBottom: 20,
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
    fontSize: 16,
  },
  resultsContainer: {
    backgroundColor: '#1e293b',
    padding: 20,
    borderRadius: 12,
    flex: 1,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 15,
  },
  resultsScroll: {
    flex: 1,
  },
  resultText: {
    color: '#e2e8f0',
    fontSize: 14,
    marginBottom: 5,
  },
}); 
// DataDebugComponent.js - Debug real data fetching
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
import { getStockQuote, getCompanyProfile } from '../services/finnhubService';
import stockGenerationService from '../services/stockGenerationService';

export default function DataDebugComponent() {
  const [testResults, setTestResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const testFinnhubAPI = async () => {
    setLoading(true);
    const results = [];

    try {
      results.push('🧪 Testing Finnhub API...');
      
      // Test stock quote
      const quote = await getStockQuote('AAPL');
      results.push(`✅ AAPL Quote: $${quote.price} (${quote.changePercent})`);
      results.push(`   Source: ${quote.timestamp ? 'Real-time' : 'Fallback'}`);
      
      // Test company profile
      const profile = await getCompanyProfile('AAPL');
      results.push(`✅ AAPL Profile: ${profile.name} (${profile.sector})`);
      results.push(`   Market Cap: ${profile.marketCap}`);
      results.push(`   PE Ratio: ${profile.peRatio}`);
      
      results.push('🎉 Finnhub API tests passed!');
      
    } catch (error) {
      results.push(`❌ Finnhub test failed: ${error.message}`);
    }

    setTestResults(results);
    setLoading(false);
  };

  const testStockGeneration = async () => {
    setLoading(true);
    const results = [];

    try {
      results.push('🧪 Testing LLM-Only Stock Generation...');
      
      // Test personalized stocks
      const stocks = await stockGenerationService.generatePersonalizedStocks(3);
      results.push(`✅ Generated ${stocks.length} LLM-based stocks`);
      
      if (stocks.length > 0) {
        const stock = stocks[0];
        results.push(`📊 Sample stock: ${stock.symbol}`);
        results.push(`   Price: ${stock.priceFormatted}`);
        results.push(`   Change: ${stock.changePercent}`);
        results.push(`   Analysis: ${stock.analysis?.substring(0, 50)}...`);
        results.push(`   Investment Thesis: ${stock.investmentThesis?.substring(0, 50)}...`);
        results.push(`   Source: ${stock.source}`);
        results.push(`   LLM Confidence: ${stock.confidence}`);
        results.push(`   Risk Level: ${stock.riskLevel}`);
      }
      
      results.push('🎉 LLM-only stock generation tests passed!');
      
    } catch (error) {
      results.push(`❌ LLM stock generation test failed: ${error.message}`);
    }

    setTestResults(results);
    setLoading(false);
  };

  const testRealDataOnly = async () => {
    setLoading(true);
    const results = [];

    try {
      results.push('🧪 Testing Real Data Only...');
      
      // Test multiple stocks to ensure real data
      const symbols = ['AAPL', 'MSFT', 'GOOGL'];
      const quotes = [];
      
      for (const symbol of symbols) {
        try {
          const quote = await getStockQuote(symbol);
          quotes.push(quote);
          results.push(`✅ ${symbol}: $${quote.price} (${quote.changePercent})`);
        } catch (error) {
          results.push(`❌ ${symbol}: ${error.message}`);
        }
      }
      
      if (quotes.length === symbols.length) {
        results.push('🎉 All stocks fetched with real data!');
      } else {
        results.push('⚠️ Some stocks failed to fetch real data');
      }
      
    } catch (error) {
      results.push(`❌ Real data test failed: ${error.message}`);
    }

    setTestResults(results);
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Data Debug</Text>
        <Text style={styles.subtitle}>Test real data fetching</Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.testButton}
          onPress={testFinnhubAPI}
          disabled={loading}
        >
          <Ionicons name="trending-up" size={20} color="#ffffff" />
          <Text style={styles.buttonText}>Test Finnhub API</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.testButton, { backgroundColor: '#059669', marginTop: 10 }]}
          onPress={testStockGeneration}
          disabled={loading}
        >
          <Ionicons name="analytics" size={20} color="#ffffff" />
          <Text style={styles.buttonText}>Test Stock Generation</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.testButton, { backgroundColor: '#dc2626', marginTop: 10 }]}
          onPress={testRealDataOnly}
          disabled={loading}
        >
          <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
          <Text style={styles.buttonText}>Test Real Data Only</Text>
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
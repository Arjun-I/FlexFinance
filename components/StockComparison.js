// StockComparison.js - Side-by-side Stock Comparison Component
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import stockGenerationService from '../services/stockGenerationService';

const { width } = Dimensions.get('window');

export default function StockComparison({ navigation }) {
  const [stockPairs, setStockPairs] = useState([]);
  const [currentPairIndex, setCurrentPairIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [allPairsCompleted, setAllPairsCompleted] = useState(false);

  useEffect(() => {
    console.log('🔄 StockComparison mounted/focused');
    loadStockPairs();
  }, []);

  const loadStockPairs = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading stock pairs...');
      const pairs = await stockGenerationService.getStockPairs();
      setStockPairs(pairs);
      
      console.log(`📊 Loaded ${pairs.length} stock pairs`);
      
      if (pairs.length === 0) {
        console.log('🔄 No stock pairs found, generating new ones...');
        await generateMoreStocks();
      } else {
        // Get user choices to filter out rejected stocks
        const userChoices = await stockGenerationService.getUserChoices();
        const rejectedSymbols = userChoices.rejectedStocks || [];
        const likedSymbols = userChoices.likedStocks || [];
        
        // Filter out pairs that contain rejected stocks
        const validPairs = pairs.filter(pair => {
          const stock1Rejected = rejectedSymbols.includes(pair.stock1.symbol);
          const stock2Rejected = rejectedSymbols.includes(pair.stock2.symbol);
          return !stock1Rejected && !stock2Rejected;
        });
        
        console.log(`🧹 Filtered ${pairs.length - validPairs.length} pairs containing rejected stocks`);
        console.log(`📊 ${validPairs.length} valid pairs remaining`);
        
        setStockPairs(validPairs);
        
        if (validPairs.length === 0) {
          console.log('🎯 No valid pairs remaining, showing generate more screen');
          setCurrentPairIndex(0);
          setAllPairsCompleted(true);
        } else {
          // Find first pair with stocks that haven't been chosen yet
          let foundUnseenPair = false;
          for (let i = 0; i < validPairs.length; i++) {
            const pair = validPairs[i];
            const stock1Liked = likedSymbols.includes(pair.stock1.symbol);
            const stock2Liked = likedSymbols.includes(pair.stock2.symbol);
            
            // Show pair if at least one stock hasn't been liked yet
            if (!stock1Liked || !stock2Liked) {
              setCurrentPairIndex(i);
              foundUnseenPair = true;
              break;
            }
          }
          
          if (!foundUnseenPair) {
            // All valid pairs have been seen, show generate more
            setCurrentPairIndex(validPairs.length);
            setAllPairsCompleted(true);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error loading stock pairs:', error);
      Alert.alert('Error', 'Failed to load stock recommendations');
    } finally {
      setLoading(false);
    }
  };

  const handleChoice = async (symbol, choice, stockData) => {
    try {
      console.log(`📝 Handling choice: ${symbol} = ${choice} (pair ${currentPairIndex + 1}/${stockPairs.length})`);
      
      // Record user choice for LLM learning
      await stockGenerationService.recordUserChoice(symbol, choice, stockData);
      
      // Always move to next pair immediately after choice
      const nextPairIndex = currentPairIndex + 1;
      
      if (nextPairIndex >= stockPairs.length) {
        console.log('🎯 Completed all pairs, showing generate more screen...');
        // Set to an invalid index to show the "Generate More" screen
        setCurrentPairIndex(stockPairs.length);
        setAllPairsCompleted(true);
        // Don't auto-generate, let user click the button
      } else {
        // Move to next pair
        console.log(`➡️ Moving to pair ${nextPairIndex + 1}`);
        setCurrentPairIndex(nextPairIndex);
      }
    } catch (error) {
      console.error('❌ Error recording choice:', error);
    }
  };

  const generateMoreStocks = async () => {
    try {
      setLoading(true);
      console.log('🔄 Generating fresh stock recommendations...');
      
      // Clear old recommendations to prevent repeats
      await stockGenerationService.clearAllStocks();
      console.log('🧹 Cleared old recommendations');
      
      // Generate new personalized recommendations
      await stockGenerationService.generatePersonalizedStocks(10);
      console.log('✅ Generated fresh stocks successfully');
      
      // Reload pairs and reset completion state
      setAllPairsCompleted(false);
      await loadStockPairs();
      setCurrentPairIndex(0);
    } catch (error) {
      console.error('❌ Error generating more stocks:', error);
      Alert.alert('Error', 'Failed to generate more recommendations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="refresh" size={40} color="#6366f1" />
        <Text style={styles.loadingText}>Generating stock recommendations...</Text>
        <Text style={styles.loadingSubtext}>This may take a few moments</Text>
      </View>
    );
  }

  if (stockPairs.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="trending-up" size={60} color="#6366f1" />
        <Text style={styles.emptyTitle}>No Stocks Available</Text>
        <Text style={styles.emptySubtitle}>No stock recommendations are currently available</Text>
        <TouchableOpacity style={styles.generateButton} onPress={generateMoreStocks}>
          <Text style={styles.generateButtonText}>Generate Recommendations</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentPair = stockPairs[currentPairIndex];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="refresh" size={40} color="#6366f1" />
        <Text style={styles.loadingText}>Generating stock recommendations...</Text>
        <Text style={styles.loadingSubtext}>This may take a few moments</Text>
      </View>
    );
  }

  if (stockPairs.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="trending-up" size={60} color="#6366f1" />
        <Text style={styles.emptyTitle}>No Stocks Available</Text>
        <Text style={styles.emptySubtitle}>No stock recommendations are currently available</Text>
        <TouchableOpacity style={styles.generateButton} onPress={generateMoreStocks}>
          <Text style={styles.generateButtonText}>Generate Recommendations</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!currentPair || currentPairIndex >= stockPairs.length) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="trending-up" size={60} color="#6366f1" />
        <Text style={styles.emptyTitle}>All Pairs Completed!</Text>
        <Text style={styles.emptySubtitle}>Ready to generate fresh recommendations</Text>
        <TouchableOpacity style={styles.generateButton} onPress={generateMoreStocks}>
          <Text style={styles.generateButtonText}>Generate More</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Stock Comparison</Text>
        <Text style={styles.headerSubtitle}>
          {currentPairIndex + 1} of {stockPairs.length} pairs
        </Text>
      </View>

      {/* Stock Comparison */}
      <View style={styles.comparisonContainer}>
        {/* Left Stock */}
        <View style={styles.stockCard}>
          <StockCard
            stock={currentPair.left}
            onChoice={(choice) => handleChoice(currentPair.left.symbol, choice, currentPair.left)}
            position="left"
          />
        </View>

        {/* VS Divider */}
        <View style={styles.vsContainer}>
          <Text style={styles.vsText}>VS</Text>
        </View>

        {/* Right Stock */}
        <View style={styles.stockCard}>
          {currentPair.right ? (
            <StockCard
              stock={currentPair.right}
              onChoice={(choice) => handleChoice(currentPair.right.symbol, choice, currentPair.right)}
              position="right"
            />
          ) : (
            <View style={styles.singleStockContainer}>
              <Text style={styles.singleStockText}>Single Stock</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const StockCard = ({ stock, onChoice, position }) => {
  const [showDetails, setShowDetails] = useState(false);

  if (!stock) return null;

  return (
    <View style={styles.card}>
      {/* Stock Header */}
      <View style={styles.cardHeader}>
        <View style={styles.symbolContainer}>
          <Text style={styles.symbol}>{stock.symbol}</Text>
          <Text style={styles.name}>{stock.name}</Text>
        </View>
        <View style={styles.priceContainer}>
          <Text style={styles.price}>{stock.priceFormatted}</Text>
          <Text style={[
            styles.change,
            { color: stock.change >= 0 ? '#10b981' : '#ef4444' }
          ]}>
            {stock.changePercent}
          </Text>
        </View>
      </View>

      {/* Sector & Risk */}
      <View style={styles.infoRow}>
        <Text style={styles.sector}>{stock.sector}</Text>
        <Text style={styles.riskLevel}>Risk: {stock.riskLevel}</Text>
      </View>

      {/* Market Cap */}
      <Text style={styles.marketCap}>Market Cap: {stock.marketCap}</Text>

      {/* Analysis Preview */}
      <Text style={styles.analysisPreview}>
        {stock.analysis?.substring(0, 100)}...
      </Text>

      {/* Toggle Details */}
      <TouchableOpacity
        style={styles.detailsButton}
        onPress={() => setShowDetails(!showDetails)}
      >
        <Text style={styles.detailsButtonText}>
          {showDetails ? 'Hide Details' : 'Show Details'}
        </Text>
        <Ionicons
          name={showDetails ? 'chevron-up' : 'chevron-down'}
          size={16}
          color="#6366f1"
        />
      </TouchableOpacity>

      {/* Detailed Analysis */}
      {showDetails && (
        <View style={styles.detailsContainer}>
          {/* Investment Thesis */}
          <View style={styles.detailSection}>
            <Text style={styles.detailTitle}>Investment Thesis</Text>
            <Text style={styles.detailText}>{stock.investmentThesis}</Text>
          </View>

          {/* Key Benefits */}
          <View style={styles.detailSection}>
            <Text style={styles.detailTitle}>Key Benefits</Text>
            {stock.keyBenefits?.map((benefit, index) => (
              <View key={index} style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                <Text style={styles.benefitText}>{benefit}</Text>
              </View>
            ))}
          </View>

          {/* Key Risks */}
          <View style={styles.detailSection}>
            <Text style={styles.detailTitle}>Key Risks</Text>
            {stock.keyRisks?.map((risk, index) => (
              <View key={index} style={styles.riskItem}>
                <Ionicons name="warning" size={16} color="#f59e0b" />
                <Text style={styles.riskText}>{risk}</Text>
              </View>
            ))}
          </View>

          {/* Full Analysis */}
          <View style={styles.detailSection}>
            <Text style={styles.detailTitle}>Analysis</Text>
            <Text style={styles.detailText}>{stock.analysis}</Text>
          </View>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.rejectButton]}
          onPress={() => onChoice('reject')}
        >
          <Ionicons name="close" size={20} color="#ef4444" />
          <Text style={styles.rejectButtonText}>Reject</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.acceptButton]}
          onPress={() => onChoice('like')}
        >
          <Ionicons name="heart" size={20} color="#10b981" />
          <Text style={styles.acceptButtonText}>Accept</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
  loadingText: {
    color: '#cbd5e1',
    fontSize: 16,
    marginTop: 10,
  },
  loadingSubtext: {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 5,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    padding: 20,
  },
  emptyTitle: {
    color: '#f1f5f9',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
  },
  emptySubtitle: {
    color: '#94a3b8',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  generateButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  generateButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },

  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#1e293b',
  },
  headerTitle: {
    color: '#f1f5f9',
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 5,
  },
  comparisonContainer: {
    flex: 1,
    flexDirection: 'row',
    padding: 10,
  },
  stockCard: {
    flex: 1,
    marginHorizontal: 5,
  },
  vsContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  vsText: {
    color: '#6366f1',
    fontSize: 18,
    fontWeight: 'bold',
  },
  singleStockContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    height: 100,
  },
  singleStockText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  symbolContainer: {
    flex: 1,
  },
  symbol: {
    color: '#f1f5f9',
    fontSize: 20,
    fontWeight: 'bold',
  },
  name: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  price: {
    color: '#f1f5f9',
    fontSize: 18,
    fontWeight: 'bold',
  },
  change: {
    fontSize: 14,
    fontWeight: '500',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sector: {
    color: '#6366f1',
    fontSize: 12,
    fontWeight: '500',
  },
  riskLevel: {
    color: '#f59e0b',
    fontSize: 12,
    fontWeight: '500',
  },
  marketCap: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 8,
  },
  analysisPreview: {
    color: '#cbd5e1',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 12,
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginBottom: 12,
  },
  detailsButtonText: {
    color: '#6366f1',
    fontSize: 14,
    fontWeight: '500',
    marginRight: 5,
  },
  detailsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 12,
    marginBottom: 12,
  },
  detailSection: {
    marginBottom: 16,
  },
  detailTitle: {
    color: '#f1f5f9',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  detailText: {
    color: '#cbd5e1',
    fontSize: 12,
    lineHeight: 16,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  benefitText: {
    color: '#cbd5e1',
    fontSize: 12,
    marginLeft: 6,
  },
  riskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  riskText: {
    color: '#cbd5e1',
    fontSize: 12,
    marginLeft: 6,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  rejectButton: {
    backgroundColor: 'transparent',
    borderColor: '#ef4444',
  },
  rejectButtonText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  acceptButton: {
    backgroundColor: 'transparent',
    borderColor: '#10b981',
  },
  acceptButtonText: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
}); 
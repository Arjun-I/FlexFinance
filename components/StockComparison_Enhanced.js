import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  RefreshControl,
  Dimensions,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc, collection, getDocs, addDoc } from 'firebase/firestore';
import { getStockQuote, getMultipleQuotes } from '../services/finnhubService';
import EnhancedLoadingScreen from './EnhancedLoadingScreen';
import StockDetailsModal from './StockDetailsModal';
import FullScreenChartModal from './FullScreenChartModal';

const { width } = Dimensions.get('window');

const COLORS = {
  primaryGradient: ['#0f0f23', '#1a1a2e', '#16213e'],
  cardGradient: ['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.06)'],
  primary: '#00d4ff',
  success: '#4ecdc4',
  warning: '#feca57',
  danger: '#ff6b6b',
  text: {
    primary: '#ffffff',
    secondary: '#b4bcd0',
    accent: '#8b9dc3',
    muted: '#6b7280',
  },
  overlay: 'rgba(0,0,0,0.4)',
  cardOverlay: 'rgba(255,255,255,0.08)',
};

const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

const TYPOGRAPHY = {
  h1: { fontSize: 36, fontWeight: '800', lineHeight: 44, letterSpacing: -0.5 },
  h2: { fontSize: 28, fontWeight: '700', lineHeight: 36, letterSpacing: -0.3 },
  h3: { fontSize: 22, fontWeight: '600', lineHeight: 28, letterSpacing: -0.2 },
  body: { fontSize: 16, fontWeight: '400', lineHeight: 24 },
  caption: { fontSize: 14, fontWeight: '500', lineHeight: 20 },
  small: { fontSize: 12, fontWeight: '400', lineHeight: 16 },
};

const GlassCard = ({ children, style }) => {
  return (
    <LinearGradient
      colors={COLORS.cardGradient}
      style={[styles.glassCard, style]}
    >
      <View style={styles.cardBorder}>
        {children}
      </View>
    </LinearGradient>
  );
};

export default function StockComparison_Enhanced({ navigation, user }) {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [currentPairIndex, setCurrentPairIndex] = useState(0);
  const [priceUpdateTime, setPriceUpdateTime] = useState(new Date());
  const [priceUpdating, setPriceUpdating] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);
  const [showStockDetails, setShowStockDetails] = useState(false);
  const [comparisonMode, setComparisonMode] = useState('side-by-side'); // 'side-by-side' or 'detailed'
  const [showFullScreenChart, setShowFullScreenChart] = useState(false);
  const [selectedChartStock, setSelectedChartStock] = useState(null);
  
  // Performance optimizations
  const stocksRef = useRef([]);
  const lastUpdateRef = useRef(0);
  const updateTimeoutRef = useRef(null);
  const dataCacheRef = useRef(new Map());

  // Load stocks with enhanced data
  const loadStocks = useCallback(async () => {
    if (!user?.uid) return;

    setLoading(true);
    try {
      console.log('Loading enhanced stock comparisons...');
      const startTime = Date.now();

      // Load recent stocks from Firebase
      const recentStocksRef = collection(db, 'users', user.uid, 'recentStocks');
      const snapshot = await getDocs(recentStocksRef);
      
      console.log(`Found ${snapshot.size} stocks in recentStocks collection`);
      
      const loadedStocks = [];
      const profilePromises = [];

      snapshot.forEach((doc) => {
        const stockData = doc.data();
        console.log('Processing stock:', stockData.symbol, stockData);
        
        const stock = {
          id: doc.id,
          symbol: stockData.symbol,
          name: stockData.name || stockData.symbol,
          price: stockData.price || 0,
          change: stockData.change || 0,
          changePercent: stockData.changePercent || 0,
          sector: stockData.sector || 'Unknown',
          industry: stockData.industry || 'Unknown',
          marketCap: stockData.marketCap || 'N/A',
          peRatio: stockData.peRatio || 'N/A',
          dividendYield: stockData.dividendYield || 'N/A',
          analysis: stockData.analysis || '',
          investmentThesis: stockData.investmentThesis || '',
          keyBenefits: stockData.keyBenefits || '',
          keyRisks: stockData.keyRisks || '',
          confidence: stockData.confidence || 0,
          riskLevel: stockData.riskLevel || 'medium',
          reason: stockData.reason || '',
          lastUpdated: stockData.lastUpdated || new Date().toISOString()
        };

        loadedStocks.push(stock);

        // Fetch additional company data if not cached
        if (!dataCacheRef.current.has(stockData.symbol)) {
          profilePromises.push(
            getCompanyProfile(stockData.symbol)
              .then(profile => {
                if (profile) {
                  dataCacheRef.current.set(stockData.symbol, profile);
                  // Update stock with profile data
                  stock.industry = profile.industry || stock.industry;
                  stock.marketCap = profile.marketCap || stock.marketCap;
                  stock.peRatio = profile.peRatio || stock.peRatio;
                  stock.dividendYield = profile.dividendYield || stock.dividendYield;
                }
              })
              .catch(error => {
                console.log(`Could not fetch profile for ${stockData.symbol}:`, error.message);
              })
          );
        }
      });

      // Wait for all profile data to load
      await Promise.all(profilePromises);

      console.log(`Loaded ${loadedStocks.length} stocks successfully`);
      
      if (loadedStocks.length === 0) {
        console.log('No stocks found, attempting to generate new ones...');
        // Try to generate new stocks if none exist
        await generateNewStocks();
        return; // loadStocks will be called again after generation
      }

      setStocks(loadedStocks);
      stocksRef.current = loadedStocks;
      setCurrentPairIndex(0);
      
      const loadTime = Date.now() - startTime;
      console.log(`Enhanced stock comparisons loaded in ${loadTime}ms: ${loadedStocks.length} stocks`);
      
    } catch (error) {
      console.error('Error loading stock comparisons:', error);
      Alert.alert('Error', 'Failed to load stock comparisons. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Enhanced price update with better performance
  const updateStockPrices = useCallback(async () => {
    if (stocksRef.current.length === 0 || priceUpdating) return;

    setPriceUpdating(true);
    try {
      console.log('Updating stock comparison prices...');
      const symbols = stocksRef.current.map(stock => stock.symbol);
      
      const quotes = await getMultipleQuotes(symbols);
      
      // Update stocks with new prices
      const updatedStocks = stocksRef.current.map(stock => {
        const quote = quotes.find(q => q.symbol === stock.symbol);
        if (quote) {
          return {
            ...stock,
            price: quote.currentPrice,
            change: quote.change,
            changePercent: quote.changePercent,
            lastUpdated: new Date().toISOString()
          };
        }
        return stock;
      });

      setStocks(updatedStocks);
      stocksRef.current = updatedStocks;
      setPriceUpdateTime(new Date());
      lastUpdateRef.current = Date.now();
      
      console.log('Stock comparison prices updated successfully');
      
    } catch (error) {
      console.error('Error updating stock prices:', error);
    } finally {
      setPriceUpdating(false);
    }
  }, []);

  // Generate new stock recommendations
  const generateNewStocks = useCallback(async () => {
    if (!user?.uid || generating) return;

    setGenerating(true);
    try {
      console.log('Generating new stock recommendations...');
      
      // Import the stock generation service
      const stockGenerationService = (await import('../services/stockGenerationService_Enhanced')).default;
      
      // Set user ID and generate stocks
      stockGenerationService.userId = user.uid;
      const newStocks = await stockGenerationService.generateEnhancedPersonalizedStocks(6);
      
      if (newStocks && newStocks.length > 0) {
        console.log(`Generated ${newStocks.length} new stocks`);
        
        // Save to Firebase
        const recentStocksRef = collection(db, 'users', user.uid, 'recentStocks');
        const addPromises = newStocks.map(stock => addDoc(recentStocksRef, stock));
        await Promise.all(addPromises);
        
        console.log('New stocks saved to Firebase');
        
        // Reload stocks
        await loadStocks();
      } else {
        console.log('No stocks generated');
        Alert.alert('No Recommendations', 'Unable to generate stock recommendations at this time. Please try again later.');
      }
    } catch (error) {
      console.error('Error generating new stocks:', error);
      Alert.alert('Error', 'Failed to generate new stock recommendations. Please try again.');
    } finally {
      setGenerating(false);
    }
  }, [user, generating]);

  // Handle stock choice (like/reject)
  const handleStockChoice = async (stock, choice) => {
    if (!user?.uid) return;

    try {
      console.log(`User ${choice} stock: ${stock.symbol}`);
      
      // Save user choice
      const userChoicesRef = collection(db, 'users', user.uid, 'userChoices');
      await addDoc(userChoicesRef, {
        symbol: stock.symbol,
        choice: choice,
        timestamp: new Date().toISOString(),
        stockData: stock
      });

      // Add to watchlist if liked
      if (choice === 'liked') {
        const watchlistRef = collection(db, 'users', user.uid, 'watchlist');
        await addDoc(watchlistRef, {
          symbol: stock.symbol,
          addedAt: new Date().toISOString(),
          stockData: stock
        });
      }

      // Move to next pair
      moveToNextPair();
      
      Alert.alert('Choice Saved', `You ${choice} ${stock.symbol}!`);
    } catch (error) {
      console.error('Error saving stock choice:', error);
      Alert.alert('Error', 'Failed to save your choice. Please try again.');
    }
  };

  // Handle full-screen chart
  const handleChartPress = (stock) => {
    setSelectedChartStock(stock);
    setShowFullScreenChart(true);
  };

  const handleCloseChart = () => {
    setShowFullScreenChart(false);
    setSelectedChartStock(null);
  };

  // Move to next pair
  const moveToNextPair = () => {
    const nextIndex = currentPairIndex + 2;
    if (nextIndex < stocks.length) {
      setCurrentPairIndex(nextIndex);
    } else {
      // All pairs completed, generate new stocks
      Alert.alert(
        'Comparison Complete!',
        'You\'ve reviewed all stock pairs. Would you like to generate new recommendations?',
        [
          { text: 'Later', style: 'cancel' },
          { text: 'Generate New', onPress: generateNewStocks }
        ]
      );
    }
  };

  // Enhanced stock press handler
  const handleStockPress = (stock) => {
    setSelectedStock(stock);
    setShowStockDetails(true);
  };

  // Load data on mount
  useEffect(() => {
    loadStocks();
  }, [loadStocks]);

  // Price update interval
  useEffect(() => {
    const priceUpdateInterval = setInterval(() => {
      const now = Date.now();
      if (now - lastUpdateRef.current > 4 * 60 * 1000) {
        updateStockPrices();
      }
    }, 5 * 60 * 1000);

    return () => {
      clearInterval(priceUpdateInterval);
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [updateStockPrices]);

  // Debounced price updates
  useEffect(() => {
    if (stocks.length > 0) {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      updateTimeoutRef.current = setTimeout(() => {
        updateStockPrices();
      }, 3000);
      return () => {
        if (updateTimeoutRef.current) {
          clearTimeout(updateTimeoutRef.current);
        }
      };
    }
  }, [stocks.length, updateStockPrices]);

  if (loading) {
    return <EnhancedLoadingScreen message="Loading Stock Comparisons..." />;
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount || 0);
  };

  const formatPercent = (percent) => {
    if (percent === null || percent === undefined) return 'N/A';
    const sign = percent >= 0 ? '+' : '';
    return `${sign}${percent.toFixed(2)}%`;
  };

  const currentStock = stocks[currentPairIndex];
  const nextStock = stocks[currentPairIndex + 1];

  // Enhanced stock card component
  const StockCard = ({ stock, isFirst, onPress, onChoice, onChartPress }) => {
    const formatPrice = (price) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(price);
    };

    const formatChange = (change, changePercent) => {
      const sign = change >= 0 ? '+' : '';
      return `${sign}${formatPrice(change)} (${sign}${changePercent.toFixed(2)}%)`;
    };

    return (
      <GlassCard style={styles.stockCard}>
        {/* Stock Header */}
        <View style={styles.stockHeader}>
          <View style={styles.stockInfo}>
            <Text style={styles.stockSymbol}>{stock.symbol}</Text>
            <Text style={styles.stockName} numberOfLines={1}>{stock.name}</Text>
          </View>
          <View style={styles.priceInfo}>
            <Text style={styles.stockPrice}>{formatPrice(stock.price)}</Text>
            <Text style={[
              styles.stockChange,
              { color: stock.change >= 0 ? COLORS.success : COLORS.danger }
            ]}>
              {formatChange(stock.change, stock.changePercent)}
            </Text>
          </View>
        </View>

        {/* Metrics Row */}
        <View style={styles.metricsRow}>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Sector</Text>
            <Text style={styles.metricValue} numberOfLines={1}>{stock.sector}</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Market Cap</Text>
            <Text style={styles.metricValue} numberOfLines={1}>{stock.marketCap}</Text>
          </View>
        </View>

        {/* Investment Thesis */}
        {stock.investmentThesis && (
          <View style={styles.thesisSection}>
            <Text style={styles.thesisLabel}>Investment Thesis</Text>
            <Text style={styles.thesisText} numberOfLines={2}>
              {stock.investmentThesis}
            </Text>
          </View>
        )}

        {/* Stock Actions */}
        <View style={styles.stockActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.chartButton]}
            onPress={() => onChartPress(stock)}
          >
            <Text style={styles.chartButtonText}>Chart</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.detailsButton]}
            onPress={() => onPress(stock)}
          >
            <Text style={styles.detailsButtonText}>Details</Text>
          </TouchableOpacity>
          
          <View style={styles.choiceButtons}>
            <TouchableOpacity
              style={[styles.choiceButton, styles.rejectButton]}
              onPress={() => onChoice(stock, 'rejected')}
            >
              <Text style={styles.rejectButtonText}>✕</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.choiceButton, styles.likeButton]}
              onPress={() => onChoice(stock, 'liked')}
            >
              <Text style={styles.likeButtonText}>♥</Text>
            </TouchableOpacity>
          </View>
        </View>
      </GlassCard>
    );
  };

  return (
    <LinearGradient colors={COLORS.primaryGradient} style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Stock Discovery</Text>
            <Text style={styles.headerSubtitle}>
              Compare and choose your next investment
            </Text>
          </View>
        </View>

        {/* Progress Indicator */}
        {stocks.length > 0 && (
          <View style={styles.progressSection}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill,
                  { width: `${((currentPairIndex + 2) / stocks.length) * 100}%` }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>
              {currentPairIndex + 2} of {stocks.length} stocks
            </Text>
          </View>
        )}

        {/* Stock Comparison */}
        {stocks.length > 0 ? (
          <View style={styles.comparisonSection}>
            <Text style={styles.comparisonTitle}>Compare These Stocks</Text>
            
            <View style={styles.verticalContainer}>
              <StockCard
                stock={currentStock}
                isFirst={true}
                onPress={handleStockPress}
                onChoice={handleStockChoice}
                onChartPress={handleChartPress}
              />
              
              <View style={styles.vsContainer}>
                <Text style={styles.vsText}>VS</Text>
              </View>
              
              <StockCard
                stock={nextStock}
                isFirst={false}
                onPress={handleStockPress}
                onChoice={handleStockChoice}
                onChartPress={handleChartPress}
              />
            </View>
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No stocks to compare</Text>
            <Text style={styles.emptyText}>
              {generating ? 'Generating personalized stock recommendations...' : 'Generate new stock recommendations to start comparing!'}
            </Text>
            {!generating && (
              <TouchableOpacity 
                style={styles.generateButton}
                onPress={generateNewStocks}
              >
                <Text style={styles.generateButtonText}>Generate Recommendations</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Stock Details Modal */}
        <StockDetailsModal
          visible={showStockDetails}
          stock={selectedStock}
          onClose={() => setShowStockDetails(false)}
        />

        {/* Full Screen Chart Modal */}
        <FullScreenChartModal
          visible={showFullScreenChart}
          stock={selectedChartStock}
          onClose={handleCloseChart}
        />
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  headerSubtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
  },
  refreshButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
  },
  refreshButtonText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.primary,
    fontWeight: '600',
  },
  progressSection: {
    marginBottom: SPACING.lg,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    marginBottom: SPACING.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  progressText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  comparisonSection: {
    marginBottom: SPACING.xl,
  },
  comparisonTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text.primary,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  verticalContainer: {
    gap: SPACING.lg,
  },
  vsContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  vsText: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text.secondary,
    fontWeight: '700',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
  },
  detailedContainer: {
    gap: SPACING.md,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: SPACING.md,
  },
  stockCard: {
    marginBottom: 0, // Remove bottom margin since we're using gap
    padding: SPACING.lg,
  },
  stockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  stockInfo: {
    flex: 1,
    marginRight: SPACING.md,
  },
  stockSymbol: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text.primary,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  stockName: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
    flexWrap: 'wrap',
  },
  priceInfo: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  stockPrice: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text.primary,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  stockChange: {
    ...TYPOGRAPHY.body,
    fontWeight: '500',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
    gap: SPACING.md,
  },
  metric: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: SPACING.sm,
    borderRadius: 8,
    alignItems: 'center',
  },
  metricLabel: {
    ...TYPOGRAPHY.small,
    color: COLORS.text.secondary,
    marginBottom: SPACING.xs,
  },
  metricValue: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.primary,
    fontWeight: '600',
    textAlign: 'center',
  },
  thesisSection: {
    marginBottom: SPACING.md,
  },
  thesisLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  thesisText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.primary,
    lineHeight: 20,
  },
  personalizationSection: {
    marginBottom: SPACING.md,
  },
  personalizationScore: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: SPACING.sm,
    borderRadius: 8,
  },
  personalizationLabel: {
    ...TYPOGRAPHY.small,
    color: COLORS.text.secondary,
  },
  personalizationValue: {
    ...TYPOGRAPHY.body,
    color: COLORS.primary,
    fontWeight: '600',
  },
  stockActions: {
    flexDirection: 'column',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  actionButton: {
    padding: SPACING.md,
    borderRadius: 12,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  chartButton: {
    backgroundColor: COLORS.primary,
  },
  chartButtonText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.primary,
    fontWeight: '700',
  },
  detailsButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  detailsButtonText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.primary,
    fontWeight: '700',
  },
  choiceButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  choiceButton: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  likeButton: {
    backgroundColor: COLORS.success,
  },
  rejectButton: {
    backgroundColor: COLORS.danger,
  },
  likeButtonText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.primary,
    fontWeight: '700',
  },
  rejectButtonText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.primary,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: SPACING.xl,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: SPACING.sm,
  },
  emptyTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
  },
  emptyText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.md,
  },
  generateButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  generateButtonText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.primary,
    fontWeight: '700',
    textAlign: 'center',
  },
  glassCard: {
    borderRadius: 16,
    marginBottom: SPACING.md,
    overflow: 'hidden',
  },
  cardBorder: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: SPACING.lg,
  },
});

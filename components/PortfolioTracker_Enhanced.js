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
  Modal,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc, collection, getDocs, updateDoc, addDoc } from 'firebase/firestore';
import { getStockQuote, getMultipleQuotes } from '../services/finnhubService';
import EnhancedLoadingScreen from './EnhancedLoadingScreen';
import StockDetailsModal from './StockDetailsModal';
import portfolioPerformanceService from '../services/portfolioPerformanceService';

const { width } = Dimensions.get('window');

const COLORS = {
  primaryGradient: ['#0f0f23', '#1a1a2e', '#16213e'],
  cardGradient: ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)'],
  primary: '#00d4ff',
  success: '#4ecdc4',
  warning: '#feca57',
  danger: '#ff6b6b',
  text: {
    primary: '#ffffff',
    secondary: '#b4bcd0',
    accent: '#8b9dc3',
  },
};

const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

const TYPOGRAPHY = {
  h1: { fontSize: 32, fontWeight: '700', lineHeight: 40 },
  h2: { fontSize: 24, fontWeight: '600', lineHeight: 32 },
  h3: { fontSize: 20, fontWeight: '600', lineHeight: 28 },
  body: { fontSize: 16, fontWeight: '400', lineHeight: 24 },
  caption: { fontSize: 14, fontWeight: '400', lineHeight: 20 },
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

export default function PortfolioTracker_Enhanced({ navigation, user }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [holdings, setHoldings] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [cashBalance, setCashBalance] = useState(10000);
  const [totalValue, setTotalValue] = useState(0);
  const [totalEquity, setTotalEquity] = useState(0);
  const [tradingStock, setTradingStock] = useState(null);
  const [tradeType, setTradeType] = useState('buy');
  const [tradeAmount, setTradeAmount] = useState('');
  const [priceUpdating, setPriceUpdating] = useState(false);
  const [lastPriceUpdate, setLastPriceUpdate] = useState(null);
  const [sectorSummary, setSectorSummary] = useState([]);
  const [selectedStock, setSelectedStock] = useState(null);
  const [showStockDetails, setShowStockDetails] = useState(false);
  const [activeTab, setActiveTab] = useState('holdings'); // 'holdings' or 'watchlist'
  const [performanceData, setPerformanceData] = useState({
    dailyChange: 0,
    weeklyChange: 0,
    monthlyChange: 0,
    totalReturn: 0,
    totalReturnPercent: 0,
  });
  
  // Performance optimizations
  const holdingsRef = useRef([]);
  const watchlistRef = useRef([]);
  const cashBalanceRef = useRef(10000);
  const lastUpdateRef = useRef(0);
  const updateTimeoutRef = useRef(null);
  const dataCacheRef = useRef(new Map());

  // Initialize performance service
  useEffect(() => {
    if (user?.uid) {
      portfolioPerformanceService.setUserId(user.uid);
    }
  }, [user]);

  // Update portfolio performance after trades
  const updatePortfolioPerformance = useCallback(async () => {
    if (!user?.uid || !holdings) return;
    
    try {
      await portfolioPerformanceService.updatePerformance(holdings, cashBalance);
    } catch (error) {
      console.error('Error updating portfolio performance:', error);
    }
  }, [user, holdings, cashBalance]);

  // Load user data
  const loadUserData = useCallback(async () => {
    if (!user?.uid) return;

    setLoading(true);
    try {
      console.log('🔄 Loading enhanced portfolio data...');
      const startTime = Date.now();

      // Parallel data fetching for better performance
      const [userDoc, portfolioSnapshot, watchlistSnapshot] = await Promise.all([
        getDoc(doc(db, 'users', user.uid)),
        getDocs(collection(db, 'users', user.uid, 'portfolio')),
        getDocs(collection(db, 'users', user.uid, 'watchlist'))
      ]);

      // Process user profile
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const newCashBalance = userData.cashBalance || 10000;
        setCashBalance(newCashBalance);
        cashBalanceRef.current = newCashBalance;
      }

      // Process portfolio holdings with enhanced data
      const portfolioHoldings = [];
      const holdingPromises = [];

      portfolioSnapshot.forEach((docSnapshot) => {
        const holdingData = docSnapshot.data();
        
        // Only include holdings where user actually owns shares
        if (holdingData.shares > 0) {
          // Enhanced data processing with fallbacks
          let dailyChangePercent = holdingData.dailyChangePercent;
          if (typeof dailyChangePercent === 'string') {
            dailyChangePercent = parseFloat(dailyChangePercent.replace('%', '')) || 0;
          } else if (typeof dailyChangePercent !== 'number') {
            dailyChangePercent = 0;
          }
          
          const currentPrice = holdingData.currentPrice || holdingData.price || holdingData.averagePrice || 0;
          const currentValue = holdingData.shares * currentPrice;
          const costBasis = holdingData.shares * holdingData.averagePrice;
          const gain = currentValue - costBasis;
          const gainPercent = costBasis > 0 ? (gain / costBasis) * 100 : 0;
          
          const holding = {
            id: docSnapshot.id,
            symbol: holdingData.symbol,
            name: holdingData.name || holdingData.symbol,
            shares: holdingData.shares,
            averagePrice: holdingData.averagePrice,
            currentPrice,
            currentValue,
            gain,
            gainPercent,
            dailyChangePercent,
            sector: holdingData.sector || 'Unknown',
            industry: holdingData.industry || 'Unknown',
            marketCap: holdingData.marketCap || 'N/A',
            peRatio: holdingData.peRatio || 'N/A',
            dividendYield: holdingData.dividendYield || 'N/A',
            lastUpdated: holdingData.lastUpdated || new Date().toISOString(),
            purchaseDate: holdingData.purchaseDate || new Date().toISOString()
          };

          portfolioHoldings.push(holding);

          // Fetch additional company data if not cached
          if (!dataCacheRef.current.has(holdingData.symbol)) {
            holdingPromises.push(
              getCompanyProfile(holdingData.symbol)
                .then(profile => {
                  if (profile) {
                    dataCacheRef.current.set(holdingData.symbol, profile);
                    // Update holding with profile data
                    holding.industry = profile.industry || holding.industry;
                    holding.marketCap = profile.marketCap || holding.marketCap;
                    holding.peRatio = profile.peRatio || holding.peRatio;
                    holding.dividendYield = profile.dividendYield || holding.dividendYield;
                  }
                })
                .catch(error => {
                  console.log(`Could not fetch profile for ${holdingData.symbol}:`, error.message);
                })
            );
          }
        }
      });

      // Process watchlist
      const watchlistItems = [];
      watchlistSnapshot.forEach((docSnapshot) => {
        const watchlistData = docSnapshot.data();
        watchlistItems.push({
          id: docSnapshot.id,
          symbol: watchlistData.symbol,
          name: watchlistData.name || watchlistData.symbol,
          currentPrice: watchlistData.currentPrice || 0,
          sector: watchlistData.sector || 'Unknown',
          industry: watchlistData.industry || 'Unknown',
          addedDate: watchlistData.addedDate || new Date().toISOString(),
          reason: watchlistData.reason || 'Added to watchlist'
        });
      });

      // Wait for all profile data to load
      await Promise.all(holdingPromises);

      setHoldings(portfolioHoldings);
      setWatchlist(watchlistItems);
      holdingsRef.current = portfolioHoldings;
      watchlistRef.current = watchlistItems;
      
      // Calculate enhanced performance metrics
      const totalEquityValue = portfolioHoldings.reduce((sum, holding) => sum + holding.currentValue, 0);
      const totalPortfolioValue = totalEquityValue + cashBalanceRef.current;
      const totalCostBasis = portfolioHoldings.reduce((sum, holding) => sum + (holding.shares * holding.averagePrice), 0);
      const totalReturn = totalEquityValue - totalCostBasis;
      
      setTotalEquity(totalEquityValue);
      setTotalValue(totalPortfolioValue);
      setPerformanceData({
        dailyChange: portfolioHoldings.reduce((sum, holding) => sum + (holding.currentValue * (holding.dailyChangePercent / 100)), 0),
        totalReturn,
        totalReturnPercent: totalCostBasis > 0 ? (totalReturn / totalCostBasis) * 100 : 0
      });
      
      // Generate enhanced sector summary
      const sectorMap = {};
      portfolioHoldings.forEach(holding => {
        const sector = holding.sector;
        if (!sectorMap[sector]) {
          sectorMap[sector] = { value: 0, count: 0, industries: new Set() };
        }
        sectorMap[sector].value += holding.currentValue;
        sectorMap[sector].count += 1;
        if (holding.industry && holding.industry !== 'Unknown') {
          sectorMap[sector].industries.add(holding.industry);
        }
      });
      
      const sectorSummaryData = Object.entries(sectorMap).map(([sector, data]) => ({
        sector,
        value: data.value,
        count: data.count,
        percentage: (data.value / totalEquityValue) * 100,
        industries: Array.from(data.industries)
      })).sort((a, b) => b.value - a.value);
      
      setSectorSummary(sectorSummaryData);
      
      const loadTime = Date.now() - startTime;
      console.log(`Enhanced portfolio loaded in ${loadTime}ms: ${portfolioHoldings.length} holdings, ${watchlistItems.length} watchlist items`);
      
    } catch (error) {
      console.error('Error loading enhanced portfolio data:', error);
      Alert.alert('Error', 'Failed to load portfolio data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Enhanced price update with better error handling and caching
  const updatePortfolioPrices = useCallback(async () => {
    if (holdingsRef.current.length === 0 || priceUpdating) return;

    setPriceUpdating(true);
    try {
      console.log('🔄 Updating portfolio prices...');
      const symbols = holdingsRef.current.map(h => h.symbol);
      
      // Use cached data if available and recent
      const now = Date.now();
      const cacheAge = 5 * 60 * 1000; // 5 minutes
      
      const quotes = await getMultipleQuotes(symbols);
      
      // Update holdings with new prices
      const updatedHoldings = holdingsRef.current.map(holding => {
        const quote = quotes.find(q => q.symbol === holding.symbol);
        if (quote) {
          const newPrice = quote.currentPrice;
          const newValue = holding.shares * newPrice;
          const newGain = newValue - (holding.shares * holding.averagePrice);
          const newGainPercent = (holding.shares * holding.averagePrice) > 0 ? 
            (newGain / (holding.shares * holding.averagePrice)) * 100 : 0;
          
          return {
            ...holding,
            currentPrice: newPrice,
            currentValue: newValue,
            gain: newGain,
            gainPercent: newGainPercent,
            dailyChangePercent: quote.changePercent || holding.dailyChangePercent,
            lastUpdated: new Date().toISOString()
          };
        }
        return holding;
      });

      setHoldings(updatedHoldings);
      holdingsRef.current = updatedHoldings;
      
      // Update Firebase with latest prices
      const updatePromises = updatedHoldings.map(holding => {
        // Ensure currentPrice is not undefined before updating Firebase
        if (holding.currentPrice === undefined || holding.currentPrice === null) {
          console.log(`Skipping Firebase update for ${holding.symbol} - currentPrice is undefined`);
          return Promise.resolve();
        }
        
        return updateDoc(doc(db, 'users', user.uid, 'portfolio', holding.id), {
          currentPrice: holding.currentPrice,
          dailyChangePercent: holding.dailyChangePercent || 0,
          lastUpdated: holding.lastUpdated
        }).catch(error => {
          console.log(`Could not update ${holding.symbol}:`, error.message);
        });
      });

      await Promise.all(updatePromises);
      
      // Recalculate totals
      const totalEquityValue = updatedHoldings.reduce((sum, holding) => sum + holding.currentValue, 0);
      const totalPortfolioValue = totalEquityValue + cashBalanceRef.current;
      
      setTotalEquity(totalEquityValue);
      setTotalValue(totalPortfolioValue);
      setLastPriceUpdate(new Date());
      lastUpdateRef.current = now;
      
      console.log('Portfolio prices updated successfully');
      
    } catch (error) {
      console.error('Error updating portfolio prices:', error);
    } finally {
      setPriceUpdating(false);
    }
  }, [user]);

  // Enhanced trade handling with better validation
  const handleTrade = async () => {
    if (!tradingStock || !tradeAmount || isNaN(tradeAmount) || parseFloat(tradeAmount) <= 0) {
      Alert.alert('Invalid Input', 'Please enter a valid number of shares.');
      return;
    }

    const shares = parseFloat(tradeAmount);
    const currentPrice = tradingStock.currentPrice || tradingStock.price;
    const totalCost = shares * currentPrice;

    if (tradeType === 'buy') {
      if (totalCost > cashBalanceRef.current) {
        Alert.alert('Insufficient Funds', `You need $${totalCost.toFixed(2)} but only have $${cashBalanceRef.current.toFixed(2)}.`);
        return;
      }
    } else {
      const currentHolding = holdingsRef.current.find(h => h.symbol === tradingStock.symbol);
      if (!currentHolding || currentHolding.shares < shares) {
        Alert.alert('Insufficient Shares', `You only have ${currentHolding?.shares || 0} shares of ${tradingStock.symbol}.`);
        return;
      }
    }

    try {
      const newCashBalance = tradeType === 'buy' 
        ? cashBalanceRef.current - totalCost 
        : cashBalanceRef.current + totalCost;

      // Update cash balance
      await updateDoc(doc(db, 'users', user.uid), {
        cashBalance: newCashBalance,
        lastUpdated: new Date().toISOString()
      });

      if (tradeType === 'buy') {
        // Add or update holding
        const existingHolding = holdingsRef.current.find(h => h.symbol === tradingStock.symbol);
        
        if (existingHolding) {
          // Update existing holding
          const newShares = existingHolding.shares + shares;
          const newAveragePrice = ((existingHolding.shares * existingHolding.averagePrice) + totalCost) / newShares;
          
          await updateDoc(doc(db, 'users', user.uid, 'portfolio', existingHolding.id), {
            shares: newShares,
            averagePrice: newAveragePrice,
            currentPrice: currentPrice,
            lastUpdated: new Date().toISOString()
          });
        } else {
          // Create new holding with enhanced data
          const newHoldingRef = await addDoc(collection(db, 'users', user.uid, 'portfolio'), {
            symbol: tradingStock.symbol,
            name: tradingStock.name || tradingStock.symbol,
            shares: shares,
            averagePrice: currentPrice,
            currentPrice: currentPrice,
            sector: tradingStock.sector || 'Unknown',
            industry: tradingStock.industry || 'Unknown',
            marketCap: tradingStock.marketCap || 'N/A',
            peRatio: tradingStock.peRatio || 'N/A',
            dividendYield: tradingStock.dividendYield || 'N/A',
            purchaseDate: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
          });
          
          console.log('Created new holding with ID:', newHoldingRef.id);
        }
      } else {
        // Sell shares
        const existingHolding = holdingsRef.current.find(h => h.symbol === tradingStock.symbol);
        const newShares = existingHolding.shares - shares;
        
        if (newShares === 0) {
          // Delete holding if all shares sold
          await deleteDoc(doc(db, 'users', user.uid, 'portfolio', existingHolding.id));
          console.log('Deleted holding:', existingHolding.symbol);
        } else {
          // Update holding
          await updateDoc(doc(db, 'users', user.uid, 'portfolio', existingHolding.id), {
            shares: newShares,
            lastUpdated: new Date().toISOString()
          });
          console.log('Updated holding:', existingHolding.symbol, 'New shares:', newShares);
        }
      }

      // Update local state
      setCashBalance(newCashBalance);
      cashBalanceRef.current = newCashBalance;
      setTradingStock(null);
      setTradeAmount('');
      
      // Reload portfolio data
      await loadPortfolioData();
      await updatePortfolioPerformance(); // Update performance after trade
      
      Alert.alert(
        'Trade Executed',
        `${tradeType === 'buy' ? 'Bought' : 'Sold'} ${shares} shares of ${tradingStock.symbol} for ${formatCurrency(totalCost)}`,
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      console.error('Trade error:', error);
      Alert.alert('Trade Error', 'Failed to execute trade. Please try again.');
    }
  };

  // Enhanced stock press handler
  const handleStockPress = (stock) => {
    setSelectedStock(stock);
    setShowStockDetails(true);
  };

  // Enhanced refresh with progress indication
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadPortfolioData();
      await updatePortfolioPrices();
    } catch (error) {
      console.error('Error refreshing portfolio:', error);
      Alert.alert('Error', 'Failed to refresh portfolio. Please try again.');
    } finally {
      setRefreshing(false);
    }
  }, [loadPortfolioData, updatePortfolioPrices]);

  // Load data on mount
  useEffect(() => {
    loadPortfolioData();
  }, [loadPortfolioData]);

  // Enhanced price update interval with better performance
  useEffect(() => {
    const priceUpdateInterval = setInterval(() => {
      const now = Date.now();
      if (now - lastUpdateRef.current > 8 * 60 * 1000) { // Only update if it's been more than 8 minutes
        updatePortfolioPrices();
      }
    }, 10 * 60 * 1000); // 10 minutes

    return () => {
      clearInterval(priceUpdateInterval);
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [updatePortfolioPrices]);

  // Debounced price updates when holdings change
  useEffect(() => {
    if (holdings.length > 0) {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      updateTimeoutRef.current = setTimeout(() => {
        updatePortfolioPrices();
      }, 5000); // 5 seconds debounce
      return () => {
        if (updateTimeoutRef.current) {
          clearTimeout(updateTimeoutRef.current);
        }
      };
    }
  }, [holdings.length, updatePortfolioPrices]);

  if (loading) {
    return <EnhancedLoadingScreen message="Loading Enhanced Portfolio..." />;
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

  return (
    <LinearGradient colors={COLORS.primaryGradient} style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Enhanced Portfolio Summary */}
        <View style={styles.summarySection}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryTitle}>Portfolio Summary</Text>
          </View>
          
          <View style={styles.summaryCards}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total Value</Text>
              <Text style={styles.summaryValue}>{formatCurrency(totalValue)}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Cash</Text>
              <Text style={styles.summaryValue}>{formatCurrency(cashBalance)}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Equity</Text>
              <Text style={styles.summaryValue}>{formatCurrency(totalEquity)}</Text>
            </View>
          </View>

          {/* Performance Metrics */}
          <View style={styles.performanceSection}>
            <Text style={styles.performanceTitle}>Performance</Text>
            <View style={styles.performanceMetrics}>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Daily Change</Text>
                <Text style={[
                  styles.metricValue,
                  { color: performanceData.dailyChange >= 0 ? COLORS.success : COLORS.danger }
                ]}>
                  {formatCurrency(performanceData.dailyChange)}
                </Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Total Return</Text>
                <Text style={[
                  styles.metricValue,
                  { color: performanceData.totalReturn >= 0 ? COLORS.success : COLORS.danger }
                ]}>
                  {formatCurrency(performanceData.totalReturn)} ({formatPercent(performanceData.totalReturnPercent)})
                </Text>
              </View>
            </View>
          </View>
          
          {lastPriceUpdate && (
            <Text style={styles.lastUpdateText}>
              Last updated: {lastPriceUpdate.toLocaleTimeString()}
            </Text>
          )}
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'holdings' && styles.tabButtonActive]}
            onPress={() => setActiveTab('holdings')}
          >
            <Text style={[styles.tabText, activeTab === 'holdings' && styles.tabTextActive]}>
              Holdings ({holdings.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'watchlist' && styles.tabButtonActive]}
            onPress={() => setActiveTab('watchlist')}
          >
            <Text style={[styles.tabText, activeTab === 'watchlist' && styles.tabTextActive]}>
              Watchlist ({watchlist.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Sector Summary */}
        {activeTab === 'holdings' && (
          <View style={styles.sectorSection}>
            <Text style={styles.sectionTitle}>Holdings by Sector</Text>
            {sectorSummary.map((sector, index) => (
              <View key={index} style={styles.sectorItem}>
                <View style={styles.sectorInfo}>
                  <Text style={styles.sectorName}>{sector.sector}</Text>
                  <Text style={styles.sectorCount}>{sector.count} stocks</Text>
                  {sector.industries.length > 0 && (
                    <Text style={styles.sectorIndustries}>
                      {sector.industries.slice(0, 2).join(', ')}
                      {sector.industries.length > 2 && '...'}
                    </Text>
                  )}
                </View>
                <View style={styles.sectorValue}>
                  <Text style={styles.sectorAmount}>{formatCurrency(sector.value)}</Text>
                  <Text style={styles.sectorPercentage}>{sector.percentage.toFixed(1)}%</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Holdings/Watchlist List */}
        <View style={styles.listSection}>
          <Text style={styles.sectionTitle}>
            {activeTab === 'holdings' ? 'Your Holdings' : 'Watchlist'}
          </Text>
          
          {(activeTab === 'holdings' ? holdings : watchlist).length > 0 ? (
            (activeTab === 'holdings' ? holdings : watchlist).map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.itemCard}
                onPress={() => handleStockPress(item)}
              >
                <View style={styles.itemHeader}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemSymbol}>{item.symbol}</Text>
                    <Text style={styles.itemName}>{item.name}</Text>
                    {activeTab === 'holdings' && (
                      <Text style={styles.itemShares}>{item.shares} shares</Text>
                    )}
                    <Text style={styles.itemIndustry}>{item.industry}</Text>
                  </View>
                  <View style={styles.itemValues}>
                    {activeTab === 'holdings' ? (
                      <>
                        <Text style={styles.itemValue}>{formatCurrency(item.currentValue)}</Text>
                        <Text style={[
                          styles.itemGain,
                          { color: item.gain >= 0 ? COLORS.success : COLORS.danger }
                        ]}>
                          {formatCurrency(item.gain)} ({formatPercent(item.gainPercent)})
                        </Text>
                      </>
                    ) : (
                      <Text style={styles.itemValue}>{formatCurrency(item.currentPrice)}</Text>
                    )}
                  </View>
                </View>
                <View style={styles.itemDetails}>
                  <Text style={styles.itemPrice}>
                    ${item.currentPrice?.toFixed(2) || 'N/A'} per share
                  </Text>
                  <Text style={styles.itemSector}>{item.sector}</Text>
                  {item.marketCap && item.marketCap !== 'N/A' && (
                    <Text style={styles.itemMarketCap}>MC: {item.marketCap}</Text>
                  )}
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                {activeTab === 'holdings' ? 'No holdings yet' : 'No watchlist items'}
              </Text>
              <Text style={styles.emptySubtext}>
                {activeTab === 'holdings' 
                  ? 'Start trading to see your investments here!' 
                  : 'Add stocks to your watchlist to track them!'
                }
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Trading Modal */}
      <Modal
        visible={!!tradingStock}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {tradeType === 'buy' ? 'Buy' : 'Sell'} {tradingStock?.symbol}
            </Text>
            
            <Text style={styles.modalPrice}>
              Current Price: {formatCurrency(tradingStock?.currentPrice)}
            </Text>
            
            <TextInput
              style={styles.tradeInput}
              placeholder="Number of shares"
              value={tradeAmount}
              onChangeText={setTradeAmount}
              keyboardType="numeric"
              placeholderTextColor="#666"
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setTradingStock(null);
                  setTradeAmount('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleTrade}
              >
                <Text style={styles.confirmButtonText}>
                  {tradeType === 'buy' ? 'Buy' : 'Sell'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

             {/* Stock Details Modal */}
       <StockDetailsModal
         visible={showStockDetails}
         stock={selectedStock}
         onClose={() => {
           setShowStockDetails(false);
           setSelectedStock(null);
         }}
         user={user}
         onSell={(stock) => {
           setTradingStock(stock);
           setTradeType('sell');
         }}
       />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: SPACING.md,
  },
  summarySection: {
    marginBottom: SPACING.lg,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  summaryTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text.primary,
    fontWeight: '700',
  },
  summaryCards: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: SPACING.md,
    borderRadius: 12,
    marginHorizontal: SPACING.xs,
  },
  summaryLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
    marginBottom: SPACING.xs,
  },
  summaryValue: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text.primary,
    fontWeight: '600',
  },
  performanceSection: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.md,
  },
  performanceTitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.primary,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  performanceMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricItem: {
    flex: 1,
  },
  metricLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
    marginBottom: SPACING.xs,
  },
  metricValue: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
  },
  lastUpdateText: {
    ...TYPOGRAPHY.small,
    color: COLORS.text.secondary,
    textAlign: 'center',
    opacity: 0.7,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: SPACING.xs,
    marginBottom: SPACING.lg,
  },
  tabButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  tabTextActive: {
    color: COLORS.text.primary,
    fontWeight: '600',
  },
  sectorSection: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
  },
  sectorItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.sm,
  },
  sectorInfo: {
    flex: 1,
  },
  sectorName: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.primary,
    fontWeight: '600',
  },
  sectorCount: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
  },
  sectorIndustries: {
    ...TYPOGRAPHY.small,
    color: COLORS.text.accent,
    marginTop: SPACING.xs,
  },
  sectorValue: {
    alignItems: 'flex-end',
  },
  sectorAmount: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.primary,
    fontWeight: '600',
  },
  sectorPercentage: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
  },
  listSection: {
    marginBottom: SPACING.lg,
  },
  itemCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  itemInfo: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  itemSymbol: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text.primary,
    fontWeight: '600',
  },
  itemName: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
    marginBottom: SPACING.xs,
    flexWrap: 'wrap',
    numberOfLines: 2,
  },
  itemShares: {
    ...TYPOGRAPHY.caption,
    color: COLORS.primary,
    fontWeight: '500',
  },
  itemIndustry: {
    ...TYPOGRAPHY.small,
    color: COLORS.text.accent,
    marginTop: SPACING.xs,
    flexWrap: 'wrap',
  },
  itemValues: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  itemValue: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.primary,
    fontWeight: '600',
  },
  itemGain: {
    ...TYPOGRAPHY.caption,
    fontWeight: '500',
  },
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemPrice: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
    flex: 1,
  },
  itemSector: {
    ...TYPOGRAPHY.small,
    color: COLORS.text.accent,
    flexWrap: 'wrap',
  },
  itemMarketCap: {
    ...TYPOGRAPHY.small,
    color: COLORS.text.accent,
    flexWrap: 'wrap',
  },
  emptyState: {
    alignItems: 'center',
    padding: SPACING.xl,
  },
  emptyText: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
  },
  emptySubtext: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.primaryGradient[1],
    borderRadius: 20,
    padding: SPACING.xl,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text.primary,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  modalPrice: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  tradeInput: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: SPACING.md,
    color: COLORS.text.primary,
    marginBottom: SPACING.lg,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: SPACING.xs,
  },
  cancelButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
  },
  cancelButtonText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.primary,
    fontWeight: '600',
  },
  confirmButtonText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.primary,
    fontWeight: '600',
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

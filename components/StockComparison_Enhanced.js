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
import { doc, getDoc, setDoc, collection, getDocs, addDoc, query, where, deleteDoc } from 'firebase/firestore';
import { getStockQuote, getMultipleQuotes, getCompanyProfile, markStockAsViewed } from '../services/finnhubService';
import stockGenerationService from '../services/stockGenerationService_Enhanced';
import EnhancedLoadingScreen from './EnhancedLoadingScreen';
import StockGenerationLoadingScreen from './StockGenerationLoadingScreen';
import StockDetailsModal from './StockDetailsModal';
import FullScreenChartModal from './FullScreenChartModal';
import SharedNavigation from './SharedNavigation';
import BottomNavigation from './BottomNavigation';

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
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStatus, setGenerationStatus] = useState('Initializing...');
  const [error, setError] = useState(null);
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
      
      // Load user choices to filter out already chosen stocks
      const userChoicesRef = collection(db, 'users', user.uid, 'userChoices');
      const choicesSnapshot = await getDocs(userChoicesRef);
      const chosenSymbols = new Set();
      choicesSnapshot.forEach(doc => {
        const choiceData = doc.data();
        chosenSymbols.add(choiceData.symbol);
      });
      
      console.log(`Found ${chosenSymbols.size} previously chosen stocks:`, Array.from(chosenSymbols));
      
      const loadedStocks = [];
      const profilePromises = [];

      snapshot.forEach((doc) => {
        const stockData = doc.data();
        console.log('Processing stock:', stockData.symbol, stockData);
        
        // Skip stocks that have already been chosen
        if (chosenSymbols.has(stockData.symbol)) {
          console.log(`Skipping already chosen stock: ${stockData.symbol}`);
          return;
        }
        
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
          technicalAnalysis: stockData.technicalAnalysis || '',
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
        console.log('No stocks found, user needs to generate new ones');
        setStocks([]);
        setError('No stock recommendations available. Generate new picks to get started!');
        setLoading(false);
        return;
      }

      // Check if stocks are fresh (generated within last 30 minutes to ensure freshness)
      const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000);
      const hasFreshStocks = loadedStocks.some(stock => {
        const generatedAt = stock.generatedAt || stock.lastUpdated;
        return generatedAt && new Date(generatedAt).getTime() > thirtyMinutesAgo;
      });

      if (!hasFreshStocks) {
        console.log('All stocks are stale (older than 30 minutes), need fresh generation');
        setStocks([]);
        setError('Your stock recommendations need to be refreshed. Generate fresh picks!');
        setLoading(false);
        return;
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

  // Refresh prices function for the refresh button
  const refreshPrices = useCallback(async () => {
    if (priceUpdating) return;
    
    try {
      console.log('Refreshing stock prices...');
      await updateStockPrices();
    } catch (error) {
      console.error('Error refreshing prices:', error);
      Alert.alert('Error', 'Failed to refresh prices. Please try again.');
    }
  }, [updateStockPrices, priceUpdating]);

  // Generate new stock recommendations with better error handling
  const generateNewStocks = useCallback(async () => {
    if (!user?.uid || generating) return;

    setGenerating(true);
    setError(null);
    setGenerationProgress(0);
    setGenerationStatus('Initializing...');
    
    try {
      console.log('Generating new stock recommendations...');
      
      // Progress tracking function
      const updateProgress = (progress, status) => {
        setGenerationProgress(progress);
        setGenerationStatus(status);
      };
      
      // Set user ID and generate stocks with progress tracking
      stockGenerationService.setUserId(user.uid);
      updateProgress(20, 'Analyzing market conditions...');
      
      const newStocks = await stockGenerationService.generatePersonalizedStocks(user, 10);
      updateProgress(80, 'Finalizing recommendations...');
      
      if (newStocks && newStocks.length > 0) {
        console.log(`Generated ${newStocks.length} fresh stocks`);
        
        updateProgress(90, 'Saving recommendations...');
        
        // Clear old stocks from Firebase first
        const recentStocksRef = collection(db, 'users', user.uid, 'recentStocks');
        const oldStocksSnapshot = await getDocs(recentStocksRef);
        const deletePromises = oldStocksSnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
        console.log('Cleared old recommendations');
        
        // Save fresh stocks to Firebase
        const addPromises = newStocks.map(stock => addDoc(recentStocksRef, stock));
        await Promise.all(addPromises);
        console.log('Saved fresh stocks to Firebase');
        
        updateProgress(100, 'Complete!');
        
        // Reload stocks
        await loadStocks();
        
        if (newStocks.length < 10) {
          setError(`Great! We found ${newStocks.length} excellent stocks for you. More recommendations will be available soon.`);
        }
      } else {
        console.log('No fresh stocks generated');
        setStocks([]);
        setError('We\'re preparing fresh recommendations for you. This usually takes just a moment.');
      }
    } catch (error) {
      console.error('Error generating new stocks:', error);
      setStocks([]);
      
      // Provide more friendly error messages
      if (error.message.includes('API_LIMIT_REACHED') || error.message.includes('rate limit')) {
        setError('We\'re getting your recommendations ready. Please wait a moment and try again.');
      } else if (error.message.includes('network') || error.message.includes('connection')) {
        setError('Please check your internet connection and try again.');
      } else {
        setError('We\'re preparing your recommendations. Please try again in a moment.');
      }
    } finally {
      setGenerating(false);
    }
  }, [user, generating]);

  // Handle stock choice (like/reject)
  const handleStockChoice = async (stock, choice) => {
    if (!user?.uid) return;

    try {
      console.log(`User ${choice} stock: ${stock.symbol}`);
      
      // Get the other stock in the pair to reject it
      const currentPairStocks = [currentStock, nextStock].filter(Boolean);
      const otherStock = currentPairStocks.find(s => s.symbol !== stock.symbol);
      
      // Debug stock data
      console.log(`Stock data for ${stock.symbol}:`, {
        marketCap: stock.marketCap,
        personalizationScore: stock.personalizationScore,
        confidence: stock.confidence,
        sectorDiversification: stock.sectorDiversification
      });

      // Sanitize stock data to prevent undefined values
      const sanitizedStock = {
        symbol: stock.symbol || '',
        name: stock.name || stock.symbol || '',
        price: parseFloat(stock.price) || parseFloat(stock.currentPrice) || 0,
        currentPrice: parseFloat(stock.currentPrice) || parseFloat(stock.price) || 0,
        change: parseFloat(stock.change) || 0,
        changePercent: parseFloat(stock.changePercent) || 0,
        sector: stock.sector || 'Unknown',
        industry: stock.industry || 'Unknown',
        marketCap: stock.marketCap || 'N/A',
        confidence: stock.confidence ? parseFloat(stock.confidence) : 0,
        riskLevel: stock.riskLevel || 'medium',
        reason: stock.reason || 'AI recommendation'
      };

      // Sanitize enhanced stock data to prevent undefined values
      const sanitizedEnhancedData = {
        symbol: stock.symbol || '',
        name: stock.name || stock.symbol || '',
        price: parseFloat(stock.price) || parseFloat(stock.currentPrice) || 0,
        currentPrice: parseFloat(stock.currentPrice) || parseFloat(stock.price) || 0,
        change: parseFloat(stock.change) || 0,
        changePercent: parseFloat(stock.changePercent) || 0,
        sector: stock.sector || 'Unknown',
        industry: stock.industry || 'Unknown',
        marketCap: stock.marketCap || 'N/A',
        peRatio: stock.peRatio || 'N/A',
        dividendYield: stock.dividendYield || 'N/A',
        riskLevel: stock.riskLevel || 'medium',
        confidence: parseFloat(stock.confidence) || 0,
        reason: stock.reason || 'AI recommendation',
        investmentThesis: stock.investmentThesis || 'Analysis not available',
        keyBenefits: Array.isArray(stock.keyBenefits) ? stock.keyBenefits.filter(b => b && typeof b === 'string') : 
                     typeof stock.keyBenefits === 'string' ? [stock.keyBenefits] : ['Benefits analysis available'],
        keyRisks: Array.isArray(stock.keyRisks) ? stock.keyRisks.filter(r => r && typeof r === 'string') : 
                  typeof stock.keyRisks === 'string' ? [stock.keyRisks] : ['Risk analysis available'],
        technicalAnalysis: stock.technicalAnalysis || 'Technical analysis not available',
        personalizationScore: stock.personalizationScore ? parseFloat(stock.personalizationScore) : 0,
        sectorDiversification: stock.sectorDiversification ? parseFloat(stock.sectorDiversification) : 0,
        riskAlignment: stock.riskAlignment ? parseFloat(stock.riskAlignment) : 0,
        portfolioFit: stock.portfolioFit ? parseFloat(stock.portfolioFit) : 0,
        userRiskTolerance: stock.userRiskTolerance || 'medium',
        userTimeHorizon: stock.userTimeHorizon || 'medium',
        userExperienceLevel: stock.userExperienceLevel || 'beginner',
        generatedAt: stock.generatedAt || new Date().toISOString(),
        source: stock.source || 'Enhanced LLM + Personalized Analysis'
      };
      
      // Save user choice for the selected stock
      const userChoicesRef = collection(db, 'users', user.uid, 'userChoices');
      await addDoc(userChoicesRef, {
        symbol: stock.symbol,
        choice: choice,
        timestamp: new Date().toISOString(),
        stockData: sanitizedStock
      });

      // Automatically reject the other stock in the pair
      if (otherStock) {
        await addDoc(userChoicesRef, {
          symbol: otherStock.symbol,
          choice: 'rejected',
          timestamp: new Date().toISOString(),
          stockData: {
            symbol: otherStock.symbol,
            name: otherStock.name || otherStock.symbol,
            price: parseFloat(otherStock.price) || 0,
            currentPrice: parseFloat(otherStock.currentPrice) || parseFloat(otherStock.price) || 0,
            change: parseFloat(otherStock.change) || 0,
            changePercent: parseFloat(otherStock.changePercent) || 0,
            sector: otherStock.sector || 'Unknown',
            industry: otherStock.industry || 'Unknown',
            marketCap: otherStock.marketCap || 'N/A',
            confidence: otherStock.confidence ? parseFloat(otherStock.confidence) : 0,
            riskLevel: otherStock.riskLevel || 'medium',
            reason: otherStock.reason || 'AI recommendation'
          }
        });
        console.log(`Automatically rejected ${otherStock.symbol}`);
      }

      // Add to watchlist if liked (only if not already owned)
      if (choice === 'liked') {
        // Check if user already owns this stock
        const portfolioRef = collection(db, 'users', user.uid, 'portfolio');
        const portfolioQuery = query(portfolioRef, where('symbol', '==', stock.symbol));
        const portfolioSnapshot = await getDocs(portfolioQuery);
        
        // Only add to watchlist if not in portfolio
        if (portfolioSnapshot.empty) {
          const watchlistRef = collection(db, 'users', user.uid, 'watchlist');
          await addDoc(watchlistRef, {
            symbol: stock.symbol,
            addedAt: new Date().toISOString(),
            addedDate: new Date().toISOString(),
            stockData: sanitizedStock,
            // Save complete enhanced stock data for details modal
            enhancedStockData: sanitizedEnhancedData,
            // Also save LLM fields at top level for StockDetailsModal
            investmentThesis: stock.investmentThesis || 'Analysis not available',
            technicalAnalysis: stock.technicalAnalysis || 'Technical analysis not available',
            keyBenefits: Array.isArray(stock.keyBenefits) ? stock.keyBenefits.filter(b => b && typeof b === 'string') : 
                         typeof stock.keyBenefits === 'string' ? [stock.keyBenefits] : ['Benefits analysis available'],
            keyRisks: Array.isArray(stock.keyRisks) ? stock.keyRisks.filter(r => r && typeof r === 'string') : 
                      typeof stock.keyRisks === 'string' ? [stock.keyRisks] : ['Risk analysis available'],
            personalizationScore: stock.personalizationScore ? parseFloat(stock.personalizationScore) : 0,
            confidence: stock.confidence ? parseFloat(stock.confidence) : 0,
            riskAlignment: stock.riskAlignment ? parseFloat(stock.riskAlignment) : 0,
            sectorDiversification: stock.sectorDiversification ? parseFloat(stock.sectorDiversification) : 0,
            portfolioFit: stock.portfolioFit ? parseFloat(stock.portfolioFit) : 0,
            riskLevel: stock.riskLevel || 'medium',
            reason: stock.reason || 'AI recommendation'
          });
        }
      }

      // Move to next pair
      moveToNextPair();
      
      Alert.alert('Stock Accepted', `${stock.symbol} has been added to your watchlist!`);
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
      // All pairs completed - clear stocks and show completion state
      console.log('All stock pairs completed, clearing stocks');
      setStocks([]);
      setCurrentPairIndex(0);
      setError('Excellent! You\'ve reviewed all your stock recommendations. Ready for more picks when you are.');
    }
  };

  // Enhanced stock press handler
  const handleStockPress = (stock) => {
    console.log('StockComparison: Opening details for stock:', stock);
    
    // Mark stock as viewed for priority updates
    markStockAsViewed(stock.symbol);
    
    setSelectedStock(stock);
    setShowStockDetails(true);
  };

  // Load data on mount
  useEffect(() => {
    loadStocks();
  }, [loadStocks]);

  // Handle auto-generation from risk quiz and risk profile changes
  useEffect(() => {
    const unsubscribe = navigation?.addListener?.('focus', () => {
      const params = navigation?.getState()?.routes?.find(route => route.name === 'StockComparison')?.params;
      if (params?.autoGenerate && stocks.length === 0) {
        generateNewStocks();
      }
      
      // Check if risk profile was reset and clear stocks if needed
      if (params?.riskProfileReset) {
        setStocks([]);
        setCurrentPairIndex(0);
        setError(null);
      }
    });

    return unsubscribe;
  }, [navigation, stocks.length]);

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

  if (generating) {
    return (
      <StockGenerationLoadingScreen 
        progress={generationProgress}
        status={generationStatus}
        onComplete={() => setGenerating(false)}
      />
    );
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

  const getRiskColor = (riskLevel) => {
    switch (riskLevel?.toLowerCase()) {
      case 'low': return COLORS.success;
      case 'medium': return COLORS.warning;
      case 'high': return COLORS.danger;
      default: return COLORS.text.secondary;
    }
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 80) return COLORS.success;
    if (confidence >= 60) return COLORS.warning;
    return COLORS.danger;
  };

  // Clean and format text for better readability
  const cleanText = (text) => {
    if (!text || typeof text !== 'string') return text;
    
    return text
      // Remove common LLM formatting artifacts
      .replace(/^["']|["']$/g, '') // Remove leading/trailing quotes
      .replace(/^\[|\]$/g, '') // Remove leading/trailing brackets
      .replace(/^\{|\}$/g, '') // Remove leading/trailing braces
      .replace(/^```.*?\n|\n```$/g, '') // Remove markdown code blocks
      .replace(/^#+\s*/g, '') // Remove markdown headers
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markdown
      .replace(/\*(.*?)\*/g, '$1') // Remove italic markdown
      .replace(/`(.*?)`/g, '$1') // Remove inline code
      .replace(/\n\s*\n/g, ' ') // Replace multiple newlines with single space
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      // Remove common prefixes that LLMs add
      .replace(/^(thesis|investment thesis|analysis|recommendation):\s*/i, '')
      .replace(/^(here's|here is|the|this is):\s*/i, '')
      .replace(/^(based on|considering|given):\s*/i, '')
      // Remove any remaining quotes throughout the text
      .replace(/["']/g, '')
      // Remove any remaining brackets or braces
      .replace(/[\[\]{}]/g, '')
      .trim(); // Remove leading/trailing whitespace
  };

  const currentStock = stocks[currentPairIndex];
  const nextStock = stocks[currentPairIndex + 1];

  // Enhanced stock card component
  const StockCard = ({ stock, isFirst, onPress, onChoice, onChartPress }) => {
    // Safety check for undefined stock
    if (!stock) {
      return null;
    }
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
            <Text style={styles.metricValue} numberOfLines={1}>{stock.marketCap || 'N/A'}</Text>
          </View>
        </View>

        {/* Financial Metrics Row */}
        <View style={styles.metricsRow}>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>P/E Ratio</Text>
            <Text style={styles.metricValue} numberOfLines={1}>
              {stock.peRatio && stock.peRatio !== 'N/A' ? stock.peRatio : 'N/A'}
            </Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Dividend Yield</Text>
            <Text style={styles.metricValue} numberOfLines={1}>
              {stock.dividendYield && stock.dividendYield !== 'N/A' ? stock.dividendYield : 'N/A'}
            </Text>
          </View>
        </View>

        {/* Risk & Confidence */}
        {(stock.riskLevel || stock.confidence !== undefined) && (
          <View style={styles.riskConfidenceSection}>
            <View style={styles.riskConfidenceRow}>
              {stock.riskLevel && (
                <View style={styles.riskConfidenceItem}>
                  <Text style={styles.riskConfidenceLabel}>Risk Level</Text>
                  <Text style={[
                    styles.riskConfidenceValue,
                    { color: getRiskColor(stock.riskLevel) }
                  ]}>
                    {stock.riskLevel.toUpperCase()}
                  </Text>
                </View>
              )}
              {stock.confidence !== undefined && (
                <View style={styles.riskConfidenceItem}>
                  <Text style={styles.riskConfidenceLabel}>Confidence</Text>
                  <Text style={[
                    styles.riskConfidenceValue,
                    { color: getConfidenceColor(stock.confidence) }
                  ]}>
                    {Math.round(stock.confidence)}%
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Personalization Score */}
        {stock.personalizationScore !== undefined && (
          <View style={styles.personalizationSection}>
            <Text style={styles.personalizationLabel}>Personalization Score</Text>
            <View style={styles.personalizationMetric}>
              <Text style={styles.metricValue}>{Math.round(stock.personalizationScore * 100)}%</Text>
            </View>
          </View>
        )}





        {/* Stock Actions */}
        <View style={styles.stockActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.detailsButton]}
            onPress={() => onPress(stock)}
          >
            <Text style={styles.detailsButtonText}>View Details</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.choiceButton, styles.acceptButton]}
            onPress={() => onChoice(stock, 'liked')}
          >
            <Text style={styles.acceptButtonText}>Accept</Text>
          </TouchableOpacity>
        </View>
      </GlassCard>
    );
  };

  return (
    <LinearGradient colors={COLORS.primaryGradient} style={styles.container}>
      <SharedNavigation 
        navigation={navigation} 
        currentScreen="StockComparison"
      />
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Stock Comparison</Text>
            <Text style={styles.headerSubtitle}>
              Choose your preferred stock from each pair
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.refreshButton}
              onPress={refreshPrices}
              disabled={priceUpdating}
            >
              <Text style={styles.refreshButtonText}>
                {priceUpdating ? '↻' : '↻'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Progress Indicator */}
        {stocks.length > 0 && (
          <View style={styles.progressSection}>
                        <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${((Math.floor(currentPairIndex / 2) + 1) / Math.ceil(stocks.length / 2)) * 100}%` }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>
              {Math.floor(currentPairIndex / 2) + 1} of {Math.ceil(stocks.length / 2)} pairs
            </Text>
          </View>
        )}

        {/* Stock Comparison */}
        {stocks.length > 0 && currentStock && nextStock ? (
          <View style={styles.comparisonSection}>
            <Text style={styles.comparisonTitle}>Choose Your Preferred Stock</Text>
            
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
        ) : stocks.length > 0 && !nextStock ? (
          <View style={styles.comparisonSection}>
            <Text style={styles.completionTitle}>🎉 All Done!</Text>
            <Text style={styles.completionText}>
              You've reviewed all available stock recommendations.{'\n'}
              Generate new picks to continue discovering stocks!
            </Text>
                          <TouchableOpacity 
                style={styles.generateButton}
                onPress={generateNewStocks}
                disabled={generating}
              >
                <Text style={styles.generateButtonText}>
                  {generating ? 'Creating...' : 'Generate New Picks'}
                </Text>
              </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            {error ? (
              <>
                <View style={styles.welcomeContainer}>
                  <Text style={styles.welcomeIcon}>●</Text>
                  <Text style={styles.welcomeTitle}>Ready for More Recommendations</Text>
                  <Text style={styles.welcomeText}>
                    {error.includes('API') 
                      ? 'We\'re preparing fresh recommendations for you. This usually takes just a moment.' 
                      : 'We\'re getting your personalized recommendations ready.'
                    }
                  </Text>
                  <TouchableOpacity 
                    style={styles.generateButton}
                    onPress={generateNewStocks}
                    disabled={generating}
                  >
                    <Text style={styles.generateButtonText}>
                      {generating ? 'Creating...' : 'Get New Recommendations'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <View style={styles.welcomeContainer}>
                  <Text style={styles.welcomeIcon}>●</Text>
                  <Text style={styles.welcomeTitle}>Ready to Discover Great Stocks?</Text>
                  <Text style={styles.welcomeText}>
                    {generating 
                      ? 'Creating personalized recommendations just for you...' 
                      : 'Get AI-powered stock recommendations tailored to your investment style!'
                    }
                  </Text>
                  {!generating && (
                    <TouchableOpacity 
                      style={styles.generateButton}
                      onPress={generateNewStocks}
                    >
                      <Text style={styles.generateButtonText}>Discover Stocks</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
          </View>
        )}

        {/* Stock Details Modal */}
        <StockDetailsModal
          visible={showStockDetails}
          stock={selectedStock}
          user={user}
          onClose={() => setShowStockDetails(false)}
          onSell={null} // No sell functionality in comparison view
        />

        {/* Full Screen Chart Modal */}
        <FullScreenChartModal
          visible={showFullScreenChart}
          stock={selectedChartStock}
          onClose={handleCloseChart}
        />
      </ScrollView>
      
      {/* Bottom Navigation */}
      <BottomNavigation 
        navigation={navigation} 
        currentScreen="StockComparison" 
      />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f23',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: 120,
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
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
    ...TYPOGRAPHY.caption,
    color: '#FFFFFF', // Explicit white color for visibility
    fontWeight: '600',
    opacity: 0.8,
  },
  stockName: {
    ...TYPOGRAPHY.h3,
    color: '#FFFFFF', // Explicit white color for visibility
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  stockPrice: {
    ...TYPOGRAPHY.h2,
    color: '#FFFFFF', // Explicit white color for visibility
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  stockChange: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
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
    color: '#CCCCCC', // Light grey for labels
    marginBottom: SPACING.xs,
  },
  metricValue: {
    ...TYPOGRAPHY.caption,
    color: '#FFFFFF', // Explicit white color for visibility
    fontWeight: '600',
    textAlign: 'center',
  },
  analysisSection: {
    marginBottom: SPACING.md,
  },
  thesisSection: {
    marginBottom: SPACING.sm,
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
  benefitsSection: {
    marginBottom: SPACING.sm,
  },
  benefitsLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.success,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  benefitText: {
    ...TYPOGRAPHY.small,
    color: COLORS.success,
    lineHeight: 16,
    marginLeft: SPACING.sm,
  },
  risksSection: {
    marginBottom: SPACING.sm,
  },
  risksLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.danger,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  riskText: {
    ...TYPOGRAPHY.small,
    color: COLORS.danger,
    lineHeight: 16,
    marginLeft: SPACING.sm,
  },
  reasonSection: {
    marginBottom: SPACING.sm,
  },
  reasonLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  reasonText: {
    ...TYPOGRAPHY.small,
    color: COLORS.text.secondary,
    lineHeight: 16,
  },
  riskConfidenceSection: {
    marginBottom: SPACING.md,
  },
  riskConfidenceRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  riskConfidenceItem: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: SPACING.sm,
    borderRadius: 8,
    alignItems: 'center',
  },
  riskConfidenceLabel: {
    ...TYPOGRAPHY.small,
    color: COLORS.text.secondary,
    marginBottom: SPACING.xs,
  },
  riskConfidenceValue: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
    color: '#FFFFFF', // Explicit white color for visibility
  },
  personalizationSection: {
    marginBottom: SPACING.md,
  },
  personalizationLabel: {
    ...TYPOGRAPHY.caption,
    color: '#CCCCCC', // Light grey for labels
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  personalizationMetrics: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  personalizationMetric: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: SPACING.sm,
    borderRadius: 8,
    alignItems: 'center',
  },
  thesisPreviewSection: {
    marginBottom: SPACING.md,
    backgroundColor: 'rgba(0, 212, 255, 0.05)',
    padding: SPACING.sm,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  thesisPreviewLabel: {
    ...TYPOGRAPHY.small,
    color: COLORS.primary,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  thesisPreviewText: {
    ...TYPOGRAPHY.small,
    color: COLORS.text.secondary,
    lineHeight: 16,
  },
  analysisPreviewSection: {
    marginBottom: SPACING.md,
    backgroundColor: 'rgba(78, 205, 196, 0.05)',
    padding: SPACING.sm,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.success,
  },
  analysisPreviewLabel: {
    ...TYPOGRAPHY.small,
    color: COLORS.success,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  analysisPreviewText: {
    ...TYPOGRAPHY.small,
    color: COLORS.text.secondary,
    lineHeight: 16,
  },

  stockActions: {
    flexDirection: 'row',
    gap: SPACING.md,
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
    flex: 1,
    backgroundColor: COLORS.primary,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  detailsButtonText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.primary,
    fontWeight: '700',
  },
  choiceButton: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButton: {
    backgroundColor: COLORS.success,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.success,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  acceptButtonText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.primary,
    fontWeight: '700',
  },
  welcomeContainer: {
    alignItems: 'center',
    padding: SPACING.xl,
    justifyContent: 'center',
    minHeight: 300,
  },
  welcomeIcon: {
    fontSize: 64,
    marginBottom: SPACING.md,
  },
  welcomeTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text.primary,
    textAlign: 'center',
    marginBottom: SPACING.md,
    fontWeight: '600',
  },
  welcomeText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    lineHeight: 24,
    paddingHorizontal: SPACING.md,
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
  errorTitle: {
    ...TYPOGRAPHY.h3,
    color: '#FF6B6B',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  errorText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    lineHeight: 22,
  },
  retryButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: 25,
    alignSelf: 'center',
  },
  retryButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.white,
    fontWeight: '600',
  },
  completionTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.success,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  completionText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    lineHeight: 22,
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


import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
import { doc, getDoc, setDoc, collection, getDocs, updateDoc, addDoc, deleteDoc, query, where } from 'firebase/firestore';
import { getStockQuote, getMultipleQuotes, markStockAsViewed, queueStockUpdate } from '../services/finnhubService';
import EnhancedLoadingScreen from './EnhancedLoadingScreen';
import StockDetailsModal from './StockDetailsModal';
import portfolioPerformanceService from '../services/portfolioPerformanceService';
import firebaseService from '../services/firebaseService';
import SharedNavigation from './SharedNavigation';
import BottomNavigation from './BottomNavigation';

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

  const [tradingStock, setTradingStock] = useState(null);
  const [tradeType, setTradeType] = useState('buy');
  const [tradeAmount, setTradeAmount] = useState('');
  const [priceUpdating, setPriceUpdating] = useState(false);
  const [lastPriceUpdate, setLastPriceUpdate] = useState(null);

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
  const isUpdatingPricesRef = useRef(false);
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

  // Optimized portfolio data loading with real-time listeners
  const loadPortfolioData = useCallback(async () => {
    if (!user?.uid) return;

    setLoading(true);
    const startTime = Date.now();

    try {
      console.log('Loading enhanced portfolio data...');

      // Set up real-time listeners for portfolio data
      const unsubscribePortfolio = firebaseService.subscribeToCollection(
        `users/${user.uid}/portfolio`,
        (portfolioData) => {
          console.log('Portfolio data updated:', portfolioData.length, 'total items');
          
          // Skip updates if we're currently updating prices
          if (isUpdatingPricesRef.current) {
            console.log('Skipping portfolio update - price update in progress');
            return;
          }
          
          // Separate holdings (shares > 0) from watchlist items (shares = 0)
          const actualHoldings = [];
          const zeroShareItems = [];
          
          portfolioData.forEach(item => {
            const shares = parseFloat(item.shares) || 0;
            
            if (shares > 0) {
              // Preserve any existing price updates from state
              const existingHolding = holdingsRef.current.find(h => h.id === item.id);
              const currentPrice = existingHolding?.currentPrice || parseFloat(item.currentPrice) || 0;
              const currentValue = shares * currentPrice;
              
              actualHoldings.push({
                ...item,
                shares: shares,
                currentPrice: currentPrice,
                currentValue: currentValue,
                // Preserve all LLM-generated fields
                investmentThesis: item.investmentThesis,
                technicalAnalysis: item.technicalAnalysis,
                keyBenefits: item.keyBenefits,
                keyRisks: item.keyRisks,
                personalizationScore: item.personalizationScore,
                confidence: item.confidence,
                riskAlignment: item.riskAlignment,
                sectorDiversification: item.sectorDiversification,
                portfolioFit: item.portfolioFit,
                riskLevel: item.riskLevel,
                reason: item.reason
              });
            } else {
              // Convert zero-share items to watchlist format
              zeroShareItems.push({
                id: `portfolio_${item.id}`, // Prefix to avoid conflicts
                symbol: item.symbol,
                addedAt: item.purchaseDate || new Date().toISOString(),
                addedDate: item.purchaseDate || new Date().toISOString(),
                stockData: {
                  symbol: item.symbol,
                  name: item.name || item.symbol,
                  currentPrice: parseFloat(item.currentPrice) || 0,
                  price: parseFloat(item.currentPrice) || 0,
                  sector: item.sector || 'Unknown',
                  industry: item.industry || 'Unknown'
                },
                // Preserve LLM-generated fields when converting to watchlist
                investmentThesis: item.investmentThesis,
                technicalAnalysis: item.technicalAnalysis,
                keyBenefits: item.keyBenefits,
                keyRisks: item.keyRisks,
                personalizationScore: item.personalizationScore,
                confidence: item.confidence,
                riskAlignment: item.riskAlignment,
                sectorDiversification: item.sectorDiversification,
                portfolioFit: item.portfolioFit,
                riskLevel: item.riskLevel,
                reason: item.reason
              });
            }
          });
          
          // Sort holdings by value descending
          actualHoldings.sort((a, b) => (b.currentValue || 0) - (a.currentValue || 0));
          
          console.log('Actual holdings:', actualHoldings.length, 'Zero-share items:', zeroShareItems.length);
          
          // Debug: Check if LLM data is present in holdings
          actualHoldings.forEach(holding => {
            if (holding.investmentThesis || holding.technicalAnalysis) {
              console.log(`LLM data found for ${holding.symbol}:`, {
                hasThesis: !!holding.investmentThesis,
                hasAnalysis: !!holding.technicalAnalysis,
                hasBenefits: !!holding.keyBenefits,
                hasRisks: !!holding.keyRisks
              });
            }
          });
          setHoldings(actualHoldings);
          holdingsRef.current = actualHoldings;
          
          // Update watchlist with zero-share items
          setWatchlist(prevWatchlist => {
            const regularWatchlist = prevWatchlist.filter(item => !item.id.startsWith('portfolio_'));
            return [...regularWatchlist, ...zeroShareItems];
          });
        },
        {
          orderByClause: { field: 'symbol', direction: 'asc' }
        }
      );

      const unsubscribeWatchlist = firebaseService.subscribeToCollection(
        `users/${user.uid}/watchlist`,
        (watchlistData) => {
          console.log('Watchlist data updated:', watchlistData.length, 'items');
          
          // Skip updates if we're currently updating prices
          if (isUpdatingPricesRef.current) {
            console.log('Skipping watchlist update - price update in progress');
            return;
          }
          
          // Preserve any existing price updates from state
          const updatedWatchlist = watchlistData.map(item => {
            const existingItem = watchlistRef.current.find(w => w.id === item.id);
            if (existingItem && existingItem.currentPrice) {
              return {
                ...item,
                currentPrice: existingItem.currentPrice,
                change: existingItem.change || 0,
                changePercent: existingItem.changePercent || 0,
                lastUpdated: existingItem.lastUpdated
              };
            }
            return item;
          });
          
          // Debug: Check for LLM data in watchlist items
          updatedWatchlist.forEach(item => {
            if (item.investmentThesis || item.technicalAnalysis) {
              console.log(`Watchlist LLM data found for ${item.symbol}:`, {
                hasThesis: !!item.investmentThesis,
                hasAnalysis: !!item.technicalAnalysis,
                hasBenefits: !!item.keyBenefits,
                hasRisks: !!item.keyRisks
              });
            }
          });
          
          setWatchlist(updatedWatchlist);
          watchlistRef.current = updatedWatchlist;
        },
        {
          orderByClause: { field: 'addedDate', direction: 'desc' }
        }
      );

      // Get user profile data
      const userData = await firebaseService.getDocument(`users/${user.uid}`);
      
      if (userData) {
        setCashBalance(userData.cashBalance || 10000);
        cashBalanceRef.current = userData.cashBalance || 10000;
      }

      // Set up performance tracking
      portfolioPerformanceService.setUserId(user.uid);

      // Store cleanup functions for later use
      const cleanup = () => {
        if (unsubscribePortfolio) unsubscribePortfolio();
        if (unsubscribeWatchlist) unsubscribeWatchlist();
      };

      // Store cleanup reference for component unmount
      loadPortfolioData.cleanup = cleanup;

      const loadTime = Date.now() - startTime;
      console.log(`Enhanced portfolio loaded in ${loadTime}ms with real-time listeners`);

    } catch (error) {
      console.error('Error loading enhanced portfolio data:', error);
      Alert.alert('Error', 'Failed to load portfolio data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Enhanced price update with smart caching and queue system
  const updatePortfolioPrices = useCallback(async () => {
    if (holdingsRef.current.length === 0 || priceUpdating) return;

    setPriceUpdating(true);
    isUpdatingPricesRef.current = true;
    try {
      console.log('🔄 Updating portfolio prices...');
      const symbols = holdingsRef.current.map(h => h.symbol);
      
      // Queue portfolio stocks for background updates
      symbols.forEach(symbol => {
        queueStockUpdate(symbol, false); // Portfolio stocks are not priority
      });
      
      // Get quotes using smart caching (will use cache if available)
      const quotes = await getMultipleQuotes(symbols);
      
      if (quotes && quotes.length > 0) {
        console.log(`✅ Updated ${quotes.length} portfolio prices`);
        
        // Update holdings with new prices
        const updatedHoldings = holdingsRef.current.map(holding => {
          const quote = quotes.find(q => q.symbol === holding.symbol);
          if (quote) {
            const newPrice = quote.price || quote.currentPrice || holding.currentPrice;
            const newValue = holding.shares * newPrice;
            const newGain = newValue - (holding.shares * holding.averagePrice);
            const newGainPercent = ((newGain / (holding.shares * holding.averagePrice)) * 100);
            
            // Calculate daily change for this holding (change from previous day's value)
            const dailyChangePercent = quote.changePercent || 0;
            const previousValue = newValue / (1 + (dailyChangePercent / 100));
            const dailyChangeDollar = newValue - previousValue;
            
            return {
              ...holding,
              currentPrice: newPrice,
              currentValue: newValue,
              gain: newGain,
              gainPercent: newGainPercent,
              change: quote.change || 0,
              changePercent: quote.changePercent || 0,
              dailyChangePercent: dailyChangePercent,
              dailyChangeDollar: dailyChangeDollar,
              lastUpdated: new Date().toISOString()
            };
          }
          return holding;
        });
        
        setHoldings(updatedHoldings);
        holdingsRef.current = updatedHoldings;
        setLastPriceUpdate(new Date());
        
        // Update Firebase with new prices to persist them
        const updatePromises = updatedHoldings.map(holding => {
          return updateDoc(doc(db, 'users', user.uid, 'portfolio', holding.id), {
            currentPrice: holding.currentPrice,
            currentValue: holding.currentValue,
            gain: holding.gain,
            gainPercent: holding.gainPercent,
            change: holding.change,
            changePercent: holding.changePercent,
            dailyChangePercent: holding.dailyChangePercent,
            dailyChangeDollar: holding.dailyChangeDollar,
            lastUpdated: holding.lastUpdated
          }).catch(error => {
            console.log(`Could not update ${holding.symbol} in Firebase:`, error.message);
          });
        });
        
        await Promise.all(updatePromises);
      }
    } catch (error) {
      console.error('Error updating portfolio prices:', error);
    } finally {
      setPriceUpdating(false);
      isUpdatingPricesRef.current = false;
    }
  }, [user]);

  // Smart watchlist price update with rate limiting
  const updateWatchlistPrices = useCallback(async () => {
    if (watchlist.length === 0) return;

    try {
      console.log('🔄 Updating watchlist prices...');
      const symbols = watchlist.map(w => w.symbol);
      
      // Queue watchlist stocks for background updates (lower priority than portfolio)
      symbols.forEach(symbol => {
        queueStockUpdate(symbol, false); // Watchlist stocks are not priority
      });
      
      // Get quotes using smart caching (will use cache if available)
      const quotes = await getMultipleQuotes(symbols);
      
      if (quotes && quotes.length > 0) {
        console.log(`✅ Updated ${quotes.length} watchlist prices`);
        
        // Update watchlist with new prices
        const updatedWatchlist = watchlist.map(watchlistItem => {
          const quote = quotes.find(q => q.symbol === watchlistItem.symbol);
          if (quote) {
            return {
              ...watchlistItem,
              currentPrice: quote.price || quote.currentPrice || watchlistItem.currentPrice,
              change: quote.change || 0,
              changePercent: quote.changePercent || 0,
              lastUpdated: new Date().toISOString()
            };
          }
          return watchlistItem;
        });
        
        setWatchlist(updatedWatchlist);
        
        // Update Firebase with new prices to persist them
        const updatePromises = updatedWatchlist.map(watchlistItem => {
          if (watchlistItem.id && watchlistItem.currentPrice) {
            return updateDoc(doc(db, 'users', user.uid, 'watchlist', watchlistItem.id), {
              currentPrice: watchlistItem.currentPrice,
              change: watchlistItem.change || 0,
              changePercent: watchlistItem.changePercent || 0,
              lastUpdated: watchlistItem.lastUpdated
            }).catch(error => {
              console.log(`Could not update ${watchlistItem.symbol} in Firebase:`, error.message);
            });
          }
          return Promise.resolve();
        });
        
        await Promise.all(updatePromises);
      }
    } catch (error) {
      console.error('Error updating watchlist prices:', error);
    }
  }, [watchlist, user]);

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
          
          // For existing holdings, preserve LLM data if not already present
          const updateData = {
            shares: newShares,
            averagePrice: newAveragePrice,
            currentPrice: currentPrice,
            lastUpdated: new Date().toISOString()
          };
          
          // Add LLM data if not already present in existing holding
          if (!existingHolding.investmentThesis && tradingStock.investmentThesis) {
            updateData.investmentThesis = tradingStock.investmentThesis;
          }
          if (!existingHolding.technicalAnalysis && tradingStock.technicalAnalysis) {
            updateData.technicalAnalysis = tradingStock.technicalAnalysis;
          }
          if (!existingHolding.keyBenefits && tradingStock.keyBenefits) {
            updateData.keyBenefits = tradingStock.keyBenefits;
          }
          if (!existingHolding.keyRisks && tradingStock.keyRisks) {
            updateData.keyRisks = tradingStock.keyRisks;
          }
          if (!existingHolding.personalizationScore && tradingStock.personalizationScore) {
            updateData.personalizationScore = tradingStock.personalizationScore;
          }
          if (!existingHolding.confidence && tradingStock.confidence) {
            updateData.confidence = tradingStock.confidence;
          }
          
          await updateDoc(doc(db, 'users', user.uid, 'portfolio', existingHolding.id), updateData);
        } else {
          // Create new holding with enhanced data including LLM-generated content
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
            lastUpdated: new Date().toISOString(),
            
            // Preserve LLM-generated content from stock comparison
            investmentThesis: tradingStock.investmentThesis || '',
            technicalAnalysis: tradingStock.technicalAnalysis || '',
            keyBenefits: tradingStock.keyBenefits || [],
            keyRisks: tradingStock.keyRisks || [],
            personalizationScore: tradingStock.personalizationScore || 0,
            confidence: tradingStock.confidence || 0,
            riskAlignment: tradingStock.riskAlignment || 0,
            sectorDiversification: tradingStock.sectorDiversification || 0,
            portfolioFit: tradingStock.portfolioFit || 0,
            riskLevel: tradingStock.riskLevel || 'medium',
            reason: tradingStock.reason || 'User purchase'
          });
          
          console.log('Created new holding with ID:', newHoldingRef.id);
          console.log('LLM data saved to portfolio:', {
            investmentThesis: !!tradingStock.investmentThesis,
            technicalAnalysis: !!tradingStock.technicalAnalysis,
            keyBenefits: !!tradingStock.keyBenefits,
            keyRisks: !!tradingStock.keyRisks,
            personalizationScore: tradingStock.personalizationScore
          });
        }
        
        // Remove from watchlist if they're buying it
        const watchlistRef = collection(db, 'users', user.uid, 'watchlist');
        const watchlistQuery = query(watchlistRef, where('symbol', '==', tradingStock.symbol));
        const watchlistSnapshot = await getDocs(watchlistQuery);
        watchlistSnapshot.forEach(async (docSnapshot) => {
          await deleteDoc(docSnapshot.ref);
          console.log(`Removed ${tradingStock.symbol} from watchlist after purchase`);
        });
        
      } else {
        // Sell shares
        const existingHolding = holdingsRef.current.find(h => h.symbol === tradingStock.symbol);
        const newShares = existingHolding.shares - shares;
        
        if (newShares === 0) {
          // Delete holding if all shares sold
          await deleteDoc(doc(db, 'users', user.uid, 'portfolio', existingHolding.id));
          console.log('Deleted holding:', existingHolding.symbol);
          
          // Add back to watchlist if they sold all shares
          const watchlistRef = collection(db, 'users', user.uid, 'watchlist');
          await addDoc(watchlistRef, {
            symbol: tradingStock.symbol,
            addedAt: new Date().toISOString(),
            addedDate: new Date().toISOString(),
            stockData: {
              symbol: tradingStock.symbol,
              name: tradingStock.name || tradingStock.symbol,
              currentPrice: parseFloat(tradingStock.currentPrice) || 0,
              sector: tradingStock.sector || 'Unknown',
              industry: tradingStock.industry || 'Unknown'
            },
            // Preserve LLM-generated fields when adding back to watchlist
            investmentThesis: tradingStock.investmentThesis,
            technicalAnalysis: tradingStock.technicalAnalysis,
            keyBenefits: tradingStock.keyBenefits,
            keyRisks: tradingStock.keyRisks,
            personalizationScore: tradingStock.personalizationScore,
            confidence: tradingStock.confidence,
            riskAlignment: tradingStock.riskAlignment,
            sectorDiversification: tradingStock.sectorDiversification,
            portfolioFit: tradingStock.portfolioFit,
            riskLevel: tradingStock.riskLevel,
            reason: tradingStock.reason
          });
          console.log(`Added ${tradingStock.symbol} back to watchlist after selling all shares`);
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

  // Handle delete watchlist item
  const handleDeleteWatchlistItem = async (item) => {
    console.log('Delete button pressed for:', item.symbol);
    try {
      Alert.alert(
        'Remove from Watchlist',
        `Are you sure you want to remove ${item.symbol} from your watchlist?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              console.log('User confirmed deletion of:', item.symbol);
              // Delete from Firebase
              const watchlistRef = collection(db, 'users', user.uid, 'watchlist');
              const watchlistQuery = query(watchlistRef, where('symbol', '==', item.symbol));
              const watchlistSnapshot = await getDocs(watchlistQuery);
              
              console.log(`Found ${watchlistSnapshot.docs.length} documents to delete for ${item.symbol}`);
              
              const deletePromises = watchlistSnapshot.docs.map(doc => deleteDoc(doc.ref));
              await Promise.all(deletePromises);
              
              console.log(`Successfully removed ${item.symbol} from watchlist`);
              Alert.alert('Success', `${item.symbol} has been removed from your watchlist`);
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error deleting watchlist item:', error);
      Alert.alert('Error', 'Failed to remove item from watchlist');
    }
  };

  // Enhanced stock press handler
  const handleStockPress = (stock) => {
    console.log('PortfolioTracker: Opening details for stock:', stock);
    console.log('Stock LLM data check:', {
      symbol: stock.symbol,
      hasInvestmentThesis: !!stock.investmentThesis,
      hasTechnicalAnalysis: !!stock.technicalAnalysis,
      hasKeyBenefits: !!stock.keyBenefits,
      hasKeyRisks: !!stock.keyRisks,
      personalizationScore: stock.personalizationScore,
      confidence: stock.confidence
    });
    
    // Debug: Log the actual LLM data content
    if (stock.investmentThesis || stock.technicalAnalysis) {
      console.log('LLM Data Content:', {
        investmentThesis: stock.investmentThesis,
        technicalAnalysis: stock.technicalAnalysis,
        keyBenefits: stock.keyBenefits,
        keyRisks: stock.keyRisks
      });
    }
    
    // Mark stock as viewed for priority updates
    markStockAsViewed(stock.symbol);
    
    // Use enhanced stock data if available (for watchlist items)
    let enhancedStock = stock;
    if (stock.enhancedStockData) {
      console.log('Using enhanced stock data from watchlist');
      enhancedStock = {
        ...stock.enhancedStockData,
        // Preserve any additional fields from the original stock object
        shares: stock.shares,
        averagePrice: stock.averagePrice,
        currentValue: stock.currentValue,
        gain: stock.gain,
        gainPercent: stock.gainPercent
      };
    } else {
      console.log('Using basic stock data (should include LLM data for holdings)');
      // For holdings, ensure LLM fields are at top level
      enhancedStock = {
        ...stock,
        // Ensure LLM fields are available at top level
        investmentThesis: stock.investmentThesis,
        technicalAnalysis: stock.technicalAnalysis,
        keyBenefits: stock.keyBenefits,
        keyRisks: stock.keyRisks,
        personalizationScore: stock.personalizationScore,
        confidence: stock.confidence,
        riskAlignment: stock.riskAlignment,
        sectorDiversification: stock.sectorDiversification,
        portfolioFit: stock.portfolioFit,
        riskLevel: stock.riskLevel,
        reason: stock.reason
      };
    }
    
    setSelectedStock(enhancedStock);
    setShowStockDetails(true);
  };

  // Enhanced refresh with progress indication
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadPortfolioData();
      await updatePortfolioPrices();
      await updateWatchlistPrices(); // Refresh watchlist prices
    } catch (error) {
      console.error('Error refreshing portfolio:', error);
      Alert.alert('Error', 'Failed to refresh portfolio. Please try again.');
    } finally {
      setRefreshing(false);
    }
  }, [loadPortfolioData, updatePortfolioPrices, updateWatchlistPrices]);

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

  // Performance monitoring and cleanup
  useEffect(() => {
    if (user?.uid) {
      loadPortfolioData();
    }

    // Cleanup function to prevent memory leaks
    return () => {
      if (loadPortfolioData.cleanup) {
        loadPortfolioData.cleanup();
      }
      firebaseService.cleanup();
    };
  }, [user, loadPortfolioData]);

  // Memoized performance calculations
  const performanceMetrics = useMemo(() => {
    if (holdings.length === 0) {
      return {
        totalEquity: 0,
        totalValue: cashBalance,
        totalReturn: 0,
        totalReturnPercent: 0,
        dailyChange: 0,
        sectorSummary: []
      };
    }

    const totalEquityValue = holdings.reduce((sum, holding) => sum + (holding.currentValue || 0), 0);
    const totalPortfolioValue = totalEquityValue + cashBalance;
    const totalCostBasis = holdings.reduce((sum, holding) => sum + (holding.shares * holding.averagePrice), 0);
    const totalReturn = totalEquityValue - totalCostBasis;
    
    // Calculate sector summary
    const sectorMap = {};
    holdings.forEach(holding => {
      const sector = holding.sector || 'Unknown';
      if (!sectorMap[sector]) {
        sectorMap[sector] = { value: 0, count: 0, industries: new Set() };
      }
      sectorMap[sector].value += holding.currentValue || 0;
      sectorMap[sector].count += 1;
      if (holding.industry && holding.industry !== 'Unknown') {
        sectorMap[sector].industries.add(holding.industry);
      }
    });

    const sectorSummary = Object.entries(sectorMap).map(([sector, data]) => ({
      sector,
      value: data.value,
      count: data.count,
      percentage: totalEquityValue > 0 ? (data.value / totalEquityValue) * 100 : 0,
      industries: Array.from(data.industries)
    })).sort((a, b) => b.value - a.value);

    return {
      totalEquity: totalEquityValue,
      totalValue: totalPortfolioValue,
      totalReturn,
      totalReturnPercent: totalCostBasis > 0 ? (totalReturn / totalCostBasis) * 100 : 0,
      dailyChange: holdings.reduce((sum, holding) => sum + (holding.dailyChangeDollar || 0), 0),
      sectorSummary
    };
  }, [holdings, cashBalance]);

  if (loading) {
    return <EnhancedLoadingScreen message="Loading Enhanced Portfolio..." />;
  }

  const formatCurrency = (amount) => {
    const num = amount || 0;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const formatPercent = (percent) => {
    if (percent === null || percent === undefined) return 'N/A';
    const sign = percent >= 0 ? '+' : '';
    return `${sign}${percent.toFixed(2)}%`;
  };

  return (
    <LinearGradient colors={COLORS.primaryGradient} style={styles.container}>
      <SharedNavigation 
        navigation={navigation} 
        currentScreen="Portfolio"
      />
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Enhanced Portfolio Summary */}
        <View style={styles.summarySection}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryTitle}>Portfolio Summary</Text>
            <TouchableOpacity style={styles.refreshButton} onPress={updateWatchlistPrices}>
              <Text style={styles.refreshButtonText}>Update Prices</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.summaryCards}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total Value</Text>
              <Text style={styles.summaryValue} numberOfLines={1} adjustsFontSizeToFit={true}>
                {formatCurrency(performanceMetrics.totalValue)}
              </Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Cash</Text>
              <Text style={styles.summaryValue} numberOfLines={1} adjustsFontSizeToFit={true}>
                {formatCurrency(cashBalance)}
              </Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Equity</Text>
              <Text style={styles.summaryValue} numberOfLines={1} adjustsFontSizeToFit={true}>
                {formatCurrency(performanceMetrics.totalEquity)}
              </Text>
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
                  { color: performanceMetrics.dailyChange >= 0 ? COLORS.success : COLORS.danger }
                ]} numberOfLines={1} adjustsFontSizeToFit={true}>
                  {formatCurrency(performanceMetrics.dailyChange)}
                </Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Total Return</Text>
                <Text style={[
                  styles.metricValue,
                  { color: performanceData.totalReturn >= 0 ? COLORS.success : COLORS.danger }
                ]} numberOfLines={1} adjustsFontSizeToFit={true}>
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
            {performanceMetrics.sectorSummary.map((sector, index) => (
              <View key={index} style={styles.sectorItem}>
                <View style={styles.sectorInfo}>
                  <Text style={styles.sectorName}>{sector.sector}</Text>
                  <Text style={styles.sectorDetails}>
                    {sector.count} stock{sector.count !== 1 ? 's' : ''} • {sector.percentage.toFixed(1)}% of portfolio
                  </Text>
                  {sector.industries.length > 0 && (
                    <Text style={styles.sectorIndustries}>
                      Industries: {sector.industries.slice(0, 3).join(', ')}
                      {sector.industries.length > 3 && ` +${sector.industries.length - 3} more`}
                    </Text>
                  )}
                </View>
                <View style={styles.sectorValue}>
                  <Text style={styles.sectorAmount}>{formatCurrency(sector.value)}</Text>
                  {/* Progress bar for visual representation */}
                  <View style={styles.sectorProgressContainer}>
                    <View 
                      style={[
                        styles.sectorProgressBar, 
                        { width: `${Math.min(sector.percentage, 100)}%` }
                      ]} 
                    />
                  </View>
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
                  {activeTab === 'watchlist' && (
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDeleteWatchlistItem(item)}
                    >
                      <Text style={styles.deleteButtonText}>×</Text>
                    </TouchableOpacity>
                  )}
                  <View style={styles.itemInfo}>
                    <View style={styles.itemTitleRow}>
                      <Text style={styles.itemSymbol}>{item.symbol}</Text>
                      {activeTab === 'holdings' && (
                        <Text style={styles.itemShares}>{item.shares} shares</Text>
                      )}
                    </View>
                    <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                    {activeTab === 'watchlist' && item.industry && item.industry !== 'Unknown' && (
                      <Text style={styles.itemIndustry}>{item.industry}</Text>
                    )}
                  </View>
                  <View style={styles.itemValues}>
                    <Text style={styles.itemValue}>
                      {activeTab === 'holdings' ? formatCurrency(item.currentValue) : formatCurrency(item.currentPrice || item.price || 0)}
                    </Text>
                    {activeTab === 'holdings' ? (
                      <View style={styles.itemPerformanceRow}>
                        <Text style={[
                          styles.itemGain,
                          { color: item.gain >= 0 ? COLORS.success : COLORS.danger }
                        ]}>
                          {formatCurrency(item.gain)} ({formatPercent(item.gainPercent)})
                        </Text>
                        {item.dailyChangeDollar !== undefined && (
                          <Text style={[
                            styles.itemDailyChange,
                            { color: item.dailyChangeDollar >= 0 ? COLORS.success : COLORS.danger }
                          ]}>
                            Today: {formatCurrency(item.dailyChangeDollar)} ({formatPercent(item.dailyChangePercent)})
                          </Text>
                        )}
                      </View>
                    ) : (
                      <View style={styles.itemPerformanceRow}>
                        {item.changePercent !== undefined ? (
                          <Text style={[
                            styles.itemGain,
                            { color: item.changePercent >= 0 ? COLORS.success : COLORS.danger }
                          ]}>
                            {item.changePercent >= 0 ? '+' : ''}{item.changePercent?.toFixed(2) || '0.00'}%
                          </Text>
                        ) : (
                          <Text style={styles.itemGain}>
                            Loading...
                          </Text>
                        )}
                      </View>
                    )}
                  </View>
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
         onBuy={(stock) => {
           setTradingStock(stock);
           setTradeType('buy');
         }}
       />
       
       {/* Bottom Navigation */}
       <BottomNavigation 
         navigation={navigation} 
         currentScreen="Portfolio" 
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
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: 120, // Extra padding for bottom navigation and safety
    flexGrow: 1,
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
  refreshButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 6,
  },
  refreshButtonText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.primary,
    fontWeight: '600',
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
    minWidth: 0, // Allow flex shrinking
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
    flexShrink: 1, // Allow text to shrink
    minFontSize: 12, // Minimum font size for readability
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
    minWidth: 0, // Allow flex shrinking
  },
  metricLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
    marginBottom: SPACING.xs,
  },
  metricValue: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
    flexShrink: 1, // Allow text to shrink
    minFontSize: 10, // Minimum font size for readability
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
  sectorDetails: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
    marginTop: 2,
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
  sectorProgressContainer: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    marginTop: 4,
  },
  sectorProgressBar: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  listSection: {
    marginBottom: SPACING.lg,
  },
  itemCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    position: 'relative',
    paddingRight: SPACING.xl, // Make room for delete button
  },
  deleteButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 59, 48, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.5)',
    marginRight: SPACING.sm,
  },
  deleteButtonText: {
    color: '#FF3B30',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
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
  itemTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  itemPerformanceRow: {
    alignItems: 'flex-end',
    marginTop: 2,
  },
  itemPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemMetricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
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
  itemDailyChange: {
    ...TYPOGRAPHY.small,
    fontWeight: '400',
    fontSize: 11,
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
  itemChange: {
    ...TYPOGRAPHY.caption,
    fontWeight: '500',
    marginLeft: SPACING.sm,
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
  itemAvgPrice: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
  },
  itemMetric: {
    ...TYPOGRAPHY.small,
    color: COLORS.text.accent,
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

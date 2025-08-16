import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc, addDoc, collection, getDocs, updateDoc, deleteDoc } from 'firebase/firestore';

export default function StockComparison({ navigation, user }) {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [currentPairIndex, setCurrentPairIndex] = useState(0);
  const [priceUpdateTime, setPriceUpdateTime] = useState(new Date());
  const [priceUpdating, setPriceUpdating] = useState(false);

  useEffect(() => {
    loadStocks();
    
    // Set up price updates every 30 seconds
    const priceUpdateInterval = setInterval(() => {
      updateStockPrices();
    }, 2 * 60 * 1000); // Update every 2 minutes to conserve API calls
    
    return () => clearInterval(priceUpdateInterval);
  }, []);

  // Re-fetch prices whenever the stock list changes
  useEffect(() => {
    if (stocks.length > 0) {
      updateStockPrices();
    }
  }, [stocks.map(s => s.symbol).join(',')]);

  const updateStockPrices = async () => {
    if (stocks.length === 0) return;
    
    try {
      setPriceUpdating(true);
      console.log('📈 Updating stock comparison prices with real data...');
      
      // Import the Finnhub service
      const { getMultipleQuotes } = await import('../services/finnhubService');
      
      // Extract symbols from current stocks
      const symbols = Array.from(new Set(stocks.map(stock => stock.symbol))).filter(Boolean);
      
      // Get real-time quotes for all symbols
      let quotes = [];
      try {
        console.log(`🔍 Stock Comparison: Requesting quotes for ${symbols.length} symbols: ${symbols.join(', ')}`);
        quotes = await getMultipleQuotes(symbols);
        console.log(`📊 Stock Comparison: Retrieved ${quotes.length} real-time quotes`);
        if (quotes.length > 0) {
          console.log('Quote sample:', quotes.slice(0, 2).map(q => `${q.symbol}: $${q.price}`).join(', '));
        }
      } catch (quoteError) {
        console.error('❌ Stock Comparison: Error fetching quotes:', quoteError);
        quotes = [];
      }
      
      // Update stocks with real prices
      const updatedStocks = stocks.map(stock => {
        const quote = quotes.find(q => q.symbol === stock.symbol);
        
        if (quote) {
          const oldPrice = stock.price || 0;
          console.log(`💰 Stock Comparison: Updated ${stock.symbol}: $${oldPrice.toFixed(2)} → $${quote.price.toFixed(2)} (${quote.changePercent})`);
          
          return {
            ...stock,
            price: quote.price,
            priceFormatted: `$${quote.price.toFixed(2)}`,
            change: quote.change,
            changePercent: quote.changePercent,
            lastUpdated: new Date().toISOString()
          };
        } else {
          console.log(`⚠️ Stock Comparison: No quote data for ${stock.symbol}, keeping existing price: $${(stock.price || 0).toFixed(2)}`);
          return stock;
        }
      });
      
      setStocks(updatedStocks);
      setPriceUpdateTime(new Date());
      console.log('✅ Stock comparison prices updated with real market data');
    } catch (error) {
      console.log('❌ Failed to update stock comparison prices:', error);
      // Fallback: keep existing prices if API fails
    } finally {
      setPriceUpdating(false);
    }
  };

  const loadStocks = async () => {
    try {
      setLoading(true);
      
      // Check if user has recent stock recommendations (only load stocks generated today)
      const generatedStocksRef = collection(db, 'users', user.uid, 'generatedStocks');
      const generatedStocksSnap = await getDocs(generatedStocksRef);
      
      if (!generatedStocksSnap.empty) {
        const stocksFromDB = [];
        const today = new Date().toDateString();
        
        generatedStocksSnap.forEach((doc) => {
          const stockData = doc.data();
          // Only include stocks generated today that have market cap data
          const stockDate = stockData.generatedAt ? new Date(stockData.generatedAt).toDateString() : null;
          if (stockDate === today && stockData.marketCap) {
            stocksFromDB.push({ id: doc.id, ...stockData });
          }
        });
        
        if (stocksFromDB.length >= 2) {
          console.log(`📊 Loaded ${stocksFromDB.length} recent stocks with market data from Firebase`);
          setStocks(stocksFromDB);
          setCurrentPairIndex(0);
        } else {
          console.log('📊 No recent stocks with market data found, generating new ones');
          await generateNewStocks();
        }
      } else {
        console.log('📊 No existing stocks found, generating new ones');
        await generateNewStocks();
      }
    } catch (error) {
      console.error('Error loading stocks:', error);
      Alert.alert('Error', 'Failed to load stock recommendations');
    } finally {
      setLoading(false);
    }
  };

  const generateNewStocks = async () => {
    try {
      setGenerating(true);
      
      // Try to use the real stock generation service with timeout
      try {
        const stockGenerationService = await import('../services/stockGenerationService');
        const service = stockGenerationService.default;
        
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Stock generation timeout')), 15000)
        );
        
        const generationPromise = (async () => {
          await service.loadUserContext();
          return await service.generatePersonalizedStocks(10);
        })();
        
        const generatedStocks = await Promise.race([generationPromise, timeoutPromise]);
        
        if (generatedStocks && generatedStocks.length > 0) {
          // Use real generated stocks - they're already stored in Firebase by the service
          console.log(`📊 Setting ${generatedStocks.length} generated stocks to state`);
          setStocks(generatedStocks);
          setCurrentPairIndex(0);
          return;
        }
      } catch (serviceError) {
        console.warn('Stock generation service failed (API timeout/error), using fallback:', serviceError);
        Alert.alert(
          'API Services Unavailable',
          'Using offline stock recommendations. Some features may be limited.',
          [{ text: 'OK' }]
        );
      }
      
      // Fallback to enhanced mock data
      const mockStocks = [
        {
          symbol: 'AAPL',
          name: 'Apple Inc.',
          price: 185.23,
          marketCap: 2850000000000,
          sector: 'Technology',
          industry: 'Consumer Electronics',
          investmentThesis: 'Leading technology company with strong ecosystem and innovation pipeline. iPhone remains dominant with services growing rapidly.',
          targetPrice: 200,
          confidence: 85,
          recommendation: 'BUY',
          riskLevel: 'Medium',
        },
        {
          symbol: 'GOOGL',
          name: 'Alphabet Inc.',
          price: 142.56,
          marketCap: 1800000000000,
          sector: 'Technology',
          industry: 'Internet Software/Services',
          investmentThesis: 'Dominant search engine with growing cloud and AI capabilities. YouTube and Android provide diversified revenue streams.',
          targetPrice: 160,
          confidence: 82,
          recommendation: 'BUY',
          riskLevel: 'Medium',
        },
        {
          symbol: 'MSFT',
          name: 'Microsoft Corporation',
          price: 378.91,
          marketCap: 2820000000000,
          sector: 'Technology',
          industry: 'Software',
          investmentThesis: 'Cloud computing leader with strong enterprise software portfolio. Azure growth and AI integration driving value.',
          targetPrice: 400,
          confidence: 87,
          recommendation: 'BUY',
          riskLevel: 'Low',
        },
        {
          symbol: 'TSLA',
          name: 'Tesla, Inc.',
          price: 248.42,
          marketCap: 790000000000,
          sector: 'Consumer Cyclical',
          industry: 'Auto Manufacturers',
          investmentThesis: 'Electric vehicle pioneer with expanding energy and AI initiatives. Full self-driving potential significant upside.',
          targetPrice: 300,
          confidence: 75,
          recommendation: 'HOLD',
          riskLevel: 'High',
        },
        {
          symbol: 'NVDA',
          name: 'NVIDIA Corporation',
          price: 825.12,
          marketCap: 2040000000000,
          sector: 'Technology',
          industry: 'Semiconductors',
          investmentThesis: 'AI and machine learning leader with dominant GPU technology. Data center growth driving massive revenue expansion.',
          targetPrice: 900,
          confidence: 88,
          recommendation: 'BUY',
          riskLevel: 'High',
        },
        {
          symbol: 'AMD',
          name: 'Advanced Micro Devices',
          price: 152.34,
          marketCap: 245000000000,
          sector: 'Technology',
          industry: 'Semiconductors',
          investmentThesis: 'Strong competition to Intel in CPU market. Growing data center and gaming GPU segments showing promise.',
          targetPrice: 180,
          confidence: 78,
          recommendation: 'BUY',
          riskLevel: 'Medium',
        },
      ];

      // Randomize the order for variety
      const shuffledStocks = mockStocks.sort(() => Math.random() - 0.5);

      // Save to user profile
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        pendingStocks: shuffledStocks,
        lastStockUpdate: new Date(),
      }, { merge: true });

      setStocks(shuffledStocks);
      setCurrentPairIndex(0);
      
    } catch (error) {
      console.error('Error generating stocks:', error);
      Alert.alert('Error', 'Failed to generate stock recommendations');
    } finally {
      setGenerating(false);
    }
  };

  const handleStockChoice = async (chosenStock, rejectedStock) => {
    try {
      const userRef = doc(db, 'users', user.uid);

      // Record user preference for better future filtering
      try {
        const serviceImport = await import('../services/stockGenerationService');
        const service = serviceImport.default;
        await service.recordUserChoice(chosenStock.symbol, 'like', chosenStock);
        if (rejectedStock?.symbol) {
          await service.recordUserChoice(rejectedStock.symbol, 'reject', rejectedStock);
        }
      } catch (prefErr) {
        // Fallback: update liked/rejected arrays directly on user doc
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const data = snap.data();
          const liked = data.likedStocks || [];
          const rejected = data.rejectedStocks || [];
          if (!liked.includes(chosenStock.symbol)) liked.push(chosenStock.symbol);
          if (rejectedStock?.symbol && !rejected.includes(rejectedStock.symbol)) rejected.push(rejectedStock.symbol);
          await setDoc(userRef, { likedStocks: liked, rejectedStocks: rejected }, { merge: true });
        }
      }
      
      // Add chosen stock to portfolio as a potential investment
      const portfolioRef = collection(db, 'users', user.uid, 'portfolio');
      
      // Check if this stock is already in portfolio (with actual shares, not just watchlist)
      const portfolioSnap = await getDocs(portfolioRef);
      let alreadyOwned = false;
      let watchlistOnly = false;
      
      console.log(`🔍 Checking if ${chosenStock.symbol} exists in portfolio...`);
      
      portfolioSnap.forEach((doc) => {
        const data = doc.data();
        if (data.symbol === chosenStock.symbol) {
          const shares = parseFloat(data.shares) || 0;
          const isWatchlistItem = data.isWatchlist === true || shares === 0;
          
          console.log(`📊 Found ${chosenStock.symbol}: shares=${shares}, isWatchlist=${data.isWatchlist}, computed=${isWatchlistItem}`);
          
          if (shares > 0 && !isWatchlistItem) {
            alreadyOwned = true; // Actually owns shares
            console.log(`✅ ${chosenStock.symbol} is already owned with ${shares} shares`);
          } else if (isWatchlistItem) {
            watchlistOnly = true; // Only on watchlist
            console.log(`👁️ ${chosenStock.symbol} is on watchlist only`);
          }
        }
      });
      
      console.log(`🎯 Final result for ${chosenStock.symbol}: owned=${alreadyOwned}, watchlist=${watchlistOnly}`);
      
      if (alreadyOwned) {
        Alert.alert(
          '📊 Already Owned',
          `You already own shares of ${chosenStock.symbol}. You can buy more shares from your Portfolio tab.`,
          [{ text: 'Continue', style: 'default' }]
        );
      } else if (watchlistOnly) {
        Alert.alert(
          '📋 Already on Watchlist',
          `${chosenStock.symbol} is already on your watchlist. You can purchase shares from your Portfolio tab.`,
          [{ text: 'Continue', style: 'default' }]
        );
      } else {
        // Remove any existing watchlist entry for this stock to prevent duplicates
        if (watchlistOnly) {
          console.log(`🗑️ Removing existing watchlist entry for ${chosenStock.symbol}`);
          portfolioSnap.forEach(async (doc) => {
            const data = doc.data();
            if (data.symbol === chosenStock.symbol && (data.isWatchlist === true || parseFloat(data.shares) === 0)) {
              await deleteDoc(doc.ref);
              console.log(`✅ Removed duplicate watchlist entry for ${chosenStock.symbol}`);
            }
          });
        }
        
        // Add to watchlist/portfolio as a potential investment (0 shares)
        try {
          await addDoc(portfolioRef, {
            symbol: chosenStock.symbol,
            name: chosenStock.name,
            shares: 0, // Watchlist item - no shares purchased yet
            averagePrice: chosenStock.price,
            purchaseDate: new Date().toISOString(),
            sector: chosenStock.sector,
            logo: chosenStock.logo,
            currentPrice: chosenStock.price,
            source: 'StockComparison',
            isWatchlist: true // Flag to indicate this is a watchlist item
          });

          Alert.alert(
            '📋 Added to Watchlist!',
            `${chosenStock.symbol} has been added to your watchlist. You can purchase shares from your Portfolio tab.`,
            [
              { text: 'Continue Browsing', style: 'default' },
              { 
                text: 'View Portfolio', 
                onPress: () => navigation?.navigate?.('Portfolio'),
                style: 'default'
              }
            ]
          );
        } catch (portfolioError) {
          console.error('Error adding to watchlist:', portfolioError);
          Alert.alert(
            'Error',
            'Failed to add stock to watchlist. Please try again.',
            [{ text: 'OK', style: 'default' }]
          );
        }
      }

      // Remove the chosen and rejected stocks from the current list to prevent them from appearing again
      const filteredStocks = stocks.filter(stock => 
        stock.symbol !== chosenStock.symbol && 
        stock.symbol !== rejectedStock?.symbol
      );
      
      // Update the stocks list
      setStocks(filteredStocks);
      
      // Move to next pair or generate new stocks if we're running low
      if (filteredStocks.length < 4) {
        // Not enough stocks left, generate new ones
        setTimeout(() => generateNewStocks(), 1000);
      } else {
        // Find the next valid pair index
        let nextIndex = currentPairIndex;
        // If current pair index is beyond available stocks, reset to 0
        if (nextIndex >= filteredStocks.length - 1) {
          nextIndex = 0;
        }
        setCurrentPairIndex(nextIndex);
      }
      
    } catch (error) {
      console.error('Error recording choice:', error);
      Alert.alert('Error', 'Failed to record your choice');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatMarketCap = (marketCap) => {
    if (marketCap >= 1e12) {
      return `$${(marketCap / 1e12).toFixed(1)}T`;
    } else if (marketCap >= 1e9) {
      return `$${(marketCap / 1e9).toFixed(1)}B`;
    } else if (marketCap >= 1e6) {
      return `$${(marketCap / 1e6).toFixed(1)}M`;
    }
    return formatCurrency(marketCap);
  };

  if (loading || generating) {
    return (
      <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>
            {generating ? 'Generating AI recommendations...' : 'Loading stocks...'}
          </Text>
        </View>
      </LinearGradient>
    );
  }

  if (stocks.length === 0) {
    return (
      <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>📊 No Recommendations</Text>
          <Text style={styles.emptyText}>
            No stock recommendations available. Generate new ones?
          </Text>
          <TouchableOpacity style={styles.generateButton} onPress={generateNewStocks}>
            <Text style={styles.generateButtonText}>🔄 Generate Recommendations</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  const currentPair = stocks.slice(currentPairIndex, currentPairIndex + 2);
  
  if (currentPair.length < 2) {
    return (
      <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>🎉 All Done!</Text>
          <Text style={styles.emptyText}>
            You've reviewed all available recommendations.
          </Text>
          <TouchableOpacity style={styles.generateButton} onPress={generateNewStocks}>
            <Text style={styles.generateButtonText}>🔄 Generate More</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>📊 Stock Comparison</Text>
          <Text style={styles.headerSubtitle}>
            Choose the stock you prefer - swipe or tap to decide
          </Text>
          {priceUpdating && (
            <View style={styles.updateIndicator}>
              <ActivityIndicator size="small" color="#10b981" />
              <Text style={styles.updateText}>Updating prices...</Text>
            </View>
          )}
        </View>

        {/* Stock Comparison Cards */}
        <View style={styles.comparisonContainer}>
          {currentPair.map((stock, index) => (
            <TouchableOpacity
              key={stock.symbol}
              style={styles.stockCard}
              onPress={() => handleStockChoice(stock, currentPair[1 - index])}
            >
              <LinearGradient
                colors={['#334155', '#475569']}
                style={styles.stockCardGradient}
              >
                {/* Stock Header */}
                <View style={styles.stockHeader}>
                  <View>
                    <Text style={styles.stockSymbol}>{stock.symbol}</Text>
                    <Text style={styles.stockName}>{stock.name}</Text>
                  </View>
                  <View style={styles.priceContainer}>
                    <Text style={styles.stockPrice}>{formatCurrency(stock.price)}</Text>
                    <Text style={styles.marketCap}>{stock.marketCap || 'N/A'}</Text>
                  </View>
                </View>

                {/* Stock Details */}
                <View style={styles.stockDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Sector:</Text>
                    <Text style={styles.detailValue}>{stock.sector}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Industry:</Text>
                    <Text style={styles.detailValue}>{stock.industry}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Target:</Text>
                    <Text style={[styles.detailValue, styles.targetPrice]}>
                      {typeof stock.targetPrice === 'number' ? formatCurrency(stock.targetPrice) : stock.targetPrice || 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Confidence:</Text>
                    <Text style={[styles.detailValue, styles.confidence]}>
                      {typeof stock.confidence === 'number' ? `${Math.round(stock.confidence)}%` : `${stock.confidence}%`}
                    </Text>
                  </View>
                  {stock.recommendation && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Rating:</Text>
                      <Text style={[
                        styles.detailValue, 
                        { color: stock.recommendation === 'BUY' ? '#10b981' : 
                                stock.recommendation === 'SELL' ? '#ef4444' : '#f59e0b' }
                      ]}>
                        {stock.recommendation}
                      </Text>
                    </View>
                  )}
                  {stock.riskLevel && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Risk:</Text>
                      <Text style={[
                        styles.detailValue,
                        { color: stock.riskLevel === 'Low' ? '#10b981' : 
                                stock.riskLevel === 'High' ? '#ef4444' : '#f59e0b' }
                      ]}>
                        {stock.riskLevel}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Investment Thesis */}
                <View style={styles.thesisContainer}>
                  <Text style={styles.thesisLabel}>Investment Thesis:</Text>
                  <Text style={styles.thesisText}>{stock.investmentThesis}</Text>
                </View>

                {/* Choose Button */}
                <TouchableOpacity
                  style={styles.chooseButton}
                  onPress={() => handleStockChoice(stock, currentPair[1 - index])}
                >
                  <Text style={styles.chooseButtonText}>
                    ✅ Choose {stock.symbol}
                  </Text>
                </TouchableOpacity>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>

        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            Pair {Math.floor(currentPairIndex / 2) + 1} of {Math.ceil(stocks.length / 2)}
          </Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${((currentPairIndex / 2) / (stocks.length / 2)) * 100}%`,
                },
              ]}
            />
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <TouchableOpacity style={styles.skipButton} onPress={() => {
            const nextIndex = currentPairIndex + 2;
            if (nextIndex >= stocks.length) {
              generateNewStocks();
            } else {
              setCurrentPairIndex(nextIndex);
            }
          }}>
            <Text style={styles.skipButtonText}>⏭️ Skip This Pair</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.newStocksButton} onPress={generateNewStocks}>
            <Text style={styles.newStocksButtonText}>🔄 Generate New Stocks</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#e2e8f0',
    marginTop: 12,
    fontSize: 16,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#e2e8f0',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 20,
  },
  generateButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  generateButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#e2e8f0',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#94a3b8',
  },
  updateIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    backgroundColor: '#1e293b',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  updateText: {
    color: '#10b981',
    fontSize: 12,
    marginLeft: 6,
    fontWeight: '600',
  },
  comparisonContainer: {
    marginBottom: 20,
  },
  stockCard: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  stockCardGradient: {
    padding: 16,
  },
  stockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  stockSymbol: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#e2e8f0',
  },
  stockName: {
    fontSize: 16,
    color: '#94a3b8',
    marginTop: 4,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  stockPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#10b981',
  },
  marketCap: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },
  stockDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#94a3b8',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: '#e2e8f0',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  targetPrice: {
    color: '#10b981',
  },
  confidence: {
    color: '#f59e0b',
  },
  thesisContainer: {
    marginBottom: 16,
  },
  thesisLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#e2e8f0',
    marginBottom: 8,
  },
  thesisText: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 20,
  },
  chooseButton: {
    backgroundColor: '#10b981',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  chooseButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressText: {
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 8,
    fontSize: 14,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#475569',
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6366f1',
    borderRadius: 2,
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  skipButton: {
    backgroundColor: '#475569',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flex: 1,
    marginRight: 8,
  },
  skipButtonText: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  newStocksButton: {
    backgroundColor: '#6366f1',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flex: 1,
    marginLeft: 8,
  },
  newStocksButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  bottomSpacer: {
    height: 20,
  },
});

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { auth, db } from '../firebase';
import { getStockQuote, getMultipleQuotes } from '../services/finnhubService';
import { 
  doc, 
  updateDoc, 
  collection, 
  getDocs, 
  deleteDoc, 
  addDoc, 
  getDoc,
  setDoc 
} from 'firebase/firestore';

export default function PortfolioTracker({ navigation, user }) {
  const [holdings, setHoldings] = useState([]);
  const [cashBalance, setCashBalance] = useState(10000);
  const [totalEquity, setTotalEquity] = useState(0);
  const [totalValue, setTotalValue] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tradingStock, setTradingStock] = useState(null);
  const [tradeAmount, setTradeAmount] = useState('');
  const [tradeType, setTradeType] = useState('buy'); // 'buy' or 'sell'
  const [priceUpdating, setPriceUpdating] = useState(false);
  const [lastPriceUpdate, setLastPriceUpdate] = useState(null);
  const [sectorSummary, setSectorSummary] = useState([]);
  const holdingsRef = useRef([]);
  const cashBalanceRef = useRef(10000);

  // Update refs when state changes
  useEffect(() => {
    holdingsRef.current = holdings;
  }, [holdings]);

  useEffect(() => {
    cashBalanceRef.current = cashBalance;
  }, [cashBalance]);

  useEffect(() => {
    loadPortfolioData().then(() => {
      // After initial load, immediately refresh prices so UI reflects latest
      updatePortfolioPrices();
    });
    
    // Set up price updates every 5 minutes to conserve API calls
    const priceUpdateInterval = setInterval(() => {
      updatePortfolioPrices();
    }, 5 * 60 * 1000); // 5 minutes
    
    return () => clearInterval(priceUpdateInterval);
  }, []);

  // Separate useEffect for price updates to ensure it has access to current holdings
  useEffect(() => {
    if (holdings.length > 0) {
      // Update prices when holdings change, but debounce to avoid too frequent calls
      const timeoutId = setTimeout(() => {
        updatePortfolioPrices();
      }, 2000); // Increased delay to reduce initial load conflicts
      
      return () => clearTimeout(timeoutId);
    }
  }, [holdings.length]); // Only trigger when number of holdings changes
  
  const updatePortfolioPrices = useCallback(async () => {
    const currentHoldings = holdingsRef.current;
    const currentCashBalance = cashBalanceRef.current;
    
    if (currentHoldings.length === 0) return;
    
    try {
      setPriceUpdating(true);
      console.log('📈 Updating portfolio prices with real data...');
      
      // Import the Finnhub service
      const { getMultipleQuotes } = await import('../services/finnhubService');
      
      // Extract symbols from current holdings
      const symbols = currentHoldings.map(holding => holding.symbol);
      console.log(`🔍 Requesting quotes for symbols: ${symbols.join(', ')}`);
      
      // Get real-time quotes for all symbols with error handling
      let quotes = [];
      try {
        quotes = await getMultipleQuotes(symbols);
        console.log(`📊 Retrieved ${quotes.length} real-time quotes for ${symbols.length} symbols`);
        if (quotes.length > 0) {
          console.log('Quote sample:', quotes.slice(0, 3).map(q => `${q.symbol}: $${q.price}`).join(', '));
        } else {
          console.warn('⚠️ No quotes returned from Finnhub API');
        }
      } catch (quoteError) {
        console.error('❌ Error fetching quotes:', quoteError);
        // Continue with empty quotes array to avoid crashing
        quotes = [];
      }
      
      // Update holdings with real prices
      const updatedHoldings = currentHoldings.map(holding => {
        const quote = quotes.find(q => q.symbol === holding.symbol);
        
        if (quote) {
          const newPrice = quote.price;
          const currentValue = holding.shares * newPrice;
          const change = newPrice - holding.averagePrice;
          const changePercent = holding.averagePrice > 0 ? 
            ((newPrice - holding.averagePrice) / holding.averagePrice) * 100 : 0;
            
          const oldPrice = holding.currentPrice || holding.price || 0;
          console.log(`💰 Updated ${holding.symbol}: $${oldPrice.toFixed(2)} → $${newPrice.toFixed(2)} (${quote.changePercent})`);
          
                      return {
            ...holding,
            currentPrice: newPrice,
            currentValue,
            change,
            changePercent,
            changeFormatted: `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`,
            lastUpdated: new Date().toISOString(),
            dailyChange: quote.change,
            dailyChangePercent: typeof quote.changePercent === 'string' 
              ? parseFloat(quote.changePercent.replace('%', '')) || 0
              : (quote.changePercent || 0)
          };
        } else {
          console.log(`⚠️ No quote data for ${holding.symbol}, keeping existing price`);
          return holding;
        }
      });
      
      // Update holdings state with new prices
      console.log(`📊 Setting updated holdings for ${updatedHoldings.length} stocks`);
      setHoldings(updatedHoldings);
      holdingsRef.current = updatedHoldings; // Ensure ref is also updated
      setLastPriceUpdate(new Date());
      calculateSectorSummary(updatedHoldings);
      
      // Update Firebase with latest prices (don't await to avoid blocking UI)
      updateFirebaseWithLatestPrices(updatedHoldings);
      
      // Recalculate equity and total value based on latest prices
      const recalculatedEquity = updatedHoldings
        .filter(h => !h.isWatchlist && h.shares > 0)
        .reduce((sum, h) => sum + (h.currentValue || 0), 0);
      
      console.log(`💰 Portfolio Overview: Equity: $${recalculatedEquity.toFixed(2)}, Cash: $${currentCashBalance.toFixed(2)}, Total: $${(recalculatedEquity + currentCashBalance).toFixed(2)}`);
      
      setTotalEquity(recalculatedEquity);
      setTotalValue(recalculatedEquity + currentCashBalance);
      console.log('✅ Portfolio prices updated with real market data');
    } catch (error) {
      console.error('❌ Failed to update portfolio prices:', error);
      console.error('Error details:', error.message);
      // Fallback: keep existing prices if API fails
      Alert.alert(
        'Price Update Failed',
        'Unable to refresh stock prices. Using cached values.',
        [{ text: 'OK' }]
      );
    } finally {
      setPriceUpdating(false);
    }
  }, []); // Empty dependency array since we use refs

  // Helper function to update Firebase with latest prices
  const updateFirebaseWithLatestPrices = async (updatedHoldings) => {
    if (!user?.uid) return;
    
    try {
      
      // Update each holding with latest price data
      const updatePromises = updatedHoldings
        .filter(holding => holding.id && holding.currentPrice) // Only update holdings with valid data
        .map(async (holding) => {
          try {
            const holdingRef = doc(db, 'users', user.uid, 'portfolio', holding.id);
            await updateDoc(holdingRef, {
              currentPrice: holding.currentPrice,
              currentValue: holding.currentValue,
              dailyChange: holding.dailyChange,
              dailyChangePercent: holding.dailyChangePercent,
              lastUpdated: holding.lastUpdated,
            });
            console.log(`✅ Updated Firebase price for ${holding.symbol}`);
          } catch (error) {
            console.warn(`⚠️ Failed to update Firebase for ${holding.symbol}:`, error.message);
          }
        });
      
      await Promise.all(updatePromises);
      console.log(`🔥 Updated ${updatePromises.length} holdings in Firebase`);
    } catch (error) {
      console.error('❌ Error updating Firebase with latest prices:', error);
    }
  };

  const loadPortfolioData = async () => {
    try {
      if (!user?.uid) return;

      // Load user profile for cash balance
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        setCashBalance(userData.cashBalance || 10000);
      }

      // Load portfolio holdings
      const portfolioRef = collection(db, 'users', user.uid, 'portfolio');
      const portfolioSnap = await getDocs(portfolioRef);
      
      const portfolioHoldings = [];
      let equity = 0;
      
      portfolioSnap.forEach((doc) => {
        const holding = { id: doc.id, ...doc.data() };
        
        // Ensure proper number conversion and validation
        const shares = parseFloat(holding.shares) || 0;
        const averagePrice = parseFloat(holding.averagePrice) || 0;
        const currentPrice = parseFloat(holding.currentPrice || holding.price || holding.averagePrice) || 0;
        
        const currentValue = shares * currentPrice;
        const change = currentPrice - averagePrice;
        const changePercent = averagePrice > 0 ? 
          ((currentPrice - averagePrice) / averagePrice) * 100 : 0;
        
        const enrichedHolding = {
          ...holding,
          shares,
          averagePrice,
          currentPrice: isNaN(currentPrice) ? 0 : currentPrice,
          currentValue: isNaN(currentValue) ? 0 : currentValue,
          change: isNaN(change) ? 0 : change,
          changePercent: isNaN(changePercent) ? 0 : changePercent,
          changeFormatted: `${changePercent >= 0 ? '+' : ''}${(isNaN(changePercent) ? 0 : changePercent).toFixed(2)}%`,
          isWatchlist: shares === 0 || holding.isWatchlist === true,
        };
        
        portfolioHoldings.push(enrichedHolding);
        // Only add to equity if actually owned (not watchlist and has shares)
        if (!enrichedHolding.isWatchlist && enrichedHolding.shares > 0) {
          equity += isNaN(currentValue) ? 0 : currentValue;
        }
      });
      
      setHoldings(portfolioHoldings);
      setTotalEquity(equity);
      setTotalValue(equity + cashBalance);
      calculateSectorSummary(portfolioHoldings);
      
    } catch (error) {
      console.error('Error loading portfolio data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefreshPortfolio = async () => {
    setRefreshing(true);
    await loadPortfolioData();
    setRefreshing(false);
  };

  const openTradeModal = (holding, type) => {
    setTradingStock(holding);
    setTradeType(type);
    setTradeAmount('');
  };

  const executeTrade = async () => {
    try {
      if (!tradingStock || !tradeAmount || !user?.uid) return;
      
      const shares = parseInt(tradeAmount);
      if (isNaN(shares) || shares <= 0) {
        Alert.alert('Error', 'Please enter a valid number of shares');
        return;
      }

      const currentPrice = tradingStock.currentPrice || tradingStock.price || 0;
      const tradeValue = shares * currentPrice;

      if (tradeType === 'buy') {
        // Check if user has enough cash
        if (tradeValue > cashBalance) {
          Alert.alert(
            'Insufficient Funds', 
            `You need ${formatCurrency(tradeValue)} but only have ${formatCurrency(cashBalance)} available.\n\nShortfall: ${formatCurrency(tradeValue - cashBalance)}`
          );
          return;
        }

        // Update or create holding
        const existingHolding = holdings.find(h => h.symbol === tradingStock.symbol);
        
        if (existingHolding) {
          // Check if it's a watchlist item
          if (existingHolding.isWatchlist || existingHolding.shares === 0) {
            // Converting from watchlist to actual holding
            const holdingRef = doc(db, 'users', user.uid, 'portfolio', existingHolding.id);
            await updateDoc(holdingRef, {
              shares: shares,
              averagePrice: currentPrice,
              lastUpdated: new Date(),
              isWatchlist: false,
            });
          } else {
            // Update existing holding with more shares
            const totalShares = existingHolding.shares + shares;
            const totalCost = (existingHolding.shares * existingHolding.averagePrice) + tradeValue;
            const newAveragePrice = totalCost / totalShares;
            
            const holdingRef = doc(db, 'users', user.uid, 'portfolio', existingHolding.id);
            await updateDoc(holdingRef, {
              shares: totalShares,
              averagePrice: newAveragePrice,
              lastUpdated: new Date(),
            });
          }
        } else {
          // Create new holding
          const portfolioRef = collection(db, 'users', user.uid, 'portfolio');
          await addDoc(portfolioRef, {
            symbol: tradingStock.symbol,
            name: tradingStock.name || tradingStock.symbol,
            shares: shares,
            averagePrice: currentPrice,
            price: currentPrice,
            purchaseDate: new Date(),
            lastUpdated: new Date(),
          });
        }

        // Update cash balance
        const newCashBalance = cashBalance - tradeValue;
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, { cashBalance: newCashBalance });
        setCashBalance(newCashBalance);

        Alert.alert(
          '✅ Purchase Successful!', 
          `Bought ${shares} shares of ${tradingStock.symbol} for ${formatCurrency(tradeValue)}\n\nNew cash balance: ${formatCurrency(newCashBalance)}`
        );
        
      } else if (tradeType === 'sell') {
        // Check if user has enough shares
        if (shares > tradingStock.shares) {
          Alert.alert('Insufficient Shares', 'You don\'t have enough shares to sell');
          return;
        }

        const saleValue = shares * currentPrice;
        
        if (shares === tradingStock.shares) {
          // Sell all shares - delete holding
          const holdingRef = doc(db, 'users', user.uid, 'portfolio', tradingStock.id);
          await deleteDoc(holdingRef);
        } else {
          // Partial sale - update holding
          const holdingRef = doc(db, 'users', user.uid, 'portfolio', tradingStock.id);
          await updateDoc(holdingRef, {
            shares: tradingStock.shares - shares,
            lastUpdated: new Date(),
          });
        }

        // Update cash balance
        const newCashBalance = cashBalance + saleValue;
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, { cashBalance: newCashBalance });
        setCashBalance(newCashBalance);

        Alert.alert(
          '✅ Sale Successful!', 
          `Sold ${shares} shares of ${tradingStock.symbol} for ${formatCurrency(saleValue)}\n\nNew cash balance: ${formatCurrency(newCashBalance)}`
        );
      }

      setTradingStock(null);
      await loadPortfolioData(); // Refresh data
      
    } catch (error) {
      console.error('Error executing trade:', error);
      Alert.alert('Error', 'Failed to execute trade. Please try again.');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount || 0);
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

  const calculateSectorSummary = (portfolioHoldings) => {
    const sectorMap = {};
    
    // Only include actual holdings (not watchlist items)
    portfolioHoldings.filter(holding => !holding.isWatchlist).forEach(holding => {
      const sector = holding.sector || 'Other';
      if (!sectorMap[sector]) {
        sectorMap[sector] = {
          sector,
          totalValue: 0,
          holdings: 0,
          symbols: []
        };
      }
      sectorMap[sector].totalValue += holding.currentValue || 0;
      sectorMap[sector].holdings += 1;
      sectorMap[sector].symbols.push(holding.symbol);
    });
    
    const sectorArray = Object.values(sectorMap).sort((a, b) => b.totalValue - a.totalValue);
    setSectorSummary(sectorArray);
  };

  const renderHolding = (holding) => (
    <View key={holding.id} style={styles.holdingCard}>
      <LinearGradient colors={holding.isWatchlist ? ['#1e293b', '#374151'] : ['#334155', '#475569']} style={styles.holdingGradient}>
        
        {/* Header */}
        <View style={styles.holdingHeader}>
          <View>
            <Text style={styles.holdingSymbol}>
              {holding.isWatchlist && '👁️ '}{holding.symbol}
            </Text>
            <Text style={styles.holdingName}>
              {holding.name || 'Unknown Company'}
              {holding.isWatchlist && ' (Watchlist)'}
            </Text>
          </View>
          <View style={styles.holdingValue}>
            <Text style={styles.holdingPrice}>{formatCurrency(holding.currentPrice)}</Text>
            {!holding.isWatchlist && (
              <Text style={[
                styles.holdingChange,
                { color: (holding.dailyChangePercent || holding.changePercent) >= 0 ? '#10b981' : '#ef4444' }
              ]}>
                {(holding.dailyChangePercent !== undefined && holding.dailyChangePercent !== null && typeof holding.dailyChangePercent === 'number') ? 
                  `${holding.dailyChangePercent >= 0 ? '+' : ''}${holding.dailyChangePercent.toFixed(2)}%` :
                  (holding.changeFormatted || '0.00%')
                }
              </Text>
            )}
          </View>
        </View>

        {/* Holdings Info */}
        <View style={styles.holdingInfo}>
          {holding.isWatchlist ? (
            <View style={styles.watchlistInfo}>
              <Text style={styles.watchlistText}>
                📋 This stock is on your watchlist. Buy shares to start investing!
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Shares:</Text>
                <Text style={styles.infoValue}>{holding.shares}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Avg Cost:</Text>
                <Text style={styles.infoValue}>{formatCurrency(holding.averagePrice)}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Total Value:</Text>
                <Text style={[styles.infoValue, styles.totalValue]}>
                  {formatCurrency(holding.currentValue)}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Gain/Loss:</Text>
                <Text style={[
                  styles.infoValue,
                  { color: holding.change >= 0 ? '#10b981' : '#ef4444' }
                ]}>
                  {formatCurrency(holding.change * holding.shares)}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Trade Buttons */}
        <View style={styles.tradeButtons}>
          <TouchableOpacity
            style={[styles.tradeButton, styles.buyButton]}
            onPress={() => openTradeModal(holding, 'buy')}
          >
            <Text style={styles.tradeButtonText}>
              {holding.isWatchlist ? '🛒 Buy Shares' : '📈 Buy More'}
            </Text>
          </TouchableOpacity>
          {!holding.isWatchlist && (
            <TouchableOpacity
              style={[styles.tradeButton, styles.sellButton]}
              onPress={() => openTradeModal(holding, 'sell')}
            >
              <Text style={styles.tradeButtonText}>📉 Sell</Text>
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>
    </View>
  );

  if (loading) {
    return (
      <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Loading Portfolio...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefreshPortfolio} />
        }
        showsVerticalScrollIndicator={false}
      >
        
        {/* Portfolio Summary */}
        <View style={styles.summaryCard}>
          <LinearGradient colors={['#1e293b', '#334155']} style={styles.summaryGradient}>
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryTitle}>💼 Portfolio Summary</Text>
              {priceUpdating && (
                <View style={styles.updateIndicator}>
                  <ActivityIndicator size="small" color="#10b981" />
                  <Text style={styles.updateText}>Updating prices...</Text>
                </View>
              )}
              {lastPriceUpdate && !priceUpdating && (
                <Text style={styles.lastUpdateText}>
                  Last updated: {lastPriceUpdate.toLocaleTimeString()}
                </Text>
              )}
              
              {/* Manual refresh button */}
              <TouchableOpacity 
                style={styles.refreshButton}
                onPress={() => {
                  console.log('🔄 Manual price refresh triggered');
                  updatePortfolioPrices();
                }}
                disabled={priceUpdating}
              >
                <Text style={styles.refreshButtonText}>
                  {priceUpdating ? '⏳' : '🔄'}
                </Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total Value</Text>
                <Text style={styles.summaryValue}>{formatCurrency(totalValue)}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Cash Balance</Text>
                <Text style={[styles.summaryValue, styles.cashValue]}>
                  {formatCurrency(cashBalance)}
                </Text>
              </View>
            </View>
            
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Equity Value</Text>
                <Text style={styles.summaryValue}>{formatCurrency(totalEquity)}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Holdings</Text>
                <Text style={styles.summaryValue}>{holdings.filter(h => !h.isWatchlist && h.shares > 0).length} stocks</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Holdings by Sector */}
        {sectorSummary.length > 0 && (
          <View style={styles.sectorCard}>
            <LinearGradient colors={['#1e293b', '#334155']} style={styles.sectorGradient}>
              <Text style={styles.sectionTitle}>📊 Holdings by Sector</Text>
              {sectorSummary.map((sector, index) => (
                <View key={sector.sector} style={styles.sectorRow}>
                  <View style={styles.sectorInfo}>
                    <Text style={styles.sectorName}>{sector.sector}</Text>
                    <Text style={styles.sectorSymbols}>{sector.symbols.join(', ')}</Text>
                  </View>
                  <View style={styles.sectorValue}>
                    <Text style={styles.sectorAmount}>{formatCurrency(sector.totalValue)}</Text>
                    <Text style={styles.sectorPercent}>
                      {((sector.totalValue / totalEquity) * 100).toFixed(1)}%
                    </Text>
                  </View>
                </View>
              ))}
            </LinearGradient>
          </View>
        )}

        {/* Holdings */}
        {holdings.length > 0 ? (
          <View style={styles.holdingsSection}>
            <Text style={styles.sectionTitle}>📈 Your Holdings</Text>
            {holdings.map(renderHolding)}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>📊 No Holdings Yet</Text>
            <Text style={styles.emptyText}>
              Start investing by exploring stock recommendations!
            </Text>
            <TouchableOpacity
              style={styles.exploreButton}
              onPress={() => navigation?.navigate?.('StockComparison')}
            >
              <Text style={styles.exploreButtonText}>🔍 Explore Stocks</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Trade Modal */}
      <Modal
        visible={!!tradingStock}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setTradingStock(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <LinearGradient colors={['#1e293b', '#334155']} style={styles.modalGradient}>
              
              <Text style={styles.modalTitle}>
                {tradeType === 'buy' ? '📈 Buy' : '📉 Sell'} {tradingStock?.symbol}
              </Text>
              
              <View style={styles.modalInfo}>
                <Text style={styles.modalLabel}>Current Price:</Text>
                <Text style={styles.modalValue}>
                  {formatCurrency(tradingStock?.currentPrice || 0)}
                </Text>
              </View>
              
              {tradeType === 'sell' && (
                <View style={styles.modalInfo}>
                  <Text style={styles.modalLabel}>Available Shares:</Text>
                  <Text style={styles.modalValue}>{tradingStock?.shares || 0}</Text>
                </View>
              )}
              
              <View style={styles.modalInfo}>
                <Text style={styles.modalLabel}>Cash Available:</Text>
                <Text style={styles.modalValue}>{formatCurrency(cashBalance)}</Text>
              </View>

              {tradeType === 'buy' && tradeAmount && !isNaN(parseInt(tradeAmount)) && (
                <View style={styles.modalInfo}>
                  <Text style={styles.modalLabel}>Max Affordable:</Text>
                  <Text style={styles.modalValue}>
                    {Math.floor(cashBalance / (tradingStock?.currentPrice || 1))} shares
                  </Text>
                </View>
              )}

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Number of Shares:</Text>
                <TextInput
                  style={styles.tradeInput}
                  value={tradeAmount}
                  onChangeText={setTradeAmount}
                  placeholder="Enter shares"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                />
              </View>

              {tradeAmount && !isNaN(parseInt(tradeAmount)) && (
                <View style={styles.tradePreview}>
                  <Text style={styles.previewLabel}>Trade Value:</Text>
                  <Text style={styles.previewValue}>
                    {formatCurrency((parseInt(tradeAmount) || 0) * (tradingStock?.currentPrice || 0))}
                  </Text>
                </View>
              )}

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setTradingStock(null)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={executeTrade}
                >
                  <Text style={styles.confirmButtonText}>
                    {tradeType === 'buy' ? 'Buy' : 'Sell'}
                  </Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        </View>
      </Modal>
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
  },
  summaryCard: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  summaryGradient: {
    padding: 20,
  },
  summaryHeader: {
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#e2e8f0',
    textAlign: 'center',
  },
  updateIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  updateText: {
    color: '#10b981',
    fontSize: 12,
    marginLeft: 6,
    fontWeight: '600',
  },
  lastUpdateText: {
    color: '#94a3b8',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
  },
  refreshButton: {
    backgroundColor: '#475569',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  refreshButtonText: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '600',
  },
  summaryRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#e2e8f0',
  },
  cashValue: {
    color: '#10b981',
  },
  holdingsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#e2e8f0',
    marginBottom: 16,
  },
  holdingCard: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  holdingGradient: {
    padding: 16,
  },
  holdingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  holdingSymbol: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#e2e8f0',
  },
  holdingName: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },
  holdingValue: {
    alignItems: 'flex-end',
  },
  holdingPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#e2e8f0',
  },
  holdingChange: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  holdingInfo: {
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#94a3b8',
  },
  infoValue: {
    fontSize: 14,
    color: '#e2e8f0',
    fontWeight: '600',
  },
  totalValue: {
    color: '#6366f1',
    fontWeight: 'bold',
  },
  tradeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tradeButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  buyButton: {
    backgroundColor: '#10b981',
  },
  sellButton: {
    backgroundColor: '#ef4444',
  },
  tradeButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
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
  exploreButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  exploreButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  bottomSpacer: {
    height: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalGradient: {
    padding: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#e2e8f0',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalLabel: {
    fontSize: 16,
    color: '#94a3b8',
  },
  modalValue: {
    fontSize: 16,
    color: '#e2e8f0',
    fontWeight: '600',
  },
  inputContainer: {
    marginTop: 20,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    color: '#e2e8f0',
    marginBottom: 8,
    fontWeight: '600',
  },
  tradeInput: {
    backgroundColor: '#475569',
    borderRadius: 8,
    padding: 16,
    color: '#e2e8f0',
    fontSize: 16,
  },
  tradePreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#475569',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  previewLabel: {
    fontSize: 16,
    color: '#94a3b8',
    fontWeight: '600',
  },
  previewValue: {
    fontSize: 16,
    color: '#10b981',
    fontWeight: 'bold',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#475569',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginRight: 8,
  },
  cancelButtonText: {
    color: '#e2e8f0',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#6366f1',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginLeft: 8,
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectorCard: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  sectorGradient: {
    padding: 20,
  },
  sectorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#475569',
  },
  sectorInfo: {
    flex: 1,
  },
  sectorName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#e2e8f0',
  },
  sectorSymbols: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  sectorValue: {
    alignItems: 'flex-end',
  },
  sectorAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#10b981',
  },
  sectorPercent: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  watchlistInfo: {
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
  },
  watchlistText: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

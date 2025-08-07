import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Alert,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  VictoryPie,
  VictoryChart,
  VictoryLine,
  VictoryAxis,
  VictoryTheme,
  VictoryTooltip,
  VictoryLabel,
} from 'victory-native';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  addDoc,
  setDoc,
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import yahooFinanceService from '../services/yahooFinanceService';

const screenWidth = Dimensions.get('window').width;

// Enhanced industry mapping with fallbacks for common stocks
const INDUSTRY_FALLBACKS = {
  AAPL: 'Consumer Electronics', TSLA: 'Automotive', MSFT: 'Software', 
  NVDA: 'Semiconductors', AMZN: 'E-commerce', GOOGL: 'Internet Services',
  META: 'Social Media', NFLX: 'Entertainment', AMD: 'Semiconductors',
  INTC: 'Semiconductors', CRM: 'Software', ADBE: 'Software',
  PYPL: 'Financial Technology', UBER: 'Transportation', SPOT: 'Entertainment',
  ZM: 'Software'
};

export default function PaperTrading() {
  const [portfolio, setPortfolio] = useState([]);
  const [cash, setCash] = useState(0);
  const [ticker, setTicker] = useState('');
  const [shares, setShares] = useState('');
  const [industryData, setIndustryData] = useState([]);
  const [valueHistory, setValueHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingStock, setEditingStock] = useState(null);
  const [editShares, setEditShares] = useState('');
  const [chartsEnabled, setChartsEnabled] = useState(true);

  // Disable charts on Android to prevent crashes
  useEffect(() => {
    if (Platform.OS === 'android') {
      setChartsEnabled(false);
      console.log('📱 Charts disabled on Android to prevent crashes');
    }
  }, []);

  const fetchPortfolio = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      let currentCash = 100000;
      if (userSnap.exists()) {
        currentCash = userSnap.data().cashBalance || 100000;
      }
      setCash(currentCash);

      const portfolioSnap = await getDocs(collection(db, 'users', user.uid, 'portfolio'));
      const data = portfolioSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setPortfolio(data);
      
      // Build industry data safely
      buildIndustryData(data);
      
      // Build value history safely
      await buildValueHistory(data, user.uid, currentCash);
    } catch (err) {
      console.error('Error fetching portfolio:', err);
      setError('Failed to fetch portfolio data. Please try again.');
      setPortfolio([]);
      setIndustryData([]);
      setValueHistory([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const buildIndustryData = (data) => {
    const industryMap = {};
    data.forEach(stock => {
      const industry = stock.industry || INDUSTRY_FALLBACKS[stock.symbol] || 'Other';
      if (industryMap[industry]) {
        industryMap[industry] += stock.shares * (stock.currentPrice || stock.averagePrice || 0);
      } else {
        industryMap[industry] = stock.shares * (stock.currentPrice || stock.averagePrice || 0);
      }
    });

    const industryArray = Object.entries(industryMap).map(([name, value]) => ({
      name,
      value: parseFloat(value.toFixed(2))
    })).filter(item => item.value > 0);

    setIndustryData(industryArray);
  };

  const buildValueHistory = async (data, userId, cashBalance) => {
    try {
      let totalValue = cashBalance;
      
      // Get real-time prices for portfolio stocks
      if (data.length > 0) {
        const symbols = data.map(stock => stock.symbol);
        try {
          const quotes = await yahooFinanceService.getMultipleQuotes(symbols, userId, data.length);
          
          data.forEach(stock => {
            const quote = quotes.find(q => q.symbol === stock.symbol);
            if (quote && quote.price) {
              totalValue += stock.shares * quote.price;
            } else {
              // Fallback to stored price
              totalValue += stock.shares * (stock.currentPrice || stock.averagePrice || 0);
            }
          });
        } catch (error) {
          console.error('Error fetching real-time prices:', error);
          // Use stored prices as fallback
          data.forEach(stock => {
            totalValue += stock.shares * (stock.currentPrice || stock.averagePrice || 0);
          });
        }
      }

      const today = new Date();
      const newHistoryEntry = {
        date: today.toISOString().split('T')[0],
        value: parseFloat(totalValue.toFixed(2))
      };

      setValueHistory(prev => {
        const filtered = prev.filter(entry => entry.date !== newHistoryEntry.date);
        return [...filtered, newHistoryEntry].sort((a, b) => new Date(a.date) - new Date(b.date));
      });
    } catch (error) {
      console.error('Error building value history:', error);
    }
  };

  const fetchStockPrice = async (ticker) => {
    try {
      const upperTicker = ticker.toUpperCase();
      const quote = await yahooFinanceService.getStockQuote(upperTicker, auth.currentUser?.uid, portfolio.length);
      return quote.price;
    } catch (error) {
      console.error('Error fetching stock price:', error);
      // Return a reasonable fallback price
      return 100;
    }
  };

  const buyStock = async () => {
    if (!ticker.trim() || !shares.trim()) {
      Alert.alert('Error', 'Please enter both ticker and shares');
      return;
    }

    const sharesNum = parseFloat(shares);
    if (isNaN(sharesNum) || sharesNum <= 0) {
      Alert.alert('Error', 'Please enter a valid number of shares');
      return;
    }

    const upperTicker = ticker.toUpperCase();
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    try {
      setLoading(true);

      // Fetch real stock data including sector and industry
      const stockOverview = await yahooFinanceService.getStockOverview(upperTicker, user.uid, portfolio.length);
      const price = await fetchStockPrice(upperTicker);
      
      const totalCost = sharesNum * price;
      
      if (totalCost > cash) {
        Alert.alert('Error', 'Insufficient funds');
        return;
      }

      // Check if stock already exists in portfolio
      const existingStock = portfolio.find(stock => stock.symbol === upperTicker);
      
      if (existingStock) {
        // Update existing stock
        const newShares = existingStock.shares + sharesNum;
        const newTotalCost = existingStock.totalCost + totalCost;
        const newAveragePrice = newTotalCost / newShares;

        await updateDoc(doc(db, 'users', user.uid, 'portfolio', existingStock.id), {
          shares: newShares,
          totalCost: newTotalCost,
          averagePrice: newAveragePrice,
          lastUpdated: new Date()
        });

        // Update cash balance
        await updateDoc(doc(db, 'users', user.uid), {
          cashBalance: cash - totalCost
        });

        setCash(cash - totalCost);
        setPortfolio(prev => prev.map(stock => 
          stock.id === existingStock.id 
            ? { ...stock, shares: newShares, totalCost: newTotalCost, averagePrice: newAveragePrice }
            : stock
        ));
      } else {
        // Add new stock
        const newStock = {
          symbol: upperTicker,
          shares: sharesNum,
          averagePrice: price,
          totalCost: totalCost,
          sector: stockOverview.sector || 'Technology',
          industry: stockOverview.industry || INDUSTRY_FALLBACKS[upperTicker] || 'Other',
          datePurchased: new Date(),
          lastUpdated: new Date()
        };

        const docRef = await addDoc(collection(db, 'users', user.uid, 'portfolio'), newStock);
        
        // Update cash balance
        await updateDoc(doc(db, 'users', user.uid), {
          cashBalance: cash - totalCost
        });

        setCash(cash - totalCost);
        setPortfolio(prev => [...prev, { id: docRef.id, ...newStock }]);
      }

      setTicker('');
      setShares('');
      Alert.alert('Success', `Bought ${sharesNum} shares of ${upperTicker} at $${price.toFixed(2)}`);
      
      // Refresh portfolio data
      buildIndustryData(portfolio);
      await buildValueHistory(portfolio, user.uid, cash - totalCost);
    } catch (error) {
      console.error('Error buying stock:', error);
      Alert.alert('Error', 'Failed to buy stock. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateStockShares = async (stock, newShares) => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Error', 'Please log in to trade');
      return;
    }

    try {
      const shareDiff = newShares - stock.shares;
      const price = await fetchStockPrice(stock.symbol);
      const costDiff = shareDiff * price;

      if (shareDiff > 0 && costDiff > cash) {
        Alert.alert('Error', 'Insufficient funds to buy more shares');
        return;
      }

      const newTotalCost = stock.totalCost + costDiff;
      const newAveragePrice = newShares > 0 ? newTotalCost / newShares : stock.averagePrice;

      await updateDoc(doc(db, 'users', user.uid, 'portfolio', stock.id), {
        shares: newShares,
        totalCost: newTotalCost,
        averagePrice: newAveragePrice,
        lastUpdated: new Date()
      });

      // Update cash balance
      await updateDoc(doc(db, 'users', user.uid), {
        cashBalance: cash - costDiff
      });

      setCash(cash - costDiff);
      setEditingStock(null);
      setEditShares('');
      fetchPortfolio();
      
      if (shareDiff > 0) {
        Alert.alert('Success', `Bought ${shareDiff} more shares of ${stock.symbol}`);
      } else if (shareDiff < 0) {
        Alert.alert('Success', `Sold ${Math.abs(shareDiff)} shares of ${stock.symbol}`);
      }
    } catch (error) {
      console.error('Error updating stock shares:', error);
      Alert.alert('Error', 'Failed to update shares. Please try again.');
    }
  };

  const sellStock = async (stock) => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Error', 'Please log in to trade');
      return;
    }

    try {
      const price = await fetchStockPrice(stock.symbol);
      const totalValue = stock.shares * price;
      const profit = totalValue - stock.totalCost;

      // Delete stock from portfolio
      await deleteDoc(doc(db, 'users', user.uid, 'portfolio', stock.id));

      // Update cash balance
      await updateDoc(doc(db, 'users', user.uid), {
        cashBalance: cash + totalValue
      });

      setCash(cash + totalValue);
      fetchPortfolio();
      
      Alert.alert('Success', `Sold ${stock.shares} shares of ${stock.symbol} for $${totalValue.toFixed(2)} (${profit >= 0 ? '+' : ''}${profit.toFixed(2)} profit)`);
    } catch (error) {
      console.error('Error selling stock:', error);
      Alert.alert('Error', 'Failed to sell stock. Please try again.');
    }
  };

  const renderPortfolioItem = ({ item }) => (
    <View style={styles.portfolioItem}>
      <View style={styles.stockInfo}>
        <Text style={styles.symbol}>{item.symbol}</Text>
        <Text style={styles.shares}>{item.shares} shares</Text>
        <Text style={styles.avgPrice}>Avg: ${item.averagePrice?.toFixed(2) || '0.00'}</Text>
      </View>
      <View style={styles.priceInfo}>
        <Text style={styles.currentValue}>
          ${(item.shares * (item.currentPrice || item.averagePrice || 100)).toFixed(2)}
        </Text>
        <Text style={styles.totalValue}>
          Total: ${item.totalCost?.toFixed(2) || '0.00'}
        </Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => {
            setEditingStock(item);
            setEditShares(item.shares.toString());
          }}
        >
          <Ionicons name="pencil" size={16} color="#6366f1" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.sellButton}
          onPress={() => sellStock(item)}
        >
          <Ionicons name="close-circle" size={16} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderCharts = () => {
    if (!chartsEnabled) {
      return (
        <View style={styles.chartsContainer}>
          <Text style={styles.chartTitle}>Portfolio Overview</Text>
          <View style={styles.fallbackContainer}>
            <Ionicons name="bar-chart" size={48} color="#6366f1" />
            <Text style={styles.fallbackLabel}>Charts Disabled</Text>
            <Text style={styles.fallbackValue}>
              Charts are temporarily disabled on this device for better performance.
            </Text>
            <Text style={styles.fallbackValue}>
              Portfolio value: ${portfolio.reduce((total, item) => 
                total + (item.shares * (item.currentPrice || item.averagePrice || 0)), 0).toFixed(2)
              }
            </Text>
          </View>
        </View>
      );
    }

    try {
      return (
        <View style={styles.chartsContainer}>
          <Text style={styles.chartTitle}>Portfolio Allocation</Text>
          {industryData.length > 0 ? (
            <View style={styles.chartWrapper}>
              <VictoryPie
                data={industryData}
                x="name"
                y="value"
                colorScale="qualitative"
                width={screenWidth - 40}
                height={200}
                padding={50}
                labels={({ datum }) => `${datum.name}\n$${datum.value.toFixed(0)}`}
                labelRadius={({ radius }) => radius - 30}
                style={{
                  labels: { fontSize: 10, fill: '#ffffff' }
                }}
              />
            </View>
          ) : (
            <Text style={styles.noDataText}>No portfolio data to display</Text>
          )}

          <Text style={styles.chartTitle}>Portfolio Value History</Text>
          {valueHistory.length > 1 ? (
            <View style={styles.chartWrapper}>
              <VictoryChart
                width={screenWidth - 40}
                height={200}
                padding={{ top: 20, bottom: 40, left: 60, right: 40 }}
                theme={VictoryTheme.material}
              >
                <VictoryAxis
                  dependentAxis
                  tickFormat={(t) => `$${(t / 1000).toFixed(0)}k`}
                  style={{
                    axis: { stroke: '#ffffff' },
                    tickLabels: { fill: '#ffffff', fontSize: 10 }
                  }}
                />
                <VictoryAxis
                  style={{
                    axis: { stroke: '#ffffff' },
                    tickLabels: { fill: '#ffffff', fontSize: 10 }
                  }}
                />
                <VictoryLine
                  data={valueHistory}
                  x="date"
                  y="value"
                  style={{
                    data: { stroke: '#10b981', strokeWidth: 3 },
                  }}
                />
              </VictoryChart>
            </View>
          ) : (
            <Text style={styles.noDataText}>No value history to display</Text>
          )}
        </View>
      );
    } catch (error) {
      console.error('Error rendering charts:', error);
      return (
        <View style={styles.chartsContainer}>
          <Text style={styles.chartTitle}>Portfolio Overview</Text>
          <View style={styles.fallbackContainer}>
            <Ionicons name="alert-circle" size={48} color="#f59e0b" />
            <Text style={styles.fallbackLabel}>Charts Unavailable</Text>
            <Text style={styles.fallbackValue}>
              Charts are temporarily unavailable. Please try again later.
            </Text>
            <Text style={styles.fallbackValue}>
              Portfolio value: ${portfolio.reduce((total, item) => 
                total + (item.shares * (item.currentPrice || item.averagePrice || 0)), 0).toFixed(2)
              }
            </Text>
          </View>
        </View>
      );
    }
  };

  useEffect(() => {
    fetchPortfolio();
    
    // Refresh portfolio data every 5 minutes
    const interval = setInterval(() => {
      console.log('🔄 Refreshing portfolio data...');
      fetchPortfolio();
    }, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [fetchPortfolio]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading portfolio...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <Button 
          title="Retry" 
          onPress={() => {
            setError(null);
            fetchPortfolio();
          }} 
          color="#6366f1"
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Paper Trading</Text>
          <Text style={styles.cash}>Cash: ${cash.toFixed(2)}</Text>
        </View>

      <View style={styles.buySection}>
        <Text style={styles.sectionTitle}>Buy Stock</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Ticker (e.g., AAPL)"
            value={ticker}
            onChangeText={setTicker}
            placeholderTextColor="#94a3b8"
          />
          <TextInput
            style={styles.input}
            placeholder="Shares"
            value={shares}
            onChangeText={setShares}
            keyboardType="numeric"
            placeholderTextColor="#94a3b8"
          />
        </View>
        <Button title="Buy" onPress={buyStock} color="#10b981" />
      </View>

      <View style={styles.portfolioSection}>
        <Text style={styles.sectionTitle}>Portfolio</Text>
        {portfolio.length === 0 ? (
          <Text style={styles.emptyText}>No stocks in portfolio</Text>
        ) : (
          <View style={styles.portfolioList}>
            {portfolio.map((item, index) => renderPortfolioItem({ item }))}
          </View>
        )}
      </View>

      {/* Charts */}
      {renderCharts()}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
  loadingText: {
    color: '#e2e8f0',
    fontSize: 18,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    padding: 20,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  cash: {
    fontSize: 18,
    color: '#10b981',
    fontWeight: '600',
  },
  buySection: {
    backgroundColor: '#1e293b',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#334155',
    color: '#ffffff',
    padding: 12,
    borderRadius: 8,
    marginRight: 8,
  },
  portfolioSection: {
    backgroundColor: '#1e293b',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  emptyText: {
    color: '#94a3b8',
    textAlign: 'center',
    fontSize: 16,
  },
  portfolioList: {
    width: '100%',
  },
  portfolioItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  stockInfo: {
    flex: 1,
  },
  symbol: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  shares: {
    fontSize: 14,
    color: '#94a3b8',
  },
  avgPrice: {
    fontSize: 12,
    color: '#64748b',
  },
  priceInfo: {
    alignItems: 'flex-end',
    marginRight: 12,
  },
  currentValue: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 12,
    color: '#94a3b8',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editButton: {
    padding: 8,
    backgroundColor: '#1e293b',
    borderRadius: 6,
  },
  sellButton: {
    padding: 8,
    backgroundColor: '#1e293b',
    borderRadius: 6,
  },
  editContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editInput: {
    backgroundColor: '#334155',
    color: '#ffffff',
    padding: 8,
    borderRadius: 6,
    width: 80,
    textAlign: 'center',
  },
  saveButton: {
    padding: 8,
    backgroundColor: '#065f46',
    borderRadius: 6,
  },
  cancelButton: {
    padding: 8,
    backgroundColor: '#7f1d1d',
    borderRadius: 6,
  },
  chartSection: {
    backgroundColor: '#1e293b',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  fallbackContainer: {
    width: '100%',
    padding: 20,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  fallbackLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 10,
    marginBottom: 8,
  },
  fallbackValue: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 4,
  },
  chartsContainer: {
    marginTop: 20,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 10,
    textAlign: 'center',
  },
  chartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  noDataText: {
    color: '#94a3b8',
    fontSize: 16,
    textAlign: 'center',
  },
});

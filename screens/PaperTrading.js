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
} from 'react-native';
import { Platform } from 'react-native';
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

// Fallback mock ticker list with realistic prices
const MOCK_TICKERS = {
  AAPL: 190, TSLA: 270, MSFT: 310, NVDA: 500, AMZN: 140,
  GOOGL: 2800, META: 350, NFLX: 450, AMD: 120, INTC: 45,
  CRM: 220, ADBE: 550, PYPL: 60, UBER: 45, SPOT: 180, ZM: 70
};

// Industry mapping for better categorization
const INDUSTRY_MAP = {
  AAPL: 'Technology', TSLA: 'Automotive', MSFT: 'Technology', 
  NVDA: 'Technology', AMZN: 'E-commerce', GOOGL: 'Technology',
  META: 'Technology', NFLX: 'Entertainment', AMD: 'Technology',
  INTC: 'Technology', CRM: 'Software', ADBE: 'Software',
  PYPL: 'Financial', UBER: 'Transportation', SPOT: 'Entertainment',
  ZM: 'Technology'
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
    try {
      const industryCount = {};
      let totalValue = 0;

      data.forEach((stock) => {
        if (stock.shares > 0) { // Only include stocks with shares > 0
          const industry = INDUSTRY_MAP[stock.symbol] || 'Other';
          const value = stock.shares * (MOCK_TICKERS[stock.symbol] || 100);
          industryCount[industry] = (industryCount[industry] || 0) + value;
          totalValue += value;
        }
      });

      const industryData = Object.entries(industryCount).map(([industry, value]) => ({
        x: industry,
        y: totalValue > 0 ? (value / totalValue) * 100 : 0
      }));

      setIndustryData(industryData);
    } catch (error) {
      console.error('Error building industry data:', error);
      setIndustryData([]);
    }
  };

  const buildValueHistory = async (data, userId, cashBalance) => {
    try {
      const MAX_HISTORY = 30;
      let totalValue = cashBalance;

      data.forEach((stock) => {
        if (stock.shares > 0) { // Only include stocks with shares > 0
          totalValue += stock.shares * (MOCK_TICKERS[stock.symbol] || 100);
        }
      });

      const historyEntry = {
        timestamp: Date.now(),
        totalValue: totalValue
      };

      // Get existing history
      const historySnap = await getDocs(collection(db, 'users', userId, 'valueHistory'));
      let history = historySnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Add new entry
      history.push(historyEntry);
      
      // Keep only last MAX_HISTORY entries
      if (history.length > MAX_HISTORY) {
        const toDelete = history.slice(0, history.length - MAX_HISTORY);
        for (const entry of toDelete) {
          if (entry.id) {
            await deleteDoc(doc(db, 'users', userId, 'valueHistory', entry.id));
          }
        }
        history = history.slice(-MAX_HISTORY);
      }

      // Save new entry
      await addDoc(collection(db, 'users', userId, 'valueHistory'), historyEntry);
      
      setValueHistory(history);
    } catch (error) {
      console.error('Error building value history:', error);
      setValueHistory([]);
    }
  };

  const fetchStockPrice = async (ticker) => {
    const user = auth.currentUser;
    const userId = user?.uid || 'anonymous';
    
    try {
      // Try to get real price from Yahoo Finance with smart rate limiting
      const quote = await yahooFinanceService.getStockQuote(ticker.toUpperCase(), userId, portfolio.length);
      return quote.price;
    } catch (error) {
      console.log(`Using mock price for ${ticker}: ${error.message}`);
      // Fallback to mock price
      const upperTicker = ticker.toUpperCase();
      return MOCK_TICKERS[upperTicker] || 100;
    }
  };

  const buyStock = async () => {
    if (!ticker || !shares) {
      Alert.alert('Error', 'Please enter both ticker and shares');
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Error', 'Please log in to trade');
      return;
    }

    try {
      const upperTicker = ticker.toUpperCase();
      const shareCount = parseInt(shares);
      const price = await fetchStockPrice(upperTicker);
      const totalCost = shareCount * price;

      if (totalCost > cash) {
        Alert.alert('Error', 'Insufficient funds');
        return;
      }

      // Check if stock already exists in portfolio
      const existingStock = portfolio.find(stock => stock.symbol === upperTicker);
      
      if (existingStock) {
        // Update existing stock
        const newShares = existingStock.shares + shareCount;
        const newTotalCost = existingStock.totalCost + totalCost;
        const newAveragePrice = newTotalCost / newShares;
        
        await updateDoc(doc(db, 'users', user.uid, 'portfolio', existingStock.id), {
          shares: newShares,
          totalCost: newTotalCost,
          averagePrice: newAveragePrice,
          lastUpdated: new Date()
        });
      } else {
        // Add new stock
        const stockData = {
          symbol: upperTicker,
          shares: shareCount,
          averagePrice: price,
          totalCost: totalCost,
          industry: INDUSTRY_MAP[upperTicker] || 'Other',
          datePurchased: new Date(),
          lastUpdated: new Date()
        };
        
        await addDoc(collection(db, 'users', user.uid, 'portfolio'), stockData);
      }

      // Update cash balance
      await updateDoc(doc(db, 'users', user.uid), {
        cashBalance: cash - totalCost
      });

      setCash(cash - totalCost);
      setTicker('');
      setShares('');
      fetchPortfolio();
      
      Alert.alert('Success', `Bought ${shareCount} shares of ${upperTicker} at $${price}`);
    } catch (error) {
      console.error('Error buying stock:', error);
      Alert.alert('Error', 'Failed to buy stock. Please try again.');
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
        <Text style={styles.shares}>{item.shares} shares @ ${item.averagePrice?.toFixed(2)}</Text>
        <Text style={styles.industry}>{item.industry}</Text>
      </View>
      <View style={styles.priceInfo}>
        <Text style={styles.currentValue}>
          ${(item.shares * (MOCK_TICKERS[item.symbol] || 100)).toFixed(2)}
        </Text>
        <Text style={styles.totalValue}>
          Total: ${item.totalCost?.toFixed(2)}
        </Text>
      </View>
      <View style={styles.actionButtons}>
        {editingStock?.id === item.id ? (
          <View style={styles.editContainer}>
            <TextInput
              style={styles.editInput}
              value={editShares}
              onChangeText={setEditShares}
              keyboardType="numeric"
              placeholder="Shares"
              placeholderTextColor="#94a3b8"
            />
            <TouchableOpacity
              style={styles.saveButton}
              onPress={() => updateStockShares(item, parseInt(editShares) || 0)}
            >
              <Ionicons name="checkmark" size={16} color="#10b981" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setEditingStock(null);
                setEditShares('');
              }}
            >
              <Ionicons name="close" size={16} color="#ef4444" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.buttonContainer}>
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
              <Ionicons name="trash" size={16} color="#ef4444" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );

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
      {industryData.length > 0 && (
        <View style={styles.chartSection}>
          <Text style={styles.sectionTitle}>Portfolio by Industry</Text>
          <View style={styles.chartContainer}>
            <VictoryPie
              data={industryData}
              colorScale="qualitative"
              width={300}
              height={300}
              theme={VictoryTheme.material}
              style={{
                labels: {
                  fill: '#ffffff',
                  fontSize: 12,
                  fontWeight: 'bold',
                },
              }}
              labelComponent={
                <VictoryTooltip
                  style={{ fill: '#ffffff' }}
                  flyoutStyle={{
                    stroke: '#1e293b',
                    fill: '#1e293b',
                  }}
                />
              }
            />
          </View>
        </View>
      )}

      {valueHistory.length > 0 && (
        <View style={styles.chartSection}>
          <Text style={styles.sectionTitle}>Portfolio Value History</Text>
          <View style={styles.chartContainer}>
            <VictoryChart
              width={350}
              height={250}
              theme={VictoryTheme.material}
              style={{
                background: { fill: '#1e293b' },
              }}
            >
              <VictoryAxis
                dependentAxis
                style={{
                  axis: { stroke: '#64748b' },
                  grid: { stroke: '#334155' },
                  tickLabels: { fill: '#e2e8f0', fontSize: 10 },
                }}
                tickFormat={(t) => `$${(t / 1000).toFixed(0)}k`}
              />
              <VictoryAxis
                style={{
                  axis: { stroke: '#64748b' },
                  tickLabels: { fill: '#e2e8f0', fontSize: 10 },
                }}
                tickFormat={(t) => new Date(t).toLocaleDateString()}
              />
              <VictoryLine
                data={valueHistory}
                x="timestamp"
                y="totalValue"
                style={{
                  data: { stroke: '#10b981', strokeWidth: 3 },
                }}
                animate={{
                  duration: 1000,
                  onLoad: { duration: 500 },
                }}
              />
            </VictoryChart>
          </View>
        </View>
      )}
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
  industry: {
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
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
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
  },
  fallbackItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  fallbackLabel: {
    color: '#e2e8f0',
    fontSize: 14,
    flex: 1,
  },
  fallbackValue: {
    color: '#10b981',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

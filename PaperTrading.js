import React, { useEffect, useState, useCallback } from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  StyleSheet,
  Alert,
  Dimensions
} from 'react-native';

import { PieChart, LineChart } from 'react-native-chart-kit';
import {
  collection, doc, getDoc, getDocs, deleteDoc,
  updateDoc, addDoc, setDoc
} from 'firebase/firestore';
import { db, auth } from './firebase';

const screenWidth = Dimensions.get('window').width;

// ✅ Whitelisted tickers and mock prices
const MOCK_TICKERS = {
  AAPL: 190, TSLA: 270, MSFT: 310, NVDA: 500, AMZN: 140
};

export default function PaperTrading() {
  const [portfolio, setPortfolio] = useState([]);
  const [cash, setCash] = useState(0);
  const [ticker, setTicker] = useState('');
  const [shares, setShares] = useState('');
  const [industryData, setIndustryData] = useState([]);
  const [valueHistory, setValueHistory] = useState([]);

  const fetchPortfolio = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      let currentCash = 100000;
      if (userSnap.exists()) {
        currentCash = userSnap.data().cashBalance || 100000;
      }

      setCash(currentCash);

      const portfolioSnap = await getDocs(collection(db, 'users', user.uid, 'portfolio'));
      const data = portfolioSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPortfolio(data);
      buildIndustryData(data);
      await buildValueHistory(data, user.uid, currentCash);
    } catch (err) {
      Alert.alert('Error', 'Failed to fetch portfolio data.');
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);

  const buildIndustryData = (data) => {
    const industryMap = {};
    let total = 0;

    data.forEach(stock => {
      const value = (stock.shares || 0) * (stock.buyPrice || 0);
      const industry = stock.industry || 'Other';
      industryMap[industry] = (industryMap[industry] || 0) + value;
      total += value;
    });

    const colors = ['#60a5fa', '#34d399', '#f87171', '#fbbf24', '#a78bfa', '#f472b6', '#4ade80'];
    const chartData = Object.entries(industryMap).map(([industry, value], i) => ({
      name: industry,
      population: total ? (value / total) * 100 : 0,
      color: colors[i % colors.length],
      legendFontColor: '#fff',
      legendFontSize: 12,
    }));

    setIndustryData(chartData);
  };

  const buildValueHistory = async (data, userId, cashBalance) => {
    try {
      const totalValue = cashBalance + data.reduce((sum, stock) =>
        sum + (stock.shares || 0) * (stock.buyPrice || 0), 0
      );

      await addDoc(collection(db, 'users', userId, 'valueHistory'), {
        timestamp: new Date().toISOString(),
        totalValue,
      });

      const historySnap = await getDocs(collection(db, 'users', userId, 'valueHistory'));
      const sortedHistory = historySnap.docs
        .map(doc => doc.data())
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      setValueHistory(sortedHistory);
    } catch (err) {
      console.error('Error building value history:', err);
    }
  };

  const fetchMockPrice = async (ticker) => {
    return MOCK_TICKERS[ticker.toUpperCase()] || null;
  };

  const buyStock = async () => {
    const user = auth.currentUser;
    const trimmedTicker = ticker.trim().toUpperCase();

    if (!user || !trimmedTicker || !shares) {
      Alert.alert('Error', 'Please fill out all fields.');
      return;
    }

    const price = await fetchMockPrice(trimmedTicker);
    if (!price) {
      Alert.alert('Error', 'Invalid ticker. Try: AAPL, TSLA, MSFT, NVDA, AMZN');
      return;
    }

    const sharesInt = parseInt(shares, 10);
    if (!Number.isInteger(sharesInt) || sharesInt <= 0) {
      Alert.alert('Error', 'Please enter a valid number of shares');
      return;
    }

    const cost = price * sharesInt;
    if (cost > cash) {
      Alert.alert('Error', 'Not enough cash to buy shares');
      return;
    }

    try {
      const userDocRef = doc(db, 'users', user.uid);
      await addDoc(collection(db, 'users', user.uid, 'portfolio'), {
        ticker: trimmedTicker,
        shares: sharesInt,
        buyPrice: price,
        timestamp: new Date(),
        industry: 'Technology',
      });

      await updateDoc(userDocRef, { cashBalance: cash - cost });
      setTicker('');
      setShares('');
      fetchPortfolio();
    } catch (err) {
      Alert.alert('Error', 'Error buying stock.');
      console.error(err);
    }
  };

  const sellStock = async (stock) => {
    const user = auth.currentUser;
    if (!user || !stock?.id) return;

    const value = stock.shares * (stock.buyPrice || 0);

    try {
      const userDocRef = doc(db, 'users', user.uid);
      await deleteDoc(doc(db, 'users', user.uid, 'portfolio', stock.id));
      await updateDoc(userDocRef, { cashBalance: cash + value });

      fetchPortfolio();
    } catch (err) {
      console.error('Error selling stock:', err);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Cash: ${cash.toFixed(2)}</Text>

      <FlatList
        data={portfolio}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.holding}>
            <Text style={{ color: 'white' }}>
              {item.shares}x {item.ticker} @ ${item.buyPrice}
            </Text>
            <Button title="Sell" onPress={() => sellStock(item)} />
          </View>
        )}
      />

      <TextInput
        placeholder="Ticker (e.g. AAPL)"
        value={ticker}
        onChangeText={setTicker}
        style={styles.input}
      />
      <TextInput
        placeholder="Shares"
        value={shares}
        onChangeText={setShares}
        keyboardType="numeric"
        style={styles.input}
      />
      <Button title="Buy" onPress={buyStock} />

      <Text style={styles.chartHeader}>Industry Allocation</Text>
      {industryData.length > 0 && (
        <PieChart
          data={industryData}
          width={screenWidth - 32}
          height={220}
          chartConfig={chartConfig}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="16"
          absolute
        />
      )}

      <Text style={styles.chartHeader}>Portfolio Value Over Time</Text>
      {valueHistory.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <LineChart
            data={{
              labels: valueHistory.map(entry =>
                new Date(entry.timestamp).toLocaleDateString()
              ),
              datasets: [{ data: valueHistory.map(entry => entry.totalValue) }],
            }}
            width={Math.max(screenWidth, valueHistory.length * 60)}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={{ borderRadius: 16, marginVertical: 8 }}
          />
        </ScrollView>
      )}
    </ScrollView>
  );
}

const chartConfig = {
  backgroundGradientFrom: '#1e293b',
  backgroundGradientTo: '#1e293b',
  decimalPlaces: 2,
  color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
  propsForDots: {
    r: '4',
    strokeWidth: '2',
    stroke: '#6366f1',
  },
};

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#0f172a' },
  header: { fontSize: 18, fontWeight: 'bold', color: 'white', marginBottom: 12 },
  holding: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 8,
    marginVertical: 4,
    borderRadius: 8,
    backgroundColor: '#1e293b',
  },
  input: {
    backgroundColor: '#fff',
    padding: 10,
    marginVertical: 8,
    borderRadius: 6,
  },
  chartHeader: {
    color: 'white',
    marginTop: 20,
    marginBottom: 10,
    fontSize: 16,
    fontWeight: '600',
  },
});

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TextInput, Button, FlatList, StyleSheet, Alert, Dimensions } from 'react-native';
import { PieChart, LineChart } from 'react-native-chart-kit';
import { collection, doc, getDoc, getDocs, deleteDoc, updateDoc, addDoc } from 'firebase/firestore';
import { db, auth } from './firebase';

const screenWidth = Dimensions.get('window').width;

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
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      setCash(userDoc.data()?.cashBalance || 10000);

      const portfolioSnap = await getDocs(collection(db, 'users', user.uid, 'portfolio'));
      const data = portfolioSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPortfolio(data);
      buildIndustryData(data);
      buildValueHistory(data);
    } catch (err) {
      console.error('Failed to fetch portfolio:', err);
    }
   }, []);

  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);

  const buildIndustryData = (data) => {
    const industryMap = {};
    let total = 0;
    data.forEach((stock) => {
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

  const buildValueHistory = (data) => {
    const history = data.map(stock => (stock.shares || 0) * (stock.buyPrice || 0));
    setValueHistory(history);
  };

  const fetchMockPrice = async (ticker) => {
    const mockPrices = { AAPL: 180, TSLA: 270, MSFT: 310 };
    return mockPrices[ticker.toUpperCase()] || 100;
  };

  const buyStock = async () => {
    const user = auth.currentUser;
    if (!user || !ticker || !shares) return;

    const price = await fetchMockPrice(ticker);
    const cost = price * parseInt(shares);
    if (cost > cash) return Alert.alert('Error', 'Not enough cash');

    try {
      await addDoc(collection(db, 'users', user.uid, 'portfolio'), {
        ticker: ticker.toUpperCase(),
        shares: parseInt(shares),
        buyPrice: price,
        timestamp: new Date(),
        industry: 'Technology', // Default placeholder
      });

      await updateDoc(doc(db, 'users', user.uid), {
        cashBalance: cash - cost,
      });

      setTicker('');
      setShares('');
      fetchPortfolio();
    } catch (err) {
      console.error('Error buying stock:', err);
    }
  };

  const sellStock = async (stock) => {
    const user = auth.currentUser;
    if (!user || !stock?.id) return;

    const currentVal = (stock.shares || 0) * (stock.buyPrice || 0);

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        cashBalance: cash + currentVal,
      });

      await deleteDoc(doc(db, 'users', user.uid, 'portfolio', stock.id));

      fetchPortfolio();
    } catch (err) {
      console.error('Error selling stock:', err);
    }
  };

  return (
    <View style={styles.container}>
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

      <TextInput placeholder="Ticker" value={ticker} onChangeText={setTicker} style={styles.input} />
      <TextInput placeholder="Shares" value={shares} onChangeText={setShares} keyboardType="numeric" style={styles.input} />
      <Button title="Buy" onPress={buyStock} />

      <Text style={styles.chartHeader}>Industry Allocation</Text>
      {industryData.length > 0 && (
        <PieChart
          data={industryData}
          width={screenWidth - 20}
          height={220}
          chartConfig={chartConfig}
          accessor={'population'}
          backgroundColor={'transparent'}
          paddingLeft={'10'}
          absolute
        />
      )}

      <Text style={styles.chartHeader}>Portfolio Value Over Time</Text>
      {valueHistory.length > 0 && (
        <LineChart
          data={{
            labels: valueHistory.map((_, i) => `#${i + 1}`),
            datasets: [{ data: valueHistory }],
          }}
          width={screenWidth - 20}
          height={220}
          chartConfig={chartConfig}
          bezier
        />
      )}
    </View>
  );
}

const chartConfig = {
  backgroundGradientFrom: '#1e293b',
  backgroundGradientTo: '#1e293b',
  color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
  labelColor: () => '#fff',
  propsForDots: {
    r: '4',
    strokeWidth: '2',
    stroke: '#6366f1',
  },
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#0f172a' },
  header: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, color: 'white' },
  holding: {
    marginVertical: 4,
    backgroundColor: '#1e293b',
    padding: 8,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  input: { backgroundColor: '#fff', padding: 8, marginVertical: 6, borderRadius: 4 },
  chartHeader: { color: 'white', marginTop: 20, marginBottom: 8, fontSize: 16, fontWeight: 'bold' },
});

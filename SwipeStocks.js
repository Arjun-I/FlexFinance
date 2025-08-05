// SWIPESTOCKS.JS
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Image,
  Animated,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db, auth } from './firebase';
import { LineChart } from 'react-native-svg-charts';
import * as shape from 'd3-shape';

const { width } = Dimensions.get('window');

const dummyStocks = [
  {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    price: '$191.83',
    change: '+1.02%',
    logo: 'https://logo.clearbit.com/apple.com',
  },
  {
    symbol: 'GOOGL',
    name: 'Alphabet Inc.',
    price: '$128.12',
    change: '-0.54%',
    logo: 'https://logo.clearbit.com/google.com',
  },
  {
    symbol: 'TSLA',
    name: 'Tesla Inc.',
    price: '$709.74',
    change: '+2.03%',
    logo: 'https://logo.clearbit.com/tesla.com',
  },
];

const getAlphaVantageUrl = (symbol, timeframe) => {
  const interval = timeframe === '1D' ? '5min' : 'daily';
  const func = timeframe === '1D' ? 'TIME_SERIES_INTRADAY' : 'TIME_SERIES_DAILY';
  return `https://www.alphavantage.co/query?function=${func}&symbol=${symbol}&apikey=${process.env.EXPO_PUBLIC_ALPHA_VANTAGE_KEY}${interval === '5min' ? '&interval=5min' : ''}`;
};


const parseTimeSeriesData = (data, timeframe) => {
  const timeSeries = data['Time Series (Daily)'] || data['Time Series (5min)'];
  if (!timeSeries) return null;
  const prices = [];
  for (let key in timeSeries) {
    prices.push(parseFloat(timeSeries[key]['4. close']));
    if (prices.length >= 10) break;
  }
  return prices.reverse();
};

const addLikedStock = async (stock) => {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  const userDocRef = doc(db, 'users', uid);
  await updateDoc(userDocRef, {
    likedStocks: arrayUnion(stock),
  });
};

export default function SwipeStocks() {
  const [index, setIndex] = useState(0);
  const [timeframe, setTimeframe] = useState('1M');
  const [chartData, setChartData] = useState(null);
  const position = useRef(new Animated.ValueXY()).current;

  useEffect(() => {
    const fetchChartData = async () => {
      const stock = dummyStocks[index];
      if (!stock) return;
      try {
        const res = await fetch(getAlphaVantageUrl(stock.symbol, timeframe));
        const data = await res.json();
        const parsed = parseTimeSeriesData(data, timeframe);
        setChartData(parsed);
      } catch (err) {
        console.error('Error fetching chart:', err);
      }
    };
    fetchChartData();
  }, [index, timeframe]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        position.setValue({ x: gesture.dx, y: gesture.dy });
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > 120) {
          Animated.timing(position, {
            toValue: { x: 500, y: gesture.dy },
            duration: 300,
            useNativeDriver: false,
          }).start(() => {
            addLikedStock(dummyStocks[index]);
            setIndex((prev) => prev + 1);
            position.setValue({ x: 0, y: 0 });
          });
        } else if (gesture.dx < -120) {
          Animated.timing(position, {
            toValue: { x: -500, y: gesture.dy },
            duration: 300,
            useNativeDriver: false,
          }).start(() => {
            setIndex((prev) => prev + 1);
            position.setValue({ x: 0, y: 0 });
          });
        } else {
          Animated.spring(position, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  const renderCard = (stock) => (
    <Animated.View
      {...panResponder.panHandlers}
      style={[styles.card, { transform: position.getTranslateTransform() }]}
    >
      <Image source={{ uri: stock.logo }} style={styles.logo} />
      <Text style={styles.symbol}>{stock.symbol}</Text>
      <Text style={styles.name}>{stock.name}</Text>
      <Text style={styles.price}>{stock.price}</Text>
      <Text style={[styles.change, { color: stock.change.startsWith('+') ? '#10b981' : '#ef4444' }]}> {stock.change}</Text>

      <View style={{ flexDirection: 'row', marginTop: 12 }}>
        {['1D', '1W', '1M'].map((tf) => (
          <TouchableOpacity onPress={() => setTimeframe(tf)} style={{ marginHorizontal: 8 }} key={tf}>
            <Text style={{ color: tf === timeframe ? '#6366f1' : '#cbd5e1' }}>{tf}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {chartData && (
        <LineChart
          style={{ height: 180, width: width - 100, marginTop: 16 }}
          data={chartData}
          svg={{ stroke: '#6366f1', strokeWidth: 2 }}
          contentInset={{ top: 20, bottom: 20 }}
          curve={shape.curveNatural}
        />
      )}
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      {index < dummyStocks.length ? renderCard(dummyStocks[index]) : <Text style={{ color: 'white' }}>No more stocks!</Text>}
      <View style={styles.swipeInfo}>
        <Ionicons name="information-circle" size={18} color="#94a3b8" />
        <Text style={styles.swipeText}>Swipe right to like, left to skip</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 40,
    alignItems: 'center',
    paddingBottom: 60,
  },
  card: {
    width: width - 60,
    height: 420,
    borderRadius: 16,
    backgroundColor: '#1e293b',
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  logo: {
    width: 64,
    height: 64,
    marginBottom: 16,
  },
  symbol: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  name: {
    color: '#cbd5e1',
    fontSize: 16,
    marginBottom: 12,
  },
  price: {
    fontSize: 20,
    color: '#ffffff',
    fontWeight: '600',
    marginBottom: 8,
  },
  change: {
    fontSize: 16,
    fontWeight: '600',
  },
  swipeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  swipeText: {
    color: '#94a3b8',
    marginLeft: 8,
    fontSize: 14,
  },
});

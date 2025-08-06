// SwipeStocks.js
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Dimensions, Image,
    Animated, PanResponder
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, updateDoc, arrayUnion, setDoc } from 'firebase/firestore';
import { db, auth } from './firebase';
import { getStockDetails } from './llmStocks';

const { width } = Dimensions.get('window');


const addLikedStock = async (stock) => {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  const ref = doc(db, 'users', uid);
  await setDoc(ref, {}, { merge: true });
  await updateDoc(ref, { likedStocks: arrayUnion(stock) });
};

const rejectStock = async (stock) => {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  const ref = doc(db, 'users', uid, 'rejected', stock.symbol);
  await setDoc(ref, { ...stock, rejectedAt: new Date() });
};

export default function SwipeStocks() {
  const [stocks, setStocks] = useState([]);
  const [index, setIndex] = useState(0);
  const position = useRef(new Animated.ValueXY()).current;
  const [animating, setAnimating] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadStocks = async () => {
      try {
        const data = await Promise.all(symbols.map((s) => getStockDetails(s)));
        setStocks(data);
      } catch (err) {
        console.error(err);
        setError('Error loading stock details.');
      } finally {
        setLoading(false);
      }
    };
    loadStocks();
  }, []);

  const handleSwipe = async (dir) => {
    if (animating || index >= stocks.length) return;
    setAnimating(true);
    const stock = stocks[index];

    if (dir === 'right') await addLikedStock(stock);
    else await rejectStock(stock);

    Animated.timing(position, {
      toValue: { x: dir === 'right' ? 500 : -500, y: 0 },
      duration: 250,
      useNativeDriver: false,
    }).start(() => {
      position.setValue({ x: 0, y: 0 });
      setIndex((prev) => prev + 1);
      setAnimating(false);
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        if (!animating) position.setValue({ x: gesture.dx, y: gesture.dy });
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > 120) handleSwipe('right');
        else if (gesture.dx < -120) handleSwipe('left');
        else {
          Animated.spring(position, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading stocks...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {index < stocks.length ? (
        <Animated.View
          {...panResponder.panHandlers}
          style={[styles.card, { transform: position.getTranslateTransform() }]}
        >
          <Image source={{ uri: stocks[index].logo }} style={styles.logo} />
          <Text style={styles.symbol}>{stocks[index].symbol}</Text>
          <Text style={styles.name}>{stocks[index].name}</Text>
          <Text style={styles.price}>{stocks[index].price}</Text>
          <Text style={[
            styles.change,
            { color: stocks[index].change.startsWith('+') ? '#10b981' : '#ef4444' },
          ]}>{stocks[index].change}</Text>
         <Text style={styles.description}>{stocks[index].description}</Text>
          <Text style={styles.growth}>{stocks[index].growth}</Text>
        </Animated.View>
      ) : (
        <Text style={styles.endText}>No more stocks to show</Text>
      )}
      <View style={styles.swipeInfo}>
        <Ionicons name="information-circle" size={18} color="#94a3b8" />
        <Text style={styles.swipeText}>Swipe right to like, left to skip</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingBottom: 20 },
  card: {
    width: width - 60,
    height: 420,
    borderRadius: 16,
    backgroundColor: '#1e293b',
    padding: 24,
    alignItems: 'center',
    borderColor: '#334155',
    borderWidth: 1,
  },
  logo: { width: 64, height: 64, marginBottom: 16 },
  symbol: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  name: { fontSize: 16, color: '#cbd5e1', marginBottom: 12 },
  price: { fontSize: 20, fontWeight: '600', color: '#fff' },
  change: { fontSize: 16, fontWeight: '600' },
  description: { color: '#cbd5e1', fontSize: 14, textAlign: 'center', marginTop: 12 },
  growth: { color: '#fff', fontSize: 16, fontWeight: '600', marginTop: 8 },
  loadingText: { color: '#cbd5e1', marginTop: 12 },
  endText: { color: 'white', fontSize: 16 },
  swipeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  swipeText: { color: '#94a3b8', marginLeft: 8 },
});

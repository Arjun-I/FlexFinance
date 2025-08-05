import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Image,
  Animated,
  PanResponder,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, updateDoc, arrayUnion, setDoc } from 'firebase/firestore';
import { db, auth } from './firebase';

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

const addLikedStock = async (stock) => {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  const ref = doc(db, 'users', uid);
  await setDoc(ref, {}, { merge: true });
  await updateDoc(ref, {
    likedStocks: arrayUnion(stock),
  });
};

const rejectStock = async (stock) => {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  const ref = doc(db, 'users', uid, 'rejected', stock.symbol);
  await setDoc(ref, {
    ...stock,
    rejectedAt: new Date(),
  });
};

export default function SwipeStocks() {
  const [index, setIndex] = useState(0);
  const position = useRef(new Animated.ValueXY()).current;
  const [animating, setAnimating] = useState(false);

  const handleSwipe = async (dir) => {
    if (animating || index >= dummyStocks.length) return;
    setAnimating(true);
    const stock = dummyStocks[index];

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

  return (
    <View style={styles.container}>
      {index < dummyStocks.length ? (
        <Animated.View
          {...panResponder.panHandlers}
          style={[styles.card, { transform: position.getTranslateTransform() }]}
        >
          <Image source={{ uri: dummyStocks[index].logo }} style={styles.logo} />
          <Text style={styles.symbol}>{dummyStocks[index].symbol}</Text>
          <Text style={styles.name}>{dummyStocks[index].name}</Text>
          <Text style={styles.price}>{dummyStocks[index].price}</Text>
          <Text
            style={[
              styles.change,
              { color: dummyStocks[index].change.startsWith('+') ? '#10b981' : '#ef4444' },
            ]}
          >
            {dummyStocks[index].change}
          </Text>
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
    height: 360,
    borderRadius: 16,
    backgroundColor: '#1e293b',
    padding: 24,
    alignItems: 'center',
    borderColor: '#334155',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  logo: { width: 64, height: 64, marginBottom: 16 },
  symbol: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  name: { fontSize: 16, color: '#cbd5e1', marginBottom: 12 },
  price: { fontSize: 20, fontWeight: '600', color: '#fff' },
  change: { fontSize: 16, fontWeight: '600' },
  endText: { color: 'white', fontSize: 16 },
  swipeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  swipeText: { color: '#94a3b8', marginLeft: 8 },
});

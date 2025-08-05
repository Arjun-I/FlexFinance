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

// Add liked stock to user's Firestore document
const addLikedStock = async (stock) => {
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const userDocRef = doc(db, 'users', uid);
    await setDoc(userDocRef, {}, { merge: true });
    await updateDoc(userDocRef, {
      likedStocks: arrayUnion(stock),
    });
  } catch (error) {
    if (error.code === 'permission-denied') {
      Alert.alert('Permission denied', 'Please log in to like stocks.');
    } else {
      console.error('Error adding liked stock:', error);
    }
  }
};

// Store rejected stock in a subcollection (for learning purposes)
const storeRejectedStock = async (stock) => {
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const rejectedDocRef = doc(db, 'users', uid, 'rejected', stock.symbol);
    await setDoc(rejectedDocRef, {
      symbol: stock.symbol,
      name: stock.name,
      logo: stock.logo,
      rejectedAt: new Date(),
    });
  } catch (error) {
    console.error('Error storing rejected stock:', error);
  }
};

export default function SwipeStocks() {
  const [index, setIndex] = useState(0);
  const position = useRef(new Animated.ValueXY()).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        position.setValue({ x: gesture.dx, y: gesture.dy });
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > 120) {
          // Swiped right: like
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
          // Swiped left: reject
          Animated.timing(position, {
            toValue: { x: -500, y: gesture.dy },
            duration: 300,
            useNativeDriver: false,
          }).start(() => {
            storeRejectedStock(dummyStocks[index]);
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
      <Text
        style={[
          styles.change,
          { color: stock.change.startsWith('+') ? '#10b981' : '#ef4444' },
        ]}
      >
        {stock.change}
      </Text>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      {index < dummyStocks.length ? (
        renderCard(dummyStocks[index])
      ) : (
        <Text style={{ color: 'white' }}>No more stocks!</Text>
      )}
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
    height: 360,
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

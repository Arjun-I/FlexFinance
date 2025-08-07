// SwipeStocksMock.js - Mock Stock Swiping for Testing
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Dimensions, Image,
  Animated, PanResponder, Alert, ActivityIndicator, TouchableOpacity, Platform, ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, updateDoc, arrayUnion, setDoc, getDoc, getDocs, collection, deleteDoc, addDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import stockGenerationService from '../services/stockGenerationService';

const { width } = Dimensions.get('window');

// Daily swipe limit configuration
const DAILY_SWIPE_LIMIT = 10;

// Mock stock data for testing
const MOCK_STOCKS = [
  {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    price: '$190.50',
    change: '+2.3%',
    sector: 'Technology',
    industry: 'Consumer Electronics',
    reason: 'Stable tech giant with strong fundamentals',
    riskLevel: 'low',
    confidence: 0.9
  },
  {
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    price: '$310.25',
    change: '+1.8%',
    sector: 'Technology',
    industry: 'Software',
    reason: 'Diversified tech company with cloud growth',
    riskLevel: 'low',
    confidence: 0.85
  },
  {
    symbol: 'GOOGL',
    name: 'Alphabet Inc.',
    price: '$2800.00',
    change: '+3.1%',
    sector: 'Technology',
    industry: 'Internet Services',
    reason: 'Tech leader with advertising dominance',
    riskLevel: 'medium',
    confidence: 0.8
  },
  {
    symbol: 'AMZN',
    name: 'Amazon.com Inc.',
    price: '$140.75',
    change: '+1.5%',
    sector: 'Consumer',
    industry: 'E-commerce',
    reason: 'E-commerce and cloud services leader',
    riskLevel: 'medium',
    confidence: 0.75
  },
  {
    symbol: 'TSLA',
    name: 'Tesla Inc.',
    price: '$270.30',
    change: '+4.2%',
    sector: 'Consumer',
    industry: 'Automotive',
    reason: 'Electric vehicle and clean energy pioneer',
    riskLevel: 'high',
    confidence: 0.7
  },
  {
    symbol: 'NVDA',
    name: 'NVIDIA Corporation',
    price: '$500.00',
    change: '+5.8%',
    sector: 'Technology',
    industry: 'Semiconductors',
    reason: 'AI and gaming chip leader',
    riskLevel: 'high',
    confidence: 0.75
  },
  {
    symbol: 'META',
    name: 'Meta Platforms Inc.',
    price: '$350.40',
    change: '+2.7%',
    sector: 'Technology',
    industry: 'Social Media',
    reason: 'Social media and metaverse company',
    riskLevel: 'medium',
    confidence: 0.7
  },
  {
    symbol: 'NFLX',
    name: 'Netflix Inc.',
    price: '$450.20',
    change: '+1.9%',
    sector: 'Consumer',
    industry: 'Entertainment',
    reason: 'Streaming entertainment leader',
    riskLevel: 'medium',
    confidence: 0.65
  },
  {
    symbol: 'JNJ',
    name: 'Johnson & Johnson',
    price: '$165.80',
    change: '+0.8%',
    sector: 'Healthcare',
    industry: 'Pharmaceuticals',
    reason: 'Defensive healthcare stock with dividend',
    riskLevel: 'low',
    confidence: 0.8
  },
  {
    symbol: 'PG',
    name: 'Procter & Gamble Co.',
    price: '$145.20',
    change: '+0.5%',
    sector: 'Consumer',
    industry: 'Consumer Staples',
    reason: 'Consumer staples with stable earnings',
    riskLevel: 'low',
    confidence: 0.8
  }
];

export default function SwipeStocksMock() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [stocks, setStocks] = useState([]);
  const [likedStocks, setLikedStocks] = useState([]);
  const [rejectedStocks, setRejectedStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('swipe'); // 'swipe', 'liked', 'rejected'
  const [swipeCount, setSwipeCount] = useState(0);
  const [dailyLimit, setDailyLimit] = useState(DAILY_SWIPE_LIMIT);
  const [swipeLimitReached, setSwipeLimitReached] = useState(false);
  const position = useRef(new Animated.ValueXY()).current;
  const animating = useRef(false);

  // Check and update daily swipe count
  const checkDailySwipeLimit = async () => {
    const user = auth.currentUser;
    if (!user) return { canSwipe: false, reason: 'User not authenticated' };

    try {
      const today = new Date().toDateString();
      const swipeDataRef = doc(db, 'users', user.uid, 'swipeData', 'daily');
      const swipeDataDoc = await getDoc(swipeDataRef);

      if (swipeDataDoc.exists()) {
        const data = swipeDataDoc.data();
        const lastSwipeDate = data.lastSwipeDate;
        const currentCount = data.swipeCount || 0;

        // Reset count if it's a new day
        if (lastSwipeDate !== today) {
          await updateDoc(swipeDataRef, {
            swipeCount: 0,
            lastSwipeDate: today
          });
          setSwipeCount(0);
          setSwipeLimitReached(false);
          return { canSwipe: true, remaining: DAILY_SWIPE_LIMIT };
        }

        // Check if limit reached
        if (currentCount >= DAILY_SWIPE_LIMIT) {
          setSwipeCount(currentCount);
          setSwipeLimitReached(true);
          return { canSwipe: false, reason: 'Daily swipe limit reached', remaining: 0 };
        }

        setSwipeCount(currentCount);
        setSwipeLimitReached(false);
        return { canSwipe: true, remaining: DAILY_SWIPE_LIMIT - currentCount };
      } else {
        // First time swiping today
        await setDoc(swipeDataRef, {
          swipeCount: 0,
          lastSwipeDate: today
        });
        setSwipeCount(0);
        setSwipeLimitReached(false);
        return { canSwipe: true, remaining: DAILY_SWIPE_LIMIT };
      }
    } catch (error) {
      console.error('Error checking swipe limit:', error);
      return { canSwipe: true, remaining: DAILY_SWIPE_LIMIT }; // Allow swiping if check fails
    }
  };

  // Increment swipe count
  const incrementSwipeCount = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const today = new Date().toDateString();
      const swipeDataRef = doc(db, 'users', user.uid, 'swipeData', 'daily');
      
      await updateDoc(swipeDataRef, {
        swipeCount: swipeCount + 1,
        lastSwipeDate: today
      });

      setSwipeCount(prev => prev + 1);
      
      // Check if limit reached after increment
      if (swipeCount + 1 >= DAILY_SWIPE_LIMIT) {
        setSwipeLimitReached(true);
      }
    } catch (error) {
      console.error('Error incrementing swipe count:', error);
    }
  };

  const loadStocks = async () => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Check daily swipe limit first
      const limitCheck = await checkDailySwipeLimit();
      setDailyLimit(limitCheck.remaining);

      // Load liked stocks
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userLikedStocks = userDoc.data()?.likedStocks || [];
      setLikedStocks(userLikedStocks);

      // Load rejected stocks
      const rejectedSnap = await getDocs(collection(db, 'users', user.uid, 'rejected'));
      const rejectedData = rejectedSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRejectedStocks(rejectedData);

      // Get generated stocks from the service
      let generatedStocks = [];
      try {
        generatedStocks = await stockGenerationService.generateDailyStocks();
        console.log('✅ Generated stocks with LLM summaries:', generatedStocks.length);
      } catch (error) {
        console.error('❌ Error generating stocks, using fallback:', error);
        // Fallback to mock stocks if generation fails
        generatedStocks = MOCK_STOCKS.map(stock => ({
          ...stock,
          analysis: 'Mock analysis - LLM generation failed',
          suitability: stock.riskLevel,
          risks: ['Mock risk data'],
          benefits: ['Mock benefit data'],
          recommendation: 'hold'
        }));
      }

      // Filter out already swiped stocks to prevent duplicates
      const swipedSymbols = [...userLikedStocks, ...rejectedData.map(s => s.symbol)];
      const availableStocks = generatedStocks.filter(stock => !swipedSymbols.includes(stock.symbol));
      setStocks(availableStocks);
      
      // Reset current index when stocks change
      setCurrentIndex(0);
      
      console.log(`Loaded ${availableStocks.length} available stocks with LLM summaries`);
      console.log(`Daily swipe limit: ${limitCheck.remaining}/${DAILY_SWIPE_LIMIT} remaining`);
    } catch (error) {
      console.error('Error loading stocks:', error);
      // Fallback to all stocks if there's an error
      setStocks([...MOCK_STOCKS]);
    } finally {
      setLoading(false);
    }
  };

  const addLikedStock = async (stock) => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      // Add to liked stocks
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        // Create user document with initial liked stock
        await setDoc(userDocRef, { likedStocks: [stock.symbol] });
      } else {
        // Append to existing liked stocks
        await updateDoc(userDocRef, {
          likedStocks: arrayUnion(stock.symbol),
        });
      }

      // Check if stock already exists in portfolio
      const portfolioRef = doc(db, 'users', user.uid, 'portfolio', stock.symbol);
      const portfolioDoc = await getDoc(portfolioRef);
      
      if (!portfolioDoc.exists()) {
        // Add to portfolio with 0 shares initially
        await setDoc(portfolioRef, {
          symbol: stock.symbol,
          shares: 0,
          averagePrice: 0,
          totalCost: 0,
          industry: stock.sector,
          datePurchased: new Date(),
          lastUpdated: new Date(),
        });
      }

      // Reload stocks to update the UI
      await loadStocks();
      Alert.alert('Success', `${stock.symbol} added to liked stocks`);
    } catch (error) {
      console.error('Error adding liked stock:', error);
      Alert.alert('Error', 'Failed to add stock to liked list');
    }
  };

  const rejectStock = async (stock) => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      // Add to rejected stocks
      await addDoc(collection(db, 'users', user.uid, 'rejected'), {
        symbol: stock.symbol,
        name: stock.name,
        sector: stock.sector,
        reason: stock.reason,
        rejectedAt: new Date(),
      });

      // Reload stocks to update the UI
      await loadStocks();
      Alert.alert('Rejected', `${stock.symbol} added to rejected stocks`);
    } catch (error) {
      console.error('Error rejecting stock:', error);
      Alert.alert('Error', 'Failed to reject stock');
    }
  };

  const moveStockToLiked = async (stock) => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      // Remove from rejected
      const rejectedSnap = await getDocs(collection(db, 'users', user.uid, 'rejected'));
      const rejectedDoc = rejectedSnap.docs.find(doc => doc.data().symbol === stock.symbol);
      if (rejectedDoc) {
        await deleteDoc(rejectedDoc.ref);
      }

      // Add to liked stocks
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        // Create user document with initial liked stock
        await setDoc(userDocRef, { likedStocks: [stock.symbol] });
      } else {
        // Append to existing liked stocks
        await updateDoc(userDocRef, {
          likedStocks: arrayUnion(stock.symbol),
        });
      }

      // Check if stock already exists in portfolio
      const portfolioRef = doc(db, 'users', user.uid, 'portfolio', stock.symbol);
      const portfolioDoc = await getDoc(portfolioRef);
      
      if (!portfolioDoc.exists()) {
        // Add to portfolio with 0 shares
        await setDoc(portfolioRef, {
          symbol: stock.symbol,
          shares: 0,
          averagePrice: 0,
          totalCost: 0,
          industry: stock.sector,
          datePurchased: new Date(),
          lastUpdated: new Date(),
        });
      }

      // Reload stocks to update the UI
      await loadStocks();
      Alert.alert('Success', `${stock.symbol} moved to liked stocks`);
    } catch (error) {
      console.error('Error moving stock to liked:', error);
      Alert.alert('Error', 'Failed to move stock');
    }
  };

  const moveStockToRejected = async (stock) => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      // Remove from liked stocks
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const likedStocks = userDoc.data()?.likedStocks || [];
      const updatedLikedStocks = likedStocks.filter(symbol => symbol !== stock.symbol);
      
      await updateDoc(doc(db, 'users', user.uid), {
        likedStocks: updatedLikedStocks
      });

      // Only remove from portfolio if it has 0 shares (not invested)
      const portfolioRef = doc(db, 'users', user.uid, 'portfolio', stock.symbol);
      const portfolioDoc = await getDoc(portfolioRef);
      
      if (portfolioDoc.exists() && portfolioDoc.data().shares === 0) {
        await deleteDoc(portfolioRef);
      }

      // Add to rejected
      await addDoc(collection(db, 'users', user.uid, 'rejected'), {
        symbol: stock.symbol,
        name: stock.name,
        sector: stock.sector,
        reason: stock.reason,
        rejectedAt: new Date(),
      });

      // Reload stocks to update the UI
      await loadStocks();
      Alert.alert('Rejected', `${stock.symbol} moved to rejected stocks`);
    } catch (error) {
      console.error('Error moving stock to rejected:', error);
      Alert.alert('Error', 'Failed to move stock');
    }
  };
  
  useEffect(() => {
    loadStocks();
  }, []);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      position.setOffset({
        x: position.x._value,
        y: position.y._value,
      });
    },
    onPanResponderMove: (_, gesture) => {
      position.setValue({ x: gesture.dx, y: gesture.dy });
    },
    onPanResponderRelease: (_, gesture) => {
      position.flattenOffset();
      
      if (gesture.dx > 120) {
        // Swipe right (like)
        handleSwipe('right');
      } else if (gesture.dx < -120) {
        // Swipe left (reject)
        handleSwipe('left');
      } else {
        // Return to center
        Animated.spring(position, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: false,
        }).start();
      }
    },
  });

  const handleSwipe = async (dir) => {
    if (animating.current) return;
    animating.current = true;

    try {
      // Check daily swipe limit before allowing swipe
      const limitCheck = await checkDailySwipeLimit();
      if (!limitCheck.canSwipe) {
        Alert.alert(
          'Daily Limit Reached', 
          `You've reached your daily limit of ${DAILY_SWIPE_LIMIT} swipes. Come back tomorrow for more recommendations!`,
          [{ text: 'OK' }]
        );
        animating.current = false;
        return;
      }

      const currentStock = stocks[currentIndex];
      if (!currentStock) {
        animating.current = false;
        return;
      }

      // Increment swipe count
      await incrementSwipeCount();

      if (dir === 'right') {
        // Like the stock
        await addLikedStock(currentStock);
        console.log(`✅ Liked ${currentStock.symbol} - Swipe ${swipeCount + 1}/${DAILY_SWIPE_LIMIT}`);
      } else if (dir === 'left') {
        // Reject the stock
        await rejectStock(currentStock);
        console.log(`❌ Rejected ${currentStock.symbol} - Swipe ${swipeCount + 1}/${DAILY_SWIPE_LIMIT}`);
      }

      // Move to next stock
      setCurrentIndex(prev => {
        const nextIndex = prev + 1;
        if (nextIndex >= stocks.length) {
          // No more stocks to swipe
          Alert.alert(
            'No More Stocks', 
            'You\'ve swiped through all available stocks for today. Check back tomorrow for new recommendations!',
            [{ text: 'OK' }]
          );
          return prev;
        }
        return nextIndex;
      });

      // Reset position
      position.setValue({ x: 0, y: 0 });
    } catch (error) {
      console.error('Error handling swipe:', error);
    } finally {
      animating.current = false;
    }
  };

  const renderSwipeButtons = () => {
    if (swipeLimitReached || currentIndex >= stocks.length) {
      return null;
    }

    return (
      <View style={styles.swipeButtons}>
        <TouchableOpacity
          style={[styles.swipeButton, styles.rejectButton]}
          onPress={() => handleSwipe('left')}
        >
          <Ionicons name="close" size={24} color="#ef4444" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.swipeButton, styles.likeButton]}
          onPress={() => handleSwipe('right')}
        >
          <Ionicons name="heart" size={24} color="#10b981" />
        </TouchableOpacity>
      </View>
    );
  };

  const getRiskColor = (riskLevel) => {
    switch (riskLevel) {
      case 'low': return '#10b981';
      case 'medium': return '#f59e0b';
      case 'high': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getRecommendationColor = (recommendation) => {
    switch (recommendation) {
      case 'buy': return '#10b981';
      case 'hold': return '#f59e0b';
      case 'sell': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const renderStockCard = () => {
    if (currentIndex >= stocks.length) {
      return (
        <View style={styles.noMoreStocks}>
          <Ionicons name="checkmark-circle" size={64} color="#10b981" />
          <Text style={styles.noMoreStocksTitle}>No More Stocks</Text>
          <Text style={styles.noMoreStocksSubtitle}>
            You've swiped through all available stocks for today.
          </Text>
          <Text style={styles.noMoreStocksSubtitle}>
            Check back tomorrow for new recommendations!
          </Text>
        </View>
      );
    }

    const stock = stocks[currentIndex];
    if (!stock) return null;

    const rotate = position.x.interpolate({
      inputRange: [-width / 2, 0, width / 2],
      outputRange: ['-10deg', '0deg', '10deg'],
    });

    return (
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.stockCard,
          {
            transform: [
              { translateX: position.x },
              { translateY: position.y },
              { rotate },
            ],
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.stockInfo}>
            <Text style={styles.symbol}>{stock.symbol}</Text>
            <Text style={styles.name}>{stock.name}</Text>
          </View>
          <View style={styles.priceInfo}>
            <Text style={styles.price}>{stock.price}</Text>
            <Text style={[styles.change, { color: stock.change.startsWith('+') ? '#10b981' : '#ef4444' }]}>
              {stock.change}
            </Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.sectorInfo}>
            <Text style={styles.sectorLabel}>Sector</Text>
            <Text style={styles.sectorValue}>{stock.sector}</Text>
          </View>
          {stock.industry && (
            <View style={styles.sectorInfo}>
              <Text style={styles.sectorLabel}>Industry</Text>
              <Text style={styles.sectorValue}>{stock.industry}</Text>
            </View>
          )}
          <View style={styles.reasonContainer}>
            <Text style={styles.reasonLabel}>Why this stock?</Text>
            <Text style={styles.reasonText}>{stock.reason}</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.riskContainer}>
            <Text style={styles.riskLabel}>Risk Level</Text>
            <View style={[styles.riskBadge, { backgroundColor: getRiskColor(stock.riskLevel) }]}>
              <Text style={styles.riskText}>{stock.riskLevel.toUpperCase()}</Text>
            </View>
          </View>
          <View style={styles.confidenceContainer}>
            <Text style={styles.confidenceLabel}>Confidence</Text>
            <Text style={styles.confidenceValue}>{Math.round(stock.confidence * 100)}%</Text>
          </View>
        </View>

        {/* Swipe Limit Indicator */}
        <View style={styles.swipeLimitContainer}>
          <Text style={styles.swipeLimitText}>
            Swipes Today: {swipeCount}/{DAILY_SWIPE_LIMIT}
          </Text>
          {swipeLimitReached && (
            <Text style={styles.limitReachedText}>
              Daily limit reached! Come back tomorrow.
            </Text>
          )}
        </View>

        {/* Swipe Buttons */}
        {renderSwipeButtons()}
      </Animated.View>
    );
  };

  const renderLikedStocks = () => (
    <ScrollView style={styles.listContainer}>
      {likedStocks.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="heart-outline" size={48} color="#94a3b8" />
          <Text style={styles.emptyStateText}>No liked stocks yet</Text>
          <Text style={styles.emptyStateSubtext}>Swipe right on stocks you like</Text>
        </View>
      ) : (
        likedStocks.map((symbol, index) => {
          const stock = MOCK_STOCKS.find(s => s.symbol === symbol) || { symbol, name: symbol };
          return (
            <View key={index} style={styles.listItem}>
              <View style={styles.listItemInfo}>
                <Text style={styles.listItemSymbol}>{stock.symbol}</Text>
                <Text style={styles.listItemName}>{stock.name}</Text>
                <Text style={styles.listItemSector}>{stock.sector}</Text>
              </View>
              <TouchableOpacity
                style={styles.moveButton}
                onPress={() => moveStockToRejected(stock)}
              >
                <Ionicons name="close-circle" size={24} color="#ef4444" />
              </TouchableOpacity>
            </View>
          );
        })
      )}
    </ScrollView>
  );

  const renderRejectedStocks = () => (
    <ScrollView style={styles.listContainer}>
      {rejectedStocks.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="close-circle-outline" size={48} color="#94a3b8" />
          <Text style={styles.emptyStateText}>No rejected stocks yet</Text>
          <Text style={styles.emptyStateSubtext}>Swipe left on stocks you don't like</Text>
        </View>
      ) : (
        rejectedStocks.map((stock, index) => (
          <View key={index} style={styles.listItem}>
            <View style={styles.listItemInfo}>
              <Text style={styles.listItemSymbol}>{stock.symbol}</Text>
              <Text style={styles.listItemName}>{stock.name}</Text>
              <Text style={styles.listItemSector}>{stock.sector}</Text>
            </View>
            <TouchableOpacity
              style={styles.moveButton}
              onPress={() => moveStockToLiked(stock)}
            >
              <Ionicons name="heart" size={24} color="#10b981" />
            </TouchableOpacity>
          </View>
        ))
      )}
    </ScrollView>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading stocks...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'swipe' && styles.activeTab]}
          onPress={() => setActiveTab('swipe')}
        >
          <Ionicons name="swap-horizontal" size={20} color={activeTab === 'swipe' ? '#6366f1' : '#94a3b8'} />
          <Text style={[styles.tabText, activeTab === 'swipe' && styles.activeTabText]}>
            Swipe ({stocks.length - currentIndex})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'liked' && styles.activeTab]}
          onPress={() => setActiveTab('liked')}
        >
          <Ionicons name="heart" size={20} color={activeTab === 'liked' ? '#10b981' : '#94a3b8'} />
          <Text style={[styles.tabText, activeTab === 'liked' && styles.activeTabText]}>
            Liked ({likedStocks.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'rejected' && styles.activeTab]}
          onPress={() => setActiveTab('rejected')}
        >
          <Ionicons name="close-circle" size={20} color={activeTab === 'rejected' ? '#ef4444' : '#94a3b8'} />
          <Text style={[styles.tabText, activeTab === 'rejected' && styles.activeTabText]}>
            Rejected ({rejectedStocks.length})
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {activeTab === 'swipe' && renderStockCard()}
        {activeTab === 'liked' && renderLikedStocks()}
        {activeTab === 'rejected' && renderRejectedStocks()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
  loadingText: {
    color: '#e2e8f0',
    fontSize: 16,
    marginTop: 12,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  activeTab: {
    backgroundColor: '#334155',
  },
  tabText: {
    color: '#94a3b8',
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    width: width - 40,
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  symbol: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
  },
  priceSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 12,
    backgroundColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 16,
  },
  price: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  change: {
    fontSize: 16,
    fontWeight: '600',
  },
  infoSection: {
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: '#94a3b8',
  },
  value: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '500',
  },
  riskBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  riskText: {
    fontSize: 10,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  reason: {
    fontSize: 14,
    color: '#e2e8f0',
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 20,
  },
  swipeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    paddingHorizontal: 20,
  },
  swipeButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  rejectButton: {
    backgroundColor: '#1e293b',
    borderWidth: 2,
    borderColor: '#ef4444',
  },
  likeButton: {
    backgroundColor: '#1e293b',
    borderWidth: 2,
    borderColor: '#10b981',
  },
  noMoreStocks: {
    alignItems: 'center',
    padding: 40,
  },
  noMoreStocksTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 16,
    marginBottom: 8,
  },
  noMoreStocksSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
  },
  listContainer: {
    flex: 1,
    width: '100%',
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
  },
  listItemInfo: {
    flex: 1,
  },
  listItemSymbol: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  listItemName: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 2,
  },
  listItemSector: {
    fontSize: 12,
    color: '#64748b',
  },
  moveButton: {
    padding: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
  },
  analysisSection: {
    backgroundColor: '#334155',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  analysisTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  analysisText: {
    fontSize: 14,
    color: '#e2e8f0',
    lineHeight: 20,
    marginBottom: 12,
  },
  analysisRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  analysisLabel: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: 'bold',
    width: 80,
  },
  analysisValue: {
    fontSize: 12,
    color: '#e2e8f0',
    flex: 1,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  refreshButtonText: {
    color: '#6366f1',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  stockCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    width: width - 40,
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  stockInfo: {
    flex: 1,
  },
  priceInfo: {
    alignItems: 'flex-end',
  },
  cardBody: {
    marginBottom: 20,
  },
  sectorInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectorLabel: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: 'bold',
  },
  sectorValue: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '500',
  },
  reasonContainer: {
    marginBottom: 15,
  },
  reasonLabel: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  reasonText: {
    fontSize: 14,
    color: '#e2e8f0',
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  riskContainer: {
    alignItems: 'center',
  },
  riskLabel: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  confidenceContainer: {
    alignItems: 'center',
  },
  confidenceLabel: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  confidenceValue: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '500',
  },
  swipeLimitContainer: {
    alignItems: 'center',
    marginTop: 15,
  },
  swipeLimitText: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '500',
  },
  limitReachedText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
  },
}); 
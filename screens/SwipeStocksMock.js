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

// Mock stock data for testing
const MOCK_STOCKS = [
  {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    price: '$190.50',
    change: '+2.3%',
    sector: 'Technology',
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
    reason: 'E-commerce and cloud services leader',
    riskLevel: 'medium',
    confidence: 0.75
  },
  {
    symbol: 'TSLA',
    name: 'Tesla Inc.',
    price: '$270.30',
    change: '+4.2%',
    sector: 'Automotive',
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
    reason: 'Social media and metaverse company',
    riskLevel: 'medium',
    confidence: 0.7
  },
  {
    symbol: 'NFLX',
    name: 'Netflix Inc.',
    price: '$450.20',
    change: '+1.9%',
    sector: 'Entertainment',
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
    reason: 'Stable healthcare conglomerate',
    riskLevel: 'low',
    confidence: 0.8
  },
  {
    symbol: 'JPM',
    name: 'JPMorgan Chase & Co.',
    price: '$180.90',
    change: '+1.2%',
    sector: 'Financial',
    reason: 'Leading financial services company',
    riskLevel: 'medium',
    confidence: 0.75
  }
];

export default function SwipeStocksMock() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [stocks, setStocks] = useState([]);
  const [likedStocks, setLikedStocks] = useState([]);
  const [rejectedStocks, setRejectedStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('swipe'); // 'swipe', 'liked', 'rejected'
  const position = useRef(new Animated.ValueXY()).current;
  const animating = useRef(false);

  const loadStocks = async () => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    try {
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

  const handleSwipe = async (dir) => {
    if (animating.current || currentIndex >= stocks.length) return;
    
    animating.current = true;
    const stock = stocks[currentIndex];

    try {
      if (dir === 'right') {
        await addLikedStock(stock);
      } else if (dir === 'left') {
        await rejectStock(stock);
      }

      // Move to next stock
      setCurrentIndex(prev => prev + 1);
      position.setValue({ x: 0, y: 0 });
    } catch (error) {
      console.error('Error handling swipe:', error);
    } finally {
      animating.current = false;
    }
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => !animating.current,
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
        handleSwipe('right');
      } else if (gesture.dx < -120) {
        handleSwipe('left');
      } else {
        Animated.spring(position, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: false,
        }).start();
      }
    },
  });

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
          <Text style={styles.noMoreStocksText}>No more stocks to swipe!</Text>
          <Text style={styles.noMoreStocksSubtext}>Check your liked and rejected stocks</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={loadStocks}>
            <Ionicons name="refresh" size={20} color="#6366f1" />
            <Text style={styles.refreshButtonText}>Refresh Stocks</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const stock = stocks[currentIndex];
    const rotate = position.x.interpolate({
      inputRange: [-width / 2, 0, width / 2],
      outputRange: ['-10deg', '0deg', '10deg'],
    });

    return (
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.card,
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
          <Text style={styles.symbol}>{stock.symbol}</Text>
          <Text style={styles.name}>{stock.name}</Text>
        </View>
        
        <View style={styles.priceSection}>
          <Text style={styles.price}>{stock.price}</Text>
          <Text style={[styles.change, { color: stock.change.startsWith('+') ? '#10b981' : '#ef4444' }]}>
            {stock.change}
          </Text>
        </View>

        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Sector:</Text>
            <Text style={styles.value}>{stock.sector}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Risk Level:</Text>
            <View style={[styles.riskBadge, { backgroundColor: getRiskColor(stock.riskLevel) }]}>
              <Text style={styles.riskText}>{stock.riskLevel.toUpperCase()}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Confidence:</Text>
            <Text style={styles.value}>{Math.round(stock.confidence * 100)}%</Text>
          </View>
        </View>

        <Text style={styles.reason}>{stock.reason}</Text>

        {/* LLM Analysis Section */}
        {stock.analysis && (
          <View style={styles.analysisSection}>
            <Text style={styles.analysisTitle}>AI Analysis</Text>
            <Text style={styles.analysisText}>{stock.analysis}</Text>
            
            {stock.risks && stock.risks.length > 0 && (
              <View style={styles.analysisRow}>
                <Text style={styles.analysisLabel}>Risks:</Text>
                <Text style={styles.analysisValue}>{stock.risks.join(', ')}</Text>
              </View>
            )}
            
            {stock.benefits && stock.benefits.length > 0 && (
              <View style={styles.analysisRow}>
                <Text style={styles.analysisLabel}>Benefits:</Text>
                <Text style={styles.analysisValue}>{stock.benefits.join(', ')}</Text>
              </View>
            )}
            
            {stock.recommendation && (
              <View style={styles.analysisRow}>
                <Text style={styles.analysisLabel}>Recommendation:</Text>
                <Text style={[styles.analysisValue, { color: getRecommendationColor(stock.recommendation) }]}>
                  {stock.recommendation.toUpperCase()}
                </Text>
              </View>
            )}
          </View>
        )}

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
  },
  swipeButton: {
    padding: 16,
    borderRadius: 50,
    backgroundColor: '#334155',
  },
  rejectButton: {
    backgroundColor: '#7f1d1d',
  },
  likeButton: {
    backgroundColor: '#065f46',
  },
  noMoreStocks: {
    alignItems: 'center',
    padding: 40,
  },
  noMoreStocksText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 16,
    marginBottom: 8,
  },
  noMoreStocksSubtext: {
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
}); 
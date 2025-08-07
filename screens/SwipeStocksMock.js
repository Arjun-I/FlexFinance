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
const DAILY_SWIPE_LIMIT = 50;

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

        // Reset count if it's a new day (improved date comparison)
        if (lastSwipeDate !== today) {
          console.log(`🔄 New day detected, resetting swipe count. Last: ${lastSwipeDate}, Today: ${today}`);
          await updateDoc(swipeDataRef, {
            swipeCount: 0,
            lastSwipeDate: today,
            lastReset: new Date().toISOString()
          });
          setSwipeCount(0);
          setSwipeLimitReached(false);
          return { canSwipe: true, remaining: DAILY_SWIPE_LIMIT };
        }

        // Check if limit reached
        if (currentCount >= DAILY_SWIPE_LIMIT) {
          console.log(`⚠️ Daily swipe limit reached: ${currentCount}/${DAILY_SWIPE_LIMIT}`);
          setSwipeCount(currentCount);
          setSwipeLimitReached(true);
          return { canSwipe: false, reason: 'Daily swipe limit reached', remaining: 0 };
        }

        console.log(`✅ Swipe count: ${currentCount}/${DAILY_SWIPE_LIMIT} remaining`);
        setSwipeCount(currentCount);
        setSwipeLimitReached(false);
        return { canSwipe: true, remaining: DAILY_SWIPE_LIMIT - currentCount };
      } else {
        // First time swiping today
        console.log('🆕 First time swiping today, initializing swipe data');
        await setDoc(swipeDataRef, {
          swipeCount: 0,
          lastSwipeDate: today,
          lastReset: new Date().toISOString()
        });
        setSwipeCount(0);
        setSwipeLimitReached(false);
        return { canSwipe: true, remaining: DAILY_SWIPE_LIMIT };
      }
    } catch (error) {
      console.error('❌ Error checking swipe limit:', error);
      // Allow swiping if check fails to prevent blocking user
      return { canSwipe: true, remaining: DAILY_SWIPE_LIMIT };
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
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        console.error('❌ User not authenticated');
        return;
      }

      console.log('🔄 Loading stocks for user:', user.uid);

      // Check daily swipe limit
      const limitCheck = await checkDailySwipeLimit();
      console.log('📊 Daily swipe limit check:', limitCheck);

      // Load liked stocks
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userLikedStocks = userDoc.data()?.likedStocks || [];
      setLikedStocks(userLikedStocks);
      console.log('❤️ Loaded liked stocks:', userLikedStocks);

      // Load rejected stocks
      const rejectedSnap = await getDocs(collection(db, 'users', user.uid, 'rejected'));
      const rejectedData = rejectedSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRejectedStocks(rejectedData);
      console.log('❌ Loaded rejected stocks:', rejectedData.length);

      // Get generated stocks from the service
      let generatedStocks = [];
      try {
        console.log('🤖 Calling stock generation service...');
        generatedStocks = await stockGenerationService.generateDailyStocks();
        console.log('✅ Generated stocks with LLM summaries:', generatedStocks.length);
        
        if (generatedStocks.length > 0) {
          console.log('📊 Sample generated stock:', generatedStocks[0]);
        } else {
          console.warn('⚠️ No stocks generated by the service');
        }
      } catch (error) {
        console.error('❌ Error generating stocks:', error);
        Alert.alert(
          'Stock Generation Failed',
          `Unable to generate stock recommendations: ${error.message}\n\nPlease try again later or check your internet connection.`,
          [{ text: 'OK' }]
        );
        // Don't fall back to mock data, show the error to the user
        setStocks([]);
        return;
      }

      // Filter out already swiped stocks to prevent duplicates
      const swipedSymbols = [...userLikedStocks, ...rejectedData.map(s => s.symbol)];
      const availableStocks = generatedStocks.filter(stock => !swipedSymbols.includes(stock.symbol));
      setStocks(availableStocks);
      
      // Reset current index when stocks change
      setCurrentIndex(0);
      
      console.log(`✅ Loaded ${availableStocks.length} available stocks with LLM summaries`);
      console.log(`📊 Daily swipe limit: ${limitCheck.remaining}/${DAILY_SWIPE_LIMIT} remaining`);
      
      if (availableStocks.length === 0) {
        console.warn('⚠️ No available stocks to swipe');
        Alert.alert(
          'No Stocks Available',
          'No new stock recommendations are available at this time. Please try again later.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('❌ Error loading stocks:', error);
      Alert.alert(
        'Loading Failed',
        `Unable to load stock recommendations: ${error.message}\n\nPlease check your internet connection and try again.`,
        [{ text: 'OK' }]
      );
      // Don't fall back to mock data, show the error to the user
      setStocks([]);
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
        try {
          await deleteDoc(rejectedDoc.ref);
        } catch (error) {
          console.error('Error deleting rejected stock:', error);
          // Continue with the operation even if deletion fails
        }
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
        try {
          await deleteDoc(portfolioRef);
        } catch (error) {
          console.error('Error deleting portfolio entry:', error);
          // Continue with the operation even if deletion fails
        }
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
    if (!riskLevel) return '#6b7280'; // Default gray for undefined/null
    switch (riskLevel.toLowerCase()) {
      case 'low': return '#10b981';
      case 'medium': return '#f59e0b';
      case 'high': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getRecommendationColor = (recommendation) => {
    const rec = typeof recommendation === 'string' ? recommendation.toLowerCase() : 'hold';
    switch (rec) {
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

    // Ensure all stock properties have fallback values
    const safeStock = {
      symbol: typeof stock.symbol === 'string' ? stock.symbol : 'N/A',
      name: typeof stock.name === 'string' ? stock.name : (typeof stock.symbol === 'string' ? stock.symbol : 'Unknown Stock'),
      price: typeof stock.price === 'number' ? stock.price : 0,
      priceFormatted: typeof stock.priceFormatted === 'string' ? stock.priceFormatted : 
                     (typeof stock.price === 'number' ? `$${stock.price.toFixed(2)}` : '$0.00'),
      change: typeof stock.change === 'number' ? stock.change : 0,
      changePercent: typeof stock.changePercent === 'string' ? stock.changePercent : '+0.00%',
      sector: typeof stock.sector === 'string' ? stock.sector : 'Technology',
      industry: typeof stock.industry === 'string' ? stock.industry : 'Software',
      reason: typeof stock.reason === 'string' ? stock.reason : 'No analysis available',
      riskLevel: typeof stock.riskLevel === 'string' ? stock.riskLevel : 'medium',
      confidence: typeof stock.confidence === 'number' ? stock.confidence : 0.5,
      analysis: typeof stock.analysis === 'string' ? stock.analysis : (typeof stock.reason === 'string' ? stock.reason : 'No analysis available'),
      keyBenefits: Array.isArray(stock.keyBenefits) ? stock.keyBenefits : ['Growth potential', 'Strong fundamentals'],
      keyRisks: Array.isArray(stock.keyRisks) ? stock.keyRisks : ['Market volatility', 'Sector-specific risks'],
      targetPrice: typeof stock.targetPrice === 'string' ? stock.targetPrice : 
                   (typeof stock.price === 'number' ? `$${stock.price.toFixed(2)}` : '$0.00'),
      dividendYield: typeof stock.dividendYield === 'string' ? stock.dividendYield : 'N/A',
      marketCap: typeof stock.marketCap === 'string' ? stock.marketCap : 'N/A',
      growthPotential: typeof stock.growthPotential === 'string' ? stock.growthPotential : 'Medium',
      recommendation: typeof stock.recommendation === 'string' ? stock.recommendation : 'hold'
    };

    const rotate = position.x.interpolate({
      inputRange: [-width / 2, 0, width / 2],
      outputRange: ['-10deg', '0deg', '10deg'],
    });

    const scale = position.x.interpolate({
      inputRange: [-width / 2, 0, width / 2],
      outputRange: [0.95, 1, 0.95],
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
              { scale },
            ],
          },
        ]}
      >
        {/* Card Header with Gradient */}
        <View style={styles.cardHeader}>
          <View style={styles.stockInfo}>
            <Text style={styles.symbol}>{safeStock.symbol}</Text>
            <Text style={styles.name}>{safeStock.name}</Text>
          </View>
          <View style={styles.priceInfo}>
            <Text style={styles.price}>{safeStock.priceFormatted}</Text>
            <Text style={[styles.change, { color: safeStock.changePercent.startsWith('+') ? '#10b981' : '#ef4444' }]}>
              {safeStock.changePercent}
            </Text>
          </View>
        </View>

        {/* Recommendation Badge */}
        <View style={styles.recommendationBadgeContainer}>
          <View style={[styles.recommendationBadge, { backgroundColor: getRecommendationColor(safeStock.recommendation) }]}>
            <Text style={styles.recommendationBadgeText}>
              {typeof safeStock.recommendation === 'string' ? safeStock.recommendation.toUpperCase() : 'HOLD'}
            </Text>
          </View>
        </View>

        {/* Investment Analysis */}
        <View style={styles.analysisContainer}>
          <Text style={styles.analysisLabel}>Investment Analysis</Text>
          <Text style={styles.analysisText}>{safeStock.analysis}</Text>
        </View>

        {/* Key Metrics Grid */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Target Price</Text>
            <Text style={styles.metricValue}>{safeStock.targetPrice}</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Market Cap</Text>
            <Text style={styles.metricValue}>{safeStock.marketCap}</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Growth</Text>
            <Text style={styles.metricValue}>{safeStock.growthPotential}</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Dividend</Text>
            <Text style={styles.metricValue}>{safeStock.dividendYield}</Text>
          </View>
        </View>

        {/* Key Benefits */}
        {safeStock.keyBenefits && safeStock.keyBenefits.length > 0 && (
          <View style={styles.benefitsContainer}>
            <Text style={styles.benefitsLabel}>Key Benefits</Text>
            {safeStock.keyBenefits.map((benefit, index) => (
              <View key={index} style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                <Text style={styles.benefitText}>{benefit}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Key Risks */}
        {safeStock.keyRisks && safeStock.keyRisks.length > 0 && (
          <View style={styles.risksContainer}>
            <Text style={styles.risksLabel}>Key Risks</Text>
            {safeStock.keyRisks.map((risk, index) => (
              <View key={index} style={styles.riskItem}>
                <Ionicons name="warning" size={16} color="#ef4444" />
                <Text style={styles.riskText}>{risk}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Card Footer with Risk and Confidence */}
        <View style={styles.cardFooter}>
          <View style={styles.footerRow}>
            <View style={styles.riskContainer}>
              <Text style={styles.riskLabel}>Risk Level</Text>
              <View style={[styles.riskBadge, { backgroundColor: getRiskColor(safeStock.riskLevel) }]}>
                <Text style={styles.riskText}>{typeof safeStock.riskLevel === 'string' ? safeStock.riskLevel.toUpperCase() : 'MEDIUM'}</Text>
              </View>
            </View>
            <View style={styles.confidenceContainer}>
              <Text style={styles.confidenceLabel}>Confidence</Text>
              <Text style={styles.confidenceValue}>{Math.round(safeStock.confidence * 100)}%</Text>
            </View>
            <View style={styles.sectorContainer}>
              <Text style={styles.sectorLabel}>Sector</Text>
              <Text style={styles.sectorValue}>{safeStock.sector}</Text>
            </View>
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
          const stock = { symbol, name: symbol }; // Assuming MOCK_STOCKS is removed
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
          <Ionicons name="swap-horizontal" size={24} color={activeTab === 'swipe' ? '#6366f1' : '#94a3b8'} />
          <Text style={[styles.tabText, activeTab === 'swipe' && styles.activeTabText]}>
            Swipe ({stocks.length - currentIndex})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'liked' && styles.activeTab]}
          onPress={() => setActiveTab('liked')}
        >
          <Ionicons name="heart" size={24} color={activeTab === 'liked' ? '#10b981' : '#94a3b8'} />
          <Text style={[styles.tabText, activeTab === 'liked' && styles.activeTabText]}>
            Liked ({likedStocks.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'rejected' && styles.activeTab]}
          onPress={() => setActiveTab('rejected')}
        >
          <Ionicons name="close-circle" size={24} color={activeTab === 'rejected' ? '#ef4444' : '#94a3b8'} />
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    marginHorizontal: 6,
    minHeight: 60,
  },
  activeTab: {
    backgroundColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  tabText: {
    color: '#94a3b8',
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  stockCard: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 32,
    width: width - 48,
    maxWidth: 450,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
    marginVertical: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  stockInfo: {
    flex: 1,
  },
  symbol: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  name: {
    fontSize: 18,
    color: '#94a3b8',
    marginBottom: 4,
  },
  priceInfo: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  change: {
    fontSize: 18,
    fontWeight: '600',
  },
  recommendationBadgeContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  recommendationBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
  },
  recommendationBadgeText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  analysisContainer: {
    backgroundColor: '#334155',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  analysisLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
  },
  analysisText: {
    fontSize: 16,
    color: '#e2e8f0',
    lineHeight: 24,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 20,
  },
  metricItem: {
    width: '48%',
    marginBottom: 12,
    padding: 16,
    backgroundColor: '#334155',
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  metricLabel: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 6,
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  benefitsContainer: {
    backgroundColor: '#334155',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  benefitsLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  benefitText: {
    fontSize: 16,
    color: '#e2e8f0',
    marginLeft: 12,
    lineHeight: 22,
  },
  risksContainer: {
    backgroundColor: '#334155',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  risksLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
  },
  riskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  riskText: {
    fontSize: 16,
    color: '#ef4444',
    marginLeft: 12,
    lineHeight: 22,
  },
  cardFooter: {
    marginTop: 20,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  riskContainer: {
    alignItems: 'center',
  },
  riskLabel: {
    fontSize: 16,
    color: '#94a3b8',
    fontWeight: 'bold',
    marginBottom: 6,
  },
  riskBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  riskText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  confidenceContainer: {
    alignItems: 'center',
  },
  confidenceLabel: {
    fontSize: 16,
    color: '#94a3b8',
    fontWeight: 'bold',
    marginBottom: 6,
  },
  confidenceValue: {
    fontSize: 18,
    color: '#ffffff',
    fontWeight: '500',
  },
  sectorContainer: {
    alignItems: 'center',
  },
  sectorLabel: {
    fontSize: 16,
    color: '#94a3b8',
    fontWeight: 'bold',
    marginBottom: 6,
  },
  sectorValue: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '500',
  },
  swipeLimitContainer: {
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  swipeLimitText: {
    fontSize: 16,
    color: '#94a3b8',
    fontWeight: '500',
  },
  limitReachedText: {
    fontSize: 14,
    color: '#ef4444',
    marginTop: 6,
    textAlign: 'center',
  },
  swipeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 24,
    paddingHorizontal: 20,
  },
  swipeButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  rejectButton: {
    backgroundColor: '#1e293b',
    borderWidth: 3,
    borderColor: '#ef4444',
  },
  likeButton: {
    backgroundColor: '#1e293b',
    borderWidth: 3,
    borderColor: '#10b981',
  },
  noMoreStocks: {
    alignItems: 'center',
    padding: 60,
    justifyContent: 'center',
    flex: 1,
  },
  noMoreStocksTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 20,
    marginBottom: 12,
  },
  noMoreStocksSubtitle: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 24,
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
    padding: 20,
    marginBottom: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  listItemInfo: {
    flex: 1,
  },
  listItemSymbol: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 6,
  },
  listItemName: {
    fontSize: 16,
    color: '#94a3b8',
    marginBottom: 4,
  },
  listItemSector: {
    fontSize: 14,
    color: '#64748b',
  },
  moveButton: {
    padding: 12,
    backgroundColor: '#334155',
    borderRadius: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 60,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyStateSubtext: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 24,
  },
}); 
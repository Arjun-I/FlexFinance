import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { db } from '../firebase';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';

const Dashboard_New = ({ user, navigation }) => {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [portfolioHoldings, setPortfolioHoldings] = useState([]);
  const [portfolioValue, setPortfolioValue] = useState(0);
  const [cashBalance, setCashBalance] = useState(10000);
  const [totalReturn, setTotalReturn] = useState(0);
  const [totalReturnPercent, setTotalReturnPercent] = useState(0);

  const navigate = navigation?.navigate || (() => {});

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      if (!user?.uid) {
        console.log('❌ No user found');
        return;
      }

      console.log('📊 Dashboard: Starting data load...');
      
      // Load user profile first
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setProfile(userData);
        setCashBalance(userData.cashBalance || 10000);
        console.log('✅ User profile loaded successfully');
      } else {
        // Create default profile
        const newProfile = {
          email: user.email,
          cashBalance: 10000,
          createdAt: new Date(),
        };
        await setDoc(userDocRef, newProfile);
        setProfile(newProfile);
        setCashBalance(10000);
        console.log('🆕 Created new user profile');
      }

      // Load portfolio holdings
      const portfolioCollection = collection(db, 'users', user.uid, 'portfolio');
      const portfolioSnapshot = await getDocs(portfolioCollection);
      
      const holdings = [];
      let totalVal = 0;
      let totalCost = 0;
      
      portfolioSnapshot.forEach((docSnapshot) => {
        const holdingData = { id: docSnapshot.id, ...docSnapshot.data() };
        
        const price = holdingData.price || holdingData.averagePrice || 0;
        const shares = holdingData.shares || 0;
        const avgPrice = holdingData.averagePrice || price;
        
        const currentValue = shares * price;
        const costBasis = shares * avgPrice;
        
        holdings.push({
          ...holdingData,
          currentPrice: price,
          currentValue,
          costBasis,
          gain: currentValue - costBasis,
          gainPercent: costBasis > 0 ? ((currentValue - costBasis) / costBasis) * 100 : 0,
        });
        
        totalVal += currentValue;
        totalCost += costBasis;
      });
      
      setPortfolioHoldings(holdings);
      setPortfolioValue(totalVal);
      setTotalReturn(totalVal - totalCost);
      setTotalReturnPercent(totalCost > 0 ? ((totalVal - totalCost) / totalCost) * 100 : 0);
      
      console.log('✅ Dashboard data loaded successfully');
    } catch (error) {
      console.error('❌ Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount || 0);
  };

  const formatPercent = (percent) => {
    const sign = percent >= 0 ? '+' : '';
    return `${sign}${percent.toFixed(2)}%`;
  };

  // Sign out handled by App.js header

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading Dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Welcome Text Only - Header handled by App.js */}
      <View style={styles.welcomeContainer}>
        <Text style={styles.welcomeText}>Welcome back, {user?.email?.split('@')[0]}</Text>
      </View>

      {/* Portfolio Overview */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Portfolio Overview</Text>
        <View style={styles.statsContainer}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Total Value</Text>
            <Text style={styles.statValue}>{formatCurrency(portfolioValue + cashBalance)}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Cash Balance</Text>
            <Text style={styles.statValue}>{formatCurrency(cashBalance)}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Total Return</Text>
            <Text style={[styles.statValue, totalReturn >= 0 ? styles.positive : styles.negative]}>
              {formatCurrency(totalReturn)} ({formatPercent(totalReturnPercent)})
            </Text>
          </View>
        </View>
      </View>

      {/* Holdings */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Your Holdings</Text>
        {portfolioHoldings.length > 0 ? (
          portfolioHoldings.map((holding, index) => (
            <View key={index} style={styles.holdingRow}>
              <View style={styles.holdingInfo}>
                <Text style={styles.holdingSymbol}>{holding.symbol}</Text>
                <Text style={styles.holdingShares}>{holding.shares} shares @ {formatCurrency(holding.currentPrice)}</Text>
              </View>
              <View style={styles.holdingValues}>
                <Text style={styles.holdingValue}>{formatCurrency(holding.currentValue)}</Text>
                <Text style={[styles.holdingGain, holding.gain >= 0 ? styles.positive : styles.negative]}>
                  {formatCurrency(holding.gain)} ({formatPercent(holding.gainPercent)})
                </Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No holdings yet. Start trading to see your investments!</Text>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Quick Actions</Text>
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigate('StockComparison')}>
            <Text style={styles.buttonText}>Find Stocks</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigate('Portfolio')}>
            <Text style={styles.buttonText}>Portfolio</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigate('RiskQuiz')}>
            <Text style={styles.buttonText}>Risk Profile</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scrollContent: {
    padding: 16,
    paddingTop: 8, // Minimal since App.js handles header
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#e2e8f0',
  },
  welcomeContainer: {
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  welcomeText: {
    fontSize: 18,
    color: '#94a3b8',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
  },
  statsContainer: {
    gap: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 14,
    color: '#94a3b8',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  positive: {
    color: '#10b981',
  },
  negative: {
    color: '#ef4444',
  },
  holdingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  holdingInfo: {
    flex: 1,
  },
  holdingSymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  holdingShares: {
    fontSize: 12,
    color: '#94a3b8',
  },
  holdingValues: {
    alignItems: 'flex-end',
  },
  holdingValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  holdingGain: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 12,
  },
  actionButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flex: 1,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default Dashboard_New;

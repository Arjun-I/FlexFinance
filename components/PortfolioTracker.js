import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, getDoc, doc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import yahooFinanceService from '../services/yahooFinanceService';

export default function PortfolioTracker() {
  const [portfolioValue, setPortfolioValue] = useState(0);
  const [cashBalance, setCashBalance] = useState(0);
  const [holdings, setHoldings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [errors, setErrors] = useState([]);
  const [hasError, setHasError] = useState(false);

  const fetchPortfolioData = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      setLoading(true);
      setErrors([]);
      setHasError(false);

      // Get user's cash balance
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();
      const cash = userData?.cashBalance || 100000;
      setCashBalance(cash);

      // Get portfolio holdings
      const portfolioSnap = await getDocs(collection(db, 'users', user.uid, 'portfolio'));
      const holdingsData = portfolioSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).filter(holding => holding.shares > 0);

      setHoldings(holdingsData);

      if (holdingsData.length === 0) {
        setPortfolioValue(cash);
        setLastUpdated(new Date());
        return;
      }

      // Get real-time prices for all holdings with error handling
      try {
        const portfolioUpdate = await yahooFinanceService.getPortfolioValue(holdingsData, user.uid);
        
        setPortfolioValue(portfolioUpdate.totalValue + cash);
        setHoldings(portfolioUpdate.holdings);
        setErrors(portfolioUpdate.errors);
        setLastUpdated(new Date());
      } catch (priceError) {
        console.error('Error fetching prices:', priceError);
        // Use cached prices if available
        const totalValue = holdingsData.reduce((sum, holding) => {
          return sum + (holding.shares * (holding.averagePrice || 0));
        }, cash);
        setPortfolioValue(totalValue);
        setHoldings(holdingsData.map(h => ({
          ...h,
          currentPrice: h.averagePrice || 0,
          currentValue: h.shares * (h.averagePrice || 0),
          change: 0,
          changePercent: '0.00%'
        })));
        setErrors(['Using cached prices - real-time data unavailable']);
      }

    } catch (error) {
      console.error('Error fetching portfolio data:', error);
      setHasError(true);
      setErrors(['Failed to load portfolio data']);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolioData();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchPortfolioData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatPercentage = (value) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const getChangeColor = (change) => {
    return change >= 0 ? '#10b981' : '#ef4444';
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Updating portfolio...</Text>
        </View>
      </View>
    );
  }

  if (hasError) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="warning" size={48} color="#ef4444" />
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorText}>Unable to load portfolio data</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchPortfolioData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Portfolio Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Portfolio Value</Text>
        <Text style={styles.summaryValue}>{formatCurrency(portfolioValue)}</Text>
        <Text style={styles.summarySubtitle}>
          Cash: {formatCurrency(cashBalance)} • {holdings.length} Holdings
        </Text>
        {lastUpdated && (
          <Text style={styles.lastUpdated}>
            Last updated: {lastUpdated.toLocaleTimeString()}
          </Text>
        )}
      </View>

      {/* Holdings List */}
      {holdings.length > 0 && (
        <View style={styles.holdingsContainer}>
          <Text style={styles.holdingsTitle}>Your Holdings</Text>
          {holdings.map((holding) => (
            <View key={holding.id} style={styles.holdingItem}>
              <View style={styles.holdingHeader}>
                <Text style={styles.symbol}>{holding.symbol}</Text>
                <Text style={styles.shares}>{holding.shares} shares</Text>
              </View>
              
              <View style={styles.holdingDetails}>
                <View style={styles.priceInfo}>
                  <Text style={styles.currentPrice}>
                    {formatCurrency(holding.currentPrice)}
                  </Text>
                  <Text style={[
                    styles.changePercent,
                    { color: getChangeColor(holding.changePercent) }
                  ]}>
                    {formatPercentage(holding.changePercent)}
                  </Text>
                </View>
                
                <View style={styles.valueInfo}>
                  <Text style={styles.totalValue}>
                    {formatCurrency(holding.currentValue)}
                  </Text>
                  <Text style={styles.avgPrice}>
                    Avg: {formatCurrency(holding.averagePrice)}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <View style={styles.errorsContainer}>
          <Text style={styles.errorsTitle}>Update Errors</Text>
          {errors.map((error, index) => (
            <Text key={index} style={styles.errorText}>
              {error.symbol}: {error.error}
            </Text>
          ))}
        </View>
      )}

      {/* Refresh Button */}
      <TouchableOpacity
        style={styles.refreshButton}
        onPress={fetchPortfolioData}
        disabled={loading}
      >
        <Ionicons 
          name="refresh" 
          size={20} 
          color="#ffffff" 
        />
        <Text style={styles.refreshText}>Refresh Portfolio</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 16,
    marginTop: 12,
  },
  summaryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  summaryTitle: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
  },
  summaryValue: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 4,
  },
  summarySubtitle: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 8,
  },
  lastUpdated: {
    color: '#64748b',
    fontSize: 10,
    marginTop: 4,
  },
  holdingsContainer: {
    marginBottom: 20,
  },
  holdingsTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  holdingItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  holdingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  symbol: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  shares: {
    color: '#94a3b8',
    fontSize: 12,
  },
  holdingDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  priceInfo: {
    alignItems: 'flex-start',
  },
  currentPrice: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  changePercent: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
  },
  valueInfo: {
    alignItems: 'flex-end',
  },
  totalValue: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  avgPrice: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  errorsContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  errorsTitle: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginBottom: 4,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ef4444',
    marginTop: 16,
    marginBottom: 8,
  },
  retryButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  refreshButton: {
    backgroundColor: '#6366f1',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
}); 
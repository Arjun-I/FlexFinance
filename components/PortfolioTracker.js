// PortfolioTracker.js - Enhanced Portfolio Tracking with Cash/Equity Separation
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getStockQuote, getMultipleQuotes } from '../services/finnhubService';

export default function PortfolioTracker({ portfolio, cashBalance, onRefresh, onPortfolioValueChange }) {
  const [holdings, setHoldings] = useState([]);
  const [totalEquity, setTotalEquity] = useState(0);
  const [totalValue, setTotalValue] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    updatePortfolioData();
  }, [portfolio]);

  const updatePortfolioData = async () => {
    try {
      if (!portfolio || portfolio.length === 0) {
        setHoldings([]);
        setTotalEquity(0);
        setTotalValue(cashBalance || 0);
        return;
      }

      // Get current prices for all holdings
      const symbols = portfolio.map(holding => holding.symbol);
      const quotes = await getMultipleQuotes(symbols);

      // Update holdings with current prices
      const updatedHoldings = portfolio.map(holding => {
        const quote = quotes.find(q => q.symbol === holding.symbol);
        const currentPrice = quote ? quote.price : holding.averagePrice || 0;
        const currentValue = holding.shares * currentPrice;
        const change = currentPrice - (holding.averagePrice || 0);
        const changePercent = holding.averagePrice ? (change / holding.averagePrice) * 100 : 0;

        return {
          ...holding,
          currentPrice,
          currentValue,
          change,
          changePercent,
          changeFormatted: `${change >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`,
        };
      });

      const equity = updatedHoldings.reduce((sum, holding) => sum + holding.currentValue, 0);
      const total = equity + (cashBalance || 0);

      setHoldings(updatedHoldings);
      setTotalEquity(equity);
      setTotalValue(total);
      setLastUpdated(new Date());
      
      // Notify parent component of portfolio value change
      if (onPortfolioValueChange) {
        onPortfolioValueChange(total);
      }
    } catch (error) {
      console.error('Error updating portfolio data:', error);
    }
  };

  const onRefreshPortfolio = async () => {
    setRefreshing(true);
    await updatePortfolioData();
    if (onRefresh) onRefresh();
    setRefreshing(false);
  };

  // Auto-refresh prices every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (portfolio && portfolio.length > 0) {
        console.log('🔄 Auto-refreshing portfolio prices...');
        updatePortfolioData();
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [portfolio]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatPercentage = (percentage) => {
    if (typeof percentage === 'string') {
      return percentage;
    }
    return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(2)}%`;
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Portfolio Summary */}
      <View style={styles.summaryContainer}>
        <Text style={styles.summaryTitle}>Portfolio Overview</Text>
        
        {/* Total Value */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Value</Text>
            <Text style={styles.summaryValue}>{formatCurrency(totalValue)}</Text>
          </View>
        </View>

        {/* Cash vs Equity Breakdown */}
        <View style={styles.breakdownContainer}>
          <View style={styles.breakdownCard}>
            <View style={styles.breakdownHeader}>
              <Ionicons name="wallet" size={20} color="#10b981" />
              <Text style={styles.breakdownTitle}>Liquid Cash</Text>
            </View>
            <Text style={styles.breakdownValue}>{formatCurrency(cashBalance || 0)}</Text>
            <Text style={styles.breakdownPercentage}>
              {totalValue > 0 ? `${((cashBalance || 0) / totalValue * 100).toFixed(1)}%` : '0%'}
            </Text>
          </View>

          <View style={styles.breakdownCard}>
            <View style={styles.breakdownHeader}>
              <Ionicons name="trending-up" size={20} color="#6366f1" />
              <Text style={styles.breakdownTitle}>Equity</Text>
            </View>
            <Text style={styles.breakdownValue}>{formatCurrency(totalEquity)}</Text>
            <Text style={styles.breakdownPercentage}>
              {totalValue > 0 ? `${(totalEquity / totalValue * 100).toFixed(1)}%` : '0%'}
            </Text>
          </View>
        </View>

        {/* Last Updated */}
        {lastUpdated && (
          <Text style={styles.lastUpdated}>
            Last updated: {lastUpdated.toLocaleTimeString()}
          </Text>
        )}
      </View>

      {/* Holdings List */}
      {holdings.length > 0 ? (
        <View style={styles.holdingsContainer}>
          <View style={styles.holdingsHeader}>
            <Text style={styles.holdingsTitle}>Your Holdings</Text>
            <TouchableOpacity onPress={onRefreshPortfolio} style={styles.refreshButton}>
              <Ionicons name="refresh" size={20} color="#6366f1" />
            </TouchableOpacity>
          </View>

          {holdings.map((holding, index) => (
            <View key={index} style={styles.holdingCard}>
              <View style={styles.holdingHeader}>
                <View style={styles.holdingInfo}>
                  <Text style={styles.holdingSymbol}>{holding.symbol}</Text>
                  <Text style={styles.holdingShares}>{holding.shares} shares</Text>
                </View>
                <View style={styles.holdingValue}>
                  <Text style={styles.holdingPrice}>
                    {formatCurrency(holding.currentPrice)}
                  </Text>
                  <Text style={[
                    styles.holdingChange,
                    { color: holding.change >= 0 ? '#10b981' : '#ef4444' }
                  ]}>
                    {formatPercentage(holding.changePercent)}
                  </Text>
                </View>
              </View>

              <View style={styles.holdingDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Total Value</Text>
                  <Text style={styles.detailValue}>
                    {formatCurrency(holding.currentValue)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Avg Price</Text>
                  <Text style={styles.detailValue}>
                    {formatCurrency(holding.averagePrice || 0)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Gain/Loss</Text>
                  <Text style={[
                    styles.detailValue,
                    { color: holding.change >= 0 ? '#10b981' : '#ef4444' }
                  ]}>
                    {formatCurrency(holding.change * holding.shares)}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="trending-up" size={60} color="#6366f1" />
          <Text style={styles.emptyTitle}>No Holdings Yet</Text>
          <Text style={styles.emptySubtitle}>
            Start building your portfolio by accepting stock recommendations
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  summaryContainer: {
    padding: 20,
    backgroundColor: '#1e293b',
  },
  summaryTitle: {
    color: '#f1f5f9',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  summaryCard: {
    backgroundColor: '#334155',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    color: '#94a3b8',
    fontSize: 16,
  },
  summaryValue: {
    color: '#f1f5f9',
    fontSize: 20,
    fontWeight: 'bold',
  },
  breakdownContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  breakdownCard: {
    flex: 1,
    backgroundColor: '#334155',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  breakdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  breakdownTitle: {
    color: '#94a3b8',
    fontSize: 14,
    marginLeft: 6,
  },
  breakdownValue: {
    color: '#f1f5f9',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  breakdownPercentage: {
    color: '#6366f1',
    fontSize: 12,
    fontWeight: '500',
  },
  lastUpdated: {
    color: '#64748b',
    fontSize: 12,
    textAlign: 'center',
  },
  holdingsContainer: {
    flex: 1,
    padding: 20,
  },
  holdingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  holdingsTitle: {
    color: '#f1f5f9',
    fontSize: 18,
    fontWeight: 'bold',
  },
  refreshButton: {
    padding: 8,
  },
  holdingsList: {
    flex: 1,
  },
  holdingCard: {
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  holdingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  holdingInfo: {
    flex: 1,
  },
  holdingSymbol: {
    color: '#f1f5f9',
    fontSize: 18,
    fontWeight: 'bold',
  },
  holdingShares: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  holdingValue: {
    alignItems: 'flex-end',
  },
  holdingPrice: {
    color: '#f1f5f9',
    fontSize: 16,
    fontWeight: 'bold',
  },
  holdingChange: {
    fontSize: 14,
    fontWeight: '500',
  },
  holdingDetails: {
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  detailLabel: {
    color: '#94a3b8',
    fontSize: 12,
  },
  detailValue: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    color: '#f1f5f9',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
  },
  emptySubtitle: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
}); 
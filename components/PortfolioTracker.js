// PortfolioTracker.js - Enhanced Portfolio Tracking with Cash/Equity Separation
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getStockQuote, getMultipleQuotes } from '../services/finnhubService';
import { auth, db } from '../firebase';
import { doc, updateDoc, collection, getDocs, deleteDoc, addDoc } from 'firebase/firestore';

export default function PortfolioTracker({ portfolio, cashBalance, onRefresh, onPortfolioValueChange }) {
  const [holdings, setHoldings] = useState([]);
  const [totalEquity, setTotalEquity] = useState(0);
  const [totalValue, setTotalValue] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [tradingStock, setTradingStock] = useState(null);
  const [tradeAmount, setTradeAmount] = useState('');

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
        const currentPrice = parseFloat(quote ? quote.price : holding.averagePrice) || 0;
        const shares = parseFloat(holding.shares) || 0;
        const averagePrice = parseFloat(holding.averagePrice) || 0;
        const currentValue = shares * currentPrice;
        
        const changeAbsolute = quote && typeof quote.previousClose === 'number'
          ? currentPrice - quote.previousClose
          : currentPrice - averagePrice;
        const changePercent = quote && typeof quote.previousClose === 'number' && quote.previousClose > 0
          ? (changeAbsolute / quote.previousClose) * 100
          : (averagePrice > 0 ? ((currentPrice - averagePrice) / averagePrice) * 100 : 0);

        return {
          ...holding,
          shares,
          averagePrice,
          currentPrice: isNaN(currentPrice) ? 0 : currentPrice,
          currentValue: isNaN(currentValue) ? 0 : currentValue,
          change: isNaN(changeAbsolute) ? 0 : changeAbsolute,
          changePercent: isNaN(changePercent) ? 0 : changePercent,
          changeFormatted: `${changePercent >= 0 ? '+' : ''}${(isNaN(changePercent) ? 0 : changePercent).toFixed(2)}%`,
        };
      });

      const equity = updatedHoldings.reduce((sum, holding) => {
        const value = parseFloat(holding.currentValue) || 0;
        return sum + (isNaN(value) ? 0 : value);
      }, 0);
      const cashBal = parseFloat(cashBalance) || 0;
      const total = equity + cashBal;

      setHoldings(updatedHoldings);
      setTotalEquity(equity);
      setTotalValue(total);
      setLastUpdated(new Date());
      
      // Notify parent component of portfolio value change
      if (onPortfolioValueChange) {
        const safeTotal = isNaN(total) ? 0 : total;
        onPortfolioValueChange(safeTotal);
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

  const openTradeModal = (holding, action) => {
    setTradingStock({ ...holding, action });
    setTradeAmount('');
  };

  const executeTrading = async () => {
    if (!tradingStock || !tradeAmount) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Error', 'Please log in to trade');
      return;
    }

    try {
      const shares = parseInt(tradeAmount);
      if (isNaN(shares) || shares <= 0) {
        Alert.alert('Error', 'Please enter a valid number of shares');
        return;
      }

      const currentPrice = await getStockQuote(tradingStock.symbol);
      const price = currentPrice.price;
      const totalCost = shares * price;

      if (tradingStock.action === 'buy') {
        // Buy logic
        if (totalCost > cashBalance) {
          Alert.alert('Error', 'Insufficient funds');
          return;
        }

        const portfolioRef = collection(db, 'users', user.uid, 'portfolio');
        const portfolioSnap = await getDocs(portfolioRef);
        const existingPosition = portfolioSnap.docs.find(doc => doc.data().symbol === tradingStock.symbol);

        if (existingPosition) {
          // Update existing position
          const existingData = existingPosition.data();
          const newShares = existingData.shares + shares;
          const newTotalCost = existingData.totalCost + totalCost;
          const newAveragePrice = newTotalCost / newShares;

          await updateDoc(existingPosition.ref, {
            shares: newShares,
            totalCost: newTotalCost,
            averagePrice: newAveragePrice,
            lastUpdated: new Date().toISOString()
          });
        } else {
          // Create new position
          await addDoc(portfolioRef, {
            symbol: tradingStock.symbol,
            name: tradingStock.name || tradingStock.symbol,
            shares: shares,
            averagePrice: price,
            totalCost: totalCost,
            sector: tradingStock.sector || 'Unknown',
            industry: tradingStock.industry || 'Unknown',
            purchaseDate: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
          });
        }

        // Update cash balance
        await updateDoc(doc(db, 'users', user.uid), {
          cashBalance: cashBalance - totalCost
        });

        Alert.alert(
          '✅ Purchase Successful',
          `Bought ${shares} shares of ${tradingStock.symbol}\n\n` +
          `• Price per share: ${formatCurrency(price)}\n` +
          `• Total cost: ${formatCurrency(totalCost)}\n` +
          `• Remaining cash: ${formatCurrency(cashBalance - totalCost)}`,
          [{ text: 'Great!', style: 'default' }]
        );
      } else if (tradingStock.action === 'sell') {
        // Sell logic
        if (shares > tradingStock.shares) {
          Alert.alert('Error', `You only have ${tradingStock.shares} shares to sell`);
          return;
        }

        const portfolioRef = collection(db, 'users', user.uid, 'portfolio');
        const portfolioSnap = await getDocs(portfolioRef);
        const existingPosition = portfolioSnap.docs.find(doc => doc.data().symbol === tradingStock.symbol);

        if (existingPosition) {
          const existingData = existingPosition.data();
          const newShares = existingData.shares - shares;
          const soldValue = shares * price;

          if (newShares === 0) {
            // Delete position entirely
            await deleteDoc(existingPosition.ref);
          } else {
            // Update position
            const newTotalCost = existingData.totalCost - (shares * existingData.averagePrice);
            await updateDoc(existingPosition.ref, {
              shares: newShares,
              totalCost: newTotalCost,
              lastUpdated: new Date().toISOString()
            });
          }

          // Update cash balance
          await updateDoc(doc(db, 'users', user.uid), {
            cashBalance: cashBalance + soldValue
          });

          const profit = soldValue - (shares * existingData.averagePrice);
          Alert.alert(
            '💰 Sale Successful', 
            `Sold ${shares} shares of ${tradingStock.symbol}\n\n` +
            `• Sale price: ${formatCurrency(price)} per share\n` +
            `• Total received: ${formatCurrency(soldValue)}\n` +
            `• Profit/Loss: ${profit >= 0 ? '+' : ''}${formatCurrency(Math.abs(profit))} ${profit >= 0 ? '📈' : '📉'}\n` +
            `• New cash balance: ${formatCurrency(cashBalance + soldValue)}`,
            [{ text: 'Excellent!', style: 'default' }]
          );
        }
      }

      setTradingStock(null);
      setTradeAmount('');
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Trading error:', error);
      Alert.alert('Error', 'Failed to execute trade. Please try again.');
    }
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
                
                {/* Trade Actions */}
                <View style={styles.actionsRow}>
                  <TouchableOpacity 
                    style={styles.buyButton}
                    onPress={() => openTradeModal(holding, 'buy')}
                  >
                    <Ionicons name="trending-up" size={16} color="#ffffff" />
                    <Text style={styles.actionButtonText}>
                      {holding.shares === 0 ? 'Buy Shares' : 'Buy More'}
                    </Text>
                  </TouchableOpacity>
                  
                  {holding.shares > 0 && (
                    <TouchableOpacity 
                      style={styles.sellButton}
                      onPress={() => openTradeModal(holding, 'sell')}
                    >
                      <Ionicons name="trending-down" size={16} color="#ffffff" />
                      <Text style={styles.actionButtonText}>Sell Shares</Text>
                    </TouchableOpacity>
                  )}
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

      {/* Trading Modal */}
      <Modal
        visible={tradingStock !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setTradingStock(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {tradingStock?.action === 'buy' ? 
                (tradingStock?.shares === 0 ? 'Buy Shares' : 'Buy More Shares') : 
                'Sell Shares'} - {tradingStock?.symbol}
            </Text>
            
            <View style={styles.modalInfo}>
              <Text style={styles.modalInfoText}>
                Current Price: {tradingStock ? formatCurrency(tradingStock.currentPrice || 0) : '$0.00'}
              </Text>
              <Text style={styles.modalInfoText}>
                Available Cash: {formatCurrency(cashBalance || 0)}
              </Text>
              {tradingStock?.action === 'sell' && (
                <Text style={styles.modalInfoText}>
                  You Own: {tradingStock.shares} shares ({formatCurrency((tradingStock.shares || 0) * (tradingStock.currentPrice || 0))})
                </Text>
              )}
              {tradingStock?.action === 'buy' && tradingStock?.shares > 0 && (
                <Text style={styles.modalInfoText}>
                  Current Position: {tradingStock.shares} shares
                </Text>
              )}
              {tradingStock?.action === 'buy' && (
                <Text style={styles.modalInfoText}>
                  Total Cost: {formatCurrency((parseInt(tradeAmount) || 0) * (tradingStock.currentPrice || 0))}
                </Text>
              )}
            </View>

            <TextInput
              style={styles.modalInput}
              placeholder="Number of shares"
              value={tradeAmount}
              onChangeText={setTradeAmount}
              keyboardType="numeric"
              placeholderTextColor="#94a3b8"
            />
            
            {/* Show estimated cost/proceeds */}
            {tradeAmount && tradingStock && (
              <View style={styles.estimateContainer}>
                <Text style={styles.estimateText}>
                  {tradingStock.action === 'buy' ? 'Estimated Cost:' : 'Estimated Proceeds:'} {' '}
                  <Text style={[styles.estimateAmount, { 
                    color: tradingStock.action === 'buy' ? '#ef4444' : '#10b981' 
                  }]}>
                    {formatCurrency((parseInt(tradeAmount) || 0) * (tradingStock.currentPrice || 0))}
                  </Text>
                </Text>
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={executeTrading}
              >
                <Text style={styles.modalButtonText}>
                  {tradingStock?.action === 'buy' ? 'Buy' : 'Sell'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setTradingStock(null)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  buyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
    justifyContent: 'center',
  },
  sellButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    marginLeft: 8,
    justifyContent: 'center',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 20,
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalInfo: {
    marginBottom: 16,
  },
  modalInfoText: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 4,
  },
  modalInput: {
    backgroundColor: '#334155',
    color: '#ffffff',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    backgroundColor: '#10b981',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#ef4444',
  },
  modalButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  estimateContainer: {
    backgroundColor: '#1e293b',
    padding: 12,
    borderRadius: 6,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  estimateText: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
  },
  estimateAmount: {
    fontWeight: 'bold',
    fontSize: 16,
  },
}); 
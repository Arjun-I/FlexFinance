import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BarChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width;

const Portfolio = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('1M');

  const portfolioData = {
    totalValue: 125430.50,
    totalCost: 110000,
    totalGain: 15430.50,
    gainPercentage: 14.03,
    holdings: [
      {
        id: '1',
        symbol: 'AAPL',
        name: 'Apple Inc.',
        shares: 50,
        currentPrice: 185.42,
        totalValue: 9271,
        costBasis: 165.30,
        totalCost: 8265,
        gain: 1006,
        gainPercentage: 12.17,
        allocation: 7.4,
      },
      {
        id: '2',
        symbol: 'MSFT',
        name: 'Microsoft Corporation',
        shares: 40,
        currentPrice: 415.26,
        totalValue: 16610.40,
        costBasis: 380.50,
        totalCost: 15220,
        gain: 1390.40,
        gainPercentage: 9.13,
        allocation: 13.2,
      },
      {
        id: '3',
        symbol: 'GOOGL',
        name: 'Alphabet Inc.',
        shares: 25,
        currentPrice: 142.56,
        totalValue: 3564,
        costBasis: 135.20,
        totalCost: 3380,
        gain: 184,
        gainPercentage: 5.44,
        allocation: 2.8,
      },
      {
        id: '4',
        symbol: 'VTI',
        name: 'Vanguard Total Stock Market ETF',
        shares: 200,
        currentPrice: 245.30,
        totalValue: 49060,
        costBasis: 230.15,
        totalCost: 46030,
        gain: 3030,
        gainPercentage: 6.58,
        allocation: 39.1,
      },
      {
        id: '5',
        symbol: 'BTC',
        name: 'Bitcoin',
        shares: 0.5,
        currentPrice: 67430,
        totalValue: 33715,
        costBasis: 58200,
        totalCost: 29100,
        gain: 4615,
        gainPercentage: 15.86,
        allocation: 26.9,
      },
    ]
  };

  const performanceData = {
    labels: ['1W', '1M', '3M', '6M', '1Y'],
    datasets: [{
      data: [1.2, 3.5, 8.2, 12.1, 14.03]
    }]
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const renderHoldingItem = ({ item }) => (
    <TouchableOpacity style={styles.holdingCard}>
      <View style={styles.holdingHeader}>
        <View style={styles.holdingInfo}>
          <Text style={styles.holdingSymbol}>{item.symbol}</Text>
          <Text style={styles.holdingName}>{item.name}</Text>
        </View>
        <View style={styles.holdingValue}>
          <Text style={styles.holdingPrice}>{formatCurrency(item.currentPrice)}</Text>
          <View style={styles.gainContainer}>
            <Ionicons 
              name={item.gain > 0 ? "trending-up" : "trending-down"} 
              size={16} 
              color={item.gain > 0 ? "#28A745" : "#DC3545"} 
            />
            <Text style={[
              styles.gainText,
              { color: item.gain > 0 ? "#28A745" : "#DC3545" }
            ]}>
              {item.gain > 0 ? '+' : ''}{item.gainPercentage.toFixed(2)}%
            </Text>
          </View>
        </View>
      </View>
      
      <View style={styles.holdingDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Shares:</Text>
          <Text style={styles.detailValue}>{item.shares}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Total Value:</Text>
          <Text style={styles.detailValue}>{formatCurrency(item.totalValue)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Total Gain/Loss:</Text>
          <Text style={[
            styles.detailValue,
            { color: item.gain > 0 ? "#28A745" : "#DC3545" }
          ]}>
            {item.gain > 0 ? '+' : ''}{formatCurrency(item.gain)}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Allocation:</Text>
          <Text style={styles.detailValue}>{item.allocation}%</Text>
        </View>
      </View>

      <View style={styles.allocationBar}>
        <View 
          style={[
            styles.allocationFill,
            { 
              width: `${item.allocation}%`,
              backgroundColor: item.gain > 0 ? "#28A745" : "#DC3545"
            }
          ]} 
        />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Portfolio Summary Header */}
        <LinearGradient
          colors={['#1B365D', '#2E5984']}
          style={styles.header}
        >
          <Text style={styles.headerTitle}>Portfolio Overview</Text>
          <View style={styles.summaryContainer}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Value</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(portfolioData.totalValue)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Gain/Loss</Text>
              <View style={styles.gainRow}>
                <Ionicons 
                  name="trending-up" 
                  size={20} 
                  color="#28A745" 
                />
                <Text style={[styles.summaryValue, { color: '#28A745' }]}>
                  +{formatCurrency(portfolioData.totalGain)}
                </Text>
              </View>
              <Text style={[styles.summaryPercentage, { color: '#28A745' }]}>
                +{portfolioData.gainPercentage.toFixed(2)}%
              </Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          {/* Performance Chart */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Performance</Text>
              <View style={styles.periodSelector}>
                {['1W', '1M', '3M', '6M', '1Y'].map((period) => (
                  <TouchableOpacity
                    key={period}
                    style={[
                      styles.periodButton,
                      selectedPeriod === period && styles.periodButtonActive
                    ]}
                    onPress={() => setSelectedPeriod(period)}
                  >
                    <Text style={[
                      styles.periodText,
                      selectedPeriod === period && styles.periodTextActive
                    ]}>
                      {period}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            <View style={styles.chartContainer}>
              <BarChart
                data={performanceData}
                width={screenWidth - 40}
                height={200}
                chartConfig={{
                  backgroundColor: '#FFFFFF',
                  backgroundGradientFrom: '#FFFFFF',
                  backgroundGradientTo: '#FFFFFF',
                  decimalPlaces: 1,
                  color: (opacity = 1) => `rgba(27, 54, 93, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  style: {
                    borderRadius: 16,
                  },
                }}
                style={styles.chart}
                showValuesOnTopOfBars
                fromZero
              />
            </View>
          </View>

          {/* Quick Stats */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Stats</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Ionicons name="pie-chart" size={24} color="#1B365D" />
                <Text style={styles.statValue}>{portfolioData.holdings.length}</Text>
                <Text style={styles.statLabel}>Holdings</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="trending-up" size={24} color="#28A745" />
                <Text style={styles.statValue}>
                  {portfolioData.holdings.filter(h => h.gain > 0).length}
                </Text>
                <Text style={styles.statLabel}>Gainers</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="trending-down" size={24} color="#DC3545" />
                <Text style={styles.statValue}>
                  {portfolioData.holdings.filter(h => h.gain < 0).length}
                </Text>
                <Text style={styles.statLabel}>Losers</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="cash" size={24} color="#FFD700" />
                <Text style={styles.statValue}>
                  {formatCurrency(portfolioData.totalCost)}
                </Text>
                <Text style={styles.statLabel}>Cost Basis</Text>
              </View>
            </View>
          </View>

          {/* Holdings List */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Holdings</Text>
              <TouchableOpacity style={styles.sortButton}>
                <Ionicons name="swap-vertical" size={20} color="#1B365D" />
                <Text style={styles.sortText}>Sort</Text>
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={portfolioData.holdings}
              renderItem={renderHoldingItem}
              keyExtractor={item => item.id}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          </View>

          {/* Portfolio Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Portfolio Actions</Text>
            <View style={styles.actionsContainer}>
              <TouchableOpacity style={styles.actionCard}>
                <LinearGradient
                  colors={['#2E8B57', '#3CB371']}
                  style={styles.actionIcon}
                >
                  <Ionicons name="add" size={24} color="white" />
                </LinearGradient>
                <Text style={styles.actionTitle}>Buy More</Text>
                <Text style={styles.actionDescription}>Add to existing positions</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionCard}>
                <LinearGradient
                  colors={['#FF6B6B', '#FF8E53']}
                  style={styles.actionIcon}
                >
                  <Ionicons name="remove" size={24} color="white" />
                </LinearGradient>
                <Text style={styles.actionTitle}>Sell Holdings</Text>
                <Text style={styles.actionDescription}>Reduce positions</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionCard}>
                <LinearGradient
                  colors={['#4ECDC4', '#44A08D']}
                  style={styles.actionIcon}
                >
                  <Ionicons name="refresh" size={24} color="white" />
                </LinearGradient>
                <Text style={styles.actionTitle}>Rebalance</Text>
                <Text style={styles.actionDescription}>Optimize allocation</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  header: {
    padding: 20,
    paddingTop: 40,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#B8D4E3',
    marginBottom: 5,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  summaryPercentage: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  gainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 25,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1B365D',
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    padding: 4,
  },
  periodButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  periodButtonActive: {
    backgroundColor: '#1B365D',
  },
  periodText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  periodTextActive: {
    color: '#FFFFFF',
  },
  chartContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    width: '48%',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B365D',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
  },
  sortText: {
    fontSize: 14,
    color: '#1B365D',
    marginLeft: 4,
    fontWeight: '500',
  },
  holdingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  holdingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  holdingInfo: {
    flex: 1,
  },
  holdingSymbol: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B365D',
  },
  holdingName: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  holdingValue: {
    alignItems: 'flex-end',
  },
  holdingPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  gainContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  gainText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  holdingDetails: {
    marginBottom: 15,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  allocationBar: {
    height: 4,
    backgroundColor: '#F0F0F0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  allocationFill: {
    height: '100%',
    borderRadius: 2,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1B365D',
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});

export default Portfolio;
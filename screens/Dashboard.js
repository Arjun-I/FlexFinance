import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, PieChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width;

const Dashboard = () => {
  // Sample data - in a real app, this would come from your API/Firebase
  const portfolioData = {
    totalValue: 125430.50,
    todayChange: 2345.67,
    changePercentage: 1.91,
    investments: [
      { name: 'Stocks', value: 75000, percentage: 59.8, color: '#1B365D' },
      { name: 'Bonds', value: 30000, percentage: 23.9, color: '#2E8B57' },
      { name: 'Crypto', value: 15000, percentage: 12.0, color: '#FFD700' },
      { name: 'Cash', value: 5430.50, percentage: 4.3, color: '#4A7BA7' },
    ],
    recentTransactions: [
      { type: 'buy', stock: 'AAPL', amount: 1250, time: '2 hours ago' },
      { type: 'sell', stock: 'TSLA', amount: 850, time: '1 day ago' },
      { type: 'dividend', stock: 'VTI', amount: 125, time: '3 days ago' },
    ],
  };

  const chartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        data: [115000, 118000, 120000, 122000, 121000, 125430],
        color: (opacity = 1) => `rgba(27, 54, 93, ${opacity})`,
        strokeWidth: 3,
      },
    ],
  };

  const pieData = portfolioData.investments.map(investment => ({
    name: investment.name,
    population: investment.value,
    color: investment.color,
    legendFontColor: '#7F7F7F',
    legendFontSize: 15,
  }));

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header with Total Portfolio Value */}
        <LinearGradient
          colors={['#1B365D', '#2E5984']}
          style={styles.header}
        >
          <Text style={styles.greeting}>Good Morning, Investor!</Text>
          <Text style={styles.portfolioValue}>
            {formatCurrency(portfolioData.totalValue)}
          </Text>
          <View style={styles.changeContainer}>
            <Ionicons 
              name={portfolioData.changePercentage > 0 ? "trending-up" : "trending-down"} 
              size={20} 
              color={portfolioData.changePercentage > 0 ? "#28A745" : "#DC3545"} 
            />
            <Text style={[
              styles.changeText, 
              { color: portfolioData.changePercentage > 0 ? "#28A745" : "#DC3545" }
            ]}>
              {formatCurrency(portfolioData.todayChange)} ({portfolioData.changePercentage > 0 ? '+' : ''}{portfolioData.changePercentage}%)
            </Text>
          </View>
          <Text style={styles.changeLabel}>Today's Change</Text>
        </LinearGradient>

        <View style={styles.content}>
          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.actionButton}>
              <LinearGradient
                colors={['#2E8B57', '#3CB371']}
                style={styles.actionGradient}
              >
                <Ionicons name="add" size={24} color="white" />
              </LinearGradient>
              <Text style={styles.actionText}>Invest</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton}>
              <LinearGradient
                colors={['#FF6B6B', '#FF8E53']}
                style={styles.actionGradient}
              >
                <Ionicons name="remove" size={24} color="white" />
              </LinearGradient>
              <Text style={styles.actionText}>Withdraw</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton}>
              <LinearGradient
                colors={['#4ECDC4', '#44A08D']}
                style={styles.actionGradient}
              >
                <Ionicons name="swap-horizontal" size={24} color="white" />
              </LinearGradient>
              <Text style={styles.actionText}>Transfer</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton}>
              <LinearGradient
                colors={['#A8E6CF', '#7FCDCD']}
                style={styles.actionGradient}
              >
                <Ionicons name="analytics" size={24} color="white" />
              </LinearGradient>
              <Text style={styles.actionText}>Analyze</Text>
            </TouchableOpacity>
          </View>

          {/* Portfolio Performance Chart */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Portfolio Performance</Text>
            <View style={styles.chartContainer}>
              <LineChart
                data={chartData}
                width={screenWidth - 40}
                height={220}
                chartConfig={{
                  backgroundColor: '#FFFFFF',
                  backgroundGradientFrom: '#FFFFFF',
                  backgroundGradientTo: '#FFFFFF',
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(27, 54, 93, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  style: {
                    borderRadius: 16,
                  },
                  propsForDots: {
                    r: '6',
                    strokeWidth: '2',
                    stroke: '#FFD700',
                  },
                }}
                bezier
                style={styles.chart}
              />
            </View>
          </View>

          {/* Asset Allocation */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Asset Allocation</Text>
            <View style={styles.allocationContainer}>
              <PieChart
                data={pieData}
                width={screenWidth - 40}
                height={180}
                chartConfig={{
                  color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                }}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="15"
                center={[10, 0]}
                absolute
              />
              <View style={styles.allocationList}>
                {portfolioData.investments.map((investment, index) => (
                  <View key={index} style={styles.allocationItem}>
                    <View style={[styles.colorDot, { backgroundColor: investment.color }]} />
                    <View style={styles.allocationInfo}>
                      <Text style={styles.allocationName}>{investment.name}</Text>
                      <Text style={styles.allocationValue}>
                        {formatCurrency(investment.value)} ({investment.percentage}%)
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Recent Transactions */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Activity</Text>
              <TouchableOpacity>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            {portfolioData.recentTransactions.map((transaction, index) => (
              <View key={index} style={styles.transactionItem}>
                <View style={[
                  styles.transactionIcon,
                  { backgroundColor: transaction.type === 'buy' ? '#E8F5E8' : 
                    transaction.type === 'sell' ? '#FFE8E8' : '#E8F4FD' }
                ]}>
                  <Ionicons
                    name={
                      transaction.type === 'buy' ? 'arrow-up' : 
                      transaction.type === 'sell' ? 'arrow-down' : 'cash'
                    }
                    size={20}
                    color={
                      transaction.type === 'buy' ? '#28A745' : 
                      transaction.type === 'sell' ? '#DC3545' : '#1B365D'
                    }
                  />
                </View>
                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionTitle}>
                    {transaction.type === 'buy' ? 'Bought' : 
                     transaction.type === 'sell' ? 'Sold' : 'Dividend'} {transaction.stock}
                  </Text>
                  <Text style={styles.transactionTime}>{transaction.time}</Text>
                </View>
                <Text style={[
                  styles.transactionAmount,
                  { color: transaction.type === 'sell' || transaction.type === 'dividend' ? '#28A745' : '#DC3545' }
                ]}>
                  {transaction.type === 'buy' ? '-' : '+'}{formatCurrency(transaction.amount)}
                </Text>
              </View>
            ))}
          </View>

          {/* Market Insights */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Market Insights</Text>
            <View style={styles.insightCard}>
              <View style={styles.insightHeader}>
                <Ionicons name="bulb" size={24} color="#FFD700" />
                <Text style={styles.insightTitle}>Investment Tip</Text>
              </View>
              <Text style={styles.insightText}>
                Consider diversifying your portfolio with some international exposure. 
                Your current allocation is well-balanced, but adding 5-10% in international 
                funds could help reduce risk.
              </Text>
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
  greeting: {
    fontSize: 18,
    color: '#B8D4E3',
    marginBottom: 5,
  },
  portfolioValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  changeText: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 5,
  },
  changeLabel: {
    fontSize: 14,
    color: '#B8D4E3',
  },
  content: {
    padding: 20,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  actionButton: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
  },
  actionGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
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
    marginBottom: 15,
  },
  seeAllText: {
    color: '#1B365D',
    fontSize: 16,
    fontWeight: '500',
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
  allocationContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  allocationList: {
    marginTop: 15,
  },
  allocationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  allocationInfo: {
    flex: 1,
  },
  allocationName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  allocationValue: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  transactionTime: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  insightCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  insightTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B365D',
    marginLeft: 10,
  },
  insightText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
});

export default Dashboard;
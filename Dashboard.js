import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { signOut } from 'firebase/auth';
import { auth } from './firebase';

const { width } = Dimensions.get('window');

export default function Dashboard() {
  const [selectedTab, setSelectedTab] = useState('overview');

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const financialData = {
    totalBalance: 25480.50,
    monthlyIncome: 8500.00,
    monthlyExpenses: 4200.00,
    savings: 4300.00,
    investments: 12580.50,
  };

  const recentTransactions = [
    { id: 1, title: 'Grocery Store', amount: -85.50, type: 'expense', date: 'Today' },
    { id: 2, title: 'Salary Deposit', amount: 8500.00, type: 'income', date: 'Yesterday' },
    { id: 3, title: 'Coffee Shop', amount: -12.75, type: 'expense', date: '2 days ago' },
    { id: 4, title: 'Investment Return', amount: 245.30, type: 'income', date: '3 days ago' },
  ];

  const renderOverview = () => (
    <View style={styles.tabContent}>
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Total Balance</Text>
        <Text style={styles.balanceAmount}>${financialData.totalBalance.toLocaleString()}</Text>
        <Text style={styles.balanceChange}>+$1,245.30 this month</Text>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Ionicons name="trending-up" size={24} color="#10b981" />
          <Text style={styles.statAmount}>${financialData.monthlyIncome.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Monthly Income</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="trending-down" size={24} color="#ef4444" />
          <Text style={styles.statAmount}>${financialData.monthlyExpenses.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Monthly Expenses</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="wallet" size={24} color="#6366f1" />
          <Text style={styles.statAmount}>${financialData.savings.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Savings</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="bar-chart" size={24} color="#f59e0b" />
          <Text style={styles.statAmount}>${financialData.investments.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Investments</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        {recentTransactions.map((transaction) => (
          <View key={transaction.id} style={styles.transactionItem}>
            <View style={styles.transactionLeft}>
              <View style={[styles.transactionIcon, { backgroundColor: transaction.type === 'income' ? '#10b981' : '#ef4444' }]}>
                <Ionicons 
                  name={transaction.type === 'income' ? 'arrow-down' : 'arrow-up'} 
                  size={16} 
                  color="#ffffff" 
                />
              </View>
              <View>
                <Text style={styles.transactionTitle}>{transaction.title}</Text>
                <Text style={styles.transactionDate}>{transaction.date}</Text>
              </View>
            </View>
            <Text style={[styles.transactionAmount, { color: transaction.type === 'income' ? '#10b981' : '#ef4444' }]}>
              {transaction.type === 'income' ? '+' : ''}${transaction.amount.toFixed(2)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderBudget = () => (
    <View style={styles.tabContent}>
      <Text style={styles.comingSoon}>Budget tracking coming soon!</Text>
    </View>
  );

  const renderInvestments = () => (
    <View style={styles.tabContent}>
      <Text style={styles.comingSoon}>Investment portfolio coming soon!</Text>
    </View>
  );

  const renderProfile = () => (
    <View style={styles.tabContent}>
      <View style={styles.profileCard}>
        <View style={styles.profileAvatar}>
          <Ionicons name="person" size={40} color="#6366f1" />
        </View>
        <Text style={styles.profileName}>John Doe</Text>
        <Text style={styles.profileEmail}>john.doe@example.com</Text>
      </View>

      <TouchableOpacity style={styles.menuItem}>
        <Ionicons name="settings" size={24} color="#94a3b8" />
        <Text style={styles.menuText}>Settings</Text>
        <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuItem}>
        <Ionicons name="help-circle" size={24} color="#94a3b8" />
        <Text style={styles.menuText}>Help & Support</Text>
        <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuItem}>
        <Ionicons name="document-text" size={24} color="#94a3b8" />
        <Text style={styles.menuText}>Terms & Privacy</Text>
        <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
      </TouchableOpacity>

      <TouchableOpacity style={[styles.menuItem, styles.signOutButton]} onPress={handleSignOut}>
        <Ionicons name="log-out" size={24} color="#ef4444" />
        <Text style={[styles.menuText, { color: '#ef4444' }]}>Sign Out</Text>
        <Ionicons name="chevron-forward" size={20} color="#ef4444" />
      </TouchableOpacity>
    </View>
  );

  return (
    <LinearGradient
      colors={['#0f172a', '#1e293b', '#334155']}
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>FlexFinance</Text>
        <TouchableOpacity style={styles.notificationButton}>
          <Ionicons name="notifications" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {selectedTab === 'overview' && renderOverview()}
        {selectedTab === 'budget' && renderBudget()}
        {selectedTab === 'investments' && renderInvestments()}
        {selectedTab === 'profile' && renderProfile()}
      </ScrollView>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabButton, selectedTab === 'overview' && styles.activeTab]}
          onPress={() => setSelectedTab('overview')}
        >
          <Ionicons 
            name="home" 
            size={24} 
            color={selectedTab === 'overview' ? '#6366f1' : '#94a3b8'} 
          />
          <Text style={[styles.tabLabel, selectedTab === 'overview' && styles.activeTabLabel]}>
            Overview
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, selectedTab === 'budget' && styles.activeTab]}
          onPress={() => setSelectedTab('budget')}
        >
          <Ionicons 
            name="pie-chart" 
            size={24} 
            color={selectedTab === 'budget' ? '#6366f1' : '#94a3b8'} 
          />
          <Text style={[styles.tabLabel, selectedTab === 'budget' && styles.activeTabLabel]}>
            Budget
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, selectedTab === 'investments' && styles.activeTab]}
          onPress={() => setSelectedTab('investments')}
        >
          <Ionicons 
            name="trending-up" 
            size={24} 
            color={selectedTab === 'investments' ? '#6366f1' : '#94a3b8'} 
          />
          <Text style={[styles.tabLabel, selectedTab === 'investments' && styles.activeTabLabel]}>
            Investments
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, selectedTab === 'profile' && styles.activeTab]}
          onPress={() => setSelectedTab('profile')}
        >
          <Ionicons 
            name="person" 
            size={24} 
            color={selectedTab === 'profile' ? '#6366f1' : '#94a3b8'} 
          />
          <Text style={[styles.tabLabel, selectedTab === 'profile' && styles.activeTabLabel]}>
            Profile
          </Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  balanceCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  balanceLabel: {
    color: '#94a3b8',
    fontSize: 16,
    marginBottom: 8,
  },
  balanceAmount: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  balanceChange: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 32,
  },
  statCard: {
    width: (width - 60) / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statAmount: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  transactionDate: {
    color: '#94a3b8',
    fontSize: 12,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  comingSoon: {
    color: '#94a3b8',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 100,
  },
  profileCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileName: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  profileEmail: {
    color: '#94a3b8',
    fontSize: 14,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  menuText: {
    color: '#ffffff',
    fontSize: 16,
    marginLeft: 12,
    flex: 1,
  },
  signOutButton: {
    marginTop: 24,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    paddingBottom: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  activeTab: {
    // Active tab styling
  },
  tabLabel: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 4,
  },
  activeTabLabel: {
    color: '#6366f1',
    fontWeight: '600',
  },
}); 
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';
import PaperTrading from './PaperTrading';

export default function InvestmentsScreen() {
  const [likedStocks, setLikedStocks] = useState([]);
  const [rejectedStocks, setRejectedStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('portfolio'); // 'portfolio', 'liked', 'rejected'

  useEffect(() => {
    loadUserStocks();
  }, []);

  const loadUserStocks = async () => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      // Load liked stocks
      const userDoc = await getDoc(doc(db, 'users', uid));
      const userData = userDoc.data();
      setLikedStocks(userData?.likedStocks || []);

      // Load rejected stocks
      const rejectedSnap = await getDocs(collection(db, 'users', uid, 'rejected'));
      const rejected = rejectedSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRejectedStocks(rejected);
    } catch (error) {
      console.error('Error loading user stocks:', error);
      Alert.alert('Error', 'Failed to load your stock preferences');
    } finally {
      setLoading(false);
    }
  };

  const renderLikedStocks = () => (
    <FlatList
      data={likedStocks}
      keyExtractor={(item, index) => item.symbol || index.toString()}
      renderItem={({ item }) => (
        <View style={styles.stockCard}>
          <View style={styles.stockInfo}>
            <Text style={styles.stockSymbol}>{item.symbol}</Text>
            <Text style={styles.stockName}>{item.name}</Text>
            <Text style={styles.stockPrice}>{item.price}</Text>
          </View>
          <Ionicons name="heart" size={24} color="#ef4444" />
        </View>
      )}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Ionicons name="heart-outline" size={48} color="#94a3b8" />
          <Text style={styles.emptyText}>No liked stocks yet</Text>
          <Text style={styles.emptySubtext}>Swipe right on stocks to like them</Text>
        </View>
      }
    />
  );

  const renderRejectedStocks = () => (
    <FlatList
      data={rejectedStocks}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={styles.stockCard}>
          <View style={styles.stockInfo}>
            <Text style={styles.stockSymbol}>{item.symbol}</Text>
            <Text style={styles.stockName}>{item.name}</Text>
            <Text style={styles.stockPrice}>{item.price}</Text>
          </View>
          <Ionicons name="close-circle" size={24} color="#94a3b8" />
        </View>
      )}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Ionicons name="close-circle-outline" size={48} color="#94a3b8" />
          <Text style={styles.emptyText}>No rejected stocks</Text>
          <Text style={styles.emptySubtext}>Swipe left on stocks to reject them</Text>
        </View>
      }
    />
  );

  const renderPortfolio = () => <PaperTrading />;

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading your investments...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        {[
          { key: 'portfolio', label: 'Portfolio', icon: 'trending-up' },
          { key: 'liked', label: 'Liked', icon: 'heart', count: likedStocks.length },
          { key: 'rejected', label: 'Rejected', icon: 'close-circle', count: rejectedStocks.length }
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabButton, activeTab === tab.key && styles.activeTabButton]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons
              name={tab.icon}
              size={20}
              color={activeTab === tab.key ? '#6366f1' : '#94a3b8'}
            />
            <Text style={[styles.tabLabel, activeTab === tab.key && styles.activeTabLabel]}>
              {tab.label}
            </Text>
            {tab.count !== undefined && tab.count > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{tab.count}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.content}>
        {activeTab === 'portfolio' && renderPortfolio()}
        {activeTab === 'liked' && (
          <View style={styles.listContainer}>
            {renderLikedStocks()}
          </View>
        )}
        {activeTab === 'rejected' && (
          <View style={styles.listContainer}>
            {renderRejectedStocks()}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0f172a',
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    position: 'relative',
  },
  activeTabButton: {
    borderBottomWidth: 2,
    borderBottomColor: '#6366f1',
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
  countBadge: {
    position: 'absolute',
    top: 0,
    right: '25%',
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  listContainer: {
    flex: 1,
    paddingTop: 10,
  },
  stockCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  stockInfo: {
    flex: 1,
  },
  stockSymbol: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  stockName: {
    color: '#cbd5e1',
    fontSize: 14,
    marginTop: 2,
  },
  stockPrice: {
    color: '#10b981',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    color: '#64748b',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  loadingText: {
    color: '#cbd5e1',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 32,
  },
});

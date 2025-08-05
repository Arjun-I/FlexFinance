import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import SwipeStocks from './SwipeStocks';
import PaperTrading from './PaperTrading';

export default function InvestmentsScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 120 }}>
      <Text style={styles.title}>Swipe to Discover</Text>
      <SwipeStocks />
      <View style={styles.divider} />
      <Text style={styles.title}>Your Paper Portfolio</Text>
      <PaperTrading />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0f172a',
    padding: 16,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginVertical: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 20,
  },
});

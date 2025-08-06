import React from 'react';
import { Text, StyleSheet, ScrollView } from 'react-native';
import PaperTrading from './PaperTrading';

export default function InvestmentsScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 120 }}>
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
});

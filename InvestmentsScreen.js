import React from 'react';
import { Text, StyleSheet, View } from 'react-native';
import PaperTrading from './PaperTrading';

export default function InvestmentsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Paper Portfolio</Text>
      <PaperTrading />
    </View>
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

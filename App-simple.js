import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function App() {
  const [screen, setScreen] = useState('welcome');

  const WelcomeScreen = () => (
    <SafeAreaView style={styles.container}>
      <View style={styles.center}>
        <Text style={styles.title}>FlexFinance</Text>
        <Text style={styles.subtitle}>Your Smart Investment Partner</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => setScreen('dashboard')}
        >
          <Text style={styles.buttonText}>Enter App</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );

  const DashboardScreen = () => (
    <SafeAreaView style={styles.container}>
      <View style={styles.center}>
        <Text style={styles.title}>Dashboard</Text>
        <Text style={styles.portfolioValue}>$125,430.50</Text>
        <Text style={styles.changeText}>+$2,345.67 (+1.91%)</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => setScreen('welcome')}
        >
          <Text style={styles.buttonText}>Back to Welcome</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );

  return (
    <>
      <StatusBar style="auto" />
      {screen === 'welcome' ? <WelcomeScreen /> : <DashboardScreen />}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1B365D',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 40,
    textAlign: 'center',
  },
  portfolioValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1B365D',
    marginBottom: 10,
  },
  changeText: {
    fontSize: 18,
    color: '#28A745',
    marginBottom: 40,
  },
  button: {
    backgroundColor: '#1B365D',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 12,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
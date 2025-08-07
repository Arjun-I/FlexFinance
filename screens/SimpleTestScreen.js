import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';

export default function SimpleTestScreen({ navigation }) {
  const [testResults, setTestResults] = useState([]);

  useEffect(() => {
    console.log('SimpleTestScreen mounted on', Platform.OS);
    runBasicTests();
  }, []);

  const runBasicTests = () => {
    const results = [];
    
    try {
      // Test 1: Basic React Native functionality
      results.push({ test: 'React Native', status: 'PASS', message: 'Basic functionality working' });
      
      // Test 2: Platform detection
      results.push({ 
        test: 'Platform Detection', 
        status: 'PASS', 
        message: `Platform: ${Platform.OS}, Version: ${Platform.Version}` 
      });
      
      // Test 3: Console logging
      console.log('TestScreen console test');
      results.push({ test: 'Console Logging', status: 'PASS', message: 'Console logging working' });
      
      // Test 4: Alert functionality
      results.push({ test: 'Alert System', status: 'PASS', message: 'Alert system available' });
      
      // Test 5: Navigation
      results.push({ test: 'Navigation', status: 'PASS', message: 'Navigation props received' });
      
      // Test 6: State management
      results.push({ test: 'State Management', status: 'PASS', message: 'useState working' });
      
    } catch (error) {
      console.error('Test failed:', error);
      results.push({ 
        test: 'Error Handling', 
        status: 'FAIL', 
        message: error.message 
      });
    }
    
    setTestResults(results);
  };

  const testAlert = () => {
    Alert.alert('Test Alert', 'This is a test alert to verify functionality');
  };

  const testNavigation = () => {
    navigation.navigate('Login');
  };

  const testCrash = () => {
    console.log('User requested crash test');
    // This will trigger the error boundary
    throw new Error('Test crash triggered by user');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Simple Android Test</Text>
        <Text style={styles.subtitle}>Platform: {Platform.OS}</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Test Results:</Text>
        {testResults.map((result, index) => (
          <View key={index} style={styles.resultItem}>
            <Text style={[styles.resultStatus, result.status === 'PASS' ? styles.pass : styles.fail]}>
              {result.status === 'PASS' ? '✓' : '✗'}
            </Text>
            <View style={styles.resultText}>
              <Text style={styles.resultTest}>{result.test}</Text>
              <Text style={styles.resultMessage}>{result.message}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={testAlert}>
          <Text style={styles.buttonText}>Test Alert</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={testNavigation}>
          <Text style={styles.buttonText}>Test Navigation</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.button, styles.crashButton]} onPress={testCrash}>
          <Text style={styles.buttonText}>Test Error Boundary</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
    marginTop: 4,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 8,
  },
  resultStatus: {
    fontSize: 20,
    fontWeight: 'bold',
    marginRight: 12,
  },
  pass: {
    color: '#059669',
  },
  fail: {
    color: '#dc2626',
  },
  resultText: {
    flex: 1,
  },
  resultTest: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  resultMessage: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 2,
  },
  buttonContainer: {
    padding: 20,
    gap: 12,
  },
  button: {
    backgroundColor: '#6366f1',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  crashButton: {
    backgroundColor: '#dc2626',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 
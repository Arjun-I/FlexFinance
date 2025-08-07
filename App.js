import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet, ActivityIndicator, Platform, Alert } from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import debugService from './services/debugService';

import LoginScreen from './screens/LoginScreen';
import RiskQuiz from './screens/RiskQuiz';
import Dashboard from './screens/Dashboard';
import SettingsScreen from './screens/SettingsScreen';
import SupportScreen from './screens/SupportScreen';
import TermsScreen from './screens/TermsScreen';
import NotificationsScreen from './screens/NotificationsScreen';
// Removed unused diagnostic and test screens
import ErrorBoundary from './components/ErrorBoundary';

// Android-specific simplified version
const isAndroid = Platform.OS === 'android';

const Stack = createNativeStackNavigator();

export default function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [hasCompletedQuiz, setHasCompletedQuiz] = useState(false);

  useEffect(() => {
    debugService.info('App starting up', { platform: Platform.OS });
    
    // Add global error handler for Android
    if (Platform.OS === 'android') {
      const originalConsoleError = console.error;
      console.error = (...args) => {
        debugService.error('Console error caught', { args, platform: 'android' });
        originalConsoleError.apply(console, args);
      };
    }
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        debugService.info('Auth state changed', { 
          userLoggedIn: !!user,
          platform: Platform.OS 
        });
        setUser(user);
        
        if (user) {
          // Check if user has completed the quiz
          try {
            debugService.trackFirebase('get', 'users', user.uid);
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            const userData = userDoc.data();
            const quizCompleted = userData?.quizCompleted || false;
            setHasCompletedQuiz(quizCompleted);
            debugService.info('Quiz completion status', { quizCompleted });
          } catch (error) {
            debugService.error('Error checking quiz completion', error);
            setHasCompletedQuiz(false);
          }
        } else {
          setHasCompletedQuiz(false);
        }
        
        setLoading(false);
      } catch (error) {
        debugService.error('Critical error in auth state change', error);
        setError(error);
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Critical Error</Text>
        <Text style={styles.errorText}>{error.message}</Text>
        <Text style={styles.errorText}>Platform: {Platform.OS}</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading FlexFinance...</Text>
        <Text style={styles.platformText}>Platform: {Platform.OS}</Text>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <NavigationContainer>
        <StatusBar style="light" />
        <Stack.Navigator
          initialRouteName="Login"
          screenOptions={{
            headerShown: false,
            gestureEnabled: false,
          }}
        >
          {/* Removed TestScreen - not needed */}
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen 
            name="RiskQuiz" 
            component={({ navigation }) => (
              <RiskQuiz 
                navigation={navigation} 
                setHasCompletedQuiz={setHasCompletedQuiz}
              />
            )}
          />
          <Stack.Screen name="Dashboard" component={Dashboard} />
          <Stack.Screen name="SettingsScreen" component={SettingsScreen} />
          <Stack.Screen name="SupportScreen" component={SupportScreen} />
          <Stack.Screen name="TermsScreen" component={TermsScreen} />
          <Stack.Screen name="NotificationsScreen" component={NotificationsScreen} />
          {/* Removed DiagnosticScreen - not needed */}
        </Stack.Navigator>
      </NavigationContainer>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 18,
    marginTop: 16,
  },
  platformText: {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    padding: 20,
  },
  errorTitle: {
    color: '#ef4444',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  errorText: {
    color: '#ffffff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
});

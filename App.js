import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

import LoginScreen from './screens/LoginScreen';
import RiskQuiz from './screens/RiskQuiz';
import Dashboard from './screens/Dashboard';
import SettingsScreen from './screens/SettingsScreen';
import SupportScreen from './screens/SupportScreen';
import TermsScreen from './screens/TermsScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import ErrorBoundary from './components/ErrorBoundary';

// Android-specific simplified version
const isAndroid = Platform.OS === 'android';

const Stack = createNativeStackNavigator();

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasCompletedQuiz, setHasCompletedQuiz] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('Auth state changed:', user ? 'User logged in' : 'User logged out');
      setUser(user);
      
      if (user) {
        // Check if user has completed the quiz
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          const userData = userDoc.data();
          const quizCompleted = userData?.quizCompleted || false;
          setHasCompletedQuiz(quizCompleted);
          console.log('Quiz completion status:', quizCompleted);
        } catch (error) {
          console.error('Error checking quiz completion:', error);
          setHasCompletedQuiz(false);
        }
      } else {
        setHasCompletedQuiz(false);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading FlexFinance...</Text>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <NavigationContainer>
        <StatusBar style="light" />
        <Stack.Navigator
          initialRouteName={!user ? 'Login' : (hasCompletedQuiz ? 'Dashboard' : 'RiskQuiz')}
          screenOptions={{
            headerShown: false,
            animation: isAndroid ? 'none' : 'slide_from_right',
          }}
        >
          <Stack.Screen name="Login">
            {(props) => (
              <LoginScreen {...props} setHasCompletedQuiz={setHasCompletedQuiz} />
            )}
          </Stack.Screen>
          <Stack.Screen name="RiskQuiz">
            {(props) => (
              <RiskQuiz {...props} setHasCompletedQuiz={setHasCompletedQuiz} />
            )}
          </Stack.Screen>
          <Stack.Screen name="Dashboard" component={Dashboard} />
          {!isAndroid && (
            <>
              <Stack.Screen name="SettingsScreen" component={SettingsScreen} />
              <Stack.Screen name="SupportScreen" component={SupportScreen} />
              <Stack.Screen name="TermsScreen" component={TermsScreen} />
              <Stack.Screen name="NotificationsScreen" component={NotificationsScreen} />
            </>
          )}
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
    color: '#e2e8f0',
    fontSize: 18,
    marginTop: 16,
    fontWeight: '600',
  },
});

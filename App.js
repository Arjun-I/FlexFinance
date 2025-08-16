import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text, Platform, Alert, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';

// Import Firebase statically like other components
import { auth, db } from './firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail, 
  onAuthStateChanged,
  signOut
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

// Main App Screens (will be imported when logged in)
let Dashboard, StockComparison, RiskQuiz, PortfolioTracker;

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [initializationStage, setInitializationStage] = useState('Starting...');
  
  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [formLoading, setFormLoading] = useState(false);

  // App navigation state (since we're avoiding navigation stack)
  const [currentScreen, setCurrentScreen] = useState('Dashboard');
  
  // Auth state debouncing to prevent rapid changes
  const [authStateDebounce, setAuthStateDebounce] = useState(null);

  // Load screens when user is authenticated
  useEffect(() => {
    if (user) {
      loadScreens();
    }
  }, [user]);

  useEffect(() => {
    let unsubscribe = null;
    
    const initializeApp = async () => {
      try {
        setInitializationStage('Setting up authentication...');
        
        // Set up auth listener with better error handling and state management
        unsubscribe = onAuthStateChanged(auth, async (authUser) => {
          console.log('🔥 Auth state changed:', authUser ? `Logged in as ${authUser.email}` : 'Logged out');
          
          // Debounce auth state changes to prevent rapid firing
          if (authStateDebounce) {
            clearTimeout(authStateDebounce);
          }
          
          const timeoutId = setTimeout(async () => {
            // Prevent infinite loops by checking if user actually changed
            if (authUser?.uid !== user?.uid) {
              setUser(authUser);
              
              // Only process user-specific logic if we have a user
              if (authUser) {
                try {
                  setInitializationStage('Checking user profile...');
                
                // Add timeout to prevent hanging on network issues
                const userDocRef = doc(db, 'users', authUser.uid);
                const timeoutPromise = new Promise((_, reject) => 
                  setTimeout(() => reject(new Error('Profile check timeout')), 10000)
                );
                
                const userSnap = await Promise.race([
                  getDoc(userDocRef),
                  timeoutPromise
                ]);
                
                if (!userSnap.exists() || !userSnap.data()?.riskProfile) {
                  console.log('🆕 New user detected - directing to Risk Quiz');
                  setCurrentScreen('RiskQuiz');
                } else {
                  console.log('👤 Existing user - showing Dashboard');
                  setCurrentScreen('Dashboard');
                }
              } catch (error) {
                console.error('Error checking user profile:', error);
                // For network errors, assume new user and show Dashboard first
                if (error.message?.includes('network') || error.message?.includes('timeout')) {
                  console.log('⚠️ Network issue - defaulting to Dashboard, user can access Risk Quiz later');
                } else {
                  console.log('⚠️ Profile check failed - defaulting to Dashboard');
                }
                setCurrentScreen('Dashboard');
              }
            } else {
              // User is logged out, reset to clean state
              setCurrentScreen('Dashboard');
              setInitializationStage('Starting...');
            }
            }
            
            setLoading(false);
          }, 300); // 300ms debounce
          
          setAuthStateDebounce(timeoutId);
        });

      } catch (err) {
        console.error('❌ App initialization failed:', err);
        setError(`Initialization failed: ${err.message}`);
        setLoading(false);
      }
    };

    initializeApp();
    
    // Cleanup function
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
      if (authStateDebounce) {
        clearTimeout(authStateDebounce);
      }
    };
  }, []);

  const createUserProfileIfMissing = async (uid, email) => {
    const userRef = doc(db, 'users', uid);
    await setDoc(
      userRef,
      {
        email,
        createdAt: new Date(),
        likedStocks: [],
        cashBalance: 10000,
        riskProfile: {
          volatility: 0,
          liquidity: 0,
          timeHorizon: 0,
          ethics: 0,
          knowledge: 0,
        },
      },
      { merge: true }
    );
  };

  // Simple network connectivity test (non-blocking)
  const checkNetworkConnectivity = async () => {
    try {
      // Quick DNS resolution test
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // Reduced timeout
      
      await fetch('https://www.google.com/favicon.ico', {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-cache'
      });
      
      clearTimeout(timeoutId);
      console.log('✅ Network connectivity confirmed');
      return true;
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('📡 Network check timed out - proceeding with auth anyway');
      } else {
        console.log('📡 Network connectivity check failed (non-critical):', error.message);
      }
      // Always return true - don't block authentication for network check failures
      return true;
    }
  };

  const handleAuth = async () => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    
    if (!trimmedEmail || !trimmedPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }
    
    if (trimmedPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    setFormLoading(true);
    
    console.log('🔐 Attempting authentication...');
    
    // Quick network connectivity check (non-blocking)
    checkNetworkConnectivity(); // Don't await - let it run in background

    // Add timeout wrapper for auth operations (reduced timeout for faster feedback)
    const authWithTimeout = async (authOperation) => {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Authentication timeout - please check your connection')), 10000) // Reduced from 15s to 10s
      );
      
      return Promise.race([authOperation, timeoutPromise]);
    };

    try {
      if (isLogin) {
        await authWithTimeout(signInWithEmailAndPassword(auth, trimmedEmail, trimmedPassword));
        console.log('✅ Login successful');
        
        // Show brief success message for login
        Alert.alert(
          '✅ Welcome Back!',
          `Successfully signed in as "${trimmedEmail}". Loading your dashboard...`,
          [{ text: 'Continue', style: 'default' }]
        );
        
        // Clear form on success
        setEmail('');
        setPassword('');
      } else {
        const userCredential = await authWithTimeout(createUserWithEmailAndPassword(auth, trimmedEmail, trimmedPassword));
        await createUserProfileIfMissing(userCredential.user.uid, trimmedEmail);
        console.log('✅ Account creation successful');
        
        // Show success message for account creation
        Alert.alert(
          '🎉 Account Created Successfully!',
          `Welcome to FlexFinance! Your account has been created with the email "${trimmedEmail}". You can now start exploring personalized stock recommendations.`,
          [{ text: 'Get Started', style: 'default' }]
        );
        
        // Clear form on success
        setEmail('');
        setPassword('');
      }
    } catch (error) {
      console.error('Auth error:', error);
      
      // Provide detailed user-friendly error messages
      let userMessage = 'Something went wrong. Please try again.';
      let alertTitle = 'Authentication Error';
      
      if (error.code) {
        switch (error.code) {
          // Login-specific errors
          case 'auth/user-not-found':
            alertTitle = '❌ Account Not Found';
            userMessage = `No account exists with the email "${trimmedEmail}". Would you like to create a new account instead?`;
            break;
          case 'auth/wrong-password':
            alertTitle = '🔐 Incorrect Password';
            userMessage = 'The password you entered is incorrect. Please try again or use "Forgot Password" to reset it.';
            break;
          case 'auth/invalid-credential':
            alertTitle = '❌ Invalid Login';
            userMessage = 'The email or password you entered is incorrect. Please check your credentials and try again.';
            break;
          
          // Signup-specific errors
          case 'auth/email-already-in-use':
            alertTitle = '⚠️ Account Already Exists';
            userMessage = `An account with "${trimmedEmail}" already exists. Please sign in instead or use a different email address.`;
            break;
          case 'auth/weak-password':
            alertTitle = '🔒 Weak Password';
            userMessage = 'Your password is too weak. Please use at least 6 characters with a mix of letters, numbers, and symbols.';
            break;
          
          // General validation errors
          case 'auth/invalid-email':
            alertTitle = '📧 Invalid Email';
            userMessage = `"${trimmedEmail}" is not a valid email address. Please check the format and try again.`;
            break;
          case 'auth/missing-email':
            alertTitle = '📧 Email Required';
            userMessage = 'Please enter your email address to continue.';
            break;
          case 'auth/missing-password':
            alertTitle = '🔐 Password Required';
            userMessage = 'Please enter your password to continue.';
            break;
          
          // Network and server errors
          case 'auth/network-request-failed':
            alertTitle = '🌐 Network Error';
            userMessage = 'Unable to connect to our servers. Please check your internet connection and try again.';
            break;
          case 'auth/timeout':
            alertTitle = '⏱️ Request Timeout';
            userMessage = 'The request took too long to complete. Please check your connection and try again.';
            break;
          case 'auth/internal-error':
            alertTitle = '⚠️ Server Error';
            userMessage = 'An internal error occurred. Please try again in a few moments.';
            break;
          
          // Security and rate limiting
          case 'auth/too-many-requests':
            alertTitle = '🚫 Too Many Attempts';
            userMessage = 'Too many failed login attempts. Please wait a few minutes before trying again, or reset your password.';
            break;
          case 'auth/user-disabled':
            alertTitle = '🚫 Account Disabled';
            userMessage = 'This account has been temporarily disabled. Please contact support for assistance.';
            break;
          case 'auth/operation-not-allowed':
            alertTitle = '🚫 Sign-up Disabled';
            userMessage = 'Account creation is currently disabled. Please contact support for assistance.';
            break;
          
          // Account state errors
          case 'auth/user-token-expired':
            alertTitle = '⏰ Session Expired';
            userMessage = 'Your session has expired. Please sign in again.';
            break;
          case 'auth/requires-recent-login':
            alertTitle = '🔐 Re-authentication Required';
            userMessage = 'For security reasons, please sign out and sign in again to continue.';
            break;
          
          default:
            // Check for timeout error specifically
            if (error.message?.includes('timeout')) {
              alertTitle = '⏱️ Connection Timeout';
              userMessage = 'The authentication request timed out. Please check your internet connection and try again.';
            } else {
              alertTitle = '❌ Authentication Failed';
              userMessage = `Authentication failed: ${error.message || 'Unknown error'}. Please try again.`;
              console.error('Unhandled auth error code:', error.code, error.message);
            }
        }
      }
      
      Alert.alert(alertTitle, userMessage);
    } finally {
      setFormLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      Alert.alert('Error', 'Please enter your email address first');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    try {
      setFormLoading(true);
      console.log('🔄 Sending password reset email to:', trimmedEmail);
      await sendPasswordResetEmail(auth, trimmedEmail);
      Alert.alert(
        'Password Reset Email Sent! 📧', 
        `Check your inbox at ${trimmedEmail} and follow the instructions to reset your password.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('❌ Password reset error:', error);
      let errorMessage = 'Failed to send password reset email.';
      let alertTitle = '❌ Password Reset Failed';
      
      switch (error.code) {
        case 'auth/user-not-found':
          alertTitle = '❌ Account Not Found';
          errorMessage = `No account exists with the email "${trimmedEmail}". Please check the email address or create a new account.`;
          break;
        case 'auth/invalid-email':
          alertTitle = '📧 Invalid Email';
          errorMessage = `"${trimmedEmail}" is not a valid email address. Please check the format and try again.`;
          break;
        case 'auth/too-many-requests':
          alertTitle = '🚫 Too Many Requests';
          errorMessage = 'Too many password reset requests. Please wait a few minutes before trying again.';
          break;
        case 'auth/network-request-failed':
          alertTitle = '🌐 Network Error';
          errorMessage = 'Unable to send password reset email due to network issues. Please check your connection and try again.';
          break;
        default:
          alertTitle = '❌ Password Reset Failed';
          errorMessage = `Failed to send password reset email: ${error.message || 'Unknown error'}. Please try again.`;
      }
      
      Alert.alert(alertTitle, errorMessage);
    } finally {
      setFormLoading(false);
    }
  };

  // Load screens dynamically when needed
  const loadScreens = async () => {
    if (!Dashboard) {
      Dashboard = (await import('./screens/Dashboard_New')).default;
      StockComparison = (await import('./components/StockComparison_Safe')).default;
      RiskQuiz = (await import('./screens/RiskQuiz_Safe')).default;
      PortfolioTracker = (await import('./components/PortfolioTracker_Safe')).default;
    }
  };

  const renderCurrentScreen = () => {
    if (!user) return null;

    const navigation = { 
      navigate: setCurrentScreen,
      // Special navigation for completing risk quiz
      completeRiskQuiz: () => {
        console.log('✅ Risk Quiz completed - redirecting to Dashboard');
        setCurrentScreen('Dashboard');
      }
    };

    switch (currentScreen) {
      case 'Dashboard':
        return Dashboard ? <Dashboard user={user} navigation={navigation} /> : <ActivityIndicator size="large" color="#6366f1" />;
      case 'StockComparison':
        return StockComparison ? <StockComparison user={user} navigation={navigation} /> : <ActivityIndicator size="large" color="#6366f1" />;
      case 'RiskQuiz':
        return RiskQuiz ? <RiskQuiz user={user} navigation={navigation} /> : <ActivityIndicator size="large" color="#6366f1" />;
      case 'Portfolio':
        return PortfolioTracker ? <PortfolioTracker user={user} navigation={navigation} /> : <ActivityIndicator size="large" color="#6366f1" />;
      
      default:
        return Dashboard ? <Dashboard user={user} navigation={navigation} /> : <ActivityIndicator size="large" color="#6366f1" />;
    }
  };

  if (loading) {
    return (
      <LinearGradient colors={['#0f172a', '#1e293b', '#334155']} style={styles.loadingContainer}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>FlexFinance</Text>
        <Text style={styles.stageText}>{initializationStage}</Text>
        <Text style={styles.platformText}>Platform: {Platform.OS}</Text>
      </LinearGradient>
    );
  }

  if (error) {
    return (
      <LinearGradient colors={['#0f172a', '#1e293b', '#334155']} style={styles.errorContainer}>
        <StatusBar style="light" />
        <Text style={styles.errorTitle}>⚠️ Error</Text>
        <Text style={styles.errorText}>{error}</Text>
        <Text style={styles.errorSubtext}>Please restart the app</Text>
      </LinearGradient>
    );
  }

  if (user) {
    console.log('🖥️ Rendering authenticated user interface with navigation');
    return (
      <View style={styles.appContainer}>
        <StatusBar style="light" />
        
        {/* Header with navigation */}
        <LinearGradient colors={['#1e293b', '#334155']} style={styles.header}>
          <Text style={styles.headerTitle}>💰 FlexFinance</Text>
          <TouchableOpacity 
            style={styles.signOutButton}
            onPress={async () => {
              try {
                await signOut(auth);
                
                // Explicitly clear user state and reset navigation
                setUser(null);
                setCurrentScreen('Dashboard');
                setLoading(false);
                
                console.log('✅ Successfully signed out');
              } catch (error) {
                console.error('Sign out error:', error);
                Alert.alert('Error', 'Failed to sign out. Please try again.');
              }
            }}
          >
            <Text style={styles.signOutText}>🚪 Sign Out</Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* Main Content */}
        <View style={styles.content}>
          {renderCurrentScreen()}
        </View>

        {/* Bottom Navigation - Fixed positioning */}
        <LinearGradient colors={['#334155', '#1e293b']} style={styles.bottomNav}>
          <View style={styles.navContent}>
            <TouchableOpacity 
              style={[styles.navButton, currentScreen === 'Dashboard' && styles.navButtonActive]}
              onPress={() => setCurrentScreen('Dashboard')}
            >
              <Text style={styles.navIcon}>$</Text>
              <Text style={[styles.navText, currentScreen === 'Dashboard' && styles.navTextActive]}>
                Overview
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.navButton, currentScreen === 'StockComparison' && styles.navButtonActive]}
              onPress={() => setCurrentScreen('StockComparison')}
            >
              <Text style={styles.navIcon}>≡</Text>
              <Text style={[styles.navText, currentScreen === 'StockComparison' && styles.navTextActive]}>
                Comparisons
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.navButton, currentScreen === 'Portfolio' && styles.navButtonActive]}
              onPress={() => setCurrentScreen('Portfolio')}
            >
              <Text style={styles.navIcon}>≣</Text>
              <Text style={[styles.navText, currentScreen === 'Portfolio' && styles.navTextActive]}>
                Portfolio
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.navButton, currentScreen === 'RiskQuiz' && styles.navButtonActive]}
              onPress={() => setCurrentScreen('RiskQuiz')}
            >
              <Text style={styles.navIcon}>◯</Text>
              <Text style={[styles.navText, currentScreen === 'RiskQuiz' && styles.navTextActive]}>
                Risk Quiz
              </Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    );
  }

  // Login Screen
  return (
    <LinearGradient colors={['#0f172a', '#1e293b', '#334155']} style={styles.container}>
      <StatusBar style="light" />
      <KeyboardAvoidingView behavior="height" style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.loginHeader}>
            <Text style={styles.logoText}>💰</Text>
            <Text style={styles.title}>FlexFinance</Text>
            <Text style={styles.subtitle}>AI-Powered Investment Analysis</Text>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.toggleContainer}>
              <TouchableOpacity
                style={[styles.toggleButton, isLogin && styles.toggleButtonActive]}
                onPress={() => setIsLogin(true)}
              >
                <Text style={[styles.toggleText, isLogin && styles.toggleTextActive]}>
                  Sign In
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleButton, !isLogin && styles.toggleButtonActive]}
                onPress={() => setIsLogin(false)}
              >
                <Text style={[styles.toggleText, !isLogin && styles.toggleTextActive]}>
                  Sign Up
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>📧 Email</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor="#94a3b8"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>🔒 Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor="#94a3b8"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <TouchableOpacity
              style={styles.authButton}
              onPress={handleAuth}
              disabled={formLoading}
            >
              {formLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.authButtonText}>
                  {isLogin ? 'Sign In' : 'Create Account'}
                </Text>
              )}
            </TouchableOpacity>

            {isLogin && (
              <TouchableOpacity
                style={styles.forgotButton}
                onPress={handleForgotPassword}
              >
                <Text style={styles.forgotButtonText}>Forgot Password?</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#e2e8f0',
    marginTop: 15,
    fontSize: 24,
    fontWeight: 'bold',
  },
  stageText: {
    color: '#94a3b8',
    marginTop: 10,
    fontSize: 16,
    textAlign: 'center',
  },
  platformText: {
    color: '#6366f1',
    marginTop: 5,
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ef4444',
    marginBottom: 10,
  },
  errorText: {
    color: '#e2e8f0',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
  },
  errorSubtext: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop: Platform.OS === 'android' ? 50 : Platform.OS === 'ios' ? 50 : 15,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#e2e8f0',
  },
  signOutButton: {
    backgroundColor: '#ef4444',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  signOutText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingBottom: 80, // Space for fixed bottom navigation
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 10,
    paddingBottom: Platform.OS === 'ios' ? 25 : 10,
    zIndex: 1000,
  },
  navContent: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
    flex: 1,
  },
  navButton: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 12,
    minWidth: 80,
  },
  navButtonActive: {
    backgroundColor: '#6366f1',
  },
  navIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  navText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  navTextActive: {
    color: '#ffffff',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  loginHeader: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoText: {
    fontSize: 60,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#6366f1',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#334155',
    borderRadius: 12,
    marginBottom: 30,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  toggleButtonActive: {
    backgroundColor: '#6366f1',
  },
  toggleText: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: '600',
  },
  toggleTextActive: {
    color: '#ffffff',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    color: '#e2e8f0',
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#334155',
    borderRadius: 12,
    padding: 16,
    color: '#e2e8f0',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#475569',
  },
  authButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  authButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  forgotButton: {
    alignItems: 'center',
    marginTop: 20,
    padding: 10,
  },
  forgotButtonText: {
    color: '#6366f1',
    fontSize: 16,
    textDecorationLine: 'underline',
    fontWeight: '500',
  },
  comingSoonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    padding: 20,
  },
  comingSoonTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#e2e8f0',
    marginBottom: 16,
    textAlign: 'center',
  },
  comingSoonText: {
    fontSize: 18,
    color: '#94a3b8',
    textAlign: 'center',
  },
});
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { auth } from './firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

// Import new components and utilities
import ErrorBoundary from './components/ErrorBoundary';
import { AppProvider, useApp } from './utils/AppContext';
import NotificationSystem from './components/NotificationSystem';
import EnhancedLoadingScreen from './components/EnhancedLoadingScreen';
import Dashboard_Modern from './screens/Dashboard_Modern';
import Profile_Safe from './screens/Profile_Safe';
import RiskQuiz_Safe from './screens/RiskQuiz_Safe';
import StockComparison_Enhanced from './components/StockComparison_Enhanced';
import PortfolioTracker_Enhanced from './components/PortfolioTracker_Enhanced';

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ErrorBoundary>
  );
}

function AppContent() {
  // Always call useApp at the top level, never conditionally
  const context = useApp();
  const { user, setUser, error, setError, clearError, notifications, removeNotification } = context;
  
  const [loading, setLoading] = useState(true);
  const [currentScreen, setCurrentScreen] = useState('Dashboard');
  const [initializationStage, setInitializationStage] = useState('Starting...');
  const [authStateDebounce, setAuthStateDebounce] = useState(null);
  
  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    let unsubscribe = null;
    
    const initializeApp = async () => {
      try {
        setInitializationStage('Setting up authentication...');
        
        // Set up auth listener with better error handling and state management
        unsubscribe = onAuthStateChanged(auth, async (authUser) => {
          console.log('Auth state changed:', authUser ? `Logged in as ${authUser.email}` : 'Logged out');
          
          // Debounce auth state changes to prevent rapid firing
          if (authStateDebounce) {
            clearTimeout(authStateDebounce);
          }
          
          const timeoutId = setTimeout(async () => {
            // Always update user state when auth changes
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
                console.log('New user detected - directing to Risk Quiz');
                setCurrentScreen('RiskQuiz');
              } else {
                console.log('Existing user - showing Dashboard');
                setCurrentScreen('Dashboard');
              }
            } catch (error) {
              console.error('Error checking user profile:', error);
              // For network errors, assume new user and show Dashboard first
              if (error.message?.includes('network') || error.message?.includes('timeout')) {
                console.log('Network issue - defaulting to Dashboard, user can access Risk Quiz later');
              } else {
                console.log('Profile check failed - defaulting to Dashboard');
              }
              setCurrentScreen('Dashboard');
            }
          } else {
            // User is logged out, reset to clean state
            setCurrentScreen('Dashboard');
            setInitializationStage('Starting...');
          }
          
          setLoading(false);
        }, 300); // 300ms debounce
        
        setAuthStateDebounce(timeoutId);
      });

    } catch (err) {
      console.error('App initialization failed:', err);
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
}, [setUser, setError, authStateDebounce]);

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
      console.log('Network connectivity confirmed');
      return true;
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Network check timed out - proceeding with auth anyway');
      } else {
        console.log('Network connectivity check failed (non-critical):', error.message);
      }
      // Always return true - don't block authentication for network check failures
      return true;
    }
  };

  const handleLogin = async () => {
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
    
    console.log('Attempting login...');
    
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
      await authWithTimeout(signInWithEmailAndPassword(auth, trimmedEmail, trimmedPassword));
      console.log('Login successful');
      
      // Show brief success message for login
      Alert.alert(
        'Welcome Back!',
        'Successfully signed in to your account.',
        [{ text: 'OK' }]
      );
      
      // Clear form on success
      setEmail('');
      setPassword('');
    } catch (error) {
      console.error('Login error:', error);
      
      // Provide detailed user-friendly error messages
      let userMessage = 'Something went wrong. Please try again.';
      let alertTitle = 'Authentication Error';
      
      if (error.code) {
        switch (error.code) {
          // Login-specific errors
          case 'auth/user-not-found':
            alertTitle = 'Account Not Found';
            userMessage = 'No account found with this email address. Please check your email or create a new account.';
            break;
          case 'auth/wrong-password':
            alertTitle = 'Invalid Login';
            userMessage = 'Incorrect password. Please try again or reset your password.';
            break;
          case 'auth/invalid-credential':
            alertTitle = 'Invalid Credentials';
            userMessage = 'Invalid email or password. Please check your credentials and try again.';
            break;
          
          // General validation errors
          case 'auth/invalid-email':
            alertTitle = 'Invalid Email';
            userMessage = 'Please enter a valid email address.';
            break;
          case 'auth/missing-email':
            alertTitle = 'Email Required';
            userMessage = 'Please enter your email address.';
            break;
          case 'auth/missing-password':
            alertTitle = 'Password Required';
            userMessage = 'Please enter your password to continue.';
            break;
          
          // Network and server errors
          case 'auth/network-request-failed':
            alertTitle = 'Network Error';
            userMessage = 'Unable to connect to our servers. Please check your internet connection and try again.';
            break;
          case 'auth/timeout':
            alertTitle = 'Request Timeout';
            userMessage = 'The request took too long to complete. Please check your internet connection and try again.';
            break;
          case 'auth/internal-error':
            alertTitle = 'Server Error';
            userMessage = 'An unexpected error occurred. Please try again later.';
            break;
          
          // Security and rate limiting
          case 'auth/too-many-requests':
            alertTitle = 'Too Many Attempts';
            userMessage = 'Too many failed login attempts. Please wait before trying again.';
            break;
          case 'auth/user-disabled':
            alertTitle = 'Account Disabled';
            userMessage = 'Your account has been disabled. Please contact support for assistance.';
            break;
          
          // Account state errors
          case 'auth/user-token-expired':
            alertTitle = 'Session Expired';
            userMessage = 'Your session has expired. Please sign in again.';
            break;
          case 'auth/requires-recent-login':
            alertTitle = 'Session Expired';
            userMessage = 'Your session has expired. Please sign in again.';
            break;
          
          default:
            // Check for timeout error specifically
            if (error.message?.includes('timeout')) {
              alertTitle = 'Connection Timeout';
              userMessage = 'The authentication request timed out. Please check your internet connection and try again.';
            } else {
              alertTitle = 'Authentication Failed';
              userMessage = 'Authentication failed. Please check your credentials and try again.';
            }
        }
      }
      
      Alert.alert(alertTitle, userMessage);
    } finally {
      setFormLoading(false);
    }
  };

  const handleSignUp = async () => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    const trimmedConfirmPassword = confirmPassword.trim();
    
    if (!trimmedEmail || !trimmedPassword || !trimmedConfirmPassword) {
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

    if (trimmedPassword !== trimmedConfirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setFormLoading(true);
    
    console.log('Attempting account creation...');
    
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
      const userCredential = await authWithTimeout(createUserWithEmailAndPassword(auth, trimmedEmail, trimmedPassword));
      await createUserProfileIfMissing(userCredential.user.uid, trimmedEmail);
      console.log('Account creation successful');
      Alert.alert(
        'Account Created!',
        'Your FlexFinance account has been created successfully.',
        [{ text: 'OK' }]
      );
      
      // Clear form on success
      setEmail('');
      setPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Signup error:', error);
      
      // Provide detailed user-friendly error messages
      let userMessage = 'Something went wrong. Please try again.';
      let alertTitle = 'Authentication Error';
      
      if (error.code) {
        switch (error.code) {
          // Signup-specific errors
          case 'auth/email-already-in-use':
            alertTitle = 'Account Already Exists';
            userMessage = 'An account with this email already exists. Please sign in instead.';
            break;
          case 'auth/weak-password':
            alertTitle = 'Weak Password';
            userMessage = 'Password is too weak. Please choose a stronger password (at least 6 characters).';
            break;
          
          // General validation errors
          case 'auth/invalid-email':
            alertTitle = 'Invalid Email';
            userMessage = 'Please enter a valid email address.';
            break;
          case 'auth/missing-email':
            alertTitle = 'Email Required';
            userMessage = 'Please enter your email address.';
            break;
          case 'auth/missing-password':
            alertTitle = 'Password Required';
            userMessage = 'Please enter your password to continue.';
            break;
          
          // Network and server errors
          case 'auth/network-request-failed':
            alertTitle = 'Network Error';
            userMessage = 'Unable to connect to our servers. Please check your internet connection and try again.';
            break;
          case 'auth/timeout':
            alertTitle = 'Request Timeout';
            userMessage = 'The request took too long to complete. Please check your internet connection and try again.';
            break;
          case 'auth/internal-error':
            alertTitle = 'Server Error';
            userMessage = 'An unexpected error occurred. Please try again later.';
            break;
          
          // Security and rate limiting
          case 'auth/too-many-requests':
            alertTitle = 'Too Many Attempts';
            userMessage = 'Too many failed signup attempts. Please wait before trying again.';
            break;
          case 'auth/operation-not-allowed':
            alertTitle = 'Sign-up Disabled';
            userMessage = 'Account creation is currently disabled. Please contact support for assistance.';
            break;
          
          default:
            // Check for timeout error specifically
            if (error.message?.includes('timeout')) {
              alertTitle = 'Connection Timeout';
              userMessage = 'The authentication request timed out. Please check your internet connection and try again.';
            } else {
              alertTitle = 'Authentication Failed';
              userMessage = 'Authentication failed. Please try again.';
            }
        }
      }
      
      Alert.alert(alertTitle, userMessage);
    } finally {
      setFormLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      
      // Explicitly clear user state and reset navigation
      setUser(null);
      setCurrentScreen('Dashboard');
      setLoading(false);
      
      console.log('Successfully signed out');
    } catch (error) {
      console.error('Sign out error:', error);
      Alert.alert('Error', 'Failed to sign out. Please try again.');
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
      console.log('Sending password reset email to:', trimmedEmail);
      await sendPasswordResetEmail(auth, trimmedEmail);
      Alert.alert(
        'Password Reset Email Sent!',
        'Check your email for instructions to reset your password.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Password reset error:', error);
      
      let alertTitle = 'Password Reset Failed';
      let errorMessage = 'Unable to send password reset email. Please try again.';
      
      switch (error.code) {
        case 'auth/user-not-found':
          alertTitle = 'Account Not Found';
          errorMessage = 'No account found with this email address.';
          break;
        case 'auth/invalid-email':
          alertTitle = 'Invalid Email';
          errorMessage = 'Please enter a valid email address.';
          break;
        case 'auth/too-many-requests':
          alertTitle = 'Too Many Requests';
          errorMessage = 'Too many password reset attempts. Please wait before trying again.';
          break;
        default:
          alertTitle = 'Password Reset Failed';
          errorMessage = 'Unable to send password reset email. Please try again.';
          break;
      }
      
      Alert.alert(alertTitle, errorMessage);
    } finally {
      setFormLoading(false);
    }
  };

  // Load screens dynamically when needed
  const loadScreens = async () => {
    // These imports are now statically imported at the top
    // StockComparison = (await import('./components/StockComparison_Safe')).default;
    // PortfolioTracker = (await import('./components/PortfolioTracker_Safe')).default;
  };

  const renderCurrentScreen = () => {
    console.log('renderCurrentScreen called with user:', user?.email, 'currentScreen:', currentScreen);
    
    if (!user) {
      console.log('No user found, returning null');
      return null;
    }

    const navigation = { 
      navigate: setCurrentScreen,
      // Special navigation for completing risk quiz
      completeRiskQuiz: () => {
        console.log('Risk Quiz completed - redirecting to Dashboard');
        setCurrentScreen('Dashboard');
      }
    };

    console.log('Rendering screen for:', currentScreen);
    
    switch (currentScreen) {
      case 'Dashboard':
        console.log('Rendering Dashboard_Modern');
        return <Dashboard_Modern user={user} navigation={navigation} />;
      case 'StockComparison':
        console.log('Rendering StockComparison_Enhanced');
        return <StockComparison_Enhanced user={user} navigation={navigation} />;
      case 'RiskQuiz':
        console.log('Rendering RiskQuiz_Safe');
        return <RiskQuiz_Safe user={user} navigation={navigation} />;
      case 'Portfolio':
        console.log('Rendering PortfolioTracker_Enhanced');
        return <PortfolioTracker_Enhanced user={user} navigation={navigation} />;
      case 'Profile':
        console.log('Rendering Profile_Safe');
        return <Profile_Safe user={user} navigation={navigation} />;
      
      default:
        console.log('Default case - rendering Dashboard_Modern');
        return <Dashboard_Modern user={user} navigation={navigation} />;
    }
  };

  // Always render the main component structure
  return (
    <LinearGradient colors={['#0f0f23', '#1a1a2e', '#16213e']} style={styles.container}>
      <StatusBar style="light" />
      
      {/* Notification System */}
      <NotificationSystem 
        notifications={notifications} 
        onRemove={removeNotification} 
      />
      
      {loading ? (
        <EnhancedLoadingScreen 
          message={initializationStage}
          showProgress={false}
        />
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Error</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.errorSubtext}>Please restart the app</Text>
        </View>
      ) : user ? (
        <View style={styles.appContainer}>
          {/* Navigation Header */}
          <View style={styles.navigationHeader}>
            <Text style={styles.headerTitle}>FlexFinance</Text>
            <View style={styles.navigationButtons}>
              <TouchableOpacity 
                style={[styles.navButton, currentScreen === 'Dashboard' && styles.activeNavButton]} 
                onPress={() => {
                  console.log('Navigating to Dashboard');
                  setCurrentScreen('Dashboard');
                }}
              >
                <Text style={[styles.navButtonText, currentScreen === 'Dashboard' && styles.activeNavButtonText]}>
                  Dashboard
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.navButton, currentScreen === 'StockComparison' && styles.activeNavButton]} 
                onPress={() => {
                  console.log('Navigating to StockComparison');
                  setCurrentScreen('StockComparison');
                }}
              >
                <Text style={[styles.navButtonText, currentScreen === 'StockComparison' && styles.activeNavButtonText]}>
                  Discover
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.navButton, currentScreen === 'Portfolio' && styles.activeNavButton]} 
                onPress={() => {
                  console.log('Navigating to Portfolio');
                  setCurrentScreen('Portfolio');
                }}
              >
                <Text style={[styles.navButtonText, currentScreen === 'Portfolio' && styles.activeNavButtonText]}>
                  Portfolio
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.navButton, currentScreen === 'Profile' && styles.activeNavButton]} 
                onPress={() => {
                  console.log('Navigating to Profile');
                  setCurrentScreen('Profile');
                }}
              >
                <Text style={[styles.navButtonText, currentScreen === 'Profile' && styles.activeNavButtonText]}>
                  Profile
                </Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
              <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>
          </View>

          {/* Main Content */}
          <View style={styles.content}>
            {console.log('Rendering current screen:', currentScreen, 'User:', user?.email)}
            {renderCurrentScreen()}
          </View>
        </View>
      ) : (
        <View style={styles.authContainer}>
          {/* Auth Form */}
          <View style={styles.authForm}>
            <Text style={styles.authTitle}>
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </Text>
            <Text style={styles.authSubtitle}>
              {isLogin ? 'Sign in to your FlexFinance account' : 'Start your investment journey'}
            </Text>
            
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#6b7280"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#6b7280"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            
            {!isLogin && (
              <TextInput
                style={styles.input}
                placeholder="Confirm Password"
                placeholderTextColor="#6b7280"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />
            )}
            
            <TouchableOpacity 
              style={[styles.authButton, formLoading && styles.authButtonDisabled]} 
              onPress={isLogin ? handleLogin : handleSignUp}
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
              <TouchableOpacity style={styles.forgotPasswordButton} onPress={handleForgotPassword}>
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={styles.switchAuthButton} 
              onPress={() => {
                setIsLogin(!isLogin);
                setEmail('');
                setPassword('');
                setConfirmPassword('');
              }}
            >
              <Text style={styles.switchAuthText}>
                {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  appContainer: {
    flex: 1,
  },
  navigationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
  },
  navigationButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  navButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  activeNavButton: {
    backgroundColor: '#00d4ff',
  },
  navButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  activeNavButtonText: {
    color: '#ffffff',
  },
  logoutButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255,107,107,0.2)',
  },
  logoutButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ff6b6b',
  },
  content: {
    flex: 1,
  },
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  authForm: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    padding: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  authTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  authSubtitle: {
    fontSize: 16,
    color: '#b4bcd0',
    textAlign: 'center',
    marginBottom: 30,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  authButton: {
    backgroundColor: '#00d4ff',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  authButtonDisabled: {
    opacity: 0.6,
  },
  authButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  forgotPasswordButton: {
    alignItems: 'center',
    marginBottom: 20,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#00d4ff',
    textDecorationLine: 'underline',
  },
  switchAuthButton: {
    alignItems: 'center',
  },
  switchAuthText: {
    fontSize: 14,
    color: '#b4bcd0',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#0f172a',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ff6b6b',
    marginBottom: 10,
  },
  errorText: {
    fontSize: 16,
    color: '#b4bcd0',
    textAlign: 'center',
    marginBottom: 15,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#6b7280',
  },
});
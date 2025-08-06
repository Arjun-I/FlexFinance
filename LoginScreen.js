import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

export default function LoginScreen({ navigation, setHasCompletedQuiz }) {

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    if (!email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Please enter a valid email address';
    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  
  const handleAuth = async () => {
  if (!validateForm()) return;
    setLoading(true);
    try {
      let userCredential;
      if (isLogin) {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
        Alert.alert('Success', 'Welcome back to FlexFinance!');
      } else {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await createUserProfileIfMissing(userCredential.user.uid, email);
        Alert.alert('Success', 'Account created successfully! Welcome to FlexFinance!');
      }

      const user = userCredential.user;
      let quizCompleted = false;
      try {
        const quizFlag = await AsyncStorage.getItem(`riskQuizCompleted_${user.uid}`);
        quizCompleted = quizFlag === 'true';
      } catch (err) {
        console.error('Error fetching quiz completion state:', err);
      }

      if (setHasCompletedQuiz) {
        setHasCompletedQuiz(quizCompleted);
      }

      navigation.replace(quizCompleted ? 'Dashboard' : 'RiskQuiz');
    } catch (error) {
      let errorMessage = 'An error occurred. Please try again.';
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email. Please sign up or check your email.';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Incorrect password. Please try again.';
          break;
        case 'auth/email-already-in-use':
          errorMessage = 'An account with this email already exists. Please sign in instead.';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password is too weak. Please choose a stronger password.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Please enter a valid email address.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many failed attempts. Please try again later.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Network error. Please check your internet connection.';
          break;
        case 'auth/app-not-authorized':
          errorMessage = 'Firebase app not authorized. Please check configuration.';
          break;
        case 'auth/operation-not-allowed':
          errorMessage = 'Email/password authentication is not enabled. Please contact support.';
          break;
        case 'auth/invalid-api-key':
          errorMessage = 'Firebase configuration error. Please check API key.';
          break;
      }
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const clearErrors = () => setErrors({});

  const handleForgotPassword = async () => {
    if (!email) return Alert.alert('Error', 'Please enter your email address first.');
    if (!/\S+@\S+\.\S+/.test(email)) return Alert.alert('Error', 'Please enter a valid email address.');
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert('Password Reset Email Sent', 'Check your inbox (or spam) for the reset link.');
    } catch (error) {
      let errorMessage = 'An error occurred. Please try again.';
      if (error.code === 'auth/user-not-found') errorMessage = 'No account found with this email address.';
      else if (error.code === 'auth/invalid-email') errorMessage = 'Please enter a valid email address.';
      else if (error.code === 'auth/too-many-requests') errorMessage = 'Too many reset attempts. Please try again later.';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#0f172a', '#1e293b', '#334155']} style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Ionicons name="wallet" size={60} color="#6366f1" />
            </View>
            <Text style={styles.title}>FlexFinance</Text>
            <Text style={styles.subtitle}>Your personal finance companion</Text>
          </View>

          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionsTitle}>{isLogin ? 'Welcome Back!' : 'Create Your Account'}</Text>
            <Text style={styles.instructionsText}>
              {isLogin
                ? 'Sign in to access your financial dashboard and track your investments.'
                : 'Create a new account to start managing your finances with FlexFinance.'}
            </Text>
          </View>

          <View style={styles.formContainer}>
            <View style={[styles.inputContainer, errors.email && styles.inputContainerError]}>
              <Ionicons name="mail" size={20} color="#94a3b8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor="#94a3b8"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (errors.email) clearErrors();
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

            <View style={[styles.inputContainer, errors.password && styles.inputContainerError]}>
              <Ionicons name="lock-closed" size={20} color="#94a3b8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor="#94a3b8"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errors.password) clearErrors();
                }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleAuth}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.buttonText}>{isLogin ? 'Sign In' : 'Create Account'}</Text>}
            </TouchableOpacity>

            {isLogin && (
              <TouchableOpacity style={styles.forgotPasswordButton} onPress={handleForgotPassword} disabled={loading}>
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.switchButton}
              onPress={() => {
                setIsLogin(!isLogin);
                clearErrors();
                setEmail('');
                setPassword('');
              }}
            >
              <Text style={styles.switchText}>
                {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
              </Text>
            </TouchableOpacity>

            <View style={styles.helpContainer}>
              <Text style={styles.helpTitle}>Need Help?</Text>
              <Text style={styles.helpText}>
                • Make sure your email is valid{'\n'}
                • Password must be at least 6 characters{'\n'}
                • Check your internet connection{'\n'}
                • Try again if you encounter any issues
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContainer: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24 },
  header: { alignItems: 'center', marginBottom: 32 },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: { fontSize: 32, fontWeight: 'bold', color: '#ffffff', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#94a3b8', textAlign: 'center' },
  instructionsContainer: { marginBottom: 32, paddingHorizontal: 8 },
  instructionsTitle: { fontSize: 20, fontWeight: 'bold', color: '#ffffff', textAlign: 'center', marginBottom: 8 },
  instructionsText: { fontSize: 14, color: '#94a3b8', textAlign: 'center', lineHeight: 20 },
  formContainer: { width: '100%' },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    marginBottom: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, height: 56, color: '#ffffff', fontSize: 16 },
  inputContainerError: { borderColor: '#ef4444' },
  eyeIcon: { padding: 8 },
  errorText: { color: '#ef4444', fontSize: 12, marginBottom: 16, marginLeft: 4 },
  button: {
    backgroundColor: '#6366f1',
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#ffffff', fontSize: 18, fontWeight: '600' },
  switchButton: { marginTop: 24, alignItems: 'center' },
  switchText: { color: '#6366f1', fontSize: 16, textDecorationLine: 'underline' },
  forgotPasswordButton: { marginTop: 16, alignItems: 'center' },
  forgotPasswordText: { color: '#94a3b8', fontSize: 14, textDecorationLine: 'underline' },
  helpContainer: {
    marginTop: 32,
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  helpTitle: { color: '#ffffff', fontSize: 16, fontWeight: '600', marginBottom: 8 },
  helpText: { color: '#94a3b8', fontSize: 12, lineHeight: 18 },
});

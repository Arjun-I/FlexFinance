import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { auth, db } from '../firebase';
import EnhancedLoadingScreen from '../components/EnhancedLoadingScreen';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import stockGenerationService from '../services/stockGenerationService_Enhanced';

const COLORS = {
  primaryGradient: ['#0f0f23', '#1a1a2e', '#16213e'],
  cardGradient: ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)'],
  primary: '#00d4ff',
  success: '#4ecdc4',
  warning: '#feca57',
  text: {
    primary: '#ffffff',
    secondary: '#b4bcd0',
    accent: '#8b9dc3',
  },
};

const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

const TYPOGRAPHY = {
  h1: { fontSize: 32, fontWeight: '700', lineHeight: 40 },
  h2: { fontSize: 24, fontWeight: '600', lineHeight: 32 },
  h3: { fontSize: 20, fontWeight: '600', lineHeight: 28 },
  body: { fontSize: 16, fontWeight: '400', lineHeight: 24 },
  caption: { fontSize: 14, fontWeight: '400', lineHeight: 20 },
  small: { fontSize: 12, fontWeight: '400', lineHeight: 16 },
};

const questions = [
  {
    id: 1,
    question: 'Your investment drops 15% in a week. What do you do?',
    options: [
      { text: 'Sell immediately', scores: { volatility: 1, timeHorizon: 1 } },
      { text: 'Wait and reassess in a month', scores: { volatility: 2, timeHorizon: 2 } },
      { text: 'Hold, long-term view', scores: { volatility: 3, timeHorizon: 3 } },
      { text: 'Buy more while it is cheap', scores: { volatility: 4, timeHorizon: 4 } },
    ],
  },
  {
    id: 2,
    question: 'How soon might you need this money?',
    options: [
      { text: 'In the next 6 months', scores: { liquidity: 1, timeHorizon: 1 } },
      { text: '1–2 years', scores: { liquidity: 2, timeHorizon: 2 } },
      { text: '3–5 years', scores: { liquidity: 3, timeHorizon: 3 } },
      { text: '5+ years', scores: { liquidity: 4, timeHorizon: 4 } },
    ],
  },
  {
    id: 3,
    question: 'Which best describes your investment experience?',
    options: [
      { text: 'None', scores: { knowledge: 1, volatility: 1 } },
      { text: 'Beginner', scores: { knowledge: 2, volatility: 2 } },
      { text: 'Intermediate', scores: { knowledge: 3, volatility: 3 } },
      { text: 'Expert', scores: { knowledge: 4, volatility: 4 } },
    ],
  },
  {
    id: 4,
    question: 'You hear about a trending high-risk stock. Your reaction?',
    options: [
      { text: 'Avoid it completely', scores: { volatility: 1 } },
      { text: 'Research but likely pass', scores: { volatility: 2 } },
      { text: 'Consider a small investment', scores: { volatility: 3 } },
      { text: 'Jump in for big gains', scores: { volatility: 4 } },
    ],
  },
  {
    id: 5,
    question: 'How important is ethical investing to you?',
    options: [
      { text: 'Avoid all harmful industries', scores: { ethics: 4 } },
      { text: 'Prefer green & clean investments', scores: { ethics: 3 } },
      { text: 'Neutral, case-by-case basis', scores: { ethics: 2 } },
      { text: 'Returns come first', scores: { ethics: 1 } },
    ],
  },
];

export default function RiskQuiz({ navigation, user }) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [categoryScores, setCategoryScores] = useState({
    volatility: 0,
    liquidity: 0,
    timeHorizon: 0,
    knowledge: 0,
    ethics: 0,
  });
  const [showResults, setShowResults] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkExistingProfile();
  }, []);

  const checkExistingProfile = async () => {
    try {
      if (!user?.uid) return;
      
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        if (userData.riskProfile) {
          const profile = userData.riskProfile;
          const totalScore = Object.values(profile).reduce((sum, val) => sum + (val || 0), 0);
          
          if (totalScore > 0) {
            // User already has a risk profile, show results
            setCategoryScores(profile);
            setShowResults(true);
          }
        }
      }
    } catch (error) {
      console.error('Error checking existing profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = async (scores) => {
    setCategoryScores((prev) => {
      const updated = { ...prev };
      for (const cat in scores) {
        updated[cat] += scores[cat];
      }
      return updated;
    });

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      setShowResults(true);
      // Auto-save profile when quiz is completed
      await autoSaveProfile();
    }
  };

  const getRiskProfile = () => {
    const avg = (category) => {
      const questionCount = questions.filter(q => 
        q.options.some(opt => opt.scores[category])
      ).length;
      return questionCount > 0 ? categoryScores[category] / questionCount : 0;
    };

    const avgVolatility = avg('volatility');
    const avgLiquidity = avg('liquidity');
    const avgTimeHorizon = avg('timeHorizon');
    const avgKnowledge = avg('knowledge');
    const avgEthics = avg('ethics');

    const overallScore = (avgVolatility + avgLiquidity + avgTimeHorizon + avgKnowledge) / 4;

    let riskLevel = 'Conservative';
    let color = '#10b981';
    let description = 'You prefer stable, lower-risk investments with steady returns.';
    
    if (overallScore > 3) {
      riskLevel = 'Aggressive';
      color = '#ef4444';
      description = 'You\'re comfortable with high-risk, high-reward investments.';
    } else if (overallScore > 2) {
      riskLevel = 'Moderate';
      color = '#f59e0b';
      description = 'You balance risk and safety for steady growth.';
    }

    return {
      level: riskLevel,
      color,
      description,
      scores: {
        volatility: avgVolatility,
        liquidity: avgLiquidity,
        timeHorizon: avgTimeHorizon,
        knowledge: avgKnowledge,
        ethics: avgEthics,
      },
      overallScore,
    };
  };

  const autoSaveProfile = async () => {
    try {
      setSubmitting(true);
      
      if (!user?.uid) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }

      const profile = getRiskProfile();
      
      // Save to standardized location that stock generation service expects
      const riskProfileRef = doc(db, 'users', user.uid, 'riskProfile', 'current');
      await setDoc(riskProfileRef, {
        ...categoryScores,
        riskLevel: profile.level,
        lastRiskUpdate: new Date(),
      });
      
      // Also save to user doc for backward compatibility
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        riskProfile: categoryScores,
        riskLevel: profile.level,
        riskProfileCompleted: true, // Add this flag
        lastRiskUpdate: new Date(),
      }, { merge: true });

      // Reset personalization metrics to use new risk profile
      stockGenerationService.setUserId(user.uid);
      await stockGenerationService.resetPersonalizationMetrics();

      console.log('Risk profile auto-saved successfully');
      
      // Automatically navigate to stock comparison and trigger generation
      navigation?.navigate?.('StockComparison', { autoGenerate: true });
      
    } catch (error) {
      console.error('Error auto-saving profile:', error);
      Alert.alert('Error', 'Failed to save risk profile. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetQuiz = () => {
    setCurrentQuestion(0);
    setCategoryScores({
      volatility: 0,
      liquidity: 0,
      timeHorizon: 0,
      knowledge: 0,
      ethics: 0,
    });
    setShowResults(false);
  };

  if (loading) {
    return <EnhancedLoadingScreen message="Loading Risk Assessment..." />;
  }

  if (showResults) {
    const profile = getRiskProfile();
    
    return (
      <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.container}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                  <View style={styles.resultsContainer}>
          <View style={styles.completionHeader}>
            <View style={styles.completionIcon}>
              <Text style={styles.completionIconText}>✓</Text>
            </View>
            <Text style={styles.completionTitle}>Assessment Complete!</Text>
            <Text style={styles.completionSubtitle}>
              Your personalized risk profile has been created
            </Text>
          </View>
          
          <View style={[styles.profileCard, { borderColor: profile.color }]}>
            <View style={styles.profileHeader}>
              <Text style={[styles.profileLevel, { color: profile.color }]}>
                {profile.level}
              </Text>
              <View style={[styles.profileBadge, { backgroundColor: profile.color + '20' }]}>
                <Text style={[styles.profileBadgeText, { color: profile.color }]}>
                  Risk Level
                </Text>
              </View>
            </View>
            <Text style={styles.profileDescription}>
              {profile.description}
            </Text>
          </View>

          {/* Loading State */}
          {submitting && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Saving your profile...</Text>
            </View>
          )}
        </View>
        </ScrollView>
      </LinearGradient>
    );
  }

  const question = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Risk Assessment</Text>
          <Text style={styles.subtitle}>
            Answer {questions.length} questions to get personalized recommendations
          </Text>
        </View>

        {/* Progress */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>
            Question {currentQuestion + 1} of {questions.length}
          </Text>
        </View>

        {/* Question */}
        <View style={styles.questionContainer}>
          <Text style={styles.questionText}>{question.question}</Text>
        </View>

        {/* Options */}
        <View style={styles.optionsContainer}>
          {question.options.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={styles.optionButton}
              onPress={() => handleAnswer(option.scores)}
            >
              <LinearGradient
                colors={['#334155', '#475569']}
                style={styles.optionGradient}
              >
                <Text style={styles.optionText}>{option.text}</Text>
                <Text style={styles.optionArrow}>→</Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>



      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
  },
  scrollView: {
    flex: 1,
    padding: SPACING.lg,
    paddingTop: 60,
    paddingBottom: 150,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#e2e8f0',
    marginTop: 12,
    fontSize: 16,
  },
  header: {
    marginTop: 20,
    marginBottom: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#e2e8f0',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
  },
  progressContainer: {
    marginBottom: 30,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#334155',
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6366f1',
    borderRadius: 4,
  },
  progressText: {
    color: '#94a3b8',
    textAlign: 'center',
    fontSize: 14,
  },
  questionContainer: {
    marginBottom: 30,
  },
  questionText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#e2e8f0',
    textAlign: 'center',
    lineHeight: 30,
  },
  optionsContainer: {
    marginBottom: 30,
  },
  optionButton: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  optionGradient: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionText: {
    fontSize: 16,
    color: '#e2e8f0',
    fontWeight: '600',
    flex: 1,
  },
  optionArrow: {
    fontSize: 18,
    color: '#6366f1',
    fontWeight: 'bold',
  },


  resultsContainer: {
    alignItems: 'center',
  },
  completionHeader: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  completionIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  completionIconText: {
    fontSize: 40,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  completionTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#e2e8f0',
    textAlign: 'center',
    marginBottom: 8,
  },
  completionSubtitle: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 24,
  },
  profileCard: {
    backgroundColor: '#334155',
    borderRadius: 16,
    padding: 24,
    marginBottom: 30,
    borderWidth: 2,
    width: '100%',
  },
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileLevel: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  profileBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  profileBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  profileDescription: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 24,
  },

  actionButtons: {
    width: '100%',
    marginTop: 20,
    marginBottom: 40,
  },
  primaryButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: '#475569',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  secondaryButtonText: {
    color: '#e2e8f0',
    fontSize: 16,
    fontWeight: '600',
  },
  recommendationButton: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  recommendationButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

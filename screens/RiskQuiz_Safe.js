import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { auth, db } from '../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const questions = [
  {
    id: 1,
    question: 'Your investment drops 15% in a week. What do you do?',
    options: [
      { text: '💸 Sell immediately', scores: { volatility: 1, timeHorizon: 1 } },
      { text: '⏳ Wait and reassess in a month', scores: { volatility: 2, timeHorizon: 2 } },
      { text: '💎 Hold, long-term view', scores: { volatility: 3, timeHorizon: 3 } },
      { text: '🚀 Buy more while it is cheap', scores: { volatility: 4, timeHorizon: 4 } },
    ],
  },
  {
    id: 2,
    question: 'How soon might you need this money?',
    options: [
      { text: '⚡ In the next 6 months', scores: { liquidity: 1, timeHorizon: 1 } },
      { text: '📅 1–3 years', scores: { liquidity: 2, timeHorizon: 2 } },
      { text: '📈 3–5 years', scores: { liquidity: 3, timeHorizon: 3 } },
      { text: '🏆 After 5 years', scores: { liquidity: 4, timeHorizon: 4 } },
    ],
  },
  {
    id: 3,
    question: 'Which best describes your investment experience?',
    options: [
      { text: '🌱 None', scores: { knowledge: 1, volatility: 1 } },
      { text: '📚 Beginner', scores: { knowledge: 2, volatility: 2 } },
      { text: '🎯 Intermediate', scores: { knowledge: 3, volatility: 3 } },
      { text: '🏅 Expert', scores: { knowledge: 4, volatility: 4 } },
    ],
  },
  {
    id: 4,
    question: 'You hear about a trending high-risk stock. Your reaction?',
    options: [
      { text: '🚫 Avoid it completely', scores: { volatility: 1 } },
      { text: '🔍 Research but likely pass', scores: { volatility: 2 } },
      { text: '💰 Consider a small investment', scores: { volatility: 3 } },
      { text: '🎲 Jump in for big gains', scores: { volatility: 4 } },
    ],
  },
  {
    id: 5,
    question: 'How important is ethical investing to you?',
    options: [
      { text: '🌍 Avoid all harmful industries', scores: { ethics: 4 } },
      { text: '🌿 Prefer green & clean investments', scores: { ethics: 3 } },
      { text: '⚖️ Neutral, case-by-case basis', scores: { ethics: 2 } },
      { text: '💵 Returns come first', scores: { ethics: 1 } },
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

  const handleAnswer = (scores) => {
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

  const saveProfile = async () => {
    try {
      setSubmitting(true);
      
      if (!user?.uid) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }

      const profile = getRiskProfile();
      const userRef = doc(db, 'users', user.uid);
      
      await setDoc(userRef, {
        riskProfile: categoryScores,
        riskLevel: profile.level,
        lastRiskUpdate: new Date(),
      }, { merge: true });

      Alert.alert(
        'Profile Saved! 🎉',
        `Your ${profile.level} risk profile has been saved. You'll now get personalized stock recommendations!`,
        [
          {
            text: 'View Recommendations',
            onPress: () => navigation?.navigate?.('StockComparison'),
          },
          {
            text: 'Back to Dashboard',
            onPress: () => navigation?.navigate?.('Dashboard'),
          },
        ]
      );
      
    } catch (error) {
      console.error('Error saving profile:', error);
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
    return (
      <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Loading Risk Assessment...</Text>
        </View>
      </LinearGradient>
    );
  }

  if (showResults) {
    const profile = getRiskProfile();
    
    return (
      <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.container}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsTitle}>🎯 Your Risk Profile</Text>
            
            <View style={[styles.profileCard, { borderColor: profile.color }]}>
              <Text style={[styles.profileLevel, { color: profile.color }]}>
                {profile.level}
              </Text>
              <Text style={styles.profileDescription}>
                {profile.description}
              </Text>
            </View>

            {/* Detailed Scores */}
            <View style={styles.scoresContainer}>
              <Text style={styles.scoresTitle}>📊 Detailed Breakdown</Text>
              
              <View style={styles.scoreItem}>
                <Text style={styles.scoreLabel}>🎢 Risk Tolerance:</Text>
                <View style={styles.scoreBar}>
                  <View 
                    style={[styles.scoreProgress, { 
                      width: `${(profile.scores.volatility / 4) * 100}%`,
                      backgroundColor: profile.scores.volatility > 2.5 ? '#ef4444' : '#10b981'
                    }]} 
                  />
                </View>
                <Text style={styles.scoreValue}>{profile.scores.volatility.toFixed(1)}/4</Text>
              </View>

              <View style={styles.scoreItem}>
                <Text style={styles.scoreLabel}>⏰ Time Horizon:</Text>
                <View style={styles.scoreBar}>
                  <View 
                    style={[styles.scoreProgress, { 
                      width: `${(profile.scores.timeHorizon / 4) * 100}%`,
                      backgroundColor: '#6366f1'
                    }]} 
                  />
                </View>
                <Text style={styles.scoreValue}>{profile.scores.timeHorizon.toFixed(1)}/4</Text>
              </View>

              <View style={styles.scoreItem}>
                <Text style={styles.scoreLabel}>💧 Liquidity Need:</Text>
                <View style={styles.scoreBar}>
                  <View 
                    style={[styles.scoreProgress, { 
                      width: `${(profile.scores.liquidity / 4) * 100}%`,
                      backgroundColor: '#f59e0b'
                    }]} 
                  />
                </View>
                <Text style={styles.scoreValue}>{profile.scores.liquidity.toFixed(1)}/4</Text>
              </View>

              <View style={styles.scoreItem}>
                <Text style={styles.scoreLabel}>🧠 Experience:</Text>
                <View style={styles.scoreBar}>
                  <View 
                    style={[styles.scoreProgress, { 
                      width: `${(profile.scores.knowledge / 4) * 100}%`,
                      backgroundColor: '#8b5cf6'
                    }]} 
                  />
                </View>
                <Text style={styles.scoreValue}>{profile.scores.knowledge.toFixed(1)}/4</Text>
              </View>

              <View style={styles.scoreItem}>
                <Text style={styles.scoreLabel}>🌍 Ethics Focus:</Text>
                <View style={styles.scoreBar}>
                  <View 
                    style={[styles.scoreProgress, { 
                      width: `${(profile.scores.ethics / 4) * 100}%`,
                      backgroundColor: '#10b981'
                    }]} 
                  />
                </View>
                <Text style={styles.scoreValue}>{profile.scores.ethics.toFixed(1)}/4</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={styles.primaryButton}
                onPress={saveProfile}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.primaryButtonText}>💾 Save Profile</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.secondaryButton}
                onPress={resetQuiz}
              >
                <Text style={styles.secondaryButtonText}>🔄 Retake Quiz</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.recommendationButton}
                onPress={() => navigation?.navigate?.('StockComparison')}
              >
                <Text style={styles.recommendationButtonText}>📈 Get Recommendations</Text>
              </TouchableOpacity>
            </View>
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
          <Text style={styles.title}>🎯 Risk Assessment</Text>
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

        {/* Navigation */}
        <View style={styles.navigationContainer}>
          {currentQuestion > 0 && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setCurrentQuestion(currentQuestion - 1)}
            >
              <Text style={styles.backButtonText}>← Previous</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={styles.skipButton}
            onPress={() => navigation?.navigate?.('Dashboard')}
          >
            <Text style={styles.skipButtonText}>Skip for Now</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 20,
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
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    backgroundColor: '#475569',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  backButtonText: {
    color: '#e2e8f0',
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#6366f1',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  skipButtonText: {
    color: '#6366f1',
    fontSize: 16,
    fontWeight: '600',
  },
  resultsContainer: {
    alignItems: 'center',
  },
  resultsTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#e2e8f0',
    marginBottom: 30,
    textAlign: 'center',
  },
  profileCard: {
    backgroundColor: '#334155',
    borderRadius: 16,
    padding: 24,
    marginBottom: 30,
    borderWidth: 2,
    width: '100%',
    alignItems: 'center',
  },
  profileLevel: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  profileDescription: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 24,
  },
  scoresContainer: {
    width: '100%',
    marginBottom: 30,
  },
  scoresTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#e2e8f0',
    marginBottom: 20,
    textAlign: 'center',
  },
  scoreItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  scoreLabel: {
    fontSize: 14,
    color: '#94a3b8',
    width: 120,
  },
  scoreBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#334155',
    borderRadius: 4,
    marginHorizontal: 12,
  },
  scoreProgress: {
    height: '100%',
    borderRadius: 4,
  },
  scoreValue: {
    fontSize: 14,
    color: '#e2e8f0',
    fontWeight: '600',
    width: 40,
    textAlign: 'right',
  },
  actionButtons: {
    width: '100%',
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

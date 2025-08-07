import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import stockGenerationService from '../services/stockGenerationService';
import riskProfileService from '../services/riskProfileService';

const questions = [
  {
    id: 1,
    question: 'Your investment drops 15% in a week. What do you do?',
    options: [
      { text: 'Sell immediately', scores: { volatility: 1, timeHorizon: 1 } },
      { text: 'Wait and reassess in a month', scores: { volatility: 2, timeHorizon: 2 } },
      { text: 'Hold, long-term view', scores: { volatility: 3, timeHorizon: 3 } },
      { text: 'Buy more while it’s cheap', scores: { volatility: 4, timeHorizon: 4 } },
    ],
  },
  {
    id: 2,
    question: 'How soon might you need this money?',
    options: [
      { text: 'In the next 6 months', scores: { liquidity: 1, timeHorizon: 1 } },
      { text: '1–3 years', scores: { liquidity: 2, timeHorizon: 2 } },
      { text: '3–5 years', scores: { liquidity: 3, timeHorizon: 3 } },
      { text: 'After 5 years', scores: { liquidity: 4, timeHorizon: 4 } },
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
      { text: 'Avoid it', scores: { volatility: 1 } },
      { text: 'Research but likely pass', scores: { volatility: 2 } },
      { text: 'Consider a small investment', scores: { volatility: 3 } },
      { text: 'Jump in for big gains', scores: { volatility: 4 } },
    ],
  },
  {
    id: 5,
    question: 'How would you describe your values on ethical investing?',
    options: [
      { text: 'Avoid all harmful industries', scores: { ethics: 4 } },
      { text: 'Prefer green & clean investments', scores: { ethics: 3 } },
      { text: 'Neutral, case-by-case basis', scores: { ethics: 2 } },
      { text: 'Returns come first', scores: { ethics: 1 } },
    ],
  },
];

export default function RiskQuiz({ navigation, setHasCompletedQuiz }) {
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

  // Reset quiz state when component mounts (for reset functionality)
  useEffect(() => {
    setCurrentQuestion(0);
    setCategoryScores({
      volatility: 0,
      liquidity: 0,
      timeHorizon: 0,
      knowledge: 0,
      ethics: 0,
    });
    setShowResults(false);
  }, []);

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

  const handleFinish = async () => {
    const user = auth.currentUser;
    if (user) {
      try {
        setSubmitting(true);
        
        // Save detailed risk profile
        console.log('🔄 Saving detailed risk profile...');
        await riskProfileService.saveRiskProfile(categoryScores);

        // Store completion in Firestore
        await setDoc(doc(db, 'users', user.uid, 'preferences', 'quiz'), {
          completed: true,
          completedAt: new Date(),
          riskProfile: categoryScores,
        });

        // Clear old stocks and generate initial 10 stock recommendations
        try {
          console.log('🔄 Clearing old stocks...');
          await stockGenerationService.clearAllStocks();
          
          console.log('🔄 Generating initial 10 stock recommendations...');
          await stockGenerationService.generateInitialRecommendations();
          console.log('✅ Initial stock recommendations generated successfully');
        } catch (error) {
          console.error('⚠️ Error generating stock recommendations:', error);
          // Don't block the quiz completion if stock generation fails
        }

        setHasCompletedQuiz(true);
        // Force navigation with reset to prevent back navigation
        navigation.reset({ 
          index: 0, 
          routes: [{ name: 'Dashboard' }] 
        });
      } catch (err) {
        console.error('Error saving risk profile:', err);
        Alert.alert('Error', 'Failed to save risk profile. Please try again.');
      } finally {
        setSubmitting(false);
      }
    }
  };

  const currentQ = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.container}>
      <View style={styles.header}>
        {showResults ? (
          <>
            <Ionicons name="trophy" size={60} color="#10b981" />
            <Text style={styles.title}>Quiz Complete!</Text>
            <Text style={styles.subtitle}>
              {submitting ? 'Generating your personalized stock recommendations...' : 'Risk profile saved successfully'}
            </Text>
            <TouchableOpacity 
              style={[styles.button, submitting && styles.buttonDisabled]} 
              onPress={handleFinish}
              disabled={submitting}
            >
              {submitting ? (
                <View style={styles.buttonContent}>
                  <Ionicons name="refresh" size={16} color="#ffffff" style={{ marginRight: 8 }} />
                  <Text style={styles.buttonText}>Generating stocks...</Text>
                </View>
              ) : (
                <Text style={styles.buttonText}>Continue</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <ProgressBar progress={progress} current={currentQuestion + 1} total={questions.length} />
            <ScrollView contentContainerStyle={styles.scrollContainer}>
              <QuestionCard question={currentQ} onAnswer={handleAnswer} />
            </ScrollView>
          </>
        )}
      </View>
    </LinearGradient>
  );
}

const QuestionCard = ({ question, onAnswer }) => (
  <View style={styles.questionCard}>
    <View style={styles.questionHeader}>
      <Text style={styles.questionCategory}>{question.category || 'Risk Assessment'}</Text>
      <Text style={styles.questionDescription}>{question.description || 'Choose the option that best describes your preference'}</Text>
    </View>
    
    <Text style={styles.questionText}>{question.question}</Text>
    
    <View style={styles.optionsContainer}>
      {question.options.map((option, index) => (
        <TouchableOpacity
          key={index}
          style={styles.optionButton}
          onPress={() => onAnswer(option.scores)}
        >
          <View style={styles.optionContent}>
            <Text style={styles.optionText}>{option.text}</Text>
            {option.description && (
              <Text style={styles.optionDescription}>{option.description}</Text>
            )}
          </View>
          <Ionicons name="chevron-forward" size={20} color="#6366f1" />
        </TouchableOpacity>
      ))}
    </View>
  </View>
);

const ProgressBar = ({ progress, current, total }) => (
  <View style={styles.progressContainer}>
    <View style={styles.progressBar}>
      <View style={[styles.progressFill, { width: `${progress}%` }]} />
    </View>
    <Text style={styles.progressText}>{current} of {total}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60, paddingHorizontal: 20 },
  header: { alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 24, color: '#f8fafc', fontWeight: 'bold', marginTop: 10 },
  subtitle: { fontSize: 16, color: '#cbd5e1', marginBottom: 20 },
  questionCard: { backgroundColor: '#1e293b', padding: 20, borderRadius: 12, marginBottom: 20 },
  questionHeader: { marginBottom: 20 },
  questionCategory: { fontSize: 14, color: '#6366f1', fontWeight: '600', marginBottom: 8 },
  questionDescription: { fontSize: 14, color: '#94a3b8', lineHeight: 20 },
  questionText: { fontSize: 20, color: '#f1f5f9', marginBottom: 20, fontWeight: '600' },
  optionsContainer: { gap: 12 },
  optionButton: {
    backgroundColor: '#334155',
    padding: 16,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#475569',
  },
  optionContent: { flex: 1 },
  optionText: { color: '#e2e8f0', fontSize: 16, fontWeight: '500', marginBottom: 4 },
  optionDescription: { color: '#94a3b8', fontSize: 12, lineHeight: 16 },
  progressContainer: { width: '100%', marginBottom: 20 },
  progressBar: {
    height: 8,
    backgroundColor: '#475569',
    borderRadius: 10,
    overflow: 'hidden',
  },
  progressFill: { height: 8, backgroundColor: '#6366f1' },
  progressText: {
    marginTop: 6,
    fontSize: 14,
    color: '#cbd5e1',
    textAlign: 'right',
  },
  button: {
    marginTop: 30,
    backgroundColor: '#6366f1',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#64748b',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  scrollContainer: { paddingBottom: 50 },
});

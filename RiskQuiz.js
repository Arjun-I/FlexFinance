import React, { useState, useMemo } from 'react';
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
import { auth } from './firebase';
import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
        const profileRef = doc(db, 'users', user.uid);
        await setDoc(profileRef, {
          riskProfile: categoryScores,
        }, { merge: true });

        await AsyncStorage.setItem(`riskQuizCompleted_${user.uid}`, 'true');
        setHasCompletedQuiz(true);
        navigation.reset({ index: 0, routes: [{ name: 'Dashboard' }] });
      } catch (err) {
        console.error('Error saving risk profile:', err);
        Alert.alert('Error', 'Failed to save risk profile.');
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
            <Text style={styles.subtitle}>Risk profile saved successfully</Text>
            <TouchableOpacity style={styles.button} onPress={handleFinish}>
              <Text style={styles.buttonText}>Continue</Text>
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
  <View>
    <Text style={styles.questionText}>{question.question}</Text>
    {question.options.map((option, index) => (
      <TouchableOpacity
        key={index}
        style={styles.optionButton}
        onPress={() => onAnswer(option.scores)}
      >
        <Text style={styles.optionText}>{option.text}</Text>
        <Ionicons name="chevron-forward" size={20} color="#6366f1" />
      </TouchableOpacity>
    ))}
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
  questionText: { fontSize: 20, color: '#f1f5f9', marginBottom: 20 },
  optionButton: {
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#475569',
  },
  optionText: { color: '#e2e8f0', fontSize: 16, fontWeight: '500' },
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
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  scrollContainer: { paddingBottom: 50 },
});

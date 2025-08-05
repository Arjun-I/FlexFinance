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
    category: 'volatilityTolerance',
    question: 'How would you react if your investment lost 20% of its value in a month?',
    options: [
      { text: 'Sell immediately', score: 1 },
      { text: 'Wait and see', score: 2 },
      { text: 'Buy more if fundamentals are good', score: 3 },
      { text: 'Consider it a buying opportunity', score: 4 },
    ],
  },
  {
    id: 2,
    category: 'liquidityNeed',
    question: 'How soon might you need to withdraw your investments?',
    options: [
      { text: 'Within 6 months', score: 1 },
      { text: '1-3 years', score: 2 },
      { text: '3-5 years', score: 3 },
      { text: 'Not for 5+ years', score: 4 },
    ],
  },
  {
    id: 3,
    category: 'timeHorizon',
    question: 'How long do you plan to invest?',
    options: [
      { text: 'Less than 1 year', score: 1 },
      { text: '1-3 years', score: 2 },
      { text: '3-10 years', score: 3 },
      { text: 'More than 10 years', score: 4 },
    ],
  },
  {
    id: 4,
    category: 'investorKnowledge',
    question: 'How familiar are you with investing concepts?',
    options: [
      { text: 'Not at all', score: 1 },
      { text: 'Basic', score: 2 },
      { text: 'Moderate', score: 3 },
      { text: 'Very experienced', score: 4 },
    ],
  },
  {
    id: 5,
    category: 'ethicsPreference',
    question: 'Do you want to avoid certain industries?',
    options: [
      { text: 'Yes, avoid fossil fuels', score: 'green energy' },
      { text: 'Yes, avoid tobacco/alcohol', score: 'no tobacco' },
      { text: 'No strong preference', score: 'neutral' },
      { text: 'I prefer high returns over ethics', score: 'maximize returns' },
    ],
  },
];

const mapScoreToProfile = (score) => {
  if (score <= 7) {
    return {
      level: 'Conservative',
      description: 'You prefer stable investments with minimal risk.',
      color: '#10b981',
    };
  }
  if (score <= 11) {
    return {
      level: 'Moderate',
      description: 'You are comfortable with a balance of risk and return.',
      color: '#3b82f6',
    };
  }
  if (score <= 15) {
    return {
      level: 'Growth',
      description: 'You can tolerate more risk for higher potential returns.',
      color: '#f59e0b',
    };
  }
  return {
    level: 'Aggressive',
    description: 'You are willing to take high risks for maximum gains.',
    color: '#ef4444',
  };
};

export default function RiskQuiz({ navigation, setHasCompletedQuiz }) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);

const { totalScore, percentage, profile: riskProfile } = useMemo(() => {
    if (!showResults) {
      return { totalScore: 0, percentage: 0, profile: null };
    }
    const numericScores = Object.values(answers).filter(
      (value) => typeof value === 'number'
    );
    const totalScore = numericScores.reduce((sum, val) => sum + val, 0);
    const percentage = Math.round(
      (totalScore / (numericScores.length * 4)) * 100
    );
    const profile = mapScoreToProfile(totalScore);
    return { totalScore, percentage, profile };
  }, [showResults, answers]);

  const handleAnswer = (score) => {
    const category = questions[currentQuestion].category;
    setAnswers((prev) => ({ ...prev, [category]: score }));
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
        await setDoc(
          doc(db, 'users', user.uid),
          { riskProfile, answers },
          { merge: true }
        );
        await AsyncStorage.setItem(`riskQuizCompleted_${user.uid}`, 'true');
        if (typeof setHasCompletedQuiz === 'function') {
          setHasCompletedQuiz(true);
        }
        navigation.reset({ index: 0, routes: [{ name: 'Dashboard' }] });
      } catch (err) {
        if (err.code === 'permission-denied') {
          Alert.alert('Permission denied', 'Please log in again.');
          navigation.navigate('Login');
        } else {
          console.error('Error saving risk profile:', err);
        }
      }
    }
  };

  if (showResults) {
    return (
      <LinearGradient colors={['#0f172a', '#1e293b', '#334155']} style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.header}>
            <Ionicons name="trophy" size={60} color={riskProfile.color} />
            <Text style={styles.title}>Risk Assessment Complete!</Text>
            <Text style={styles.subtitle}>Here&apos;s your risk profile</Text>
          </View>
          <ResultCard profile={riskProfile} totalScore={totalScore} percentage={percentage} />
          <TouchableOpacity
            style={styles.button}
            onPress={handleFinish}
          >
            <Text style={styles.buttonText}>Continue to Dashboard</Text>
          </TouchableOpacity>
        </ScrollView>
      </LinearGradient>
    );
  }

  const currentQ = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <LinearGradient colors={['#0f172a', '#1e293b', '#334155']} style={styles.container}>
      <View style={styles.header}>
        <ProgressBar progress={progress} current={currentQuestion + 1} total={questions.length} />
      </View>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <QuestionCard question={currentQ} onAnswer={handleAnswer} />
      </ScrollView>
    </LinearGradient>
  );
}

// Subcomponent: Progress Bar
const ProgressBar = ({ progress, current, total }) => (
  <View style={styles.progressContainer}>
    <View style={styles.progressBar}>
      <View style={[styles.progressFill, { width: `${progress}%` }]} />
    </View>
    <Text style={styles.progressText}>
      {current} of {total}
    </Text>
  </View>
);

// Subcomponent: Question Card
const QuestionCard = ({ question, onAnswer }) => (
  <View>
    <View style={styles.questionContainer}>
      <Text style={styles.questionNumber}>Question {question.id}</Text>
      <Text style={styles.questionText}>{question.question}</Text>
    </View>
    <View style={{ marginBottom: 24 }}>
      {question.options.map((option, index) => (
        <TouchableOpacity key={index} style={styles.optionButton} onPress={() => onAnswer(option.score)}>
          <Text style={styles.optionText}>{option.text}</Text>
          <Ionicons name="chevron-forward" size={20} color="#6366f1" />
        </TouchableOpacity>
      ))}
    </View>
  </View>
);

// Subcomponent: Results Card
const ResultCard = ({ profile, totalScore, percentage }) => (
  <>
    <View style={[styles.riskCard, { borderColor: profile.color }]}>
      <Text style={[styles.riskLevel, { color: profile.color }]}>
        {profile.level}
      </Text>
      <Text style={styles.riskDescription}>
        {profile.description}
      </Text>
    </View>
    <View style={styles.statsContainer}>
      <View style={styles.statCard}>
        <Text style={styles.statNumber}>{totalScore}</Text>
        <Text style={styles.statLabel}>Total Score</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statNumber}>{percentage}%</Text>
        <Text style={styles.statLabel}>Risk Tolerance</Text>
      </View>
    </View>
  </>
);


const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  scrollContainer: {
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    color: '#e2e8f0',
    fontWeight: 'bold',
    marginTop: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#cbd5e1',
    marginTop: 4,
  },
  questionContainer: {
    marginBottom: 24,
  },
  questionNumber: {
    fontSize: 16,
    color: '#94a3b8',
    fontWeight: '500',
    marginBottom: 4,
  },
  questionText: {
    fontSize: 20,
    color: '#f1f5f9',
    fontWeight: 'bold',
    marginBottom: 16,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#475569',
  },
  optionText: {
    color: '#e2e8f0',
    fontSize: 16,
    fontWeight: '500',
  },
  progressContainer: {
    marginBottom: 20,
    width: '100%',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#475569',
    borderRadius: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: 8,
    backgroundColor: '#6366f1',
  },
  progressText: {
    marginTop: 6,
    fontSize: 14,
    color: '#cbd5e1',
    textAlign: 'right',
  },
  button: {
    marginTop: 30,
    backgroundColor: '#6366f1',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '600',
  },
  riskCard: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 20,
    marginVertical: 24,
    backgroundColor: '#1e293b',
  },
  riskLevel: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  riskDescription: {
    fontSize: 16,
    color: '#cbd5e1',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  statCard: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f8fafc',
  },
  statLabel: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },
});

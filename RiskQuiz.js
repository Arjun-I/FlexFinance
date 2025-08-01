import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const questions = [
  {
    id: 1,
    question: "How would you react if your investment lost 20% of its value in a month?",
    options: [
      { text: "Sell immediately", score: 1 },
      { text: "Wait and see", score: 2 },
      { text: "Buy more if fundamentals are good", score: 3 },
      { text: "Consider it a buying opportunity", score: 4 },
    ]
  },
  {
    id: 2,
    question: "What's your primary investment goal?",
    options: [
      { text: "Preserve capital", score: 1 },
      { text: "Steady income", score: 2 },
      { text: "Growth over time", score: 3 },
      { text: "Maximum returns", score: 4 },
    ]
  },
  {
    id: 3,
    question: "How long do you plan to invest?",
    options: [
      { text: "Less than 1 year", score: 1 },
      { text: "1-3 years", score: 2 },
      { text: "3-10 years", score: 3 },
      { text: "More than 10 years", score: 4 },
    ]
  },
  {
    id: 4,
    question: "What percentage of your income do you save?",
    options: [
      { text: "Less than 5%", score: 1 },
      { text: "5-10%", score: 2 },
      { text: "10-20%", score: 3 },
      { text: "More than 20%", score: 4 },
    ]
  },
  {
    id: 5,
    question: "How do you feel about market volatility?",
    options: [
      { text: "Very uncomfortable", score: 1 },
      { text: "Somewhat uncomfortable", score: 2 },
      { text: "Neutral", score: 3 },
      { text: "Comfortable with volatility", score: 4 },
    ]
  }
];

export default function RiskQuiz() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);

  const handleAnswer = (score) => {
    const newAnswers = { ...answers, [currentQuestion]: score };
    setAnswers(newAnswers);

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      setShowResults(true);
    }
  };

  const calculateRiskProfile = () => {
    const totalScore = Object.values(answers).reduce((sum, score) => sum + score, 0);
    const maxScore = questions.length * 4;
    const percentage = (totalScore / maxScore) * 100;

    if (percentage <= 25) return { level: 'Conservative', color: '#10b981', description: 'You prefer low-risk investments with steady returns.' };
    if (percentage <= 50) return { level: 'Moderate', color: '#f59e0b', description: 'You balance risk and return with a moderate approach.' };
    if (percentage <= 75) return { level: 'Aggressive', color: '#ef4444', description: 'You seek higher returns and accept more risk.' };
    return { level: 'Very Aggressive', color: '#dc2626', description: 'You pursue maximum returns and are comfortable with high risk.' };
  };

  const riskProfile = showResults ? calculateRiskProfile() : null;

  const progress = ((currentQuestion + 1) / questions.length) * 100;

  if (showResults) {
    return (
      <LinearGradient
        colors={['#0f172a', '#1e293b', '#334155']}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.header}>
            <Ionicons name="trophy" size={60} color={riskProfile.color} />
            <Text style={styles.title}>Risk Assessment Complete!</Text>
            <Text style={styles.subtitle}>Here's your risk profile</Text>
          </View>

          <View style={[styles.riskCard, { borderColor: riskProfile.color }]}>
            <Text style={[styles.riskLevel, { color: riskProfile.color }]}>
              {riskProfile.level}
            </Text>
            <Text style={styles.riskDescription}>
              {riskProfile.description}
            </Text>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>
                {Object.values(answers).reduce((sum, score) => sum + score, 0)}
              </Text>
              <Text style={styles.statLabel}>Total Score</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>
                {Math.round((Object.values(answers).reduce((sum, score) => sum + score, 0) / (questions.length * 4)) * 100)}%
              </Text>
              <Text style={styles.statLabel}>Risk Tolerance</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={() => {
              // Navigate to dashboard or save results
              Alert.alert('Success', 'Your risk profile has been saved!');
            }}
          >
            <Text style={styles.buttonText}>Continue to Dashboard</Text>
          </TouchableOpacity>
        </ScrollView>
      </LinearGradient>
    );
  }

  const currentQ = questions[currentQuestion];

  return (
    <LinearGradient
      colors={['#0f172a', '#1e293b', '#334155']}
      style={styles.container}
    >
      <View style={styles.header}>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {currentQuestion + 1} of {questions.length}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.questionContainer}>
          <Text style={styles.questionNumber}>Question {currentQuestion + 1}</Text>
          <Text style={styles.questionText}>{currentQ.question}</Text>
        </View>

        <View style={styles.optionsContainer}>
          {currentQ.options.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={styles.optionButton}
              onPress={() => handleAnswer(option.score)}
            >
              <Text style={styles.optionText}>{option.text}</Text>
              <Ionicons name="chevron-forward" size={20} color="#6366f1" />
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
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  progressContainer: {
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
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
    fontSize: 14,
    fontWeight: '600',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  questionContainer: {
    marginBottom: 32,
  },
  questionNumber: {
    color: '#6366f1',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  questionText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    lineHeight: 32,
  },
  optionsContainer: {
    gap: 16,
  },
  optionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  optionText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 32,
  },
  riskCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    borderWidth: 2,
  },
  riskLevel: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  riskDescription: {
    color: '#e2e8f0',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6366f1',
    marginBottom: 4,
  },
  statLabel: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '500',
  },
  button: {
    backgroundColor: '#6366f1',
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366f1',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
});

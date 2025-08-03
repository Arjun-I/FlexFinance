import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

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


export default function RiskQuiz({ navigation, setHasCompletedQuiz }) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);

  const totalScore = useMemo(() => Object.values(answers).reduce((a, b) => a + b, 0), [answers]);
  const maxScore = questions.length * 4;
  const percentage = Math.round((totalScore / maxScore) * 100);

  const riskProfile = useMemo(() => {
    if (!showResults) return null;
    if (percentage <= 25) return { level: 'Conservative', color: '#10b981', description: 'You prefer low-risk investments with steady returns.' };
    if (percentage <= 50) return { level: 'Moderate', color: '#f59e0b', description: 'You balance risk and return with a moderate approach.' };
    if (percentage <= 75) return { level: 'Aggressive', color: '#ef4444', description: 'You seek higher returns and accept more risk.' };
    return { level: 'Very Aggressive', color: '#dc2626', description: 'You pursue maximum returns and are comfortable with high risk.' };
  }, [showResults, percentage]);

  const handleAnswer = (score) => {
    setAnswers(prev => ({ ...prev, [currentQuestion]: score }));
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      setShowResults(true);
    }
  };

  const handleFinish = () => {
    if (typeof setHasCompletedQuiz === 'function') {
      setHasCompletedQuiz(true);
    }
    navigation.navigate('Dashboard');
  };

  if (showResults) {
    return (
      <LinearGradient colors={['#0f172a', '#1e293b', '#334155']} style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.header}>
            <Ionicons name="trophy" size={60} color={riskProfile.color} />
            <Text style={styles.title}>Risk Assessment Complete!</Text>
            <Text style={styles.subtitle}>Here's your risk profile</Text>
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



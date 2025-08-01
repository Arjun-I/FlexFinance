import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const RiskQuiz = () => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [progressAnim] = useState(new Animated.Value(0));

  const questions = [
    {
      id: 1,
      question: "What is your investment experience?",
      options: [
        { text: "I'm new to investing", score: 1 },
        { text: "Some experience with basic investments", score: 2 },
        { text: "Moderate experience with various investments", score: 3 },
        { text: "Extensive experience with complex investments", score: 4 },
      ]
    },
    {
      id: 2,
      question: "What is your investment time horizon?",
      options: [
        { text: "Less than 2 years", score: 1 },
        { text: "2-5 years", score: 2 },
        { text: "5-10 years", score: 3 },
        { text: "More than 10 years", score: 4 },
      ]
    },
    {
      id: 3,
      question: "How would you react to a 20% portfolio decline?",
      options: [
        { text: "Sell everything immediately", score: 1 },
        { text: "Sell some investments to reduce risk", score: 2 },
        { text: "Hold and wait for recovery", score: 3 },
        { text: "Buy more while prices are low", score: 4 },
      ]
    },
    {
      id: 4,
      question: "What percentage of your income do you invest?",
      options: [
        { text: "Less than 5%", score: 1 },
        { text: "5-10%", score: 2 },
        { text: "10-20%", score: 3 },
        { text: "More than 20%", score: 4 },
      ]
    },
    {
      id: 5,
      question: "Which statement best describes your financial goals?",
      options: [
        { text: "Preserve capital with minimal risk", score: 1 },
        { text: "Steady growth with low risk", score: 2 },
        { text: "Balanced growth with moderate risk", score: 3 },
        { text: "Maximum growth, willing to accept high risk", score: 4 },
      ]
    },
    {
      id: 6,
      question: "How important is liquidity (easy access to your money)?",
      options: [
        { text: "Very important - need immediate access", score: 1 },
        { text: "Somewhat important - occasional access needed", score: 2 },
        { text: "Not very important - rarely need access", score: 3 },
        { text: "Not important - can lock up for years", score: 4 },
      ]
    }
  ];

  const riskProfiles = {
    conservative: {
      name: "Conservative",
      range: [6, 12],
      description: "You prefer stability and capital preservation over growth",
      allocation: {
        stocks: 20,
        bonds: 60,
        cash: 15,
        alternatives: 5
      },
      color: "#2E8B57",
      icon: "shield-checkmark"
    },
    moderate: {
      name: "Moderate",
      range: [13, 18],
      description: "You seek balanced growth with controlled risk",
      allocation: {
        stocks: 50,
        bonds: 35,
        cash: 10,
        alternatives: 5
      },
      color: "#1B365D",
      icon: "balance"
    },
    aggressive: {
      name: "Aggressive",
      range: [19, 24],
      description: "You prioritize growth and can tolerate higher volatility",
      allocation: {
        stocks: 80,
        bonds: 15,
        cash: 3,
        alternatives: 2
      },
      color: "#FF6B35",
      icon: "trending-up"
    }
  };

  const handleAnswer = (option) => {
    const newAnswers = { ...answers, [currentQuestion]: option };
    setAnswers(newAnswers);

    // Animate progress
    Animated.timing(progressAnim, {
      toValue: (currentQuestion + 1) / questions.length,
      duration: 300,
      useNativeDriver: false,
    }).start();

    if (currentQuestion < questions.length - 1) {
      setTimeout(() => {
        setCurrentQuestion(currentQuestion + 1);
      }, 300);
    } else {
      setTimeout(() => {
        calculateResults(newAnswers);
      }, 500);
    }
  };

  const calculateResults = (allAnswers) => {
    const totalScore = Object.values(allAnswers).reduce((sum, answer) => sum + answer.score, 0);
    setShowResults(true);
  };

  const getTotalScore = () => {
    return Object.values(answers).reduce((sum, answer) => sum + answer.score, 0);
  };

  const getRiskProfile = () => {
    const score = getTotalScore();
    for (const [key, profile] of Object.entries(riskProfiles)) {
      if (score >= profile.range[0] && score <= profile.range[1]) {
        return profile;
      }
    }
    return riskProfiles.moderate;
  };

  const resetQuiz = () => {
    setCurrentQuestion(0);
    setAnswers({});
    setShowResults(false);
    progressAnim.setValue(0);
  };

  if (showResults) {
    const profile = getRiskProfile();
    const score = getTotalScore();

    return (
      <SafeAreaView style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <LinearGradient
            colors={['#1B365D', '#2E5984']}
            style={styles.header}
          >
            <Ionicons name="analytics" size={60} color="#FFD700" />
            <Text style={styles.headerTitle}>Risk Assessment Results</Text>
            <Text style={styles.headerSubtitle}>Your Investment Profile</Text>
          </LinearGradient>

          <View style={styles.content}>
            <View style={styles.resultsCard}>
              <View style={styles.profileHeader}>
                <LinearGradient
                  colors={[profile.color, profile.color + '80']}
                  style={styles.profileIcon}
                >
                  <Ionicons name={profile.icon} size={40} color="white" />
                </LinearGradient>
                <View style={styles.profileInfo}>
                  <Text style={styles.profileName}>{profile.name} Investor</Text>
                  <Text style={styles.profileScore}>Score: {score}/24</Text>
                </View>
              </View>

              <Text style={styles.profileDescription}>{profile.description}</Text>

              <View style={styles.allocationSection}>
                <Text style={styles.sectionTitle}>Recommended Asset Allocation</Text>
                
                {Object.entries(profile.allocation).map(([asset, percentage]) => (
                  <View key={asset} style={styles.allocationItem}>
                    <View style={styles.allocationLabel}>
                      <Text style={styles.assetName}>{asset.charAt(0).toUpperCase() + asset.slice(1)}</Text>
                      <Text style={styles.assetPercentage}>{percentage}%</Text>
                    </View>
                    <View style={styles.allocationBar}>
                      <View 
                        style={[
                          styles.allocationFill, 
                          { 
                            width: `${percentage}%`,
                            backgroundColor: profile.color
                          }
                        ]} 
                      />
                    </View>
                  </View>
                ))}
              </View>

              <View style={styles.recommendationsSection}>
                <Text style={styles.sectionTitle}>Personalized Recommendations</Text>
                
                {profile.name === 'Conservative' && (
                  <View style={styles.recommendation}>
                    <Ionicons name="bulb" size={20} color="#FFD700" />
                    <Text style={styles.recommendationText}>
                      Focus on high-quality bonds, dividend-paying stocks, and maintain a larger cash position for stability.
                    </Text>
                  </View>
                )}

                {profile.name === 'Moderate' && (
                  <View style={styles.recommendation}>
                    <Ionicons name="bulb" size={20} color="#FFD700" />
                    <Text style={styles.recommendationText}>
                      Balance growth and income with a mix of stocks and bonds. Consider index funds for diversification.
                    </Text>
                  </View>
                )}

                {profile.name === 'Aggressive' && (
                  <View style={styles.recommendation}>
                    <Ionicons name="bulb" size={20} color="#FFD700" />
                    <Text style={styles.recommendationText}>
                      Focus on growth stocks, emerging markets, and consider small allocations to alternative investments.
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.actionButtons}>
                <TouchableOpacity style={styles.retakeButton} onPress={resetQuiz}>
                  <Text style={styles.retakeButtonText}>Retake Quiz</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.implementButton}>
                  <LinearGradient
                    colors={['#2E8B57', '#3CB371']}
                    style={styles.implementGradient}
                  >
                    <Text style={styles.implementButtonText}>Implement Strategy</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#1B365D', '#2E5984']}
        style={styles.header}
      >
        <Ionicons name="clipboard" size={40} color="#FFD700" />
        <Text style={styles.headerTitle}>Risk Assessment</Text>
        <Text style={styles.headerSubtitle}>Question {currentQuestion + 1} of {questions.length}</Text>
        
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {Math.round(((currentQuestion + 1) / questions.length) * 100)}% Complete
          </Text>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.questionCard}>
          <Text style={styles.questionText}>
            {questions[currentQuestion].question}
          </Text>

          <View style={styles.optionsContainer}>
            {questions[currentQuestion].options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={styles.optionButton}
                onPress={() => handleAnswer(option)}
              >
                <View style={styles.optionContent}>
                  <Text style={styles.optionText}>{option.text}</Text>
                  <Ionicons name="chevron-forward" size={20} color="#666" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {currentQuestion > 0 && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              setCurrentQuestion(currentQuestion - 1);
              progressAnim.setValue((currentQuestion - 1) / questions.length);
            }}
          >
            <Ionicons name="arrow-back" size={20} color="#1B365D" />
            <Text style={styles.backButtonText}>Previous Question</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  header: {
    padding: 20,
    paddingTop: 40,
    alignItems: 'center',
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 10,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#B8D4E3',
    marginTop: 5,
  },
  progressContainer: {
    width: '100%',
    marginTop: 20,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 4,
  },
  progressText: {
    color: '#B8D4E3',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  questionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    marginTop: -20,
  },
  questionText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1B365D',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 28,
  },
  optionsContainer: {
    gap: 15,
  },
  optionButton: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  optionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
    marginRight: 10,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    padding: 15,
  },
  backButtonText: {
    fontSize: 16,
    color: '#1B365D',
    marginLeft: 8,
    fontWeight: '500',
  },
  resultsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 25,
    marginTop: -20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  profileIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1B365D',
  },
  profileScore: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  profileDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 30,
    textAlign: 'center',
  },
  allocationSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B365D',
    marginBottom: 20,
  },
  allocationItem: {
    marginBottom: 15,
  },
  allocationLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  assetName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  assetPercentage: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1B365D',
  },
  allocationBar: {
    height: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  allocationFill: {
    height: '100%',
    borderRadius: 4,
  },
  recommendationsSection: {
    marginBottom: 30,
  },
  recommendation: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF9E6',
    padding: 15,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FFD700',
  },
  recommendationText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
    flex: 1,
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 15,
  },
  retakeButton: {
    flex: 1,
    padding: 15,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#1B365D',
    alignItems: 'center',
  },
  retakeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1B365D',
  },
  implementButton: {
    flex: 1,
  },
  implementGradient: {
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  implementButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

export default RiskQuiz;
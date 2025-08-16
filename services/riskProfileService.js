// riskProfileService.js - Risk Profile Analysis and Generation
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';

class RiskProfileService {
  // Generate detailed risk profile analysis
  generateRiskProfile(scores) {
    const profile = {
      volatility: this.analyzeVolatility(scores.volatility),
      liquidity: this.analyzeLiquidity(scores.liquidity),
      timeHorizon: this.analyzeTimeHorizon(scores.timeHorizon),
      knowledge: this.analyzeKnowledge(scores.knowledge),
      ethics: this.analyzeEthics(scores.ethics),
      overallRisk: this.calculateOverallRisk(scores),
      investmentStyle: this.determineInvestmentStyle(scores),
      recommendedSectors: this.getRecommendedSectors(scores),
      riskTolerance: this.getRiskTolerance(scores),
      portfolioAllocation: this.getPortfolioAllocation(scores),
    };

    return profile;
  }

  // Analyze volatility tolerance
  analyzeVolatility(score) {
    const maxScore = 32; // 8 questions * 4 max score
    const percentage = (score / maxScore) * 100;
    
    if (percentage <= 25) {
      return {
        level: 'Conservative',
        description: 'You prefer stable, low-volatility investments',
        tolerance: 'Low',
        percentage: percentage,
        recommendations: ['Blue-chip stocks', 'Dividend-paying companies', 'Government bonds']
      };
    } else if (percentage <= 50) {
      return {
        level: 'Moderate',
        description: 'You can handle some market fluctuations',
        tolerance: 'Medium',
        percentage: percentage,
        recommendations: ['Large-cap stocks', 'Balanced funds', 'Corporate bonds']
      };
    } else if (percentage <= 75) {
      return {
        level: 'Aggressive',
        description: 'You\'re comfortable with significant market swings',
        tolerance: 'High',
        percentage: percentage,
        recommendations: ['Growth stocks', 'Small-cap companies', 'International markets']
      };
    } else {
      return {
        level: 'Very Aggressive',
        description: 'You actively seek high-risk, high-reward opportunities',
        tolerance: 'Very High',
        percentage: percentage,
        recommendations: ['Emerging markets', 'Startup investments', 'Commodities']
      };
    }
  }

  // Analyze liquidity needs
  analyzeLiquidity(score) {
    const maxScore = 32;
    const percentage = (score / maxScore) * 100;
    
    if (percentage <= 25) {
      return {
        level: 'High Liquidity',
        description: 'You need quick access to your funds',
        needs: 'High',
        percentage: percentage,
        recommendations: ['Money market funds', 'Short-term bonds', 'Liquid ETFs']
      };
    } else if (percentage <= 50) {
      return {
        level: 'Moderate Liquidity',
        description: 'You can lock up funds for medium periods',
        needs: 'Medium',
        percentage: percentage,
        recommendations: ['Medium-term bonds', 'Blue-chip stocks', 'Balanced funds']
      };
    } else {
      return {
        level: 'Low Liquidity',
        description: 'You can commit funds for long periods',
        needs: 'Low',
        percentage: percentage,
        recommendations: ['Long-term bonds', 'Real estate', 'Private equity']
      };
    }
  }

  // Analyze time horizon
  analyzeTimeHorizon(score) {
    const maxScore = 32;
    const percentage = (score / maxScore) * 100;
    
    if (percentage <= 25) {
      return {
        level: 'Short-term',
        description: 'You plan to invest for less than 3 years',
        horizon: '0-3 years',
        percentage: percentage,
        recommendations: ['Money market', 'Short-term bonds', 'Liquid assets']
      };
    } else if (percentage <= 50) {
      return {
        level: 'Medium-term',
        description: 'You plan to invest for 3-7 years',
        horizon: '3-7 years',
        percentage: percentage,
        recommendations: ['Balanced funds', 'Corporate bonds', 'Large-cap stocks']
      };
    } else {
      return {
        level: 'Long-term',
        description: 'You plan to invest for 7+ years',
        horizon: '7+ years',
        percentage: percentage,
        recommendations: ['Growth stocks', 'International markets', 'Real estate']
      };
    }
  }

  // Analyze investment knowledge
  analyzeKnowledge(score) {
    const maxScore = 32;
    const percentage = (score / maxScore) * 100;
    
    if (percentage <= 25) {
      return {
        level: 'Beginner',
        description: 'You\'re new to investing and learning',
        expertise: 'Low',
        percentage: percentage,
        recommendations: ['Index funds', 'Target-date funds', 'Robo-advisors']
      };
    } else if (percentage <= 50) {
      return {
        level: 'Intermediate',
        description: 'You have some investment experience',
        expertise: 'Medium',
        percentage: percentage,
        recommendations: ['Actively managed funds', 'Individual stocks', 'Bond ladders']
      };
    } else {
      return {
        level: 'Expert',
        description: 'You have advanced investment knowledge',
        expertise: 'High',
        percentage: percentage,
        recommendations: ['Options trading', 'Alternative investments', 'International markets']
      };
    }
  }

  // Analyze ethical preferences
  analyzeEthics(score) {
    const maxScore = 20; // 5 questions * 4 max score
    const percentage = (score / maxScore) * 100;
    
    if (percentage <= 25) {
      return {
        level: 'Returns-focused',
        description: 'You prioritize financial returns over ethical considerations',
        priority: 'Low',
        percentage: percentage,
        recommendations: ['Traditional investments', 'All sectors considered']
      };
    } else if (percentage <= 50) {
      return {
        level: 'Balanced',
        description: 'You consider both returns and ethical factors',
        priority: 'Medium',
        percentage: percentage,
        recommendations: ['ESG funds', 'Sustainable companies', 'Mixed approach']
      };
    } else {
      return {
        level: 'ESG-focused',
        description: 'You strongly prioritize environmental and social responsibility',
        priority: 'High',
        percentage: percentage,
        recommendations: ['Green energy', 'Social impact funds', 'ESG leaders']
      };
    }
  }

  // Calculate overall risk score
  calculateOverallRisk(scores) {
    const totalScore = scores.volatility + scores.liquidity + scores.timeHorizon + scores.knowledge + scores.ethics;
    const maxPossible = 160; // 8 questions * 4 max score * 5 categories
    const percentage = (totalScore / maxPossible) * 100;
    
    if (percentage <= 30) {
      return { level: 'Conservative', percentage, description: 'Low-risk, stable investments' };
    } else if (percentage <= 60) {
      return { level: 'Moderate', percentage, description: 'Balanced risk and return' };
    } else {
      return { level: 'Aggressive', percentage, description: 'High-risk, high-return potential' };
    }
  }

  // Determine investment style
  determineInvestmentStyle(scores) {
    const volatility = scores.volatility;
    const ethics = scores.ethics;
    
    if (volatility <= 8 && ethics <= 5) {
      return 'Conservative Traditional';
    } else if (volatility <= 8 && ethics > 5) {
      return 'Conservative ESG';
    } else if (volatility > 8 && volatility <= 16 && ethics <= 5) {
      return 'Moderate Traditional';
    } else if (volatility > 8 && volatility <= 16 && ethics > 5) {
      return 'Moderate ESG';
    } else if (volatility > 16 && ethics <= 5) {
      return 'Aggressive Traditional';
    } else {
      return 'Aggressive ESG';
    }
  }

  // Get recommended sectors based on profile
  getRecommendedSectors(scores) {
    const sectors = [];
    
    if (scores.volatility <= 8) {
      sectors.push('Consumer Staples', 'Healthcare', 'Utilities');
    } else if (scores.volatility <= 16) {
      sectors.push('Technology', 'Financial Services', 'Consumer Discretionary');
    } else {
      sectors.push('Technology', 'Biotechnology', 'Energy', 'Mining');
    }
    
    if (scores.ethics > 10) {
      sectors.push('Renewable Energy', 'Sustainable Technology', 'Social Impact');
    }
    
    return sectors;
  }

  // Get risk tolerance description
  getRiskTolerance(scores) {
    const total = scores.volatility + scores.liquidity + scores.timeHorizon;
    const max = 96; // 3 categories * 32 max
    
    if (total <= 32) {
      return {
        level: 'Conservative',
        description: 'You prefer safety and stability over growth',
        color: '#10b981'
      };
    } else if (total <= 64) {
      return {
        level: 'Moderate',
        description: 'You balance risk and return appropriately',
        color: '#f59e0b'
      };
    } else {
      return {
        level: 'Aggressive',
        description: 'You seek growth and can handle volatility',
        color: '#ef4444'
      };
    }
  }

  // Get portfolio allocation recommendations
  getPortfolioAllocation(scores) {
    const riskTolerance = this.getRiskTolerance(scores);
    
    if (riskTolerance.level === 'Conservative') {
      return {
        stocks: '20-30%',
        bonds: '50-60%',
        cash: '10-20%',
        alternatives: '0-10%'
      };
    } else if (riskTolerance.level === 'Moderate') {
      return {
        stocks: '40-60%',
        bonds: '30-40%',
        cash: '5-15%',
        alternatives: '5-15%'
      };
    } else {
      return {
        stocks: '70-80%',
        bonds: '10-20%',
        cash: '0-10%',
        alternatives: '10-20%'
      };
    }
  }

  // Save detailed risk profile to Firestore
  async saveRiskProfile(profile) {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      const profileRef = doc(db, 'users', user.uid);
      await setDoc(profileRef, {
        riskProfile: profile,
        riskProfileDetailed: this.generateRiskProfile(profile),
        quizCompletedAt: new Date(),
        quizCompleted: true,
        lastUpdated: new Date()
      }, { merge: true });

      console.log('✅ Detailed risk profile saved');
      return true;
    } catch (error) {
      console.error('❌ Error saving risk profile:', error);
      return false;
    }
  }

  // Get risk profile for LLM context
  async getRiskProfileForLLM() {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();
      
      if (!userData?.riskProfileDetailed) {
        return null;
      }

      return {
        overallRisk: userData.riskProfileDetailed.overallRisk,
        investmentStyle: userData.riskProfileDetailed.investmentStyle,
        riskTolerance: userData.riskProfileDetailed.riskTolerance,
        recommendedSectors: userData.riskProfileDetailed.recommendedSectors,
        portfolioAllocation: userData.riskProfileDetailed.portfolioAllocation,
        volatility: userData.riskProfileDetailed.volatility,
        ethics: userData.riskProfileDetailed.ethics,
        timeHorizon: userData.riskProfileDetailed.timeHorizon
      };
    } catch (error) {
      console.error('❌ Error getting risk profile:', error);
      return null;
    }
  }
}

export default new RiskProfileService(); 
// llmService.js - LLM Integration for Stock Recommendations
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db, auth } from './firebase';

import Constants from 'expo-constants';

// Mock LLM API endpoint (replace with actual LLM service)
const LLM_API_ENDPOINT = 'https://api.openai.com/v1/chat/completions';
const LLM_API_KEY = Constants.expoConfig?.extra?.EXPO_PUBLIC_OPENAI_API_KEY || "sk-placeholder-key";

class LLMService {
  constructor() {
    this.userPreferences = null;
    this.riskProfile = null;
    this.likedStocks = [];
    this.rejectedStocks = [];
  }

  // Load user data for LLM context
  async loadUserContext() {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error('User not authenticated');

      // Load user profile and preferences
      const userDoc = await getDoc(doc(db, 'users', uid));
      const userData = userDoc.data();
      
      this.riskProfile = userData?.riskProfile || {};
      this.userPreferences = {
        likedStocks: userData?.likedStocks || [],
        portfolio: userData?.portfolio || [],
        cashBalance: userData?.cashBalance || 100000,
      };

      // Load rejected stocks
      const rejectedSnap = await getDocs(collection(db, 'users', uid, 'rejected'));
      this.rejectedStocks = rejectedSnap.docs.map(doc => doc.data());

      console.log('✅ User context loaded for LLM');
      return true;
    } catch (error) {
      console.error('❌ Error loading user context:', error);
      return false;
    }
  }

  // Generate personalized stock recommendations
  async getRecommendations(maxRecommendations = 10) {
    try {
      if (!this.riskProfile || !this.userPreferences) {
        await this.loadUserContext();
      }

      const prompt = this.buildRecommendationPrompt(maxRecommendations);
      const recommendations = await this.callLLM(prompt);
      
      return this.parseRecommendations(recommendations, maxRecommendations);
    } catch (error) {
      console.error('❌ Error getting recommendations:', error);
      return this.getFallbackRecommendations(maxRecommendations);
    }
  }

  // Build context-aware prompt for LLM
  buildRecommendationPrompt(maxRecommendations) {
    const riskProfile = this.riskProfile;
    const likedStocks = this.userPreferences.likedStocks;
    const rejectedStocks = this.rejectedStocks;
    const portfolio = this.userPreferences.portfolio;

    return `
You are a financial advisor providing personalized stock recommendations.

User Profile:
- Risk Tolerance: ${this.getRiskLevel(riskProfile.volatility)}
- Investment Horizon: ${this.getTimeHorizon(riskProfile.timeHorizon)}
- Investment Knowledge: ${this.getKnowledgeLevel(riskProfile.knowledge)}
- Ethical Preferences: ${this.getEthicalLevel(riskProfile.ethics)}
- Current Cash: $${this.userPreferences.cashBalance.toLocaleString()}

User Preferences:
- Liked Stocks: ${likedStocks.map(s => s.symbol).join(', ') || 'None'}
- Rejected Stocks: ${rejectedStocks.map(s => s.symbol).join(', ') || 'None'}
- Current Portfolio: ${portfolio.map(p => `${p.shares}x ${p.ticker}`).join(', ') || 'Empty'}

Based on the user's risk profile and preferences, recommend exactly ${maxRecommendations} stocks that would be suitable for this investor. Consider:
1. Risk tolerance alignment
2. Investment horizon compatibility
3. Portfolio diversification
4. User's previous likes/rejections
5. Ethical preferences
6. Market sectors that align with user preferences

IMPORTANT: Generate diverse stock recommendations across different sectors (Technology, Healthcare, Finance, Consumer, Energy, Industrial, etc.) based on the user's risk profile. Do not repeat stocks the user has already liked or rejected.

Format your response as a JSON array with objects containing:
{
  "symbol": "STOCK_SYMBOL",
  "reason": "Brief explanation of why this stock fits the user's profile",
  "riskLevel": "low/medium/high",
  "confidence": 0.0-1.0,
  "sector": "Technology/Healthcare/Finance/Consumer/Energy/Industrial/etc"
}
`;
  }

  // Call LLM API (mock implementation)
  async callLLM(prompt) {
    if (!LLM_API_KEY) {
      console.warn('⚠️ No LLM API key configured, using mock response');
      return this.getMockRecommendations();
    }

    try {
      const response = await fetch(LLM_API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${LLM_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are a financial advisor providing personalized stock recommendations. Always respond with valid JSON.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });

      const data = await response.json();
      return data.choices[0]?.message?.content || this.getMockRecommendations();
    } catch (error) {
      console.error('❌ LLM API error:', error);
      return this.getMockRecommendations();
    }
  }

  // Parse LLM recommendations
  parseRecommendations(llmResponse, maxRecommendations) {
    try {
      const recommendations = JSON.parse(llmResponse);
      return recommendations.slice(0, maxRecommendations);
    } catch (error) {
      console.error('❌ Error parsing LLM response:', error);
      return this.getFallbackRecommendations([], maxRecommendations);
    }
  }

  // Fallback recommendations based on risk profile
  getFallbackRecommendations(maxRecommendations) {
    const riskLevel = this.getRiskLevel(this.riskProfile?.volatility);
    
    const recommendations = {
      low: [
        { symbol: 'AAPL', sector: 'Technology', reason: 'Stable tech giant with strong fundamentals' },
        { symbol: 'MSFT', sector: 'Technology', reason: 'Diversified tech company with cloud growth' },
        { symbol: 'JNJ', sector: 'Healthcare', reason: 'Defensive healthcare stock with dividend' },
        { symbol: 'PG', sector: 'Consumer', reason: 'Consumer staples with stable earnings' },
        { symbol: 'KO', sector: 'Consumer', reason: 'Beverage giant with global presence' },
        { symbol: 'WMT', sector: 'Consumer', reason: 'Retail leader with defensive characteristics' },
        { symbol: 'HD', sector: 'Consumer', reason: 'Home improvement leader with strong brand' },
        { symbol: 'MCD', sector: 'Consumer', reason: 'Fast food leader with global reach' },
        { symbol: 'DIS', sector: 'Consumer', reason: 'Entertainment giant with diverse revenue' },
        { symbol: 'PEP', sector: 'Consumer', reason: 'Beverage company with strong cash flow' }
      ],
      medium: [
        { symbol: 'GOOGL', sector: 'Technology', reason: 'Tech leader with advertising dominance' },
        { symbol: 'AMZN', sector: 'Consumer', reason: 'E-commerce and cloud services leader' },
        { symbol: 'TSLA', sector: 'Consumer', reason: 'Electric vehicle and clean energy pioneer' },
        { symbol: 'NVDA', sector: 'Technology', reason: 'AI and gaming chip leader' },
        { symbol: 'META', sector: 'Technology', reason: 'Social media and metaverse company' },
        { symbol: 'NFLX', sector: 'Consumer', reason: 'Streaming entertainment leader' },
        { symbol: 'CRM', sector: 'Technology', reason: 'Cloud software and customer relations' },
        { symbol: 'ADBE', sector: 'Technology', reason: 'Creative software and digital media' },
        { symbol: 'PYPL', sector: 'Technology', reason: 'Digital payments and fintech leader' },
        { symbol: 'UBER', sector: 'Technology', reason: 'Ride-sharing and delivery platform' }
      ],
      high: [
        { symbol: 'AMD', sector: 'Technology', reason: 'Semiconductor company with growth potential' },
        { symbol: 'SPOT', sector: 'Consumer', reason: 'Music streaming with global expansion' },
        { symbol: 'ZM', sector: 'Technology', reason: 'Video communications platform' },
        { symbol: 'CRWD', sector: 'Technology', reason: 'Cybersecurity with high growth' },
        { symbol: 'PLTR', sector: 'Technology', reason: 'Data analytics and AI platform' },
        { symbol: 'SNOW', sector: 'Technology', reason: 'Cloud data warehousing company' },
        { symbol: 'RBLX', sector: 'Technology', reason: 'Gaming and metaverse platform' },
        { symbol: 'SQ', sector: 'Technology', reason: 'Digital payments and fintech' },
        { symbol: 'SHOP', sector: 'Technology', reason: 'E-commerce platform for businesses' },
        { symbol: 'TWLO', sector: 'Technology', reason: 'Cloud communications platform' }
      ]
    };

    const suitableStocks = recommendations[riskLevel] || recommendations.medium;
    return suitableStocks.slice(0, maxRecommendations).map(stock => ({
      ...stock,
      riskLevel,
      confidence: 0.8
    }));
  }

  // Mock LLM response for testing
  getMockRecommendations() {
    const riskLevel = this.getRiskLevel(this.riskProfile?.volatility);
    
    const mockRecommendations = {
      low: [
        { symbol: 'AAPL', sector: 'Technology', reason: 'Stable tech giant suitable for conservative investors', riskLevel: 'low', confidence: 0.9 },
        { symbol: 'MSFT', sector: 'Technology', reason: 'Diversified tech company with strong fundamentals', riskLevel: 'low', confidence: 0.85 },
        { symbol: 'JNJ', sector: 'Healthcare', reason: 'Defensive healthcare stock with dividend', riskLevel: 'low', confidence: 0.8 },
        { symbol: 'PG', sector: 'Consumer', reason: 'Consumer staples with stable earnings', riskLevel: 'low', confidence: 0.8 },
        { symbol: 'KO', sector: 'Consumer', reason: 'Beverage giant with global presence', riskLevel: 'low', confidence: 0.75 }
      ],
      medium: [
        { symbol: 'GOOGL', sector: 'Technology', reason: 'Market leader with consistent growth', riskLevel: 'medium', confidence: 0.8 },
        { symbol: 'AMZN', sector: 'Consumer', reason: 'E-commerce and cloud services leader', riskLevel: 'medium', confidence: 0.75 },
        { symbol: 'TSLA', sector: 'Consumer', reason: 'Electric vehicle and clean energy pioneer', riskLevel: 'medium', confidence: 0.7 },
        { symbol: 'NVDA', sector: 'Technology', reason: 'AI and gaming chip leader', riskLevel: 'medium', confidence: 0.75 },
        { symbol: 'META', sector: 'Technology', reason: 'Social media and metaverse company', riskLevel: 'medium', confidence: 0.7 }
      ],
      high: [
        { symbol: 'AMD', sector: 'Technology', reason: 'Semiconductor company with growth potential', riskLevel: 'high', confidence: 0.7 },
        { symbol: 'SPOT', sector: 'Consumer', reason: 'Music streaming with global expansion', riskLevel: 'high', confidence: 0.65 },
        { symbol: 'ZM', sector: 'Technology', reason: 'Video communications platform', riskLevel: 'high', confidence: 0.6 },
        { symbol: 'CRWD', sector: 'Technology', reason: 'Cybersecurity with high growth', riskLevel: 'high', confidence: 0.65 },
        { symbol: 'PLTR', sector: 'Technology', reason: 'Data analytics and AI platform', riskLevel: 'high', confidence: 0.6 }
      ]
    };

    return JSON.stringify(mockRecommendations[riskLevel] || mockRecommendations.medium);
  }

  // Helper methods for risk profile interpretation
  getRiskLevel(volatility) {
    if (volatility <= 8) return 'low';
    if (volatility <= 12) return 'medium';
    return 'high';
  }

  getTimeHorizon(horizon) {
    if (horizon <= 8) return 'short-term (1-3 years)';
    if (horizon <= 12) return 'medium-term (3-5 years)';
    return 'long-term (5+ years)';
  }

  getKnowledgeLevel(knowledge) {
    if (knowledge <= 8) return 'beginner';
    if (knowledge <= 12) return 'intermediate';
    return 'expert';
  }

  getEthicalLevel(ethics) {
    if (ethics <= 8) return 'returns-focused';
    if (ethics <= 12) return 'balanced';
    return 'ethics-focused';
  }

  // Get personalized stock analysis
  async getStockAnalysis(symbol) {
    try {
      const prompt = `
Analyze the stock ${symbol} for a user with:
- Risk Profile: ${JSON.stringify(this.riskProfile)}
- Liked Stocks: ${this.userPreferences.likedStocks.map(s => s.symbol).join(', ')}
- Rejected Stocks: ${this.rejectedStocks.map(s => s.symbol).join(', ')}

Provide a brief analysis including:
1. Suitability for this investor
2. Key risks and benefits
3. Portfolio fit
4. Recommendation (buy/hold/avoid)

Format as JSON with fields: analysis, suitability, risks, benefits, recommendation
`;

      const response = await this.callLLM(prompt);
      return JSON.parse(response);
    } catch (error) {
      console.error('❌ Error getting stock analysis:', error);
      return {
        analysis: 'Unable to generate analysis at this time',
        suitability: 'unknown',
        risks: ['Analysis unavailable'],
        benefits: ['Analysis unavailable'],
        recommendation: 'hold'
      };
    }
  }
}

export default new LLMService(); 
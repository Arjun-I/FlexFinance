// llmService.js - LLM Integration for Stock Recommendations
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';

import Constants from 'expo-constants';

// Mock LLM API endpoint (replace with actual LLM service)
const LLM_API_ENDPOINT = 'https://api.openai.com/v1/chat/completions';
const LLM_API_KEY = Constants.expoConfig?.extra?.EXPO_PUBLIC_OPENAI_API_KEY;

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
3. Portfolio diversification across different sectors and industries
4. User's previous likes/rejections
5. Ethical preferences
6. Market sectors and industries that align with user preferences

IMPORTANT: Generate diverse stock recommendations across different sectors (Technology, Healthcare, Finance, Consumer, Energy, Industrial, etc.) and industries within those sectors. Do not repeat stocks the user has already liked or rejected.

Format your response as a JSON array with objects containing:
{
  "symbol": "STOCK_SYMBOL",
  "reason": "Brief explanation of why this stock fits the user's profile",
  "riskLevel": "low/medium/high",
  "confidence": 0.0-1.0,
  "sector": "Technology/Healthcare/Finance/Consumer/Energy/Industrial/etc",
  "industry": "Software/Pharmaceuticals/Banking/Retail/Oil & Gas/Manufacturing/etc",
  "marketCap": "large/mid/small",
  "growthPotential": "low/medium/high"
}
`;
  }

  // Call LLM API (mock implementation)
  async callLLM(prompt) {
    if (!LLM_API_KEY || LLM_API_KEY === "sk-placeholder-key" || LLM_API_KEY.includes("placeholder")) {
      console.warn('⚠️ No valid LLM API key configured, using mock response');
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
      // Handle both string and object responses
      const responseText = typeof llmResponse === 'string' ? llmResponse : JSON.stringify(llmResponse);
      const recommendations = JSON.parse(responseText);
      
      // Ensure we have an array of recommendations
      if (Array.isArray(recommendations)) {
        return recommendations.slice(0, maxRecommendations);
      } else if (recommendations.recommendations && Array.isArray(recommendations.recommendations)) {
        return recommendations.recommendations.slice(0, maxRecommendations);
      } else {
        console.warn('❌ Unexpected LLM response format:', recommendations);
        return this.getFallbackRecommendations(maxRecommendations);
      }
    } catch (error) {
      console.error('❌ Error parsing LLM response:', error);
      return this.getFallbackRecommendations(maxRecommendations);
    }
  }

  // Fallback recommendations based on risk profile
  getFallbackRecommendations(maxRecommendations) {
    const riskLevel = this.getRiskLevel(this.riskProfile?.volatility);
    
    const recommendations = {
      low: [
        { symbol: 'AAPL', sector: 'Technology', industry: 'Consumer Electronics', reason: 'Stable tech giant with strong fundamentals' },
        { symbol: 'MSFT', sector: 'Technology', industry: 'Software', reason: 'Diversified tech company with cloud growth' },
        { symbol: 'JNJ', sector: 'Healthcare', industry: 'Pharmaceuticals', reason: 'Defensive healthcare stock with dividend' },
        { symbol: 'PG', sector: 'Consumer', industry: 'Consumer Staples', reason: 'Consumer staples with stable earnings' },
        { symbol: 'KO', sector: 'Consumer', industry: 'Beverages', reason: 'Beverage giant with global presence' },
        { symbol: 'WMT', sector: 'Consumer', industry: 'Retail', reason: 'Retail leader with defensive characteristics' },
        { symbol: 'HD', sector: 'Consumer', industry: 'Home Improvement', reason: 'Home improvement leader with strong brand' },
        { symbol: 'MCD', sector: 'Consumer', industry: 'Restaurants', reason: 'Fast food leader with global reach' },
        { symbol: 'DIS', sector: 'Consumer', industry: 'Entertainment', reason: 'Entertainment giant with diverse revenue' },
        { symbol: 'PEP', sector: 'Consumer', industry: 'Beverages', reason: 'Beverage company with strong cash flow' }
      ],
      medium: [
        { symbol: 'GOOGL', sector: 'Technology', industry: 'Internet Services', reason: 'Tech leader with advertising dominance' },
        { symbol: 'AMZN', sector: 'Consumer', industry: 'E-commerce', reason: 'E-commerce and cloud services leader' },
        { symbol: 'TSLA', sector: 'Consumer', industry: 'Automotive', reason: 'Electric vehicle and clean energy pioneer' },
        { symbol: 'NVDA', sector: 'Technology', industry: 'Semiconductors', reason: 'AI and gaming chip leader' },
        { symbol: 'META', sector: 'Technology', industry: 'Social Media', reason: 'Social media and metaverse company' },
        { symbol: 'NFLX', sector: 'Consumer', industry: 'Entertainment', reason: 'Streaming entertainment leader' },
        { symbol: 'CRM', sector: 'Technology', industry: 'Software', reason: 'Cloud software and customer relations' },
        { symbol: 'ADBE', sector: 'Technology', industry: 'Software', reason: 'Creative software and digital media' },
        { symbol: 'PYPL', sector: 'Technology', industry: 'Financial Technology', reason: 'Digital payments and fintech leader' },
        { symbol: 'UBER', sector: 'Technology', industry: 'Transportation', reason: 'Ride-sharing and delivery platform' }
      ],
      high: [
        { symbol: 'AMD', sector: 'Technology', industry: 'Semiconductors', reason: 'Semiconductor company with growth potential' },
        { symbol: 'SPOT', sector: 'Consumer', industry: 'Entertainment', reason: 'Music streaming with global expansion' },
        { symbol: 'ZM', sector: 'Technology', industry: 'Software', reason: 'Video communications platform' },
        { symbol: 'CRWD', sector: 'Technology', industry: 'Cybersecurity', reason: 'Cybersecurity with high growth' },
        { symbol: 'PLTR', sector: 'Technology', industry: 'Software', reason: 'Data analytics and AI platform' },
        { symbol: 'SNOW', sector: 'Technology', industry: 'Software', reason: 'Cloud data warehousing company' },
        { symbol: 'RBLX', sector: 'Technology', industry: 'Gaming', reason: 'Gaming and metaverse platform' },
        { symbol: 'SQ', sector: 'Technology', industry: 'Financial Technology', reason: 'Digital payments and fintech' },
        { symbol: 'SHOP', sector: 'Technology', industry: 'E-commerce', reason: 'E-commerce platform for businesses' },
        { symbol: 'TWLO', sector: 'Technology', industry: 'Software', reason: 'Cloud communications platform' }
      ]
    };

    const suitableStocks = recommendations[riskLevel] || recommendations.medium;
    return suitableStocks.slice(0, maxRecommendations).map(stock => ({
      ...stock,
      riskLevel,
      confidence: 0.8,
      marketCap: 'large',
      growthPotential: riskLevel === 'high' ? 'high' : riskLevel === 'medium' ? 'medium' : 'low'
    }));
  }

  // Mock LLM response for testing
  getMockRecommendations() {
    const riskLevel = this.getRiskLevel(this.riskProfile?.volatility);
    
    const mockRecommendations = {
      low: [
        { symbol: 'AAPL', sector: 'Technology', industry: 'Consumer Electronics', reason: 'Stable tech giant suitable for conservative investors', riskLevel: 'low', confidence: 0.9 },
        { symbol: 'MSFT', sector: 'Technology', industry: 'Software', reason: 'Diversified tech company with strong fundamentals', riskLevel: 'low', confidence: 0.85 },
        { symbol: 'JNJ', sector: 'Healthcare', industry: 'Pharmaceuticals', reason: 'Defensive healthcare stock with dividend', riskLevel: 'low', confidence: 0.8 },
        { symbol: 'PG', sector: 'Consumer', industry: 'Consumer Staples', reason: 'Consumer staples with stable earnings', riskLevel: 'low', confidence: 0.8 },
        { symbol: 'KO', sector: 'Consumer', industry: 'Beverages', reason: 'Beverage giant with global presence', riskLevel: 'low', confidence: 0.75 }
      ],
      medium: [
        { symbol: 'GOOGL', sector: 'Technology', industry: 'Internet Services', reason: 'Market leader with consistent growth', riskLevel: 'medium', confidence: 0.8 },
        { symbol: 'AMZN', sector: 'Consumer', industry: 'E-commerce', reason: 'E-commerce and cloud services leader', riskLevel: 'medium', confidence: 0.75 },
        { symbol: 'TSLA', sector: 'Consumer', industry: 'Automotive', reason: 'Electric vehicle and clean energy pioneer', riskLevel: 'medium', confidence: 0.7 },
        { symbol: 'NVDA', sector: 'Technology', industry: 'Semiconductors', reason: 'AI and gaming chip leader', riskLevel: 'medium', confidence: 0.75 },
        { symbol: 'META', sector: 'Technology', industry: 'Social Media', reason: 'Social media and metaverse company', riskLevel: 'medium', confidence: 0.7 }
      ],
      high: [
        { symbol: 'AMD', sector: 'Technology', industry: 'Semiconductors', reason: 'Semiconductor company with growth potential', riskLevel: 'high', confidence: 0.7 },
        { symbol: 'SPOT', sector: 'Consumer', industry: 'Entertainment', reason: 'Music streaming with global expansion', riskLevel: 'high', confidence: 0.65 },
        { symbol: 'ZM', sector: 'Technology', industry: 'Software', reason: 'Video communications platform', riskLevel: 'high', confidence: 0.6 },
        { symbol: 'CRWD', sector: 'Technology', industry: 'Cybersecurity', reason: 'Cybersecurity with high growth', riskLevel: 'high', confidence: 0.65 },
        { symbol: 'PLTR', sector: 'Technology', industry: 'Software', reason: 'Data analytics and AI platform', riskLevel: 'high', confidence: 0.6 }
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
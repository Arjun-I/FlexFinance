// llmService.js - LLM Integration for Stock Recommendations
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';

import Constants from 'expo-constants';

// Mock LLM API endpoint (replace with actual LLM service)
const LLM_API_ENDPOINT = 'https://api.openai.com/v1/chat/completions';
const LLM_API_KEY = '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';

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
You are an expert financial advisor providing personalized stock recommendations for investment purposes.

INVESTMENT CONTEXT:
- User's Risk Tolerance: ${this.getRiskLevel(riskProfile.volatility)}
- Investment Horizon: ${this.getTimeHorizon(riskProfile.timeHorizon)}
- Investment Knowledge: ${this.getKnowledgeLevel(riskProfile.knowledge)}
- Current Cash Available: $${this.userPreferences.cashBalance.toLocaleString()}
- Portfolio Value: $${this.userPreferences.portfolio.reduce((sum, p) => sum + (p.shares * p.averagePrice), 0).toLocaleString()}

USER PREFERENCES:
- Previously Liked Stocks: ${likedStocks.map(s => s.symbol).join(', ') || 'None'}
- Previously Rejected Stocks: ${rejectedStocks.map(s => s.symbol).join(', ') || 'None'}
- Current Portfolio Holdings: ${portfolio.map(p => `${p.shares}x ${p.ticker}`).join(', ') || 'Empty'}

INVESTMENT REQUIREMENTS:
Generate exactly ${maxRecommendations} stock recommendations that are suitable for this investor to consider for investment. Each recommendation must include:

1. **Stock Analysis**: Detailed analysis of why this stock fits the user's profile
2. **Investment Thesis**: Clear reasoning for why this stock is a good investment
3. **Risk Assessment**: Specific risks and how they align with user's risk tolerance
4. **Growth Potential**: Expected growth drivers and timeline
5. **Portfolio Fit**: How this stock diversifies their current holdings

IMPORTANT INVESTMENT CRITERIA:
- Diversify across different sectors (Technology, Healthcare, Finance, Consumer, Energy, Industrial, etc.)
- Consider market capitalization (large, mid, small cap)
- Factor in current market conditions and trends
- Avoid stocks the user has already liked or rejected
- Provide actionable investment insights

RESPONSE FORMAT - Return a JSON array with objects containing:
{
  "symbol": "STOCK_SYMBOL",
  "name": "Full Company Name",
  "sector": "Technology/Healthcare/Finance/Consumer/Energy/Industrial/etc",
  "industry": "Software/Pharmaceuticals/Banking/Retail/Oil & Gas/Manufacturing/etc",
  "reason": "Detailed investment thesis explaining why this stock is recommended",
  "analysis": "Comprehensive analysis of the company's business model, financials, and growth prospects",
  "riskLevel": "low/medium/high",
  "confidence": 0.0-1.0,
  "marketCap": "large/mid/small",
  "growthPotential": "low/medium/high",
  "investmentHorizon": "short-term/medium-term/long-term",
  "keyRisks": ["Risk 1", "Risk 2", "Risk 3"],
  "keyBenefits": ["Benefit 1", "Benefit 2", "Benefit 3"],
  "targetPrice": "Current price estimate",
  "dividendYield": "Dividend yield if applicable",
  "recommendation": "buy/hold/avoid"
}

Focus on providing investment-grade analysis that would help an investor make informed decisions.
`;
  }

  // Call LLM API (mock implementation)
  async callLLM(prompt) {
    const apiKey = LLM_API_KEY;
    
    // Check if API key is properly configured
    if (!apiKey || apiKey === "sk-placeholder-key" || apiKey.includes("placeholder") || apiKey === "your_openai_api_key_here") {
      console.error('❌ No valid LLM API key configured');
      throw new Error('OpenAI API key not configured. Please set a valid API key.');
    }

    try {
      console.log('🤖 Calling OpenAI API with 4o mini model...');
      console.log('📝 Prompt length:', prompt.length, 'characters');
      
      const response = await fetch(LLM_API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are an expert financial advisor providing personalized stock recommendations for investment purposes. Always respond with valid JSON.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 2000,
        }),
      });

      console.log('📡 API Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ OpenAI API error:', response.status, errorData);
        throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      console.log('📄 Raw API response:', JSON.stringify(data, null, 2));
      
      const content = data.choices?.[0]?.message?.content;
      
      if (!content) {
        console.error('❌ No content in OpenAI response');
        throw new Error('No content received from OpenAI API');
      }

      console.log('✅ OpenAI API call successful with 4o mini model');
      console.log('📝 Response content length:', content.length, 'characters');
      return content;
    } catch (error) {
      console.error('❌ LLM API error:', error.message);
      throw error; // Don't fall back to mock, let the error propagate
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
        console.error('❌ Unexpected LLM response format:', recommendations);
        throw new Error('Invalid response format from LLM');
      }
    } catch (error) {
      console.error('❌ Error parsing LLM response:', error);
      throw new Error(`Failed to parse LLM response: ${error.message}`);
    }
  }

  // Fallback recommendations based on risk profile - only used if LLM completely fails
  getFallbackRecommendations(maxRecommendations) {
    const riskLevel = this.getRiskLevel(this.riskProfile?.volatility);
    
    const recommendations = {
      low: [
        { symbol: 'AAPL', sector: 'Technology', industry: 'Consumer Electronics', reason: 'Stable tech giant with strong fundamentals', riskLevel: 'low', confidence: 0.8 },
        { symbol: 'MSFT', sector: 'Technology', industry: 'Software', reason: 'Diversified tech company with cloud growth', riskLevel: 'low', confidence: 0.85 },
        { symbol: 'JNJ', sector: 'Healthcare', industry: 'Pharmaceuticals', reason: 'Defensive healthcare stock with dividend', riskLevel: 'low', confidence: 0.8 },
        { symbol: 'PG', sector: 'Consumer', industry: 'Consumer Staples', reason: 'Consumer staples with stable earnings', riskLevel: 'low', confidence: 0.8 },
        { symbol: 'KO', sector: 'Consumer', industry: 'Beverages', reason: 'Beverage giant with global presence', riskLevel: 'low', confidence: 0.75 },
        { symbol: 'WMT', sector: 'Consumer', industry: 'Retail', reason: 'Retail leader with defensive characteristics', riskLevel: 'low', confidence: 0.75 },
        { symbol: 'HD', sector: 'Consumer', industry: 'Home Improvement', reason: 'Home improvement leader with strong brand', riskLevel: 'low', confidence: 0.75 },
        { symbol: 'MCD', sector: 'Consumer', industry: 'Restaurants', reason: 'Fast food leader with global reach', riskLevel: 'low', confidence: 0.75 },
        { symbol: 'DIS', sector: 'Consumer', industry: 'Entertainment', reason: 'Entertainment giant with diverse revenue', riskLevel: 'low', confidence: 0.75 },
        { symbol: 'PEP', sector: 'Consumer', industry: 'Beverages', reason: 'Beverage company with strong cash flow', riskLevel: 'low', confidence: 0.75 }
      ],
      medium: [
        { symbol: 'GOOGL', sector: 'Technology', industry: 'Internet Services', reason: 'Tech leader with advertising dominance', riskLevel: 'medium', confidence: 0.8 },
        { symbol: 'AMZN', sector: 'Consumer', industry: 'E-commerce', reason: 'E-commerce and cloud services leader', riskLevel: 'medium', confidence: 0.75 },
        { symbol: 'TSLA', sector: 'Consumer', industry: 'Automotive', reason: 'Electric vehicle and clean energy pioneer', riskLevel: 'medium', confidence: 0.7 },
        { symbol: 'NVDA', sector: 'Technology', industry: 'Semiconductors', reason: 'AI and gaming chip leader', riskLevel: 'medium', confidence: 0.75 },
        { symbol: 'META', sector: 'Technology', industry: 'Social Media', reason: 'Social media and metaverse company', riskLevel: 'medium', confidence: 0.7 },
        { symbol: 'NFLX', sector: 'Consumer', industry: 'Entertainment', reason: 'Streaming entertainment leader', riskLevel: 'medium', confidence: 0.65 },
        { symbol: 'CRM', sector: 'Technology', industry: 'Software', reason: 'Cloud software and customer relations', riskLevel: 'medium', confidence: 0.7 },
        { symbol: 'ADBE', sector: 'Technology', industry: 'Software', reason: 'Creative software and digital media', riskLevel: 'medium', confidence: 0.7 },
        { symbol: 'PYPL', sector: 'Technology', industry: 'Financial Technology', reason: 'Digital payments and fintech leader', riskLevel: 'medium', confidence: 0.7 },
        { symbol: 'UBER', sector: 'Technology', industry: 'Transportation', reason: 'Ride-sharing and delivery platform', riskLevel: 'medium', confidence: 0.65 }
      ],
      high: [
        { symbol: 'AMD', sector: 'Technology', industry: 'Semiconductors', reason: 'Semiconductor company with growth potential', riskLevel: 'high', confidence: 0.7 },
        { symbol: 'SPOT', sector: 'Consumer', industry: 'Entertainment', reason: 'Music streaming with global expansion', riskLevel: 'high', confidence: 0.65 },
        { symbol: 'ZM', sector: 'Technology', industry: 'Software', reason: 'Video communications platform', riskLevel: 'high', confidence: 0.6 },
        { symbol: 'CRWD', sector: 'Technology', industry: 'Cybersecurity', reason: 'Cybersecurity with high growth', riskLevel: 'high', confidence: 0.65 },
        { symbol: 'PLTR', sector: 'Technology', industry: 'Software', reason: 'Data analytics and AI platform', riskLevel: 'high', confidence: 0.6 },
        { symbol: 'SNOW', sector: 'Technology', industry: 'Software', reason: 'Cloud data warehousing company', riskLevel: 'high', confidence: 0.6 },
        { symbol: 'RBLX', sector: 'Technology', industry: 'Gaming', reason: 'Gaming and metaverse platform', riskLevel: 'high', confidence: 0.6 },
        { symbol: 'SQ', sector: 'Technology', industry: 'Financial Technology', reason: 'Digital payments and fintech', riskLevel: 'high', confidence: 0.6 },
        { symbol: 'SHOP', sector: 'Technology', industry: 'E-commerce', reason: 'E-commerce platform for businesses', riskLevel: 'high', confidence: 0.6 },
        { symbol: 'TWLO', sector: 'Technology', industry: 'Software', reason: 'Cloud communications platform', riskLevel: 'high', confidence: 0.6 }
      ]
    };

    const suitableStocks = recommendations[riskLevel] || recommendations.medium;
    return suitableStocks.slice(0, maxRecommendations).map(stock => ({
      ...stock,
      riskLevel: stock.riskLevel || 'medium',
      confidence: stock.confidence || 0.7,
      marketCap: 'large',
      growthPotential: riskLevel === 'high' ? 'high' : riskLevel === 'medium' ? 'medium' : 'low'
    }));
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
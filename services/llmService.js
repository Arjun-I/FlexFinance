// llmService.js - LLM Integration for Stock Recommendations
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';

import Constants from 'expo-constants';

// Mock LLM API endpoint (replace with actual LLM service)
const LLM_API_ENDPOINT = 'https://api.openai.com/v1/chat/completions';
const LLM_API_KEY = Constants.expoConfig?.extra?.EXPO_PUBLIC_OPENAI_API_KEY || process.env.EXPO_PUBLIC_OPENAI_API_KEY;

// Debug API key loading (without exposing key details)
console.log('🔑 LLM API Key Debug:', {
  hasKey: !!LLM_API_KEY,
  keyLength: LLM_API_KEY ? LLM_API_KEY.length : 0,
  fromExtra: !!Constants.expoConfig?.extra?.EXPO_PUBLIC_OPENAI_API_KEY,
  fromEnv: !!process.env.EXPO_PUBLIC_OPENAI_API_KEY
});

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
      
      this.userPreferences = {
        likedStocks: userData?.likedStocks || [],
        portfolio: userData?.portfolio || [],
        cashBalance: userData?.cashBalance || 100000,
      };

      // Load risk profile from the correct location
      const riskDoc = await getDoc(doc(db, 'users', uid, 'preferences', 'quiz'));
      const riskData = riskDoc.data();
      
      this.riskProfile = riskData?.riskProfile || {
        volatility: 10,
        timeHorizon: 3,
        knowledge: 2,
        ethics: 3,
        liquidity: 2
      };

      // Load rejected stocks
      const rejectedSnap = await getDocs(collection(db, 'users', uid, 'rejected'));
      this.rejectedStocks = rejectedSnap.docs.map(doc => doc.data());

      console.log('✅ User context loaded for LLM');
      console.log('📊 Risk profile loaded:', this.riskProfile);
      return true;
    } catch (error) {
      console.error('❌ Error loading user context:', error);
      return false;
    }
  }

  // Generate personalized stock recommendations
  async getRecommendations(maxRecommendations = 10) {
    try {
      console.log('🤖 LLM Service: Starting recommendations...');
      
      if (!this.riskProfile || !this.userPreferences) {
        console.log('🤖 LLM Service: Loading user context...');
        await this.loadUserContext();
      }

      console.log('🤖 LLM Service: Building prompt...');
      const prompt = this.buildRecommendationPrompt(maxRecommendations);
      console.log('🤖 LLM Service: Prompt length:', prompt.length, 'characters');
      console.log('🤖 LLM Service: Prompt preview:', prompt.substring(0, 500) + '...');
      
      console.log('🤖 LLM Service: Calling LLM...');
      const recommendations = await this.callLLM(prompt);
      console.log('🤖 LLM Service: Raw LLM response received, length:', recommendations?.length || 0);
      console.log('🤖 LLM Service: Raw response preview:', recommendations?.substring(0, 200) + '...');
      
      console.log('🤖 LLM Service: Parsing recommendations...');
      const parsed = this.parseRecommendations(recommendations, maxRecommendations);
      console.log('🤖 LLM Service: Parsed recommendations:', parsed.length);
      
      if (!parsed || parsed.length === 0) {
        console.error('❌ No recommendations parsed from LLM response');
        throw new Error('LLM failed to generate valid recommendations. Please try again.');
      }
      
      return parsed;
    } catch (error) {
      console.error('❌ LLM Service Error getting recommendations:', error);
      console.log('❌ LLM Service: No recommendations generated');
      throw new Error('LLM failed to generate recommendations. Please try again.');
    }
  }

  // Build context-aware prompt for LLM with learning
  buildRecommendationPrompt(maxRecommendations) {
    const riskProfile = this.riskProfile;
    const likedStocks = this.userPreferences.likedStocks;
    const rejectedStocks = this.userPreferences.rejectedStocks || [];
    const portfolio = this.userPreferences.portfolio;

    console.log('📊 Building prompt with risk profile:', riskProfile);
    console.log('📊 Risk tolerance:', this.getRiskLevel(riskProfile.volatility));
    console.log('📊 Investment horizon:', this.getTimeHorizon(riskProfile.timeHorizon));
    console.log('📊 Learning from choices - Liked:', likedStocks.length, 'Rejected:', rejectedStocks.length);

    return `
Generate ${maxRecommendations} stock recommendations for an investor with risk tolerance: ${this.getRiskLevel(riskProfile.volatility)}.

Return a JSON array with exactly ${maxRecommendations} objects:
[
  {
    "symbol": "STOCK_SYMBOL",
    "name": "Company Name", 
    "sector": "Technology",
    "industry": "Software",
    "reason": "Brief reason for recommendation",
    "analysis": "Brief analysis",
    "riskLevel": "medium",
    "confidence": 0.7,
    "marketCap": "large",
    "growthPotential": "medium",
    "investmentHorizon": "medium-term",
    "keyRisks": ["Market risk", "Sector risk"],
    "keyBenefits": ["Growth potential", "Strong fundamentals"],
    "targetPrice": "$100.00",
    "dividendYield": "2.5%",
    "recommendation": "buy"
  }
]

Focus on providing investment-grade analysis that would help an investor make informed decisions.
Use the learning context to provide more personalized recommendations.
`;
  }

  // Call LLM API (mock implementation)
  async callLLM(prompt) {
    const apiKey = LLM_API_KEY;
    
    console.log('🔑 LLM API Key Status:', {
      hasKey: !!apiKey,
      keyLength: apiKey ? apiKey.length : 0,
      isPlaceholder: apiKey === "sk-placeholder-key" || apiKey === "your_openai_api_key_here",
      fromExtra: !!Constants.expoConfig?.extra?.EXPO_PUBLIC_OPENAI_API_KEY,
      fromEnv: !!process.env.EXPO_PUBLIC_OPENAI_API_KEY
    });
    
    // Check if API key is properly configured
    if (!apiKey || apiKey === "sk-placeholder-key" || apiKey.includes("placeholder") || apiKey === "your_openai_api_key_here") {
      console.error('❌ No valid LLM API key configured');
      console.log('💡 To fix this:');
      console.log('1. Get a free API key from https://platform.openai.com/api-keys');
      console.log('2. Create a .env file in your project root');
      console.log('3. Add EXPO_PUBLIC_OPENAI_API_KEY=your_key_here to the .env file');
      console.log('4. Restart the app with: npx expo start --clear');
      throw new Error('OpenAI API key not configured. Please set a valid API key in .env file.');
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
        console.error('❌ Full response data:', JSON.stringify(data, null, 2));
        throw new Error('No content received from OpenAI API');
      }

      console.log('✅ OpenAI API call successful with 4o mini model');
      console.log('📝 Response content length:', content.length, 'characters');
      console.log('📝 Response content preview:', content.substring(0, 500) + '...');
      return content;
    } catch (error) {
      console.error('❌ LLM API error:', error.message);
      throw error; // Don't fall back to mock, let the error propagate
    }
  }

  // Parse LLM recommendations with robust error handling
  parseRecommendations(llmResponse, maxRecommendations) {
    try {
      console.log('🔄 Parsing LLM response...');
      console.log('📝 Raw response type:', typeof llmResponse);
      console.log('📝 Raw response length:', llmResponse?.length || 0);
      console.log('📝 Raw response preview:', llmResponse?.substring(0, 200) + '...');
      
      // Handle both string and object responses
      const responseText = typeof llmResponse === 'string' ? llmResponse : JSON.stringify(llmResponse);
      
      // Clean the response text to extract JSON
      let cleanedText = responseText.trim();
      
      // Try to extract JSON from markdown code blocks
      const jsonMatch = cleanedText.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        cleanedText = jsonMatch[1];
      }
      
      // Try to extract JSON from code blocks without language specifier
      const codeMatch = cleanedText.match(/```\s*([\s\S]*?)\s*```/);
      if (codeMatch && !jsonMatch) {
        cleanedText = codeMatch[1];
      }
      
      // Find JSON array or object in the text
      const jsonArrayMatch = cleanedText.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (jsonArrayMatch) {
        cleanedText = jsonArrayMatch[0];
      }
      
      // Try to parse the cleaned text
      let recommendations;
      try {
        recommendations = JSON.parse(cleanedText);
      } catch (parseError) {
        // If direct parsing fails, try to find and extract JSON objects
        const jsonObjects = [];
        const objectRegex = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g;
        const matches = cleanedText.match(objectRegex);
        
        if (matches) {
          for (const match of matches) {
            try {
              const obj = JSON.parse(match);
              if (obj.symbol && obj.name) {
                jsonObjects.push(obj);
              }
            } catch (e) {
              // Skip invalid objects
            }
          }
        }
        
        if (jsonObjects.length > 0) {
          recommendations = jsonObjects;
        } else {
          throw parseError;
        }
      }
      
      // Ensure we have an array of recommendations
      if (Array.isArray(recommendations)) {
        console.log('✅ Parsed array of recommendations:', recommendations.length);
        return recommendations.slice(0, maxRecommendations);
      } else if (recommendations.recommendations && Array.isArray(recommendations.recommendations)) {
        console.log('✅ Parsed recommendations from object:', recommendations.recommendations.length);
        return recommendations.recommendations.slice(0, maxRecommendations);
      } else if (recommendations && typeof recommendations === 'object') {
        // Single recommendation object
        console.log('✅ Parsed single recommendation object');
        return [recommendations].slice(0, maxRecommendations);
      } else {
        console.error('❌ Unexpected LLM response format:', recommendations);
        throw new Error('Invalid response format from LLM');
      }
    } catch (error) {
      console.error('❌ Error parsing LLM response:', error);
      console.error('❌ Raw response:', llmResponse);
      console.log('🔄 Returning empty array due to parsing error');
      return []; // Return empty array instead of throwing error
    }
  }

  // No fallback recommendations - only real LLM-generated stocks
  getFallbackRecommendations(maxRecommendations) {
    console.log('❌ No fallback recommendations available - only real LLM-generated stocks');
    throw new Error('No fallback recommendations available. Only real LLM-generated stocks are supported.');
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
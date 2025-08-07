// services/groqService.js - Groq API service
import Constants from 'expo-constants';

const GROQ_API_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

class GroqService {
  constructor() {
    this.apiKey = null;
    this.loadApiKey();
  }

  loadApiKey() {
    // Try to get API key from environment
    this.apiKey = Constants.expoConfig?.extra?.EXPO_PUBLIC_GROQ_API_KEY || 
                  process.env.EXPO_PUBLIC_GROQ_API_KEY;
    
    console.log('🔑 Groq API Key Status:', {
      hasKey: !!this.apiKey,
      keyLength: this.apiKey?.length || 0,
      isPlaceholder: this.apiKey?.includes('your-groq-api-key') || false
    });
  }

  async callLLM(prompt, maxTokens = 1000) {
    if (!this.apiKey) {
      throw new Error('Groq API key not found. Please add EXPO_PUBLIC_GROQ_API_KEY to your .env file');
    }

    try {
      console.log('🤖 Calling Groq LLM...');
      
      const response = await fetch(GROQ_API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'llama3-8b-8192', // Fast and reliable model
          messages: [
            {
              role: 'system',
              content: 'You are a financial advisor. Always respond with valid JSON.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: maxTokens,
        }),
      });

      console.log('📡 Groq response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Groq API error:', response.status, errorData);
        throw new Error(`Groq API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      
      console.log('✅ Groq API call successful');
      console.log('📝 Response content preview:', content?.substring(0, 200) + '...');
      
      return content;
    } catch (error) {
      console.error('❌ Groq LLM error:', error);
      throw error;
    }
  }

  async getRecommendations(maxRecommendations = 10) {
    const prompt = `Generate ${maxRecommendations} stock recommendations for an investor with moderate risk tolerance.

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
]`;

    const response = await this.callLLM(prompt);
    return this.parseRecommendations(response);
  }

  parseRecommendations(response) {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in response');
      }

      const recommendations = JSON.parse(jsonMatch[0]);
      
      if (!Array.isArray(recommendations)) {
        throw new Error('Response is not an array');
      }

      console.log(`✅ Parsed ${recommendations.length} recommendations from Groq`);
      return recommendations;
    } catch (error) {
      console.error('❌ Error parsing Groq recommendations:', error);
      console.error('📝 Raw response:', response);
      throw new Error('Failed to parse LLM recommendations');
    }
  }
}

export default new GroqService(); 
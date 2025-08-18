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
    
    if (!this.apiKey) {
      console.warn('Groq API key not found. Please add EXPO_PUBLIC_GROQ_API_KEY to your .env file');
    }
    
    console.log('🔑 Groq API Key Status:', {
      hasKey: !!this.apiKey,
      keyLength: this.apiKey?.length || 0,
      isConfigured: !!this.apiKey
    });
  }

  async callLLM(prompt, maxTokens = 1000) {
    if (!this.apiKey) {
      throw new Error('Groq API key not found. Please add EXPO_PUBLIC_GROQ_API_KEY to your .env file');
    }

    try {
      console.log('Calling Groq LLM...');
      
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
        max_tokens: Math.max(maxTokens, 4000), // Ensure minimum 4000 tokens for complex JSON
        }),
      });

      console.log('Groq response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Groq API error:', response.status, errorData);
        throw new Error(`Groq API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      
      console.log('Groq API call successful');
      console.log('📝 Response content preview:', content?.substring(0, 200) + '...');
      
      return content;
    } catch (error) {
      console.error('Groq LLM error:', error);
      throw error;
    }
  }

  getContextSnippet(context = {}) {
    try {
      const risk = context?.riskProfile || {};
      const prefs = context?.userPreferences || {};
      const liked = (prefs.likedStocks || []).slice(0, 10).join(', ');
      const rejected = (prefs.rejectedStocks || []).slice(0, 10).join(', ');
      const portfolio = (prefs.portfolio || []).map(p => `${p.symbol}:${p.shares}`).slice(0, 10).join(', ');

      return `
User Context:
- Risk Volatility: ${risk.volatility ?? 'n/a'} (lower=conservative, higher=aggressive)
- Time Horizon: ${risk.timeHorizon ?? 'n/a'}
- Knowledge: ${risk.knowledge ?? 'n/a'}
- Ethics: ${risk.ethics ?? 'n/a'}
- Liquidity: ${risk.liquidity ?? 'n/a'}
- Liked Stocks: ${liked || 'none'}
- Rejected Stocks: ${rejected || 'none'}
- Current Portfolio: ${portfolio || 'none'}

Instructions: Tailor recommendations to the risk profile. If volatility is low, favor large-cap, dividend, defensive sectors. If high, allow more growth/volatility. Avoid sectors implied by rejections. Diversify across sectors.
`;
    } catch {
      return '';
    }
  }

  async getRecommendations(maxRecommendations = 10, context = {}) {
    const contextSnippet = this.getContextSnippet(context);
    
    // Add exclusion list for rejected stocks
    const rejectedStocks = context.rejectedStocks || [];
    const likedStocks = context.likedStocks || [];
    
    let exclusionText = '';
    if (rejectedStocks.length > 0) {
      exclusionText += `\n\nIMPORTANT EXCLUSIONS - NEVER recommend these stocks that the user has rejected: ${rejectedStocks.join(', ')}`;
    }
    if (likedStocks.length > 0) {
      exclusionText += `\n\nUser has already liked these stocks (avoid duplicates): ${likedStocks.join(', ')}`;
    }
    
    const prompt = `Generate ${maxRecommendations} stock recommendations for the user below.
${contextSnippet}${exclusionText}

Return ONLY a JSON array with exactly ${maxRecommendations} objects. Include accurate market cap estimates:
[
  {
    "symbol": "AAPL",
    "name": "Apple Inc", 
    "sector": "Technology",
    "industry": "Consumer Electronics",
    "reason": "Brief reason for this user's risk profile",
    "analysis": "Short analysis",
    "riskLevel": "low",
    "confidence": 0.8,
    "marketCap": "large",
    "marketCapBillions": null,
    "growthPotential": "medium",
    "investmentHorizon": "long-term",
    "keyRisks": ["Risk1", "Risk2"],
    "keyBenefits": ["Benefit1", "Benefit2"],
    "targetPrice": null,
    "dividendYield": "1.5%",
    "recommendation": "buy"
  }
]

CRITICAL: Never include stocks from the exclusion list above. Generate completely different alternatives if needed.`;

    const response = await this.callLLM(prompt, 2000); // Increased token limit
    return this.parseRecommendations(response);
  }

  parseRecommendations(response) {
    try {
      // Clean the response and extract JSON
      let jsonString = response.trim();
      
      // Remove common prefixes
      jsonString = jsonString.replace(/^.*?(?=\[)/s, '');
      
      // Find the JSON array bounds more carefully
      const startIdx = jsonString.indexOf('[');
      const lastIdx = jsonString.lastIndexOf(']');
      
      if (startIdx === -1 || lastIdx === -1 || startIdx >= lastIdx) {
        throw new Error('No valid JSON array found in response');
      }
      
      jsonString = jsonString.substring(startIdx, lastIdx + 1);
      
      // Remove ALL control characters and problematic unicode that cause JSON parse errors
      jsonString = jsonString.replace(/[\u0000-\u001F\u007F-\u009F\u2000-\u206F\uFEFF]/g, '');
      
      // Replace problematic characters that sometimes appear in LLM responses
      jsonString = jsonString.replace(/[\u2018\u2019]/g, "'"); // Smart quotes to regular quotes
      jsonString = jsonString.replace(/[\u201C\u201D]/g, '"'); // Smart double quotes
      jsonString = jsonString.replace(/\u2026/g, '...'); // Ellipsis
      jsonString = jsonString.replace(/[\u2013\u2014]/g, '-'); // Em and en dashes
      
      // Fix common JSON formatting issues
      jsonString = jsonString.replace(/,\s*}/g, '}'); // Remove trailing commas
      jsonString = jsonString.replace(/,\s*]/g, ']'); // Remove trailing commas in arrays
      
      console.log('Extracted JSON string preview:', jsonString.substring(0, 200) + '...');
      
      try {
        const recommendations = JSON.parse(jsonString);
        if (Array.isArray(recommendations) && recommendations.length > 0) {
          console.log(`Parsed ${recommendations.length} recommendations from Groq`);
          return recommendations;
        }
      } catch (parseError) {
        console.error('JSON Syntax Error - attempting to repair incomplete JSON');
        
        // Try to find the JSON part and repair it
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          try {
            const repaired = jsonMatch[0]
              .replace(/,\s*}/g, '}') // Remove trailing commas in objects
              .replace(/,\s*]/g, ']'); // Remove trailing commas in arrays
            
            const repairedResult = JSON.parse(repaired);
            if (Array.isArray(repairedResult) && repairedResult.length > 0) {
              console.log(`Successfully repaired and parsed ${repairedResult.length} recommendations`);
              return repairedResult;
            }
          } catch (repairError) {
            console.error('JSON repair failed:', repairError.message);
          }
        }
      }
      
      throw new Error('Failed to parse recommendations from Groq response');
    } catch (error) {
      console.error('Error parsing Groq recommendations:', error);
      console.error('Raw response length:', response.length);
      console.error('Raw response preview:', response.substring(0, 500));
      throw error;
    }
  }
}

export default new GroqService(); 
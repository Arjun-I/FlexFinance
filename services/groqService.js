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
              content: 'You are a financial advisor. Provide clear, concise responses without JSON formatting unless specifically requested.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: Math.max(maxTokens, 4000), // Ensure minimum 4000 tokens for complex responses
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
      
      if (!content) {
        console.error('No content in Groq response:', data);
        throw new Error('No content received from Groq API');
      }
      
      console.log('Groq API call successful');
      console.log('📝 Response content preview:', content.substring(0, 200) + '...');
      
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
      const liked = (context?.likedStocks || []).slice(0, 10);
      const rejected = (context?.rejectedStocks || []).slice(0, 10);
      const portfolio = (context?.portfolioSectors || []).slice(0, 10);
      const goals = (context?.investmentGoals || []).slice(0, 5);

      // Analyze user preferences to make recommendations more adaptive
      const likedSectors = liked.map(stock => {
        // Extract sector from liked stocks if available
        return stock.sector || 'unknown';
      }).filter(sector => sector !== 'unknown');
      
      const rejectedSectors = rejected.map(stock => {
        return stock.sector || 'unknown';
      }).filter(sector => sector !== 'unknown');

      // Create adaptive instructions based on user behavior
      let adaptiveInstructions = '';
      
      if (likedSectors.length > 0) {
        const sectorCounts = {};
        likedSectors.forEach(sector => {
          sectorCounts[sector] = (sectorCounts[sector] || 0) + 1;
        });
        const preferredSectors = Object.keys(sectorCounts).sort((a, b) => sectorCounts[b] - sectorCounts[a]);
        adaptiveInstructions += `\n- User prefers: ${preferredSectors.slice(0, 3).join(', ')} sectors`;
      }
      
      if (rejectedSectors.length > 0) {
        adaptiveInstructions += `\n- User avoids: ${rejectedSectors.slice(0, 3).join(', ')} sectors`;
      }
      
      if (portfolio.length > 0) {
        adaptiveInstructions += `\n- Current portfolio sectors: ${portfolio.join(', ')}`;
      }

      return `
User Context:
- Risk Volatility: ${risk.volatility ?? 'n/a'} (lower=conservative, higher=aggressive)
- Time Horizon: ${risk.timeHorizon ?? 'n/a'}
- Knowledge: ${risk.knowledge ?? 'n/a'}
- Ethics: ${risk.ethics ?? 'n/a'}
- Liquidity: ${risk.liquidity ?? 'n/a'}
- Investment Goals: ${goals.join(', ') || 'none'}
- Liked Stocks: ${liked.map(s => s.symbol || s).join(', ') || 'none'}
- Rejected Stocks: ${rejected.map(s => s.symbol || s).join(', ') || 'none'}
${adaptiveInstructions}

ADAPTIVE INSTRUCTIONS: 
- Learn from user's liked/rejected patterns to suggest similar or complementary stocks
- If user likes tech stocks, suggest more tech but also diversify into related sectors
- If user rejects high-volatility stocks, focus on stable, established companies
- Consider current portfolio gaps and suggest stocks that fill those gaps
- Balance user preferences with diversification needs
- Adapt to user's risk tolerance and investment goals
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

Return ONLY a valid JSON array with exactly ${maxRecommendations} objects. DO NOT include prices - only fundamental analysis:
[
  {
    "symbol": "AAPL",
    "name": "Apple Inc", 
    "sector": "Technology",
    "industry": "Consumer Electronics",
    "reason": "Brief reason for this user's risk profile",
    "riskLevel": "low",
    "confidence": 0.8,
    "marketCap": "large"
  }
]

CRITICAL: 
- Never include prices, targetPrice, or financial metrics 
- Keep responses concise to avoid truncation
- Ensure valid JSON format
- Never include stocks from the exclusion list

CRITICAL: Never include stocks from the exclusion list above. Generate completely different alternatives if needed.`;

    const response = await this.callLLM(prompt, 2000); // Increased token limit
    return this.parseRecommendations(response);
  }

  parseRecommendations(response) {
    try {
      console.log('📝 Response content preview:', response.substring(0, 200));
      
      // Clean the response and extract JSON
      let jsonString = response.trim();
      
      // Remove common prefixes and markdown
      jsonString = jsonString.replace(/^.*?(?=\[)/s, '');
      jsonString = jsonString.replace(/```json\s*/g, '');
      jsonString = jsonString.replace(/```\s*/g, '');
      
      // Find the JSON array bounds more carefully
      const startIdx = jsonString.indexOf('[');
      let lastIdx = jsonString.lastIndexOf(']');
      
      if (startIdx === -1) {
        throw new Error('No opening bracket found in response');
      }
      
      if (lastIdx === -1 || lastIdx <= startIdx) {
        // Try to find the last valid position before truncation
        const partialString = jsonString.substring(startIdx);
        const objects = [];
        let currentPos = 1; // Skip opening bracket
        let braceCount = 0;
        let currentObject = '';
        
        for (let i = currentPos; i < partialString.length; i++) {
          const char = partialString[i];
          if (char === '{') {
            braceCount++;
            currentObject += char;
          } else if (char === '}') {
            braceCount--;
            currentObject += char;
            if (braceCount === 0) {
              try {
                const obj = JSON.parse(currentObject);
                objects.push(obj);
                currentObject = '';
              } catch (e) {
                console.log('Skipping malformed object:', currentObject.substring(0, 50));
              }
            }
          } else if (braceCount > 0) {
            currentObject += char;
          }
        }
        
        if (objects.length > 0) {
          console.log(`Recovered ${objects.length} valid objects from truncated response`);
          return objects;
        }
        throw new Error('Could not recover any valid objects from response');
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

  // Generate text using Groq LLM
  async generateText(prompt, maxTokens = 500) {
    try {
      return await this.callLLM(prompt, maxTokens);
    } catch (error) {
      console.error('Error generating text:', error);
      return null;
    }
  }
}

export default new GroqService(); 
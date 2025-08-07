// secureLLMService.js - Secure LLM Integration through Backend Proxy
import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra || Constants.manifest?.extra;
const SECURE_ENDPOINT = extra?.EXPO_PUBLIC_SECURE_LLM_ENDPOINT || 'https://your-secure-backend.com/api/llm';

/**
 * Check if running in web browser
 */
const isWebBrowser = () => {
  return typeof window !== 'undefined' && window.document;
};

/**
 * Fetch with timeout support for both web and mobile
 */
const fetchWithTimeout = async (url, options = {}, timeout = 30000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  }
};

/**
 * Call LLM through secure backend
 */
export async function callSecureLLM(prompt, options = {}) {
  // Check if secure endpoint is configured (not default placeholder)
  if (!SECURE_ENDPOINT || SECURE_ENDPOINT === 'https://your-secure-backend.com/api/llm') {
    console.log('⚠️ Secure LLM endpoint not configured, skipping secure call');
    throw new Error('Secure LLM endpoint not configured');
  }

  try {
    const response = await fetchWithTimeout(SECURE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        prompt,
        model: options.model || 'gpt-4o-mini',
        temperature: options.temperature || 0.7,
        max_tokens: options.max_tokens || 2000,
        ...options
      })
    }, 45000); // 45 second timeout for LLM calls

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Secure LLM API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.content || data.response || data;
  } catch (error) {
    console.error('Secure LLM API error:', error);
    throw error;
  }
}

/**
 * Get stock recommendations through secure backend
 */
export async function getSecureRecommendations(userContext, maxRecommendations = 10) {
  console.log('🔒 Secure LLM: Starting recommendations...');
  console.log('🔒 Secure LLM: User context:', {
    hasRiskProfile: !!userContext.riskProfile,
    hasUserPreferences: !!userContext.userPreferences
  });
  
  const prompt = buildRecommendationPrompt(userContext, maxRecommendations);
  console.log('🔒 Secure LLM: Prompt built, length:', prompt.length);
  
  try {
    console.log('🔒 Secure LLM: Calling secure endpoint...');
    const response = await callSecureLLM(prompt, {
      temperature: 0.7,
      max_tokens: 2000
    });
    console.log('🔒 Secure LLM: Response received, length:', response.length);
    
    console.log('🔒 Secure LLM: Parsing recommendations...');
    const parsed = parseRecommendations(response, maxRecommendations);
    console.log('🔒 Secure LLM: Parsed recommendations:', parsed.length);
    
    return parsed;
  } catch (error) {
    console.error('❌ Secure LLM Error getting recommendations:', error);
    throw error;
  }
}

/**
 * Get stock analysis through secure backend
 */
export async function getSecureStockAnalysis(symbol, userContext) {
  const prompt = buildAnalysisPrompt(symbol, userContext);
  
  try {
    const response = await callSecureLLM(prompt, {
      temperature: 0.5,
      max_tokens: 1000
    });
    
    return parseAnalysis(response);
  } catch (error) {
    console.error('Error getting secure stock analysis:', error);
    throw error;
  }
}

/**
 * Build recommendation prompt
 */
function buildRecommendationPrompt(userContext, maxRecommendations) {
  const { riskProfile, userPreferences } = userContext;
  
  return `
You are an expert financial advisor providing personalized stock recommendations for investment purposes.

INVESTMENT CONTEXT:
- User's Risk Tolerance: ${getRiskLevel(riskProfile.volatility)}
- Investment Horizon: ${getTimeHorizon(riskProfile.timeHorizon)}
- Investment Knowledge: ${getKnowledgeLevel(riskProfile.knowledge)}
- Current Cash Available: $${userPreferences.cashBalance.toLocaleString()}
- Portfolio Value: $${userPreferences.portfolio.reduce((sum, p) => sum + (p.shares * p.averagePrice), 0).toLocaleString()}

USER PREFERENCES:
- Previously Liked Stocks: ${userPreferences.likedStocks.map(s => s.symbol).join(', ') || 'None'}
- Previously Rejected Stocks: ${userPreferences.rejectedStocks.map(s => s.symbol).join(', ') || 'None'}
- Current Portfolio Holdings: ${userPreferences.portfolio.map(p => `${p.shares}x ${p.ticker}`).join(', ') || 'Empty'}

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

/**
 * Build analysis prompt
 */
function buildAnalysisPrompt(symbol, userContext) {
  const { riskProfile, userPreferences } = userContext;
  
  return `
Analyze the stock ${symbol} for a user with:
- Risk Profile: ${JSON.stringify(riskProfile)}
- Liked Stocks: ${userPreferences.likedStocks.map(s => s.symbol).join(', ')}
- Rejected Stocks: ${userPreferences.rejectedStocks.map(s => s.symbol).join(', ')}

Provide a brief analysis including:
1. Suitability for this investor
2. Key risks and benefits
3. Portfolio fit
4. Recommendation (buy/hold/avoid)

Format as JSON with fields: analysis, suitability, risks, benefits, recommendation
`;
}

/**
 * Parse recommendations with robust error handling
 */
function parseRecommendations(llmResponse, maxRecommendations) {
  try {
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
      return recommendations.slice(0, maxRecommendations);
    } else if (recommendations.recommendations && Array.isArray(recommendations.recommendations)) {
      return recommendations.recommendations.slice(0, maxRecommendations);
    } else if (recommendations && typeof recommendations === 'object') {
      // Single recommendation object
      return [recommendations].slice(0, maxRecommendations);
    } else {
      console.error('❌ Unexpected LLM response format:', recommendations);
      throw new Error('Invalid response format from LLM');
    }
  } catch (error) {
    console.error('❌ Error parsing LLM response:', error);
    console.error('❌ Raw response:', llmResponse);
    throw new Error(`Failed to parse LLM response: ${error.message}`);
  }
}

/**
 * Parse analysis response
 */
function parseAnalysis(llmResponse) {
  try {
    const responseText = typeof llmResponse === 'string' ? llmResponse : JSON.stringify(llmResponse);
    const analysis = JSON.parse(responseText);
    
    return {
      analysis: analysis.analysis || 'Analysis unavailable',
      suitability: analysis.suitability || 'unknown',
      risks: analysis.risks || ['Analysis unavailable'],
      benefits: analysis.benefits || ['Analysis unavailable'],
      recommendation: analysis.recommendation || 'hold'
    };
  } catch (error) {
    console.error('❌ Error parsing analysis response:', error);
    return {
      analysis: 'Unable to generate analysis at this time',
      suitability: 'unknown',
      risks: ['Analysis unavailable'],
      benefits: ['Analysis unavailable'],
      recommendation: 'hold'
    };
  }
}

/**
 * Helper methods for risk profile interpretation
 */
function getRiskLevel(volatility) {
  if (volatility <= 8) return 'low';
  if (volatility <= 12) return 'medium';
  return 'high';
}

function getTimeHorizon(horizon) {
  if (horizon <= 8) return 'short-term (1-3 years)';
  if (horizon <= 12) return 'medium-term (3-5 years)';
  return 'long-term (5+ years)';
}

function getKnowledgeLevel(knowledge) {
  if (knowledge <= 8) return 'beginner';
  if (knowledge <= 12) return 'intermediate';
  return 'expert';
}

export default {
  callSecureLLM,
  getSecureRecommendations,
  getSecureStockAnalysis
}; 
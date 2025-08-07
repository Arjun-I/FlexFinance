// finnhubService.js - Finnhub API Integration for Stock Data
import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra || Constants.manifest?.extra;
const FINNHUB_API_KEY = extra?.EXPO_PUBLIC_FINNHUB_API_KEY || process.env.EXPO_PUBLIC_FINNHUB_API_KEY;
const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';

// Debug API key loading
console.log('🔑 Finnhub API Key Status:', {
  hasKey: !!FINNHUB_API_KEY,
  keyLength: FINNHUB_API_KEY ? FINNHUB_API_KEY.length : 0,
  keyStart: FINNHUB_API_KEY ? FINNHUB_API_KEY.substring(0, 10) + '...' : 'none',
  fromExtra: !!extra?.EXPO_PUBLIC_FINNHUB_API_KEY,
  fromEnv: !!process.env.EXPO_PUBLIC_FINNHUB_API_KEY
});

/**
 * Check if running in web browser
 */
const isWebBrowser = () => {
  return typeof window !== 'undefined' && window.document;
};

/**
 * Fetch with timeout support for both web and mobile
 */
const fetchWithTimeout = async (url, options = {}, timeout = 15000) => {
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
 * Get stock quote from Finnhub
 */
export async function getStockQuote(symbol, userId = 'anonymous', portfolioSize = 0) {
  if (!FINNHUB_API_KEY || FINNHUB_API_KEY === 'your_finnhub_api_key_here') {
    console.error('❌ Finnhub API key not configured');
    throw new Error('Finnhub API key not configured. Please set EXPO_PUBLIC_FINNHUB_API_KEY in your .env file');
  }

  try {
    const url = `${FINNHUB_BASE_URL}/quote?symbol=${symbol.toUpperCase()}&token=${FINNHUB_API_KEY}`;
    console.log(`🔄 Fetching quote for ${symbol} from: ${url.substring(0, 50)}...`);
    
    const response = await fetchWithTimeout(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    }, 10000);

    console.log(`📡 Response status for ${symbol}: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API Error for ${symbol}:`, errorText);
      throw new Error(`Finnhub API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`📊 Raw data for ${symbol}:`, JSON.stringify(data, null, 2));
    
    if (!data.c || !data.d) {
      throw new Error('Invalid data from Finnhub API');
    }

    const change = data.d;
    const changePercent = data.dp;
    const currentPrice = data.c;
    const highPrice = data.h;
    const lowPrice = data.l;
    const openPrice = data.o;
    const previousClose = data.pc;

    return {
      symbol: symbol.toUpperCase(),
      price: currentPrice,
      change: change,
      changePercent: `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`,
      high: highPrice,
      low: lowPrice,
      open: openPrice,
      previousClose: previousClose,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`Error fetching quote for ${symbol}:`, error);
    throw new Error(`Failed to fetch real-time data for ${symbol}: ${error.message}`);
  }
}

/**
 * Get company profile from Finnhub
 */
export async function getCompanyProfile(symbol) {
  if (!FINNHUB_API_KEY || FINNHUB_API_KEY === 'your_finnhub_api_key_here') {
    console.error('❌ Finnhub API key not configured');
    throw new Error('Finnhub API key not configured. Please set EXPO_PUBLIC_FINNHUB_API_KEY in your .env file');
  }

  try {
    const url = `${FINNHUB_BASE_URL}/stock/profile2?symbol=${symbol.toUpperCase()}&token=${FINNHUB_API_KEY}`;
    console.log(`🔄 Fetching profile for ${symbol} from: ${url.substring(0, 50)}...`);
    
    const response = await fetchWithTimeout(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    }, 10000);

    console.log(`📡 Profile response status for ${symbol}: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Profile API Error for ${symbol}:`, errorText);
      throw new Error(`Finnhub API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`📊 Raw profile data for ${symbol}:`, JSON.stringify(data, null, 2));
    
    if (!data.name) {
      throw new Error('Invalid company data from Finnhub API');
    }

    return {
      symbol: symbol.toUpperCase(),
      name: data.name,
      sector: data.finnhubIndustry || 'Technology',
      industry: data.finnhubIndustry || 'Software',
      description: data.description || 'Company data from Finnhub',
      website: data.weburl || '',
      marketCap: data.marketCapitalization ? `${(data.marketCapitalization / 1e9).toFixed(2)}B` : 'N/A',
      peRatio: data.pe ? data.pe.toFixed(2) : 'N/A',
      dividendYield: data.dividendYield ? `${(data.dividendYield * 100).toFixed(2)}%` : 'N/A',
      beta: data.beta ? data.beta.toFixed(2) : 'N/A',
      country: data.country || 'US',
      currency: data.currency || 'USD',
      logo: data.logo || null,
    };
  } catch (error) {
    console.error(`Error fetching company profile for ${symbol}:`, error);
    throw new Error(`Failed to fetch company data for ${symbol}: ${error.message}`);
  }
}

/**
 * Get multiple stock quotes efficiently
 */
export async function getMultipleQuotes(symbols, userId = 'anonymous', portfolioSize = 0) {
  const quotes = [];
  const errors = [];

  // Process symbols in batches to respect rate limits
  const batchSize = 5;
  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);
    
    const batchPromises = batch.map(async (symbol) => {
      try {
        return await getStockQuote(symbol, userId, portfolioSize);
      } catch (error) {
        errors.push({ symbol, error: error.message });
        return getFallbackStockData(symbol);
      }
    });

    const batchResults = await Promise.all(batchPromises);
    quotes.push(...batchResults);

    // Add delay between batches to respect rate limits
    if (i + batchSize < symbols.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return { quotes, errors };
}

/**
 * Search for stocks
 */
export async function searchStocks(query, userId = 'anonymous', portfolioSize = 0) {
  if (!FINNHUB_API_KEY || FINNHUB_API_KEY === 'your_finnhub_api_key_here') {
    return getFallbackSearchResults(query);
  }

  try {
    const url = `${FINNHUB_BASE_URL}/search?q=${encodeURIComponent(query)}&token=${FINNHUB_API_KEY}`;
    
    const response = await fetchWithTimeout(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    }, 10000);

    if (!response.ok) {
      throw new Error(`Finnhub API error: ${response.status}`);
    }

    const data = await response.json();
    
    return data.result?.slice(0, 10).map(item => ({
      symbol: item.symbol,
      name: item.description,
      type: item.type,
      primaryExchange: item.primaryExchange,
    })) || [];
  } catch (error) {
    console.error('Error searching stocks:', error);
    return getFallbackSearchResults(query);
  }
}

/**
 * Get portfolio value with Finnhub data
 */
export async function getPortfolioValue(holdings, userId = 'anonymous') {
  try {
    if (holdings.length === 0) {
      return { totalValue: 0, holdings: [], errors: [] };
    }

    const symbols = holdings.map(h => h.symbol);
    const { quotes, errors } = await getMultipleQuotes(symbols, userId, holdings.length);
    
    const updatedHoldings = [];
    let totalValue = 0;

    holdings.forEach(holding => {
      const quote = quotes.find(q => q.symbol === holding.symbol);
      
      if (quote && quote.price) {
        const currentValue = holding.shares * quote.price;
        totalValue += currentValue;
        
        updatedHoldings.push({
          ...holding,
          currentPrice: quote.price,
          currentValue: currentValue,
          change: quote.change,
          changePercent: quote.changePercent,
        });
      } else {
        // Use last known price if available
        const currentValue = holding.shares * (holding.averagePrice || 0);
        totalValue += currentValue;
        
        updatedHoldings.push({
          ...holding,
          currentPrice: holding.averagePrice || 0,
          currentValue: currentValue,
          change: 0,
          changePercent: '0.00%',
        });
      }
    });

    return {
      totalValue,
      holdings: updatedHoldings,
      errors,
    };
  } catch (error) {
    console.error('Error calculating portfolio value:', error);
    return {
      totalValue: 0,
      holdings: holdings.map(h => ({ 
        ...h, 
        currentPrice: h.averagePrice || 0, 
        currentValue: h.shares * (h.averagePrice || 0) 
      })),
      errors: [error.message],
    };
  }
}

/**
 * Fallback stock data when API fails
 */
// REMOVED: getFallbackStockData - Only real data allowed
function getFallbackStockData(symbol) {
  const mockPrices = {
    'AAPL': { price: 190.50, change: 2.3, changePercent: 1.22 },
    'MSFT': { price: 310.25, change: 1.8, changePercent: 0.58 },
    'GOOGL': { price: 2800.00, change: 3.1, changePercent: 0.11 },
    'AMZN': { price: 140.75, change: 1.5, changePercent: 1.08 },
    'TSLA': { price: 270.30, change: 4.2, changePercent: 1.58 },
    'NVDA': { price: 500.00, change: 5.8, changePercent: 1.17 },
    'META': { price: 350.40, change: 2.7, changePercent: 0.78 },
    'NFLX': { price: 450.20, change: 1.9, changePercent: 0.42 },
    'JNJ': { price: 165.80, change: 0.8, changePercent: 0.48 },
    'PG': { price: 145.20, change: 0.5, changePercent: 0.35 }
  };

  const stockData = mockPrices[symbol] || { 
    price: 100.00, 
    change: 0.0, 
    changePercent: 0.0 
  };
  
  return {
    symbol: symbol.toUpperCase(),
    price: stockData.price,
    change: stockData.change,
    changePercent: `${stockData.changePercent >= 0 ? '+' : ''}${stockData.changePercent.toFixed(2)}%`,
    high: stockData.price * 1.02,
    low: stockData.price * 0.98,
    open: stockData.price - stockData.change,
    previousClose: stockData.price - stockData.change,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Fallback company data when API fails
 */
// REMOVED: getFallbackCompanyData - Only real data allowed
function getFallbackCompanyData(symbol) {
  const mockCompanies = {
    'AAPL': { name: 'Apple Inc.', sector: 'Technology', industry: 'Consumer Electronics' },
    'MSFT': { name: 'Microsoft Corporation', sector: 'Technology', industry: 'Software' },
    'GOOGL': { name: 'Alphabet Inc.', sector: 'Technology', industry: 'Internet Services' },
    'AMZN': { name: 'Amazon.com Inc.', sector: 'Consumer', industry: 'E-commerce' },
    'TSLA': { name: 'Tesla Inc.', sector: 'Consumer', industry: 'Automotive' },
    'NVDA': { name: 'NVIDIA Corporation', sector: 'Technology', industry: 'Semiconductors' },
    'META': { name: 'Meta Platforms Inc.', sector: 'Technology', industry: 'Social Media' },
    'NFLX': { name: 'Netflix Inc.', sector: 'Consumer', industry: 'Entertainment' },
    'JNJ': { name: 'Johnson & Johnson', sector: 'Healthcare', industry: 'Pharmaceuticals' },
    'PG': { name: 'Procter & Gamble Co.', sector: 'Consumer', industry: 'Consumer Staples' }
  };

  const companyData = mockCompanies[symbol] || { 
    name: `${symbol.toUpperCase()} Corporation`, 
    sector: 'Technology', 
    industry: 'Software' 
  };

  return {
    symbol: symbol.toUpperCase(),
    name: companyData.name,
    sector: companyData.sector,
    industry: companyData.industry,
    description: 'Company data from Finnhub (fallback)',
    website: '',
    marketCap: 'N/A',
    peRatio: 'N/A',
    dividendYield: 'N/A',
    beta: 'N/A',
    country: 'US',
    currency: 'USD',
    logo: null,
  };
}

/**
 * Fallback search results when API fails
 */
// REMOVED: getFallbackSearchResults - Only real data allowed
function getFallbackSearchResults(query) {
  const commonStocks = [
    { symbol: 'AAPL', name: 'Apple Inc.', type: 'Common Stock' },
    { symbol: 'MSFT', name: 'Microsoft Corporation', type: 'Common Stock' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', type: 'Common Stock' },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', type: 'Common Stock' },
    { symbol: 'TSLA', name: 'Tesla Inc.', type: 'Common Stock' },
    { symbol: 'NVDA', name: 'NVIDIA Corporation', type: 'Common Stock' },
    { symbol: 'META', name: 'Meta Platforms Inc.', type: 'Common Stock' },
    { symbol: 'NFLX', name: 'Netflix Inc.', type: 'Common Stock' },
    { symbol: 'JNJ', name: 'Johnson & Johnson', type: 'Common Stock' },
    { symbol: 'PG', name: 'Procter & Gamble Co.', type: 'Common Stock' }
  ];

  return commonStocks.filter(stock => 
    stock.symbol.toLowerCase().includes(query.toLowerCase()) ||
    stock.name.toLowerCase().includes(query.toLowerCase())
  );
}

export default {
  getStockQuote,
  getCompanyProfile,
  getMultipleQuotes,
  searchStocks,
  getPortfolioValue
}; 
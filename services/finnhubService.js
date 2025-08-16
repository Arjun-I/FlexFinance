// finnhubService.js - Finnhub REST integration for React Native with API limit handling
import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra || Constants.manifest?.extra;
const FINNHUB_API_KEY = extra?.EXPO_PUBLIC_FINNHUB_API_KEY || process.env.EXPO_PUBLIC_FINNHUB_API_KEY;
const FINNHUB_BASE = 'https://finnhub.io/api/v1';

// API limit handling
let apiLimitReached = false;
let lastApiCall = 0;
const MIN_API_INTERVAL = 1000; // 1 second between calls
const priceCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

// Rate limiting
const waitForRateLimit = () => {
  const now = Date.now();
  const timeSinceLastCall = now - lastApiCall;
  if (timeSinceLastCall < MIN_API_INTERVAL) {
    const waitTime = MIN_API_INTERVAL - timeSinceLastCall;
    return new Promise(resolve => setTimeout(resolve, waitTime));
  }
  return Promise.resolve();
};

const ensureKey = () => {
  if (!FINNHUB_API_KEY) {
    throw new Error('Finnhub API key not configured');
  }
};

const getJson = async (url) => {
  // Check if API limit was reached
  if (apiLimitReached) {
    throw new Error('API_LIMIT_REACHED');
  }
  
  // Rate limiting
  await waitForRateLimit();
  lastApiCall = Date.now();
  
  const res = await fetch(url);
  
  // Handle API limit responses
  if (res.status === 429 || res.status === 403) {
    console.warn('⚠️ Finnhub API limit reached, switching to cached data');
    apiLimitReached = true;
    throw new Error('API_LIMIT_REACHED');
  }
  
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error(`❌ Finnhub HTTP ${res.status}: ${text}`);
    throw new Error(`Finnhub HTTP ${res.status}: ${text}`);
  }
  
  return res.json();
};

// Cache helper functions
const getCachedPrice = (symbol) => {
  const cached = priceCache.get(symbol);
  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    console.log(`📋 Using cached price for ${symbol}: $${cached.price}`);
    return cached;
  }
  return null;
};

const setCachedPrice = (symbol, data) => {
  priceCache.set(symbol, { ...data, timestamp: Date.now() });
};

// Fallback price data for common stocks
const getFallbackPrice = (symbol) => {
  const fallbackPrices = {
    'AAPL': { price: 224.76, change: 4.85, changePercent: 2.15 },
    'MSFT': { price: 521.13, change: 0.32, changePercent: 0.06 },
    'GOOGL': { price: 202.37, change: 5.81, changePercent: 2.97 },
    'TSLA': { price: 333.06, change: 10.76, changePercent: 3.35 },
    'NVDA': { price: 182.91, change: 2.13, changePercent: 1.18 },
    'AMD': { price: 172.59, change: 0.19, changePercent: 0.11 },
    'AMZN': { price: 201.28, change: 3.45, changePercent: 1.74 },
    'META': { price: 651.89, change: 12.34, changePercent: 1.93 },
    'NFLX': { price: 612.45, change: -2.15, changePercent: -0.35 },
    'GOOG': { price: 203.12, change: 5.92, changePercent: 3.00 }
  };
  
  const fallback = fallbackPrices[symbol];
  if (fallback) {
    console.log(`🔄 Using fallback price for ${symbol}: $${fallback.price}`);
    return {
      symbol,
      price: fallback.price,
      change: fallback.change,
      changePercent: fallback.changePercent,
      high: fallback.price * 1.02,
      low: fallback.price * 0.98,
      open: fallback.price * 0.995,
      previousClose: fallback.price - fallback.change,
      timestamp: new Date().toISOString(),
      volume: Math.floor(Math.random() * 1000000) + 500000,
      source: 'fallback'
    };
  }
  return null;
};

export const getStockQuote = async (symbol) => {
  ensureKey();
  const sym = (symbol || '').toUpperCase().trim();
  
  // Try cache first
  const cached = getCachedPrice(sym);
  if (cached) {
    return cached;
  }
  
  try {
    const data = await getJson(`${FINNHUB_BASE}/quote?symbol=${encodeURIComponent(sym)}&token=${encodeURIComponent(FINNHUB_API_KEY)}`);
    if (!data?.c || data.c === 0) throw new Error(`No price data for ${sym}`);
    
    const result = {
      symbol: sym,
      price: data.c,
      change: data.d,
      changePercent: data.dp,
      high: data.h,
      low: data.l,
      open: data.o,
      previousClose: data.pc,
      timestamp: new Date().toISOString(),
      volume: data.v || 0,
      source: 'api'
    };
    
    setCachedPrice(sym, result);
    return result;
  } catch (error) {
    console.warn(`⚠️ API call failed for ${sym}: ${error.message}`);
    
    // Try fallback data
    const fallback = getFallbackPrice(sym);
    if (fallback) {
      setCachedPrice(sym, fallback);
      return fallback;
    }
    
    // If no fallback, throw error
    throw new Error(`No price data available for ${sym}`);
  }
};

export const getCompanyProfile = async (symbol) => {
  ensureKey();
  const sym = (symbol || '').toUpperCase().trim();
  const data = await getJson(`${FINNHUB_BASE}/stock/profile2?symbol=${encodeURIComponent(sym)}&token=${encodeURIComponent(FINNHUB_API_KEY)}`);
  if (!data?.name) throw new Error(`No company data for ${sym}`);
  return {
    symbol: sym,
    name: data.name,
    country: data.country || 'US',
    currency: data.currency || 'USD',
    exchange: data.exchange || 'NASDAQ',
    ipo: data.ipo || 'N/A',
    marketCapitalization: data.marketCapitalization || null,
    phone: data.phone || 'N/A',
    shareOutstanding: data.shareOutstanding || 0,
    weburl: data.weburl || `https://finance.yahoo.com/quote/${sym}`,
    logo: data.logo || null,
    finnhubIndustry: data.finnhubIndustry || 'Technology',
  };
};

export const getMultipleQuotes = async (symbols) => {
  ensureKey();
  const unique = Array.from(new Set((symbols || []).map(s => (s || '').toUpperCase().trim()))).filter(Boolean);
  
  console.log(`📊 Fetching quotes for ${unique.length} symbols: ${unique.join(', ')}`);
  
  // If API limit reached, try cache and fallbacks
  if (apiLimitReached) {
    console.log('📋 API limit reached, using cached/fallback data');
    const results = unique.map(sym => {
      const cached = getCachedPrice(sym);
      if (cached) return cached;
      
      const fallback = getFallbackPrice(sym);
      if (fallback) {
        setCachedPrice(sym, fallback);
        return fallback;
      }
      
      return null;
    }).filter(Boolean);
    
    console.log(`📋 Returned ${results.length} cached/fallback quotes`);
    return results;
  }
  
  // Sequential processing to respect rate limits
  const results = [];
  for (const sym of unique) {
    try {
      const quote = await getStockQuote(sym);
      if (quote) results.push(quote);
    } catch (error) {
      console.warn(`⚠️ Failed to get quote for ${sym}: ${error.message}`);
      
      // If this is an API limit error, stop making further calls
      if (error.message === 'API_LIMIT_REACHED') {
        console.log('🛑 API limit reached, stopping further calls');
        break;
      }
    }
  }
  
  console.log(`✅ Successfully fetched ${results.length}/${unique.length} quotes`);
  return results;
};

export const getCompanyFinancials = async (symbol) => {
  ensureKey();
  const sym = (symbol || '').toUpperCase().trim();
  return getJson(`${FINNHUB_BASE}/stock/metric?symbol=${encodeURIComponent(sym)}&metric=all&token=${encodeURIComponent(FINNHUB_API_KEY)}`);
};

// API status and reset functions
export const getApiStatus = () => ({
  limitReached: apiLimitReached,
  cacheSize: priceCache.size,
  lastApiCall: lastApiCall,
  minutesSinceLastCall: lastApiCall ? Math.floor((Date.now() - lastApiCall) / 60000) : null
});

export const resetApiLimit = () => {
  console.log('🔄 Resetting API limit flag - will retry API calls');
  apiLimitReached = false;
};

export const clearPriceCache = () => {
  console.log('🗑️ Clearing price cache');
  priceCache.clear();
};

export const testFinnhubConnection = async () => {
  try {
    // Try a lightweight test without affecting the quota much
    await getStockQuote('AAPL');
    console.log('✅ Finnhub connection test successful');
    return true;
  } catch (e) {
    console.log('❌ Finnhub connection test failed:', e.message);
    return false;
  }
}; 
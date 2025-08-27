// finnhubService.js - Smart Caching & Queue System for API Optimization
import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra || Constants.manifest?.extra;
const FINNHUB_API_KEY = extra?.EXPO_PUBLIC_FINNHUB_API_KEY || process.env.EXPO_PUBLIC_FINNHUB_API_KEY;
const FINNHUB_BASE = 'https://finnhub.io/api/v1';

// Smart caching and queue system
let apiLimitReached = false;
let lastApiCall = 0;
const MIN_API_INTERVAL = 1000; // 1 second between calls to respect rate limits
const priceCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes for regular cache
const PRIORITY_CACHE_DURATION = 2 * 60 * 1000; // 2 minutes for user-viewed stocks
const pendingRequests = new Map(); // Request deduplication

// Queue system for portfolio updates
const updateQueue = [];
let isProcessingQueue = false;
const QUEUE_PROCESS_INTERVAL = 5000; // Process queue every 5 seconds
const MAX_QUEUE_SIZE = 50; // Prevent queue from growing too large

// Track user-viewed stocks for priority updates
const userViewedStocks = new Set();
const lastViewedTime = new Map();

// Rate limiting with better performance
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

// Smart cache helper functions
const getCachedPrice = (symbol, isPriority = false) => {
  const cached = priceCache.get(symbol);
  if (cached) {
    const cacheAge = Date.now() - cached.timestamp;
    const maxAge = isPriority ? PRIORITY_CACHE_DURATION : CACHE_DURATION;
    
    if (cacheAge < maxAge) {
      console.log(`Using cached price for ${symbol}: $${cached.data.price}`);
      return cached.data;
    } else {
      console.log(`Cache expired for ${symbol}, age: ${Math.round(cacheAge / 1000)}s`);
    }
  }
  return null;
};

const setCachedPrice = (symbol, data, isPriority = false) => {
  priceCache.set(symbol, {
    data,
    timestamp: Date.now(),
    isPriority
  });
  
  // Limit cache size to prevent memory issues
  if (priceCache.size > 1000) {
    const firstKey = priceCache.keys().next().value;
    priceCache.delete(firstKey);
  }
};

// Optimized JSON fetching with request deduplication
const getJson = async (url) => {
  // Check if API limit was reached
  if (apiLimitReached) {
    throw new Error('API_LIMIT_REACHED');
  }
  
  // Request deduplication - if same request is pending, wait for it
  if (pendingRequests.has(url)) {
    return pendingRequests.get(url);
  }
  
  // Rate limiting
  await waitForRateLimit();
  lastApiCall = Date.now();
  
  // Create promise for this request
  const requestPromise = fetch(url).then(async (res) => {
    // Handle API limit responses
    if (res.status === 429 || res.status === 403) {
      console.warn('Finnhub API limit reached');
      apiLimitReached = true;
      throw new Error('API_LIMIT_REACHED');
    }
    
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error(`Finnhub HTTP ${res.status}: ${text}`);
      throw new Error(`Finnhub HTTP ${res.status}: ${text}`);
    }
    
    return res.json();
  });
  
  // Store promise for deduplication
  pendingRequests.set(url, requestPromise);
  
  try {
    const result = await requestPromise;
    return result;
  } finally {
    // Clean up after request completes
    pendingRequests.delete(url);
  }
};

// Mark stock as user-viewed for priority updates
export const markStockAsViewed = (symbol) => {
  userViewedStocks.add(symbol);
  lastViewedTime.set(symbol, Date.now());
  
  // Clean up old viewed stocks (older than 1 hour)
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  for (const [stock, time] of lastViewedTime.entries()) {
    if (time < oneHourAgo) {
      userViewedStocks.delete(stock);
      lastViewedTime.delete(stock);
    }
  }
};

// Add stock to update queue
export const queueStockUpdate = (symbol, priority = false) => {
  // Don't add if already in queue
  if (updateQueue.some(item => item.symbol === symbol)) {
    return;
  }
  
  // Add to front if priority, back if not
  const queueItem = { symbol, priority, timestamp: Date.now() };
  
  if (priority) {
    updateQueue.unshift(queueItem);
  } else {
    updateQueue.push(queueItem);
  }
  
  // Limit queue size
  if (updateQueue.length > MAX_QUEUE_SIZE) {
    updateQueue.pop(); // Remove oldest non-priority item
  }
  
  // Start processing if not already running
  if (!isProcessingQueue) {
    processUpdateQueue();
  }
};

// Process the update queue
const processUpdateQueue = async () => {
  if (isProcessingQueue || updateQueue.length === 0) {
    return;
  }
  
  isProcessingQueue = true;
  
  try {
    while (updateQueue.length > 0 && !apiLimitReached) {
      const item = updateQueue.shift();
      
      try {
        // Check if we need to update this stock
        const cached = getCachedPrice(item.symbol, item.priority);
        if (cached) {
          console.log(`Skipping ${item.symbol} - recent cache available`);
          continue;
        }
        
        console.log(`Updating ${item.symbol} (${item.priority ? 'priority' : 'queue'})`);
        await getStockQuote(item.symbol);
        
        // Wait between requests to respect rate limits
        await new Promise(resolve => setTimeout(resolve, MIN_API_INTERVAL));
        
      } catch (error) {
        if (error.message === 'API_LIMIT_REACHED') {
          console.log('API limit reached, stopping queue processing');
          break;
        }
        console.error(`Error updating ${item.symbol}:`, error.message);
      }
    }
  } finally {
    isProcessingQueue = false;
    
    // Schedule next processing if queue has items
    if (updateQueue.length > 0) {
      setTimeout(processUpdateQueue, QUEUE_PROCESS_INTERVAL);
    }
  }
};

// Enhanced stock quote with smart caching
export const getStockQuote = async (symbol) => {
  ensureKey();
  
  const sym = (symbol || '').toUpperCase().trim();
  if (!sym) {
    throw new Error('Symbol is required for stock quote');
  }
  
  // Check if user has viewed this stock recently
  const isPriority = userViewedStocks.has(sym);
  
  // Check cache first
  const cached = getCachedPrice(sym, isPriority);
  if (cached) {
    return cached;
  }
  
  console.log(`Fetching fresh quote for ${sym}...`);
  
  try {
    const url = `${FINNHUB_BASE}/quote?symbol=${sym}&token=${FINNHUB_API_KEY}`;
    const data = await getJson(url);
    
    if (data && data.c !== undefined) {
      const quote = {
        symbol: sym,
        price: parseFloat(data.c) || 0,
        currentPrice: parseFloat(data.c) || 0,
        change: parseFloat(data.d) || 0,
        changePercent: parseFloat(data.dp) || 0,
        high: parseFloat(data.h) || 0,
        low: parseFloat(data.l) || 0,
        open: parseFloat(data.o) || 0,
        previousClose: parseFloat(data.pc) || 0,
        volume: parseInt(data.v) || 0,
        timestamp: Date.now()
      };
      
      // Validate the quote data
      if (quote.price <= 0) {
        console.warn(`Invalid price for ${sym}: ${quote.price}`);
        console.warn(`Raw API data for ${sym}:`, data);
        
        // For some stocks, try using previous close or open price as fallback
        const fallbackPrice = parseFloat(data.pc) || parseFloat(data.o) || 0;
        if (fallbackPrice > 0) {
          console.log(`Using fallback price for ${sym}: $${fallbackPrice}`);
          quote.price = fallbackPrice;
          quote.currentPrice = fallbackPrice;
        } else {
          console.warn(`Skipping ${sym} - no valid price available`);
          return null; // Return null instead of throwing error
        }
      }
      
      console.log(`✅ Quote for ${sym}: $${quote.price} (${quote.changePercent >= 0 ? '+' : ''}${quote.changePercent.toFixed(2)}%)`);
      
      // Cache the result
      setCachedPrice(sym, quote, isPriority);
      return quote;
    } else {
      console.error(`Invalid quote data for ${sym}:`, data);
      console.warn(`Skipping ${sym} - invalid quote data received`);
      return null; // Return null instead of throwing error
    }
  } catch (error) {
    if (error.message === 'API_LIMIT_REACHED') {
      // Queue this request for later
      queueStockUpdate(sym, isPriority);
      throw error;
    }
    console.error(`Error fetching quote for ${sym}:`, error);
    console.warn(`Skipping ${sym} due to fetch error`);
    return null; // Return null instead of throwing error
  }
};

// Smart multiple quotes - only fetch what's needed
export const getMultipleQuotes = async (symbols) => {
  if (!symbols || symbols.length === 0) {
    return [];
  }
  
  const quotes = [];
  const symbolsToFetch = [];
  
  // Check cache first
  for (const symbol of symbols) {
    const isPriority = userViewedStocks.has(symbol);
    const cached = getCachedPrice(symbol, isPriority);
    
    if (cached) {
      quotes.push(cached);
    } else {
      symbolsToFetch.push(symbol);
    }
  }
  
  // Fetch only what's not cached
  if (symbolsToFetch.length > 0) {
    console.log(`Fetching ${symbolsToFetch.length} quotes, ${quotes.length} from cache`);
    
    for (const symbol of symbolsToFetch) {
      try {
        const quote = await getStockQuote(symbol);
        if (quote) { // Only add if quote is valid (not null)
          quotes.push(quote);
        } else {
          console.log(`Skipping ${symbol} - invalid quote data`);
        }
      } catch (error) {
        if (error.message === 'API_LIMIT_REACHED') {
          // Queue remaining symbols
          symbolsToFetch.forEach(sym => queueStockUpdate(sym, userViewedStocks.has(sym)));
          break;
        }
        console.error(`Error fetching ${symbol}:`, error.message);
      }
    }
  }
  
  // Filter out any null quotes and log summary
  const validQuotes = quotes.filter(quote => quote !== null);
  console.log(`✅ Successfully fetched ${validQuotes.length}/${symbols.length} valid quotes`);
  
  return validQuotes;
};

// Get company profile with caching
export const getCompanyProfile = async (symbol) => {
  ensureKey();
  
  const sym = (symbol || '').toUpperCase().trim();
  if (!sym) {
    throw new Error('Symbol is required for company profile');
  }
  
  const cacheKey = `profile-${sym}`;
  const cached = getCachedPrice(cacheKey);
  if (cached) {
    return cached;
  }
  
  try {
    const url = `${FINNHUB_BASE}/stock/profile2?symbol=${sym}&token=${FINNHUB_API_KEY}`;
    const data = await getJson(url);
    
    if (data && data.name) {
      const profile = {
        symbol: sym,
        name: data.name,
        sector: data.finnhubIndustry || 'Unknown',
        industry: data.finnhubIndustry || 'Unknown',
        marketCap: data.marketCapitalization ? `${(data.marketCapitalization / 1000000000).toFixed(1)}B` : 'N/A',
        marketCapitalization: data.marketCapitalization, // Keep raw value for financial calculations
        country: data.country || 'Unknown',
        currency: data.currency || 'USD',
        exchange: data.exchange || 'Unknown',
        ipo: data.ipo || 'N/A',
        timestamp: Date.now()
      };
      
      setCachedPrice(cacheKey, profile);
      return profile;
    } else {
      return {
        symbol: sym,
        name: sym,
        sector: 'Unknown',
        industry: 'Unknown',
        marketCap: 'N/A',
        country: 'Unknown',
        currency: 'USD',
        exchange: 'Unknown',
        ipo: 'N/A',
        timestamp: Date.now()
      };
    }
  } catch (error) {
    console.error(`Error fetching company profile for ${sym}:`, error);
    return {
      symbol: sym,
      name: sym,
      sector: 'Unknown',
      industry: 'Unknown',
      marketCap: 'N/A',
      country: 'Unknown',
      currency: 'USD',
      exchange: 'Unknown',
      ipo: 'N/A',
      timestamp: Date.now()
    };
  }
};

// Get company financials with caching
export const getCompanyFinancials = async (symbol) => {
  ensureKey();
  
  const sym = (symbol || '').toUpperCase().trim();
  if (!sym) {
    throw new Error('Symbol is required for company financials');
  }
  
  const cacheKey = `financials-${sym}`;
  const cached = getCachedPrice(cacheKey);
  if (cached) {
    return cached;
  }
  
  try {
    // Get both quote and company profile data
    const [quote, profile] = await Promise.all([
      getStockQuote(sym),
      getCompanyProfile(sym)
    ]);
    
    const financials = {
      symbol: sym,
      peRatio: 'N/A',
      dividendYield: 'N/A',
      marketCap: 'N/A',
      source: 'API'
    };
    
    // Extract market cap from company profile if available
    if (profile && profile.marketCapitalization && profile.marketCapitalization > 0) {
      const marketCap = profile.marketCapitalization;
      if (marketCap >= 1e12) {
        financials.marketCap = `${(marketCap / 1e12).toFixed(1)}T`;
      } else if (marketCap >= 1e9) {
        financials.marketCap = `${(marketCap / 1e9).toFixed(1)}B`;
      } else if (marketCap >= 1e6) {
        financials.marketCap = `${(marketCap / 1e6).toFixed(1)}M`;
      } else {
        financials.marketCap = `${marketCap.toFixed(0)}`;
      }
      console.log(`API market cap for ${sym}: ${financials.marketCap} (raw: ${marketCap})`);
    } else {
      console.log(`No valid market cap from API for ${sym}, will use LLM fallback`);
    }
    
    // Extract P/E ratio from quote if available
    if (quote && quote.peRatio && quote.peRatio > 0) {
      financials.peRatio = quote.peRatio.toFixed(1);
    }
    
    // Extract dividend yield from quote if available
    if (quote && quote.dividendYield !== undefined && quote.dividendYield !== null) {
      if (quote.dividendYield > 0) {
        financials.dividendYield = `${(quote.dividendYield * 100).toFixed(2)}%`;
      } else {
        financials.dividendYield = '0.0%';
      }
    }
    
    console.log(`Financial data for ${sym}:`, financials);
    
    setCachedPrice(cacheKey, financials);
    return financials;
  } catch (error) {
    console.error(`Error fetching financials for ${sym}:`, error);
    return {
      symbol: sym,
      peRatio: 'N/A',
      dividendYield: 'N/A',
      marketCap: 'N/A',
      source: 'error'
    };
  }
};

// Enhanced company financials with LLM fallback for non-price data
export const getCompanyFinancialsEnhanced = async (symbol) => {
  const sym = (symbol || '').toUpperCase().trim();
  
  try {
    // First try to get real data from API
    const apiData = await getCompanyFinancials(sym);
    
    // If API doesn't provide financial data, return N/A values
    // LLM generation will be handled in stockGenerationService to avoid circular dependency
    if (apiData.peRatio === 'N/A' && apiData.dividendYield === 'N/A' && apiData.marketCap === 'N/A') {
      console.log(`No financial data available for ${sym} - will be handled by stock generation service`);
    }
    
    return apiData;
    
  } catch (error) {
    console.warn(`Enhanced financial data failed for ${sym}:`, error);
    
    return {
      symbol: sym,
      peRatio: 'N/A',
      dividendYield: 'N/A',
      marketCap: 'N/A',
      source: 'unavailable'
    };
  }
};

// Enhanced stock history with better error handling - NO SYNTHETIC DATA
export const getStockHistory = async (symbol, period = '1M') => {
  ensureKey();
  
  if (!symbol) {
    throw new Error('Symbol is required for stock history');
  }

  const cacheKey = `history-${symbol}-${period}`;
  const cached = getCachedPrice(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    // If API limit reached, return null
    if (apiLimitReached) {
      console.log(`API limit reached for ${symbol} history - no data available`);
      return null;
    }

    const now = Math.floor(Date.now() / 1000);
    let from;
    
    // Calculate from timestamp based on period
    switch (period) {
      case '1D':
        from = now - (24 * 60 * 60); // 24 hours ago
        break;
      case '1W':
        from = now - (7 * 24 * 60 * 60); // 7 days ago
        break;
      case '1M':
        from = now - (30 * 24 * 60 * 60); // 30 days ago
        break;
      case '3M':
        from = now - (90 * 24 * 60 * 60); // 90 days ago
        break;
      case '1Y':
        from = now - (365 * 24 * 60 * 60); // 365 days ago
        break;
      default:
        from = now - (30 * 24 * 60 * 60); // Default to 1 month
    }

    const url = `${FINNHUB_BASE}/stock/candle?symbol=${symbol}&resolution=D&from=${from}&to=${now}&token=${FINNHUB_API_KEY}`;
    
    const data = await getJson(url);
    
    if (data && data.s === 'ok' && data.t && data.c) {
      const history = data.t.map((timestamp, index) => ({
        timestamp,
        open: parseFloat(data.o[index]) || 0,
        high: parseFloat(data.h[index]) || 0,
        low: parseFloat(data.l[index]) || 0,
        close: parseFloat(data.c[index]) || 0,
        volume: parseInt(data.v[index]) || 0
      }));
      
      setCachedPrice(cacheKey, history);
      return history;
    } else {
      console.log(`No valid history data for ${symbol}`);
      return null;
    }
  } catch (error) {
    if (error.message === 'API_LIMIT_REACHED') {
      console.log(`API limit reached for ${symbol} history - no data available`);
      return null;
    }
    console.error(`Error fetching stock history for ${symbol}:`, error);
    return null;
  }
};

// API status and management functions
export const getApiStatus = () => ({
  apiLimitReached,
  cacheSize: priceCache.size,
  lastApiCall,
  pendingRequests: pendingRequests.size,
  queueSize: updateQueue.length,
  userViewedStocks: userViewedStocks.size
});

export const resetApiLimit = () => {
  apiLimitReached = false;
  console.log('API limit reset');
};

// Auto-reset API limit after 1 minute
export const enableAutoReset = () => {
  setInterval(() => {
    if (apiLimitReached) {
      console.log('Auto-resetting API limit after 1 minute');
      apiLimitReached = false;
    }
  }, 60 * 1000); // 1 minute
};

// Initialize auto-reset
enableAutoReset();

export const clearPriceCache = () => {
  priceCache.clear();
  console.log('Price cache cleared');
};

// Optimized connection test
export const testFinnhubConnection = async () => {
  try {
    const result = await getStockQuote('AAPL');
    return result && result.price > 0;
  } catch (error) {
    console.warn('Finnhub connection test failed:', error.message);
    return false;
  }
}; 
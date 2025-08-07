// smartRateLimiter.js - Intelligent Rate Limiting for Stock Data

class SmartRateLimiter {
  constructor() {
    this.cache = new Map();
    this.userLimits = new Map();
    this.globalLimits = {
      calls: 0,
      maxCalls: 100, // Base limit per minute
      resetTime: Date.now() + 60000,
    };
  }

  // Get user-specific rate limit based on portfolio size
  getUserLimit(portfolioSize) {
    if (portfolioSize <= 5) {
      return { maxCalls: 20, interval: 60000 }; // 20 calls per minute for small portfolios
    } else if (portfolioSize <= 15) {
      return { maxCalls: 40, interval: 60000 }; // 40 calls per minute for medium portfolios
    } else {
      return { maxCalls: 60, interval: 60000 }; // 60 calls per minute for large portfolios
    }
  }

  // Check if we can make an API call
  async canMakeCall(userId, portfolioSize = 0) {
    const now = Date.now();
    
    // Check global limits
    if (now > this.globalLimits.resetTime) {
      this.globalLimits.calls = 0;
      this.globalLimits.resetTime = now + 60000;
    }
    
    if (this.globalLimits.calls >= this.globalLimits.maxCalls) {
      return { canCall: false, reason: 'Global rate limit exceeded' };
    }

    // Check user-specific limits
    const userLimit = this.getUserLimit(portfolioSize);
    const userKey = `${userId}_${portfolioSize}`;
    
    if (!this.userLimits.has(userKey)) {
      this.userLimits.set(userKey, {
        calls: 0,
        resetTime: now + userLimit.interval,
      });
    }

    const userLimitData = this.userLimits.get(userKey);
    
    if (now > userLimitData.resetTime) {
      userLimitData.calls = 0;
      userLimitData.resetTime = now + userLimit.interval;
    }

    if (userLimitData.calls >= userLimit.maxCalls) {
      return { canCall: false, reason: 'User rate limit exceeded' };
    }

    return { canCall: true };
  }

  // Check rate limit (for compatibility with stockGenerationService)
  async checkRateLimit(userId = 'anonymous', portfolioSize = 0) {
    const canCall = await this.canMakeCall(userId, portfolioSize);
    if (!canCall.canCall) {
      throw new Error(canCall.reason);
    }
  }

  // Update rate limit (for compatibility with stockGenerationService)
  updateRateLimit(userId = 'anonymous', portfolioSize = 0) {
    this.recordCall(userId, portfolioSize);
  }

  // Record an API call
  recordCall(userId, portfolioSize = 0) {
    this.globalLimits.calls++;
    
    const userKey = `${userId}_${portfolioSize}`;
    const userLimitData = this.userLimits.get(userKey);
    if (userLimitData) {
      userLimitData.calls++;
    }
  }

  // Get cached data if available and not expired
  getCachedData(key, maxAge = 300000) { // 5 minutes default
    try {
      const cached = this.cache.get(key);
      if (cached && (Date.now() - cached.timestamp < maxAge)) {
        return cached.value;
      }
      return null;
    } catch (error) {
      console.error('Error reading cache:', error);
      return null;
    }
  }

  // Cache data with timestamp
  cacheData(key, data) {
    try {
      const cacheEntry = {
        value: data,
        timestamp: Date.now(),
      };
      this.cache.set(key, cacheEntry);
    } catch (error) {
      console.error('Error writing cache:', error);
    }
  }

  // Get cache key for stock data
  getCacheKey(symbol, dataType = 'quote') {
    return `stock_${dataType}_${symbol.toUpperCase()}`;
  }

  // Smart stock data fetching with caching and rate limiting
  async fetchStockData(symbol, userId, portfolioSize = 0) {
    const cacheKey = this.getCacheKey(symbol, 'quote');
    
    // Try cache first
    const cached = this.getCachedData(cacheKey, 300000); // 5 minutes
    if (cached) {
      console.log(`📦 Using cached data for ${symbol}`);
      return cached;
    }

    // Check rate limits
    const canCall = await this.canMakeCall(userId, portfolioSize);
    if (!canCall.canCall) {
      console.log(`⏳ Rate limited for ${symbol}: ${canCall.reason}`);
      // Return stale cache if available
      const staleCache = this.getCachedData(cacheKey, 3600000); // 1 hour
      if (staleCache) {
        console.log(`📦 Using stale cache for ${symbol}`);
        return staleCache;
      }
      throw new Error(`Rate limit exceeded: ${canCall.reason}`);
    }

    // Make API call
    this.recordCall(userId, portfolioSize);
    return null; // Signal to fetch fresh data
  }

  // Batch fetch with intelligent prioritization
  async batchFetchStocks(symbols, userId, portfolioSize = 0) {
    const results = [];
    const toFetch = [];

    // Check cache for all symbols first
    for (const symbol of symbols) {
      const cacheKey = this.getCacheKey(symbol, 'quote');
      const cached = this.getCachedData(cacheKey, 300000);
      
      if (cached) {
        results.push({ symbol, data: cached, source: 'cache' });
      } else {
        toFetch.push(symbol);
      }
    }

    // Fetch fresh data for uncached symbols
    if (toFetch.length > 0) {
      const canCall = await this.canMakeCall(userId, portfolioSize);
      if (!canCall.canCall) {
        console.log(`⏳ Rate limited for batch fetch: ${canCall.reason}`);
        // Return what we have from cache
        return results;
      }

      // Prioritize symbols (you could implement more sophisticated prioritization)
      const prioritizedSymbols = this.prioritizeSymbols(toFetch);
      
      for (const symbol of prioritizedSymbols) {
        try {
          this.recordCall(userId, portfolioSize);
          // This would be replaced with actual API call
          const freshData = await this.fetchFreshData(symbol);
          results.push({ symbol, data: freshData, source: 'api' });
          
          // Cache the fresh data
          const cacheKey = this.getCacheKey(symbol, 'quote');
          this.cacheData(cacheKey, freshData);
        } catch (error) {
          console.error(`Error fetching ${symbol}:`, error);
          // Try to get stale cache as fallback
          const staleCache = this.getCachedData(this.getCacheKey(symbol, 'quote'), 3600000);
          if (staleCache) {
            results.push({ symbol, data: staleCache, source: 'stale_cache' });
          }
        }
      }
    }

    return results;
  }

  // Prioritize symbols based on importance
  prioritizeSymbols(symbols) {
    // You could implement more sophisticated prioritization
    // For now, just return as-is
    return symbols;
  }

  // Fetch fresh data from Yahoo Finance API
  async fetchFreshData(symbol) {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol.toUpperCase()}?interval=1d&range=1d`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const result = data.chart.result[0];
      const quote = result.indicators.quote[0];
      const timestamp = result.timestamp[result.timestamp.length - 1];
      const close = quote.close[quote.close.length - 1];
      const open = quote.open[quote.open.length - 1];
      const high = quote.high[quote.high.length - 1];
      const low = quote.low[quote.low.length - 1];
      const volume = quote.volume[quote.volume.length - 1];

      const change = close - open;
      const changePercent = (change / open) * 100;

      return {
        symbol: symbol.toUpperCase(),
        price: close,
        change: change,
        changePercent: `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`,
        volume: volume,
        high: high,
        low: low,
        open: open,
        previousClose: open,
        timestamp: new Date(timestamp * 1000).toISOString(),
      };
    } catch (error) {
      console.error(`Error fetching fresh data for ${symbol}:`, error);
      throw error;
    }
  }

  // Get rate limit status
  getStatus(userId, portfolioSize = 0) {
    const userKey = `${userId}_${portfolioSize}`;
    const userLimit = this.getUserLimit(portfolioSize);
    const userLimitData = this.userLimits.get(userKey);
    
    return {
      global: {
        calls: this.globalLimits.calls,
        maxCalls: this.globalLimits.maxCalls,
        resetTime: this.globalLimits.resetTime,
      },
      user: {
        calls: userLimitData?.calls || 0,
        maxCalls: userLimit.maxCalls,
        resetTime: userLimitData?.resetTime || 0,
      },
      portfolioSize,
    };
  }
}

export default new SmartRateLimiter(); 
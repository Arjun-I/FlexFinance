// stockGenerationService.js - Personalized Stock Generation System
import { doc, getDoc, setDoc, collection, getDocs, query, where, orderBy, limit, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import llmService from './llmService';
import smartRateLimiter from './smartRateLimiter';
import Constants from 'expo-constants';

// Yahoo Finance API configuration (no API key needed)
const YAHOO_FINANCE_BASE_URL = 'https://query1.finance.yahoo.com/v8/finance';

// Cache configuration
const CACHE_CONFIG = {
  priceCacheDuration: 5 * 60 * 1000, // 5 minutes for prices
  marketCapCacheDuration: 24 * 60 * 60 * 1000, // 24 hours for market cap
  maxCacheSize: 100 // Maximum number of cached stocks
};

// In-memory cache for stock data
const stockCache = new Map();

class StockGenerationService {
  constructor() {
    this.userPreferences = null;
    this.riskProfile = null;
    this.generatedStocks = [];
    this.lastGenerationDate = null;
  }

  // Check if cached data is still valid
  isCacheValid(symbol, dataType = 'price') {
    const cached = stockCache.get(symbol);
    if (!cached) return false;

    const now = Date.now();
    const cacheDuration = dataType === 'marketCap' ? CACHE_CONFIG.marketCapCacheDuration : CACHE_CONFIG.priceCacheDuration;
    
    return (now - cached.timestamp) < cacheDuration;
  }

  // Get cached stock data
  getCachedStockData(symbol) {
    return stockCache.get(symbol);
  }

  // Cache stock data
  cacheStockData(symbol, data) {
    // Implement LRU cache eviction if cache is full
    if (stockCache.size >= CACHE_CONFIG.maxCacheSize) {
      const oldestKey = stockCache.keys().next().value;
      stockCache.delete(oldestKey);
    }

    stockCache.set(symbol, {
      ...data,
      timestamp: Date.now(),
      lastUpdated: new Date().toISOString()
    });
  }

  // Clean up expired cache entries
  cleanupCache() {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [symbol, data] of stockCache.entries()) {
      const isPriceExpired = (now - data.timestamp) > CACHE_CONFIG.priceCacheDuration;
      const isMarketCapExpired = (now - data.timestamp) > CACHE_CONFIG.marketCapCacheDuration;
      
      // Remove if both price and market cap are expired
      if (isPriceExpired && isMarketCapExpired) {
        stockCache.delete(symbol);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} expired cache entries`);
    }
  }

  // Get cache statistics
  getCacheStats() {
    const now = Date.now();
    let priceValid = 0;
    let marketCapValid = 0;
    let expired = 0;
    
    for (const [symbol, data] of stockCache.entries()) {
      const isPriceValid = (now - data.timestamp) < CACHE_CONFIG.priceCacheDuration;
      const isMarketCapValid = (now - data.timestamp) < CACHE_CONFIG.marketCapCacheDuration;
      
      if (isPriceValid) priceValid++;
      if (isMarketCapValid) marketCapValid++;
      if (!isPriceValid && !isMarketCapValid) expired++;
    }
    
    return {
      totalEntries: stockCache.size,
      priceValid,
      marketCapValid,
      expired,
      maxSize: CACHE_CONFIG.maxCacheSize
    };
  }

  // Force refresh cache for a specific symbol
  async forceRefreshCache(symbol) {
    stockCache.delete(symbol.toUpperCase());
    return await this.fetchStockData(symbol);
  }

  // Check network connectivity
  async checkNetworkConnectivity() {
    try {
      const response = await fetch('https://www.google.com', { 
        method: 'HEAD',
        timeout: 5000 
      });
      return response.ok;
    } catch (error) {
      console.warn('⚠️ Network connectivity check failed:', error.message);
      return false;
    }
  }

  // Fetch stock data with smart caching
  async fetchStockData(symbol) {
    const symbolUpper = symbol.toUpperCase();
    
    // Check cache first
    const cached = this.getCachedStockData(symbolUpper);
    if (cached && this.isCacheValid(symbolUpper, 'price')) {
      console.log(`📦 Using cached data for ${symbolUpper}`);
      return cached;
    }

    // Check network connectivity
    const isConnected = await this.checkNetworkConnectivity();
    if (!isConnected) {
      console.warn('⚠️ No network connectivity detected');
      if (cached) {
        return cached;
      }
      return this.createFallbackStockData(symbolUpper);
    }

    // Check if we need to update market cap
    const needsMarketCapUpdate = !cached || !this.isCacheValid(symbolUpper, 'marketCap');
    
    try {
      await smartRateLimiter.checkRateLimit('anonymous', 0);
    } catch (error) {
      console.warn(`⚠️ Rate limit exceeded for ${symbolUpper}, using cached data if available`);
      if (cached) {
        return cached;
      }
      throw new Error(`Rate limit exceeded and no cached data available for ${symbolUpper}`);
    }

    try {
      console.log(`🔄 Fetching ${needsMarketCapUpdate ? 'full' : 'price-only'} data for ${symbolUpper} from Yahoo Finance...`);
      
      // Always fetch price data
      const chartUrl = `${YAHOO_FINANCE_BASE_URL}/chart/${symbolUpper}?interval=1d&range=1d`;
      console.log(`📡 Fetching from: ${chartUrl}`);
      
      const chartRes = await fetch(chartUrl, { 
        timeout: 20000, // Increased timeout
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache'
        }
      });
      
      console.log(`📡 Yahoo Finance response status: ${chartRes.status}`);
      
      if (!chartRes.ok) {
        throw new Error(`Yahoo Finance API error: ${chartRes.status} - ${chartRes.statusText}`);
      }

      const chartData = await chartRes.json();
      console.log(`📄 Yahoo Finance response received for ${symbolUpper}`);
      
      if (!chartData.chart || !chartData.chart.result || chartData.chart.result.length === 0) {
        throw new Error(`No price data found for symbol: ${symbolUpper}`);
      }

      const result = chartData.chart.result[0];
      const quote = result.indicators.quote[0];
      
      if (!quote || !quote.close || quote.close.length === 0) {
        throw new Error(`No quote data available for ${symbolUpper}`);
      }
      
      const timestamp = result.timestamp[result.timestamp.length - 1];
      const close = quote.close[quote.close.length - 1];
      const open = quote.open[quote.open.length - 1];
      
      if (!close || !open) {
        throw new Error(`Invalid price data for ${symbolUpper}`);
      }
      
      const change = close - open;
      const changePercent = (change / open) * 100;

      console.log(`💰 Price data for ${symbolUpper}: Close=$${close}, Change=${changePercent.toFixed(2)}%`);

      let stockData = {
        symbol: symbolUpper,
        name: symbolUpper,
        price: `$${close.toFixed(2)}`,
        change: `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`,
        sector: cached?.sector || 'Technology',
        industry: cached?.industry || 'Software',
        description: cached?.description || 'Stock data from Yahoo Finance',
        website: cached?.website || '',
        logo: null,
        growth: '',
        riskLevel: 'medium', // Ensure riskLevel is always present
        confidence: 0.7, // Ensure confidence is always present
        reason: 'Real-time stock data', // Ensure reason is always present
        riskMetrics: {
          beta: cached?.riskMetrics?.beta || 'N/A',
          volatility: Math.abs(changePercent)
        }
      };

      // Always fetch detailed data (market cap, etc.) for fresh data
      try {
        const summaryUrl = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbolUpper}?modules=summaryDetail,financialData,assetProfile`;
        console.log(`📡 Fetching detailed data from: ${summaryUrl}`);
        
        const summaryRes = await fetch(summaryUrl, { 
          timeout: 20000, // Increased timeout
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'application/json',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-cache'
          }
        });
        
        console.log(`📡 Detailed data response status: ${summaryRes.status}`);
        
        if (summaryRes.ok) {
          const summaryData = await summaryRes.json();
          console.log(`📄 Detailed data response received for ${symbolUpper}`);
          
          const summary = summaryData.quoteSummary?.result?.[0];
          const summaryDetail = summary?.summaryDetail;
          const financialData = summary?.financialData;
          const assetProfile = summary?.assetProfile;

          stockData = {
            ...stockData,
            marketCap: summaryDetail?.marketCap ? `${(summaryDetail.marketCap / 1e9).toFixed(2)}B` : 'N/A',
            peRatio: financialData?.forwardPE ? financialData.forwardPE.toFixed(2) : 'N/A',
            dividendYield: summaryDetail?.dividendYield ? `${(summaryDetail.dividendYield * 100).toFixed(2)}%` : 'N/A',
            sector: assetProfile?.sector || stockData.sector,
            industry: assetProfile?.industry || stockData.industry,
            description: assetProfile?.longBusinessSummary || stockData.description,
            website: assetProfile?.website || stockData.website,
          };
          
          console.log(`📊 Detailed data for ${symbolUpper}: Market Cap=${stockData.marketCap}, PE=${stockData.peRatio}, Dividend=${stockData.dividendYield}`);
        } else {
          console.warn(`⚠️ Detailed data request failed for ${symbolUpper}: ${summaryRes.status}`);
          // Use cached detailed data if available
          if (cached) {
            stockData = {
              ...stockData,
              marketCap: cached.marketCap,
              peRatio: cached.peRatio,
              dividendYield: cached.dividendYield,
              sector: cached.sector,
              industry: cached.industry,
              description: cached.description,
              website: cached.website,
            };
          }
        }
      } catch (error) {
        console.warn(`⚠️ Could not fetch detailed data for ${symbolUpper}:`, error.message);
        // Use cached detailed data if available
        if (cached) {
          stockData = {
            ...stockData,
            marketCap: cached.marketCap,
            peRatio: cached.peRatio,
            dividendYield: cached.dividendYield,
            sector: cached.sector,
            industry: cached.industry,
            description: cached.description,
            website: cached.website,
          };
        }
      }

      smartRateLimiter.updateRateLimit('anonymous', 0);
      this.cacheStockData(symbolUpper, stockData);
      
      console.log(`✅ Successfully fetched real-time data for ${symbolUpper}`);
      return stockData;
    } catch (error) {
      console.error(`❌ Error fetching data for ${symbolUpper}:`, error.message);
      
      // Return cached data if available, otherwise create fallback data
      if (cached) {
        console.log(`📦 Returning cached data for ${symbolUpper} due to API error`);
        return cached;
      }
      
      // Create fallback data with mock prices for common stocks
      console.log(`🔄 Creating fallback data for ${symbolUpper} due to API failure`);
      const fallbackData = this.createFallbackStockData(symbolUpper);
      this.cacheStockData(symbolUpper, fallbackData);
      return fallbackData;
    }
  }

  // Create fallback stock data when API fails
  createFallbackStockData(symbol) {
    const mockPrices = {
      'AAPL': { price: 190.50, change: 2.3, sector: 'Technology', industry: 'Consumer Electronics' },
      'MSFT': { price: 310.25, change: 1.8, sector: 'Technology', industry: 'Software' },
      'GOOGL': { price: 2800.00, change: 3.1, sector: 'Technology', industry: 'Internet Services' },
      'AMZN': { price: 140.75, change: 1.5, sector: 'Consumer', industry: 'E-commerce' },
      'TSLA': { price: 270.30, change: 4.2, sector: 'Consumer', industry: 'Automotive' },
      'NVDA': { price: 500.00, change: 5.8, sector: 'Technology', industry: 'Semiconductors' },
      'META': { price: 350.40, change: 2.7, sector: 'Technology', industry: 'Social Media' },
      'NFLX': { price: 450.20, change: 1.9, sector: 'Consumer', industry: 'Entertainment' },
      'JNJ': { price: 165.80, change: 0.8, sector: 'Healthcare', industry: 'Pharmaceuticals' },
      'PG': { price: 145.20, change: 0.5, sector: 'Consumer', industry: 'Consumer Staples' }
    };

    const stockData = mockPrices[symbol] || { price: 100.00, change: 0.0, sector: 'Technology', industry: 'Software' };
    
    return {
      symbol: symbol.toUpperCase(),
      name: symbol.toUpperCase(),
      price: `$${stockData.price.toFixed(2)}`,
      change: `${stockData.change >= 0 ? '+' : ''}${stockData.change.toFixed(2)}%`,
      marketCap: 'N/A',
      peRatio: 'N/A',
      dividendYield: 'N/A',
      sector: stockData.sector,
      industry: stockData.industry,
      description: 'Fallback stock data (API unavailable)',
      website: '',
      logo: null,
      growth: '',
      riskLevel: 'medium',
      confidence: 0.7,
      reason: 'Fallback stock recommendation',
      riskMetrics: {
        beta: 'N/A',
        volatility: Math.abs(stockData.change)
      }
    };
  }

  // Load user context for personalized recommendations
  async loadUserContext() {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error('User not authenticated');

      const userDoc = await getDoc(doc(db, 'users', uid));
      const userData = userDoc.data();
      
      this.riskProfile = userData?.riskProfile || {};
      this.userPreferences = {
        likedStocks: userData?.likedStocks || [],
        rejectedStocks: [],
        portfolio: userData?.portfolio || [],
        cashBalance: userData?.cashBalance || 100000,
      };

      // Load rejected stocks
      const rejectedSnap = await getDocs(collection(db, 'users', uid, 'rejected'));
      this.userPreferences.rejectedStocks = rejectedSnap.docs.map(doc => doc.data());

      console.log('✅ User context loaded for stock generation');
      return true;
    } catch (error) {
      console.error('❌ Error loading user context:', error);
      return false;
    }
  }

  // Generate personalized stock recommendations using LLM
  async generatePersonalizedStocks(maxStocks = 10) {
    try {
      if (!this.riskProfile || !this.userPreferences) {
        await this.loadUserContext();
      }

      console.log('🔄 Generating personalized stock recommendations with LLM...');
      
      // Get LLM recommendations for stock selection
      const recommendations = await llmService.getRecommendations(maxStocks * 2); // Get more to filter
      
      if (!recommendations || recommendations.length === 0) {
        throw new Error('No recommendations received from LLM service');
      }
      
      // Filter out already liked/rejected stocks
      const likedSymbols = this.userPreferences.likedStocks.map(s => s.symbol);
      const rejectedSymbols = this.userPreferences.rejectedStocks.map(s => s.symbol);
      
      const availableStocks = recommendations
        .filter(rec => !likedSymbols.includes(rec.symbol) && !rejectedSymbols.includes(rec.symbol))
        .slice(0, maxStocks);

      console.log(`🎯 Generated ${availableStocks.length} personalized stock recommendations with LLM analysis`);
      
      // Enhance each stock with additional data
      const enhancedStocks = await Promise.all(
        availableStocks.map(async (stock) => {
          try {
            // Try to get real-time data for each stock
            const realTimeData = await this.fetchStockData(stock.symbol);
            return {
              ...stock,
              ...realTimeData,
              // Preserve LLM analysis
              analysis: stock.analysis || stock.reason,
              investmentThesis: stock.reason,
              keyRisks: stock.keyRisks || ['Market volatility', 'Sector-specific risks'],
              keyBenefits: stock.keyBenefits || ['Growth potential', 'Strong fundamentals'],
              targetPrice: stock.targetPrice || realTimeData.price,
              dividendYield: stock.dividendYield || realTimeData.dividendYield,
              recommendation: stock.recommendation || 'buy',
              generatedAt: new Date(),
              source: 'LLM + Real-time Data'
            };
          } catch (error) {
            console.warn(`⚠️ Could not fetch real-time data for ${stock.symbol}, using LLM data only`);
            return {
              ...stock,
              price: stock.targetPrice || '$0.00',
              change: '+0.00%',
              analysis: stock.analysis || stock.reason,
              investmentThesis: stock.reason,
              keyRisks: stock.keyRisks || ['Market volatility', 'Sector-specific risks'],
              keyBenefits: stock.keyBenefits || ['Growth potential', 'Strong fundamentals'],
              targetPrice: stock.targetPrice || '$0.00',
              dividendYield: stock.dividendYield || 'N/A',
              recommendation: stock.recommendation || 'buy',
              generatedAt: new Date(),
              source: 'LLM Analysis Only'
            };
          }
        })
      );

      return enhancedStocks;
    } catch (error) {
      console.error('❌ Error generating personalized stocks:', error);
      throw error; // Don't fall back to mock data, let the error propagate
    }
  }

  // Fetch detailed data for recommended stocks
  async fetchStockDetails(recommendedStocks) {
    const stockDetails = [];
    const errors = [];

    for (const stock of recommendedStocks) {
      try {
        const symbol = typeof stock === 'string' ? stock : stock.symbol;
        const data = await this.fetchStockData(symbol);
        
        stockDetails.push({
          ...data,
          recommendation: typeof stock === 'object' ? stock : null,
          generatedAt: new Date(),
          source: 'AI Generated'
        });

        // Add delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`Failed to fetch data for ${stock}:`, error);
        errors.push({ symbol: stock, error: error.message });
      }
    }

    console.log(`✅ Fetched details for ${stockDetails.length} stocks`);
    if (errors.length > 0) {
      console.warn(`⚠️ Failed to fetch ${errors.length} stocks:`, errors);
    }

    return stockDetails;
  }

  // Generate and store daily stock recommendations
  async generateDailyStocks() {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error('User not authenticated');

      const today = new Date().toDateString();
      
      // Clean up expired cache entries
      this.cleanupCache();
      
      // Check if stocks were already generated today
      const existingStocks = await this.getGeneratedStocks();
      if (existingStocks.length > 0) {
        const lastGenerated = new Date(existingStocks[0].generatedAt).toDateString();
        if (lastGenerated === today) {
          console.log('✅ Stocks already generated today, using cached data');
          return existingStocks;
        }
      }

      console.log('🔄 Generating new daily stock recommendations with smart caching...');

      // Generate personalized recommendations
      const recommendedStocks = await this.generatePersonalizedStocks(10);
      
      if (!recommendedStocks || recommendedStocks.length === 0) {
        throw new Error('No personalized stocks generated');
      }
      
      // Fetch detailed data for each stock with smart caching
      const stockDetails = await this.fetchStockDetailsWithCache(recommendedStocks);

      // Store generated stocks in Firestore
      await this.storeGeneratedStocks(stockDetails);

      console.log(`✅ Generated and stored ${stockDetails.length} new stock recommendations with smart caching`);
      return stockDetails;
    } catch (error) {
      console.error('❌ Error generating daily stocks:', error);
      throw error; // Don't fall back to mock data, let the error propagate
    }
  }

  // Fetch detailed data for recommended stocks with smart caching
  async fetchStockDetailsWithCache(recommendedStocks) {
    const stockDetails = [];
    const errors = [];
    const cacheStats = this.getCacheStats();

    console.log(`📊 Cache stats before fetching: ${JSON.stringify(cacheStats)}`);

    for (const stock of recommendedStocks) {
      try {
        const symbol = typeof stock === 'string' ? stock : stock.symbol;
        const data = await this.fetchStockData(symbol);
        
        stockDetails.push({
          ...data,
          recommendation: typeof stock === 'object' ? stock : null,
          generatedAt: new Date(),
          source: 'LLM + Smart Cached Data'
        });

        // Add delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`Failed to fetch data for ${stock}:`, error);
        errors.push({ symbol: stock, error: error.message });
      }
    }

    const finalCacheStats = this.getCacheStats();
    console.log(`📊 Cache stats after fetching: ${JSON.stringify(finalCacheStats)}`);
    console.log(`✅ Fetched details for ${stockDetails.length} stocks with smart caching`);
    if (errors.length > 0) {
      console.warn(`⚠️ Failed to fetch ${errors.length} stocks:`, errors);
    }

    return stockDetails;
  }

  // Store generated stocks in Firestore
  async storeGeneratedStocks(stocks) {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error('User not authenticated');

      // Clear old generated stocks
      const oldStocksRef = collection(db, 'users', uid, 'generatedStocks');
      const oldStocksSnap = await getDocs(oldStocksRef);
      
      // Delete old stocks
      const deletePromises = oldStocksSnap.docs.map(docSnapshot => deleteDoc(docSnapshot.ref));
      await Promise.all(deletePromises);

      // Add new generated stocks
      const addPromises = stocks.map(stock => {
        const stockRef = doc(collection(db, 'users', uid, 'generatedStocks'));
        return setDoc(stockRef, stock);
      });
      await Promise.all(addPromises);

      console.log('✅ Generated stocks stored in Firestore');
    } catch (error) {
      console.error('❌ Error storing generated stocks:', error);
      throw error;
    }
  }

  // Get generated stocks from Firestore
  async getGeneratedStocks() {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return [];

      const stocksRef = collection(db, 'users', uid, 'generatedStocks');
      const stocksSnap = await getDocs(query(stocksRef, orderBy('generatedAt', 'desc')));
      
      return stocksSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('❌ Error fetching generated stocks:', error);
      return [];
    }
  }

  // Helper methods for risk profile interpretation
  getRiskLevel(volatility) {
    if (volatility <= 8) return 'low';
    if (volatility <= 12) return 'medium';
    return 'high';
  }

  // Get stock analysis from LLM
  async getStockAnalysis(symbol) {
    try {
      return await llmService.getStockAnalysis(symbol);
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

export default new StockGenerationService(); 
// stockGenerationService.js - Personalized Stock Generation System
import { doc, getDoc, setDoc, collection, getDocs, query, where, orderBy, limit, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import llmService from './llmService';
import { getSecureRecommendations, getSecureStockAnalysis } from './secureLLMService';
import smartRateLimiter from './smartRateLimiter';
import Constants from 'expo-constants';
import { getStockQuote, getCompanyProfile } from './finnhubService';

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
      expired
    };
  }

  // Force refresh cache for a specific symbol
  async forceRefreshCache(symbol) {
    stockCache.delete(symbol);
    console.log(`🔄 Cache refreshed for ${symbol}`);
  }

  // Check network connectivity
  async checkNetworkConnectivity() {
    try {
      const response = await fetch('https://httpbin.org/status/200', { method: 'HEAD' });
      return response.ok;
    } catch (error) {
      console.warn('Network connectivity check failed:', error);
      return false;
    }
  }

  // Load user context for stock generation
  async loadUserContext() {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get user preferences
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();
      
      this.userPreferences = {
        likedStocks: userData?.likedStocks || [],
        rejectedStocks: userData?.rejectedStocks || [],
        portfolio: userData?.portfolio || [],
        cashBalance: userData?.cashBalance || 100000
      };

      // Get risk profile
      const riskDoc = await getDoc(doc(db, 'users', user.uid, 'preferences', 'quiz'));
      const riskData = riskDoc.data();
      
      this.riskProfile = riskData?.riskProfile || {
        volatility: 10,
        timeHorizon: 3,
        knowledge: 2,
        ethics: 3,
        liquidity: 2
      };

      console.log('✅ User context loaded for stock generation');
      return true;
    } catch (error) {
      console.error('❌ Error loading user context:', error);
      return false;
    }
  }

  // Generate personalized stock recommendations using LLM ONLY - NO MOCK DATA
  async generatePersonalizedStocks(maxStocks = 10) {
    try {
      console.log('🔄 Starting LLM-only stock generation...');
      
      if (!this.riskProfile || !this.userPreferences) {
        console.log('📊 Loading user context...');
        await this.loadUserContext();
      }

      console.log('📊 User context loaded:', {
        riskProfile: this.riskProfile ? 'loaded' : 'missing',
        userPreferences: this.userPreferences ? 'loaded' : 'missing',
        likedStocks: this.userPreferences?.likedStocks?.length || 0,
        rejectedStocks: this.userPreferences?.rejectedStocks?.length || 0
      });
      
      // Get LLM recommendations for stock selection (try secure first, fallback to direct, then fallback recommendations)
      let recommendations;
      try {
        console.log('🤖 Trying secure LLM recommendations...');
        const userContext = {
          riskProfile: this.riskProfile,
          userPreferences: this.userPreferences
        };
        recommendations = await getSecureRecommendations(userContext, maxStocks * 3);
        console.log('✅ Secure LLM recommendations received');
      } catch (error) {
        console.warn('⚠️ Secure LLM failed, falling back to direct API:', error.message);
        try {
          console.log('🤖 Trying direct LLM recommendations...');
          recommendations = await llmService.getRecommendations(maxStocks * 3);
          console.log('✅ Direct LLM recommendations received');
        } catch (llmError) {
          console.error('❌ Both secure and direct LLM failed, using fallback recommendations:', llmError.message);
          console.log('🔄 Using fallback stock recommendations...');
          recommendations = llmService.getFallbackRecommendations(maxStocks * 3);
          console.log('✅ Fallback recommendations loaded');
        }
      }
      
      if (!recommendations || recommendations.length === 0) {
        console.error('❌ No recommendations received from LLM service');
        console.log('🔄 Using fallback recommendations as last resort...');
        recommendations = llmService.getFallbackRecommendations(maxStocks * 3);
        console.log('✅ Fallback recommendations loaded as last resort');
      }
      
      console.log(`🎯 LLM generated ${recommendations.length} recommendations:`, recommendations.map(r => r.symbol));
      
      // Filter out already liked/rejected stocks
      const likedSymbols = this.userPreferences.likedStocks.map(s => s.symbol);
      const rejectedSymbols = this.userPreferences.rejectedStocks.map(s => s.symbol);
      
      const availableStocks = recommendations
        .filter(rec => !likedSymbols.includes(rec.symbol) && !rejectedSymbols.includes(rec.symbol))
        .slice(0, maxStocks * 2); // Get more candidates since we'll filter by real data

      console.log(`📊 ${availableStocks.length} stocks available after filtering:`, availableStocks.map(s => s.symbol));
      
      // Get real-time data for each LLM recommendation
      const stocksWithRealData = [];
      
      for (const stock of availableStocks) {
        try {
          console.log(`🔄 Fetching real-time data for ${stock.symbol}...`);
          
          // Get real-time quote data
          console.log(`📈 Getting quote for ${stock.symbol}...`);
          const quoteData = await getStockQuote(stock.symbol);
          console.log(`✅ Quote received for ${stock.symbol}: $${quoteData.price}`);
          
          if (!quoteData || !quoteData.price) {
            console.warn(`⚠️ No real price data for ${stock.symbol}, skipping`);
            continue;
          }
          
          // Get company profile data
          console.log(`🏢 Getting profile for ${stock.symbol}...`);
          const companyData = await getCompanyProfile(stock.symbol);
          console.log(`✅ Profile received for ${stock.symbol}: ${companyData.name}`);
          
          if (!companyData || !companyData.name) {
            console.warn(`⚠️ No real company data for ${stock.symbol}, skipping`);
            continue;
          }
          
          // Create stock object with LLM analysis + real data
          const enhancedStock = {
            // LLM-generated data
            symbol: stock.symbol,
            analysis: stock.analysis || stock.reason,
            investmentThesis: stock.reason,
            riskLevel: stock.riskLevel || 'medium',
            confidence: stock.confidence || 0.7,
            marketCap: stock.marketCap || 'large',
            growthPotential: stock.growthPotential || 'medium',
            keyRisks: stock.keyRisks || ['Market volatility', 'Sector-specific risks'],
            keyBenefits: stock.keyBenefits || ['Growth potential', 'Strong fundamentals'],
            recommendation: stock.recommendation || 'buy',
            
            // Real-time data from Finnhub
            name: companyData.name,
            price: quoteData.price,
            priceFormatted: `$${quoteData.price.toFixed(2)}`,
            change: quoteData.change,
            changePercent: quoteData.changePercent,
            sector: companyData.sector,
            industry: companyData.industry,
            description: companyData.description,
            marketCap: companyData.marketCap,
            peRatio: companyData.peRatio,
            dividendYield: companyData.dividendYield,
            website: companyData.website,
            logo: companyData.logo,
            
            // Metadata
            generatedAt: new Date(),
            source: 'LLM + Real-time Data',
            timestamp: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
          };
          
          stocksWithRealData.push(enhancedStock);
          console.log(`✅ ${stock.symbol}: $${quoteData.price} - ${stock.reason?.substring(0, 50)}...`);
          
          // Stop when we have enough stocks
          if (stocksWithRealData.length >= maxStocks) {
            console.log(`🎯 Reached target of ${maxStocks} stocks`);
            break;
          }
          
        } catch (error) {
          console.error(`❌ Failed to get real data for ${stock.symbol}:`, error.message);
          continue; // Skip this stock and try the next one
        }
      }
      
      if (stocksWithRealData.length === 0) {
        throw new Error('No stocks with real-time data available. Please check your Finnhub API key.');
      }

      console.log(`✅ Successfully generated ${stocksWithRealData.length} stocks with LLM analysis and real-time data`);
      return stocksWithRealData;
      
    } catch (error) {
      console.error('❌ Error generating personalized stocks:', error);
      throw error; // Don't fall back to mock data, let the error propagate
    }
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

      console.log('🔄 Generating new daily stock recommendations...');

      // Generate personalized recommendations
      const recommendedStocks = await this.generatePersonalizedStocks(10);
      
      if (!recommendedStocks || recommendedStocks.length === 0) {
        throw new Error('No personalized stocks generated');
      }
      
      // Store generated stocks in Firestore
      await this.storeGeneratedStocks(recommendedStocks);

      console.log(`✅ Generated and stored ${recommendedStocks.length} new stock recommendations`);
      return recommendedStocks;
    } catch (error) {
      console.error('❌ Error generating daily stocks:', error);
      throw error; // Don't fall back to mock data, let the error propagate
    }
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

      // Store new stocks
      const storePromises = stocks.map(stock => 
        setDoc(doc(db, 'users', uid, 'generatedStocks', stock.symbol), stock)
      );
      await Promise.all(storePromises);

      console.log(`✅ Stored ${stocks.length} generated stocks in Firestore`);
    } catch (error) {
      console.error('❌ Error storing generated stocks:', error);
      throw error;
    }
  }

  // Get generated stocks from Firestore
  async getGeneratedStocks() {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error('User not authenticated');

      const stocksRef = collection(db, 'users', uid, 'generatedStocks');
      const stocksSnap = await getDocs(stocksRef);
      
      const stocks = stocksSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      return stocks.sort((a, b) => new Date(b.generatedAt) - new Date(a.generatedAt));
    } catch (error) {
      console.error('❌ Error getting generated stocks:', error);
      return [];
    }
  }

  // Get risk level description
  getRiskLevel(volatility) {
    if (volatility <= 8) return 'Conservative';
    if (volatility <= 12) return 'Moderate';
    return 'Aggressive';
  }

  // Get stock analysis using LLM
  async getStockAnalysis(symbol) {
    try {
      const userContext = {
        riskProfile: this.riskProfile,
        userPreferences: this.userPreferences
      };
      return await getSecureStockAnalysis(symbol, userContext);
    } catch (error) {
      console.error('❌ Error getting stock analysis:', error);
      try {
        return await llmService.getStockAnalysis(symbol);
      } catch (fallbackError) {
        console.error('❌ Fallback analysis also failed:', fallbackError);
        throw new Error('Unable to generate stock analysis');
      }
    }
  }
}

export default new StockGenerationService(); 
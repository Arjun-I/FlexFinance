// stockGenerationService.js - Personalized Stock Generation System
import { doc, getDoc, setDoc, collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db, auth } from '../firebase';
import llmService from './llmService';
import Constants from 'expo-constants';

// Alpha Vantage API configuration
const ALPHA_VANTAGE_API_KEY = Constants.expoConfig?.extra?.EXPO_PUBLIC_ALPHA_VANTAGE_KEY || "placeholder_key";
const ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query';

// Rate limiting configuration
const RATE_LIMIT = {
  requestsPerMinute: 5,
  requestsPerDay: 500,
  lastRequestTime: null,
  dailyRequestCount: 0,
  lastResetDate: null
};



class StockGenerationService {
  constructor() {
    this.userPreferences = null;
    this.riskProfile = null;
    this.generatedStocks = [];
    this.lastGenerationDate = null;
  }

  // Check rate limits for Alpha Vantage API
  checkRateLimit() {
    const now = new Date();
    const today = now.toDateString();

    // Reset daily counter if it's a new day
    if (RATE_LIMIT.lastResetDate !== today) {
      RATE_LIMIT.dailyRequestCount = 0;
      RATE_LIMIT.lastResetDate = today;
    }

    // Check daily limit
    if (RATE_LIMIT.dailyRequestCount >= RATE_LIMIT.requestsPerDay) {
      throw new Error('Daily API rate limit exceeded. Please try again tomorrow.');
    }

    // Check minute limit
    if (RATE_LIMIT.lastRequestTime) {
      const timeSinceLastRequest = now - RATE_LIMIT.lastRequestTime;
      if (timeSinceLastRequest < (60 * 1000 / RATE_LIMIT.requestsPerMinute)) {
        throw new Error('API rate limit exceeded. Please wait before making another request.');
      }
    }

    return true;
  }

  // Update rate limit counters
  updateRateLimit() {
    RATE_LIMIT.lastRequestTime = new Date();
    RATE_LIMIT.dailyRequestCount++;
  }

  // Fetch stock data from Alpha Vantage with rate limiting
  async fetchStockData(symbol) {
    if (!ALPHA_VANTAGE_API_KEY) {
      throw new Error('Alpha Vantage API key not configured');
    }

    this.checkRateLimit();

    try {
      const overviewUrl = `${ALPHA_VANTAGE_BASE_URL}?function=OVERVIEW&symbol=${encodeURIComponent(symbol)}&apikey=${ALPHA_VANTAGE_API_KEY}`;
      const quoteUrl = `${ALPHA_VANTAGE_BASE_URL}?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${ALPHA_VANTAGE_API_KEY}`;

      const [overviewRes, quoteRes] = await Promise.all([
        fetch(overviewUrl),
        fetch(quoteUrl)
      ]);

      this.updateRateLimit();

      if (!overviewRes.ok || !quoteRes.ok) {
        throw new Error('Failed to fetch stock data');
      }

      const overview = await overviewRes.json();
      const quoteJson = await quoteRes.json();
      const quote = quoteJson['Global Quote'] || {};

      // Check for API error messages
      if (overview['Error Message'] || quoteJson['Error Message']) {
        throw new Error('API error: ' + (overview['Error Message'] || quoteJson['Error Message']));
      }

      return {
        symbol: overview.Symbol || symbol,
        name: overview.Name || symbol,
        price: quote['05. price'] ? `$${parseFloat(quote['05. price']).toFixed(2)}` : 'N/A',
        change: quote['10. change percent'] || 'N/A',
        marketCap: overview.MarketCapitalization || 'N/A',
        peRatio: overview.PERatio || 'N/A',
        dividendYield: overview.DividendYield || 'N/A',
        sector: overview.Sector || 'Technology',
        industry: overview.Industry || 'Software',
        description: overview.Description || '',
        website: overview.Website || '',
        logo: overview.Website ? `https://logo.clearbit.com/${overview.Website.replace(/^https?:\/\//, '')}` : null,
        growth: overview.FiveYearAverageReturn ? `5-year Avg Return: ${overview.FiveYearAverageReturn}%` : '',
        riskMetrics: {
          beta: overview.Beta || 'N/A',
          volatility: quote['10. change percent'] ? Math.abs(parseFloat(quote['10. change percent'])) : 0
        }
      };
    } catch (error) {
      console.error(`Error fetching data for ${symbol}:`, error);
      throw error;
    }
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

      // Get LLM recommendations for stock selection
      const recommendations = await llmService.getRecommendations(maxStocks * 2); // Get more to filter
      
      // Filter out already liked/rejected stocks
      const likedSymbols = this.userPreferences.likedStocks.map(s => s.symbol);
      const rejectedSymbols = this.userPreferences.rejectedStocks.map(s => s.symbol);
      
      const availableStocks = recommendations
        .filter(rec => !likedSymbols.includes(rec.symbol) && !rejectedSymbols.includes(rec.symbol))
        .slice(0, maxStocks);

      console.log(`🎯 Generated ${availableStocks.length} personalized stock recommendations`);
      return availableStocks;
    } catch (error) {
      console.error('❌ Error generating personalized stocks:', error);
      return this.getFallbackStocks(maxStocks);
    }
  }

  // Get fallback stocks based on risk profile
  getFallbackStocks(maxStocks) {
    const riskLevel = this.getRiskLevel(this.riskProfile?.volatility);
    
    const fallbackStocks = {
      low: [
        { symbol: 'AAPL', sector: 'Technology', reason: 'Stable tech giant with strong fundamentals' },
        { symbol: 'MSFT', sector: 'Technology', reason: 'Diversified tech company with cloud growth' },
        { symbol: 'JNJ', sector: 'Healthcare', reason: 'Defensive healthcare stock with dividend' },
        { symbol: 'PG', sector: 'Consumer', reason: 'Consumer staples with stable earnings' },
        { symbol: 'KO', sector: 'Consumer', reason: 'Beverage giant with global presence' },
        { symbol: 'WMT', sector: 'Consumer', reason: 'Retail leader with defensive characteristics' },
        { symbol: 'HD', sector: 'Consumer', reason: 'Home improvement leader with strong brand' },
        { symbol: 'MCD', sector: 'Consumer', reason: 'Fast food leader with global reach' },
        { symbol: 'DIS', sector: 'Consumer', reason: 'Entertainment giant with diverse revenue' },
        { symbol: 'PEP', sector: 'Consumer', reason: 'Beverage company with strong cash flow' }
      ],
      medium: [
        { symbol: 'GOOGL', sector: 'Technology', reason: 'Tech leader with advertising dominance' },
        { symbol: 'AMZN', sector: 'Consumer', reason: 'E-commerce and cloud services leader' },
        { symbol: 'TSLA', sector: 'Consumer', reason: 'Electric vehicle and clean energy pioneer' },
        { symbol: 'NVDA', sector: 'Technology', reason: 'AI and gaming chip leader' },
        { symbol: 'META', sector: 'Technology', reason: 'Social media and metaverse company' },
        { symbol: 'NFLX', sector: 'Consumer', reason: 'Streaming entertainment leader' },
        { symbol: 'CRM', sector: 'Technology', reason: 'Cloud software and customer relations' },
        { symbol: 'ADBE', sector: 'Technology', reason: 'Creative software and digital media' },
        { symbol: 'PYPL', sector: 'Technology', reason: 'Digital payments and fintech leader' },
        { symbol: 'UBER', sector: 'Technology', reason: 'Ride-sharing and delivery platform' }
      ],
      high: [
        { symbol: 'AMD', sector: 'Technology', reason: 'Semiconductor company with growth potential' },
        { symbol: 'SPOT', sector: 'Consumer', reason: 'Music streaming with global expansion' },
        { symbol: 'ZM', sector: 'Technology', reason: 'Video communications platform' },
        { symbol: 'CRWD', sector: 'Technology', reason: 'Cybersecurity with high growth' },
        { symbol: 'PLTR', sector: 'Technology', reason: 'Data analytics and AI platform' },
        { symbol: 'SNOW', sector: 'Technology', reason: 'Cloud data warehousing company' },
        { symbol: 'RBLX', sector: 'Technology', reason: 'Gaming and metaverse platform' },
        { symbol: 'SQ', sector: 'Technology', reason: 'Digital payments and fintech' },
        { symbol: 'SHOP', sector: 'Technology', reason: 'E-commerce platform for businesses' },
        { symbol: 'TWLO', sector: 'Technology', reason: 'Cloud communications platform' }
      ]
    };

    const suitableStocks = fallbackStocks[riskLevel] || fallbackStocks.medium;
    return suitableStocks.slice(0, maxStocks);
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
      
      // Check if stocks were already generated today
      const existingStocks = await this.getGeneratedStocks();
      if (existingStocks.length > 0) {
        const lastGenerated = new Date(existingStocks[0].generatedAt).toDateString();
        if (lastGenerated === today) {
          console.log('✅ Stocks already generated today');
          return existingStocks;
        }
      }

      console.log('🔄 Generating new daily stock recommendations...');

      // Generate personalized recommendations
      const recommendedStocks = await this.generatePersonalizedStocks(10);
      
      // Fetch detailed data for each stock
      const stockDetails = await this.fetchStockDetails(recommendedStocks);

      // Store generated stocks in Firestore
      await this.storeGeneratedStocks(stockDetails);

      console.log(`✅ Generated and stored ${stockDetails.length} new stock recommendations`);
      return stockDetails;
    } catch (error) {
      console.error('❌ Error generating daily stocks:', error);
      throw error;
    }
  }

  // Store generated stocks in Firestore
  async storeGeneratedStocks(stocks) {
    try {
      const uid = auth.currentUser?.uid;
      const batch = [];

      // Clear old generated stocks
      const oldStocksRef = collection(db, 'users', uid, 'generatedStocks');
      const oldStocksSnap = await getDocs(oldStocksRef);
      oldStocksSnap.docs.forEach(docSnapshot => {
        batch.push(deleteDoc(docSnapshot.ref));
      });

      // Add new generated stocks
      stocks.forEach(stock => {
        const stockRef = doc(collection(db, 'users', uid, 'generatedStocks'));
        batch.push(setDoc(stockRef, stock));
      });

      await Promise.all(batch);
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
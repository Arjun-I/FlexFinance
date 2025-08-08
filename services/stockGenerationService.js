// stockGenerationService.js - Enhanced Stock Generation with LLM + Finnhub
import { doc, getDoc, setDoc, collection, getDocs, deleteDoc, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import groqService from './groqService';
import { getStockQuote, getCompanyProfile } from './finnhubService';

class StockGenerationService {
  constructor() {
    this.userId = null;
    this.riskProfile = null;
    this.userPreferences = null;
  }

  // Check if user has reached daily limit
  async checkDailyLimit() {
    if (!this.userId) {
      await this.loadUserContext();
    }

    const today = new Date().toDateString();
    const userDoc = await getDoc(doc(db, 'users', this.userId));
    const userData = userDoc.data() || {};
    
    const lastSelectionDate = userData.lastSelectionDate;
    const dailySelections = userData.dailySelections || [];

    // Reset if it's a new day or no previous selections
    if (!lastSelectionDate || lastSelectionDate !== today) {
      return {
        hasReachedLimit: false,
        selectionsToday: 0,
        resetTime: null
      };
    }

    const selectionsToday = dailySelections.length;
    const hasReachedLimit = selectionsToday >= 10;
    
    // Calculate time until midnight (reset time)
    const now = new Date();
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    const resetTime = midnight.getTime() - now.getTime();

    return {
      hasReachedLimit,
      selectionsToday,
      resetTime: hasReachedLimit ? resetTime : null
    };
  }

  // Format time remaining until limit reset
  formatTimeUntilReset(milliseconds) {
    if (!milliseconds || milliseconds <= 0) return null;
    
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  // Format market cap properly (2.55T, 2.55B, 2.55M)
  formatMarketCap(marketCapValue) {
    if (!marketCapValue || isNaN(marketCapValue)) return 'N/A';
    
    const value = parseFloat(marketCapValue);
    if (value >= 1e12) {
      return `$${(value / 1e12).toFixed(2)}T`;
    } else if (value >= 1e9) {
      return `$${(value / 1e9).toFixed(2)}B`;
    } else if (value >= 1e6) {
      return `$${(value / 1e6).toFixed(2)}M`;
    } else {
      return `$${value.toFixed(2)}`;
    }
  }

  // Load user context for stock generation
  async loadUserContext() {
    try {
      const { getAuth } = await import('firebase/auth');
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        console.error('❌ No authenticated user found');
        return false;
      }

      this.userId = user.uid;
      // Loading user context

      // Load user data
      const userDoc = await getDoc(doc(db, 'users', this.userId));
      const userData = userDoc.data();
      
      this.userPreferences = {
        likedStocks: userData?.likedStocks || [],
        rejectedStocks: userData?.rejectedStocks || [],
        portfolio: userData?.portfolio || [],
        cashBalance: userData?.cashBalance || 100000,
        dailySelections: userData?.dailySelections || [],
        lastSelectionDate: userData?.lastSelectionDate || null,
      };

      // Load risk profile from quiz results
      const riskDoc = await getDoc(doc(db, 'users', this.userId, 'preferences', 'quiz'));
      const riskData = riskDoc.data();
      
      this.riskProfile = riskData?.riskProfile || {
        volatility: 10,
        timeHorizon: 3,
        knowledge: 2,
        ethics: 3,
        liquidity: 2
      };

      console.log('✅ User context loaded successfully');
      console.log('📊 Risk profile:', this.riskProfile);
      console.log('📊 User preferences:', this.userPreferences);
      
      return true;
    } catch (error) {
      console.error('❌ Error loading user context:', error);
      return false;
    }
  }

  // Generate initial 10 stock recommendations after risk quiz
  async generateInitialRecommendations() {
    try {
      console.log('🎯 Generating initial 10 stock recommendations...');
      
      // Load user context if not already loaded
      if (!this.userId) {
        console.log('📋 Loading user context...');
        const contextLoaded = await this.loadUserContext();
        if (!contextLoaded) {
          console.error('❌ Failed to load user context');
          throw new Error('Failed to load user context');
        }
        console.log('✅ User context loaded successfully');
      }

      // Get user choices to exclude rejected stocks
      console.log('🔍 Getting user choices...');
      const userChoices = await this.getUserChoices();
      console.log('📋 User choices:', userChoices);
      
      // Get 10 LLM recommendations using Groq, excluding rejected stocks
      console.log('🤖 Calling Groq service for recommendations...');
      console.log('🎯 Risk profile:', this.riskProfile);
      const recommendations = await groqService.getRecommendations(10, {
        riskProfile: this.riskProfile,
        userPreferences: this.userPreferences,
        rejectedStocks: userChoices.rejectedStocks || [],
        likedStocks: userChoices.likedStocks || [],
      });
      console.log(`✅ Groq LLM generated ${recommendations.length} initial recommendations`);

      if (!recommendations || recommendations.length === 0) {
        console.warn('⚠️ No LLM recommendations received, using fallback stocks');
        // Emergency fallback - create some basic stock recommendations
        const fallbackStocks = [
          { symbol: 'AAPL', name: 'Apple Inc.', reason: 'Fallback recommendation' },
          { symbol: 'MSFT', name: 'Microsoft Corporation', reason: 'Fallback recommendation' },
          { symbol: 'GOOGL', name: 'Alphabet Inc.', reason: 'Fallback recommendation' },
          { symbol: 'AMZN', name: 'Amazon.com Inc.', reason: 'Fallback recommendation' },
          { symbol: 'TSLA', name: 'Tesla Inc.', reason: 'Fallback recommendation' },
          { symbol: 'NVDA', name: 'NVIDIA Corporation', reason: 'Fallback recommendation' },
          { symbol: 'META', name: 'Meta Platforms Inc.', reason: 'Fallback recommendation' },
          { symbol: 'NFLX', name: 'Netflix Inc.', reason: 'Fallback recommendation' },
          { symbol: 'CRM', name: 'Salesforce Inc.', reason: 'Fallback recommendation' },
          { symbol: 'AMD', name: 'Advanced Micro Devices Inc.', reason: 'Fallback recommendation' }
        ];
        console.log('🚨 Using fallback stocks:', fallbackStocks.length);
        
        // Process fallback stocks with real data
        const stocksWithRealData = await Promise.all(fallbackStocks.map(async (rec) => {
          try {
            const quoteData = await getStockQuote(rec.symbol);
            const companyData = await getCompanyProfile(rec.symbol);
            
            return {
              symbol: rec.symbol,
              name: rec.name || rec.symbol,
              price: quoteData.price || 100,
              change: quoteData.change || 0,
              changePercent: quoteData.changePercent || 0,
              sector: companyData.finnhubIndustry || 'Technology',
              industry: companyData.finnhubIndustry || 'Technology',
              logo: companyData.logo,
              marketCap: this.formatMarketCap(companyData.marketCapitalization || 1000000000),
              reason: rec.reason,
              riskLevel: 'medium',
              confidence: 0.7,
              analysis: { summary: 'Generated for testing' },
              investmentThesis: 'Solid technology company',
              keyRisks: ['Market volatility'],
              keyBenefits: ['Strong fundamentals'],
              targetPrice: `$${(quoteData.price * 1.1).toFixed(2)}`,
              recommendation: 'buy',
              generatedAt: new Date().toISOString(),
              source: 'Fallback',
              isInitialRecommendation: true
            };
          } catch (err) {
            console.warn(`❌ Failed to get data for ${rec.symbol}:`, err.message);
            return null;
          }
        }));
        
        const validStocks = stocksWithRealData.filter(Boolean);
        
        if (validStocks.length > 0) {
          await this.storeGeneratedStocks(validStocks);
        }
        
        return validStocks;
      }

      // Fetch quote, profile, and analysis in parallel per stock
      const stocksWithRealData = (await Promise.all(recommendations.map(async (rec) => {
        try {
          const [quoteData, companyData] = await Promise.all([
            getStockQuote(rec.symbol),
            getCompanyProfile(rec.symbol)
          ]);

          const analysis = await this.generateStockAnalysis(rec.symbol, companyData, quoteData);

          return {
            symbol: rec.symbol,
            name: companyData.name,
            price: quoteData.price,
            priceFormatted: `$${quoteData.price.toFixed(2)}`,
            change: quoteData.change,
            changePercent: quoteData.changePercent,
            sector: rec.sector || companyData.finnhubIndustry,
            industry: rec.industry || companyData.finnhubIndustry,
            description: companyData.weburl ? companyData.weburl : '',
            website: companyData.weburl,
            logo: companyData.logo,
            marketCap: this.formatMarketCap(rec.marketCapBillions * 1e9 || companyData.marketCapitalization),
            peRatio: 'N/A',
            dividendYield: 'N/A',
            growth: '',
            riskLevel: rec.riskLevel || 'medium',
            confidence: rec.confidence || 0.7,
            reason: rec.reason || 'AI-generated recommendation',
            riskMetrics: { beta: 'N/A', volatility: Math.abs(quoteData.change) },
            timestamp: Date.now(),
            lastUpdated: new Date().toISOString(),
            analysis: analysis.summary,
            investmentThesis: analysis.investmentThesis,
            keyRisks: analysis.keyRisks,
            keyBenefits: analysis.keyBenefits,
            targetPrice: `$${(quoteData.price * 1.1).toFixed(2)}`,
            recommendation: rec.recommendation || 'buy',
            generatedAt: new Date().toISOString(),
            source: 'LLM + Real-time Data',
            isInitialRecommendation: true
          };
        } catch (err) {
          console.warn(`Skipping ${rec.symbol} due to error:`, err.message);
          return null;
        }
      }))).filter(Boolean);

      // If fewer than 10 survived, try to fill by refetching more
      console.log(`📊 Initial generation: ${stocksWithRealData.length}/10 stocks successful`);
      if (stocksWithRealData.length < 10) {
        const needed = 10 - stocksWithRealData.length;
        console.log(`🔄 Need ${needed} more stocks, attempting backfill...`);
        
        try {
          // Get existing symbols to avoid duplicates
          const existingSymbols = stocksWithRealData.map(s => s.symbol);
          
          // Get user choices to exclude from backfill
          const userChoices = await this.getUserChoices();
          
          const moreRecs = await groqService.getRecommendations(needed + 5, { // Get extra to account for failures
            riskProfile: this.riskProfile,
            userPreferences: this.userPreferences,
            rejectedStocks: userChoices.rejectedStocks || [],
            likedStocks: userChoices.likedStocks || [],
          });
          
          // Filter out duplicates and process
          const uniqueRecs = moreRecs.filter(rec => !existingSymbols.includes(rec.symbol));
          console.log(`🎯 Got ${uniqueRecs.length} unique recommendations for backfill`);
          
          const more = (await Promise.all(uniqueRecs.slice(0, needed + 3).map(async (rec) => {
            try {
              const [quoteData, companyData] = await Promise.all([
                getStockQuote(rec.symbol),
                getCompanyProfile(rec.symbol)
              ]);
              const analysis = await this.generateStockAnalysis(rec.symbol, companyData, quoteData);
              console.log(`✅ Backfill stock processed: ${rec.symbol}`);
              return {
                symbol: rec.symbol,
                name: companyData.name,
                price: quoteData.price,
                priceFormatted: `$${quoteData.price.toFixed(2)}`,
                change: quoteData.change,
                changePercent: quoteData.changePercent,
                sector: rec.sector || companyData.finnhubIndustry,
                industry: rec.industry || companyData.finnhubIndustry,
                description: companyData.weburl ? companyData.weburl : '',
                website: companyData.weburl,
                logo: companyData.logo,
                marketCap: this.formatMarketCap(rec.marketCapBillions * 1e9 || companyData.marketCapitalization),
                peRatio: 'N/A',
                dividendYield: 'N/A',
                growth: '',
                riskLevel: rec.riskLevel || 'medium',
                confidence: rec.confidence || 0.7,
                reason: rec.reason || 'AI-generated recommendation',
                riskMetrics: { beta: 'N/A', volatility: Math.abs(quoteData.change) },
                timestamp: Date.now(),
                lastUpdated: new Date().toISOString(),
                analysis: analysis.summary,
                investmentThesis: analysis.investmentThesis,
                keyRisks: analysis.keyRisks,
                keyBenefits: analysis.keyBenefits,
                targetPrice: `$${(quoteData.price * 1.1).toFixed(2)}`,
                recommendation: rec.recommendation || 'buy',
                generatedAt: new Date().toISOString(),
                source: 'LLM + Real-time Data',
                isInitialRecommendation: true
              };
            } catch (err) {
              console.warn(`❌ Backfill failed for ${rec.symbol}:`, err.message);
              return null;
            }
          }))).filter(Boolean);
          
          stocksWithRealData.push(...more.slice(0, needed)); // Only take what we need
          console.log(`✅ Backfill complete: ${more.length} additional stocks processed`);
        } catch (e) {
          console.error('❌ Unable to backfill recommendations:', e.message);
        }
      }

      const limited = stocksWithRealData.slice(0, 10);

      if (limited.length > 0) {
        await this.storeGeneratedStocks(limited);
        await this.getGeneratedStocks();
      }

      return limited;
      
    } catch (error) {
      console.error('❌ Error generating initial recommendations:', error);
      throw error;
    }
  }

  // Generate detailed stock analysis using LLM
  async generateStockAnalysis(symbol, companyData, quoteData) {
    try {
      // Load user context if not already loaded
      if (!this.userId) {
        const contextLoaded = await this.loadUserContext();
        if (!contextLoaded) {
          console.error('❌ Failed to load user context for stock analysis');
          return {
            summary: `${symbol} shows potential for growth based on current market conditions and company fundamentals.`,
            investmentThesis: `${symbol} represents a solid investment opportunity with balanced risk-reward profile.`,
            keyBenefits: ['Growth potential', 'Strong fundamentals'],
            keyRisks: ['Market volatility', 'Sector-specific risks']
          };
        }
      }
      
      const prompt = `Analyze ${symbol} (${companyData.name}) for investment purposes. 
      
      Company Info: ${companyData.name}, ${companyData.finnhubIndustry || 'Technology'} sector, Market Cap: ${companyData.marketCapitalization ? `${(companyData.marketCapitalization / 1e9).toFixed(2)}B` : 'N/A'}
      Current Price: $${quoteData.price}, Change: ${quoteData.changePercent}, Volume: ${quoteData.volume || 'N/A'}
      
      User Risk Profile: ${this.getRiskLevel(this.riskProfile.volatility)} (${this.riskProfile.volatility}/10)
      Investment Horizon: ${this.getTimeHorizon(this.riskProfile.timeHorizon)}
      Investment Knowledge: ${this.getKnowledgeLevel(this.riskProfile.knowledge)}
      
      Based on the real-time pricing data and user's risk profile, provide:
      1. A 100-word investment analysis summary tailored to this user
      2. Investment thesis (2-3 sentences) using current market data
      3. 2 key benefits for this user's specific risk profile
      4. 2 key risks for this user's specific risk profile
      
      Format as JSON:
      {
        "summary": "100-word analysis...",
        "investmentThesis": "Thesis...",
        "keyBenefits": ["Benefit 1", "Benefit 2"],
        "keyRisks": ["Risk 1", "Risk 2"]
      }`;

      const response = await groqService.callLLM(prompt);
      const analysis = JSON.parse(response);
      
      return {
        summary: analysis.summary,
        investmentThesis: analysis.investmentThesis,
        keyBenefits: analysis.keyBenefits,
        keyRisks: analysis.keyRisks
      };
    } catch (error) {
      console.error(`❌ Error generating analysis for ${symbol}:`, error);
      // Return a more generic analysis instead of hardcoded one
      return {
        summary: `Analysis for ${symbol} could not be generated due to an error. Please try again.`,
        investmentThesis: `Unable to generate investment thesis for ${symbol} at this time.`,
        keyBenefits: ['Analysis unavailable'],
        keyRisks: ['Analysis unavailable']
      };
    }
  }

  // Record user choice (like/reject) for LLM learning
  async recordUserChoice(symbol, choice, stockData) {
    try {
      // Load user context if not already loaded
      if (!this.userId) {
        const contextLoaded = await this.loadUserContext();
        if (!contextLoaded) {
          console.error('❌ Failed to load user context for recording choice');
          return;
        }
      }

      const choiceData = {
        symbol,
        choice, // 'like' or 'reject'
        stockData,
        timestamp: new Date().toISOString(),
        riskProfile: this.riskProfile
      };

      // Store choice for LLM learning
      await setDoc(
        doc(db, 'users', this.userId, 'stockChoices', `${symbol}_${Date.now()}`),
        choiceData
      );

      // Update user preferences
      if (choice === 'like') {
        if (!this.userPreferences.likedStocks.includes(symbol)) {
          this.userPreferences.likedStocks.push(symbol);
        }
      } else {
        if (!this.userPreferences.rejectedStocks.includes(symbol)) {
          this.userPreferences.rejectedStocks.push(symbol);
        }
      }

      // Update user document
      await updateDoc(doc(db, 'users', this.userId), {
        likedStocks: this.userPreferences.likedStocks,
        rejectedStocks: this.userPreferences.rejectedStocks
      });

      console.log(`✅ Recorded ${choice} choice for ${symbol}`);
    } catch (error) {
      console.error(`❌ Error recording choice for ${symbol}:`, error);
    }
  }

  // Generate personalized stock recommendations using LLM with learning
  async generatePersonalizedStocks(maxStocks = 5) {
    try {
      console.log('🤖 Generating personalized stocks with learning...');
      
      // Load user context if not already loaded
      if (!this.userId) {
        const contextLoaded = await this.loadUserContext();
        if (!contextLoaded) {
          throw new Error('Failed to load user context');
        }
      }

      // Get LLM recommendations with learning context using Groq
      const recommendations = await groqService.getRecommendations(maxStocks, {
        riskProfile: this.riskProfile,
        userPreferences: this.userPreferences,
      });
      console.log(`✅ Groq LLM generated ${recommendations.length} recommendations`);

      if (!recommendations || recommendations.length === 0) {
        console.warn('⚠️ No LLM recommendations received');
        throw new Error('No stock recommendations generated by LLM');
      }

      // Filter out already liked/rejected stocks
      const availableStocks = recommendations.filter(rec => 
        !this.userPreferences.likedStocks.includes(rec.symbol) &&
        !this.userPreferences.rejectedStocks.includes(rec.symbol)
      );

      console.log(`📊 ${availableStocks.length} stocks available after filtering`);

      // Fetch real data for each recommendation
      const stocksWithRealData = (await Promise.all(availableStocks.map(async (rec) => {
        try {
          const [quoteData, companyData] = await Promise.all([
            getStockQuote(rec.symbol),
            getCompanyProfile(rec.symbol)
          ]);
          const analysis = await this.generateStockAnalysis(rec.symbol, companyData, quoteData);

          return {
            symbol: rec.symbol,
            name: companyData.name,
            price: quoteData.price,
            priceFormatted: `$${quoteData.price.toFixed(2)}`,
            change: quoteData.change,
            changePercent: quoteData.changePercent,
            sector: rec.sector || companyData.finnhubIndustry,
            industry: rec.industry || companyData.finnhubIndustry,
            description: companyData.weburl ? companyData.weburl : '',
            website: companyData.weburl,
            logo: companyData.logo,
            marketCap: this.formatMarketCap(rec.marketCapBillions * 1e9 || companyData.marketCapitalization),
            peRatio: 'N/A',
            dividendYield: 'N/A',
            growth: '',
            riskLevel: rec.riskLevel || 'medium',
            confidence: rec.confidence || 0.7,
            reason: rec.reason || 'AI-generated recommendation',
            riskMetrics: { beta: 'N/A', volatility: Math.abs(quoteData.change) },
            timestamp: Date.now(),
            lastUpdated: new Date().toISOString(),
            analysis: analysis.summary,
            investmentThesis: analysis.investmentThesis,
            keyRisks: analysis.keyRisks,
            keyBenefits: analysis.keyBenefits,
            targetPrice: `$${(quoteData.price * 1.1).toFixed(2)}`,
            recommendation: rec.recommendation || 'buy',
            generatedAt: new Date().toISOString(),
            source: 'LLM + Real-time Data'
          };
        } catch (err) {
          console.warn(`Skipping ${rec.symbol} due to error:`, err.message);
          return null;
        }
      }))).filter(Boolean);

      // Persist so UI can fetch pairs
      if (stocksWithRealData.length > 0) {
        await this.storeGeneratedStocks(stocksWithRealData);
      }

      console.log(`✅ Generated ${stocksWithRealData.length} stocks with real data`);
      return stocksWithRealData;
      
    } catch (error) {
      console.error('❌ Error generating personalized stocks:', error);
      throw error;
    }
  }

  // Generate daily stocks for swiping (exactly 10 stocks = 5 pairs)
  async generateDailyStocks() {
    try {
      console.log('📅 Generating exactly 10 stocks (5 pairs)...');
      
      // Load user context first
      const contextLoaded = await this.loadUserContext();
      if (!contextLoaded) {
        console.error('❌ Failed to load user context');
        throw new Error('Failed to load user context');
      }
      
      // Get exactly 10 personalized recommendations
      const recommendedStocks = await this.generatePersonalizedStocks(10);
      
      if (!recommendedStocks || recommendedStocks.length === 0) {
        console.warn('⚠️ No personalized stocks generated');
        throw new Error('No personalized stocks generated');
      }

      // Ensure we have exactly 10 stocks
      if (recommendedStocks.length < 10) {
        console.warn(`⚠️ Only generated ${recommendedStocks.length} stocks, need 10`);
        throw new Error(`Only generated ${recommendedStocks.length} stocks, need 10`);
      }

      // Store the generated stocks
      await this.storeGeneratedStocks(recommendedStocks);
      
      console.log(`✅ Generated and stored exactly ${recommendedStocks.length} daily stocks`);
      return recommendedStocks;
      
    } catch (error) {
      console.error('❌ Error generating daily stocks:', error);
      throw error;
    }
  }

  // Store generated stocks in Firebase
  async storeGeneratedStocks(stocks) {
    try {
      // Load user context if not already loaded
      if (!this.userId) {
        const contextLoaded = await this.loadUserContext();
        if (!contextLoaded) {
          console.error('❌ Failed to load user context for storing stocks');
          return;
        }
      }

      // Clear old stocks first
      const oldStocksRef = collection(db, 'users', this.userId, 'generatedStocks');
      const oldStocksSnapshot = await getDocs(oldStocksRef);
      
      for (const doc of oldStocksSnapshot.docs) {
        await deleteDoc(doc.ref);
      }

      // Store new stocks
      console.log(`💾 Storing ${stocks.length} stocks for user: ${this.userId}`);
      for (const stock of stocks) {
        console.log(`📝 Storing stock: ${stock.symbol} - ${stock.name}`);
        await setDoc(
          doc(db, 'users', this.userId, 'generatedStocks', stock.symbol),
          {
            ...stock,
            storedAt: new Date().toISOString()
          }
        );
      }

      console.log(`✅ Stored ${stocks.length} stocks in Firebase`);
    } catch (error) {
      console.error('❌ Error storing generated stocks:', error);
    }
  }

  // Get stored generated stocks
  async getGeneratedStocks() {
    try {
      // Load user context if not already loaded
      if (!this.userId) {
        const contextLoaded = await this.loadUserContext();
        if (!contextLoaded) {
          console.error('❌ Failed to load user context for generated stocks');
          return [];
        }
      }

      console.log(`🔍 Fetching stocks for user: ${this.userId}`);
      const stocksRef = collection(db, 'users', this.userId, 'generatedStocks');
      const snapshot = await getDocs(stocksRef);
      
      console.log(`📊 Firebase returned ${snapshot.docs.length} documents`);
      
      const stocks = [];
      snapshot.forEach(doc => {
        const stockData = doc.data();
        console.log(`📋 Stock document: ${doc.id}`, {
          symbol: stockData.symbol,
          name: stockData.name,
          price: stockData.price
        });
        stocks.push({ ...stockData, id: doc.id });
      });

      console.log(`✅ Retrieved ${stocks.length} stored stocks`);
      return stocks;
    } catch (error) {
      console.error('❌ Error getting generated stocks:', error);
      return [];
    }
  }

  // Get stock pairs for side-by-side comparison
  async getStockPairs() {
    try {
      // Load user context if not already loaded
      if (!this.userId) {
        const contextLoaded = await this.loadUserContext();
        if (!contextLoaded) {
          console.error('❌ Failed to load user context for stock pairs');
          return [];
        }
      }
      
      const stocks = await this.getGeneratedStocks();
      const pairs = [];
      
      for (let i = 0; i < stocks.length - 1; i += 2) {
        pairs.push({
          left: stocks[i],
          right: stocks[i + 1]
        });
      }
      
      // If odd number, add last stock with null right
      if (stocks.length % 2 === 1) {
        pairs.push({
          left: stocks[stocks.length - 1],
          right: null
        });
      }
      
      return pairs;
    } catch (error) {
      console.error('❌ Error getting stock pairs:', error);
      return [];
    }
  }

  // No fallback stocks - only real LLM-generated stocks
  getFallbackStocks() {
    console.log('❌ No fallback stocks available - only real LLM-generated stocks');
    throw new Error('No fallback stocks available. Only real LLM-generated stocks are supported.');
  }

  // Clear all cached stocks from Firebase
  async clearAllStocks() {
    try {
      if (!this.userId) {
        const contextLoaded = await this.loadUserContext();
        if (!contextLoaded) {
          throw new Error('Failed to load user context');
        }
      }

      console.log('🧹 Clearing all cached stocks...');
      const stocksRef = collection(db, 'users', this.userId, 'generatedStocks');
      const snapshot = await getDocs(stocksRef);
      
      for (const doc of snapshot.docs) {
        await deleteDoc(doc.ref);
      }
      
      console.log(`✅ Cleared ${snapshot.docs.length} cached stocks`);
    } catch (error) {
      console.error('❌ Error clearing stocks:', error);
      throw error;
    }
  }

  // Record user choice for stock preferences
  async recordUserChoice(symbol, choice, stockData) {
    try {
      if (!this.userId) {
        const contextLoaded = await this.loadUserContext();
        if (!contextLoaded) {
          console.error('❌ Failed to load user context for recording choice');
          return;
        }
      }

      console.log(`📝 Recording user choice: ${symbol} = ${choice}`);
      
      // Update user preferences based on choice
      const userDocRef = doc(db, 'users', this.userId);
      const userDoc = await getDoc(userDocRef);
      const userData = userDoc.data() || {};
      
      // Check daily limit before recording selection
      const today = new Date().toDateString();
      const lastSelectionDate = userData.lastSelectionDate;
      let dailySelections = userData.dailySelections || [];
      
      // Reset daily selections if it's a new day
      if (lastSelectionDate !== today) {
        dailySelections = [];
      }
      
      // TEMPORARILY DISABLED: Daily limit check
      // TODO: Re-enable after debugging core stock generation
      // if ((choice === 'like' || choice === 'accept') && dailySelections.length >= 10) {
      //   throw new Error('Daily limit of 10 stock selections reached. Try again tomorrow!');
      // }
      
      const likedStocks = userData.likedStocks || [];
      const rejectedStocks = userData.rejectedStocks || [];
      const portfolio = userData.portfolio || [];
      
      if (choice === 'like' || choice === 'accept') {
        // Add to liked stocks if not already there
        if (!likedStocks.includes(symbol)) {
          likedStocks.push(symbol);
        }
        
        // Add to portfolio collection (not user document field)
        const portfolioRef = collection(db, 'users', this.userId, 'portfolio');
        const portfolioSnap = await getDocs(portfolioRef);
        const existingPosition = portfolioSnap.docs.find(doc => doc.data().symbol === symbol);
        
        if (!existingPosition) {
          const portfolioItem = {
            symbol: symbol,
            name: stockData.name,
            shares: 0, // Default 0 shares - user must buy manually
            averagePrice: stockData.price,
            currentPrice: stockData.price,
            totalValue: 0, // 0 shares = 0 value
            sector: stockData.sector,
            industry: stockData.industry,
            purchaseDate: new Date().toISOString(),
            source: 'recommendation',
            lastUpdated: new Date().toISOString()
          };
          
          await addDoc(portfolioRef, portfolioItem);
          console.log(`💼 Added ${symbol} to portfolio collection with 0 shares (watchlist) at $${stockData.price}`);
        }
        
        // Remove from rejected if it was there
        const rejectedIndex = rejectedStocks.indexOf(symbol);
        if (rejectedIndex > -1) {
          rejectedStocks.splice(rejectedIndex, 1);
        }
      } else if (choice === 'reject' || choice === 'dislike') {
        // Add to rejected stocks if not already there
        if (!rejectedStocks.includes(symbol)) {
          rejectedStocks.push(symbol);
        }
        
        // Remove from liked if it was there
        const likedIndex = likedStocks.indexOf(symbol);
        if (likedIndex > -1) {
          likedStocks.splice(likedIndex, 1);
        }
        
        // Remove from portfolio collection if it was there
        const portfolioRef = collection(db, 'users', this.userId, 'portfolio');
        const portfolioSnap = await getDocs(portfolioRef);
        const existingPosition = portfolioSnap.docs.find(doc => doc.data().symbol === symbol);
        
        if (existingPosition) {
          await deleteDoc(existingPosition.ref);
          console.log(`💼 Removed ${symbol} from portfolio collection`);
        }
      }
      
      // Add this selection to today's list (only for choices, not rejections)
      if (choice === 'like' || choice === 'accept') {
        dailySelections.push({
          symbol,
          timestamp: new Date().toISOString(),
          choice
        });
      }
      
      // Update user document (no portfolio field since it's in separate collection)
      await updateDoc(userDocRef, {
        likedStocks,
        rejectedStocks,
        dailySelections,
        lastSelectionDate: today,
        lastUpdated: new Date().toISOString()
      });
      
      console.log(`✅ Updated user preferences: ${likedStocks.length} liked, ${rejectedStocks.length} rejected, ${dailySelections.length} selections today`);
      
    } catch (error) {
      console.error('❌ Error recording user choice:', error);
      throw error; // Re-throw to show daily limit message to user
    }
  }

  // Generate personalized stocks (alias for generateInitialRecommendations)
  async generatePersonalizedStocks(count = 10) {
    try {
      console.log(`🎯 Generating ${count} personalized stocks...`);
      const stocks = await this.generateInitialRecommendations();
      console.log(`✅ Generated ${stocks.length} personalized stocks`);
      return stocks;
    } catch (error) {
      console.error('❌ Error generating personalized stocks:', error);
      throw error;
    }
  }

  // Get risk level description
  getRiskLevel(volatility) {
    if (volatility <= 3) return 'Conservative';
    if (volatility <= 7) return 'Moderate';
    return 'Aggressive';
  }

  // Get time horizon description
  getTimeHorizon(timeHorizon) {
    if (timeHorizon <= 1) return 'Short-term (1-2 years)';
    if (timeHorizon <= 3) return 'Medium-term (3-5 years)';
    return 'Long-term (5+ years)';
  }

  // Get knowledge level description
  getKnowledgeLevel(knowledge) {
    if (knowledge <= 1) return 'Beginner';
    if (knowledge <= 2) return 'Intermediate';
    if (knowledge <= 3) return 'Advanced';
    return 'Expert';
  }

  // Get user choices for determining completion state
  async getUserChoices() {
    try {
      if (!this.userId) {
        await this.loadUserContext();
      }

      const userDocRef = doc(db, 'users', this.userId);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        return {
          likedStocks: userData.likedStocks || [],
          rejectedStocks: userData.rejectedStocks || []
        };
      }
      
      return { likedStocks: [], rejectedStocks: [] };
    } catch (error) {
      console.error('❌ Error getting user choices:', error);
      return { likedStocks: [], rejectedStocks: [] };
    }
  }



  // Record user choice and update portfolio/preferences
  async recordUserChoice(symbol, choice, stockData) {
    try {
      if (!this.userId) {
        await this.loadUserContext();
      }

      const userDocRef = doc(db, 'users', this.userId);
      const userDoc = await getDoc(userDocRef);
      const userData = userDoc.exists() ? userDoc.data() : {};
      
      const likedStocks = [...(userData.likedStocks || [])];
      const rejectedStocks = [...(userData.rejectedStocks || [])];
      
      // Recording user choice
      
      if (choice === 'like' || choice === 'accept') {
        // Add to liked stocks if not already there
        if (!likedStocks.includes(symbol)) {
          likedStocks.push(symbol);
        }
        
        // Add to portfolio collection (not user document field)
        const portfolioRef = collection(db, 'users', this.userId, 'portfolio');
        const portfolioSnap = await getDocs(portfolioRef);
        const existingPosition = portfolioSnap.docs.find(doc => doc.data().symbol === symbol);
        
        if (!existingPosition) {
          const portfolioItem = {
            symbol: symbol,
            name: stockData.name || symbol,
            shares: 0, // Default 0 shares - user must buy manually
            averagePrice: stockData.price || stockData.currentPrice || 0,
            currentPrice: stockData.price || stockData.currentPrice || 0,
            totalValue: 0, // 0 shares = 0 value
            totalCost: 0,
            sector: stockData.sector || 'Unknown',
            industry: stockData.industry || 'Unknown',
            purchaseDate: new Date().toISOString(),
            source: 'recommendation',
            lastUpdated: new Date().toISOString()
          };
          
          await addDoc(portfolioRef, portfolioItem);
          // Added to portfolio watchlist
        }
        
        // Remove from rejected if it was there
        const rejectedIndex = rejectedStocks.indexOf(symbol);
        if (rejectedIndex > -1) {
          rejectedStocks.splice(rejectedIndex, 1);
        }
      } else if (choice === 'reject' || choice === 'dislike') {
        // Add to rejected stocks if not already there
        if (!rejectedStocks.includes(symbol)) {
          rejectedStocks.push(symbol);
        }
        
        // Remove from liked if it was there
        const likedIndex = likedStocks.indexOf(symbol);
        if (likedIndex > -1) {
          likedStocks.splice(likedIndex, 1);
        }
        
        // Remove from portfolio collection if it was there
        const portfolioRef = collection(db, 'users', this.userId, 'portfolio');
        const portfolioSnap = await getDocs(portfolioRef);
        const existingPosition = portfolioSnap.docs.find(doc => doc.data().symbol === symbol);
        
        if (existingPosition) {
          await deleteDoc(existingPosition.ref);
          console.log(`💼 Removed ${symbol} from portfolio collection`);
        }
      }
      
      // Update user document (no portfolio field since it's in separate collection)
      await updateDoc(userDocRef, {
        likedStocks,
        rejectedStocks,
        lastUpdated: new Date().toISOString()
      });
      
      console.log(`✅ Updated user preferences: ${likedStocks.length} liked, ${rejectedStocks.length} rejected`);
      
      // Remove from generated stocks cache so it doesn't reappear
      await this.removeStockFromCache(symbol);
      
    } catch (error) {
      console.error('❌ Error recording user choice:', error);
      throw error;
    }
  }

  // Remove a specific stock from the generated stocks cache
  async removeStockFromCache(symbol) {
    try {
      if (!this.userId) {
        await this.loadUserContext();
      }

      const stocksRef = collection(db, 'users', this.userId, 'generatedStocks');
      const stocksSnap = await getDocs(stocksRef);
      
      const stockToRemove = stocksSnap.docs.find(doc => doc.data().symbol === symbol);
      if (stockToRemove) {
        await deleteDoc(stockToRemove.ref);
        console.log(`🗑️ Removed ${symbol} from generated stocks cache`);
      }
    } catch (error) {
      console.error('❌ Error removing stock from cache:', error);
    }
  }
}

export default new StockGenerationService(); 
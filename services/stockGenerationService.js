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
    try {
      if (!marketCapValue || marketCapValue === null || marketCapValue === undefined) {
        return 'N/A';
      }
      
      const value = parseFloat(marketCapValue);
      if (isNaN(value) || value <= 0) {
        return 'N/A';
      }
      
      if (value >= 1e12) {
        return `$${(value / 1e12).toFixed(2)}T`;
      } else if (value >= 1e9) {
        return `$${(value / 1e9).toFixed(2)}B`;
      } else if (value >= 1e6) {
        return `$${(value / 1e6).toFixed(2)}M`;
      } else if (value >= 1e3) {
        return `$${(value / 1e3).toFixed(2)}K`;
      } else {
        return `$${value.toFixed(2)}`;
      }
    } catch (error) {
      console.warn('Error formatting market cap:', error);
      return 'N/A';
    }
  }

  // Calculate enhanced confidence score as percentage based on user risk profile
  calculateEnhancedConfidence(rec, quoteData, companyData) {
    try {
      let baseConfidence = parseFloat(rec.confidence) || 0.7;
      
      // Ensure base confidence is valid
      if (isNaN(baseConfidence) || baseConfidence < 0 || baseConfidence > 1) {
        baseConfidence = 0.7;
      }
      
      let confidenceScore = baseConfidence * 100; // Convert to percentage base
      
      // Risk Profile Alignment Bonus/Penalty (±20 points)
      if (this.riskProfile && quoteData) {
        const volatility = Math.abs(parseFloat(quoteData.changePercent) || 0);
        const userVolatility = parseInt(this.riskProfile.volatility) || 5;
        
        // Calculate risk alignment (how well stock matches user's risk tolerance)
        if (userVolatility <= 3) { // Conservative users (1-3)
          if (volatility < 1) confidenceScore += 15; // Perfect for conservative
          else if (volatility < 2) confidenceScore += 10;
          else if (volatility > 5) confidenceScore -= 20; // Too risky
        } else if (userVolatility <= 7) { // Moderate users (4-7)
          if (volatility >= 1 && volatility <= 4) confidenceScore += 10; // Sweet spot
          else if (volatility > 8) confidenceScore -= 10; // Too volatile
        } else { // Aggressive users (8-10)
          if (volatility > 3) confidenceScore += 15; // Higher volatility preferred
          else if (volatility < 1) confidenceScore -= 10; // Too boring
        }
      }
      
      // Market Cap Reliability Factor (±10 points)
      if (companyData && companyData.marketCapitalization && !isNaN(companyData.marketCapitalization)) {
        const marketCapB = companyData.marketCapitalization / 1e9;
        if (marketCapB > 100) confidenceScore += 10; // Large cap bonus
        else if (marketCapB < 1) confidenceScore -= 5; // Small cap slight penalty
      }
      
      // Performance Factor (±5 points)
      if (quoteData && quoteData.changePercent) {
        const change = parseFloat(quoteData.changePercent);
        if (change > 0) confidenceScore += 3; // Positive momentum
        else if (change < -5) confidenceScore -= 5; // Significant decline
      }
      
      // Ensure confidence stays within reasonable bounds (25% - 95%)
      const finalConfidence = Math.max(25, Math.min(95, Math.round(confidenceScore)));
      
      console.log(`🎯 Confidence for ${rec.symbol}: ${finalConfidence}% (base: ${Math.round(baseConfidence * 100)}%, risk alignment bonus/penalty applied)`);
      
      return finalConfidence;
    } catch (error) {
      console.warn('Error calculating enhanced confidence:', error);
      return 70; // Fallback to 70%
    }
  }

  // Calculate risk-adjusted rating
  calculateRiskAdjustedRating(rec, quoteData, companyData) {
    try {
      const baseRating = rec.recommendation || 'BUY';
      
      // Only adjust if risk profile is available
      if (!this.riskProfile || !quoteData) {
        return baseRating;
      }
      
      const userRiskTolerance = parseInt(this.riskProfile.volatility) || 5;
      const stockVolatility = Math.abs(parseFloat(quoteData.changePercent) || 0);
      
      // Adjust rating based on risk match
      if (userRiskTolerance <= 5) { // Conservative user
        if (stockVolatility > 3) return 'HOLD'; // Downgrade volatile stocks
      } else if (userRiskTolerance >= 8) { // Aggressive user
        if (stockVolatility < 1) return 'HOLD'; // Boring for aggressive users
      }
      
      return baseRating;
    } catch (error) {
      console.warn('Error calculating risk-adjusted rating:', error);
      return rec.recommendation || 'BUY'; // Fallback to original recommendation
    }
  }

  // Calculate more sophisticated target price
  calculateTargetPrice(quoteData, companyData, rec, analysis = null) {
    try {
      // Only use LLM-generated target price if it's real data (non-fake)
      if (analysis && analysis.targetPrice && !isNaN(analysis.targetPrice) && analysis.targetPrice > 0 && analysis.targetPrice !== 125.50 && analysis.targetPrice !== 150.50) {
        console.log(`🎯 Using LLM target price for ${rec.symbol}: $${analysis.targetPrice.toFixed(2)}`);
        return `$${analysis.targetPrice.toFixed(2)}`;
      }
      
      const currentPrice = parseFloat(quoteData.price) || 0;
      if (currentPrice <= 0) {
        return 'N/A';
      }
      
      let multiplier = 1.1; // Default 10% upside
      
      // Adjust multiplier based on market cap and volatility
      if (companyData && companyData.marketCapitalization) {
        const marketCapB = companyData.marketCapitalization / 1e9;
        if (marketCapB > 100) multiplier = 1.08; // Large cap: more conservative
        else if (marketCapB < 1) multiplier = 1.25; // Small cap: higher potential
      }
      
      // Adjust based on confidence and recommendation
      const confidence = parseFloat(rec.confidence) || 0.7;
      if (confidence > 0.8) multiplier += 0.05;
      if (rec.recommendation === 'BUY') multiplier += 0.02;
      
      // Consider 52-week range if available
      if (quoteData.high && quoteData.low) {
        const high = parseFloat(quoteData.high);
        const low = parseFloat(quoteData.low);
        if (high > low && low > 0) {
          const rangePosition = (currentPrice - low) / (high - low);
          if (rangePosition < 0.3) multiplier += 0.05; // Near low, more upside potential
        }
      }
      
      const targetPrice = currentPrice * multiplier;
      console.log(`📊 Calculated target price for ${rec.symbol}: $${targetPrice.toFixed(2)}`);
      return `$${targetPrice.toFixed(2)}`;
    } catch (error) {
      console.warn('Error calculating target price:', error);
      return 'N/A';
    }
  }

  // Calculate market cap with multiple fallback methods including LLM
  async calculateMarketCap(rec, quoteData, companyData, analysis = null) {
    try {
      let marketCapValue = null;
      
      // Method 1: Direct from Finnhub API (prioritize real data)
      if (companyData && companyData.marketCapitalization && companyData.marketCapitalization > 0) {
        marketCapValue = companyData.marketCapitalization * 1e6; // Finnhub returns in millions
        console.log(`💰 Market cap from Finnhub: $${this.formatMarketCap(marketCapValue)}`);
      }
      // Method 2: From LLM recommendation 
      else if (rec.marketCapBillions && rec.marketCapBillions > 0) {
        marketCapValue = rec.marketCapBillions * 1e9;
        console.log(`💰 Market cap from LLM: $${this.formatMarketCap(marketCapValue)}`);
      }
      // Method 3: Calculate from price × shares outstanding
      else if (quoteData.price && companyData && companyData.shareOutstanding && companyData.shareOutstanding > 0) {
        marketCapValue = parseFloat(quoteData.price) * parseFloat(companyData.shareOutstanding);
        console.log(`💰 Market cap calculated: $${this.formatMarketCap(marketCapValue)}`);
      }
      // Method 4: Ask LLM for market cap when other methods fail
      else {
        console.log(`🤖 Finnhub missing market cap for ${rec.symbol}, asking LLM...`);
        marketCapValue = await this.getLLMMarketCap(rec.symbol, rec.name, quoteData.price);
      }
      
      // Method 5: Final fallback - estimate based on company size
      if (!marketCapValue || marketCapValue <= 0) {
        console.warn(`⚠️ No market cap data available for ${rec.symbol || 'stock'}, using estimate`);
        const price = parseFloat(quoteData.price) || 100;
        // Rough estimate based on price range
        if (price > 500) marketCapValue = 500e9; // Large cap estimate
        else if (price > 100) marketCapValue = 50e9; // Mid cap estimate
        else marketCapValue = 5e9; // Small cap estimate
      }
      
      return this.formatMarketCap(marketCapValue);
    } catch (error) {
      console.warn('Error calculating market cap:', error);
      return 'N/A';
    }
  }

  // Ask LLM to estimate market cap when Finnhub fails
  async getLLMMarketCap(symbol, companyName, currentPrice) {
    try {
      const groqServiceImport = await import('./groqService');
      const groqService = groqServiceImport.default;
      
      const prompt = `As a financial analyst, estimate the market capitalization for ${symbol} (${companyName}) with current stock price $${currentPrice}.

Consider:
- Company size and industry position
- Typical market cap ranges for similar companies
- Current market conditions

Respond with ONLY a number in billions (e.g., 150.5 for $150.5B market cap).
If it's a large well-known company like Apple/Microsoft, it should be 500B+
If it's a major S&P 500 company, typically 50-500B
If it's a smaller company, typically 1-50B

Just the number in billions:`;

      const response = await groqService.callLLM(prompt);
      const marketCapBillions = parseFloat(response.trim());
      
      if (!isNaN(marketCapBillions) && marketCapBillions > 0) {
        const marketCapValue = marketCapBillions * 1e9;
        console.log(`🤖 LLM estimated market cap for ${symbol}: $${this.formatMarketCap(marketCapValue)}`);
        return marketCapValue;
      } else {
        console.warn(`⚠️ LLM returned invalid market cap for ${symbol}:`, response);
        return null;
      }
    } catch (error) {
      console.warn(`❌ Error getting LLM market cap for ${symbol}:`, error);
      return null;
    }
  }

  // Load user context for stock generation
  async loadUserContext() {
    try {
      const { auth } = await import('../firebase');
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
      console.log('🔍 Getting user choices and portfolio...');
      const userChoices = await this.getUserChoices();
      const portfolioStocks = await this.getPortfolioStocks();
      console.log('📋 User choices:', userChoices);
      console.log('💼 Portfolio stocks:', portfolioStocks);
      
      // Get already generated stocks to avoid duplicates
      const existingStocks = await this.getGeneratedStocks();
      const existingSymbols = existingStocks.map(stock => stock.symbol);
      console.log(`📋 Already generated stocks: ${existingSymbols.length} - ${existingSymbols.join(', ')}`);
      
      // Combine rejected stocks, portfolio stocks, and already generated stocks for exclusion
      const allExcludedStocks = [...(userChoices.rejectedStocks || []), ...portfolioStocks, ...existingSymbols];
      console.log(`🚫 Total excluded stocks: ${allExcludedStocks.length} - ${allExcludedStocks.join(', ')}`);
      
      // Get 10 LLM recommendations using Groq, excluding rejected + portfolio + already generated stocks
      console.log('🤖 Calling Groq service for recommendations...');
      console.log('🎯 Risk profile:', this.riskProfile);
      const recommendations = await groqService.getRecommendations(10, {
        riskProfile: this.riskProfile,
        userPreferences: this.userPreferences,
        rejectedStocks: allExcludedStocks,
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
              targetPrice: this.calculateTargetPrice(quoteData, companyData, rec, analysis),
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
            marketCap: await this.calculateMarketCap(rec, quoteData, companyData, analysis),
            peRatio: 'N/A',
            dividendYield: 'N/A',
            growth: '',
            riskLevel: rec.riskLevel || 'medium',
            confidence: this.calculateEnhancedConfidence(rec, quoteData, companyData),
            reason: rec.reason || 'AI-generated recommendation',
            riskMetrics: { beta: 'N/A', volatility: Math.abs(quoteData.change) },
            timestamp: Date.now(),
            lastUpdated: new Date().toISOString(),
            analysis: analysis.summary,
            investmentThesis: analysis.investmentThesis,
            keyRisks: analysis.keyRisks,
            keyBenefits: analysis.keyBenefits,
            targetPrice: this.calculateTargetPrice(quoteData, companyData, rec, analysis),
            recommendation: this.calculateRiskAdjustedRating(rec, quoteData, companyData),
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
          
          // Get user choices and portfolio to exclude from backfill
          const userChoices = await this.getUserChoices();
          const portfolioStocks = await this.getPortfolioStocks();
          const allExcludedStocks = [...(userChoices.rejectedStocks || []), ...portfolioStocks, ...existingSymbols];
          
          console.log(`🚫 [Backfill] Excluding ${allExcludedStocks.length} stocks from backfill`);
          
          const moreRecs = await groqService.getRecommendations(needed + 5, { // Get extra to account for failures
            riskProfile: this.riskProfile,
            userPreferences: this.userPreferences,
            rejectedStocks: allExcludedStocks,
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
                marketCap: await this.calculateMarketCap(rec, quoteData, companyData, analysis),
                peRatio: 'N/A',
                dividendYield: 'N/A',
                growth: '',
                riskLevel: rec.riskLevel || 'medium',
                confidence: this.calculateEnhancedConfidence(rec, quoteData, companyData),
                reason: rec.reason || 'AI-generated recommendation',
                riskMetrics: { beta: 'N/A', volatility: Math.abs(quoteData.change) },
                timestamp: Date.now(),
                lastUpdated: new Date().toISOString(),
                analysis: analysis.summary,
                investmentThesis: analysis.investmentThesis,
                keyRisks: analysis.keyRisks,
                keyBenefits: analysis.keyBenefits,
                targetPrice: this.calculateTargetPrice(quoteData, companyData, rec, analysis),
                recommendation: this.calculateRiskAdjustedRating(rec, quoteData, companyData),
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
      Current Price: $${quoteData.price}, Daily Change: ${quoteData.changePercent}%, Volume: ${quoteData.volume || 'N/A'}
      52-Week High: $${quoteData.high || 'N/A'}, 52-Week Low: $${quoteData.low || 'N/A'}
      Previous Close: $${quoteData.previousClose || 'N/A'}, Market Status: ${quoteData.marketStatus || 'Unknown'}
      
      User Risk Profile: ${this.getRiskLevel(this.riskProfile.volatility)} (${this.riskProfile.volatility}/10)
      Investment Horizon: ${this.getTimeHorizon(this.riskProfile.timeHorizon)}
      Investment Knowledge: ${this.getKnowledgeLevel(this.riskProfile.knowledge)}
      
      Based on the real-time pricing data and user's risk profile, provide:
      1. A comprehensive 200-300 word investment analysis summary tailored to this user, including recent market performance, fundamental analysis, and specific reasoning why this fits their risk profile
      2. Investment thesis (3-4 sentences) using current market data, sector trends, and company fundamentals
      3. 3-4 key benefits for this user's specific risk profile, including quantitative metrics where relevant
      4. 3-4 key risks for this user's specific risk profile, including market, regulatory, and company-specific risks
      5. Market capitalization estimate in billions (if not provided above, estimate based on company size, industry, and stock price)
      6. 12-month target price estimate based on fundamentals, growth prospects, and market conditions
      
      Format as JSON:
      {
        "summary": "200-300 word comprehensive analysis...",
        "investmentThesis": "3-4 sentence detailed thesis...",
        "keyBenefits": ["Benefit 1", "Benefit 2", "Benefit 3", "Benefit 4"],
        "keyRisks": ["Risk 1", "Risk 2", "Risk 3", "Risk 4"],
        "marketCapBillions": null,
        "targetPrice": null
      }
      
      IMPORTANT: 
      - For marketCapBillions and targetPrice, use null if you don't have accurate real-time data
      - DO NOT make up or estimate these financial values
      - Only provide real market data if you are certain of its accuracy`;

      const response = await groqService.callLLM(prompt);
      
      // Clean and parse JSON response more safely
      let cleanedResponse = response.trim();
      
      // Remove common LLM response prefixes and suffixes more aggressively
      cleanedResponse = cleanedResponse.replace(/^.*?Here is the analysis.*?:\s*/i, '');
      cleanedResponse = cleanedResponse.replace(/^.*?Here is.*?JSON.*?:\s*/i, '');
      cleanedResponse = cleanedResponse.replace(/^.*?Based on.*?:\s*/i, '');
      cleanedResponse = cleanedResponse.replace(/^.*?analysis.*?:\s*/i, '');
      cleanedResponse = cleanedResponse.replace(/```json\s*/gi, '');
      cleanedResponse = cleanedResponse.replace(/```\s*/g, '');
      
      // Remove any text before the first {
      const jsonStart = cleanedResponse.indexOf('{');
      if (jsonStart > 0) {
        cleanedResponse = cleanedResponse.substring(jsonStart);
      }
      
      // Remove any text after the last }
      const jsonEnd = cleanedResponse.lastIndexOf('}');
      if (jsonEnd > 0 && jsonEnd < cleanedResponse.length - 1) {
        cleanedResponse = cleanedResponse.substring(0, jsonEnd + 1);
      }
      
      // Remove ALL control characters and problematic unicode that cause JSON parse errors
      cleanedResponse = cleanedResponse.replace(/[\u0000-\u001F\u007F-\u009F\u2000-\u206F\uFEFF]/g, '');
      
      // Replace problematic characters that sometimes appear in LLM responses
      cleanedResponse = cleanedResponse.replace(/[\u2018\u2019]/g, "'"); // Smart quotes to regular quotes
      cleanedResponse = cleanedResponse.replace(/[\u201C\u201D]/g, '"'); // Smart double quotes
      cleanedResponse = cleanedResponse.replace(/\u2026/g, '...'); // Ellipsis
      cleanedResponse = cleanedResponse.replace(/[\u2013\u2014]/g, '-'); // Em and en dashes
      
      // Fix common JSON formatting issues
      cleanedResponse = cleanedResponse.replace(/,\s*}/g, '}'); // Remove trailing commas
      cleanedResponse = cleanedResponse.replace(/,\s*]/g, ']'); // Remove trailing commas in arrays
      
      console.log('🧹 Cleaned response for JSON parsing:', cleanedResponse.substring(0, 200) + '...');
      
      let analysis;
      try {
        analysis = JSON.parse(cleanedResponse);
      } catch (parseError) {
        console.error('❌ JSON Parse failed even after cleaning:', parseError);
        console.error('🔍 Raw response:', response.substring(0, 300));
        console.error('🧹 Cleaned response:', cleanedResponse.substring(0, 300));
        throw new Error(`Failed to parse LLM analysis: ${parseError.message}`);
      }
      
      return {
        summary: analysis.summary,
        investmentThesis: analysis.investmentThesis,
        keyBenefits: analysis.keyBenefits,
        keyRisks: analysis.keyRisks,
        marketCapBillions: analysis.marketCapBillions || null,
        targetPrice: analysis.targetPrice || null
      };
    } catch (error) {
      console.error(`❌ Error generating analysis for ${symbol}:`, error);
      // Return a more generic analysis with basic estimates
      const currentPrice = parseFloat(quoteData.price) || 100;
      const estimatedMarketCap = currentPrice > 200 ? 50 : currentPrice > 50 ? 10 : 2; // Rough estimate in billions
      const estimatedTargetPrice = currentPrice * 1.1; // 10% upside estimate
      
      return {
        summary: `Analysis for ${symbol} could not be generated due to an error. Based on current price of $${currentPrice}, this appears to be a ${estimatedMarketCap > 20 ? 'large' : estimatedMarketCap > 5 ? 'mid' : 'small'}-cap stock with potential for growth.`,
        investmentThesis: `${symbol} shows potential based on current market position and price trends.`,
        keyBenefits: ['Market presence', 'Growth potential'],
        keyRisks: ['Market volatility', 'Analysis limitations'],
        marketCapBillions: estimatedMarketCap,
        targetPrice: estimatedTargetPrice
      };
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

      // Get user choices and portfolio to exclude from recommendations  
      const userChoices = await this.getUserChoices();
      const portfolioStocks = await this.getPortfolioStocks();
      const existingStocks = await this.getGeneratedStocks();
      const existingSymbols = existingStocks.map(stock => stock.symbol);
      
      // Combine all stocks to exclude
      const allExcludedStocks = [
        ...(userChoices.rejectedStocks || []),
        ...(userChoices.likedStocks || []), 
        ...portfolioStocks,
        ...existingSymbols
      ];
      
      console.log(`🚫 [PersonalizedStocks] Excluding ${allExcludedStocks.length} stocks: ${allExcludedStocks.join(', ')}`);

      // Get LLM recommendations with exclusions
      const recommendations = await groqService.getRecommendations(maxStocks + 5, { // Get extra to account for filtering
        riskProfile: this.riskProfile,
        userPreferences: this.userPreferences,
        rejectedStocks: allExcludedStocks,
        likedStocks: [], // Don't pass liked stocks as we're excluding them above
      });
      console.log(`✅ Groq LLM generated ${recommendations.length} recommendations`);

      if (!recommendations || recommendations.length === 0) {
        console.warn('⚠️ No LLM recommendations received');
        throw new Error('No stock recommendations generated by LLM');
      }

      // Additional client-side filtering to ensure no duplicates
      const availableStocks = recommendations.filter(rec => 
        !allExcludedStocks.includes(rec.symbol)
      );

      console.log(`📊 ${availableStocks.length} stocks available after filtering`);

      // Take only what we need to avoid too many API calls
      const stocksToProcess = availableStocks.slice(0, maxStocks);
      console.log(`🎯 Processing ${stocksToProcess.length} stocks for personalized recommendations`);

      // Fetch real data for each recommendation
      const stocksWithRealData = (await Promise.all(stocksToProcess.map(async (rec) => {
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
            marketCap: await this.calculateMarketCap(rec, quoteData, companyData, analysis),
            peRatio: 'N/A',
            dividendYield: 'N/A',
            growth: '',
            riskLevel: rec.riskLevel || 'medium',
            confidence: this.calculateEnhancedConfidence(rec, quoteData, companyData),
            reason: rec.reason || 'AI-generated recommendation',
            riskMetrics: { beta: 'N/A', volatility: Math.abs(quoteData.change) },
            timestamp: Date.now(),
            lastUpdated: new Date().toISOString(),
            analysis: analysis.summary,
            investmentThesis: analysis.investmentThesis,
            keyRisks: analysis.keyRisks,
            keyBenefits: analysis.keyBenefits,
            targetPrice: this.calculateTargetPrice(quoteData, companyData, rec, analysis),
            recommendation: this.calculateRiskAdjustedRating(rec, quoteData, companyData),
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
      
      // Check for any duplicate symbols in the raw stock list
      const symbolCounts = {};
      stocks.forEach(stock => {
        symbolCounts[stock.symbol] = (symbolCounts[stock.symbol] || 0) + 1;
      });
      
      const duplicates = Object.keys(symbolCounts).filter(symbol => symbolCounts[symbol] > 1);
      if (duplicates.length > 0) {
        console.error(`🚨 CRITICAL: Found duplicate symbols in generated stocks: ${duplicates.join(', ')}`);
        console.error('📋 All stock symbols:', stocks.map(s => s.symbol));
        
        // Remove duplicates, keeping only the first occurrence of each symbol
        const uniqueStocks = [];
        const seenSymbols = new Set();
        for (const stock of stocks) {
          if (!seenSymbols.has(stock.symbol)) {
            uniqueStocks.push(stock);
            seenSymbols.add(stock.symbol);
          } else {
            console.log(`🗑️ Removing duplicate stock: ${stock.symbol}`);
          }
        }
        stocks.length = 0; // Clear original array
        stocks.push(...uniqueStocks); // Replace with unique stocks
        console.log(`✅ After deduplication: ${stocks.length} unique stocks`);
      }
      
      const pairs = [];
      
      for (let i = 0; i < stocks.length - 1; i += 2) {
        const leftStock = stocks[i];
        const rightStock = stocks[i + 1];
        
        // Double-check for within-pair duplicates
        if (leftStock.symbol === rightStock.symbol) {
          console.error(`🚨 PAIR DUPLICATE DETECTED: ${leftStock.symbol} vs ${rightStock.symbol}`);
          // Skip this pair rather than create a duplicate
          continue;
        }
        
        pairs.push({
          left: leftStock,
          right: rightStock
        });
      }
      
      // If odd number, generate one more stock to complete the pair
      if (stocks.length % 2 === 1) {
        console.log('🔄 Odd number of stocks, generating one more to complete pairs...');
        try {
          const userChoices = await this.getUserChoices();
          const portfolioStocks = await this.getPortfolioStocks();
          const existingSymbols = stocks.map(s => s.symbol);
          const rejectedStocks = [...(userChoices.rejectedStocks || []), ...portfolioStocks, ...existingSymbols];
          const likedStocks = userChoices.likedStocks || [];
          
          console.log(`🚫 [Odd Fix] Excluding ${rejectedStocks.length} stocks from additional generation`);
          
          // Generate one more stock
          const groqServiceImport = await import('./groqService');
          const groqService = groqServiceImport.default;
          const additionalStocks = await groqService.getRecommendations(1, {
            riskProfile: this.riskProfile,
            userPreferences: this.userPreferences,
            rejectedStocks: rejectedStocks,
            likedStocks: likedStocks,
          });
          
          if (additionalStocks && additionalStocks.length > 0) {
            const additionalStock = additionalStocks[0];
            
            // Get real-time data
            const [quote, profile] = await Promise.all([
              getStockQuote(additionalStock.symbol),
              getCompanyProfile(additionalStock.symbol)
            ]);
            
            const completeStock = {
              ...additionalStock,
              price: quote.price || quote.c || 0,
              change: quote.change || quote.d || 0,
              changePercent: quote.changePercent || quote.dp || 0,
              marketCap: profile.marketCapitalization || 0,
              industry: profile.finnhubIndustry || additionalStock.industry || 'Unknown'
            };
            
            // Store the additional stock
            await this.storeGeneratedStocks([completeStock]);
            
            // Add to our local array and create the final pair
            stocks.push(completeStock);
            pairs.push({
              left: stocks[stocks.length - 2],
              right: stocks[stocks.length - 1]
            });
            
            console.log(`✅ Generated additional stock: ${completeStock.symbol} to complete pairs`);
          } else {
            // Fallback: just don't include the unpaired stock
            console.log('⚠️ Could not generate additional stock, excluding unpaired stock');
          }
        } catch (error) {
          console.error('❌ Error generating additional stock for pairing:', error);
          // Fallback: just don't include the unpaired stock
        }
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

  // REMOVED: Duplicate generatePersonalizedStocks method - using the advanced one at line 430

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

  async getPortfolioStocks() {
    try {
      if (!this.userId) {
        await this.loadUserContext();
      }

      const portfolioRef = collection(db, 'users', this.userId, 'portfolio');
      const portfolioSnap = await getDocs(portfolioRef);
      const portfolioStocks = [];
      
      portfolioSnap.forEach(doc => {
        const data = doc.data();
        if (data.symbol) {
          portfolioStocks.push(data.symbol);
        }
      });
      
      console.log(`📊 [StockGen] Portfolio stocks found: ${portfolioStocks.length} - ${portfolioStocks.join(', ')}`);
      return portfolioStocks;
    } catch (error) {
      console.error('❌ Error getting portfolio stocks:', error);
      return [];
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
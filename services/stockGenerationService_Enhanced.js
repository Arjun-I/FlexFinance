// stockGenerationService_Enhanced.js - Enhanced Stock Generation with Personalized Analysis
import { doc, getDoc, setDoc, collection, getDocs, deleteDoc, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import groqService from './groqService';
import { getStockQuote, getCompanyProfile, getCompanyFinancialsEnhanced } from './finnhubService';

class StockGenerationService_Enhanced {
  constructor() {
    this.userId = null;
    this.riskProfile = null;
    this.userPreferences = null;
    this.userProfile = null;
  }

  // Load comprehensive user context
  async loadUserContext() {
    try {
      if (!this.userId) {
        console.error('No user ID provided');
        return false;
      }

      const userDoc = await getDoc(doc(db, 'users', this.userId));
      if (!userDoc.exists()) {
        console.error('User document not found');
        return false;
      }

      const userData = userDoc.data();
      
      // Load user profile
      this.userProfile = {
        email: userData.email,
        createdAt: userData.createdAt,
        cashBalance: userData.cashBalance || 10000,
        investmentGoals: userData.investmentGoals || [],
        preferredSectors: userData.preferredSectors || [],
        riskTolerance: userData.riskTolerance || 'medium',
        timeHorizon: userData.timeHorizon || 'medium',
        experienceLevel: userData.experienceLevel || 'beginner'
      };

      // Load risk profile
      const riskProfileDoc = await getDoc(doc(db, 'users', this.userId, 'riskProfile', 'current'));
      if (riskProfileDoc.exists()) {
        this.riskProfile = riskProfileDoc.data();
        console.log('Risk profile loaded:', this.riskProfile);
      } else {
        console.log('No risk profile found for user, creating default profile');
        // Create a default risk profile for users who haven't completed the quiz
        this.riskProfile = {
          riskProfile: {
            volatility: 3, // Medium risk
            timeHorizon: 3, // Medium term
            liquidity: 3, // Medium liquidity needs
            knowledge: 2, // Beginner to intermediate
            ethics: 3 // Neutral on ethical investing
          },
          totalScore: 14,
          riskLevel: 'moderate',
          createdAt: new Date(),
          isDefault: true
        };
      }

      // Load user preferences
      const preferencesDoc = await getDoc(doc(db, 'users', this.userId, 'preferences', 'current'));
      if (preferencesDoc.exists()) {
        this.userPreferences = preferencesDoc.data();
      }

      console.log('Enhanced user context loaded successfully');
      return true;
    } catch (error) {
      console.error('Error loading enhanced user context:', error);
      return false;
    }
  }

  // Get user's investment history and preferences
  async getUserInvestmentProfile() {
    try {
      const [portfolioSnapshot, choicesSnapshot, watchlistSnapshot] = await Promise.all([
        getDocs(collection(db, 'users', this.userId, 'portfolio')),
        getDocs(collection(db, 'users', this.userId, 'userChoices')),
        getDocs(collection(db, 'users', this.userId, 'watchlist'))
      ]);

      const portfolio = [];
      const likedStocks = [];
      const rejectedStocks = [];
      const watchlist = [];

      portfolioSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.shares > 0) {
          portfolio.push({
            symbol: data.symbol,
            shares: data.shares,
            averagePrice: data.averagePrice,
            sector: data.sector,
            industry: data.industry
          });
        }
      });

      choicesSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.choice === 'liked') {
          likedStocks.push(data.symbol);
        } else if (data.choice === 'rejected') {
          rejectedStocks.push(data.symbol);
        }
      });

      watchlistSnapshot.forEach(doc => {
        const data = doc.data();
        watchlist.push({
          symbol: data.symbol,
          reason: data.reason,
          addedDate: data.addedDate
        });
      });

      return {
        portfolio,
        likedStocks,
        rejectedStocks,
        watchlist,
        totalInvested: portfolio.reduce((sum, holding) => sum + (holding.shares * holding.averagePrice), 0),
        portfolioSectors: [...new Set(portfolio.map(h => h.sector))],
        portfolioIndustries: [...new Set(portfolio.map(h => h.industry))]
      };
    } catch (error) {
      console.error('Error getting user investment profile:', error);
      return null;
    }
  }

  // Generate personalized stock analysis
  async generatePersonalizedAnalysis(stock, quoteData, companyData, financialData) {
    try {
      console.log(`Generating personalized analysis for ${stock.symbol}`);
      console.log('Current risk profile:', this.riskProfile);
      
      const investmentProfile = await this.getUserInvestmentProfile();
      console.log('Investment profile:', investmentProfile);
      
      // Calculate personalized metrics
      const sectorDiversification = this.calculateSectorDiversification(stock.sector, investmentProfile.portfolioSectors);
      const riskAlignment = this.calculateRiskAlignment(stock, this.riskProfile);
      const portfolioFit = this.calculatePortfolioFit(stock, investmentProfile);
      const personalizationScore = this.calculatePersonalizationScore(stock, investmentProfile);

      // Generate personalized investment thesis
      const personalizedThesis = await this.generatePersonalizedThesis(stock, investmentProfile, quoteData, companyData);
      
      // Generate personalized benefits and risks
      const personalizedBenefits = await this.generatePersonalizedBenefits(stock, investmentProfile, quoteData, companyData);
      const personalizedRisks = await this.generatePersonalizedRisks(stock, investmentProfile, quoteData, companyData);

      return {
        sectorDiversification,
        riskAlignment,
        portfolioFit,
        personalizationScore,
        investmentThesis: personalizedThesis,
        keyBenefits: personalizedBenefits,
        keyRisks: personalizedRisks,
        investmentProfile
      };
    } catch (error) {
      console.error('Error generating personalized analysis:', error);
      return {
        sectorDiversification: 0.5,
        riskAlignment: 0.5,
        portfolioFit: 0.5,
        personalizationScore: 0.5,
        investmentThesis: 'Personalized analysis unavailable.',
        keyBenefits: ['Analysis unavailable'],
        keyRisks: ['Analysis unavailable'],
        investmentProfile: null
      };
    }
  }

  // Calculate sector diversification score
  calculateSectorDiversification(stockSector, portfolioSectors) {
    if (portfolioSectors.length === 0) {
      console.log('No existing portfolio, giving diversification score 1.0');
      return 1.0; // First investment - perfect diversification
    }
    
    const sectorCount = portfolioSectors.filter(sector => sector === stockSector).length;
    const totalHoldings = portfolioSectors.length;
    const sectorConcentration = sectorCount / totalHoldings;
    
    console.log(`Sector analysis for ${stockSector}:`);
    console.log(`- Current holdings in sector: ${sectorCount}/${totalHoldings}`);
    console.log(`- Sector concentration: ${(sectorConcentration * 100).toFixed(1)}%`);
    
    // Higher score for better diversification
    // If already have 50%+ in this sector, give lower score
    let score;
    if (sectorConcentration >= 0.5) {
      score = 0.2; // Low score for high concentration
    } else if (sectorConcentration >= 0.3) {
      score = 0.5; // Medium score for moderate concentration
    } else {
      score = 1.0 - sectorConcentration; // Higher score for good diversification
    }
    
    console.log(`Diversification score: ${score}`);
    return isNaN(score) ? 0.5 : Math.max(0, Math.min(1, score));
  }

  // Calculate risk alignment with user profile
  calculateRiskAlignment(stock, riskProfile) {
    if (!riskProfile) {
      console.log('No risk profile available for user, using default score 0.5');
      return 0.5;
    }

    const userRiskScore = this.getRiskScore(riskProfile);
    const stockRiskScore = this.getStockRiskScore(stock);
    
    console.log(`Risk alignment - User score: ${userRiskScore}, Stock score: ${stockRiskScore}`);
    
    // Calculate alignment (0-1, higher is better)
    const alignment = 1 - Math.abs(userRiskScore - stockRiskScore);
    const score = Math.max(0, Math.min(1, alignment));
    
    console.log(`Risk alignment score for ${stock.symbol}: ${score}`);
    return isNaN(score) ? 0.5 : score;
  }

  // Calculate portfolio fit
  calculatePortfolioFit(stock, investmentProfile) {
    const { portfolio, totalInvested } = investmentProfile;
    
    if (portfolio.length === 0) {
      console.log('No existing portfolio, giving portfolio fit score 1.0');
      return 1.0; // First investment - perfect fit
    }
    
    console.log(`Portfolio fit analysis for ${stock.symbol}:`);
    console.log(`- Total invested: $${totalInvested}`);
    console.log(`- Current holdings: ${portfolio.length}`);
    
    // Check if user already has this stock
    const existingHolding = portfolio.find(h => h.symbol === stock.symbol);
    if (existingHolding) {
      console.log('User already owns this stock, low fit score');
      return 0.3; // Lower score for existing holdings
    }
    
    // Score based on portfolio size and diversification needs
    let score;
    if (portfolio.length < 5) {
      score = 0.9; // Encourage building portfolio
    } else if (portfolio.length < 10) {
      score = 0.7; // Good diversification level
    } else {
      score = 0.5; // Already well diversified
    }
    
    // Calculate position size fit
    const avgPositionSize = totalInvested / portfolio.length;
    const stockPrice = stock.price || stock.currentPrice || 100;
    const assumedShares = Math.min(100, Math.max(1, Math.floor(avgPositionSize / stockPrice)));
    const stockValue = stockPrice * assumedShares;
    
    console.log(`- Average position size: $${avgPositionSize.toFixed(2)}`);
    console.log(`- Stock price: $${stockPrice}`);
    console.log(`- Estimated position value: $${stockValue.toFixed(2)}`);
    
    // Adjust score based on position size reasonableness
    if (stockPrice > totalInvested * 0.2) {
      score *= 0.5; // Penalize if single share is too expensive for portfolio
      console.log('Stock too expensive for portfolio size, reducing score');
    }
    
    console.log(`Portfolio fit score: ${score}`);
    return Math.max(0, Math.min(1, score));
  }

  // Calculate overall personalization score
  calculatePersonalizationScore(stock, investmentProfile) {
    const sectorDiversification = this.calculateSectorDiversification(stock.sector, investmentProfile.portfolioSectors);
    const riskAlignment = this.calculateRiskAlignment(stock, this.riskProfile);
    const portfolioFit = this.calculatePortfolioFit(stock, investmentProfile);
    
    console.log(`Personalization scores for ${stock.symbol}:`);
    console.log(`- Sector diversification: ${sectorDiversification}`);
    console.log(`- Risk alignment: ${riskAlignment}`);
    console.log(`- Portfolio fit: ${portfolioFit}`);
    
    // Add user behavior adaptation - check if user has liked/rejected similar stocks
    let behaviorBonus = 0;
    const userLikedSectors = investmentProfile.likedStocks
      .map(stock => stock.sector)
      .filter(sector => sector === stock.sector);
    const userRejectedSectors = investmentProfile.rejectedStocks
      .map(stock => stock.sector)
      .filter(sector => sector === stock.sector);
    
    if (userLikedSectors.length > 0) {
      behaviorBonus += 0.15; // Bonus for sectors user has liked
    }
    if (userRejectedSectors.length > 0) {
      behaviorBonus -= 0.2; // Penalty for sectors user has rejected
    }
    
    // Dynamic weighting based on portfolio size and user experience
    let sectorWeight = 0.3;
    let riskWeight = 0.4;  
    let portfolioWeight = 0.3;
    
    if (investmentProfile.portfolio.length === 0) {
      // For new investors, prioritize risk alignment
      riskWeight = 0.5;
      sectorWeight = 0.2;
      portfolioWeight = 0.3;
    } else if (investmentProfile.portfolio.length > 10) {
      // For experienced investors, prioritize diversification
      sectorWeight = 0.5;
      riskWeight = 0.3;
      portfolioWeight = 0.2;
    }
    
    // Calculate adaptive weighted score
    const baseScore = (sectorDiversification * sectorWeight + riskAlignment * riskWeight + portfolioFit * portfolioWeight);
    const adaptiveScore = baseScore + behaviorBonus;
    
    // Add some controlled randomness for variety (±5%)
    const randomVariation = (Math.random() - 0.5) * 0.1; // ±5% variation
    const finalScore = Math.max(0.1, Math.min(0.95, adaptiveScore + randomVariation));
    
    console.log(`Adaptive personalization for ${stock.symbol}:`);
    console.log(`- Base score: ${baseScore.toFixed(3)}`);
    console.log(`- Behavior bonus: ${behaviorBonus.toFixed(3)}`);
    console.log(`- Random variation: ${randomVariation.toFixed(3)}`);
    console.log(`- Final score: ${finalScore.toFixed(3)}`);
    
    return isNaN(finalScore) ? 0.5 : finalScore;
  }

  // Clean and format text for better readability
  cleanText(text) {
    if (!text || typeof text !== 'string') return text;
    
    return text
      // Remove common LLM formatting artifacts
      .replace(/^["']|["']$/g, '') // Remove leading/trailing quotes
      .replace(/^\[|\]$/g, '') // Remove leading/trailing brackets
      .replace(/^\{|\}$/g, '') // Remove leading/trailing braces
      .replace(/^```.*?\n|\n```$/g, '') // Remove markdown code blocks
      .replace(/^#+\s*/g, '') // Remove markdown headers
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markdown
      .replace(/\*(.*?)\*/g, '$1') // Remove italic markdown
      .replace(/`(.*?)`/g, '$1') // Remove inline code
      .replace(/\n\s*\n/g, ' ') // Replace multiple newlines with single space
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      // Remove common prefixes that LLMs add
      .replace(/^(thesis|investment thesis|analysis|recommendation):\s*/i, '')
      .replace(/^(here's|here is|the|this is):\s*/i, '')
      .replace(/^(based on|considering|given):\s*/i, '')
      // Remove any remaining quotes throughout the text
      .replace(/["']/g, '')
      // Remove any remaining brackets or braces
      .replace(/[\[\]{}]/g, '')
      .trim(); // Remove leading/trailing whitespace
  }

  // Generate personalized investment thesis
  async generatePersonalizedThesis(stock, investmentProfile, quoteData, companyData) {
    try {
      // Generate varied thesis approaches for more variety
      const thesisApproaches = [
        'growth_potential',
        'value_opportunity', 
        'diversification_benefit',
        'sector_positioning',
        'risk_reward_balance',
        'market_leadership',
        'fundamental_strength'
      ];
      const randomApproach = thesisApproaches[Math.floor(Math.random() * thesisApproaches.length)];
      
      // Generate varied perspective angles
      const perspectiveAngles = [
        'portfolio composition', 'risk management', 'sector allocation', 
        'growth trajectory', 'market positioning', 'competitive advantage',
        'financial stability', 'dividend potential', 'volatility management'
      ];
      const randomPerspective = perspectiveAngles[Math.floor(Math.random() * perspectiveAngles.length)];

      const prompt = `
        Generate a professional investment thesis for ${stock.symbol} (${companyData.name}) using a ${randomApproach} framework, emphasizing ${randomPerspective}.
        
        INVESTOR PROFILE ANALYSIS:
        • Risk Profile: ${this.userProfile.riskTolerance} risk tolerance investor
        • Investment Timeline: ${this.userProfile.timeHorizon} term investment horizon  
        • Experience Level: ${this.userProfile.experienceLevel} investor
        • Current Holdings: ${investmentProfile.portfolio.length} positions across ${investmentProfile.portfolioSectors.length} sectors
        • Existing Sectors: ${investmentProfile.portfolioSectors.join(', ') || 'No current holdings'}
        • Portfolio Size: $${investmentProfile.totalInvested.toFixed(0)} total investment
        
        STOCK FUNDAMENTALS:
        • Trading Price: $${quoteData.price.toFixed(2)}
        • Market Capitalization: ${companyData.marketCap}
        • Sector Classification: ${stock.sector}
        • Industry Focus: ${stock.industry}
        • Current Valuation: ${quoteData.changePercent >= 0 ? 'Recent upward momentum' : 'Recent price consolidation'}
        
        THESIS REQUIREMENTS:
        Write exactly 3-4 sentences that address:
        1. Specific value proposition aligned with user's ${this.userProfile.riskTolerance} risk profile
        2. Portfolio impact and diversification considerations
        3. How this investment fits their ${this.userProfile.timeHorizon} term strategy
        4. Concrete rationale for position sizing within their ${investmentProfile.totalInvested > 0 ? '$' + investmentProfile.totalInvested.toFixed(0) : 'developing'} portfolio
        
        PROFESSIONAL STANDARDS:
        • Use formal institutional language - NO first person references ("I", "we", "our")
        • Write as senior investment analyst for sophisticated client
        • Include specific financial reasoning and portfolio theory
        • Vary sentence structure and vocabulary for uniqueness
        • Reference concrete metrics and strategic considerations
        • Ensure each thesis is distinctly different in approach and focus
        • NO prefixes, headers, or formatting artifacts
      `;

      const response = await groqService.generateText(prompt);
      const cleanedResponse = this.cleanText(response);
      return cleanedResponse || `Based on the investor's ${this.userProfile.riskTolerance} risk tolerance and ${this.userProfile.timeHorizon} time horizon, ${stock.symbol} represents a strategic allocation opportunity within the current portfolio framework.`;
    } catch (error) {
      console.error('Error generating personalized thesis:', error);
      return 'Personalized investment thesis unavailable.';
    }
  }

  // Generate personalized benefits
  async generatePersonalizedBenefits(stock, investmentProfile, quoteData, companyData) {
    try {
      const benefits = [];
      
      // Diversification benefit
      if (investmentProfile.portfolioSectors.length > 0 && !investmentProfile.portfolioSectors.includes(stock.sector)) {
        benefits.push(`Diversification: Adds exposure to the ${stock.sector} sector, which is not currently represented in your portfolio.`);
      }
      
      // Risk alignment benefit
      const riskAlignment = this.calculateRiskAlignment(stock, this.riskProfile);
      if (riskAlignment > 0.7) {
        benefits.push(`Risk Alignment: This stock's risk profile aligns well with your ${this.userProfile.riskTolerance} risk tolerance.`);
      }
      
      // Size fit benefit
      const portfolioFit = this.calculatePortfolioFit(stock, investmentProfile);
      if (portfolioFit > 0.7) {
        benefits.push(`Portfolio Fit: The position size would be appropriate for your current portfolio scale.`);
      }
      
      // Experience level benefit
      if (this.userProfile.experienceLevel === 'beginner' && stock.sector === 'Technology') {
        benefits.push(`Learning Opportunity: Technology stocks can be great for learning about growth investing.`);
      }
      
      return benefits.length > 0 ? benefits : [`Potential for growth in the ${stock.sector} sector.`];
    } catch (error) {
      console.error('Error generating personalized benefits:', error);
      return ['Strong market position', 'Growth potential'];
    }
  }

  // Generate personalized risks
  async generatePersonalizedRisks(stock, investmentProfile, quoteData, companyData) {
    try {
      const risks = [];
      
      // Sector concentration risk
      if (investmentProfile.portfolioSectors.includes(stock.sector)) {
        risks.push(`Sector Concentration: You already have exposure to the ${stock.sector} sector, which could increase concentration risk.`);
      }
      
      // Risk tolerance mismatch
      const riskAlignment = this.calculateRiskAlignment(stock, this.riskProfile);
      if (riskAlignment < 0.3) {
        risks.push(`Risk Mismatch: This stock's risk profile may not align well with your ${this.userProfile.riskTolerance} risk tolerance.`);
      }
      
      // Experience level risk
      if (this.userProfile.experienceLevel === 'beginner' && stock.sector === 'Financial Services') {
        risks.push(`Complexity: Financial services stocks can be complex for beginner investors.`);
      }
      
      // Market cap risk
      if (companyData.marketCap && companyData.marketCap.includes('Small')) {
        risks.push(`Volatility: Small-cap stocks tend to be more volatile than larger companies.`);
      }
      
      return risks.length > 0 ? risks : [`Market volatility could affect this stock's performance.`];
    } catch (error) {
      console.error('Error generating personalized risks:', error);
      return [`Market volatility could affect this stock's performance.`];
    }
  }

  // Generate technical analysis
  async generateTechnicalAnalysis(stock, quoteData) {
    try {
      // Validate quote data
      if (!quoteData || !quoteData.price || quoteData.price <= 0) {
        console.warn(`Invalid quote data for ${stock.symbol}:`, quoteData);
        return `${stock.symbol} technical analysis unavailable due to missing price data.`;
      }
      
      const currentPrice = quoteData.price || 0;
      const change = quoteData.change || 0;
      const changePercent = quoteData.changePercent || 0;
      const high = quoteData.high || currentPrice;
      const low = quoteData.low || currentPrice;
      const open = quoteData.open || currentPrice;
      const volume = quoteData.volume || 0;
      
      // Calculate key technical indicators
      const dayRange = high - low;
      const dayRangePercent = currentPrice > 0 ? (dayRange / currentPrice) * 100 : 0;
      const isGapUp = open > (currentPrice - change);
      const isGapDown = open < (currentPrice - change);
      const isHighVolume = volume > 1000000; // 1M volume threshold
      const isSignificantMove = Math.abs(changePercent) > 2; // 2% threshold
      
      // Generate varied analysis style
      const analysisStyles = [
        'momentum_focused',
        'support_resistance',
        'volume_pattern',
        'trend_analysis',
        'volatility_assessment'
      ];
      const randomStyle = analysisStyles[Math.floor(Math.random() * analysisStyles.length)];
      
      // Generate varied technical patterns to mention
      const technicalPatterns = [
        'breakout potential', 'consolidation pattern', 'flag formation', 'support test',
        'resistance challenge', 'volume confirmation', 'momentum shift', 'price discovery'
      ];
      const randomPattern = technicalPatterns[Math.floor(Math.random() * technicalPatterns.length)];
      
      const prompt = `
        Generate a detailed technical analysis for ${stock.symbol} (Current: $${currentPrice.toFixed(2)}) using a ${randomStyle} approach.
        
        MARKET DATA:
        • Current Price: $${currentPrice.toFixed(2)}
        • Change: $${change.toFixed(2)} (${changePercent.toFixed(2)}%)
        • Day High: $${high.toFixed(2)} | Day Low: $${low.toFixed(2)}
        • Opening Price: $${open.toFixed(2)}
        • Intraday Range: $${dayRange.toFixed(2)} (${dayRangePercent.toFixed(1)}% volatility)
        • Volume: ${volume.toLocaleString()} shares
        
        TECHNICAL CONTEXT:
        • Price Momentum: ${changePercent >= 0 ? 'Bullish' : 'Bearish'} momentum with ${Math.abs(changePercent).toFixed(1)}% move
        • Gap Analysis: ${isGapUp ? 'Opening gap up from previous close' : isGapDown ? 'Opening gap down from previous close' : 'Continuous price action without gaps'}
        • Volume Profile: ${isHighVolume ? 'Above-average volume indicating institutional interest' : 'Standard volume levels'}
        • Volatility: ${dayRangePercent > 5 ? 'High intraday volatility suggesting strong sentiment' : dayRangePercent > 2 ? 'Moderate price swings within normal ranges' : 'Low volatility indicating consolidation'}
        
        ANALYSIS REQUIREMENTS:
        Write exactly 4-5 sentences covering:
        1. Immediate price action assessment with specific levels
        2. Technical pattern recognition (focus on: ${randomPattern})
        3. Volume interpretation and institutional signals
        4. Near-term price targets and key levels to watch
        5. Risk management considerations
        
        CRITICAL FORMATTING RULES:
        • Use formal, professional language - absolutely NO first person ("I", "we", "my")
        • Write as a professional analyst would for institutional clients
        • Include specific price levels and percentages
        • Mention concrete technical indicators (RSI zones, moving averages, etc.)
        • Vary your language - use different technical terms and structures
        • NO prefixes like "Analysis:", "Technical Analysis:", etc.
        • Return clean, readable text without formatting artifacts
        • Ensure each analysis is unique with different phrasing and focus
      `;

      try {
        const response = await groqService.generateText(prompt);
        const cleanedResponse = this.cleanText(response);
        
        if (cleanedResponse && cleanedResponse.length > 50) {
          console.log(`✅ Generated technical analysis for ${stock.symbol}:`, cleanedResponse.substring(0, 100) + '...');
          return cleanedResponse;
        }
      } catch (error) {
        console.warn(`LLM technical analysis failed for ${stock.symbol}:`, error.message);
      }
      
      // Enhanced fallback analysis if LLM response is too short or fails
      const trend = changePercent >= 0 ? 'bullish' : 'bearish';
      const momentum = Math.abs(changePercent) > 3 ? 'strong' : Math.abs(changePercent) > 1 ? 'moderate' : 'weak';
      const volumeDesc = isHighVolume ? 'on high volume' : 'on normal volume';
      const support = low.toFixed(2);
      const resistance = high.toFixed(2);
      const volatility = dayRangePercent > 5 ? 'high' : dayRangePercent > 2 ? 'moderate' : 'low';
      
      const fallbackAnalysis = `${stock.symbol} is showing ${momentum} ${trend} momentum ${volumeDesc}, currently trading at $${currentPrice.toFixed(2)}. Key support level is $${support} and resistance at $${resistance}. The stock has ${dayRangePercent.toFixed(1)}% intraday volatility, suggesting ${volatility} price action. Short-term outlook remains ${trend} with potential for continuation of the current trend.`;
      
      console.log(`📊 Using fallback technical analysis for ${stock.symbol}`);
      return fallbackAnalysis;
      
    } catch (error) {
      console.error('Error generating technical analysis:', error);
      
      // Fallback analysis
      const currentPrice = quoteData.price || 0;
      const changePercent = quoteData.changePercent || 0;
      const trend = changePercent >= 0 ? 'bullish' : 'bearish';
      
      return `${stock.symbol} is currently trading at $${currentPrice.toFixed(2)} with ${trend} momentum. Technical analysis unavailable at this time.`;
    }
  }

  // Get risk score from risk profile
  getRiskScore(riskProfile) {
    if (!riskProfile || !riskProfile.riskProfile) return 0.5;
    
    const scores = riskProfile.riskProfile;
    const avgScore = (scores.volatility + scores.timeHorizon + scores.liquidity + scores.knowledge + scores.ethics) / 5;
    return avgScore / 5; // Normalize to 0-1
  }

  // Get stock risk score
  getStockRiskScore(stock) {
    // Simple risk scoring based on sector and market cap
    const sectorRisk = {
      'Technology': 0.8,
      'Healthcare': 0.7,
      'Financial Services': 0.6,
      'Consumer Cyclical': 0.6,
      'Industrials': 0.5,
      'Consumer Defensive': 0.4,
      'Utilities': 0.3,
      'Energy': 0.7
    };
    
    return sectorRisk[stock.sector] || 0.5;
  }

  // Enhanced stock generation with personalized analysis and smart API management
  async generatePersonalizedStocks(user, maxStocks = 10) {
    try {
      this.userId = user.uid;
      console.log('🤖 Generating enhanced personalized stocks with smart API management...');
      
      // Load user context
      const contextLoaded = await this.loadUserContext();
      if (!contextLoaded) {
        throw new Error('Failed to load user context');
      }

      // Get user investment profile
      const investmentProfile = await this.getUserInvestmentProfile();
      
      // Create comprehensive exclusion list
      const excludedStocks = new Set([
        ...investmentProfile.rejectedStocks,
        ...investmentProfile.likedStocks,
        ...investmentProfile.portfolio.map(h => h.symbol),
        ...investmentProfile.watchlist.map(w => w.symbol)
      ]);
      
      // Also exclude stocks from userChoices (both liked and rejected)
      const userChoicesSnapshot = await getDocs(collection(db, 'users', this.userId, 'userChoices'));
      userChoicesSnapshot.forEach(doc => {
        const choiceData = doc.data();
        excludedStocks.add(choiceData.symbol);
      });
      
      console.log(`Excluding ${excludedStocks.size} existing stocks from recommendations`);
      
      // Get more recommendations to account for filtering
      const recommendations = await groqService.getRecommendations(maxStocks * 2, {
        riskProfile: this.riskProfile,
        userPreferences: this.userPreferences,
        rejectedStocks: Array.from(excludedStocks),
        likedStocks: investmentProfile.likedStocks,
        portfolioSectors: investmentProfile.portfolioSectors,
        investmentGoals: this.userProfile.investmentGoals
      });

      if (!recommendations || recommendations.length === 0) {
        throw new Error('No recommendations received from LLM service');
      }

      // Filter out excluded stocks and process recommendations
      const filteredRecommendations = recommendations.filter(rec => !excludedStocks.has(rec.symbol));
      console.log(`After filtering: ${filteredRecommendations.length} unique recommendations available`);

      // Process recommendations with smart API management
      const enhancedStocks = [];
      const symbolsToProcess = filteredRecommendations.slice(0, maxStocks).map(rec => rec.symbol);
      
      console.log(`Processing ${symbolsToProcess.length} symbols with smart caching...`);
      
      // Batch 1: Get all quotes first (most critical data)
      console.log('📊 Batch 1: Fetching stock quotes...');
      const quotes = [];
      const failedSymbols = [];
      
      // Process quotes sequentially to avoid overwhelming the API
      for (const symbol of symbolsToProcess) {
        try {
                console.log(`Fetching quote for ${symbol}...`);
       const quote = await getStockQuote(symbol);
       if (quote && quote.price > 0) {
         quotes.push(quote);
         console.log(`✅ Quote for ${symbol}: $${quote.price}`);
       } else {
         console.warn(`Invalid quote data for ${symbol}:`, quote);
         console.warn(`Skipping ${symbol} - no valid price data available`);
         failedSymbols.push(symbol);
       }
        } catch (error) {
          console.warn(`Failed to get quote for ${symbol}:`, error.message);
          failedSymbols.push(symbol);
          
          // If we hit rate limits, wait a bit before continuing
          if (error.message.includes('API_LIMIT_REACHED')) {
            console.log('Rate limit hit, waiting 2 seconds...');
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }
      
      console.log(`✅ Successfully fetched ${quotes.length}/${symbolsToProcess.length} quotes`);
      if (failedSymbols.length > 0) {
        console.log(`❌ Failed symbols: ${failedSymbols.join(', ')}`);
      }
      
      // Batch 2: Get company profiles (less critical, can use fallbacks)
      console.log('🏢 Batch 2: Fetching company profiles...');
      const profiles = [];
      
      for (const quote of quotes) {
        try {
          console.log(`Fetching profile for ${quote.symbol}...`);
          const profile = await getCompanyProfile(quote.symbol);
          profiles.push(profile);
        } catch (error) {
          console.warn(`Failed to get profile for ${quote.symbol}:`, error.message);
          // Return fallback profile
          profiles.push({
            symbol: quote.symbol,
            name: quote.symbol,
            sector: 'Unknown',
            industry: 'Unknown',
            marketCap: 'N/A',
            country: 'Unknown',
            currency: 'USD',
            exchange: 'Unknown',
            ipo: 'N/A',
            timestamp: Date.now()
          });
        }
      }
      
      console.log(`✅ Successfully fetched ${profiles.length} company profiles`);
      
      // Batch 3: Get financial data (least critical, use LLM fallback)
      console.log('💰 Batch 3: Fetching financial data...');
      const financials = [];
      
      for (const quote of quotes) {
        try {
          console.log(`Fetching financials for ${quote.symbol}...`);
          const financial = await getCompanyFinancialsEnhanced(quote.symbol);
          financials.push(financial);
        } catch (error) {
          console.warn(`Failed to get financials for ${quote.symbol}:`, error.message);
          // Return fallback financials
          financials.push({
            symbol: quote.symbol,
            peRatio: 'N/A',
            dividendYield: 'N/A',
            marketCap: 'N/A',
            source: 'fallback'
          });
        }
      }
      
      console.log(`✅ Successfully fetched ${financials.length} financial datasets`);
      
      // Now process each stock with the collected data
      console.log('🔧 Processing stocks with collected data...');
      for (let i = 0; i < quotes.length; i++) {
        try {
          const quote = quotes[i];
          const profile = profiles[i];
          const financial = financials[i];
          const rec = filteredRecommendations.find(r => r.symbol === quote.symbol);
          
          if (!rec) continue;
          
          // Generate LLM financial metrics if API data is not available
          let enhancedFinancialData = financial;
          if (financial.peRatio === 'N/A' && financial.dividendYield === 'N/A' && financial.marketCap === 'N/A') {
            if (profile.name && profile.sector) {
              try {
                console.log(`Generating LLM financial metrics for ${quote.symbol}`);
                enhancedFinancialData = await this.generateFinancialMetrics(quote.symbol, profile.name, profile.sector);
              } catch (error) {
                console.warn(`LLM financial generation failed for ${quote.symbol}:`, error.message);
                // Keep the fallback data
              }
            }
          }

          // Validate required data FIRST before generating any analysis
          if (!quote.price || quote.price <= 0) {
            console.warn(`Skipping ${rec.symbol} - invalid price: ${quote.price}`);
            continue;
          }
          
          if (!enhancedFinancialData.marketCap || enhancedFinancialData.marketCap === 'N/A') {
            console.warn(`Skipping ${rec.symbol} - missing market cap data`);
            continue;
          }

          // NOW generate analysis with validated data
          console.log(`✅ Data validated for ${rec.symbol} - generating analysis...`);
          const [personalizedAnalysis, technicalAnalysis] = await Promise.all([
            this.generatePersonalizedAnalysis(rec, quote, profile, enhancedFinancialData),
            this.generateTechnicalAnalysis(rec, quote)
          ]);
          
          console.log(`Technical analysis generated for ${rec.symbol}:`, technicalAnalysis?.substring(0, 100) + '...');

          const enhancedStock = {
            symbol: rec.symbol,
            name: profile.name || rec.symbol,
            price: quote.price,
            priceFormatted: `$${quote.price.toFixed(2)}`,
            change: quote.change,
            changePercent: quote.changePercent,
            sector: rec.sector || profile.sector,
            industry: rec.industry || profile.industry,
            marketCap: enhancedFinancialData.marketCap || profile.marketCap || 'N/A',
            peRatio: enhancedFinancialData.peRatio || 'N/A',
            dividendYield: enhancedFinancialData.dividendYield || 'N/A',
            riskLevel: rec.riskLevel || 'medium',
            confidence: this.calculateEnhancedConfidence(rec, quote, profile),
            reason: rec.reason || 'AI-generated recommendation',
            timestamp: Date.now(),
            generatedAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            
            // Enhanced personalized fields
            personalizationScore: personalizedAnalysis.personalizationScore,
            sectorDiversification: personalizedAnalysis.sectorDiversification,
            riskAlignment: personalizedAnalysis.riskAlignment,
            portfolioFit: personalizedAnalysis.portfolioFit,
            
            // Personalized content
            investmentThesis: personalizedAnalysis.investmentThesis,
            keyBenefits: personalizedAnalysis.keyBenefits,
            keyRisks: personalizedAnalysis.keyRisks,
            technicalAnalysis: technicalAnalysis,
            
            // User context
            userRiskTolerance: this.userProfile.riskTolerance,
            userTimeHorizon: this.userProfile.timeHorizon,
            userExperienceLevel: this.userProfile.experienceLevel,
            
            generatedAt: new Date().toISOString(),
            source: 'Enhanced LLM + Personalized Analysis'
          };

          enhancedStocks.push(enhancedStock);
          console.log(`✅ Processed ${quote.symbol} successfully`);
          
        } catch (error) {
          console.warn(`Failed to process stock ${quotes[i]?.symbol}:`, error.message);
        }
      }

      console.log(`🎉 Generated ${enhancedStocks.length} enhanced personalized stocks`);
      
      // If we don't have enough stocks, try to generate more with cached data
      if (enhancedStocks.length < maxStocks && filteredRecommendations.length > maxStocks) {
        console.log(`⚠️ Only generated ${enhancedStocks.length}/${maxStocks} stocks, attempting to generate more...`);
        
        const remainingSymbols = filteredRecommendations.slice(maxStocks, maxStocks * 2);
        for (const rec of remainingSymbols) {
          if (enhancedStocks.length >= maxStocks) break;
          
          try {
            // Use minimal data to create a basic stock recommendation
            const basicStock = {
              symbol: rec.symbol,
              name: rec.symbol,
              price: 0, // Will be updated later
              priceFormatted: '$0.00',
              change: 0,
              changePercent: 0,
              sector: rec.sector || 'Unknown',
              industry: rec.industry || 'Unknown',
              marketCap: 'N/A',
              peRatio: 'N/A',
              dividendYield: 'N/A',
              riskLevel: rec.riskLevel || 'medium',
              confidence: this.calculateEnhancedConfidence(rec, { price: 0 }, {}),
              reason: rec.reason || 'AI-generated recommendation',
              timestamp: Date.now(),
              generatedAt: new Date().toISOString(),
              lastUpdated: new Date().toISOString(),
              
              // Basic personalized fields
              personalizationScore: 0.5,
              sectorDiversification: 0.5,
              riskAlignment: 0.5,
              portfolioFit: 0.5,
              
              // Basic content
              investmentThesis: `Based on your ${this.userProfile.riskTolerance} risk tolerance, ${rec.symbol} could be a good addition to your portfolio.`,
              keyBenefits: ['Growth potential', 'Market opportunity'],
              keyRisks: ['Market volatility'],
              technicalAnalysis: 'Technical analysis will be available once price data is loaded.',
              
              // User context
              userRiskTolerance: this.userProfile.riskTolerance,
              userTimeHorizon: this.userProfile.timeHorizon,
              userExperienceLevel: this.userProfile.experienceLevel,
              
              generatedAt: new Date().toISOString(),
              source: 'Basic LLM + Fallback Data'
            };
            
            enhancedStocks.push(basicStock);
            console.log(`✅ Added basic stock ${rec.symbol} to reach target`);
            
          } catch (error) {
            console.warn(`Failed to add basic stock ${rec.symbol}:`, error.message);
          }
        }
      }
      
      return enhancedStocks;
    } catch (error) {
      console.error('Error generating enhanced personalized stocks:', error);
      throw error;
    }
  }

  // Calculate enhanced confidence score with more variability
  calculateEnhancedConfidence(rec, quoteData, companyData) {
    // Start with more varied base confidence (55-85% range)
    let baseConfidence = 0.55 + (Math.random() * 0.3); // 55-85% base range
    
    // Data quality adjustments
    let dataQualityBonus = 0;
    if (companyData.name && companyData.sector) dataQualityBonus += 0.08;
    if (quoteData.price > 0) dataQualityBonus += 0.08;
    if (companyData.marketCap && companyData.marketCap !== 'N/A') dataQualityBonus += 0.04;
    
    // Market conditions adjustment (simulate varying market confidence)
    const marketConditionsVariation = (Math.random() - 0.5) * 0.15; // ±7.5%
    
    // Sector-specific confidence adjustments
    let sectorAdjustment = 0;
    if (companyData.sector) {
      switch (companyData.sector.toLowerCase()) {
        case 'technology':
          sectorAdjustment = 0.05; // Higher confidence in tech analysis
          break;
        case 'healthcare':
        case 'biotech':
          sectorAdjustment = -0.03; // Slightly lower due to regulatory risks
          break;
        case 'financial':
          sectorAdjustment = 0.03; // Moderate confidence
          break;
        case 'energy':
          sectorAdjustment = -0.02; // Volatile sector
          break;
        default:
          sectorAdjustment = 0;
      }
    }
    
    // Price momentum confidence (higher confidence for stable price action)
    let momentumAdjustment = 0;
    if (quoteData.changePercent !== undefined) {
      const absChange = Math.abs(quoteData.changePercent);
      if (absChange < 2) {
        momentumAdjustment = 0.05; // Stable price action
      } else if (absChange > 5) {
        momentumAdjustment = -0.05; // Volatile price action
      }
    }
    
    // Calculate final confidence
    const totalConfidence = baseConfidence + dataQualityBonus + marketConditionsVariation + sectorAdjustment + momentumAdjustment;
    
    // Ensure realistic range (45-95%)
    const finalConfidence = Math.min(0.95, Math.max(0.45, totalConfidence));
    
    console.log(`Confidence calculation for ${rec.symbol || 'Unknown'}:`);
    console.log(`- Base: ${(baseConfidence * 100).toFixed(1)}%`);
    console.log(`- Data quality: +${(dataQualityBonus * 100).toFixed(1)}%`);
    console.log(`- Market conditions: ${marketConditionsVariation >= 0 ? '+' : ''}${(marketConditionsVariation * 100).toFixed(1)}%`);
    console.log(`- Sector adjustment: ${sectorAdjustment >= 0 ? '+' : ''}${(sectorAdjustment * 100).toFixed(1)}%`);
    console.log(`- Momentum adjustment: ${momentumAdjustment >= 0 ? '+' : ''}${(momentumAdjustment * 100).toFixed(1)}%`);
    console.log(`- Final confidence: ${(finalConfidence * 100).toFixed(1)}%`);
    
    return Math.round(finalConfidence * 100);
  }

  // Public method that components can call
  async generateEnhancedPersonalizedStocks(maxStocks = 6) {
    try {
      if (!this.userId) {
        throw new Error('User ID not set. Call setUserId() first.');
      }

      // Create a fake user object with the userId
      const user = { uid: this.userId };
      
      return await this.generatePersonalizedStocks(user, maxStocks);
    } catch (error) {
      console.error('Error in generateEnhancedPersonalizedStocks:', error);
      throw error;
    }
  }

  // Generate financial metrics using LLM when API data is unavailable
  async generateFinancialMetrics(symbol, companyName, sector) {
    try {
      const prompt = `
        Generate realistic financial metrics for ${symbol} (${companyName}) in the ${sector} sector.
        
        
        IMPORTANT GUIDELINES:
        - P/E ratio: 10-50 for most companies, 50-100 for high-growth tech, 5-15 for value stocks
        - Dividend yield: Use "0.0%" for companies that don't pay dividends (common in tech, biotech, growth stocks)
        - Use "N/A" only if dividend information is completely unavailable/unknown
        - Only use dividend yields > 0% for mature, established companies that actually pay dividends (utilities, REITs, some banks)
        - Market cap: VARY WIDELY based on company size and sector - don't use the same value for all companies
        
        Market Cap Guidelines by Company Type:
        - Mega-cap companies (Apple, Microsoft, Google): 1T-3T
        - Large-cap companies (established leaders): 50B-500B
        - Mid-cap companies (growing companies): 5B-50B
        - Small-cap companies (emerging companies): 500M-5B
        - Micro-cap companies (startups): 50M-500M
        
        Sector-specific Market Cap Examples:
        - Technology: 50B-3T (varies widely from startups to giants)
        - Healthcare/Biotech: 500M-500B (many small biotechs, some large pharma)
        - Financial: 10B-500B (banks and financial services)
        - Consumer: 5B-200B (retail and consumer goods)
        - Energy: 10B-300B (oil and energy companies)
        - Real Estate: 5B-100B (REITs and real estate companies)
        
        Sector-specific guidelines:
        - Technology: P/E 20-80, Dividend "0.0%" (most tech companies don't pay dividends), Market Cap varies
        - Healthcare/Biotech: P/E 15-40, Dividend "0.0%" (most don't pay dividends), Market Cap varies
        - Financial: P/E 10-25, Dividend 1-5% (banks pay dividends), Market Cap varies
        - Consumer: P/E 15-30, Dividend "0.0%" or 1-3% (many don't pay dividends), Market Cap varies
        - Energy: P/E 8-20, Dividend 2-8% (oil companies often pay dividends), Market Cap varies
        - Real Estate: P/E 10-25, Dividend 3-8% (REITs required to pay dividends), Market Cap varies
        
        CRITICAL RULES:
        - Return ONLY the JSON object, no other text
        - VARY the market cap values - don't use "150B" for every company
        - Use "0.0%" for dividend yield if the company type typically doesn't pay dividends
        - Be realistic - many modern companies (especially tech/growth) don't pay dividends, so "0.0%" is common
        - Never include price data
        - Ensure all fields are strings
        - Make each company's metrics unique and realistic
        
        Expected JSON format:
        {
          "peRatio": "25.4",
          "dividendYield": "0.0%",
          "marketCap": "45.2B"
        }
        
        CRITICAL REQUIREMENTS:
        - Market cap is MANDATORY - never return "N/A" for market cap
        - Market cap must be realistic for the company size and sector
        - Use specific values like "2.1B", "850M", "45.7B" - avoid generic numbers
        - Research the actual company if needed to provide realistic metrics
        
        IMPORTANT: 
        - Return ONLY the JSON object, no other text
        - Use realistic values based on the sector
        - Never include price data
        - Ensure all fields are strings
        - For dividend yield, use "0.0%" for non-dividend paying companies, "N/A" only if truly unknown
      `;
      
      const response = await groqService.generateText(prompt, 500);
      
      // Parse and clean the response
      let metrics;
      try {
        // Clean the response first
        let cleanedResponse = response.trim();
        
        // Remove any markdown formatting
        cleanedResponse = cleanedResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '');
        
        // Try to parse as JSON first
        metrics = JSON.parse(cleanedResponse);
      } catch (parseError) {
        console.log('Initial JSON parse failed, trying to extract JSON:', parseError.message);
        
        // If JSON parsing fails, try to extract JSON from the response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            metrics = JSON.parse(jsonMatch[0]);
          } catch (secondError) {
            console.log('JSON extraction also failed:', secondError.message);
            throw new Error('Could not parse LLM response as JSON');
          }
        } else {
          throw new Error('Could not parse LLM response as JSON');
        }
      }
      
      // Validate that we have required fields
      if (!metrics.marketCap || metrics.marketCap === 'N/A') {
        throw new Error('LLM failed to generate valid market cap');
      }

      return {
        symbol: symbol,
        peRatio: metrics.peRatio || 'N/A',
        dividendYield: metrics.dividendYield || '0.0%',
        marketCap: metrics.marketCap,
        source: 'LLM-generated'
      };
    } catch (error) {
      console.warn(`Failed to generate financial metrics for ${symbol}:`, error);
      
      // Generate a basic fallback market cap based on sector
      let fallbackMarketCap = '5.2B'; // Default mid-cap
      if (sector) {
        switch (sector.toLowerCase()) {
          case 'technology':
            fallbackMarketCap = '12.8B';
            break;
          case 'healthcare':
          case 'biotech':
            fallbackMarketCap = '3.5B';
            break;
          case 'financial':
            fallbackMarketCap = '15.2B';
            break;
          case 'energy':
            fallbackMarketCap = '8.9B';
            break;
          case 'real estate':
            fallbackMarketCap = '6.1B';
            break;
          default:
            fallbackMarketCap = '4.7B';
        }
      }
      
      return {
        symbol: symbol,
        peRatio: 'N/A',
        dividendYield: '0.0%',
        marketCap: fallbackMarketCap,
        source: 'fallback'
      };
    }
  }

  // Set user ID for the service
  setUserId(userId) {
    this.userId = userId;
    console.log(`StockGenerationService user ID set to: ${userId}`);
  }
}

export default new StockGenerationService_Enhanced();

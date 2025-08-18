// stockGenerationService_Enhanced.js - Enhanced Stock Generation with Personalized Analysis
import { doc, getDoc, setDoc, collection, getDocs, deleteDoc, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import groqService from './groqService';
import { getStockQuote, getCompanyProfile, getCompanyFinancials } from './finnhubService';

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
      const investmentProfile = await this.getUserInvestmentProfile();
      
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
      return 'Unable to generate personalized analysis at this time.';
    }
  }

  // Calculate sector diversification score
  calculateSectorDiversification(stockSector, portfolioSectors) {
    if (portfolioSectors.length === 0) return 1.0; // First investment
    
    const sectorCount = portfolioSectors.filter(sector => sector === stockSector).length;
    const totalHoldings = portfolioSectors.length;
    const sectorConcentration = sectorCount / totalHoldings;
    
    // Higher score for better diversification
    const score = Math.max(0, 1 - sectorConcentration);
    return isNaN(score) ? 0.5 : score;
  }

  // Calculate risk alignment with user profile
  calculateRiskAlignment(stock, riskProfile) {
    if (!riskProfile) return 0.5;

    const userRiskScore = this.getRiskScore(riskProfile);
    const stockRiskScore = this.getStockRiskScore(stock);
    
    // Calculate alignment (0-1, higher is better)
    const alignment = 1 - Math.abs(userRiskScore - stockRiskScore);
    const score = Math.max(0, Math.min(1, alignment));
    return isNaN(score) ? 0.5 : score;
  }

  // Calculate portfolio fit
  calculatePortfolioFit(stock, investmentProfile) {
    const { portfolio, totalInvested } = investmentProfile;
    
    if (portfolio.length === 0) return 1.0; // First investment
    
    // Check if user already has this stock
    const existingHolding = portfolio.find(h => h.symbol === stock.symbol);
    if (existingHolding) return 0.3; // Lower score for existing holdings
    
    // Calculate position size fit
    const avgPositionSize = totalInvested / portfolio.length;
    const stockValue = stock.price * 100; // Assuming 100 shares
    const sizeFit = Math.max(0, 1 - Math.abs(stockValue - avgPositionSize) / avgPositionSize);
    
    const score = isNaN(sizeFit) ? 0.5 : sizeFit;
    return Math.max(0, Math.min(1, score));
  }

  // Calculate overall personalization score
  calculatePersonalizationScore(stock, investmentProfile) {
    const sectorDiversification = this.calculateSectorDiversification(stock.sector, investmentProfile.portfolioSectors);
    const riskAlignment = this.calculateRiskAlignment(stock, this.riskProfile);
    const portfolioFit = this.calculatePortfolioFit(stock, investmentProfile);
    
    // Weighted average
    const score = (sectorDiversification * 0.3 + riskAlignment * 0.4 + portfolioFit * 0.3);
    return isNaN(score) ? 0.5 : Math.max(0, Math.min(1, score));
  }

  // Generate personalized investment thesis
  async generatePersonalizedThesis(stock, investmentProfile, quoteData, companyData) {
    try {
      const prompt = `
        Generate a personalized investment thesis for ${stock.symbol} (${companyData.name}) based on the following user profile:
        
        User Profile:
        - Risk Tolerance: ${this.userProfile.riskTolerance}
        - Time Horizon: ${this.userProfile.timeHorizon}
        - Experience Level: ${this.userProfile.experienceLevel}
        - Current Portfolio: ${investmentProfile.portfolio.length} holdings
        - Portfolio Sectors: ${investmentProfile.portfolioSectors.join(', ')}
        - Total Invested: $${investmentProfile.totalInvested.toFixed(2)}
        
        Stock Information:
        - Current Price: $${quoteData.price}
        - Market Cap: ${companyData.marketCap}
        - Sector: ${stock.sector}
        - Industry: ${stock.industry}
        
        Write a 2-3 sentence personalized investment thesis that explains why this stock would be a good fit for this specific user's portfolio and investment goals. Focus on diversification benefits, risk alignment, and portfolio fit.
      `;

      const response = await groqService.generateText(prompt);
      return response || `Based on your ${this.userProfile.riskTolerance} risk tolerance and ${this.userProfile.timeHorizon} time horizon, ${stock.symbol} could be a good addition to your portfolio.`;
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

  // Enhanced stock generation with personalized analysis
  async generatePersonalizedStocks(user, maxStocks = 6) {
    try {
      this.userId = user.uid;
      console.log('🤖 Generating enhanced personalized stocks...');
      
      // Load user context
      const contextLoaded = await this.loadUserContext();
      if (!contextLoaded) {
        throw new Error('Failed to load user context');
      }

      // Get user investment profile
      const investmentProfile = await this.getUserInvestmentProfile();
      
      // Get LLM recommendations
      const recommendations = await groqService.getRecommendations(maxStocks + 3, {
        riskProfile: this.riskProfile,
        userPreferences: this.userPreferences,
        rejectedStocks: investmentProfile.rejectedStocks,
        likedStocks: investmentProfile.likedStocks,
        portfolioSectors: investmentProfile.portfolioSectors,
        investmentGoals: this.userProfile.investmentGoals
      });

      if (!recommendations || recommendations.length === 0) {
        throw new Error('No stock recommendations generated');
      }

      // Process recommendations with enhanced data
      const enhancedStocks = [];
      for (const rec of recommendations.slice(0, maxStocks)) {
        try {
          const [quoteData, companyData, financialData] = await Promise.all([
            getStockQuote(rec.symbol),
            getCompanyProfile(rec.symbol),
            getCompanyFinancials(rec.symbol)
          ]);

          // Generate personalized analysis
          const personalizedAnalysis = await this.generatePersonalizedAnalysis(rec, quoteData, companyData, financialData);

          const enhancedStock = {
            symbol: rec.symbol,
            name: companyData.name || rec.symbol,
            price: quoteData.price,
            priceFormatted: `$${quoteData.price.toFixed(2)}`,
            change: quoteData.change,
            changePercent: quoteData.changePercent,
            sector: rec.sector || companyData.sector,
            industry: rec.industry || companyData.industry,
            marketCap: companyData.marketCap || 'N/A',
            peRatio: financialData.peRatio || 'N/A',
            dividendYield: financialData.dividendYield || 'N/A',
            riskLevel: rec.riskLevel || 'medium',
            confidence: this.calculateEnhancedConfidence(rec, quoteData, companyData),
            reason: rec.reason || 'AI-generated recommendation',
            timestamp: Date.now(),
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
            
            // User context
            userRiskTolerance: this.userProfile.riskTolerance,
            userTimeHorizon: this.userProfile.timeHorizon,
            userExperienceLevel: this.userProfile.experienceLevel,
            
            generatedAt: new Date().toISOString(),
            source: 'Enhanced LLM + Personalized Analysis'
          };

          enhancedStocks.push(enhancedStock);
        } catch (error) {
          console.warn(`Skipping ${rec.symbol} due to error:`, error.message);
        }
      }

      console.log(`Generated ${enhancedStocks.length} enhanced personalized stocks`);
      return enhancedStocks;
    } catch (error) {
      console.error('Error generating enhanced personalized stocks:', error);
      throw error;
    }
  }

  // Calculate enhanced confidence score
  calculateEnhancedConfidence(rec, quoteData, companyData) {
    let baseConfidence = parseFloat(rec.confidence) || 0.7;
    
    // Adjust based on data quality
    if (companyData.name && companyData.sector) baseConfidence += 0.1;
    if (quoteData.price > 0) baseConfidence += 0.1;
    
    return Math.min(1, Math.max(0, baseConfidence)) * 100;
  }
}

export default new StockGenerationService_Enhanced();

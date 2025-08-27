// portfolioPerformanceService.js - Portfolio Performance Tracking with Historical Data
import { db } from '../firebase';
import { doc, getDoc, setDoc, collection, addDoc, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { getMultipleQuotes } from './finnhubService';

class PortfolioPerformanceService {
  constructor() {
    this.userId = null;
    this.performanceCache = new Map();
    this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  }

  // Set user ID for the service
  setUserId(userId) {
    this.userId = userId;
  }

  // Get current portfolio holdings and calculate performance
  async getCurrentPortfolioData() {
    if (!this.userId) {
      console.error('User ID not set');
      return null;
    }

    try {
      // Get user's current holdings
      const portfolioRef = collection(db, 'users', this.userId, 'portfolio');
      const portfolioSnapshot = await getDocs(portfolioRef);
      
      const holdings = [];
      console.log('getCurrentPortfolioData: Processing portfolio snapshot with', portfolioSnapshot.size, 'documents');
      portfolioSnapshot.forEach(doc => {
        const data = doc.data();
        console.log('getCurrentPortfolioData: Processing document:', data.symbol, 'shares:', data.shares, 'sector:', data.sector);
        if (data.shares > 0) { // Only include actual holdings, not watchlist items
          holdings.push({
            id: doc.id,
            symbol: data.symbol,
            name: data.name,
            sector: data.sector || 'Unknown',
            industry: data.industry || 'Unknown',
            shares: parseFloat(data.shares) || 0,
            averagePrice: parseFloat(data.averagePrice) || 0,
            currentPrice: parseFloat(data.currentPrice) || 0,
            currentValue: parseFloat(data.currentValue) || 0,
            gain: parseFloat(data.gain) || 0,
            gainPercent: parseFloat(data.gainPercent) || 0
          });
        }
      });

      // Get user's cash balance
      const userDoc = await getDoc(doc(db, 'users', this.userId));
      const userData = userDoc.data();
      const cashBalance = parseFloat(userData?.cashBalance) || 0;

      console.log('getCurrentPortfolioData: Final holdings count:', holdings.length);
      console.log('getCurrentPortfolioData: Holdings with sectors:', holdings.map(h => ({ symbol: h.symbol, sector: h.sector, value: h.currentValue })));

      return { holdings, cashBalance };
    } catch (error) {
      console.error('Error getting current portfolio data:', error);
      return null;
    }
  }

  // Calculate current portfolio value and performance
  async calculateCurrentPerformance(holdings, cashBalance) {
    if (!holdings || holdings.length === 0) {
      return {
        totalValue: cashBalance,
        totalReturn: 0,
        totalReturnPercent: 0,
        dailyChange: 0,
        dailyChangePercent: 0,
        timestamp: new Date().toISOString()
      };
    }

    try {
      // Get current prices for all holdings
      const symbols = holdings.map(h => h.symbol);
      const quotes = await getMultipleQuotes(symbols);
      
      let totalValue = cashBalance;
      let totalCostBasis = 0;
      let previousTotalValue = 0;

      holdings.forEach(holding => {
        const quote = quotes.find(q => q.symbol === holding.symbol);
        if (quote) {
          const currentPrice = parseFloat(quote.currentPrice) || parseFloat(quote.price) || holding.currentPrice || 0;
          const shares = parseFloat(holding.shares) || 0;
          const averagePrice = parseFloat(holding.averagePrice) || 0;
          
          const currentValue = shares * currentPrice;
          const costBasis = shares * averagePrice;
          
          // Calculate previous value using change percent (for daily change calculation)
          const changePercent = parseFloat(quote.changePercent) || 0;
          const previousPrice = currentPrice / (1 + (changePercent / 100));
          const previousValue = shares * previousPrice;
          
          totalValue += currentValue;
          totalCostBasis += costBasis;
          previousTotalValue += previousValue;
        } else {
          // If no quote available, use existing data
          const currentValue = parseFloat(holding.currentValue) || 0;
          const costBasis = parseFloat(holding.shares) * parseFloat(holding.averagePrice) || 0;
          
          totalValue += currentValue;
          totalCostBasis += costBasis;
          previousTotalValue += currentValue; // No change data available
        }
      });

      // Calculate returns (equity only, excluding cash)
      const equityValue = totalValue - cashBalance;
      const totalReturn = equityValue - totalCostBasis;
      const totalReturnPercent = totalCostBasis > 0 ? (totalReturn / totalCostBasis) * 100 : 0;
      // Calculate daily change (equity only, excluding cash)
      const previousEquityValue = previousTotalValue;
      const currentEquityValue = totalValue - cashBalance;
      const dailyChange = currentEquityValue - previousEquityValue;
      const dailyChangePercent = previousEquityValue > 0 ? (dailyChange / previousEquityValue) * 100 : 0;

      console.log('Portfolio Performance Calculation:', {
        totalValue,
        equityValue,
        cashBalance,
        totalCostBasis,
        totalReturn,
        totalReturnPercent,
        dailyChange,
        dailyChangePercent
      });

      return {
        totalValue,
        totalReturn,
        totalReturnPercent,
        dailyChange,
        dailyChangePercent,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error calculating portfolio performance:', error);
      return {
        totalValue: cashBalance,
        totalReturn: 0,
        totalReturnPercent: 0,
        dailyChange: 0,
        dailyChangePercent: 0,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Save performance snapshot to Firebase
  async savePerformanceSnapshot(performanceData) {
    if (!this.userId) {
      console.error('User ID not set');
      return;
    }

    try {
      await addDoc(collection(db, 'users', this.userId, 'portfolioPerformance'), {
        ...performanceData,
        createdAt: new Date()
      });

      // Keep only last 365 days of data
      await this.cleanupOldData();
    } catch (error) {
      console.error('Error saving performance snapshot:', error);
    }
  }

  // Get historical performance data
  async getHistoricalPerformance(period = '1M') {
    if (!this.userId) {
      console.error('User ID not set');
      return [];
    }

    const cacheKey = `${this.userId}-${period}`;
    const cached = this.performanceCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    try {
      const days = this.getDaysForPeriod(period);
      const performanceRef = collection(db, 'users', this.userId, 'portfolioPerformance');
      const q = query(performanceRef, orderBy('createdAt', 'desc'), limit(days));
      const snapshot = await getDocs(q);

      const performanceData = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        performanceData.push({
          id: doc.id,
          totalValue: data.totalValue,
          totalReturn: data.totalReturn,
          totalReturnPercent: data.totalReturnPercent,
          dailyChange: data.dailyChange,
          dailyChangePercent: data.dailyChangePercent,
          timestamp: data.createdAt?.toDate() || new Date(data.timestamp)
        });
      });

      // Sort by timestamp ascending for chart
      performanceData.sort((a, b) => a.timestamp - b.timestamp);

      // Cache the result
      this.performanceCache.set(cacheKey, {
        data: performanceData,
        timestamp: Date.now()
      });

      return performanceData;
    } catch (error) {
      console.error('Error getting historical performance:', error);
      return [];
    }
  }

  // Get days for period
  getDaysForPeriod(period) {
    switch (period) {
      case '1D': return 1;
      case '1W': return 7;
      case '1M': return 30;
      case '3M': return 90;
      case '6M': return 180;
      case '1Y': return 365;
      case 'ALL': return 1000; // Get all available data
      default: return 30;
    }
  }

  // Cleanup old performance data (keep last 365 days)
  async cleanupOldData() {
    if (!this.userId) return;

    try {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      const performanceRef = collection(db, 'users', this.userId, 'portfolioPerformance');
      const q = query(performanceRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);

      const deletePromises = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.createdAt && data.createdAt.toDate() < oneYearAgo) {
          deletePromises.push(doc.ref.delete());
        }
      });

      if (deletePromises.length > 0) {
        await Promise.all(deletePromises);
        console.log(`Cleaned up ${deletePromises.length} old performance records`);
      }
    } catch (error) {
      console.error('Error cleaning up old performance data:', error);
    }
  }

  // Get portfolio performance with historical data
  async getPortfolioPerformance(userId) {
    try {
      this.setUserId(userId);
      
      // Get current performance summary
      const performanceSummary = await this.getPerformanceSummary();
      
      // Get historical data for chart
      let historicalData = [];
      try {
        historicalData = await this.getHistoricalPerformance('1M');
      } catch (error) {
        console.warn('Could not load historical data:', error);
        // Create a simple historical entry from current data
        if (performanceSummary.currentValue > 0) {
          const currentDate = new Date().toISOString();
          historicalData = [{
            totalValue: performanceSummary.currentValue,
            date: currentDate,
            timestamp: currentDate
          }];
        }
      }
      
      // Ensure we have valid data
      const result = {
        currentValue: performanceSummary.currentValue || 0,
        totalReturn: performanceSummary.totalReturn || 0,
        totalReturnPercent: performanceSummary.totalReturnPercent || 0,
        dailyChange: performanceSummary.dailyChange || 0,
        dailyChangePercent: performanceSummary.dailyChangePercent || 0,
        cashBalance: performanceSummary.cashBalance || 0,
        holdingsCount: performanceSummary.holdingsCount || 0,
        sectorCount: performanceSummary.sectorCount || 0,
        bestPerformer: performanceSummary.bestPerformer || 'N/A',
        portfolioHistory: historicalData || []
      };
      
      console.log('Portfolio performance data:', result);
      return result;
    } catch (error) {
      console.error('Error getting portfolio performance:', error);
      return {
        currentValue: 0,
        totalReturn: 0,
        totalReturnPercent: 0,
        dailyChange: 0,
        dailyChangePercent: 0,
        cashBalance: 0,
        holdingsCount: 0,
        sectorCount: 0,
        bestPerformer: 'N/A',
        portfolioHistory: []
      };
    }
  }

  // Get performance summary - FIXED to use current holdings
  async getPerformanceSummary() {
    try {
      // Get current portfolio data
      const portfolioData = await this.getCurrentPortfolioData();
      if (!portfolioData) {
        return {
          currentValue: 0,
          totalReturn: 0,
          totalReturnPercent: 0,
          dailyChange: 0,
          dailyChangePercent: 0,
          cashBalance: 0,
          holdingsCount: 0,
          sectorCount: 0,
          bestPerformer: 'N/A'
        };
      }

      const { holdings, cashBalance } = portfolioData;
      
      // Calculate current performance
      const performance = await this.calculateCurrentPerformance(holdings, cashBalance);
      
      // Calculate additional metrics
      const holdingsCount = holdings.length;
      const sectors = [...new Set(holdings.map(h => h.sector).filter(Boolean))];
      const sectorCount = sectors.length;
      
      // Find best performer
      let bestPerformer = 'N/A';
      let bestGainPercent = -Infinity;
      holdings.forEach(holding => {
        if (holding.gainPercent > bestGainPercent) {
          bestGainPercent = holding.gainPercent;
          bestPerformer = holding.symbol;
        }
      });

      return {
        currentValue: performance.totalValue,
        totalReturn: performance.totalReturn,
        totalReturnPercent: performance.totalReturnPercent,
        dailyChange: performance.dailyChange,
        dailyChangePercent: performance.dailyChangePercent,
        cashBalance: cashBalance,
        holdingsCount: holdingsCount,
        sectorCount: sectorCount,
        bestPerformer: bestPerformer
      };
    } catch (error) {
      console.error('Error getting performance summary:', error);
      return {
        currentValue: 0,
        totalReturn: 0,
        totalReturnPercent: 0,
        dailyChange: 0,
        dailyChangePercent: 0,
        cashBalance: 0,
        holdingsCount: 0,
        sectorCount: 0,
        bestPerformer: 'N/A'
      };
    }
  }

  // Generate chart data for portfolio performance
  async getChartData(period = '1M') {
    const performanceData = await this.getHistoricalPerformance(period);
    
    if (performanceData.length === 0) {
      return {
        values: [],
        timestamps: [],
        returns: [],
        period
      };
    }

    return {
      values: performanceData.map(p => p.totalValue),
      timestamps: performanceData.map(p => p.timestamp),
      returns: performanceData.map(p => p.totalReturn),
      period
    };
  }

  // Update portfolio performance (called after trades)
  async updatePerformance(holdings, cashBalance) {
    const performance = await this.calculateCurrentPerformance(holdings, cashBalance);
    await this.savePerformanceSnapshot(performance);
    return performance;
  }

  // Get sector holdings data for pie chart
  async getSectorHoldings() {
    try {
      console.log('getSectorHoldings: Starting...');
      const portfolioData = await this.getCurrentPortfolioData();
      console.log('getSectorHoldings: Portfolio data:', portfolioData);
      
      if (!portfolioData || !portfolioData.holdings) {
        console.log('getSectorHoldings: No portfolio data or holdings');
        return [];
      }

      const { holdings } = portfolioData;
      
      // Group holdings by sector and calculate total value
      const sectorMap = new Map();
      
      console.log('getSectorHoldings: Processing holdings:', holdings.length);
      holdings.forEach(holding => {
        const sector = holding.sector || 'Unknown';
        const currentValue = parseFloat(holding.currentValue) || 0;
        console.log(`getSectorHoldings: Processing ${holding.symbol} - Sector: ${sector}, Value: ${currentValue}`);
        
        if (sectorMap.has(sector)) {
          sectorMap.set(sector, sectorMap.get(sector) + currentValue);
        } else {
          sectorMap.set(sector, currentValue);
        }
      });

      // Convert to array and sort by value
      const sectorData = Array.from(sectorMap.entries())
        .map(([sector, value]) => ({
          sector,
          value,
          percentage: 0 // Will be calculated below
        }))
        .filter(item => item.value > 0)
        .sort((a, b) => b.value - a.value);

      // Calculate percentages
      const totalValue = sectorData.reduce((sum, item) => sum + item.value, 0);
      sectorData.forEach(item => {
        item.percentage = totalValue > 0 ? (item.value / totalValue) * 100 : 0;
      });

      console.log('Sector holdings data:', sectorData);
      return sectorData;
    } catch (error) {
      console.error('Error getting sector holdings:', error);
      return [];
    }
  }

  // Clear cache
  clearCache() {
    this.performanceCache.clear();
  }
}

export default new PortfolioPerformanceService();

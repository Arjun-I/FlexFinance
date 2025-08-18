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
      let totalCost = 0;
      let previousValue = 0;

      holdings.forEach(holding => {
        const quote = quotes.find(q => q.symbol === holding.symbol);
        if (quote) {
          const currentValue = holding.shares * quote.currentPrice;
          const costBasis = holding.shares * holding.averagePrice;
          
          totalValue += currentValue;
          totalCost += costBasis;
          previousValue += holding.shares * (holding.currentPrice || holding.averagePrice);
        }
      });

      const totalReturn = totalValue - totalCost;
      const totalReturnPercent = totalCost > 0 ? (totalReturn / totalCost) * 100 : 0;
      const dailyChange = totalValue - previousValue;
      const dailyChangePercent = previousValue > 0 ? (dailyChange / previousValue) * 100 : 0;

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

  // Get performance summary
  async getPerformanceSummary() {
    const performanceData = await this.getHistoricalPerformance('1M');
    
    if (performanceData.length === 0) {
      return {
        currentValue: 0,
        totalReturn: 0,
        totalReturnPercent: 0,
        bestDay: 0,
        worstDay: 0,
        volatility: 0
      };
    }

    const current = performanceData[performanceData.length - 1];
    const first = performanceData[0];
    
    // Calculate daily changes
    const dailyChanges = [];
    for (let i = 1; i < performanceData.length; i++) {
      const change = performanceData[i].totalValue - performanceData[i - 1].totalValue;
      dailyChanges.push(change);
    }

    const bestDay = Math.max(...dailyChanges);
    const worstDay = Math.min(...dailyChanges);
    
    // Calculate volatility (standard deviation of daily returns)
    const mean = dailyChanges.reduce((sum, change) => sum + change, 0) / dailyChanges.length;
    const variance = dailyChanges.reduce((sum, change) => sum + Math.pow(change - mean, 2), 0) / dailyChanges.length;
    const volatility = Math.sqrt(variance);

    return {
      currentValue: current.totalValue,
      totalReturn: current.totalReturn,
      totalReturnPercent: current.totalReturnPercent,
      bestDay,
      worstDay,
      volatility
    };
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

  // Clear cache
  clearCache() {
    this.performanceCache.clear();
  }
}

export default new PortfolioPerformanceService();

// yahooFinanceService.js - Free Yahoo Finance API Integration
import Constants from 'expo-constants';
import smartRateLimiter from './smartRateLimiter';

class YahooFinanceService {
  constructor() {
    this.baseUrl = 'https://query1.finance.yahoo.com/v8/finance';
  }

  // Check rate limits with smart limiter
  async checkRateLimit(userId = 'anonymous', portfolioSize = 0) {
    const canCall = await smartRateLimiter.canMakeCall(userId, portfolioSize);
    if (!canCall.canCall) {
      throw new Error(canCall.reason);
    }
    smartRateLimiter.recordCall(userId, portfolioSize);
  }

  // Get real-time stock quote
  async getStockQuote(symbol, userId = 'anonymous', portfolioSize = 0) {
    await this.checkRateLimit(userId, portfolioSize);

    try {
      const url = `${this.baseUrl}/chart/${symbol.toUpperCase()}?interval=1d&range=1d`;
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
      console.error(`Error fetching quote for ${symbol}:`, error);
      throw error;
    }
  }

  // Get detailed stock overview
  async getStockOverview(symbol, userId = 'anonymous', portfolioSize = 0) {
    await this.checkRateLimit(userId, portfolioSize);

    try {
      const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol.toUpperCase()}?modules=summaryDetail,financialData,defaultKeyStatistics`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const summary = data.quoteSummary.result[0];
      const summaryDetail = summary.summaryDetail;
      const financialData = summary.financialData;
      const defaultKeyStatistics = summary.defaultKeyStatistics;

      return {
        symbol: symbol.toUpperCase(),
        name: symbol.toUpperCase(), // Yahoo doesn't provide name in this endpoint
        marketCap: summaryDetail?.marketCap ? `${(summaryDetail.marketCap / 1e9).toFixed(2)}B` : 'N/A',
        peRatio: financialData?.forwardPE ? financialData.forwardPE.toFixed(2) : 'N/A',
        dividendYield: summaryDetail?.dividendYield ? `${(summaryDetail.dividendYield * 100).toFixed(2)}%` : 'N/A',
        beta: defaultKeyStatistics?.beta ? defaultKeyStatistics.beta.toFixed(2) : 'N/A',
        sector: 'N/A', // Would need additional API call
        industry: 'N/A', // Would need additional API call
        description: 'Stock data from Yahoo Finance',
      };
    } catch (error) {
      console.error(`Error fetching overview for ${symbol}:`, error);
      throw error;
    }
  }

  // Get multiple quotes efficiently
  async getMultipleQuotes(symbols, userId = 'anonymous', portfolioSize = 0) {
    await this.checkRateLimit(userId, portfolioSize);

    try {
      const symbolList = symbols.map(s => s.toUpperCase()).join(',');
      const url = `${this.baseUrl}/chart/${symbolList}?interval=1d&range=1d`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const results = data.chart.result;

      return results.map((result, index) => {
        const quote = result.indicators.quote[0];
        const timestamp = result.timestamp[result.timestamp.length - 1];
        const close = quote.close[quote.close.length - 1];
        const open = quote.open[quote.open.length - 1];
        const change = close - open;
        const changePercent = (change / open) * 100;

        return {
          symbol: symbols[index].toUpperCase(),
          price: close,
          change: change,
          changePercent: `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`,
          timestamp: new Date(timestamp * 1000).toISOString(),
        };
      });
    } catch (error) {
      console.error('Error fetching multiple quotes:', error);
      throw error;
    }
  }

  // Calculate portfolio value
  async getPortfolioValue(holdings, userId = 'anonymous') {
    try {
      if (holdings.length === 0) {
        return { totalValue: 0, holdings: [], errors: [] };
      }

      const symbols = holdings.map(h => h.symbol);
      const quotes = await this.getMultipleQuotes(symbols, userId, holdings.length);
      const errors = [];
      const updatedHoldings = [];

      let totalValue = 0;

      holdings.forEach(holding => {
        const quote = quotes.find(q => q.symbol === holding.symbol);
        
        if (quote && quote.price) {
          const currentValue = holding.shares * quote.price;
          totalValue += currentValue;
          
          updatedHoldings.push({
            ...holding,
            currentPrice: quote.price,
            currentValue: currentValue,
            change: quote.change,
            changePercent: quote.changePercent,
          });
        } else {
          errors.push(`Failed to get price for ${holding.symbol}`);
          // Use last known price if available
          const currentValue = holding.shares * (holding.averagePrice || 0);
          totalValue += currentValue;
          
          updatedHoldings.push({
            ...holding,
            currentPrice: holding.averagePrice || 0,
            currentValue: currentValue,
            change: 0,
            changePercent: '0.00%',
          });
        }
      });

      return {
        totalValue,
        holdings: updatedHoldings,
        errors,
      };
    } catch (error) {
      console.error('Error calculating portfolio value:', error);
      return {
        totalValue: 0,
        holdings: holdings.map(h => ({ ...h, currentPrice: h.averagePrice || 0, currentValue: h.shares * (h.averagePrice || 0) })),
        errors: [error.message],
      };
    }
  }

  // Search for stocks
  async searchStocks(keywords, userId = 'anonymous', portfolioSize = 0) {
    await this.checkRateLimit(userId, portfolioSize);

    try {
      const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(keywords)}&quotesCount=10&newsCount=0`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.quotes.map(quote => ({
        symbol: quote.symbol,
        name: quote.shortname || quote.longname,
        exchange: quote.exchange,
        type: quote.quoteType,
      }));
    } catch (error) {
      console.error('Error searching stocks:', error);
      throw error;
    }
  }
}

export default new YahooFinanceService(); 
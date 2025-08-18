// chartDataService.js - Real stock chart data with caching and fallbacks
import { getStockHistory } from './finnhubService';

// Chart data cache
const chartCache = new Map();
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

// Fallback data generator for offline mode
const generateFallbackData = (symbol, period) => {
  const dataPoints = getDataPointsForPeriod(period);
  const data = [];
  
  // Generate realistic price movements based on symbol
  let basePrice = getBasePriceForSymbol(symbol);
  const volatility = getVolatilityForPeriod(period);
  
  for (let i = 0; i < dataPoints; i++) {
    // Use a more realistic random walk with trend
    const trend = Math.sin(i / dataPoints * Math.PI) * 0.01; // Slight trend
    const random = (Math.random() - 0.5) * volatility;
    const change = trend + random;
    basePrice = Math.max(basePrice * (1 + change), 1);
    data.push(parseFloat(basePrice.toFixed(2)));
  }

  return {
    prices: data,
    timestamps: generateTimestamps(period, dataPoints),
    period,
    symbol
  };
};

const getDataPointsForPeriod = (period) => {
  switch (period) {
    case '1D': return 24; // Hourly data
    case '1W': return 7;  // Daily data
    case '1M': return 30; // Daily data
    case '3M': return 90; // Daily data
    case '1Y': return 365; // Daily data
    default: return 30;
  }
};

const getBasePriceForSymbol = (symbol) => {
  // Realistic base prices for common stocks
  const basePrices = {
    'AAPL': 150, 'MSFT': 300, 'GOOGL': 2500, 'AMZN': 3000,
    'TSLA': 200, 'META': 300, 'NVDA': 400, 'NFLX': 500,
    'PG': 150, 'JNJ': 160, 'VZ': 40, 'MCD': 250,
    'PEP': 180, 'PFE': 30, 'MMM': 100
  };
  return basePrices[symbol] || 100 + Math.random() * 200;
};

const getVolatilityForPeriod = (period) => {
  switch (period) {
    case '1D': return 0.005; // 0.5% hourly volatility
    case '1W': return 0.02;  // 2% daily volatility
    case '1M': return 0.025; // 2.5% daily volatility
    case '3M': return 0.03;  // 3% daily volatility
    case '1Y': return 0.035; // 3.5% daily volatility
    default: return 0.02;
  }
};

const generateTimestamps = (period, dataPoints) => {
  const timestamps = [];
  const now = new Date();
  
  for (let i = dataPoints - 1; i >= 0; i--) {
    const timestamp = new Date(now);
    
    switch (period) {
      case '1D':
        timestamp.setHours(now.getHours() - i);
        break;
      case '1W':
      case '1M':
      case '3M':
      case '1Y':
        timestamp.setDate(now.getDate() - i);
        break;
    }
    
    timestamps.unshift(timestamp);
  }
  
  return timestamps;
};

// Get cached chart data
const getCachedChartData = (symbol, period) => {
  const key = `${symbol}-${period}`;
  const cached = chartCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
};

// Set cached chart data
const setCachedChartData = (symbol, period, data) => {
  const key = `${symbol}-${period}`;
  chartCache.set(key, {
    data,
    timestamp: Date.now()
  });
  
  // Limit cache size
  if (chartCache.size > 100) {
    const firstKey = chartCache.keys().next().value;
    chartCache.delete(firstKey);
  }
};

// Main function to get chart data
export const getChartData = async (symbol, period = '1M') => {
  if (!symbol) {
    throw new Error('Symbol is required');
  }

  // Check cache first
  const cached = getCachedChartData(symbol, period);
  if (cached) {
    return cached;
  }

  try {
    // Try to get real data from Finnhub
    const realData = await getStockHistory(symbol, period);
    
    if (realData && realData.length > 0) {
      const chartData = {
        prices: realData.map(d => d.close || d.price),
        timestamps: realData.map(d => new Date(d.timestamp * 1000)),
        period,
        symbol,
        isRealData: true
      };
      
      setCachedChartData(symbol, period, chartData);
      return chartData;
    }
  } catch (error) {
    console.log(`Could not fetch real data for ${symbol}:`, error.message);
  }

  // Fallback to generated data
  const fallbackData = generateFallbackData(symbol, period);
  setCachedChartData(symbol, period, fallbackData);
  return fallbackData;
};

// Get multiple symbols chart data
export const getMultipleChartData = async (symbols, period = '1M') => {
  const promises = symbols.map(symbol => 
    getChartData(symbol, period).catch(error => {
      console.log(`Error getting chart data for ${symbol}:`, error);
      return null;
    })
  );
  
  const results = await Promise.allSettled(promises);
  return results
    .map((result, index) => result.status === 'fulfilled' ? result.value : null)
    .filter(Boolean);
};

// Clear cache
export const clearChartCache = () => {
  chartCache.clear();
};

// Get cache stats
export const getChartCacheStats = () => {
  return {
    size: chartCache.size,
    keys: Array.from(chartCache.keys())
  };
};

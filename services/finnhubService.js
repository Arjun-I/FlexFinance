// finnhubService.js - Official Finnhub Client Integration
import Finnhub from 'finnhub';
import Constants from 'expo-constants';

// Get API key from environment
const extra = Constants.expoConfig?.extra || Constants.manifest?.extra;
const FINNHUB_API_KEY = extra?.EXPO_PUBLIC_FINNHUB_API_KEY || process.env.EXPO_PUBLIC_FINNHUB_API_KEY;

// Initialize Finnhub client
const finnhubClient = new Finnhub.DefaultApi(FINNHUB_API_KEY);

console.log('🔑 Finnhub Client Status:', {
  hasKey: !!FINNHUB_API_KEY,
  keyLength: FINNHUB_API_KEY ? FINNHUB_API_KEY.length : 0,
  fromExtra: !!extra?.EXPO_PUBLIC_FINNHUB_API_KEY,
  fromEnv: !!process.env.EXPO_PUBLIC_FINNHUB_API_KEY
});

// Get real-time stock quote
export const getStockQuote = async (symbol) => {
  try {
    console.log(`📊 Fetching quote for ${symbol}...`);
    
    if (!FINNHUB_API_KEY) {
      throw new Error('Finnhub API key not configured');
    }

    return new Promise((resolve, reject) => {
      finnhubClient.quote(symbol, (error, data, response) => {
        if (error) {
          console.error(`❌ Finnhub quote error for ${symbol}:`, error);
          reject(error);
          return;
        }

        console.log(`✅ Quote received for ${symbol}:`, data);
        
        if (!data.c || data.c === 0) {
          console.warn(`⚠️ No price data for ${symbol}`);
          reject(new Error(`No price data available for ${symbol}`));
          return;
        }

        const result = {
          symbol: symbol.toUpperCase(),
          price: data.c,
          change: data.d,
          changePercent: `${data.dp >= 0 ? '+' : ''}${data.dp.toFixed(2)}%`,
          high: data.h,
          low: data.l,
          open: data.o,
          previousClose: data.pc,
          timestamp: new Date().toISOString(),
          volume: data.v || 0
        };

        console.log(`✅ Processed quote for ${symbol}:`, result);
        resolve(result);
      });
    });
  } catch (error) {
    console.error(`❌ Error fetching quote for ${symbol}:`, error);
    throw error;
  }
};

// Get company profile
export const getCompanyProfile = async (symbol) => {
  try {
    console.log(`🏢 Fetching profile for ${symbol}...`);
    
    if (!FINNHUB_API_KEY) {
      throw new Error('Finnhub API key not configured');
    }

    return new Promise((resolve, reject) => {
      finnhubClient.companyProfile2({ symbol: symbol }, (error, data, response) => {
        if (error) {
          console.error(`❌ Finnhub profile error for ${symbol}:`, error);
          reject(error);
          return;
        }

        console.log(`✅ Profile received for ${symbol}:`, data);
        
        if (!data.name) {
          console.warn(`⚠️ No company data for ${symbol}`);
          reject(new Error(`No company data available for ${symbol}`));
          return;
        }

        const result = {
          symbol: symbol.toUpperCase(),
          name: data.name,
          country: data.country || 'US',
          currency: data.currency || 'USD',
          exchange: data.exchange || 'NASDAQ',
          ipo: data.ipo || 'N/A',
          marketCapitalization: data.marketCapitalization || null,
          phone: data.phone || 'N/A',
          shareOutstanding: data.shareOutstanding || 0,
          weburl: data.weburl || `https://finance.yahoo.com/quote/${symbol.toUpperCase()}`,
          logo: data.logo || null,
          finnhubIndustry: data.finnhubIndustry || 'Technology'
        };

        console.log(`✅ Processed profile for ${symbol}:`, result);
        resolve(result);
      });
    });
  } catch (error) {
    console.error(`❌ Error fetching profile for ${symbol}:`, error);
    throw error;
  }
};

// Get multiple quotes at once
export const getMultipleQuotes = async (symbols) => {
  try {
    console.log(`📊 Fetching multiple quotes for:`, symbols);
    
    const promises = symbols.map(symbol => 
      getStockQuote(symbol).catch(error => {
        console.warn(`⚠️ Failed to fetch ${symbol}:`, error.message);
        return null;
      })
    );

    const results = await Promise.all(promises);
    const validResults = results.filter(result => result !== null);
    
    console.log(`✅ Fetched ${validResults.length}/${symbols.length} quotes`);
    return validResults;
  } catch (error) {
    console.error(`❌ Error fetching multiple quotes:`, error);
    throw error;
  }
};

// Get company financials
export const getCompanyFinancials = async (symbol) => {
  try {
    console.log(`💰 Fetching financials for ${symbol}...`);
    
    if (!FINNHUB_API_KEY) {
      throw new Error('Finnhub API key not configured');
    }

    return new Promise((resolve, reject) => {
      finnhubClient.companyBasicFinancials(symbol, 'annual', (error, data, response) => {
        if (error) {
          console.error(`❌ Finnhub financials error for ${symbol}:`, error);
          reject(error);
          return;
        }

        console.log(`✅ Financials received for ${symbol}:`, data);
        resolve(data);
      });
    });
  } catch (error) {
    console.error(`❌ Error fetching financials for ${symbol}:`, error);
    throw error;
  }
};

// Test function to verify API connection
export const testFinnhubConnection = async () => {
  try {
    console.log('🧪 Testing Finnhub connection...');
    
    if (!FINNHUB_API_KEY) {
      throw new Error('Finnhub API key not configured');
    }

    const testQuote = await getStockQuote('AAPL');
    console.log('✅ Finnhub connection test successful:', testQuote);
    return true;
  } catch (error) {
    console.error('❌ Finnhub connection test failed:', error);
    return false;
  }
}; 
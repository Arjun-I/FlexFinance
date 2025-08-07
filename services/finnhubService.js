// finnhubService.js - Finnhub REST integration for React Native
import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra || Constants.manifest?.extra;
const FINNHUB_API_KEY = extra?.EXPO_PUBLIC_FINNHUB_API_KEY || process.env.EXPO_PUBLIC_FINNHUB_API_KEY;
const FINNHUB_BASE = 'https://finnhub.io/api/v1';

const ensureKey = () => {
  if (!FINNHUB_API_KEY) {
    throw new Error('Finnhub API key not configured');
  }
};

const getJson = async (url) => {
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Finnhub HTTP ${res.status}: ${text}`);
  }
  return res.json();
};

export const getStockQuote = async (symbol) => {
  ensureKey();
  const sym = (symbol || '').toUpperCase().trim();
  const data = await getJson(`${FINNHUB_BASE}/quote?symbol=${encodeURIComponent(sym)}&token=${encodeURIComponent(FINNHUB_API_KEY)}`);
  if (!data?.c || data.c === 0) throw new Error(`No price data for ${sym}`);
  return {
    symbol: sym,
    price: data.c,
    change: data.d,
    changePercent: `${data.dp >= 0 ? '+' : ''}${Number(data.dp).toFixed(2)}%`,
    high: data.h,
    low: data.l,
    open: data.o,
    previousClose: data.pc,
    timestamp: new Date().toISOString(),
    volume: data.v || 0,
  };
};

export const getCompanyProfile = async (symbol) => {
  ensureKey();
  const sym = (symbol || '').toUpperCase().trim();
  const data = await getJson(`${FINNHUB_BASE}/stock/profile2?symbol=${encodeURIComponent(sym)}&token=${encodeURIComponent(FINNHUB_API_KEY)}`);
  if (!data?.name) throw new Error(`No company data for ${sym}`);
  return {
    symbol: sym,
    name: data.name,
    country: data.country || 'US',
    currency: data.currency || 'USD',
    exchange: data.exchange || 'NASDAQ',
    ipo: data.ipo || 'N/A',
    marketCapitalization: data.marketCapitalization || null,
    phone: data.phone || 'N/A',
    shareOutstanding: data.shareOutstanding || 0,
    weburl: data.weburl || `https://finance.yahoo.com/quote/${sym}`,
    logo: data.logo || null,
    finnhubIndustry: data.finnhubIndustry || 'Technology',
  };
};

export const getMultipleQuotes = async (symbols) => {
  ensureKey();
  const unique = Array.from(new Set((symbols || []).map(s => (s || '').toUpperCase().trim()))).filter(Boolean);
  const results = await Promise.all(
    unique.map(sym => getStockQuote(sym).catch(() => null))
  );
  return results.filter(Boolean);
};

export const getCompanyFinancials = async (symbol) => {
  ensureKey();
  const sym = (symbol || '').toUpperCase().trim();
  return getJson(`${FINNHUB_BASE}/stock/metric?symbol=${encodeURIComponent(sym)}&metric=all&token=${encodeURIComponent(FINNHUB_API_KEY)}`);
};

export const testFinnhubConnection = async () => {
  try {
    await getStockQuote('AAPL');
    return true;
  } catch (e) {
    return false;
  }
}; 
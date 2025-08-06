import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra || Constants.manifest?.extra;
const API_KEY = process.env.EXPO_PUBLIC_ALPHA_VANTAGE_KEY || extra?.EXPO_PUBLIC_ALPHA_VANTAGE_KEY;

/**
 * Fetch detailed stock information for a given symbol.
 * @param {string} symbol - Ticker symbol, e.g. "AAPL".
 * @returns {Promise<object>} Object containing stock details.
 */
export async function getStockDetails(symbol) {
  if (!API_KEY) {
    throw new Error('Missing EXPO_PUBLIC_ALPHA_VANTAGE_KEY');
  }
  const overviewUrl = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${encodeURIComponent(symbol)}&apikey=${API_KEY}`;
  const quoteUrl = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${API_KEY}`;

  const [overviewRes, quoteRes] = await Promise.all([
    fetch(overviewUrl),
    fetch(quoteUrl)
  ]);

  if (!overviewRes.ok || !quoteRes.ok) {
    throw new Error('Network response was not ok');
  }

  const overview = await overviewRes.json();
  const quoteJson = await quoteRes.json();
  const quote = quoteJson['Global Quote'] || {};

  const price = quote['05. price'] ? `$${parseFloat(quote['05. price']).toFixed(2)}` : 'N/A';
  const change = quote['10. change percent'] || 'N/A';
  const website = overview.Website ? overview.Website.replace(/^https?:\/\//, '') : '';
  const logo = website ? `https://logo.clearbit.com/${website}` : undefined;
  const growth = overview.FiveYearAverageReturn ? `5-year Avg Return: ${overview.FiveYearAverageReturn}%` : '';

  return {
    symbol: overview.Symbol || symbol,
    name: overview.Name || symbol,
    price,
    change,
    logo,
    description: overview.Description || '',
    growth,
  };
}

export default { getStockDetails };

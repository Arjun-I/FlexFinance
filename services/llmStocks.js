import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra || Constants.manifest?.extra;
const YAHOO_ENABLED = extra?.EXPO_PUBLIC_YAHOO_FINANCE_ENABLED === 'true';

/**
 * Fetch detailed stock information for a given symbol.
 * @param {string} symbol - Ticker symbol, e.g. "AAPL".
 * @returns {Promise<object>} Object containing stock details.
 */
export async function getStockDetails(symbol) {
  // Mock data for when API key is not available
  const mockStocks = {
    AAPL: {
      symbol: 'AAPL',
      name: 'Apple Inc.',
      price: '$190.50',
      change: '+2.5%',
      logo: 'https://logo.clearbit.com/apple.com',
      description: 'Technology company that designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories.',
      growth: '5-year Avg Return: 25.3%'
    },
    MSFT: {
      symbol: 'MSFT',
      name: 'Microsoft Corporation',
      price: '$310.25',
      change: '+1.8%',
      logo: 'https://logo.clearbit.com/microsoft.com',
      description: 'Technology company that develops, manufactures, licenses, supports, and sells computer software, consumer electronics, and related services.',
      growth: '5-year Avg Return: 28.7%'
    },
    GOOGL: {
      symbol: 'GOOGL',
      name: 'Alphabet Inc.',
      price: '$2800.00',
      change: '+3.2%',
      logo: 'https://logo.clearbit.com/google.com',
      description: 'Technology company that specializes in Internet-related services and products, including online advertising technologies.',
      growth: '5-year Avg Return: 22.1%'
    },
    AMZN: {
      symbol: 'AMZN',
      name: 'Amazon.com Inc.',
      price: '$140.75',
      change: '+1.5%',
      logo: 'https://logo.clearbit.com/amazon.com',
      description: 'Multinational technology company focusing on e-commerce, cloud computing, digital streaming, and artificial intelligence.',
      growth: '5-year Avg Return: 18.9%'
    },
    TSLA: {
      symbol: 'TSLA',
      name: 'Tesla Inc.',
      price: '$270.50',
      change: '+4.2%',
      logo: 'https://logo.clearbit.com/tesla.com',
      description: 'Electric vehicle and clean energy company that designs, develops, manufactures, leases, and sells electric vehicles.',
      growth: '5-year Avg Return: 45.2%'
    },
    NVDA: {
      symbol: 'NVDA',
      name: 'NVIDIA Corporation',
      price: '$500.00',
      change: '+5.1%',
      logo: 'https://logo.clearbit.com/nvidia.com',
      description: 'Technology company that designs graphics processing units for gaming and professional markets.',
      growth: '5-year Avg Return: 35.8%'
    },
    META: {
      symbol: 'META',
      name: 'Meta Platforms Inc.',
      price: '$350.00',
      change: '+2.8%',
      logo: 'https://logo.clearbit.com/meta.com',
      description: 'Technology company that develops products that enable people to connect and share through mobile devices.',
      growth: '5-year Avg Return: 19.4%'
    },
    NFLX: {
      symbol: 'NFLX',
      name: 'Netflix Inc.',
      price: '$450.00',
      change: '+1.2%',
      logo: 'https://logo.clearbit.com/netflix.com',
      description: 'Entertainment company that provides streaming media and video-on-demand online.',
      growth: '5-year Avg Return: 15.6%'
    },
    AMD: {
      symbol: 'AMD',
      name: 'Advanced Micro Devices Inc.',
      price: '$120.00',
      change: '+3.7%',
      logo: 'https://logo.clearbit.com/amd.com',
      description: 'Semiconductor company that develops computer processors and related technologies.',
      growth: '5-year Avg Return: 42.3%'
    },
    INTC: {
      symbol: 'INTC',
      name: 'Intel Corporation',
      price: '$45.00',
      change: '+0.8%',
      logo: 'https://logo.clearbit.com/intel.com',
      description: 'Technology company that designs and manufactures semiconductor chips and related technologies.',
      growth: '5-year Avg Return: 8.9%'
    },
    CRM: {
      symbol: 'CRM',
      name: 'Salesforce Inc.',
      price: '$220.00',
      change: '+2.1%',
      logo: 'https://logo.clearbit.com/salesforce.com',
      description: 'Cloud-based software company that provides customer relationship management services.',
      growth: '5-year Avg Return: 24.7%'
    },
    ADBE: {
      symbol: 'ADBE',
      name: 'Adobe Inc.',
      price: '$550.00',
      change: '+1.9%',
      logo: 'https://logo.clearbit.com/adobe.com',
      description: 'Software company that provides digital media and creativity software products.',
      growth: '5-year Avg Return: 26.8%'
    },
    PYPL: {
      symbol: 'PYPL',
      name: 'PayPal Holdings Inc.',
      price: '$60.00',
      change: '+1.4%',
      logo: 'https://logo.clearbit.com/paypal.com',
      description: 'Technology company that operates an online payments system.',
      growth: '5-year Avg Return: 12.3%'
    },
    UBER: {
      symbol: 'UBER',
      name: 'Uber Technologies Inc.',
      price: '$45.00',
      change: '+2.3%',
      logo: 'https://logo.clearbit.com/uber.com',
      description: 'Technology company that provides ride-hailing, food delivery, and freight transportation services.',
      growth: '5-year Avg Return: -5.2%'
    },
    SPOT: {
      symbol: 'SPOT',
      name: 'Spotify Technology S.A.',
      price: '$180.00',
      change: '+1.7%',
      logo: 'https://logo.clearbit.com/spotify.com',
      description: 'Audio streaming and media services provider.',
      growth: '5-year Avg Return: 9.8%'
    },
    ZM: {
      symbol: 'ZM',
      name: 'Zoom Video Communications Inc.',
      price: '$70.00',
      change: '+0.9%',
      logo: 'https://logo.clearbit.com/zoom.us',
      description: 'Technology company that provides video telephony and online chat services.',
      growth: '5-year Avg Return: 18.5%'
    }
  };

  // If Yahoo Finance is not enabled, use mock data
  if (!YAHOO_ENABLED) {
    const mockStock = mockStocks[symbol.toUpperCase()];
    if (mockStock) {
      return mockStock;
    } else {
      // Generate generic mock data for unknown symbols
      return {
        symbol: symbol.toUpperCase(),
        name: `${symbol.toUpperCase()} Corporation`,
        price: `$${(Math.random() * 200 + 50).toFixed(2)}`,
        change: `${Math.random() > 0.5 ? '+' : '-'}${(Math.random() * 5 + 1).toFixed(1)}%`,
        logo: undefined,
        description: 'Technology company focused on innovation and growth.',
        growth: `5-year Avg Return: ${(Math.random() * 30 + 10).toFixed(1)}%`
      };
    }
  }

  // Use Yahoo Finance API if enabled
  try {
    const quoteUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`;
    const summaryUrl = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=summaryDetail,financialData`;

    const [summaryRes, quoteRes] = await Promise.all([
      fetch(summaryUrl),
      fetch(quoteUrl)
    ]);

    if (!summaryRes.ok || !quoteRes.ok) {
      throw new Error('Network response was not ok');
    }

    const summary = await summaryRes.json();
    const quoteJson = await quoteRes.json();
    
    const quoteData = quoteJson.chart?.result?.[0] || {};
    const meta = quoteData.meta || {};
    const indicators = quoteData.indicators?.quote?.[0] || {};
    
    const summaryDetail = summary.quoteSummary?.result?.[0]?.summaryDetail || {};
    const financialData = summary.quoteSummary?.result?.[0]?.financialData || {};

    const price = meta.regularMarketPrice ? `$${meta.regularMarketPrice.toFixed(2)}` : 'N/A';
    const change = meta.regularMarketChangePercent ? `${meta.regularMarketChangePercent >= 0 ? '+' : ''}${meta.regularMarketChangePercent.toFixed(2)}%` : 'N/A';
    const website = summaryDetail.website || '';
    const logo = website ? `https://logo.clearbit.com/${website.replace(/^https?:\/\//, '')}` : undefined;
    const growth = financialData.revenueGrowth ? `5-year Avg Return: ${(financialData.revenueGrowth * 100).toFixed(1)}%` : '';

    return {
      symbol: meta.symbol || symbol,
      name: meta.shortName || symbol,
      price,
      change,
      logo,
      description: summaryDetail.longBusinessSummary || '',
      growth,
    };
  } catch (error) {
    console.error('Error fetching stock data:', error);
    // Fallback to mock data if API fails
    const mockStock = mockStocks[symbol.toUpperCase()];
    if (mockStock) {
      return mockStock;
    } else {
      return {
        symbol: symbol.toUpperCase(),
        name: `${symbol.toUpperCase()} Corporation`,
        price: `$${(Math.random() * 200 + 50).toFixed(2)}`,
        change: `${Math.random() > 0.5 ? '+' : '-'}${(Math.random() * 5 + 1).toFixed(1)}%`,
        logo: undefined,
        description: 'Technology company focused on innovation and growth.',
        growth: `5-year Avg Return: ${(Math.random() * 30 + 10).toFixed(1)}%`
      };
    }
  }
}

export default { getStockDetails };

import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra || Constants.manifest?.extra;
const API_KEY = extra?.EXPO_PUBLIC_ALPHA_VANTAGE_KEY;

const alphaClient = new ApiClient({
  baseUrl: 'https://www.alphavantage.co',
  retries: 2,
});

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

  // If API key is not available, use mock data
  if (!API_KEY) {
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

  // Use real API if key is available
  try {
    const overviewUrl = `/query?function=OVERVIEW&symbol=${encodeURIComponent(symbol)}&apikey=${API_KEY}`;
    const quoteUrl = `/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${API_KEY}`;

    const [overviewRes, quoteRes] = await Promise.all([
      alphaClient.request(overviewUrl),
      alphaClient.request(quoteUrl)
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

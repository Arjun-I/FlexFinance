# FlexFinance - Personal Finance App

A React Native app for personalized stock recommendations and portfolio management with AI-powered investment analysis.

## Features

- **AI-Powered Investment Analysis**: Advanced LLM integration using GPT-4o mini for personalized stock recommendations
- **Comprehensive Stock Analysis**: Detailed investment theses, risk assessments, and growth potential analysis
- **Swipe Interface**: Tinder-like interface for stock discovery with investment-grade information
- **Portfolio Tracking**: Monitor your investments and portfolio performance
- **Risk Assessment**: Complete risk profile quiz for personalized recommendations
- **Daily Limits**: 10 swipes per day to prevent over-trading
- **Real-time Data**: Integration with Yahoo Finance API for current stock prices and metrics

## Investment Analysis Features

### AI-Generated Investment Insights
- **Investment Thesis**: Detailed reasoning for each stock recommendation
- **Risk Assessment**: Specific risks aligned with your risk tolerance
- **Growth Potential**: Expected growth drivers and timeline
- **Portfolio Fit**: How each stock diversifies your current holdings
- **Target Prices**: AI-estimated price targets
- **Dividend Analysis**: Dividend yield information for income investors

### Comprehensive Stock Information
- **Market Capitalization**: Large, mid, and small cap classifications
- **Sector Diversification**: Recommendations across multiple sectors
- **Industry Analysis**: Detailed industry-specific insights
- **Confidence Scores**: AI confidence levels for each recommendation
- **Investment Recommendations**: Buy, hold, or avoid ratings

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Configuration**
   Create a `.env` file in the root directory with your API keys:
   ```bash
   # Firebase Configuration
   EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSyDXvcgkEF1476JRFlafgPxK1HaqBbX9lP8
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=flexfinance-20c90.firebaseapp.com
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=flexfinance-20c90
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=flexfinance-20c90.appspot.com
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=517568675166
   EXPO_PUBLIC_FIREBASE_APP_ID=1:517568675166:android:0ece24a5eea74357df23cf

   # OpenAI API Key for LLM Integration
   EXPO_PUBLIC_OPENAI_API_KEY=your_openai_api_key_here

   # Yahoo Finance API (Free, no key required for basic stock data)
   EXPO_PUBLIC_YAHOO_FINANCE_ENABLED=true
   ```

3. **Run the App**
   ```bash
   npx expo start
   ```

## Troubleshooting

### LLM Investment Analysis
- **Status**: ✅ **CONFIGURED** - Using GPT-4o mini model for investment analysis
- **Features**: Investment theses, risk assessment, growth potential, target prices
- **Testing**: Use the LLM Test tab to verify investment analysis functionality

### Swipe Limit Issues
- **Issue**: App says you've used all swipes but you haven't
- **Solution**: The swipe count resets daily. Check the date in the swipe interface
- **Fix**: The app now has improved date tracking and logging

### Dashboard Overview
- **Status**: ✅ **ENHANCED** - Comprehensive portfolio metrics and risk profile details
- **Features**: Detailed investment overview with quick action buttons

### Stock Generation
- **Status**: ✅ **ENHANCED** - AI-powered stock recommendations with real-time data
- **Features**: LLM analysis + Yahoo Finance integration for comprehensive investment insights

### API Configuration
- **Firebase**: Required for user authentication and data storage
- **OpenAI**: ✅ **CONFIGURED** - Using GPT-4o mini for enhanced investment analysis
- **Yahoo Finance**: Free API for real-time stock data (no key required)

## Investment Features

### AI-Powered Recommendations
The app uses advanced LLM technology to provide:
- **Personalized Analysis**: Based on your risk profile and investment preferences
- **Comprehensive Research**: Detailed analysis of business models, financials, and growth prospects
- **Risk Assessment**: Specific risks and how they align with your tolerance
- **Portfolio Optimization**: Recommendations that diversify your holdings

### Real-time Data Integration
- **Current Prices**: Live stock prices from Yahoo Finance
- **Market Metrics**: P/E ratios, dividend yields, market capitalization
- **Price Changes**: Real-time price movement tracking
- **Financial Data**: Company financials and performance metrics

### Smart Caching System
- **Price Updates**: Stock prices updated every 5 minutes for timeliness
- **Market Cap Updates**: Market capitalization updated once daily to avoid rate limiting
- **Intelligent Caching**: LRU cache with automatic cleanup of expired entries
- **Rate Limit Management**: Smart API calls to avoid hitting Yahoo Finance limits
- **Fallback Data**: Graceful degradation when APIs are unavailable

### Cache Management
- **Cache Statistics**: Monitor cache performance and usage
- **Automatic Cleanup**: Expired entries removed automatically
- **Force Refresh**: Manual cache refresh for specific stocks
- **Memory Optimization**: Maximum 100 cached stocks to prevent memory issues

## Development

### Key Files
- `App.js` - Main app component
- `screens/Dashboard.js` - Main dashboard with overview
- `screens/SwipeStocksMock.js` - Enhanced stock swiping with investment analysis
- `services/llmService.js` - AI-powered investment analysis
- `services/stockGenerationService.js` - Stock data generation with real-time integration

### Testing Investment Features
Use the LLM Test tab in the dashboard to:
- Test AI investment analysis
- Verify real-time data integration
- Check recommendation quality
- Validate risk assessment features

## Platform Support
- **iOS**: Full feature support with enhanced investment analysis
- **Android**: Optimized for stability with investment features

## Recent Enhancements
- ✅ Enhanced LLM integration with GPT-4o mini for investment analysis
- ✅ Comprehensive stock analysis with investment theses and risk assessment
- ✅ Real-time data integration with Yahoo Finance API
- ✅ Enhanced stock cards with detailed investment information
- ✅ Investment recommendation badges (buy/hold/avoid)
- ✅ Target price and dividend yield analysis
- ✅ Portfolio diversification recommendations
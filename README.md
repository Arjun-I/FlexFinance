# 📱 FlexFinance - AI-Powered Investment Portfolio App

> **A React Native financial app featuring AI-driven stock recommendations, real-time portfolio tracking, and intelligent investment analysis.**

[![React Native](https://img.shields.io/badge/React%20Native-v0.79.5-blue.svg)](https://reactnative.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-v12.0.0-orange.svg)](https://firebase.google.com/)
[![Expo](https://img.shields.io/badge/Expo-v53.0.20-purple.svg)](https://expo.dev/)

## ✨ Key Features

### 🤖 **AI-Powered Investment Engine**
- **LLM Integration**: Advanced Groq AI for personalized stock recommendations
- **Smart Analysis**: Detailed investment theses, risk assessments, and growth potential
- **Risk-Aligned Suggestions**: Recommendations based on your personal risk profile

### 📊 **Real-Time Portfolio Management**
- **Live Price Updates**: Real-time stock prices via Finnhub API
- **Portfolio Tracking**: Monitor investments with dynamic value calculations
- **Sector Diversification**: Holdings organized by sector for better overview
- **Cash Management**: Track available cash and prevent over-purchasing

### 💫 **Intuitive User Experience**
- **Swipe Interface**: Tinder-like stock discovery experience
- **Watchlist System**: Add stocks to watchlist before purchasing
- **Visual Price Updates**: Real-time indicators for price movements
- **Comprehensive Dashboard**: Clean, modern UI with essential metrics

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

## 🚀 Quick Start

### Prerequisites
- **Node.js** (v18+ recommended)
- **npm** or **yarn**
- **Expo CLI**: `npm install -g @expo/cli`
- **Android Studio** (for Android development)
- **Xcode** (for iOS development - macOS only)

### Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/yourusername/FlexFinance-1.git
   cd FlexFinance-1
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   
   Copy the example environment file:
   ```bash
   cp env.example .env
   ```
   
   Configure your `.env` file with your API keys:
   ```env
   # Firebase Configuration (Required)
   EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key_here
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id

   # Groq AI API (Required for recommendations)
   EXPO_PUBLIC_GROQ_API_KEY=your_groq_api_key_here

   # Finnhub API (Required for stock data)
   EXPO_PUBLIC_FINNHUB_API_KEY=your_finnhub_api_key_here
   ```

4. **Start Development Server**
   ```bash
   npx expo start --dev-client
   ```

### 🔑 API Keys Setup

#### Firebase (Authentication & Database)
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or use existing
3. Enable Authentication (Email/Password)
4. Create Firestore database
5. Get your config from Project Settings

#### Groq AI (LLM Recommendations)
1. Visit [Groq Console](https://console.groq.com/)
2. Create account and generate API key
3. Free tier available with generous limits

#### Finnhub (Stock Data)
1. Register at [Finnhub.io](https://finnhub.io/)
2. Generate free API key
3. 60 API calls per minute on free tier

### 📱 Building for Production

#### Android APK
```bash
# Build release APK
npx expo run:android --variant release

# APK will be generated at:
# android/app/build/outputs/apk/release/app-release.apk
```

#### iOS (macOS only)
```bash
npx expo run:ios --configuration Release
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
- **Features**: LLM analysis + Finnhub integration for comprehensive investment insights

### API Configuration
- **Firebase**: Required for user authentication and data storage
- **OpenAI**: ✅ **CONFIGURED** - Using GPT-4o mini for enhanced investment analysis
- **Finnhub**: Free API for real-time stock data (requires API key)

## Investment Features

### AI-Powered Recommendations
The app uses advanced LLM technology to provide:
- **Personalized Analysis**: Based on your risk profile and investment preferences
- **Comprehensive Research**: Detailed analysis of business models, financials, and growth prospects
- **Risk Assessment**: Specific risks and how they align with your tolerance
- **Portfolio Optimization**: Recommendations that diversify your holdings

### Real-time Data Integration
- **Current Prices**: Live stock prices from Finnhub
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

## 🏗️ Architecture

### Tech Stack
- **Frontend**: React Native (0.79.5) with Expo
- **Backend**: Firebase (Authentication + Firestore)
- **AI/LLM**: Groq API for investment analysis
- **Stock Data**: Finnhub API for real-time market data
- **State Management**: React Hooks (useState, useEffect, useRef)
- **Navigation**: Custom screen management
- **Storage**: AsyncStorage + Firestore persistence

### Key Components
```
FlexFinance-1/
├── App.js                          # Main app entry point & authentication
├── firebase.js                     # Firebase configuration & initialization
├── components/
│   ├── PortfolioTracker_Safe.js    # Portfolio management & price updates
│   ├── StockComparison_Safe.js     # Stock swiping interface
│   └── ErrorBoundary.js            # Error handling component
├── screens/
│   ├── Dashboard_New.js            # Main dashboard with overview
│   └── RiskQuiz_Safe.js           # Risk assessment questionnaire
├── services/
│   ├── finnhubService.js           # Stock price & company data API
│   ├── groqService.js              # AI-powered investment analysis
│   ├── stockGenerationService.js   # Stock recommendation engine
│   └── riskProfileService.js       # User risk assessment logic
└── android/                       # Android build configuration
```

### Data Flow
1. **User Authentication**: Firebase Auth with persistent sessions
2. **Stock Data**: Finnhub API → Local caching → UI updates
3. **AI Recommendations**: User preferences → Groq LLM → Filtered suggestions
4. **Portfolio Updates**: Real-time price fetching → Firebase sync → UI refresh

## 🔧 Technical Features

### Performance Optimizations
- **API Caching**: 5-minute cache for stock prices, fallback data for offline use
- **Rate Limiting**: Intelligent API call management to respect service limits
- **Debounced Updates**: Prevents excessive state updates and API calls
- **Efficient Rendering**: Optimized React components with proper state management

### Security Features
- **Environment Variables**: All API keys secured via .env files
- **Firebase Security**: Authenticated database access with user-specific data
- **Error Handling**: Comprehensive error boundaries and graceful degradation
- **Network Resilience**: Timeout handling and connectivity checks

## 📊 App Screenshots & Features

### 🔐 Authentication
- Secure login/signup with Firebase
- Password reset functionality  
- Persistent sessions with AsyncStorage

### 📱 Portfolio Dashboard
- Real-time portfolio value tracking
- Holdings organized by sector
- Cash balance management
- Visual price update indicators

### 🎯 Stock Discovery
- AI-powered stock recommendations
- Swipe interface for easy selection
- Detailed investment analysis
- Risk-aligned suggestions

### 💼 Portfolio Management
- Buy/sell functionality with cash validation
- Watchlist system for tracking interests
- Real-time price updates every 5 minutes
- Firebase data persistence

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit changes**: `git commit -m 'Add amazing feature'`
4. **Push to branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Development Guidelines
- Follow React Native best practices
- Maintain consistent code formatting
- Add comments for complex logic
- Test on both Android and iOS
- Ensure API keys are never committed

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🚨 Security Notice

**⚠️ Important**: Never commit your `.env` file or expose API keys in your code. This repository uses environment variables to keep sensitive information secure.

If you accidentally commit API keys:
1. Immediately revoke the exposed keys
2. Generate new keys from the respective services
3. Update your `.env` file with new keys
4. Consider using `git-filter-branch` to remove sensitive data from git history

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/FlexFinance-1/issues)
- **Documentation**: This README and inline code comments
- **API Documentation**: 
  - [Firebase Docs](https://firebase.google.com/docs)
  - [Finnhub API](https://finnhub.io/docs/api)
  - [Groq API](https://console.groq.com/docs)

---

**🎉 Happy Investing with FlexFinance!** Built with ❤️ using React Native and modern financial APIs.

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
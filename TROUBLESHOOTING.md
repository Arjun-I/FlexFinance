# FlexFinance Troubleshooting Guide

## Quick Fixes

### 1. LLM Not Working
**Symptoms**: 
- LLM features showing mock data
- "No valid LLM API key configured" in console
- Stock recommendations are generic

**Solution**:
1. Set up OpenAI API key in your `.env` file:
   ```
   EXPO_PUBLIC_OPENAI_API_KEY=sk-your-actual-openai-key-here
   ```
2. Get API key from: https://platform.openai.com/api-keys
3. Restart the app after adding the key

**Note**: The app works fine without LLM - it will use intelligent fallback recommendations.

### 2. Swipe Limit Issues
**Symptoms**:
- App says you've used all swipes but you haven't
- Swipe count not resetting daily
- Confusing swipe limit messages

**Solution**:
- The app now has improved date tracking
- Swipe count resets at midnight local time
- Check the swipe interface for current count
- If issues persist, try the "Reset Risk Profile" button in Dashboard

### 3. Dashboard Overview Too Simple
**Symptoms**:
- Dashboard showing minimal information
- Missing portfolio details
- No risk profile breakdown

**Solution**:
- The detailed overview has been restored
- You should now see comprehensive portfolio metrics
- Risk profile details are displayed with explanations
- Quick action buttons are available

### 4. Stock Generation Failing
**Symptoms**:
- "Error generating stocks" messages
- No stock recommendations
- API timeout errors

**Solution**:
- The app now has robust fallback mechanisms
- Yahoo Finance API is free but has rate limits
- Mock data will be used when APIs are unavailable
- Check your internet connection

## Environment Setup

### Required Configuration
1. **Firebase** (Required):
   ```
   EXPO_PUBLIC_FIREBASE_API_KEY=your_key
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

2. **OpenAI** (Optional):
   ```
   EXPO_PUBLIC_OPENAI_API_KEY=sk-your-openai-key
   ```

3. **Yahoo Finance** (Free, no key needed):
   ```
   EXPO_PUBLIC_YAHOO_FINANCE_ENABLED=true
   ```

### Setup Commands
```bash
# Quick setup
npm run setup

# Start the app
npm start
```

## API Status

### Firebase
- **Status**: Required for authentication and data storage
- **Cost**: Free tier available
- **Setup**: Create project at https://console.firebase.google.com

### OpenAI
- **Status**: Optional for enhanced LLM features
- **Cost**: Pay-per-use (very cheap for testing)
- **Setup**: Get key at https://platform.openai.com/api-keys

### Yahoo Finance
- **Status**: Free API for stock data
- **Cost**: Free (no key required)
- **Limits**: Rate limited, app handles gracefully

## Debug Information

### Check API Status
Use the LLM Test tab in the dashboard to:
- Test API connectivity
- Verify configuration
- Check error messages

### Console Logs
Look for these indicators:
- ✅ Success messages
- ⚠️ Warning messages  
- ❌ Error messages
- 🔄 Processing messages

### Common Error Messages

**"No valid LLM API key configured"**
- Solution: Add OpenAI API key to .env file

**"Daily swipe limit reached"**
- Solution: Wait until tomorrow or reset risk profile

**"Failed to fetch stock data"**
- Solution: Check internet connection, app will use fallback data

**"Firebase API key not configured"**
- Solution: Add Firebase configuration to .env file

## Platform-Specific Issues

### Android
- Some features are optimized for stability
- LLM test tab is disabled on Android
- Enhanced error handling for crashes

### iOS
- Full feature support
- All tabs available
- Native performance optimizations

## Performance Tips

1. **Clear Cache**: `npm run clear-cache`
2. **Reset Project**: `npm run reset-project`
3. **Check Dependencies**: `npm run doctor`
4. **Lint Code**: `npm run lint`

## Getting Help

1. Check the console logs for error messages
2. Use the LLM Test tab to diagnose API issues
3. Verify your .env file configuration
4. Test on different devices/simulators
5. Check the README.md for setup instructions

## Recent Fixes Applied

- ✅ Improved swipe limit tracking with better date comparison
- ✅ Restored detailed dashboard overview with portfolio metrics  
- ✅ Enhanced LLM service with better error handling
- ✅ Added robust fallback mechanisms for stock generation
- ✅ Improved API error handling and user feedback
- ✅ Added comprehensive logging for debugging
- ✅ Created setup script for easy environment configuration 
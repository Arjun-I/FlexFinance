# FlexFinance Debug Scripts

This directory contains comprehensive debug scripts to diagnose stock generation issues.

## Quick Start

Run all tests at once:
```bash
cd /Users/arjun/FlexFinance-1
node debug/run-all-tests.js
```

## Individual Tests

### 1. Test Groq API
```bash
node debug/test-groq.js
```
Tests:
- Basic LLM connectivity
- Stock recommendations without context
- Risk-aware recommendations with context
- Context snippet generation

### 2. Test Finnhub API
```bash
node debug/test-finnhub.js
```
Tests:
- Single stock quotes
- Company profiles
- Multiple quote batching
- Error handling for invalid symbols
- Rate limiting behavior

### 3. Test Firebase Operations
```bash
node debug/test-firebase.js
```
Tests:
- Firebase initialization
- User document CRUD
- Generated stocks storage/retrieval
- User preferences storage
- Cleanup operations

### 4. Test End-to-End Generation
```bash
node debug/test-generation.js
```
Tests:
- StockGenerationService initialization
- Initial recommendations generation
- Firebase storage/retrieval
- Personalized recommendations
- Individual stock analysis
- Complete pipeline flow

## Understanding Results

### ✅ All Tests Pass
- Your APIs and Firebase are working correctly
- The issue is likely in the app's UI state or user flow
- Try: Clear app cache, complete login/quiz, check console logs

### ❌ Groq Tests Fail
- Check your `EXPO_PUBLIC_GROQ_API_KEY` in `.env`
- Verify Groq API quota/billing
- Check internet connectivity

### ❌ Finnhub Tests Fail
- Check your `EXPO_PUBLIC_FINNHUB_API_KEY` in `.env`
- Verify Finnhub API quota (60 calls/minute free tier)
- Some symbols may be invalid or delisted

### ❌ Firebase Tests Fail
- Check all Firebase config variables in `.env`
- Verify Firebase project permissions
- Check Firestore security rules

### ❌ Generation Tests Fail
- Usually indicates a dependency issue (Groq/Finnhub/Firebase)
- Check specific error messages for API timeouts
- May need to retry due to API rate limits

## Common Issues

1. **Rate Limiting**: Finnhub free tier limits 60 calls/minute
2. **API Keys**: Make sure all keys in `.env` are valid
3. **Network**: Check internet connectivity for API calls
4. **Firebase Rules**: Ensure Firestore allows read/write for authenticated users

## Environment Variables Required

Make sure your `.env` file contains:
```
EXPO_PUBLIC_GROQ_API_KEY=gsk_...
EXPO_PUBLIC_FINNHUB_API_KEY=...
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...
```

# FlexFinance Android Troubleshooting Guide

## 🚨 Quick Start - If Your App is Crashing

### Step 1: Run Enhanced Debug Mode
```bash
npm run android-debug
```

This will start the app with comprehensive logging and debugging enabled.

### Step 2: Access Diagnostic Screen
Once the app is running, navigate to the Diagnostic Screen to see detailed system information and logs.

## 🔍 Common Android Crash Causes & Solutions

### 1. Firebase Configuration Issues
**Symptoms:** App crashes immediately on startup
**Solution:**
- Check that all Firebase config values are present in `firebase.js`
- Verify your `google-services.json` file is in the correct location
- Ensure Firebase project is properly set up

### 2. Memory Issues
**Symptoms:** App crashes after using for a while, especially with charts
**Solution:**
- The app now includes memory monitoring
- Check the Diagnostic Screen for memory usage
- Consider reducing chart complexity on Android

### 3. Network Permission Issues
**Symptoms:** App crashes when trying to fetch data
**Solution:**
- Verify internet permissions are granted
- Check Android manifest permissions
- Test with airplane mode on/off

### 4. React Navigation Issues
**Symptoms:** App crashes during navigation
**Solution:**
- Clear navigation cache: `npx expo start --clear`
- Check for navigation state conflicts
- Verify all screen components are properly exported

### 5. Expo SDK Version Conflicts
**Symptoms:** Various random crashes
**Solution:**
- Run `npx expo doctor` to check for issues
- Update Expo SDK if needed
- Clear all caches: `npx expo start --clear`

## 🛠️ Debug Tools Available

### 1. Enhanced Error Boundary
- Catches and displays detailed error information
- Shows stack traces in development mode
- Provides retry functionality

### 2. Debug Service
- Comprehensive logging system
- Tracks API calls, Firebase operations, navigation
- Exports logs for analysis

### 3. Diagnostic Screen
- System information display
- Real-time log monitoring
- Issue detection and reporting
- Performance monitoring

## 📱 Android-Specific Optimizations

### 1. Memory Management
- Large heap enabled in app.config.js
- Hermes JavaScript engine enabled
- ProGuard disabled for debugging

### 2. Performance Settings
- Software keyboard layout mode set to 'pan'
- Cleartext traffic allowed for development
- Separate build per CPU architecture disabled

### 3. Crash Prevention
- Error boundaries on all major components
- Try-catch blocks around Firebase operations
- Graceful fallbacks for network failures

## 🔧 Development Commands

```bash
# Start with enhanced debugging
npm run android-debug

# Clear all caches
npm run clear-cache

# Check for Expo issues
npm run doctor

# Standard Android start
npm run android

# Start development server
npm start
```

## 📊 Log Analysis

### Understanding Log Levels
- **ERROR**: Critical issues that cause crashes
- **WARN**: Potential issues that might cause problems
- **INFO**: General app flow and operations
- **DEBUG**: Detailed debugging information

### Common Error Patterns
1. **Firebase Errors**: Check authentication and database permissions
2. **Network Errors**: Verify internet connectivity and API endpoints
3. **Memory Errors**: Look for memory leaks in components
4. **Navigation Errors**: Check screen registration and props

## 🚀 Production Deployment Checklist

Before deploying to production:

1. ✅ Run `npm run doctor` and fix any issues
2. ✅ Test on multiple Android devices/versions
3. ✅ Verify all Firebase configurations
4. ✅ Check that all permissions are properly set
5. ✅ Test network connectivity scenarios
6. ✅ Verify error boundaries are working
7. ✅ Test app in background/foreground transitions

## 📞 Getting Help

If you're still experiencing crashes:

1. **Collect Debug Information:**
   - Run the app with `npm run android-debug`
   - Navigate to Diagnostic Screen
   - Export logs and system information

2. **Check Common Issues:**
   - Verify Android device compatibility
   - Check for conflicting apps
   - Test on a different device

3. **Environment Issues:**
   - Update Expo CLI: `npm install -g @expo/cli`
   - Clear all caches: `npx expo start --clear`
   - Check Node.js version compatibility

## 🔄 Recovery Steps

If the app is completely unusable:

1. **Reset Development Environment:**
   ```bash
   rm -rf node_modules
   npm install
   npx expo start --clear
   ```

2. **Check for Updates:**
   ```bash
   npx expo update
   ```

3. **Verify Dependencies:**
   ```bash
   npm audit
   npm outdated
   ```

## 📈 Performance Monitoring

The app now includes:
- Real-time memory usage monitoring
- API call tracking
- Navigation performance metrics
- Firebase operation logging

Access this information through the Diagnostic Screen in the app.

---

**Remember:** The enhanced debugging system will help identify the root cause of crashes. Always check the Diagnostic Screen first when experiencing issues. 
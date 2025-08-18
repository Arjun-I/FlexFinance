import AsyncStorage from '@react-native-async-storage/async-storage';

// Simple network connectivity check
export const checkNetworkConnectivity = async () => {
  try {
    // Try to fetch a small resource to test connectivity
    const response = await fetch('https://www.google.com/favicon.ico', {
      method: 'HEAD',
      timeout: 5000,
    });
    return response.ok;
  } catch (error) {
    console.log('Network connectivity check failed:', error);
    return false;
  }
};

// Check if we're in offline mode
export const isOfflineMode = () => {
  // You can implement more sophisticated offline detection here
  // For now, we'll rely on Firebase errors to determine offline status
  return false;
};

// Cache data locally
export const cacheData = async (key, data) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify({
      data,
      timestamp: Date.now(),
    }));
  } catch (error) {
    console.log('Failed to cache data:', error);
  }
};

// Retrieve cached data
export const getCachedData = async (key) => {
  try {
    const cached = await AsyncStorage.getItem(key);
    if (cached) {
      const parsed = JSON.parse(cached);
      // Check if cache is less than 1 hour old
      if (Date.now() - parsed.timestamp < 3600000) {
        return parsed.data;
      }
    }
    return null;
  } catch (error) {
    console.log('Failed to retrieve cached data:', error);
    return null;
  }
};

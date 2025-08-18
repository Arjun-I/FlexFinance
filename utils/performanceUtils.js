// performanceUtils.js - Performance optimization utilities

// Debounce function for expensive operations
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Throttle function for rate limiting
export const throttle = (func, limit) => {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Memory-efficient cache with LRU eviction
export class LRUCache {
  constructor(maxSize = 100) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }

  get(key) {
    if (this.cache.has(key)) {
      const value = this.cache.get(key);
      this.cache.delete(key);
      this.cache.set(key, value);
      return value;
    }
    return null;
  }

  set(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  clear() {
    this.cache.clear();
  }

  size() {
    return this.cache.size;
  }
}

// Performance monitoring
export class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.startTimes = new Map();
  }

  start(label) {
    this.startTimes.set(label, performance.now());
  }

  end(label) {
    const startTime = this.startTimes.get(label);
    if (startTime) {
      const duration = performance.now() - startTime;
      this.metrics.set(label, duration);
      this.startTimes.delete(label);
      return duration;
    }
    return 0;
  }

  getMetrics() {
    return Object.fromEntries(this.metrics);
  }

  clear() {
    this.metrics.clear();
    this.startTimes.clear();
  }
}

// Batch operations for better performance
export const batchOperation = (operations, batchSize = 10) => {
  const results = [];
  
  for (let i = 0; i < operations.length; i += batchSize) {
    const batch = operations.slice(i, i + batchSize);
    const batchResults = batch.map(op => op());
    results.push(...batchResults);
  }
  
  return results;
};

// Optimized array operations
export const chunkArray = (array, size) => {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

// Efficient object cloning
export const shallowClone = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return [...obj];
  return { ...obj };
};

// Deep clone for complex objects
export const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (Array.isArray(obj)) return obj.map(item => deepClone(item));
  
  const cloned = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  return cloned;
};

// Network status monitoring
export class NetworkMonitor {
  constructor() {
    this.isOnline = true;
    this.listeners = new Set();
  }

  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  setOnlineStatus(isOnline) {
    if (this.isOnline !== isOnline) {
      this.isOnline = isOnline;
      this.listeners.forEach(callback => callback(isOnline));
    }
  }

  checkConnectivity() {
    return fetch('https://www.google.com/favicon.ico', {
      method: 'HEAD',
      timeout: 5000,
    })
    .then(() => {
      this.setOnlineStatus(true);
      return true;
    })
    .catch(() => {
      this.setOnlineStatus(false);
      return false;
    });
  }
}

// Export singleton instances
export const globalCache = new LRUCache(200);
export const performanceMonitor = new PerformanceMonitor();
export const networkMonitor = new NetworkMonitor();

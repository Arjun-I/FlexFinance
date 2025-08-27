/**
 * Performance Optimization Utilities
 * Handles caching, debouncing, and memory management
 */

class PerformanceOptimizer {
  constructor() {
    this.cache = new Map();
    this.timers = new Map();
    this.intervals = new Set();
    this.listeners = new Set();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes default
  }

  // Cache Management
  setCache(key, value, expiryMs = this.cacheExpiry) {
    const expiry = Date.now() + expiryMs;
    this.cache.set(key, { value, expiry });
  }

  getCache(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() > cached.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.value;
  }

  clearCache(pattern = null) {
    if (!pattern) {
      this.cache.clear();
      return;
    }
    
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  // Debouncing
  debounce(key, func, delay = 300) {
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }
    
    const timer = setTimeout(() => {
      func();
      this.timers.delete(key);
    }, delay);
    
    this.timers.set(key, timer);
  }

  // Interval Management
  setManagedInterval(callback, delay) {
    const interval = setInterval(callback, delay);
    this.intervals.add(interval);
    return interval;
  }

  clearManagedInterval(interval) {
    clearInterval(interval);
    this.intervals.delete(interval);
  }

  // API Call Optimization
  async optimizedFetch(url, options = {}, cacheKey = null) {
    // Check cache first
    if (cacheKey) {
      const cached = this.getCache(cacheKey);
      if (cached) {
        console.log(`Cache hit for ${cacheKey}`);
        return cached;
      }
    }

    try {
      const response = await fetch(url, {
        timeout: 10000, // 10 second timeout
        ...options
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Cache successful responses
      if (cacheKey) {
        this.setCache(cacheKey, data);
      }
      
      return data;
    } catch (error) {
      console.error(`Fetch error for ${url}:`, error);
      
      // Return cached data as fallback if available
      if (cacheKey) {
        const fallback = this.getCache(`fallback_${cacheKey}`);
        if (fallback) {
          console.log(`Using fallback cache for ${cacheKey}`);
          return fallback;
        }
      }
      
      throw error;
    }
  }

  // Memory Management
  cleanup() {
    // Clear all timers
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();

    // Clear all intervals
    for (const interval of this.intervals) {
      clearInterval(interval);
    }
    this.intervals.clear();

    // Clear all listeners
    for (const unsubscribe of this.listeners) {
      try {
        unsubscribe();
      } catch (error) {
        console.warn('Error cleaning up listener:', error);
      }
    }
    this.listeners.clear();

    // Clear cache
    this.cache.clear();
    
    console.log('Performance optimizer cleaned up');
  }

  // Listener Management
  addListener(unsubscribeFunction) {
    this.listeners.add(unsubscribeFunction);
  }

  // Batch Processing
  async batchProcess(items, processor, batchSize = 5, delay = 100) {
    const results = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (item) => {
        try {
          return await processor(item);
        } catch (error) {
          console.warn(`Batch processing error for item:`, error);
          return null;
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.filter(Boolean));
      
      // Add delay between batches to prevent overwhelming the system
      if (i + batchSize < items.length) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    return results;
  }

  // Performance Monitoring
  measurePerformance(name, func) {
    return async (...args) => {
      const start = performance.now();
      
      try {
        const result = await func(...args);
        const duration = performance.now() - start;
        
        console.log(`Performance: ${name} took ${duration.toFixed(2)}ms`);
        return result;
      } catch (error) {
        const duration = performance.now() - start;
        console.log(`Performance: ${name} failed after ${duration.toFixed(2)}ms`);
        throw error;
      }
    };
  }

  // Rate Limiting
  rateLimiter(key, maxCalls = 10, windowMs = 60000) {
    const now = Date.now();
    const windowKey = `rate_${key}_${Math.floor(now / windowMs)}`;
    
    const currentCalls = this.getCache(windowKey) || 0;
    
    if (currentCalls >= maxCalls) {
      throw new Error(`Rate limit exceeded for ${key}`);
    }
    
    this.setCache(windowKey, currentCalls + 1, windowMs);
    return true;
  }

  // Get cache stats
  getCacheStats() {
    const totalEntries = this.cache.size;
    const expiredEntries = Array.from(this.cache.values())
      .filter(entry => Date.now() > entry.expiry).length;
    
    return {
      totalEntries,
      activeEntries: totalEntries - expiredEntries,
      expiredEntries,
      timersActive: this.timers.size,
      intervalsActive: this.intervals.size,
      listenersActive: this.listeners.size
    };
  }
}

// Global instance
const performanceOptimizer = new PerformanceOptimizer();

// Helper functions
export const cache = {
  set: (key, value, expiry) => performanceOptimizer.setCache(key, value, expiry),
  get: (key) => performanceOptimizer.getCache(key),
  clear: (pattern) => performanceOptimizer.clearCache(pattern)
};

export const debounce = (key, func, delay) => 
  performanceOptimizer.debounce(key, func, delay);

export const optimizedFetch = (url, options, cacheKey) => 
  performanceOptimizer.optimizedFetch(url, options, cacheKey);

export const measurePerformance = (name, func) => 
  performanceOptimizer.measurePerformance(name, func);

export const batchProcess = (items, processor, batchSize, delay) => 
  performanceOptimizer.batchProcess(items, processor, batchSize, delay);

export const rateLimiter = (key, maxCalls, windowMs) => 
  performanceOptimizer.rateLimiter(key, maxCalls, windowMs);

export default performanceOptimizer;

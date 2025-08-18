// apiService.js - Centralized API management with caching and rate limiting
import { LRUCache } from '../utils/performanceUtils';

class ApiService {
  constructor() {
    this.cache = new LRUCache(100); // Cache 100 items
    this.rateLimitMap = new Map();
    this.requestQueue = [];
    this.isProcessingQueue = false;
    
    // Rate limiting configuration
    this.rateLimits = {
      finnhub: { requests: 60, window: 60000 }, // 60 requests per minute
      groq: { requests: 10, window: 60000 }, // 10 requests per minute
      firebase: { requests: 100, window: 60000 }, // 100 requests per minute
    };
  }

  // Check if we're within rate limits
  isRateLimited(service) {
    const limit = this.rateLimits[service];
    if (!limit) return false;

    const now = Date.now();
    const requests = this.rateLimitMap.get(service) || [];
    
    // Remove old requests outside the window
    const validRequests = requests.filter(time => now - time < limit.window);
    this.rateLimitMap.set(service, validRequests);
    
    return validRequests.length >= limit.requests;
  }

  // Add request to rate limit tracking
  trackRequest(service) {
    const requests = this.rateLimitMap.get(service) || [];
    requests.push(Date.now());
    this.rateLimitMap.set(service, requests);
  }

  // Get time until rate limit resets
  getRateLimitResetTime(service) {
    const limit = this.rateLimits[service];
    if (!limit) return 0;

    const requests = this.rateLimitMap.get(service) || [];
    if (requests.length === 0) return 0;

    const oldestRequest = Math.min(...requests);
    return Math.max(0, limit.window - (Date.now() - oldestRequest));
  }

  // Queue request for later execution
  async queueRequest(requestFn, service, priority = 0) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        requestFn,
        service,
        priority,
        resolve,
        reject,
        timestamp: Date.now(),
      });
      
      // Sort by priority (higher first) and timestamp
      this.requestQueue.sort((a, b) => {
        if (a.priority !== b.priority) {
          return b.priority - a.priority;
        }
        return a.timestamp - b.timestamp;
      });
      
      this.processQueue();
    });
  }

  // Process queued requests
  async processQueue() {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift();
      
      if (this.isRateLimited(request.service)) {
        // Put back in queue and wait
        const resetTime = this.getRateLimitResetTime(request.service);
        setTimeout(() => {
          this.requestQueue.unshift(request);
          this.processQueue();
        }, resetTime);
        break;
      }

      try {
        this.trackRequest(request.service);
        const result = await request.requestFn();
        request.resolve(result);
      } catch (error) {
        request.reject(error);
      }
    }

    this.isProcessingQueue = false;
  }

  // Cached request with automatic cache invalidation
  async cachedRequest(key, requestFn, ttl = 300000) { // 5 minutes default
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.data;
    }

    try {
      const data = await requestFn();
      this.cache.set(key, {
        data,
        timestamp: Date.now(),
      });
      return data;
    } catch (error) {
      // Return cached data even if expired if request fails
      if (cached) {
        console.warn(`Using expired cache for ${key} due to request failure`);
        return cached.data;
      }
      throw error;
    }
  }

  // Batch multiple requests efficiently
  async batchRequests(requests, service) {
    const results = [];
    const batchSize = 5; // Process 5 requests at a time
    
    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      const batchPromises = batch.map(request => 
        this.queueRequest(request.fn, service, request.priority || 0)
      );
      
      const batchResults = await Promise.allSettled(batchPromises);
      results.push(...batchResults);
      
      // Small delay between batches to respect rate limits
      if (i + batchSize < requests.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return results;
  }

  // Retry logic with exponential backoff
  async retryRequest(requestFn, maxRetries = 3, baseDelay = 1000) {
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries) {
          break;
        }
        
        // Don't retry on certain errors
        if (error.message?.includes('rate limit') || 
            error.message?.includes('unauthorized') ||
            error.message?.includes('not found')) {
          break;
        }
        
        // Exponential backoff
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  }

  // Clear cache for specific keys or all
  clearCache(pattern = null) {
    if (pattern) {
      const keys = Array.from(this.cache.keys());
      keys.forEach(key => {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      });
    } else {
      this.cache.clear();
    }
  }

  // Get cache statistics
  getCacheStats() {
    return {
      size: this.cache.size,
      maxSize: this.cache.maxSize,
      hitRate: this.cache.hitRate,
    };
  }

  // Preload important data
  async preloadData(userId) {
    const preloadTasks = [
      {
        key: `user-${userId}-profile`,
        fn: () => this.getUserProfile(userId),
        priority: 10,
      },
      {
        key: `user-${userId}-portfolio`,
        fn: () => this.getUserPortfolio(userId),
        priority: 8,
      },
      {
        key: `user-${userId}-risk-profile`,
        fn: () => this.getUserRiskProfile(userId),
        priority: 9,
      },
    ];

    return this.batchRequests(preloadTasks, 'firebase');
  }

  // Mock methods for demonstration (replace with actual implementations)
  async getUserProfile(userId) {
    // Implementation would go here
    return { id: userId, email: 'user@example.com' };
  }

  async getUserPortfolio(userId) {
    // Implementation would go here
    return { holdings: [], cashBalance: 10000 };
  }

  async getUserRiskProfile(userId) {
    // Implementation would go here
    return { riskTolerance: 'medium', timeHorizon: 'long' };
  }
}

// Export singleton instance
export default new ApiService();

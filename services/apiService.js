// apiService.js - Centralized API management with caching and rate limiting
import { LRUCache } from '../utils/performanceUtils';

class ApiService {
  constructor() {
    this.cache = new LRUCache(100); // Cache 100 items
    this.rateLimitMap = new Map();
    this.requestQueue = [];
    this.isProcessingQueue = false;
    this.pendingRequests = new Map(); // Request deduplication
    
    // Rate limiting configuration
    this.rateLimits = {
      finnhub: { requests: 60, window: 60000 }, // 60 requests per minute
      groq: { requests: 10, window: 60000 }, // 10 requests per minute
      firebase: { requests: 100, window: 60000 }, // 100 requests per minute
    };
  }

  // Request deduplication
  getRequestKey(service, endpoint, params = {}) {
    return `${service}:${endpoint}:${JSON.stringify(params)}`;
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

  // Main request method with deduplication and caching
  async request(service, endpoint, options = {}) {
    const {
      method = 'GET',
      params = {},
      body = null,
      headers = {},
      cache = true,
      cacheTime = 5 * 60 * 1000, // 5 minutes
      priority = 0,
      retries = 3,
      retryDelay = 1000,
    } = options;

    const requestKey = this.getRequestKey(service, endpoint, params);
    
    // Check for pending request (deduplication)
    if (this.pendingRequests.has(requestKey)) {
      return this.pendingRequests.get(requestKey);
    }

    // Check cache first
    if (cache) {
      const cached = this.cache.get(requestKey);
      if (cached && Date.now() - cached.timestamp < cacheTime) {
        return cached.data;
      }
    }

    // Create request promise
    const requestPromise = this.executeRequest(service, endpoint, {
      method,
      params,
      body,
      headers,
      priority,
      retries,
      retryDelay,
    });

    // Store pending request for deduplication
    this.pendingRequests.set(requestKey, requestPromise);

    try {
      const result = await requestPromise;
      
      // Cache successful result
      if (cache) {
        this.cache.set(requestKey, {
          data: result,
          timestamp: Date.now(),
        });
      }
      
      return result;
    } finally {
      // Clean up pending request
      this.pendingRequests.delete(requestKey);
    }
  }

  // Execute request with retry logic
  async executeRequest(service, endpoint, options) {
    const { method, params, body, headers, priority, retries, retryDelay } = options;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // Check rate limits
        if (this.isRateLimited(service)) {
          const resetTime = this.getRateLimitResetTime(service);
          await new Promise(resolve => setTimeout(resolve, resetTime));
        }

        // Execute request
        const result = await this.queueRequest(
          () => this.makeHttpRequest(endpoint, { method, params, body, headers }),
          service,
          priority
        );

        return result;
      } catch (error) {
        if (attempt === retries) {
          throw error;
        }
        
        // Exponential backoff
        const delay = retryDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // Make HTTP request
  async makeHttpRequest(endpoint, options) {
    const { method, params, body, headers } = options;
    
    const url = new URL(endpoint);
    if (params) {
      Object.keys(params).forEach(key => {
        url.searchParams.append(key, params[key]);
      });
    }

    const requestOptions = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    if (body) {
      requestOptions.body = JSON.stringify(body);
    }

    const response = await fetch(url.toString(), requestOptions);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  // Batch requests for better performance
  async batchRequest(requests) {
    const results = [];
    const batchPromises = requests.map(async (request, index) => {
      try {
        const result = await this.request(
          request.service,
          request.endpoint,
          request.options
        );
        results[index] = { success: true, data: result };
      } catch (error) {
        results[index] = { success: false, error: error.message };
      }
    });

    await Promise.all(batchPromises);
    return results;
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
  }

  // Get cache statistics
  getCacheStats() {
    return {
      size: this.cache.size,
      maxSize: this.cache.maxSize,
      hitRate: this.cache.hitRate,
    };
  }

  // Get rate limit status
  getRateLimitStatus(service) {
    const limit = this.rateLimits[service];
    if (!limit) return null;

    const requests = this.rateLimitMap.get(service) || [];
    const now = Date.now();
    const validRequests = requests.filter(time => now - time < limit.window);

    return {
      current: validRequests.length,
      limit: limit.requests,
      remaining: Math.max(0, limit.requests - validRequests.length),
      resetTime: this.getRateLimitResetTime(service),
    };
  }
}

// Export singleton instance
export default new ApiService();

/**
 * App-wide optimization and health check utility
 * Monitors performance, checks for issues, and provides recommendations
 */

import performanceOptimizer from './performanceOptimizer';
import errorHandler from './errorHandler';
import { getApiStatus } from '../services/finnhubService';

class AppOptimizer {
  constructor() {
    this.healthChecks = [];
    this.optimizations = [];
    this.metrics = {
      startTime: Date.now(),
      screenLoads: 0,
      apiCalls: 0,
      errors: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
  }

  // Performance health check
  async runHealthCheck() {
    const results = {
      timestamp: new Date().toISOString(),
      overall: 'good',
      issues: [],
      recommendations: [],
      metrics: {}
    };

    try {
      // Check performance optimizer stats
      const cacheStats = performanceOptimizer.getCacheStats();
      results.metrics.cache = cacheStats;

      if (cacheStats.expiredEntries > cacheStats.activeEntries) {
        results.issues.push('High cache expiry rate detected');
        results.recommendations.push('Consider increasing cache duration for frequently accessed data');
      }

      if (cacheStats.timersActive > 10) {
        results.issues.push('High number of active timers detected');
        results.recommendations.push('Review timer usage and ensure proper cleanup');
      }

      // Check API service health
      const apiStatus = getApiStatus();
      results.metrics.api = apiStatus;

      if (apiStatus.apiLimitReached) {
        results.issues.push('API rate limit reached');
        results.recommendations.push('Increase cache usage to reduce API calls');
      }

      if (apiStatus.pendingRequests > 5) {
        results.issues.push('High number of pending API requests');
        results.recommendations.push('Implement request batching or reduce concurrent requests');
      }

      // Check error rates
      const errorSummary = errorHandler.getErrorSummary();
      results.metrics.errors = errorSummary;

      if (errorSummary.last24Hours > 10) {
        results.issues.push('High error rate detected');
        results.recommendations.push('Review recent errors and implement fixes');
        results.overall = 'warning';
      }

      // Check memory usage (if available)
      if (performance.memory) {
        const memoryInfo = {
          used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
          total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
          limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
        };
        
        results.metrics.memory = memoryInfo;

        if (memoryInfo.used / memoryInfo.limit > 0.8) {
          results.issues.push('High memory usage detected');
          results.recommendations.push('Clear caches and review memory leaks');
          results.overall = 'warning';
        }
      }

      // Check app metrics
      results.metrics.app = {
        ...this.metrics,
        uptime: Date.now() - this.metrics.startTime
      };

      if (results.issues.length > 5) {
        results.overall = 'critical';
      } else if (results.issues.length > 2) {
        results.overall = 'warning';
      }

      console.log('Health Check Results:', results);
      return results;

    } catch (error) {
      console.error('Health check failed:', error);
      return {
        timestamp: new Date().toISOString(),
        overall: 'error',
        issues: ['Health check failed'],
        recommendations: ['Restart the application'],
        error: error.message
      };
    }
  }

  // Auto-optimization based on health check
  async autoOptimize() {
    const healthCheck = await this.runHealthCheck();
    const optimizations = [];

    try {
      // Clear expired cache entries
      const cacheStats = performanceOptimizer.getCacheStats();
      if (cacheStats.expiredEntries > 0) {
        performanceOptimizer.clearCache();
        optimizations.push('Cleared expired cache entries');
      }

      // Reset API limit if it's been a while
      const apiStatus = getApiStatus();
      if (apiStatus.apiLimitReached && Date.now() - apiStatus.lastApiCall > 60000) {
        // Reset after 1 minute of no calls
        const { resetApiLimit } = await import('../services/finnhubService');
        resetApiLimit();
        optimizations.push('Reset API rate limit');
      }

      // Clear old errors
      const errorSummary = errorHandler.getErrorSummary();
      if (errorSummary.totalErrors > 50) {
        errorHandler.clearLog();
        optimizations.push('Cleared error log');
      }

      // Memory cleanup if needed
      if (healthCheck.metrics.memory && healthCheck.metrics.memory.used > 100) {
        if (global.gc) {
          global.gc();
          optimizations.push('Triggered garbage collection');
        }
      }

      console.log('Auto-optimizations applied:', optimizations);
      return {
        success: true,
        optimizations,
        healthCheck
      };

    } catch (error) {
      console.error('Auto-optimization failed:', error);
      return {
        success: false,
        error: error.message,
        healthCheck
      };
    }
  }

  // Track performance metrics
  trackMetric(type, data = {}) {
    switch (type) {
      case 'screenLoad':
        this.metrics.screenLoads++;
        break;
      case 'apiCall':
        this.metrics.apiCalls++;
        break;
      case 'error':
        this.metrics.errors++;
        break;
      case 'cacheHit':
        this.metrics.cacheHits++;
        break;
      case 'cacheMiss':
        this.metrics.cacheMisses++;
        break;
      default:
        console.log('Unknown metric type:', type);
    }
  }

  // Get optimization recommendations
  getRecommendations() {
    const recommendations = [];

    // Cache hit ratio
    const totalCacheRequests = this.metrics.cacheHits + this.metrics.cacheMisses;
    if (totalCacheRequests > 0) {
      const hitRatio = this.metrics.cacheHits / totalCacheRequests;
      if (hitRatio < 0.5) {
        recommendations.push({
          type: 'cache',
          priority: 'high',
          message: 'Low cache hit ratio. Consider increasing cache duration.',
          action: 'Increase cache TTL for frequently accessed data'
        });
      }
    }

    // Error rate
    const uptime = Date.now() - this.metrics.startTime;
    const errorRate = this.metrics.errors / (uptime / 1000); // errors per second
    if (errorRate > 0.01) { // More than 1 error per 100 seconds
      recommendations.push({
        type: 'errors',
        priority: 'high',
        message: 'High error rate detected.',
        action: 'Review error handling and add more robust fallbacks'
      });
    }

    // API usage
    const apiRate = this.metrics.apiCalls / (uptime / 1000); // calls per second
    if (apiRate > 0.1) { // More than 1 call per 10 seconds
      recommendations.push({
        type: 'api',
        priority: 'medium',
        message: 'High API usage rate.',
        action: 'Implement more aggressive caching and request batching'
      });
    }

    return recommendations;
  }

  // Reset metrics
  resetMetrics() {
    this.metrics = {
      startTime: Date.now(),
      screenLoads: 0,
      apiCalls: 0,
      errors: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
  }

  // Start monitoring
  startMonitoring() {
    // Run health check every 5 minutes
    this.healthCheckInterval = setInterval(() => {
      this.runHealthCheck();
    }, 5 * 60 * 1000);

    // Auto-optimize every 10 minutes
    this.optimizeInterval = setInterval(() => {
      this.autoOptimize();
    }, 10 * 60 * 1000);

    console.log('App monitoring started');
  }

  // Stop monitoring
  stopMonitoring() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    if (this.optimizeInterval) {
      clearInterval(this.optimizeInterval);
    }
    console.log('App monitoring stopped');
  }

  // Get app status summary
  getStatusSummary() {
    const uptime = Date.now() - this.metrics.startTime;
    const uptimeMinutes = Math.floor(uptime / 60000);

    return {
      uptime: `${uptimeMinutes} minutes`,
      metrics: this.metrics,
      recommendations: this.getRecommendations(),
      lastOptimization: this.lastOptimization || 'Never'
    };
  }
}

// Global instance
const appOptimizer = new AppOptimizer();

// Helper functions
export const runHealthCheck = () => appOptimizer.runHealthCheck();
export const autoOptimize = () => appOptimizer.autoOptimize();
export const trackMetric = (type, data) => appOptimizer.trackMetric(type, data);
export const getRecommendations = () => appOptimizer.getRecommendations();
export const getStatusSummary = () => appOptimizer.getStatusSummary();
export const startMonitoring = () => appOptimizer.startMonitoring();
export const stopMonitoring = () => appOptimizer.stopMonitoring();

export default appOptimizer;

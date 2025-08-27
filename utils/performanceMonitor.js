// performanceMonitor.js - Performance monitoring and optimization tracking
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      renderTimes: new Map(),
      apiCalls: new Map(),
      memoryUsage: [],
      errors: [],
      slowOperations: []
    };
    this.startTime = Date.now();
    this.isEnabled = __DEV__;
  }

  // Track component render performance
  trackRender(componentName, startTime, endTime) {
    if (!this.isEnabled) return;

    const duration = endTime - startTime;
    const key = componentName;

    if (!this.metrics.renderTimes.has(key)) {
      this.metrics.renderTimes.set(key, {
        count: 0,
        totalTime: 0,
        avgTime: 0,
        maxTime: 0,
        minTime: Infinity,
        lastRender: null
      });
    }

    const stats = this.metrics.renderTimes.get(key);
    stats.count++;
    stats.totalTime += duration;
    stats.avgTime = stats.totalTime / stats.count;
    stats.maxTime = Math.max(stats.maxTime, duration);
    stats.minTime = Math.min(stats.minTime, duration);
    stats.lastRender = new Date();

    // Log slow renders
    if (duration > 100) {
      this.metrics.slowOperations.push({
        type: 'render',
        component: componentName,
        duration,
        timestamp: new Date()
      });
      console.warn(`Slow render detected: ${componentName} took ${duration}ms`);
    }
  }

  // Track API call performance
  trackApiCall(service, endpoint, startTime, endTime, success, error = null) {
    if (!this.isEnabled) return;

    const duration = endTime - startTime;
    const key = `${service}:${endpoint}`;

    if (!this.metrics.apiCalls.has(key)) {
      this.metrics.apiCalls.set(key, {
        count: 0,
        totalTime: 0,
        avgTime: 0,
        errors: 0,
        lastCall: null,
        successRate: 0
      });
    }

    const stats = this.metrics.apiCalls.get(key);
    stats.count++;
    stats.totalTime += duration;
    stats.avgTime = stats.totalTime / stats.count;
    stats.lastCall = new Date();

    if (!success) {
      stats.errors++;
      this.metrics.errors.push({
        service,
        endpoint,
        error: error?.message || 'Unknown error',
        duration,
        timestamp: new Date()
      });
    }

    stats.successRate = ((stats.count - stats.errors) / stats.count) * 100;

    // Log slow API calls
    if (duration > 5000) {
      this.metrics.slowOperations.push({
        type: 'api',
        service,
        endpoint,
        duration,
        timestamp: new Date()
      });
      console.warn(`Slow API call detected: ${key} took ${duration}ms`);
    }
  }

  // Track memory usage
  trackMemoryUsage() {
    if (!this.isEnabled) return;

    const timestamp = Date.now();
    this.metrics.memoryUsage.push({
      timestamp,
      uptime: timestamp - this.startTime
    });

    // Keep only last 100 entries
    if (this.metrics.memoryUsage.length > 100) {
      this.metrics.memoryUsage.shift();
    }
  }

  // Get performance summary
  getPerformanceSummary() {
    if (!this.isEnabled) return null;

    const summary = {
      uptime: Date.now() - this.startTime,
      renderStats: {},
      apiStats: {},
      errorCount: this.metrics.errors.length,
      slowOperationCount: this.metrics.slowOperations.length
    };

    // Render statistics
    this.metrics.renderTimes.forEach((stats, component) => {
      summary.renderStats[component] = {
        count: stats.count,
        avgTime: Math.round(stats.avgTime),
        maxTime: stats.maxTime,
        minTime: stats.minTime,
        lastRender: stats.lastRender
      };
    });

    // API statistics
    this.metrics.apiCalls.forEach((stats, endpoint) => {
      summary.apiStats[endpoint] = {
        count: stats.count,
        avgTime: Math.round(stats.avgTime),
        errors: stats.errors,
        successRate: Math.round(stats.successRate),
        lastCall: stats.lastCall
      };
    });

    return summary;
  }

  // Log performance summary
  logPerformanceSummary() {
    if (!this.isEnabled) return;

    const summary = this.getPerformanceSummary();
    if (!summary) return;

    console.group('📊 Performance Summary');
    console.log(`Uptime: ${Math.round(summary.uptime / 1000)}s`);
    console.log(`Errors: ${summary.errorCount}`);
    console.log(`Slow Operations: ${summary.slowOperationCount}`);

    if (Object.keys(summary.renderStats).length > 0) {
      console.group('Render Performance');
      Object.entries(summary.renderStats).forEach(([component, stats]) => {
        console.log(`${component}: ${stats.count} renders, avg ${stats.avgTime}ms`);
      });
      console.groupEnd();
    }

    if (Object.keys(summary.apiStats).length > 0) {
      console.group('API Performance');
      Object.entries(summary.apiStats).forEach(([endpoint, stats]) => {
        console.log(`${endpoint}: ${stats.count} calls, avg ${stats.avgTime}ms, ${stats.successRate}% success`);
      });
      console.groupEnd();
    }

    if (this.metrics.errors.length > 0) {
      console.group('Recent Errors');
      this.metrics.errors.slice(-5).forEach(error => {
        console.error(`${error.service}:${error.endpoint} - ${error.error}`);
      });
      console.groupEnd();
    }

    console.groupEnd();
  }

  // Clear metrics
  clearMetrics() {
    this.metrics.renderTimes.clear();
    this.metrics.apiCalls.clear();
    this.metrics.memoryUsage = [];
    this.metrics.errors = [];
    this.metrics.slowOperations = [];
  }

  // Get slowest operations
  getSlowestOperations(limit = 10) {
    return this.metrics.slowOperations
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  // Check if performance is degrading
  isPerformanceDegrading() {
    const recentErrors = this.metrics.errors.filter(
      error => Date.now() - error.timestamp.getTime() < 5 * 60 * 1000 // Last 5 minutes
    );

    const recentSlowOps = this.metrics.slowOperations.filter(
      op => Date.now() - op.timestamp.getTime() < 5 * 60 * 1000 // Last 5 minutes
    );

    return recentErrors.length > 5 || recentSlowOps.length > 10;
  }
}

// Export singleton instance
export default new PerformanceMonitor();

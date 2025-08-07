import { Platform } from 'react-native';
import Constants from 'expo-constants';

class DebugService {
  constructor() {
    this.logs = [];
    this.maxLogs = 100;
    this.isEnabled = __DEV__ || Constants.expoConfig?.extra?.DEBUG_MODE === 'true';
  }

  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      data,
      platform: Platform.OS,
      version: Platform.Version,
    };

    this.logs.push(logEntry);
    
    // Keep only the last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console logging
    const consoleMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    switch (level) {
      case 'error':
        console.error(consoleMessage, data);
        break;
      case 'warn':
        console.warn(consoleMessage, data);
        break;
      case 'info':
        console.info(consoleMessage, data);
        break;
      default:
        console.log(consoleMessage, data);
    }
  }

  error(message, error = null) {
    this.log('error', message, error);
  }

  warn(message, data = null) {
    this.log('warn', message, data);
  }

  info(message, data = null) {
    this.log('info', message, data);
  }

  debug(message, data = null) {
    if (this.isEnabled) {
      this.log('debug', message, data);
    }
  }

  // Track component lifecycle
  trackComponent(componentName, action, props = null) {
    this.debug(`Component ${componentName}: ${action}`, props);
  }

  // Track API calls
  trackAPI(apiName, method, url, response = null, error = null) {
    this.info(`API ${method} ${apiName}`, { url, response, error });
  }

  // Track navigation
  trackNavigation(from, to, params = null) {
    this.info(`Navigation: ${from} → ${to}`, params);
  }

  // Track Firebase operations
  trackFirebase(operation, collection, documentId = null, data = null, error = null) {
    this.info(`Firebase ${operation}`, { collection, documentId, data, error });
  }

  // Get all logs
  getLogs() {
    return [...this.logs];
  }

  // Get logs by level
  getLogsByLevel(level) {
    return this.logs.filter(log => log.level === level);
  }

  // Clear logs
  clearLogs() {
    this.logs = [];
  }

  // Export logs for debugging
  exportLogs() {
    return {
      timestamp: new Date().toISOString(),
      platform: Platform.OS,
      version: Platform.Version,
      expoVersion: Constants.expoConfig?.version || 'unknown',
      logs: this.logs,
      summary: {
        total: this.logs.length,
        errors: this.getLogsByLevel('error').length,
        warnings: this.getLogsByLevel('warn').length,
        info: this.getLogsByLevel('info').length,
        debug: this.getLogsByLevel('debug').length,
      }
    };
  }

  // Check for common Android issues
  checkAndroidIssues() {
    const issues = [];
    
    // Check for missing permissions
    if (Platform.OS === 'android') {
      this.info('Checking Android-specific issues...');
      
      // Check if we're in development mode
      if (__DEV__) {
        this.info('Running in development mode');
      }
      
      // Check for potential memory issues
      if (this.getLogsByLevel('error').length > 10) {
        issues.push('High number of errors detected');
      }
      
      // Check for Firebase issues
      const firebaseLogs = this.logs.filter(log => 
        log.message.includes('Firebase') || log.message.includes('firebase')
      );
      if (firebaseLogs.length > 0) {
        this.info('Firebase operations detected', firebaseLogs.length);
      }
    }
    
    return issues;
  }

  // Monitor app performance
  startPerformanceMonitoring() {
    this.info('Starting performance monitoring');
    
    // Monitor memory usage (if available)
    if (global.performance && global.performance.memory) {
      setInterval(() => {
        const memory = global.performance.memory;
        this.debug('Memory usage', {
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
          limit: memory.jsHeapSizeLimit
        });
      }, 10000); // Every 10 seconds
    }
  }
}

// Create singleton instance
const debugService = new DebugService();

// Add global error handler
if (typeof global !== 'undefined') {
  global.debugService = debugService;
}

export default debugService; 
/**
 * Centralized Error Handling Utility
 * Provides consistent error handling across the app
 */

import { Alert } from 'react-native';

class ErrorHandler {
  constructor() {
    this.errorLog = [];
    this.maxLogSize = 100;
  }

  // Log error for debugging
  logError(error, context = '') {
    const errorEntry = {
      timestamp: new Date().toISOString(),
      error: error.message || error,
      stack: error.stack,
      context,
      type: error.constructor.name
    };

    this.errorLog.unshift(errorEntry);
    
    // Keep log size manageable
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(0, this.maxLogSize);
    }

    console.error(`[${context}]`, error);
  }

  // Handle Firebase errors
  handleFirebaseError(error, context = 'Firebase operation') {
    this.logError(error, context);

    let userMessage = 'Something went wrong. Please try again.';
    let alertTitle = 'Error';

    switch (error.code) {
      case 'permission-denied':
        alertTitle = 'Access Denied';
        userMessage = 'You don\'t have permission to access this data.';
        break;
      case 'unavailable':
        alertTitle = 'Service Unavailable';
        userMessage = 'The service is temporarily unavailable. Please try again later.';
        break;
      case 'deadline-exceeded':
        alertTitle = 'Request Timeout';
        userMessage = 'The request took too long. Please check your connection and try again.';
        break;
      case 'resource-exhausted':
        alertTitle = 'Service Busy';
        userMessage = 'The service is busy. Please try again in a moment.';
        break;
      case 'unauthenticated':
        alertTitle = 'Authentication Required';
        userMessage = 'Please sign in to continue.';
        break;
      default:
        if (error.message?.includes('offline')) {
          alertTitle = 'Connection Error';
          userMessage = 'Please check your internet connection and try again.';
        }
    }

    return { alertTitle, userMessage };
  }

  // Handle API errors
  handleApiError(error, context = 'API call') {
    this.logError(error, context);

    let userMessage = 'Unable to fetch data. Please try again.';
    let alertTitle = 'Network Error';

    if (error.message?.includes('timeout')) {
      alertTitle = 'Request Timeout';
      userMessage = 'The request took too long. Please check your connection.';
    } else if (error.message?.includes('404')) {
      alertTitle = 'Data Not Found';
      userMessage = 'The requested data could not be found.';
    } else if (error.message?.includes('429') || error.message?.includes('rate limit')) {
      alertTitle = 'Too Many Requests';
      userMessage = 'Please wait a moment before trying again.';
    } else if (error.message?.includes('403')) {
      alertTitle = 'Access Forbidden';
      userMessage = 'Access to this data is restricted.';
    } else if (error.message?.includes('500')) {
      alertTitle = 'Server Error';
      userMessage = 'The server encountered an error. Please try again later.';
    }

    return { alertTitle, userMessage };
  }

  // Handle stock data errors
  handleStockDataError(error, symbol, context = 'Stock data') {
    this.logError(error, `${context} for ${symbol}`);

    let userMessage = `Unable to load data for ${symbol}. Please try again.`;
    let alertTitle = 'Data Error';

    if (error.message?.includes('API_LIMIT_REACHED')) {
      alertTitle = 'API Limit Reached';
      userMessage = 'Using cached data due to API limits. Data may be delayed.';
    } else if (error.message?.includes('No price data')) {
      alertTitle = 'No Data Available';
      userMessage = `No price data is available for ${symbol} at this time.`;
    }

    return { alertTitle, userMessage };
  }

  // Show user-friendly error alert
  showAlert(error, context = '', customMessage = null) {
    let alertData;

    if (customMessage) {
      alertData = {
        alertTitle: 'Error',
        userMessage: customMessage
      };
    } else if (error.code) {
      // Firebase error
      alertData = this.handleFirebaseError(error, context);
    } else if (context.includes('API') || context.includes('fetch')) {
      // API error
      alertData = this.handleApiError(error, context);
    } else if (context.includes('stock') || context.includes('price')) {
      // Stock data error
      const symbol = context.match(/([A-Z]{1,5})/)?.[1] || 'stock';
      alertData = this.handleStockDataError(error, symbol, context);
    } else {
      // Generic error
      this.logError(error, context);
      alertData = {
        alertTitle: 'Error',
        userMessage: 'An unexpected error occurred. Please try again.'
      };
    }

    Alert.alert(alertData.alertTitle, alertData.userMessage);
    return alertData;
  }

  // Handle async operations with error handling
  async withErrorHandling(operation, context = '', fallback = null) {
    try {
      return await operation();
    } catch (error) {
      this.showAlert(error, context);
      
      if (fallback !== null) {
        return fallback;
      }
      
      throw error;
    }
  }

  // Retry operation with exponential backoff
  async retryOperation(operation, maxRetries = 3, context = '') {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries) {
          this.showAlert(error, context);
          throw error;
        }
        
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, attempt - 1) * 1000;
        console.log(`Attempt ${attempt} failed for ${context}, retrying in ${delay}ms...`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  }

  // Get error summary for debugging
  getErrorSummary() {
    const last24Hours = this.errorLog.filter(
      entry => Date.now() - new Date(entry.timestamp).getTime() < 24 * 60 * 60 * 1000
    );

    const errorCounts = {};
    last24Hours.forEach(entry => {
      const key = entry.context || 'Unknown';
      errorCounts[key] = (errorCounts[key] || 0) + 1;
    });

    return {
      totalErrors: this.errorLog.length,
      last24Hours: last24Hours.length,
      errorCounts,
      recentErrors: this.errorLog.slice(0, 5)
    };
  }

  // Clear error log
  clearLog() {
    this.errorLog = [];
    console.log('Error log cleared');
  }

  // Check if error is recoverable
  isRecoverableError(error) {
    const recoverableErrors = [
      'timeout',
      'network',
      'unavailable',
      'deadline-exceeded',
      'resource-exhausted'
    ];

    const errorMessage = error.message?.toLowerCase() || '';
    const errorCode = error.code?.toLowerCase() || '';

    return recoverableErrors.some(recoverable => 
      errorMessage.includes(recoverable) || errorCode.includes(recoverable)
    );
  }
}

// Global instance
const errorHandler = new ErrorHandler();

// Helper functions
export const handleError = (error, context, customMessage) => 
  errorHandler.showAlert(error, context, customMessage);

export const withErrorHandling = (operation, context, fallback) => 
  errorHandler.withErrorHandling(operation, context, fallback);

export const retryOperation = (operation, maxRetries, context) => 
  errorHandler.retryOperation(operation, maxRetries, context);

export const logError = (error, context) => 
  errorHandler.logError(error, context);

export const getErrorSummary = () => 
  errorHandler.getErrorSummary();

export const isRecoverableError = (error) => 
  errorHandler.isRecoverableError(error);

export default errorHandler;

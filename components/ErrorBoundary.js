import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import debugService from '../services/debugService';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Log to debug service
    debugService.error('ErrorBoundary caught an error', {
      error: error.toString(),
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      platform: Platform.OS
    });
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#ef4444" />
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>
            The app encountered an unexpected error. This might be due to:
          </Text>
          <View style={styles.errorList}>
            <Text style={styles.errorItem}>• Network connectivity issues</Text>
            <Text style={styles.errorItem}>• Chart rendering problems</Text>
            <Text style={styles.errorItem}>• Data loading failures</Text>
          </View>
          <TouchableOpacity style={styles.retryButton} onPress={this.handleRetry}>
            <Ionicons name="refresh" size={20} color="#ffffff" />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
          {__DEV__ && this.state.error && (
            <ScrollView style={styles.debugContainer}>
              <Text style={styles.debugTitle}>Debug Information:</Text>
              <Text style={styles.debugText}>Error: {this.state.error.toString()}</Text>
              {this.state.error.stack && (
                <Text style={styles.debugText}>Stack: {this.state.error.stack}</Text>
              )}
              {this.state.errorInfo && this.state.errorInfo.componentStack && (
                <Text style={styles.debugText}>Component Stack: {this.state.errorInfo.componentStack}</Text>
              )}
              <TouchableOpacity 
                style={styles.exportButton} 
                onPress={() => {
                  const logs = debugService.exportLogs();
                  Alert.alert('Debug Logs', JSON.stringify(logs, null, 2));
                }}
              >
                <Text style={styles.exportButtonText}>Export Debug Logs</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    padding: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 20,
    marginBottom: 10,
  },
  errorMessage: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 20,
  },
  errorList: {
    marginBottom: 30,
  },
  errorItem: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 5,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366f1',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  debugContainer: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    maxWidth: '100%',
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#f59e0b',
    marginBottom: 5,
  },
  debugText: {
    fontSize: 12,
    color: '#94a3b8',
    fontFamily: 'monospace',
  },
  exportButton: {
    backgroundColor: '#059669',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 10,
  },
  exportButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default ErrorBoundary; 
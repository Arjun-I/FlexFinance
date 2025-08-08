import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
// Removed debugService import - using console.error instead

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      showDetails: false 
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('❌ ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null,
      showDetails: false 
    });
  };

  handleShowDetails = () => {
    this.setState({ showDetails: !this.state.showDetails });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.errorCard}>
            <Ionicons name="warning" size={64} color="#ef4444" />
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.subtitle}>
              The app encountered an unexpected error. This might be due to:
            </Text>
            <View style={styles.bulletPoints}>
              <Text style={styles.bulletPoint}>• Network connectivity issues</Text>
              <Text style={styles.bulletPoint}>• Chart rendering problems</Text>
              <Text style={styles.bulletPoint}>• Data loading failures</Text>
            </View>
            
            <View style={styles.debugInfo}>
              <Text style={styles.debugTitle}>Debug Information:</Text>
              <Text style={styles.errorText}>
                Error: {this.state.error?.message || 'Unknown error'}
              </Text>
              <Text style={styles.errorText}>
                Stack: {this.state.error?.stack?.split('\n')[0] || 'No stack trace'}
              </Text>
            </View>

            {this.state.showDetails && (
              <ScrollView style={styles.detailsContainer}>
                <Text style={styles.detailsTitle}>Full Error Details:</Text>
                <Text style={styles.detailsText}>
                  {JSON.stringify(this.state.errorInfo, null, 2)}
                </Text>
              </ScrollView>
            )}

            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={styles.retryButton} 
                onPress={this.handleRetry}
              >
                <Ionicons name="refresh" size={20} color="#ffffff" />
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.detailsButton} 
                onPress={this.handleShowDetails}
              >
                <Ionicons name="information-circle" size={20} color="#6366f1" />
                <Text style={styles.detailsButtonText}>
                  {this.state.showDetails ? 'Hide Details' : 'Show Details'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
  },
  bulletPoints: {
    marginBottom: 20,
  },
  bulletPoint: {
    fontSize: 14,
    color: '#e2e8f0',
    marginBottom: 4,
    lineHeight: 20,
  },
  debugInfo: {
    backgroundColor: '#334155',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    width: '100%',
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  detailsContainer: {
    maxHeight: 200,
    backgroundColor: '#334155',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    width: '100%',
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  detailsText: {
    fontSize: 10,
    color: '#94a3b8',
    fontFamily: 'monospace',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
    justifyContent: 'center',
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#334155',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginLeft: 8,
    justifyContent: 'center',
  },
  detailsButtonText: {
    color: '#6366f1',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default ErrorBoundary; 
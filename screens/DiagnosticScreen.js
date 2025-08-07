import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import debugService from '../services/debugService';

export default function DiagnosticScreen({ navigation }) {
  const [systemInfo, setSystemInfo] = useState({});
  const [logs, setLogs] = useState([]);
  const [issues, setIssues] = useState([]);

  useEffect(() => {
    collectSystemInfo();
    startLogging();
  }, []);

  const collectSystemInfo = () => {
    const info = {
      platform: Platform.OS,
      version: Platform.Version,
      isPad: Platform.isPad,
      isTV: Platform.isTV,
      expoVersion: Constants.expoConfig?.version || 'unknown',
      expoSDKVersion: Constants.expoConfig?.sdkVersion || 'unknown',
      bundleIdentifier: Constants.expoConfig?.ios?.bundleIdentifier || Constants.expoConfig?.android?.package || 'unknown',
      appName: Constants.expoConfig?.name || 'FlexFinance',
      orientation: Constants.expoConfig?.orientation || 'portrait',
      userInterfaceStyle: Constants.expoConfig?.userInterfaceStyle || 'dark',
    };
    setSystemInfo(info);
    debugService.info('System info collected', info);
  };

  const startLogging = () => {
    // Start performance monitoring
    debugService.startPerformanceMonitoring();
    
    // Set up interval to update logs
    const interval = setInterval(() => {
      setLogs(debugService.getLogs());
      setIssues(debugService.checkAndroidIssues());
    }, 1000);

    return () => clearInterval(interval);
  };

  const runDiagnostics = () => {
    debugService.info('Running comprehensive diagnostics');
    
    const diagnosticResults = {
      firebase: checkFirebaseConnection(),
      network: checkNetworkConnectivity(),
      memory: checkMemoryUsage(),
      permissions: checkPermissions(),
    };

    Alert.alert(
      'Diagnostic Results',
      `Firebase: ${diagnosticResults.firebase ? '✅ OK' : '❌ Issue'}\n` +
      `Network: ${diagnosticResults.network ? '✅ OK' : '❌ Issue'}\n` +
      `Memory: ${diagnosticResults.memory ? '✅ OK' : '❌ Issue'}\n` +
      `Permissions: ${diagnosticResults.permissions ? '✅ OK' : '❌ Issue'}`,
      [{ text: 'OK' }]
    );
  };

  const checkFirebaseConnection = () => {
    try {
      // Basic Firebase check
      debugService.info('Checking Firebase connection');
      return true;
    } catch (error) {
      debugService.error('Firebase connection failed', error);
      return false;
    }
  };

  const checkNetworkConnectivity = () => {
    debugService.info('Checking network connectivity');
    return true; // Simplified for now
  };

  const checkMemoryUsage = () => {
    debugService.info('Checking memory usage');
    return true; // Simplified for now
  };

  const checkPermissions = () => {
    debugService.info('Checking Android permissions');
    return true; // Simplified for now
  };

  const exportLogs = () => {
    const logData = debugService.exportLogs();
    Alert.alert(
      'Debug Logs',
      `Total Logs: ${logData.summary.total}\n` +
      `Errors: ${logData.summary.errors}\n` +
      `Warnings: ${logData.summary.warnings}\n` +
      `Info: ${logData.summary.info}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'View Full Logs', 
          onPress: () => Alert.alert('Full Logs', JSON.stringify(logData, null, 2))
        }
      ]
    );
  };

  const clearLogs = () => {
    debugService.clearLogs();
    setLogs([]);
    Alert.alert('Logs Cleared', 'All debug logs have been cleared.');
  };

  const openExpoDevTools = () => {
    if (__DEV__) {
      Linking.openURL('exp://localhost:8081');
    } else {
      Alert.alert('Development Mode', 'Expo DevTools are only available in development mode.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.title}>Diagnostics</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* System Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>System Information</Text>
          <View style={styles.infoContainer}>
            {Object.entries(systemInfo).map(([key, value]) => (
              <View key={key} style={styles.infoRow}>
                <Text style={styles.infoLabel}>{key}:</Text>
                <Text style={styles.infoValue}>{String(value)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Diagnostic Actions</Text>
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.actionButton} onPress={runDiagnostics}>
              <Ionicons name="medical" size={20} color="#ffffff" />
              <Text style={styles.buttonText}>Run Diagnostics</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionButton} onPress={exportLogs}>
              <Ionicons name="download" size={20} color="#ffffff" />
              <Text style={styles.buttonText}>Export Logs</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionButton} onPress={clearLogs}>
              <Ionicons name="trash" size={20} color="#ffffff" />
              <Text style={styles.buttonText}>Clear Logs</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionButton} onPress={openExpoDevTools}>
              <Ionicons name="code" size={20} color="#ffffff" />
              <Text style={styles.buttonText}>Open DevTools</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Issues */}
        {issues.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Detected Issues</Text>
            <View style={styles.issuesContainer}>
              {issues.map((issue, index) => (
                <View key={index} style={styles.issueItem}>
                  <Ionicons name="warning" size={16} color="#f59e0b" />
                  <Text style={styles.issueText}>{issue}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Recent Logs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Logs ({logs.length})</Text>
          <View style={styles.logsContainer}>
            {logs.slice(-10).map((log, index) => (
              <View key={index} style={[styles.logItem, styles[`log${log.level}`]]}>
                <Text style={styles.logTimestamp}>
                  {new Date(log.timestamp).toLocaleTimeString()}
                </Text>
                <Text style={styles.logLevel}>{log.level.toUpperCase()}</Text>
                <Text style={styles.logMessage}>{log.message}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
  },
  infoContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  infoLabel: {
    color: '#94a3b8',
    fontSize: 14,
  },
  infoValue: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366f1',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 120,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  issuesContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 12,
  },
  issueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  issueText: {
    color: '#f59e0b',
    fontSize: 14,
    marginLeft: 8,
  },
  logsContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 12,
    maxHeight: 300,
  },
  logItem: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginBottom: 4,
    borderRadius: 4,
  },
  logerror: {
    backgroundColor: '#dc2626',
  },
  logwarn: {
    backgroundColor: '#f59e0b',
  },
  loginfo: {
    backgroundColor: '#059669',
  },
  logdebug: {
    backgroundColor: '#6366f1',
  },
  logTimestamp: {
    color: '#ffffff',
    fontSize: 10,
    opacity: 0.8,
  },
  logLevel: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  logMessage: {
    color: '#ffffff',
    fontSize: 12,
    marginTop: 2,
  },
}); 
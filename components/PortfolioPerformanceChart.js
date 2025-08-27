import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Animated } from 'react-native';
import portfolioPerformanceService from '../services/portfolioPerformanceService';

const { width } = Dimensions.get('window');

const COLORS = {
  primary: '#00d4ff',
  success: '#4ecdc4',
  danger: '#ff6b6b',
  warning: '#feca57',
  background: {
    card: 'rgba(255,255,255,0.05)',
  },
  text: {
    primary: '#ffffff',
    secondary: '#b4bcd0',
  },
};

const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

const TYPOGRAPHY = {
  h3: { fontSize: 18, fontWeight: '600', lineHeight: 24 },
  body: { fontSize: 14, fontWeight: '400', lineHeight: 20 },
  caption: { fontSize: 12, fontWeight: '400', lineHeight: 16 },
  small: { fontSize: 10, fontWeight: '400', lineHeight: 14 },
};

const PortfolioPerformanceChart = ({ user, onPress }) => {
  const [loading, setLoading] = useState(true);
  const [performanceData, setPerformanceData] = useState(null);
  const [sectorData, setSectorData] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isFlipped, setIsFlipped] = useState(false);
  
  const flipAnim = useRef(new Animated.Value(0)).current;
  const frontInterpolate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ['0deg', '180deg'],
  });
  const backInterpolate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ['180deg', '360deg'],
  });

  useEffect(() => {
    if (user?.uid) {
      // Set user ID for the service
      portfolioPerformanceService.setUserId(user.uid);
      loadPerformanceData();
    }
  }, [user]);

  const loadPerformanceData = async () => {
    if (!user?.uid) return;
    
    setLoading(true);
    try {
      console.log('Loading portfolio performance for user:', user.uid);
      const data = await portfolioPerformanceService.getPortfolioPerformance(user.uid);
      console.log('Received performance data:', data);
      
      setPerformanceData(data);
      
      // Load sector data for pie chart
      console.log('Loading sector data...');
      try {
        const sectorData = await portfolioPerformanceService.getSectorHoldings();
        console.log('Received sector data:', sectorData);
        setSectorData(sectorData);
      } catch (sectorError) {
        console.error('Error loading sector data:', sectorError);
        setSectorData([]);
      }
      
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading portfolio performance:', error);
      // Set default data on error
      setPerformanceData({
        currentValue: 0,
        totalReturn: 0,
        totalReturnPercent: 0,
        dailyChange: 0,
        dailyChangePercent: 0,
        cashBalance: 0,
        holdingsCount: 0,
        sectorCount: 0,
        bestPerformer: 'N/A'
      });
      setSectorData(null);
    } finally {
      setLoading(false);
    }
  };

  const generateChartData = (data) => {
    if (!data || !data.portfolioHistory || data.portfolioHistory.length === 0) {
      console.log('No portfolio history data available');
      return null;
    }

    // Take last 30 days of data or all available data
    const history = data.portfolioHistory.slice(-30);
    console.log('Processing portfolio history:', history);
    
    const values = history.map(item => item.totalValue || 0);
    const dates = history.map(item => {
      // Handle different date formats
      if (item.date) {
        return new Date(item.date);
      } else if (item.timestamp) {
        return typeof item.timestamp === 'string' ? new Date(item.timestamp) : item.timestamp;
      } else {
        return new Date();
      }
    });
    
    console.log('Chart values:', values);
    console.log('Chart dates:', dates);
    
    return {
      values,
      dates,
      labels: dates.map(date => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
    };
  };

  const handleFlip = () => {
    const toValue = isFlipped ? 0 : 180;
    Animated.spring(flipAnim, {
      toValue,
      friction: 8,
      tension: 10,
      useNativeDriver: true,
    }).start();
    setIsFlipped(!isFlipped);
  };

  const handleRefresh = async () => {
    await loadPerformanceData();
  };

  const renderPerformanceIndicator = () => {
    if (!performanceData) return null;

    const totalReturnPercent = performanceData.totalReturnPercent || 0;
    const isPositive = totalReturnPercent >= 0;
    const absReturn = Math.abs(totalReturnPercent);
    
    let status = 'Neutral';
    let statusColor = COLORS.text.secondary;
    let icon = '→';
    
    if (absReturn > 5) {
      status = isPositive ? 'Strong Growth' : 'Significant Decline';
      statusColor = isPositive ? COLORS.success : COLORS.danger;
      icon = isPositive ? '↗' : '↘';
    } else if (absReturn > 1) {
      status = isPositive ? 'Moderate Growth' : 'Moderate Decline';
      statusColor = isPositive ? COLORS.success : COLORS.danger;
      icon = isPositive ? '↗' : '↘';
    } else if (absReturn > 0.1) {
      status = isPositive ? 'Slight Growth' : 'Slight Decline';
      statusColor = isPositive ? COLORS.success : COLORS.danger;
      icon = isPositive ? '↗' : '↘';
    }

    const fillPercentage = Math.min(Math.abs(totalReturnPercent) / 10, 1); // Cap at 10%
    const fillColor = isPositive ? COLORS.success : COLORS.danger;

    return (
      <View style={styles.performanceIndicator}>
        <View style={styles.indicatorHeader}>
          <Text style={styles.indicatorIcon}>{icon}</Text>
          <Text style={[styles.indicatorStatus, { color: statusColor }]}>
            {status}
          </Text>
        </View>
        
        <View style={styles.indicatorBar}>
          <Animated.View
            style={[
              styles.indicatorFill,
              {
                width: `${fillPercentage * 100}%`,
                backgroundColor: fillColor,
              },
            ]}
          />
        </View>
        
        <Text style={styles.indicatorText}>
          {isPositive ? '+' : ''}{totalReturnPercent.toFixed(2)}% total return
        </Text>
      </View>
    );
  };

  const renderMetricCard = (label, value, percent = null, subtitle = '') => {
    const formatCurrency = (amount) => {
      if (amount === null || amount === undefined || isNaN(amount)) return 'N/A';
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);
    };

    const formatPercent = (percent) => {
      if (percent === null || percent === undefined || isNaN(percent)) return '';
      const sign = percent >= 0 ? '+' : '';
      return `${sign}${percent.toFixed(2)}%`;
    };

    // Handle null/undefined values
    const displayValue = value !== null && value !== undefined && !isNaN(value) ? formatCurrency(value) : 'N/A';
    const displayPercent = percent !== null && percent !== undefined && !isNaN(percent) ? formatPercent(percent) : '';
    const displaySubtitle = subtitle || '';

    return (
      <View style={styles.metricCard}>
        <Text style={styles.metricLabel}>{label}</Text>
        <Text style={styles.metricValue}>{displayValue}</Text>
        {displayPercent && (
          <Text style={[
            styles.metricPercent,
            { color: percent >= 0 ? COLORS.success : COLORS.danger }
          ]}>
            {displayPercent}
          </Text>
        )}
        {displaySubtitle && <Text style={styles.metricSubtitle}>{displaySubtitle}</Text>}
      </View>
    );
  };

  const renderPieChart = () => {
    console.log('Rendering pie chart with sector data:', sectorData);
    
    if (!sectorData || sectorData.length === 0) {
      console.log('No sector data available, showing empty state');
      return (
        <View style={styles.emptyChart}>
          <Text style={styles.emptyChartText}>No sector data available</Text>
          <Text style={styles.emptyChartSubtext}>Start trading to see your sector breakdown</Text>
        </View>
      );
    }

    // Check if all sectors are "Unknown" or have zero values
    const validSectors = sectorData.filter(item => item.sector !== 'Unknown' && item.value > 0);
    if (validSectors.length === 0) {
      console.log('No valid sector data available');
      return (
        <View style={styles.emptyChart}>
          <Text style={styles.emptyChartText}>No sector data available</Text>
          <Text style={styles.emptyChartSubtext}>Your holdings need sector information</Text>
        </View>
      );
    }

    const pieColors = [
      '#00d4ff', '#4ecdc4', '#ff6b6b', '#feca57', '#a8e6cf',
      '#ff8b94', '#96ceb4', '#feca57', '#ff9ff3', '#54a0ff'
    ];

    return (
      <View style={styles.pieChartContainer}>
        <View style={styles.pieChartHeader}>
          <Text style={styles.pieChartTitle}>Sector Allocation</Text>
        </View>
        
        <View style={styles.pieChartContent}>
          <View style={styles.pieChart}>
            {/* Simple pie chart representation */}
            <View style={styles.pieChartCircle}>
              {sectorData.map((item, index) => {
                const percentage = item.percentage;
                const color = pieColors[index % pieColors.length];
                
                return (
                  <View
                    key={index}
                    style={[
                      styles.pieSlice,
                      {
                        backgroundColor: color,
                        width: `${percentage}%`,
                        height: '100%',
                      }
                    ]}
                  />
                );
              })}
            </View>
          </View>
          
          <View style={styles.pieLegend}>
            {sectorData.map((item, index) => (
              <View key={index} style={styles.legendItem}>
                <View style={[
                  styles.legendColor,
                  { backgroundColor: pieColors[index % pieColors.length] }
                ]} />
                <View style={styles.legendText}>
                  <Text style={styles.legendSector}>{item.sector}</Text>
                  <Text style={styles.legendPercentage}>{item.percentage.toFixed(1)}%</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  };

  const renderChart = () => {
    // This function is no longer used since we only show pie chart
    return null;
  };

  if (loading) {
    return (
      <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.9}>
        <LinearGradient colors={[COLORS.background.card, 'rgba(255,255,255,0.02)']} style={styles.card}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading portfolio data...</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.flipContainer,
          {
            transform: [{ rotateY: frontInterpolate }],
          },
        ]}
      >
        {/* Front Side - Performance Metrics */}
        <TouchableOpacity style={styles.card} onPress={handleFlip} activeOpacity={0.9}>
          <LinearGradient colors={[COLORS.background.card, 'rgba(255,255,255,0.02)']} style={styles.cardContent}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerContent}>
                <Text style={styles.title}>Portfolio Performance</Text>
                {lastUpdated && (
                  <Text style={styles.lastUpdated}>
                    Updated {lastUpdated.toLocaleTimeString()}
                  </Text>
                )}
              </View>
              <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
                <Text style={styles.refreshButtonText}>↻</Text>
              </TouchableOpacity>
            </View>

            {/* Performance Indicator */}
            {renderPerformanceIndicator()}

            {/* Key Metrics */}
            {performanceData && (
              <View style={styles.metricsContainer}>
                <View style={styles.metricsRow}>
                  {renderMetricCard(
                    'Portfolio Value',
                    (performanceData.currentValue || 0),
                    0,
                    'Total equity + cash'
                  )}
                  {renderMetricCard(
                    'Total Return',
                    performanceData.totalReturn || 0,
                    performanceData.totalReturnPercent || 0,
                    'Gain/Loss this period'
                  )}
                </View>
                <View style={styles.metricsRow}>
                  {renderMetricCard(
                    'Daily Change',
                    performanceData.dailyChange || 0,
                    performanceData.dailyChangePercent || 0,
                    'Today\'s performance'
                  )}
                  {renderMetricCard(
                    'Equity Value',
                    (performanceData.currentValue || 0) - (performanceData.cashBalance || 0),
                    0,
                    'Stock holdings value'
                  )}
                </View>
              </View>
            )}

            {/* Quick Stats */}
            {performanceData && (
              <View style={styles.quickStats}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Holdings</Text>
                  <Text style={styles.statValue}>{performanceData.holdingsCount || 0}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Best Performer</Text>
                  <Text style={styles.statValue}>{performanceData.bestPerformer || 'N/A'}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Sectors</Text>
                  <Text style={styles.statValue}>{performanceData.sectorCount || 0}</Text>
                </View>
              </View>
            )}

            {/* Tap to flip hint */}
            <View style={styles.expandHint}>
              <Text style={styles.expandHintText}>Tap to view chart</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      <Animated.View
        style={[
          styles.flipContainer,
          styles.flipBack,
          {
            transform: [{ rotateY: backInterpolate }],
          },
        ]}
      >
        {/* Back Side - Chart */}
        <TouchableOpacity style={styles.card} onPress={handleFlip} activeOpacity={0.9}>
          <LinearGradient colors={[COLORS.background.card, 'rgba(255,255,255,0.02)']} style={styles.cardContent}>
            {renderPieChart()}
            
            {/* Tap to flip back hint */}
            <View style={styles.expandHint}>
              <Text style={styles.expandHintText}>Tap to view metrics</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: SPACING.sm,
    height: 260, // Reduced height for dashboard overview
    maxHeight: 260,
  },
  flipContainer: {
    backfaceVisibility: 'hidden',
    height: '100%',
  },
  flipBack: {
    transform: [{ rotateY: '180deg' }],
  },
  card: {
    borderRadius: 16,
    height: '100%',
    maxHeight: 260, // Ensure maximum height constraint
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  cardContent: {
    borderRadius: 16,
    padding: SPACING.md,
    height: '100%',
    justifyContent: 'space-between', // Distribute content evenly
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  lastUpdated: {
    ...TYPOGRAPHY.small,
    color: COLORS.text.secondary,
  },
  refreshButton: {
    padding: SPACING.sm,
  },
  refreshButtonText: {
    fontSize: 18,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: SPACING.xl,
  },
  loadingText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
    marginTop: SPACING.md,
  },
  performanceIndicator: {
    marginBottom: SPACING.sm,
  },
  indicatorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  indicatorIcon: {
    fontSize: 24,
    marginRight: SPACING.sm,
  },
  indicatorStatus: {
    ...TYPOGRAPHY.body,
    fontWeight: '700',
  },
  indicatorBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    marginBottom: SPACING.xs,
    overflow: 'hidden',
  },
  indicatorFill: {
    height: '100%',
    borderRadius: 3,
  },
  indicatorText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
  },
  metricsContainer: {
    marginBottom: SPACING.sm,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  metricCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: SPACING.xs,
    borderRadius: 6,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '400',
    color: COLORS.text.secondary,
    marginBottom: 2,
    textAlign: 'center',
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
    color: COLORS.text.primary,
  },
  metricPercent: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  metricSubtitle: {
    fontSize: 9,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: SPACING.xs,
    borderRadius: 6,
    marginBottom: SPACING.xs,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    color: COLORS.text.secondary,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 12,
    color: COLORS.text.primary,
    fontWeight: '600',
  },
  expandHint: {
    alignItems: 'center',
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  expandHintText: {
    ...TYPOGRAPHY.small,
    color: COLORS.text.secondary,
  },

  // Chart styles
  chartContainer: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 200, // Ensure minimum height for chart
  },
  chartHeader: {
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  chartTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  chartPeriod: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
  },
  chartWithAxes: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    height: 120, // Reduced height for better fit
  },
  yAxis: {
    width: 60,
    height: 120,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginRight: SPACING.xs,
  },
  xAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 60,
    marginTop: SPACING.xs,
  },
  axisLabel: {
    ...TYPOGRAPHY.small,
    color: COLORS.text.secondary,
  },
  chartArea: {
    flex: 1,
    height: 120,
    position: 'relative',
  },
  chartLine: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  chartSegment: {
    position: 'absolute',
    height: 2,
    borderRadius: 1,
  },
  emptyChart: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 120,
  },
  emptyChartText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
  },
  emptyChartSubtext: {
    ...TYPOGRAPHY.small,
    color: COLORS.text.secondary,
    marginTop: SPACING.xs,
  },
  pieChartContainer: {
    alignItems: 'center',
    padding: SPACING.md,
  },
  pieChartHeader: {
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  pieChartTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text.primary,
    textAlign: 'center',
  },
  pieChartContent: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  pieChart: {
    width: 100,
    height: 100,
    marginRight: SPACING.lg,
  },
  pieChartCircle: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  pieSlice: {
    height: '100%',
    minWidth: 1,
  },
  pieLegend: {
    width: '100%',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: SPACING.sm,
  },
  legendText: {
    flex: 1,
  },
  legendSector: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  legendPercentage: {
    ...TYPOGRAPHY.small,
    color: COLORS.text.secondary,
  },
});

export default PortfolioPerformanceChart;

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import portfolioPerformanceService from '../services/portfolioPerformanceService';

const { width } = Dimensions.get('window');

const COLORS = {
  primary: '#00d4ff',
  success: '#4ecdc4',
  danger: '#ff6b6b',
  text: {
    primary: '#ffffff',
    secondary: '#b4bcd0',
    accent: '#8b9dc3',
  },
  background: {
    card: 'rgba(255,255,255,0.05)',
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
  h1: { fontSize: 28, fontWeight: '700', lineHeight: 36 },
  h2: { fontSize: 24, fontWeight: '600', lineHeight: 32 },
  h3: { fontSize: 20, fontWeight: '600', lineHeight: 28 },
  body: { fontSize: 16, fontWeight: '400', lineHeight: 24 },
  caption: { fontSize: 14, fontWeight: '500', lineHeight: 20 },
  small: { fontSize: 12, fontWeight: '400', lineHeight: 16 },
};

const PortfolioPerformanceChart = ({ userId, onPress }) => {
  const [chartData, setChartData] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('1M');
  const [loading, setLoading] = useState(true);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [performanceSummary, setPerformanceSummary] = useState(null);

  const periods = [
    { key: '1W', label: '1W' },
    { key: '1M', label: '1M' },
    { key: '3M', label: '3M' },
    { key: '1Y', label: '1Y' },
    { key: 'ALL', label: 'ALL' },
  ];

  useEffect(() => {
    if (userId) {
      portfolioPerformanceService.setUserId(userId);
      loadChartData();
      loadPerformanceSummary();
    }
  }, [userId, selectedPeriod]);

  const loadChartData = async () => {
    setLoading(true);
    try {
      const data = await portfolioPerformanceService.getChartData(selectedPeriod);
      setChartData(data);
    } catch (error) {
      console.error('Error loading portfolio chart data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPerformanceSummary = async () => {
    try {
      const summary = await portfolioPerformanceService.getPerformanceSummary();
      setPerformanceSummary(summary);
    } catch (error) {
      console.error('Error loading performance summary:', error);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const renderChart = () => {
    if (!chartData || !chartData.values || chartData.values.length === 0) {
      return (
        <View style={styles.emptyChart}>
          <Text style={styles.emptyChartText}>No performance data available</Text>
          <Text style={styles.emptyChartSubtext}>Start trading to see your portfolio performance</Text>
        </View>
      );
    }

    const values = chartData.values;
    const timestamps = chartData.timestamps;
    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);
    const valueRange = maxValue - minValue;
    const chartHeight = 120;
    const chartWidth = width - 48;

    const getYPosition = (value) => {
      if (valueRange === 0) return chartHeight / 2;
      return chartHeight - ((value - minValue) / valueRange) * chartHeight;
    };

    const handlePointPress = (index) => {
      const value = values[index];
      const timestamp = timestamps[index];
      setSelectedPoint({ index, value, timestamp });
    };

    return (
      <View style={styles.chartContainer}>
        {/* Value Labels */}
        <View style={styles.valueLabels}>
          <Text style={styles.valueLabel}>{formatCurrency(maxValue)}</Text>
          <Text style={styles.valueLabel}>{formatCurrency(minValue)}</Text>
        </View>

        {/* Chart Area */}
        <View style={styles.chartArea}>
          {/* Grid Lines */}
          <View style={styles.gridLines}>
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => (
              <View
                key={index}
                style={[
                  styles.gridLine,
                  { top: ratio * chartHeight }
                ]}
              />
            ))}
          </View>

          {/* Chart Line */}
          <View style={styles.chartLine}>
            {values.map((value, index) => {
              if (index === 0) return null;
              const prevValue = values[index - 1];
              const x1 = ((index - 1) / (values.length - 1)) * chartWidth;
              const y1 = getYPosition(prevValue);
              const x2 = (index / (values.length - 1)) * chartWidth;
              const y2 = getYPosition(value);
              
              return (
                <View
                  key={index}
                  style={[
                    styles.chartSegment,
                    {
                      left: x1,
                      top: y1,
                      width: Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)),
                      transform: [
                        {
                          rotate: `${Math.atan2(y2 - y1, x2 - x1)}rad`
                        }
                      ],
                      backgroundColor: value >= prevValue ? COLORS.success : COLORS.danger
                    }
                  ]}
                />
              );
            })}
          </View>

          {/* Interactive Points */}
          {values.map((value, index) => {
            const x = (index / (values.length - 1)) * chartWidth;
            const y = getYPosition(value);
            
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.chartPoint,
                  {
                    left: x - 4,
                    top: y - 4,
                    backgroundColor: selectedPoint?.index === index ? COLORS.primary : 'transparent',
                  }
                ]}
                onPress={() => handlePointPress(index)}
              />
            );
          })}

          {/* Selected Point Indicator */}
          {selectedPoint && (
            <View
              style={[
                styles.selectedPoint,
                {
                  left: (selectedPoint.index / (values.length - 1)) * chartWidth - 6,
                  top: getYPosition(selectedPoint.value) - 6,
                }
              ]}
            />
          )}
        </View>

        {/* Time Labels */}
        <View style={styles.timeLabels}>
          {timestamps.length > 0 && (
            <>
              <Text style={styles.timeLabel}>{formatDate(timestamps[0])}</Text>
              <Text style={styles.timeLabel}>{formatDate(timestamps[timestamps.length - 1])}</Text>
            </>
          )}
        </View>
      </View>
    );
  };

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.9}>
      <LinearGradient colors={[COLORS.background.card, 'rgba(255,255,255,0.02)']} style={styles.card}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Portfolio Performance</Text>
          <View style={styles.periodSelector}>
            {periods.map((period) => (
              <TouchableOpacity
                key={period.key}
                style={[
                  styles.periodButton,
                  selectedPeriod === period.key && styles.periodButtonActive
                ]}
                onPress={() => setSelectedPeriod(period.key)}
              >
                <Text style={[
                  styles.periodButtonText,
                  selectedPeriod === period.key && styles.periodButtonTextActive
                ]}>
                  {period.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Performance Summary */}
        {performanceSummary && (
          <View style={styles.summaryContainer}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total Value</Text>
                <Text style={styles.summaryValue}>
                  {formatCurrency(performanceSummary.currentValue)}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total Return</Text>
                <Text style={[
                  styles.summaryValue,
                  { color: performanceSummary.totalReturn >= 0 ? COLORS.success : COLORS.danger }
                ]}>
                  {formatCurrency(performanceSummary.totalReturn)}
                </Text>
                <Text style={[
                  styles.summaryPercent,
                  { color: performanceSummary.totalReturnPercent >= 0 ? COLORS.success : COLORS.danger }
                ]}>
                  {formatPercent(performanceSummary.totalReturnPercent)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Chart */}
        <View style={styles.chartSection}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.loadingText}>Loading performance data...</Text>
            </View>
          ) : (
            renderChart()
          )}
        </View>

        {/* Selected Point Info */}
        {selectedPoint && (
          <View style={styles.selectedPointInfo}>
            <Text style={styles.selectedPointDate}>
              {formatDate(selectedPoint.timestamp)}
            </Text>
            <Text style={styles.selectedPointValue}>
              {formatCurrency(selectedPoint.value)}
            </Text>
          </View>
        )}

        {/* Tap to expand hint */}
        <View style={styles.expandHint}>
          <Text style={styles.expandHintText}>Tap to view full chart</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  card: {
    borderRadius: 16,
    padding: SPACING.lg,
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text.primary,
    fontWeight: '700',
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    padding: 2,
  },
  periodButton: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: 6,
  },
  periodButtonActive: {
    backgroundColor: COLORS.primary,
  },
  periodButtonText: {
    ...TYPOGRAPHY.small,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  periodButtonTextActive: {
    color: COLORS.text.primary,
    fontWeight: '700',
  },
  summaryContainer: {
    marginBottom: SPACING.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    flex: 1,
  },
  summaryLabel: {
    ...TYPOGRAPHY.small,
    color: COLORS.text.secondary,
    marginBottom: SPACING.xs,
  },
  summaryValue: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text.primary,
    fontWeight: '700',
  },
  summaryPercent: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
  },
  chartSection: {
    height: 140,
    marginBottom: SPACING.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
    marginTop: SPACING.sm,
  },
  emptyChart: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyChartText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
    marginBottom: SPACING.xs,
  },
  emptyChartSubtext: {
    ...TYPOGRAPHY.small,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  chartContainer: {
    flex: 1,
    position: 'relative',
  },
  valueLabels: {
    position: 'absolute',
    left: -35,
    top: 0,
    bottom: 0,
    justifyContent: 'space-between',
    zIndex: 1,
  },
  valueLabel: {
    ...TYPOGRAPHY.small,
    color: COLORS.text.secondary,
  },
  chartArea: {
    flex: 1,
    position: 'relative',
    marginLeft: 35,
  },
  gridLines: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  gridLine: {
    position: 'absolute',
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
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
  chartPoint: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  selectedPoint: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
    borderWidth: 2,
    borderColor: COLORS.text.primary,
  },
  timeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
  },
  timeLabel: {
    ...TYPOGRAPHY.small,
    color: COLORS.text.secondary,
  },
  selectedPointInfo: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    padding: SPACING.sm,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  selectedPointDate: {
    ...TYPOGRAPHY.small,
    color: COLORS.text.secondary,
  },
  selectedPointValue: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.primary,
    fontWeight: '700',
  },
  expandHint: {
    alignItems: 'center',
  },
  expandHintText: {
    ...TYPOGRAPHY.small,
    color: COLORS.text.secondary,
  },
});

export default PortfolioPerformanceChart;

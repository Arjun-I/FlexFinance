import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getStockHistory } from '../services/finnhubService';

const { width, height } = Dimensions.get('window');

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
    primary: '#0f0f23',
    secondary: '#1a1a2e',
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

const FullScreenChartModal = ({ visible, stock, onClose }) => {
  const [chartData, setChartData] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('1M');
  const [loading, setLoading] = useState(true);
  const [selectedPoint, setSelectedPoint] = useState(null);

  const periods = [
    { key: '1D', label: '1D' },
    { key: '1W', label: '1W' },
    { key: '1M', label: '1M' },
    { key: '3M', label: '3M' },
    { key: '1Y', label: '1Y' },
    { key: 'ALL', label: 'ALL' },
  ];

  useEffect(() => {
    if (visible && stock?.symbol) {
      loadChartData();
    }
  }, [visible, stock, selectedPeriod]);

  const loadChartData = async () => {
    setLoading(true);
    try {
      const historyData = await getStockHistory(stock.symbol, selectedPeriod);
      console.log('Raw chart data for', stock.symbol, ':', historyData);
      
      if (historyData && historyData.length > 0) {
        // Transform the data format for the chart
        const prices = historyData.map(item => item.close || item.price || 0).filter(price => price > 0);
        const timestamps = historyData.map(item => 
          item.timestamp ? item.timestamp * 1000 : new Date().getTime()
        );
        const volumes = historyData.map(item => item.volume || 0);
        
        // Validate we have valid price data
        if (prices.length > 0 && prices.some(price => !isNaN(price) && price > 0)) {
          const chartData = {
            prices,
            timestamps,
            volumes
          };
          
          console.log('Transformed chart data:', chartData);
          setChartData(chartData);
        } else {
          console.log('Invalid price data for', stock.symbol);
          setChartData(null);
        }
      } else {
        console.log('No chart data available for', stock.symbol);
        setChartData(null);
      }
    } catch (error) {
      console.error('Error loading chart data:', error);
      setChartData(null);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getPriceChange = () => {
    if (!chartData || !chartData.prices || chartData.prices.length < 2) {
      return { change: 0, percent: 0 };
    }
    
    const firstPrice = chartData.prices[0];
    const lastPrice = chartData.prices[chartData.prices.length - 1];
    const change = lastPrice - firstPrice;
    const percent = (change / firstPrice) * 100;
    
    return { change, percent };
  };

  const renderChart = () => {
    if (!chartData || !chartData.prices || chartData.prices.length === 0) return null;

    const prices = chartData.prices.filter(price => !isNaN(price) && price > 0);
    if (prices.length === 0) return null;
    
    const timestamps = chartData.timestamps || [];
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);
    
    // Add padding to the price range for better visualization
    const priceRange = maxPrice - minPrice;
    const padding = priceRange * 0.1; // 10% padding
    const adjustedMin = Math.max(0, minPrice - padding);
    const adjustedMax = maxPrice + padding;
    const adjustedRange = adjustedMax - adjustedMin;
    
    const chartHeight = height * 0.4;
    const chartWidth = width - 32;

    const getYPosition = (price) => {
      if (adjustedRange === 0) return chartHeight / 2;
      return chartHeight - ((price - adjustedMin) / adjustedRange) * chartHeight;
    };

    const handlePointPress = (index) => {
      const price = prices[index];
      const timestamp = timestamps[index] || new Date();
      setSelectedPoint({ index, price, timestamp });
    };

    return (
      <View style={styles.chartContainer}>
        {/* Price Labels */}
        <View style={styles.priceLabels}>
          <Text style={styles.priceLabel}>{formatPrice(adjustedMax)}</Text>
          <Text style={styles.priceLabel}>{formatPrice(adjustedMin)}</Text>
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
            {prices.map((price, index) => {
              if (index === 0) return null;
              const prevPrice = prices[index - 1];
              const x1 = ((index - 1) / (prices.length - 1)) * chartWidth;
              const y1 = getYPosition(prevPrice);
              const x2 = (index / (prices.length - 1)) * chartWidth;
              const y2 = getYPosition(price);
              
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
                      ]
                    }
                  ]}
                />
              );
            })}
          </View>

          {/* Interactive Points */}
          {prices.map((price, index) => {
            const x = (index / (prices.length - 1)) * chartWidth;
            const y = getYPosition(price);
            
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.chartPoint,
                  {
                    left: x - 8,
                    top: y - 8,
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
                  left: (selectedPoint.index / (prices.length - 1)) * chartWidth - 12,
                  top: getYPosition(selectedPoint.price) - 12,
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

  const { change, percent } = getPriceChange();
  const currentPrice = chartData?.prices?.[chartData.prices.length - 1] || stock?.price || 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <LinearGradient colors={[COLORS.background.primary, COLORS.background.secondary]} style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.symbol}>{stock?.symbol}</Text>
            <Text style={styles.companyName}>{stock?.name}</Text>
          </View>
          <View style={styles.priceInfo}>
            <Text style={styles.currentPrice}>{formatPrice(currentPrice)}</Text>
            <Text style={[
              styles.priceChange,
              { color: change >= 0 ? COLORS.success : COLORS.danger }
            ]}>
              {change >= 0 ? '+' : ''}{formatPrice(change)} ({percent >= 0 ? '+' : ''}{percent.toFixed(2)}%)
            </Text>
          </View>
        </View>

        {/* Period Selector */}
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

        {/* Chart */}
        <View style={styles.chartSection}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Loading chart data...</Text>
            </View>
          ) : chartData && chartData.prices && chartData.prices.length > 0 ? (
            renderChart()
          ) : (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataTitle}>📊 Chart Data Unavailable</Text>
              <Text style={styles.noDataText}>
                Chart data is currently unavailable for {stock?.symbol}.{'\n'}
                This may be due to API rate limits or temporary data issues.{'\n'}
                Please try again later.
              </Text>
              <TouchableOpacity 
                style={styles.retryButton}
                onPress={loadChartData}
              >
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Selected Point Info */}
        {selectedPoint && (
          <View style={styles.selectedPointInfo}>
            <Text style={styles.selectedPointDate}>
              {formatDate(selectedPoint.timestamp)}
            </Text>
            <Text style={styles.selectedPointPrice}>
              {formatPrice(selectedPoint.price)}
            </Text>
          </View>
        )}


      </LinearGradient>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    paddingTop: SPACING.xl + 20,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  closeButtonText: {
    fontSize: 24,
    color: COLORS.text.primary,
    fontWeight: '600',
  },
  headerInfo: {
    flex: 1,
  },
  symbol: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text.primary,
    fontWeight: '700',
  },
  companyName: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
  },
  priceInfo: {
    alignItems: 'flex-end',
  },
  currentPrice: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text.primary,
    fontWeight: '700',
  },
  priceChange: {
    ...TYPOGRAPHY.small,
    fontWeight: '600',
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: SPACING.xs,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  periodButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 8,
    alignItems: 'center',
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
  chartSection: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
    marginTop: SPACING.md,
  },
  noDataContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  noDataTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text.primary,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  noDataText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: SPACING.xl,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: 25,
  },
  retryButtonText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.primary,
    fontWeight: '600',
  },
  chartContainer: {
    flex: 1,
    position: 'relative',
  },
  priceLabels: {
    position: 'absolute',
    left: -40,
    top: 0,
    bottom: 0,
    justifyContent: 'space-between',
    zIndex: 1,
  },
  priceLabel: {
    ...TYPOGRAPHY.small,
    color: COLORS.text.secondary,
  },
  chartArea: {
    flex: 1,
    position: 'relative',
    marginLeft: 40,
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
    backgroundColor: COLORS.primary,
    borderRadius: 1,
  },
  chartPoint: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  selectedPoint: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    borderWidth: 3,
    borderColor: COLORS.text.primary,
  },
  timeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.md,
  },
  timeLabel: {
    ...TYPOGRAPHY.small,
    color: COLORS.text.secondary,
  },
  selectedPointInfo: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: SPACING.md,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    alignItems: 'center',
  },
  selectedPointDate: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
  },
  selectedPointPrice: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text.primary,
    fontWeight: '700',
  },
  detailsSection: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  detailCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  detailTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  detailLabel: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
  },
  detailValue: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  detailText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.primary,
    lineHeight: 24,
  },
});

export default FullScreenChartModal;

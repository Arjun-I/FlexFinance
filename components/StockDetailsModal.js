import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { db } from '../firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { getCompanyProfile, getCompanyFinancials } from '../services/finnhubService';
import FullScreenChartModal from './FullScreenChartModal';

const COLORS = {
  primaryGradient: ['#0f0f23', '#1a1a2e', '#16213e'],
  cardGradient: ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)'],
  primary: '#00d4ff',
  success: '#4ecdc4',
  warning: '#feca57',
  danger: '#ff6b6b',
  text: {
    primary: '#ffffff',
    secondary: '#b4bcd0',
    accent: '#8b9dc3',
  },
};

const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

const TYPOGRAPHY = {
  h1: { fontSize: 32, fontWeight: '700', lineHeight: 40 },
  h2: { fontSize: 24, fontWeight: '600', lineHeight: 32 },
  h3: { fontSize: 20, fontWeight: '600', lineHeight: 28 },
  body: { fontSize: 16, fontWeight: '400', lineHeight: 24 },
  caption: { fontSize: 14, fontWeight: '400', lineHeight: 20 },
  small: { fontSize: 12, fontWeight: '400', lineHeight: 16 },
};

const GlassCard = ({ children, style }) => {
  return (
    <LinearGradient
      colors={COLORS.cardGradient}
      style={[styles.glassCard, style]}
    >
      <View style={styles.cardBorder}>
        {children}
      </View>
    </LinearGradient>
  );
};

const StockDetailsModal = ({ visible, stock, onClose, user, onSell }) => {
  const [loading, setLoading] = useState(false);
  const [stockAnalysis, setStockAnalysis] = useState(null);
  const [userChoices, setUserChoices] = useState(null);
  const [companyProfile, setCompanyProfile] = useState(null);
  const [financialMetrics, setFinancialMetrics] = useState(null);

  useEffect(() => {
    if (visible && stock && user) {
      loadStockDetails();
    }
  }, [visible, stock, user]);

  const loadStockDetails = async () => {
    if (!stock?.symbol || !user?.uid) return;

    setLoading(true);
    try {
      console.log('Loading stock details for:', stock.symbol);
      
      // Parallel loading for better performance
      const [analysisPromise, choicesPromise, profilePromise, financialsPromise] = await Promise.allSettled([
        // Load stock analysis from generated stocks
        (async () => {
          try {
            const generatedStocksRef = collection(db, 'users', user.uid, 'generatedStocks');
            const q = query(generatedStocksRef, where('symbol', '==', stock.symbol));
            const snapshot = await getDocs(q);
            
            if (!snapshot.empty) {
              const analysisData = snapshot.docs[0].data();
              console.log('Found analysis data:', analysisData);
              // Validate and sanitize the data
              const sanitizedData = sanitizeAnalysisData(analysisData);
              setStockAnalysis(sanitizedData);
            } else {
              // Try recent stocks collection
              const recentStocksRef = collection(db, 'users', user.uid, 'recentStocks');
              const recentQ = query(recentStocksRef, where('symbol', '==', stock.symbol));
              const recentSnapshot = await getDocs(recentQ);
              
              if (!recentSnapshot.empty) {
                const recentData = recentSnapshot.docs[0].data();
                console.log('Found recent stock data:', recentData);
                const sanitizedData = sanitizeAnalysisData(recentData);
                setStockAnalysis(sanitizedData);
              }
            }
          } catch (error) {
            console.log('Error loading analysis data:', error);
          }
        })(),

        // Load user choices for this stock
        (async () => {
          try {
            const userChoicesRef = collection(db, 'users', user.uid, 'userChoices');
            const choicesQuery = query(userChoicesRef, where('symbol', '==', stock.symbol));
            const choicesSnapshot = await getDocs(choicesQuery);
            
            if (!choicesSnapshot.empty) {
              const choiceData = choicesSnapshot.docs[0].data();
              console.log('Found user choice data:', choiceData);
              setUserChoices(choiceData);
            }
          } catch (error) {
            console.log('Error loading user choices:', error);
          }
        })(),

        // Load company profile
        (async () => {
          try {
            const profile = await getCompanyProfile(stock.symbol);
            if (profile) {
              console.log('Found company profile:', profile);
              setCompanyProfile(profile);
            }
          } catch (error) {
            console.log('Error loading company profile:', error);
          }
        })(),

        // Load financial metrics
        (async () => {
          try {
            const financials = await getCompanyFinancials(stock.symbol);
            if (financials) {
              console.log('Found financial data:', financials);
              setFinancialMetrics(financials);
            }
          } catch (error) {
            console.log('Error loading financial data:', error);
          }
        })()
      ]);

      console.log('Stock details loading completed');
      
    } catch (error) {
      console.error('Error loading stock details:', error);
    } finally {
      setLoading(false);
    }
  };

  // Sanitize analysis data to prevent rendering errors
  const sanitizeAnalysisData = (data) => {
    if (!data) return null;
    
    return {
      ...data,
      investmentThesis: typeof data.investmentThesis === 'string' ? data.investmentThesis : 'Analysis not available',
      keyBenefits: Array.isArray(data.keyBenefits) ? data.keyBenefits.filter(b => typeof b === 'string') : 
                   typeof data.keyBenefits === 'string' ? [data.keyBenefits] : ['Benefits analysis available'],
      keyRisks: Array.isArray(data.keyRisks) ? data.keyRisks.filter(r => typeof r === 'string') : 
                typeof data.keyRisks === 'string' ? [data.keyRisks] : ['Risk analysis available'],
      analysis: typeof data.analysis === 'string' ? data.analysis : 'Technical analysis not available',
      personalizationScore: typeof data.personalizationScore === 'number' && !isNaN(data.personalizationScore) ? data.personalizationScore : null,
      sectorDiversification: typeof data.sectorDiversification === 'number' && !isNaN(data.sectorDiversification) ? data.sectorDiversification : null,
      riskAlignment: typeof data.riskAlignment === 'number' && !isNaN(data.riskAlignment) ? data.riskAlignment : null,
      portfolioFit: typeof data.portfolioFit === 'number' && !isNaN(data.portfolioFit) ? data.portfolioFit : null,
    };
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount || 0);
  };

  const formatPercent = (percent) => {
    if (percent === null || percent === undefined) return 'N/A';
    const sign = percent >= 0 ? '+' : '';
    return `${sign}${percent.toFixed(2)}%`;
  };

  const getRiskColor = (riskLevel) => {
    switch (riskLevel?.toLowerCase()) {
      case 'low': return COLORS.success;
      case 'medium': return COLORS.warning;
      case 'high': return COLORS.danger;
      default: return COLORS.text.secondary;
    }
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 80) return COLORS.success;
    if (confidence >= 60) return COLORS.warning;
    return COLORS.danger;
  };

  if (!stock) return null;

  // Safety check to ensure stock has required properties
  const safeStock = {
    symbol: stock.symbol || 'N/A',
    name: stock.name || stock.symbol || 'N/A',
    currentPrice: stock.currentPrice || stock.price || 0,
    changePercent: stock.changePercent || stock.gainPercent || 0,
    shares: stock.shares || 0,
    sector: stock.sector || 'N/A',
    industry: stock.industry || 'N/A',
    averagePrice: stock.averagePrice || 0,
    gain: stock.gain || 0,
    gainPercent: stock.gainPercent || 0
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <LinearGradient colors={COLORS.primaryGradient} style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Text style={styles.stockSymbol}>{safeStock.symbol}</Text>
              <Text style={styles.stockName}>{safeStock.name}</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Loading stock details...</Text>
              </View>
            ) : (
              <>
                {/* Current Price & Performance */}
                <GlassCard style={styles.priceCard}>
                  <Text style={styles.sectionTitle}>Current Price</Text>
                  <View style={styles.priceRow}>
                    <Text style={styles.currentPrice}>
                      {formatCurrency(safeStock.currentPrice)}
                    </Text>
                    <Text style={[
                      styles.priceChange,
                      { color: safeStock.changePercent >= 0 ? COLORS.success : COLORS.danger }
                    ]}>
                      {formatPercent(safeStock.changePercent)}
                    </Text>
                  </View>
                  {safeStock.shares > 0 && (
                    <View style={styles.holdingInfo}>
                      <Text style={styles.holdingText}>
                        You own {safeStock.shares} shares
                      </Text>
                      <Text style={styles.holdingValue}>
                        Total Value: {formatCurrency(safeStock.currentPrice * safeStock.shares)}
                      </Text>
                    </View>
                  )}
                </GlassCard>

                {/* Stock Analysis (if available) */}
                {stockAnalysis && (
                  <View style={styles.analysisSection}>
                    <Text style={styles.sectionTitle}>Investment Analysis</Text>
                    
                    {stockAnalysis.investmentThesis && (
                      <View style={styles.analysisItem}>
                        <Text style={styles.analysisLabel}>Investment Thesis</Text>
                        <Text style={styles.analysisText}>{stockAnalysis.investmentThesis}</Text>
                      </View>
                    )}

                    {stockAnalysis.keyBenefits && (
                      <View style={styles.analysisItem}>
                        <Text style={styles.analysisLabel}>Key Benefits</Text>
                        {Array.isArray(stockAnalysis.keyBenefits) ? (
                          stockAnalysis.keyBenefits.map((benefit, index) => (
                            <Text key={index} style={styles.bulletPoint}>• {benefit}</Text>
                          ))
                        ) : (
                          <Text style={styles.analysisText}>{stockAnalysis.keyBenefits}</Text>
                        )}
                      </View>
                    )}

                    {stockAnalysis.keyRisks && (
                      <View style={styles.analysisItem}>
                        <Text style={styles.analysisLabel}>Key Risks</Text>
                        {Array.isArray(stockAnalysis.keyRisks) ? (
                          stockAnalysis.keyRisks.map((risk, index) => (
                            <Text key={index} style={styles.bulletPoint}>• {risk}</Text>
                          ))
                        ) : (
                          <Text style={styles.analysisText}>{stockAnalysis.keyRisks}</Text>
                        )}
                      </View>
                    )}

                    {stockAnalysis.analysis && (
                      <View style={styles.analysisItem}>
                        <Text style={styles.analysisLabel}>Technical Analysis</Text>
                        <Text style={styles.analysisText}>{stockAnalysis.analysis}</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* User Choice (if available) */}
                {userChoices && (
                  <GlassCard style={styles.choiceCard}>
                    <Text style={styles.sectionTitle}>Your Choice</Text>
                    <View style={styles.choiceInfo}>
                      <Text style={styles.choiceLabel}>
                        You {userChoices.choice === 'liked' ? 'liked' : 'rejected'} this stock
                      </Text>
                      <Text style={styles.choiceDate}>
                        {userChoices.timestamp?.toDate?.()?.toLocaleDateString() || 'Recently'}
                      </Text>
                    </View>
                  </GlassCard>
                )}

                {/* Stock Information */}
                <GlassCard style={styles.infoCard}>
                  <Text style={styles.sectionTitle}>Stock Information</Text>
                  <View style={styles.infoGrid}>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Sector</Text>
                      <Text style={styles.infoValue}>{safeStock.sector}</Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Industry</Text>
                      <Text style={styles.infoValue}>{safeStock.industry}</Text>
                    </View>
                    {safeStock.averagePrice > 0 && (
                      <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Avg Cost</Text>
                        <Text style={styles.infoValue}>{formatCurrency(safeStock.averagePrice)}</Text>
                      </View>
                    )}
                    {stockAnalysis?.marketCap && (
                      <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Market Cap</Text>
                        <Text style={styles.infoValue}>{stockAnalysis.marketCap}</Text>
                      </View>
                    )}
                  </View>
                </GlassCard>

                                 {/* Reason for Recommendation */}
                 {stockAnalysis?.reason && (
                   <GlassCard style={styles.reasonCard}>
                     <Text style={styles.sectionTitle}>Why This Stock?</Text>
                     <Text style={styles.reasonText}>{stockAnalysis.reason}</Text>
                   </GlassCard>
                 )}

                 {/* Company Profile & Financial Metrics */}
                 {(companyProfile || financialMetrics) && (
                   <GlassCard style={styles.financialCard}>
                     <Text style={styles.sectionTitle}>Company & Financial Data</Text>
                     
                     {/* Company Profile */}
                     {companyProfile && (
                       <View style={styles.profileSection}>
                         <Text style={styles.subsectionTitle}>Company Profile</Text>
                         <View style={styles.profileGrid}>
                           {companyProfile.industry && (
                             <View style={styles.profileItem}>
                               <Text style={styles.profileLabel}>Industry</Text>
                               <Text style={styles.profileValue}>{companyProfile.industry}</Text>
                             </View>
                           )}
                           {companyProfile.sector && (
                             <View style={styles.profileItem}>
                               <Text style={styles.profileLabel}>Sector</Text>
                               <Text style={styles.profileValue}>{companyProfile.sector}</Text>
                             </View>
                           )}
                           {companyProfile.marketCap && (
                             <View style={styles.profileItem}>
                               <Text style={styles.profileLabel}>Market Cap</Text>
                               <Text style={styles.profileValue}>{companyProfile.marketCap}</Text>
                             </View>
                           )}
                           {companyProfile.employeeCount && (
                             <View style={styles.profileItem}>
                               <Text style={styles.profileLabel}>Employees</Text>
                               <Text style={styles.profileValue}>{companyProfile.employeeCount.toLocaleString()}</Text>
                             </View>
                           )}
                         </View>
                         {companyProfile.description && (
                           <Text style={styles.descriptionText}>{companyProfile.description}</Text>
                         )}
                       </View>
                     )}

                     {/* Financial Metrics */}
                     {financialMetrics && (
                       <View style={styles.metricsSection}>
                         <Text style={styles.subsectionTitle}>Financial Metrics</Text>
                         <View style={styles.metricsGrid}>
                           {financialMetrics.peRatio && (
                             <View style={styles.metricItem}>
                               <Text style={styles.metricLabel}>P/E Ratio</Text>
                               <Text style={styles.metricValue}>{financialMetrics.peRatio}</Text>
                             </View>
                           )}
                           {financialMetrics.pbRatio && (
                             <View style={styles.metricItem}>
                               <Text style={styles.metricLabel}>P/B Ratio</Text>
                               <Text style={styles.metricValue}>{financialMetrics.pbRatio}</Text>
                             </View>
                           )}
                           {financialMetrics.debtToEquity && (
                             <View style={styles.metricItem}>
                               <Text style={styles.metricLabel}>Debt/Equity</Text>
                               <Text style={styles.metricValue}>{financialMetrics.debtToEquity}</Text>
                             </View>
                           )}
                           {financialMetrics.returnOnEquity && (
                             <View style={styles.metricItem}>
                               <Text style={styles.metricLabel}>ROE</Text>
                               <Text style={styles.metricValue}>{financialMetrics.returnOnEquity}%</Text>
                             </View>
                           )}
                           {financialMetrics.profitMargin && (
                             <View style={styles.metricItem}>
                               <Text style={styles.metricLabel}>Profit Margin</Text>
                               <Text style={styles.metricValue}>{financialMetrics.profitMargin}%</Text>
                             </View>
                           )}
                           {financialMetrics.revenueGrowth && (
                             <View style={styles.metricItem}>
                               <Text style={styles.metricLabel}>Revenue Growth</Text>
                               <Text style={styles.metricValue}>{financialMetrics.revenueGrowth}%</Text>
                             </View>
                           )}
                         </View>
                       </View>
                     )}
                   </GlassCard>
                 )}

                 {/* Investment Summary */}
                 {(stockAnalysis || companyProfile || financialMetrics) && (
                   <GlassCard style={styles.summaryCard}>
                     <Text style={styles.sectionTitle}>Investment Summary</Text>
                     <View style={styles.summaryContent}>
                       <View style={styles.summaryItem}>
                         <Text style={styles.summaryLabel}>Current Position</Text>
                         <Text style={styles.summaryValue}>
                           {safeStock.shares > 0 ? `${safeStock.shares} shares` : 'Not owned'}
                         </Text>
                       </View>
                       {safeStock.shares > 0 && safeStock.averagePrice > 0 && (
                         <View style={styles.summaryItem}>
                           <Text style={styles.summaryLabel}>Average Cost</Text>
                           <Text style={styles.summaryValue}>{formatCurrency(safeStock.averagePrice)}</Text>
                         </View>
                       )}
                       {safeStock.shares > 0 && (
                         <View style={styles.summaryItem}>
                           <Text style={styles.summaryLabel}>Total Investment</Text>
                           <Text style={styles.summaryValue}>
                             {formatCurrency(safeStock.shares * safeStock.averagePrice)}
                           </Text>
                         </View>
                       )}
                       {safeStock.gain !== undefined && (
                         <View style={styles.summaryItem}>
                           <Text style={styles.summaryLabel}>Total Gain/Loss</Text>
                           <Text style={[
                             styles.summaryValue,
                             { color: safeStock.gain >= 0 ? COLORS.success : COLORS.danger }
                           ]}>
                             {formatCurrency(safeStock.gain)} ({formatPercent(safeStock.gainPercent)})
                           </Text>
                         </View>
                       )}
                     </View>
                   </GlassCard>
                 )}

                 {/* Sell Button for Portfolio Holdings */}
                 {safeStock.shares > 0 && onSell && (
                   <GlassCard style={styles.actionCard}>
                     <TouchableOpacity
                       style={styles.sellButton}
                       onPress={() => {
                         onSell(stock);
                         onClose();
                       }}
                     >
                       <Text style={styles.sellButtonText}>Sell Shares</Text>
                     </TouchableOpacity>
                   </GlassCard>
                 )}
              </>
            )}
          </ScrollView>
        </View>
      </LinearGradient>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    height: '85%',
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerContent: {
    flex: 1,
  },
  stockSymbol: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  stockName: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
    flexWrap: 'wrap',
    flexShrink: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    color: COLORS.text.primary,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: SPACING.md,
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
  glassCard: {
    borderRadius: 16,
    marginBottom: SPACING.md,
    overflow: 'hidden',
  },
  cardBorder: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: SPACING.lg,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
  },
  priceCard: {
    marginBottom: SPACING.lg,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  currentPrice: {
    ...TYPOGRAPHY.h1,
    color: COLORS.text.primary,
  },
  priceChange: {
    ...TYPOGRAPHY.h3,
    fontWeight: '600',
  },
  holdingInfo: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  holdingText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
    marginBottom: SPACING.xs,
  },
  holdingValue: {
    ...TYPOGRAPHY.body,
    color: COLORS.primary,
    fontWeight: '600',
  },
  analysisCard: {
    marginBottom: SPACING.lg,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  metric: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
    marginBottom: SPACING.xs,
  },
  metricValue: {
    ...TYPOGRAPHY.h3,
    fontWeight: '600',
  },
  subsectionTitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.primary,
    fontWeight: '600',
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
  },
  thesisText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
    lineHeight: 22,
    flexWrap: 'wrap',
  },
  benefitsText: {
    ...TYPOGRAPHY.body,
    color: COLORS.success,
    lineHeight: 22,
    flexWrap: 'wrap',
  },
  risksText: {
    ...TYPOGRAPHY.body,
    color: COLORS.danger,
    lineHeight: 22,
    flexWrap: 'wrap',
  },
  summaryText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
    lineHeight: 22,
    flexWrap: 'wrap',
  },
  personalizedSection: {
    marginTop: SPACING.lg,
  },
  personalizedMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  personalizedMetric: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: SPACING.sm,
    borderRadius: 8,
    alignItems: 'center',
  },
  personalizedLabel: {
    ...TYPOGRAPHY.small,
    color: COLORS.text.secondary,
    marginBottom: SPACING.xs,
  },
  personalizedValue: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.primary,
    fontWeight: '600',
  },
  choiceCard: {
    marginBottom: SPACING.lg,
  },
  choiceInfo: {
    alignItems: 'center',
  },
  choiceLabel: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  choiceDate: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
  },
  infoCard: {
    marginBottom: SPACING.lg,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  infoItem: {
    width: '48%',
    marginBottom: SPACING.md,
  },
  infoLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
    marginBottom: SPACING.xs,
  },
  infoValue: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.primary,
    fontWeight: '500',
    flexWrap: 'wrap',
  },
  reasonCard: {
    marginBottom: SPACING.lg,
  },
  reasonText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
    lineHeight: 22,
    flexWrap: 'wrap',
  },
  actionCard: {
    marginBottom: SPACING.lg,
  },
  sellButton: {
    backgroundColor: COLORS.danger,
    borderRadius: 12,
    padding: SPACING.md,
    alignItems: 'center',
  },
  sellButtonText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.primary,
    fontWeight: '600',
  },
  financialCard: {
    marginBottom: SPACING.lg,
  },
  profileSection: {
    marginBottom: SPACING.lg,
  },
  profileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: SPACING.md,
  },
  profileItem: {
    width: '50%',
    marginBottom: SPACING.sm,
  },
  profileLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
    marginBottom: SPACING.xs,
  },
  profileValue: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.primary,
    fontWeight: '500',
    flexWrap: 'wrap',
  },
  descriptionText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
    lineHeight: 22,
    flexWrap: 'wrap',
  },
  metricsSection: {
    marginTop: SPACING.lg,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  metricItem: {
    width: '50%',
    marginBottom: SPACING.sm,
  },
  metricLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
    marginBottom: SPACING.xs,
  },
  metricValue: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.primary,
    fontWeight: '500',
    flexWrap: 'wrap',
  },
  summaryCard: {
    marginBottom: SPACING.lg,
  },
  summaryContent: {
    gap: SPACING.sm,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  summaryLabel: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
  },
  summaryValue: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.primary,
    fontWeight: '600',
  },
  analysisSection: {
    marginBottom: SPACING.lg,
  },
  analysisItem: {
    marginBottom: SPACING.md,
  },
  analysisLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
    marginBottom: SPACING.xs,
  },
  analysisText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
    lineHeight: 22,
    flexWrap: 'wrap',
  },
  bulletPoint: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
    lineHeight: 22,
    marginLeft: SPACING.md,
  },
});

export default StockDetailsModal;

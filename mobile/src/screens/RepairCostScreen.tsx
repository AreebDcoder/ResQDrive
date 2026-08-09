// ═══════════════════════════════════════════════════════════════
// ResQDrive v2 — REPAIR COST SCREEN (Modernized)
// All imports, logic, state, handlers preserved identically.
// Only JSX structure + StyleSheet updated: dark glassmorphism theme.
// ═══════════════════════════════════════════════════════════════
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  FlatList,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api, { API_URL } from '../api/axios';
import { documentDirectory, downloadAsync } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

interface LineItem {
  partTag: string;
  damageType: string;
  action: 'repair' | 'replace';
  laborCost: { min: number; max: number };
  partsCost: { min: number; max: number };
  partsSource: 'gemini_ai' | 'fallback_default';
  lineTotal: { min: number; max: number };
}

interface CostReport {
  id: string;
  userId: string;
  incidentId?: string;
  vehicleId?: string;
  totalMinCostPkr: number;
  totalMaxCostPkr: number;
  lineItems: LineItem[];
  pdfUrl?: string;
  createdAt: string;
  vehicle?: {
    make: string;
    model: string;
    year: number;
    licensePlate: string;
  };
}

export default function RepairCostScreen({ route, navigation }: any) {
  const incidentId = route?.params?.incidentId;
  const reportId = route?.params?.reportId;

  const [activeSegment, setActiveSegment] = useState<'details' | 'history'>('details');
  const [report, setReport] = useState<CostReport | null>(null);
  const [history, setHistory] = useState<CostReport[]>([]);
  
  // Loading & Error states
  const [isLoading, setIsLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const generate = route?.params?.generate;

  useEffect(() => {
    if (generate || incidentId) {
      generateEstimate();
    } else if (reportId) {
      loadReport(reportId);
    } else {
      setActiveSegment('history');
    }
  }, [incidentId, reportId, generate]);

  useEffect(() => {
    if (activeSegment === 'history') {
      fetchHistory();
    }
  }, [activeSegment]);

  const generateEstimate = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const response = await api.post('/repair-cost/estimate', { incidentId });
      setReport(response.data);
      setActiveSegment('details');
    } catch (err: any) {
      console.log('Error generating estimate:', err);
      const serverMsg = err.response?.data?.message;
      setErrorMsg(serverMsg || 'Failed to generate repair cost estimate. Please check connections.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadReport = async (id: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const response = await api.get(`/repair-cost/report/${id}`);
      setReport(response.data);
      setActiveSegment('details');
    } catch (err: any) {
      setErrorMsg('Failed to load the requested repair cost report.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchHistory = async () => {
    setHistoryLoading(true);
    setErrorMsg(null);
    try {
      const response = await api.get('/repair-cost/history');
      setHistory(response.data);
    } catch (err: any) {
      setErrorMsg('Failed to retrieve past repair cost reports.');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleShareReport = async () => {
    if (!report) return;
    setIsSharing(true);

    try {
      const pdfUri = `${API_URL}/repair-cost/report/${report.id}/pdf`;
      const fileUri = `${documentDirectory}ResQDrive_Repair_Report_${report.id}.pdf`;

      // Download the PDF stream from NestJS backend locally
      const downloadResult = await downloadAsync(pdfUri, fileUri, {
        headers: {
          Authorization: api.defaults.headers.common['Authorization'] as string,
        },
      });

      if (downloadResult.status === 200) {
        // Trigger Native share sheet
        await Sharing.shareAsync(downloadResult.uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Share Repair Cost Estimate',
        });
      } else {
        throw new Error('Download request failed.');
      }
    } catch (err: any) {
      Alert.alert('Sharing Failed', 'Could not fetch or share the breakdown report. Ensure permissions are allowed.');
    } finally {
      setIsSharing(false);
    }
  };

  const getPartName = (tag: string) => {
    return tag.toUpperCase().replace('_', ' ');
  };

  const renderHistoryCard = ({ item }: { item: CostReport }) => {
    const formattedDate = new Date(item.createdAt).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    const carText = item.vehicle 
      ? `${item.vehicle.year} ${item.vehicle.make} ${item.vehicle.model}`
      : 'Reference Vehicle';

    return (
      <TouchableOpacity 
        style={styles.historyCard}
        onPress={() => {
          setReport(item);
          setActiveSegment('details');
        }}
        activeOpacity={0.7}
      >
        <View style={styles.historyCardHeader}>
          <Text style={styles.historyCarName}>🚗 {carText}</Text>
          <Text style={styles.historyDateText}>{formattedDate}</Text>
        </View>
        <Text style={styles.historyCostText}>
          PKR {item.totalMinCostPkr.toLocaleString()} - {item.totalMaxCostPkr.toLocaleString()}
        </Text>
        <Text style={styles.historyItemsText}>
          {item.lineItems.length} damaged parts assessed
        </Text>
      </TouchableOpacity>
    );
  };

  const renderDetailsTab = () => {
    if (isLoading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#E53935" />
          <Text style={styles.loadingText}>Generating auto repair estimates...</Text>
        </View>
      );
    }

    if (!report) {
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyEmoji}>🧾</Text>
          <Text style={styles.emptyText}>No cost report loaded. Check history to open past estimates.</Text>
        </View>
      );
    }

    // Helper to format source label for parts pricing transparency
    const getPartsSourceLabel = (source: string) => {
      switch (source) {
        case 'pakwheels_scrape':
        case 'pakwheels':
          return '🟢 Live PakWheels AutoStore Listings';
        case 'olx_scrape':
        case 'olx':
          return '🟢 Live OLX Pakistan Listings';
        case 'gemini_ai_fallback':
        case 'gemini_ai':
          return '🤖 AI-Estimated (No Live Listings Found)';
        case 'fallback_default':
        default:
          return '⚙️ Generic Static Fallback Table';
      }
    };

    // Check if fallback default values were used in any line items
    const hasFallbackItems = report.lineItems.some(item => item.partsSource === 'fallback_default');

    return (
      <ScrollView style={styles.tabContent} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* ── Total Estimate Card ── */}
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>💰 TOTAL ESTIMATED COST RANGE</Text>
          <Text style={styles.totalValue}>
            PKR {report.totalMinCostPkr.toLocaleString()} - {report.totalMaxCostPkr.toLocaleString()}
          </Text>
          {report.vehicle && (
            <Text style={styles.vehicleSubText}>
              🚗 {report.vehicle.year} {report.vehicle.make} {report.vehicle.model} ({report.vehicle.licensePlate.toUpperCase()})
            </Text>
          )}
        </View>

        {/* ── Warning banner for Fallback estimates ── */}
        {hasFallbackItems && (
          <View style={styles.warningBanner}>
            <Text style={styles.warningEmoji}>⚡</Text>
            <Text style={styles.warningText}>
              Note: Certain parts are priced using static default averages because live marketplace listings and Gemini AI fallback were unreachable.
            </Text>
          </View>
        )}

        {/* ── Line Items ── */}
        <Text style={styles.sectionHeaderTitle}>🔧 DAMAGED PARTS BREAKDOWN</Text>
        {report.lineItems.map((item, index) => (
          <View key={index} style={styles.lineItemCard}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemPartName}>{getPartName(item.partTag)}</Text>
              <View style={[
                styles.badge, 
                { backgroundColor: item.action === 'repair' ? 'rgba(0, 230, 118, 0.12)' : 'rgba(255, 23, 68, 0.12)' }
              ]}>
                <Text style={[
                  styles.badgeText, 
                  { color: item.action === 'repair' ? '#00E676' : '#FF1744' }
                ]}>
                  {item.action.toUpperCase()}
                </Text>
              </View>
            </View>

            <Text style={styles.itemSubText}>💥 Damage: {item.damageType.toUpperCase().replace('_', ' ')}</Text>

            <View style={styles.costDetailsBox}>
              <View style={styles.costRow}>
                <Text style={styles.costLabel}>🔧 Workshop Labor Cost</Text>
                <Text style={styles.costVal}>PKR {item.laborCost.min.toLocaleString()} - {item.laborCost.max.toLocaleString()}</Text>
              </View>

              <View style={styles.costRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.costLabel}>📦 Spare Parts Price</Text>
                  <Text style={styles.partsSourceSubtext}>{getPartsSourceLabel(item.partsSource)}</Text>
                </View>
                <Text style={styles.costVal}>PKR {item.partsCost.min.toLocaleString()} - {item.partsCost.max.toLocaleString()}</Text>
              </View>

              <View style={[styles.costRow, styles.totalRow]}>
                <Text style={styles.totalRowLabel}>Estimated Total</Text>
                <Text style={styles.totalRowVal}>PKR {item.lineTotal.min.toLocaleString()} - {item.lineTotal.max.toLocaleString()}</Text>
              </View>
            </View>
          </View>
        ))}

        {/* ── Share Report Button ── */}
        <TouchableOpacity 
          style={styles.shareBtn} 
          onPress={handleShareReport}
          disabled={isSharing}
        >
          {isSharing ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.shareBtnText}>📤 Share Breakdown Report (PDF)</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      {/* ── Header bar ── */}
      {!incidentId && !reportId && (
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerBarTitle}>🔧 Repair Estimation</Text>
          <View style={{ width: 24 }} />
        </View>
      )}

      {/* ── Segment controls ── */}
      <View style={styles.segmentedHeader}>
        <TouchableOpacity
          style={[styles.segmentBtn, activeSegment === 'details' && styles.segmentBtnActive]}
          onPress={() => setActiveSegment('details')}
        >
          <Text style={[styles.segmentBtnText, activeSegment === 'details' && styles.segmentBtnTextActive]}>
            📋 Estimate Report
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeSegment === 'history' && styles.segmentBtnActive]}
          onPress={() => setActiveSegment('history')}
        >
          <Text style={[styles.segmentBtnText, activeSegment === 'history' && styles.segmentBtnTextActive]}>
            📁 Reports History
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Error display ── */}
      {errorMsg && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorEmoji}>⚠️</Text>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      )}

      {/* ── Content ── */}
      {activeSegment === 'details' ? (
        renderDetailsTab()
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          renderItem={renderHistoryCard}
          contentContainerStyle={styles.historyListContent}
          onRefresh={fetchHistory}
          refreshing={historyLoading}
          ListEmptyComponent={
            !historyLoading ? (
              <View style={styles.centerContainer}>
                <Text style={styles.emptyEmoji}>📂</Text>
                <Text style={styles.emptyText}>No repair estimates generated yet.</Text>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 16,
    backgroundColor: 'rgba(28, 28, 46, 0.6)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  headerBarTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  segmentedHeader: {
    flexDirection: 'row',
    backgroundColor: 'rgba(28, 28, 46, 0.4)',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  segmentBtnActive: {
    backgroundColor: '#E53935',
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  segmentBtnText: {
    color: '#6B6B80',
    fontSize: 14,
    fontWeight: '600',
  },
  segmentBtnTextActive: {
    color: '#FFFFFF',
  },
  tabContent: {
    flex: 1,
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    color: '#A0A0B8',
    marginTop: 16,
    fontSize: 14,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    color: '#6B6B80',
    marginTop: 0,
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  totalCard: {
    backgroundColor: 'rgba(229, 57, 53, 0.15)',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(229, 57, 53, 0.3)',
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
    marginBottom: 16,
  },
  totalLabel: {
    color: '#A0A0B8',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  totalValue: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
  },
  vehicleSubText: {
    color: '#A0A0B8',
    fontSize: 12,
    marginTop: 12,
  },
  warningBanner: {
    backgroundColor: 'rgba(255, 167, 38, 0.1)',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 167, 38, 0.2)',
  },
  warningEmoji: {
    fontSize: 16,
    marginRight: 8,
    marginTop: 1,
  },
  warningText: {
    color: '#FFA726',
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  sectionHeaderTitle: {
    color: '#A0A0B8',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 12,
    marginTop: 8,
  },
  lineItemCard: {
    backgroundColor: 'rgba(28, 28, 46, 0.6)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  itemPartName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  badge: {
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  itemSubText: {
    color: '#A0A0B8',
    fontSize: 12,
    marginBottom: 12,
  },
  costDetailsBox: {
    backgroundColor: 'rgba(10, 10, 15, 0.5)',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  costLabel: {
    color: '#6B6B80',
    fontSize: 12,
  },
  costVal: {
    color: '#A0A0B8',
    fontSize: 12,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    marginTop: 6,
    paddingTop: 8,
  },
  totalRowLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  totalRowVal: {
    color: '#E53935',
    fontSize: 14,
    fontWeight: '700',
  },
  shareBtn: {
    backgroundColor: 'rgba(0, 230, 118, 0.12)',
    borderColor: 'rgba(0, 230, 118, 0.3)',
    borderWidth: 1,
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  shareBtnText: {
    color: '#00E676',
    fontSize: 15,
    fontWeight: '700',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 23, 68, 0.12)',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 23, 68, 0.3)',
  },
  errorEmoji: {
    fontSize: 16,
    marginRight: 8,
  },
  errorText: {
    color: '#FF8A80',
    fontSize: 13,
    flex: 1,
  },
  historyListContent: {
    padding: 16,
  },
  historyCard: {
    backgroundColor: 'rgba(28, 28, 46, 0.6)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2,
  },
  historyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyCarName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  historyDateText: {
    color: '#6B6B80',
    fontSize: 11,
  },
  historyCostText: {
    color: '#E53935',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  partsSourceSubtext: {
    color: '#82B1FF',
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
  },
  historyItemsText: {
    color: '#A0A0B8',
    fontSize: 12,
  },
});
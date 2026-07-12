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
      >
        <View style={styles.historyCardHeader}>
          <Text style={styles.historyCarName}>{carText}</Text>
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
          <ActivityIndicator size="large" color="#d32f2f" />
          <Text style={styles.loadingText}>Generating auto repair estimates...</Text>
        </View>
      );
    }

    if (!report) {
      return (
        <View style={styles.centerContainer}>
          <Ionicons name="receipt-outline" size={64} color="#555" />
          <Text style={styles.emptyText}>No cost report loaded. Check history to open past estimates.</Text>
        </View>
      );
    }

    // Check if fallback default values were used in any line items
    const hasFallbackItems = report.lineItems.some(item => item.partsSource === 'fallback_default');

    return (
      <ScrollView style={styles.tabContent} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Total Estimate Card */}
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>TOTAL ESTIMATED COST RANGE</Text>
          <Text style={styles.totalValue}>
            PKR {report.totalMinCostPkr.toLocaleString()} - {report.totalMaxCostPkr.toLocaleString()}
          </Text>
          {report.vehicle && (
            <Text style={styles.vehicleSubText}>
              Vehicle: {report.vehicle.year} {report.vehicle.make} {report.vehicle.model} ({report.vehicle.licensePlate.toUpperCase()})
            </Text>
          )}
        </View>

        {/* Warning notification for Fallback estimates */}
        {hasFallbackItems && (
          <View style={styles.warningBanner}>
            <Ionicons name="warning" size={20} color="#ffa726" style={{ marginRight: 8 }} />
            <Text style={styles.warningText}>
              Note: Certain parts are priced matching flat generic fallback averages because the Gemini AI pricing engine timed out.
            </Text>
          </View>
        )}

        {/* Line Items List */}
        <Text style={styles.sectionHeaderTitle}>DAMAGED PARTS BREAKDOWN</Text>
        {report.lineItems.map((item, index) => (
          <View key={index} style={styles.lineItemCard}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemPartName}>{getPartName(item.partTag)}</Text>
              <View style={[
                styles.badge, 
                { backgroundColor: item.action === 'repair' ? 'rgba(46, 125, 50, 0.2)' : 'rgba(211, 47, 47, 0.2)' }
              ]}>
                <Text style={[
                  styles.badgeText, 
                  { color: item.action === 'repair' ? '#66bb6a' : '#ef5350' }
                ]}>
                  {item.action.toUpperCase()}
                </Text>
              </View>
            </View>

            <Text style={styles.itemSubText}>Damage: {item.damageType.toUpperCase().replace('_', ' ')}</Text>

            <View style={styles.costDetailsBox}>
              <View style={styles.costRow}>
                <Text style={styles.costLabel}>Workshop Labor Cost</Text>
                <Text style={styles.costVal}>PKR {item.laborCost.min} - {item.laborCost.max}</Text>
              </View>

              <View style={styles.costRow}>
                <Text style={styles.costLabel}>Parts Price ({item.partsSource === 'gemini_ai' ? 'Gemini AI' : 'Fallback Defaults'})</Text>
                <Text style={styles.costVal}>PKR {item.partsCost.min} - {item.partsCost.max}</Text>
              </View>

              <View style={[styles.costRow, styles.totalRow]}>
                <Text style={styles.totalRowLabel}>Estimated Total</Text>
                <Text style={styles.totalRowVal}>PKR {item.lineTotal.min.toLocaleString()} - {item.lineTotal.max.toLocaleString()}</Text>
              </View>
            </View>
          </View>
        ))}

        {/* Action button to share report */}
        <TouchableOpacity 
          style={styles.shareBtn} 
          onPress={handleShareReport}
          disabled={isSharing}
        >
          {isSharing ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Ionicons name="share-social-outline" size={20} color="#ffffff" style={{ marginRight: 8 }} />
              <Text style={styles.shareBtnText}>Share Breakdown Report (PDF)</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header bar back redirection if routed */}
      {!incidentId && !reportId && (
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerBarTitle}>Repair Estimation</Text>
          <View style={{ width: 24 }} />
        </View>
      )}

      {/* Segment controls */}
      <View style={styles.segmentedHeader}>
        <TouchableOpacity
          style={[styles.segmentBtn, activeSegment === 'details' && styles.segmentBtnActive]}
          onPress={() => setActiveSegment('details')}
        >
          <Text style={[styles.segmentBtnText, activeSegment === 'details' && styles.segmentBtnTextActive]}>
            Estimate Report
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeSegment === 'history' && styles.segmentBtnActive]}
          onPress={() => setActiveSegment('history')}
        >
          <Text style={[styles.segmentBtnText, activeSegment === 'history' && styles.segmentBtnTextActive]}>
            Reports History
          </Text>
        </TouchableOpacity>
      </View>

      {/* Error display */}
      {errorMsg && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={20} color="#ffffff" style={{ marginRight: 8 }} />
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      )}

      {/* Content wrapper */}
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
                <Ionicons name="folder-open-outline" size={48} color="#555" />
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
    backgroundColor: '#121212',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 16,
    backgroundColor: '#1e1e1e',
  },
  headerBarTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  segmentedHeader: {
    flexDirection: 'row',
    backgroundColor: '#1e1e1e',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 8,
    padding: 4,
    borderWidth: 1,
    borderColor: '#2e2e2e',
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  segmentBtnActive: {
    backgroundColor: '#d32f2f',
  },
  segmentBtnText: {
    color: '#888888',
    fontSize: 14,
    fontWeight: '600',
  },
  segmentBtnTextActive: {
    color: '#ffffff',
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
    color: '#ffffff',
    marginTop: 16,
    fontSize: 14,
  },
  emptyText: {
    color: '#555555',
    marginTop: 12,
    fontSize: 14,
    textAlign: 'center',
  },
  totalCard: {
    backgroundColor: '#d32f2f',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
    marginBottom: 16,
  },
  totalLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  totalValue: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  vehicleSubText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    marginTop: 12,
  },
  warningBanner: {
    backgroundColor: '#e65100',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  warningText: {
    color: '#ffffff',
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  sectionHeaderTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 12,
    marginTop: 8,
  },
  lineItemCard: {
    backgroundColor: '#1e1e1e',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2e2e2e',
    padding: 16,
    marginBottom: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  itemPartName: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  badge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  itemSubText: {
    color: '#888888',
    fontSize: 12,
    marginBottom: 12,
  },
  costDetailsBox: {
    backgroundColor: '#151515',
    borderRadius: 6,
    padding: 12,
    borderWidth: 1,
    borderColor: '#222222',
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  costLabel: {
    color: '#666666',
    fontSize: 12,
  },
  costVal: {
    color: '#aaaaaa',
    fontSize: 12,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
    marginTop: 6,
    paddingTop: 8,
  },
  totalRowLabel: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  totalRowVal: {
    color: '#d32f2f',
    fontSize: 14,
    fontWeight: 'bold',
  },
  shareBtn: {
    flexDirection: 'row',
    height: 52,
    backgroundColor: '#2e7d32',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  shareBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  errorBanner: {
    backgroundColor: '#b71c1c',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorText: {
    color: '#ffffff',
    fontSize: 13,
    flex: 1,
  },
  // History tab styles
  historyListContent: {
    padding: 16,
  },
  historyCard: {
    backgroundColor: '#1e1e1e',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2e2e2e',
    padding: 16,
    marginBottom: 12,
  },
  historyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyCarName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  historyDateText: {
    color: '#666666',
    fontSize: 11,
  },
  historyCostText: {
    color: '#d32f2f',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  historyItemsText: {
    color: '#888888',
    fontSize: 12,
  },
});

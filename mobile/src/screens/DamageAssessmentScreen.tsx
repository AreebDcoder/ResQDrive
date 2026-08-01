// ═══════════════════════════════════════════════════════════════
// ResQDrive v2 — DAMAGE ASSESSMENT SCREEN (Modernized)
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
  Image,
  ActivityIndicator,
  FlatList,
  Dimensions,
  Alert,
} from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import api, { API_URL } from '../api/axios';

interface VehicleItem {
  id: string;
  make: string;
  model: string;
  year: number;
}

interface DamageAssessmentItem {
  id: string;
  photoUrl: string;
  predictedDamageType: string;
  confidenceScore: number;
  derivedSeverity: 'minor' | 'moderate' | 'severe';
  createdAt: string;
  inferenceTimeMs?: number;
  partTag?: string;
}

export default function DamageAssessmentScreen({ route, navigation, isInline }: any) {
  const incidentId = route?.params?.incidentId;
  const vehicles = useSelector((state: RootState) => state.vehicles.list) as VehicleItem[];

  // State variables
  const [activeSegment, setActiveSegment] = useState<'new' | 'history' | 'cost_history'>('new');
  const [costHistory, setCostHistory] = useState<any[]>([]);
  const [costHistoryLoading, setCostHistoryLoading] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<any>(null);
  const [selectedPartTag, setSelectedPartTag] = useState<string>('other');

  const PART_TAGS = [
    { tag: 'front_bumper', label: 'Front Bumper' },
    { tag: 'rear_bumper', label: 'Rear Bumper' },
    { tag: 'bonnet', label: 'Bonnet' },
    { tag: 'left_mirror', label: 'Left Side Mirror' },
    { tag: 'right_mirror', label: 'Right Side Mirror' },
    { tag: 'headlight', label: 'Headlights' },
    { tag: 'taillight', label: 'Taillights' },
    { tag: 'door', label: 'Doors / Side Panel' },
    { tag: 'windshield', label: 'Windshield' },
    { tag: 'roof', label: 'Roof Panel' },
    { tag: 'tire', label: 'Tires / Rims' },
    { tag: 'other', label: 'Other Parts' },
  ];

  // Loading & Error States
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStage, setAnalysisStage] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Prediction result
  const [prediction, setPrediction] = useState<any>(null);

  // History logs
  const [history, setHistory] = useState<DamageAssessmentItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyHasMore, setHistoryHasMore] = useState(true);

  // Initialize selected vehicle to primary or first available
  useEffect(() => {
    if (vehicles && vehicles.length > 0) {
      setSelectedVehicleId(vehicles[0].id);
    }
  }, [vehicles]);

  // Load history when entering history segment
  useEffect(() => {
    if (activeSegment === 'history') {
      fetchHistory(1, true);
    } else if (activeSegment === 'cost_history') {
      fetchCostHistory();
    }
  }, [activeSegment]);

  // Request permissions for image picking
  const checkPermissions = async () => {
    const cameraPerm = await ImagePicker.requestCameraPermissionsAsync();
    const libraryPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return cameraPerm.status === 'granted' && libraryPerm.status === 'granted';
  };

  const handlePickImage = async (useCamera: boolean) => {
    setErrorMsg(null);
    setPrediction(null);

    const hasPermission = await checkPermissions();
    if (!hasPermission) {
      setErrorMsg('Camera and Photo Library permissions are required.');
      return;
    }

    let result;
    const pickerOptions: ImagePicker.ImagePickerOptions = {
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    };

    if (useCamera) {
      result = await ImagePicker.launchCameraAsync(pickerOptions);
    } else {
      result = await ImagePicker.launchImageLibraryAsync(pickerOptions);
    }

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      setSelectedImage(asset.uri);

      // Prepare file form payload for uploads
      const fileUri = asset.uri;
      const fileExtension = fileUri.split('.').pop();
      const fileName = fileUri.split('/').pop() || `damage_${Date.now()}.${fileExtension}`;

      setImageFile({
        uri: fileUri,
        name: fileName,
        type: `image/${fileExtension === 'jpg' ? 'jpeg' : fileExtension}`,
      });
    }
  };

  const handleAnalyze = async () => {
    if (!imageFile) return;
    setIsAnalyzing(true);
    setAnalysisStage('Uploading image...');
    setErrorMsg(null);

    const formData = new FormData();
    formData.append('file', imageFile as any);
    if (selectedVehicleId) {
      formData.append('vehicleId', selectedVehicleId);
    }
    if (incidentId) {
      formData.append('incidentId', incidentId);
    }
    if (selectedPartTag) {
      formData.append('partTag', selectedPartTag);
    }

    try {
      setAnalysisStage('Analyzing damage (running TFLite model)...');

      const response = await api.post('/damage-assessment', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setPrediction(response.data);
    } catch (err: any) {
      console.log('Damage Assessment Error:', err);
      const serverMsg = err.response?.data?.message;
      setErrorMsg(serverMsg || 'Failed to complete damage assessment. Please verify connection to the backend and microservice.');
    } finally {
      setIsAnalyzing(false);
      setAnalysisStage('');
    }
  };

  const fetchHistory = async (page = 1, isRefresh = false) => {
    if (historyLoading) return;
    setHistoryLoading(true);
    setErrorMsg(null);
    try {
      const response = await api.get('/damage-assessment/history', {
        params: { page, limit: 10 },
      });
      const assessments = response.data.data;
      if (isRefresh) {
        setHistory(assessments);
        setHistoryPage(1);
      } else {
        setHistory((prev) => [...prev, ...assessments]);
        setHistoryPage(page);
      }
      setHistoryHasMore(assessments.length === 10);
    } catch (err: any) {
      setErrorMsg('Failed to load past assessment history logs.');
    } finally {
      setHistoryLoading(false);
    }
  };

  const fetchCostHistory = async () => {
    setCostHistoryLoading(true);
    setErrorMsg(null);
    try {
      const response = await api.get('/repair-cost/history');
      setCostHistory(response.data);
    } catch (err: any) {
      setErrorMsg('Failed to load past repair cost estimations.');
    } finally {
      setCostHistoryLoading(false);
    }
  };

  const handleDeleteAssessment = (id: string) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this damage assessment log entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/damage-assessment/${id}`);
              setHistory((prev) => prev.filter((item) => item.id !== id));
            } catch (err) {
              Alert.alert('Error', 'Failed to delete assessment log.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteCostReport = (id: string) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this repair cost estimation report?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/repair-cost/report/${id}`);
              setCostHistory((prev) => prev.filter((item) => item.id !== id));
            } catch (err) {
              Alert.alert('Error', 'Failed to delete repair cost report.');
            }
          },
        },
      ]
    );
  };

  const getSeverityColor = (severity: 'minor' | 'moderate' | 'severe') => {
    switch (severity) {
      case 'minor':
        return '#00E676';
      case 'moderate':
        return '#FF9100';
      case 'severe':
        return '#FF1744';
      default:
        return '#6B6B80';
    }
  };

  const renderHistoryCard = ({ item }: { item: DamageAssessmentItem }) => {
    const fullPhotoUrl = item.photoUrl.startsWith('http') ? item.photoUrl : `${API_URL}${item.photoUrl}`;
    const formattedDate = new Date(item.createdAt).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    return (
      <View style={styles.historyCard}>
        <Image source={{ uri: fullPhotoUrl }} style={styles.historyThumb} />
        <View style={styles.historyCardInfo}>
          <View style={styles.historyCardHeader}>
            <Text style={styles.historyTypeTitle}>{item.predictedDamageType.toUpperCase().replace('_', ' ')}</Text>
            <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(item.derivedSeverity) }]}>
              <Text style={styles.severityBadgeText}>{item.derivedSeverity.toUpperCase()}</Text>
            </View>
          </View>
          <Text style={styles.historyConfText}>Part Tag: {item.partTag ? item.partTag.toUpperCase().replace('_', ' ') : 'OTHER'}</Text>
          <Text style={styles.historyConfText}>Confidence: {Math.round(item.confidenceScore * 100)}%</Text>
          {item.inferenceTimeMs !== undefined && (
            <Text style={styles.historyConfText}>Latency: {item.inferenceTimeMs}ms</Text>
          )}
          <Text style={styles.historyDateText}>{formattedDate}</Text>
        </View>
        <TouchableOpacity
          style={styles.deleteCardBtn}
          onPress={() => handleDeleteAssessment(item.id)}
        >
          <Ionicons name="trash-outline" size={20} color="#FF5252" />
        </TouchableOpacity>
      </View>
    );
  };

  const renderCostHistoryCard = ({ item }: { item: any }) => {
    const formattedDate = new Date(item.createdAt).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    const carText = item.vehicle
      ? `${item.vehicle.year} ${item.vehicle.make} ${item.vehicle.model}`
      : 'Reference Vehicle';

    return (
      <View style={styles.historyCard}>
        <TouchableOpacity
          style={{ flex: 1, flexDirection: 'row' }}
          onPress={() => {
            navigation.navigate('RepairCost', { reportId: item.id });
          }}
        >
          <View style={styles.costHistoryThumbContainer}>
            <Ionicons name="receipt-outline" size={24} color="#E53935" />
          </View>
          <View style={styles.historyCardInfo}>
            <View style={styles.historyCardHeader}>
              <Text style={styles.historyTypeTitle}>{carText}</Text>
            </View>
            <Text style={styles.historyCostText}>
              PKR {item.totalMinCostPkr.toLocaleString()} - {item.totalMaxCostPkr.toLocaleString()}
            </Text>
            <Text style={styles.historyConfText}>{item.lineItems?.length || 0} items assessed</Text>
            <Text style={styles.historyDateText}>{formattedDate}</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteCardBtn}
          onPress={() => handleDeleteCostReport(item.id)}
        >
          <Ionicons name="trash-outline" size={20} color="#FF5252" />
        </TouchableOpacity>
      </View>
    );
  };

  // Render entry selector or prediction view
  const renderNewAssessmentTab = () => {
    if (prediction) {
      const resultPhoto = prediction.photoUrl.startsWith('http') ? prediction.photoUrl : `${API_URL}${prediction.photoUrl}`;
      return (
        <ScrollView style={styles.tabContent} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={styles.card}>
            <Text style={styles.cardHeaderTitle}>📊 ASSESSMENT RESULTS</Text>
            <Image source={{ uri: resultPhoto }} style={styles.resultImage} />

            <View style={styles.resultsContainer}>
              <View style={styles.resultField}>
                <Text style={styles.resultLabel}>Damage Type</Text>
                <Text style={styles.resultValue}>{prediction.predictedDamageType.toUpperCase().replace('_', ' ')}</Text>
              </View>

              <View style={styles.resultField}>
                <Text style={styles.resultLabel}>Confidence Level</Text>
                <Text style={styles.resultValue}>{Math.round(prediction.confidenceScore * 100)}%</Text>
              </View>

              <View style={styles.resultField}>
                <Text style={styles.resultLabel}>Derived Severity</Text>
                <View style={[styles.severityBadgeLarge, { backgroundColor: getSeverityColor(prediction.derivedSeverity) }]}>
                  <Text style={styles.severityBadgeText}>{prediction.derivedSeverity.toUpperCase()}</Text>
                </View>
              </View>

              {prediction.inferenceTimeMs && (
                <View style={styles.resultField}>
                  <Text style={styles.resultLabel}>Inference Latency</Text>
                  <Text style={styles.resultValue}>{prediction.inferenceTimeMs} ms</Text>
                </View>
              )}
            </View>

            <View>
              <TouchableOpacity
                style={styles.actionBtnPrimary}
                onPress={() => {
                  setPrediction(null);
                  setSelectedImage(null);
                  setImageFile(null);
                  setSelectedPartTag('other');
                }}
              >
                <Text style={styles.actionBtnText}>➕ Add Another Damaged Area</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtnSecondary, { marginTop: 12 }]}
                onPress={() => {
                  navigation.navigate('RepairCost', { incidentId: incidentId || null, generate: true });
                }}
              >
                <Text style={styles.actionBtnText}>💰 Finish & View Repair Cost</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      );
    }

    return (
      <ScrollView style={styles.tabContent} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* ── Photo Selection Card ── */}
        <View style={styles.card}>
          <Text style={styles.cardHeaderTitle}>📷 Upload Damage Image</Text>
          <Text style={styles.cardDescription}>
            Select the vehicle part tag, then capture/choose a photo of the damage.
          </Text>

          {/* Part Tag selector */}
          <View style={styles.dropdownContainer}>
            <Text style={styles.dropdownLabel}>Select Damaged Part</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.vehicleScroll}>
              {PART_TAGS.map((pt) => (
                <TouchableOpacity
                  key={pt.tag}
                  style={[
                    styles.vehicleChip,
                    selectedPartTag === pt.tag && styles.vehicleChipActive,
                  ]}
                  onPress={() => setSelectedPartTag(pt.tag)}
                >
                  <Text style={[styles.vehicleChipText, selectedPartTag === pt.tag && styles.vehicleChipTextActive]}>
                    {pt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {selectedImage ? (
            <Image source={{ uri: selectedImage }} style={styles.previewImage} />
          ) : (
            <View style={styles.placeholderContainer}>
              <Text style={styles.placeholderEmoji}>🖼️</Text>
              <Text style={styles.placeholderText}>No image selected</Text>
            </View>
          )}

          {/* Vehicle Dropdown (Optional: only show if user has > 1 vehicles) */}
          {vehicles && vehicles.length > 1 && (
            <View style={styles.dropdownContainer}>
              <Text style={styles.dropdownLabel}>Select Affected Vehicle</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.vehicleScroll}>
                {vehicles.map((v) => (
                  <TouchableOpacity
                    key={v.id}
                    style={[
                      styles.vehicleChip,
                      selectedVehicleId === v.id && styles.vehicleChipActive,
                    ]}
                    onPress={() => setSelectedVehicleId(v.id)}
                  >
                    <Text style={[styles.vehicleChipText, selectedVehicleId === v.id && styles.vehicleChipTextActive]}>
                      {v.make} {v.model}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={styles.pickerRow}>
            <TouchableOpacity style={styles.pickerBtn} onPress={() => handlePickImage(true)}>
              <Ionicons name="camera" size={24} color="#FFFFFF" />
              <Text style={styles.pickerBtnText}>📸 Camera</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.pickerBtn} onPress={() => handlePickImage(false)}>
              <Ionicons name="image" size={24} color="#FFFFFF" />
              <Text style={styles.pickerBtnText}>🖼️ Gallery</Text>
            </TouchableOpacity>
          </View>

          {selectedImage && (
            <TouchableOpacity style={styles.actionBtnPrimary} onPress={handleAnalyze}>
              <Text style={styles.actionBtnText}>🧠 Analyze Damage</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.scopeNoticeText}>
          ℹ️ Note: Damage area localization has been evaluated and deferred to future releases due to insufficient COCO dataset limits.
        </Text>
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      {/* ── Segmented Controller ── */}
      <View style={styles.segmentedHeader}>
        <TouchableOpacity
          style={[styles.segmentBtn, activeSegment === 'new' && styles.segmentBtnActive]}
          onPress={() => setActiveSegment('new')}
        >
          <Text style={[styles.segmentBtnText, activeSegment === 'new' && styles.segmentBtnTextActive]}>
            📷 New
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeSegment === 'history' && styles.segmentBtnActive]}
          onPress={() => setActiveSegment('history')}
        >
          <Text style={[styles.segmentBtnText, activeSegment === 'history' && styles.segmentBtnTextActive]}>
            📋 History
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeSegment === 'cost_history' && styles.segmentBtnActive]}
          onPress={() => setActiveSegment('cost_history')}
        >
          <Text style={[styles.segmentBtnText, activeSegment === 'cost_history' && styles.segmentBtnTextActive]}>
            💰 Costs
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Error Banner ── */}
      {errorMsg && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorEmoji}>⚠️</Text>
          <Text style={styles.errorText} numberOfLines={3}>{errorMsg}</Text>
        </View>
      )}

      {/* ── Loading Overlay ── */}
      {isAnalyzing && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E53935" />
          <Text style={styles.loadingText}>{analysisStage}</Text>
        </View>
      )}

      {/* ── Active Tab ── */}
      {activeSegment === 'new' && renderNewAssessmentTab()}

      {activeSegment === 'history' && (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          renderItem={renderHistoryCard}
          contentContainerStyle={styles.historyListContent}
          onRefresh={() => fetchHistory(1, true)}
          refreshing={historyLoading && history.length === 0}
          onEndReached={() => {
            if (historyHasMore && !historyLoading) {
              fetchHistory(historyPage + 1);
            }
          }}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            historyLoading ? (
              <ActivityIndicator size="small" color="#E53935" style={{ marginVertical: 16 }} />
            ) : null
          }
          ListEmptyComponent={
            !historyLoading ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyEmoji}>📂</Text>
                <Text style={styles.emptyText}>No damage logs recorded yet.</Text>
              </View>
            ) : null
          }
        />
      )}

      {activeSegment === 'cost_history' && (
        <FlatList
          data={costHistory}
          keyExtractor={(item) => item.id}
          renderItem={renderCostHistoryCard}
          contentContainerStyle={styles.historyListContent}
          onRefresh={fetchCostHistory}
          refreshing={costHistoryLoading}
          ListEmptyComponent={
            !costHistoryLoading ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyEmoji}>🧾</Text>
                <Text style={styles.emptyText}>No repair cost reports saved yet.</Text>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0F' },
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
  segmentBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  segmentBtnActive: {
    backgroundColor: '#E53935',
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  segmentBtnText: { color: '#6B6B80', fontSize: 13, fontWeight: '600' },
  segmentBtnTextActive: { color: '#FFFFFF' },
  tabContent: { flex: 1, paddingTop: 16, paddingHorizontal: 16 },
  card: {
    backgroundColor: 'rgba(28, 28, 46, 0.6)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 16,
  },
  cardHeaderTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', marginBottom: 8 },
  cardDescription: { fontSize: 13, color: '#A0A0B8', lineHeight: 18, marginBottom: 16 },
  placeholderContainer: {
    height: 180,
    backgroundColor: 'rgba(10, 10, 15, 0.5)',
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  placeholderEmoji: { fontSize: 40, marginBottom: 8 },
  placeholderText: { color: '#6B6B80', fontSize: 14 },
  previewImage: { width: '100%', height: 200, borderRadius: 12, marginBottom: 16, backgroundColor: 'rgba(10, 10, 15, 0.5)' },
  pickerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  pickerBtn: {
    flex: 0.48,
    flexDirection: 'row',
    height: 48,
    backgroundColor: 'rgba(41, 121, 255, 0.1)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(41, 121, 255, 0.25)',
  },
  pickerBtnText: { color: '#FFFFFF', marginLeft: 8, fontSize: 14, fontWeight: '700' },
  actionBtnPrimary: {
    height: 48,
    backgroundColor: '#E53935',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  actionBtnSecondary: {
    height: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  dropdownContainer: { marginBottom: 16 },
  dropdownLabel: { color: '#A0A0B8', fontSize: 12, marginBottom: 8, fontWeight: '600' },
  vehicleScroll: { flexDirection: 'row' },
  vehicleChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  vehicleChipActive: { backgroundColor: '#E53935', borderColor: '#E53935' },
  vehicleChipText: { color: '#6B6B80', fontSize: 13 },
  vehicleChipTextActive: { color: '#FFFFFF', fontWeight: '600' },
  resultImage: { width: '100%', height: 220, borderRadius: 12, marginBottom: 16 },
  resultsContainer: {
    backgroundColor: 'rgba(10, 10, 15, 0.5)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 16,
  },
  resultField: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  resultLabel: { color: '#A0A0B8', fontSize: 14 },
  resultValue: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  severityBadgeLarge: { paddingVertical: 4, paddingHorizontal: 12, borderRadius: 12 },
  severityBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  scopeNoticeText: {
    color: '#6B6B80',
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    paddingHorizontal: 16,
    marginTop: 8,
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
  errorEmoji: { fontSize: 16, marginRight: 8 },
  errorText: { color: '#FF8A80', fontSize: 13, flex: 1 },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 10, 15, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: { color: '#A0A0B8', marginTop: 16, fontSize: 14 },
  historyListContent: { padding: 16 },
  historyCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(28, 28, 46, 0.6)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  historyThumb: { width: 80, height: 80, borderRadius: 10, backgroundColor: 'rgba(10, 10, 15, 0.5)' },
  historyCardInfo: { flex: 1, marginLeft: 12, justifyContent: 'center' },
  historyCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  historyTypeTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  severityBadge: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 8 },
  historyConfText: { color: '#A0A0B8', fontSize: 12, marginTop: 2 },
  historyDateText: { color: '#6B6B80', fontSize: 11, marginTop: 4 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#6B6B80', marginTop: 0, fontSize: 14 },
  deleteCardBtn: { padding: 8, justifyContent: 'center', alignItems: 'center' },
  costHistoryThumbContainer: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: 'rgba(229, 57, 53, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyCostText: { color: '#E53935', fontSize: 14, fontWeight: '700', marginTop: 2 },
});
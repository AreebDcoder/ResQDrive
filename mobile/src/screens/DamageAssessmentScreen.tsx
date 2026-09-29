// ═══════════════════════════════════════════════════════════════
// ResQDrive v2 — DAMAGE ASSESSMENT SCREEN (Modernized)
// All imports, logic, state, handlers preserved identically.
// Only JSX structure + StyleSheet updated: dark glassmorphism theme.
// ═══════════════════════════════════════════════════════════════
import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import api, { API_URL } from '../api/axios';
import { useToast } from '../components/ui/Toast';
import { ConfirmDialog } from '../components/ui';
import { colors, darkColors, tints } from '../theme/tokens';

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

const PART_TAGS = [
  { tag: 'front_bumper', label: 'Front Bumper' },
  { tag: 'rear_bumper', label: 'Rear Bumper' },
  { tag: 'bonnet', label: 'Bonnet' },
  { tag: 'left_mirror', label: 'Left Side Mirror' },
  { tag: 'right_mirror', label: 'Right Side Mirror' },
  { tag: 'headlight', label: 'Headlights' },
  { tag: 'taillight', label: 'Taillights' },
  { tag: 'front_door', label: 'Front Door' },
  { tag: 'rear_door', label: 'Rear Door' },
  { tag: 'front_fender', label: 'Front Fender / Panel' },
  { tag: 'rear_quarter_panel', label: 'Rear Quarter / Side Panel' },
  { tag: 'windshield', label: 'Windshield' },
  { tag: 'roof', label: 'Roof Panel' },
  { tag: 'tire', label: 'Tires / Rims' },
];

function DamageAssessmentScreen({ route, navigation, isInline }: any) {
  const toast = useToast();
  const incidentId = route?.params?.incidentId;
  const vehicles = useSelector((state: RootState) => state.vehicles.list) as VehicleItem[];

  // State variables
  const [activeSegment, setActiveSegment] = useState<'new' | 'history' | 'cost_history'>('new');
  const [costHistory, setCostHistory] = useState<any[]>([]);
  const [costHistoryLoading, setCostHistoryLoading] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<any>(null);
  const [selectedPartTag, setSelectedPartTag] = useState<string | null>(null);
  const [currentSessionAssessmentIds, setCurrentSessionAssessmentIds] = useState<string[]>([]);

  // Loading & Error States
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStage, setAnalysisStage] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isCarRejection, setIsCarRejection] = useState(false);

  // Prediction result
  const [prediction, setPrediction] = useState<any>(null);

  // History logs
  const [history, setHistory] = useState<DamageAssessmentItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyHasMore, setHistoryHasMore] = useState(true);

  // Phase 8: ConfirmDialog state for destructive deletes
  const [deleteAssessmentDialogVisible, setDeleteAssessmentDialogVisible] = useState(false);
  const [pendingDeleteAssessmentId, setPendingDeleteAssessmentId] = useState<string | null>(null);
  const [deleteCostReportDialogVisible, setDeleteCostReportDialogVisible] = useState(false);
  const [pendingDeleteCostReportId, setPendingDeleteCostReportId] = useState<string | null>(null);

  // Initialize selected vehicle to primary or first available
  useEffect(() => {
    if (vehicles && vehicles.length > 0 && !selectedVehicleId) {
      setSelectedVehicleId(vehicles[0].id);
    }
  }, [vehicles, selectedVehicleId]);

  // Load history when entering history segment
  useEffect(() => {
    if (activeSegment === 'history') {
      fetchHistory(1, true);
    } else if (activeSegment === 'cost_history') {
      fetchCostHistory();
    }
  }, [activeSegment]);

  // Request permissions for image picking
  const checkPermissions = useCallback(async () => {
    const cameraPerm = await ImagePicker.requestCameraPermissionsAsync();
    const libraryPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return cameraPerm.status === 'granted' && libraryPerm.status === 'granted';
  }, []);

  const handlePickImage = useCallback(async (useCamera: boolean) => {
    setErrorMsg(null);
    setIsCarRejection(false);
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
  }, [checkPermissions]);

  const handleAnalyze = async () => {
    if (!imageFile) return;
    setIsAnalyzing(true);
    setAnalysisStage('Uploading image...');
    setErrorMsg(null);
    setIsCarRejection(false);

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
        timeout: 45000, // 45 seconds timeout for PyTorch YOLO model inference & upload
      });

      setPrediction(response.data);
      if (response.data?.id) {
        setCurrentSessionAssessmentIds((prev) => [...prev, response.data.id]);
      }
    } catch (err: any) {
      console.log('Damage Assessment Error:', err);
      const status = err.response?.status;
      const serverMsg = err.response?.data?.message || err.response?.data?.detail;

      // Handle 400 rejection from Car-Verification Gate
      if (status === 400 || (serverMsg && (serverMsg.includes("car") || serverMsg.includes("vehicle")))) {
        setIsCarRejection(true);
        setErrorMsg(serverMsg || "This doesn't appear to be a photo of a car or car part. Please upload a clear photo of the damaged vehicle.");
      } else {
        setIsCarRejection(false);
        setErrorMsg(serverMsg || 'Failed to complete damage assessment. Please verify connection to the backend and microservice.');
      }
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
    // Phase 8: replaced destructive Alert.alert with ConfirmDialog primitive
    setPendingDeleteAssessmentId(id);
    setDeleteAssessmentDialogVisible(true);
  };

  const handleConfirmDeleteAssessment = async () => {
    setDeleteAssessmentDialogVisible(false);
    if (!pendingDeleteAssessmentId) return;
    try {
      const id = pendingDeleteAssessmentId;
      await api.delete(`/damage-assessment/${id}`);
      setHistory((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      toast.error('Failed to delete assessment log.');
    } finally {
      setPendingDeleteAssessmentId(null);
    }
  };

  const handleDeleteCostReport = (id: string) => {
    // Phase 8: replaced destructive Alert.alert with ConfirmDialog primitive
    setPendingDeleteCostReportId(id);
    setDeleteCostReportDialogVisible(true);
  };

  const handleConfirmDeleteCostReport = async () => {
    setDeleteCostReportDialogVisible(false);
    if (!pendingDeleteCostReportId) return;
    try {
      const id = pendingDeleteCostReportId;
      await api.delete(`/repair-cost/report/${id}`);
      setCostHistory((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      toast.error('Failed to delete repair cost report.');
    } finally {
      setPendingDeleteCostReportId(null);
    }
  };

  const getSeverityColor = (severity: 'minor' | 'moderate' | 'severe') => {
    switch (severity) {
      case 'minor':
        return colors.success[500];
      case 'moderate':
        return colors.warning[500];
      case 'severe':
        return colors.danger[500];
      default:
        return darkColors.textTertiary;
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
          onPress={() => handleDeleteAssessment(item.id)} accessibilityRole="button"
         accessibilityLabel="Delete">
          <Ionicons name="trash-outline" size={20} color={colors.danger[400]} />
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
          }} accessibilityRole="button"
        >
          <View style={styles.costHistoryThumbContainer}>
            <Ionicons name="receipt-outline" size={24} color={colors.danger[500]} />
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
          onPress={() => handleDeleteCostReport(item.id)} accessibilityRole="button"
         accessibilityLabel="Delete">
          <Ionicons name="trash-outline" size={20} color={colors.danger[400]} />
        </TouchableOpacity>
      </View>
    );
  };

  // Render entry selector or prediction view
  const renderNewAssessmentTab = () => {
    // 1. Car-Verification Rejection State (HTTP 400 response from gate)
    if (isCarRejection) {
      return (
        <ScrollView style={styles.tabContent} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={styles.carRejectionCard}>
            <Ionicons name="car-outline" size={48} color={colors.danger[400]} style={{ marginBottom: 12, alignSelf: 'center' }} />
            <Text style={styles.carRejectionTitle}>Vehicle Verification Failed</Text>
            <Text style={styles.carRejectionMessage}>{errorMsg}</Text>

            <TouchableOpacity
              style={styles.actionBtnPrimary}
              onPress={() => {
                setErrorMsg(null);
                setIsCarRejection(false);
                setSelectedImage(null);
                setImageFile(null);
              }} accessibilityRole="button"
            >
              <Ionicons name="camera-outline" size={20} color={darkColors.text} style={{ marginRight: 8 }} />
              <Text style={styles.actionBtnText}>Retake Photo</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      );
    }

    // 2. Successful Prediction View (with optional Low-Confidence Warning Banner)
    if (prediction) {
      const resultPhoto = prediction.photoUrl.startsWith('http') ? prediction.photoUrl : `${API_URL}${prediction.photoUrl}`;
      const isLowConfidence = prediction.lowConfidenceWarning || prediction.low_confidence_warning || prediction.confidenceScore < 0.30;
      
      return (
        <ScrollView style={styles.tabContent} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={styles.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <Ionicons name="analytics-outline" size={20} color={colors.danger[500]} style={{ marginRight: 8 }} />
              <Text style={styles.cardHeaderTitle}>ASSESSMENT RESULTS</Text>
            </View>

            {/* Low-Confidence Warning Banner */}
            {isLowConfidence && (
              <View style={styles.lowConfidenceBanner}>
                <Ionicons name="warning" size={22} color={colors.warning[300]} style={{ marginRight: 10 }} />
                <Text style={styles.lowConfidenceText}>
                  Low confidence result — consider retaking the photo with better lighting or a closer, clearer angle of the damage.
                </Text>
              </View>
            )}

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
                  setSelectedPartTag(null);
                  setIsCarRejection(false);
                }} accessibilityRole="button"
              >
                <Ionicons name="add-circle-outline" size={20} color={darkColors.text} style={{ marginRight: 8 }} />
                <Text style={styles.actionBtnText}>Add Another Damaged Area</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtnSecondary, { marginTop: 12 }]}
                onPress={() => {
                  navigation.navigate('RepairCost', {
                    incidentId: incidentId || null,
                    generate: true,
                    assessmentIds: currentSessionAssessmentIds,
                  });
                }} accessibilityRole="button"
              >
                <Ionicons name="cash-outline" size={20} color={darkColors.text} style={{ marginRight: 8 }} />
                <Text style={styles.actionBtnText}>Finish & View Repair Cost</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      );
    }

    // 3. Photo Capture & Entry View
    return (
      <ScrollView style={styles.tabContent} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* ── Photo Selection Card ── */}
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Ionicons name="camera-outline" size={20} color={colors.danger[500]} style={{ marginRight: 8 }} />
            <Text style={styles.cardHeaderTitle}>Upload Damage Image</Text>
          </View>
          <Text style={styles.cardDescription}>
            Select the vehicle part tag, then capture/choose a photo of the damage.
          </Text>

          {/* Part Tag selector */}
          <View style={styles.dropdownContainer}>
            <Text style={styles.dropdownLabel}>
              Select Damaged Part <Text style={{ color: colors.danger[500] }}>* (Required)</Text>
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.vehicleScroll}>
              {PART_TAGS.map((pt) => (
                <TouchableOpacity
                  key={pt.tag}
                  style={[
                    styles.vehicleChip,
                    selectedPartTag === pt.tag && styles.vehicleChipActive,
                  ]}
                  onPress={() => setSelectedPartTag(pt.tag)} accessibilityRole="button"
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
              <Ionicons name="image-outline" size={42} color={darkColors.textTertiary} style={{ marginBottom: 8 }} />
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
                    onPress={() => setSelectedVehicleId(v.id)} accessibilityRole="button"
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
            <TouchableOpacity style={styles.pickerBtn} onPress={() => handlePickImage(true)} accessibilityRole="button">
              <Ionicons name="camera-outline" size={20} color={darkColors.text} style={{ marginRight: 6 }} />
              <Text style={styles.pickerBtnText}>Camera</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.pickerBtn} onPress={() => handlePickImage(false)} accessibilityRole="button">
              <Ionicons name="images-outline" size={20} color={darkColors.text} style={{ marginRight: 6 }} />
              <Text style={styles.pickerBtnText}>Gallery</Text>
            </TouchableOpacity>
          </View>

          {/* User Photo Capture Guidance Tip */}
          <View style={styles.photoTipCard}>
            <Ionicons name="information-circle-outline" size={18} color={colors.warning[500]} style={{ marginRight: 8, marginTop: 2 }} />
            <Text style={styles.photoTipText}>
              <Text style={{ fontWeight: '700' }}>Tip:</Text> Include some recognizable part of the car (wheel, mirror, body shape) in frame, not just an extreme close-up of the damage.
            </Text>
          </View>

          {selectedImage && (
            <TouchableOpacity
              style={[
                styles.actionBtnPrimary,
                !selectedPartTag && { opacity: 0.45, backgroundColor: tints.dangerMedium },
              ]}
              onPress={handleAnalyze}
              disabled={!selectedPartTag || isAnalyzing} accessibilityRole="button"
            >
              <Ionicons name="hardware-chip-outline" size={20} color={darkColors.text} style={{ marginRight: 8 }} />
              <Text style={styles.actionBtnText}>
                {!selectedPartTag ? 'Select Damaged Part Above First' : 'Analyze Damage'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.scopeNoticeText}>
          Note: Damage area localization has been evaluated and deferred to future releases due to insufficient COCO dataset limits.
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
          onPress={() => setActiveSegment('new')} accessibilityRole="button"
        >
          <Ionicons name="camera-outline" size={16} color={activeSegment === 'new' ? colors.danger[500] : darkColors.textTertiary} style={{ marginRight: 6 }} />
          <Text style={[styles.segmentBtnText, activeSegment === 'new' && styles.segmentBtnTextActive]}>
            New
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeSegment === 'history' && styles.segmentBtnActive]}
          onPress={() => setActiveSegment('history')} accessibilityRole="button"
        >
          <Ionicons name="time-outline" size={16} color={activeSegment === 'history' ? colors.danger[500] : darkColors.textTertiary} style={{ marginRight: 6 }} />
          <Text style={[styles.segmentBtnText, activeSegment === 'history' && styles.segmentBtnTextActive]}>
            History
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeSegment === 'cost_history' && styles.segmentBtnActive]}
          onPress={() => setActiveSegment('cost_history')} accessibilityRole="button"
        >
          <Ionicons name="receipt-outline" size={16} color={activeSegment === 'cost_history' ? colors.danger[500] : darkColors.textTertiary} style={{ marginRight: 6 }} />
          <Text style={[styles.segmentBtnText, activeSegment === 'cost_history' && styles.segmentBtnTextActive]}>
            Costs
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Error Banner ── */}
      {errorMsg && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle-outline" size={18} color={colors.danger[400]} style={{ marginRight: 8 }} />
          <Text style={styles.errorText} numberOfLines={3}>{errorMsg}</Text>
        </View>
      )}

      {/* ── Loading Overlay ── */}
      {isAnalyzing && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.danger[500]} />
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
              <ActivityIndicator size="small" color={colors.danger[500]} style={{ marginVertical: 16 }} />
            ) : null
          }
          ListEmptyComponent={
            !historyLoading ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="folder-open-outline" size={44} color={darkColors.textTertiary} style={{ marginBottom: 12 }} />
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
                <Ionicons name="receipt-outline" size={44} color={darkColors.textTertiary} style={{ marginBottom: 12 }} />
                <Text style={styles.emptyText}>No repair cost reports saved yet.</Text>
              </View>
            ) : null
          }
        />
      )}

      {/* Phase 8: ConfirmDialog replaces destructive Alert.alert (assessment log) */}
      <ConfirmDialog
        visible={deleteAssessmentDialogVisible}
        title="Confirm Delete"
        description="Are you sure you want to delete this damage assessment log entry?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleConfirmDeleteAssessment}
        onCancel={() => { setDeleteAssessmentDialogVisible(false); setPendingDeleteAssessmentId(null); }}
      />

      {/* Phase 8: ConfirmDialog replaces destructive Alert.alert (cost report) */}
      <ConfirmDialog
        visible={deleteCostReportDialogVisible}
        title="Confirm Delete"
        description="Are you sure you want to delete this repair cost estimation report?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleConfirmDeleteCostReport}
        onCancel={() => { setDeleteCostReportDialogVisible(false); setPendingDeleteCostReportId(null); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: darkColors.background },
  segmentedHeader: {
    flexDirection: 'row',
    backgroundColor: tints.glassCard,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: tints.whiteBorder,
  },
  segmentBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  segmentBtnActive: {
    backgroundColor: colors.danger[500],
    shadowColor: colors.danger[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  segmentBtnText: { color: darkColors.textTertiary, fontSize: 13, fontWeight: '600' },
  segmentBtnTextActive: { color: darkColors.text },
  tabContent: { flex: 1, paddingTop: 16, paddingHorizontal: 16 },
  card: {
    backgroundColor: tints.glassCard,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: tints.whiteBorder,
    shadowColor: darkColors.background,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 16,
  },
  cardHeaderTitle: { fontSize: 16, fontWeight: '700', color: darkColors.text, marginBottom: 8 },
  cardDescription: { fontSize: 13, color: darkColors.textSecondary, lineHeight: 18, marginBottom: 16 },
  placeholderContainer: {
    height: 180,
    backgroundColor: tints.overlayLight,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: tints.whiteBorderStrong,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  placeholderEmoji: { fontSize: 40, marginBottom: 8 },
  placeholderText: { color: darkColors.textTertiary, fontSize: 14 },
  previewImage: { width: '100%', height: 200, borderRadius: 12, marginBottom: 16, backgroundColor: tints.overlayLight },
  pickerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  pickerBtn: {
    flex: 0.48,
    flexDirection: 'row',
    height: 48,
    backgroundColor: tints.infoSubtle,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: tints.infoMedium,
  },
  pickerBtnText: { color: darkColors.text, marginLeft: 8, fontSize: 14, fontWeight: '700' },
  actionBtnPrimary: {
    height: 48,
    backgroundColor: colors.danger[500],
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.danger[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  actionBtnSecondary: {
    height: 48,
    backgroundColor: tints.whiteSubtle,
    borderWidth: 1,
    borderColor: tints.whiteBorder,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnText: { color: darkColors.text, fontSize: 14, fontWeight: '700' },
  dropdownContainer: { marginBottom: 16 },
  dropdownLabel: { color: darkColors.textSecondary, fontSize: 12, marginBottom: 8, fontWeight: '600' },
  vehicleScroll: { flexDirection: 'row' },
  vehicleChip: {
    backgroundColor: tints.whiteSubtle,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: tints.whiteBorder,
  },
  vehicleChipActive: { backgroundColor: colors.danger[500], borderColor: colors.danger[500] },
  vehicleChipText: { color: darkColors.textTertiary, fontSize: 13 },
  vehicleChipTextActive: { color: darkColors.text, fontWeight: '600' },
  resultImage: { width: '100%', height: 220, borderRadius: 12, marginBottom: 16 },
  resultsContainer: {
    backgroundColor: tints.overlayLight,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: tints.whiteBorder,
    marginBottom: 16,
  },
  resultField: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: tints.whiteSubtle,
  },
  resultLabel: { color: darkColors.textSecondary, fontSize: 14 },
  resultValue: { color: darkColors.text, fontSize: 15, fontWeight: '700' },
  severityBadgeLarge: { paddingVertical: 4, paddingHorizontal: 12, borderRadius: 12 },
  severityBadgeText: { color: darkColors.text, fontSize: 11, fontWeight: '700' },
  scopeNoticeText: {
    color: darkColors.textTertiary,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    paddingHorizontal: 16,
    marginTop: 8,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tints.dangerErrorBg,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: tints.dangerErrorBorder,
  },
  errorEmoji: { fontSize: 16, marginRight: 8 },
  errorText: { color: colors.danger[300], fontSize: 13, flex: 1 },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: tints.overlayStrong,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: { color: darkColors.textSecondary, marginTop: 16, fontSize: 14 },
  historyListContent: { padding: 16 },
  historyCard: {
    flexDirection: 'row',
    backgroundColor: tints.glassCard,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: tints.whiteBorder,
  },
  historyThumb: { width: 80, height: 80, borderRadius: 10, backgroundColor: tints.overlayLight },
  historyCardInfo: { flex: 1, marginLeft: 12, justifyContent: 'center' },
  historyCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  historyTypeTitle: { color: darkColors.text, fontSize: 14, fontWeight: '700' },
  severityBadge: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 8 },
  historyConfText: { color: darkColors.textSecondary, fontSize: 12, marginTop: 2 },
  historyDateText: { color: darkColors.textTertiary, fontSize: 11, marginTop: 4 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: darkColors.textTertiary, marginTop: 0, fontSize: 14 },
  deleteCardBtn: { padding: 8, justifyContent: 'center', alignItems: 'center' },
  costHistoryThumbContainer: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: tints.dangerLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyCostText: { color: colors.danger[500], fontSize: 14, fontWeight: '700', marginTop: 2 },
  lowConfidenceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tints.warningSubtle,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tints.warningMedium,
    marginBottom: 16,
  },
  lowConfidenceText: {
    color: colors.warning[400],
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
    fontWeight: '600',
  },
  carRejectionCard: {
    backgroundColor: tints.glassCard,
    borderRadius: 20,
    padding: 24,
    marginVertical: 16,
    borderWidth: 2,
    borderColor: tints.dangerErrorBorder,
    alignItems: 'center',
  },
  carRejectionIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  carRejectionTitle: {
    color: colors.danger[500],
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  carRejectionMessage: {
    color: darkColors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  photoTipCard: {
    backgroundColor: tints.infoSubtle,
    borderRadius: 12,
    padding: 12,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: tints.infoMedium,
  },
  photoTipText: {
    color: colors.info[300],
    fontSize: 12,
    lineHeight: 17,
  },
});

export default React.memo(DamageAssessmentScreen);
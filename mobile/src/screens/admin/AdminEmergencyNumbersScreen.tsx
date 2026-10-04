import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import api from '../../api/axios';
import { Ionicons } from '@expo/vector-icons';
import { ConfirmDialog } from '../../components/ui';
import { colors, darkColors } from '../../theme/tokens';

interface RegionalNumber {
  id: string;
  regionName: string;
  serviceName: string;
  phoneNumber: string;
  priorityOrder: number;
  isActive: boolean;
}

export default function AdminEmergencyNumbersScreen({ navigation }: any) {
  const [numbers, setNumbers] = useState<RegionalNumber[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [regionName, setRegionName] = useState('');
  const [serviceName, setServiceName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [priorityOrder, setPriorityOrder] = useState('1');
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Phase 8: ConfirmDialog state for destructive delete
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingDeleteName, setPendingDeleteName] = useState<string | null>(null);

  const fetchNumbers = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/admin/emergency-numbers');
      setNumbers(response.data);
    } catch (err: any) {
      Alert.alert('Error', 'Failed to load regional emergency numbers.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNumbers();
  }, []);

  const handleAddNumber = async () => {
    if (!regionName.trim() || !serviceName.trim() || !phoneNumber.trim()) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/admin/emergency-numbers', {
        regionName: regionName.trim(),
        serviceName: serviceName.trim(),
        phoneNumber: phoneNumber.trim(),
        priorityOrder: parseInt(priorityOrder, 10) || 1,
        isActive,
      });

      setRegionName('');
      setServiceName('');
      setPhoneNumber('');
      setPriorityOrder('1');
      setIsActive(true);
      fetchNumbers();
      Alert.alert('Success', 'Regional number added successfully.');
    } catch (err: any) {
      Alert.alert('Error', 'Failed to add regional number.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await api.patch(`/admin/emergency-numbers/${id}`, {
        isActive: !currentStatus,
      });
      fetchNumbers();
    } catch (err) {
      Alert.alert('Error', 'Failed to update status.');
    }
  };

  const handleDeleteNumber = (id: string, name: string) => {
    // Phase 8: replaced destructive Alert.alert with ConfirmDialog primitive
    setPendingDeleteId(id);
    setPendingDeleteName(name);
    setDeleteDialogVisible(true);
  };

  const handleConfirmDeleteNumber = async () => {
    setDeleteDialogVisible(false);
    if (!pendingDeleteId) return;
    try {
      await api.delete(`/admin/emergency-numbers/${pendingDeleteId}`);
      fetchNumbers();
    } catch (err) {
      Alert.alert('Error', 'Failed to delete number.');
    } finally {
      setPendingDeleteId(null);
      setPendingDeleteName(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Back" hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={24} color={darkColors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} accessibilityRole="header" allowFontScaling={true} maxFontSizeMultiplier={1.5}>Manage Regional Numbers</Text>
        </View>

        {/* Input Form Card */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Add Regional Number</Text>
          <TextInput
            placeholder="Region Name (e.g. Punjab / Islamabad, Karachi)"
            placeholderTextColor={darkColors.textTertiary}
            value={regionName}
            onChangeText={setRegionName}
            style={styles.input}
            allowFontScaling={true}
            maxFontSizeMultiplier={1.5}
          />
          <TextInput
            placeholder="Service Name (e.g. Rescue 1122)"
            placeholderTextColor={darkColors.textTertiary}
            value={serviceName}
            onChangeText={setServiceName}
            style={styles.input}
            allowFontScaling={true}
            maxFontSizeMultiplier={1.5}
          />
          <TextInput
            placeholder="Phone Number (e.g. 1122, 115)"
            placeholderTextColor={darkColors.textTertiary}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
            style={styles.input}
            allowFontScaling={true}
            maxFontSizeMultiplier={1.5}
          />
          <TextInput
            placeholder="Priority Order (e.g. 1, 2)"
            placeholderTextColor={darkColors.textTertiary}
            value={priorityOrder}
            onChangeText={setPriorityOrder}
            keyboardType="number-pad"
            style={styles.input}
            allowFontScaling={true}
            maxFontSizeMultiplier={1.5}
          />
          <View style={styles.switchRow}>
            <Text style={{ color: darkColors.text }} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Active status:</Text>
            <Switch value={isActive} onValueChange={setIsActive} />
          </View>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={handleAddNumber}
            disabled={isSubmitting} accessibilityRole="button"
          >
            {isSubmitting ? (
              <ActivityIndicator color={darkColors.text} />
            ) : (
              <Text style={styles.addBtnText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Add Regional Number</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* List of Numbers */}
        <Text style={styles.listSectionTitle} allowFontScaling={true} maxFontSizeMultiplier={1.5}>DATABASE ENTRIES</Text>
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.danger[600]} />
          </View>
        ) : numbers.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>No regional emergency numbers found.</Text>
          </View>
        ) : (
          <FlatList
            data={numbers}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <View style={styles.numberCard}>
                <View style={styles.cardDetails}>
                  <Text style={styles.cardRegion} allowFontScaling={true} maxFontSizeMultiplier={1.5}>{item.regionName}</Text>
                  <Text style={styles.cardService} allowFontScaling={true} maxFontSizeMultiplier={1.5}>{item.serviceName}</Text>
                  <Text style={styles.cardPhone} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Number: {item.phoneNumber}</Text>
                  <Text style={styles.cardPriority} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Priority: {item.priorityOrder}</Text>
                </View>
                <View style={styles.actionsBlock}>
                  <Switch
                    value={item.isActive}
                    onValueChange={() => handleToggleActive(item.id, item.isActive)}
                  />
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDeleteNumber(item.id, item.serviceName)} accessibilityRole="button"
                   accessibilityLabel="Delete" hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="trash-outline" size={20} color={colors.danger[500]} />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        )}

        {/* Phase 8: ConfirmDialog replaces destructive Alert.alert */}
        <ConfirmDialog
          visible={deleteDialogVisible}
          title="Delete Number"
          description={pendingDeleteName ? `Are you sure you want to delete "${pendingDeleteName}"?` : undefined}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          variant="danger"
          onConfirm={handleConfirmDeleteNumber}
          onCancel={() => { setDeleteDialogVisible(false); setPendingDeleteId(null); setPendingDeleteName(null); }}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkColors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: darkColors.surface,
  },
  backBtn: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: darkColors.text,
  },
  formCard: {
    backgroundColor: darkColors.surface,
    borderRadius: 12,
    padding: 16,
    margin: 16,
    borderWidth: 1,
    borderColor: darkColors.surface,
  },
  formTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.danger[600],
    marginBottom: 12,
  },
  input: {
    backgroundColor: darkColors.surface,
    color: darkColors.text,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: darkColors.surface,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addBtn: {
    backgroundColor: colors.danger[600],
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  addBtnText: {
    color: darkColors.text,
    fontWeight: 'bold',
    fontSize: 15,
  },
  listSectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: darkColors.textTertiary,
    marginLeft: 16,
    marginBottom: 8,
    letterSpacing: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  numberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: darkColors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: darkColors.surface,
  },
  cardDetails: {
    flex: 1,
    marginRight: 8,
  },
  cardRegion: {
    fontSize: 12,
    color: colors.danger[600],
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  cardService: {
    fontSize: 16,
    fontWeight: 'bold',
    color: darkColors.text,
    marginBottom: 4,
  },
  cardPhone: {
    fontSize: 14,
    color: darkColors.textTertiary,
    marginBottom: 2,
  },
  cardPriority: {
    fontSize: 12,
    color: darkColors.textTertiary,
  },
  actionsBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  deleteBtn: {
    padding: 6,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    color: darkColors.textTertiary,
    textAlign: 'center',
    fontSize: 14,
  },
});

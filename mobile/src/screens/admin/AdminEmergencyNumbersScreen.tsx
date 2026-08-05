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
    Alert.alert(
      'Delete Number',
      `Are you sure you want to delete "${name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/admin/emergency-numbers/${id}`);
              fetchNumbers();
            } catch (err) {
              Alert.alert('Error', 'Failed to delete number.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Manage Regional Numbers</Text>
        </View>

        {/* Input Form Card */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>➕ Add Regional Number</Text>
          <TextInput
            placeholder="Region Name (e.g. Punjab / Islamabad, Karachi)"
            placeholderTextColor="#888"
            value={regionName}
            onChangeText={setRegionName}
            style={styles.input}
          />
          <TextInput
            placeholder="Service Name (e.g. Rescue 1122)"
            placeholderTextColor="#888"
            value={serviceName}
            onChangeText={setServiceName}
            style={styles.input}
          />
          <TextInput
            placeholder="Phone Number (e.g. 1122, 115)"
            placeholderTextColor="#888"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
            style={styles.input}
          />
          <TextInput
            placeholder="Priority Order (e.g. 1, 2)"
            placeholderTextColor="#888"
            value={priorityOrder}
            onChangeText={setPriorityOrder}
            keyboardType="number-pad"
            style={styles.input}
          />
          <View style={styles.switchRow}>
            <Text style={{ color: '#ffffff' }}>Active status:</Text>
            <Switch value={isActive} onValueChange={setIsActive} />
          </View>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={handleAddNumber}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.addBtnText}>Add Regional Number</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* List of Numbers */}
        <Text style={styles.listSectionTitle}>📋 DATABASE ENTRIES</Text>
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#d32f2f" />
          </View>
        ) : numbers.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyText}>No regional emergency numbers found.</Text>
          </View>
        ) : (
          <FlatList
            data={numbers}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <View style={styles.numberCard}>
                <View style={styles.cardDetails}>
                  <Text style={styles.cardRegion}>{item.regionName}</Text>
                  <Text style={styles.cardService}>{item.serviceName}</Text>
                  <Text style={styles.cardPhone}>Number: {item.phoneNumber}</Text>
                  <Text style={styles.cardPriority}>Priority: {item.priorityOrder}</Text>
                </View>
                <View style={styles.actionsBlock}>
                  <Switch
                    value={item.isActive}
                    onValueChange={() => handleToggleActive(item.id, item.isActive)}
                  />
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDeleteNumber(item.id, item.serviceName)}
                  >
                    <Ionicons name="trash-outline" size={20} color="#ff1744" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2e2e2e',
  },
  backBtn: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  formCard: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    borderWidth: 1,
    borderColor: '#2e2e2e',
  },
  formTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#121212',
    color: '#ffffff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2e2e2e',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addBtn: {
    backgroundColor: '#d32f2f',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  addBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  listSectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#888888',
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
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2e2e2e',
  },
  cardDetails: {
    flex: 1,
    marginRight: 8,
  },
  cardRegion: {
    fontSize: 12,
    color: '#d32f2f',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  cardService: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  cardPhone: {
    fontSize: 14,
    color: '#888888',
    marginBottom: 2,
  },
  cardPriority: {
    fontSize: 12,
    color: '#888888',
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
    color: '#888888',
    textAlign: 'center',
    fontSize: 14,
  },
});

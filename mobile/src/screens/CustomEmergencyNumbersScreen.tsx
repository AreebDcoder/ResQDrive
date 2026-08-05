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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import api from '../api/axios';
import { Ionicons } from '@expo/vector-icons';

interface CustomNumber {
  id: string;
  label: string;
  phoneNumber: string;
  priorityOrder: number;
}

export default function CustomEmergencyNumbersScreen({ navigation }: any) {
  const [numbers, setNumbers] = useState<CustomNumber[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [label, setLabel] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [priorityOrder, setPriorityOrder] = useState('1');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchNumbers = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/emergency-sos/custom-numbers');
      setNumbers(response.data);
    } catch (err: any) {
      Alert.alert('Error', 'Failed to load custom numbers.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNumbers();
  }, []);

  const handleAddNumber = async () => {
    if (!label.trim() || !phoneNumber.trim()) {
      Alert.alert('Error', 'Please fill in both label and phone number fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/emergency-sos/custom-numbers', {
        label: label.trim(),
        phoneNumber: phoneNumber.trim(),
        priorityOrder: parseInt(priorityOrder, 10) || 1,
      });

      setLabel('');
      setPhoneNumber('');
      setPriorityOrder('1');
      fetchNumbers();
      Alert.alert('Success', 'Custom emergency number added successfully.');
    } catch (err: any) {
      Alert.alert('Error', 'Failed to add custom number.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteNumber = (id: string, name: string) => {
    Alert.alert(
      'Delete Number',
      `Are you sure you want to remove "${name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/emergency-sos/custom-numbers/${id}`);
              fetchNumbers();
            } catch (err) {
              Alert.alert('Error', 'Failed to remove custom number.');
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
          <Text style={styles.headerTitle}>Custom Override Numbers</Text>
        </View>

        {/* Input Form Card */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>➕ Add New Override Number</Text>
          <TextInput
            placeholder="Label (e.g. Local Rescue / Private Doctor)"
            placeholderTextColor="#888"
            value={label}
            onChangeText={setLabel}
            style={styles.input}
          />
          <TextInput
            placeholder="Phone Number (e.g. +92323...)"
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
          <TouchableOpacity
            style={styles.addBtn}
            onPress={handleAddNumber}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.addBtnText}>Add Number</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Numbers List */}
        <Text style={styles.listSectionTitle}>📱 YOUR CURRENT OVERRIDES</Text>
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#d32f2f" />
          </View>
        ) : numbers.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyText}>No custom override numbers added yet.</Text>
          </View>
        ) : (
          <FlatList
            data={numbers}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <View style={styles.numberCard}>
                <View style={styles.cardDetails}>
                  <Text style={styles.cardLabel}>{item.label}</Text>
                  <Text style={styles.cardPhone}>{item.phoneNumber}</Text>
                  <Text style={styles.cardPriority}>Priority: {item.priorityOrder}</Text>
                </View>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDeleteNumber(item.id, item.label)}
                >
                  <Ionicons name="trash-outline" size={22} color="#ff1744" />
                </TouchableOpacity>
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
  addBtn: {
    backgroundColor: '#d32f2f',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
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
  },
  cardLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  cardPhone: {
    fontSize: 14,
    color: '#888888',
    marginBottom: 4,
  },
  cardPriority: {
    fontSize: 11,
    color: '#d32f2f',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  deleteBtn: {
    padding: 8,
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

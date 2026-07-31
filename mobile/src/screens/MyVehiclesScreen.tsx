// ═══════════════════════════════════════════════════════════════
// ResQDrive v2 — MY VEHICLES SCREEN (Modernized)
// All imports, logic, state, handlers preserved identically.
// Only JSX structure + StyleSheet updated: dark glassmorphism theme.
// ═══════════════════════════════════════════════════════════════
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { fetchVehiclesStart, fetchVehiclesSuccess, fetchVehiclesFailure, setPrimaryVehicleSuccess } from '../store/slices/vehiclesSlice';
import api from '../api/axios';

export default function MyVehiclesScreen({ navigation }: any) {
  const dispatch = useDispatch();
  const { list: vehicles, isLoading, error } = useSelector((state: RootState) => state.vehicles);

  const fetchVehicles = async () => {
    dispatch(fetchVehiclesStart());
    try {
      const response = await api.get('/vehicles');
      dispatch(fetchVehiclesSuccess(response.data));
    } catch (err: any) {
      dispatch(fetchVehiclesFailure(err.response?.data?.message || 'Failed to fetch vehicles.'));
    }
  };

  useEffect(() => {
    // Fetch vehicles on component mount or focus
    const unsubscribe = navigation.addListener('focus', () => {
      fetchVehicles();
    });
    return unsubscribe;
  }, [navigation]);

  const handleSetPrimary = async (vehicleId: string) => {
    try {
      await api.patch(`/vehicles/${vehicleId}/set-primary`);
      dispatch(setPrimaryVehicleSuccess(vehicleId));
    } catch (err) {
      alert('Failed to set vehicle as primary.');
    }
  };

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🚗 My Vehicles</Text>
        <Text style={styles.headerSub}>{vehicles.length} registered</Text>
      </View>

      {isLoading && vehicles.length === 0 ? (
        <ActivityIndicator size="large" color="#E53935" style={styles.loader} />
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorEmoji}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchVehicles}>
            <Text style={styles.retryText}>🔄 Retry</Text>
          </TouchableOpacity>
        </View>
      ) : vehicles.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyEmoji}>🚘</Text>
          <Text style={styles.emptyText}>No vehicles registered yet.</Text>
          <Text style={styles.emptySubtitle}>Add a vehicle to enable automatic accident detection.</Text>
        </View>
      ) : (
        <FlatList
          data={vehicles}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('AddEditVehicle', { vehicle: item })}
              activeOpacity={0.7}
            >
              {/* Card Header */}
              <View style={styles.cardHeader}>
                <View style={styles.headerInfo}>
                  <Text style={styles.vehicleTitle}>{item.make} {item.model}</Text>
                  <Text style={styles.vehicleMeta}>{item.year} • {item.color || 'No Color'}</Text>
                </View>
                {item.isPrimary && (
                  <View style={styles.primaryBadge}>
                    <Text style={styles.primaryBadgeText}>⚡ Active</Text>
                  </View>
                )}
              </View>

              {/* Plate */}
              <View style={styles.plateContainer}>
                <Text style={styles.plateLabel}>License Plate</Text>
                <Text style={styles.plateNumber}>{item.licensePlate.toUpperCase()}</Text>
              </View>

              {/* Card Actions */}
              <View style={styles.cardActions}>
                {item.isPrimary ? (
                  <Text style={styles.activeLabel}>🛡️ Paired with crash sensor</Text>
                ) : (
                  <TouchableOpacity
                    style={styles.setPrimaryBtn}
                    onPress={() => handleSetPrimary(item.id)}
                  >
                    <Text style={styles.setPrimaryText}>⚡ Activate</Text>
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity
                  style={styles.insuranceIndicator}
                  onPress={() => navigation.navigate('VehicleInsurance', { vehicleId: item.id, insurance: item.insurance })}
                >
                  <Text style={item.insurance ? styles.insuranceYes : styles.insuranceNo}>
                    {item.insurance ? '🛡️ Insured' : '+ Add Insurance'}
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddEditVehicle')}
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSub: {
    fontSize: 13,
    color: '#6B6B80',
    marginTop: 4,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  errorText: {
    color: '#FF8A80',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: '#E53935',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: '#6B6B80',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: 'rgba(28, 28, 46, 0.6)',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  headerInfo: {
    flex: 1,
  },
  vehicleTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  vehicleMeta: {
    fontSize: 13,
    color: '#A0A0B8',
    marginTop: 4,
  },
  primaryBadge: {
    backgroundColor: 'rgba(229, 57, 53, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(229, 57, 53, 0.3)',
  },
  primaryBadgeText: {
    color: '#FF1744',
    fontSize: 11,
    fontWeight: '700',
  },
  plateContainer: {
    backgroundColor: 'rgba(10, 10, 15, 0.5)',
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#2979FF',
    marginBottom: 16,
  },
  plateLabel: {
    fontSize: 11,
    color: '#6B6B80',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  plateNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
    letterSpacing: 1.5,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    paddingTop: 14,
  },
  activeLabel: {
    color: '#00E676',
    fontSize: 13,
    fontWeight: '700',
  },
  setPrimaryBtn: {
    backgroundColor: 'rgba(41, 121, 255, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(41, 121, 255, 0.3)',
  },
  setPrimaryText: {
    color: '#2979FF',
    fontSize: 12,
    fontWeight: '700',
  },
  insuranceIndicator: {
    padding: 4,
  },
  insuranceYes: {
    color: '#00E676',
    fontSize: 13,
    fontWeight: '700',
  },
  insuranceNo: {
    color: '#E53935',
    fontSize: 13,
    fontWeight: '700',
  },
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 24,
    backgroundColor: '#E53935',
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '300',
    marginTop: -4,
  },
});
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
      {isLoading && vehicles.length === 0 ? (
        <ActivityIndicator size="large" color="#d32f2f" style={styles.loader} />
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchVehicles}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : vehicles.length === 0 ? (
        <View style={styles.centerContainer}>
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
            >
              <View style={styles.cardHeader}>
                <View style={styles.headerInfo}>
                  <Text style={styles.vehicleTitle}>{item.make} {item.model}</Text>
                  <Text style={styles.vehicleMeta}>{item.year} • {item.color || 'No Color'}</Text>
                </View>
                {item.isPrimary && (
                  <View style={styles.primaryBadge}>
                    <Text style={styles.primaryBadgeText}>Active</Text>
                  </View>
                )}
              </View>

              <View style={styles.plateContainer}>
                <Text style={styles.plateLabel}>License Plate</Text>
                <Text style={styles.plateNumber}>{item.licensePlate.toUpperCase()}</Text>
              </View>

              <View style={styles.cardActions}>
                {item.isPrimary ? (
                  <Text style={styles.activeLabel}>🛡️ Paired with crash sensor</Text>
                ) : (
                  <TouchableOpacity
                    style={styles.setPrimaryBtn}
                    onPress={() => handleSetPrimary(item.id)}
                  >
                    <Text style={styles.setPrimaryText}>Activate Vehicle</Text>
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

      {/* Floating Action Button (FAB) */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddEditVehicle')}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
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
  errorText: {
    color: '#ff8a80',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: '#d32f2f',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  emptyText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: '#888888',
    fontSize: 14,
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  card: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2e2e2e',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerInfo: {
    flex: 1,
  },
  vehicleTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  vehicleMeta: {
    fontSize: 13,
    color: '#888888',
    marginTop: 4,
  },
  primaryBadge: {
    backgroundColor: '#d32f2f',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  primaryBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  plateContainer: {
    backgroundColor: '#161616',
    padding: 10,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#d32f2f',
    marginBottom: 16,
  },
  plateLabel: {
    fontSize: 11,
    color: '#888888',
    textTransform: 'uppercase',
  },
  plateNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 2,
    letterSpacing: 1,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#2e2e2e',
    paddingTop: 12,
  },
  activeLabel: {
    color: '#81c784',
    fontSize: 13,
    fontWeight: 'bold',
  },
  setPrimaryBtn: {
    backgroundColor: '#2e2e2e',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#3e3e3e',
  },
  setPrimaryText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  insuranceIndicator: {
    padding: 4,
  },
  insuranceYes: {
    color: '#81c784',
    fontSize: 13,
    fontWeight: 'bold',
  },
  insuranceNo: {
    color: '#d32f2f',
    fontSize: 13,
    fontWeight: 'bold',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#d32f2f',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#d32f2f',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  fabText: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '300',
    marginTop: -4,
  },
});

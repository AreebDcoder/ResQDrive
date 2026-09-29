import React from 'react';
import { View, FlatList, Pressable, StyleSheet } from 'react-native';
import { useGetVehiclesQuery, useSetPrimaryVehicleMutation } from '../store/api/vehiclesApi';
import { useToast } from '../components/ui/Toast';
import { useTheme } from '../theme/useTheme';
import { colors, spacing, radius, typography, shadows } from '../theme/tokens';
import type { AppNavigation } from '../navigation/types';
import type { Vehicle } from '../store/api/vehiclesApi';
import { Ionicons } from '@expo/vector-icons';

// Local styles using theme tokens — will be replaced with tokens directly in Batch 7
export default function MyVehiclesScreen({ navigation }: { navigation: AppNavigation }) {
  const { data: vehicles, isLoading, error, refetch } = useGetVehiclesQuery();
  const [setPrimary] = useSetPrimaryVehicleMutation();
  const toast = useToast();
  const { colors: tc } = useTheme();

  const handleSetPrimary = async (vehicleId: string) => {
    try {
      await setPrimary(vehicleId).unwrap();
      toast.success('Vehicle set as primary.');
    } catch {
      toast.error('Failed to set vehicle as primary.');
    }
  };

  const renderItem = ({ item }: { item: Vehicle }) => (
    <Pressable
      onPress={() => navigation.navigate('AddEditVehicle', { vehicleId: item.id })}
      accessibilityRole="button"
      accessibilityLabel={`${item.make} ${item.model}`}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: tc.surface, borderColor: tc.border, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      {/* Card Header */}
      <View style={styles.cardHeader}>
        <View style={styles.headerInfo}>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Ionicons name="car" size={20} color={colors.primary[400]} />
              <View style={[styles.titleRow, {}]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 }}>
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={[styles.vehicleTitle, { color: tc.text }]}>{item.make} {item.model}</Text>
                      {item.isPrimary && (
                        <View style={[styles.primaryBadge, { backgroundColor: colors.success[100] }]}>
                          <Ionicons name="star" size={10} color={colors.success[600]} />
                          <Text style={[styles.primaryBadgeText, { color: colors.success[700] }]}>Primary</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.vehicleMeta, { color: tc.textSecondary }]}>{item.year} • {item.color || 'No color'}</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Plate */}
      <View style={[styles.plateContainer, { backgroundColor: tc.background }]}>
        <Text style={[styles.plateLabel, { color: tc.textTertiary }]}>License Plate</Text>
        <Text style={[styles.plateNumber, { color: tc.text }]}>{item.licensePlate.toUpperCase()}</Text>
      </View>

      {/* Card Actions */}
      <View style={styles.cardActions}>
        {item.isPrimary ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <Ionicons name="shield-checkmark" size={14} color={colors.success[500]} />
            <Text style={[styles.activeLabel, { color: colors.success[600] }]}>Paired with crash sensor</Text>
          </View>
        ) : (
          <Pressable
            onPress={() => handleSetPrimary(item.id)}
            accessibilityRole="button"
            accessibilityLabel="Set as primary vehicle"
            style={({ pressed }) => [
              styles.setPrimaryBtn,
              { backgroundColor: colors.primary[50], borderColor: colors.primary[200], opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <Ionicons name="flash-outline" size={14} color={colors.primary[500]} />
              <Text style={[styles.setPrimaryText, { color: colors.primary[600] }]}>Activate</Text>
            </View>
          </Pressable>
        )}

        <Pressable
          onPress={() => navigation.navigate('VehicleInsurance', { vehicleId: item.id })}
          accessibilityRole="button"
          accessibilityLabel={item.insurance ? 'View insurance' : 'Add insurance'}
          style={({ pressed }) => [styles.insuranceBtn, { opacity: pressed ? 0.85 : 1 }]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <Ionicons
              name={item.insurance ? 'shield-checkmark-outline' : 'add-circle-outline'}
              size={14}
              color={item.insurance ? colors.success[500] : colors.primary[500]}
            />
            <Text style={{ color: item.insurance ? colors.success[600] : colors.primary[600], fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium }}>
              {item.insurance ? 'Insured' : 'Add Insurance'}
            </Text>
          </View>
        </Pressable>
      </View>
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: tc.background }}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: tc.text }]}>My Vehicles</Text>
        <Text style={[styles.headerSub, { color: tc.textSecondary }]}>{vehicles?.length || 0} registered</Text>
      </View>

      {/* Loading */}
      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      )}

      {/* Error */}
      {error != null && (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={36} color={colors.danger[500]} style={{ marginBottom: spacing.sm }} />
          <Text style={{ color: colors.danger[500], fontSize: typography.fontSize.md }}>Failed to load vehicles</Text>
          <Pressable onPress={() => refetch()} accessibilityRole="button" accessibilityLabel="Retry" style={{ marginTop: spacing.md }}>
            <Text style={{ color: colors.primary[500], fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.semibold }}>Retry</Text>
          </Pressable>
        </View>
      )}

      {/* Empty */}
      {!isLoading && !error && vehicles?.length === 0 && (
        <View style={styles.center}>
          <Ionicons name="car-outline" size={48} color={tc.textTertiary} style={{ marginBottom: spacing.md }} />
          <Text style={{ color: tc.text, fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold }}>No vehicles registered</Text>
          <Text style={{ color: tc.textSecondary, fontSize: typography.fontSize.sm, marginTop: spacing.xs, textAlign: 'center' }}>
            Add a vehicle to enable automatic accident detection.
          </Text>
        </View>
      )}

      {/* List */}
      {!isLoading && !error && vehicles && vehicles.length > 0 && (
        <FlatList
          data={vehicles}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={renderItem}
        />
      )}

      {/* FAB */}
      <Pressable
        onPress={() => navigation.navigate('AddEditVehicle', {})}
        accessibilityRole="button"
        accessibilityLabel="Add new vehicle"
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: colors.primary[600], opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>
    </View>
  );
}

// Imports needed at bottom (React Native Text/ActivityIndicator)
import { Text, ActivityIndicator } from 'react-native';

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold },
  headerSub: { fontSize: typography.fontSize.sm },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xl },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: 80, gap: spacing.md },
  card: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.lg, ...shadows.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  headerInfo: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  vehicleTitle: { fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold },
  vehicleMeta: { fontSize: typography.fontSize.sm, marginTop: spacing.xs },
  primaryBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.full, marginLeft: spacing.sm },
  primaryBadgeText: { fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, textTransform: 'uppercase' },
  plateContainer: { borderRadius: radius.md, paddingVertical: spacing.md, paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  plateLabel: { fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.medium, textTransform: 'uppercase', marginBottom: spacing.xs },
  plateNumber: { fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, letterSpacing: 1 },
  cardActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  activeLabel: { fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium },
  setPrimaryBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1 },
  setPrimaryText: { fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold },
  insuranceBtn: { padding: spacing.xs },
  fab: { position: 'absolute', bottom: spacing.xl, right: spacing.xl, width: 56, height: 56, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', ...shadows.lg },
});

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/axios';
import type { AppNavigation } from '../../navigation/types';
import { colors, darkColors } from '../../theme/tokens';

// Local styles — will be replaced with theme tokens in Batch 6
const adminStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: darkColors.background, padding: 24 },
  customHeader: {
    flexDirection: 'row',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 44,
    height: Platform.OS === 'android' ? 56 + (StatusBar.currentHeight || 0) + 12 : 56 + 44,
    backgroundColor: 'rgba(28, 28, 46, 0.9)',
    alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  customHeaderTitle: { fontSize: 18, fontWeight: 'bold', color: darkColors.text },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: colors.danger[500], marginBottom: 12 },
  scrollList: { flex: 1, marginBottom: 20 },
  approvalCard: { backgroundColor: 'rgba(28, 28, 46, 0.6)', borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)' },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  mechanicName: { fontSize: 16, fontWeight: 'bold', color: darkColors.text },
  specializationBadge: { backgroundColor: 'rgba(229, 57, 53, 0.12)', color: colors.danger[300], fontSize: 11, fontWeight: 'bold', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(229, 57, 53, 0.3)' },
  cardInfo: { fontSize: 13, color: darkColors.textSecondary, marginBottom: 4 },
  approveBtn: { backgroundColor: colors.success[500], paddingVertical: 10, borderRadius: 14, alignItems: 'center', marginTop: 12 },
  approveBtnText: { color: darkColors.background, fontSize: 14, fontWeight: 'bold' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, marginVertical: 40 },
  emptyText: { color: darkColors.textSecondary, fontSize: 15, textAlign: 'center' },
  errorText: { color: colors.danger[300], fontSize: 14, textAlign: 'center', marginVertical: 20 },
  navBtn: { backgroundColor: colors.danger[500], paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 10 },
  navBtnText: { color: darkColors.text, fontSize: 16, fontWeight: 'bold' },
});

export default function AdminHome({ navigation }: { navigation: AppNavigation }) {
  const [pendingMechanics, setPendingMechanics] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  const fetchPendingMechanics = React.useCallback(async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      const response = await api.get('/admin/users?role=MECHANIC');
      const unverified = response.data.users.filter(
        (u: any) => u.mechanicDetails && u.mechanicDetails.isWorkshopVerified === false
      );
      setPendingMechanics(unverified);
    } catch {
      setMessage('Failed to load pending approvals list.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchPendingMechanics();
  }, [fetchPendingMechanics]);

  const handleApprove = async (userId: string) => {
    try {
      await api.patch(`/admin/users/${userId}/verify-workshop`, { isWorkshopVerified: true });
      setPendingMechanics((prev) => prev.filter((m) => m.id !== userId));
    } catch {
      // TODO: Batch 6 — replace with Toast
      console.warn('Failed to approve workshop');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: darkColors.surface }}>
      <View style={adminStyles.customHeader}>
        <View style={{ width: 28 }} />
        <Text style={adminStyles.customHeaderTitle}>Admin Controls</Text>
        <View style={{ width: 28 }} />
      </View>
      <View style={adminStyles.container}>
        <Text style={adminStyles.sectionTitle}>Pending Workshop Approvals ({pendingMechanics.length})</Text>

        {isLoading ? (
          <ActivityIndicator color="#d32f2f" size="large" style={{ marginTop: 20 }} />
        ) : message ? (
          <Text style={adminStyles.errorText}>{message}</Text>
        ) : pendingMechanics.length === 0 ? (
          <View style={adminStyles.emptyContainer}>
            <Text style={adminStyles.emptyText}>All workshops are currently verified!</Text>
          </View>
        ) : (
          <ScrollView style={adminStyles.scrollList}>
            {pendingMechanics.map((mechanic) => (
              <View key={mechanic.id} style={adminStyles.approvalCard}>
                <View style={adminStyles.cardRow}>
                  <Text style={adminStyles.mechanicName}>{mechanic.fullName}</Text>
                  <Text style={adminStyles.specializationBadge}>{mechanic.mechanicDetails?.specialization}</Text>
                </View>
                <Text style={adminStyles.cardInfo}>Email: {mechanic.email}</Text>
                <Text style={adminStyles.cardInfo}>Phone: {mechanic.phoneNumber}</Text>
                <Text style={adminStyles.cardInfo}>Workshop: <Text style={{ fontWeight: 'bold', color: darkColors.text }}>{mechanic.mechanicDetails?.workshopName}</Text></Text>
                <Text style={adminStyles.cardInfo}>Address: {mechanic.mechanicDetails?.workshopAddress}</Text>
                <TouchableOpacity style={adminStyles.approveBtn} onPress={() => handleApprove(mechanic.id)} accessibilityRole="button" accessibilityLabel={`Approve workshop for ${mechanic.fullName}`}>
                  <Text style={adminStyles.approveBtnText}>Approve & Verify Workshop</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}

        <TouchableOpacity style={adminStyles.navBtn} onPress={() => navigation.navigate('AdminDashboard')} accessibilityRole="button" accessibilityLabel="Analytics Dashboard">
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Ionicons name="analytics-outline" size={18} color="#ffffff" />
            <Text style={adminStyles.navBtnText}>Analytics Dashboard</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={adminStyles.navBtn} onPress={() => navigation.navigate('Profile')} accessibilityRole="button" accessibilityLabel="Go to My Profile">
          <Text style={adminStyles.navBtnText}>Go to My Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

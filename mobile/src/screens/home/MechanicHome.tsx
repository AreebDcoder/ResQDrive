import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, StatusBar } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { RootState } from '../../store/store';
import { logoutAction } from '../../store/slices/authSlice';
import type { AppNavigation } from '../../navigation/types';
import { colors, darkColors } from '../../theme/tokens';

// Local styles — will be replaced with theme tokens in Batch 6
const mS = StyleSheet.create({
  workshopCard: { backgroundColor: 'rgba(28,28,46,0.6)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: 20, marginBottom: 10 },
  workshopLabel: { fontSize: 12, color: darkColors.textTertiary, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 1 },
  workshopName: { fontSize: 20, fontWeight: '600', color: '#fff', marginTop: 4 },
  workshopSpec: { fontSize: 14, color: colors.danger[600], marginTop: 2 },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(28,28,46,0.6)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: 16, gap: 14 },
  menuLabel: { flex: 1, fontSize: 15, color: darkColors.text },
  logoutBtn: { backgroundColor: 'rgba(211,47,47,0.12)', borderWidth: 1, borderColor: 'rgba(211,47,47,0.3)', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 20 },
  logoutText: { color: '#ef4444', fontSize: 15, fontWeight: '600' },
  customHeader: {
    flexDirection: 'row',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 44,
    height: Platform.OS === 'android' ? 56 + (StatusBar.currentHeight || 0) + 12 : 56 + 44,
    backgroundColor: 'rgba(28, 28, 46, 0.9)',
    alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  customHeaderTitle: { fontSize: 18, fontWeight: 'bold', color: darkColors.text },
});

export default function MechanicHome({ navigation }: { navigation: AppNavigation }) {
  const { user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();

  return (
    <View style={{ flex: 1, backgroundColor: darkColors.background }}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0F" />
      <View style={mS.customHeader}>
        <View style={{ width: 28 }} />
        <Text style={mS.customHeaderTitle}>Workshop Dashboard</Text>
        <View style={{ width: 28 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
        <View style={mS.workshopCard}>
          <Text style={mS.workshopLabel}>Workshop</Text>
          <Text style={mS.workshopName}>{user?.mechanicDetails?.workshopName || 'My Workshop'}</Text>
          <Text style={mS.workshopSpec}>{user?.mechanicDetails?.specialization || 'General Repair'}</Text>
        </View>
        <TouchableOpacity style={mS.menuItem} onPress={() => navigation.navigate('Profile')} accessibilityRole="button" accessibilityLabel="My Profile">
          <Ionicons name="person-circle-outline" size={22} color="#aaa" />
          <Text style={mS.menuLabel}>My Profile</Text>
          <Ionicons name="chevron-forward" size={18} color="#555" />
        </TouchableOpacity>
        <TouchableOpacity style={mS.menuItem} onPress={() => navigation.navigate('IncidentsList')} accessibilityRole="button" accessibilityLabel="Incident History">
          <Ionicons name="document-text-outline" size={22} color="#aaa" />
          <Text style={mS.menuLabel}>Incident History</Text>
          <Ionicons name="chevron-forward" size={18} color="#555" />
        </TouchableOpacity>
        <TouchableOpacity style={mS.menuItem} onPress={() => navigation.navigate('NotificationHistory')} accessibilityRole="button" accessibilityLabel="Notifications">
          <Ionicons name="notifications-outline" size={22} color="#aaa" />
          <Text style={mS.menuLabel}>Notifications</Text>
          <Ionicons name="chevron-forward" size={18} color="#555" />
        </TouchableOpacity>
        <TouchableOpacity style={mS.menuItem} onPress={() => navigation.navigate('Hospitals')} accessibilityRole="button" accessibilityLabel="Nearby Hospitals">
          <Ionicons name="medkit-outline" size={22} color="#aaa" />
          <Text style={mS.menuLabel}>Nearby Hospitals</Text>
          <Ionicons name="chevron-forward" size={18} color="#555" />
        </TouchableOpacity>
        <TouchableOpacity style={mS.logoutBtn} onPress={() => dispatch(logoutAction())} accessibilityRole="button" accessibilityLabel="Logout">
          <Text style={mS.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

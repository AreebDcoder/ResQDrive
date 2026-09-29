import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, StatusBar } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { RootState } from '../../store/store';
import { logoutAction } from '../../store/slices/authSlice';
import type { AppNavigation } from '../../navigation/types';
import { colors, darkColors, tints } from '../../theme/tokens';

// Local styles — will be replaced with theme tokens in Batch 6
const mS = StyleSheet.create({
  workshopCard: { backgroundColor: tints.glassCard, borderWidth: 1, borderColor: tints.whiteBorderStrong, borderRadius: 16, padding: 20, marginBottom: 10 },
  workshopLabel: { fontSize: 12, color: darkColors.textTertiary, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 1 },
  workshopName: { fontSize: 20, fontWeight: '600', color: darkColors.text, marginTop: 4 },
  workshopSpec: { fontSize: 14, color: colors.danger[600], marginTop: 2 },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: tints.glassCard, borderWidth: 1, borderColor: tints.whiteBorderStrong, borderRadius: 14, padding: 16, gap: 14 },
  menuLabel: { flex: 1, fontSize: 15, color: darkColors.text },
  logoutBtn: { backgroundColor: tints.dangerLight, borderWidth: 1, borderColor: tints.dangerMedium, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 20 },
  logoutText: { color: colors.danger[500], fontSize: 15, fontWeight: '600' },
  customHeader: {
    flexDirection: 'row',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 44,
    height: Platform.OS === 'android' ? 56 + (StatusBar.currentHeight || 0) + 12 : 56 + 44,
    backgroundColor: tints.glassCardStrong,
    alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: tints.whiteBorder,
  },
  customHeaderTitle: { fontSize: 18, fontWeight: 'bold', color: darkColors.text },
});

export default function MechanicHome({ navigation }: { navigation: AppNavigation }) {
  const { user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();

  return (
    <View style={{ flex: 1, backgroundColor: darkColors.background }}>
      <StatusBar barStyle="light-content" backgroundColor={darkColors.background} />
      <View style={mS.customHeader}>
        <View style={{ width: 28 }} />
        <Text style={mS.customHeaderTitle} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Workshop Dashboard</Text>
        <View style={{ width: 28 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
        <View style={mS.workshopCard}>
          <Text style={mS.workshopLabel} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Workshop</Text>
          <Text style={mS.workshopName} allowFontScaling={true} maxFontSizeMultiplier={1.5}>{user?.mechanicDetails?.workshopName || 'My Workshop'}</Text>
          <Text style={mS.workshopSpec} allowFontScaling={true} maxFontSizeMultiplier={1.5}>{user?.mechanicDetails?.specialization || 'General Repair'}</Text>
        </View>
        <TouchableOpacity style={mS.menuItem} onPress={() => navigation.navigate('Profile')} accessibilityRole="button" accessibilityLabel="My Profile">
          <Ionicons name="person-circle-outline" size={22} color={darkColors.textTertiary} />
          <Text style={mS.menuLabel} allowFontScaling={true} maxFontSizeMultiplier={1.5}>My Profile</Text>
          <Ionicons name="chevron-forward" size={18} color={darkColors.textTertiary} />
        </TouchableOpacity>
        <TouchableOpacity style={mS.menuItem} onPress={() => navigation.navigate('IncidentsList')} accessibilityRole="button" accessibilityLabel="Incident History">
          <Ionicons name="document-text-outline" size={22} color={darkColors.textTertiary} />
          <Text style={mS.menuLabel} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Incident History</Text>
          <Ionicons name="chevron-forward" size={18} color={darkColors.textTertiary} />
        </TouchableOpacity>
        <TouchableOpacity style={mS.menuItem} onPress={() => navigation.navigate('NotificationHistory')} accessibilityRole="button" accessibilityLabel="Notifications">
          <Ionicons name="notifications-outline" size={22} color={darkColors.textTertiary} />
          <Text style={mS.menuLabel} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Notifications</Text>
          <Ionicons name="chevron-forward" size={18} color={darkColors.textTertiary} />
        </TouchableOpacity>
        <TouchableOpacity style={mS.menuItem} onPress={() => navigation.navigate('Hospitals')} accessibilityRole="button" accessibilityLabel="Nearby Hospitals">
          <Ionicons name="medkit-outline" size={22} color={darkColors.textTertiary} />
          <Text style={mS.menuLabel} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Nearby Hospitals</Text>
          <Ionicons name="chevron-forward" size={18} color={darkColors.textTertiary} />
        </TouchableOpacity>
        <TouchableOpacity style={mS.logoutBtn} onPress={() => dispatch(logoutAction())} accessibilityRole="button" accessibilityLabel="Logout">
          <Text style={mS.logoutText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, StatusBar, ActivityIndicator, RefreshControl } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { RootState } from '../../store/store';
import { logoutAction } from '../../store/slices/authSlice';
import type { AppNavigation } from '../../navigation/types';
import { colors, darkColors, tints, spacing, radius, typography } from '../../theme/tokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../api/axios';

export default function MechanicHome({ navigation }: { navigation: AppNavigation }) {
  const { user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const [incidents, setIncidents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchIncidents = async () => {
    try {
      const res = await api.get('/incidents', { params: { limit: 3, assignedToMe: true } });
      setIncidents(res.data?.incidents || res.data || []);
    } catch (err) {
      // Fallback: fetch all incidents
      try {
        const res = await api.get('/incidents', { params: { limit: 3 } });
        setIncidents(res.data?.incidents || res.data || []);
      } catch (e) {}
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchIncidents();
  };

  const workshop = user?.mechanicDetails;

  const quickActions = [
    { label: 'Profile', icon: 'person-circle-outline', route: 'Profile', color: colors.info[500] },
    { label: 'Incidents', icon: 'document-text-outline', route: 'IncidentsList', color: colors.warning[500] },
    { label: 'Notifications', icon: 'notifications-outline', route: 'NotificationHistory', color: colors.success[500] },
    { label: 'Hospitals', icon: 'medkit-outline', route: 'Hospitals', color: colors.danger[500] },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: darkColors.background }}>
      <StatusBar barStyle="light-content" backgroundColor={darkColors.background} />
      {/* Native Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Text style={styles.headerTitle} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Workshop Dashboard</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['5xl'] }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.danger[500]} colors={[colors.danger[500]]} />}
      >
        {/* Workshop Info Card */}
        <View style={styles.workshopCard}>
          <View style={styles.workshopIconRow}>
            <View style={styles.workshopIconCircle}>
              <Ionicons name="construct" size={28} color={colors.danger[500]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.workshopLabel} allowFontScaling={true} maxFontSizeMultiplier={1.5}>WORKSHOP</Text>
              <Text style={styles.workshopName} allowFontScaling={true} maxFontSizeMultiplier={1.5}>
                {workshop?.workshopName || 'My Workshop'}
              </Text>
              <Text style={styles.workshopSpec} allowFontScaling={true} maxFontSizeMultiplier={1.5}>
                {workshop?.specialization || 'General Repair'}
              </Text>
            </View>
          </View>
        </View>

        {/* KPI Row */}
        <View style={styles.kpiRow}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue} allowFontScaling={true} maxFontSizeMultiplier={1.5}>{incidents.length}</Text>
            <Text style={styles.kpiLabel} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Recent Jobs</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue} allowFontScaling={true} maxFontSizeMultiplier={1.5}>--</Text>
            <Text style={styles.kpiLabel} allowFontScaling={true} maxFontSizeMultiplier={1.5}>This Month</Text>
          </View>
          <View style={styles.kpiCard}>
            <Ionicons name="star" size={20} color={colors.warning[500]} />
            <Text style={styles.kpiLabel} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Rating</Text>
          </View>
        </View>

        {/* Quick Actions Grid */}
        <Text style={styles.sectionTitle} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          {quickActions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={styles.quickActionCard}
              onPress={() => navigation.navigate(action.route as any)}
              accessibilityRole="button"
              accessibilityLabel={action.label}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: `${action.color}20` }]}>
                <Ionicons name={action.icon as any} size={24} color={action.color} />
              </View>
              <Text style={styles.quickActionLabel} allowFontScaling={true} maxFontSizeMultiplier={1.5}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent Incidents */}
        <Text style={styles.sectionTitle} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Recent Jobs</Text>
        {isLoading ? (
          <ActivityIndicator size="large" color={colors.danger[500]} style={{ padding: spacing.xl }} />
        ) : incidents.length > 0 ? (
          incidents.map((incident: any, index: number) => (
            <TouchableOpacity
              key={incident.id || index}
              style={styles.incidentCard}
              onPress={() => navigation.navigate('IncidentDetail', { id: incident.id })}
              accessibilityRole="button"
            >
              <View style={styles.incidentIconRow}>
                <Ionicons name="car" size={20} color={colors.danger[500]} />
                <Text style={styles.incidentTitle} allowFontScaling={true} maxFontSizeMultiplier={1.5}>
                  {incident.type || 'AUTO'} • {incident.severity || 'MODERATE'}
                </Text>
              </View>
              <Text style={styles.incidentDate} allowFontScaling={true} maxFontSizeMultiplier={1.5}>
                {new Date(incident.occurredAt).toLocaleDateString()}
              </Text>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={40} color={darkColors.textTertiary} />
            <Text style={styles.emptyStateText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>No recent jobs</Text>
          </View>
        )}

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={() => dispatch(logoutAction())} accessibilityRole="button" accessibilityLabel="Logout">
          <Ionicons name="log-out-outline" size={20} color={colors.danger[500]} style={{ marginRight: spacing.sm }} />
          <Text style={styles.logoutText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 56, backgroundColor: darkColors.surface, borderBottomWidth: 1, borderBottomColor: darkColors.border },
  headerTitle: { fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: darkColors.text },
  workshopCard: { backgroundColor: tints.glassCard, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: tints.whiteBorder },
  workshopIconRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  workshopIconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: tints.dangerSubtle, justifyContent: 'center', alignItems: 'center' },
  workshopLabel: { fontSize: typography.fontSize.xs, color: darkColors.textTertiary, fontWeight: typography.fontWeight.medium, letterSpacing: 1 },
  workshopName: { fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: darkColors.text, marginTop: 2 },
  workshopSpec: { fontSize: typography.fontSize.sm, color: colors.danger[500], marginTop: 2 },
  kpiRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  kpiCard: { flex: 1, backgroundColor: tints.glassCard, borderRadius: radius.md, padding: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: tints.whiteBorder, gap: spacing.xs },
  kpiValue: { fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: darkColors.text },
  kpiLabel: { fontSize: typography.fontSize.xs, color: darkColors.textSecondary, marginTop: 2 },
  sectionTitle: { fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.bold, color: darkColors.text, marginTop: spacing.lg, marginBottom: spacing.sm },
  quickActionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  quickActionCard: { width: '48%', backgroundColor: tints.glassCard, borderRadius: radius.lg, padding: spacing.lg, alignItems: 'center', borderWidth: 1, borderColor: tints.whiteBorder, gap: spacing.sm },
  quickActionIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  quickActionLabel: { fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, color: darkColors.text },
  incidentCard: { backgroundColor: tints.glassCard, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: tints.whiteBorder },
  incidentIconRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  incidentTitle: { flex: 1, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, color: darkColors.text },
  incidentDate: { fontSize: typography.fontSize.xs, color: darkColors.textTertiary },
  emptyState: { alignItems: 'center', paddingVertical: spacing['3xl'], gap: spacing.sm },
  emptyStateText: { fontSize: typography.fontSize.sm, color: darkColors.textTertiary },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: tints.dangerLight, borderWidth: 1, borderColor: tints.dangerMedium, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.xl },
  logoutText: { color: colors.danger[500], fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.semibold },
});

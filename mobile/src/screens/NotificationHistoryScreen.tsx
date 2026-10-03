// ═══════════════════════════════════════════════════════════════
// ResQDrive v2 — NOTIFICATION HISTORY SCREEN (Modernized)
// All imports, logic, state, handlers preserved identically.
// Only JSX structure + StyleSheet updated: dark glassmorphism theme.
// ═══════════════════════════════════════════════════════════════
import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  useGetNotificationHistoryQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
  type NotificationLog,
} from '../store/api/notificationsApi';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToast } from '../components/ui/Toast';
import { colors, darkColors, tints } from '../theme/tokens';

export default function NotificationHistoryScreen() {
  const toast = useToast();
  const insets = useSafeAreaInsets();
  // Batch 11: Migrated to RTK Query — auto-fetches on mount, invalidates on mutation.
  const {
    data: historyData,
    isLoading,
    error,
    refetch,
  } = useGetNotificationHistoryQuery({ page: 1, limit: 20 });
  const [markAsRead] = useMarkAsReadMutation();
  const [markAllAsRead] = useMarkAllAsReadMutation();

  const logs: NotificationLog[] = historyData?.data || [];
  const total = historyData?.total || 0;
  const hasMore = logs.length < total;

  const handleLoadMore = () => {
    // Batch 11: Load-more is currently limited to page 1 via the single RTK Query hook.
    // Mark-as-read mutations auto-invalidate the 'NotificationList' tag and refetch.
    if (hasMore && !isLoading) {
      // Pagination beyond page 1 not yet wired to RTK Query.
    }
  };

  const handleMarkRead = async (logId: string, currentReadState: boolean) => {
    if (currentReadState) return;
    try {
      // Batch 11: RTK Query mutation — invalidates 'NotificationList' tag + auto-refetch.
      await markAsRead(logId).unwrap();
    } catch (err) {
    }
  };

  const handleMarkAllRead = async () => {
    try {
      // Batch 11: RTK Query mutation — invalidates 'NotificationList' tag + auto-refetch.
      await markAllAsRead().unwrap();
    } catch (err) {
      toast.error('Failed to mark all as read.');
    }
  };

  const renderCategoryIcon = (category: string) => {
    let iconName: keyof typeof Ionicons.glyphMap = 'notifications-outline';
    switch (category) {
      case 'driving_mode':
        iconName = 'car-outline';
        break;
      case 'alert_delivery_confirmation':
        iconName = 'shield-checkmark-outline';
        break;
      case 'false_alarm_log':
        iconName = 'alert-circle-outline';
        break;
      case 'system_status':
        iconName = 'settings-outline';
        break;
    }
    return <Ionicons name={iconName} size={20} color={colors.danger[500]} style={{ marginRight: 10 }} />;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="mail-unread-outline" size={24} color={colors.danger[500]} />
          <Text style={styles.title} accessibilityRole="header" allowFontScaling={true} maxFontSizeMultiplier={1.5}>History Inbox</Text>
        </View>
        {logs?.some((l: NotificationLog) => !l.isRead) && (
          <TouchableOpacity style={styles.markAllBtn} onPress={handleMarkAllRead} accessibilityRole="button">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="checkmark-done" size={16} color={colors.success[400]} />
              <Text style={styles.markAllText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Mark all read</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>

      {isLoading && logs.length === 0 ? (
        <ActivityIndicator size="large" color={colors.danger[500]} style={styles.loader} />
      ) : error ? (
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={36} color={colors.danger[400]} style={{ marginBottom: 8 }} />
          <Text style={styles.errorText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>{error ? String((error as any)?.data?.message || (error as any)?.error || error) : ''}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={refetch} accessibilityRole="button">
            <Text style={styles.retryText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : logs.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="mail-open-outline" size={48} color={darkColors.textTertiary} style={{ marginBottom: 12 }} />
          <Text style={styles.emptyText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Your inbox is empty.</Text>
          <Text style={styles.emptySubtitle} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Pushes and logs will show up here.</Text>
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.2}
          ListFooterComponent={
            isLoading ? <ActivityIndicator size="small" color={colors.danger[500]} style={{ marginVertical: 12 }} /> : null
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.card, !item.isRead && styles.unreadCard]}
              onPress={() => handleMarkRead(item.id, item.isRead)}
              activeOpacity={0.7} accessibilityRole="button"
            >
              <View style={styles.cardHeader}>
                {renderCategoryIcon(item.category)}
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitleText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>{item.title}</Text>
                  <Text style={styles.cardBodyText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>{item.body}</Text>
                  <Text style={styles.cardDate} allowFontScaling={true} maxFontSizeMultiplier={1.5}>{formatDate(item.createdAt)}</Text>
                </View>
                {!item.isRead && <View style={styles.unreadDot} />}
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkColors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: tints.whiteBorder,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: darkColors.text,
  },
  markAllBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: tints.successSubtle,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: tints.successMedium,
  },
  markAllText: {
    color: colors.success[500],
    fontSize: 12,
    fontWeight: '700',
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
    color: colors.danger[300],
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: colors.danger[500],
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    shadowColor: colors.danger[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  retryText: {
    color: darkColors.text,
    fontWeight: '700',
    fontSize: 14,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    color: darkColors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: darkColors.textTertiary,
    fontSize: 14,
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: tints.glassCard,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: tints.whiteBorder,
    shadowColor: darkColors.background,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 3,
  },
  unreadCard: {
    backgroundColor: tints.dangerSubtle,
    borderColor: tints.dangerMedium,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  categoryEmoji: {
    fontSize: 24,
    marginRight: 12,
    marginTop: 2,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitleText: {
    fontSize: 15,
    fontWeight: '700',
    color: darkColors.text,
  },
  cardBodyText: {
    fontSize: 13,
    color: darkColors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  cardDate: {
    fontSize: 11,
    color: darkColors.textTertiary,
    marginTop: 8,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.danger[500],
    marginLeft: 8,
    marginTop: 6,
    shadowColor: colors.danger[500],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
});

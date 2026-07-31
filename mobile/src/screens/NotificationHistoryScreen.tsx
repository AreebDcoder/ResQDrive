// ═══════════════════════════════════════════════════════════════
// ResQDrive v2 — NOTIFICATION HISTORY SCREEN (Modernized)
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
import {
  fetchHistoryStart,
  fetchHistorySuccess,
  fetchHistoryFailure,
  markReadSuccess,
  markAllReadSuccess,
  NotificationLog,
} from '../store/slices/notificationsSlice';
import api from '../api/axios';

export default function NotificationHistoryScreen() {
  const dispatch = useDispatch();
  const { history: logs, isHistoryLoading, pagination, error } = useSelector(
    (state: RootState) => state.notifications
  );
  const [page, setPage] = useState(1);

  const fetchHistory = async (pageNum = 1, append = false) => {
    if (pageNum === 1) {
      dispatch(fetchHistoryStart());
    }
    try {
      const response = await api.get(`/notifications/history?page=${pageNum}&limit=15`);
      dispatch(
        fetchHistorySuccess({
          logs: response.data.logs,
          pagination: response.data.pagination,
          append,
        })
      );
    } catch (err: any) {
      dispatch(
        fetchHistoryFailure(err.response?.data?.message || 'Failed to fetch notification history.')
      );
    }
  };

  useEffect(() => {
    fetchHistory(1, false);
  }, []);

  const handleLoadMore = () => {
    if (page < pagination.totalPages && !isHistoryLoading) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchHistory(nextPage, true);
    }
  };

  const handleMarkRead = async (logId: string, isRead: boolean) => {
    if (isRead) return;
    try {
      await api.patch(`/notifications/${logId}/read`);
      dispatch(markReadSuccess(logId));
    } catch (err) {
      console.log('Failed to mark notification read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      dispatch(markAllReadSuccess());
    } catch (err) {
      alert('Failed to mark all as read.');
    }
  };

  const getCategoryEmoji = (category: string) => {
    switch (category) {
      case 'driving_mode':
        return '🚗';
      case 'alert_delivery_confirmation':
        return '🛡️';
      case 'false_alarm_log':
        return '⚠️';
      case 'system_status':
        return '⚙️';
      default:
        return '🔔';
    }
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
      <View style={styles.header}>
        <Text style={styles.title}>📬 History Inbox</Text>
        {logs.some((l) => !l.isRead) && (
          <TouchableOpacity style={styles.markAllBtn} onPress={handleMarkAllRead}>
            <Text style={styles.markAllText}>✅ Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {isHistoryLoading && logs.length === 0 ? (
        <ActivityIndicator size="large" color="#E53935" style={styles.loader} />
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorEmoji}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchHistory(1, false)}>
            <Text style={styles.retryText}>🔄 Retry</Text>
          </TouchableOpacity>
        </View>
      ) : logs.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyEmoji}>📭</Text>
          <Text style={styles.emptyText}>Your inbox is empty.</Text>
          <Text style={styles.emptySubtitle}>Pushes and logs will show up here.</Text>
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.2}
          ListFooterComponent={
            isHistoryLoading ? <ActivityIndicator size="small" color="#E53935" style={{ marginVertical: 12 }} /> : null
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.card, !item.isRead && styles.unreadCard]}
              onPress={() => handleMarkRead(item.id, item.isRead)}
              activeOpacity={0.7}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.categoryEmoji}>{getCategoryEmoji(item.category)}</Text>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitleText}>{item.title}</Text>
                  <Text style={styles.cardBodyText}>{item.body}</Text>
                  <Text style={styles.cardDate}>{formatDate(item.createdAt)}</Text>
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
    backgroundColor: '#0A0A0F',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  markAllBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0, 230, 118, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.25)',
  },
  markAllText: {
    color: '#00E676',
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
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: 'rgba(28, 28, 46, 0.6)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 3,
  },
  unreadCard: {
    backgroundColor: 'rgba(229, 57, 53, 0.06)',
    borderColor: 'rgba(229, 57, 53, 0.2)',
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
    color: '#FFFFFF',
  },
  cardBodyText: {
    fontSize: 13,
    color: '#A0A0B8',
    marginTop: 4,
    lineHeight: 18,
  },
  cardDate: {
    fontSize: 11,
    color: '#6B6B80',
    marginTop: 8,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E53935',
    marginLeft: 8,
    marginTop: 6,
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
});
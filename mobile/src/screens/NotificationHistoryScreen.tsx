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
      <View style={styles.header}>
        <Text style={styles.title}>History Inbox</Text>
        {logs.some((l) => !l.isRead) && (
          <TouchableOpacity style={styles.markAllBtn} onPress={handleMarkAllRead}>
            <Text style={styles.markAllText}>Mark all as read</Text>
          </TouchableOpacity>
        )}
      </View>

      {isHistoryLoading && logs.length === 0 ? (
        <ActivityIndicator size="large" color="#d32f2f" style={styles.loader} />
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchHistory(1, false)}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : logs.length === 0 ? (
        <View style={styles.centerContainer}>
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
            isHistoryLoading ? <ActivityIndicator size="small" color="#d32f2f" style={{ marginVertical: 12 }} /> : null
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.card, !item.isRead && styles.unreadCard]}
              onPress={() => handleMarkRead(item.id, item.isRead)}
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
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  markAllBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#222',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#333',
  },
  markAllText: {
    color: '#d32f2f',
    fontSize: 12,
    fontWeight: 'bold',
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
  },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2e2e2e',
  },
  unreadCard: {
    backgroundColor: '#201818',
    borderColor: '#d32f2f',
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
    fontWeight: 'bold',
    color: '#ffffff',
  },
  cardBodyText: {
    fontSize: 13,
    color: '#888888',
    marginTop: 4,
    lineHeight: 18,
  },
  cardDate: {
    fontSize: 11,
    color: '#666666',
    marginTop: 8,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#d32f2f',
    marginLeft: 8,
    marginTop: 6,
  },
});

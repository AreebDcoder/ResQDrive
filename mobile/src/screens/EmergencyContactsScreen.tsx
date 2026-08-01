// ═══════════════════════════════════════════════════════════════
// ResQDrive v2 — EMERGENCY CONTACTS SCREEN (Modernized)
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
import { fetchContactsStart, fetchContactsSuccess, fetchContactsFailure, reorderContactsSuccess } from '../store/slices/contactsSlice';
import api from '../api/axios';

export default function EmergencyContactsScreen({ navigation }: any) {
  const dispatch = useDispatch();
  const { list: contacts, isLoading, error } = useSelector((state: RootState) => state.contacts);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchContacts = async () => {
    dispatch(fetchContactsStart());
    try {
      const response = await api.get('/emergency-contacts');
      dispatch(fetchContactsSuccess(response.data));
    } catch (err: any) {
      dispatch(fetchContactsFailure(err.response?.data?.message || 'Failed to fetch contacts.'));
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchContacts();
    });
    return unsubscribe;
  }, [navigation]);

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === contacts.length - 1) return;

    setIsUpdating(true);
    const reorderedList = [...contacts];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    // Swap items locally
    const temp = reorderedList[index];
    reorderedList[index] = reorderedList[targetIndex];
    reorderedList[targetIndex] = temp;

    // Map new priority values
    const payload = reorderedList.map((contact, idx) => ({
      contactId: contact.id,
      priorityOrder: idx + 1,
    }));

    try {
      const response = await api.patch('/emergency-contacts/reorder', { orders: payload });
      dispatch(reorderContactsSuccess(response.data));
    } catch (err) {
      alert('Failed to reorder contacts.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* ── Info Banner ── */}
      <View style={styles.infoBox}>
        <Text style={styles.infoEmoji}>⚠️</Text>
        <Text style={styles.infoText}>
          Escalation Rules: In an emergency, your primary contact (Priority 1) is notified first. Secondary contacts are alerted at 30-second intervals if the previous one does not respond.
        </Text>
      </View>

      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🆘 Emergency Contacts</Text>
        <Text style={styles.headerSub}>{contacts.length}/5 slots used</Text>
      </View>

      {isLoading && contacts.length === 0 ? (
        <ActivityIndicator size="large" color="#E53935" style={styles.loader} />
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorEmoji}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchContacts}>
            <Text style={styles.retryText}>🔄 Retry</Text>
          </TouchableOpacity>
        </View>
      ) : contacts.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyEmoji}>📇</Text>
          <Text style={styles.emptyText}>No emergency contacts added yet.</Text>
          <Text style={styles.emptySubtitle}>
            Add up to 5 contacts (e.g. Spouse, Parents, Friends) to receive automatic crash alerts.
          </Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {isUpdating && (
            <View style={styles.updatingOverlay}>
              <ActivityIndicator color="#E53935" size="small" />
              <Text style={styles.updatingText}>Syncing priority list...</Text>
            </View>
          )}

          <FlatList
            data={contacts}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item, index }) => (
              <View style={[
                styles.card,
                item.priorityOrder === 1 && styles.primaryCard,
              ]}>
                {/* Priority Badge */}
                <View style={[
                  styles.priorityIndicator,
                  item.priorityOrder === 1 && styles.primaryPriority,
                ]}>
                  <Text style={styles.priorityNum}>{item.priorityOrder}</Text>
                  <Text style={styles.priorityLabel}>{item.priorityOrder === 1 ? 'Primary' : 'Sec'}</Text>
                </View>

                {/* Contact Details */}
                <TouchableOpacity
                  style={styles.cardDetails}
                  onPress={() => navigation.navigate('AddEditContact', { contact: item })}
                  activeOpacity={0.7}
                >
                  <Text style={styles.contactName}>{item.name}</Text>
                  <Text style={styles.contactMeta}>{item.relationship} • {item.phoneNumber}</Text>
                  {item.email ? <Text style={styles.contactEmail}>{item.email}</Text> : null}
                </TouchableOpacity>

                {/* Reorder Arrows */}
                <View style={styles.reorderActions}>
                  <TouchableOpacity
                    style={[styles.arrowBtn, index === 0 && styles.disabledArrow]}
                    onPress={() => handleMove(index, 'up')}
                    disabled={index === 0 || isUpdating}
                  >
                    <Text style={styles.arrowText}>▲</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.arrowBtn, index === contacts.length - 1 && styles.disabledArrow]}
                    onPress={() => handleMove(index, 'down')}
                    disabled={index === contacts.length - 1 || isUpdating}
                  >
                    <Text style={styles.arrowText}>▼</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        </View>
      )}

      {/* ── Add Button / Limit Banner ── */}
      {contacts.length < 5 ? (
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('AddEditContact')}
          activeOpacity={0.8}
        >
          <Text style={styles.addBtnText}>➕ Add Emergency Contact ({contacts.length}/5)</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.limitBanner}>
          <Text style={styles.limitBannerText}>
            🔒 Emergency contact limit reached (maximum 5). Remove or edit existing contacts if needed.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(229, 57, 53, 0.1)',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(229, 57, 53, 0.2)',
  },
  infoEmoji: {
    fontSize: 16,
    marginRight: 8,
    marginTop: 1,
  },
  infoText: {
    color: '#FF8A80',
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
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
    textAlign: 'center',
  },
  emptySubtitle: {
    color: '#6B6B80',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  updatingOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(41, 121, 255, 0.08)',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  updatingText: {
    color: '#2979FF',
    fontSize: 12,
    marginLeft: 8,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: 'rgba(28, 28, 46, 0.6)',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 3,
  },
  primaryCard: {
    borderColor: 'rgba(229, 57, 53, 0.25)',
    backgroundColor: 'rgba(229, 57, 53, 0.06)',
  },
  priorityIndicator: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 10,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  primaryPriority: {
    backgroundColor: 'rgba(229, 57, 53, 0.2)',
  },
  priorityNum: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  priorityLabel: {
    fontSize: 9,
    color: '#6B6B80',
    textTransform: 'uppercase',
    marginTop: 1,
    fontWeight: '600',
  },
  cardDetails: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  contactMeta: {
    fontSize: 13,
    color: '#A0A0B8',
    marginTop: 4,
  },
  contactEmail: {
    fontSize: 12,
    color: '#6B6B80',
    marginTop: 2,
  },
  reorderActions: {
    flexDirection: 'column',
    justifyContent: 'center',
    marginLeft: 10,
  },
  arrowBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 4,
  },
  disabledArrow: {
    opacity: 0.2,
  },
  arrowText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  addBtn: {
    backgroundColor: '#E53935',
    margin: 16,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  limitBanner: {
    backgroundColor: 'rgba(28, 28, 46, 0.6)',
    margin: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  limitBannerText: {
    color: '#6B6B80',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
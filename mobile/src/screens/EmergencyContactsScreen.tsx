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
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          ⚠️ **Escalation Rules:** In an emergency, your primary contact (Priority 1) is notified first. Secondary contacts are alerted at 30-second intervals if the previous one does not respond.
        </Text>
      </View>

      {isLoading && contacts.length === 0 ? (
        <ActivityIndicator size="large" color="#d32f2f" style={styles.loader} />
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchContacts}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : contacts.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>No emergency contacts added yet.</Text>
          <Text style={styles.emptySubtitle}>
            Add up to 5 contacts (e.g. Spouse, Parents, Friends) to receive automatic crash alerts.
          </Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {isUpdating && (
            <View style={styles.updatingOverlay}>
              <ActivityIndicator color="#d32f2f" size="small" />
              <Text style={styles.updatingText}>Syncing priority list...</Text>
            </View>
          )}

          <FlatList
            data={contacts}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item, index }) => (
              <View style={styles.card}>
                <View style={styles.priorityIndicator}>
                  <Text style={styles.priorityNum}>{item.priorityOrder}</Text>
                  <Text style={styles.priorityLabel}>{item.priorityOrder === 1 ? 'Primary' : 'Sec'}</Text>
                </View>

                <TouchableOpacity
                  style={styles.cardDetails}
                  onPress={() => navigation.navigate('AddEditContact', { contact: item })}
                >
                  <Text style={styles.contactName}>{item.name}</Text>
                  <Text style={styles.contactMeta}>{item.relationship} • {item.phoneNumber}</Text>
                  {item.email ? <Text style={styles.contactEmail}>{item.email}</Text> : null}
                </TouchableOpacity>

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

      {/* Conditionally render ADD button under 5 limits */}
      {contacts.length < 5 ? (
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('AddEditContact')}
        >
          <Text style={styles.addBtnText}>Add Emergency Contact ({contacts.length}/5)</Text>
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
    backgroundColor: '#121212',
  },
  infoBox: {
    backgroundColor: '#1e1a1a',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#d32f2f',
  },
  infoText: {
    color: '#ff8a80',
    fontSize: 12,
    lineHeight: 18,
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
    textAlign: 'center',
  },
  emptySubtitle: {
    color: '#888888',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  updatingOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e1e1e',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2e2e2e',
  },
  updatingText: {
    color: '#ffffff',
    fontSize: 12,
    marginLeft: 8,
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#2e2e2e',
  },
  priorityIndicator: {
    backgroundColor: '#2e2e2e',
    borderRadius: 8,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  priorityNum: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  priorityLabel: {
    fontSize: 9,
    color: '#888888',
    textTransform: 'uppercase',
    marginTop: 1,
  },
  cardDetails: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  contactMeta: {
    fontSize: 13,
    color: '#888888',
    marginTop: 4,
  },
  contactEmail: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
  },
  reorderActions: {
    flexDirection: 'column',
    justifyContent: 'center',
    marginLeft: 10,
  },
  arrowBtn: {
    backgroundColor: '#2e2e2e',
    width: 32,
    height: 32,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 4,
  },
  disabledArrow: {
    opacity: 0.3,
  },
  arrowText: {
    color: '#ffffff',
    fontSize: 12,
  },
  addBtn: {
    backgroundColor: '#d32f2f',
    margin: 16,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#d32f2f',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  addBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  limitBanner: {
    backgroundColor: '#1a1a1a',
    margin: 16,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3e3e3e',
  },
  limitBannerText: {
    color: '#888888',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});


// ═══════════════════════════════════════════════════════════════
// ResQDrive v2 — EMERGENCY CONTACTS SCREEN (Modernized)
// All imports, logic, state, handlers preserved identically.
// Only JSX structure + StyleSheet updated: dark glassmorphism theme.
// ═══════════════════════════════════════════════════════════════
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useDispatch } from 'react-redux';
import {
  useGetContactsQuery,
  useDeleteContactMutation,
  useReorderContactsMutation,
} from '../store/api/contactsApi';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToast } from '../components/ui/Toast';
import { ConfirmDialog } from '../components/ui';
import { colors, darkColors, tints } from '../theme/tokens';

export default function EmergencyContactsScreen({ navigation }: any) {
  const toast = useToast();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  // Batch 11: Migrated to RTK Query — automatic caching + invalidation
  const { data: rawContacts, isLoading, error, refetch } = useGetContactsQuery();
  // RTK Query data is initially undefined — default to [] for UI safety.
  const contacts = rawContacts || [];
  const [deleteContact] = useDeleteContactMutation();
  const [reorderContacts] = useReorderContactsMutation();
  const [isUpdating, setIsUpdating] = useState(false);
  const [removeDialogVisible, setRemoveDialogVisible] = useState(false);
  const [pendingRemoveContact, setPendingRemoveContact] = useState<any>(null);

  const handleMove = async (
    index: number,
    direction: 'up' | 'down'
  ) => {
    if (isUpdating) return;

    const targetIndex =
      direction === 'up' ? index - 1 : index + 1;

    if (
      targetIndex < 0 ||
      targetIndex >= contacts.length
    ) {
      return;
    }

    const newContacts = [...contacts];
    const temp = newContacts[index];
    newContacts[index] = newContacts[targetIndex];
    newContacts[targetIndex] = temp;

    const payload = newContacts.map((c, i) => ({
      contactId: c.id,
      id: c.id,
      priorityOrder: i + 1,
    }));

    setIsUpdating(true);

    try {
      // Batch 11: RTK Query mutation — auto-invalidates cache + triggers refetch
      await reorderContacts({ orders: payload }).unwrap();
    } catch (err) {
      toast.error('Failed to reorder contacts.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteContact = (contact: any) => {
    if (Platform.OS === 'web') {
      if (
        typeof window !== 'undefined' &&
        window.confirm(
          `Remove ${contact.name} from emergency contacts?`
        )
      ) {
        doDeleteContact(contact);
      }
    } else {
      // Phase 8: replaced destructive Alert.alert with ConfirmDialog primitive
      setPendingRemoveContact(contact);
      setRemoveDialogVisible(true);
    }
  };

  const doDeleteContact = async (contact: any) => {
    setIsUpdating(true);

    try {
      // Batch 11: RTK Query mutation — auto-invalidates ContactList tag + refetch
      await deleteContact(contact.id).unwrap();
    } catch (err: any) {
      toast.error(err.response?.data?.message ||
          'Failed to delete contact.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleConfirmRemove = () => {
    setRemoveDialogVisible(false);
    if (pendingRemoveContact) {
      doDeleteContact(pendingRemoveContact);
    }
    setPendingRemoveContact(null);
  };

  return (
    <View style={styles.container}>
      {/* ── Info Banner ── */}
      <View style={styles.infoBox}>
        <Ionicons
          name="information-circle-outline"
          size={20}
          color={colors.danger[500]}
          style={{
            marginRight: 8,
            marginTop: 2,
          }}
        />

        <Text style={styles.infoText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>
          Escalation Rules: In an emergency, your primary
          contact (Priority 1) is notified first. Secondary
          contacts are alerted at 30-second intervals if the
          previous one does not respond.
        </Text>
      </View>

      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle} accessibilityRole="header" allowFontScaling={true} maxFontSizeMultiplier={1.5}>
          Emergency Contacts
        </Text>

        <Text style={styles.headerSub} allowFontScaling={true} maxFontSizeMultiplier={1.5}>
          {contacts.length}/5 slots used
        </Text>
      </View>

      {isLoading && contacts.length === 0 ? (
        <ActivityIndicator
          size="large"
          color={colors.danger[500]}
          style={styles.loader}
        />
      ) : error ? (
        <View style={styles.centerContainer}>
          <Ionicons
            name="alert-circle-outline"
            size={36}
            color={colors.danger[400]}
            style={{ marginBottom: 8 }}
          />

          <Text style={styles.errorText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>
            {error ? String((error as any)?.data?.message || (error as any)?.error || error) : ''}
          </Text>

          <TouchableOpacity
            style={styles.retryBtn}
            onPress={refetch} accessibilityRole="button"
          >
            <Text style={styles.retryText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      ) : contacts.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons
            name="people-outline"
            size={48}
            color={darkColors.textTertiary}
            style={{ marginBottom: 12 }}
          />

          <Text style={styles.emptyText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>
            No emergency contacts added yet.
          </Text>

          <Text style={styles.emptySubtitle} allowFontScaling={true} maxFontSizeMultiplier={1.5}>
            Add up to 5 contacts (e.g. Spouse, Parents,
            Friends) to receive automatic crash alerts.
          </Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {isUpdating && (
            <View style={styles.updatingOverlay}>
              <ActivityIndicator
                color={colors.danger[500]}
                size="small"
              />

              <Text style={styles.updatingText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>
                Syncing priority list...
              </Text>
            </View>
          )}

          <FlatList
            data={contacts}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item, index }) => (
              <View
                style={[
                  styles.card,
                  item.priorityOrder === 1 &&
                    styles.primaryCard,
                ]}
              >
                {/* Priority Badge */}
                <View
                  style={[
                    styles.priorityIndicator,
                    item.priorityOrder === 1 &&
                      styles.primaryPriority,
                  ]}
                >
                  <Text style={styles.priorityNum} allowFontScaling={true} maxFontSizeMultiplier={1.5}>
                    {item.priorityOrder}
                  </Text>

                  <Text style={styles.priorityLabel} allowFontScaling={true} maxFontSizeMultiplier={1.5}>
                    {item.priorityOrder === 1
                      ? 'Primary'
                      : 'Sec'}
                  </Text>
                </View>

                {/* Contact Details */}
                <TouchableOpacity
                  style={styles.cardDetails}
                  onPress={() =>
                    navigation.navigate(
                      'AddEditContact',
                      { contact: item }
                    )
                  }
                  activeOpacity={0.7} accessibilityRole="button"
                >
                  <Text style={styles.contactName} allowFontScaling={true} maxFontSizeMultiplier={1.5}>
                    {item.name}
                  </Text>

                  <Text style={styles.contactMeta} allowFontScaling={true} maxFontSizeMultiplier={1.5}>
                    {item.relationship} •{' '}
                    {item.phoneNumber}
                  </Text>

                  {item.email ? (
                    <Text style={styles.contactEmail} allowFontScaling={true} maxFontSizeMultiplier={1.5}>
                      {item.email}
                    </Text>
                  ) : null}
                </TouchableOpacity>

                {/* Actions: Reorder & Quick Delete */}
                <View style={styles.cardActions}>
                  {/* Reorder Arrows */}
                  <View style={styles.reorderActions}>
                    <TouchableOpacity
                      style={[
                        styles.arrowBtn,
                        index === 0 &&
                          styles.disabledArrow,
                      ]}
                      onPress={() =>
                        handleMove(index, 'up')
                      }
                      disabled={
                        index === 0 || isUpdating
                      } accessibilityRole="button"
                     accessibilityLabel="Up" hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <Ionicons
                        name="chevron-up"
                        size={16}
                        color={
                          index === 0
                            ? darkColors.border
                            : darkColors.text
                        }
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.arrowBtn,
                        index ===
                          contacts.length - 1 &&
                          styles.disabledArrow,
                      ]}
                      onPress={() =>
                        handleMove(index, 'down')
                      }
                      disabled={
                        index ===
                          contacts.length - 1 ||
                        isUpdating
                      } accessibilityRole="button"
                     accessibilityLabel="Down" hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <Ionicons
                        name="chevron-down"
                        size={16}
                        color={
                          index ===
                          contacts.length - 1
                            ? darkColors.border
                            : darkColors.text
                        }
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Delete Contact */}
                  <TouchableOpacity
                    style={styles.cardDeleteBtn}
                    onPress={() =>
                      handleDeleteContact(item)
                    }
                    disabled={isUpdating}
                    activeOpacity={0.7}
                    hitSlop={{
                      top: 8,
                      bottom: 8,
                      left: 8,
                      right: 8,
                    }} accessibilityRole="button"
                  >
                    <Ionicons name="trash-outline" size={24} color={darkColors.text} />
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
          onPress={() =>
            navigation.navigate('AddEditContact')
          }
          activeOpacity={0.8} accessibilityRole="button"
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <Ionicons
              name="person-add-outline"
              size={18}
              color={darkColors.text}
            />

            <Text style={styles.addBtnText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>
              Add Emergency Contact ({contacts.length}/5)
            </Text>
          </View>
        </TouchableOpacity>
      ) : (
        <View style={styles.limitBanner}>
          <Ionicons
            name="lock-closed-outline"
            size={16}
            color={darkColors.textSecondary}
            style={{ marginRight: 6 }}
          />

          <Text style={styles.limitBannerText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>
            Emergency contact limit reached (maximum 5).
            Remove or edit existing contacts if needed.
          </Text>
        </View>
      )}
      {/* Phase 8: ConfirmDialog replaces destructive Alert.alert */}
      <ConfirmDialog
        visible={removeDialogVisible}
        title="Remove Emergency Contact"
        description={pendingRemoveContact ? `Are you sure you want to remove ${pendingRemoveContact.name} (${pendingRemoveContact.relationship || 'Contact'}) from your emergency contacts?` : undefined}
        confirmLabel="Remove"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleConfirmRemove}
        onCancel={() => { setRemoveDialogVisible(false); setPendingRemoveContact(null); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkColors.background,
  },

  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: tints.dangerLight,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: tints.dangerMedium,
  },

  infoEmoji: {
    fontSize: 16,
    marginRight: 8,
    marginTop: 1,
  },

  infoText: {
    color: colors.danger[300],
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: tints.whiteBorder,
  },

  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: darkColors.text,
  },

  headerSub: {
    fontSize: 13,
    color: darkColors.textTertiary,
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
    shadowOffset: {
      width: 0,
      height: 4,
    },
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
    textAlign: 'center',
  },

  emptySubtitle: {
    color: darkColors.textTertiary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },

  updatingOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tints.infoSubtle,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: tints.whiteBorder,
  },

  updatingText: {
    color: colors.info[500],
    fontSize: 12,
    marginLeft: 8,
    fontWeight: '600',
  },

  listContent: {
    padding: 16,
  },

  card: {
    backgroundColor: tints.glassCard,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: tints.whiteBorder,
    shadowColor: darkColors.background,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 3,
  },

  primaryCard: {
    borderColor: tints.dangerMedium,
    backgroundColor: tints.dangerSubtle,
  },

  priorityIndicator: {
    backgroundColor: tints.whiteBorder,
    borderRadius: 10,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },

  primaryPriority: {
    backgroundColor: tints.dangerMedium,
  },

  priorityNum: {
    fontSize: 18,
    fontWeight: '700',
    color: darkColors.text,
  },

  priorityLabel: {
    fontSize: 9,
    color: darkColors.textTertiary,
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
    color: darkColors.text,
  },

  contactMeta: {
    fontSize: 13,
    color: darkColors.textSecondary,
    marginTop: 4,
  },

  contactEmail: {
    fontSize: 12,
    color: darkColors.textTertiary,
    marginTop: 2,
  },

  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
  },

  cardDeleteBtn: {
    backgroundColor: tints.dangerErrorBg,
    borderWidth: 1,
    borderColor: tints.dangerErrorBorder,
    width: 34,
    height: 34,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },

  cardDeleteIcon: {
    fontSize: 15,
  },

  reorderActions: {
    flexDirection: 'column',
    justifyContent: 'center',
  },

  arrowBtn: {
    backgroundColor: tints.whiteBorder,
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
    color: darkColors.text,
    fontSize: 12,
  },

  addBtn: {
    backgroundColor: colors.danger[500],
    margin: 16,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: colors.danger[500],
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },

  addBtnText: {
    color: darkColors.text,
    fontSize: 15,
    fontWeight: '700',
  },

  limitBanner: {
    backgroundColor: tints.glassCard,
    margin: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tints.whiteBorder,
  },

  limitBannerText: {
    color: darkColors.textTertiary,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});

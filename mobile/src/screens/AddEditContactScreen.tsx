// ═══════════════════════════════════════════════════════════════
// ResQDrive v2 — ADD/EDIT CONTACT SCREEN (Modernized)
// All imports, logic, state, handlers preserved identically.
// Only JSX structure + StyleSheet updated: dark glassmorphism theme.
// ═══════════════════════════════════════════════════════════════
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { contactSchema, ContactInput } from '../schemas/validation';
import {
  useCreateContactMutation,
  useUpdateContactMutation,
  useDeleteContactMutation,
} from '../store/api/contactsApi';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToast } from '../components/ui/Toast';
import { ConfirmDialog } from '../components/ui';
import { colors, darkColors, tints } from '../theme/tokens';

const RELATIONSHIPS = ['Spouse', 'Parent', 'Sibling', 'Friend', 'Other'];

const RELATIONSHIP_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Spouse: 'heart-outline',
  Parent: 'people-outline',
  Sibling: 'people-circle-outline',
  Friend: 'person-outline',
  Other: 'options-outline',
};

export default function AddEditContactScreen({ route, navigation }: any) {
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const contact = route.params?.contact; // If defined, we are editing
  const isEditing = !!contact;

  // Batch 11: Migrated to RTK Query mutations — auto-invalidates 'ContactList' tag.
  // No manual dispatch of slice actions needed; tag invalidation triggers refetch
  // on any screen using useGetContactsQuery (e.g. EmergencyContactsScreen).
  const [createContact] = useCreateContactMutation();
  const [updateContact] = useUpdateContactMutation();
  const [deleteContact] = useDeleteContactMutation();

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [removeDialogVisible, setRemoveDialogVisible] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: contact?.name || '',
      phoneNumber: contact?.phoneNumber || '',
      email: contact?.email || '',
      relationship: contact?.relationship || 'Spouse',
    },
  });

  const selectedRelationship = watch('relationship');

  const onSubmit = async (data: ContactInput) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      if (isEditing) {
        // Batch 11: RTK Query mutation — invalidates 'Contact' + 'ContactList' tags.
        await updateContact({ id: contact.id, body: data }).unwrap();
      } else {
        await createContact(data).unwrap();
      }
      navigation.goBack();
    } catch (err: any) {
      setErrorMsg(err.data?.message || 'Failed to save emergency contact.');
    } finally {
      setIsLoading(false);
    }
  };

const doDelete = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      // Batch 11: RTK Query mutation — invalidates 'ContactList' tag.
      await deleteContact(contact.id).unwrap();
      navigation.goBack();
    } catch (err: any) {
      setErrorMsg(err.data?.message || 'Failed to delete contact.');
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(`Are you sure you want to remove ${contact.name}?`)) {
        doDelete();
      }
    } else {
      // Phase 8: replaced destructive Alert.alert with ConfirmDialog primitive
      setRemoveDialogVisible(true);
    }
  };

  const handleConfirmRemove = () => {
    setRemoveDialogVisible(false);
    doDelete();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={[styles.scrollContainer, { paddingTop: insets.top + 16 }]} keyboardShouldPersistTaps="handled">
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name={isEditing ? 'pencil-outline' : 'person-add-outline'} size={26} color={colors.danger[500]} />
            <Text style={styles.title} accessibilityRole="header" allowFontScaling={true} maxFontSizeMultiplier={1.5}>
              {isEditing ? 'Edit Contact' : 'Add Contact'}
            </Text>
          </View>
          <Text style={styles.subtitle} allowFontScaling={true} maxFontSizeMultiplier={1.5}>
            {isEditing ? 'Update emergency contact parameters' : 'Register a contact for crash alerts notification'}
          </Text>
        </View>

        {/* ── Error ── */}
        {errorMsg && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={18} color={colors.danger[300]} style={{ marginRight: 8 }} />
            <Text style={styles.errorText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>{errorMsg}</Text>
          </View>
        )}

        <View style={styles.form}>
          <Text style={styles.label} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Contact Name</Text>
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.name && styles.inputError]}
                placeholder="e.g. John Doe"
                placeholderTextColor={darkColors.textTertiary}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                allowFontScaling={true}
                maxFontSizeMultiplier={1.5}
              />
            )}
          />
          {errors.name && <Text style={styles.errorHelper} allowFontScaling={true} maxFontSizeMultiplier={1.5}>{errors.name.message}</Text>}

          <Text style={styles.label} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Phone Number</Text>
          <Controller
            control={control}
            name="phoneNumber"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.phoneNumber && styles.inputError]}
                placeholder="e.g. +923001234567"
                placeholderTextColor={darkColors.textTertiary}
                keyboardType="phone-pad"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                allowFontScaling={true}
                maxFontSizeMultiplier={1.5}
              />
            )}
          />
          {errors.phoneNumber && <Text style={styles.errorHelper} allowFontScaling={true} maxFontSizeMultiplier={1.5}>{errors.phoneNumber.message}</Text>}

          <Text style={styles.label} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Email Address</Text>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                placeholder="e.g. john@example.com"
                placeholderTextColor={darkColors.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                allowFontScaling={true}
                maxFontSizeMultiplier={1.5}
              />
            )}
          />
          {errors.email && <Text style={styles.errorHelper} allowFontScaling={true} maxFontSizeMultiplier={1.5}>{errors.email.message}</Text>}

          {/* ── Relationship Tags ── */}
          <Text style={styles.label} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Relationship</Text>
          <View style={styles.relationshipTags}>
            {RELATIONSHIPS.map((rel) => (
              <TouchableOpacity
                key={rel}
                style={[
                  styles.tag,
                  selectedRelationship === rel && styles.tagSelected,
                ]}
                onPress={() => setValue('relationship', rel)}
                activeOpacity={0.7} accessibilityRole="button"
              >
                <Ionicons
                  name={RELATIONSHIP_ICONS[rel]}
                  size={16}
                  color={selectedRelationship === rel ? darkColors.text : darkColors.textTertiary}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.tagText,
                    selectedRelationship === rel && styles.tagTextSelected,
                  ]}
                 allowFontScaling={true} maxFontSizeMultiplier={1.5}>
                  {rel}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Save Button ── */}
          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSubmit(onSubmit)}
            disabled={isLoading} accessibilityRole="button"
          >
            {isLoading ? (
              <ActivityIndicator color={darkColors.text} />
            ) : (
              <Text style={styles.saveBtnText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>
                {isEditing ? 'Save Changes' : 'Add Contact'}
              </Text>
            )}
          </TouchableOpacity>

          {/* ── Delete Button ── */}
          {isEditing && (
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={handleDelete}
              disabled={isLoading} accessibilityRole="button"
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Ionicons name="trash-outline" size={18} color={colors.danger[400]} />
                <Text style={styles.deleteBtnText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Remove Contact</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Phase 8: ConfirmDialog replaces destructive Alert.alert */}
      <ConfirmDialog
        visible={removeDialogVisible}
        title="Remove Emergency Contact"
        description={contact ? `Are you sure you want to remove ${contact.name} from your emergency contacts?` : undefined}
        confirmLabel="Remove"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleConfirmRemove}
        onCancel={() => setRemoveDialogVisible(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkColors.background,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 60,
  },
  header: {
    marginBottom: 28,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: darkColors.text,
  },
  subtitle: {
    fontSize: 14,
    color: darkColors.textSecondary,
    marginTop: 6,
    lineHeight: 20,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tints.dangerErrorBg,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tints.dangerErrorBorder,
    marginBottom: 20,
  },
  errorEmoji: {
    fontSize: 16,
    marginRight: 8,
  },
  errorText: {
    color: colors.danger[300],
    fontSize: 14,
    textAlign: 'center',
    flex: 1,
  },
  form: {
    width: '100%',
  },
  label: {
    fontSize: 13,
    color: darkColors.textSecondary,
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    backgroundColor: tints.overlayStrong,
    color: darkColors.text,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 10,
    fontSize: 15,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: tints.whiteBorder,
  },
  inputError: {
    borderColor: colors.danger[500],
  },
  errorHelper: {
    color: colors.danger[300],
    fontSize: 12,
    marginTop: -10,
    marginBottom: 16,
  },
  relationshipTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
    marginTop: 4,
  },
  tag: {
    backgroundColor: tints.glassCard,
    borderWidth: 1,
    borderColor: tints.whiteBorder,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  tagSelected: {
    backgroundColor: tints.dangerMedium,
    borderColor: tints.dangerMedium,
  },
  tagEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  tagText: {
    color: darkColors.textTertiary,
    fontSize: 14,
    fontWeight: '600',
  },
  tagTextSelected: {
    color: darkColors.text,
  },
  saveBtn: {
    backgroundColor: colors.danger[500],
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: colors.danger[500],
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  saveBtnText: {
    color: darkColors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  deleteBtn: {
    backgroundColor: tints.dangerErrorBg,
    borderWidth: 1,
    borderColor: tints.dangerErrorBorder,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  deleteBtnText: {
    color: colors.danger[400],
    fontSize: 14,
    fontWeight: '700',
  },
});
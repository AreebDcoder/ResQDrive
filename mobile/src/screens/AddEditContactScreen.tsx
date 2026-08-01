// ═══════════════════════════════════════════════════════════════
// ResQDrive v2 — ADD/EDIT CONTACT SCREEN (Modernized)
// All imports, logic, state, handlers preserved identically.
// Only JSX structure + StyleSheet updated: dark glassmorphism theme.
// ═══════════════════════════════════════════════════════════════
import React, { useState } from 'react';
import {
  ActivityIndicator,
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
import { useDispatch } from 'react-redux';
import { contactSchema, ContactInput } from '../schemas/validation';
import { addContactSuccess, updateContactSuccess, deleteContactSuccess } from '../store/slices/contactsSlice';
import api from '../api/axios';

const RELATIONSHIPS = ['Spouse', 'Parent', 'Sibling', 'Friend', 'Other'];

const RELATIONSHIP_EMOJIS: Record<string, string> = {
  Spouse: '💑',
  Parent: '👨‍👩‍👧',
  Sibling: '👫',
  Friend: '🤝',
  Other: '👤',
};

export default function AddEditContactScreen({ route, navigation }: any) {
  const dispatch = useDispatch();
  const contact = route.params?.contact; // If defined, we are editing
  const isEditing = !!contact;

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
        const response = await api.patch(`/emergency-contacts/${contact.id}`, data);
        dispatch(updateContactSuccess(response.data));
      } else {
        const response = await api.post('/emergency-contacts', data);
        dispatch(addContactSuccess(response.data));
      }
      navigation.goBack();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to save emergency contact.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to remove this emergency contact?')) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await api.delete(`/emergency-contacts/${contact.id}`);
      dispatch(deleteContactSuccess({ id: contact.id }));
      navigation.goBack();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to delete contact.');
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        {/* ── Header ── */}
        <View style={styles.header}>
          <Text style={styles.title}>
            {isEditing ? '✏️ Edit Contact' : '➕ Add Contact'}
          </Text>
          <Text style={styles.subtitle}>
            {isEditing ? 'Update emergency contact parameters' : 'Register a contact for crash alerts notification'}
          </Text>
        </View>

        {/* ── Error ── */}
        {errorMsg && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorEmoji}>⚠️</Text>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        <View style={styles.form}>
          <Text style={styles.label}>🏷️ Contact Name</Text>
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.name && styles.inputError]}
                placeholder="e.g. John Doe"
                placeholderTextColor="#6B6B80"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
          {errors.name && <Text style={styles.errorHelper}>{errors.name.message}</Text>}

          <Text style={styles.label}>📱 Phone Number</Text>
          <Controller
            control={control}
            name="phoneNumber"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.phoneNumber && styles.inputError]}
                placeholder="e.g. +923001234567"
                placeholderTextColor="#6B6B80"
                keyboardType="phone-pad"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
          {errors.phoneNumber && <Text style={styles.errorHelper}>{errors.phoneNumber.message}</Text>}

          <Text style={styles.label}>📧 Email Address</Text>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                placeholder="e.g. john@example.com"
                placeholderTextColor="#6B6B80"
                keyboardType="email-address"
                autoCapitalize="none"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
          {errors.email && <Text style={styles.errorHelper}>{errors.email.message}</Text>}

          {/* ── Relationship Tags ── */}
          <Text style={styles.label}>💔 Relationship</Text>
          <View style={styles.relationshipTags}>
            {RELATIONSHIPS.map((rel) => (
              <TouchableOpacity
                key={rel}
                style={[
                  styles.tag,
                  selectedRelationship === rel && styles.tagSelected,
                ]}
                onPress={() => setValue('relationship', rel)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.tagEmoji,
                  ]}
                >
                  {RELATIONSHIP_EMOJIS[rel]}
                </Text>
                <Text
                  style={[
                    styles.tagText,
                    selectedRelationship === rel && styles.tagTextSelected,
                  ]}
                >
                  {rel}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Save Button ── */}
          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSubmit(onSubmit)}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>
                {isEditing ? '💾 Save Changes' : '➕ Add Contact'}
              </Text>
            )}
          </TouchableOpacity>

          {/* ── Delete Button ── */}
          {isEditing && (
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={handleDelete}
              disabled={isLoading}
            >
              <Text style={styles.deleteBtnText}>🗑️ Remove Contact</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
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
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 14,
    color: '#A0A0B8',
    marginTop: 6,
    lineHeight: 20,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 23, 68, 0.12)',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 23, 68, 0.3)',
    marginBottom: 20,
  },
  errorEmoji: {
    fontSize: 16,
    marginRight: 8,
  },
  errorText: {
    color: '#FF8A80',
    fontSize: 14,
    textAlign: 'center',
    flex: 1,
  },
  form: {
    width: '100%',
  },
  label: {
    fontSize: 13,
    color: '#A0A0B8',
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    backgroundColor: 'rgba(10, 10, 15, 0.6)',
    color: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 10,
    fontSize: 15,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  inputError: {
    borderColor: '#E53935',
  },
  errorHelper: {
    color: '#FF8A80',
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
    backgroundColor: 'rgba(28, 28, 46, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  tagSelected: {
    backgroundColor: 'rgba(229, 57, 53, 0.2)',
    borderColor: 'rgba(229, 57, 53, 0.5)',
  },
  tagEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  tagText: {
    color: '#6B6B80',
    fontSize: 14,
    fontWeight: '600',
  },
  tagTextSelected: {
    color: '#FFFFFF',
  },
  saveBtn: {
    backgroundColor: '#E53935',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  deleteBtn: {
    backgroundColor: 'rgba(255, 23, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 82, 82, 0.3)',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  deleteBtnText: {
    color: '#FF5252',
    fontSize: 14,
    fontWeight: '700',
  },
});
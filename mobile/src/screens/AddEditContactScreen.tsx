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
        <View style={styles.header}>
          <Text style={styles.title}>{isEditing ? 'Edit Contact' : 'Add Contact'}</Text>
          <Text style={styles.subtitle}>
            {isEditing ? 'Update emergency contact parameters' : 'Register a contact for crash alerts notification'}
          </Text>
        </View>

        {errorMsg && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        <View style={styles.form}>
          <Text style={styles.label}>Contact Name</Text>
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.name && styles.inputError]}
                placeholder="e.g. John Doe"
                placeholderTextColor="#666"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
          {errors.name && <Text style={styles.errorHelper}>{errors.name.message}</Text>}

          <Text style={styles.label}>Phone Number</Text>
          <Controller
            control={control}
            name="phoneNumber"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.phoneNumber && styles.inputError]}
                placeholder="e.g. +923001234567"
                placeholderTextColor="#666"
                keyboardType="phone-pad"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
          {errors.phoneNumber && <Text style={styles.errorHelper}>{errors.phoneNumber.message}</Text>}

          <Text style={styles.label}>Email Address</Text>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                placeholder="e.g. john@example.com"
                placeholderTextColor="#666"
                keyboardType="email-address"
                autoCapitalize="none"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
          {errors.email && <Text style={styles.errorHelper}>{errors.email.message}</Text>}

          <Text style={styles.label}>Relationship</Text>
          <View style={styles.relationshipTags}>
            {RELATIONSHIPS.map((rel) => (
              <TouchableOpacity
                key={rel}
                style={[
                  styles.tag,
                  selectedRelationship === rel && styles.tagSelected,
                ]}
                onPress={() => setValue('relationship', rel)}
              >
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

          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSubmit(onSubmit)}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>{isEditing ? 'Save Changes' : 'Add Contact'}</Text>
            )}
          </TouchableOpacity>

          {isEditing && (
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={handleDelete}
              disabled={isLoading}
            >
              <Text style={styles.deleteBtnText}>Remove Contact</Text>
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
    backgroundColor: '#121212',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 28,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 14,
    color: '#888888',
    marginTop: 6,
  },
  errorContainer: {
    backgroundColor: '#3a1313',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d32f2f',
    marginBottom: 20,
  },
  errorText: {
    color: '#ff8a80',
    fontSize: 14,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  label: {
    fontSize: 14,
    color: '#cccccc',
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#1e1e1e',
    color: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2e2e2e',
  },
  inputError: {
    borderColor: '#d32f2f',
  },
  errorHelper: {
    color: '#ff8a80',
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
    backgroundColor: '#1e1e1e',
    borderWidth: 1,
    borderColor: '#2e2e2e',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    marginBottom: 10,
  },
  tagSelected: {
    backgroundColor: '#d32f2f',
    borderColor: '#d32f2f',
  },
  tagText: {
    color: '#888888',
    fontSize: 14,
    fontWeight: '600',
  },
  tagTextSelected: {
    color: '#ffffff',
  },
  saveBtn: {
    backgroundColor: '#d32f2f',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#d32f2f',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  deleteBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#ff5252',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  deleteBtnText: {
    color: '#ff5252',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

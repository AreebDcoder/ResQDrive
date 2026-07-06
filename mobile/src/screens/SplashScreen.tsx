import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useDispatch } from 'react-redux';
import { loginSuccess, logoutAction, setLoading } from '../store/slices/authSlice';
import api from '../api/axios';
import { getItemAsync, setItemAsync, deleteItemAsync } from '../utils/secureStorage';

export default function SplashScreen() {
  const dispatch = useDispatch();

  useEffect(() => {
    const checkSession = async () => {
      try {
        const refreshToken = await getItemAsync('refreshToken');
        if (!refreshToken) {
          dispatch(logoutAction());
          return;
        }

        const response = await api.post('/auth/refresh', {}, {
          headers: {
            Authorization: `Bearer ${refreshToken}`,
          },
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data;
        await setItemAsync('refreshToken', newRefreshToken);

        const profileResponse = await api.get('/users/me', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        dispatch(loginSuccess({ accessToken, user: profileResponse.data }));
      } catch (error) {
        await deleteItemAsync('refreshToken');
        dispatch(logoutAction());
      } finally {
        dispatch(setLoading(false));
      }
    };

    checkSession();
  }, [dispatch]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ResQ<Text style={styles.highlight}>Drive</Text></Text>
      <Text style={styles.subtitle}>Emergency Response & Accident Detection</Text>
      <ActivityIndicator size="large" color="#d32f2f" style={styles.loader} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 1.5,
  },
  highlight: {
    color: '#d32f2f',
  },
  subtitle: {
    fontSize: 14,
    color: '#888888',
    marginTop: 10,
    textAlign: 'center',
  },
  loader: {
    marginTop: 40,
  },
});
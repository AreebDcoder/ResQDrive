import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useDispatch } from 'react-redux';
import { loginSuccess, logoutAction, setLoading } from '../store/slices/authSlice';
import api from '../api/axios';
import { getItemAsync, setItemAsync, deleteItemAsync } from '../utils/secureStorage';

function AnimatedDot({ index }: { index: number }) {
  const offset = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(offset, {
          toValue: -10,
          duration: 400,
          delay: index * 150,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(offset, {
          toValue: 0,
          duration: 400,
          delay: index * 150,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  return (
    <Animated.View
      style={[styles.dot, { transform: [{ translateY: offset }] }]}
    />
  );
}

export default function SplashScreen() {
  const dispatch = useDispatch();

  // Animation values
  const logoScale = useRef(new Animated.Value(0.6)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(20)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0.7)).current;
  const ringOpacity = useRef(new Animated.Value(0.6)).current;

  // Entrance animation sequence
  useEffect(() => {
    Animated.sequence([
      // Ring pulses in
      Animated.parallel([
        Animated.spring(ringScale, {
          toValue: 1.0,
          friction: 4,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(ringOpacity, {
          toValue: 0.8,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
      // Logo scales in
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 4,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
      // Title slides up
      Animated.parallel([
        Animated.timing(titleTranslateY, {
          toValue: 0,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
      // Subtitle fades in
      Animated.timing(subtitleOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Ring pulse loop
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(ringScale, {
          toValue: 1.15,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(ringScale, {
          toValue: 0.95,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(ringOpacity, {
          toValue: 0.2,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(ringOpacity, {
          toValue: 0.6,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  // Auth session check (unchanged logic)
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
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0F" />

      {/* Background ambient glow */}
      <View style={styles.bgGlow1} />
      <View style={styles.bgGlow2} />

      {/* Pulsing ring */}
      <Animated.View
        style={[
          styles.pulseRing,
          {
            transform: [{ scale: ringScale }],
            opacity: ringOpacity,
          },
        ]}
      />

      {/* Logo container */}
      <Animated.View
        style={[
          styles.logoBox,
          {
            transform: [{ scale: logoScale }],
            opacity: logoOpacity,
          },
        ]}
      >
        <View style={styles.logoInner}>
          <Text style={styles.logoIcon}>🛡️</Text>
        </View>
      </Animated.View>

      {/* Brand title */}
      <Animated.View
        style={[
          styles.titleContainer,
          {
            transform: [{ translateY: titleTranslateY }],
            opacity: titleOpacity,
          },
        ]}
      >
        <Text style={styles.title}>
          ResQ<Text style={styles.highlight}>Drive</Text>
        </Text>
      </Animated.View>

      {/* Tagline */}
      <Animated.Text style={[styles.subtitle, { opacity: subtitleOpacity }]}>
        Emergency Response & Accident Detection
      </Animated.Text>

      {/* Loading dots */}
      <View style={styles.dotsRow}>
        {[0, 1, 2].map((i) => (
          <AnimatedDot key={i} index={i} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bgGlow1: {
    position: 'absolute',
    top: -80,
    left: '12%',
    right: '12%',
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(229, 57, 53, 0.08)',
  },
  bgGlow2: {
    position: 'absolute',
    bottom: 120,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(41, 121, 255, 0.05)',
  },
  pulseRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: '#E53935',
  },
  logoBox: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: 'rgba(229, 57, 53, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(229, 57, 53, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
  logoInner: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: 'rgba(229, 57, 53, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoIcon: {
    fontSize: 32,
  },
  titleContainer: {
    marginBottom: 8,
  },
  title: {
    fontSize: 40,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1.5,
  },
  highlight: {
    color: '#E53935',
  },
  subtitle: {
    fontSize: 14,
    color: '#A0A0B8',
    marginTop: 6,
    textAlign: 'center',
    paddingHorizontal: 40,
    letterSpacing: 0.3,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 48,
    gap: 10,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#E53935',
  },
});
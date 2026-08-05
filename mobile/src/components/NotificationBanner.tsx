import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Animated,
  Dimensions,
} from 'react-native';
import * as Notifications from 'expo-notifications';

export default function NotificationBanner() {
  const [notification, setNotification] = useState<{
    title: string;
    body: string;
    mapsLink?: string;
  } | null>(null);

  const slideAnim = React.useRef(new Animated.Value(-150)).current;

  useEffect(() => {
    // 1. Listen for incoming foreground push notifications
    const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
      console.log('🔔 Notification received in Banner:', notification);
      const title = notification.request.content.title || '🚨 Emergency Alert';
      const body = notification.request.content.body || 'An emergency alert was dispatched.';
      const mapsLink = notification.request.content.data?.mapsLink as string;

      setNotification({ title, body, mapsLink });

      // Slide banner down into view
      Animated.spring(slideAnim, {
        toValue: 50, // Top margin
        useNativeDriver: true,
        speed: 12,
        bounciness: 6,
      }).start();
    });

    // 2. Listen for notification click responses
    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const mapsLink = response.notification.request.content.data?.mapsLink as string;
      if (mapsLink) {
        Linking.openURL(mapsLink);
      }
    });

    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  }, []);

  const hideBanner = () => {
    Animated.timing(slideAnim, {
      toValue: -150,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setNotification(null));
  };

  const handleOpenMap = () => {
    if (notification?.mapsLink) {
      Linking.openURL(notification.mapsLink);
    }
    hideBanner();
  };

  if (!notification) return null;

  return (
    <Animated.View
      style={[
        styles.bannerContainer,
        { transform: [{ translateY: slideAnim }] },
      ]}
    >
      <View style={styles.contentRow}>
        <Text style={styles.icon}>🚨</Text>
        <View style={styles.textColumn}>
          <Text style={styles.title}>{notification.title}</Text>
          <Text style={styles.body} numberOfLines={2}>
            {notification.body}
          </Text>
        </View>
        <TouchableOpacity style={styles.closeBtn} onPress={hideBanner}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.btnRow}>
        {notification.mapsLink && (
          <TouchableOpacity style={styles.actionBtn} onPress={handleOpenMap}>
            <Text style={styles.actionBtnText}>📍 View Location Map</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.dismissBtn} onPress={hideBanner}>
          <Text style={styles.dismissBtnText}>Dismiss</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  bannerContainer: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    zIndex: 999999, // Ensure it stays above all screens & modals
    backgroundColor: '#1E1B2E',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#FF1744',
    shadowColor: '#FF1744',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 25,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  icon: {
    fontSize: 28,
    marginRight: 12,
  },
  textColumn: {
    flex: 1,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  body: {
    color: '#D0D0E0',
    fontSize: 13,
    lineHeight: 18,
  },
  closeBtn: {
    padding: 4,
    marginLeft: 8,
  },
  closeBtnText: {
    color: '#A0A0B8',
    fontSize: 18,
    fontWeight: 'bold',
  },
  btnRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: '#FF1744',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  dismissBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  dismissBtnText: {
    color: '#A0A0B8',
    fontSize: 13,
    fontWeight: '600',
  },
});

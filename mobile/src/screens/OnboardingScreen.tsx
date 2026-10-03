/**
 * OnboardingScreen — 3-screen carousel for first-time users.
 *
 * Explains what ResQDrive does + permissions primer before the system prompts.
 * Shown only on first launch (controlled by AsyncStorage 'hasSeenOnboarding').
 *
 * Slides:
 *   1. "ResQDrive detects crashes automatically" — YAMNet + sensor fusion
 *   2. "Your emergency contacts are notified instantly" — multi-channel dispatch
 *   3. "Permissions primer" — Location, Microphone, Bluetooth, SMS explanation
 */

import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, darkColors, tints, spacing, radius, typography } from '../theme/tokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

interface Slide {
  icon: string;
  iconColor: string;
  iconBg: string;
  title: string;
  description: string;
}

const slides: Slide[] = [
  {
    icon: 'pulse',
    iconColor: colors.danger[500],
    iconBg: tints.dangerSubtle,
    title: 'Crash Detection',
    description: 'ResQDrive uses your phone\'s microphone (YAMNet AI) and motion sensors (accelerometer + gyroscope) to automatically detect crashes — even when the app is in the background.',
  },
  {
    icon: 'people',
    iconColor: colors.success[500],
    iconBg: tints.successSubtle,
    title: 'Instant Emergency Alerts',
    description: 'When a crash is detected, ResQDrive instantly notifies your emergency contacts via WhatsApp, Email, Push notifications, and SMS — with your live GPS location.',
  },
  {
    icon: 'shield-checkmark',
    iconColor: colors.info[500],
    iconBg: tints.infoSubtle,
    title: 'Permissions',
    description: 'ResQDrive needs:\n\n• Location — to share your GPS in emergencies\n• Microphone — to detect crash sounds\n• Bluetooth — to connect the ESP32 crash sensor\n• SMS — to send alerts when offline\n\nTap "Get Started" to grant these permissions and start protecting yourself.',
  },
];

export default function OnboardingScreen({ onComplete }: { onComplete: () => void }) {
  const scrollRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const insets = useSafeAreaInsets();

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / width);
    setCurrentIndex(index);
  };

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      scrollRef.current?.scrollTo({ x: (currentIndex + 1) * width, animated: true });
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = async () => {
    try {
      await AsyncStorage.setItem('hasSeenOnboarding', 'true');
    } catch (e) {}
    onComplete();
  };

  return (
    <View style={styles.container}>
      {/* Skip button */}
      <TouchableOpacity
        style={[styles.skipBtn, { top: insets.top + spacing.md }]}
        onPress={handleSkip}
        accessibilityRole="button"
        accessibilityLabel="Skip onboarding"
      >
        <Text style={styles.skipText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Skip</Text>
      </TouchableOpacity>

      {/* Slides */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
      >
        {slides.map((slide, index) => (
          <View key={index} style={styles.slide}>
            <View style={[styles.iconCircle, { backgroundColor: slide.iconBg }]}>
              <Ionicons name={slide.icon as any} size={64} color={slide.iconColor} />
            </View>
            <Text style={styles.slideTitle} allowFontScaling={true} maxFontSizeMultiplier={1.5}>
              {slide.title}
            </Text>
            <Text style={styles.slideDescription} allowFontScaling={true} maxFontSizeMultiplier={1.5}>
              {slide.description}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* Dots */}
      <View style={styles.dotsRow}>
        {slides.map((_, index) => (
          <View
            key={index}
            style={[styles.dot, index === currentIndex ? styles.dotActive : styles.dotInactive]}
          />
        ))}
      </View>

      {/* CTA button */}
      <TouchableOpacity
        style={[styles.ctaBtn, { marginBottom: insets.bottom + spacing.lg }]}
        onPress={handleNext}
        accessibilityRole="button"
        accessibilityLabel={currentIndex === slides.length - 1 ? 'Get Started' : 'Next'}
      >
        <Text style={styles.ctaText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>
          {currentIndex === slides.length - 1 ? 'Get Started' : 'Next'}
        </Text>
        {currentIndex < slides.length - 1 && (
          <Ionicons name="arrow-forward" size={20} color={darkColors.text} style={{ marginLeft: spacing.xs }} />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: darkColors.background },
  skipBtn: { position: 'absolute', right: spacing.lg, zIndex: 10 },
  skipText: { color: darkColors.textTertiary, fontSize: typography.fontSize.md },
  slide: { width, flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing['2xl'] },
  iconCircle: { width: 120, height: 120, borderRadius: 60, justifyContent: 'center', alignItems: 'center', marginBottom: spacing['3xl'] },
  slideTitle: { fontSize: typography.fontSize['3xl'], fontWeight: typography.fontWeight.bold, color: darkColors.text, textAlign: 'center', marginBottom: spacing.lg },
  slideDescription: { fontSize: typography.fontSize.md, color: darkColors.textSecondary, textAlign: 'center', lineHeight: 24, maxWidth: 320 },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xs, marginBottom: spacing.xl },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotActive: { backgroundColor: colors.danger[500], width: 24 },
  dotInactive: { backgroundColor: darkColors.textTertiary },
  ctaBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.danger[500], marginHorizontal: spacing['2xl'], paddingVertical: spacing.md, borderRadius: radius.md, minHeight: 52 },
  ctaText: { color: darkColors.text, fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold },
});

import React, { useEffect, useState, useRef } from 'react';
import {
  AccessibilityInfo,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Animated,
  Linking,
} from 'react-native';
import * as Location from 'expo-location';
import api from '../api/axios';
import { VoiceCommandService } from '../services/voiceCommandService';
import { TtsService } from '../services/ttsService';
import { useToast } from '../components/ui/Toast';
import { ConfirmDialog } from '../components/ui';
import { colors, darkColors, tints } from '../theme/tokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function VoiceCommandDemoScreen() {
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState('Idle');
  const [engine, setEngine] = useState('Mock Simulator');
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [callbackFlash, setCallbackFlash] = useState<string | null>(null);
  const [locationText, setLocationText] = useState('Sector G-11/3, Islamabad');
  const [hospitalText, setHospitalText] = useState('Shifa International Hospital');
  const [etaValue, setEtaValue] = useState('8');

  // Phase 8: ConfirmDialog state for cautionary SOS call confirm (triggered by voice callback)
  const [callDialogVisible, setCallDialogVisible] = useState(false);

  // Batch 7 Phase 4: Respect Reduce Motion accessibility setting
  const [reduceMotion, setReduceMotion] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    // Skip decorative entrance animation when Reduce Motion is enabled
    if (reduceMotion) {
      fadeAnim.setValue(1);
      slideAnim.setValue(0);
      return;
    }
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim, reduceMotion]);

  useEffect(() => {
    VoiceCommandService.subscribeToCallbacks(
      () => {
        triggerCallbackFlash('Abort Callback Fired (onCancelCountdown) ❌');
        Alert.alert('System Action', 'onCancelCountdown() successfully triggered via voice! Aborting accident warning.');
      },
      async () => {
        triggerCallbackFlash('SOS Callback Fired (onTriggerSOS)');
        // Phase 8: replaced destructive Alert.alert with ConfirmDialog primitive.
        // The actual call logic now lives in handleConfirmCall (extracted from onPress).
        setCallDialogVisible(true);
      },
      (text, isFinal) => {
        setTranscript(text);
      },
      (newStatus) => {
        setStatus(newStatus);
      },
      (newEngine) => {
        setEngine(newEngine);
      }
    );

    return () => {
      VoiceCommandService.stopListening();
    };
  }, []);

  const triggerCallbackFlash = (msg: string) => {
    setCallbackFlash(msg);
    setTimeout(() => {
      setCallbackFlash(null);
    }, 4000);
  };

  const handleToggleListening = () => {
    if (isListening) {
      VoiceCommandService.stopListening();
      setIsListening(false);
    } else {
      VoiceCommandService.startListening();
      setIsListening(true);
    }
  };

  const handleSimulatePhrase = (phrase: string) => {
    setTranscript(phrase);
    VoiceCommandService.simulateSpeechInput(phrase);
  };

  const handleTTSAnnouncement = async () => {
    const eta = parseInt(etaValue, 10) || 10;
    await TtsService.announceAccidentInfo(locationText, hospitalText, eta);
  };

  // Phase 8: extracted from destructive Alert.alert onPress — performs the actual SOS call
  const handleConfirmCall = async () => {
    setCallDialogVisible(false);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Linking.openURL('tel:1122');
        return;
      }
      const location = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        new Promise<any>((resolve) => setTimeout(() => resolve(null), 3000))
      ]);
      const latitude = location?.coords?.latitude ?? 33.6844;
      const longitude = location?.coords?.longitude ?? 73.0479;

      const response = await api.get('/emergency-sos/numbers', {
        params: { lat: latitude, lng: longitude },
      });

      const regional = response.data.regionalNumbers || [];
      const custom = response.data.customNumbers || [];
      const target = regional[0] || custom[0];

      if (target) {
        await api.post('/emergency-sos/log-call', {
          serviceName: target.serviceName || target.label || 'Rescue',
          autoDialed: false,
        });
        Linking.openURL(`tel:${target.phoneNumber}`);
      } else {
        Linking.openURL('tel:1122');
      }
    } catch (err) {
      Linking.openURL('tel:1122');
    }
  };

  return (
    <View style={styles.outer}>
      <View style={StyleSheet.absoluteFillObject}>
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: darkColors.background }]} />
        <View style={[StyleSheet.absoluteFillObject, styles.gradTop]} />
        <View style={[StyleSheet.absoluteFillObject, styles.gradBottom]} />
      </View>

      <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16 }]}>
          <View style={styles.header}>
            <Text style={styles.title} accessibilityRole="header" allowFontScaling={true} maxFontSizeMultiplier={1.5}>Voice Command Controls</Text>
            <Text style={styles.subtitle} allowFontScaling={true} maxFontSizeMultiplier={1.5}>
              Hands-free continuous recognition monitoring. Activates during emergency count-downs.
            </Text>
          </View>

          {callbackFlash && (
            <View style={styles.flashBanner}>
              <Text style={styles.flashBannerText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>{callbackFlash}</Text>
            </View>
          )}

          <View style={styles.card}>
            <Text style={styles.cardLabel} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Real-Time Telemetry Console</Text>

            <View style={styles.row}>
              <Text style={styles.rowTitle} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Listening Status:</Text>
              <View style={[styles.dot, isListening ? styles.activeDot : styles.idleDot]} />
              <Text style={[styles.rowValue, isListening ? styles.activeText : styles.idleText]} allowFontScaling={true} maxFontSizeMultiplier={1.5}>
                {status}
              </Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.rowTitle} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Recognition Engine:</Text>
              <Text style={styles.rowValue} allowFontScaling={true} maxFontSizeMultiplier={1.5}>{engine}</Text>
            </View>

            <View style={styles.transcriptBox}>
              <Text style={styles.transcriptLabel} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Rolling Speech Transcript:</Text>
              <Text style={styles.transcriptText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>
                {transcript ? `"${transcript}"` : 'No speech recognized. Say something...'}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.actionBtn, isListening ? styles.stopBtn : styles.startBtn]}
              onPress={handleToggleListening} accessibilityRole="button"
            >
              <Text style={styles.actionBtnText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>
                {isListening ? 'Stop Speech Recognition' : 'Start Speech Recognition'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardLabel} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Speech Command Simulator</Text>
            <Text style={styles.desc} allowFontScaling={true} maxFontSizeMultiplier={1.5}>
              If testing in Expo Go, tap phrases below to simulate raw microphone input feed to the voice parser:
            </Text>

            <Text style={styles.sectionSub} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Cancel / Abort Intents</Text>
            <View style={styles.grid}>
              {['I am OK', "I'm fine", 'Cancel', 'Stop'].map((phrase) => (
                <TouchableOpacity
                  key={phrase}
                  style={styles.simBtn}
                  onPress={() => handleSimulatePhrase(phrase)} accessibilityRole="button"
                >
                  <Text style={styles.simBtnText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>"{phrase}"</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionSub} allowFontScaling={true} maxFontSizeMultiplier={1.5}>SOS / Trigger Intents</Text>
            <View style={styles.grid}>
              {['Help me', 'Emergency', 'Call ambulance', 'SOS'].map((phrase) => (
                <TouchableOpacity
                  key={phrase}
                  style={[styles.simBtn, styles.sosSimBtn]}
                  onPress={() => handleSimulatePhrase(phrase)} accessibilityRole="button"
                >
                  <Text style={styles.simBtnText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>"{phrase}"</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardLabel} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Text-To-Speech (TTS) Announcement</Text>
            <Text style={styles.desc} allowFontScaling={true} maxFontSizeMultiplier={1.5}>
              Test the spoken synthesized audio read out when an accident alert is verified.
            </Text>

            <Text style={styles.inputLabel} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Incident Location Description</Text>
            <TextInput
              style={styles.input}
              value={locationText}
              onChangeText={setLocationText}
              placeholder="e.g. Sector G-11/3, Islamabad"
              placeholderTextColor={darkColors.textTertiary}
              allowFontScaling={true}
              maxFontSizeMultiplier={1.5}
            />

            <Text style={styles.inputLabel} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Nearest Target Hospital</Text>
            <TextInput
              style={styles.input}
              value={hospitalText}
              onChangeText={setHospitalText}
              placeholder="e.g. Shifa International Hospital"
              placeholderTextColor={darkColors.textTertiary}
              allowFontScaling={true}
              maxFontSizeMultiplier={1.5}
            />

            <Text style={styles.inputLabel} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Estimated Responder ETA (Minutes)</Text>
            <TextInput
              style={styles.input}
              value={etaValue}
              onChangeText={setEtaValue}
              keyboardType="numeric"
              placeholder="e.g. 8"
              placeholderTextColor={darkColors.textTertiary}
              allowFontScaling={true}
              maxFontSizeMultiplier={1.5}
            />

            <TouchableOpacity style={styles.ttsBtn} onPress={handleTTSAnnouncement} accessibilityRole="button">
              <Text style={styles.ttsBtnText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Speak Announcement</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Animated.View>

      {/* Phase 8: ConfirmDialog replaces destructive Alert.alert (voice-triggered SOS call) */}
      <ConfirmDialog
        visible={callDialogVisible}
        title="System Action"
        description="onTriggerSOS() successfully triggered via voice! Dialing emergency services immediately."
        confirmLabel="Call Now"
        cancelLabel="Cancel"
        variant="warning"
        onConfirm={handleConfirmCall}
        onCancel={() => setCallDialogVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: darkColors.background },
  gradTop: { top: 0, height: 300, backgroundColor: tints.dangerSubtle },
  gradBottom: { bottom: 0, height: 400, backgroundColor: tints.infoSubtle },
  scrollContent: { padding: 24, paddingBottom: 40 },
  header: { marginBottom: 24 },
  title: { fontSize: 24, fontWeight: 'bold', color: darkColors.text },
  subtitle: { fontSize: 14, color: darkColors.textSecondary, marginTop: 6, lineHeight: 20 },
  flashBanner: {
    backgroundColor: tints.successSubtle, padding: 16, borderRadius: 14, marginBottom: 20, alignItems: 'center',
    borderWidth: 1, borderColor: tints.successMedium,
  },
  flashBannerText: { color: colors.success[500], fontSize: 15, fontWeight: 'bold' },
  card: {
    backgroundColor: tints.glassCard, borderRadius: 20, padding: 20, marginBottom: 20,
    borderWidth: 1, borderColor: tints.whiteBorder,
    shadowColor: colors.neutral[950], shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 6,
  },
  cardLabel: {
    fontSize: 13, fontWeight: 'bold', color: colors.danger[500],
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16,
  },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  rowTitle: { fontSize: 15, color: darkColors.textSecondary, flex: 1 },
  rowValue: { fontSize: 15, fontWeight: 'bold', color: darkColors.text },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  activeDot: { backgroundColor: colors.success[500] },
  idleDot: { backgroundColor: darkColors.textTertiary },
  activeText: { color: colors.success[500] },
  idleText: { color: darkColors.textTertiary },
  transcriptBox: {
    backgroundColor: tints.overlayStrong, borderRadius: 14, padding: 12, marginVertical: 16,
    borderWidth: 1, borderColor: tints.whiteSubtle,
  },
  transcriptLabel: { fontSize: 12, color: darkColors.textSecondary, fontWeight: 'bold', marginBottom: 6 },
  transcriptText: { color: darkColors.text, fontSize: 15, fontStyle: 'italic', lineHeight: 20 },
  actionBtn: { paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  startBtn: { backgroundColor: colors.danger[500], shadowColor: colors.danger[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 3 },
  stopBtn: {
    backgroundColor: tints.glassCard, borderWidth: 1, borderColor: tints.dangerMedium,
  },
  actionBtnText: { color: darkColors.text, fontSize: 15, fontWeight: 'bold' },
  desc: { color: darkColors.textSecondary, fontSize: 13, lineHeight: 18, marginBottom: 16 },
  sectionSub: { fontSize: 12, fontWeight: 'bold', color: darkColors.textSecondary, marginBottom: 8, textTransform: 'uppercase' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 14 },
  simBtn: {
    backgroundColor: tints.glassCard, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 8,
    width: '48%', marginBottom: 10, alignItems: 'center',
    borderWidth: 1, borderColor: tints.whiteBorder,
  },
  sosSimBtn: { borderColor: tints.dangerErrorBorder, backgroundColor: tints.dangerErrorBg },
  simBtnText: { color: darkColors.text, fontSize: 13, fontWeight: 'bold' },
  inputLabel: { fontSize: 12, color: darkColors.textSecondary, fontWeight: 'bold', marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: tints.overlayStrong, color: darkColors.text, borderRadius: 14,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
    borderWidth: 1, borderColor: tints.whiteBorder,
  },
  ttsBtn: {
    backgroundColor: tints.glassCard, borderWidth: 1, borderColor: tints.dangerMedium,
    paddingVertical: 12, borderRadius: 14, alignItems: 'center', marginTop: 20,
  },
  ttsBtnText: { color: colors.danger[500], fontSize: 15, fontWeight: 'bold' },
});
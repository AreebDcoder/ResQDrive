import React, { useEffect, useState, useRef } from 'react';
import {
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

export default function VoiceCommandDemoScreen() {
  const [status, setStatus] = useState('Idle');
  const [engine, setEngine] = useState('Mock Simulator');
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [callbackFlash, setCallbackFlash] = useState<string | null>(null);
  const [locationText, setLocationText] = useState('Sector G-11/3, Islamabad');
  const [hospitalText, setHospitalText] = useState('Shifa International Hospital');
  const [etaValue, setEtaValue] = useState('8');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  useEffect(() => {
    VoiceCommandService.subscribeToCallbacks(
      () => {
        triggerCallbackFlash('Abort Callback Fired (onCancelCountdown) ❌');
        Alert.alert('System Action', 'onCancelCountdown() successfully triggered via voice! Aborting accident warning.');
      },
      async () => {
        triggerCallbackFlash('SOS Callback Fired (onTriggerSOS) 🚨');
        Alert.alert(
          'System Action',
          'onTriggerSOS() successfully triggered via voice! Dialing emergency services immediately.',
          [
            {
              text: 'Call Now',
              style: 'destructive',
              onPress: async () => {
                try {
                  const { status } = await Location.requestForegroundPermissionsAsync();
                  if (status !== 'granted') {
                    console.log('Location permission denied, dialing default.');
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
                  console.log('Voice SOS execution failed:', err);
                  Linking.openURL('tel:1122');
                }
              },
            },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
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

  return (
    <View style={styles.outer}>
      <View style={StyleSheet.absoluteFillObject}>
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#0A0A0F' }]} />
        <View style={[StyleSheet.absoluteFillObject, styles.gradTop]} />
        <View style={[StyleSheet.absoluteFillObject, styles.gradBottom]} />
      </View>

      <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Voice Command Controls</Text>
            <Text style={styles.subtitle}>
              Hands-free continuous recognition monitoring. Activates during emergency count-downs.
            </Text>
          </View>

          {callbackFlash && (
            <View style={styles.flashBanner}>
              <Text style={styles.flashBannerText}>{callbackFlash}</Text>
            </View>
          )}

          <View style={styles.card}>
            <Text style={styles.cardLabel}>Real-Time Telemetry Console</Text>

            <View style={styles.row}>
              <Text style={styles.rowTitle}>Listening Status:</Text>
              <View style={[styles.dot, isListening ? styles.activeDot : styles.idleDot]} />
              <Text style={[styles.rowValue, isListening ? styles.activeText : styles.idleText]}>
                {status}
              </Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.rowTitle}>Recognition Engine:</Text>
              <Text style={styles.rowValue}>{engine}</Text>
            </View>

            <View style={styles.transcriptBox}>
              <Text style={styles.transcriptLabel}>Rolling Speech Transcript:</Text>
              <Text style={styles.transcriptText}>
                {transcript ? `"${transcript}"` : 'No speech recognized. Say something...'}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.actionBtn, isListening ? styles.stopBtn : styles.startBtn]}
              onPress={handleToggleListening}
            >
              <Text style={styles.actionBtnText}>
                {isListening ? 'Stop Speech Recognition' : 'Start Speech Recognition'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardLabel}>Speech Command Simulator</Text>
            <Text style={styles.desc}>
              If testing in Expo Go, tap phrases below to simulate raw microphone input feed to the voice parser:
            </Text>

            <Text style={styles.sectionSub}>Cancel / Abort Intents</Text>
            <View style={styles.grid}>
              {['I am OK', "I'm fine", 'Cancel', 'Stop'].map((phrase) => (
                <TouchableOpacity
                  key={phrase}
                  style={styles.simBtn}
                  onPress={() => handleSimulatePhrase(phrase)}
                >
                  <Text style={styles.simBtnText}>❌ "{phrase}"</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionSub}>SOS / Trigger Intents</Text>
            <View style={styles.grid}>
              {['Help me', 'Emergency', 'Call ambulance', 'SOS'].map((phrase) => (
                <TouchableOpacity
                  key={phrase}
                  style={[styles.simBtn, styles.sosSimBtn]}
                  onPress={() => handleSimulatePhrase(phrase)}
                >
                  <Text style={styles.simBtnText}>🚨 "{phrase}"</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardLabel}>Text-To-Speech (TTS) Announcement</Text>
            <Text style={styles.desc}>
              Test the spoken synthesized audio read out when an accident alert is verified.
            </Text>

            <Text style={styles.inputLabel}>Incident Location Description</Text>
            <TextInput
              style={styles.input}
              value={locationText}
              onChangeText={setLocationText}
              placeholder="e.g. Sector G-11/3, Islamabad"
              placeholderTextColor="#6B6B80"
            />

            <Text style={styles.inputLabel}>Nearest Target Hospital</Text>
            <TextInput
              style={styles.input}
              value={hospitalText}
              onChangeText={setHospitalText}
              placeholder="e.g. Shifa International Hospital"
              placeholderTextColor="#6B6B80"
            />

            <Text style={styles.inputLabel}>Estimated Responder ETA (Minutes)</Text>
            <TextInput
              style={styles.input}
              value={etaValue}
              onChangeText={setEtaValue}
              keyboardType="numeric"
              placeholder="e.g. 8"
              placeholderTextColor="#6B6B80"
            />

            <TouchableOpacity style={styles.ttsBtn} onPress={handleTTSAnnouncement}>
              <Text style={styles.ttsBtnText}>🔊 Speak Announcement</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: '#0A0A0F' },
  gradTop: { top: 0, height: 300, backgroundColor: 'rgba(229, 57, 53, 0.08)' },
  gradBottom: { bottom: 0, height: 400, backgroundColor: 'rgba(41, 121, 255, 0.06)' },
  scrollContent: { padding: 24, paddingBottom: 40 },
  header: { marginBottom: 24 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF' },
  subtitle: { fontSize: 14, color: '#A0A0B8', marginTop: 6, lineHeight: 20 },
  flashBanner: {
    backgroundColor: 'rgba(0, 230, 118, 0.15)', padding: 16, borderRadius: 14, marginBottom: 20, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(0, 230, 118, 0.3)',
  },
  flashBannerText: { color: '#00E676', fontSize: 15, fontWeight: 'bold' },
  card: {
    backgroundColor: 'rgba(28, 28, 46, 0.6)', borderRadius: 20, padding: 20, marginBottom: 20,
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)',
    shadowColor: '#000000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 6,
  },
  cardLabel: {
    fontSize: 13, fontWeight: 'bold', color: '#E53935',
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16,
  },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  rowTitle: { fontSize: 15, color: '#A0A0B8', flex: 1 },
  rowValue: { fontSize: 15, fontWeight: 'bold', color: '#FFFFFF' },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  activeDot: { backgroundColor: '#00E676' },
  idleDot: { backgroundColor: '#6B6B80' },
  activeText: { color: '#00E676' },
  idleText: { color: '#6B6B80' },
  transcriptBox: {
    backgroundColor: 'rgba(10, 10, 15, 0.6)', borderRadius: 14, padding: 12, marginVertical: 16,
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  transcriptLabel: { fontSize: 12, color: '#A0A0B8', fontWeight: 'bold', marginBottom: 6 },
  transcriptText: { color: '#FFFFFF', fontSize: 15, fontStyle: 'italic', lineHeight: 20 },
  actionBtn: { paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  startBtn: { backgroundColor: '#E53935', shadowColor: '#E53935', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 3 },
  stopBtn: {
    backgroundColor: 'rgba(28, 28, 46, 0.6)', borderWidth: 1, borderColor: 'rgba(229, 57, 53, 0.4)',
  },
  actionBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: 'bold' },
  desc: { color: '#A0A0B8', fontSize: 13, lineHeight: 18, marginBottom: 16 },
  sectionSub: { fontSize: 12, fontWeight: 'bold', color: '#A0A0B8', marginBottom: 8, textTransform: 'uppercase' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 14 },
  simBtn: {
    backgroundColor: 'rgba(28, 28, 46, 0.6)', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 8,
    width: '48%', marginBottom: 10, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  sosSimBtn: { borderColor: 'rgba(255, 23, 68, 0.3)', backgroundColor: 'rgba(255, 23, 68, 0.08)' },
  simBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: 'bold' },
  inputLabel: { fontSize: 12, color: '#A0A0B8', fontWeight: 'bold', marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: 'rgba(10, 10, 15, 0.6)', color: '#FFFFFF', borderRadius: 14,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  ttsBtn: {
    backgroundColor: 'rgba(28, 28, 46, 0.6)', borderWidth: 1, borderColor: 'rgba(229, 57, 53, 0.3)',
    paddingVertical: 12, borderRadius: 14, alignItems: 'center', marginTop: 20,
  },
  ttsBtnText: { color: '#E53935', fontSize: 15, fontWeight: 'bold' },
});
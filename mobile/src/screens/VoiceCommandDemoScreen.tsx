import React, { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { VoiceCommandService } from '../services/voiceCommandService';
import { TtsService } from '../services/ttsService';

export default function VoiceCommandDemoScreen() {
  const [status, setStatus] = useState('Idle');
  const [engine, setEngine] = useState('Mock Simulator');
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [callbackFlash, setCallbackFlash] = useState<string | null>(null);

  // Spoken TTS Announcement Parameters
  const [locationText, setLocationText] = useState('Sector G-11/3, Islamabad');
  const [hospitalText, setHospitalText] = useState('Shifa International Hospital');
  const [etaValue, setEtaValue] = useState('8');

  useEffect(() => {
    // 1. Subscribe to Voice recognition callbacks
    VoiceCommandService.subscribeToCallbacks(
      // onCancel Abort callback
      () => {
        triggerCallbackFlash('Abort Callback Fired (onCancelCountdown) ❌');
        Alert.alert('System Action', 'onCancelCountdown() successfully triggered via voice! Aborting accident warning.');
      },
      // onSOS Trigger callback
      () => {
        triggerCallbackFlash('SOS Callback Fired (onTriggerSOS) 🚨');
        Alert.alert('System Action', 'onTriggerSOS() successfully triggered via voice! Dispatching alert immediately.');
      },
      // onTranscript update
      (text, isFinal) => {
        setTranscript(text);
      },
      // onStatusChange
      (newStatus) => {
        setStatus(newStatus);
      },
      // onEngineChange
      (newEngine) => {
        setEngine(newEngine);
      }
    );

    return () => {
      // De-register listeners on unmount
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
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.title}>Voice Command Controls</Text>
        <Text style={styles.subtitle}>
          Hands-free continuous recognition monitoring. Activates during emergency count-downs.
        </Text>
      </View>

      {/* Callback Trigger Visual Alert */}
      {callbackFlash && (
        <View style={styles.flashBanner}>
          <Text style={styles.flashBannerText}>{callbackFlash}</Text>
        </View>
      )}

      {/* Live Telemetry Console */}
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

      {/* Simulator Test Panel */}
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

      {/* Text-To-Speech (TTS) Test Card */}
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
          placeholderTextColor="#666"
        />

        <Text style={styles.inputLabel}>Nearest Target Hospital</Text>
        <TextInput
          style={styles.input}
          value={hospitalText}
          onChangeText={setHospitalText}
          placeholder="e.g. Shifa International Hospital"
          placeholderTextColor="#666"
        />

        <Text style={styles.inputLabel}>Estimated Responder ETA (Minutes)</Text>
        <TextInput
          style={styles.input}
          value={etaValue}
          onChangeText={setEtaValue}
          keyboardType="numeric"
          placeholder="e.g. 8"
          placeholderTextColor="#666"
        />

        <TouchableOpacity style={styles.ttsBtn} onPress={handleTTSAnnouncement}>
          <Text style={styles.ttsBtnText}>🔊 Speak Announcement</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 14,
    color: '#888888',
    marginTop: 6,
    lineHeight: 20,
  },
  flashBanner: {
    backgroundColor: '#388e3c',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'center',
  },
  flashBannerText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2e2e2e',
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#d32f2f',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  rowTitle: {
    fontSize: 15,
    color: '#aaaaaa',
    flex: 1,
  },
  rowValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  activeDot: {
    backgroundColor: '#4caf50',
  },
  idleDot: {
    backgroundColor: '#757575',
  },
  activeText: {
    color: '#4caf50',
  },
  idleText: {
    color: '#888888',
  },
  transcriptBox: {
    backgroundColor: '#161616',
    borderRadius: 8,
    padding: 12,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: '#262626',
  },
  transcriptLabel: {
    fontSize: 12,
    color: '#888888',
    fontWeight: 'bold',
    marginBottom: 6,
  },
  transcriptText: {
    color: '#ffffff',
    fontSize: 15,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  actionBtn: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  startBtn: {
    backgroundColor: '#d32f2f',
  },
  stopBtn: {
    backgroundColor: '#2e2e2e',
    borderWidth: 1,
    borderColor: '#d32f2f',
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  desc: {
    color: '#888888',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  sectionSub: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#aaaaaa',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  simBtn: {
    backgroundColor: '#262626',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 8,
    width: '48%',
    marginBottom: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#363636',
  },
  sosSimBtn: {
    borderColor: '#b71c1c',
    backgroundColor: '#1b1212',
  },
  simBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  inputLabel: {
    fontSize: 12,
    color: '#888888',
    fontWeight: 'bold',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#161616',
    color: '#ffffff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#262626',
  },
  ttsBtn: {
    backgroundColor: '#1e1e1e',
    borderWidth: 1,
    borderColor: '#d32f2f',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  ttsBtnText: {
    color: '#d32f2f',
    fontSize: 15,
    fontWeight: 'bold',
  },
});

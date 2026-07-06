import { Alert, NativeModules, PermissionsAndroid, Platform } from 'react-native';
import api from '../api/axios';
import { classifyIntent, VoiceIntent } from '../utils/voiceClassifier';

// Dynamic modules load wrappers to prevent Expo Go crashes
let Voice: any = null;
let Vosk: any = null;
let NetInfo: any = null;

const isVoiceNativeSupported = !!NativeModules.Voice;
const isVoskNativeSupported = !!NativeModules.Vosk || !!NativeModules.VoskModule;

try {
  NetInfo = require('@react-native-community/netinfo').default;
} catch (e) {
  console.warn('NetInfo not loaded. Operating in default online mode.');
}

if (isVoiceNativeSupported) {
  try {
    Voice = require('@react-native-voice/voice').default;
  } catch (e) {
    console.warn('Native Voice package could not be loaded.');
  }
}

if (isVoskNativeSupported) {
  try {
    Vosk = require('react-native-vosk').default;
  } catch (e) {
    console.warn('Native Vosk package could not be loaded.');
  }
}

export class VoiceCommandService {
  private static isListening = false;
  private static onCancelCallback: (() => void) | null = null;
  private static onSOSCallback: (() => void) | null = null;
  private static onTranscriptUpdateCallback: ((text: string, isFinal: boolean) => void) | null = null;
  private static statusCallback: ((status: string) => void) | null = null;
  private static engineCallback: ((engine: string) => void) | null = null;

  static subscribeToCallbacks(
    onCancel: () => void,
    onSOS: () => void,
    onTranscript: (text: string, isFinal: boolean) => void,
    onStatusChange: (status: string) => void,
    onEngineChange: (engine: string) => void
  ) {
    this.onCancelCallback = onCancel;
    this.onSOSCallback = onSOS;
    this.onTranscriptUpdateCallback = onTranscript;
    this.statusCallback = onStatusChange;
    this.engineCallback = onEngineChange;
  }

  /**
   * Request microphone recording permission.
   * Gracefully disables voice mode if denied.
   */
  static async requestPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'ResQDrive Microphone Permission',
            message: 'ResQDrive requires microphone access for hands-free voice command recognition.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
      return true;
    } catch (err) {
      console.warn('Permissions request error:', err);
      return false;
    }
  }

  /**
   * Starts listening to audio. Automatically chooses Native SpeechRecognizer (if online)
   * or Vosk (if offline). Falls back to mock simulator if in Expo Go.
   */
  static async startListening() {
    if (this.isListening) return;

    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      this.updateStatus('Voice permission denied.');
      return;
    }

    this.isListening = true;

    // Check connectivity status
    let isOnline = true;
    if (NetInfo) {
      try {
        const state = await NetInfo.fetch();
        isOnline = !!state.isConnected;
      } catch (e) {
        isOnline = true;
      }
    }

    if (isOnline && isVoiceNativeSupported && Voice) {
      this.startNativeSpeech();
    } else if (!isOnline && isVoskNativeSupported && Vosk) {
      this.startVoskSpeech();
    } else {
      this.startMockSpeech();
    }
  }

  /**
   * Stops listening.
   */
  static stopListening() {
    this.isListening = false;
    this.updateStatus('Idle');

    if (isVoiceNativeSupported && Voice) {
      try {
        Voice.destroy().then(() => Voice.removeAllListeners());
      } catch (e) {
        console.warn('Failed to destroy native Voice listener:', e);
      }
    }

    if (isVoskNativeSupported && Vosk) {
      try {
        Vosk.stop();
      } catch (e) {
        console.warn('Failed to stop native Vosk:', e);
      }
    }
  }

  /**
   * Native Google/Apple Cloud-assisted Speech Recognition API implementation
   */
  private static startNativeSpeech() {
    this.updateEngine('Native (Online)');
    this.updateStatus('Listening...');

    if (!Voice) return;

    try {
      Voice.onSpeechResults = (e: any) => {
        if (e.value && e.value.length > 0) {
          const transcript = e.value[0];
          this.handleTranscriptResult(transcript, true, 'native');
        }
      };

      Voice.onSpeechPartialResults = (e: any) => {
        if (e.value && e.value.length > 0) {
          const transcript = e.value[0];
          this.handleTranscriptResult(transcript, false, 'native');
        }
      };

      Voice.onSpeechError = (e: any) => {
        console.log('Native Speech recognition error:', e.error);
        this.updateStatus('Recognition Error');
      };

      Voice.start('en-US');
    } catch (err) {
      console.warn('Failed to start native Voice speech recognizer:', err);
      this.startMockSpeech();
    }
  }

  /**
   * Offline local on-device Vosk model speech recognition fallback
   */
  private static startVoskSpeech() {
    this.updateEngine('Vosk (Offline)');
    this.updateStatus('Listening...');

    if (!Vosk) return;

    try {
      // Initialize Vosk with small English model bundled in assets
      const modelPath = 'vosk-model-small-en-us';
      Vosk.start({
        model: modelPath,
        sampleRate: 16000,
      })
        .then((recognizer: any) => {
          recognizer.on('result', (result: string) => {
            // Vosk returns JSON containing text field
            try {
              const data = JSON.parse(result);
              this.handleTranscriptResult(data.text, true, 'vosk_offline');
            } catch (err) {
              this.handleTranscriptResult(result, true, 'vosk_offline');
            }
          });

          recognizer.on('partialResult', (partial: string) => {
            try {
              const data = JSON.parse(partial);
              this.handleTranscriptResult(data.partial, false, 'vosk_offline');
            } catch (err) {
              this.handleTranscriptResult(partial, false, 'vosk_offline');
            }
          });

          recognizer.on('error', (err: any) => {
            console.log('Offline Vosk error:', err);
            this.updateStatus('Offline Error');
          });
        })
        .catch((err: any) => {
          console.warn('Failed to start Vosk recognizer instance:', err);
          this.startMockSpeech();
        });
    } catch (error) {
      console.warn('Offline Vosk model loader failed:', error);
      this.startMockSpeech();
    }
  }

  /**
   * Mock fallback mode for Expo Go simulator testing
   */
  private static startMockSpeech() {
    this.updateEngine('Mock Simulator (Expo Go)');
    this.updateStatus('Listening (Simulated)...');
  }

  /**
   * Manual verification method to inject transcription test strings (predefined simulator phrases)
   */
  static simulateSpeechInput(text: string) {
    console.log(`[Voice Command Simulator]: Simulated speech text input: "${text}"`);
    this.handleTranscriptResult(text, true, 'mock_simulated');
  }

  /**
   * Processes the transcript results and routes callbacks if an intent is identified.
   */
  private static async handleTranscriptResult(transcript: string, isFinal: boolean, engine: string) {
    if (this.onTranscriptUpdateCallback) {
      this.onTranscriptUpdateCallback(transcript, isFinal);
    }

    if (!isFinal) return;

    // Classify using our unit-tested intent classifier
    const intent = classifyIntent(transcript);
    let actionTaken = false;

    if (intent === 'CANCEL') {
      actionTaken = true;
      if (this.onCancelCallback) {
        this.onCancelCallback();
      }
    } else if (intent === 'SOS') {
      actionTaken = true;
      if (this.onSOSCallback) {
        this.onSOSCallback();
      }
    }

    // Telemetry log to backend (fire-and-forget, non-blocking)
    try {
      await api.post('/voice-commands/log', {
        rawTranscript: transcript,
        classifiedIntent: intent.toLowerCase(),
        recognitionEngine: engine,
        actionTaken,
      });
    } catch (err: any) {
      console.log('Failed to upload voice telemetry log:', err.message);
    }
  }

  private static updateStatus(status: string) {
    if (this.statusCallback) this.statusCallback(status);
  }

  private static updateEngine(engine: string) {
    if (this.engineCallback) this.engineCallback(engine);
  }
}

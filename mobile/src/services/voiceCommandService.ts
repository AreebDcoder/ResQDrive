import { NativeModules, PermissionsAndroid, Platform } from 'react-native';
import api from '../api/axios';
import { classifyIntent, VoiceIntent } from '../utils/voiceClassifier';

// Log all registered NativeModules so we can see the exact module name
console.log('[VoiceCommandService]: Registered NativeModules keys:', Object.keys(NativeModules).join(', '));

// Always load Voice unconditionally — it registers as RCTVoice not Voice
let Voice: any = null;
let Vosk: any = null;
let NetInfo: any = null;

try {
  const voiceModule = require('@react-native-voice/voice');
  Voice = voiceModule.default || voiceModule;
  console.log('[VoiceCommandService]: Voice module loaded, keys:', Object.keys(Voice || {}).join(', '));
} catch (e: any) {
  console.warn('[VoiceCommandService]: Voice require FAILED:', e?.message);
}

try {
  NetInfo = require('@react-native-community/netinfo').default;
} catch (e) {
  console.warn('NetInfo not loaded.');
}

const isVoskNativeSupported = !!NativeModules.Vosk || !!NativeModules.VoskModule;
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
        console.log('[VoiceCommandService]: PermissionsAndroid.request RECORD_AUDIO result =', granted);
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
      return true;
    } catch (err) {
      console.warn('[VoiceCommandService]: Permissions request error:', err);
      return false;
    }
  }

  /**
   * Starts listening. Always tries native Voice first, falls back to Vosk or mock.
   */
  static async startListening() {
    if (this.isListening) return;

    const hasPermission = await this.requestPermissions();
    console.log('[VoiceCommandService]: hasPermission =', hasPermission, 'Voice =', !!Voice);
    if (!hasPermission) {
      this.updateStatus('Voice permission denied.');
      return;
    }

    this.isListening = true;

    if (Voice) {
      this.startNativeSpeech();
    } else if (isVoskNativeSupported && Vosk) {
      this.startVoskSpeech();
    } else {
      console.warn('[VoiceCommandService]: No speech engine available. Using mock mode.');
      this.startMockSpeech();
    }
  }

  /**
   * Stops listening.
   */
  static stopListening() {
    this.isListening = false;
    this.sessionCount++; // Invalidate any in-flight session callbacks
    this.updateStatus('Idle');

    // Cancel any pending restart timer
    if (this.restartDelay) {
      clearTimeout(this.restartDelay);
      this.restartDelay = null;
    }

    if (Voice) {
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
  private static restartDelay: ReturnType<typeof setTimeout> | null = null;
  private static sessionCount = 0;

  private static startNativeSpeech() {
    this.updateEngine('Native (Online)');
    this.updateStatus('Listening...');

    if (!Voice) return;

    const scheduleRestart = (delayMs: number) => {
      if (!this.isListening) return;
      if (this.restartDelay) clearTimeout(this.restartDelay);
      this.restartDelay = setTimeout(() => this.startNativeSpeech(), delayMs);
    };

    // Tear down any previous session cleanly first
    try { Voice.removeAllListeners(); } catch (_) {}

    Voice.destroy()
      .catch(() => {})
      .finally(() => {
        if (!this.isListening) return;

        this.sessionCount++;
        const session = this.sessionCount;
        console.log(`[Voice] Session #${session} starting...`);

        // Attach handlers BEFORE calling start()
        Voice.onSpeechResults = (e: any) => {
          if (!this.isListening || this.sessionCount !== session) return;
          const transcript = e?.value?.[0] ?? '';
          console.log(`[Voice] #${session} RESULT: "${transcript}"`);
          if (transcript) this.handleTranscriptResult(transcript, true, 'native');
          scheduleRestart(400);
        };

        Voice.onSpeechPartialResults = (e: any) => {
          if (!this.isListening || this.sessionCount !== session) return;
          const transcript = e?.value?.[0] ?? '';
          console.log(`[Voice] #${session} PARTIAL: "${transcript}"`);
          if (transcript) this.handleTranscriptResult(transcript, false, 'native');
        };

        // Do NOT restart on onSpeechEnd — that fires too eagerly before any audio
        Voice.onSpeechEnd = () => {
          console.log(`[Voice] #${session} onSpeechEnd`);
        };

        Voice.onSpeechError = (e: any) => {
          if (!this.isListening || this.sessionCount !== session) return;
          const code = String(e?.error?.code ?? e?.error ?? '');
          console.log(`[Voice] #${session} ERROR code=${code}`);
          // Recoverable errors — just restart:
          // 2=network error, 6=speech timeout, 7=no match, 8=server error, 9=insufficient permissions
          if (['2', '6', '7', '8', '9'].includes(code)) {
            const delay = code === '2' ? 1500 : 500; // Longer delay for network errors
            scheduleRestart(delay);
          } else {
            console.warn('[Voice] Unrecoverable error, stopping:', e.error);
            this.isListening = false;
          }
        };

        Voice.start('en-US', {
            // Prefer on-device offline recognition — avoids ERROR_NETWORK (code 2)
            // and works without Google cloud connectivity
            EXTRA_PREFER_OFFLINE: true,
          })
          .then(() => console.log(`[Voice] #${session} start() OK — say something!`))
          .catch((err: any) => {
            console.warn(`[Voice] #${session} start() REJECTED:`, err?.message);
            scheduleRestart(1000);
          });
      });
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

    // Classify using our unit-tested intent classifier in real-time (no latency)
    const intent = classifyIntent(transcript);
    let actionTaken = false;

    if (intent === 'CANCEL') {
      actionTaken = true;
      this.stopListening(); // Stop immediately to prevent double-firing
      if (this.onCancelCallback) {
        this.onCancelCallback();
      }
    } else if (intent === 'SOS') {
      actionTaken = true;
      this.stopListening(); // Stop immediately to prevent double-firing
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

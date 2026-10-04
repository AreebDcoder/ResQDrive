import { NativeModules, PermissionsAndroid, Platform } from 'react-native';
import api from '../api/axios';
import { classifyIntent, VoiceIntent } from '../utils/voiceClassifier';

// Log all registered NativeModules so we can see the exact module name

// Always load Voice unconditionally — it registers as RCTVoice not Voice
let Voice: any = null;
let Vosk: any = null;
let NetInfo: any = null;

try {
  const voiceModule = require('@react-native-voice/voice');
  Voice = voiceModule.default || voiceModule;
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
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
      return true;
    } catch (err) {
      console.warn('[VoiceCommandService]: Permissions request error:', err);
      return false;
    }
  }

  /**
   * Native Google/Apple Cloud-assisted Speech Recognition API implementation
   */
  private static restartDelay: ReturnType<typeof setTimeout> | null = null;
  private static sessionCount = 0;
  private static consecutiveErrors = 0;
  private static readonly MAX_CONSECUTIVE_ERRORS = 3;

  /**
   * Starts listening. Always tries native Voice first, falls back to Vosk or mock.
   */
  static async startListening(forceRestart = false) {
    this.consecutiveErrors = 0;
    if (this.isListening && !forceRestart) return;

    const hasPermission = await this.requestPermissions();
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
    this.consecutiveErrors = 0;
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

        // Attach handlers BEFORE calling start()
        Voice.onSpeechResults = (e: any) => {
          if (!this.isListening || this.sessionCount !== session) return;
          this.consecutiveErrors = 0; // Reset error counter on valid speech
          const transcript = e?.value?.[0] ?? '';
          if (transcript) this.handleTranscriptResult(transcript, true, 'native');
          scheduleRestart(400);
        };

        Voice.onSpeechPartialResults = (e: any) => {
          if (!this.isListening || this.sessionCount !== session) return;
          this.consecutiveErrors = 0; // Reset error counter on partial speech
          const transcript = e?.value?.[0] ?? '';
          if (transcript) this.handleTranscriptResult(transcript, false, 'native');
        };

        // Do NOT restart on onSpeechEnd — that fires too eagerly before any audio
        Voice.onSpeechEnd = () => {
        };

        Voice.onSpeechError = (e: any) => {
          if (!this.isListening || this.sessionCount !== session) return;
          const code = String(e?.error?.code ?? e?.error ?? '');

          // Code 6 (speech timeout) and Code 7 (no match / silence) are normal silence intervals
          if (code === '6' || code === '7') {
            this.consecutiveErrors = 0; // Normal silence is not a fatal error
            scheduleRestart(400);
            return;
          }

          // Recoverable errors: 2=network error, 8=server/recognizer busy, 9=insufficient permissions
          if (['2', '8', '9'].includes(code)) {
            this.consecutiveErrors++;

            if (this.consecutiveErrors >= this.MAX_CONSECUTIVE_ERRORS) {
              this.updateStatus('Listening paused. Tap microphone to speak.');
              this.isListening = false;
              return;
            }

            const delay = code === '2' ? 2500 : 1500;
            scheduleRestart(delay);
          } else {
            console.warn('[Voice] Unrecoverable error, stopping:', e.error);
            this.isListening = false;
            this.updateStatus('Speech error');
          }
        };

        Voice.start('en-US')
          .then(() => {})
          .catch((err: any) => {
            console.warn(`[Voice] #${session} start() REJECTED:`, err?.message);
            this.consecutiveErrors++;
            if (this.consecutiveErrors >= this.MAX_CONSECUTIVE_ERRORS) {
              this.isListening = false;
              this.updateStatus('Voice Engine Busy');
            } else {
              scheduleRestart(1500);
            }
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

    // To prevent false voice cancels caused by background speaker audio or momentary noise partials:
    // Only execute single-word intents ("cancel", "sos") if isFinal === true,
    // or if the transcript is a multi-word phrase (e.g. "i am ok", "cancel alert", "i need help").
    const isMultiWord = transcript.trim().split(/\s+/).length > 1;
    const isConfirmedIntent = isFinal || isMultiWord;

    if (isConfirmedIntent) {
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
    }
  }

  private static updateStatus(status: string) {
    if (this.statusCallback) this.statusCallback(status);
  }

  private static updateEngine(engine: string) {
    if (this.engineCallback) this.engineCallback(engine);
  }
}

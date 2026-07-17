import { Platform } from 'react-native';
import api from '../api/axios';
import {
  CRASH_CLASS_INDICES,
  CLASS_INDEX_TO_NAME,
  CRASH_CONFIDENCE_THRESHOLD,
  SAMPLE_RATE_HZ,
  ROLLING_WINDOW_SECONDS,
  CrashRelevantClassName,
} from '../config/crashClassConfig';

let loadTensorflowModel: any = null;
let LiveAudioStream: any = null;
let isNativeSupported = false;

try {
  // Safe runtime imports to prevent app crashes on Expo Go clients
  const tflite = require('react-native-fast-tflite');
  loadTensorflowModel = tflite.loadTensorflowModel || tflite.useTensorflowModel;
  LiveAudioStream = require('react-native-live-audio-stream').default;

  if (loadTensorflowModel && LiveAudioStream) {
    isNativeSupported = true;
  }
} catch (e) {
  isNativeSupported = false;
  console.log('Running in Mock Audio Classification mode (Native TFLite/Audio recording not supported).');
}

export class CrashSoundDetectionService {
  private static model: any = null;
  private static isMonitoring = false;
  private static mockIntervalId: any = null;
  private static onCrashCallback: ((confidence: number, topClass: string) => void) | null = null;
  private static audioBuffer: Float32Array | null = null;
  private static bufferIndex = 0;

  /**
   * Registers a callback listener that triggers whenever the crash confidence threshold is exceeded.
   */
  static subscribeToCrashEvents(callback: (confidence: number, topClass: string) => void) {
    this.onCrashCallback = callback;
  }

  /**
   * Initializes and starts rolling 2-second audio monitoring.
   * If running in Expo Go, falls back to a simulated periodic audio inference loop.
   */
static async startMonitoring() {
  if (this.isMonitoring) return;
  this.isMonitoring = true;

  if (isNativeSupported) {
    try {
      const { PermissionsAndroid, Platform } = require('react-native');
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message: 'ResQDrive needs microphone access to detect crash sounds automatically.',
            buttonPositive: 'Allow',
          },
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          console.log('Microphone permission denied. Falling back to mock monitoring.');
          this.startMockMonitoring();
          return;
        }
      }

      console.log('Starting native TFLite crash sound monitoring...');
        
        // 1. Load YAMNet TFLite model from assets if not loaded
        if (!this.model) {
          // Bundled asset path relative to the app
          this.model = await loadTensorflowModel(require('../../assets/yamnet.tflite'));
        }

        // Initialize 2-second rolling buffer (16000 HZ * 2 seconds = 32000 samples)
        const bufferSize = SAMPLE_RATE_HZ * ROLLING_WINDOW_SECONDS;
        this.audioBuffer = new Float32Array(bufferSize);
        this.bufferIndex = 0;

        // 2. Initialize live audio stream capture (16kHz mono 16-bit PCM)
        LiveAudioStream.init({
          sampleRate: SAMPLE_RATE_HZ,
          channels: 1,
          bitsPerSample: 16,
          bufferSize: 4096,
        });

        LiveAudioStream.on('data', (dataBase64: string) => {
          if (!this.isMonitoring) return;
          this.processAudioChunk(dataBase64);
        });

        LiveAudioStream.start();
      } catch (error) {
        console.error('Failed to initialize native crash sound monitor. Falling back to mock.', error);
        this.startMockMonitoring();
      }
    } else {
      this.startMockMonitoring();
    }
  }

  /**
   * Stops rolling audio capture and clears inference timers.
   */
  static stopMonitoring() {
    this.isMonitoring = false;

    if (isNativeSupported && LiveAudioStream) {
      try {
        LiveAudioStream.stop();
        console.log('Native crash sound monitoring stopped.');
      } catch (e) {
        console.log('Failed to stop native audio stream:', e);
      }
    }

    if (this.mockIntervalId) {
      clearInterval(this.mockIntervalId);
      this.mockIntervalId = null;
      console.log('Mock crash sound monitoring stopped.');
    }
  }

  /**
   * Fallback simulator loop running every 2 seconds, generating mock driving sounds
   * and occasionally simulating crash sounds for validation testing.
   */
  private static startMockMonitoring() {
    console.log('Starting Mock YAMNet audio classification loop...');
    
    this.mockIntervalId = setInterval(async () => {
      if (!this.isMonitoring) return;

      // 5% chance of generating a crash sound, otherwise baseline traffic rumble
      const isCrashEvent = Math.random() < 0.06;
      let topClass: CrashRelevantClassName = 'Vehicle';
      let confidence = 0.05 + Math.random() * 0.12;

      if (isCrashEvent) {
        const crashClasses: CrashRelevantClassName[] = ['Skidding', 'Glass', 'Explosion', 'Tire squeal'];
        topClass = crashClasses[Math.floor(Math.random() * crashClasses.length)];
        confidence = 0.45 + Math.random() * 0.45;
      }

      const isExceeded = confidence > CRASH_CONFIDENCE_THRESHOLD;

      console.log(
        `[Mock YAMNet] Rolling window analyzed. Top Class: ${topClass}, Confidence: ${confidence.toFixed(2)} (Exceeded: ${isExceeded})`
      );

      // Trigger event listener callback if threshold is crossed
      if (isExceeded && this.onCrashCallback) {
        this.onCrashCallback(confidence, topClass);
      }

      // Log window result to backend telemetry
      this.logTelemetryWindow(confidence, topClass, isExceeded);
    }, ROLLING_WINDOW_SECONDS * 1000);
  }

  /**
   * Manual trigger method used strictly for screen testing buttons.
   */
  static simulateManualCrash(topClass: CrashRelevantClassName = 'Skidding', confidence = 0.85) {
    const isExceeded = confidence > CRASH_CONFIDENCE_THRESHOLD;
    console.log(`[Manual Simulation] Triggered Crash event: ${topClass} (${confidence})`);

    if (isExceeded && this.onCrashCallback) {
      this.onCrashCallback(confidence, topClass);
    }

    this.logTelemetryWindow(confidence, topClass, isExceeded);
  }

  /**
   * Shift-and-append PCM bytes into the rolling waveform buffer, running model inference
   * once the buffer contains exactly 2 seconds of audio.
   */
  private static async processAudioChunk(dataBase64: string) {
    if (!this.audioBuffer) return;

    // Convert base64 chunk string to PCM signed 16-bit integer array
    const rawBuffer = Buffer.from(dataBase64, 'base64');
    const pcmData = new Int16Array(rawBuffer.buffer, rawBuffer.byteOffset, rawBuffer.length / 2);

    // Normalize PCM values to Float32 [-1.0, 1.0] as expected by YAMNet
    for (let i = 0; i < pcmData.length; i++) {
      const normalizedSample = pcmData[i] / 32768.0;
      
      // Shift buffer if it is full (rolling window mechanism)
      if (this.bufferIndex >= this.audioBuffer.length) {
        this.audioBuffer.copyWithin(0, 1);
        this.audioBuffer[this.audioBuffer.length - 1] = normalizedSample;
      } else {
        this.audioBuffer[this.bufferIndex++] = normalizedSample;
      }
    }

    // Run inference once the buffer is fully populated
    if (this.bufferIndex >= this.audioBuffer.length) {
      try {
        // YAMNet model accepts [waveform] as input and outputs flat float array of 521 scores
        const scores: number[] = await this.model.run([this.audioBuffer]);
        
        // Find maximum confidence score among target indices
        let maxConfidence = 0;
        let topIndex = CRASH_CLASS_INDICES[0];

        CRASH_CLASS_INDICES.forEach((idx) => {
          const score = scores[idx] || 0;
          if (score > maxConfidence) {
            maxConfidence = score;
            topIndex = idx;
          }
        });

        const topClassName = CLASS_INDEX_TO_NAME[topIndex] || 'Vehicle';
        const isExceeded = maxConfidence > CRASH_CONFIDENCE_THRESHOLD;

        if (isExceeded && this.onCrashCallback) {
          this.onCrashCallback(maxConfidence, topClassName);
        }

        // Fire-and-forget logging telemetry to database
        this.logTelemetryWindow(maxConfidence, topClassName, isExceeded);
      } catch (err) {
        console.error('YAMNet TFLite inference run failed:', err);
      }
    }
  }

  /**
   * Submits the telemetry results to the NestJS logging API for tuning analysis.
   */
  private static async logTelemetryWindow(confidence: number, topClass: string, flagged: boolean) {
    try {
      await api.post('/crash-sound-detection/log', {
        windowTimestamp: new Date().toISOString(),
        topMatchedClass: topClass,
        crashConfidence: confidence,
        thresholdUsed: CRASH_CONFIDENCE_THRESHOLD,
        flaggedAsCrash: flagged,
      });
    } catch (error: any) {
      console.log('Failed to log telemetry window to backend:', error.message);
    }
  }
}

import api from '../api/axios';
import {
  CRASH_CLASS_INDICES,
  CLASS_INDEX_TO_NAME,
  CRASH_CONFIDENCE_THRESHOLD,
  SAMPLE_RATE_HZ,
  CrashRelevantClassName,
} from '../config/crashClassConfig';
import {
  CIRCULAR_BUFFER_SECONDS,
  REFRACTORY_PERIOD_MS,
  TRANSIENT_MULTIPLIER,
  TRANSIENT_MIN_RMS,
} from '../config/transientConfig';
import {
  computeRms,
  isTransientDetected,
  updateRollingAverage,
  extractCenteredWindow,
} from '../utils/transientDetector';

let loadTensorflowModel: any = null;
let LiveAudioStream: any = null;
let isNativeSupported = false;

try {
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

export interface AudioTelemetryData {
  currentRms: number;
  rollingAvgRms: number;
  transientRatio: number;
  isTransient: boolean;
}

export class CrashSoundDetectionService {
  private static model: any = null;
  private static isMonitoring = false;
  private static mockIntervalId: any = null;
  private static onCrashCallback: ((confidence: number, topClass: string) => void) | null = null;
  private static onTelemetryCallback: ((data: AudioTelemetryData) => void) | null = null;

  // 3.0s Sample-indexed Circular Buffer (48,000 samples at 16kHz)
  private static circularBuffer: Float32Array = new Float32Array(SAMPLE_RATE_HZ * CIRCULAR_BUFFER_SECONDS);
  private static writeHead = 0;
  private static totalSamplesWritten = 0;

  // RMS & Transient Detection State
  private static currentRms = 0;
  private static rollingAvgRms = 0.01;
  private static lastTransientTimestamp = 0;

  /**
   * Registers a callback listener that triggers whenever crash sound confidence threshold is exceeded.
   */
  static subscribeToCrashEvents(callback: (confidence: number, topClass: string) => void) {
    this.onCrashCallback = callback;
  }

  /**
   * Registers a telemetry listener for live diagnostics (RMS gauges & transient ratio).
   */
  static subscribeToTelemetry(callback: (data: AudioTelemetryData) => void) {
    this.onTelemetryCallback = callback;
  }

  /**
   * Starts event-driven transient-triggered audio monitoring.
   */
  static async startMonitoring() {
    if (this.isMonitoring) return;
    this.isMonitoring = true;

    this.writeHead = 0;
    this.totalSamplesWritten = 0;
    this.currentRms = 0;
    this.rollingAvgRms = 0.01;

    if (isNativeSupported) {
      try {
        const { PermissionsAndroid } = require('react-native');
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

        console.log('Starting native transient-triggered YAMNet crash sound monitoring...');
        
        if (!this.model) {
          this.model = await loadTensorflowModel(require('../../assets/yamnet.tflite'));
        }

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
   * Stops audio capture and clears timers.
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
   * Fallback simulator loop running every 100ms for telemetry preview in Expo Go.
   */
  private static startMockMonitoring() {
    console.log('Starting Mock transient-triggered audio monitoring loop...');
    
    this.mockIntervalId = setInterval(() => {
      if (!this.isMonitoring) return;

      // Ambient traffic rumble simulation
      this.currentRms = 0.01 + Math.random() * 0.015;
      this.rollingAvgRms = updateRollingAverage(this.rollingAvgRms, this.currentRms, 0.05);

      const ratio = this.currentRms / Math.max(this.rollingAvgRms, 0.001);
      const isTransient = isTransientDetected(this.currentRms, this.rollingAvgRms);

      if (this.onTelemetryCallback) {
        this.onTelemetryCallback({
          currentRms: this.currentRms,
          rollingAvgRms: this.rollingAvgRms,
          transientRatio: ratio,
          isTransient,
        });
      }
    }, 100);
  }

  /**
   * Manual trigger method for simulating acoustic transients or crash sounds.
   */
  static simulateManualCrash(topClass: CrashRelevantClassName = 'Crash', confidence = 0.85) {
    const isExceeded = confidence > CRASH_CONFIDENCE_THRESHOLD;
    console.log(`[Transient Event Manual Trigger] Crash sound: ${topClass} (${confidence})`);

    // Notify live visual flash
    if (this.onTelemetryCallback) {
      this.onTelemetryCallback({
        currentRms: 0.35,
        rollingAvgRms: 0.02,
        transientRatio: 17.5,
        isTransient: true,
      });
    }

    if (isExceeded && this.onCrashCallback) {
      this.onCrashCallback(confidence, topClass);
    }

    this.logTelemetryWindow(confidence, topClass, isExceeded, true);
  }

  /**
   * Appends PCM chunks into 3s circular buffer, computes instantaneous RMS,
   * updates 5s moving average, and triggers YAMNet ONLY upon transient detection.
   */
  private static async processAudioChunk(dataBase64: string) {
    const rawBuffer = Buffer.from(dataBase64, 'base64');
    const pcmData = new Int16Array(rawBuffer.buffer, rawBuffer.byteOffset, rawBuffer.length / 2);
    const chunkSamples = new Float32Array(pcmData.length);

    // Convert PCM int16 to float32 [-1.0, 1.0] and store into circular buffer
    const bufLen = this.circularBuffer.length;
    for (let i = 0; i < pcmData.length; i++) {
      const sample = pcmData[i] / 32768.0;
      chunkSamples[i] = sample;
      this.circularBuffer[this.writeHead] = sample;
      this.writeHead = (this.writeHead + 1) % bufLen;
      this.totalSamplesWritten++;
    }

    // 1. Calculate chunk RMS energy and update 5s moving average
    const chunkRms = computeRms(chunkSamples);
    this.currentRms = chunkRms;
    this.rollingAvgRms = updateRollingAverage(this.rollingAvgRms, chunkRms, 0.05);

    const transientRatio = chunkRms / Math.max(this.rollingAvgRms, 0.001);
    const isTransient = isTransientDetected(chunkRms, this.rollingAvgRms);

    // Emit live telemetry to UI
    if (this.onTelemetryCallback) {
      this.onTelemetryCallback({
        currentRms: this.currentRms,
        rollingAvgRms: this.rollingAvgRms,
        transientRatio,
        isTransient,
      });
    }

    // 2. Event-Driven Trigger: Run YAMNet ONLY when a transient spike occurs
    const now = Date.now();
    if (isTransient && (now - this.lastTransientTimestamp > REFRACTORY_PERIOD_MS)) {
      this.lastTransientTimestamp = now;

      // Extract 2.0s window centered on the transient (0.75s pre-peak, 1.25s post-peak)
      const centeredWindow = extractCenteredWindow(
        this.circularBuffer,
        this.writeHead,
        this.totalSamplesWritten
      );

      if (centeredWindow) {
        try {
          console.log(`[Transient Detected!] RMS: ${chunkRms.toFixed(3)} (Ratio: ${transientRatio.toFixed(1)}x). Running YAMNet classification...`);
          const scores: number[] = await this.model.run([centeredWindow]);

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

          this.logTelemetryWindow(maxConfidence, topClassName, isExceeded, true);
        } catch (err) {
          console.error('Transient YAMNet inference failed:', err);
        }
      }
    }
  }

  /**
   * Submits window analysis result to NestJS backend API.
   */
  private static async logTelemetryWindow(
    confidence: number,
    topClass: string,
    flagged: boolean,
    triggeredByTransient = true
  ) {
    try {
      await api.post('/crash-sound-detection/log', {
        windowTimestamp: new Date().toISOString(),
        topMatchedClass: topClass,
        crashConfidence: confidence,
        thresholdUsed: CRASH_CONFIDENCE_THRESHOLD,
        flaggedAsCrash: flagged,
        triggeredByTransient,
      });
    } catch (error: any) {
      console.log('Failed to log transient window telemetry to backend:', error.message);
    }
  }
}


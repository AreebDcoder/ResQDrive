import { Accelerometer, Gyroscope } from 'expo-sensors';
import * as Location from 'expo-location';
import { store } from '../store/store';
import { updateLatestReading } from '../store/slices/sensorSlice';
import { SensorReading, SensorFusionService } from './sensorFusionInterface';
import { classifyMotionSeverity } from '../config/motionSeverityConfig';
import { classifyCrashSeverityMl } from './crashSeverityMlService';
import { CrashSoundDetectionService } from './crashSoundDetectionService';
import { RawSensorSample } from './impactFeatureExtractor';

export class PhoneSensorFallbackService implements SensorFusionService {
  private callbacks: ((reading: SensorReading) => void)[] = [];
  
  private accelSubscription: any = null;
  private gyroSubscription: any = null;
  private locationSubscription: Location.LocationSubscription | null = null;
  private intervalId: any = null;

  // Raw sensor values
  private currentAccel = { x: 0, y: 0, z: 1.0 };
  private currentGyro = { x: 0, y: 0, z: 0 };
  private speedBuffer: number[] = [];
  private lastSpeedKmh = 0;
  private lastLocation: { lat: number; lng: number } | null = null;
  private lastLocationTimestamp = 0;

  // Rolling window of raw samples for feature extraction (~5 seconds at 200ms)
  private rawSamplesBuffer: RawSensorSample[] = [];
  private static readonly MAX_BUFFER_SAMPLES = 25;

  // Software Gyroscope & Jerk Tracking State
  private isGyroHardwareAvailable = false;
  private lastAccel = { x: 0, y: 0, z: 1.0 };
  private lastAccelG = 1.0;
  private lastAccelTimestamp = Date.now();

  onSensorEvent(callback: (reading: SensorReading) => void): void {
    this.callbacks.push(callback);
  }

  /**
   * Starts phone sensors capturing and GPS location speed monitoring
   */
  async start() {
    if (this.intervalId) return;

    console.log('PhoneFallback: Initializing accelerometer and gyroscope...');
    
    // Check hardware availability of sensors
    try {
      const accelAvailable = await Accelerometer.isAvailableAsync();
      const gyroAvailable = await Gyroscope.isAvailableAsync();
      this.isGyroHardwareAvailable = gyroAvailable;
      console.log(`[PhoneFallback] Hardware sensor status -> Accelerometer: ${accelAvailable ? 'AVAILABLE' : 'NOT_FOUND'}, Gyroscope: ${gyroAvailable ? 'AVAILABLE' : 'NOT_FOUND'}`);
    } catch (err: any) {
      console.log('[PhoneFallback] Error checking sensor availability:', err.message);
      this.isGyroHardwareAvailable = false;
    }

    Accelerometer.setUpdateInterval(200);
    this.accelSubscription = Accelerometer.addListener(data => {
      this.currentAccel = data;
    });

    if (this.isGyroHardwareAvailable) {
      Gyroscope.setUpdateInterval(200);
      this.gyroSubscription = Gyroscope.addListener(data => {
        this.currentGyro = data;
      });
    }

    try {
      console.log('PhoneFallback: Requesting foreground location permission...');
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        // Prime initial location & speed immediately
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
          .then(initialLoc => {
            if (initialLoc?.coords) {
              const rawSpeed = initialLoc.coords.speed;
              if (typeof rawSpeed === 'number' && rawSpeed > 0) {
                this.lastSpeedKmh = rawSpeed * 3.6;
                this.speedBuffer.push(this.lastSpeedKmh);
              }
              this.lastLocation = { lat: initialLoc.coords.latitude, lng: initialLoc.coords.longitude };
              this.lastLocationTimestamp = initialLoc.timestamp;
            }
          })
          .catch(() => {});

        this.locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 500, // 500ms for responsive live speed telemetry
            distanceInterval: 0, // 0m to receive updates even when stationary or moving slowly
          },
          location => {
            const rawSpeed = location.coords.speed;
            let speedKmh = 0;
            if (typeof rawSpeed === 'number' && rawSpeed >= 0) {
              speedKmh = rawSpeed * 3.6;
            } else if (this.lastLocation && this.lastLocationTimestamp > 0) {
              // Fallback: Haversine distance / delta time if GPS Doppler speed is null/-1
              const dtSeconds = (location.timestamp - this.lastLocationTimestamp) / 1000.0;
              if (dtSeconds >= 0.5) {
                const dLat = (location.coords.latitude - this.lastLocation.lat) * (Math.PI / 180);
                const dLon = (location.coords.longitude - this.lastLocation.lng) * (Math.PI / 180);
                const a =
                  Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(this.lastLocation.lat * (Math.PI / 180)) *
                  Math.cos(location.coords.latitude * (Math.PI / 180)) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                const distMeters = 6371000 * c;
                if (distMeters > 1.2) {
                  speedKmh = (distMeters / dtSeconds) * 3.6;
                }
              }
            }

            this.lastLocation = { lat: location.coords.latitude, lng: location.coords.longitude };
            this.lastLocationTimestamp = location.timestamp;
            this.lastSpeedKmh = Math.max(0, speedKmh);

            this.speedBuffer.push(this.lastSpeedKmh);
            if (this.speedBuffer.length > 5) {
              this.speedBuffer.shift();
            }
          }
        );
      }
    } catch (e: any) {
      console.log('PhoneFallback: Failed to start location tracking:', e.message);
    }

    this.lastAccel = { ...this.currentAccel };
    this.lastAccelTimestamp = Date.now();

    // Merge and emit readings 5 times per second (200ms)
    this.intervalId = setInterval(() => {
      this.emitSensorEvent();
    }, 200);
  }

  /**
   * Cleans up all sensor listeners and interval timers
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.accelSubscription) {
      this.accelSubscription.remove();
      this.accelSubscription = null;
    }

    if (this.gyroSubscription) {
      this.gyroSubscription.remove();
      this.gyroSubscription = null;
    }

    if (this.locationSubscription) {
      this.locationSubscription.remove();
      this.locationSubscription = null;
    }

    this.lastLocation = null;
    this.lastLocationTimestamp = 0;
    this.lastSpeedKmh = 0;
    this.speedBuffer = [];
  }

  private emitSensorEvent() {
    const { x: ax, y: ay, z: az } = this.currentAccel;
    
    // 1. Compute magnitude of accelerometer g-forces
    const accelG = Math.sqrt(ax * ax + ay * ay + az * az);

    // 2. Compute magnitude of rotation
    let gyroDegPerSec = 0;
    if (this.isGyroHardwareAvailable) {
      const { x: gx, y: gy, z: gz } = this.currentGyro;
      const gyroRadPerSec = Math.sqrt(gx * gx + gy * gy + gz * gz);
      gyroDegPerSec = gyroRadPerSec * (180.0 / Math.PI);
    } else {
      // Software Gyroscope Fallback: Compute angular velocity based on Accelerometer gravity vector changes
      const { x: lax, y: lay, z: laz } = this.lastAccel;
      const dot = ax * lax + ay * lay + az * laz;
      const mag1 = Math.sqrt(ax * ax + ay * ay + az * az);
      const mag2 = Math.sqrt(lax * lax + lay * lay + laz * laz);
      const cosTheta = (mag1 * mag2 > 0) ? (dot / (mag1 * mag2)) : 1.0;
      const clampedCos = Math.max(-1.0, Math.min(1.0, cosTheta));
      const thetaRad = Math.acos(clampedCos);
      const now = Date.now();
      const dtSeconds = Math.max(0.01, (now - this.lastAccelTimestamp) / 1000.0);
      
      gyroDegPerSec = (thetaRad * (180.0 / Math.PI)) / dtSeconds;

      // Save values for next tick
      this.lastAccel = { x: ax, y: ay, z: az };
      this.lastAccelTimestamp = now;
    }

    // 3. Compute Jerk (da/dt in g/s)
    const now = Date.now();
    const dtSeconds = Math.max(0.01, (now - this.lastAccelTimestamp) / 1000.0);
    const jerk = Math.abs(accelG - this.lastAccelG) / dtSeconds;
    this.lastAccelG = accelG;

    // 4. Compute GPS speed drop
    let gpsSpeedDropKmh = 0;
    if (this.speedBuffer.length > 0) {
      const maxSpeed = Math.max(...this.speedBuffer);
      gpsSpeedDropKmh = Math.max(0, maxSpeed - this.lastSpeedKmh);
    }

    // 5. Fetch live sound RMS & compute duration
    const soundRms = CrashSoundDetectionService.getCurrentRms();
    const durationMs = 200; // 200ms tick sampling interval

    // 6. On-Device Random Forest ML Model Classification (91.12% Accuracy)
    // Features: ['a_peak', 'delta_v', 'jerk', 'gyro_peak', 'sound_rms', 'duration_ms']
    const mlResult = classifyCrashSeverityMl({
      a_peak: accelG,
      delta_v: gpsSpeedDropKmh,
      jerk,
      gyro_peak: gyroDegPerSec,
      sound_rms: soundRms,
      duration_ms: durationMs,
    });

    // 7. Physical Motion Severity (Preserves presentation hand-shake demo capability)
    const motionSeverity = classifyMotionSeverity(accelG, gyroDegPerSec);

    const reading: SensorReading = {
      accelG,
      gyroDegPerSec,
      gpsSpeedDropKmh,
      speedKmh: this.lastSpeedKmh,
      motionSeverity,
      jerk,
      soundRms,
      durationMs,
      mlClassifiedSeverity: mlResult.topClass,
      mlConfidence: mlResult.confidence,
      timestamp: now,
    };

    // Push raw sample into rolling window buffer
    this.rawSamplesBuffer.push({
      ax,
      ay,
      az,
      gx: this.currentGyro.x,
      gy: this.currentGyro.y,
      gz: this.currentGyro.z,
      timestamp: now,
    });
    if (this.rawSamplesBuffer.length > PhoneSensorFallbackService.MAX_BUFFER_SAMPLES) {
      this.rawSamplesBuffer.shift();
    }

    // Update Redux state and notify callbacks
    store.dispatch(updateLatestReading(reading));
    this.callbacks.forEach(cb => cb(reading));
  }

  /**
   * Retrieves a snapshot of recent raw sensor samples and speed points for ML feature extraction.
   * Default count is 10 samples (~2 seconds of telemetry).
   */
  getSensorWindow(sampleCount: number = 10): { samples: RawSensorSample[]; speeds: number[] } {
    const samples = this.rawSamplesBuffer.slice(-sampleCount);
    const speeds = [...this.speedBuffer];
    return { samples, speeds };
  }

  /**
   * Resets the raw sensor sample and speed buffer for a clean start (e.g. before demo).
   */
  resetSensorBuffer(): void {
    this.rawSamplesBuffer = [];
    this.speedBuffer = [];
  }

  /**
   * Returns the most recent GPS speed in km/h.
   */
  getLastSpeedKmh(): number {
    return this.lastSpeedKmh;
  }
}

export const phoneSensorFallbackService = new PhoneSensorFallbackService();

import { Accelerometer, Gyroscope } from 'expo-sensors';
import * as Location from 'expo-location';
import { store } from '../store/store';
import { updateLatestReading } from '../store/slices/sensorSlice';
import { SensorReading, SensorFusionService } from './sensorFusionInterface';

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

  // Software Gyroscope Fallback State
  private isGyroHardwareAvailable = false;
  private lastAccel = { x: 0, y: 0, z: 1.0 };
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
        this.locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 1000,
            distanceInterval: 1,
          },
          location => {
            const speedKmh = Math.max(0, (location.coords.speed || 0) * 3.6);
            this.lastSpeedKmh = speedKmh;
            
            this.speedBuffer.push(speedKmh);
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

    // 3. Compute GPS speed drop
    let gpsSpeedDropKmh = 0;
    if (this.speedBuffer.length > 0) {
      const maxSpeed = Math.max(...this.speedBuffer);
      gpsSpeedDropKmh = Math.max(0, maxSpeed - this.lastSpeedKmh);
    }

    const reading: SensorReading = {
      accelG,
      gyroDegPerSec,
      gpsSpeedDropKmh,
      timestamp: Date.now(),
    };

    // Update Redux state and notify callbacks
    store.dispatch(updateLatestReading(reading));
    this.callbacks.forEach(cb => cb(reading));
  }
}

export const phoneSensorFallbackService = new PhoneSensorFallbackService();

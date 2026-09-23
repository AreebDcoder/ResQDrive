import { MotionSeverity } from '../config/motionSeverityConfig';

export interface SensorReading {
  accelG: number;            // Magnitude of g-forces: sqrt(accelX² + accelY² + accelZ²)
  gyroDegPerSec: number;     // Magnitude of gyroscope rotation: sqrt(gyroX² + gyroY² + gyroZ²)
  gpsSpeedDropKmh: number;   // Speed delta (max speed in last 5 readings - current speed)
  motionSeverity: MotionSeverity; // Classified tiered severity: 'none' | 'minor' | 'moderate' | 'severe'
  jerk?: number;             // Acceleration rate of change da/dt (g/s)
  soundRms?: number;         // Live acoustic RMS energy [0.0, 1.0]
  durationMs?: number;       // Impact transient pulse duration in ms
  mlClassifiedSeverity?: MotionSeverity; // ML model predicted class ('none' | 'minor' | 'moderate' | 'severe')
  mlConfidence?: number;     // ML model prediction probability [0.0, 1.0]
  timestamp: number;         // Phone epoch wall-clock timestamp (Date.now())
}

export interface SensorFusionService {
  onSensorEvent(callback: (reading: SensorReading) => void): void;
  start(): void;
  stop(): void;
}

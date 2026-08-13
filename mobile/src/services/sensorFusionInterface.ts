import { MotionSeverity } from '../config/motionSeverityConfig';

export interface SensorReading {
  accelG: number;            // Magnitude of g-forces: sqrt(accelX² + accelY² + accelZ²)
  gyroDegPerSec: number;     // Magnitude of gyroscope rotation: sqrt(gyroX² + gyroY² + gyroZ²)
  gpsSpeedDropKmh: number;   // Speed delta (max speed in last 5 readings - current speed)
  motionSeverity: MotionSeverity; // Classified tiered severity: 'none' | 'minor' | 'moderate' | 'severe'
  timestamp: number;         // Phone epoch wall-clock timestamp (Date.now())
}

export interface SensorFusionService {
  onSensorEvent(callback: (reading: SensorReading) => void): void;
  start(): void;
  stop(): void;
}

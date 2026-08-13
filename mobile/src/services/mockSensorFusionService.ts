import { SensorReading, SensorFusionService } from './sensorFusionInterface';
import { classifyMotionSeverity } from '../config/motionSeverityConfig';

export class MockSensorFusionService implements SensorFusionService {
  private callbacks: ((reading: SensorReading) => void)[] = [];
  private intervalId: any = null;

  onSensorEvent(callback: (reading: SensorReading) => void): void {
    this.callbacks.push(callback);
  }

  start(): void {
    if (this.intervalId) return;

    this.intervalId = setInterval(() => {
      // Simulate normal driving vibrations
      const accelG = 0.98 + Math.random() * 0.05; // ~1.0g gravity + vehicle bumps
      const gyroDegPerSec = Math.random() * 5.0; // small driving rotations
      const gpsSpeedDropKmh = 0.0;
      const motionSeverity = classifyMotionSeverity(accelG, gyroDegPerSec);
      
      const reading: SensorReading = {
        accelG,
        gyroDegPerSec,
        gpsSpeedDropKmh,
        motionSeverity,
        timestamp: Date.now(),
      };

      this.callbacks.forEach(cb => cb(reading));
    }, 200); // 5 times per second
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Manually trigger a simulated severe crash sensor signature for testing
   */
  triggerSimulatedCrash(): void {
    const accelG = 4.85;          // Massive g-force impact
    const gyroDegPerSec = 260.0;  // Large spin/rollover rotation (>250°/s threshold)
    const gpsSpeedDropKmh = 45.0; // Sudden 45 km/h stop
    const motionSeverity = classifyMotionSeverity(accelG, gyroDegPerSec);

    const reading: SensorReading = {
      accelG,
      gyroDegPerSec,
      gpsSpeedDropKmh,
      motionSeverity,
      timestamp: Date.now(),
    };
    this.callbacks.forEach(cb => cb(reading));
  }
}

export const mockSensorFusionService = new MockSensorFusionService();

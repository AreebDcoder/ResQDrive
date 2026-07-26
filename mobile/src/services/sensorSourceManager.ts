import { store } from '../store/store';
import { setActiveSource, setConnectionStatus } from '../store/slices/sensorSlice';
import { SensorReading, SensorFusionService } from './sensorFusionInterface';
import { bleSensorFusionService } from './bleSensorFusionService';
import { phoneSensorFallbackService } from './phoneSensorFallbackService';

let BleManagerClass: any = null;
try {
  BleManagerClass = require('react-native-ble-plx').BleManager;
} catch (e) {
  console.log('react-native-ble-plx is not natively available.');
}

export class SensorSourceManager implements SensorFusionService {
  private callbacks: ((reading: SensorReading) => void)[] = [];
  private currentActiveService: SensorFusionService | null = null;
  private storeUnsubscribe: (() => void) | null = null;

  // Background retry scan state
  private backgroundScanInterval: any = null;

  onSensorEvent(callback: (reading: SensorReading) => void): void {
    this.callbacks.push(callback);
    // Bind to the current active service immediately
    if (this.currentActiveService) {
      this.currentActiveService.onSensorEvent(callback);
    }
  }

  /**
   * Starts sensor fusion tracking.
   * Begins by trying BLE connection, falling back to Phone sensors if needed.
   */
  start(): void {
    this.stop(); // Stop any active streams first

    // 1. Subscribe to Redux store status changes to manage transition lifecycle
    this.storeUnsubscribe = store.subscribe(() => {
      const { connectionStatus, activeSource } = store.getState().sensor;

      if (activeSource === 'ble' && connectionStatus === 'unavailable') {
        console.log('SensorManager: BLE unavailable. Falling back to Phone sensors...');
        this.switchToPhone();
      }
    });

    // 2. Start with BLE hardware
    this.switchToBle();
  }

  /**
   * Stop active sensors, clean up intervals and Redux listeners
   */
  stop(): void {
    this.clearBackgroundScan();
    
    if (this.storeUnsubscribe) {
      this.storeUnsubscribe();
      this.storeUnsubscribe = null;
    }

    if (this.currentActiveService) {
      this.currentActiveService.stop();
      this.currentActiveService = null;
    }

    store.dispatch(setConnectionStatus('disconnected'));
  }

  private clearBackgroundScan() {
    if (this.backgroundScanInterval) {
      clearInterval(this.backgroundScanInterval);
      this.backgroundScanInterval = null;
    }
  }

  /**
   * Switch the active sensor source to BLE hardware
   */
  private switchToBle() {
    this.clearBackgroundScan();
    if (this.currentActiveService) {
      this.currentActiveService.stop();
    }

    console.log('SensorManager: Activating BLE Hardware sensor service...');
    store.dispatch(setActiveSource('ble'));
    
    this.currentActiveService = bleSensorFusionService;
    
    // Bind all registered callbacks to the new active service
    this.callbacks.forEach(cb => bleSensorFusionService.onSensorEvent(cb));
    
    bleSensorFusionService.start();
  }

  /**
   * Switch the active sensor source to phone fallback sensors and start background scanning
   */
  private switchToPhone() {
    if (this.currentActiveService) {
      this.currentActiveService.stop();
    }

    console.log('SensorManager: Activating Phone Fallback sensor service...');
    store.dispatch(setActiveSource('phone'));
    store.dispatch(setConnectionStatus('unavailable')); // Set status to show phone fallback indicator

    this.currentActiveService = phoneSensorFallbackService;

    // Bind all callbacks to phone fallback service
    this.callbacks.forEach(cb => phoneSensorFallbackService.onSensorEvent(cb));

    phoneSensorFallbackService.start();

    // Start background scanning to restore BLE if it comes back in range
    this.startBackgroundBleScanning();
  }

  /**
   * Periodically scans for ResQDrive BLE service in background to auto-restore connection
   */
  private startBackgroundBleScanning() {
    this.clearBackgroundScan();

    this.backgroundScanInterval = setInterval(() => {
      const state = store.getState().sensor;
      if (state.activeSource !== 'phone') {
        this.clearBackgroundScan();
        return;
      }

      if (!BleManagerClass) return;

      console.log('SensorManager: Running background scan to locate BLE hardware...');
      const bleManager = new BleManagerClass();

      bleManager.startDeviceScan(
        ['4fafc201-1fb5-459e-8fcc-c5c9c331914b'],
        null,
        (error: any, device: any) => {
          if (device) {
            console.log('SensorManager: Located BLE hardware in background! Restoring BLE connection...');
            bleManager.stopDeviceScan();
            bleManager.destroy();

            // Hardware found: switch active service back to BLE
            this.switchToBle();
          }
          if (error) {
            bleManager.stopDeviceScan();
            bleManager.destroy();
          }
        }
      );

      // Stop scan after 5 seconds to conserve battery
      setTimeout(() => {
        try {
          bleManager.stopDeviceScan();
          bleManager.destroy();
        } catch (e) {}
      }, 5000);

    }, 30000); // Scan every 30 seconds
  }

  /**
   * Manual force reconnect trigger for development/diagnostics screen
   */
  forceReconnect() {
    console.log('SensorManager: Manual force reconnect triggered.');
    this.switchToBle();
  }
}

export const sensorSourceManager = new SensorSourceManager();
export default sensorSourceManager;

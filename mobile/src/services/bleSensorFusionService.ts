import { store } from '../store/store';
import { setConnectionStatus, updateLatestReading } from '../store/slices/sensorSlice';
import { SensorReading, SensorFusionService } from './sensorFusionInterface';
import { classifyMotionSeverity } from '../config/motionSeverityConfig';

let BleManagerClass: any = null;
try {
  BleManagerClass = require('react-native-ble-plx').BleManager;
} catch (e) {
  console.log('react-native-ble-plx is not natively available.');
}

const SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
const CHARACTERISTIC_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';
const DEVICE_NAME = 'ResQDrive-Sensor';

export class BleSensorFusionService implements SensorFusionService {
  private manager: any = null;
  private connectedDevice: any = null;
  private notificationSubscription: any = null;
  private callbacks: ((reading: SensorReading) => void)[] = [];
  
  // Speed drop tracking
  private speedBuffer: number[] = [];
  private lastGpsSpeedDrop = 0;

  // Reconnection state
  private isScanningOrConnecting = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimer: any = null;

  constructor() {
    if (BleManagerClass) {
      this.manager = new BleManagerClass();
    }
  }

  onSensorEvent(callback: (reading: SensorReading) => void): void {
    this.callbacks.push(callback);
  }

  /**
   * Starts BLE scanning and connects automatically
   */
  start(): void {
    if (this.isScanningOrConnecting || this.connectedDevice) return;
    this.isScanningOrConnecting = true;
    this.reconnectAttempts = 0;

    store.dispatch(setConnectionStatus('connecting'));
    if (!this.manager) {
      console.log('BLE: BleManager is not supported or initialized on this device.');
      this.handleConnectionFailure();
      return;
    }
    this.scanAndConnect();
  }

  /**
   * Stop monitoring, unsubscribe, and disconnect device cleanly
   */
  stop(): void {
    this.isScanningOrConnecting = false;
    this.clearTimers();
    if (this.manager) {
      this.manager.stopDeviceScan();
    }

    if (this.notificationSubscription) {
      this.notificationSubscription.remove();
      this.notificationSubscription = null;
    }

    if (this.connectedDevice) {
      this.connectedDevice.cancelConnection()
        .catch((err: any) => console.log('BLE Disconnect ignored:', err.message));
      this.connectedDevice = null;
    }

    store.dispatch(setConnectionStatus('disconnected'));
  }

  private clearTimers() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private scanAndConnect() {
    console.log('BLE: Starting scan for ResQDrive Service...');
    
    this.manager.startDeviceScan(
      [SERVICE_UUID], 
      { allowDuplicates: false }, 
      async (error: any, device: any) => {
        if (error) {
          console.log('BLE Scan error:', error.message);
          this.handleConnectionFailure();
          return;
        }

        if (device) {
          // Primary match is service UUID, secondary/tie-breaker is device name
          const isNameMatch = device.name === DEVICE_NAME;
          console.log(`BLE Found device: ${device.name} (${device.id}), Match: ${isNameMatch}`);
          
          this.manager.stopDeviceScan();
          this.connectToDevice(device);
        }
      }
    );
  }

  private async connectToDevice(device: any) {
    try {
      console.log(`BLE: Connecting to ${device.name || 'ResQDrive-Sensor'}...`);
      const connected = await device.connect();
      this.connectedDevice = connected;
      
      console.log('BLE: Discovering services and characteristics...');
      await connected.discoverAllServicesAndCharacteristics();
      
      console.log('BLE: Subscribing to characteristics notifications...');
      this.subscribeToNotifications(connected);

      // Successfully connected: reset attempts and set Redux state
      this.reconnectAttempts = 0;
      store.dispatch(setConnectionStatus('connected'));

      // Listen for unexpected device disconnects
      device.onDisconnected((err: any, disconnectedDevice: any) => {
        console.log('BLE: Device disconnected unexpectedly.');
        this.handleDisconnect();
      });

    } catch (err: any) {
      console.log('BLE: Connection failed:', err.message);
      this.handleConnectionFailure();
    }
  }

  private subscribeToNotifications(device: any) {
    this.notificationSubscription = device.monitorCharacteristicForService(
      SERVICE_UUID,
      CHARACTERISTIC_UUID,
      (error: any, characteristic: any) => {
        if (error) {
          console.log('BLE notification error:', error.message);
          return;
        }
        if (characteristic?.value) {
          this.parseAndBroadcast(characteristic.value);
        }
      }
    );
  }

  private parseAndBroadcast(base64Value: string) {
    try {
      // Decode Base64 payload
      const jsonString = base64ToString(base64Value);
      const payload = JSON.parse(jsonString);

      const { accelX, accelY, accelZ, gyroX, gyroY, gyroZ, speedKmh, gpsFix } = payload;

      // 1. Collapse 3-axis accelerometer values into a single scalar magnitude (g-forces)
      const accelG = Math.sqrt(accelX * accelX + accelY * accelY + accelZ * accelZ);

      // 2. Collapse 3-axis gyroscope values into rotation magnitude (degrees per second)
      const gyroDegPerSec = Math.sqrt(gyroX * gyroX + gyroY * gyroY + gyroZ * gyroZ);

      // 3. Compute GPS Speed Drop over a 5-reading rolling buffer
      let gpsSpeedDropKmh = this.lastGpsSpeedDrop;
      if (gpsFix) {
        this.speedBuffer.push(speedKmh);
        if (this.speedBuffer.length > 5) {
          this.speedBuffer.shift();
        }
        const maxSpeed = Math.max(...this.speedBuffer);
        gpsSpeedDropKmh = Math.max(0, maxSpeed - speedKmh);
        this.lastGpsSpeedDrop = gpsSpeedDropKmh;
      }

      const motionSeverity = classifyMotionSeverity(accelG, gyroDegPerSec);

      const reading: SensorReading = {
        accelG,
        gyroDegPerSec,
        gpsSpeedDropKmh,
        motionSeverity,
        timestamp: Date.now(), // Wall clock timestamp from phone
      };

      // Update Redux state and notify callbacks
      store.dispatch(updateLatestReading(reading));
      this.callbacks.forEach(cb => cb(reading));
    } catch (e: any) {
      console.log('BLE parse error:', e.message);
    }
  }

  private handleDisconnect() {
    this.connectedDevice = null;
    if (this.notificationSubscription) {
      this.notificationSubscription.remove();
      this.notificationSubscription = null;
    }
    this.handleConnectionFailure();
  }

  private handleConnectionFailure() {
    this.clearTimers();
    if (this.manager) {
      this.manager.stopDeviceScan();
    } else {
      console.log('BLE: BleManager is missing. Skipping retries, marking as unavailable.');
      this.isScanningOrConnecting = false;
      store.dispatch(setConnectionStatus('unavailable'));
      return;
    }

    if (this.reconnectAttempts === 0) {
      // Attempt 1: Reconnect immediately
      this.reconnectAttempts++;
      console.log('BLE: Retrying connection immediately...');
      store.dispatch(setConnectionStatus('connecting'));
      this.scanAndConnect();
    } else if (this.reconnectAttempts < this.maxReconnectAttempts) {
      // Attempts 2-10: Reconnect every 3 seconds
      this.reconnectAttempts++;
      console.log(`BLE: Retrying connection in 3 seconds (Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      store.dispatch(setConnectionStatus('connecting'));
      
      this.reconnectTimer = setTimeout(() => {
        this.scanAndConnect();
      }, 3000);
    } else {
      // Retries exhausted: fail gracefully and surface "unavailable" status
      console.log('BLE: Connection retries exhausted. BLE is unavailable.');
      this.isScanningOrConnecting = false;
      store.dispatch(setConnectionStatus('unavailable'));
    }
  }
}

function base64ToString(base64: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const lookup = new Uint8Array(256);
  for (let i = 0; i < chars.length; i++) {
    lookup[chars.charCodeAt(i)] = i;
  }

  let bufferLength = base64.length * 0.75;
  if (base64[base64.length - 1] === '=') {
    bufferLength--;
    if (base64[base64.length - 2] === '=') {
      bufferLength--;
    }
  }

  let str = '';
  for (let i = 0; i < base64.length; i += 4) {
    const base64code1 = lookup[base64.charCodeAt(i)];
    const base64code2 = lookup[base64.charCodeAt(i + 1)];
    const base64code3 = lookup[base64.charCodeAt(i + 2)];
    const base64code4 = lookup[base64.charCodeAt(i + 3)];

    const b1 = (base64code1 << 2) | (base64code2 >> 4);
    str += String.fromCharCode(b1);
    
    if (str.length < bufferLength) {
      const b2 = ((base64code2 & 15) << 4) | (base64code3 >> 2);
      str += String.fromCharCode(b2);
    }
    if (str.length < bufferLength) {
      const b3 = ((base64code3 & 3) << 6) | (base64code4 & 63);
      str += String.fromCharCode(b3);
    }
  }

  return str;
}

export const bleSensorFusionService = new BleSensorFusionService();

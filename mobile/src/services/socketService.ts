import { io, Socket } from 'socket.io-client';
import { Platform } from 'react-native';

const getSocketUrl = () => {
  if (Platform.OS === 'web') return 'http://localhost:3000';
  return process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
};

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(getSocketUrl(), {
      path: '/socket.io/',
      transports: ['websocket', 'polling'],
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket?.id);
    });
    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });
    socket.on('connect_error', (err) => {
      console.error('[Socket] Connect error:', err.message);
    });
  }
  return socket;
}

export function connectSocket(): Promise<Socket> {
  const s = getSocket();
  if (s.connected) return Promise.resolve(s);
  return new Promise((resolve) => {
    const onConnect = () => {
      s.off('connect', onConnect);
      resolve(s);
    };
    s.on('connect', onConnect);
    s.connect();
  });
}

export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners();
    if (socket.connected) socket.disconnect();
    socket = null;
  }
}

export function emitLocationUpdate(sessionId: string, lat: number, lng: number) {
  const s = getSocket();
  if (s.connected) {
    s.emit('location_update', { sessionId, lat, lng });
    console.log('[Socket] Emitted location_update:', { sessionId, lat: lng });
  } else {
    console.warn('[Socket] Not connected — dropping location update');
  }
}
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { LocationSharingService } from './location-sharing.service';

@WebSocketGateway({
  cors: { origin: true, credentials: true },
})
export class LocationSharingGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(LocationSharingGateway.name);

  constructor(private locationService: LocationSharingService) {}

  async handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    for (const room of client.rooms) {
      if (room.startsWith('session:')) {
        this.server.to(room).emit('viewer_count', {
          session: room.replace('session:', ''),
          viewers: this.getViewerCount(room),
        });
      }
    }
  }

  @SubscribeMessage('join_session')
  async handleJoinSession(
    @MessageBody() data: { shareToken: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const session = await this.locationService.getSessionByShareToken(data.shareToken);
      const roomName = `session:${session.shareToken}`;
      await client.join(roomName);
      client.data.shareToken = data.shareToken;
      client.data.roomName = roomName;

      if (session.lastLat != null && session.lastLng != null) {
        client.emit('location_broadcast', {
          lat: session.lastLat,
          lng: session.lastLng,
          updatedAt: session.lastUpdateAt,
        });
      }

      this.server.to(roomName).emit('viewer_count', {
        session: data.shareToken,
        viewers: this.getViewerCount(roomName),
      });

      this.logger.log(`Client ${client.id} joined session ${data.shareToken}`);
    } catch (err) {
      client.emit('error', { message: 'Invalid or expired session' });
    }
  }

  @SubscribeMessage('location_update')
  async handleLocationUpdate(
    @MessageBody() data: { sessionId: string; lat: number; lng: number },
    @ConnectedSocket() client: Socket,
  ) {
    const updated = await this.locationService.updateLocation(
      data.sessionId,
      data.lat,
      data.lng,
    );
    if (!updated) {
      client.emit('error', { message: 'Session not active' });
      return;
    }

    const roomName = `session:${updated.shareToken}`;
    this.server.to(roomName).emit('location_broadcast', {
      lat: data.lat,
      lng: data.lng,
      updatedAt: new Date().toISOString(),
    });
  }

  @SubscribeMessage('leave_session')
  async handleLeaveSession(
    @MessageBody() data: { shareToken: string },
    @ConnectedSocket() client: Socket,
  ) {
    const roomName = `session:${data.shareToken}`;
    await client.leave(roomName);
    this.server.to(roomName).emit('viewer_count', {
      session: data.shareToken,
      viewers: this.getViewerCount(roomName),
    });
  }

  broadcastSessionEnded(shareToken: string) {
    const roomName = `session:${shareToken}`;
    this.server.to(roomName).emit('session_ended', { shareToken });
    this.server.in(roomName).socketsLeave(roomName);
  }

  private getViewerCount(roomName: string): number {
    const room = this.server.sockets.adapter.rooms.get(roomName);
    return room ? room.size : 0;
  }
}
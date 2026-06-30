import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';

// F-873: WebSocket-Gateway für Echtzeit-Ereignisse
@WebSocketGateway({ cors: true, namespace: '/realtime' })
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(RealtimeGateway.name);
  private readonly connectedUsers = new Map<string, string>(); // socketId → userId

  constructor(private readonly jwt: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token ?? client.handshake.headers?.authorization?.replace('Bearer ', '');
      if (token) {
        const payload = this.jwt.verify<{ sub: string }>(token);
        this.connectedUsers.set(client.id, payload.sub);
        await client.join(`user:${payload.sub}`);
        this.logger.debug(`User ${payload.sub} connected`);
      }
    } catch {
      // Anonymous connection — still allowed for public events
    }
  }

  handleDisconnect(client: Socket) {
    this.connectedUsers.delete(client.id);
  }

  // Emit to a specific user (call this from other services)
  emitToUser(userId: string, event: string, data: unknown) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  // Emit to all connected clients
  broadcast(event: string, data: unknown) {
    this.server.emit(event, data);
  }

  // F-873: Subscribe to specific events
  @SubscribeMessage('subscribe')
  handleSubscribe(client: Socket, events: string[]) {
    events.forEach((ev) => client.join(`event:${ev}`));
    return { subscribed: events };
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(client: Socket, events: string[]) {
    events.forEach((ev) => client.leave(`event:${ev}`));
    return { unsubscribed: events };
  }

  // F-873: Ping/Pong keepalive
  @SubscribeMessage('ping')
  handlePing() {
    return { type: 'pong', timestamp: new Date().toISOString() };
  }
}

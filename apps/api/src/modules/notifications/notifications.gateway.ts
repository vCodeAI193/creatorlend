import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/ws' })
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private userSockets = new Map<string, string[]>();

  constructor(private readonly jwt: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth as Record<string, string> | undefined)?.token ??
        client.handshake.headers?.authorization?.replace('Bearer ', '');
      const payload = this.jwt.verify<{ sub: string }>(token as string);
      client.data.userId = payload.sub;
      const sockets = this.userSockets.get(payload.sub) ?? [];
      this.userSockets.set(payload.sub, [...sockets, client.id]);
      await client.join(`user:${payload.sub}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId as string | undefined;
    if (userId) {
      const remaining = (this.userSockets.get(userId) ?? []).filter((id) => id !== client.id);
      if (remaining.length) this.userSockets.set(userId, remaining);
      else this.userSockets.delete(userId);
    }
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() _client: Socket) {
    return { event: 'pong', data: { time: Date.now() } };
  }

  sendToUser(userId: string, event: string, data: unknown) {
    this.server.to(`user:${userId}`).emit(event, data);
  }
}

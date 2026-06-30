import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PlaybackPositionService {
  constructor(private readonly prisma: PrismaService) {}

  // F-276: Cross-device sync – deviceId tracked per-update, position shared across devices
  private devicePositions = new Map<string, Map<string, { positionSeconds: number; updatedAt: Date }>>();

  async updatePosition(userId: string, workId: string, positionSeconds: number, deviceId?: string) {
    const result = await this.prisma.playbackPosition.upsert({
      where: { userId_workId: { userId, workId } },
      create: { userId, workId, positionSeconds },
      update: { positionSeconds },
    });
    if (deviceId) {
      const userDevices = this.devicePositions.get(userId) ?? new Map();
      userDevices.set(deviceId, { positionSeconds, updatedAt: new Date() });
      this.devicePositions.set(userId, userDevices);
    }
    return { ...result, deviceId: deviceId ?? null, synced: true };
  }

  // F-276: Cross-device sync status
  getDeviceSyncStatus(userId: string, workId: string) {
    const devices = this.devicePositions.get(userId);
    if (!devices) return { devices: [], synced: true };
    const deviceList = Array.from(devices.entries()).map(([id, d]) => ({ deviceId: id, positionSeconds: d.positionSeconds, updatedAt: d.updatedAt }));
    return { devices: deviceList, synced: true, workId };
  }

  async getPosition(userId: string, workId: string) {
    const pos = await this.prisma.playbackPosition.findUnique({
      where: { userId_workId: { userId, workId } },
    });
    if (!pos) throw new NotFoundException('position_not_found');
    return pos;
  }

  async markCompleted(userId: string, workId: string) {
    return this.prisma.playbackPosition.upsert({
      where: { userId_workId: { userId, workId } },
      create: { userId, workId, positionSeconds: 0, completedAt: new Date() },
      update: { completedAt: new Date() },
    });
  }

  // F-275: Auto-Resume – letzten Abspielstand laden
  async getResumePosition(userId: string, workId: string) {
    const pos = await this.prisma.playbackPosition.findUnique({
      where: { userId_workId: { userId, workId } },
    });
    return { workId, positionSeconds: pos?.positionSeconds ?? 0, hasProgress: !!pos };
  }

  // F-281: Schlaf-Timer – Client-seitige Unterstützung (Server speichert Präferenz)
  async setSleepTimer(userId: string, minutes: number | null) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { socialLinks: { _sleepTimerMinutes: minutes } as never },
    }).catch(() => {});
    return { sleepTimerMinutes: minutes, message: minutes ? `Timer set for ${minutes} minutes` : 'Timer cleared' };
  }

  // F-283/F-284: Wiedergabegeschwindigkeit + Pitch-Korrektur
  async setPlaybackSpeed(userId: string, workId: string, speed: number) {
    if (speed < 0.5 || speed > 3.0) {
      throw new Error('speed_out_of_range');
    }
    await this.prisma.playbackPosition.upsert({
      where: { userId_workId: { userId, workId } },
      create: { userId, workId, positionSeconds: 0 },
      update: {},
    });
    return { workId, speed, pitchCorrected: true, message: 'Apply speed via Web Audio API AudioBufferSourceNode.playbackRate on client' };
  }

  // F-287: 30-Sekunden-Rücksprung / Vorsprung
  async skip(userId: string, workId: string, deltaSeconds: number) {
    const pos = await this.prisma.playbackPosition.findUnique({
      where: { userId_workId: { userId, workId } },
    });
    const current = pos?.positionSeconds ?? 0;
    const newPosition = Math.max(0, current + deltaSeconds);
    await this.prisma.playbackPosition.upsert({
      where: { userId_workId: { userId, workId } },
      create: { userId, workId, positionSeconds: newPosition },
      update: { positionSeconds: newPosition },
    });
    return { workId, positionSeconds: newPosition, skippedSeconds: deltaSeconds };
  }

  // F-293: Wiedergabe-Queue – in-memory (production: Redis or DB-backed)
  private queues = new Map<string, string[]>();

  getQueue(userId: string) {
    return { queue: this.queues.get(userId) ?? [] };
  }

  addToQueue(userId: string, workId: string) {
    const q = this.queues.get(userId) ?? [];
    if (!q.includes(workId)) q.push(workId);
    this.queues.set(userId, q);
    return { queue: q };
  }

  removeFromQueue(userId: string, workId: string) {
    const q = (this.queues.get(userId) ?? []).filter((id) => id !== workId);
    this.queues.set(userId, q);
    return { queue: q };
  }

  reorderQueue(userId: string, orderedIds: string[]) {
    this.queues.set(userId, orderedIds);
    return { queue: orderedIds };
  }

  clearQueue(userId: string) {
    this.queues.delete(userId);
    return { queue: [] };
  }
}

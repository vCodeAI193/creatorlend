import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

export interface TrackUtmDto {
  source: string;
  medium?: string;
  campaign?: string;
  workId?: string;
  userId?: string;
}

/** F-441: UTM click tracking. */
@Injectable()
export class UtmService {
  constructor(private readonly prisma: PrismaService) {}

  async track(data: TrackUtmDto) {
    return this.prisma.utmClick.create({
      data: {
        source: data.source,
        medium: data.medium,
        campaign: data.campaign,
        workId: data.workId,
        userId: data.userId,
      },
    });
  }
}

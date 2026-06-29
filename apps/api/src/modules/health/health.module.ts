import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";

@Module({
  controllers: [HealthController],
  // PrismaService is provided globally via PrismaModule
})
export class HealthModule {}

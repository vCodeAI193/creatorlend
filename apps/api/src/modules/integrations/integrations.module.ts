import { Module } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { AdminIntegrationsController, IntegrationsController } from './integrations.controller';

@Module({
  controllers: [IntegrationsController, AdminIntegrationsController],
  providers: [IntegrationsService],
})
export class IntegrationsModule {}

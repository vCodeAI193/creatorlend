import { Module } from '@nestjs/common';
import { InfraService } from './infra.service';
import { InfraController } from './infra.controller';

@Module({
  controllers: [InfraController],
  providers: [InfraService],
  exports: [InfraService],
})
export class InfraModule {}

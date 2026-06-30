import { Module } from '@nestjs/common';
import { MobileService } from './mobile.service';
import { MobileController } from './mobile.controller';

@Module({
  controllers: [MobileController],
  providers: [MobileService],
})
export class MobileModule {}

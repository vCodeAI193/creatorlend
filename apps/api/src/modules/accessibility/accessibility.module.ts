import { Module } from '@nestjs/common';
import { AccessibilityService } from './accessibility.service';
import { AccessibilityController } from './accessibility.controller';

@Module({
  controllers: [AccessibilityController],
  providers: [AccessibilityService],
})
export class AccessibilityModule {}

import { Controller, Get } from '@nestjs/common';
import { AccessibilityService } from './accessibility.service';

// F-981-F-988: Barrierefreiheits-Endpunkte
@Controller('accessibility')
export class AccessibilityController {
  constructor(private readonly a11y: AccessibilityService) {}

  // F-988: Barrierefreiheitserklärung (BITV 2.0)
  @Get('declaration')
  declaration() {
    return this.a11y.getDeclaration();
  }

  // F-981: WCAG-Status
  @Get('wcag-status')
  wcagStatus() {
    return this.a11y.getWcagStatus();
  }

  // F-984: Tastaturkürzel
  @Get('keyboard-shortcuts')
  keyboardShortcuts() {
    return this.a11y.getKeyboardShortcuts();
  }

  // F-986: ARIA-Live-Regions
  @Get('aria-config')
  ariaConfig() {
    return this.a11y.getAriaConfig();
  }
}

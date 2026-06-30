import { Injectable } from '@nestjs/common';

// F-981-F-988: WCAG 2.2 / Barrierefreiheit
@Injectable()
export class AccessibilityService {
  // F-988: Barrierefreiheitserklärung (BITV 2.0)
  getDeclaration() {
    return {
      organization: 'CreatorLend GmbH',
      standard: 'WCAG 2.2 Level AA',
      conformanceStatus: 'partial',
      scope: 'https://app.creatorlend.com',
      lastReviewed: '2025-01-01',
      knownIssues: [
        { id: 'A-001', description: 'Audio-Player benötigt vollständige Tastatursteuerung', wcagCriteria: '2.1.1', priority: 'high' },
        { id: 'A-002', description: 'Einige Diagramme fehlen Textalternativen', wcagCriteria: '1.1.1', priority: 'medium' },
      ],
      contactEmail: 'accessibility@creatorlend.com',
      feedbackUrl: 'https://creatorlend.com/accessibility-feedback',
      enforcementProcedure: 'Ombudsperson für barrierefreie Informationstechnik',
      legalBasis: 'BITV 2.0 / EN 301 549',
    };
  }

  // F-981: WCAG-Compliance-Status
  getWcagStatus() {
    return {
      level: 'AA',
      version: '2.2',
      criteria: {
        perceivable: { status: 'partial', score: 0.82 },
        operable: { status: 'partial', score: 0.78 },
        understandable: { status: 'meets', score: 0.91 },
        robust: { status: 'meets', score: 0.95 },
      },
      overall: 'partial',
      automatedTestsPassed: true, // axe-core in CI (F-982)
      lastAuditDate: '2025-01-01',
    };
  }

  // F-984: Keyboard-Shortcuts-Dokumentation
  getKeyboardShortcuts() {
    return {
      global: [
        { keys: ['Alt+1'], action: 'Zur Hauptnavigation' },
        { keys: ['Alt+2'], action: 'Zum Hauptinhalt (F-985 Skip Nav)' },
        { keys: ['Alt+3'], action: 'Zur Suche' },
        { keys: ['Escape'], action: 'Dialog schließen / Menü schließen' },
      ],
      player: [
        { keys: ['Space'], action: 'Play / Pause' },
        { keys: ['ArrowLeft'], action: '10 Sekunden zurück' },
        { keys: ['ArrowRight'], action: '10 Sekunden vor' },
        { keys: ['m'], action: 'Stummschalten' },
        { keys: ['ArrowUp'], action: 'Lautstärke erhöhen' },
        { keys: ['ArrowDown'], action: 'Lautstärke verringern' },
      ],
    };
  }

  // F-986: ARIA-Live-Regions Konfiguration
  getAriaConfig() {
    return {
      liveRegions: [
        { id: 'notification-area', politeness: 'polite', atomic: true, label: 'Benachrichtigungen' },
        { id: 'player-status', politeness: 'polite', atomic: false, label: 'Player-Status' },
        { id: 'search-results', politeness: 'polite', atomic: true, label: 'Suchergebnisse' },
        { id: 'error-area', politeness: 'assertive', atomic: true, label: 'Fehlermeldungen' },
      ],
    };
  }
}

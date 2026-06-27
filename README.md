# CreatorLend

> Faire Vergütung für Kreative. **Ein Werk = eine Woche = eine faire Bezahlung.**

CreatorLend ist eine Plattform, auf der Hörer:innen kreative Werke
(Musik, Podcasts, Hörbücher, Sketche) für eine Woche **leihen** statt sie
endlos zu streamen. Jede Ausleihe vergütet die Künstler:innen direkt und
transparent – kein „pro Play", sondern „pro Leihe".

Die ausführliche Produktvision steht in [`VISION.md`](./VISION.md).

---

## Kernidee

- Nutzer:innen schließen ein **Abo** ab und erhalten ein Kontingent an Ausleihen.
- Sie **leihen ein Werk für 7 Tage** aus.
- Für **jede Ausleihe** wird die/der Künstler:in **fair und direkt** vergütet.
- Ausleihen lassen sich **verlängern** oder gegen ein anderes Werk **tauschen**.

---

## Technologie-Stack

| Schicht | Technologie |
| --- | --- |
| Sprache | TypeScript (durchgängig) |
| Monorepo | pnpm Workspaces + Turborepo |
| Frontend | Next.js (React, App Router) |
| Backend | NestJS (Node.js) |
| Datenbank | PostgreSQL + Prisma |
| Cache / Jobs | Redis + BullMQ |
| Zahlungen | Stripe (Billing + Connect) |
| Medien | S3-kompatibler Object Storage (AWS S3 / Cloudflare R2) + CDN |
| Infra | Docker / Docker Compose, Cloud-ready |

Begründung der Stack-Wahl: siehe [`VISION.md`](./VISION.md#5-technologie-stack).

---

## Projektstruktur

```
creatorlend/
├── apps/
│   ├── web/                 # Next.js Web-App
│   └── api/                 # NestJS API + Prisma
├── packages/
│   └── shared/              # Geteilte Typen, DTOs, Konstanten
├── docs/
│   ├── architecture.md      # Komponenten & Diagramme
│   └── api-design.md        # REST-Endpunkt-Entwurf
├── VISION.md
├── docker-compose.yml
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

---

## Setup (Platzhalter)

> Die folgenden Schritte sind ein Gerüst und werden im Laufe der
> Implementierung konkretisiert.

### Voraussetzungen
- Node.js >= 20
- pnpm >= 9
- Docker & Docker Compose

### Installation
```bash
# 1. Abhängigkeiten installieren
pnpm install

# 2. Umgebungsvariablen anlegen
cp .env.example .env
# -> Werte (DB, Redis, Stripe, Storage) ausfüllen

# 3. Infrastruktur lokal starten (Postgres, Redis)
docker compose up -d

# 4. Prisma-Client generieren + Datenbank-Migrationen ausführen
pnpm --filter @creatorlend/api prisma generate
pnpm --filter @creatorlend/api prisma migrate dev

# 5. (Optional) Seed-Daten einspielen (1 Artist, 1 Listener, 3 Werke)
pnpm --filter @creatorlend/api db:seed

# 6. Entwicklung starten (Web + API parallel via Turborepo)
pnpm dev
```

### Nützliche Befehle
```bash
pnpm dev        # Alle Apps im Watch-Modus
pnpm build      # Alles bauen
pnpm lint       # Linting
pnpm test       # Unit-Tests

# API-spezifisch
pnpm --filter @creatorlend/api test       # Unit-Tests (Prisma gemockt)
pnpm --filter @creatorlend/api test:e2e   # e2e-Test des Kern-Loops (benötigt DB)
pnpm --filter @creatorlend/api db:seed     # Seed-Daten
```

### Kern-Loop (MVP)
Der zentrale Ablauf ist end-to-end implementiert und durch Unit- und
e2e-Tests abgesichert:

1. `POST /api/v1/auth/register` → Token (LISTENER bzw. ARTIST)
2. `POST /api/v1/subscriptions/activate` → Abo aktivieren (Dev, ohne Stripe)
3. `POST /api/v1/works` + `POST /api/v1/works/:id/publish` → Werk veröffentlichen
4. `POST /api/v1/loans` → Werk für 7 Tage leihen (signierte Stream-URL)
5. `POST /api/v1/loans/:id/renew` / `/exchange` → verlängern / tauschen
6. `GET /api/v1/payouts/summary` → aufgelaufene Künstlervergütung

Echte Stripe-Integration ist für Phase 2/3 vorgesehen; im MVP wird das
Abo per Dev-Endpoint aktiviert.

### Phase 2 (Beta) – umgesetzt
Aufbauend auf dem Kern-Loop, mit Unit- und e2e-Tests abgesichert:

- **Hintergrund-Scheduler** (`@nestjs/schedule`, stündlich): Ablauf von
  Leihen + Erinnerung kurz vor Ablauf + Kontingent-Reset (F-052, F-060, F-082)
- **In-App-Benachrichtigungen** (F-082–F-084): `GET /notifications`,
  `GET /notifications/unread-count`, `POST /notifications/:id/read`,
  `POST /notifications/read-all`
- **Discovery-Ausbau** (F-027, F-041, F-042): `GET /works` mit
  `type`, `q`, `language`, `category`, `sort=new|popular`
- **Engagement**: Favoriten (F-016) `POST/DELETE/GET /favorites` und
  Folgen (F-017) `POST/DELETE/GET /follows`

Noch offen für Phase 2/3: echte Stripe-Integration (Checkout + Connect),
Umstellung des Schedulers auf BullMQ/Redis für verteilte Skalierung,
E-Mail-Benachrichtigungen und die Web-UI.

---

## Dokumentation

- [Vision](./VISION.md)
- [Architektur](./docs/architecture.md)
- [API-Design](./docs/api-design.md)

---

## Lizenz

MIT – siehe [`LICENSE`](./LICENSE).

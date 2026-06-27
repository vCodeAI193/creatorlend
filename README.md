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

# 4. Datenbank-Migrationen ausführen
pnpm --filter @creatorlend/api prisma migrate dev

# 5. Entwicklung starten (Web + API parallel via Turborepo)
pnpm dev
```

### Nützliche Befehle
```bash
pnpm dev        # Alle Apps im Watch-Modus
pnpm build      # Alles bauen
pnpm lint       # Linting
pnpm test       # Tests
```

---

## Dokumentation

- [Vision](./VISION.md)
- [Architektur](./docs/architecture.md)
- [API-Design](./docs/api-design.md)

---

## Lizenz

MIT – siehe [`LICENSE`](./LICENSE).

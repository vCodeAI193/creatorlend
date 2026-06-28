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

Das Abo kann im MVP per Dev-Endpoint aktiviert werden; mit konfiguriertem
Stripe (siehe unten) läuft der echte Checkout-/Webhook-Pfad.

### Phase 7 (Beta-Increment) – umgesetzt
Aufbauend auf Phase 6:

- **Sessions & Remote-Logout** (B-008): `GET /users/sessions` – aktive Refresh-Token-Sessions;
  `DELETE /users/sessions/:id` – widerruft die gesamte Token-Familie.
- **Öffentliches Künstler-Profil** (B-013): `GET /users/:id/profile` – Bio, Avatar, Werke,
  Follower-Zahl. Auch per Slug (B-017): `GET /users/slug/:slug`.
- **Profilfelder erweitert** (B-014, B-016): `PATCH /users/me` akzeptiert jetzt
  `avatarUrl`, `bio`, `slug` (unique), `socialLinks` (JSON mit Website/Social-URLs).
- **Onboarding-Checkliste** (B-019): `GET /users/me/onboarding` – 5 Schritte
  (Bio, Avatar, erstes Werk, veröffentlicht, Stripe verbunden).
- **Tags & Explicit-Flag** (B-036, B-038): `tags: string[]` und `explicit: boolean`
  beim Anlegen/Aktualisieren von Werken; Filteroption `?explicit=false` schließt
  explizite Inhalte aus.
- **Facetten-Filter** (B-061): `?minPrice`, `?maxPrice`, `?minDuration`, `?maxDuration`,
  `?tags` (kommasepariert) auf `GET /works`.
- **Sortierung erweitert** (B-071): `?sort=price_asc|price_desc|duration_asc|duration_desc`
  zusätzlich zu `new` und `popular`.
- **Trending** (B-063): `GET /works/trending` – Top-20 Werke der letzten 7 Tage
  (Raw-Query auf Loan-Tabelle).
- **Ähnliche Werke** (B-065): `GET /works/:id/similar` – gleicher Typ + Kategorie.
- **Bewertungen & Rezensionen** (B-129, B-130, B-131): `POST /ratings`, `POST /reviews`,
  `GET /works/:id/ratings`, `GET /works/:id/reviews`; Admin kann via
  `POST /admin/reviews/:id/hide` moderieren.
- **Audit-Log** (B-155): Admin-Aktionen (Suspend, Unsuspend, Moderate, Hide-Review)
  werden in `AuditLog`-Tabelle protokolliert; `GET /admin/audit-log`.
- **CI-Pipeline** (B-177): `.github/workflows/ci.yml` – Lint → Build → Unit-Tests
  gegen PostgreSQL-Service-Container.
- **Schema-Migration** `ratings_reviews_audit_slug`: `User.slug`, `User.socialLinks`,
  `Rating`-, `Review`-, `AuditLog`-Modelle.

### Phase 6 (Beta-Increment) – umgesetzt
Aufbauend auf Phase 5:

- **Episoden/Kapitel** (B-033): `POST/GET/DELETE /works/:id/episodes` –
  mehrteilige Werke mit sortierten Episoden (unique workId×number). `Episode`-
  Modell in Prisma.
- **Vorschau-URL** (B-043): `Work.previewKey`-Feld; `GET /works/:id` enthält
  jetzt `preview: { streamUrl, expiresAt }` (30-Minuten-Token, kostenfrei).
- **Erweiterte Suche** (B-059): `?q=...` durchsucht jetzt Titel UND Beschreibung.
- **Tausch-Quoten** (B-078): `POST /loans/:id/exchange { countsAgainstQuota }` –
  Standardmäßig kein Kontingentverbrauch beim Tausch; opt-in steuerbar.
- **Idempotenz-Keys** (B-111): Stripe Checkout + Transfer nutzen jetzt
  Idempotency-Keys, um Doppel-Operationen bei Retries zu verhindern.
- **Webhook-Dedup** (B-112): `POST /webhooks/stripe` prüft `StripeWebhookEvent`-
  Tabelle vor Verarbeitung; jedes `evt_...` wird nur einmal verarbeitet.
- **Schema-Migration** `episodes_preview_webhook_dedup`: `Episode`-Modell,
  `Work.previewKey`, `StripeWebhookEvent`-Tabelle.

### Phase 5 (Beta-Increment) – umgesetzt
Aufbauend auf Phase 4:

- **DSGVO-Export** (B-011): `GET /users/me/export` – alle personenbezogenen
  Daten des Nutzers als JSON (Profil, Leihen, Favoriten, Follows,
  Benachrichtigungen). Passwort-Hashes werden nicht exportiert.
- **Billing-Portal** (B-091): `POST /subscriptions/billing-portal` – Stripe
  Billing Portal URL für Zahlungsmethoden/Rechnungen; Dev-Fallback wenn
  kein Stripe-Kunde vorhanden.
- **Payout-Mindestbetrag** (B-099): `PAYOUT_MINIMUM_CENTS`-Umgebungsvariable
  (Default 500 ct = 5 €). `withdraw()` wirft 400 wenn Betrag darunter liegt.
- **Automatische Auszahlungen** (B-100): `PayoutsScheduler` läuft täglich
  Mitternacht, zahlt alle Künstler:innen mit Guthaben ≥ Minimum aus.
- **Folge-Benachrichtigung** (B-126): Beim Veröffentlichen eines Werks
  (`publish()`) werden alle Follower:innen via In-App-Notification (Typ
  `NEW_WORK`) informiert.

### Phase 4 (Beta-Increment) – umgesetzt
Aufbauend auf Phase 3:

- **Admin-Rolle & Backoffice** (B-151, B-152, B-154): Neues `AdminModule`.
  `GET /admin/stats` – Plattform-Übersicht; `GET /admin/users` – Nutzerliste
  mit Paginierung; `POST /admin/users/:id/suspend|unsuspend` – Nutzer sperren/
  reaktivieren; `POST /admin/works/:id/moderate` – Inhalte (de)publizieren.
  `ADMIN`-Rolle hat Zugang zu allen geschützten Routen.
- **Profil bearbeitbar** (B-023): `PATCH /users/me { displayName, language }`.
  User-Schema um `language`-Feld erweitert.
- **Hör-/Leih-Verlauf** (B-025): `GET /users/history?limit=50` – alle
  Leihen inkl. Werkdaten, neueste zuerst.
- **Wunschliste** (B-031): `POST/DELETE/GET /wishlist` – Werke zur
  „Später leihen"-Liste hinzufügen. `Wishlist`-Modell (unique userId×workId).
- **Werk depublizieren** (B-041): `POST /works/:id/unpublish` – setzt
  Status zurück auf DRAFT; aktive Leihen laufen aus.
- **Dritte Abo-Stufe** (B-085): `LITE` (5 Leihen/Monat) neben STANDARD (10)
  und PREMIUM (30). `SubscriptionPlan.LITE` im shared-Paket.
- **Schema-Migration** `admin_role_wishlist_profile`: `ADMIN` in UserRole-Enum,
  `User.language`, `Wishlist`-Modell.

### Phase 3 (Beta-Increment) – umgesetzt
Aufbauend auf Phase 2, mit Unit- und e2e-Tests abgesichert:

- **Wiedergabe-Fortschritt** (B-073): `PUT /loans/:id/progress { positionSeconds }` speichert Position;
  `GET /loans/:id/progress` liefert sie zurück. Nur für aktive Leihen.
- **Restkontingent-Anzeige** (B-080): `GET /subscriptions/me` enthält jetzt
  `loansRemaining = loanQuotaPerPeriod - loansUsedThisPeriod`.
- **Konto-Löschung** (B-010): `DELETE /users/me` – alle persönlichen Daten
  werden gelöscht, Finanzdaten bleiben anonymisiert erhalten.
- **Benachrichtigungs-Präferenzen** (B-028): `GET/PUT /notifications/preferences`
  – Opt-out pro Typ (z. B. `{ "LOAN_EXPIRING": false }`). `createIfEnabled()`
  prüft die Präferenz vor dem Anlegen einer Benachrichtigung.
- **CSV-Export** (B-109): `GET /payouts/export.csv` – alle Vergütungsposten
  als herunterladbares CSV.
- **Ausleihen-Verlauf** (B-141): `GET /payouts/history?from=&to=&groupBy=day|week|month`
  – aggregierte Tages-/Wochen-/Monats-Buckets via PostgreSQL `DATE_TRUNC`.
- **Werk-Metriken** (B-142): `GET /works/:id/metrics` – Gesamtleihen,
  Verlängerungen und Einnahmen (ausstehend/ausgezahlt) je Werk.
- **Schema-Migration** `playback_notif_prefs`: neue Modelle `PlaybackProgress`
  (1:1 zu Loan) und `NotificationPreference` (unique per userId×type).

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
- **Auth-Härtung** (Backlog B-001–B-004, B-009): scrypt-Passwort-Hashing,
  rotierende Refresh-Tokens mit Reuse-Erkennung (`/auth/refresh`,
  `/auth/logout`), E-Mail-Verifizierung (`/auth/verify-email`),
  Passwort-Reset (`/auth/forgot-password`, `/auth/reset-password`) und
  Rate-Limiting auf Login/Forgot. Mail-Versand über eine `MailService`-
  Abstraktion (Dev-Stub; Provider-Anbindung offen, B-119)

### Stripe-Integration (Phase 2) – umgesetzt
Konfigurierbar über `STRIPE_SECRET_KEY`. Ist der Key nicht gesetzt, bleibt
der Dev-Fallback aktiv (Abo per `/subscriptions/activate`), sodass der Loop
ohne Stripe-Keys testbar ist.

- **Billing (Abos)**: `POST /subscriptions` erzeugt eine echte Checkout-
  Session; `POST /webhooks/stripe` (signaturgeprüft, Raw-Body) verarbeitet
  `checkout.session.completed`, `customer.subscription.updated|deleted`
  und `invoice.paid` und hält den Abo-Status synchron (F-077–F-079).
- **Connect (Auszahlungen)**: `POST /payouts/connect/onboard` startet das
  Künstler-Onboarding; `POST /payouts/withdraw` überweist die ausstehende
  Summe an das Connect-Konto und markiert die Posten als ausgezahlt (F-074).

Benötigte Variablen: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
`STRIPE_PRICE_STANDARD`, `STRIPE_PRICE_PREMIUM`, `WEB_BASE_URL`.

Noch offen für Phase 2/3: Umstellung des Schedulers auf BullMQ/Redis für
verteilte Skalierung, E-Mail-Benachrichtigungen und die Web-UI.

---

## Dokumentation

- [Vision](./VISION.md)
- [Architektur](./docs/architecture.md)
- [API-Design](./docs/api-design.md)

---

## Lizenz

MIT – siehe [`LICENSE`](./LICENSE).

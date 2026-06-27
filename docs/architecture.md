# CreatorLend – Architektur

Dieses Dokument beschreibt die technische Architektur von CreatorLend:
Komponenten, Datenfluss und die wichtigsten Domänenmodelle.

## 1. Überblick

CreatorLend ist ein TypeScript-Monorepo mit einer Next.js-Web-App, einer
NestJS-API, PostgreSQL als primärem Datenspeicher, Redis für Caching/Jobs,
S3-kompatiblem Object Storage für Medien und Stripe für Zahlungen und
Auszahlungen.

```mermaid
flowchart TB
    subgraph Client
        Web["Next.js Web App<br/>(React, App Router)"]
        Mobile["Mobile App<br/>(Roadmap)"]
    end

    subgraph Edge
        CDN["CDN<br/>(Medien-Auslieferung)"]
    end

    subgraph Backend["NestJS API"]
        Auth["Auth-Modul<br/>(JWT / OAuth)"]
        Users["Users-Modul"]
        Works["Works-Modul"]
        Loans["Loans-Modul<br/>(Leihe / Verlängern / Tausch)"]
        Subs["Subscriptions-Modul"]
        Payouts["Payouts-Modul<br/>(Vergütung)"]
        Media["Media-Modul<br/>(Upload / Signed URLs)"]
    end

    subgraph Workers
        Jobs["BullMQ Worker<br/>(Ablauf, Abrechnung)"]
    end

    subgraph Data
        PG[("PostgreSQL<br/>Prisma")]
        Redis[("Redis<br/>Cache / Queue")]
        S3[("Object Storage<br/>S3 / R2")]
    end

    subgraph External
        Stripe["Stripe<br/>Billing + Connect"]
    end

    Web --> Backend
    Mobile --> Backend
    Web --> CDN
    CDN --> S3

    Auth --> PG
    Users --> PG
    Works --> PG
    Loans --> PG
    Subs --> PG
    Payouts --> PG
    Media --> S3

    Backend --> Redis
    Jobs --> Redis
    Jobs --> PG
    Subs <--> Stripe
    Payouts --> Stripe
    Stripe -- Webhooks --> Backend
```

## 2. Komponenten

### Web (apps/web)
Next.js App Router. Server Components für Datenabruf, Client Components
für Interaktion. Zuständig für Discovery, Player (zeitlich begrenzter
Zugriff), Abo-Flows und Künstler-Dashboard.

### API (apps/api)
NestJS, modular nach Domäne aufgeteilt:

- **auth** – Registrierung, Login, JWT-Ausgabe, OAuth, Guards.
- **users** – Profile von Hörer:innen und Künstler:innen, Rollen.
- **works** – Einstellen, Metadaten und Veröffentlichung von Werken.
- **loans** – Ausleihen anlegen, verlängern, tauschen, Ablauf prüfen.
- **subscriptions** – Abo-Verwaltung über Stripe Billing.
- **payouts** – Vergütung pro Ausleihe erfassen, Auszahlungen via Connect.
- **media** – Uploads, signierte (zeitlich begrenzte) Zugriffs-URLs.

### Worker (Jobs)
BullMQ-Worker für asynchrone Aufgaben:

- Ablauf von Ausleihen nach 7 Tagen (Zugriff entziehen).
- Aggregation der Vergütung und Vorbereitung von Auszahlungen.
- Versand von Ablauf-Benachrichtigungen.

### Shared (packages/shared)
Geteilte TypeScript-Typen, DTO-Schemata (z. B. zod) und Konstanten,
die sowohl `web` als auch `api` nutzen.

## 3. Domänenmodell (Kern)

```mermaid
erDiagram
    USER ||--o{ WORK : "erstellt (Künstler:in)"
    USER ||--o{ LOAN : "leiht (Hörer:in)"
    USER ||--o| SUBSCRIPTION : "hat"
    WORK ||--o{ LOAN : "wird geliehen"
    LOAN ||--|| PAYOUT_ITEM : "erzeugt"
    USER ||--o{ PAYOUT_ITEM : "verdient (Künstler:in)"

    USER {
        uuid id
        string email
        enum role "LISTENER | ARTIST"
        string displayName
    }
    WORK {
        uuid id
        uuid artistId
        string title
        enum type "MUSIC | PODCAST | AUDIOBOOK | SKETCH"
        int loanPriceCents
        enum status "DRAFT | PUBLISHED"
    }
    SUBSCRIPTION {
        uuid id
        uuid userId
        enum status
        int loanQuotaPerPeriod
        string stripeSubscriptionId
    }
    LOAN {
        uuid id
        uuid userId
        uuid workId
        datetime startedAt
        datetime expiresAt
        enum status "ACTIVE | EXPIRED | EXCHANGED"
        int renewalCount
    }
    PAYOUT_ITEM {
        uuid id
        uuid artistId
        uuid loanId
        int amountCents
        enum status "PENDING | PAID"
    }
```

## 4. Wichtige Abläufe

### Werk leihen
1. Client ruft `POST /loans` mit `workId` auf.
2. API prüft aktives Abo und verbleibendes Kontingent.
3. `Loan` wird angelegt: `expiresAt = now + 7 Tage`, Status `ACTIVE`.
4. Ein `PayoutItem` wird für die/den Künstler:in mit `loanPriceCents`
   erzeugt (Status `PENDING`).
5. Signierte Medien-URL wird zurückgegeben (gültig bis `expiresAt`).

### Ablauf (Worker)
- Stündlicher Job setzt abgelaufene `ACTIVE`-Loans auf `EXPIRED`.
- Zugriff endet, signierte URLs verlieren Gültigkeit.

### Vergütung & Auszahlung
- `PayoutItem`s werden je Künstler:in aggregiert.
- Periodisch via Stripe Connect ausgezahlt; Status → `PAID`.

## 5. Sicherheit & Zugriff

- Zugriff auf Medien ausschließlich über kurzlebige signierte URLs.
- Rollenbasierte Guards (LISTENER / ARTIST) in der API.
- Stripe-Webhooks signaturverifiziert.
- Zahlungs- und Vergütungsoperationen transaktional in PostgreSQL.

## 6. Deployment

- Alle Dienste containerisiert (Docker).
- Lokal via `docker-compose` (API, Web, Postgres, Redis).
- Cloud: managed Postgres/Redis, Object Storage + CDN, API/Web hinter
  Load Balancer; Worker als separater Service.

# CreatorLend – API-Design

REST-API über HTTPS. JSON als Austauschformat. Authentifizierung per
`Authorization: Bearer <JWT>`. Basis-Pfad: `/api/v1`.

Geldbeträge werden durchgängig als Ganzzahl in **Cent** (`*Cents`)
geführt, um Rundungsfehler zu vermeiden.

## Konventionen

- **Auth:** `Authorization: Bearer <access_token>`
- **Fehlerformat:**
  ```json
  { "error": { "code": "string", "message": "string", "details": {} } }
  ```
- **Paginierung:** `?page=1&pageSize=20` → Antwort mit `items` + `meta`.
- **Rollen:** `LISTENER`, `ARTIST` (über Guards erzwungen).

---

## 1. Werk einstellen (Künstler:in)

Erstellt ein neues Werk. Der eigentliche Datei-Upload erfolgt über eine
signierte Upload-URL.

```
POST /api/v1/works
Rolle: ARTIST
```

**Request**
```json
{
  "title": "Midnight Tape",
  "type": "MUSIC",
  "description": "Eine Lo-Fi-EP.",
  "loanPriceCents": 150,
  "durationSeconds": 1820,
  "language": "de"
}
```

**Response `201`**
```json
{
  "id": "wrk_01H...",
  "title": "Midnight Tape",
  "type": "MUSIC",
  "status": "DRAFT",
  "loanPriceCents": 150,
  "upload": {
    "url": "https://storage.example.com/...&X-Signature=...",
    "method": "PUT",
    "expiresIn": 900
  }
}
```

**Verwandte Endpunkte**
```
PATCH  /api/v1/works/:id            # Metadaten ändern (ARTIST, Eigentümer)
POST   /api/v1/works/:id/publish    # Status DRAFT -> PUBLISHED
GET    /api/v1/works/:id            # Detailansicht
GET    /api/v1/works?type=MUSIC&q=  # Suche / Discovery (öffentlich)
```

---

## 2. Werk leihen (Hörer:in)

Leiht ein veröffentlichtes Werk für 7 Tage aus. Prüft aktives Abo und
Kontingent, erzeugt die Ausleihe und ein Vergütungs-Item für die/den
Künstler:in.

```
POST /api/v1/loans
Rolle: LISTENER
```

**Request**
```json
{ "workId": "wrk_01H..." }
```

**Response `201`**
```json
{
  "id": "loan_01H...",
  "workId": "wrk_01H...",
  "status": "ACTIVE",
  "startedAt": "2026-06-27T10:00:00Z",
  "expiresAt": "2026-07-04T10:00:00Z",
  "renewalCount": 0,
  "access": {
    "streamUrl": "https://cdn.example.com/...&X-Signature=...",
    "expiresAt": "2026-07-04T10:00:00Z"
  }
}
```

**Fehler**
- `402 no_active_subscription` – kein aktives Abo.
- `409 quota_exceeded` – Leih-Kontingent erschöpft.
- `409 already_borrowed` – Werk bereits aktiv geliehen.

**Verwandte Endpunkte**
```
GET /api/v1/loans?status=ACTIVE     # Eigene Ausleihen
GET /api/v1/loans/:id               # Detail inkl. Zugriffs-URL
```

---

## 3. Ausleihe verlängern / tauschen

### Verlängern
Verlängert eine laufende oder kürzlich abgelaufene Ausleihe um weitere
7 Tage. Löst eine **erneute Vergütung** der/des Künstler:in aus.

```
POST /api/v1/loans/:id/renew
Rolle: LISTENER
```

**Response `200`**
```json
{
  "id": "loan_01H...",
  "status": "ACTIVE",
  "expiresAt": "2026-07-11T10:00:00Z",
  "renewalCount": 1
}
```

### Tauschen
Beendet die aktuelle Ausleihe und leiht im selben Schritt ein anderes
Werk aus. Tausch-Regeln (z. B. Kontingent-Anrechnung) sind über
`countsAgainstQuota` steuerbar.

```
POST /api/v1/loans/:id/exchange
Rolle: LISTENER
```

**Request**
```json
{ "newWorkId": "wrk_02H..." }
```

**Response `201`**
```json
{
  "previousLoan": { "id": "loan_01H...", "status": "EXCHANGED" },
  "newLoan": {
    "id": "loan_03H...",
    "workId": "wrk_02H...",
    "status": "ACTIVE",
    "expiresAt": "2026-07-04T10:00:00Z"
  }
}
```

---

## 4. Künstlervergütung abrufen

Liefert die aggregierte Vergütung einer/eines Künstler:in sowie die
Einzelposten je Ausleihe.

```
GET /api/v1/payouts/summary
Rolle: ARTIST
```

**Response `200`**
```json
{
  "currency": "eur",
  "pendingCents": 4500,
  "paidCents": 12000,
  "lifetimeLoans": 110,
  "period": { "from": "2026-06-01", "to": "2026-06-27" }
}
```

**Einzelposten**
```
GET /api/v1/payouts/items?status=PENDING&page=1
Rolle: ARTIST
```

**Response `200`**
```json
{
  "items": [
    {
      "id": "pi_01H...",
      "loanId": "loan_01H...",
      "workId": "wrk_01H...",
      "amountCents": 150,
      "status": "PENDING",
      "createdAt": "2026-06-27T10:00:00Z"
    }
  ],
  "meta": { "page": 1, "pageSize": 20, "total": 30 }
}
```

**Auszahlung anstoßen (oder automatisiert via Job)**
```
POST /api/v1/payouts/withdraw      # via Stripe Connect; PENDING -> PAID
Rolle: ARTIST
```

---

## 5. Abo verwalten

### Abo abschließen
Startet ein Stripe-Billing-Abo. Liefert eine Checkout-Session-URL.

```
POST /api/v1/subscriptions
Rolle: LISTENER
```

**Request**
```json
{ "plan": "STANDARD" }
```

**Response `201`**
```json
{
  "checkoutUrl": "https://checkout.stripe.com/c/pay/...",
  "plan": "STANDARD"
}
```

### Aktuelles Abo abrufen
```
GET /api/v1/subscriptions/me
Rolle: LISTENER
```

**Response `200`**
```json
{
  "id": "sub_01H...",
  "plan": "STANDARD",
  "status": "ACTIVE",
  "loanQuotaPerPeriod": 10,
  "loansUsedThisPeriod": 3,
  "currentPeriodEnd": "2026-07-27T00:00:00Z",
  "cancelAtPeriodEnd": false
}
```

### Ändern / Kündigen
```
PATCH  /api/v1/subscriptions/me     # Plan-Wechsel  { "plan": "PREMIUM" }
DELETE /api/v1/subscriptions/me     # Kündigung zum Periodenende
```

### Stripe-Webhook
Empfängt Abo-Lifecycle-Events (signaturverifiziert).
```
POST /api/v1/webhooks/stripe
Auth: Stripe-Signatur (kein JWT)
```

---

## Endpunkt-Übersicht

| Bereich | Methode | Pfad |
| --- | --- | --- |
| Werk einstellen | POST | `/works` |
| Werk veröffentlichen | POST | `/works/:id/publish` |
| Werk suchen | GET | `/works` |
| Werk leihen | POST | `/loans` |
| Ausleihen anzeigen | GET | `/loans` |
| Verlängern | POST | `/loans/:id/renew` |
| Tauschen | POST | `/loans/:id/exchange` |
| Vergütung (Summe) | GET | `/payouts/summary` |
| Vergütung (Posten) | GET | `/payouts/items` |
| Auszahlung | POST | `/payouts/withdraw` |
| Abo abschließen | POST | `/subscriptions` |
| Abo anzeigen | GET | `/subscriptions/me` |
| Abo ändern/kündigen | PATCH/DELETE | `/subscriptions/me` |
| Stripe-Webhook | POST | `/webhooks/stripe` |

### Phase 2 (Beta) – zusätzliche Endpunkte

| Bereich | Methode | Pfad |
| --- | --- | --- |
| Discovery (Filter/Sort) | GET | `/works?type=&q=&language=&category=&sort=new\|popular` |
| Benachrichtigungen | GET | `/notifications?unread=true` |
| Ungelesen-Zähler | GET | `/notifications/unread-count` |
| Als gelesen markieren | POST | `/notifications/:id/read` |
| Alle gelesen | POST | `/notifications/read-all` |
| Favorit hinzufügen | POST | `/favorites` |
| Favorit entfernen | DELETE | `/favorites/:workId` |
| Favoriten anzeigen | GET | `/favorites` |
| Künstler:in folgen | POST | `/follows` |
| Entfolgen | DELETE | `/follows/:artistId` |
| Gefolgte anzeigen | GET | `/follows` |

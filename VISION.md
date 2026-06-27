# CreatorLend – Vision

> Faire Vergütung für Kreative. Ein Werk = eine Woche = eine faire Bezahlung.

CreatorLend ist eine Plattform, auf der Hörer:innen kreative Werke
(Musik, Podcasts, Hörbücher, Sketche) **leihen** statt sie endlos zu
streamen. Jede Ausleihe vergütet die Künstler:innen direkt und
transparent – kein Bruchteil-eines-Cents-pro-Play.

---

## 1. Projektziel

CreatorLend ist eine **faire Vergütungsplattform für Künstler:innen und
Kreative** – Musiker:innen, Podcaster:innen, Hörbuch-Autor:innen und
Sketcher:innen.

Das Grundprinzip:

- Nutzer:innen schließen ein **Abo** ab und erhalten damit ein Kontingent
  an Ausleihen.
- Sie **leihen ein Werk für eine Woche** aus.
- Für **jede Ausleihe** wird die/der Künstler:in **direkt und fair**
  vergütet.

Statt eines Streaming-Modells, bei dem Vergütung in Bruchteilen von Cents
pro Abspielvorgang verschwindet, koppelt CreatorLend Geld unmittelbar an
eine bewusste Nutzer-Handlung: die Ausleihe. Das macht Einnahmen für
Kreative **planbar, nachvollziehbar und gerecht**.

---

## 2. Kernprinzipien

| Prinzip | Bedeutung |
| --- | --- |
| **Fair Pay per Leihe** | Jede einzelne Ausleihe löst eine konkrete, definierte Vergütung für die/den Künstler:in aus. Keine intransparenten Pool-Verteilungen. |
| **Transparente Vergütung** | Künstler:innen sehen jederzeit, wie viele Ausleihen sie hatten und wie viel daraus resultiert. Nutzer:innen sehen, dass ihr Geld direkt ankommt. |
| **Kein dauerhafter Besitz** | Ein geliehenes Werk ist zeitlich begrenzt verfügbar (Standard: 1 Woche). Kein Download zum Behalten, kein DRM-freier Kauf. |
| **Verlängerung & Tausch** | Eine laufende Ausleihe kann verlängert (erneute Vergütung) oder gegen ein anderes Werk getauscht werden. |
| **Künstler:innen zuerst** | Plattform-Entscheidungen werden am Maßstab gemessen: Ist das fair gegenüber den Kreativen? |

---

## 3. Zielgruppe

**Kreative (Angebotsseite)**

- Unabhängige Musiker:innen ohne großes Label.
- Podcaster:innen, die ihre Arbeit nicht hinter Werbung verstecken wollen.
- Hörbuch-Autor:innen und Sprecher:innen.
- Comedians / Sketcher:innen mit Audio- und Videoformaten.

**Hörer:innen (Nachfrageseite)**

- Menschen, die Inhalte **bewusst und fair unterstützen** wollen.
- Nutzer:innen, die ein kuratiertes Leih-Erlebnis dem endlosen Streaming-
  Feed vorziehen.
- Fans, die einen direkten, sichtbaren Beitrag zu „ihren" Künstler:innen
  leisten möchten.

---

## 4. Abgrenzung zu Spotify

CreatorLend ist **kein Streaming-Dienst**.

| | Spotify (Streaming) | CreatorLend (Leihe) |
| --- | --- | --- |
| Vergütungseinheit | Pro Play (Bruchteil eines Cents) | Pro Ausleihe (definierter Betrag) |
| Auszahlung | Anteilig aus einem Gesamt-Pool | Direkt der/dem ausgeliehenen Künstler:in zugeordnet |
| Nutzungsmodell | Unbegrenztes Abspielen | 1 Werk = 1 Woche = 1 Vergütung |
| Transparenz | Komplexe Pro-Rata-Berechnung | Nachvollziehbar pro Ausleihe |
| Anreiz | Möglichst viele Plays | Bewusste, wertschätzende Auswahl |

Kurz: **Kein „pro Play", sondern „pro Leihe".** Eine Ausleihe ist eine
bewusste Entscheidung der/des Nutzer:in und löst genau eine faire
Vergütung aus.

---

## 5. Technologie-Stack

Gewählt wird ein **TypeScript-Monorepo** mit klarer Trennung von Web,
API und geteiltem Code.

| Schicht | Technologie | Begründung |
| --- | --- | --- |
| **Sprache** | TypeScript (durchgängig) | Eine Sprache für Frontend, Backend und geteilte Typen → weniger Kontextwechsel, geteilte Domänentypen, große Community (Stand 2025/2026). |
| **Monorepo** | pnpm Workspaces + Turborepo | Schnelle, cache-fähige Builds; eindeutige Abhängigkeiten; einfache Code-Teilung zwischen `web` und `api`. |
| **Frontend** | Next.js (React, App Router) | Marktführer im React-Ökosystem, Server Components, hervorragende DX, einfaches Cloud-Deployment, riesige Community. |
| **Backend** | NestJS (Node.js) | Strukturiertes, modulares Framework (DI, Module, Guards), ideal für eine Domäne mit Nutzerverwaltung, Zahlungen und Medien; sehr gute Testbarkeit. |
| **Datenbank** | PostgreSQL | Bewährte, relationale DB für transaktionale Korrektheit bei Zahlungen, Abos und Ausleihen. |
| **ORM** | Prisma | Typsicheres Daten-Mapping, Migrationen, exzellente DX, generierte Typen wandern ins geteilte Paket. |
| **Auth** | JWT (Access/Refresh) + OAuth2 | Standardisierte, zustandsarme Authentifizierung; OAuth für Social-Login. |
| **Zahlungen** | Stripe (Billing + Connect) | Stripe Billing für Abos, **Stripe Connect** für direkte Auszahlungen an Künstler:innen – passt exakt zum Fair-Pay-Modell. |
| **Medien** | S3-kompatibler Object Storage (AWS S3 / Cloudflare R2) + CDN | Skalierbarer, kostengünstiger Speicher für große Audio-/Video-Dateien; signierte URLs für zeitlich begrenzten Zugriff (= Leihe). |
| **Caching/Jobs** | Redis + BullMQ | Sessions/Rate-Limiting und asynchrone Jobs (Ablauf von Ausleihen, Vergütungs-Abrechnung). |
| **Infrastruktur** | Docker + Docker Compose, Cloud-ready (AWS/GCP/Fly.io) | Reproduzierbare Umgebungen, einfacher Übergang von lokal zu Cloud. |
| **Observability** | OpenTelemetry, strukturierte Logs | Nachvollziehbarkeit von Zahlungs- und Vergütungsflüssen. |

**Warum dieser Stack?**

- **Skalierbarkeit:** Zustandslose API hinter Load Balancer, Postgres als
  Quelle der Wahrheit, Redis/BullMQ für Hintergrundarbeit, Object Storage
  + CDN für Medien.
- **Developer Experience:** Eine Sprache, geteilte Typen, Turborepo-
  Caching, Prisma-Migrationen, NestJS-Struktur.
- **Cloud-Readiness:** Containerisiert, 12-Factor-orientiert, managed
  Services (Postgres, Redis, S3, Stripe) verfügbar.
- **Community-Support:** Next.js, NestJS, Prisma und Stripe gehören
  Stand 2025/2026 zu den am breitesten genutzten und unterstützten
  Tools ihres Bereichs.

---

## 6. Roadmap

### Phase 1 – MVP
Ziel: Der Kern-Loop funktioniert end-to-end.

- Registrierung/Login (Nutzer:in & Künstler:in)
- Künstler:in stellt Werk ein (Upload + Metadaten)
- Nutzer:in schließt Abo ab (Stripe Billing)
- Werk leihen → 1 Woche Zugriff via signierter URL
- Vergütung pro Ausleihe wird erfasst und Künstler:in zugeordnet
- Künstler-Dashboard: Ausleihen & aufgelaufene Vergütung

### Phase 2 – Beta
Ziel: Aus dem Loop wird ein Produkt.

- Verlängerung & Tausch von Ausleihen
- Stripe-Connect-Auszahlungen an Künstler:innen
- Such- & Entdeckungsfunktionen, Kategorien
- Empfehlungen, Playlists/Sammlungen
- Benachrichtigungen (Ablauf der Leihe)
- Geschlossene Beta mit ausgewählten Kreativen

### Phase 3 – Launch
Ziel: Öffentlich, skalierbar, vertrauenswürdig.

- Öffentliche Registrierung
- Mehrere Abo-Stufen
- Mobile Apps (iOS/Android)
- Erweiterte Analytics für Künstler:innen
- Internationalisierung & Mehrwährungs-Auszahlungen
- Compliance, Skalierung & Härtung

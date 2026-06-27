# CreatorLend – Anforderungen (100 Features)

Zentrale Anforderungsliste für CreatorLend. Jede Anforderung hat eine
eindeutige ID (`F-001` …) und eine Roadmap-Phase:
**(MVP)** = Kern-Loop, **(Beta)** = Ausbau, **(Launch)** = öffentlich/skaliert.

Bezug: siehe [VISION.md](../VISION.md) und [api-design.md](./api-design.md).

> Legende Phasen: **MVP** → minimal lauffähiger Kern-Loop ·
> **Beta** → geschlossene Beta · **Launch** → öffentlicher Start.

---

## 1. Konten & Authentifizierung

- **F-001** Nutzer:innen können sich mit E-Mail und Passwort registrieren. *(MVP)*
- **F-002** Registrierung als Rolle `LISTENER` oder `ARTIST`. *(MVP)*
- **F-003** Login gibt ein JWT-Access-Token zurück. *(MVP)*
- **F-004** Geschützte Endpunkte verlangen ein gültiges Bearer-Token. *(MVP)*
- **F-005** Rollenbasierte Zugriffskontrolle (LISTENER vs. ARTIST) via Guards. *(MVP)*
- **F-006** Refresh-Token-Mechanismus zur Verlängerung von Sessions. *(Beta)*
- **F-007** Passwort-Zurücksetzen per E-Mail-Link. *(Beta)*
- **F-008** Social-Login via OAuth2 (Google/Apple). *(Launch)*

## 2. Künstler:innen-Profile

- **F-009** Künstler:in pflegt öffentliches Profil (Name, Bio, Avatar). *(MVP)*
- **F-010** Profil listet alle veröffentlichten Werke der/des Künstler:in. *(MVP)*
- **F-011** Künstler:in hinterlegt Auszahlungsdaten (Stripe Connect). *(Beta)*
- **F-012** Verifizierungs-Badge für bestätigte Künstler:innen. *(Beta)*
- **F-013** Künstler:in verlinkt externe Kanäle (Website, Social). *(Launch)*

## 3. Hörer:innen-Profile

- **F-014** Hörer:in pflegt Profil (Anzeigename, Sprache). *(MVP)*
- **F-015** Übersicht aktueller und vergangener Ausleihen. *(MVP)*
- **F-016** Merkliste / Favoriten für Werke. *(Beta)*
- **F-017** Folgen von Künstler:innen. *(Beta)*
- **F-018** Persönliche Empfehlungen auf der Startseite. *(Launch)*

## 4. Werke einstellen & verwalten

- **F-019** Künstler:in legt ein Werk mit Metadaten an (Titel, Typ, Beschreibung). *(MVP)*
- **F-020** Unterstützte Typen: `MUSIC`, `PODCAST`, `AUDIOBOOK`, `SKETCH`. *(MVP)*
- **F-021** Leihpreis pro Werk in Cent festlegen (`loanPriceCents`). *(MVP)*
- **F-022** Werk hat Status `DRAFT` und `PUBLISHED`. *(MVP)*
- **F-023** Werk veröffentlichen (DRAFT → PUBLISHED). *(MVP)*
- **F-024** Werk-Metadaten nachträglich bearbeiten (nur Eigentümer:in). *(MVP)*
- **F-025** Werk zurückziehen / depublizieren. *(Beta)*
- **F-026** Cover-Bild zum Werk hochladen. *(Beta)*
- **F-027** Sprache und Genre/Kategorie pro Werk. *(Beta)*
- **F-028** Mehrteilige Werke (z. B. Podcast-Episoden, Kapitel). *(Launch)*

## 5. Medien-Upload & Streaming

- **F-029** Signierte Upload-URL für den Datei-Upload erhalten. *(MVP)*
- **F-030** Mediendateien liegen im S3-kompatiblen Object Storage. *(MVP)*
- **F-031** Zeitlich begrenzte, signierte Stream-URL für aktive Leihe. *(MVP)*
- **F-032** Stream-URL verliert mit Ablauf der Leihe ihre Gültigkeit. *(MVP)*
- **F-033** Auslieferung der Medien über ein CDN. *(Beta)*
- **F-034** Audio-Transcoding in mehrere Bitraten. *(Beta)*
- **F-035** Wiedergabe-Fortschritt pro Leihe speichern. *(Beta)*
- **F-036** Schutz gegen URL-Sharing (kurzlebige, an Nutzer gebundene Tokens). *(Launch)*

## 6. Entdeckung & Suche

- **F-037** Öffentliche Liste veröffentlichter Werke (Discovery). *(MVP)*
- **F-038** Filtern nach Werk-Typ. *(MVP)*
- **F-039** Volltextsuche über Titel. *(MVP)*
- **F-040** Detailseite eines Werks mit Metadaten. *(MVP)*
- **F-041** Filtern nach Sprache und Kategorie. *(Beta)*
- **F-042** Sortierung (neu, beliebt, meistgeliehen). *(Beta)*
- **F-043** Kuratierte Sammlungen / Playlists. *(Beta)*
- **F-044** Personalisierte Empfehlungen (ähnliche Werke). *(Launch)*

## 7. Abonnement & Kontingent

- **F-045** Hörer:in schließt ein Abo ab. *(MVP)*
- **F-046** Abo definiert ein Leih-Kontingent pro Periode (`loanQuotaPerPeriod`). *(MVP)*
- **F-047** Verbrauch des Kontingents wird je Periode gezählt. *(MVP)*
- **F-048** Aktuelles Abo inkl. Reststatus abrufen. *(MVP)*
- **F-049** Mehrere Abo-Stufen (z. B. STANDARD, PREMIUM). *(Beta)*
- **F-050** Plan-Wechsel (Upgrade/Downgrade). *(Beta)*
- **F-051** Kündigung zum Periodenende. *(Beta)*
- **F-052** Kontingent setzt sich zum Periodenstart zurück. *(Beta)*

## 8. Leihen (Kern-Loop)

- **F-053** Hörer:in leiht ein veröffentlichtes Werk. *(MVP)*
- **F-054** Leihe ist standardmäßig 7 Tage gültig (`expiresAt = now + 7d`). *(MVP)*
- **F-055** Leihe ist nur mit aktivem Abo möglich (sonst `no_active_subscription`). *(MVP)*
- **F-056** Leihe scheitert bei erschöpftem Kontingent (`quota_exceeded`). *(MVP)*
- **F-057** Dasselbe Werk kann nicht doppelt aktiv geliehen werden (`already_borrowed`). *(MVP)*
- **F-058** Erfolgreiche Leihe liefert Zugriffs-URL zurück. *(MVP)*
- **F-059** Leihe, Vergütung und Kontingent-Verbrauch laufen transaktional. *(MVP)*
- **F-060** Leihe läuft nach Ablaufdatum automatisch ab (`EXPIRED`). *(MVP)*
- **F-061** Hörer:in sieht verbleibende Leihdauer. *(Beta)*

## 9. Verlängern & Tauschen

- **F-062** Laufende Leihe um 7 Tage verlängern. *(MVP)*
- **F-063** Verlängerung löst eine erneute Künstlervergütung aus. *(MVP)*
- **F-064** Verlängerungen werden gezählt (`renewalCount`). *(MVP)*
- **F-065** Aktive Leihe gegen ein anderes Werk tauschen. *(MVP)*
- **F-066** Beim Tausch wird die alte Leihe als `EXCHANGED` markiert. *(MVP)*
- **F-067** Regeln, ob ein Tausch das Kontingent erneut belastet. *(Beta)*

## 10. Künstlervergütung & Auszahlung

- **F-068** Jede Leihe erzeugt ein Vergütungs-Item (`PayoutItem`) für die/den Künstler:in. *(MVP)*
- **F-069** Vergütungsbetrag entspricht dem Leihpreis des Werks. *(MVP)*
- **F-070** Vergütungs-Item startet im Status `PENDING`. *(MVP)*
- **F-071** Aggregierte Vergütung abrufen (ausstehend, ausgezahlt, Gesamt-Leihen). *(MVP)*
- **F-072** Einzelposten der Vergütung paginiert auflisten. *(MVP)*
- **F-073** Auszahlung setzt Posten von `PENDING` auf `PAID`. *(MVP)*
- **F-074** Auszahlung an Künstler:in via Stripe Connect. *(Beta)*
- **F-075** Vergütungs-Historie pro Werk und Zeitraum. *(Beta)*
- **F-076** Mehrwährungs-Auszahlungen. *(Launch)*

## 11. Zahlungsabwicklung (Stripe)

- **F-077** Abo-Abschluss über Stripe Checkout. *(Beta)*
- **F-078** Stripe-Webhooks für Abo-Lifecycle (signaturverifiziert). *(Beta)*
- **F-079** Abrechnungs-Status synchron mit Stripe (`ACTIVE`/`PAST_DUE`/`CANCELED`). *(Beta)*
- **F-080** Rechnungen/Belege für Nutzer:innen. *(Launch)*
- **F-081** Steuer-/Umsatzberichte für Künstler:innen. *(Launch)*

## 12. Benachrichtigungen

- **F-082** Benachrichtigung kurz vor Ablauf einer Leihe. *(Beta)*
- **F-083** Benachrichtigung bei erfolgreicher Auszahlung. *(Beta)*
- **F-084** Benachrichtigung an Künstler:in bei neuer Ausleihe. *(Beta)*
- **F-085** E-Mail- und In-App-Benachrichtigungen, individuell konfigurierbar. *(Launch)*

## 13. Künstler-Dashboard & Analytics

- **F-086** Dashboard mit Ausleihen und aufgelaufener Vergütung. *(MVP)*
- **F-087** Verlauf der Ausleihen über die Zeit. *(Beta)*
- **F-088** Kennzahlen pro Werk (Leihen, Verlängerungen, Umsatz). *(Beta)*
- **F-089** Export der Vergütungsdaten (CSV). *(Launch)*

## 14. Admin & Moderation

- **F-090** Admin-Rolle mit erweiterten Rechten. *(Beta)*
- **F-091** Melden unangemessener Inhalte. *(Beta)*
- **F-092** Moderation: Werke prüfen/sperren. *(Launch)*

## 15. Nicht-funktionale Anforderungen

- **F-093** Sicherheit: Passwörter werden gehasht (argon2/bcrypt), nie im Klartext gespeichert. *(MVP)*
- **F-094** Sicherheit: Medienzugriff ausschließlich über kurzlebige signierte URLs. *(MVP)*
- **F-095** Datenschutz: DSGVO-Konformität, Datenexport und Löschung auf Anfrage. *(Launch)*
- **F-096** Performance: Discovery- und Leih-Endpunkte antworten p95 < 300 ms. *(Beta)*
- **F-097** Skalierbarkeit: zustandslose API hinter Load Balancer horizontal skalierbar. *(Beta)*
- **F-098** Verfügbarkeit: Zielverfügbarkeit ≥ 99,9 % im Launch. *(Launch)*
- **F-099** Observability: strukturierte Logs und Tracing für Zahlungs-/Vergütungsflüsse. *(Beta)*
- **F-100** Datensicherung: regelmäßige Backups der Datenbank mit definiertem Recovery-Ziel. *(Launch)*

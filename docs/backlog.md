# CreatorLend – Backlog (200 offene Features)

Offene/geplante Features für CreatorLend. **Bereits umgesetzt** (und daher
*nicht* in diesem Backlog) sind: Kern-Loop (Auth-Basis, Werke, Leihen,
Verlängern/Tauschen, Abo-Dev-Aktivierung, Vergütung), Phase-2-Increment
(Scheduler, In-App-Benachrichtigungen, Discovery-Filter/Sort, Favoriten,
Folgen), die Stripe-Integration (Billing-Checkout/Webhook, Connect-
Auszahlungen) sowie die **Auth-Härtung** (siehe ✅ unten).

> ✅ = inzwischen in diesem Branch umgesetzt.

**Legende**
Priorität: **P1** (hoch) · **P2** (mittel) · **P3** (niedrig / nice-to-have)
Phase: **Beta** · **Launch** · **Post-Launch**

Bezug: [VISION.md](../VISION.md), [anforderungen.md](./anforderungen.md),
[architecture.md](./architecture.md), [api-design.md](./api-design.md).

---

## Epic 1 – Authentifizierung & Konto

- **B-001** ✅ Refresh-Token-Rotation mit Token-Familien (Reuse-Erkennung) — _(P1, Beta)_
- **B-002** ✅ E-Mail-Verifizierung bei Registrierung — _(P1, Beta)_
- **B-003** ✅ Passwort-Zurücksetzen per zeitlich begrenztem Link — _(P1, Beta)_
- **B-004** ✅ Passwort-Hashing memory-hard (scrypt statt SHA-256) — _(P1, Beta)_
- **B-005** OAuth2-Login mit Google — _(P2, Launch)_
- **B-006** OAuth2-Login mit Apple — _(P2, Launch)_
- **B-007** Zwei-Faktor-Authentifizierung (TOTP) — _(P2, Launch)_
- **B-008** ✅ Aktive-Sessions-Übersicht und Remote-Logout — _(P2, Launch)_
- **B-009** ✅ Rate-Limiting und Brute-Force-Schutz für Login — _(P1, Beta)_
- **B-010** ✅ Konto-Löschung (Self-Service) mit Datenbereinigung — _(P1, Launch)_
- **B-011** ✅ DSGVO-Datenexport des eigenen Kontos — _(P2, Launch)_
- **B-012** Magic-Link-/Passwordless-Login — _(P3, Post-Launch)_

## Epic 2 – Künstler-Profile & Verifizierung

- **B-013** ✅ Öffentliche Künstler-Profilseite mit Bio und Avatar — _(P1, Beta)_
- **B-014** ✅ Avatar-/Banner-Upload — _(P2, Beta)_
- **B-015** Verifizierungs-Badge mit Antrags-Workflow — _(P2, Launch)_
- **B-016** ✅ Externe Links (Website, Social) im Profil — _(P3, Launch)_
- **B-017** ✅ Künstler-Slug / individuelle Profil-URL — _(P2, Launch)_
- **B-018** Mehrere Mitwirkende pro Künstlerkonto (Team) — _(P3, Post-Launch)_
- **B-019** ✅ Künstler-Onboarding-Checkliste — _(P2, Beta)_
- **B-020** ✅ Öffentliche Statistik (Anzahl Werke, Follower) — _(P3, Launch)_
- **B-021** Künstler-Pressekit / EPK-Seite — _(P3, Post-Launch)_
- **B-022** Profil-Vorschau vor Veröffentlichung — _(P3, Launch)_

## Epic 3 – Hörer-Profile & Personalisierung

- **B-023** ✅ Bearbeitbares Hörer-Profil (Name, Sprache) — _(P2, Beta)_
- **B-024** Persönliche Startseite mit Empfehlungen — _(P2, Launch)_
- **B-025** ✅ Hörverlauf / zuletzt geliehen — _(P2, Beta)_
- **B-026** Personalisierte „Weiterhören"-Sektion — _(P3, Launch)_
- **B-027** Interessen/Genres beim Onboarding wählen — _(P2, Launch)_
- **B-028** ✅ Benachrichtigungs-Präferenzen pro Kanal — _(P1, Beta)_
- **B-029** Privatsphäre-Einstellungen (öffentliches Profil ja/nein) — _(P3, Launch)_
- **B-030** Mehrere Profile pro Konto (Familienprofile) — _(P3, Post-Launch)_
- **B-031** ✅ Wunschliste / „später leihen" — _(P2, Beta)_
- **B-032** Aktivitäts-Feed gefolgter Künstler:innen — _(P2, Launch)_

## Epic 4 – Werke & Inhalte

- **B-033** ✅ Mehrteilige Werke (Episoden/Kapitel) — _(P1, Launch)_
- **B-034** Kapitelmarken und Sprungnavigation — _(P2, Launch)_
- **B-035** ✅ Genre-/Kategorie-Taxonomie mit Pflege — _(P1, Beta)_
- **B-036** ✅ Tags / Schlagworte pro Werk — _(P2, Beta)_
- **B-037** Mehrsprachige Metadaten — _(P3, Post-Launch)_
- **B-038** ✅ Explicit-Content-Kennzeichnung — _(P2, Launch)_
- **B-039** Werk-Entwürfe mit Versionierung — _(P3, Launch)_
- **B-040** Geplante Veröffentlichung (Scheduling) — _(P2, Launch)_
- **B-041** ✅ Werk depublizieren / archivieren — _(P2, Beta)_
- **B-042** Serien/Sammlungen mehrerer Werke — _(P2, Launch)_
- **B-043** ✅ Vorschau-/Trailer-Snippet (frei hörbar, previewKey + signierte URL) — _(P1, Launch)_
- **B-044** Credits (Sprecher:in, Produktion, Lizenzen) — _(P3, Launch)_
- **B-045** Werk-Duplikat-Erkennung beim Upload — _(P3, Post-Launch)_
- **B-046** Bulk-Import von Werken (CSV/API) — _(P3, Post-Launch)_

## Epic 5 – Upload, Medien & Streaming

- **B-047** Resumable / Chunked Uploads — _(P1, Launch)_
- **B-048** Audio-Transcoding in mehrere Bitraten — _(P1, Launch)_
- **B-049** Adaptives Streaming (HLS) — _(P2, Launch)_
- **B-050** Waveform-Generierung für den Player — _(P3, Launch)_
- **B-051** Virenscan hochgeladener Dateien — _(P2, Launch)_
- **B-052** Audio-Watermarking pro Ausleihe — _(P2, Post-Launch)_
- **B-053** CDN-Anbindung mit signierten URLs in Prod — _(P1, Launch)_
- **B-054** Lautheits-Normalisierung (EBU R128) — _(P3, Post-Launch)_
- **B-055** Untertitel/Transkripte (Audio-zu-Text) — _(P3, Post-Launch)_
- **B-056** Cover-Bild-Verarbeitung (Resize/Formate) — _(P2, Launch)_
- **B-057** Download für Offline-Wiedergabe (verschlüsselt, leihgebunden) — _(P2, Post-Launch)_
- **B-058** Speicher-Lebenszyklus / Cold-Storage für alte Werke — _(P3, Post-Launch)_

## Epic 6 – Discovery & Suche

- **B-059** ✅ Volltextsuche über Titel und Beschreibung — _(P1, Launch)_
- **B-060** Such-Infrastruktur (OpenSearch/Meilisearch) — _(P2, Launch)_
- **B-061** ✅ Facetten-Filter (Genre, Sprache, Dauer, Preis) — _(P2, Launch)_
- **B-062** Autovervollständigung / Suchvorschläge — _(P3, Launch)_
- **B-063** ✅ Trending / „diese Woche beliebt" — _(P2, Launch)_
- **B-064** Personalisierte Empfehlungen (Collaborative Filtering) — _(P2, Post-Launch)_
- **B-065** ✅ „Ähnliche Werke"-Sektion auf der Detailseite — _(P2, Launch)_
- **B-066** Kuratierte Redaktions-Sammlungen — _(P2, Launch)_
- **B-067** Neuerscheinungen-Feed — _(P3, Launch)_
- **B-068** Charts pro Kategorie — _(P3, Launch)_
- **B-069** Such-Synonyme und Tippfehler-Toleranz — _(P3, Post-Launch)_
- **B-070** Gespeicherte Suchen / Alerts — _(P3, Post-Launch)_
- **B-071** ✅ Sortierung nach Dauer und Preis — _(P3, Launch)_
- **B-072** Discovery-A/B-Testing-Framework — _(P3, Post-Launch)_

## Epic 7 – Leihen & Lebenszyklus

- **B-073** ✅ Wiedergabe-Fortschritt pro Leihe speichern — _(P1, Beta)_
- **B-074** Geräteübergreifende Synchronisierung des Fortschritts — _(P2, Launch)_
- **B-075** Werk verschenken (Gift-Leihe) — _(P3, Post-Launch)_
- **B-076** Wartelisten für limitierte Inhalte — _(P3, Post-Launch)_
- **B-077** Konfigurierbare Leihdauer pro Werk — _(P3, Launch)_
- **B-078** ✅ Tausch-Regeln: Kontingent-Anrechnung konfigurierbar (countsAgainstQuota) — _(P2, Beta)_
- **B-079** Automatische Verlängerung (opt-in) — _(P3, Launch)_
- **B-080** ✅ Leih-Limit-Hinweise und Restkontingent-Anzeige — _(P2, Beta)_
- **B-081** Stornierung einer Leihe innerhalb Kulanzfrist — _(P3, Launch)_
- **B-082** Ablauf-Worker auf BullMQ/Redis umstellen — _(P2, Launch)_
- **B-083** Leih-Historie mit erneutem Leihen aus dem Verlauf — _(P3, Launch)_
- **B-084** Familien-/geteilte Ausleihen — _(P3, Post-Launch)_

## Epic 8 – Abos & Billing

- **B-085** ✅ Mehrere Abo-Stufen mit unterschiedlichem Kontingent (LITE/STANDARD/PREMIUM) — _(P1, Beta)_
- **B-086** Kostenlose Testphase (Trial) — _(P2, Launch)_
- **B-087** Gutscheine / Promo-Codes — _(P2, Launch)_
- **B-088** Plan-Upgrade/Downgrade mit Proration — _(P2, Launch)_
- **B-089** Rechnungen / Belege als PDF — _(P2, Launch)_
- **B-090** Abrechnungsverlauf im Konto — _(P2, Launch)_
- **B-091** ✅ Zahlungsmethode verwalten (Billing Portal) — _(P1, Launch)_
- **B-092** Geschenk-Abos — _(P3, Post-Launch)_
- **B-093** Jahresabo mit Rabatt — _(P3, Launch)_
- **B-094** Pausieren des Abos — _(P3, Post-Launch)_
- **B-095** Kontingent-Übertrag (Rollover) ungenutzter Leihen — _(P3, Post-Launch)_
- **B-096** Familien-/Team-Abos — _(P3, Post-Launch)_
- **B-097** Regionsabhängige Preisgestaltung — _(P3, Post-Launch)_
- **B-098** Dunning / Mahnwesen bei fehlgeschlagener Zahlung — _(P2, Launch)_

## Epic 9 – Künstlervergütung & Auszahlungen

- **B-099** ✅ Konfigurierbarer Auszahlungs-Mindestbetrag — _(P2, Launch)_
- **B-100** ✅ Automatische periodische Auszahlungen — _(P2, Launch)_
- **B-101** Mehrwährungs-Auszahlungen — _(P2, Post-Launch)_
- **B-102** Steuerformulare / Tax-Reporting (z. B. DAC7) — _(P2, Launch)_
- **B-103** Monatliche Vergütungs-Abrechnung (Statement) — _(P2, Launch)_
- **B-104** Einnahmen-Splits bei Kollaborationen — _(P3, Post-Launch)_
- **B-105** Vergütungs-Vorschau / Prognose — _(P3, Launch)_
- **B-106** ✅ Auszahlungs-Historie mit Statusverfolgung (über GET /payouts/items) — _(P2, Launch)_
- **B-107** Anpassbarer Vergütungssatz pro Aktion (Leihe/Verlängerung) — _(P3, Launch)_
- **B-108** Rückbuchungen / Korrekturen bei Erstattungen — _(P2, Launch)_
- **B-109** ✅ CSV-Export der Vergütungsdaten — _(P2, Beta)_
- **B-110** Bonus-/Förderpool für neue Künstler:innen — _(P3, Post-Launch)_

## Epic 10 – Payments-Härtung (Stripe)

- **B-111** ✅ Idempotenz-Keys für alle Stripe-Mutationen — _(P1, Launch)_
- **B-112** ✅ Webhook-Event-Deduplizierung und Persistenz — _(P1, Launch)_
- **B-113** Retry-/Dead-Letter-Handling für Webhooks — _(P2, Launch)_
- **B-114** Strong Customer Authentication (SCA/3DS) — _(P1, Launch)_
- **B-115** Reconciliation-Job (Stripe ↔ DB) — _(P2, Launch)_
- **B-116** Erstattungen (Refunds) über die API — _(P2, Launch)_
- **B-117** Stripe-Tax-Integration — _(P3, Post-Launch)_
- **B-118** Alternative Zahlungsmethoden (SEPA, PayPal) — _(P3, Post-Launch)_

## Epic 11 – Benachrichtigungen

- **B-119** ◐ Transaktionale E-Mails — Mail-Service-Abstraktion vorhanden (Dev-Stub); Provider-Anbindung offen — _(P1, Beta)_
- **B-120** E-Mail-Templates mit Lokalisierung — _(P2, Launch)_
- **B-121** Web-Push-Benachrichtigungen — _(P2, Launch)_
- **B-122** Mobile Push (APNs/FCM) — _(P2, Launch)_
- **B-123** Tägliche/wöchentliche Digest-Mails — _(P3, Launch)_
- **B-124** ✅ Granulare Benachrichtigungs-Einstellungen (abgedeckt durch B-028) — _(P1, Beta)_
- **B-125** Abmelde-Links / Unsubscribe-Management — _(P1, Launch)_
- **B-126** ✅ „Neues Werk von gefolgter Künstler:in"-Alert — _(P2, Launch)_
- **B-127** SMS-Benachrichtigungen (optional) — _(P3, Post-Launch)_
- **B-128** In-App-Benachrichtigungs-Center mit Filtern — _(P3, Launch)_

## Epic 12 – Social & Community

- **B-129** ✅ Bewertungen (Sterne) für Werke — _(P2, Launch)_
- **B-130** ✅ Rezensionen / Textbewertungen — _(P2, Launch)_
- **B-131** ✅ Moderation von Rezensionen — _(P2, Launch)_
- **B-132** Kommentare zu Werken — _(P3, Post-Launch)_
- **B-133** Öffentliche Playlists / Sammlungen durch Nutzer:innen — _(P2, Launch)_
- **B-134** Werk teilen (Deep-Links, Social-Cards) — _(P2, Launch)_
- **B-135** Empfehlung an Freund:innen — _(P3, Launch)_
- **B-136** Künstler-Updates / Posts an Follower — _(P3, Post-Launch)_
- **B-137** Reaktionen / „Gefällt mir" — _(P3, Post-Launch)_
- **B-138** Nutzer-Badges / Gamification — _(P3, Post-Launch)_
- **B-139** Melden von Bewertungen/Kommentaren — _(P2, Launch)_
- **B-140** Hörer-Statistik „Mein Jahr bei CreatorLend" — _(P3, Post-Launch)_

## Epic 13 – Künstler-Dashboard & Analytics

- **B-141** ✅ Dashboard-Verlauf der Ausleihen über die Zeit — _(P2, Beta)_
- **B-142** ✅ Kennzahlen pro Werk (Leihen, Verlängerungen, Umsatz) — _(P2, Beta)_
- **B-143** Geografische Verteilung der Hörer:innen — _(P3, Launch)_
- **B-144** Conversion-Funnel (Detailseite → Leihe) — _(P3, Launch)_
- **B-145** Vergleich von Werken / Zeiträumen — _(P3, Launch)_
- **B-146** Echtzeit-Aktivitäts-Feed — _(P3, Post-Launch)_
- **B-147** Export der Analytics (CSV/PDF) — _(P3, Launch)_
- **B-148** Follower-Wachstumskurve — _(P3, Launch)_
- **B-149** Benchmark gegen Kategorie-Durchschnitt — _(P3, Post-Launch)_
- **B-150** Einnahmen-Prognose im Dashboard — _(P3, Post-Launch)_

## Epic 14 – Admin & Moderation

- **B-151** ✅ Admin-Rolle und Backoffice-Bereich — _(P1, Beta)_
- **B-152** ✅ Inhalts-Moderation (prüfen/sperren) — _(P1, Launch)_
- **B-153** Melde-Workflow für unangemessene Inhalte — _(P2, Launch)_
- **B-154** ✅ Nutzerverwaltung (sperren/entsperren) — _(P2, Launch)_
- **B-155** ✅ Audit-Log aller Admin-Aktionen — _(P2, Launch)_
- **B-156** Feature-Flags / Remote-Konfiguration — _(P2, Launch)_
- **B-157** Manuelle Auszahlungs-Freigabe / Review — _(P2, Launch)_
- **B-158** Support-Ticket-/Anfragen-Verwaltung — _(P3, Launch)_
- **B-159** Massen-Aktionen (Werke/Nutzer) — _(P3, Post-Launch)_
- **B-160** Betrugs-/Missbrauchserkennung (Leih-Muster) — _(P2, Post-Launch)_

## Epic 15 – Mobile Apps

- **B-161** React-Native-(Expo-)App-Grundgerüst im Monorepo — _(P1, Launch)_
- **B-162** Mobile Authentifizierung / sicherer Token-Speicher — _(P1, Launch)_
- **B-163** Mobiler Audio-Player mit Hintergrundwiedergabe — _(P1, Launch)_
- **B-164** Sperrbildschirm-/Mediensteuerung — _(P2, Launch)_
- **B-165** Offline-Downloads (leihgebunden) — _(P2, Post-Launch)_
- **B-166** Push-Benachrichtigungen mobil — _(P2, Launch)_
- **B-167** In-App-Abo über App-Store-Billing — _(P3, Post-Launch)_
- **B-168** CarPlay / Android Auto — _(P3, Post-Launch)_
- **B-169** Mobile Discovery & Suche — _(P2, Launch)_
- **B-170** App-Store-Veröffentlichung (iOS/Android) — _(P2, Launch)_

## Epic 16 – Internationalisierung & Barrierefreiheit

- **B-171** i18n-Framework für die Web-UI — _(P2, Launch)_
- **B-172** Übersetzungen (mind. DE/EN) — _(P2, Launch)_
- **B-173** Mehrwährungs-Anzeige im Frontend — _(P3, Post-Launch)_
- **B-174** WCAG-2.2-Konformität (AA) — _(P2, Launch)_
- **B-175** Tastatur-Navigation und Screenreader-Support — _(P2, Launch)_
- **B-176** Lokalisierte Datums-/Zahlenformate — _(P3, Launch)_

## Epic 17 – Infrastruktur & DevOps

- **B-177** ✅ CI-Pipeline (Lint, Test, Build) — _(P1, Beta)_
- **B-178** CD-Pipeline mit Staging/Prod-Umgebungen — _(P1, Launch)_
- **B-179** Infrastructure-as-Code (Terraform) — _(P2, Launch)_
- **B-180** Container-Images + Registry + Health-Checks — _(P1, Launch)_
- **B-181** Datenbank-Backups mit Recovery-Tests — _(P1, Launch)_
- **B-182** Zero-Downtime-Migrationen-Strategie — _(P2, Launch)_
- **B-183** Secrets-Management (Vault/Cloud KMS) — _(P1, Launch)_
- **B-184** Autoscaling für API und Worker — _(P2, Launch)_
- **B-185** Redis für Cache und BullMQ in Prod — _(P2, Launch)_
- **B-186** Blue-Green-/Canary-Deployments — _(P3, Post-Launch)_

## Epic 18 – Sicherheit & Compliance

- **B-187** Globales Rate-Limiting / WAF — _(P1, Launch)_
- **B-188** Security-Header und CSP — _(P2, Launch)_
- **B-189** Audit-Logging sicherheitsrelevanter Events — _(P2, Launch)_
- **B-190** DSGVO: Lösch- und Auskunftsprozesse end-to-end — _(P1, Launch)_
- **B-191** Cookie-Consent / Tracking-Einwilligung — _(P2, Launch)_
- **B-192** Penetrationstests und Dependency-Scans — _(P2, Launch)_
- **B-193** Verschlüsselung sensibler Daten at-rest — _(P2, Launch)_
- **B-194** Bug-Bounty- / Responsible-Disclosure-Programm — _(P3, Post-Launch)_

## Epic 19 – Performance & Skalierung

- **B-195** Caching-Schicht für Discovery/Detailseiten — _(P2, Launch)_
- **B-196** Datenbank-Indizes und Query-Optimierung — _(P2, Launch)_
- **B-197** Lasttests und Performance-Budgets — _(P2, Launch)_

## Epic 20 – Qualität, Observability & Testing

- **B-198** OpenTelemetry-Tracing + zentrale Logs/Metriken — _(P1, Launch)_
- **B-199** Erweiterte e2e-/Integrationstest-Suite + Coverage-Gate — _(P2, Launch)_
- **B-200** Fehler-Monitoring und Alerting (z. B. Sentry) — _(P1, Launch)_

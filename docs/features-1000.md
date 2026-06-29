# CreatorLend – Erweiterter Feature-Katalog (1000 Features)

Features F-001 bis F-1000. Ergänzt den bestehenden Backlog (B-001–B-200).

**Legende** – Priorität: **P1** hoch · **P2** mittel · **P3** nice-to-have

---

## 1. Nutzer & Authentifizierung (F-001–F-080)

| ID | Feature | Prio |
|----|---------|------|
| F-001 | Passkey / WebAuthn Login (FIDO2) als Alternative zu Passwort | P1 |
| F-002 | OAuth 2.0 Login via Google | P1 |
| F-003 | OAuth 2.0 Login via Apple | P1 |
| F-004 | OAuth 2.0 Login via Spotify | P2 |
| F-005 | Zwei-Faktor-Authentifizierung via TOTP (Google Authenticator) | P1 |
| F-006 | Zwei-Faktor-Authentifizierung via SMS | P2 |
| F-007 | Backup-Codes für 2FA (10 Einmal-Codes) | P1 |
| F-008 | Session-Management: alle Sitzungen auf einen Blick + Remote-Logout | P1 |
| F-009 | Geräteverwaltung: Name, Browser, letzter Login je Token | P2 |
| F-010 | Login-Benachrichtigung bei neuer Geräteanmeldung per E-Mail | P1 |
| F-011 | Verdächtige Login-Erkennung (ungewöhnliche IP/Land) | P1 |
| F-012 | Account-Sperrung nach N Fehlversuchen mit Cooldown | P1 |
| F-013 | reCAPTCHA / hCaptcha bei Registrierung und Login | P2 |
| F-014 | Magic-Link Login (passwordless per E-Mail) | P2 |
| F-015 | Einladungsbasierte Registrierung (Beta-Zugang via Invite-Code) | P2 |
| F-016 | Warteliste für neue Nutzer:innen mit E-Mail-Benachrichtigung | P2 |
| F-017 | Stufenweise Accounterstellung (Onboarding in 3 Schritten) | P1 |
| F-018 | Profilbild-Upload direkt bei Registrierung | P2 |
| F-019 | Nutzernamen-Vorschläge bei Registrierung (aus Display-Name) | P3 |
| F-020 | E-Mail-Adresse ändern mit Re-Verifizierung | P1 |
| F-021 | Passwort-Stärke-Meter im Frontend | P2 |
| F-022 | Passwort-Historie (letzte 5 Passwörter dürfen nicht wiederverwendet werden) | P2 |
| F-023 | Passwort-Reset via SMS-Code als Alternative zu E-Mail | P2 |
| F-024 | Account-Löschung mit 30-Tage-Wiederherstellungsfenster | P1 |
| F-025 | Anonymisierung statt Löschung (DSGVO Art. 17) | P1 |
| F-026 | Konto-Deaktivierung (temporäre Pause ohne Löschung) | P2 |
| F-027 | Nutzer:in kann eigenes Konto auf ARTIST upgraden | P1 |
| F-028 | ARTIST kann auf LISTENER downgraden (Werke bleiben, neu = DRAFT) | P2 |
| F-029 | Verifiziertes Abzeichen für bekannte Künstler:innen (Admin-vergabe) | P2 |
| F-030 | Unterkonten / Team-Accounts für Labels (mehrere Künstler:innen) | P3 |
| F-031 | API-Keys für Nutzer:innen (für Drittanbieter-Integrationen) | P2 |
| F-032 | OAuth-App-Verwaltung (welche Apps haben Zugriff) | P2 |
| F-033 | Nutzer:in kann Token-Scopes einschränken | P2 |
| F-034 | Bot-Schutz: Rate-Limit auf Registrierung (max 5/IP/Stunde) | P1 |
| F-035 | IP-Blocklist für bekannte Spam-Ranges | P2 |
| F-036 | Nutzer-ID portierbar exportieren (DSGVO Art. 20) | P1 |
| F-037 | Login-History der letzten 90 Tage abrufbar | P2 |
| F-038 | Nutzer:in kann eigene Daten-Kategorien einzeln exportieren | P2 |
| F-039 | Konto-Zusammenführung (zwei Accounts mergen) | P3 |
| F-040 | Notfall-Kontakt-E-Mail für Account-Recovery | P3 |
| F-041 | Altersprüfung bei Registrierung (COPPA / 13+) | P1 |
| F-042 | Elternkontrolle: Kinder-Modus ohne Explicit-Content | P2 |
| F-043 | Familiengruppe (bis zu 6 Mitglieder unter einem Plan) | P3 |
| F-044 | Schüler-/Studenten-Rabatt via E-Mail-Verifikation (.edu) | P2 |
| F-045 | Barrierefreiheits-Profil (Kontraststärke, Schriftgröße) im Account | P2 |
| F-046 | Cookie-Consent-Banner mit Granular-Optionen | P1 |
| F-047 | Nutzungsbedingungen-Versionierung mit Zustimmungspflicht bei Updates | P1 |
| F-048 | Privacy-Policy-Versionshistorie im Account einsehbar | P2 |
| F-049 | Account-Transfer auf andere E-Mail-Adresse | P3 |
| F-050 | SSO für Unternehmenskunden (SAML 2.0) | P3 |
| F-051 | Biometrische Auth in mobiler App (FaceID / Fingerprint) | P1 |
| F-052 | PIN-Schutz für sensible Aktionen (Auszahlung, Löschung) | P2 |
| F-053 | Auto-Logout nach X Minuten Inaktivität (konfigurierbar) | P2 |
| F-054 | Persistent-Login "Remember me" (30-Tage-Token) | P1 |
| F-055 | Nutzer:in kann Account temporär einfrieren (30 Tage kein Zugriff) | P3 |
| F-056 | Blockchain-basierte Identitätsverifikation (optional, Web3) | P3 |
| F-057 | Notfall-Admin-Zugang per Recovery-Code für gesperrte Accounts | P2 |
| F-058 | Zero-Knowledge-Proof für Altersnachweis (datenschutzkonform) | P3 |
| F-059 | Nutzerprofil-Sichtbarkeit: öffentlich / nur Follower / privat | P2 |
| F-060 | Username-Reservierung für verifizierte Marken | P2 |
| F-061 | Account-Import von Konkurrenzplattformen (CSV) | P3 |
| F-062 | Einladungslinks für Freunde mit Bonus-Kontingent | P2 |
| F-063 | Referral-Code bei Registrierung eingeben | P2 |
| F-064 | Affilate-Dashboard für Empfehlungspartner | P3 |
| F-065 | Nutzer:in-Badge-System (Early Adopter, Power Listener etc.) | P3 |
| F-066 | Nutzerprofil-Themen (farbige Profilseite) | P3 |
| F-067 | Profilbild-KI-Generierung (Avatar aus Initialen) | P3 |
| F-068 | Account-gesundheits-Score (Vollständigkeit des Profils %) | P3 |
| F-069 | Nutzerprofil-QR-Code (für Visitenkarten, Poster) | P2 |
| F-070 | NFC-Tag für Profil (Künstler:in teilt Profil per Tap) | P3 |
| F-071 | Nutzerprofil-Einbettungscode (embed card für Websites) | P3 |
| F-072 | Account-Aktivitäts-Zusammenfassung (monatliche E-Mail) | P2 |
| F-073 | Nutzerpräferenzen: bevorzugte Content-Typen wählbar | P2 |
| F-074 | Inhaltsfilter-Einstellungen (Sprachen ausschließen) | P2 |
| F-075 | Nutzer-Segmentierung für A/B-Tests (intern) | P2 |
| F-076 | Nutzer:in kann Tracking opt-out (Analytics) | P1 |
| F-077 | Do-Not-Track Header wird respektiert | P1 |
| F-078 | Consent-Management per API (für Compliance-Reports) | P2 |
| F-079 | DSGVO-Auskunftsanfrage automatisch beantwortbar (Art. 15) | P1 |
| F-080 | Nutzer:in kann Widerspruch gegen Profiling einlegen (Art. 21) | P1 |

---

## 2. Inhalte & Werkeverwaltung (F-081–F-180)

| ID | Feature | Prio |
|----|---------|------|
| F-081 | Drag-and-Drop-Upload für Audio-Dateien im Web | P1 |
| F-082 | Batch-Upload: mehrere Dateien gleichzeitig hochladen | P1 |
| F-083 | Upload-Fortschrittsanzeige mit Abbruch-Option | P1 |
| F-084 | Automatische Audio-Transkodierung (MP3 → AAC/Opus) | P1 |
| F-085 | Qualitätsstufen: 128 kbps / 256 kbps / Lossless | P2 |
| F-086 | Audio-Fingerprinting zur Duplikatserkennung (B-AcoustID) | P2 |
| F-087 | ISRC-Code-Verwaltung für Musikwerke | P2 |
| F-088 | ISBN / EAN für Hörbücher hinterlegen | P2 |
| F-089 | Automatische Lautstärke-Normalisierung (ReplayGain / EBU R128) | P2 |
| F-090 | Spektrum-Analyse nach Upload (Qualitätsprüfung) | P3 |
| F-091 | Cover-Art aus Metadaten extrahieren (ID3-Tags) | P2 |
| F-092 | Metadaten-Import aus ID3/FLAC-Tags (Auto-Befüllung) | P1 |
| F-093 | Metadaten-Export als CSV/JSON für alle Werke | P2 |
| F-094 | Bulk-Edit: mehrere Werke gleichzeitig bearbeiten | P2 |
| F-095 | Werk-Versionierung (v1, v2 – Neuaufnahme ersetzen) | P2 |
| F-096 | Diff-Ansicht zwischen Werk-Versionen | P3 |
| F-097 | Werk-Archivierung (aus Katalog nehmen ohne Löschen) | P2 |
| F-098 | Soft-Delete für Werke mit 30-Tage-Wiederherstellung | P2 |
| F-099 | Werk klonen (Basis für ähnliches neues Werk) | P2 |
| F-100 | Werk-Vorlage speichern (Standardfelder für neue Werke) | P3 |
| F-101 | Kapitelmarken-Import aus CUE-Sheet | P2 |
| F-102 | Kapitelmarken-Export als CUE-Sheet / Podlove-JSON | P2 |
| F-103 | Transkript-Upload (SRT, VTT, TXT) | P2 |
| F-104 | Automatische Transkription per Whisper AI | P2 |
| F-105 | Transkript-Suche: Volltextsuche innerhalb eines Werks | P1 |
| F-106 | Transkript-Synchronisierung (Highlight beim Abspielen) | P2 |
| F-107 | Automatische Sprachenerkennung aus Audio | P2 |
| F-108 | Untertitel/Captions für Hörgeschädigte | P2 |
| F-109 | Audio-Beschreibung für Sehbehinderte als separates Track | P3 |
| F-110 | Erweiterte Metadaten: Stimmung / Tempo / Genre (KI-generiert) | P3 |
| F-111 | Copyright-Verwaltung: Lizenztyp je Werk (CC, proprietär) | P1 |
| F-112 | Creative-Commons-Lizenz-Auswahl mit Vorschau | P2 |
| F-113 | Werk-Embargo: ab Datum A bis Datum B verfügbar | P2 |
| F-114 | Geo-Blocking: Werk in bestimmten Ländern sperren | P2 |
| F-115 | Altersfreigabe: FSK / USK / PEGI-Einstufung | P2 |
| F-116 | Inhaltswarnung: benutzerdefinierte Trigger-Warnings | P2 |
| F-117 | Werk-Serien: mehrere Werke zu einer Serie verknüpfen | P2 |
| F-118 | Serien-Reihenfolge festlegen + Fortschritts-Tracking | P2 |
| F-119 | Staffeln innerhalb einer Serie | P2 |
| F-120 | Bonus-Material als nicht-separat leihbarer Anhang | P3 |
| F-121 | Interaktive Transkripte (Anmerkungen, Notizen) | P3 |
| F-122 | Werk-Kommentarspuren (Audio-Anmerkungen des Künstlers) | P3 |
| F-123 | Split-View: Transkript und Player nebeneinander | P2 |
| F-124 | Bookmarks: Textstellen markieren und speichern | P2 |
| F-125 | Bookmarks exportieren (als Textdatei, PDF) | P3 |
| F-126 | Notizen zu Werken (persönliche Anmerkungen) | P2 |
| F-127 | Notizen teilen mit anderen Nutzer:innen | P3 |
| F-128 | Lese-/Hörmodus wechseln (nur Transkript lesen) | P3 |
| F-129 | Werk-Statistiken für Künstler:innen: Abspielzeiten, Abbruchpunkte | P1 |
| F-130 | Heatmap: welche Stellen werden am häufigsten angehört | P2 |
| F-131 | Conversion-Rate: Vorschau → Leihe | P2 |
| F-132 | A/B-Test von Cover-Art und Beschreibungstexten | P3 |
| F-133 | Werk-Promotion: als "Featured" auf Homepage platzieren (Admin) | P2 |
| F-134 | Spotlights: kuratierte Empfehlungslisten vom Redaktionsteam | P2 |
| F-135 | Werk-Embedding: einbettbarer Player für externe Websites | P2 |
| F-136 | Widget-Generator für Künstler:innen-Homepages | P2 |
| F-137 | RSS-Feed pro Künstler:in für Podcast-Apps | P2 |
| F-138 | Atom-Feed für Neuzugänge nach Kategorie | P3 |
| F-139 | OPDS-Katalog für E-Reader/Podcast-Apps | P3 |
| F-140 | Werk-QR-Code generieren (Teilen auf physischen Materialien) | P2 |
| F-141 | NFC-Sticker für Werke (Album-Cover tappt = App öffnet) | P3 |
| F-142 | Schaufenster-Modus: Künstler:in kuratiert Startseite des Profils | P2 |
| F-143 | Werk-Slideshow für Veranstaltungen (Bildschirm-Modus) | P3 |
| F-144 | Automatische Tag-Vorschläge beim Erstellen (KI-basiert) | P2 |
| F-145 | Tag-Synonyme verwalten (Admin: "lofi" = "lo-fi") | P2 |
| F-146 | Kategorie-Hierarchie: Hauptkategorie → Unterkategorie | P2 |
| F-147 | Werk in mehrere Kategorien einordnen | P2 |
| F-148 | Custom-Attribute je WorkType (Podcast: Gastrednerin, Musik: BPM) | P3 |
| F-149 | Werk-Übersetzungen: Titel/Beschreibung in mehreren Sprachen | P2 |
| F-150 | Mehrsprachiges Audio: alternativer Track je Sprache | P3 |
| F-151 | Lyrics / Liedtext-Upload und Sync (LRC-Format) | P2 |
| F-152 | Lyrics-Suche (Volltextsuche in Liedtexten) | P2 |
| F-153 | Chords-Anzeige für Musiker (Gitarrengriffe synchron) | P3 |
| F-154 | MIDI-Download für Klaviermusik-Werke | P3 |
| F-155 | Sheet-Music-PDF-Anhang für Werke | P3 |
| F-156 | Audiodeskription: beschreibender Text für Barrierefreiheit | P2 |
| F-157 | Werk-Thumbnail automatisch aus Waveform generieren | P2 |
| F-158 | Waveform-Visualisierung im Player | P2 |
| F-159 | Spektrogramm-Ansicht für Audiophile | P3 |
| F-160 | 3D-Binaural-Audio-Flag für Werke | P3 |
| F-161 | Dolby Atmos / Spatial Audio Support | P3 |
| F-162 | Chaptered Audiobooks mit Sync-Inhaltsverzeichnis | P2 |
| F-163 | Automatische Kapitelerkennung aus Stille-Segmenten | P3 |
| F-164 | Werk-Zertifizierung (verifiziert, professionell produziert) | P3 |
| F-165 | Exklusiv-Flag: Werk nur auf CreatorLend verfügbar | P2 |
| F-166 | Früh-Zugang: Werk 7 Tage vor Veröffentlichung für Premium-Abos | P2 |
| F-167 | Live-Premiere: Werk wird zum Stichtag erstmals freigegeben | P2 |
| F-168 | Pre-Release-Vorregistrierung für Interessierte | P2 |
| F-169 | Crowd-Funded-Werk: Vorbestellungen finanzieren Produktion | P3 |
| F-170 | Werk-Fortschritt-Tracker für Künstler:innen (Produktion %) | P3 |
| F-171 | Werk-Tagebuch: Künstler:in teilt Entstehungsgeschichte | P3 |
| F-172 | Behind-the-Scenes-Content als Extra für Leiher:innen | P3 |
| F-173 | Work-in-Progress-Hörproben für Follower | P3 |
| F-174 | Werk-Zusammenfassung per KI (2-Satz-Abstract) | P2 |
| F-175 | Automatische Genre-Klassifikation per Machine Learning | P2 |
| F-176 | Ähnlichkeitsberechnung: cosine similarity auf Audio-Features | P3 |
| F-177 | Werk-Duplikatserkennung bei Upload (Fingerprint-Abgleich) | P2 |
| F-178 | Copyright-Scan: Abgleich mit bekannten Werken (automatisch) | P2 |
| F-179 | Werk-Qualitäts-Score (automatisch: Metadaten-Vollständigkeit) | P2 |
| F-180 | Redaktionelle Inhaltsempfehlungen (manuell kuratiert) | P2 |

---

## 3. Discovery & Suche (F-181–F-250)

| ID | Feature | Prio |
|----|---------|------|
| F-181 | Volltext-Suche über Transkripte aller Werke | P1 |
| F-182 | Phonetische Suche (klingende Ähnlichkeit, z. B. "Mayer" → "Maier") | P2 |
| F-183 | Tippfehler-Toleranz in der Suche (Fuzzy-Matching) | P1 |
| F-184 | Autocomplete / Suchvorschläge beim Tippen | P1 |
| F-185 | Suchvorschläge aus eigener Hörhistorie personalisiert | P2 |
| F-186 | Semantische Suche (Bedeutungssuche, nicht nur Keywords) | P2 |
| F-187 | Sprachsuche per Mikrofon | P2 |
| F-188 | Bild-Suche: Cover-Art hochladen, ähnliche finden | P3 |
| F-189 | Suche nach Stimmung: "entspannend", "motivierend" | P2 |
| F-190 | Suche nach Tempo / BPM für Musik | P3 |
| F-191 | Suche nach Sprechstimme (hell, dunkel, sanft) | P3 |
| F-192 | Filter: nur Werke mit Transkript | P2 |
| F-193 | Filter: nur Werke mit Vorschau | P2 |
| F-194 | Filter: nur Werke, die ich noch nicht gehört habe | P2 |
| F-195 | Filter: nur Werke von Künstler:innen, denen ich folge | P1 |
| F-196 | Filter: nur Werke, die in meiner Wunschliste sind | P2 |
| F-197 | Filter: nur neue Werke (letzte 7 Tage) | P2 |
| F-198 | Suchhistorie speichern und löschen | P2 |
| F-199 | Gespeicherte Suchen / Suchabo mit E-Mail-Benachrichtigung | P2 |
| F-200 | Suchresultate als RSS-Feed abonnieren | P3 |
| F-201 | Entdeckungs-Modus: zufälliges Werk aus Kategorie | P2 |
| F-202 | "Lass mich überraschen" – komplett zufälliges PUBLISHED-Werk | P3 |
| F-203 | Mood-Board: Werk-Collage nach Stimmung zusammenstellen | P3 |
| F-204 | Karte der Welt: Werke nach Herkunftsland der Künstler:in | P3 |
| F-205 | Zeitstrahl: Werke nach Erscheinungsjahr durchsuchen | P3 |
| F-206 | Personalisierte Startseite basierend auf Hörverhalten | P1 |
| F-207 | "Weil du X gehört hast"-Empfehlungen | P1 |
| F-208 | Ähnliche Künstler:innen auf Profilseite | P2 |
| F-209 | "Andere Hörer:innen mögen auch…"-Sektion | P2 |
| F-210 | Collaborative Filtering (User-basierte Empfehlung) | P2 |
| F-211 | Content-Based Filtering (Attribute-Ähnlichkeit) | P2 |
| F-212 | Hybrid-Recommender (kombiniert collaborative + content) | P2 |
| F-213 | Empfehlungen nach Tageszeit (Morgen/Abend/Nacht) | P3 |
| F-214 | Empfehlungen nach Wetterlage (API-Integration) | P3 |
| F-215 | Top-Charts nach Land / Region | P2 |
| F-216 | Top-Charts nach Zeitraum (7 Tage / Monat / Jahr) | P1 |
| F-217 | Newcomer-Charts (neue Künstler:innen mit Wachstum) | P2 |
| F-218 | Genre-spezifische Charts | P2 |
| F-219 | Editorielle Bestenliste "Werke des Jahres" | P2 |
| F-220 | Nutzer:innen-Abstimmung für Jahres-Top-10 | P3 |
| F-221 | Kategorieseiten mit editoriellem Intro-Text | P2 |
| F-222 | Sammelseite: "Neu auf CreatorLend" | P1 |
| F-223 | Sammelseite: "Demnächst verfügbar" (Pre-Release) | P2 |
| F-224 | Sammelseite: "Letzte Chance" (Werke laufen bald aus) | P3 |
| F-225 | Sammelseite: "Kostenlos hörbar" (alle mit Vorschau) | P2 |
| F-226 | Saisonale Sammlungen (Weihnachten, Sommer, etc.) | P2 |
| F-227 | Thematische Playlisten vom Redaktionsteam | P2 |
| F-228 | Algorithmisch generierte "Daily Mix"-Playliste | P2 |
| F-229 | "Entdecke deinen Künstler:innen der Woche" | P2 |
| F-230 | Podcast-Staffel-Empfehlungen (binge-worthy) | P2 |
| F-231 | Empfehlungen basierend auf Bookmarks | P3 |
| F-232 | Empfehlungen aus dem sozialen Netzwerk (Was hören Freunde?) | P2 |
| F-233 | Empfehlung per Direktnachricht an Freund:in senden | P2 |
| F-234 | Werk-Teilen via Deep-Link (öffnet App) | P1 |
| F-235 | Werk-Teilen als Rich-Preview-Card (OG-Tags) | P1 |
| F-236 | Werk-Teilen in sozialen Medien (Twitter/X, Instagram, TikTok) | P2 |
| F-237 | Werk-Teilen als E-Mail mit persönlicher Nachricht | P2 |
| F-238 | Werk-Teilen via WhatsApp (native Share-Sheet) | P2 |
| F-239 | Gifting: Leihe als Geschenk für andere Person | P2 |
| F-240 | Geschenk-Codes für Abonnements | P2 |
| F-241 | Wunschliste öffentlich teilen (als URL) | P2 |
| F-242 | Wunschliste für andere Personen sichtbar machen | P2 |
| F-243 | Wunschliste als RSS-Feed | P3 |
| F-244 | Preisalarm für Werke auf der Wunschliste | P3 |
| F-245 | "Wieder verfügbar"-Alarm (wenn Werk re-published wird) | P2 |
| F-246 | Benachrichtigung wenn gefolgte Künstler:in neues Werk veröffentlicht | P1 |
| F-247 | Benachrichtigung wenn gesuchtes Thema neue Werke hat | P2 |
| F-248 | Such-Operator: `artist:"Max Muster"` | P2 |
| F-249 | Such-Operator: `type:podcast duration:>60` | P2 |
| F-250 | Saved-Search-Operator-Syntax dokumentiert und in UI-Hilfe erklärt | P3 |

---

## 4. Leihe & Zugangsverwaltung (F-251–F-320)

| ID | Feature | Prio |
|----|---------|------|
| F-251 | Simultane Leihe desselben Werks auf bis zu 3 Geräten | P2 |
| F-252 | Geräte-Limit pro Leihe konfigurierbar (Admin) | P2 |
| F-253 | Offline-Download für mobile Apps (DRM-geschützt) | P1 |
| F-254 | Offline-Limit: max 10 Werke gleichzeitig heruntergeladen | P2 |
| F-255 | Automatisches Löschen nach Ablauf des Leih-Downloads | P1 |
| F-256 | Download-Qualität wählbar (Datensparmodus) | P2 |
| F-257 | Hintergrund-Download in der App | P1 |
| F-258 | Download-Fortschritt-Widget auf Startbildschirm | P3 |
| F-259 | Leihe schenken: Leihe an andere Nutzer:in übertragen | P2 |
| F-260 | Leihe vormerken: Leihe für zukünftiges Datum reservieren | P2 |
| F-261 | Automatische Verlängerung wenn Kontingent verfügbar | P3 |
| F-262 | Verlängerungs-Erinnerung 48h vor Ablauf | P1 |
| F-263 | Verlängerung per Siri / Google Assistant | P3 |
| F-264 | Ausleihe-Limit je Werk (Exemplar-Modell, B-bibliothek-like) | P3 |
| F-265 | Warteliste wenn Exemplar ausgeliehen (wie Bibliothek) | P3 |
| F-266 | Reservierungs-Benachrichtigung wenn Exemplar frei | P3 |
| F-267 | Leihe pausieren (Urlaubsmodus: Ablauf einfrieren) | P2 |
| F-268 | Leihe fortsetzen nach Pause | P2 |
| F-269 | Max. Pause-Dauer: 14 Tage (konfigurierbar) | P2 |
| F-270 | Leihe-Statistiken für Nutzer:in (Gesamtstunden gehört) | P2 |
| F-271 | Jahres-Zusammenfassung "Wrapped"-Stil | P2 |
| F-272 | Gehör-Tagebuch: alle abgeschlossenen Leihen chronologisch | P2 |
| F-273 | Hörstunden-Ziel setzen (wöchentlich) | P3 |
| F-274 | Fortschritts-Tracker: wie viel % des Werks gehört | P1 |
| F-275 | Auto-Resume: Leihe an Abspielposition fortsetzen | P1 |
| F-276 | Sync-Abspielposition über Geräte hinweg | P1 |
| F-277 | Abspielposition in iCloud / Google Drive sichern | P3 |
| F-278 | Mehrere Lesezeichen je Leihe speichern | P2 |
| F-279 | Lesezeichen mit persönlicher Notiz | P2 |
| F-280 | Lesezeichen exportieren (Zeitcode + Notiz als CSV) | P3 |
| F-281 | Automatischer Schlaf-Timer (15/30/45/60 Min oder Ende Kapitel) | P1 |
| F-282 | Schlaf-Timer: sanftes Ausblenden statt abrupter Stopp | P2 |
| F-283 | Wiedergabegeschwindigkeit: 0.5× bis 3.0× in 0.1-Schritten | P1 |
| F-284 | Pitch-Korrektur bei Geschwindigkeitsänderung | P1 |
| F-285 | Stille überspringen (Auto-Silence-Skip) | P2 |
| F-286 | Kapitel überspringen (einzelnes Kapitel skippen) | P2 |
| F-287 | 30-Sekunden-Rücksprung / 30-Sekunden-Vorsprung | P1 |
| F-288 | Replay letzter 30 Sekunden per Kopfhörer-Doppelklick | P2 |
| F-289 | Equalizer mit Voreinstellungen (Bass Boost, Podcast, etc.) | P2 |
| F-290 | Lautstärke-Normalisierung (Unterschiede zwischen Werken) | P2 |
| F-291 | Crossfade zwischen zwei Werken in Queue | P3 |
| F-292 | Gapless Playback bei Episoden einer Serie | P2 |
| F-293 | Wiedergabe-Queue verwalten (Reihenfolge anpassen) | P1 |
| F-294 | Queue speichern und benennen | P2 |
| F-295 | Up-Next-Vorschau im Player | P2 |
| F-296 | Shuffle-Mode für Playlist / Queue | P2 |
| F-297 | Repeat: ein Werk / ganze Queue | P2 |
| F-298 | Carplay / Android Auto Integration | P2 |
| F-299 | Apple Watch App (Steuerung + Timer) | P3 |
| F-300 | Wear OS App | P3 |
| F-301 | AirPlay 2 Support | P2 |
| F-302 | Chromecast / Google Cast Support | P2 |
| F-303 | Bluetooth AVRCP (Steuerung über Fahrzeug-Lenkrad) | P2 |
| F-304 | Now-Playing-Widget (iOS / Android) | P1 |
| F-305 | Lock-Screen-Controls (Mediensteuerung) | P1 |
| F-306 | Siri-Shortcuts: "Höre weiter mit CreatorLend" | P2 |
| F-307 | Google Assistant: "Play my last CreatorLend book" | P2 |
| F-308 | Alexa Skill für CreatorLend | P3 |
| F-309 | Smart-Speaker-Integration (HomePod, Google Home) | P3 |
| F-310 | Podcatcher-Kompatibilität: Werke als Podcast-Feed abonnieren | P3 |
| F-311 | DLNA / UPnP Streaming für Smart-TVs | P3 |
| F-312 | Leihe auf TV-Bildschirm streamen (Chromecast-Button im Player) | P2 |
| F-313 | Familienfreigabe: Leihe innerhalb Familiengruppe teilen | P3 |
| F-314 | Kindersicherung: Kinder-Profil mit eingeschränktem Katalog | P2 |
| F-315 | Zeitbegrenzung für Kinder-Profil (z. B. max 2h/Tag) | P3 |
| F-316 | Eltern-Dashboard: Was hört das Kind? | P3 |
| F-317 | Leihe-Verlauf anonymisieren / löschen | P2 |
| F-318 | "Privat hören"-Modus (kein Verlauf, keine Empfehlung) | P2 |
| F-319 | Inkognito-Modus für einzelne Leihe | P3 |
| F-320 | Leihe-Quittung per E-Mail nach Ausleihe | P2 |

---

## 5. Zahlungen & Monetarisierung (F-321–F-420)

| ID | Feature | Prio |
|----|---------|------|
| F-321 | Pay-per-Leihe ohne Abo (Einzelkauf einer Leih-Periode) | P2 |
| F-322 | Kauf-Option: Werk dauerhaft erwerben (kein Ablaufdatum) | P3 |
| F-323 | Micropayment: Trinkgeld an Künstler:in senden | P2 |
| F-324 | Spende-Button auf Künstlerprofil | P2 |
| F-325 | Ko-fi / Patreon-Link auf Profil einbinden | P2 |
| F-326 | Bundel-Angebote: 3 Werke zum Preis von 2 | P3 |
| F-327 | Saisonaler Sale: zeitlich begrenzte Preissenkungen | P2 |
| F-328 | Dynamisches Pricing je nach Nachfrage (optional für Künstler:in) | P3 |
| F-329 | Preisuntergrenzen und -obergrenzen (Admin-Policy) | P1 |
| F-330 | Freemium: bestimmte Werke kostenlos leihen (ad-supported) | P3 |
| F-331 | Werbung im Free-Tier (Audio-Ads vor/nach Werk) | P3 |
| F-332 | Ad-Server-Integration (Google Ad Manager, etc.) | P3 |
| F-333 | Werbe-freie Erfahrung für bezahlende Nutzer:innen | P2 |
| F-334 | Kreditkarte via Stripe Elements speichern | P1 |
| F-335 | SEPA-Lastschrift als Zahlungsmethode | P2 |
| F-336 | PayPal als Zahlungsmethode | P2 |
| F-337 | Klarna / Buy-Now-Pay-Later Integration | P3 |
| F-338 | Apple Pay Integration | P2 |
| F-339 | Google Pay Integration | P2 |
| F-340 | Kryptowährung als Zahlungsmethode (optional) | P3 |
| F-341 | Rechnungsadresse hinterlegen und bearbeiten | P1 |
| F-342 | USt-ID für Geschäftskunden (B2B) | P2 |
| F-343 | Reverse Charge für EU-Geschäftskunden | P2 |
| F-344 | Rechnungs-PDF automatisch generieren und zuschicken | P1 |
| F-345 | Rechnungsarchiv: alle Belege im Account | P1 |
| F-346 | Abo pausieren (1–3 Monate, Zahlung aussetzen) | P2 |
| F-347 | Abo-Reaktivierung nach Pause | P2 |
| F-348 | Upgrade-Prorating (sofortige Gutschrift beim Planwechsel) | P1 |
| F-349 | Downgrade am Periodenende (kein sofortiger Datenverlust) | P1 |
| F-350 | Kontingent-Aufstockung: Extra-Leihen kaufen (Add-on) | P2 |
| F-351 | Rollover: nicht genutzte Kontingente in nächste Periode | P3 |
| F-352 | Gutschein-Stack: mehrere Codes gleichzeitig einlösen | P3 |
| F-353 | Cashback-Programm: Punkte pro Leihe sammeln | P3 |
| F-354 | Punkte gegen Gratis-Leihen einlösen | P3 |
| F-355 | Loyalitätsstufen: Bronze/Silber/Gold je Laufzeit | P3 |
| F-356 | Abo-Jubiläum: Bonus-Leihe zum 1-Jahres-Geburtstag | P3 |
| F-357 | Früherbucher-Rabatt für neue Planoptionen | P3 |
| F-358 | Studenten-Abo (50% Rabatt, verifiziert) | P2 |
| F-359 | NGO-Abo (Rabatt für gemeinnützige Organisationen) | P3 |
| F-360 | Unternehmensabo: Sammelrechnung für Teams | P3 |
| F-361 | Auszahlung via Banküberweisung (SEPA) | P1 |
| F-362 | Auszahlung via PayPal | P2 |
| F-363 | Auszahlung via Wise (TransferWise) | P2 |
| F-364 | Mindest-Auszahlungsbetrag konfigurierbar (Standard: 10 €) | P1 |
| F-365 | Auszahlung auf Anfrage (statt monatlichem Rhythmus) | P2 |
| F-366 | Auszahlungskalender: fixer Termin (z. B. 1. jeden Monats) | P2 |
| F-367 | Auszahlungshistorie mit Status (PENDING/PAID/FAILED) | P1 |
| F-368 | Steuer-Reporting: Jahresbeleg mit Gesamtumsatz | P1 |
| F-369 | Umsatzsteuer-Vorausmeldung-Export (für Österreich/Deutschland) | P2 |
| F-370 | 1099-K Formular für US-Künstler:innen | P2 |
| F-371 | Stripe Tax Integration (automatische MwSt-Berechnung) | P2 |
| F-372 | Revenue-Share konfigurierbar: Künstler:in bekommt 70% (Admin) | P1 |
| F-373 | Bonus-Revenue-Share für Premium-Künstler:innen (80%) | P3 |
| F-374 | Streaming-Royalties: Vergütung je Stream-Minute (Alternative) | P3 |
| F-375 | Metered Billing: Nutzer:in zahlt nur für tatsächlich Geh. Zeit | P3 |
| F-376 | Künstler:in kann Preisempfehlung setzen (Marktplatz-Modell) | P2 |
| F-377 | Plattform-Preisdeckel: Leihe max. 5 € (Policy) | P1 |
| F-378 | Kostenfreie Leihe für Rezensenten (Review-Copies) | P2 |
| F-379 | Pressekopien: Zugangscodes für Journalist:innen | P2 |
| F-380 | Sponsoring-Feature: Unternehmen sponsert freie Leihen | P3 |
| F-381 | Bibliotheks-Lizenz: pauschale Nutzungslizenz für Büchereien | P3 |
| F-382 | Schullizenz: Bildungseinrichtungen erhalten Klassenzugang | P3 |
| F-383 | Künstler:in kann Rabattcodes für eigene Werke ausgeben | P2 |
| F-384 | Affiliate-Provision: 10% auf vermittelte Abos | P2 |
| F-385 | Publisher-Deal: Verlag betreut mehrere Künstler:innen | P3 |
| F-386 | Multi-Artist-Einnahmenteilung für Kollaborationen | P2 |
| F-387 | Split-Payments: Einnahmen automatisch auf mehrere Konten | P2 |
| F-388 | Escrow für ausstehende Zahlungsstreitigkeiten | P3 |
| F-389 | Rückerstattungs-Dashboard für Künstler:innen (Übersicht) | P2 |
| F-390 | Chargeback-Management und Dispute-Protokoll | P2 |
| F-391 | Betrugs-Erkennung: ungewöhnliche Auszahlungsmuster (Flag) | P1 |
| F-392 | KYC (Know Your Customer) für Auszahlungen ab 1000€/Jahr | P1 |
| F-393 | ID-Verifizierung via IDnow / Onfido Integration | P2 |
| F-394 | Stripe Identity für Identitätsverifizierung | P2 |
| F-395 | AML-Screening für hohe Auszahlungen | P2 |
| F-396 | Einnahmen-Vorhersage: KI schätzt nächsten Monat | P3 |
| F-397 | Break-Even-Rechner für Künstler:innen (wann ist Produktion bezahlt) | P3 |
| F-398 | Einnahmen-Ziel setzen und Fortschritt tracken | P3 |
| F-399 | Vergleich mit ähnlichen Künstler:innen (Benchmark anonym) | P3 |
| F-400 | Einnahmen-Widget für Künstler:innen-Dashboard | P2 |
| F-401 | Echtzeit-Benachrichtigung bei Auszahlung ("Du hast 47€ erhalten") | P1 |
| F-402 | Steuer-Assistent: Buchhaltungsexport für Datev / ELSTER | P2 |
| F-403 | Einnahmen-Split für Labelverträge (z. B. 50/50) | P3 |
| F-404 | Lizenzgebühren-Abwicklung für Fremd-Content | P3 |
| F-405 | Crowdfunding-Rückerstattung wenn Mindest-Ziel nicht erreicht | P3 |
| F-406 | Spendenquittung für gemeinnützige Künstler:innen-Projekte | P3 |
| F-407 | Mikrotransaktionen: Einzelkapitel kaufen/leihen | P3 |
| F-408 | Token-basierte Währung auf der Plattform (Credits) | P3 |
| F-409 | Credits mit Echtgeld kaufen oder verdienen | P3 |
| F-410 | Credit-Transfer zwischen Nutzern | P3 |
| F-411 | Abonnement-Rechnung als XML (ZUGFeRD / XRechnung) | P2 |
| F-412 | EU-VAT-Compliance-Report für Plattform (OSS) | P2 |
| F-413 | Währungsauswahl: EUR / USD / GBP (multi-currency) | P2 |
| F-414 | Automatische Währungsumrechnung per Stripe FX | P2 |
| F-415 | Preise je Land unterschiedlich (PPP-Anpassung) | P3 |
| F-416 | Lokale Preisgestaltung für Schwellenländer | P3 |
| F-417 | Gratis-Monat bei Jahres-Abo im Vergleich zu monatlich | P1 |
| F-418 | Abo-Verlängerungs-Erinnerung 7 Tage vor Ablauf | P1 |
| F-419 | Preiserhöhungs-Ankündigung 30 Tage vorher per E-Mail | P1 |
| F-420 | Bestandskunden-Schutz: Preis für 12 Monate eingefroren | P2 |

---

## 6. Künstler:innen-Tools (F-421–F-500)

| ID | Feature | Prio |
|----|---------|------|
| F-421 | Artist-Dashboard: Übersicht aller Werke und Einnahmen | P1 |
| F-422 | Dashboard-Widgets frei anordnen (Drag-and-Drop) | P3 |
| F-423 | Echtzeit-Statistiken: aktive Leihen gerade jetzt | P2 |
| F-424 | Einnahmen-Chart: tagesgenaue Ansicht | P1 |
| F-425 | Einnahmen-Chart: wöchentlich / monatlich / jährlich | P1 |
| F-426 | Werk-Performance-Vergleich: Welches Werk läuft am besten? | P1 |
| F-427 | Follower-Wachstum über Zeit | P2 |
| F-428 | Geografische Auswertung: Hörer:innen nach Land/Region | P2 |
| F-429 | Demografische Auswertung: Altersgruppe / Geschlecht | P3 |
| F-430 | Device-Split: Web / iOS / Android | P2 |
| F-431 | Tageszeit-Auswertung: Wann wird gehört? | P2 |
| F-432 | Abbruch-Rate je Werk und Kapitel | P2 |
| F-433 | Durchschnittliche Hördauer je Leihe | P2 |
| F-434 | Verlängerungs-Rate je Werk | P2 |
| F-435 | Tausch-Rate: wie oft wird dieses Werk weggegeben? | P2 |
| F-436 | Wunschlisten-Aufnahmen zählen | P2 |
| F-437 | Favoriten-Zähler öffentlich/privat konfigurieren | P2 |
| F-438 | Share-Rate: wie oft wurde Werk geteilt? | P2 |
| F-439 | Klick-Rate Preview → Vollwerk | P2 |
| F-440 | Funnel-Visualisierung: Impression → Preview → Leihe | P2 |
| F-441 | UTM-Tracking für externe Verlinkungen | P2 |
| F-442 | Kampagnen-Dashboard für eigene Marketingaktionen | P2 |
| F-443 | E-Mail-Newsletter an Follower senden (in-app) | P2 |
| F-444 | Newsletter-Vorlagen für Werkveröffentlichungen | P2 |
| F-445 | Broadcast-Nachricht an alle Käufer:innen eines Werks | P3 |
| F-446 | Ankündigungs-Funktion: Beitrag auf Künstlerprofil | P2 |
| F-447 | Beitrag mit Bild, Link und Text | P2 |
| F-448 | Beitrag planen (Scheduling für Ankündigungen) | P2 |
| F-449 | Beitrag-Reaktionen (Likes auf Ankündigungen) | P2 |
| F-450 | Beitrag-Kommentare für Follower | P2 |
| F-451 | Kommentar moderieren (löschen, sperren) | P2 |
| F-452 | Direktnachricht an Hörer:in (Antwort auf Review) | P2 |
| F-453 | Massen-DM an neue Follower (Willkommens-Automatisierung) | P3 |
| F-454 | Community-Hub: geschlossene Gruppe für Fans | P3 |
| F-455 | Exklusiv-Posts nur für aktive Leiher:innen | P3 |
| F-456 | Live-Session ankündigen (Stream-Link hinterlegen) | P3 |
| F-457 | Q&A-Session: Hörer:innen stellen Fragen | P3 |
| F-458 | Künstler:innen-Blog auf dem Profil | P3 |
| F-459 | Pressebereich: Bio, Pressefoto, Discography-PDF | P2 |
| F-460 | EPK (Electronic Press Kit) als Download | P2 |
| F-461 | Bühnenrider als geschütztes Dokument (für Veranstalter) | P3 |
| F-462 | Tourplan auf Profil einbinden | P3 |
| F-463 | Veranstaltungs-Widget (nächste Konzerte/Events) | P3 |
| F-464 | Merchandise-Shop-Integration (Shopify-Link) | P3 |
| F-465 | Merch-Showcase im Profil (3 Produkte) | P3 |
| F-466 | Vinyl/CD verkaufen: Verlinkung zu eigenem Shop | P3 |
| F-467 | Crowdfunding-Kampagne aus Profil starten | P3 |
| F-468 | Unterstützer-Leiste: Namen der Top-Supporter anzeigen | P3 |
| F-469 | Meilenstein-Tracking (1. Leihe, 100 Follower, 1000 Leihen) | P2 |
| F-470 | Achievements-System für Künstler:innen | P3 |
| F-471 | Zertifikat für 1.000 Leihen (digitale Auszeichnung) | P3 |
| F-472 | Zusammenarbeit: Co-Autor:in auf Werk angeben | P2 |
| F-473 | Feature-Anfrage: andere Künstler:in auf Werk einladen | P3 |
| F-474 | Duett-Funktion: zwei Künstler:innen produzieren zusammen | P3 |
| F-475 | Remix-Rechte: Original erlaubt offizielle Remixe | P3 |
| F-476 | Stem-Download für lizenzierte Remixes | P3 |
| F-477 | Sample-Clearance-Modul: Samples melden und Lizenz anfragen | P3 |
| F-478 | Werk-Auftragserteilung: Hörer:in beauftragt Künstler:in | P3 |
| F-479 | Commission-Preisliste auf Profil | P3 |
| F-480 | Projektanfragen per Kontaktformular (kein E-Mail-Leak) | P2 |
| F-481 | Verfügbarkeits-Kalender für Aufträge | P3 |
| F-482 | Bewerbung bei Redaktion für kuratierte Playlisten | P2 |
| F-483 | Pitch-Deck für Podcast-Sponsoring erstellen | P3 |
| F-484 | Distributionspartner-Integration (DistroKid, TuneCore) | P3 |
| F-485 | Streaming-Aggregator-Verlinkung (Spotify, Apple Music) | P2 |
| F-486 | Cross-Promotion mit anderen Plattformen (Bandcamp) | P3 |
| F-487 | Bookmaker-API: Live-Leihen von Drittplattformen | P3 |
| F-488 | Embed-Analytics: wer bindet meinen Player ein? | P3 |
| F-489 | QR-Code-Analytics: Scans zählen | P3 |
| F-490 | Link-in-Bio Seite (wie Linktree, aber nativ in CreatorLend) | P3 |
| F-491 | Mobile Dashboard-App (eigenständige Künstler:innen-App) | P3 |
| F-492 | Push-Notifikation bei neuer Leihe (Echtzeit) | P1 |
| F-493 | Push-Notifikation bei neuer Bewertung | P1 |
| F-494 | Push-Notifikation bei neuem Follower | P2 |
| F-495 | Wöchentlicher Einnahmen-Report per E-Mail | P2 |
| F-496 | Monatlicher Performance-Bericht (automatisch) | P2 |
| F-497 | Bericht drucken / als PDF exportieren | P2 |
| F-498 | API-Zugang für externe Analytics-Tools (Zapier, Metabase) | P3 |
| F-499 | Webhook für neue Leihe (Künstler:in erhält sofort Callback) | P3 |
| F-500 | Künstler:innen-Support-Kanal (Priority-Support ab Premium) | P2 |

---

## 7. Hörenden-Erfahrung (F-501–F-570)

| ID | Feature | Prio |
|----|---------|------|
| F-501 | Dark Mode (systemweite Einstellung respektieren) | P1 |
| F-502 | Automatischer Wechsel Dark/Light je Tageszeit | P2 |
| F-503 | Hochkontrast-Modus (WCAG AAA) | P2 |
| F-504 | Lesemodus: vereinfachter, ablenkungsfreier Transkript-View | P2 |
| F-505 | Schriftgröße anpassen (in-App) | P2 |
| F-506 | Schriftart wählen (OpenDyslexic für Legasthenie) | P2 |
| F-507 | Zeilenabstand anpassen | P3 |
| F-508 | Serifenlose vs. Serifen-Schrift wählen | P3 |
| F-509 | Hintergrundgeräusche / Ambientsounds beim Hören | P3 |
| F-510 | Fokusmodus: keine Ablenkungen beim Hören (Web) | P3 |
| F-511 | Countdown-Anzeige verbleibende Leih-Stunden | P2 |
| F-512 | Fortschritts-Balken auf Titelseite (% gehört) | P2 |
| F-513 | Emoji-Reaktionen auf einzelne Stellen im Transkript | P3 |
| F-514 | Szenen-Markierungen: Kulminationspunkte teilen | P3 |
| F-515 | Social Listening: wer hat dasselbe Werk gerade geliehen? | P3 |
| F-516 | Gruppen-Hören: synchrones Abspielen mit Freund:innen | P3 |
| F-517 | Hör-Party: gemeinsamer Chat beim gleichzeitigen Hören | P3 |
| F-518 | Reactions-Overlay während des Hörens (Emoji-Stream) | P3 |
| F-519 | Werk bewerten direkt nach Ablauf der Leihe (Prompt) | P1 |
| F-520 | Bewertungs-Erinnerung nach 24h (wenn nicht bewertet) | P2 |
| F-521 | One-Tap-Stern-Bewertung im Player | P2 |
| F-522 | Ausführliche Bewertung mit bis zu 500 Zeichen | P1 |
| F-523 | Hilfreich-/Nicht-hilfreich-Voting auf Bewertungen | P2 |
| F-524 | Verifizierter-Käufer-Badge auf Bewertungen | P2 |
| F-525 | Spoiler-Warnung für Rezensionen | P2 |
| F-526 | Bewertung nachträglich bearbeiten | P2 |
| F-527 | Öffentliches Profil zeigt Rezensions-History | P3 |
| F-528 | Rezensionen kommentieren (Antworten anderer Hörer:innen) | P3 |
| F-529 | Rezensionen sortieren: neueste / hilfreichste / niedrigste | P2 |
| F-530 | Rezensionen filtern: nur verifizierte Käufer | P2 |
| F-531 | Bewertungsdurchschnitt nach Kriterien (Sprecher, Story, Qualität) | P3 |
| F-532 | Wortcloud aus Rezensionen (automatisch generiert) | P3 |
| F-533 | Sentiment-Analyse der Rezensionen (positiv/negativ/neutral) | P3 |
| F-534 | Kurzfassung der Rezensionen (KI-Zusammenfassung) | P3 |
| F-535 | Eigene Interessen-Tags wählen (Personalisierung) | P1 |
| F-536 | Gesehene Empfehlungen als "nicht interessiert" markieren | P2 |
| F-537 | "Zeig mir mehr davon"-Feedback an Algorithmus | P2 |
| F-538 | Stimmungs-Votum nach dem Hören (Daumen hoch/runter) | P2 |
| F-539 | Wie-war-das-Erlebnis-Feedback nach 3 Monaten Inaktivität | P3 |
| F-540 | Barrierefreiheits-Prüfung der eigenen Player-Einstellungen | P3 |
| F-541 | Tastatur-Navigation im Player (vollständig ohne Maus) | P2 |
| F-542 | Screenreader-Kompatibilität (ARIA-Labels komplett) | P1 |
| F-543 | Focus-Trap im Player (kein Tab-Escape während Hören) | P2 |
| F-544 | Tooltips für alle Funktionen (Onboarding-Overlay) | P2 |
| F-545 | Interaktives Tutorial für Neulinge | P2 |
| F-546 | Contextual Help (? Button neben jeder Funktion) | P2 |
| F-547 | Guided Tour bei erstem Login | P2 |
| F-548 | Skill-Fortschritt: "Du hast schon 5 Werke gehört!" | P3 |
| F-549 | Hörer:in des Monats Badge (Community-Award) | P3 |
| F-550 | Reading Challenge: Ziel für N Werke pro Monat | P3 |
| F-551 | Freund:innen herausfordern (wer hört mehr diesen Monat) | P3 |
| F-552 | Statistik-Sharing: eigene Jahresübersicht teilen | P2 |
| F-553 | Jahresstatistik-Poster (generiertes Bild) | P2 |
| F-554 | Hörstunden-Äquivalent: "Du hast X Bücher gehört = Y Tage" | P3 |
| F-555 | Lieblings-Zitat aus Werk markieren und teilen | P3 |
| F-556 | Zitat-Karte erstellen (Bild mit Text + Cover) | P3 |
| F-557 | Zitat-Galerie auf Nutzerprofil | P3 |
| F-558 | Gelernt-Funktion: Vokabeln oder Konzepte aus Hörbuch | P3 |
| F-559 | Flashcards aus Notizen generieren | P3 |
| F-560 | Integration mit Anki für spaced repetition | P3 |
| F-561 | Hören-und-Lesen: Synchron-Modus (Buch + Audio) | P3 |
| F-562 | E-Book-Upload als Begleitmaterial zum Hörbuch | P3 |
| F-563 | PDF-Leser integriert (für Booklets/Liner Notes) | P3 |
| F-564 | Werk-bezogener Wikipedia-Link (Kontextualisierung) | P3 |
| F-565 | Automatische Ähnlichkeitserkennung zu Sachbüchern | P3 |
| F-566 | Hörtempo-Tracking: individuell optimale Geschwindigkeit | P3 |
| F-567 | A/B-Tempo-Test: empfiehlt optimale Geschwindigkeit | P3 |
| F-568 | Fokus-Score: wie aufmerksam war ich? (Zurückspulhäufigkeit) | P3 |
| F-569 | Lernziel-Assistent für Sachbücher | P3 |
| F-570 | Mindmap aus Hörbuch-Kapitelstruktur generieren | P3 |

---

## 8. Social & Community (F-571–F-640)

| ID | Feature | Prio |
|----|---------|------|
| F-571 | Öffentliche Aktivitäts-Feed (was hören Freund:innen?) | P2 |
| F-572 | Aktivitäts-Feed Privatsphäre-Einstellung | P2 |
| F-573 | Freund:innen-Empfehlung (ähnliche Hörgewohnheiten) | P2 |
| F-574 | Gegenseitiges Folgen (Freundschaft) vs. einseitiges Folgen | P2 |
| F-575 | Follower-Liste öffentlich oder privat | P2 |
| F-576 | Follower-Suche (nach Name oder Slug) | P2 |
| F-577 | Follower blockieren / melden | P2 |
| F-578 | Blocklist verwalten | P2 |
| F-579 | Nutzerprofil melden | P2 |
| F-580 | DM (Direktnachrichten) zwischen Nutzer:innen | P2 |
| F-581 | DM-Anfrage-Filter: nur Follower können DMs senden | P2 |
| F-582 | DM-Reaktionen (Emoji auf Nachrichten) | P3 |
| F-583 | Gruppen-Chat (bis zu 10 Personen) | P3 |
| F-584 | Audio-Nachricht in DMs | P3 |
| F-585 | Werk-Empfehlung per DM teilen | P2 |
| F-586 | Öffentliche Empfehlung ("Ich empfehle X von Künstler Y") | P2 |
| F-587 | Empfehlungs-Feed auf Startseite | P2 |
| F-588 | Kuratierte Nutzer:innen-Playlisten für die Community | P2 |
| F-589 | Community-Playliste: mehrere Nutzer:innen bearbeiten | P3 |
| F-590 | Abstimmung: Werk auf Community-Playliste aufnehmen | P3 |
| F-591 | Foren / Diskussions-Board pro Werk | P3 |
| F-592 | Forum-Beiträge moderieren (Meldung, Hide, Delete) | P3 |
| F-593 | Upvote / Downvote für Forum-Beiträge | P3 |
| F-594 | Thread-Marker: "gelöst" / "highlight" | P3 |
| F-595 | Frage & Antwort-Sektion pro Werk | P3 |
| F-596 | Quiz zu Werk-Inhalten (Künstler:in erstellt) | P3 |
| F-597 | Hörbuch-Buchclub: Gruppe liest+hört synchron | P3 |
| F-598 | Buchclub-Diskussion mit Zeitplan | P3 |
| F-599 | Community-Events Kalender | P3 |
| F-600 | Virtuelles Autogramm: Künstler:in unterschreibt digital | P3 |
| F-601 | Fan-Wall: Nachrichten an Künstler:in (öffentlich) | P3 |
| F-602 | Shoutout: Künstler:in erwähnt Hörer:in öffentlich | P3 |
| F-603 | Leaderboard: aktivste Hörer:innen dieser Woche | P3 |
| F-604 | Wöchentliche Community-Challenge | P3 |
| F-605 | Community-Abstimmung: neues Feature vorschlagen + voten | P2 |
| F-606 | Feedback-Portal (öffentliches Roadmap-Board) | P2 |
| F-607 | Bug-Report direkt aus der App | P2 |
| F-608 | In-App-Umfragen (NPS, CSAT) | P2 |
| F-609 | Community-Label-Programm: Nutzer:innen erstellen Gemeinschaftsprojekte | P3 |
| F-610 | Podcast-Netzwerk: mehrere Künstler:innen unter einem Banner | P3 |
| F-611 | Co-Hosting-Feature für Podcast-Reihen | P3 |
| F-612 | Live-Radio-Ähnlich: Künstler:in streamt live (Simulcast) | P3 |
| F-613 | Live-Kommentare während Simulcast | P3 |
| F-614 | Live-Spenden während Simulcast | P3 |
| F-615 | Replay nach Live-Session als normale Leihe | P3 |
| F-616 | Künstler:innen-Ranking nach Follower-Wachstum | P3 |
| F-617 | Most-Quoted-Stellen (häufig geteilte Zitate) | P3 |
| F-618 | Trending-Themen-Tag-Cloud | P2 |
| F-619 | Hashtag-System für Community-Diskussionen | P3 |
| F-620 | Erwähnungen (@Username) in Beiträgen | P3 |
| F-621 | Benachrichtigung bei Erwähnung | P2 |
| F-622 | Nutzerprofil-Verifizierung durch Community (Vertrauenspunkte) | P3 |
| F-623 | Moderatoren-Rollen für Community-Bereiche | P3 |
| F-624 | Community-Regeln (Terms of Community) veröffentlichen | P2 |
| F-625 | Trolling-Erkennung (wiederholte Meldungen → Auto-Flag) | P2 |
| F-626 | Shadow-Banning für Spam-Accounts | P2 |
| F-627 | Automatische Spam-Erkennung in Kommentaren (ML) | P2 |
| F-628 | Anti-Spam: Wartezeit vor erstem Post (15 Min nach Registrierung) | P2 |
| F-629 | Community-Newsletter (wöchentlich, opt-in) | P2 |
| F-630 | Creator-Spotlight im Community-Newsletter | P2 |
| F-631 | Community-Podcast: Plattform produziert eigenen Podcast | P3 |
| F-632 | User-Generated-Content-Wettbewerbe (Cover-Design, etc.) | P3 |
| F-633 | Community-Abstimmung für Jahres-Best-of | P3 |
| F-634 | Alumni-Programm für Früh-Nutzer:innen | P3 |
| F-635 | Ambassador-Programm für besonders aktive Community-Mitglieder | P3 |
| F-636 | Community-Meetup-Organisierung (virtuell / lokal) | P3 |
| F-637 | Virtue Signaling: "Ich habe X Werke gehört" als Story | P3 |
| F-638 | Content-Warning-Tags Community-gepflegt | P3 |
| F-639 | Community-erstellte Transkripte (Crowdsourcing) | P3 |
| F-640 | Community-Übersetzungen von Transkripten | P3 |

---

## 9. Benachrichtigungen & Kommunikation (F-641–F-700)

| ID | Feature | Prio |
|----|---------|------|
| F-641 | Benachrichtigungs-Grouping: mehrere Leihen = eine Nachricht | P2 |
| F-642 | Benachrichtigungs-Digest: stündlich / täglich / wöchentlich | P1 |
| F-643 | Stille Stunden: keine Push-Notifs zwischen 22–8 Uhr | P2 |
| F-644 | Push-Notiz Scheduling: zum optimalen Zeitpunkt senden | P2 |
| F-645 | Benachrichtigungs-Kanal: In-App / Push / E-Mail je Typ wählbar | P1 |
| F-646 | Slack-Integration: Benachrichtigungen in Slack-Channel | P3 |
| F-647 | Discord-Integration: Webhook-Benachrichtigungen | P3 |
| F-648 | Telegram-Bot für Benachrichtigungen | P3 |
| F-649 | SMS-Benachrichtigungen für wichtige Events | P3 |
| F-650 | Browser-Push-Notifications (Web Push API) | P2 |
| F-651 | E-Mail-Templates mehrsprachig (DE/EN/FR) | P2 |
| F-652 | E-Mail-Personalisierung mit Vorname + erstem Werk | P1 |
| F-653 | Transaktions-E-Mails (Leih-Bestätigung, Abo-Bestätigung) | P1 |
| F-654 | Reminder-E-Mails (Leihe läuft ab, Abo verlängert sich) | P1 |
| F-655 | Re-Engagement-E-Mail nach 30 Tagen Inaktivität | P2 |
| F-656 | Winback-Kampagne nach Abo-Kündigung | P2 |
| F-657 | Post-Leihe E-Mail ("Hat dir X gefallen?") | P2 |
| F-658 | Geburtstags-E-Mail mit Rabattcode | P3 |
| F-659 | Jubiläums-E-Mail (1 Jahr auf CreatorLend) | P3 |
| F-660 | Welcome-Serie (5 E-Mails in 14 Tagen für neue Nutzer:innen) | P2 |
| F-661 | Onboarding-Checkliste per E-Mail (für Künstler:innen) | P2 |
| F-662 | E-Mail-Versand via AWS SES / SendGrid mit Fallback | P1 |
| F-663 | Bounce-Handling: ungültige E-Mails automatisch deaktivieren | P1 |
| F-664 | Spam-Beschwerde-Handling (Feedback-Loops) | P1 |
| F-665 | DKIM / SPF / DMARC für Absender-Domain | P1 |
| F-666 | E-Mail-Öffnungsrate und Klickrate tracken | P2 |
| F-667 | Benachrichtigungs-Analytics für Admins | P2 |
| F-668 | A/B-Test von E-Mail-Betreffzeilen | P3 |
| F-669 | Automatisiertes E-Mail-Sequenz-Management | P2 |
| F-670 | Benachrichtigungs-Log: alle versendeten Nachrichten | P2 |
| F-671 | In-App Notification Bell mit Unread-Count | P1 |
| F-672 | Mark-All-As-Read Funktion | P1 |
| F-673 | Benachrichtigungen archivieren (30 Tage Aufbewahrung) | P2 |
| F-674 | Suche in Benachrichtigungen | P3 |
| F-675 | Benachrichtigung anpinnen (wichtige oben halten) | P3 |
| F-676 | Rich Push Notification mit Bild (Cover-Art) | P2 |
| F-677 | Actionable Push: "Jetzt verlängern" direkt aus Notification | P2 |
| F-678 | Notification-Widget auf Smartphone-Homescreen | P3 |
| F-679 | Benachrichtigungstyp "Neuer Kommentar auf deine Rezension" | P2 |
| F-680 | Benachrichtigungstyp "Dein Werk wurde kuratiert" | P2 |
| F-681 | Benachrichtigungstyp "Meilenstein erreicht (100 Leihen)" | P2 |
| F-682 | Benachrichtigungstyp "Preisänderung eines Favoriten" | P2 |
| F-683 | Benachrichtigungstyp "Promo-Code läuft ab" | P2 |
| F-684 | Benachrichtigungstyp "Empfohlen von Freund:in" | P2 |
| F-685 | Benachrichtigungstyp "Neues Kapitel verfügbar" (Serien) | P2 |
| F-686 | Benachrichtigungstyp "Deine Bewertung wurde upvoted" | P3 |
| F-687 | Benachrichtigungstyp "Buchclub-Sitzung beginnt in 1h" | P3 |
| F-688 | Benachrichtigungstyp "Preissenkung auf Wunschliste" | P2 |
| F-689 | Benachrichtigungstyp "Werk deines Lieblingsartists im Angebot" | P2 |
| F-690 | Benachrichtigungstyp "Neue Antwort auf deine Frage" | P3 |
| F-691 | In-App-Chat mit Support (Live-Chat Widget) | P2 |
| F-692 | Chat-Bot für häufige Support-Fragen | P2 |
| F-693 | Ticket-System für Support-Anfragen | P2 |
| F-694 | SLA-Überwachung für Support-Antwortzeiten | P2 |
| F-695 | FAQ-Artikel direkt in App durchsuchen | P2 |
| F-696 | Status-Page Integration (is.gd-ähnlich für Plattform-Status) | P2 |
| F-697 | Wartungs-Banner mit ETA vor geplanten Ausfällen | P1 |
| F-698 | Incident-E-Mail an alle Betroffenen bei Ausfällen | P2 |
| F-699 | Postmortem-Bericht öffentlich zugänglich | P3 |
| F-700 | In-App-Survey nach Support-Kontakt (CSAT) | P2 |

---

## 10. Admin & Moderation (F-701–F-760)

| ID | Feature | Prio |
|----|---------|------|
| F-701 | Admin-Oberfläche (separates Frontend für Backoffice) | P1 |
| F-702 | Rollenbasiertes Admin-Zugriffssystem (SuperAdmin/Editor/Support) | P1 |
| F-703 | Admin-Aktionen mit verpflichtender Notiz-Begründung | P2 |
| F-704 | Admin-Audit-Log mit IP-Adresse | P1 |
| F-705 | Admin-Session-Timeout: 15 Min Inaktivität | P2 |
| F-706 | Admin-IP-Whitelist (nur bestimmte Büro-IPs) | P2 |
| F-707 | 2FA-Pflicht für alle Admin-Accounts | P1 |
| F-708 | Admin-Übergabe-Protokoll bei Personalwechsel | P2 |
| F-709 | Dashboard: neue Nutzer:innen heute / Woche / Monat | P1 |
| F-710 | Dashboard: Umsatz heute / Woche / Monat | P1 |
| F-711 | Dashboard: aktive Leihen gerade jetzt | P1 |
| F-712 | Dashboard: Meldungen in der Queue | P1 |
| F-713 | Nutzer:in-Suche nach E-Mail, Name, ID | P1 |
| F-714 | Nutzer:in-Profilansicht (alle Daten im Admin) | P1 |
| F-715 | Nutzer:in-Impersonation (Login als Nutzer:in für Support) | P2 |
| F-716 | Nutzer:in-Notizen (interne Support-Anmerkungen) | P2 |
| F-717 | Nutzer:in-Tags (VIP, At-Risk, Flagged) | P2 |
| F-718 | Massen-E-Mail an gefilterte Nutzergruppe | P2 |
| F-719 | Massen-Aktion: Promo-Code an Segment ausgeben | P2 |
| F-720 | Meldungs-Queue: priorisiert nach Alter und Typ | P1 |
| F-721 | Meldung zuweisen an Support-Agent | P2 |
| F-722 | Meldungs-Status-Tracking (Open/In Progress/Resolved) | P1 |
| F-723 | Auto-Assign Meldungen nach Kategorie an Team | P2 |
| F-724 | Eskalations-Pfad: Meldung → Senior → Legal | P2 |
| F-725 | Content-Moderations-Warteschlange (Werke in Review) | P1 |
| F-726 | Hash-basierte Bildprüfung gegen CSAM-Datenbank (PhotoDNA) | P1 |
| F-727 | Audio-Screening gegen bekannte Copyright-Verletzungen | P2 |
| F-728 | KI-gestützte Moderation: Auto-Flag bei verdächtigen Werken | P2 |
| F-729 | Human-in-the-Loop für KI-Flagging (Agent bestätigt) | P2 |
| F-730 | DMCA-Takedown-Workflow (Eingang → Prüfung → Aktion) | P1 |
| F-731 | Counter-Notice-Funktion (Künstler:in widerspricht Takedown) | P2 |
| F-732 | Strikesystem: 3 Verstöße → Account-Sperrung | P2 |
| F-733 | Verwarnung mit Deadline (Inhalt in 48h korrigieren) | P2 |
| F-734 | Appeal-Prozess für gesperrte Accounts | P2 |
| F-735 | Altersverifikations-Prüfung für Explicit-Content | P2 |
| F-736 | Geo-Block: Werk in Land X sperren (Admin-Aktion) | P2 |
| F-737 | IP-Geo-Lookup für verdächtige Login-Locations | P2 |
| F-738 | Fraud-Score je Nutzer:in (internes Risk-Rating) | P2 |
| F-739 | Chargebacks-Report und Dispute-Übersicht | P1 |
| F-740 | PEP/Sanktionslisten-Screening für Auszahlungen | P2 |
| F-741 | Plattform-weite Ankündigung (Banner für alle Nutzer:innen) | P2 |
| F-742 | Notfall-Abschaltung (Maintenance-Mode per Toggle) | P1 |
| F-743 | Feature-Flags: Features an/aus ohne Deploy | P2 |
| F-744 | A/B-Test-Zuweisung per Admin konfigurieren | P2 |
| F-745 | Config-as-Code: Plattform-Parameter via Datei ändern | P2 |
| F-746 | Backfill-Job: Datenmigration per Admin-Trigger | P2 |
| F-747 | Data-Export für Datenschutzbehörden (Art. 58 DSGVO) | P1 |
| F-748 | Lösch-Log: DSGVO-konforme Nachweispflicht | P1 |
| F-749 | Retention-Policy: Daten nach X Jahren automatisch löschen | P2 |
| F-750 | Datenbankbackup-Status-Anzeige im Admin | P2 |
| F-751 | Disaster-Recovery-Testplan dokumentiert | P2 |
| F-752 | Change-Management-Protokoll für Produktions-Deployments | P2 |
| F-753 | Release-Notes automatisch aus Git-History generieren | P3 |
| F-754 | Admin-Benachrichtigung bei kritischen Fehlern (PagerDuty) | P1 |
| F-755 | On-Call-Rotationsplan für Engineering | P2 |
| F-756 | Runbook für häufige Incidents | P2 |
| F-757 | Uptime-Monitoring mit 1-Minuten-Intervall | P1 |
| F-758 | Synthetic Monitoring: API-Endpunkte automatisch testen | P2 |
| F-759 | Error-Budget-Tracking (SLO 99,9%) | P2 |
| F-760 | Platform-Statistiken-Export als CSV für Stakeholder-Reports | P2 |

---

## 11. Analytics & Reporting (F-761–F-820)

| ID | Feature | Prio |
|----|---------|------|
| F-761 | Self-Service-Analytics-Portal für Künstler:innen | P2 |
| F-762 | Custom-Dashboards: eigene Charts zusammenstellen | P3 |
| F-763 | Daten-Export als CSV / XLSX / JSON / PDF | P2 |
| F-764 | Echtzeit-Daten-Stream via WebSocket | P3 |
| F-765 | Cohort-Analyse: Nutzer:innen nach Registrierungs-Monat | P2 |
| F-766 | Retention-Kurve: Wie viele Nutzer:innen nach N Tagen aktiv? | P2 |
| F-767 | Churn-Rate je Abo-Plan | P2 |
| F-768 | LTV (Lifetime Value) je Abo-Plan | P2 |
| F-769 | CAC (Customer Acquisition Cost) aus Marketing-Daten | P3 |
| F-770 | MRR / ARR Dashboard für Investoren | P2 |
| F-771 | Umsatz nach Künstler:in (Top 10 Verdiener:innen) | P2 |
| F-772 | Umsatz nach Kategorie | P2 |
| F-773 | Umsatz nach Land | P2 |
| F-774 | Conversion-Rate: Trial → Paid Subscription | P1 |
| F-775 | Funnel-Report: Register → Activate → Borrow → Renew | P1 |
| F-776 | Drop-Off-Analyse: wo verlassen Nutzer:innen den Funnel? | P2 |
| F-777 | Engagement-Score: kombinierter Index aus Aktivitäten | P2 |
| F-778 | DAU / WAU / MAU Tracking | P1 |
| F-779 | Sticky Factor: DAU/MAU Verhältnis | P2 |
| F-780 | Feature-Adoption-Rate je Funktion | P2 |
| F-781 | Session-Länge-Histogramm | P2 |
| F-782 | Page-Views je Route (API-Aufruf-Tracking) | P2 |
| F-783 | Core-Web-Vitals Tracking (LCP, FID, CLS) | P2 |
| F-784 | Suchterm-Popularität und CTR | P2 |
| F-785 | Null-Treffer-Suchen (Suchterme ohne Ergebnis) | P2 |
| F-786 | Empfehlungs-CTR (Algorithmus-Performance) | P2 |
| F-787 | A/B-Test-Ergebnisse automatisch auswerten | P2 |
| F-788 | Statistik-Export für BI-Tools (Metabase, Tableau) | P2 |
| F-789 | Data-Warehouse-Integration (BigQuery / Snowflake) | P3 |
| F-790 | ETL-Pipeline für täglichen Daten-Snapshot | P3 |
| F-791 | Prädiktives Churn-Modell (warnt 30 Tage vorher) | P3 |
| F-792 | Empfehlungs-Offline-Modell täglich neu trainieren | P3 |
| F-793 | Anomalie-Erkennung: Einnahmenspitze / -einbruch | P2 |
| F-794 | Fake-Play-Erkennung: unnatürliche Leih-Muster | P2 |
| F-795 | Betrugs-Dashboard: verdächtige Nutzer:innen | P2 |
| F-796 | Bot-Traffic-Anteil in Analytics | P2 |
| F-797 | Datenschutz-konforme Analytics (kein Cookie ohne Consent) | P1 |
| F-798 | First-Party-Tracking ohne Drittanbieter-Cookies | P2 |
| F-799 | Plausible / Umami als Datenschutz-freundliche Alternative | P2 |
| F-800 | Custom-Event-Tracking (beliebige Events loggen) | P2 |
| F-801 | Attribution: woher kommen neue Nutzer:innen? | P2 |
| F-802 | UTM-Parameter automatisch tracken und auswerten | P2 |
| F-803 | Influencer-Tracking: welcher Creator bringt meiste Registrierungen | P3 |
| F-804 | App-Store-Ranking-Monitoring | P3 |
| F-805 | Review-Monitoring auf App-Stores und Google Play | P3 |
| F-806 | Social-Media-Mention-Monitoring | P3 |
| F-807 | Brand-Sentiment-Analyse aus Rezensionen/Kommentaren | P3 |
| F-808 | Competitor-Benchmarking (Marktvergleich anonym) | P3 |
| F-809 | NPS-Umfrage automatisch alle 90 Tage | P2 |
| F-810 | CSAT-Score nach Support-Kontakt | P2 |
| F-811 | Feature-Request-Voting Analytics | P2 |
| F-812 | Heatmap-Analytics für Web (Hotjar-Alternative) | P3 |
| F-813 | Session-Recording für UX-Optimierung (datenschutzkonform) | P3 |
| F-814 | Formular-Analytics: Felder mit hohem Abbruch | P3 |
| F-815 | Error-Tracking mit Stack-Traces (Sentry vollständig) | P2 |
| F-816 | Performance-Profiling für langsame API-Endpoints | P2 |
| F-817 | Slow-Query-Log für Datenbankoptimierung | P2 |
| F-818 | Cache-Hit-Rate-Monitoring (Redis) | P2 |
| F-819 | CDN-Bandbreiten-Nutzung tracken | P2 |
| F-820 | Kostenanalyse: Infrastrukturkosten je Feature | P3 |

---

## 12. Mobile & Offline (F-821–F-870)

| ID | Feature | Prio |
|----|---------|------|
| F-821 | Native iOS App (Swift / SwiftUI) | P1 |
| F-822 | Native Android App (Kotlin / Compose) | P1 |
| F-823 | Progressive Web App (PWA) mit Offline-Support | P1 |
| F-824 | App-Clip (iOS) für schnellen Zugang ohne Install | P2 |
| F-825 | Instant App (Android) für schnellen Zugang | P2 |
| F-826 | Offline-Modus: volle Funktionalität ohne Netz | P1 |
| F-827 | Offline-Queue: Aktionen werden bei Reconnect ausgeführt | P2 |
| F-828 | Auto-Sync bei Verbindungswiederherstellung | P1 |
| F-829 | Datensparmodus: niedrigere Qualität im Mobilnetz | P2 |
| F-830 | Wi-Fi-only Download-Option | P2 |
| F-831 | Hintergrund-Refresh: neue Inhalte vorab laden | P2 |
| F-832 | Widget iOS (Fortschritt aktueller Leihe) | P2 |
| F-833 | Widget Android (Quick-Player) | P2 |
| F-834 | Dynamic Island Integration (iOS) | P3 |
| F-835 | Live Activities (iOS): Fortschritt im Sperrbildschirm | P2 |
| F-836 | Notification Extension: Bild in Push-Notification | P2 |
| F-837 | App Shortcuts (iOS: Siri Intents) | P2 |
| F-838 | Android App Shortcuts (Langdruck auf Icon) | P2 |
| F-839 | Haptic Feedback bei Interaktionen | P2 |
| F-840 | Dynamic Type: Systemschriftgröße respektieren | P2 |
| F-841 | VoiceOver vollständig unterstützt (iOS) | P2 |
| F-842 | TalkBack vollständig unterstützt (Android) | P2 |
| F-843 | Reduced Motion: keine Animationen wenn deaktiviert | P2 |
| F-844 | Battery-Saver: weniger Hintergrundaktivität | P2 |
| F-845 | App-Größe < 30 MB (keine On-Demand-Resources) | P2 |
| F-846 | App-Start in unter 2 Sekunden (Cold Start) | P2 |
| F-847 | Smooth Scrolling (60 fps / 120 fps ProMotion) | P2 |
| F-848 | Offline-Werke-Bibliothek offline durchsuchbar | P2 |
| F-849 | Offline-Lesezeichen funktionieren ohne Netz | P2 |
| F-850 | Konflikt-Resolution bei Offline-Aktionen (Optimistic UI) | P2 |
| F-851 | Delta-Sync: nur geänderte Daten übertragen | P2 |
| F-852 | Incremental Download: pausierbar, fortsetzbar | P1 |
| F-853 | Download-Manager mit Fortschritt und Verbleibend-Zeit | P2 |
| F-854 | DRM-geschützte Downloads (Widevine / FairPlay) | P2 |
| F-855 | Ablauf-Check bei Start (abgelaufene Downloads löschen) | P1 |
| F-856 | Storage-Warnung wenn Speicher < 1 GB | P2 |
| F-857 | Auto-Lösch ältester Downloads wenn Speicher voll | P2 |
| F-858 | Deep Linking: creatorlend://work/:id öffnet direkt Werk | P1 |
| F-859 | Universal Links (iOS) / App Links (Android) | P1 |
| F-860 | QR-Code-Scan direkt aus App-Kamera | P2 |
| F-861 | Share-Extension: Werke aus anderen Apps empfehlen | P3 |
| F-862 | Audio-Focus-Management (Podcast unterbricht bei Anruf) | P1 |
| F-863 | Bluetooth-Lautstärke-Sync | P2 |
| F-864 | Kfz-Lautstärke-Profil automatisch erkennen | P3 |
| F-865 | Podcast-Modus: automatisch nächste Episode | P2 |
| F-866 | Schlaf-Tracking-Integration (schläft Nutzer:in ein = Pause) | P3 |
| F-867 | Wecker-Integration: Werk startet als Wecksignal | P3 |
| F-868 | Jogging-Modus: BPM-Sync mit Schrittfrequenz | P3 |
| F-869 | Fahrsicherheits-Warnung wenn Geschwindigkeit > 50km/h (GPS) | P3 |
| F-870 | Kinder-Modus-Button im Player (Lock Screen für Kinder) | P2 |

---

## 13. API & Integrationen (F-871–F-920)

| ID | Feature | Prio |
|----|---------|------|
| F-871 | Öffentliche REST-API v2 (stabile, versionierte Endpoints) | P2 |
| F-872 | GraphQL-API (Alternative für flexiblere Clients) | P3 |
| F-873 | WebSocket-API für Echtzeit-Ereignisse | P2 |
| F-874 | gRPC-Endpoints für interne Dienste | P3 |
| F-875 | API-Rate-Limiting: 100 req/min für free, 1000 für Paid | P1 |
| F-876 | API-Quota-Dashboard für Entwickler:innen | P2 |
| F-877 | OAuth 2.0 Authorization Server (Drittanbieter-Apps) | P2 |
| F-878 | OpenAPI/Swagger-Dokumentation (auto-generiert) | P1 |
| F-879 | API-Playground (Swagger UI zum Ausprobieren) | P2 |
| F-880 | SDKs: JavaScript / Python / Ruby / Go | P3 |
| F-881 | Postman-Collection öffentlich verfügbar | P2 |
| F-882 | API-Changelogs und Deprecation-Policy | P2 |
| F-883 | Webhook-Subscriptions: Drittanbieter erhalten Events | P2 |
| F-884 | Webhook-Signing: HMAC-Signatur für Sicherheit | P1 |
| F-885 | Webhook-Retry mit exponential Backoff | P1 |
| F-886 | Webhook-Dashboard: Logs und Re-Send | P2 |
| F-887 | Zapier-Integration (vorgefertigte Automations) | P2 |
| F-888 | Make (Integromat) Integration | P3 |
| F-889 | n8n Integration | P3 |
| F-890 | IFTTT Applets | P3 |
| F-891 | Spotify-Import: Playlist als CreatorLend-Wunschliste | P3 |
| F-892 | Audible-Import: Hörbuch-History übertragen | P3 |
| F-893 | LastFM-Scrobbling: Hören in LastFM tracken | P3 |
| F-894 | Apple Health Integration: Hörstunden als Achtsamkeit | P3 |
| F-895 | Goodreads-Integration: Buch gelesen → Hörbuch empfohlen | P3 |
| F-896 | Notion-Integration: Notizen aus CreatorLend | P3 |
| F-897 | Obsidian-Integration: Bookmarks + Zitate exportieren | P3 |
| F-898 | Readwise-Integration: Highlights synchronisieren | P3 |
| F-899 | Anki-Integration: Flashcards aus Notizen | P3 |
| F-900 | Kindle-Import: Highlights aus E-Books verknüpfen | P3 |
| F-901 | Calendar-Integration: Hörziel im Kalender eintragen | P3 |
| F-902 | Google Calendar: Buchclub-Termine synchronisieren | P3 |
| F-903 | Outlook-Kalender-Sync | P3 |
| F-904 | Slack Bot: `/creatorlend recommend` gibt Empfehlung | P3 |
| F-905 | Discord Bot: Shared-Playlist für Server | P3 |
| F-906 | Shopify App: Werke direkt aus Shopify-Shop verlinken | P3 |
| F-907 | WordPress-Plugin: Werke auf Blog einbetten | P3 |
| F-908 | Ghost CMS Integration | P3 |
| F-909 | Substack Integration: Podcast-Episoden verlinken | P3 |
| F-910 | CRM-Integration: Kundendaten in HubSpot / Salesforce | P3 |
| F-911 | Marketing-Automation: Mailchimp / Klaviyo | P2 |
| F-912 | CDP-Integration (Segment.io für User-Tracking) | P3 |
| F-913 | BI-Tool: Metabase self-hosted für Künstler:innen | P3 |
| F-914 | IP-Intelligence-API für Geo-Blocking | P2 |
| F-915 | Translation API: automatische Übersetzung von Beschreibungen | P2 |
| F-916 | AI-Content-Moderation API (Perspective API, AWS Rekognition) | P2 |
| F-917 | Payment-Fallback: Mollie wenn Stripe ausfällt | P3 |
| F-918 | Multi-CDN: Cloudflare + Fastly für Redundanz | P2 |
| F-919 | Monitoring-API: Prometheus Metrics Endpoint | P2 |
| F-920 | Log-Aggregation: Loki / Elastic Stack Integration | P2 |

---

## 14. Sicherheit & Compliance (F-921–F-950)

| ID | Feature | Prio |
|----|---------|------|
| F-921 | Content Security Policy (CSP) strict-mode | P1 |
| F-922 | Subresource Integrity (SRI) für CDN-Assets | P1 |
| F-923 | CORS: nur erlaubte Origins | P1 |
| F-924 | Dependency-Scanning (Snyk / Dependabot) | P1 |
| F-925 | Secrets-Scanning in CI (GitLeaks) | P1 |
| F-926 | Container-Image-Scanning (Trivy) | P2 |
| F-927 | SAST: statische Code-Analyse (CodeQL) | P2 |
| F-928 | DAST: dynamische Angriffstests gegen Staging | P2 |
| F-929 | Penetration-Test durch externes Unternehmen (jährlich) | P2 |
| F-930 | Bug-Bounty-Programm (HackerOne / Bugcrowd) | P2 |
| F-931 | Responsible-Disclosure-Policy veröffentlicht | P2 |
| F-932 | Supply-Chain-Sicherheit: SBOM (Software Bill of Materials) | P2 |
| F-933 | mTLS für interne Dienst-zu-Dienst-Kommunikation | P2 |
| F-934 | Secret-Management: HashiCorp Vault / AWS SSM | P2 |
| F-935 | Automatische Secret-Rotation alle 90 Tage | P2 |
| F-936 | Audit-Log für alle Datenbankänderungen (Row-Level) | P2 |
| F-937 | Datenbankzugriff über Least-Privilege-Rollen | P2 |
| F-938 | Verschlüsselung at Rest: AES-256 für alle Daten | P1 |
| F-939 | Verschlüsselung in Transit: TLS 1.3 only | P1 |
| F-940 | Ende-zu-Ende-Verschlüsselung für DMs | P2 |
| F-941 | Key-Rotation ohne Downtime | P2 |
| F-942 | DSGVO-DPA mit allen Sub-Prozessoren unterschrieben | P1 |
| F-943 | SOC 2 Type II Zertifizierung | P3 |
| F-944 | ISO 27001 Konformität | P3 |
| F-945 | HIPAA-Kompatibilität (wenn Gesundheits-Content) | P3 |
| F-946 | CCPA-Compliance für US-Nutzer:innen | P2 |
| F-947 | ePrivacy-Richtlinie für Cookie-Handling | P1 |
| F-948 | Datenschutzfolgeabschätzung (DSFA) dokumentiert | P1 |
| F-949 | Auftragsverarbeitungsvertrag mit Cloud-Providern | P1 |
| F-950 | Jährlicher Sicherheits-Awareness-Training für Team | P2 |

---

## 15. Performance & Infrastruktur (F-951–F-980)

| ID | Feature | Prio |
|----|---------|------|
| F-951 | Horizontal Scaling: API hinter Load Balancer | P1 |
| F-952 | Auto-Scaling: CPU/Memory-basiert (Kubernetes HPA) | P2 |
| F-953 | Database Connection Pooling (PgBouncer) | P1 |
| F-954 | Read-Replicas für Analytics-Queries | P2 |
| F-955 | Redis Cluster für horizontales Cache-Scaling | P2 |
| F-956 | CDN für statische Assets (Bilder, Audio-Segmente) | P1 |
| F-957 | Edge-Computing: Geo-Routing zum nächsten PoP | P2 |
| F-958 | HLS-Streaming (HTTP Live Streaming) für Audio | P2 |
| F-959 | Adaptive Bitrate Streaming (ABR) | P2 |
| F-960 | Audio-Segmentierung: 10s-Chunks im CDN cachen | P2 |
| F-961 | API Response Time P99 < 200 ms (SLO) | P1 |
| F-962 | Datenbankindex-Optimierung (automatisch via pg_stat) | P2 |
| F-963 | Query-Plan-Caching für häufige Prisma-Queries | P2 |
| F-964 | Background-Jobs: BullMQ mit Redis-Persistenz | P2 |
| F-965 | Job-Queue Monitoring Dashboard (Bull Board) | P2 |
| F-966 | Circuit Breaker für externe Services (Stripe, CDN) | P2 |
| F-967 | Graceful Shutdown mit Drain-Timeout (30s) | P1 |
| F-968 | Blue/Green Deployment ohne Downtime | P2 |
| F-969 | Canary Releases: 5% Traffic auf neue Version | P2 |
| F-970 | Feature Flags für inkrementelle Rollouts | P2 |
| F-971 | Datenbankmigrationen ohne Lock (zero-downtime) | P2 |
| F-972 | Backup-Strategy: täglich + stündliche WAL-Archive | P1 |
| F-973 | Point-in-Time-Recovery bis auf 5 Minuten genau | P1 |
| F-974 | Backup-Restore-Test monatlich dokumentiert | P2 |
| F-975 | Multi-Region-Deployment (EU + US) | P3 |
| F-976 | Disaster-Recovery RTO < 1h, RPO < 15 Min | P2 |
| F-977 | Terraform für Infrastructure-as-Code | P2 |
| F-978 | Kubernetes-Cluster mit Helm-Charts | P2 |
| F-979 | CI/CD-Pipeline < 5 Minuten (lint → build → test → deploy) | P2 |
| F-980 | Automatisches Rollback bei Health-Check-Failure | P2 |

---

## 16. Barrierefreiheit (F-981–F-988)

| ID | Feature | Prio |
|----|---------|------|
| F-981 | WCAG 2.2 Level AA vollständig erfüllen | P1 |
| F-982 | Automatische Accessibility-Tests in CI (axe-core) | P2 |
| F-983 | Manuelle Accessibility-Prüfung mit Betroffenen | P2 |
| F-984 | Keyboard-only Bedienbarkeit für alle Kernfunktionen | P1 |
| F-985 | Skip-Navigation-Link (Screenreader-freundlich) | P2 |
| F-986 | ARIA-Live-Regions für dynamische Inhalte | P2 |
| F-987 | Bildschirm-Lupen-Kompatibilität (200% Zoom ohne Verlust) | P2 |
| F-988 | Barrierefreiheitserklärung gemäß BITV 2.0 veröffentlicht | P1 |

---

## 17. Internationalisierung (F-989–F-996)

| ID | Feature | Prio |
|----|---------|------|
| F-989 | i18n-Framework: ICU-Messageformat für alle UI-Texte | P1 |
| F-990 | Sprachen: Deutsch (primär), Englisch, Französisch, Spanisch | P1 |
| F-991 | Automatische Spracherkennung aus Browser/OS-Einstellung | P1 |
| F-992 | RTL-Support: Arabisch, Hebräisch | P3 |
| F-993 | Währungsformat je Locale (€1.234,56 vs $1,234.56) | P2 |
| F-994 | Datums-/Zeitformat je Locale (DD.MM.YYYY vs MM/DD/YYYY) | P2 |
| F-995 | Plural-Regeln je Sprache (1 Werk / 2 Werke) | P2 |
| F-996 | Übersetzungs-Management-System (Crowdin / Phrase) | P2 |

---

## 18. KI & Machine Learning (F-997–F-1000)

| ID | Feature | Prio |
|----|---------|------|
| F-997 | KI-Assistent: "Frag CreatorLend" (Chat über Plattform-Features) | P2 |
| F-998 | Automatische Hörbuch-Zusammenfassung (3 Sätze per KI) | P2 |
| F-999 | KI-generierte Kurzkritik als Orientierungshilfe | P3 |
| F-1000 | Generative Cover-Art für Werke ohne eigenes Bild (opt-in) | P3 |

---

*Erstellt: 2026-06-29 · CreatorLend Feature-Katalog v1.0*

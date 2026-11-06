# Couple App – Projektkontext für Claude

## Ziel
Persönliche Beziehungs-App für zwei Personen (Ben und seine Freundin), **ausschließlich als PWA** für das iPhone.
Keine native App, kein App Store, keine Kosten. Entwicklung auf Windows mit IntelliJ und Claude Code.

## Regeln
- Oberfläche **nur auf Deutsch**.
- Design: siehe Abschnitt **Design-System** unten. Mobile-first, max. 520 px breit, iPhone-Safe-Areas beachten.
- Vor neuen Features erst mit Ben über Umfang und Details sprechen, dann bauen.
- Features einzeln nacheinander umsetzen. Nicht gebaute Features bleiben Platzhalter.
- Nur Dinge bauen, die in einer iOS-PWA funktionieren (keine Homescreen-Widgets, keine Live Activities, kein Hintergrund-Standort).

## Design-System „Modern Romantic & Playful Minimal"
Abgestimmt mit Ben im Claude-Design-Canvas „Couple App – Design" (https://claude.ai/artifact/Y1RMwAFXEquGRC7ssaBSy7).
Liebevoll und verspielt, aber schlicht: viel Weißraum, weiche Formen, keine überladenen Muster.

**Farben** (Code: `src/theme.ts`, CSS-Variablen in `src/styles.css`)
| Token | Wert | Verwendung |
|---|---|---|
| base | #FFF9F5 | Hintergrund |
| coral / coral2 | #FF6B6B → #FF8E85 | Primär-Verlauf (Tage-Zähler, aktive Navigation) |
| coralText | #C93F45 | Korall als Textfarbe (Kontrast) |
| sun | #FFD166 | Pills/Hinweise (z. B. Jahrestag, „kommt bald") |
| lavender | #FFC6FF | Glow-Akzent |
| text | #3A2E39 | Haupttext, auch auf dem Korall-Verlauf (weiß wäre zu kontrastarm) |
| muted | #7A6874 | Untertitel (statt #8C7A86, wegen Lesbarkeit) |

**Bereichsfarben**: Jeder Bereich hat eine Farbwelt (`tones` in `src/theme.ts`). Die Überschrift nutzt die kräftige Farbe (`main`, Icon-Chip mit weißem Icon), die Kacheln darunter hellere Töne derselben Farbe (`tileBg`, `blob`, farbiger `shadow`).
Alltag = peach · Nachrichten = rose · Erinnerungen = lav · Extras = sun. Feature-Seiten übernehmen die Farbe ihres Bereichs.

**Formen & Schrift**: Nunito (800–900 für Überschriften), Line-Height 1.5. Kacheln 22 px Radius, Hero 32 px, Pills voll rund, Icon-Hintergründe als organischer Blob (`.blob`). Weiche, farbige Schatten statt Rändern.

**Icons**: Nur das eigene Set in `src/icons/iconShapes.ts` (runde Line-Art, 24er Raster, Strich 1,8, mit kleinem Herz-/Akzent-Detail), genutzt über `<Icon name stroke accent />`. Neue Icons im gleichen Stil dort ergänzen. `lucide-react` nur für kleine Hilfs-Icons (Pfeil zurück, Stift).

**Interaktionen**: `.press` = federnder Bounce beim Antippen; Kacheln lassen beim Drücken ein Herz in Bereichsfarbe aufsteigen; „Ich denk an dich" lässt Herzen aufsteigen (später zusätzlich Push); `.appear` = weiches Einblenden; dezente schwebende Glows im Hintergrund. `prefers-reduced-motion` respektieren. Vibration/Haptik gibt es in iOS-Safari nicht.

**Navigation**: schwebende Pill-Leiste unten (Start, Alltag, Nachrichten, Erinnerungen). Nachrichten und Erinnerungen öffnen eigene Bereichsseiten (`/nachrichten`, `/erinnerungen`, Komponente `AreaPage`), Alltag springt noch per `/#alltag` aufs Dashboard.

**Handschrift**: Caveat (`@fontsource/caveat`) nur für Notiz-Texte auf Post-its und Hinweise im Zeichenfeld.

## Tech-Stack
- Vite 6 + React 18 + TypeScript, React Router (`/` Dashboard, `/f/:id` Feature-Seiten)
- `vite-plugin-pwa` (Manifest, Service Worker, Offline)
- Icons: eigenes Set (`src/icons/`), `lucide-react` nur für Hilfs-Icons
- **Supabase** (Projekt `couple-app`, Region Frankfurt): Auth per E-Mail + Passwort (keine Mails, „Confirm email" aus), Postgres mit Row Level Security. Öffentliche Werte in `.env` (eingecheckt, enthält nur URL + Publishable Key). Geplant: Realtime, Storage, Edge Functions für Web Push, pg_cron für zeitversetzte Nachrichten.
- Datenbank-Änderungen nur als neue Datei in `supabase/migrations/` (nummeriert, wiederholbar ausführbar), Ben führt sie im SQL Editor aus. Einrichtung: `supabase/EINRICHTUNG.md`.
- Jede neue Tabelle mit gemeinsamen Daten bekommt eine Spalte `couple_id` und RLS-Regeln über `public.my_couple_id()`.
- Hosting auf **Cloudflare** (Workers mit statischen Assets, HTTPS, nötig für Push): `wrangler.jsonc` veröffentlicht `dist/` mit SPA-Fallback. Jeder Push auf `main` wird automatisch veröffentlicht.
- Karte (Weltkarte): Leaflet mit CARTO-Voyager-Kacheln (Schlüssel `VITE_CARTO_KEY` in `.env`, Fallback OpenStreetMap)

## Struktur
- `src/features.ts` – zentrale Liste aller Features und Bereiche (Titel, Icon, Bereich, Status, geplante Funktionen; Bereich → Farbwelt). Dashboard und Platzhalterseiten lesen nur diese Liste.
- `src/theme.ts` – Farb-Tokens und Bereichsfarben
- `src/icons/` – eigenes Icon-Set (`iconShapes.ts`) und `<Icon>`/`<Heart>`-Komponenten
- `src/pages/Dashboard.tsx` – Startseite mit Tage-Zähler und Kacheln nach Bereichen
- `src/pages/FeaturePage.tsx` – generische Platzhalterseite für Features mit `status: 'geplant'`
- `src/components/DaysCounter.tsx` – Tage-Zähler mit „Ich denk an dich"-Button (Startdatum gemeinsam in `couples.start_date`)
- `src/components/FeatureTile.tsx` – Kachel; `src/components/BottomNav.tsx` – Navigation
- `src/lib/supabase.ts` – Supabase-Client; `src/lib/auth.tsx` – `AuthProvider`/`useAuth()` (Session, eigenes Profil, Partner, Paar) und deutsche Fehlermeldungen
- `src/pages/Login.tsx` – Anmelden / Konto erstellen mit E-Mail + Passwort. Bewusst kein Magic Link: Free-Projekte können Mail-Vorlagen nicht ändern, Mails gehen ohne eigenes SMTP nur an Org-Mitglieder, und Links aus Mails öffnen auf dem iPhone Safari statt der PWA.
- `src/pages/Pairing.tsx` – Name, Paar anlegen (Einladungscode) oder mit Code beitreten; wartet per Realtime auf den Partner
- `App.tsx` – Weiche: Laden → Login → Paar-Verknüpfung → App (erst wenn beide verbunden sind)
- `supabase/migrations/0001_paare_und_profile.sql` – Tabellen `profiles`, `couples`, RLS, Funktionen `create_couple()`, `join_couple(code)`, `my_couple_id()`
- `supabase/migrations/0002_erinnerungen.sql` – `places`, `moments`, `countdowns`, `bucket_items`, `date_ideas`, `wishes`, privater Storage-Bucket `memories` (Ordner = couple_id), `seed_date_ideas()` (40 Start-Ideen), `toggle_wish_fulfilled(wish)`
- `src/lib/useCoupleTable.ts` – Hook für Paar-Tabellen: laden, live synchron halten (Realtime + bei Rückkehr in die App), insert/update/remove
- `src/lib/photos.ts` – Fotos verkleinern (max. 1600 px JPEG), hochladen, löschen, signierte URLs (`usePhotoUrl`); `src/lib/dates.ts` – Datums-Helfer; `src/lib/types.ts` – Zeilen-Typen
- Bausteine: `Sheet` (Bottom-Sheet), `SubHeader` (Zurück/Titel/Plus), `Photo`/`PhotoField`, `Empty`, `ConfirmButton` (2× tippen zum Löschen), `HeartBurst` (Herz-Konfetti)
- `src/pages/AreaPage.tsx` – Bereichsübersicht (`/erinnerungen`, `/nachrichten`)
- `supabase/migrations/0003_nachrichten.sql` – `love_notes` (Text und/oder Doodle, Herz nur vom Partner via `toggle_note_heart`), `daily_questions` (150 Fragen, rotiert täglich nach deutscher Zeit), `question_answers` (Schreiben nur über `answer_today()`, nur heute, nicht änderbar; Partner-Antwort per RLS erst nach eigener Antwort bzw. nach Tagesende lesbar), `today_question()`
- `src/pages/features/` – fertige Features: `Weltkarte` (Leaflet + CARTO-Kacheln, Foto-Pins, Ortssuche über Nominatim, lazy geladen), `FotoTimeline` (getrennt von der Karte, Polaroids nach Jahren, „An diesem Tag"), `Countdowns` (Jahrestag automatisch aus `start_date`, jährliche Termine, Live-Zähler), `BucketList` (Kategorien, Konfetti), `DateIdeen` (Würfel, Filter, Ideen-Pool, Wunsch-Box: Wünsche an den Partner, nur der Partner hakt „erfüllt" ab), `Liebesnotizen` (Post-it-Pinnwand inkl. Doodles, Herz-Reaktion), `FrageDesTages` (verpixelte Partner-Antwort, Archiv; Partner-Antworten werden alle 20 s und bei Rückkehr nachgeladen, da RLS sie für Realtime verbirgt), `Doodle` (Komponente `DoodlePad`: 7 Farben, 3 Stärken, Radierer, Rückgängig, Leeren; PNG in Storage, erscheint auch auf der Pinnwand)
- `src/styles.css` – gesamtes Styling

Ein Feature fertig bauen: eigene Seite unter `src/pages/features/<Name>.tsx` anlegen, in `App.tsx` eine Route `/f/<id>` davor eintragen, in `features.ts` `status` auf `'fertig'` setzen.

## Features (12)
| Gruppe | Feature | id |
|---|---|---|
| Alltag zu zweit | Einkaufsliste | einkaufsliste |
| | To-dos / Haushalt | todos |
| | Gemeinsamer Kalender | kalender |
| Nachrichten & Notizen | Liebesnotizen | liebesnotizen |
| | Frage des Tages | frage-des-tages |
| | Doodle / Zeichnung | doodle |
| Erinnerungen | Weltkarte mit Foto-Markern (erster Kuss, erstes Date …) | weltkarte |
| | Foto-Timeline („An diesem Tag vor X Jahren") | foto-timeline |
| | Tage-Zähler & Jahrestage | tage-zaehler |
| | Bucket List | bucket-list |
| | Date-Ideen & Wunschliste | date-ideen |
| Extras | Spiele / Quiz | quiz |

Bewusst weggelassen: Budget, „Bin gleich da"-Standort, Face-ID-Sperre, Chat, Sprachnachrichten, zeitversetzte Liebesnotizen.

## Fahrplan
1. ✅ Gerüst, PWA-Grundlagen, Dashboard mit Platzhalterseiten, Design-System umgesetzt
2. ✅ Supabase einrichten: Datenbank-Schema + Row Level Security
3. ✅ Login (E-Mail + Passwort) und Paar-Verknüpfung per Einladungscode
4. ✅ Hosting auf Cloudflare (Installation auf beiden iPhones noch testen)
5. Web Push (Service Worker + Edge Function, VAPID-Schlüssel)
6. Features einzeln: ✅ Erinnerungen (Weltkarte, Foto-Timeline, Tage & Jahrestage, Bucket List, Date-Ideen) · ✅ Nachrichten (Liebesnotizen, Frage des Tages, Doodle) → offen: Einkaufsliste & To-dos, Kalender, Quiz

## Befehle
- `npm install` – Abhängigkeiten installieren
- `npm run dev` – lokale Entwicklung (http://localhost:5173)
- `npm run dev:handy` – im WLAN auch vom iPhone erreichbar
- `npm run build` – Typprüfung und Produktions-Build nach `dist/`

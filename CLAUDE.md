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

**Navigation**: schwebende Pill-Leiste unten (Start, Alltag, Nachrichten, Erinnerungen); springt per `/#bereich` zum Bereich auf dem Dashboard.

## Tech-Stack
- Vite + React 18 + TypeScript, React Router (`/` Dashboard, `/f/:id` Feature-Seiten)
- `vite-plugin-pwa` (Manifest, Service Worker, Offline)
- Icons: eigenes Set (`src/icons/`), `lucide-react` nur für Hilfs-Icons
- Geplant: **Supabase** (Auth, Postgres mit Row Level Security, Realtime, Storage, Edge Functions für Web Push, pg_cron für zeitversetzte Nachrichten)
- Geplant: Hosting auf **Cloudflare Pages** (HTTPS, nötig für Push). `public/_redirects` sorgt für SPA-Routing.
- Karte (Weltkarte): Leaflet bzw. MapLibre mit OpenStreetMap-Daten

## Struktur
- `src/features.ts` – zentrale Liste aller Features und Bereiche (Titel, Icon, Bereich, Status, geplante Funktionen; Bereich → Farbwelt). Dashboard und Platzhalterseiten lesen nur diese Liste.
- `src/theme.ts` – Farb-Tokens und Bereichsfarben
- `src/icons/` – eigenes Icon-Set (`iconShapes.ts`) und `<Icon>`/`<Heart>`-Komponenten
- `src/pages/Dashboard.tsx` – Startseite mit Tage-Zähler und Kacheln nach Bereichen
- `src/pages/FeaturePage.tsx` – generische Platzhalterseite für Features mit `status: 'geplant'`
- `src/components/DaysCounter.tsx` – Tage-Zähler mit „Ich denk an dich"-Button (Startdatum vorerst in localStorage)
- `src/components/FeatureTile.tsx` – Kachel; `src/components/BottomNav.tsx` – Navigation
- `src/lib/storage.ts` – sicherer localStorage-Wrapper (wird durch Supabase ersetzt)
- `src/styles.css` – gesamtes Styling

Ein Feature fertig bauen: eigene Seite unter `src/pages/features/<Name>.tsx` anlegen, in `App.tsx` eine Route `/f/<id>` davor eintragen, in `features.ts` `status` auf `'fertig'` setzen.

## Features (14)
| Gruppe | Feature | id |
|---|---|---|
| Alltag zu zweit | Einkaufsliste | einkaufsliste |
| | To-dos / Haushalt | todos |
| | Gemeinsamer Kalender | kalender |
| Nachrichten & Notizen | Chat | chat |
| | Liebesnotizen (auch zeitversetzt) | liebesnotizen |
| | Frage des Tages | frage-des-tages |
| | Doodle / Zeichnung | doodle |
| | Sprachnachrichten | sprachnachrichten |
| Erinnerungen | Weltkarte mit Foto-Markern (erster Kuss, erstes Date …) | weltkarte |
| | Foto-Timeline („An diesem Tag vor X Jahren") | foto-timeline |
| | Tage-Zähler & Jahrestage | tage-zaehler |
| | Bucket List | bucket-list |
| | Date-Ideen & Wunschliste | date-ideen |
| Extras | Spiele / Quiz | quiz |

Bewusst weggelassen: Budget, „Bin gleich da"-Standort, Face-ID-Sperre.

## Fahrplan
1. ✅ Gerüst, PWA-Grundlagen, Dashboard mit 14 Platzhalterseiten, Design-System umgesetzt
2. Supabase einrichten: Datenbank-Schema + Row Level Security
3. Login und Paar-Verknüpfung per Einladungscode
4. Hosting auf Cloudflare Pages, Installation auf beiden iPhones testen
5. Web Push (Service Worker + Edge Function, VAPID-Schlüssel)
6. Features einzeln: Einkaufsliste & To-dos → Liebesnotizen → Tage-Zähler → Kalender → Chat → Foto-Timeline → Weltkarte → Doodle → Frage des Tages → Bucket List → Date-Ideen → Sprachnachrichten → Quiz

## Befehle
- `npm install` – Abhängigkeiten installieren
- `npm run dev` – lokale Entwicklung (http://localhost:5173)
- `npm run dev:handy` – im WLAN auch vom iPhone erreichbar
- `npm run build` – Typprüfung und Produktions-Build nach `dist/`

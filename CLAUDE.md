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

**Interaktionen**: `.press` = federnder Bounce beim Antippen; Kacheln lassen beim Drücken ein Herz in Bereichsfarbe aufsteigen; „Ich vermisse dich“ (Herzen) und „Umarmung“ (🤗) steigen auf und schicken einen Push; `.appear` = weiches Einblenden; dezente schwebende Glows im Hintergrund. `prefers-reduced-motion` respektieren. Vibration/Haptik gibt es in iOS-Safari nicht.

**Navigation**: schwebende Pill-Leiste unten (Start, Alltag, Nachrichten, Erinnerungen). Alle Bereiche haben eigene Bereichsseiten (`/alltag`, `/nachrichten`, `/erinnerungen`, `/extras`, Komponente `AreaPage`; Extras ohne eigenen Nav-Punkt).

**Bottom-Sheets** werden per Portal an `<body>` gehängt (animierte Eltern mit `transform` würden `position: fixed` sonst einsperren). Klassennamen wie `.burst` nicht für andere Zwecke wiederverwenden (globale Animationen).

**Handschrift**: Caveat (`@fontsource/caveat`) nur für Notiz-Texte auf Post-its und Hinweise im Zeichenfeld.

## Tech-Stack
- Vite 6 + React 18 + TypeScript, React Router (`/` Dashboard, `/f/:id` Feature-Seiten)
- `vite-plugin-pwa` (Manifest, Service Worker, Offline)
- Icons: eigenes Set (`src/icons/`), `lucide-react` nur für Hilfs-Icons
- **Supabase** (Projekt `couple-app`, Region Frankfurt): Auth per E-Mail + Passwort (keine Mails, „Confirm email" aus), Postgres mit Row Level Security. Öffentliche Werte in `.env` (eingecheckt, enthält nur URL + Publishable Key). Realtime, Storage, Edge Function `notify` für Web Push.
- Datenbank-Änderungen nur als neue Datei in `supabase/migrations/` (nummeriert, wiederholbar ausführbar), Ben führt sie im SQL Editor aus. Einrichtung: `supabase/EINRICHTUNG.md`.
- Jede neue Tabelle mit gemeinsamen Daten bekommt eine Spalte `couple_id` und RLS-Regeln über `public.my_couple_id()`.
- Hosting auf **Cloudflare** (Workers mit statischen Assets, HTTPS, nötig für Push): `wrangler.jsonc` veröffentlicht `dist/` mit SPA-Fallback. Jeder Push auf `main` wird automatisch veröffentlicht.
- Karte (Weltkarte): Leaflet mit CARTO-Voyager-Kacheln (Schlüssel `VITE_CARTO_KEY` in `.env`, Fallback OpenStreetMap)

## Struktur
- `src/features.ts` – zentrale Liste aller Features und Bereiche (Titel, Icon, Bereich, Status, geplante Funktionen; Bereich → Farbwelt). Dashboard und Platzhalterseiten lesen nur diese Liste.
- `src/theme.ts` – Farb-Tokens und Bereichsfarben
- `src/icons/` – eigenes Icon-Set (`iconShapes.ts`) und `<Icon>`/`<Heart>`-Komponenten
- `src/pages/Dashboard.tsx` – Startseite: Zahnrad → Einstellungen, Tage-Zähler, Stimmungs-Ring, Push-Banner, „Heute bei euch“ (`src/components/TodayOverview.tsx`: Tagesfrage-Status, neueste Notiz vom Partner, fällige To-dos inkl. Wiederkehrendem, offene Einkäufe, nächster Countdown inkl. Jahrestag; lädt bei Rückkehr und jede Minute neu) und vier kompakte Bereichskacheln
- `src/pages/FeaturePage.tsx` – generische Platzhalterseite für Features mit `status: 'geplant'`
- `src/components/DaysCounter.tsx` – schlichter Tage-Zähler mit zwei Knöpfen: „Ich vermisse dich“ (Push `miss`) und „Umarmung“ (Push `hug`). Startdatum (`couples.start_date`) ändert man versteckt: lange auf die Zahl drücken oder in den Einstellungen (`StartDateForm` wird exportiert)
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
- `src/pages/AreaPage.tsx` – Bereichsübersicht (`/alltag`, `/nachrichten`, `/erinnerungen`, `/extras`)
- `supabase/migrations/0003_nachrichten.sql` – `love_notes` (Text und/oder Doodle, Herz nur vom Partner via `toggle_note_heart`), `daily_questions` (150 Fragen, rotiert täglich nach deutscher Zeit), `question_answers` (Schreiben nur über `answer_today()`, nur heute, nicht änderbar; Partner-Antwort per RLS erst nach eigener Antwort bzw. nach Tagesende lesbar), `today_question()`
- `src/pages/features/` – fertige Features: `Weltkarte` (Leaflet + CARTO-Kacheln, Foto-Pins, Ortssuche über Nominatim, lazy geladen), `FotoTimeline` (getrennt von der Karte, Polaroids nach Jahren, „An diesem Tag"), `Countdowns` (Jahrestag automatisch aus `start_date`, jährliche Termine, Live-Zähler), `BucketList` (Kategorien, Konfetti), `DateIdeen` (Würfel, Filter, Ideen-Pool, Wunsch-Box: Wünsche an den Partner, nur der Partner hakt „erfüllt" ab), `Liebesnotizen` (Post-it-Pinnwand inkl. Doodles, Herz-Reaktion), `FrageDesTages` (verpixelte Partner-Antwort, Archiv; Partner-Antworten werden alle 20 s und bei Rückkehr nachgeladen, da RLS sie für Realtime verbirgt), `Doodle` (Komponente `DoodlePad`: 18 Stiftfarben inkl. Weiß, 6 Papierfarben, 3 Stärken, Radierer malt in Papierfarbe, Rückgängig, Leeren; Zoom bis 5× mit zwei Fingern oder Lupen-Knöpfen, Ansicht per Canvas-Transform, Export immer ohne Zoom; PNG in Storage, erscheint auch auf der Pinnwand)
- **Push**: `supabase/migrations/0004_push.sql` (`push_subscriptions`, `save_push_subscription(sub_endpoint, sub_p256dh, sub_auth, sub_user_agent)`), `supabase/functions/notify/index.ts` (Deno, `npm:web-push`; Typ `key` liefert den öffentlichen VAPID-Schlüssel, `test` an sich selbst, sonst an alle Geräte des Partners; Texte und Name serverseitig; 404/410-Geräte werden gelöscht; Secrets VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY/VAPID_SUBJECT; JWT-Prüfung in der Funktion selbst), `public/push-sw.js` (per `workbox.importScripts`: push + notificationclick), `src/lib/push.ts` (Status, Aktivieren nur per Antippen, `notifyPartner(type, preview)`, Abmelden löst Gerät), `src/components/PushSettings.tsx` (`PushBanner` auf der Startseite, `PushPanel` als Inhalt für `PushSheet` und Einstellungen: Test-Push, iPhone-Installationsanleitung).
- Push-Auslöser: neue Zeilen in `love_notes`/`moments`/`places`/`countdowns`/`wishes`/`bucket_items` zentral in `useCoupleTable.insert`; zusätzlich Herz-Button, `answer_today`, „Machen wir!“ im Date-Würfel. Neue Auslöser dort bzw. per `notifyPartner` ergänzen und den Text in der Edge Function anlegen.
- **Extras** – `supabase/migrations/0005_extras.sql`:
  - Quiz: `quiz_questions` (80, an die befragte Person gerichtet), `quiz_rounds` (5 Fragen, `submitted` = wer abgegeben hat), `quiz_entries` (eigene Antwort + Tipp; Partner-Einträge per RLS erst nach eigener Abgabe lesbar). Funktionen `quiz_start_round()`, `quiz_submit(r, answers)`, `quiz_judge(entry, correct)` (die befragte Person bewertet den Tipp; Runde endet, wenn alle 10 bewertet sind). Seite `Quiz.tsx` mit Punktestand (richtige Tipps je Person) und Verlauf. Aufdecken in zwei Abschnitten (1 · Tipps über dich bewerten, 2 · deine Tipps über den Partner) mit Status-Banner „Du bist dran / Partner bewertet noch“; wer als Letztes eigene Bewertungen abschließt, schickt Push `quiz-judge` bzw. `quiz-done`; nach Rundenende Karte „Letzte Runde“ mit Ergebnis. „Heute bei euch“ zeigt „Du bist beim Quiz dran“.
  - Stimmung: `moods` (eine Zeile pro Person, `day` = Berlin-Tag, gilt nur heute), `set_mood(m)`. Komponente `MoodRings.tsx` auf der Startseite (8 Stimmungen, Ring = Farbverlauf; beim Partner: Umarmung per Push `hug` oder kurze Nachricht als Liebesnotiz).
  - Zeitkapseln: `capsules` (Hülle sichtbar) + `capsule_contents` (Nachricht, bis 5 Fotos; per RLS für **niemanden** lesbar vor `open_on`), `create_capsule(...)`, `delete_capsule(k)` (nur eigene, gibt Fotopfade zurück). Seite `Zeitkapseln.tsx` (Geschenkboxen in CSS, Öffnen-Animation; „schon geöffnet“ lokal pro Gerät gemerkt).
  - Täglicher pg_cron-Job `couple-capsules` (07:00 UTC) ruft `notify` mit `{"type":"cron"}` und Header `x-cron-secret` (Geheimnis in `private.cron_secret`, Prüfung über `cron_secret_ok`, nur service_role) → Push an beide bei fälligen Kapseln, setzt `notified_at`.
  - Neue Push-Typen in `notify`: `hug`, `quiz`, `capsule`, `cron`.
- **Alltag** – `supabase/migrations/0006_alltag.sql` (keine Pushes, so gewünscht):
  - Einkaufsliste: `shopping_items` (`checked_at` = „Bereits im Wagen“), `shopping_memory` (pro Paar: gelernte Kategorie, Häufigkeit, `pinned` = Favorit), `shopping_remember(name, cat)`, `shopping_set_category(name, cat)`. `src/lib/shopping.ts`: 10 Kategorien in Supermarkt-Reihenfolge, deutsche Wortliste (längstes Stichwort gewinnt, Wörter ≤ 3 Zeichen nur als ganzes Wort), Gedächtnis hat Vorrang. Seite `Einkaufsliste.tsx` (Favoriten = angepinnt + oft gekauft, Doppelte werden nicht neu angelegt).
  - To-dos: `tasks` (einmalig; `assignee` null = beide, `due_on`, `important`), `chores` (wiederkehrend: täglich/wöchentlich/2-wöchentlich/monatlich, `complete_chore(id)` setzt `next_due` = später von (fällig, heute) + Intervall). Seite `ToDos.tsx` (Filter Alle/Meine/Partner, Abschnitte Wiederkehrend · Überfällig · Heute · Demnächst · Irgendwann · Erledigt, „Alles geschafft“-Banner). Komponente `Avatar` (Anfangsbuchstabe, Ich = koralle, Partner = lavendel, beide = Paar).
- **Briefe & Wünsche** – `supabase/migrations/0007_briefe_und_wuensche.sql`:
  - Briefe: `letters` (sender, recipient, message, optional 1 Foto, `deliver_at` mit Uhrzeit, `notified_at`, `opened_at`). Komplette Überraschung: Empfänger liest per RLS erst ab `deliver_at`. Nur über `send_letter(l_message, l_photo_path, l_deliver_at)`, `open_letter(l)`, `delete_letter(l)` (nur Absender, nur vor Zustellung). pg_cron-Job `couple-letters` alle 5 Min. → `notify` mit `{"type":"cron","job":"letters"}` → Push an den Empfänger („Ein Brief von … ist angekommen“), setzt `notified_at`. UI: `src/components/Letter.tsx` (`LetterForm`, `LetterPaper`), Abschnitt „Briefe“ + Knopf „Brief für später schreiben“ in `Liebesnotizen`, `src/components/LetterArrival.tsx` (global in `App.tsx`: ungelesene angekommene Briefe → Umschlag fliegt rein, öffnet sich, Brief erscheint; lädt beim Start, bei Rückkehr und jede Minute).
  - Wünsche (Feature `wuensche`, Seite `Wuensche.tsx`, Icon `wish`): `needs` (Vorlagen in `src/lib/needs.ts`: Umarmungen, gemeinsame Zeit, Überraschungen, Komplimente, Unterstützung im Alltag, Zuhören, Zärtlichkeit, Date-Abend, Ruhe, eigener Text). Herz („gesehen“) nur vom Partner via `toggle_need_heart(n)`, „erfüllt“ hakt nur die Person mit dem Wunsch ab. Nicht verwechseln mit der Wunsch-Box (`wishes`) bei Date-Ideen. Offene Partner-Wünsche erscheinen auch in „Heute bei euch“.
  - Neue Push-Typen: `miss`, `need`, `need-heart` (und Brief-Zustellung im Cron).
- `src/lib/storage.ts` – localStorage nur für gerätebezogene Kleinigkeiten
- `src/pages/Einstellungen.tsx` (`/einstellungen`) – Name (`profiles.display_name`), Startdatum, Benachrichtigungen, Passwort ändern (`auth.updateUser`), Fotospeicher-Anzeige (von 1 GB), „Alles exportieren“, Abmelden
- **Datensicherung**: `src/lib/exportData.ts` (`buildExport` → ZIP mit `daten.json` + `fotos/`, jszip lazy geladen; `deliverFile` per Teilen-Menü oder Download; `storageUsage`). `.github/workflows/backup.yml`: sonntags pg_dump (public, private, auth.users) + Fotos (`scripts/backup-photos.mjs`), nur als AES-verschlüsseltes 7z hochgeladen (Repo ist öffentlich!), Secrets `SUPABASE_DB_URL`, `SUPABASE_SECRET_KEY`, `BACKUP_PASSWORD` (Einrichtung Abschnitt 8)
- `src/components/OfflineBanner.tsx` – Hinweis oben, solange offline
- Bearbeiten: Bucket-List-Einträge, Countdowns und Date-Ideen per Stift/Antippen im Bottom-Sheet (Löschen dort per `ConfirmButton`); `nextOccurrence`/`at` liegen in `src/lib/dates.ts`
- `src/styles.css` – gesamtes Styling

Ein Feature fertig bauen: eigene Seite unter `src/pages/features/<Name>.tsx` anlegen, in `App.tsx` eine Route `/f/<id>` davor eintragen, in `features.ts` `status` auf `'fertig'` setzen.

## Features (13)
| Gruppe | Feature | id |
|---|---|---|
| Alltag zu zweit | Einkaufsliste | einkaufsliste |
| | To-dos / Haushalt (einmalig + wiederkehrend) | todos |
| Nachrichten & Notizen | Liebesnotizen | liebesnotizen |
| | Frage des Tages | frage-des-tages |
| | Doodle / Zeichnung | doodle |
| | Wünsche (was ich gerade brauche) | wuensche |
| Erinnerungen | Weltkarte mit Foto-Markern (erster Kuss, erstes Date …) | weltkarte |
| | Foto-Timeline („An diesem Tag vor X Jahren") | foto-timeline |
| | Tage-Zähler & Jahrestage | tage-zaehler |
| | Bucket List | bucket-list |
| | Date-Ideen & Wunschliste | date-ideen |
| Extras | Spiele / Quiz („Wer kennt wen besser?“) | quiz |
| | Zeitkapseln | zeitkapseln |
| Startseite | Tage-Zähler, Stimmungs-Ring | – |

Bewusst weggelassen: Kalender (ihr nutzt Google Calendar), Budget, „Bin gleich da"-Standort, Face-ID-Sperre, Chat, Sprachnachrichten. (Zeitversetzte Liebesnotizen gibt es jetzt doch – als Briefe mit Zustellzeit.)

## Fahrplan
1. ✅ Gerüst, PWA-Grundlagen, Dashboard mit Platzhalterseiten, Design-System umgesetzt
2. ✅ Supabase einrichten: Datenbank-Schema + Row Level Security
3. ✅ Login (E-Mail + Passwort) und Paar-Verknüpfung per Einladungscode
4. ✅ Hosting auf Cloudflare (Installation auf beiden iPhones noch testen)
5. ✅ Web Push (Service Worker + Edge Function `notify`, VAPID-Schlüssel; Einrichtung siehe `supabase/EINRICHTUNG.md` Abschnitt 5)
6. Features einzeln: ✅ Erinnerungen (Weltkarte, Foto-Timeline, Tage & Jahrestage, Bucket List, Date-Ideen) · ✅ Nachrichten (Liebesnotizen, Frage des Tages, Doodle) · ✅ Extras (Quiz, Zeitkapseln, Stimmungs-Ring) · ✅ Alltag (Einkaufsliste, To-dos). Alle geplanten Features sind gebaut.
7. ✅ Feinschliff: Einstellungen-Seite, Heute-Übersicht auf der Startseite, Export + wöchentliche verschlüsselte Sicherung, Bearbeiten-Funktionen, Offline-Hinweis
8. ✅ Briefe mit Zustellzeit + Umschlag-Animation, Wünsche, „Ich vermisse dich“ + Umarmung auf der Startseite, Zeichnen mit mehr Farben und Zoom (Einrichtung: `EINRICHTUNG.md` Abschnitt 9)

## Befehle
- `npm install` – Abhängigkeiten installieren
- `npm run dev` – lokale Entwicklung (http://localhost:5173)
- `npm run dev:handy` – im WLAN auch vom iPhone erreichbar
- `npm run build` – Typprüfung und Produktions-Build nach `dist/`

# Supabase einrichten (einmalig)

Alles im Supabase-Dashboard deines Projekts `couple-app`.

## 1. Datenbank anlegen
**SQL Editor → New query**, den kompletten Inhalt jeder Datei aus `migrations/` einfügen und **Run** drücken, in der Reihenfolge der Nummern (0001, 0002, …). Neue Dateien kommen dazu, wenn neue Features gebaut werden.
Es sollte „Success. No rows returned" erscheinen. Die Datei darf mehrfach ausgeführt werden.

## 2. Bestätigungsmail ausschalten
**Authentication → Sign In / Providers → Email**: **Confirm email** ausschalten und speichern.
Wir melden uns mit E-Mail und Passwort an und verschicken keine Mails. (Neue kostenlose Projekte können seit Juni 2026 die Mail-Vorlagen nicht ändern, und ohne eigenen Mailserver kommen Mails nur bei Mitgliedern der Supabase-Organisation an.)

## 3. Adressen erlauben
**Authentication → URL Configuration**
- **Site URL:** die Cloudflare-Adresse, z. B. `https://couple-app.<name>.workers.dev`
- **Redirect URLs:** dieselbe Adresse mit `/**` sowie `http://localhost:5173/**`

## 4. Passwort vergessen?
Es gibt keinen Mailversand. Im Dashboard unter **Authentication → Users** den Nutzer löschen und neu registrieren, danach Paar neu verknüpfen; oder Ben setzt das Passwort per SQL zurück (Claude fragen).

## Hinweise
- Datenbank-Passwort und **Secret / service_role key** gehören nie in den Code oder einen Chat.

## 5. Push-Benachrichtigungen (einmalig)

**a) Datenbank:** `migrations/0004_push.sql` im SQL Editor ausführen.

**b) Schlüsselpaar erzeugen** (am PC, in irgendeinem Terminal mit Node):
```
npx web-push generate-vapid-keys
```
Es erscheinen ein **Public Key** und ein **Private Key**. Den Private Key niemandem schicken und nicht in den Code legen.

**c) Secrets eintragen:** Supabase → **Edge Functions → Secrets** (bzw. *Manage secrets*), drei Einträge anlegen:
| Name | Wert |
|---|---|
| `VAPID_PUBLIC_KEY` | Public Key aus Schritt b |
| `VAPID_PRIVATE_KEY` | Private Key aus Schritt b |
| `VAPID_SUBJECT` | `mailto:` + deine E-Mail, z. B. `mailto:ben@beispiel.de` |

**d) Funktion anlegen:** Supabase → **Edge Functions → Deploy a new function → Via Editor**
- Name: `notify` (genau so)
- Den kompletten Inhalt von `functions/notify/index.ts` einfügen, **Deploy** klicken.
- Danach in den Einstellungen der Funktion **„Verify JWT“ / „Enforce JWT verification“ ausschalten** und speichern. Die Funktion prüft die Anmeldung selbst.

**e) Auf beiden iPhones:** App **vom Home-Bildschirm** öffnen → Startseite → **Aktivieren** → Mitteilungen erlauben → **Test-Benachrichtigung senden**.

Benachrichtigungen kommen bei: „Ich denk an dich“, neuer Liebesnotiz oder Doodle, beantworteter Tagesfrage, neuem Moment, Ort, Countdown, Wunsch oder Bucket-List-Eintrag. Gesendet wird immer an die Geräte des Partners.

## 6. Extras: Quiz, Stimmung, Zeitkapseln

**a) Datenbank:** `migrations/0005_extras.sql` im SQL Editor ausführen. Die Datei legt auch einen täglichen Zeitplan an (8 bzw. 9 Uhr deutscher Zeit), der fällige Zeitkapseln per Push meldet.
- Prüfen: **Integrations → Cron** (bzw. *Database → Cron Jobs*) sollte den Job `couple-capsules` zeigen.
- Fehlt er: unter **Database → Extensions** `pg_cron` und `pg_net` aktivieren und die Datei noch einmal ausführen.

**b) Edge Function aktualisieren:** **Edge Functions → notify → Code** öffnen, den Inhalt komplett durch die neue `functions/notify/index.ts` ersetzen und **Deploy** klicken. „Verify JWT" bleibt aus.

## 7. Alltag: Einkaufsliste und To-dos

`migrations/0006_alltag.sql` im SQL Editor ausführen. Die Edge Function muss dafür nicht geändert werden (im Alltag gibt es bewusst keine Pushes).

## 8. Datensicherung (einmalig einrichten)

Der kostenlose Supabase-Plan macht **keine automatischen Backups**. Deshalb gibt es zwei Wege:

**a) In der App:** Einstellungen (Zahnrad oben rechts) → **Alles exportieren**. Lädt alle Texte und Fotos als ZIP-Datei herunter (auf dem iPhone: „In Dateien sichern“). Versiegelte Zeitkapseln bleiben versiegelt.

**b) Automatisch jeden Sonntag über GitHub.** Dazu drei Secrets anlegen: GitHub → Repository **Couple-App** → **Settings → Secrets and variables → Actions → New repository secret**:

| Name | Wert |
|---|---|
| `SUPABASE_DB_URL` | Supabase → oben **Connect** → **Session pooler** → Verbindungs-Text kopieren und `[YOUR-PASSWORD]` durch dein Datenbank-Passwort ersetzen |
| `SUPABASE_SECRET_KEY` | Supabase → **Project Settings → API Keys** → **Secret key** (bzw. `service_role`) |
| `BACKUP_PASSWORD` | ein langes, selbst ausgedachtes Passwort – gut aufschreiben! |

Diese Werte **nie** in Code oder Chat einfügen, nur dort als Secret.

Testen: GitHub → **Actions → Backup → Run workflow**. Nach ein paar Minuten liegt beim Lauf unter **Artifacts** eine Datei `couple-app-backup-<Datum>`. Darin steckt ein verschlüsseltes 7z-Archiv (Datenbank, Konten, Fotos); öffnen mit **7-Zip** und dem `BACKUP_PASSWORD`. Sicherungen bleiben 90 Tage liegen.

Warum verschlüsselt? Das Repository ist öffentlich, und Artifacts öffentlicher Repositories können andere angemeldete GitHub-Nutzer herunterladen.

Nebeneffekt: Der wöchentliche Zugriff hält das Supabase-Projekt wach (kostenlose Projekte pausieren nach 7 Tagen ohne Nutzung).

## 9. Briefe mit Zustellzeit, Wünsche, „Ich vermisse dich“

**a) Datenbank:** `migrations/0007_briefe_und_wuensche.sql` im SQL Editor ausführen. Die Datei legt einen zweiten Zeitplan `couple-letters` an (alle 5 Minuten; ruft die Edge Function nur auf, wenn wirklich ein Brief fällig ist).
- Prüfen: **Integrations → Cron** sollte jetzt `couple-capsules` **und** `couple-letters` zeigen.

**b) Edge Function aktualisieren:** **Edge Functions → notify → Code** komplett durch die neue `functions/notify/index.ts` ersetzen und **Deploy** klicken („Verify JWT“ bleibt aus). Ohne diesen Schritt kommen keine Benachrichtigungen für angekommene Briefe, „Ich vermisse dich“ und neue Wünsche.

**Nachtrag Quiz (8. Nov.):** Die Edge Function `notify` kennt zwei neue Benachrichtigungen („… hat deine Quiz-Tipps bewertet“, „Die Quiz-Runde ist fertig“). Dafür den Code von `functions/notify/index.ts` noch einmal komplett einfügen und **Deploy** klicken. Die Datenbank muss nicht geändert werden.

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

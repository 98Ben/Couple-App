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

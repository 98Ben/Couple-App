# Supabase einrichten (einmalig)

Alles im Supabase-Dashboard deines Projekts `couple-app`.

## 1. Datenbank anlegen
**SQL Editor → New query**, den kompletten Inhalt von `migrations/0001_paare_und_profile.sql` einfügen und **Run** drücken.
Es sollte „Success. No rows returned" erscheinen. Die Datei darf mehrfach ausgeführt werden.

## 2. Mail-Vorlagen auf Deutsch (mit Code)
**Authentication → Emails** (bzw. *Email Templates*). Zwei Vorlagen anpassen, denn neue Konten bekommen beim ersten Mal „Confirm signup", danach „Magic Link":

**Confirm signup** und **Magic Link**, jeweils:

- Betreff: `Dein Code für die Couple App: {{ .Token }}`
- Inhalt (Message body):

```html
<div style="font-family: sans-serif; text-align: center; color: #3A2E39">
  <p style="font-size: 32px; margin: 0">💕</p>
  <h2 style="margin: 8px 0">Dein Anmelde-Code</h2>
  <p>Tipp diesen Code in der Couple App ein:</p>
  <p style="font-size: 34px; font-weight: 800; letter-spacing: 6px; margin: 16px 0">{{ .Token }}</p>
  <p style="color: #7A6874; font-size: 14px">Am Computer kannst du dich auch direkt per Link anmelden:<br>
  <a href="{{ .ConfirmationURL }}" style="color: #C93F45">Hier anmelden</a></p>
</div>
```

Warum der Code: Auf dem iPhone öffnet ein Link aus der Mail immer Safari, nicht die App vom Home-Bildschirm. Die beiden teilen keine Anmeldung. Mit dem Code meldest du dich direkt in der App an.

## 3. Adressen erlauben
**Authentication → URL Configuration**
- **Site URL:** `http://localhost:5173` (später die Cloudflare-Adresse, Schritt 4)
- **Redirect URLs:** `http://localhost:5173/**` hinzufügen

## Hinweise
- Der kostenlose Mailversand von Supabase schafft nur wenige Mails pro Stunde. Für euch zwei reicht das. Wer beim Testen „Zu viele Versuche" sieht, wartet einfach etwas.
- Datenbank-Passwort und **Secret / service_role key** gehören nie in den Code oder einen Chat.

// Supabase Edge Function "notify" – schickt Push-Benachrichtigungen an den Partner.
// Einrichtung: supabase/EINRICHTUNG.md (Abschnitt Push).
// Benötigte Secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (z. B. mailto:du@beispiel.de)
// SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY stellt Supabase automatisch bereit.
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

type Kind = 'key' | 'test' | 'heart' | 'note' | 'doodle' | 'answer' | 'moment' | 'place' | 'countdown' | 'wish' | 'bucket';

const short = (s: unknown, n = 120) => {
  const t = typeof s === 'string' ? s.trim() : '';
  return t.length > n ? t.slice(0, n - 1) + '…' : t;
};

// Texte entstehen hier auf dem Server – der Name kommt aus der Datenbank, nicht vom Gerät
function message(kind: Kind, name: string, preview: string) {
  switch (kind) {
    case 'test':
      return { title: 'Push funktioniert 🎉', body: 'So sehen eure Benachrichtigungen aus.', url: '/' };
    case 'heart':
      return { title: `${name} denkt an dich 💕`, body: 'Tipp hier, um zurückzudenken.', url: '/' };
    case 'note':
      return { title: `Neue Liebesnotiz von ${name} 💌`, body: preview || 'Schau mal auf eure Pinnwand.', url: '/f/liebesnotizen' };
    case 'doodle':
      return { title: `${name} hat dir etwas gezeichnet 🎨`, body: preview || 'Schau mal auf eure Pinnwand.', url: '/f/liebesnotizen' };
    case 'answer':
      return { title: `${name} hat die Frage des Tages beantwortet 💭`, body: 'Antworte auch, dann siehst du die Antwort.', url: '/f/frage-des-tages' };
    case 'moment':
      return { title: 'Neuer Moment in eurer Timeline 📸', body: preview ? `${name}: ${preview}` : `${name} hat einen Moment hinzugefügt.`, url: '/f/foto-timeline' };
    case 'place':
      return { title: 'Neuer Ort auf eurer Karte 🌍', body: preview ? `${name}: ${preview}` : `${name} hat einen Ort markiert.`, url: '/f/weltkarte' };
    case 'countdown':
      return { title: 'Neuer Countdown ⏳', body: preview ? `${name}: ${preview}` : `${name} freut sich auf etwas.`, url: '/f/tage-zaehler' };
    case 'wish':
      return { title: `${name} hat einen neuen Wunsch 💝`, body: preview || 'Schau mal in die Wunsch-Box.', url: '/f/date-ideen' };
    case 'bucket':
      return { title: 'Neuer Traum auf eurer Bucket List ✨', body: preview ? `${name}: ${preview}` : '', url: '/f/bucket-list' };
    default:
      return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Nur POST' }, 405);

  const publicKey = Deno.env.get('VAPID_PUBLIC_KEY');
  const privateKey = Deno.env.get('VAPID_PRIVATE_KEY');
  const subject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:couple-app@example.com';
  if (!publicKey || !privateKey) return json({ error: 'VAPID-Schlüssel fehlen in den Secrets' }, 500);

  let payload: { type?: Kind; preview?: string } = {};
  try {
    payload = await req.json();
  } catch {
    /* leerer Body */
  }
  const kind = payload.type;

  // Öffentlichen Schlüssel für die Anmeldung im Browser ausliefern
  if (kind === 'key') return json({ publicKey });

  // Absender prüfen: gültige Anmeldung der App
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData.user) return json({ error: 'Nicht angemeldet' }, 401);
  const me = userData.user.id;

  const { data: profile } = await admin.from('profiles').select('display_name, couple_id').eq('id', me).maybeSingle();
  if (!profile?.couple_id) return json({ error: 'Kein Paar' }, 400);

  const msg = message(kind as Kind, profile.display_name ?? 'Dein Schatz', short(payload.preview));
  if (!msg) return json({ error: 'Unbekannter Typ' }, 400);

  // Empfänger: bei "test" man selbst, sonst der Partner
  let recipients: string[] = [me];
  if (kind !== 'test') {
    const { data: members } = await admin.from('profiles').select('id').eq('couple_id', profile.couple_id).neq('id', me);
    recipients = (members ?? []).map((m) => m.id as string);
  }
  if (recipients.length === 0) return json({ sent: 0 });

  const { data: subs } = await admin.from('push_subscriptions').select('id, endpoint, p256dh, auth').in('user_id', recipients);

  webpush.setVapidDetails(subject, publicKey, privateKey);
  const body = JSON.stringify({ ...msg, tag: kind });
  let sent = 0;
  const gone: string[] = [];

  await Promise.all(
    (subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, {
          TTL: 60 * 60 * 24,
          urgency: 'high',
        });
        sent++;
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        // Abgemeldete oder abgelaufene Geräte aufräumen
        if (status === 404 || status === 410) gone.push(s.id as string);
        else console.error('Push fehlgeschlagen', status, (e as Error).message);
      }
    }),
  );
  if (gone.length) await admin.from('push_subscriptions').delete().in('id', gone);

  return json({ sent, removed: gone.length });
});

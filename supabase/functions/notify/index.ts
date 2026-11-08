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

type Kind = 'key' | 'cron' | 'test' | 'heart' | 'miss' | 'hug' | 'need' | 'need-heart' | 'note' | 'doodle' | 'answer' | 'moment' | 'place' | 'countdown' | 'wish' | 'bucket' | 'quiz' | 'capsule';

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
    case 'miss':
      return { title: `${name} vermisst dich 🥺💗`, body: 'Tipp hier, um zurückzuvermissen.', url: '/' };
    case 'need':
      return { title: `${name} wünscht sich etwas 💗`, body: preview || 'Schau mal bei euren Wünschen.', url: '/f/wuensche' };
    case 'need-heart':
      return { title: `${name} hat deinen Wunsch gesehen 💗`, body: preview || '', url: '/f/wuensche' };
    case 'hug':
      return { title: `${name} schickt dir eine Umarmung 🤗`, body: 'Fühl dich ganz fest gedrückt.', url: '/' };
    case 'quiz':
      return { title: `${name} hat die Quiz-Runde gespielt 🎲`, body: 'Du bist dran! Wer kennt wen besser?', url: '/f/quiz' };
    case 'capsule':
      return { title: `${name} hat eine Zeitkapsel versiegelt 🎁`, body: preview ? `Sie öffnet sich am ${preview}.` : 'Ihr dürft sie erst später öffnen.', url: '/f/zeitkapseln' };
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

type Sub = { id: string; endpoint: string; p256dh: string; auth: string };

/** Schickt an alle Geräte und räumt abgemeldete (404/410) auf. Gibt die Zahl erfolgreicher Zustellungen zurück. */
// deno-lint-ignore no-explicit-any
async function deliver(admin: any, subs: Sub[], body: string) {
  let sent = 0;
  const gone: string[] = [];
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, {
          TTL: 60 * 60 * 24,
          urgency: 'high',
        });
        sent++;
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) gone.push(s.id);
        else console.error('Push fehlgeschlagen', status, (e as Error).message);
      }
    }),
  );
  if (gone.length) await admin.from('push_subscriptions').delete().in('id', gone);
  return sent;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Nur POST' }, 405);

  const publicKey = Deno.env.get('VAPID_PUBLIC_KEY');
  const privateKey = Deno.env.get('VAPID_PRIVATE_KEY');
  const subject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:couple-app@example.com';
  if (!publicKey || !privateKey) return json({ error: 'VAPID-Schlüssel fehlen in den Secrets' }, 500);

  let payload: { type?: Kind; preview?: string; job?: string } = {};
  try {
    payload = await req.json();
  } catch {
    /* leerer Body */
  }
  const kind = payload.type;

  // Öffentlichen Schlüssel für die Anmeldung im Browser ausliefern
  if (kind === 'key') return json({ publicKey });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });
  webpush.setVapidDetails(subject, publicKey, privateKey);

  // Zeitpläne aus der Datenbank: Briefe (alle 5 Minuten) und Zeitkapseln (täglich)
  if (kind === 'cron') {
    const secret = req.headers.get('x-cron-secret') ?? '';
    const { data: ok } = await admin.rpc('cron_secret_ok', { s: secret });
    if (!ok) return json({ error: 'Nicht erlaubt' }, 401);

    if (payload.job === 'letters') {
      const { data: due } = await admin
        .from('letters')
        .select('id, sender, recipient')
        .lte('deliver_at', new Date().toISOString())
        .is('notified_at', null)
        .limit(50);
      let sentLetters = 0;
      for (const l of due ?? []) {
        // erst markieren, damit ein überlappender Lauf nicht doppelt schickt
        const { data: claimed } = await admin
          .from('letters')
          .update({ notified_at: new Date().toISOString() })
          .eq('id', l.id)
          .is('notified_at', null)
          .select('id');
        if (!claimed?.length) continue;
        const { data: from } = await admin.from('profiles').select('display_name').eq('id', l.sender).maybeSingle();
        const { data: subs } = await admin.from('push_subscriptions').select('id, endpoint, p256dh, auth').eq('user_id', l.recipient);
        const body = JSON.stringify({
          title: `Ein Brief von ${from?.display_name ?? 'deinem Schatz'} ist angekommen 💌`,
          body: 'Öffne die App, um ihn zu lesen.',
          url: '/',
          tag: `letter-${l.id}`,
        });
        sentLetters += await deliver(admin, subs ?? [], body);
      }
      return json({ letters: (due ?? []).length, sent: sentLetters });
    }
    const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date());
    const { data: due } = await admin.from('capsules').select('id, couple_id, title').lte('open_on', today).is('notified_at', null);
    let sentCron = 0;
    for (const cap of due ?? []) {
      const { data: members } = await admin.from('profiles').select('id').eq('couple_id', cap.couple_id);
      const ids = (members ?? []).map((m) => m.id as string);
      const { data: subs } = await admin.from('push_subscriptions').select('id, endpoint, p256dh, auth').in('user_id', ids);
      const body = JSON.stringify({
        title: 'Eine Zeitkapsel ist bereit 🎁',
        body: cap.title ? `„${cap.title}“ darf jetzt geöffnet werden.` : 'Heute dürft ihr sie öffnen.',
        url: '/f/zeitkapseln',
        tag: `capsule-${cap.id}`,
      });
      sentCron += await deliver(admin, subs ?? [], body);
      await admin.from('capsules').update({ notified_at: new Date().toISOString() }).eq('id', cap.id);
    }
    return json({ capsules: (due ?? []).length, sent: sentCron });
  }

  // Absender prüfen: gültige Anmeldung der App
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
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

  const body = JSON.stringify({ ...msg, tag: kind });
  const sent = await deliver(admin, subs ?? [], body);
  return json({ sent });
});

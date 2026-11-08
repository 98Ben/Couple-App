import { supabase } from './supabase';

/**
 * Web Push für die iPhone-PWA.
 * iOS erlaubt Push nur, wenn die App über „Zum Home-Bildschirm“ installiert ist (iOS 16.4+)
 * und die Erlaubnis nach einem Antippen angefragt wird.
 */

export type PushKind = 'test' | 'heart' | 'miss' | 'hug' | 'need' | 'need-heart' | 'quiz' | 'quiz-judge' | 'quiz-done' | 'capsule' | 'note' | 'doodle' | 'answer' | 'moment' | 'place' | 'countdown' | 'wish' | 'bucket';

export type PushState =
  | 'unsupported' // Browser kann kein Push
  | 'needs-install' // iPhone: erst zum Home-Bildschirm hinzufügen
  | 'denied' // Erlaubnis abgelehnt
  | 'off' // möglich, aber noch nicht aktiviert
  | 'on';

export const isIos = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

const supported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

export async function getPushState(): Promise<PushState> {
  if (isIos() && !isStandalone()) return 'needs-install';
  if (!supported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return sub && Notification.permission === 'granted' ? 'on' : 'off';
}

function urlBase64ToUint8Array(base64: string) {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

let cachedKey: string | null = null;
async function publicKey(): Promise<string> {
  if (cachedKey) return cachedKey;
  const { data, error } = await supabase.functions.invoke('notify', { body: { type: 'key' } });
  if (error || !data?.publicKey) throw new Error('Push ist in Supabase noch nicht eingerichtet (Edge Function „notify“ fehlt).');
  cachedKey = data.publicKey as string;
  return cachedKey;
}

/** Muss direkt aus einem Antippen heraus aufgerufen werden (iOS-Vorgabe). */
export async function enablePush(): Promise<void> {
  if (!supported()) throw new Error('Dieses Gerät unterstützt keine Benachrichtigungen.');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Benachrichtigungen wurden nicht erlaubt. Du kannst das in den iPhone-Einstellungen unter „Mitteilungen“ ändern.');
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(await publicKey()) });
  }
  const j = sub.toJSON();
  const { error } = await supabase.rpc('save_push_subscription', {
    sub_endpoint: j.endpoint,
    sub_p256dh: j.keys?.p256dh,
    sub_auth: j.keys?.auth,
    sub_user_agent: navigator.userAgent,
  });
  if (error) throw new Error('Gerät konnte nicht gespeichert werden. Bist du online?');
}

export async function disablePush(): Promise<void> {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
  await sub.unsubscribe();
}

/** Nach dem Login sicherstellen, dass dieses Gerät dem richtigen Konto zugeordnet ist. */
export async function refreshPushSubscription() {
  try {
    if (!supported() || Notification.permission !== 'granted') return;
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (!sub) return;
    const j = sub.toJSON();
    await supabase.rpc('save_push_subscription', {
      sub_endpoint: j.endpoint,
      sub_p256dh: j.keys?.p256dh,
      sub_auth: j.keys?.auth,
      sub_user_agent: navigator.userAgent,
    });
  } catch {
    /* still – Push ist ein Extra */
  }
}

/** Benachrichtigt den Partner. Fehler werden ignoriert, damit die eigentliche Aktion nie blockiert. */
export function notifyPartner(type: PushKind, preview?: string | null) {
  supabase.functions.invoke('notify', { body: { type, preview: preview ?? undefined } }).catch(() => null);
}

export async function sendTestPush(): Promise<number> {
  const { data, error } = await supabase.functions.invoke('notify', { body: { type: 'test' } });
  if (error) throw new Error('Test-Push hat nicht geklappt. Ist die Edge Function eingerichtet?');
  return (data?.sent as number) ?? 0;
}

/** Beim Abmelden: dieses Gerät vom Konto lösen (Erlaubnis bleibt, beim nächsten Login wird es neu zugeordnet). */
export async function forgetDevice() {
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
  } catch {
    /* egal */
  }
}

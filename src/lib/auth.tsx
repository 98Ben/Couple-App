import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { forgetDevice, refreshPushSubscription } from './push';
import { supabase } from './supabase';

export type Profile = { id: string; display_name: string | null; couple_id: string | null };
export type Couple = { id: string; invite_code: string | null; start_date: string | null; created_by: string };

type AuthState = {
  loading: boolean;
  session: Session | null;
  me: Profile | null;
  partner: Profile | null;
  couple: Couple | null;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [me, setMe] = useState<Profile | null>(null);
  const [partner, setPartner] = useState<Profile | null>(null);
  const [couple, setCouple] = useState<Couple | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async (s: Session | null) => {
    if (!s) {
      setMe(null);
      setPartner(null);
      setCouple(null);
      return;
    }
    const uid = s.user.id;
    refreshPushSubscription();
    // RLS liefert nur das eigene Profil und das des Partners
    const { data: profiles } = await supabase.from('profiles').select('id, display_name, couple_id');
    const mine = profiles?.find((p) => p.id === uid) ?? null;
    setMe(mine);
    setPartner(profiles?.find((p) => p.id !== uid) ?? null);

    if (mine?.couple_id) {
      const { data } = await supabase
        .from('couples')
        .select('id, invite_code, start_date, created_by')
        .eq('id', mine.couple_id)
        .maybeSingle();
      setCouple(data ?? null);
    } else {
      setCouple(null);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await loadData(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      // Supabase empfiehlt: keine await-Aufrufe direkt im Callback
      setTimeout(() => loadData(s), 0);
    });
    return () => sub.subscription.unsubscribe();
  }, [loadData]);

  const refresh = useCallback(() => loadData(session), [loadData, session]);
  const signOut = useCallback(async () => {
    await forgetDevice();
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider value={{ loading, session, me, partner, couple, refresh, signOut }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth außerhalb von AuthProvider');
  return ctx;
}

/** Supabase-Fehlermeldungen in verständliches Deutsch übersetzen. */
export function deutscherFehler(message: string | undefined): string {
  if (!message) return 'Etwas ist schiefgelaufen. Bitte versuch es nochmal.';
  const m = message.toLowerCase();
  if (m.includes('rate limit') || m.includes('security purposes')) return 'Zu viele Versuche. Bitte warte kurz und versuch es dann nochmal.';
  if (m.includes('invalid login credentials')) return 'E-Mail oder Passwort stimmen nicht.';
  if (m.includes('already registered') || m.includes('already exists')) return 'Mit dieser E-Mail gibt es schon ein Konto. Melde dich einfach an.';
  if (m.includes('password')) return 'Das Passwort ist zu kurz oder zu einfach (mindestens 6 Zeichen).';
  if (m.includes('signups not allowed') || m.includes('signup is disabled')) return 'Neue Konten sind in Supabase gerade ausgeschaltet.';
  if (m.includes('email not confirmed')) return 'Die E-Mail ist noch nicht bestätigt. Bitte „Confirm email" in Supabase ausschalten.';
  if (m.includes('email')) return 'Bitte gib eine gültige E-Mail-Adresse ein.';
  if (m.includes('failed to fetch') || m.includes('network')) return 'Keine Verbindung. Bist du online?';
  return message; // eigene Fehlertexte aus der Datenbank sind schon deutsch
}

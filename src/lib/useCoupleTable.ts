import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from './auth';
import { notifyPartner, type PushKind } from './push';
import { needTitle } from './needs';
import { supabase } from './supabase';

// Neue Einträge in diesen Tabellen benachrichtigen den Partner
function pushFor(table: string, row: Record<string, unknown>): [PushKind, string | null] | null {
  switch (table) {
    case 'love_notes':
      return row.doodle_path ? ['doodle', (row.text as string) ?? null] : ['note', (row.text as string) ?? null];
    case 'moments':
      return ['moment', row.title as string];
    case 'places':
      return ['place', row.title as string];
    case 'countdowns':
      return ['countdown', row.title as string];
    case 'needs':
      return ['need', needTitle(row as { kind: string; text: string | null })];
    case 'wishes':
      return ['wish', row.text as string];
    case 'bucket_items':
      return ['bucket', row.title as string];
    default:
      return null;
  }
}

type Order = { column: string; ascending?: boolean };

/**
 * Liest eine Tabelle des eigenen Paares und hält sie live synchron (Supabase Realtime).
 * RLS sorgt dafür, dass nur Zeilen des eigenen Paares geliefert werden;
 * couple_id und created_by setzt die Datenbank selbst.
 */
export function useCoupleTable<T extends { id: string }>(table: string, order: Order) {
  const { couple } = useAuth();
  const coupleId = couple?.id;
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelId = useRef(`${table}-${Math.random().toString(36).slice(2)}`);

  const load = useCallback(async () => {
    if (!coupleId) return;
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order(order.column, { ascending: order.ascending ?? true });
    if (error) setError('Konnte nicht geladen werden. Bist du online?');
    else {
      setError(null);
      setRows((data ?? []) as T[]);
    }
    setLoading(false);
  }, [table, coupleId, order.column, order.ascending]);

  useEffect(() => {
    load();
    if (!coupleId) return;
    const channel = supabase
      .channel(channelId.current)
      .on('postgres_changes', { event: '*', schema: 'public', table, filter: `couple_id=eq.${coupleId}` }, () => load())
      .subscribe();
    // Nach Rückkehr in die App (iPhone pausiert Hintergrund-Apps) frisch laden
    const onVisible = () => document.visibilityState === 'visible' && load();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      supabase.removeChannel(channel);
    };
  }, [load, table, coupleId]);

  const insert = useCallback(
    async (values: Partial<T>) => {
      const { data, error } = await supabase.from(table).insert(values as never).select().single();
      if (error) return { data: null as T | null, error: 'Speichern hat nicht geklappt. Bist du online?' as string | null };
      const push = pushFor(table, data as Record<string, unknown>);
      if (push) notifyPartner(push[0], push[1]);
      await load();
      return { data: data as T, error: null as string | null };
    },
    [table, load],
  );

  const update = useCallback(
    async (id: string, values: Partial<T>) => {
      setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...values } : r))); // sofort anzeigen
      const { error } = await supabase.from(table).update(values as never).eq('id', id);
      if (error) {
        await load();
        return { error: 'Speichern hat nicht geklappt. Bist du online?' as string | null };
      }
      return { error: null as string | null };
    },
    [table, load],
  );

  const remove = useCallback(
    async (id: string) => {
      setRows((rs) => rs.filter((r) => r.id !== id));
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) {
        await load();
        return { error: 'Löschen hat nicht geklappt. Bist du online?' as string | null };
      }
      return { error: null as string | null };
    },
    [table, load],
  );

  return { rows, loading, error, reload: load, insert, update, remove };
}

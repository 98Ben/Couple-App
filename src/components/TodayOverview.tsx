import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Icon } from '../icons/Icon';
import type { IconName } from '../icons/iconShapes';
import { useAuth } from '../lib/auth';
import { at, berlinToday, nextOccurrence, plural, relativeTime } from '../lib/dates';
import { supabase } from '../lib/supabase';
import type { Countdown, LoveNote } from '../lib/types';
import { tones, type ToneKey } from '../theme';

type Item = { key: string; to: string; icon: IconName; tone: ToneKey; title: string; sub?: string; hot?: boolean };

type Data = {
  question: { i: boolean; partner: boolean } | null;
  shopping: number;
  todos: number;
  next: { title: string; emoji: string; days: number } | null;
  note: LoveNote | null;
};

function daysTo(target: Date) {
  const t = new Date();
  const a = new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime();
  const b = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  return Math.round((b - a) / 86400000);
}

/** „Heute bei euch“: das Wichtigste aus allen Bereichen auf einen Blick. */
export default function TodayOverview() {
  const { session, partner, couple } = useAuth();
  const [data, setData] = useState<Data | null>(null);
  const myId = session?.user.id;

  const load = useCallback(async () => {
    const today = berlinToday();
    const [q, shop, tasks, chores, cds, note] = await Promise.all([
      supabase.rpc('today_question'),
      supabase.from('shopping_items').select('id', { count: 'exact', head: true }).is('checked_at', null),
      supabase.from('tasks').select('id', { count: 'exact', head: true }).is('done_at', null).lte('due_on', today),
      supabase.from('chores').select('id', { count: 'exact', head: true }).lte('next_due', today),
      supabase.from('countdowns').select('title, target_date, target_time, emoji, yearly'),
      supabase.from('love_notes').select('*').neq('created_by', myId ?? '').order('created_at', { ascending: false }).limit(1),
    ]);

    const qRow = ((q.data as { i_answered: boolean; partner_answered: boolean }[] | null) ?? [])[0];

    // nächster Countdown inkl. automatischem Jahrestag
    const now = new Date();
    const cands: { title: string; emoji: string; target: Date }[] = [];
    if (couple?.start_date) {
      const { target } = nextOccurrence(couple.start_date, null, now);
      const years = target.getFullYear() - Number(couple.start_date.slice(0, 4));
      if (years > 0) cands.push({ title: `${years}. Jahrestag`, emoji: '💞', target });
    }
    for (const c of (cds.data as Countdown[] | null) ?? []) {
      const target = c.yearly ? nextOccurrence(c.target_date, c.target_time, now).target : at(c.target_date, c.target_time);
      if (daysTo(target) >= 0) cands.push({ title: c.title, emoji: c.emoji ?? '✨', target });
    }
    cands.sort((a, b) => a.target.getTime() - b.target.getTime());
    const first = cands[0];

    setData({
      question: qRow ? { i: qRow.i_answered, partner: qRow.partner_answered } : null,
      shopping: shop.count ?? 0,
      todos: (tasks.count ?? 0) + (chores.count ?? 0),
      next: first ? { title: first.title, emoji: first.emoji, days: daysTo(first.target) } : null,
      note: ((note.data as LoveNote[] | null) ?? [])[0] ?? null,
    });
  }, [myId, couple?.start_date]);

  useEffect(() => {
    load();
    const onVisible = () => document.visibilityState === 'visible' && load();
    document.addEventListener('visibilitychange', onVisible);
    const t = window.setInterval(load, 60000);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(t);
    };
  }, [load]);

  if (!data) return <section className="today appear" aria-busy="true" style={{ minHeight: 120 }} />;

  const name = partner?.display_name ?? 'Dein Schatz';
  const items: Item[] = [];

  if (data.question) {
    const { i, partner: p } = data.question;
    items.push({
      key: 'frage',
      to: '/f/frage-des-tages',
      icon: 'question',
      tone: 'rose',
      title: !i ? 'Frage des Tages wartet auf dich' : p ? 'Ihr habt beide geantwortet' : `Warte auf ${name}s Antwort`,
      sub: !i ? (p ? `${name} hat schon geantwortet 👀` : 'Antworte zuerst, dann siehst du die andere Antwort') : p ? 'Schau mal, was geantwortet wurde' : 'Du hast schon geantwortet',
      hot: !i,
    });
  }

  if (data.note) {
    const n = data.note;
    items.push({
      key: 'notiz',
      to: '/f/liebesnotizen',
      icon: 'letter',
      tone: 'rose',
      title: n.text ? `„${n.text.length > 42 ? `${n.text.slice(0, 40).trim()} …` : n.text}“` : `${name} hat dir etwas gemalt`,
      sub: `Neueste Notiz von ${name} · ${relativeTime(n.created_at)}`,
      hot: !n.heart_at && Date.now() - new Date(n.created_at).getTime() < 86400000,
    });
  }

  items.push({
    key: 'todos',
    to: '/f/todos',
    icon: 'checklist',
    tone: 'peach',
    title: data.todos ? `${plural(data.todos, 'To-do', 'To-dos')} für heute` : 'Heute ist nichts fällig',
    sub: data.todos ? 'Inklusive Überfälligem und Wiederkehrendem' : 'Genießt den Tag 🌿',
  });

  items.push({
    key: 'einkauf',
    to: '/f/einkaufsliste',
    icon: 'bag',
    tone: 'peach',
    title: data.shopping ? `${plural(data.shopping, 'Sache', 'Sachen')} auf der Einkaufsliste` : 'Einkaufsliste ist leer',
    sub: data.shopping ? undefined : 'Alles da, was ihr braucht',
  });

  if (data.next) {
    const d = data.next.days;
    items.push({
      key: 'countdown',
      to: '/f/tage-zaehler',
      icon: 'hourglass',
      tone: 'lav',
      title: `${data.next.emoji} ${data.next.title}`,
      sub: d === 0 ? 'Heute! 🎉' : d === 1 ? 'Morgen ist es so weit' : `Noch ${plural(d, 'Tag', 'Tage')}`,
      hot: d <= 1,
    });
  }

  return (
    <section className="today appear" style={{ animationDelay: '0.08s' }} aria-label="Heute bei euch">
      <h2 className="today-title">Heute bei euch</h2>
      <ul className="today-list">
        {items.map((it) => {
          const tone = tones[it.tone];
          return (
            <li key={it.key}>
              <Link to={it.to} className="today-row press">
                <span className="today-icon blob" style={{ background: tone.blob }}>
                  <Icon name={it.icon} size={22} stroke={tone.icon} accent={tone.main} />
                </span>
                <span className="today-text">
                  <span className="today-main">{it.title}</span>
                  {it.sub && <span className="today-sub">{it.sub}</span>}
                </span>
                {it.hot && <span className="today-dot" style={{ background: tone.main }} aria-label="neu" />}
                <ChevronRight size={18} className="set-chev" />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

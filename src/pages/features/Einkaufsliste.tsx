import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Check, ChevronDown, Star, X } from 'lucide-react';
import BottomNav from '../../components/BottomNav';
import Empty from '../../components/Empty';
import Sheet from '../../components/Sheet';
import SubHeader from '../../components/SubHeader';
import { useAuth } from '../../lib/auth';
import { SHOP_CATEGORIES, catInfo, guessCategory, memoryKey, type ShopCategory } from '../../lib/shopping';
import { supabase } from '../../lib/supabase';
import type { ShoppingItem, ShoppingMemory } from '../../lib/types';
import { useCoupleTable } from '../../lib/useCoupleTable';
import { tones } from '../../theme';

const tone = tones.peach;

export default function Einkaufsliste() {
  const { session, couple } = useAuth();
  const items = useCoupleTable<ShoppingItem>('shopping_items', { column: 'created_at' });
  const [memory, setMemory] = useState<ShoppingMemory[]>([]);

  const loadMemory = useCallback(async () => {
    const { data } = await supabase.from('shopping_memory').select('key, name, category, uses, pinned, last_used');
    setMemory((data as ShoppingMemory[]) ?? []);
  }, []);
  useEffect(() => {
    loadMemory();
    if (!couple) return;
    const ch = supabase
      .channel(`shopmem-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_memory', filter: `couple_id=eq.${couple.id}` }, () => loadMemory())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [loadMemory, couple]);

  const memMap = useMemo(() => new Map(memory.map((m) => [m.key, m.category])), [memory]);

  // Eingabe
  const [name, setName] = useState('');
  const [manualCat, setManualCat] = useState<ShopCategory | null>(null);
  const [catOpen, setCatOpen] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const autoCat = guessCategory(name, memMap);
  const cat = manualCat ?? autoCat;

  const open = items.rows.filter((i) => !i.checked_at);
  const inCart = items.rows.filter((i) => i.checked_at).sort((a, b) => (b.checked_at ?? '').localeCompare(a.checked_at ?? ''));
  const [cartOpen, setCartOpen] = useState(true);

  const add = async (raw: string, category?: ShopCategory) => {
    const n = raw.trim();
    if (!n) return;
    const key = memoryKey(n);
    const c = category ?? guessCategory(n, memMap);
    const existing = items.rows.find((i) => memoryKey(i.name) === key);
    if (existing && !existing.checked_at) {
      setFlash(existing.id); // steht schon drauf
      window.setTimeout(() => setFlash(null), 900);
      return;
    }
    if (existing?.checked_at) await items.update(existing.id, { checked_at: null, checked_by: null });
    else await items.insert({ name: n, category: c });
    await supabase.rpc('shopping_remember', { item_name: n, item_category: c });
    loadMemory();
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const n = name;
    const c = cat;
    setName('');
    setManualCat(null);
    inputRef.current?.focus();
    await add(n, c);
  };

  const toggle = (i: ShoppingItem) =>
    items.update(i.id, i.checked_at ? { checked_at: null, checked_by: null } : { checked_at: new Date().toISOString(), checked_by: session?.user.id ?? null });

  const clearCart = async () => {
    for (const i of inCart) await items.remove(i.id);
  };

  // Favoriten: angepinnte zuerst, dann die meistgekauften (die nicht gerade offen auf der Liste stehen)
  const openKeys = new Set(open.map((i) => memoryKey(i.name)));
  const favorites = [...memory]
    .filter((m) => !openKeys.has(m.key) && (m.pinned || m.uses >= 2))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.uses - a.uses)
    .slice(0, 10);

  // Gruppiert nach Kategorie in Supermarkt-Reihenfolge
  const groups = SHOP_CATEGORIES.map((c) => ({ ...c, items: open.filter((i) => (i.category || 'sonstiges') === c.id) })).filter((g) => g.items.length);

  // Artikel-Details
  const [editing, setEditing] = useState<ShoppingItem | null>(null);
  const editMem = editing ? memory.find((m) => m.key === memoryKey(editing.name)) : undefined;

  return (
    <>
      <main className="page">
        <span className="glow g1" aria-hidden="true" />
        <SubHeader title="Einkaufsliste" back="/alltag" sub={open.length ? `${open.length} ${open.length === 1 ? 'Sache' : 'Sachen'} offen` : 'Alles da'} />

        <form className="shop-add appear" onSubmit={submit} style={{ boxShadow: `0 10px 26px ${tone.shadow}` }}>
          <div className="shop-add-row">
            <label className="sr-only" htmlFor="shop-name">
              Was fehlt?
            </label>
            <input
              id="shop-name"
              ref={inputRef}
              value={name}
              maxLength={80}
              onChange={(e) => {
                setName(e.target.value);
                setManualCat(null);
              }}
              placeholder="Was fehlt? z. B. Hafermilch"
              enterKeyHint="done"
              autoComplete="off"
            />
            <button className="shop-add-btn press" disabled={!name.trim()} aria-label="Hinzufügen">
              +
            </button>
          </div>
          {name.trim() && (
            <button type="button" className="shop-cat-pill press" onClick={() => setCatOpen(true)}>
              {catInfo(cat).emoji} {catInfo(cat).label} <ChevronDown size={14} />
            </button>
          )}
        </form>

        {favorites.length > 0 && (
          <section className="fav-row" aria-label="Favoriten">
            {favorites.map((f) => (
              <button key={f.key} className="chip-btn small press fav-chip" onClick={() => add(f.name, f.category as ShopCategory)}>
                {f.pinned && <Star size={12} fill="currentColor" />} {f.name}
              </button>
            ))}
          </section>
        )}

        {items.error && <p className="form-error">{items.error}</p>}
        {!items.loading && items.rows.length === 0 && (
          <Empty icon="bag" toneKey="peach" title="Die Liste ist leer" text="Tippt oben ein, was fehlt. Die Kategorie errät die App selbst, und was ihr oft kauft, landet in den Favoriten." />
        )}

        {groups.map((g) => (
          <section key={g.id} className="shop-group">
            <h2 className="shop-group-title">
              <span aria-hidden="true">{g.emoji}</span> {g.label}
            </h2>
            <ul className="shop-list">
              {g.items.map((i) => (
                <li key={i.id} className={`shop-item${flash === i.id ? ' flash' : ''}`}>
                  <button className="shop-check press" onClick={() => toggle(i)} aria-label={`${i.name} in den Wagen`} />
                  <button className="shop-name" onClick={() => setEditing(i)}>
                    {i.name}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}

        {inCart.length > 0 && (
          <section className="cart">
            <div className="cart-head">
              <button className="cart-toggle" onClick={() => setCartOpen((v) => !v)} aria-expanded={cartOpen}>
                🛒 Bereits im Wagen ({inCart.length}) <ChevronDown size={16} className={cartOpen ? 'rot' : ''} />
              </button>
              <button className="link-btn" onClick={clearCart}>
                Alle entfernen
              </button>
            </div>
            {cartOpen && (
              <ul className="shop-list">
                {inCart.map((i) => (
                  <li key={i.id} className="shop-item done">
                    <button className="shop-check on press" onClick={() => toggle(i)} aria-label={`${i.name} zurück auf die Liste`}>
                      <Check size={15} strokeWidth={3} color="#fff" />
                    </button>
                    <span className="shop-name">{i.name}</span>
                    <button className="x-btn press" onClick={() => items.remove(i.id)} aria-label={`${i.name} löschen`}>
                      <X size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </main>
      <BottomNav active="alltag" />

      <Sheet open={catOpen} onClose={() => setCatOpen(false)} title="Kategorie wählen">
        <CategoryGrid
          value={cat}
          onPick={(c) => {
            setManualCat(c);
            setCatOpen(false);
          }}
        />
      </Sheet>

      <Sheet open={!!editing} onClose={() => setEditing(null)} title={editing?.name ?? ''}>
        {editing && (
          <div className="detail">
            <CategoryGrid
              value={editing.category as ShopCategory}
              onPick={async (c) => {
                await items.update(editing.id, { category: c });
                await supabase.rpc('shopping_set_category', { item_name: editing.name, item_category: c });
                loadMemory();
                setEditing(null);
              }}
            />
            <p className="form-hint center">Die App merkt sich die Kategorie fürs nächste Mal.</p>
            <div className="detail-actions">
              <button
                className="secondary-btn press"
                onClick={async () => {
                  await supabase.rpc('shopping_set_category', { item_name: editing.name, item_category: editing.category });
                  await supabase.from('shopping_memory').update({ pinned: !editMem?.pinned }).eq('key', memoryKey(editing.name));
                  loadMemory();
                }}
              >
                <Star size={16} fill={editMem?.pinned ? 'currentColor' : 'none'} style={{ verticalAlign: '-2px' }} /> {editMem?.pinned ? 'Kein Favorit mehr' : 'Als Favorit'}
              </button>
              <button
                className="danger-btn press"
                onClick={() => {
                  items.remove(editing.id);
                  setEditing(null);
                }}
              >
                Entfernen
              </button>
            </div>
          </div>
        )}
      </Sheet>
    </>
  );
}

function CategoryGrid({ value, onPick }: { value: ShopCategory; onPick: (c: ShopCategory) => void }) {
  return (
    <div className="cat-grid" role="radiogroup" aria-label="Kategorie">
      {SHOP_CATEGORIES.map((c) => (
        <button key={c.id} role="radio" aria-checked={value === c.id} className={`cat-option press${value === c.id ? ' on' : ''}`} onClick={() => onPick(c.id)}>
          <span aria-hidden="true">{c.emoji}</span> {c.label}
        </button>
      ))}
    </div>
  );
}

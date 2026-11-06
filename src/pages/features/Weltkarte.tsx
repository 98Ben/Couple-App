import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import L, { type Map as LeafletMap } from 'leaflet';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { LocateFixed, Search } from 'lucide-react';
import BottomNav from '../../components/BottomNav';
import ConfirmButton from '../../components/ConfirmButton';
import Empty from '../../components/Empty';
import { Photo, PhotoField } from '../../components/Photo';
import Sheet from '../../components/Sheet';
import SubHeader from '../../components/SubHeader';
import { useAuth } from '../../lib/auth';
import { formatDate, plural } from '../../lib/dates';
import { removePhoto, uploadPhoto, usePhotoUrl } from '../../lib/photos';
import type { Place } from '../../lib/types';
import { useCoupleTable } from '../../lib/useCoupleTable';
import { HEART_PATH } from '../../icons/iconShapes';
import { tones } from '../../theme';

const tone = tones.lav;
const TILES = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';
const GERMANY: [number, number] = [51.16, 10.45];

const heartSvg = (color: string, size: number) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"><path d="${HEART_PATH}" fill="${color}"/></svg>`;

function pinIcon(url: string | null, active: boolean) {
  const inner = url
    ? `<img src="${url.replace(/"/g, '&quot;')}" alt="" />`
    : `<span class="pin-empty">${heartSvg('#FFFFFF', 20)}</span>`;
  return L.divIcon({
    className: '',
    html: `<div class="pin${active ? ' active' : ''}"><div class="pin-photo">${inner}</div><span class="pin-heart">${heartSvg(tone.main, 16)}</span></div>`,
    iconSize: [52, 62],
    iconAnchor: [26, 60],
  });
}

function PlaceMarker({ place, active, onOpen }: { place: Place; active: boolean; onOpen: () => void }) {
  const url = usePhotoUrl(place.photo_path);
  const icon = useMemo(() => pinIcon(url, active), [url, active]);
  return (
    <Marker
      position={[place.lat, place.lng]}
      icon={icon}
      title={place.title}
      alt={place.title}
      keyboard
      eventHandlers={{ click: onOpen }}
    />
  );
}

/** Beim ersten Laden alle Orte ins Bild holen. */
function FitOnce({ places }: { places: Place[] }) {
  const map = useMap();
  const done = useRef(false);
  useEffect(() => {
    if (done.current || places.length === 0) return;
    done.current = true;
    if (places.length === 1) map.setView([places[0].lat, places[0].lng], 12);
    else map.fitBounds(L.latLngBounds(places.map((p) => [p.lat, p.lng])), { padding: [48, 48], maxZoom: 13 });
  }, [places, map]);
  return null;
}

export default function Weltkarte() {
  const { couple } = useAuth();
  const { rows, loading, error, insert, update, remove } = useCoupleTable<Place>('places', { column: 'happened_on', ascending: false });
  const [viewing, setViewing] = useState<Place | null>(null);
  const [editing, setEditing] = useState<Place | 'neu' | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);

  const open = (p: Place) => {
    setViewing(p);
    mapRef.current?.flyTo([p.lat, p.lng], Math.max(mapRef.current.getZoom(), 12), { duration: 0.8 });
  };

  const del = async (p: Place) => {
    setViewing(null);
    await remove(p.id);
    await removePhoto(p.photo_path);
  };

  return (
    <>
      <main className="page">
        <SubHeader
          title="Weltkarte"
          back="/erinnerungen"
          onAdd={() => setEditing('neu')}
          addLabel="Ort hinzufügen"
          sub={rows.length ? plural(rows.length, 'besonderer Ort', 'besondere Orte') : 'Eure besonderen Orte'}
        />

        <section className="map-card appear" style={{ boxShadow: `0 14px 34px ${tone.shadow}` }}>
          <MapContainer ref={mapRef} center={GERMANY} zoom={5} zoomControl={false} className="map" attributionControl>
            <TileLayer url={TILES} attribution={ATTRIBUTION} subdomains="abcd" maxZoom={19} />
            <FitOnce places={rows} />
            {rows.map((p) => (
              <PlaceMarker key={p.id} place={p} active={viewing?.id === p.id} onOpen={() => open(p)} />
            ))}
          </MapContainer>
          <button className="map-add primary-btn press" onClick={() => setEditing('neu')}>
            + Ort hinzufügen
          </button>
        </section>

        {error && <p className="form-error">{error}</p>}
        {!loading && rows.length === 0 && (
          <Empty
            icon="globe"
            title="Noch keine Orte"
            text="Markiert die Orte, die euch etwas bedeuten: erstes Date, erster Kuss, euer Lieblingscafé."
          />
        )}

        {rows.length > 0 && (
          <section className="place-list">
            {rows.map((p) => (
              <button key={p.id} className="place-row press" onClick={() => open(p)} style={{ background: tone.tileBg }}>
                <Photo path={p.photo_path} alt={p.title} className="place-thumb" />
                <span className="place-text">
                  <strong>{p.title}</strong>
                  <span>{[formatDate(p.happened_on), p.address?.split(',')[0]].filter(Boolean).join(' · ')}</span>
                </span>
              </button>
            ))}
          </section>
        )}
      </main>
      <BottomNav active="erinnerungen" />

      <Sheet open={!!viewing} onClose={() => setViewing(null)} title={viewing?.title ?? ''}>
        {viewing && (
          <div className="detail">
            {viewing.photo_path && <Photo path={viewing.photo_path} alt={viewing.title} className="detail-photo" />}
            {viewing.happened_on && <p className="detail-date">{formatDate(viewing.happened_on, true)}</p>}
            {viewing.address && <p className="detail-address">📍 {viewing.address}</p>}
            {viewing.note && <p className="detail-note">{viewing.note}</p>}
            <div className="detail-actions">
              <button className="secondary-btn press" onClick={() => { setEditing(viewing); setViewing(null); }}>
                Bearbeiten
              </button>
              <ConfirmButton onConfirm={() => del(viewing)} />
            </div>
          </div>
        )}
      </Sheet>

      <Sheet open={!!editing} onClose={() => setEditing(null)} title={editing === 'neu' ? 'Neuer Ort' : 'Ort bearbeiten'}>
        {editing && couple && (
          <PlaceForm
            initial={editing === 'neu' ? null : editing}
            fallbackCenter={mapRef.current?.getCenter()}
            onCancel={() => setEditing(null)}
            onSave={async (values, file) => {
              const old = editing === 'neu' ? null : editing;
              let photo_path = old?.photo_path ?? null;
              if (file) photo_path = await uploadPhoto(couple.id, file);
              const res = old ? await update(old.id, { ...values, photo_path }) : await insert({ ...values, photo_path });
              if (res.error) return res.error;
              if (file && old?.photo_path) await removePhoto(old.photo_path);
              setEditing(null);
              const saved = old ? { ...old, ...values } : values;
              if (saved) mapRef.current?.flyTo([saved.lat, saved.lng], 12, { duration: 0.8 });
              return null;
            }}
          />
        )}
      </Sheet>
    </>
  );
}

type PlaceValues = Pick<Place, 'title' | 'happened_on' | 'note' | 'lat' | 'lng' | 'address'>;

function PlaceForm({
  initial,
  fallbackCenter,
  onSave,
  onCancel,
}: {
  initial: Place | null;
  fallbackCenter?: L.LatLng;
  onSave: (v: PlaceValues, file: File | null) => Promise<string | null>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [date, setDate] = useState(initial?.happened_on ?? '');
  const [note, setNote] = useState(initial?.note ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [pos, setPos] = useState<{ lat: number; lng: number; address: string | null } | null>(
    initial ? { lat: initial.lat, lng: initial.lng, address: initial.address } : null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!pos) {
      setError('Bitte wähle noch einen Ort aus.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const err = await onSave(
        { title: title.trim(), happened_on: date || null, note: note.trim() || null, lat: pos.lat, lng: pos.lng, address: pos.address },
        file,
      );
      if (err) setError(err);
    } catch (e2) {
      setError((e2 as Error).message);
    }
    setBusy(false);
  };

  return (
    <form className="form" onSubmit={submit}>
      <label className="field">
        <span>Was ist hier passiert?</span>
        <input value={title} maxLength={80} required onChange={(e) => setTitle(e.target.value)} placeholder="z. B. Unser erster Kuss" />
      </label>

      <LocationPicker value={pos} onChange={setPos} fallbackCenter={fallbackCenter} />

      <PhotoField file={file} existingPath={initial?.photo_path} onChange={setFile} />
      <label className="field">
        <span>Datum (optional)</span>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </label>
      <label className="field">
        <span>Erinnerung (optional)</span>
        <textarea value={note} maxLength={1000} rows={3} onChange={(e) => setNote(e.target.value)} placeholder="Was macht diesen Ort besonders?" />
      </label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="primary-btn press" disabled={busy || !title.trim()}>
        {busy ? 'Wird gespeichert …' : 'Ort speichern'}
      </button>
      <button type="button" className="link-btn" onClick={onCancel}>
        Abbrechen
      </button>
    </form>
  );
}

type Pos = { lat: number; lng: number; address: string | null };
type SearchHit = { lat: string; lon: string; display_name: string };

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&zoom=16&accept-language=de&lat=${lat}&lon=${lng}`);
    const j = await r.json();
    return (j.display_name as string | undefined)?.split(',').slice(0, 3).join(',') ?? null;
  } catch {
    return null;
  }
}

function ClickToPick({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

function Recenter({ pos }: { pos: Pos | null }) {
  const map = useMap();
  useEffect(() => {
    if (pos) map.setView([pos.lat, pos.lng], Math.max(map.getZoom(), 13));
  }, [pos?.lat, pos?.lng]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

/** Ort wählen: Adresse suchen, eigener Standort oder auf die Mini-Karte tippen / Pin ziehen. */
function LocationPicker({ value, onChange, fallbackCenter }: { value: Pos | null; onChange: (p: Pos) => void; fallbackCenter?: L.LatLng }) {
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const icon = useMemo(() => pinIcon(null, true), []);

  const pick = async (lat: number, lng: number, address?: string) => {
    onChange({ lat, lng, address: address ?? value?.address ?? null });
    setHits([]);
    if (!address) {
      const a = await reverseGeocode(lat, lng);
      onChange({ lat, lng, address: a });
    }
  };

  const search = async () => {
    if (!query.trim()) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=5&accept-language=de&q=${encodeURIComponent(query.trim())}`,
      );
      const j = (await r.json()) as SearchHit[];
      setHits(j);
      if (j.length === 0) setMsg('Nichts gefunden. Versuch es mit Stadt oder Straße.');
    } catch {
      setMsg('Suche gerade nicht möglich. Tipp stattdessen auf die Karte.');
    }
    setBusy(false);
  };

  const locate = () => {
    if (!navigator.geolocation) return setMsg('Standort wird hier nicht unterstützt.');
    setMsg('Standort wird ermittelt …');
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setMsg(null);
        pick(p.coords.latitude, p.coords.longitude);
      },
      () => setMsg('Standort nicht verfügbar. Erlaube den Zugriff oder tipp auf die Karte.'),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const center: [number, number] = value ? [value.lat, value.lng] : fallbackCenter ? [fallbackCenter.lat, fallbackCenter.lng] : GERMANY;

  return (
    <div className="field">
      <span>Ort</span>
      <div className="search-row">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              search();
            }
          }}
          placeholder="Adresse oder Ort suchen"
          enterKeyHint="search"
        />
        <button type="button" className="icon-btn press" onClick={search} disabled={busy} aria-label="Suchen">
          <Search size={18} />
        </button>
        <button type="button" className="icon-btn press" onClick={locate} aria-label="Mein Standort">
          <LocateFixed size={18} />
        </button>
      </div>
      {hits.length > 0 && (
        <ul className="hits">
          {hits.map((h) => (
            <li key={`${h.lat},${h.lon}`}>
              <button type="button" onClick={() => pick(Number(h.lat), Number(h.lon), h.display_name.split(',').slice(0, 3).join(','))}>
                {h.display_name}
              </button>
            </li>
          ))}
        </ul>
      )}
      {msg && <p className="form-hint">{msg}</p>}
      <div className="mini-map-wrap">
        <MapContainer center={center} zoom={value ? 13 : fallbackCenter ? 6 : 5} zoomControl={false} className="mini-map">
          <TileLayer url={TILES} attribution={ATTRIBUTION} subdomains="abcd" maxZoom={19} />
          <ClickToPick onPick={(lat, lng) => pick(lat, lng)} />
          <Recenter pos={value} />
          {value && (
            <Marker
              position={[value.lat, value.lng]}
              icon={icon}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const ll = (e.target as L.Marker).getLatLng();
                  pick(ll.lat, ll.lng);
                },
              }}
            />
          )}
        </MapContainer>
      </div>
      <p className="form-hint">{value ? `📍 ${value.address ?? 'Ort gewählt'}` : 'Tipp auf die Karte, um den Ort zu setzen.'}</p>
    </div>
  );
}

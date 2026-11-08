import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Eraser, Trash2, Undo2, ZoomIn, ZoomOut } from 'lucide-react';

export const PEN_COLORS = [
  { value: '#3A2E39', label: 'Dunkel' },
  { value: '#8A7B85', label: 'Grau' },
  { value: '#FFFFFF', label: 'Weiß' },
  { value: '#E8484F', label: 'Rot' },
  { value: '#FF6B6B', label: 'Korall' },
  { value: '#FF9CC2', label: 'Rosa' },
  { value: '#FF9F5A', label: 'Pfirsich' },
  { value: '#FFC23D', label: 'Sonnengelb' },
  { value: '#A5D86E', label: 'Hellgrün' },
  { value: '#3FA66B', label: 'Grün' },
  { value: '#6CCB9C', label: 'Mint' },
  { value: '#4CC3C9', label: 'Türkis' },
  { value: '#6FB7F0', label: 'Himmelblau' },
  { value: '#3D6FD8', label: 'Blau' },
  { value: '#C98BEA', label: 'Lavendel' },
  { value: '#8E5AD6', label: 'Lila' },
  { value: '#A0694B', label: 'Braun' },
  { value: '#F2D3B3', label: 'Haut' },
];

export const PAPERS = [
  { value: '#FFFDF9', label: 'Creme' },
  { value: '#FFE6E6', label: 'Rosa' },
  { value: '#E8F7EF', label: 'Mint' },
  { value: '#E6F1FC', label: 'Himmel' },
  { value: '#FFF3C9', label: 'Sonne' },
  { value: '#3A2E39', label: 'Nacht' },
];
/** Standardpapier (für Vorschauen) */
export const PAPER = PAPERS[0].value;

const SIZES = [4, 9, 16];
const MAX_ZOOM = 5;

type Point = { x: number; y: number };
type Stroke = { color: string; size: number; erase?: boolean; points: Point[] }; // Koordinaten 0..1
type View = { s: number; x: number; y: number }; // Zoom und Verschiebung in Canvas-Pixeln

export type DoodlePadHandle = { toBlob: () => Promise<Blob | null>; clear: () => void; isEmpty: () => boolean };

function drawStroke(ctx: CanvasRenderingContext2D, s: Stroke, w: number, h: number, paper: string) {
  const pts = s.points.map((p) => ({ x: p.x * w, y: p.y * h }));
  const color = s.erase ? paper : s.color;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = s.size * (w / 360);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (pts.length === 1) {
    ctx.beginPath();
    ctx.arc(pts[0].x, pts[0].y, ctx.lineWidth / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  // weiche Linien über Mittelpunkte
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i].x + pts[i + 1].x) / 2;
    const my = (pts[i].y + pts[i + 1].y) / 2;
    ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
  }
  const last = pts[pts.length - 1];
  ctx.lineTo(last.x, last.y);
  ctx.stroke();
}

const clampView = (v: View, w: number, h: number): View => {
  const s = Math.min(MAX_ZOOM, Math.max(1, v.s));
  return { s, x: Math.min(0, Math.max(w - w * s, v.x)), y: Math.min(0, Math.max(h - h * s, v.y)) };
};

/**
 * Zeichenfeld für Finger und Maus: viele Farben (auch Weiß), Papierfarben, Stärken, Radierer,
 * Rückgängig, Leeren. Zoomen mit zwei Fingern oder über die Lupen-Knöpfe; mit einem Finger wird gezeichnet.
 */
const DoodlePad = forwardRef<DoodlePadHandle, { onChange?: (empty: boolean) => void }>(function DoodlePad({ onChange }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<Stroke[]>([]);
  const current = useRef<Stroke | null>(null);
  const view = useRef<View>({ s: 1, x: 0, y: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ d: number; mx: number; my: number; v: View } | null>(null);
  const [color, setColor] = useState(PEN_COLORS[4].value);
  const [paper, setPaper] = useState(PAPER);
  const paperRef = useRef(paper);
  const [size, setSize] = useState(SIZES[1]);
  const [eraser, setEraser] = useState(false);
  const [count, setCount] = useState(0);
  const [wiping, setWiping] = useState(false);
  const [zoom, setZoom] = useState(1);

  const redraw = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d')!;
    const v = view.current;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = paperRef.current;
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.setTransform(v.s, 0, 0, v.s, v.x, v.y);
    for (const s of strokes.current) drawStroke(ctx, s, c.width, c.height, paperRef.current);
    if (current.current) drawStroke(ctx, current.current, c.width, c.height, paperRef.current);
  }, []);

  useEffect(() => {
    paperRef.current = paper;
    redraw();
  }, [paper, redraw]);

  // Canvas scharf auf dem Retina-Display
  useEffect(() => {
    const c = canvasRef.current!;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      const rect = c.getBoundingClientRect();
      const oldW = c.width || 1;
      c.width = Math.round(rect.width * dpr);
      c.height = Math.round(rect.height * dpr);
      const k = c.width / oldW;
      view.current = clampView({ s: view.current.s, x: view.current.x * k, y: view.current.y * k }, c.width, c.height);
      redraw();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(c);
    return () => ro.disconnect();
  }, [redraw]);

  const changed = () => {
    setCount(strokes.current.length);
    onChange?.(strokes.current.length === 0);
  };

  /** Bildschirmposition → Canvas-Pixel */
  const px = (clientX: number, clientY: number) => {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return { x: ((clientX - r.left) / r.width) * c.width, y: ((clientY - r.top) / r.height) * c.height };
  };
  /** Bildschirmposition → Zeichnungs-Koordinaten (0..1), berücksichtigt den Zoom */
  const pos = (e: React.PointerEvent): Point => {
    const c = canvasRef.current!;
    const p = px(e.clientX, e.clientY);
    const v = view.current;
    return { x: (p.x - v.x) / v.s / c.width, y: (p.y - v.y) / v.s / c.height };
  };

  const setView = (v: View) => {
    const c = canvasRef.current!;
    view.current = clampView(v, c.width, c.height);
    setZoom(view.current.s);
    redraw();
  };

  const startPinch = () => {
    const [a, b] = [...pointers.current.values()];
    const pa = px(a.x, a.y);
    const pb = px(b.x, b.y);
    pinch.current = { d: Math.hypot(pa.x - pb.x, pa.y - pb.y) || 1, mx: (pa.x + pb.x) / 2, my: (pa.y + pb.y) / 2, v: { ...view.current } };
  };

  const down = (e: React.PointerEvent) => {
    e.preventDefault();
    canvasRef.current!.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size >= 2) {
      // zweiter Finger: Zoomen statt Zeichnen – angefangenen Strich verwerfen
      current.current = null;
      startPinch();
      redraw();
      return;
    }
    current.current = { color, size: eraser ? size * 2.5 : size, erase: eraser || undefined, points: [pos(e)] };
    redraw();
  };

  const move = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    e.preventDefault();
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const pa = px(a.x, a.y);
      const pb = px(b.x, b.y);
      const p0 = pinch.current;
      const s = Math.min(MAX_ZOOM, Math.max(1, (p0.v.s * Math.hypot(pa.x - pb.x, pa.y - pb.y)) / p0.d));
      const mx = (pa.x + pb.x) / 2;
      const my = (pa.y + pb.y) / 2;
      // Der Punkt unter der Fingermitte bleibt unter der Fingermitte
      setView({ s, x: mx - ((p0.mx - p0.v.x) * s) / p0.v.s, y: my - ((p0.my - p0.v.y) * s) / p0.v.s });
      return;
    }
    if (!current.current) return;
    current.current.points.push(pos(e));
    redraw();
  };

  const up = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pinch.current) {
      if (pointers.current.size < 2) pinch.current = null;
      return;
    }
    if (!current.current) return;
    strokes.current.push(current.current);
    current.current = null;
    changed();
  };

  const zoomBy = (f: number) => {
    const c = canvasRef.current!;
    const v = view.current;
    const s = Math.min(MAX_ZOOM, Math.max(1, v.s * f));
    const cx = c.width / 2;
    const cy = c.height / 2;
    setView({ s, x: cx - ((cx - v.x) * s) / v.s, y: cy - ((cy - v.y) * s) / v.s });
  };

  const undo = () => {
    strokes.current.pop();
    redraw();
    changed();
  };
  const clear = useCallback(() => {
    strokes.current = [];
    current.current = null;
    view.current = { s: 1, x: 0, y: 0 };
    setZoom(1);
    redraw();
    setCount(0);
    onChange?.(true);
  }, [redraw, onChange]);

  const wipe = () => {
    if (!strokes.current.length) return;
    setWiping(true);
    window.setTimeout(() => {
      clear();
      setWiping(false);
    }, 450);
  };

  useImperativeHandle(ref, () => ({
    clear,
    isEmpty: () => strokes.current.length === 0,
    toBlob: async () => {
      // Immer die ganze Zeichnung (ohne Zoom), für den Versand auf max. 900 px
      const src = canvasRef.current!;
      const out = document.createElement('canvas');
      const scale = Math.min(1, 900 / src.width);
      out.width = Math.round(src.width * scale);
      out.height = Math.round(src.height * scale);
      const ctx = out.getContext('2d')!;
      ctx.fillStyle = paperRef.current;
      ctx.fillRect(0, 0, out.width, out.height);
      for (const s of strokes.current) drawStroke(ctx, s, out.width, out.height, paperRef.current);
      return new Promise((resolve) => out.toBlob((b) => resolve(b), 'image/png'));
    },
  }));

  const dark = paper === '#3A2E39';

  return (
    <div className="doodle-pad">
      <div className={`canvas-wrap${wiping ? ' wiping' : ''}`} style={{ background: paper }}>
        <canvas
          ref={canvasRef}
          className="doodle-canvas"
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          role="img"
          aria-label="Zeichenfläche"
        />
        {count === 0 && !current.current && (
          <span className="canvas-hint" style={dark ? { color: '#8A7B85' } : undefined}>
            Hier mit dem Finger zeichnen ✍️
            <small>Mit zwei Fingern zoomen</small>
          </span>
        )}
        <div className="zoom-ctrl">
          {zoom > 1.01 && (
            <button type="button" className="zoom-btn press zoom-reset" onClick={() => setView({ s: 1, x: 0, y: 0 })} aria-label="Zoom zurücksetzen">
              {zoom.toLocaleString('de-DE', { maximumFractionDigits: 1 })}×
            </button>
          )}
          <button type="button" className="zoom-btn press" onClick={() => zoomBy(1 / 1.5)} disabled={zoom <= 1.01} aria-label="Verkleinern">
            <ZoomOut size={18} />
          </button>
          <button type="button" className="zoom-btn press" onClick={() => zoomBy(1.5)} disabled={zoom >= MAX_ZOOM - 0.01} aria-label="Vergrößern">
            <ZoomIn size={18} />
          </button>
        </div>
      </div>

      <div className="pen-grid" role="radiogroup" aria-label="Stiftfarbe">
        {PEN_COLORS.map((c) => (
          <button
            key={c.value}
            type="button"
            role="radio"
            aria-checked={!eraser && color === c.value}
            aria-label={c.label}
            className={`pen-dot press${!eraser && color === c.value ? ' on' : ''}${c.value === '#FFFFFF' ? ' white' : ''}`}
            style={{ background: c.value }}
            onClick={() => {
              setColor(c.value);
              setEraser(false);
            }}
          />
        ))}
      </div>

      <div className="paper-row" role="radiogroup" aria-label="Papierfarbe">
        <span className="paper-label">Papier</span>
        {PAPERS.map((p) => (
          <button
            key={p.value}
            type="button"
            role="radio"
            aria-checked={paper === p.value}
            aria-label={`Papier ${p.label}`}
            className={`paper-dot press${paper === p.value ? ' on' : ''}`}
            style={{ background: p.value }}
            onClick={() => setPaper(p.value)}
          />
        ))}
      </div>

      <div className="tool-row">
        <div className="size-group" role="radiogroup" aria-label="Strichstärke">
          {SIZES.map((s) => (
            <button key={s} type="button" role="radio" aria-checked={size === s} aria-label={`Stärke ${s}`} className={`size-btn press${size === s ? ' on' : ''}`} onClick={() => setSize(s)}>
              <span style={{ width: s + 2, height: s + 2, background: eraser ? '#B8A6B0' : color, boxShadow: color === '#FFFFFF' && !eraser ? 'inset 0 0 0 1px #C9B6BF' : undefined }} />
            </button>
          ))}
        </div>
        <button type="button" className={`tool-btn press${eraser ? ' on' : ''}`} onClick={() => setEraser((v) => !v)} aria-pressed={eraser} aria-label="Radiergummi">
          <Eraser size={20} />
        </button>
        <button type="button" className="tool-btn press" onClick={undo} disabled={count === 0} aria-label="Rückgängig">
          <Undo2 size={20} />
        </button>
        <button type="button" className="tool-btn press" onClick={wipe} disabled={count === 0} aria-label="Zeichnung leeren">
          <Trash2 size={20} />
        </button>
      </div>
    </div>
  );
});

export default DoodlePad;

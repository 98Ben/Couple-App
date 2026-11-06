import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Eraser, Trash2, Undo2 } from 'lucide-react';

export const PAPER = '#FFFDF9';
export const PEN_COLORS = [
  { value: '#3A2E39', label: 'Dunkel' },
  { value: '#FF6B6B', label: 'Korall' },
  { value: '#FF9F5A', label: 'Pfirsich' },
  { value: '#FFC23D', label: 'Sonnengelb' },
  { value: '#6CCB9C', label: 'Mint' },
  { value: '#6FB7F0', label: 'Himmelblau' },
  { value: '#C98BEA', label: 'Lavendel' },
];
const SIZES = [4, 9, 16];

type Point = { x: number; y: number };
type Stroke = { color: string; size: number; points: Point[] }; // Koordinaten 0..1

export type DoodlePadHandle = { toBlob: () => Promise<Blob | null>; clear: () => void; isEmpty: () => boolean };

function drawStroke(ctx: CanvasRenderingContext2D, s: Stroke, w: number, h: number) {
  const pts = s.points.map((p) => ({ x: p.x * w, y: p.y * h }));
  ctx.strokeStyle = s.color;
  ctx.fillStyle = s.color;
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

/** Zeichenfeld für Finger und Maus: Farben, Stärken, Radierer, Rückgängig, Leeren. */
const DoodlePad = forwardRef<DoodlePadHandle, { onChange?: (empty: boolean) => void }>(function DoodlePad({ onChange }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<Stroke[]>([]);
  const current = useRef<Stroke | null>(null);
  const [color, setColor] = useState(PEN_COLORS[1].value);
  const [size, setSize] = useState(SIZES[1]);
  const [eraser, setEraser] = useState(false);
  const [count, setCount] = useState(0);
  const [wiping, setWiping] = useState(false);

  const redraw = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, c.width, c.height);
    for (const s of strokes.current) drawStroke(ctx, s, c.width, c.height);
    if (current.current) drawStroke(ctx, current.current, c.width, c.height);
  }, []);

  // Canvas scharf auf dem Retina-Display
  useEffect(() => {
    const c = canvasRef.current!;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      const rect = c.getBoundingClientRect();
      c.width = Math.round(rect.width * dpr);
      c.height = Math.round(rect.height * dpr);
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

  const pos = (e: React.PointerEvent): Point => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
  };

  const down = (e: React.PointerEvent) => {
    e.preventDefault();
    canvasRef.current!.setPointerCapture(e.pointerId);
    current.current = { color: eraser ? PAPER : color, size: eraser ? size * 2.5 : size, points: [pos(e)] };
    redraw();
  };
  const move = (e: React.PointerEvent) => {
    if (!current.current) return;
    e.preventDefault();
    current.current.points.push(pos(e));
    redraw();
  };
  const up = () => {
    if (!current.current) return;
    strokes.current.push(current.current);
    current.current = null;
    changed();
  };

  const undo = () => {
    strokes.current.pop();
    redraw();
    changed();
  };
  const clear = useCallback(() => {
    strokes.current = [];
    current.current = null;
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
      // Für den Versand auf max. 900 px rendern (spart Speicher)
      const src = canvasRef.current!;
      const out = document.createElement('canvas');
      const scale = Math.min(1, 900 / src.width);
      out.width = Math.round(src.width * scale);
      out.height = Math.round(src.height * scale);
      const ctx = out.getContext('2d')!;
      ctx.fillStyle = PAPER;
      ctx.fillRect(0, 0, out.width, out.height);
      for (const s of strokes.current) drawStroke(ctx, s, out.width, out.height);
      return new Promise((resolve) => out.toBlob((b) => resolve(b), 'image/png'));
    },
  }));

  return (
    <div className="doodle-pad">
      <div className={`canvas-wrap${wiping ? ' wiping' : ''}`}>
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
        {count === 0 && !current.current && <span className="canvas-hint">Hier mit dem Finger zeichnen ✍️</span>}
      </div>

      <div className="pen-row" role="radiogroup" aria-label="Stiftfarbe">
        {PEN_COLORS.map((c) => (
          <button
            key={c.value}
            type="button"
            role="radio"
            aria-checked={!eraser && color === c.value}
            aria-label={c.label}
            className={`pen-dot press${!eraser && color === c.value ? ' on' : ''}`}
            style={{ background: c.value }}
            onClick={() => {
              setColor(c.value);
              setEraser(false);
            }}
          />
        ))}
      </div>

      <div className="tool-row">
        <div className="size-group" role="radiogroup" aria-label="Strichstärke">
          {SIZES.map((s) => (
            <button key={s} type="button" role="radio" aria-checked={size === s} aria-label={`Stärke ${s}`} className={`size-btn press${size === s ? ' on' : ''}`} onClick={() => setSize(s)}>
              <span style={{ width: s + 2, height: s + 2, background: eraser ? '#B8A6B0' : color }} />
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

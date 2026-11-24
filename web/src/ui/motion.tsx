import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

/**
 * Preferenza "Riduci movimento": parte da prefers-reduced-motion del sistema
 * e può essere cambiata dall'utente (salvata nel browser).
 */
interface MotionState {
  reduced: boolean;
  toggle: () => void;
}

const KEY = 'tcg-reduce-motion';
const MotionContext = createContext<MotionState>({ reduced: false, toggle: () => {} });

function initial(): boolean {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved != null) return saved === '1';
  } catch {
    /* ignore */
  }
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

export function MotionProvider({ children }: { children: ReactNode }) {
  const [reduced, setReduced] = useState(initial);
  useEffect(() => {
    document.documentElement.dataset.motion = reduced ? 'reduced' : 'full';
    motionEngine.setReduced(reduced);
  }, [reduced]);
  const value = useMemo(
    () => ({
      reduced,
      toggle: () =>
        setReduced((r) => {
          try {
            localStorage.setItem(KEY, r ? '0' : '1');
          } catch {
            /* ignore */
          }
          return !r;
        }),
    }),
    [reduced],
  );
  return <MotionContext.Provider value={value}>{children}</MotionContext.Provider>;
}

export const useMotion = () => useContext(MotionContext);

// ---------------------------------------------------------------------------
// Motore delle "perspective card" (ispirato alla galleria GCC Pokémon 30°):
// - quando visibile, ogni carta fluttua con un moto sinusoidale sfasato;
// - sotto il puntatore si inclina seguendolo, con inerzia, e si avvicina;
// - un riflesso (shine) e un bagliore olografico seguono l'inclinazione;
// - un solo requestAnimationFrame per tutte le carte, solo per quelle visibili.
// ---------------------------------------------------------------------------

export interface MotionTarget {
  root: HTMLElement;
  inner: HTMLElement;
  /** fase iniziale del moto ambientale */
  phase: number;
  /** ampiezza del moto ambientale (0 = ferma) */
  intensity: number;
  /** avvicinamento (px) quando il puntatore è sopra */
  zoomOnHover: number;
  /** angolo di flip (0 = fronte, 180 = retro) */
  flipTarget: number;
  // stato interno
  visible: boolean;
  pointer: [number, number] | null;
  look: [number, number];
  zoom: number;
  flip: number;
  rect: DOMRect | null;
}

class MotionEngine {
  private targets = new Set<MotionTarget>();
  private raf = 0;
  private last = 0;
  private time = 0;
  private reduced = false;
  private io: IntersectionObserver | null = null;
  private byEl = new WeakMap<Element, MotionTarget>();

  setReduced(r: boolean) {
    this.reduced = r;
    this.targets.forEach((t) => this.paint(t, true));
    this.kick();
  }

  isReduced() {
    return this.reduced;
  }

  private observer() {
    if (!this.io && typeof IntersectionObserver !== 'undefined') {
      this.io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            const t = this.byEl.get(e.target);
            if (t) {
              t.visible = e.isIntersecting;
              t.rect = null;
            }
          }
          this.kick();
        },
        { rootMargin: '60px' },
      );
    }
    return this.io;
  }

  add(t: MotionTarget) {
    this.targets.add(t);
    this.byEl.set(t.root, t);
    this.observer()?.observe(t.root);
    this.kick();
  }

  remove(t: MotionTarget) {
    this.targets.delete(t);
    this.io?.unobserve(t.root);
  }

  kick() {
    if (!this.raf) {
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.frame);
    }
  }

  invalidateRects() {
    this.targets.forEach((t) => (t.rect = null));
  }

  private frame = (now: number) => {
    this.raf = 0;
    const dt = Math.max(1, Math.min(50, now - this.last));
    this.last = now;
    this.time += dt;
    let active = false;
    for (const t of this.targets) {
      if (!t.visible && !t.pointer) continue;
      if (this.step(t, dt)) active = true;
    }
    if (active) this.raf = requestAnimationFrame(this.frame);
  };

  /** ritorna true se la carta richiede altri frame */
  private step(t: MotionTarget, dt: number): boolean {
    const k = 1 - Math.exp(-0.008 * dt);
    const ambient = !this.reduced && t.intensity > 0;
    let target: [number, number] = [0, 0];

    if (t.pointer && !this.reduced) {
      const r = (t.rect ??= t.root.getBoundingClientRect());
      target = [t.pointer[0] - (r.left + r.width / 2), t.pointer[1] - (r.top + r.height / 2)];
    } else if (ambient) {
      const p = this.time * 1e-4 + t.phase;
      const e = t.intensity * 10 * (0.5 + 0.5 * Math.cos(p * 3.542 + 1234.5));
      target = [Math.cos(p * 0.5) * e, Math.sin(p * 2) * e];
    }

    const zoomTarget = t.pointer && !this.reduced ? t.zoomOnHover : 0;
    t.look = [t.look[0] + (target[0] - t.look[0]) * k, t.look[1] + (target[1] - t.look[1]) * k];
    t.zoom += (zoomTarget - t.zoom) * k;
    const flipK = this.reduced ? 1 : 1 - Math.exp(-0.012 * dt);
    t.flip += (t.flipTarget - t.flip) * flipK;

    this.paint(t);

    const settled =
      Math.abs(target[0] - t.look[0]) < 0.3 &&
      Math.abs(target[1] - t.look[1]) < 0.3 &&
      Math.abs(zoomTarget - t.zoom) < 0.2 &&
      Math.abs(t.flipTarget - t.flip) < 0.2;
    return ambient || !settled;
  }

  paint(t: MotionTarget, reset = false) {
    if (reset && this.reduced) {
      t.look = [0, 0];
      t.zoom = 0;
      t.flip = t.flipTarget;
    }
    const r = (t.rect ??= t.root.getBoundingClientRect());
    const depth = Math.max(420, Math.max(r.width, r.height) * 2.4);
    const ry = (Math.atan2(t.look[0], depth) * 180) / Math.PI;
    const rx = (-Math.atan2(t.look[1], depth) * 180) / Math.PI;
    t.inner.style.transform = `translate3d(0,0,${t.zoom.toFixed(2)}px) rotateX(${rx.toFixed(3)}deg) rotateY(${(ry + t.flip).toFixed(3)}deg)`;
    const dist = Math.hypot(t.look[0], t.look[1]);
    const angle = Math.atan2(t.look[1], t.look[0]) + Math.PI / 2;
    const s = t.root.style;
    s.setProperty('--shine-angle', `${angle.toFixed(3)}rad`);
    s.setProperty('--shine', Math.min(0.55, (dist / depth) * 2.2).toFixed(3));
    s.setProperty('--mx', `${(50 + (t.look[0] / Math.max(1, r.width)) * 90).toFixed(1)}%`);
    s.setProperty('--my', `${(50 + (t.look[1] / Math.max(1, r.height)) * 90).toFixed(1)}%`);
    s.setProperty('--tilt', Math.min(1, dist / (r.width * 0.6 || 1)).toFixed(3));
  }
}

export const motionEngine = new MotionEngine();

if (typeof window !== 'undefined') {
  let timer = 0;
  const inval = () => {
    clearTimeout(timer);
    timer = window.setTimeout(() => motionEngine.invalidateRects(), 120);
  };
  window.addEventListener('scroll', () => motionEngine.invalidateRects(), { passive: true, capture: true });
  window.addEventListener('resize', inval);
}

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { motionEngine, type MotionTarget } from './motion';

interface Props {
  image: string | null;
  alt: string;
  /** retro della carta (immagine); se assente viene disegnato un retro con i colori della collezione */
  back?: string | null;
  backLabel?: string;
  flipped?: boolean;
  foil?: boolean;
  dimmed?: boolean;
  /** ampiezza del moto ambientale: 0 = ferma */
  intensity?: number;
  zoomOnHover?: number;
  className?: string;
  style?: CSSProperties;
  eager?: boolean;
  overlay?: ReactNode;
  onClick?: () => void;
  ariaLabel?: string;
}

let seed = 0;

export function PerspectiveCard({
  image,
  alt,
  back,
  backLabel,
  flipped = false,
  foil = false,
  dimmed = false,
  intensity = 5,
  zoomOnHover = 36,
  className = '',
  style,
  eager = false,
  overlay,
  onClick,
  ariaLabel,
}: Props) {
  const root = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const target = useRef<MotionTarget | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!root.current || !inner.current) return;
    const t: MotionTarget = {
      root: root.current,
      inner: inner.current,
      phase: (seed++ * 2.399) % 100,
      intensity,
      zoomOnHover,
      flipTarget: flipped ? 180 : 0,
      visible: false,
      pointer: null,
      look: [0, 0],
      zoom: 0,
      flip: flipped ? 180 : 0,
      rect: null,
    };
    target.current = t;
    motionEngine.add(t);
    motionEngine.paint(t);
    return () => motionEngine.remove(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = target.current;
    if (!t) return;
    t.intensity = intensity;
    t.zoomOnHover = zoomOnHover;
    t.flipTarget = flipped ? 180 : 0;
    motionEngine.kick();
  }, [intensity, zoomOnHover, flipped]);

  const onMove = (e: React.PointerEvent) => {
    const t = target.current;
    if (!t || e.pointerType === 'touch') return;
    t.pointer = [e.clientX, e.clientY];
    motionEngine.kick();
  };
  const onEnter = (e: React.PointerEvent) => {
    const t = target.current;
    if (!t || e.pointerType === 'touch') return;
    t.rect = null;
    t.pointer = [e.clientX, e.clientY];
    root.current?.classList.add('is-over');
    motionEngine.kick();
  };
  const onLeave = () => {
    const t = target.current;
    if (!t) return;
    t.pointer = null;
    root.current?.classList.remove('is-over');
    motionEngine.kick();
  };

  const Tag = onClick ? 'button' : 'div';

  return (
    <div
      ref={root}
      className={`pcard ${foil ? 'pcard--foil' : ''} ${dimmed ? 'pcard--dimmed' : ''} ${className}`}
      style={style}
      onPointerEnter={onEnter}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      <Tag
        className="pcard__hit"
        {...(onClick ? { type: 'button' as const, onClick, 'aria-label': ariaLabel ?? alt } : {})}
      >
        <div ref={inner} className="pcard__inner">
          <div className="pcard__face pcard__front">
            {!loaded && !failed && <div className="pcard__skeleton" />}
            {image && !failed ? (
              <img
                src={image}
                alt={alt}
                loading={eager ? 'eager' : 'lazy'}
                decoding="async"
                draggable={false}
                onLoad={() => setLoaded(true)}
                onError={() => setFailed(true)}
                className={loaded ? 'is-loaded' : ''}
              />
            ) : (
              <div className="pcard__placeholder">
                <span>{alt}</span>
              </div>
            )}
            <div className="pcard__holo" />
            <div className="pcard__shine" />
            {overlay}
          </div>
          <div className="pcard__face pcard__back">
            {back ? (
              <img src={back} alt="" draggable={false} loading="lazy" />
            ) : (
              <div className="pcard__back-art">
                <span>{backLabel}</span>
              </div>
            )}
            <div className="pcard__shine" />
          </div>
        </div>
      </Tag>
    </div>
  );
}

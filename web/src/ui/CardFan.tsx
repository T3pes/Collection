import { PerspectiveCard } from './PerspectiveCard';

/** Ventaglio di 3 carte fluttuanti usato come copertina di collezioni e set */
export function CardFan({ images, back, label, size = 'md' }: { images: string[]; back?: string | null; label: string; size?: 'md' | 'lg' }) {
  const list = images.length ? images : back ? [back] : [];
  const w = size === 'lg' ? 'w-[34%]' : 'w-[30%]';
  const slots = [
    { rot: -12, x: '-58%', y: '8%', z: 1 },
    { rot: 0, x: '0%', y: '0%', z: 3 },
    { rot: 12, x: '58%', y: '8%', z: 2 },
  ];
  const order = list.length >= 3 ? [list[1], list[0], list[2]] : list.length === 2 ? [list[1], list[0]] : list;
  const used = list.length >= 3 ? slots : list.length === 2 ? [slots[0], slots[2]] : [slots[1]];

  return (
    <div className="relative mx-auto aspect-[16/10] w-full" aria-hidden>
      {list.length === 0 && (
        <div className={`absolute left-1/2 top-1/2 ${w} -translate-x-1/2 -translate-y-1/2`}>
          <PerspectiveCard image={null} alt={label} intensity={4} />
        </div>
      )}
      {order.map((img, i) => (
        <div
          key={img + i}
          className={`absolute left-1/2 top-1/2 ${w}`}
          style={{ transform: `translate(calc(-50% + ${used[i].x}), calc(-50% + ${used[i].y})) rotate(${used[i].rot}deg)`, zIndex: used[i].z }}
        >
          <PerspectiveCard image={img} alt="" foil={used[i].z === 3} intensity={4} zoomOnHover={18} />
        </div>
      ))}
    </div>
  );
}

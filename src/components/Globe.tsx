type Props = {
  size?: number;
  className?: string;
};

// Nodos en el "globo" — pares (x, y) en el cuadrante -100..100
const NODES = [
  { x: 55, y: -55 }, // arriba derecha (Europa)
  { x: -65, y: -25 }, // izquierda alta (NA / oeste)
  { x: 25, y: 55 }, // abajo derecha (Oceanía)
  { x: -40, y: 50 }, // abajo izquierda (Sudamérica)
  { x: 75, y: 15 }, // derecha media (Asia)
  { x: -15, y: -75 }, // arriba centro (norte)
  { x: 10, y: 10 }, // centro (África)
];

// Conexiones entre nodos (índices)
const LINKS: [number, number][] = [
  [0, 1], // Europa - NA
  [0, 4], // Europa - Asia
  [1, 3], // NA - Sudamérica
  [3, 6], // Sudamérica - África
  [6, 4], // África - Asia
  [4, 2], // Asia - Oceanía
  [0, 6], // Europa - África
  [1, 5], // NA - Norte
];

// Genera un arco curvo entre dos puntos (estilo "ruta de vuelo")
function arcPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  curve = 0.25
): string {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.sqrt(dx * dx + dy * dy);
  // Perpendicular hacia afuera del centro del globo
  const px = -dy / dist;
  const py = dx / dist;
  // Dirección: hacia afuera del origen
  const dot = mx * px + my * py;
  const sign = dot >= 0 ? 1 : -1;
  const cx = mx + sign * px * dist * curve;
  const cy = my + sign * py * dist * curve;
  return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
}

export default function Globe({ size = 320, className }: Props) {
  const r = 100;
  return (
    <svg
      viewBox="-115 -115 230 230"
      width={size}
      height={size}
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <defs>
        <radialGradient id="globeGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(232, 184, 122, 0.12)" />
          <stop offset="60%" stopColor="rgba(232, 184, 122, 0.04)" />
          <stop offset="100%" stopColor="rgba(232, 184, 122, 0)" />
        </radialGradient>
        <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(245, 213, 154, 1)" />
          <stop offset="40%" stopColor="rgba(245, 213, 154, 0.6)" />
          <stop offset="100%" stopColor="rgba(245, 213, 154, 0)" />
        </radialGradient>
        <filter id="goldGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Halo de fondo */}
      <circle cx="0" cy="0" r={r + 10} fill="url(#globeGlow)" />

      {/* Wireframe sutil del globo en marrón apagado */}
      <g stroke="#3a2818" strokeWidth="0.5" fill="none" opacity="0.7">
        <circle cx="0" cy="0" r={r} />
        <line x1={-r} y1="0" x2={r} y2="0" />
        <line x1="0" y1={-r} x2="0" y2={r} />
        <ellipse cx="0" cy="0" rx={r} ry={r * 0.35} />
        <ellipse cx="0" cy="0" rx={r} ry={r * 0.7} />
        <ellipse cx="0" cy="0" rx={r * 0.35} ry={r} />
        <ellipse cx="0" cy="0" rx={r * 0.7} ry={r} />
        <g transform="rotate(45)">
          <ellipse cx="0" cy="0" rx={r * 0.5} ry={r} />
        </g>
        <g transform="rotate(-45)">
          <ellipse cx="0" cy="0" rx={r * 0.5} ry={r} />
        </g>
      </g>

      {/* Líneas doradas que conectan nodos */}
      <g
        stroke="#e8b87a"
        strokeWidth="0.7"
        fill="none"
        opacity="0.8"
        filter="url(#goldGlow)"
      >
        {LINKS.map(([a, b], i) => (
          <path
            key={i}
            d={arcPath(NODES[a].x, NODES[a].y, NODES[b].x, NODES[b].y)}
            strokeDasharray="2 2"
          />
        ))}
      </g>

      {/* Nodos dorados brillantes con halo */}
      <g>
        {NODES.map((n, i) => (
          <g key={i}>
            <circle cx={n.x} cy={n.y} r="8" fill="url(#nodeGlow)" />
            <circle
              cx={n.x}
              cy={n.y}
              r="2.2"
              fill="#f5d59a"
              filter="url(#goldGlow)"
            />
          </g>
        ))}
      </g>
    </svg>
  );
}

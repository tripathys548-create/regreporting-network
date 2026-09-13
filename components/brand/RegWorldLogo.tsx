import clsx from "clsx";

/*
 * RegWorld brand marks, drawn as inline SVG so they stay sharp at every size.
 *   RegWorldLogo    full circular logo (globe network + "RegWorld") — login, footer, large brand areas
 *   RegWorldEmblem  simplified circular mark (ring + globe + "RW") — navbar, mobile, anything under ~48px
 *   RegWorldWordmark "Reg" + "World" text for use beside the emblem
 * The favicon PNG/ICO files are rendered from the same geometry by scripts/brand/generate_icons.py.
 */

export const BRAND = { navy: "#061B33", white: "#FFFFFF", cyan: "#18D9D1", teal: "#12B8C4" } as const;

const FONT = "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

/** Globe meridians, parallels and connected nodes, centred at (100,100) in a 200×200 box. */
function GlobeNetwork({ opacity = 1 }: { opacity?: number }) {
  const nodes: [number, number][] = [
    [100, 42],
    [58, 64],
    [146, 60],
    [40, 108],
    [160, 118],
    [70, 152],
    [134, 156],
    [100, 162],
  ];
  const links: [number, number][] = [
    [0, 1],
    [0, 2],
    [1, 3],
    [2, 4],
    [3, 5],
    [4, 6],
    [5, 7],
    [6, 7],
    [1, 2],
  ];
  return (
    <g opacity={opacity}>
      <g fill="none" stroke={BRAND.teal} strokeWidth="1.6" opacity="0.55">
        <circle cx="100" cy="100" r="64" />
        <ellipse cx="100" cy="100" rx="26" ry="64" />
        <ellipse cx="100" cy="100" rx="48" ry="64" />
        <line x1="36" y1="100" x2="164" y2="100" />
        <ellipse cx="100" cy="100" rx="64" ry="24" />
      </g>
      <g stroke={BRAND.cyan} strokeWidth="1.4" opacity="0.8">
        {links.map(([a, b]) => (
          <line key={`${a}-${b}`} x1={nodes[a][0]} y1={nodes[a][1]} x2={nodes[b][0]} y2={nodes[b][1]} />
        ))}
      </g>
      <g fill={BRAND.cyan}>
        {nodes.map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="3.4" />
        ))}
      </g>
    </g>
  );
}

export function RegWorldLogo({ className, title = "RegWorld" }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={clsx("shrink-0", className)} role="img" aria-label={title} xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="100" fill={BRAND.navy} />
      <circle cx="100" cy="100" r="92" fill="none" stroke={BRAND.cyan} strokeWidth="5" />
      <circle cx="100" cy="100" r="84" fill="none" stroke={BRAND.teal} strokeWidth="1.2" opacity="0.6" />
      <GlobeNetwork opacity={0.9} />
      <rect x="30" y="86" width="140" height="30" rx="6" fill={BRAND.navy} opacity="0.82" />
      <text x="100" y="109" textAnchor="middle" fontFamily={FONT} fontSize="27" fontWeight="700" letterSpacing="-0.5">
        <tspan fill={BRAND.white}>Reg</tspan>
        <tspan fill={BRAND.cyan}>World</tspan>
      </text>
    </svg>
  );
}

export function RegWorldEmblem({ className, title }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={clsx("shrink-0", className)} role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true} xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="32" fill={BRAND.navy} />
      <circle cx="32" cy="32" r="28.5" fill="none" stroke={BRAND.cyan} strokeWidth="3" />
      <g fill="none" stroke={BRAND.teal} strokeWidth="1.1" opacity="0.5">
        <ellipse cx="32" cy="32" rx="9" ry="21" />
        <line x1="11" y1="32" x2="53" y2="32" />
      </g>
      <g fill={BRAND.cyan}>
        <circle cx="32" cy="10.5" r="2.2" />
        <circle cx="13" cy="42" r="2.2" />
        <circle cx="51" cy="42" r="2.2" />
      </g>
      <text x="32" y="39.5" textAnchor="middle" fontFamily={FONT} fontSize="20" fontWeight="800" letterSpacing="-1">
        <tspan fill={BRAND.white}>R</tspan>
        <tspan fill={BRAND.cyan}>W</tspan>
      </text>
    </svg>
  );
}

export function RegWorldWordmark({ className, tone = "dark" }: { className?: string; tone?: "dark" | "light" }) {
  return (
    <span className={clsx("font-semibold tracking-tight", className)}>
      <span className={tone === "dark" ? "text-white" : "text-[#061B33]"}>Reg</span>
      <span className={tone === "dark" ? "text-[#18D9D1]" : "text-[#12B8C4]"}>World</span>
    </span>
  );
}

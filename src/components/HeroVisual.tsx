/**
 * Illustrative "camera feed" with animated detections.
 * Purely decorative — the real models live in the Demo Lab.
 */
// Boxes in SVG viewBox units (100 × 75), matching the figures drawn below.
const boxes = [
  { x: 9.5, y: 16.5, w: 13, h: 44.5, label: "person", score: "0.96", color: "var(--cyan)", delay: "0s" },
  { x: 30, y: 21, w: 12, h: 39.5, label: "person", score: "0.91", color: "var(--cyan)", delay: "1.2s" },
  { x: 44, y: 49, w: 20, h: 14, label: "box", score: "0.88", color: "var(--lime)", delay: "0.6s" },
  { x: 81, y: 24.5, w: 10, h: 33, label: "helmet ✓", score: "0.93", color: "var(--lime)", delay: "1.8s" },
];

function Person({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill="#1c2a44">
      <circle cx="0" cy="0" r="5.5" />
      <rect x="-7" y="7" width="14" height="22" rx="5" />
      <rect x="-6" y="27" width="5" height="18" rx="2" />
      <rect x="1" y="27" width="5" height="18" rx="2" />
    </g>
  );
}

export default function HeroVisual() {
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-line-strong bg-[radial-gradient(ellipse_at_top,#0f1b33,#0b1424_70%)] glow-cyan">
      {/* Scene */}
      <svg viewBox="0 0 100 75" className="absolute inset-0 size-full" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="floor" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#0c1528" />
            <stop offset="1" stopColor="#0b1424" />
          </linearGradient>
        </defs>
        <rect x="0" y="52" width="100" height="23" fill="url(#floor)" />
        {/* shelves */}
        {[0, 1, 2].map((i) => (
          <g key={i} opacity="0.55">
            <rect x={2 + i * 33} y="8" width="28" height="44" fill="#0e182c" stroke="#1d2b48" strokeWidth="0.4" />
            {[0, 1, 2, 3].map((r) => (
              <rect key={r} x={2 + i * 33} y={18 + r * 10} width="28" height="0.8" fill="#1d2b48" />
            ))}
          </g>
        ))}
        <Person x={16} y={22} s={0.85} />
        <Person x={36} y={26} s={0.75} />
        <rect x="45" y="50" width="18" height="12" rx="1" fill="#2a2416" />
        <rect x="45" y="50" width="18" height="2" fill="#3a3220" />
        <Person x={86} y={30} s={0.6} />
        <rect x="82.6" y="25.4" width="6.8" height="2.2" rx="1.1" fill="#c9b100" opacity="0.85" />
      </svg>

      {/* Detections */}
      {boxes.map((b) => (
        <div
          key={b.label + b.x}
          className="float-box absolute rounded-[3px] border-2"
          style={{
            left: `${b.x}%`,
            top: `${(b.y / 75) * 100}%`,
            width: `${b.w}%`,
            height: `${(b.h / 75) * 100}%`,
            borderColor: b.color,
            animationDelay: b.delay,
          }}
        >
          <span
            className={`absolute -top-5 whitespace-nowrap rounded-sm px-1.5 py-0.5 font-mono text-xs font-semibold text-bg ${
              b.x + b.w > 85 ? "right-[-2px]" : "left-[-2px]"
            }`}
            style={{ background: b.color }}
          >
            {b.label} {b.score}
          </span>
        </div>
      ))}

      {/* Counting line */}
      <div className="absolute inset-x-0 top-[78%] border-t border-dashed border-pink/80" aria-hidden="true" />
      <span className="absolute right-3 top-[79%] font-mono text-xs text-pink">LINE A · IN 128 · OUT 97</span>

      {/* Scan + HUD */}
      <div className="scanline pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="absolute left-3 top-3 flex items-center gap-2 font-mono text-xs text-muted">
        <span className="size-2 rounded-full bg-danger blink" />
        CAM-03 · LIVE
      </div>
      <div className="absolute right-3 top-3 font-mono text-xs text-muted">30 FPS · EDGE</div>
      <div className="absolute bottom-3 left-3 right-3 grid grid-cols-3 gap-2 font-mono text-xs">
        {[
          ["people", "2"],
          ["ppe ok", "100%"],
          ["boxes", "1"],
        ].map(([k, v]) => (
          <div key={k} className="rounded-md border border-line bg-bg/70 px-2 py-1.5 backdrop-blur">
            <span className="text-dim">{k}</span> <span className="float-right text-lime">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

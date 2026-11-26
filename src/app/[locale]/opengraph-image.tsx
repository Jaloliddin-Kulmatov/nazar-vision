import { ImageResponse } from "next/og";

export const alt = "Nazar Vision — computer vision for business";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** The picture shown when a link to the site is shared (Telegram, LinkedIn, WhatsApp). */
export default function OgImage() {
  const box = (x: number, y: number, w: number, h: number, label: string, color: string) => (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, border: `4px solid ${color}`, borderRadius: 6, display: "flex" }}>
      <div style={{ position: "absolute", top: -34, left: -4, background: color, color: "#0b1424", fontSize: 20, fontWeight: 700, padding: "4px 10px", borderRadius: 4 }}>{label}</div>
    </div>
  );
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#0b1424", color: "#eef3fa", fontFamily: "sans-serif", position: "relative" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 72px", width: 700 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 34, fontWeight: 700 }}>
            <div style={{ width: 44, height: 44, borderRadius: 22, border: "6px solid #ffc629", display: "flex" }} />
            Nazar Vision
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 64, fontWeight: 800, lineHeight: 1.05 }}>Put the cameras you already have to work</div>
            <div style={{ fontSize: 28, color: "#a5b3c8", marginTop: 24 }}>Safety alerts · counting · plates · quality checks</div>
          </div>
          <div style={{ display: "flex", gap: 12, fontSize: 22, alignItems: "center", height: 56, width: 600 }}>
            {["24 live demos", "Free source code", "EN · UZ · RU"].map((x) => (
              <div key={x} style={{ border: "2px solid #2a3a55", borderRadius: 999, padding: "8px 18px", color: "#ffc629", display: "flex", alignItems: "center", height: 48, whiteSpace: "nowrap", flexShrink: 0 }}>{x}</div>
            ))}
          </div>
        </div>
        <div style={{ position: "relative", flex: 1, display: "flex", background: "#13203a", borderLeft: "2px solid #2a3a55" }}>
          {box(70, 130, 150, 300, "person 94%", "#3ee0a0")}
          {box(250, 230, 190, 150, "forklift", "#ffc629")}
          {box(120, 470, 230, 70, "01 A 123 BC", "#6cb6ff")}
        </div>
      </div>
    ),
    size,
  );
}

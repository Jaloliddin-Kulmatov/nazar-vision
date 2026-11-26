export type ContactData = {
  name: string;
  email: string;
  message: string;
  company: string;
  phone: string;
  industry: string;
  need: string;
  cameras: string;
  timeline: string;
  budget: string;
};

export type ContactResult = { ok: true; data: ContactData } | { ok: false; error: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export function validateContact(body: unknown): ContactResult {
  if (!body || typeof body !== "object") return { ok: false, error: "invalid_body" };
  const b = body as Record<string, unknown>;

  // Honeypot field: real people never see or fill it.
  if (typeof b.website === "string" && b.website.trim() !== "") return { ok: false, error: "spam" };

  const rawMessage = typeof b.message === "string" ? b.message.trim() : "";
  if (rawMessage.length > 5000) return { ok: false, error: "message_too_long" };

  const data: ContactData = {
    name: str(b.name, 120),
    email: str(b.email, 200),
    message: rawMessage,
    company: str(b.company, 160),
    phone: str(b.phone, 80),
    industry: str(b.industry, 60),
    need: str(b.need, 60),
    cameras: str(b.cameras, 60),
    timeline: str(b.timeline, 60),
    budget: str(b.budget, 60),
  };

  if (!data.name) return { ok: false, error: "name_required" };
  if (!EMAIL.test(data.email)) return { ok: false, error: "email_invalid" };
  if (!data.message) return { ok: false, error: "message_required" };
  return { ok: true, data };
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function contactEmailHtml(d: ContactData): string {
  const rows = [
    ["Name", d.name],
    ["Company", d.company],
    ["Email", d.email],
    ["Phone / Telegram", d.phone],
    ["Industry", d.industry],
    ["Needs", d.need],
    ["Cameras / lines", d.cameras],
    ["Timeline", d.timeline],
    ["Budget", d.budget],
  ]
    .filter(([, v]) => v)
    .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#666">${k}</td><td>${esc(v)}</td></tr>`)
    .join("");
  return `<table>${rows}</table><p style="white-space:pre-wrap">${esc(d.message)}</p>`;
}

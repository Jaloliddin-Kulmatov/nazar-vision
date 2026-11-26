export type SignupData = { name: string; email: string; company: string };
export type SignupResult = { ok: true; data: SignupData } | { ok: false; error: "invalid_body" | "spam" | "name_required" | "email_invalid" };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export function validateSignup(body: unknown): SignupResult {
  if (!body || typeof body !== "object") return { ok: false, error: "invalid_body" };
  const b = body as Record<string, unknown>;
  // Honeypot field: real people never see or fill it.
  if (typeof b.website === "string" && b.website.trim() !== "") return { ok: false, error: "spam" };
  const data = { name: str(b.name, 120), email: str(b.email, 200).toLowerCase(), company: str(b.company, 160) };
  if (!data.name) return { ok: false, error: "name_required" };
  if (!EMAIL.test(data.email)) return { ok: false, error: "email_invalid" };
  return { ok: true, data };
}

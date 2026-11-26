"use client";

/** Sends an analytics event to /api/track without slowing the page. Never throws. */
export function track(type: "pageview" | "demo_run" | "demo_error", extra: { demo?: string; source?: string } = {}) {
  try {
    const body = JSON.stringify({ type, path: window.location.pathname, referrer: document.referrer, ...extra });
    if (navigator.sendBeacon) navigator.sendBeacon("/api/track", new Blob([body], { type: "text/plain" }));
    else void fetch("/api/track", { method: "POST", body, keepalive: true });
  } catch {
    // Analytics must never break the page.
  }
}

/** The demo slug from a /{locale}/demos/{slug} address. */
export const demoFromPath = () => window.location.pathname.split("/demos/")[1]?.split(/[/?#]/)[0] ?? "";

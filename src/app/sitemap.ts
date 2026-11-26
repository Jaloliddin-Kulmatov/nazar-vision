import type { MetadataRoute } from "next";
import { site } from "@/config/site";
import { routing } from "@/i18n/routing";
import { demoSlugs } from "@/lib/content";

/** Public pages, each listed once per language with its translations, so search engines show the right one. */
const pages = ["", "/demos", "/solutions", "/use-cases", "/services", "/pilot", "/code", "/open-source", "/about", "/contact", "/privacy", "/terms"];

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [...pages, ...demoSlugs.map((s) => `/demos/${s}`)];
  const now = new Date();
  return paths.flatMap((path) => {
    const languages = Object.fromEntries([
      ...routing.locales.map((l) => [l, `${site.url}/${l}${path}`]),
      ["x-default", `${site.url}/${routing.defaultLocale}${path}`],
    ]);
    return routing.locales.map((l) => ({
      url: `${site.url}/${l}${path}`,
      lastModified: now,
      changeFrequency: path === "" || path === "/demos" ? ("weekly" as const) : ("monthly" as const),
      priority: path === "" ? 1 : path.startsWith("/demos/") ? 0.6 : 0.8,
      alternates: { languages },
    }));
  });
}

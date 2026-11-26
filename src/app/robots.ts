import type { MetadataRoute } from "next";
import { site } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/en/admin", "/uz/admin", "/ru/admin", "/en/account", "/uz/account", "/ru/account"] },
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}

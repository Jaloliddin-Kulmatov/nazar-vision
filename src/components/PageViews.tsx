"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { track } from "@/lib/track";

/** Records one page view per page visited (the admin dashboard is never counted). */
export default function PageViews() {
  const pathname = usePathname();
  useEffect(() => {
    if (!pathname.includes("/admin")) track("pageview");
  }, [pathname]);
  return null;
}

import { permanentRedirect } from "next/navigation";
import { use } from "react";

/** Prices were taken off the site: every project is quoted after the free check. */
export default function PricingPage({ params }: PageProps<"/[locale]/pricing">) {
  const { locale } = use(params);
  permanentRedirect(`/${locale}/services`);
}

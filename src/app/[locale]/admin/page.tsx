import type { Metadata } from "next";
import { use } from "react";
import { setRequestLocale } from "next-intl/server";
import { Container } from "@/components/ui";
import AdminDashboard from "@/components/admin/AdminDashboard";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false, follow: false } };

/** Owner-only: traffic, demo use and sign-ups. Not linked from the site; protected by ADMIN_PASSWORD. */
export default function AdminPage({ params }: PageProps<"/[locale]/admin">) {
  const { locale } = use(params);
  setRequestLocale(locale);
  return (
    <Container className="py-10">
      <h1 className="mb-6 font-display text-3xl font-bold">Dashboard</h1>
      <AdminDashboard />
    </Container>
  );
}

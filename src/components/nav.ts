/** Main menu: the pages a buyer needs. Everything else lives in the footer. */
export const navItems = [
  { href: "/demos", key: "demos" },
  { href: "/solutions", key: "solutions" },
  { href: "/use-cases", key: "useCases" },
  { href: "/services", key: "services" },
  { href: "/pricing", key: "pricing" },
] as const;

export const footerItems = [
  ...navItems,
  { href: "/open-source", key: "openSource" },
  { href: "/about", key: "about" },
  { href: "/contact", key: "contact" },
] as const;

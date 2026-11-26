/** Main menu: the pages a buyer needs. Everything else lives in the footer. */
export const navItems = [
  { href: "/demos", key: "demos" },
  { href: "/solutions", key: "solutions" },
  { href: "/use-cases", key: "useCases" },
  { href: "/services", key: "services" },
  { href: "/code", key: "code" },
] as const;

export const footerItems = [
  ...navItems,
  { href: "/pilot", key: "pilot" },
  { href: "/open-source", key: "openSource" },
  { href: "/about", key: "about" },
  { href: "/contact", key: "contact" },
] as const;

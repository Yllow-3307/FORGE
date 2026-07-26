"use client";

/**
 * navigation.tsx — En-tête sur ordinateur, barre inférieure sur mobile.
 * L'onglet actif est souligné par une pastille animée partagée (layoutId).
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { ThemeToggle } from "./theme";
import { cx } from "./ui";

const LIENS = [
  { href: "/", libelle: "Accueil", icone: "🏠" },
  { href: "/profil", libelle: "Profil", icone: "📝" },
  { href: "/programme", libelle: "Programme", icone: "📆" },
  { href: "/suivi", libelle: "Suivi", icone: "📈" },
] as const;

export function Navigation() {
  const chemin = usePathname();
  const estActif = (href: string) =>
    href === "/" ? chemin === "/" : chemin.startsWith(href);

  return (
    <>
      {/* ---------- En-tête (écrans moyens et plus) ---------- */}
      <header className="sticky top-0 z-40 hidden px-4 pt-4 md:block">
        <nav className="glass-strong mx-auto flex max-w-6xl items-center gap-2 rounded-pill px-3 py-2">
          <Link href="/" className="flex items-center gap-2.5 pl-2 pr-4">
            <span
              aria-hidden
              className="grid h-8 w-8 place-items-center rounded-xl bg-[var(--accent)] text-base"
            >
              🌿
            </span>
            <span className="text-[0.95rem] font-bold tracking-tight">Callisthenic</span>
          </Link>

          <div className="flex flex-1 items-center gap-1">
            {LIENS.map((l) => {
              const actif = estActif(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={actif ? "page" : undefined}
                  className={cx(
                    "relative rounded-pill px-4 py-2 text-sm transition-colors",
                    actif ? "text-[var(--accent-contrast)]" : "text-muted hover:text-ink",
                  )}
                >
                  {actif && (
                    <motion.span
                      layoutId="onglet-actif"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                      className="absolute inset-0 -z-10 rounded-pill bg-[var(--accent)]"
                    />
                  )}
                  {l.libelle}
                </Link>
              );
            })}
          </div>

          <ThemeToggle />
        </nav>
      </header>

      {/* ---------- Barre mobile ---------- */}
      <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 md:hidden">
        <Link href="/" className="flex items-center gap-2">
          <span
            aria-hidden
            className="grid h-8 w-8 place-items-center rounded-xl bg-[var(--accent)] text-base"
          >
            🌿
          </span>
          <span className="font-bold tracking-tight">Callisthenic</span>
        </Link>
        <ThemeToggle />
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-40 px-3 pb-3 md:hidden">
        <div className="glass-strong flex items-center justify-around rounded-xl2 px-2 py-2">
          {LIENS.map((l) => {
            const actif = estActif(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={actif ? "page" : undefined}
                className={cx(
                  "relative flex min-w-16 flex-col items-center gap-0.5 rounded-2xl px-3 py-1.5",
                  actif ? "text-[var(--accent)]" : "text-muted",
                )}
              >
                {actif && (
                  <motion.span
                    layoutId="onglet-actif-mobile"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    className="absolute inset-0 -z-10 rounded-2xl bg-[var(--accent-soft)]"
                  />
                )}
                <span className="text-lg" aria-hidden>{l.icone}</span>
                <span className="text-[0.68rem] font-medium">{l.libelle}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

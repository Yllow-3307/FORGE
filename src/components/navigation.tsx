"use client";

/**
 * navigation.tsx — En-tête sur ordinateur, barre inférieure sur mobile.
 *
 * Sur mobile, seuls les cinq accès principaux tiennent dans la barre ; les
 * écrans secondaires (Mesures, Paramètres) restent joignables depuis les
 * cartes de l'accueil et le menu « Plus ».
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { ThemeToggle } from "./theme";
import { cx } from "./ui";

const LIENS_PRINCIPAUX = [
  { href: "/", libelle: "Accueil", icone: "🏠" },
  { href: "/seance", libelle: "Séance", icone: "🔥" },
  { href: "/nutrition", libelle: "Nutrition", icone: "🥗" },
  { href: "/programme", libelle: "Programme", icone: "📆" },
  { href: "/progres", libelle: "Progrès", icone: "🏆" },
] as const;

const LIENS_SECONDAIRES = [
  { href: "/mesures", libelle: "Mesures", icone: "⚖️" },
  { href: "/parametres", libelle: "Paramètres", icone: "⚙️" },
  { href: "/compte", libelle: "Compte", icone: "👤" },
] as const;

// La barre de bureau affiche les 5 principaux + Mesures et Paramètres ;
// « Compte » vit dans l'icône dédiée, à droite.
const TOUS = [...LIENS_PRINCIPAUX, LIENS_SECONDAIRES[0], LIENS_SECONDAIRES[1]];

export function Navigation() {
  const chemin = usePathname();
  const [menuOuvert, setMenuOuvert] = useState(false);

  const estActif = (href: string) =>
    href === "/" ? chemin === "/" : chemin.startsWith(href);

  const secondaireActif = LIENS_SECONDAIRES.some((l) => estActif(l.href));

  return (
    <>
      {/* ---------- En-tête (écrans moyens et plus) ---------- */}
      <header className="sticky top-0 z-40 hidden px-4 pt-4 md:block">
        <nav className="glass-strong mx-auto flex max-w-6xl items-center gap-1 rounded-pill px-3 py-2">
          <Link href="/" className="flex items-center gap-2.5 pl-2 pr-3">
            <span
              aria-hidden
              className="grid h-8 w-8 place-items-center rounded-xl bg-[var(--accent)] text-base"
            >
              🌿
            </span>
            <span className="text-[0.95rem] font-bold tracking-tight">Callisthenic</span>
          </Link>

          <div className="flex flex-1 items-center gap-0.5">
            {TOUS.map((l) => {
              const actif = estActif(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={actif ? "page" : undefined}
                  className={cx(
                    "relative rounded-pill px-3.5 py-2 text-sm transition-colors",
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

          <Link
            href="/compte"
            aria-label="Mon compte"
            title="Mon compte"
            className={cx(
              "grid h-9 w-9 shrink-0 place-items-center rounded-full text-base transition-colors",
              estActif("/compte")
                ? "bg-[var(--accent)]"
                : "bg-[var(--surface-2)] hover:bg-[var(--accent-soft)]",
            )}
          >
            👤
          </Link>
          <ThemeToggle />
        </nav>
      </header>

      {/* ---------- Barre supérieure mobile ---------- */}
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

      {/* ---------- Barre inférieure mobile ---------- */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 px-3 md:hidden"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <AnimatePresence>
          {menuOuvert && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              className="glass-strong mb-2 grid grid-cols-3 gap-2 rounded-xl2 p-2"
            >
              {LIENS_SECONDAIRES.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setMenuOuvert(false)}
                  className={cx(
                    "flex items-center gap-2 rounded-2xl px-3 py-2.5 text-sm",
                    estActif(l.href)
                      ? "bg-[var(--accent-soft)] font-medium text-[var(--accent)]"
                      : "text-muted",
                  )}
                >
                  <span>{l.icone}</span>
                  {l.libelle}
                </Link>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="glass-strong flex items-center justify-around rounded-xl2 px-1 py-2">
          {LIENS_PRINCIPAUX.map((l) => {
            const actif = estActif(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMenuOuvert(false)}
                aria-current={actif ? "page" : undefined}
                className={cx(
                  "relative flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-2xl px-1 py-1.5",
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
                <span className="w-full truncate text-center text-[0.62rem] font-medium">
                  {l.libelle}
                </span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setMenuOuvert((m) => !m)}
            aria-label="Plus d'options"
            aria-expanded={menuOuvert}
            className={cx(
              "relative flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-2xl px-1 py-1.5",
              secondaireActif || menuOuvert ? "text-[var(--accent)]" : "text-muted",
            )}
          >
            <span className="text-lg" aria-hidden>{menuOuvert ? "✕" : "⋯"}</span>
            <span className="text-[0.62rem] font-medium">Plus</span>
          </button>
        </div>
      </nav>
    </>
  );
}

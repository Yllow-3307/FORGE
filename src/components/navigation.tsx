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
import { useState, useRef, useEffect } from "react";
import { ThemeToggle } from "./theme";
import { MarqueForge } from "./logo";
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

const ONGLETS_MOBILE = LIENS_PRINCIPAUX.slice(0, 4); // Accueil, Séance, Nutrition, Programme
const LIENS_PLUS = [...LIENS_PRINCIPAUX.slice(4), ...LIENS_SECONDAIRES]; // Progrès + 3 secondaires

export function Navigation() {
  const chemin = usePathname();
  const [menuOuvert, setMenuOuvert] = useState(false);
  const premierLienRef = useRef<HTMLAnchorElement>(null);
  const boutonPlusRef = useRef<HTMLButtonElement>(null);

  const estActif = (href: string) =>
    href === "/" ? chemin === "/" : chemin.startsWith(href);

  const secondaireActif = LIENS_PLUS.some((l) => estActif(l.href));

  // Focus management pour le panneau Plus + Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && menuOuvert) {
        setMenuOuvert(false);
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [menuOuvert]);

  useEffect(() => {
    if (menuOuvert) {
      setTimeout(() => {
        premierLienRef.current?.focus();
      }, 50);
    } else if (boutonPlusRef.current) {
      // focus retour géré dans onClick du bouton pour fiabilité
    }
  }, [menuOuvert]);

  return (
    <>
      {/* ---------- En-tête (écrans moyens et plus) ---------- */}
      <header className="sticky top-0 z-40 hidden px-4 pt-4 md:block">
        <nav className="glass-strong mx-auto flex max-w-6xl items-center gap-1 rounded-pill px-3 py-2">
          <Link href="/" className="rounded-pill py-1 pl-2 pr-3">
            <MarqueForge />
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
                    "relative rounded-pill px-3.5 py-2 text-sm transition-colors duration-200",
                    actif
                      ? "font-medium text-[var(--accent-contrast)]"
                      : "text-muted hover:bg-[var(--surface-2)] hover:text-ink",
                  )}
                >
                  {actif && (
                    <motion.span
                      layoutId="onglet-actif"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                      className="absolute inset-0 -z-10 rounded-pill bg-[image:var(--accent-degrade)] shadow-soft"
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
              "grid h-10 w-10 shrink-0 place-items-center rounded-full text-base",
              "transition-[background-color,box-shadow] duration-200",
              estActif("/compte")
                ? "bg-[image:var(--accent-degrade)] shadow-soft"
                : "bg-[var(--surface-2)] hover:bg-[var(--accent-soft)]",
            )}
          >
            👤
          </Link>
          <ThemeToggle />
        </nav>
      </header>

      {/* ---------- Barre supérieure mobile ---------- */}
      <header className="sticky top-0 z-40 px-3 pt-3 md:hidden">
        <div className="glass-strong flex items-center justify-between rounded-pill py-1.5 pl-3 pr-1.5">
          <Link href="/" className="rounded-pill py-1">
            <MarqueForge taille={28} />
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {/* ---------- Barre inférieure mobile ---------- */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 px-3 md:hidden"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <AnimatePresence>
          {menuOuvert && (
            <>
              <div
                aria-hidden="true"
                className="fixed inset-0 -z-10"
                onClick={() => setMenuOuvert(false)}
              />
              <motion.div
                id="menu-plus"
                role="menu"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="glass-strong mb-2 grid grid-cols-2 gap-2 rounded-xl2 p-2"
              >
                {LIENS_PLUS.map((l, index) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setMenuOuvert(false)}
                    className={cx(
                      "flex min-h-12 items-center gap-2 rounded-2xl px-3 py-2.5 text-sm",
                      "transition-colors duration-200",
                      estActif(l.href)
                        ? "bg-[var(--accent-soft)] font-medium text-[var(--accent)]"
                        : "text-muted hover:bg-[var(--surface-2)]",
                    )}
                    ref={index === 0 ? (el) => el?.focus() : undefined}
                  >
                    <span>{l.icone}</span>
                    {l.libelle}
                  </Link>
                ))}
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <div className="glass-strong flex items-center justify-around rounded-xl2 px-1 py-1.5">
          {ONGLETS_MOBILE.map((l) => {
            const actif = estActif(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMenuOuvert(false)}
                aria-current={actif ? "page" : undefined}
                className={cx(
                  "relative flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center",
                  "gap-0.5 rounded-2xl px-1 py-1.5 transition-colors duration-200",
                  actif ? "font-medium text-[var(--accent)]" : "text-muted",
                )}
              >
                {actif && (
                  <motion.span
                    layoutId="onglet-actif-mobile"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    className="absolute inset-0 -z-10 rounded-2xl bg-[var(--accent-soft)]"
                  />
                )}
                <span className="text-base" aria-hidden>{l.icone}</span>
                <span className="w-full truncate text-center text-[0.65rem]">
                  {l.libelle}
                </span>
              </Link>
            );
          })}

          <button
            ref={boutonPlusRef}
            type="button"
            onClick={() => {
              const nouveau = !menuOuvert;
              setMenuOuvert(nouveau);
              if (!nouveau) {
                // Focus retour immédiat si fermeture directe
                setTimeout(() => boutonPlusRef.current?.focus(), 0);
              }
            }}
            aria-label="Plus d'options"
            aria-expanded={menuOuvert}
            aria-controls="menu-plus"
            className={cx(
              "relative flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center",
              "gap-0.5 rounded-2xl px-1 py-1.5 transition-colors duration-200",
              secondaireActif || menuOuvert ? "text-[var(--accent)]" : "text-muted",
            )}
          >
            <span className="text-base" aria-hidden>{menuOuvert ? "✕" : "⋯"}</span>
            <span className="text-[0.65rem]">Plus</span>
          </button>
        </div>
      </nav>
    </>
  );
}

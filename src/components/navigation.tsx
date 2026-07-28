"use client";

/**
 * navigation.tsx — En-tête sur ordinateur, barre inférieure sur mobile.
 *
 * Sur mobile, seuls les cinq accès principaux tiennent dans la barre ; les
 * écrans secondaires (Mesures, Paramètres) restent joignables depuis les
 * cartes de l'accueil et le menu « Plus ».
 */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import { ThemeToggle } from "./theme";
import { MarqueForge } from "./logo";
import { cx } from "./ui";
import { useAuth } from "@/lib/auth";
import { useStatutSynchro } from "@/lib/statut-synchro";
import type { LucideIcon } from "lucide-react";
import {
  House,
  Flame,
  Salad,
  CalendarDays,
  Trophy,
  Scale,
  Settings,
  User,
  Menu,
  X,
  ChevronLeft,
  Cloud,
  CloudOff,
  RefreshCw,
} from "lucide-react";

interface LienNavigation {
  readonly href: string;
  readonly libelle: string;
  readonly icone: LucideIcon;
}

const LIENS_PRINCIPAUX: readonly LienNavigation[] = [
  { href: "/", libelle: "Accueil", icone: House },
  { href: "/seance", libelle: "Séance", icone: Flame },
  { href: "/nutrition", libelle: "Nutrition", icone: Salad },
  { href: "/programme", libelle: "Programme", icone: CalendarDays },
  { href: "/progres", libelle: "Progrès", icone: Trophy },
] as const;

const LIENS_SECONDAIRES: readonly LienNavigation[] = [
  { href: "/mesures", libelle: "Mesures", icone: Scale },
  { href: "/parametres", libelle: "Paramètres", icone: Settings },
] as const;

// La barre de bureau affiche les 5 principaux + Mesures et Paramètres ;
// « Compte » vit dans l'icône dédiée, à droite.
const TOUS = [...LIENS_PRINCIPAUX, LIENS_SECONDAIRES[0], LIENS_SECONDAIRES[1]];

const ONGLETS_MOBILE = LIENS_PRINCIPAUX.slice(0, 4); // Accueil, Séance, Nutrition, Programme
const LIENS_PLUS = [...LIENS_PRINCIPAUX.slice(4), ...LIENS_SECONDAIRES]; // Progrès + 3 secondaires

// Routes racines : onglets de la barre inférieure (pages « accueil »).
const RACINES = ONGLETS_MOBILE.map((l) => l.href);

// Titres affichés dans l'en-tête mobile sur les pages profondes.
// Repli : chaîne vide → on n'affiche alors que le bouton retour sans titre.
const TITRES: Record<string, string> = {
  "/profil": "Mon profil",
  "/progres": "Progrès",
  "/mesures": "Mesures",
  "/parametres": "Réglages",
};

function tempsRelatif(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const diffMinutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMinutes < 1) return "à l'instant";
  if (diffMinutes < 60) return `il y a ${diffMinutes} min`;

  const diffHeures = Math.floor(diffMinutes / 60);
  if (diffHeures < 24) return `il y a ${diffHeures} h`;

  const diffJours = Math.floor(diffHeures / 24);
  return `il y a ${diffJours} j`;
}

function BadgeSynchro() {
  const { statutConnexion, authDisponible } = useAuth();
  const { statut, derniereSynchro, elementsEnAttente } = useStatutSynchro();
  const [tooltipOuvert, setTooltipOuvert] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (!authDisponible || statutConnexion !== "connecte") return null;

  const icones: Record<"synchronise" | "en-cours" | "hors-ligne" | "en-attente", LucideIcon> = {
    synchronise: Cloud,
    "en-cours": RefreshCw,
    "hors-ligne": CloudOff,
    "en-attente": Cloud,
  };

  const couleurs: Record<"synchronise" | "en-cours" | "hors-ligne" | "en-attente", string> = {
    synchronise: "text-[var(--eau)]",
    "en-cours": "text-[var(--accent-vif)]",
    "hors-ligne": "text-[var(--text-faint)]",
    "en-attente": "text-[var(--warn)]",
  };

  const Icone = icones[statut];
  const temps = tempsRelatif(derniereSynchro);
  const label = {
    synchronise: "Synchronisation synchronisée",
    "en-cours": "Synchronisation en cours",
    "hors-ligne": "Synchronisation hors ligne",
    "en-attente": "Synchronisation en attente",
  }[statut];

  const texteTooltip = (() => {
    switch (statut) {
      case "synchronise":
        return temps ? `Synchronisé · ${temps}` : "Synchronisé";
      case "en-cours":
        return "Synchronisation en cours…";
      case "hors-ligne":
        return "Hors ligne — données locales";
      case "en-attente":
        return elementsEnAttente > 0
          ? `${elementsEnAttente} ${elementsEnAttente > 1 ? "éléments" : "élément"} en attente de synchronisation`
          : "Aucun élément en attente de synchronisation";
      default:
        return "Synchronisation";
    }
  })();

  const ouvrirTooltip = () => {
    setTooltipOuvert(true);
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = window.setTimeout(() => setTooltipOuvert(false), 2000);
    }
  };

  const fermerTooltip = () => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setTooltipOuvert(false);
  };

  const basculerTooltip = () => {
    setTooltipOuvert((ouvert) => {
      if (ouvert) {
        fermerTooltip();
        return false;
      }
      ouvrirTooltip();
      return true;
    });
  };

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={label}
        onClick={basculerTooltip}
        onMouseEnter={ouvrirTooltip}
        onMouseLeave={fermerTooltip}
        onFocus={ouvrirTooltip}
        onBlur={fermerTooltip}
        className="relative grid h-9 w-9 place-items-center rounded-full bg-[var(--surface-2)] transition-colors hover:bg-[var(--surface)]"
      >
        <Icone
          size={18}
          className={cx(
            couleurs[statut],
            statut === "en-cours" && "animate-spin",
            statut === "en-attente" && "animate-pulse",
          )}
        />
        {elementsEnAttente > 0 && (
          <span
            aria-label={`${elementsEnAttente} éléments en attente`}
            className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-[var(--accent)] px-0.5 text-[0.65rem] font-bold text-white"
          >
            {elementsEnAttente}
          </span>
        )}

        <AnimatePresence>
          {tooltipOuvert && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.15 }}
              role="status"
              className="glass-strong absolute right-0 top-full z-50 mt-2 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs text-ink shadow-soft"
            >
              {texteTooltip}
            </motion.div>
          )}
        </AnimatePresence>
      </button>
    </div>
  );
}

export function Navigation() {
  const chemin = usePathname();
  const router = useRouter();
  const [menuOuvert, setMenuOuvert] = useState(false);
  const premierLienRef = useRef<HTMLAnchorElement>(null);
  const boutonPlusRef = useRef<HTMLButtonElement>(null);

  // Page profonde : toute route qui n'est pas un onglet de la barre inférieure.
  const estProfonde = !RACINES.includes(chemin);
  const titre = TITRES[chemin] ?? "";

  // TODO: sur /profil, si l'utilisateur est au milieu du stepper (saisie en cours),
  // un retour direct perd sa progression. Prévoir une confirmation de sortie dans
  // une itération future (avant-prompt « Abandonner la saisie ? »).
  const retour = () => {
    if (typeof window !== "undefined" && window.history.length > 1) router.back();
    else router.push("/");
  };

  const estActif = (href: string) =>
    href === "/" ? chemin === "/" : chemin.startsWith(href);

  const secondaireActif = LIENS_PLUS.some((l) => estActif(l.href));

  // Focus management pour le panneau Plus + Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && menuOuvert) {
        setMenuOuvert(false);
        boutonPlusRef.current?.focus();
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

          <BadgeSynchro />

          <Link
            href="/parametres#compte"
            aria-label="Compte et réglages"
            title="Compte et réglages"
            className={cx(
              "grid h-10 w-10 shrink-0 place-items-center rounded-full text-base",
              "transition-[background-color,box-shadow,color] duration-200",
              estActif("/parametres")
                ? "bg-[image:var(--accent-degrade)] shadow-soft text-[var(--accent-contrast)]"
                : "bg-[var(--surface-2)] hover:bg-[var(--accent-soft)] text-muted hover:text-ink",
            )}
          >
            <User
              size={18}
              strokeWidth={estActif("/parametres") ? 2.25 : 1.75}
              aria-hidden
              className="shrink-0"
            />
          </Link>
          <ThemeToggle />
        </nav>
      </header>

      {/* ---------- Barre supérieure mobile ---------- */}
      <header className="sticky top-0 z-40 px-3 pt-3 md:hidden">
        <div
          className={cx(
            "glass-strong flex items-center justify-between rounded-pill py-1.5",
            estProfonde ? "pl-1.5 pr-1.5" : "pl-3 pr-1.5",
          )}
        >
          {/* Zone gauche : bouton retour (page profonde) ou logo (racine). */}
          {estProfonde ? (
            <button
              type="button"
              onClick={retour}
              aria-label="Revenir en arrière"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-[var(--surface-2)]"
            >
              <ChevronLeft size={22} aria-hidden />
            </button>
          ) : (
            <Link href="/" className="rounded-pill py-1">
              <MarqueForge taille={28} />
            </Link>
          )}

          {/* Titre de page (centré, tronqué) — visible uniquement en page profonde. */}
          {estProfonde && titre !== "" && (
            <p className="min-w-0 flex-1 truncate text-center text-sm font-semibold">
              {titre}
            </p>
          )}
          {estProfonde && titre === "" && <div className="flex-1" aria-hidden />}

          {/* Zone droite : badge de synchro et bascule de thème. */}
          <div className="flex items-center gap-1.5">
            <BadgeSynchro />
            <ThemeToggle />
          </div>
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
                {LIENS_PLUS.map((l, index) => {
                  const actif = estActif(l.href);
                  const Icone = l.icone;
                  return (
                    <Link
                      key={l.href}
                      href={l.href}
                      onClick={() => setMenuOuvert(false)}
                      className={cx(
                        "flex min-h-12 items-center gap-2 rounded-2xl px-3 py-2.5 text-sm",
                        "transition-colors duration-200",
                        actif
                          ? "bg-[var(--accent-soft)] font-medium text-[var(--accent)]"
                          : "text-muted hover:bg-[var(--surface-2)]",
                      )}
                      ref={index === 0 ? premierLienRef : undefined}
                    >
                      <Icone
                        size={18}
                        strokeWidth={actif ? 2.25 : 1.75}
                        aria-hidden
                        className="shrink-0"
                      />
                      {l.libelle}
                    </Link>
                  );
                })}
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <div className="glass-strong flex items-center justify-around rounded-xl2 px-1 py-1.5">
          {ONGLETS_MOBILE.map((l) => {
            const actif = estActif(l.href);
            const Icone = l.icone;
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
                <Icone
                  size={22}
                  strokeWidth={actif ? 2.25 : 1.75}
                  aria-hidden
                  className="shrink-0"
                />
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
            {(() => {
              const IconePlus = menuOuvert ? X : Menu;
              return (
                <IconePlus
                  size={22}
                  strokeWidth={secondaireActif || menuOuvert ? 2.25 : 1.75}
                  aria-hidden
                  className="shrink-0"
                />
              );
            })()}
            <span className="text-[0.65rem]">Plus</span>
          </button>
        </div>
      </nav>
    </>
  );
}

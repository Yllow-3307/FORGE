"use client";

/**
 * theme.tsx — Bascule clair / sombre.
 *
 * Le thème est appliqué par une classe `dark` sur <html> et mémorisé dans
 * localStorage. Un script inline (voir layout.tsx) pose déjà la classe avant
 * le premier rendu : React se contente donc de *lire* l'état réel du DOM via
 * `useSyncExternalStore`, sans jamais provoquer de rendu en cascade.
 */

import { createContext, useCallback, useContext, useSyncExternalStore } from "react";
import { motion } from "framer-motion";
import { useToast } from "@/components/toast";

type Theme = "light" | "dark";

export const CLE_THEME = "forge-theme";

/* ------------------------------------------------------------------ store */

const abonnes = new Set<() => void>();

function souscrire(callback: () => void) {
  abonnes.add(callback);
  return () => {
    abonnes.delete(callback);
  };
}

function notifier() {
  abonnes.forEach((cb) => cb());
}

/** Source de vérité côté client : la classe réellement posée sur <html>. */
function lireTheme(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

/** Au rendu serveur, on suppose le thème clair ; le script inline corrigera. */
function lireThemeServeur(): Theme {
  return "light";
}

/* ---------------------------------------------------------------- contexte */

const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({
  theme: "light",
  toggle: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(souscrire, lireTheme, lireThemeServeur);

  const toggle = useCallback(() => {
    const suivant: Theme = lireTheme() === "dark" ? "light" : "dark";
    document.documentElement.classList.toggle("dark", suivant === "dark");
    try {
      localStorage.setItem(CLE_THEME, suivant);
    } catch {
      // Mode navigation privée ou stockage désactivé : le thème reste
      // appliqué pour la session, simplement non mémorisé.
    }
    notifier();
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);

/* ------------------------------------------------------------ interrupteur */

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggle: toggleTheme } = useTheme();
  const { toast } = useToast();
  const sombre = theme === "dark";

  const toggle = () => {
    toggleTheme();
    toast(sombre ? "Mode clair" : "Mode sombre", "info");
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={sombre ? "Passer au thème clair" : "Passer au thème sombre"}
      title={sombre ? "Thème clair" : "Thème sombre"}
      className={
        "glass relative h-10 w-[4.25rem] rounded-pill p-1 "
        + `transition-colors hover:border-[var(--border-strong)] ${className}`
      }
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 460, damping: 34 }}
        className="grid h-8 w-8 place-items-center rounded-full bg-[image:var(--accent-degrade)] text-sm shadow-soft"
        style={{ marginLeft: sombre ? "2.05rem" : 0 }}
      >
        <span aria-hidden>{sombre ? "🌙" : "☀️"}</span>
      </motion.span>
    </button>
  );
}

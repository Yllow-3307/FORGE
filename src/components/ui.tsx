"use client";

/**
 * ui.tsx — Primitives visuelles partagées, inspirées du moodboard :
 * verre dépoli, coins très arrondis, ombres douces, animations discrètes.
 */

import { motion, type HTMLMotionProps } from "framer-motion";
import type { ReactNode } from "react";

export const cx = (...c: (string | false | null | undefined)[]) =>
  c.filter(Boolean).join(" ");

/* -------------------------------------------------------------------------
   Animations réutilisables
   ------------------------------------------------------------------------- */

export const apparition = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
};

/** Conteneur qui fait apparaître ses enfants en cascade. */
export const cascade = {
  animate: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

export const enfantCascade = {
  initial: { opacity: 0, y: 14 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  },
};

/* -------------------------------------------------------------------------
   Carte en verre dépoli
   ------------------------------------------------------------------------- */

interface CarteProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  fort?: boolean;      // verre plus opaque
  sansReflet?: boolean;
  className?: string;
}

export function Carte({
  children, fort = false, sansReflet = false, className = "", ...rest
}: CarteProps) {
  return (
    <motion.div
      className={cx(
        fort ? "glass-strong" : "glass",
        !sansReflet && "glass-sheen",
        "rounded-xl2",
        className,
      )}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/* -------------------------------------------------------------------------
   Boutons
   ------------------------------------------------------------------------- */

type Variante = "principal" | "doux" | "fantome" | "danger";

const VARIANTES: Record<Variante, string> = {
  principal:
    "bg-[var(--accent)] text-[var(--accent-contrast)] hover:brightness-105 active:brightness-95",
  doux:
    "bg-[var(--accent-soft)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--accent-contrast)]",
  fantome:
    "glass text-ink hover:border-[var(--border-strong)]",
  danger:
    "bg-[var(--danger-soft)] text-[var(--danger)] hover:bg-[var(--danger)] hover:text-white",
};

interface BoutonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  children: ReactNode;
  variante?: Variante;
  taille?: "sm" | "md" | "lg";
  pleineLargeur?: boolean;
}

export function Bouton({
  children, variante = "principal", taille = "md",
  pleineLargeur = false, className = "", disabled, ...rest
}: BoutonProps) {
  const tailles = {
    sm: "px-3.5 py-2 text-sm gap-1.5",
    md: "px-5 py-2.5 text-[0.95rem] gap-2",
    lg: "px-7 py-3.5 text-base gap-2.5",
  };
  return (
    <motion.button
      whileHover={disabled ? undefined : { scale: 1.025 }}
      whileTap={disabled ? undefined : { scale: 0.975 }}
      transition={{ type: "spring", stiffness: 420, damping: 26 }}
      disabled={disabled}
      className={cx(
        "inline-flex items-center justify-center rounded-pill font-semibold",
        "transition-[filter,background-color,color,border-color] duration-200",
        "disabled:cursor-not-allowed disabled:opacity-45",
        tailles[taille],
        VARIANTES[variante],
        pleineLargeur && "w-full",
        className,
      )}
      {...rest}
    >
      {children}
    </motion.button>
  );
}

/* -------------------------------------------------------------------------
   Étiquettes et pastilles
   ------------------------------------------------------------------------- */

export function Pastille({
  children, ton = "neutre", className = "",
}: {
  children: ReactNode;
  ton?: "neutre" | "accent" | "warn" | "danger";
  className?: string;
}) {
  const tons = {
    neutre: "bg-[var(--surface-2)] text-muted",
    accent: "bg-[var(--accent-soft)] text-[var(--accent)]",
    warn: "bg-[var(--warn-soft)] text-[var(--warn)]",
    danger: "bg-[var(--danger-soft)] text-[var(--danger)]",
  };
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-pill px-2.5 py-1 text-xs font-medium",
        tons[ton], className,
      )}
    >
      {children}
    </span>
  );
}

/* -------------------------------------------------------------------------
   Encadré d'information
   ------------------------------------------------------------------------- */

export function Encart({
  children, ton = "info", titre,
}: {
  children: ReactNode;
  ton?: "info" | "warn" | "danger";
  titre?: string;
}) {
  const tons = {
    info: "border-l-[var(--accent)] bg-[var(--accent-soft)]",
    warn: "border-l-[var(--warn)] bg-[var(--warn-soft)]",
    danger: "border-l-[var(--danger)] bg-[var(--danger-soft)]",
  };
  return (
    <div className={cx("rounded-r-2xl border-l-[3px] px-4 py-3 text-sm leading-relaxed", tons[ton])}>
      {titre && <p className="mb-1 font-semibold">{titre}</p>}
      <div className="text-pretty">{children}</div>
    </div>
  );
}

/* -------------------------------------------------------------------------
   Statistique mise en avant
   ------------------------------------------------------------------------- */

export function Stat({
  label, valeur, unite, indice,
}: {
  label: string;
  valeur: ReactNode;
  unite?: string;
  indice?: string;
}) {
  return (
    <div className="rounded-2xl bg-[var(--surface-2)] px-4 py-3">
      <p className="etiquette">{label}</p>
      <p className="mt-1 chiffre text-2xl leading-none">
        {valeur}
        {unite && (
          <span className="ml-1 text-[0.65rem] font-normal uppercase tracking-widest text-muted">
            {unite}
          </span>
        )}
      </p>
      {indice && <p className="mt-1 text-xs text-muted">{indice}</p>}
    </div>
  );
}

/**
 * Chiffre mis en avant, façon widget : très grand, graisse fine, unité en
 * petites capitales. C'est l'élément signature du style.
 */
export function GrandChiffre({
  valeur, unite, label, taille = "md",
}: {
  valeur: ReactNode;
  unite?: string;
  label?: string;
  taille?: "sm" | "md" | "lg";
}) {
  const tailles = {
    sm: "text-3xl sm:text-4xl",
    md: "text-4xl sm:text-5xl",
    lg: "text-5xl sm:text-6xl",
  };
  return (
    <div>
      {label && <p className="etiquette mb-1">{label}</p>}
      <p className={cx("chiffre leading-[0.95]", tailles[taille])}>
        {valeur}
        {unite && (
          <span className="ml-1.5 text-[0.32em] font-normal uppercase tracking-[0.18em] text-muted">
            {unite}
          </span>
        )}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------
   Champs de formulaire
   ------------------------------------------------------------------------- */

const CLASSE_CHAMP =
  "w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2.5 "
  + "text-[0.95rem] text-ink outline-none transition backdrop-blur-sm "
  + "focus:border-[var(--border-strong)] focus:bg-[var(--surface)] "
  + "placeholder:text-faint";

export function Champ({
  label, aide, erreur, children, obligatoire,
}: {
  label: string;
  aide?: string;
  erreur?: string;
  children: ReactNode;
  obligatoire?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline gap-1.5 text-sm font-medium text-muted">
        {label}
        {obligatoire && <span className="text-[var(--danger)]">*</span>}
      </span>
      {children}
      {aide && !erreur && <span className="mt-1 block text-xs text-faint">{aide}</span>}
      {erreur && (
        <span className="mt-1 block text-xs font-medium text-[var(--danger)]">{erreur}</span>
      )}
    </label>
  );
}

export function Saisie(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(CLASSE_CHAMP, props.className)} />;
}

export function Liste({
  options, ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  options: { valeur: string; libelle: string }[];
}) {
  return (
    <select {...props} className={cx(CLASSE_CHAMP, "cursor-pointer", props.className)}>
      {options.map((o) => (
        <option key={o.valeur} value={o.valeur}>{o.libelle}</option>
      ))}
    </select>
  );
}

/** Groupe de puces à sélection multiple. */
export function Puces<T extends string>({
  options, valeurs, onChange, colonnes,
}: {
  options: { valeur: T; libelle: string }[];
  valeurs: T[];
  onChange: (v: T[]) => void;
  colonnes?: boolean;
}) {
  const basculer = (v: T) =>
    onChange(valeurs.includes(v) ? valeurs.filter((x) => x !== v) : [...valeurs, v]);

  return (
    <div className={cx("flex flex-wrap gap-2", colonnes && "grid grid-cols-2 sm:grid-cols-3")}>
      {options.map((o) => {
        const actif = valeurs.includes(o.valeur);
        return (
          <motion.button
            key={o.valeur}
            type="button"
            onClick={() => basculer(o.valeur)}
            whileTap={{ scale: 0.96 }}
            aria-pressed={actif}
            className={cx(
              "rounded-pill border px-3.5 py-2 text-sm transition-colors",
              actif
                ? "border-[var(--accent)] bg-[var(--accent-soft)] font-medium text-[var(--accent)]"
                : "border-[var(--border)] bg-[var(--surface-2)] text-muted hover:border-[var(--accent)]",
            )}
          >
            {o.libelle}
          </motion.button>
        );
      })}
    </div>
  );
}

/** Sélecteur à choix unique, présenté en cartes. */
export function Choix<T extends string>({
  options, valeur, onChange,
}: {
  options: { valeur: T; libelle: string; description?: string; icone?: string }[];
  valeur: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      {options.map((o) => {
        const actif = valeur === o.valeur;
        return (
          <motion.button
            key={o.valeur}
            type="button"
            onClick={() => onChange(o.valeur)}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.985 }}
            aria-pressed={actif}
            className={cx(
              "rounded-2xl border px-4 py-3 text-left transition-colors",
              actif
                ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                : "border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--accent)]",
            )}
          >
            <span className="flex items-center gap-2 font-medium text-ink">
              {o.icone && <span aria-hidden>{o.icone}</span>}
              {o.libelle}
            </span>
            {o.description && (
              <span className="mt-0.5 block text-xs leading-snug text-muted">{o.description}</span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

/** Curseur avec valeur affichée. */
export function Curseur({
  min, max, pas = 1, valeur, onChange, suffixe = "",
}: {
  min: number;
  max: number;
  pas?: number;
  valeur: number;
  onChange: (v: number) => void;
  suffixe?: string;
}) {
  const pct = ((valeur - min) / (max - min)) * 100;
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-2xl font-bold tnum">
          {valeur}
          <span className="ml-1 text-sm font-normal text-muted">{suffixe}</span>
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={pas}
        value={valeur}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-pill outline-none
                   [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5
                   [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full
                   [&::-webkit-slider-thumb]:bg-[var(--accent)] [&::-webkit-slider-thumb]:shadow-soft
                   [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:border-0
                   [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[var(--accent)]"
        style={{
          background: `linear-gradient(to right, var(--accent) ${pct}%, var(--surface-2) ${pct}%)`,
        }}
      />
    </div>
  );
}

/** Barre de progression horizontale (volume musculaire, macros...). */
export function Barre({
  valeur, max, ton = "accent", etiquette,
}: {
  valeur: number;
  max: number;
  ton?: "accent" | "warn" | "danger";
  etiquette?: string;
}) {
  const couleurs = {
    accent: "var(--accent)",
    warn: "var(--warn)",
    danger: "var(--danger)",
  };
  return (
    <div className="flex items-center gap-3">
      {etiquette && <span className="w-24 shrink-0 text-xs text-muted">{etiquette}</span>}
      <div className="h-2.5 flex-1 overflow-hidden rounded-pill bg-[var(--surface-2)]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, (valeur / max) * 100)}%` }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="h-full rounded-pill"
          style={{ background: couleurs[ton] }}
        />
      </div>
      <span className="w-10 shrink-0 text-right text-xs tnum text-muted">{valeur}</span>
    </div>
  );
}

/** État vide illustré. */
export function Vide({
  icone = "🌱", titre, texte, action,
}: {
  icone?: string;
  titre: string;
  texte?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <span className="mb-4 text-5xl" aria-hidden>{icone}</span>
      <p className="text-lg font-semibold text-ink">{titre}</p>
      {texte && <p className="mt-1.5 max-w-sm text-sm text-muted text-pretty">{texte}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

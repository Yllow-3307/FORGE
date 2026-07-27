"use client";

/**
 * ui.tsx — Primitives visuelles partagées.
 *
 * Direction : verre dépoli lumineux, coins « squircle », ombres diffuses,
 * grands chiffres en graisse fine, animations discrètes et courtes.
 * Toutes les valeurs sensibles (couleurs, rayons, durées) viennent des
 * jetons définis dans `globals.css` : aucune constante en dur ici.
 */

import { motion, type HTMLMotionProps } from "framer-motion";
import type { ReactNode } from "react";
import { useCoarsePointer } from "@/hooks/useCoarsePointer";

export const cx = (...c: (string | false | null | undefined)[]) =>
  c.filter(Boolean).join(" ");

/* -------------------------------------------------------------------------
   Animations réutilisables
   ------------------------------------------------------------------------- */

/** Courbe unique de l'interface : sortie douce, sans rebond. */
const DOUX = [0.22, 1, 0.36, 1] as const;

export const apparition = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, ease: DOUX },
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
    transition: { duration: 0.5, ease: DOUX },
  },
};

/**
 * @deprecated Utilisez le hook `useSurvolCarte()` à la place pour désactiver
 * automatiquement le survol sur les écrans tactiles (pointer: coarse).
 */
export const survolCarte = {
  whileHover: { y: -2 },
  transition: { type: "spring" as const, stiffness: 400, damping: 30 },
};

export { useSurvolCarte, useCoarsePointer } from "@/hooks/useCoarsePointer";

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
  // Une carte animée au survol est cliquable : on lui donne aussi la
  // transition de bordure et d'ombre qui accompagne le déplacement.
  const interactive = rest.whileHover !== undefined;

  return (
    <motion.div
      className={cx(
        fort ? "glass-strong" : "glass",
        !sansReflet && "glass-sheen",
        "rounded-xl2",
        interactive && "glass-interactif",
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
  // Action principale : dégradé corail et ombre portée, elle doit ressortir
  // immédiatement dans une page faite de surfaces translucides.
  principal:
    "bg-[image:var(--accent-degrade)] text-[var(--accent-contrast)] shadow-soft "
    + "hover:brightness-108 hover:shadow-lift active:brightness-95",
  doux:
    "bg-[var(--accent-soft)] text-[var(--accent)] hover:bg-[var(--accent-soft-fort)]",
  fantome:
    "glass text-ink hover:border-[var(--border-strong)] hover:bg-[var(--surface)]",
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
  const coarse = useCoarsePointer();
  // Hauteurs pensées pour une cible tactile d'au moins 44 px dès `md`.
  const tailles = {
    sm: "min-h-9 px-3.5 py-2 text-sm gap-1.5",
    md: "min-h-11 px-5 py-2.5 text-[0.95rem] gap-2",
    lg: "min-h-13 px-7 py-3.5 text-base gap-2.5",
  };
  return (
    <motion.button
      whileHover={disabled || coarse ? undefined : { scale: 1.01 }}
      whileTap={disabled ? undefined : { scale: 0.985 }}
      transition={{ type: "spring", stiffness: 420, damping: 30 }}
      disabled={disabled}
      className={cx(
        "inline-flex items-center justify-center rounded-pill font-semibold",
        "transition-[filter,background-color,color,border-color,box-shadow]",
        "duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
        "disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none",
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
    neutre: "bg-[var(--surface-2)] text-muted ring-1 ring-[var(--border)]",
    accent: "bg-[var(--accent-soft)] text-[var(--accent)] ring-1 ring-[var(--panneau-chaud-bord)]",
    warn: "bg-[var(--warn-soft)] text-[var(--warn)] ring-1 ring-[var(--warn-soft)]",
    danger: "bg-[var(--danger-soft)] text-[var(--danger)] ring-1 ring-[var(--danger-soft)]",
  };
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-pill px-2.5 py-1 text-xs font-medium",
        "backdrop-blur-[2px]",
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
    <div
      className={cx(
        "rounded-l-md rounded-r-2xl border-l-[3px] px-4 py-3.5 text-sm leading-relaxed",
        tons[ton],
      )}
    >
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
    <div className="panneau-froid rounded-2xl px-4 py-3.5">
      <p className="etiquette">{label}</p>
      <p className="mt-1.5 chiffre text-2xl leading-none">
        {valeur}
        {unite && <span className="unite ml-1.5 text-[0.62rem]">{unite}</span>}
      </p>
      {indice && <p className="mt-1.5 text-xs text-muted">{indice}</p>}
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
  // Échelle fluide : la valeur reste dominante sur mobile sans jamais
  // déborder de sa carte sur les très petits écrans.
  const tailles = {
    sm: "valeur-sm",
    md: "valeur-md",
    lg: "valeur-lg",
  };
  return (
    <div>
      {label && <p className="etiquette mb-1.5">{label}</p>}
      <p className={cx("chiffre leading-[0.92]", tailles[taille])}>
        {valeur}
        {unite && <span className="unite ml-1.5 text-[0.3em]">{unite}</span>}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------
   Champs de formulaire
   ------------------------------------------------------------------------- */

const CLASSE_CHAMP =
  "w-full min-h-11 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2.5 "
  + "text-[0.95rem] text-ink outline-none backdrop-blur-sm "
  + "transition-[background-color,border-color,box-shadow] duration-200 "
  + "hover:border-[var(--border-strong)] "
  + "focus:border-[var(--accent)] focus:bg-[var(--surface)] "
  + "focus:ring-4 focus:ring-[var(--anneau-focus)] "
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
            whileTap={{ scale: 0.985 }}
            aria-pressed={actif}
            className={cx(
              "min-h-11 rounded-pill border px-4 py-2 text-sm",
              "transition-[background-color,border-color,color] duration-200",
              actif
                ? "border-[var(--accent)] bg-[var(--accent-soft)] font-medium text-[var(--accent)]"
                : "border-[var(--border)] bg-[var(--surface-2)] text-muted "
                  + "hover:border-[var(--border-strong)] hover:bg-[var(--surface)] hover:text-ink",
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
  const coarse = useCoarsePointer();
  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      {options.map((o) => {
        const actif = valeur === o.valeur;
        return (
          <motion.button
            key={o.valeur}
            type="button"
            onClick={() => onChange(o.valeur)}
            whileHover={coarse ? undefined : { y: -2 }}
            whileTap={{ scale: 0.99 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            aria-pressed={actif}
            className={cx(
              "rounded-2xl border px-4 py-3.5 text-left",
              "transition-[background-color,border-color,box-shadow] duration-200",
              actif
                ? "border-[var(--accent)] bg-[var(--accent-soft)] shadow-soft"
                : "border-[var(--border)] bg-[var(--surface-2)] "
                  + "hover:border-[var(--border-strong)] hover:bg-[var(--surface)] hover:shadow-soft",
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
      <div className="mb-2.5 flex items-baseline justify-between">
        <span className="chiffre text-2xl leading-none">
          {valeur}
          <span className="unite ml-1.5 text-[0.55rem]">{suffixe}</span>
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={pas}
        value={valeur}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-pill outline-none
                   [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5
                   [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full
                   [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white
                   [&::-webkit-slider-thumb]:bg-[var(--accent)] [&::-webkit-slider-thumb]:shadow-soft
                   [&::-webkit-slider-thumb]:transition-transform
                   hover:[&::-webkit-slider-thumb]:scale-110
                   [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5
                   [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white
                   [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[var(--accent)]"
        style={{
          background:
            `linear-gradient(to right, var(--accent-vif) ${pct}%, var(--surface-2) ${pct}%)`,
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
    accent: "var(--accent-vif)",
    warn: "var(--warn)",
    danger: "var(--danger)",
  };
  return (
    <div className="flex items-center gap-3">
      {etiquette && <span className="w-24 shrink-0 text-xs text-muted">{etiquette}</span>}
      <div className="h-1.5 flex-1 overflow-hidden rounded-pill bg-[var(--surface-2)]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, (valeur / max) * 100)}%` }}
          transition={{ duration: 0.7, ease: DOUX }}
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
  icone = "🌱", titre, texte, action, apercu, secondaire,
}: {
  icone?: string;
  titre: string;
  texte?: string;
  action?: ReactNode;
  apercu?: ReactNode;
  secondaire?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      {/* Halo doux derrière l'icône : évite l'effet « émoji posé sur du vide ». */}
      <span
        aria-hidden
        className="panneau-chaud mb-5 grid h-20 w-20 place-items-center rounded-full text-4xl"
      >
        {icone}
      </span>
      <p className="text-lg font-semibold text-ink">{titre}</p>
      {texte && <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted text-pretty">{texte}</p>}
      {apercu && <div className="mt-6 w-full max-w-md">{apercu}</div>}
      {action && <div className="mt-6">{action}</div>}
      {secondaire && <div className="mt-3">{secondaire}</div>}
    </div>
  );
}

export function Squelette({ className }: { className?: string }) {
  return <div aria-hidden className={cx("skeleton", className)} />;
}

export function SqueletteGrille({ lignes = 4 }: { lignes?: number }) {
  return (
    <div
      role="status"
      aria-label="Chargement du tableau de bord"
      aria-busy="true"
      className="space-y-4"
    >
      <span className="sr-only">Chargement…</span>
      {/* Grande carte éditoriale */}
      <Squelette className="h-44 rounded-xl3 sm:h-52" />
      {/* Grille widgets */}
      <div className="grid auto-rows-[minmax(132px,auto)] grid-cols-2 gap-3 md:auto-rows-[minmax(148px,auto)] md:grid-cols-3 lg:grid-cols-4">
        <Squelette className="col-span-2 h-full md:col-span-3 lg:col-span-4" />
        {Array.from({ length: lignes }).map((_, i) => (
          <Squelette
            key={i}
            className={i % 2 === 0 ? "col-span-1" : "col-span-1"}
          />
        ))}
      </div>
    </div>
  );
}

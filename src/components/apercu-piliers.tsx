"use client";

/**
 * apercu-piliers.tsx — Aperçu illustré des quatre piliers du programme.
 *
 * Affiché dans l'état vide de l'accueil, avant toute création de profil :
 * plutôt qu'un simple « créez votre profil », on montre *ce que le moteur
 * produit*. Chaque pilier est représenté par une mini-visualisation reprenant
 * la forme réelle du widget correspondant (barres de volume, tracé cardiaque,
 * répartition des macros, bouteille d'hydratation).
 *
 * Les chiffres affichés sont des exemples — le bandeau de la grille le dit
 * explicitement, pour ne jamais laisser croire à un calcul déjà personnalisé.
 *
 * Les illustrations sont décoratives (`aria-hidden`) : l'information utile est
 * portée par le texte à côté. Les animations sont désactivées lorsque
 * l'utilisateur demande moins de mouvement.
 */

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { Carte, cascade, enfantCascade } from "./ui";
import { Bouteille } from "./bouteille";

/** Courbe unique de l'interface, identique à celle de `ui.tsx`. */
const DOUX = [0.22, 1, 0.36, 1] as const;

/* -------------------------------------------------------------------------
   Illustration 1 — Force : volume hebdomadaire en barres
   ------------------------------------------------------------------------- */

/** Séries d'une même séance, en progression : la dernière est la plus haute. */
const BARRES_FORCE = [44, 62, 54, 76, 68, 92];

function IllustrationForce({ anime }: { anime: boolean }) {
  return (
    <div aria-hidden className="flex h-[72px] items-end gap-1.5">
      {BARRES_FORCE.map((h, i) => {
        const dernier = i === BARRES_FORCE.length - 1;
        return (
          <motion.span
            key={i}
            className="flex-1 rounded-pill"
            style={{
              background: dernier
                ? "var(--accent-degrade)"
                : "var(--accent-soft-fort)",
            }}
            // Unités homogènes de bout en bout : animer de `6px` vers `44%`
            // ferait sauter la barre au premier calcul d'interpolation.
            initial={anime ? { height: "8%", opacity: 0 } : false}
            animate={{ height: `${h}%`, opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.1 + i * 0.07, ease: DOUX }}
          />
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------
   Illustration 2 — Endurance : tracé cardiaque et zone cible
   ------------------------------------------------------------------------- */

/* Tracé volontairement irrégulier : une courbe trop lisse ne ressemble pas
   à un relevé de fréquence cardiaque. Repère 100 × 48. */
const TRACE_FC =
  "M0,38 L12,34 L22,22 L34,25 L46,14 L58,18 L70,10 L82,20 L92,15 L100,19";

function IllustrationEndurance({ anime }: { anime: boolean }) {
  return (
    <div aria-hidden className="flex h-[72px] flex-col justify-between">
      {/* Étiquette placée dans le flux, et non posée sur le tracé : à cette
          taille, un badge en absolu finit toujours par recouvrir une crête. */}
      <div className="flex items-baseline justify-between">
        <span className="text-[0.66rem] font-medium text-muted">Zone 2</span>
        <span className="text-[0.66rem] tnum text-faint">132–143 bpm</span>
      </div>
      <svg
        viewBox="0 0 100 48"
        preserveAspectRatio="none"
        className="h-11 w-full overflow-visible"
      >
        {/* Bande de la zone cible : le tracé doit y rester le plus souvent.
            Rayon volontairement petit — `preserveAspectRatio="none"` étire
            l'horizontale, un grand rayon deviendrait une ellipse molle. */}
        <rect
          x="0" y="10" width="100" height="16" rx="2"
          fill="var(--eau-soft)"
        />
        <motion.path
          d={TRACE_FC}
          fill="none"
          stroke="var(--eau)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          initial={anime ? { pathLength: 0 } : false}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.2, delay: 0.25, ease: "easeOut" }}
        />
      </svg>
    </div>
  );
}

/* -------------------------------------------------------------------------
   Illustration 3 — Nutrition : répartition des macros
   ------------------------------------------------------------------------- */

const MACROS = [
  { nom: "P", part: 32, grammes: 164, couleur: "var(--data-proteines)" },
  { nom: "G", part: 42, grammes: 213, couleur: "var(--data-glucides)" },
  { nom: "L", part: 26, grammes: 57, couleur: "var(--data-lipides)" },
];

function IllustrationNutrition({ anime }: { anime: boolean }) {
  return (
    <div aria-hidden className="flex h-[72px] flex-col justify-center gap-2.5">
      <p className="chiffre text-[1.6rem] leading-none">
        2 020<span className="unite ml-1.5 text-[0.42rem]">kcal</span>
      </p>
      <div className="flex h-2 gap-0.5 overflow-hidden rounded-pill">
        {MACROS.map((m, i) => (
          <motion.span
            key={m.nom}
            className="h-full first:rounded-l-pill last:rounded-r-pill"
            style={{ background: m.couleur }}
            initial={anime ? { width: 0 } : false}
            animate={{ width: `${m.part}%` }}
            transition={{ duration: 0.7, delay: 0.2 + i * 0.1, ease: DOUX }}
          />
        ))}
      </div>
      <div className="flex justify-between text-[0.66rem] tnum text-muted">
        {MACROS.map((m) => (
          <span key={m.nom}>{m.nom} {m.grammes} g</span>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
   Illustration 4 — Hydratation : bouteille et points de la journée
   ------------------------------------------------------------------------- */

/** Échéancier type : les points d'ancrage réels d'une journée. */
const POINTS_EAU = ["7 h", "10 h", "13 h", "17 h", "20 h"];

function IllustrationHydratation({ anime }: { anime: boolean }) {
  return (
    <div aria-hidden className="flex h-[72px] items-center gap-4">
      <Bouteille pourcentage={68} hauteur={72} afficherValeur={false} />
      <div className="min-w-0 flex-1">
        <p className="chiffre text-[1.35rem] leading-none">
          2,6<span className="unite ml-1.5 text-[0.42rem]">L</span>
        </p>
        <div className="mt-2.5 flex items-center gap-1.5">
          {POINTS_EAU.map((h, i) => (
            <motion.span
              key={h}
              className="h-1.5 flex-1 rounded-pill"
              style={{
                background: i < 3 ? "var(--eau)" : "var(--surface-2)",
              }}
              initial={anime ? { opacity: 0, scaleX: 0.3 } : false}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ duration: 0.45, delay: 0.25 + i * 0.08, ease: DOUX }}
            />
          ))}
        </div>
        <p className="mt-1.5 text-[0.66rem] text-muted">réparties sur 5 points</p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
   Les quatre piliers
   ------------------------------------------------------------------------- */

interface Pilier {
  cle: string;
  emoji: string;
  titre: string;
  /** Une phrase : ce que le moteur calcule, pas ce que l'écran affiche. */
  texte: string;
  /** Preuve chiffrée, tirée des données réellement embarquées. */
  detail: string;
  illustration: (p: { anime: boolean }) => ReactNode;
}

const PILIERS: Pilier[] = [
  {
    cle: "force",
    emoji: "💪",
    titre: "Callisthénie & muscu",
    texte:
      "Un découpage de semaine, des exercices choisis pour votre matériel, "
      + "et une charge qui monte semaine après semaine.",
    detail: "135 exercices · séries, repos et RPE calculés",
    illustration: IllustrationForce,
  },
  {
    cle: "endurance",
    emoji: "🏃",
    titre: "Endurance",
    texte:
      "Vos cinq zones cardiaques calculées par la méthode de Karvonen, "
      + "et un volume réparti sans vous cramer.",
    detail: "5 zones · 80 % en fondamental, 20 % en intensité",
    illustration: IllustrationEndurance,
  },
  {
    cle: "nutrition",
    emoji: "🥗",
    titre: "Nutrition",
    texte:
      "Calories et macros déduites de votre métabolisme, réparties sur vos "
      + "repas réels et vos contraintes alimentaires.",
    detail: "60 aliments · 16 contraintes prises en compte",
    illustration: IllustrationNutrition,
  },
  {
    cle: "hydratation",
    emoji: "💧",
    titre: "Hydratation",
    texte:
      "Un besoin ajusté au poids, à l'effort et au climat — puis découpé en "
      + "points de la journée, pas en un total à deviner.",
    detail: "Socle + pertes à l'effort + correctifs",
    illustration: IllustrationHydratation,
  },
];

/**
 * Grille des quatre piliers.
 *
 * Les cartes ne sont pas cliquables : avant la création du profil, tous les
 * écrans qu'elles évoquent sont vides. Aucune élévation au survol, donc, qui
 * laisserait croire le contraire.
 */
export function ApercuPiliers() {
  const reduit = useReducedMotion();
  const anime = !reduit;

  return (
    <motion.div
      variants={cascade}
      initial="initial"
      animate="animate"
      className="grid gap-3 sm:grid-cols-2"
    >
      {PILIERS.map((p) => (
        <motion.div key={p.cle} variants={enfantCascade}>
          <Carte className="flex h-full flex-col gap-4 p-5">
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className="panneau-chaud grid h-10 w-10 shrink-0 place-items-center
                           rounded-2xl text-lg"
              >
                {p.emoji}
              </span>
              <h3 className="text-[1.02rem] font-semibold leading-tight text-balance">
                {p.titre}
              </h3>
            </div>

            <div className="panneau-froid rounded-2xl px-4 py-3.5">
              <p.illustration anime={anime} />
            </div>

            <div className="mt-auto">
              <p className="text-sm leading-relaxed text-muted text-pretty">{p.texte}</p>
              <p className="mt-2 text-xs text-faint">{p.detail}</p>
            </div>
          </Carte>
        </motion.div>
      ))}
    </motion.div>
  );
}

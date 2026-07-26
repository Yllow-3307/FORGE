"use client";

/**
 * apercu-hero.tsx — Illustration du hero : cartes en verre dépoli disposées
 * en escalier, reprenant les widgets empilés du moodboard.
 *
 * Les positions sont calculées par une grille explicite plutôt que par des
 * décalages absolus tâtonnés : aucun élément ne peut en recouvrir un autre.
 * Purement décoratif : masqué aux lecteurs d'écran et sous `lg`.
 */

import { motion } from "framer-motion";

/** Léger flottement vertical, désynchronisé d'une carte à l'autre. */
const flottement = (retard: number, amplitude = 8) => ({
  animate: { y: [0, -amplitude, 0] },
  transition: {
    duration: 6 + retard,
    repeat: Infinity,
    ease: "easeInOut" as const,
    delay: retard,
  },
});

export function ApercuHero() {
  return (
    <div
      aria-hidden
      className="pointer-events-none hidden select-none lg:grid lg:grid-cols-5 lg:gap-3"
    >
      {/* --- Rangée 1 : zone cardiaque (gauche) + séance (droite) --- */}
      <motion.div
        {...flottement(1.4)}
        className="glass glass-sheen col-span-2 self-end rounded-xl2 px-4 py-3"
      >
        <p className="text-[0.68rem] font-semibold uppercase tracking-wider text-faint">
          Zone 2
        </p>
        <p className="mt-0.5 text-sm font-bold tnum">132–143 bpm</p>
        <p className="mt-0.5 text-[0.68rem] text-muted">endurance fondamentale</p>
      </motion.div>

      <motion.div
        {...flottement(0)}
        className="glass-strong glass-sheen col-span-3 rounded-xl2 p-4"
      >
        <div className="flex items-center justify-between">
          <span className="text-[0.68rem] font-semibold uppercase tracking-wider text-faint">
            Mardi
          </span>
          <span className="rounded-pill bg-[var(--accent-soft)] px-2 py-0.5 text-[0.66rem] font-medium text-[var(--accent)]">
            50 min
          </span>
        </div>
        <p className="mt-2 font-semibold">Full body A</p>

        <div className="mt-3 space-y-1.5">
          {[
            ["Traction pronation", "4 × 8"],
            ["Pompes déclinées", "4 × 10"],
            ["Squat gobelet", "3 × 12"],
          ].map(([nom, serie]) => (
            <div key={nom} className="flex items-center justify-between text-[0.78rem]">
              <span className="text-muted">{nom}</span>
              <span className="tnum font-medium">{serie}</span>
            </div>
          ))}
        </div>

        <div className="mt-3 h-1.5 overflow-hidden rounded-pill bg-[var(--surface-2)]">
          <motion.div
            initial={{ width: "0%" }}
            animate={{ width: "68%" }}
            transition={{ duration: 1.4, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="h-full rounded-pill bg-[var(--accent)]"
          />
        </div>
      </motion.div>

      {/* --- Rangée 2 : macros (gauche) + hydratation (droite) --- */}
      <motion.div
        {...flottement(1.1)}
        className="glass glass-sheen col-span-3 mt-3 rounded-xl2 p-4"
      >
        <span className="text-[0.68rem] font-semibold uppercase tracking-wider text-faint">
          Aujourd&apos;hui
        </span>
        <p className="chiffre mt-1 valeur-sm leading-none">
          2 020<span className="unite ml-1.5 text-[0.5rem]">kcal</span>
        </p>
        <div className="mt-3 flex h-2 overflow-hidden rounded-pill">
          <div className="w-[32%] bg-[var(--data-proteines)]" />
          <div className="w-[42%] bg-[var(--data-glucides)]" />
          <div className="w-[26%] bg-[var(--data-lipides)]" />
        </div>
        <div className="mt-2 flex justify-between text-[0.68rem] text-muted">
          <span>P 164 g</span>
          <span>G 213 g</span>
          <span>L 57 g</span>
        </div>
      </motion.div>

      <motion.div
        {...flottement(2.1)}
        className="glass-strong col-span-2 mt-3 flex items-center gap-3 self-start rounded-xl2 px-4 py-3"
      >
        <span className="text-xl">💧</span>
        <div>
          <p className="text-sm font-bold tnum leading-none">2,6 L</p>
          <p className="mt-0.5 text-[0.68rem] leading-tight text-muted">
            réparties sur 9 points
          </p>
        </div>
      </motion.div>
    </div>
  );
}

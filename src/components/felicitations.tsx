"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { Bouton, Carte, Stat, cascade, enfantCascade } from "@/components/ui";
import type { Programme } from "@/lib/moteur";

export function Felicitations({
  programme,
  nom,
  onContinuer,
  onRetour,
}: {
  programme: Programme;
  nom: string;
  onContinuer: () => void;
  onRetour?: () => void;
}) {
  // Scroll en haut à l'apparition (lisible même sans animation)
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);

  const semaines = programme.meta.dureeCycle;
  const seancesParSemaine =
    programme.synthese.seancesForce + programme.synthese.seancesCardio;
  const calories = programme.nutrition.kcal;
  const hydra =
    programme.hydratation.besoinEntrainement?.totalMl ??
    programme.hydratation.besoinRepos?.totalMl ??
    2000;
  const hydratation = (hydra / 1000).toFixed(1);

  return (
    <Carte
      fort
      className="carte-editoriale relative overflow-hidden p-6 sm:p-9"
    >
      {/* Halo corail — même motif que l'accueil */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-28 h-64 w-64 rounded-full bg-[radial-gradient(circle,var(--accent-soft-fort),transparent_70%)] blur-2xl"
      />

      <motion.div
        variants={cascade}
        initial="initial"
        animate="animate"
        className="relative space-y-7"
      >
        {/* a) Coche animée */}
        <motion.div
          variants={enfantCascade}
          className="mx-auto flex h-16 w-16 items-center justify-center"
        >
          <svg
            width="64"
            height="64"
            viewBox="0 0 52 52"
            className="overflow-visible"
          >
            <circle
              cx="26"
              cy="26"
              r="24"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="3"
              opacity="0.25"
            />
            <motion.path
              d="M15 26.5 L22.5 34 L37 19"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            />
          </svg>
        </motion.div>

        {/* b) Titre */}
        <motion.div variants={enfantCascade} className="text-center">
          <h1 className="text-2xl font-bold text-balance">
            Votre programme est prêt, {nom}.
          </h1>
          {/* c) Sous-titre */}
          <p className="mt-2 text-muted">
            Voici ce que FORGE a calculé pour vous.
          </p>
        </motion.div>

        {/* d) Grille des 4 Stats — uniquement champs existants sur Programme */}
        <motion.div
          variants={enfantCascade}
          className="grid grid-cols-2 gap-3 md:grid-cols-4"
        >
          <Stat
            label="Durée du cycle"
            valeur={semaines}
            unite="semaines"
          />
          <Stat
            label="Séances par semaine"
            valeur={seancesParSemaine}
            unite="séances"
          />
          <Stat
            label="Calories cibles"
            valeur={calories}
            unite="kcal/j"
          />
          <Stat
            label="Hydratation cible"
            valeur={hydratation}
            unite="L/j"
          />
        </motion.div>

        {/* e) 3 prochaines actions */}
        <motion.div variants={enfantCascade}>
          <p className="mb-3 text-sm font-medium text-ink">Vos 3 premiers pas</p>
          <ol className="space-y-2.5 text-sm">
            {[
              "Consultez votre séance du jour",
              "Notez votre premier repas",
              "Enregistrez votre poids de départ",
            ].map((texte, index) => (
              <li key={index} className="flex items-start gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--accent-soft)] text-xs font-semibold text-[var(--accent)] mt-px">
                  {index + 1}
                </span>
                <span className="text-pretty leading-snug">{texte}</span>
              </li>
            ))}
          </ol>
        </motion.div>

        {/* f) Boutons */}
        <motion.div variants={enfantCascade} className="space-y-3 pt-1">
          <Bouton pleineLargeur onClick={onContinuer}>
            Voir mon tableau de bord
          </Bouton>

          {onRetour && (
            <button
              type="button"
              onClick={onRetour}
              className="block w-full text-center text-sm text-muted underline underline-offset-4 transition hover:text-ink"
            >
              Modifier mon profil
            </button>
          )}
        </motion.div>
      </motion.div>
    </Carte>
  );
}

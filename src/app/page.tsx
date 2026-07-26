"use client";

/**
 * page.tsx — Accueil.
 *
 * Trois états :
 *  - aucun profil enregistré : présentation et invitation à commencer ;
 *  - un profil existe : rappel de la séance et des repas du jour ;
 *  - dans tous les cas : accès rapide aux quatre piliers du programme.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Bouton, Carte, Pastille, Stat, Vide, cascade, enfantCascade } from "@/components/ui";
import { ApercuHero } from "@/components/apercu-hero";
import { listerFiches, stockageDistant, type FicheClient } from "@/lib/stockage";
import { genererProgramme, type Programme } from "@/lib/moteur";
import { JOURS } from "@/lib/moteur/types";
import { cap } from "@/lib/moteur/noyau";

const PILIERS = [
  {
    icone: "🤸",
    titre: "Callisthénie & muscu",
    texte: "Exercices choisis selon votre matériel réel, avec régressions et progressions.",
    href: "/programme?onglet=force",
  },
  {
    icone: "🏃",
    titre: "Endurance",
    texte: "Zones de fréquence cardiaque personnalisées et modalités sans impact si besoin.",
    href: "/programme?onglet=endurance",
  },
  {
    icone: "🥗",
    titre: "Nutrition",
    texte: "Calories, macros et repas calés sur vos horaires, votre cuisine et vos contraintes.",
    href: "/programme?onglet=nutrition",
  },
  {
    icone: "💧",
    titre: "Hydratation",
    texte: "Un échéancier concret plutôt qu'un volume abstrait à atteindre.",
    href: "/programme?onglet=hydratation",
  },
];

export default function Accueil() {
  const [fiches, setFiches] = useState<FicheClient[] | null>(null);

  useEffect(() => {
    listerFiches().then(setFiches).catch(() => setFiches([]));
  }, []);

  const active = fiches?.[0] ?? null;

  // La génération est coûteuse : on ne la relance que si la fiche change.
  const programme: Programme | null = useMemo(() => {
    if (!active) return null;
    try {
      return genererProgramme(active.profil);
    } catch {
      return null;
    }
  }, [active]);

  const jourActuel = JOURS[(new Date().getDay() + 6) % 7];
  const aujourdhui = programme?.semaineType.jours.find((j) => j.jour === jourActuel) ?? null;

  return (
    <motion.div variants={cascade} initial="initial" animate="animate" className="space-y-6">
      {/* ------------------------------- Hero ------------------------------- */}
      <motion.section variants={enfantCascade}>
        <Carte className="overflow-hidden px-6 py-10 sm:px-10 sm:py-14">
          <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="max-w-2xl">
            <Pastille ton="accent">
              {stockageDistant() ? "Synchronisé" : "Données locales"}
            </Pastille>
            <h1 className="mt-4 text-3xl font-bold leading-[1.15] tracking-tight text-balance sm:text-5xl">
              Un programme qui tient dans{" "}
              <span className="text-[var(--accent)]">votre vraie semaine</span>.
            </h1>
            <p className="mt-4 max-w-xl text-[0.98rem] leading-relaxed text-muted text-pretty">
              Renseignez votre profil, vos horaires et votre matériel : le moteur place chaque
              séance, chaque repas et chaque gorgée d&apos;eau dans les créneaux qui vous restent
              réellement — puis fait progresser le tout sur plusieurs semaines.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/profil">
                <Bouton taille="lg">
                  {active ? "Modifier mon profil" : "Créer mon programme"}
                  <span aria-hidden>→</span>
                </Bouton>
              </Link>
              {active && (
                <Link href="/programme">
                  <Bouton taille="lg" variante="fantome">Voir mon programme</Bouton>
                </Link>
              )}
            </div>
          </div>
          <ApercuHero />
          </div>
        </Carte>
      </motion.section>

      {/* -------------------------- Séance du jour -------------------------- */}
      {aujourdhui && programme && (
        <motion.section variants={enfantCascade}>
          <Carte className="p-6 sm:p-7">
            <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-bold">
                {cap(jourActuel)} — votre journée
              </h2>
              <Pastille ton={aujourdhui.seances.length ? "accent" : "neutre"}>
                {aujourdhui.seances.length
                  ? `${aujourdhui.minutesEffort} min d'effort`
                  : "Journée de récupération"}
              </Pastille>
            </div>

            {aujourdhui.seances.length > 0 ? (
              <div className="space-y-3">
                {aujourdhui.seances.map((s) => (
                  <div
                    key={s.nom + s.debut}
                    className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl bg-[var(--surface-2)] px-4 py-3"
                  >
                    <span className="text-lg" aria-hidden>
                      {s.type === "force" ? "🤸" : "🏃"}
                    </span>
                    <span className="font-semibold tnum">{s.debut}</span>
                    <span className="flex-1 font-medium">{s.nom}</span>
                    <Pastille>{s.dureeMin} min</Pastille>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-2xl bg-[var(--surface-2)] px-4 py-3 text-sm text-muted">
                Aucune séance prévue : la récupération fait partie du programme. Marche,
                sommeil et alimentation restent vos leviers du jour.
              </p>
            )}

            <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
              {aujourdhui.repas.slice(0, 4).map((r) => (
                <div
                  key={r.nom + r.heureTxt}
                  className="flex items-baseline justify-between rounded-2xl bg-[var(--surface-2)] px-4 py-2.5 text-sm"
                >
                  <span className="flex items-baseline gap-2">
                    <span className="tnum text-muted">{r.heureTxt}</span>
                    <span className="font-medium">{r.nom}</span>
                  </span>
                  <span className="tnum text-muted">{r.kcal} kcal</span>
                </div>
              ))}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <Stat label="Calories" valeur={programme.nutrition.kcal} unite="kcal" />
              <Stat label="Protéines" valeur={programme.nutrition.proteinesG} unite="g" />
              <Stat
                label="Hydratation"
                valeur={(aujourdhui.hydratation.totalPlanifie / 1000).toFixed(1)}
                unite="L"
              />
              <Stat label="Séances/sem" valeur={active!.profil.seancesParSemaine} />
            </div>
          </Carte>
        </motion.section>
      )}

      {/* --------------------------- Aucun profil --------------------------- */}
      {fiches !== null && fiches.length === 0 && (
        <motion.section variants={enfantCascade}>
          <Carte>
            <Vide
              icone="🌿"
              titre="Aucun profil pour l'instant"
              texte="Le questionnaire prend deux minutes : 18 paramètres suffisent à construire un programme complet et réaliste."
              action={
                <Link href="/profil">
                  <Bouton>Commencer</Bouton>
                </Link>
              }
            />
          </Carte>
        </motion.section>
      )}

      {/* ----------------------------- Piliers ------------------------------ */}
      <motion.section variants={enfantCascade}>
        <h2 className="mb-3 px-1 text-sm font-semibold uppercase tracking-wider text-faint">
          Les quatre piliers
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PILIERS.map((p) => (
            <Link key={p.titre} href={active ? p.href : "/profil"}>
              <Carte
                whileHover={{ y: -4 }}
                transition={{ type: "spring", stiffness: 380, damping: 26 }}
                className="h-full p-5"
              >
                <span className="text-2xl" aria-hidden>{p.icone}</span>
                <h3 className="mt-3 font-semibold">{p.titre}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted text-pretty">{p.texte}</p>
              </Carte>
            </Link>
          ))}
        </div>
      </motion.section>

      {/* --------------------------- Fonctionnement -------------------------- */}
      <motion.section variants={enfantCascade}>
        <Carte className="p-6 sm:p-8">
          <h2 className="text-lg font-bold">Comment le programme est construit</h2>
          <ol className="mt-5 grid gap-5 sm:grid-cols-3">
            {[
              {
                n: "1",
                t: "Vos contraintes d'abord",
                d: "Réveil, travail, trajets, indisponibilités : le moteur calcule les créneaux qui restent, puis y place les séances — jamais l'inverse.",
              },
              {
                n: "2",
                t: "Le matériel que vous avez",
                d: "Chaque exercice est filtré par votre équipement et vos zones sensibles. Sans barre de traction, le tirage existe quand même.",
              },
              {
                n: "3",
                t: "Une progression, pas une photo",
                d: "Le cycle monte en volume puis prévoit une semaine de décharge. Chaque exercice a sa régression et sa progression.",
              },
            ].map((e) => (
              <li key={e.n}>
                <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--accent)] text-sm font-bold text-[var(--accent-contrast)]">
                  {e.n}
                </span>
                <h3 className="mt-3 font-semibold">{e.t}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted text-pretty">{e.d}</p>
              </li>
            ))}
          </ol>
        </Carte>
      </motion.section>

      <motion.p
        variants={enfantCascade}
        className="px-2 pb-2 text-center text-xs leading-relaxed text-faint text-pretty"
      >
        Les valeurs produites (calories, fréquences cardiaques, charges) sont des estimations de
        départ, à ajuster selon les résultats observés. Ce document ne remplace pas un avis médical.
      </motion.p>
    </motion.div>
  );
}

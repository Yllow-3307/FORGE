"use client";

/**
 * useApp.ts — Point d'accès unique à l'état de l'application côté client.
 *
 * Regroupe le profil actif, le programme généré, le journal du jour et les
 * réglages. Les composants s'y abonnent et sont notifiés à chaque écriture
 * (événement `forge:maj`), y compris depuis un autre onglet.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { genererProgramme, type Programme } from "./moteur";
import type { Jour, Profil, Seance } from "./moteur/types";
import { JOURS } from "./moteur/types";
import { listerFiches, type FicheClient } from "./stockage";
import { useStockageLocal } from "./store";
import {
  REGLAGES_DEFAUT, aujourdhui, scoreHydratation, scoreNutrition,
  serieEnCours, totauxJour, type JournalJour, type Reglages,
} from "./suivi";

/** Jour de la semaine courant, au format du moteur (lundi = index 0). */
export function jourSemaineCourant(): Jour {
  return JOURS[(new Date().getDay() + 6) % 7];
}

/**
 * Semaine en cours dans le cycle, déduite de la date de création de la fiche.
 * Retourne un index borné à la durée du cycle.
 */
export function semaineCourante(fiche: FicheClient | null, dureeCycle: number): number {
  if (!fiche) return 1;
  const debut = new Date(fiche.creeLe);
  const jours = Math.floor((Date.now() - debut.getTime()) / 86_400_000);
  return Math.min(dureeCycle, Math.max(1, Math.floor(jours / 7) + 1));
}

export interface EtatApp {
  chargement: boolean;
  fiche: FicheClient | null;
  profil: Profil | null;
  programme: Programme | null;
  /** Séances prévues aujourd'hui, d'après la semaine en cours du cycle. */
  seancesDuJour: Seance[];
  jour: JournalJour;
  reglages: Reglages;
  semaine: number;
  serie: number;
  scores: { nutrition: number; hydratation: number };
  totaux: { kcal: number; proteines: number; glucides: number; lipides: number };
  cibleHydratation: number;
  rafraichir: () => void;
}

export function useApp(): EtatApp {
  const [fiche, setFiche] = useState<FicheClient | null>(null);
  const [chargement, setChargement] = useState(true);
  const [version, setVersion] = useState(0);

  const rafraichir = useCallback(() => setVersion((v) => v + 1), []);

  // Chargement de la fiche active
  useEffect(() => {
    let annule = false;
    listerFiches()
      .then((fiches) => {
        if (!annule) {
          setFiche(fiches[0] ?? null);
          setChargement(false);
        }
      })
      .catch(() => {
        if (!annule) setChargement(false);
      });
    return () => { annule = true; };
  }, [version]);

  // Abonnement aux écritures locales (même onglet et autres onglets)
  useEffect(() => {
    const onMaj = () => setVersion((v) => v + 1);
    window.addEventListener("forge:maj", onMaj);
    window.addEventListener("storage", onMaj);
    return () => {
      window.removeEventListener("forge:maj", onMaj);
      window.removeEventListener("storage", onMaj);
    };
  }, []);

  const programme = useMemo(() => {
    if (!fiche) return null;
    try {
      return genererProgramme(fiche.profil);
    } catch {
      return null;
    }
  }, [fiche]);

  const semaine = semaineCourante(fiche, programme?.meta.dureeCycle ?? 8);

  const seancesDuJour = useMemo(() => {
    if (!programme) return [];
    const semaineData = programme.cycle[semaine - 1] ?? programme.semaineType;
    const j = jourSemaineCourant();
    return semaineData.jours.find((x) => x.jour === j)?.seances ?? [];
  }, [programme, semaine]);

  // Abonnement direct au stockage : la valeur est relue à chaque écriture,
  // sans effet ni rendu intermédiaire.
  const journal = useStockageLocal<JournalJour[]>("forge:journal", []);
  const jour = useMemo(
    () => journal.find((j) => j.date === aujourdhui())
      ?? { date: aujourdhui(), repas: [], hydratationMl: 0, seanceFaite: false },
    [journal],
  );
  const reglagesStockes = useStockageLocal<Partial<Reglages>>("forge:reglages", {});
  const reglages = useMemo<Reglages>(
    () => ({
      ...REGLAGES_DEFAUT,
      ...reglagesStockes,
      notifications: {
        ...REGLAGES_DEFAUT.notifications,
        ...(reglagesStockes.notifications ?? {}),
      },
      minuteur: {
        ...REGLAGES_DEFAUT.minuteur,
        ...(reglagesStockes.minuteur ?? {}),
      },
    }),
    [reglagesStockes],
  );

  const cibleHydratation = programme
    ? (seancesDuJour.length
      ? programme.hydratation.besoinEntrainement.totalMl
      : programme.hydratation.besoinRepos.totalMl)
    : 2000;

  const scores = useMemo(() => ({
    nutrition: programme
      ? scoreNutrition(jour, {
        kcal: programme.nutrition.kcal,
        proteinesG: programme.nutrition.proteinesG,
        glucidesG: programme.nutrition.glucidesG,
        lipidesG: programme.nutrition.lipidesG,
      })
      : 0,
    hydratation: scoreHydratation(jour, cibleHydratation),
  }), [jour, programme, cibleHydratation]);

  // Jours où une séance est programmée, pour le calcul de la série.
  // `journal` est bien une dépendance : serieEnCours() relit les séances
  // réalisées, il faut donc recalculer à chaque écriture.
  const serie = useMemo(() => {
    if (!programme || !fiche) return 0;
    const joursPrevus = new Set<string>();
    const debut = new Date(fiche.creeLe);
    const curseur = new Date();

    for (let i = 0; i < 120; i++) {
      const iso = curseur.toISOString().slice(0, 10);
      if (curseur >= debut) {
        const ecart = Math.floor((curseur.getTime() - debut.getTime()) / 86_400_000);
        const sem = Math.min(programme.cycle.length, Math.floor(ecart / 7) + 1);
        const data = programme.cycle[sem - 1] ?? programme.semaineType;
        const nomJour = JOURS[(curseur.getDay() + 6) % 7];
        if ((data.jours.find((x) => x.jour === nomJour)?.seances.length ?? 0) > 0) {
          joursPrevus.add(iso);
        }
      }
      curseur.setDate(curseur.getDate() - 1);
    }
    return serieEnCours(joursPrevus);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- journal déclenche la relecture
  }, [programme, fiche, journal]);

  return {
    chargement,
    fiche,
    profil: fiche?.profil ?? null,
    programme,
    seancesDuJour,
    jour,
    reglages,
    semaine,
    serie,
    scores,
    totaux: totauxJour(jour),
    cibleHydratation,
    rafraichir,
  };
}

/** Libellé lisible du type de séance du jour. */
export function libelleSeance(seances: Seance[]): string {
  if (!seances.length) return "Repos";
  if (seances.length === 1) return seances[0].nom;
  return seances.map((s) => s.nom).join(" + ");
}

/** Volume de la séance : durée totale, ou distance pour le cardio. */
export function volumeSeance(seances: Seance[]): string {
  if (!seances.length) return "—";
  const minutes = seances.reduce((a, s) => a + s.dureeMin, 0);
  return `${minutes} min`;
}

export { aujourdhui };

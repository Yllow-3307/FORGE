/**
 * index.ts — Orchestrateur du moteur de programmation.
 *
 * Assemble les quatre blocs (force, endurance, nutrition, hydratation) en un
 * programme cohérent : semaine type heure par heure et progression sur tout
 * le cycle. C'est ici que se règlent les arbitrages entre modules :
 *  - répartition des séances entre renforcement et cardio ;
 *  - interférence force/endurance le même jour ;
 *  - calories des jours d'entraînement contre jours de repos.
 */

import type {
  Derive, Jour, JourPlanifie, Profil, Programme, Seance, SemaineCycle, SemainePlanifiee,
} from "./types";
import { JOURS } from "./types";
import { cap, derive, fmt, normaliser, toMin } from "./noyau";
import {
  budgetTempsCuisine, creneauxLibres, joursEntrainement, momentPrefere, placerAvecRepli,
  structureRepas, type Creneau,
} from "./agenda";
import {
  auditerVolume, construireSeanceForce, dureeSeanceCible, equilibrer,
  semainesDuCycle, splitPour, volumeHebdomadaire,
} from "./force";
import {
  conseilVolumeResiduel, construireSeanceCardio, modalitePrincipale, raisonSansImpact,
  repartirCardio, tableZones, trajetActif, volumeCardioCible,
} from "./endurance";
import {
  macros, profilAlimentaire, reglesAjustement, repartirMacros, strategiePratique,
} from "./nutrition";
import {
  REPERES_HYDRATATION, besoinHydrique, planHydratation, recommandationsBoissons,
} from "./hydratation";

export * from "./types";
export { derive, valider, normaliser, fmt, toMin, dureeFmt, cap, humaniser } from "./noyau";
export { BIBLIOTHEQUE, NB_EXERCICES } from "./exercices";
export { dureeEstimee } from "./force";

/**
 * Répartit l'enveloppe de séances entre renforcement et cardio.
 * L'entraînement concourant crée une interférence : on protège la modalité
 * prioritaire selon l'objectif, avec un plancher de 2 séances de force pour
 * préserver la masse maigre.
 */
export function repartirSeances(p: Profil): [number, number] {
  const n = p.seancesParSemaine;
  if (n <= 0) return [0, 0];

  const parts: Record<Profil["objectif"], [number, number]> = {
    force: [1, 0],
    prise_de_muscle: [0.85, 0.15],
    competition_street: [0.85, 0.15],
    recomposition: [0.7, 0.3],
    perte_de_gras: [0.65, 0.35],
    sante_mobilite: [0.6, 0.4],
    endurance: [0.35, 0.65],
  };

  let nForce = Math.max(1, Math.round(n * parts[p.objectif][0]));
  let nCardio = n - nForce;

  if (p.objectif !== "endurance" && n >= 3 && nForce < 2) {
    nForce = 2;
    nCardio = n - 2;
  }
  if (p.objectif === "endurance" && n >= 3 && nForce < 1) {
    nForce = 1;
    nCardio = n - 1;
  }
  return [nForce, Math.max(0, nCardio)];
}

function jourLePlusLibre(p: Profil, d: Derive, exclus: Jour[]): Jour | null {
  const dispo = JOURS
    .filter((j) => !exclus.includes(j))
    .map((j) => [j, creneauxLibres(p, d, j).reduce((a, c) => a + (c.fin - c.debut), 0)] as [Jour, number])
    .filter(([, total]) => total >= 30);
  if (!dispo.length) return null;
  return dispo.reduce((a, b) => (a[1] >= b[1] ? a : b))[0];
}

export function genererSemaine(p: Profil, d: Derive, semaine: SemaineCycle): SemainePlanifiee {
  const [nForce, nCardio] = repartirSeances(p);
  const dureeForce = dureeSeanceCible(p, d);

  // 1. Choix des jours
  const joursForce = joursEntrainementLimite(p, d, dureeForce, nForce);
  const occupes: Jour[] = [...joursForce];
  const joursCardio: Jour[] = [];

  for (let i = 0; i < nCardio; i++) {
    let j = jourLePlusLibre(p, d, occupes);
    if (!j) {
      // Agenda saturé : on double sur un jour de force, à distance.
      const restants = joursForce.filter((x) => !joursCardio.includes(x));
      j = restants.length ? restants[0] : null;
    }
    if (!j) break;
    joursCardio.push(j);
    occupes.push(j);
  }

  const split = splitPour(p, Math.max(1, joursForce.length));
  const vol = volumeCardioCible(p, d);
  const specs = repartirCardio(p, vol.minutesSemaine, joursCardio.length);

  const parJour = new Map<Jour, Seance[]>(JOURS.map((j) => [j, []]));
  const alertes: string[] = [];

  // 2. Séances de renforcement
  joursForce.forEach((j, i) => {
    const intensite = ["force", "prise_de_muscle", "competition_street"].includes(p.objectif)
      ? "elevee" : "moderee";
    const { creneau, duree } = placerAvecRepli(p, d, j, dureeForce, 25, intensite);
    if (!creneau) {
      alertes.push(`Aucun créneau d'au moins 25 min trouvé le ${j} : séance non placée.`);
      return;
    }
    const [nom, patterns] = split[i % split.length];
    parJour.get(j)!.push(
      construireSeanceForce(p, d, nom, patterns, j, fmt(creneau.debut), fmt(creneau.fin), duree, semaine),
    );
  });

  const toutesForce = JOURS.flatMap((j) => parJour.get(j)!.filter((s) => s.type === "force"));
  const eq = equilibrer(p, toutesForce, semaine);
  alertes.push(...eq.remarques);

  // 3. Séances de cardio
  joursCardio.forEach((j, i) => {
    if (i >= specs.length) return;
    const spec = specs[i];
    const dejaOccupe = parJour.get(j)!.length > 0;
    const { creneau, duree } = placerAvecRepli(
      p, d, j, spec.duree, 15, spec.type === "intervalles" ? "elevee" : "moderee",
    );
    if (!creneau) {
      alertes.push(`Cardio du ${j} non placé : aucun créneau disponible.`);
      return;
    }
    if (dejaOccupe) {
      alertes.push(
        `${cap(j)} : renforcement et cardio le même jour. Les espacer d'au moins 6 h si possible ; `
        + `sinon placer le cardio après le renforcement, jamais avant (l'ordre inverse dégrade la force).`,
      );
    }
    if (spec.volumeResiduel) alertes.push(conseilVolumeResiduel(spec.volumeResiduel));
    parJour.get(j)!.push(
      construireSeanceCardio(p, d, { ...spec, duree }, j, fmt(creneau.debut), fmt(creneau.fin), semaine),
    );
  });

  // 4. Journées détaillées
  const m = macros(p, d);
  const jours: JourPlanifie[] = JOURS.map((j) => {
    const seances = [...parJour.get(j)!].sort((a, b) => (a.debut < b.debut ? -1 : 1));
    const principale = seances[0] ?? null;
    let creneau: Creneau | null = null;
    if (principale) {
      const deb = toMin(principale.debut);
      creneau = { debut: deb, fin: deb + principale.dureeMin, jour: j };
    }

    const repas = repartirMacros(structureRepas(p, d, j, creneau), m);
    const minutesEffort = seances.reduce((a, s) => a + s.dureeMin, 0);
    const besoin = besoinHydrique(p, d, minutesEffort);
    const points = planHydratation(p, d, besoin.totalMl, creneau, repas);

    return {
      jour: j,
      travaille: p.joursTravailles.includes(j),
      seances,
      repas,
      minutesEffort,
      hydratation: {
        besoin,
        points,
        totalPlanifie: points.reduce((a, x) => a + x.ml, 0),
      },
    };
  });

  return {
    semaine: semaine.semaine,
    type: semaine.type,
    consigne: semaine.consigne,
    jours,
    volumeMuscles: volumeHebdomadaire(eq.seances),
    auditVolume: auditerVolume(eq.seances, p, joursForce.length),
    cardioCible: vol,
    alertes: Array.from(new Set(alertes)).sort(),
  };
}

/**
 * Jours de renforcement.
 *
 * La répartition est calculée sur le TOTAL hebdomadaire (force + cardio),
 * puis les n premiers jours reviennent au renforcement ; les jours restants
 * accueillent le cardio. Partir du seul nombre de séances de force
 * choisirait un mauvais motif d'alternance et collerait les séances.
 */
function joursEntrainementLimite(p: Profil, d: Derive, duree: number, n: number): Jour[] {
  return joursEntrainement(p, d, duree).slice(0, n);
}

export function avertissements(p: Profil, d: Derive): string[] {
  const a: string[] = [
    "Ce programme est un point de départ automatisé : il ne remplace pas l'évaluation d'un "
    + "professionnel de santé. En cas de pathologie, de grossesse, de douleur persistante ou de "
    + "traitement en cours, un avis médical est nécessaire avant de commencer.",
  ];

  if (!d.sommeilSuffisant) {
    a.push(
      `Sommeil estimé à ${(d.dureeSommeil / 60).toFixed(1)} h par nuit, sous les 7 h recommandées. `
      + `La récupération, la perte de gras et la prise de muscle en seront limitées : c'est le `
      + `premier levier à corriger, avant tout ajustement du programme.`,
    );
  }
  if (d.pressionTemporelle === "critique") {
    a.push("Agenda extrêmement contraint : le programme a été condensé au maximum. Un volume "
      + "aussi faible produit surtout du maintien. Envisager de libérer un créneau supplémentaire "
      + "ou de rendre les trajets actifs.");
  }
  if (p.seancesParSemaine >= 6 && ["sedentaire", "debutant"].includes(p.niveauSportif)) {
    a.push(
      `${p.seancesParSemaine} séances par semaine pour un niveau ${p.niveauSportif} : le risque `
      + `d'abandon et de blessure est élevé. Commencer à 3 ou 4 séances puis augmenter `
      + `progressivement donnerait de meilleurs résultats.`,
    );
  }
  if (p.age >= 60) {
    a.push("Après 60 ans : privilégier une progression lente, un échauffement long et le travail "
      + "d'équilibre. Le maintien de la masse musculaire et de la densité osseuse devient prioritaire.");
  }
  if (d.imc >= 35) {
    a.push("IMC élevé : privilégier les modalités sans impact et un suivi médical. "
      + "La perte de poids doit rester progressive.");
  }
  if (d.imc < 18.5) {
    a.push("IMC bas : un objectif de perte de poids serait inapproprié. Un avis médical est "
      + "recommandé avant toute restriction calorique.");
  }
  if (p.blessures.length) {
    a.push(
      `Blessures déclarées (${p.blessures.join(", ")}) : les exercices contre-indiqués sont exclus `
      + `automatiquement, mais cela ne remplace pas l'avis d'un kinésithérapeute.`,
    );
  }
  return a;
}

/** Point d'entrée : profil brut → programme complet. */
export function genererProgramme(profilBrut: Profil): Programme {
  const p = normaliser(profilBrut);
  const d = derive(p);

  const trame = semainesDuCycle(p.dureeCycle, p.niveauSportif);
  const cycle = trame.map((s) => genererSemaine(p, d, s));
  const semaineType = cycle[0];

  const m = macros(p, d);
  const budget = budgetTempsCuisine(p, d);
  const [nForce, nCardio] = repartirSeances(p);

  return {
    meta: {
      dureeCycle: p.dureeCycle,
      moteur: "Moteur de programmation v1.0",
      genereLe: new Date().toISOString(),
    },
    profil: p,
    derive: d,
    synthese: {
      seancesForce: nForce,
      seancesCardio: nCardio,
      dureeSeanceForce: dureeSeanceCible(p, d),
      split: splitPour(p, Math.max(1, nForce)).map(([nom]) => nom),
      contexteEquipement: d.contexteEquipement,
      pressionTemporelle: d.pressionTemporelle,
      momentEntrainement: momentPrefere(p, d),
      sommeilH: Math.round((d.dureeSommeil / 60) * 10) / 10,
    },
    nutrition: {
      ...m,
      kcalJourEntrainement: Math.trunc(m.kcal * 1.05),
      kcalJourRepos: Math.trunc(m.kcal * 0.93),
      pratique: strategiePratique(p, d, budget),
      aliments: profilAlimentaire(p),
      ajustement: reglesAjustement(p),
    },
    hydratation: {
      besoinRepos: besoinHydrique(p, d, 0),
      besoinEntrainement: besoinHydrique(p, d, dureeSeanceCible(p, d)),
      boissons: recommandationsBoissons(p, d, dureeSeanceCible(p, d)),
      reperes: REPERES_HYDRATATION,
    },
    endurance: {
      zonesFc: tableZones(d),
      volume: volumeCardioCible(p, d),
      modaliteContinu: modalitePrincipale(p, d, false).nom,
      modaliteIntervalles: modalitePrincipale(p, d, true).nom,
      trajetActif: trajetActif(p, d),
      noteImpact: raisonSansImpact(p, d),
    },
    semaineType,
    cycle,
    avertissements: avertissements(p, d),
  };
}

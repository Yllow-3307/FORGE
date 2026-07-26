/**
 * endurance.ts — Bloc endurance / cardio.
 *
 * Zones calculées par la méthode de Karvonen (% de fréquence cardiaque de
 * réserve), plus fiable qu'un simple pourcentage de FC max :
 *     FC cible = FC repos + intensité × (FC max − FC repos)
 *
 * Répartition polarisée : ~80 % du volume en zone 1-2, ~20 % en zone 4-5.
 */

import type {
  Derive, Exercice, Jour, Profil, Seance, SemaineCycle, VolumeCardio, ZoneFc,
} from "./types";
import { BIBLIOTHEQUE } from "./exercices";
import { blesse, rnd } from "./noyau";

interface Zone {
  numero: number;
  nom: string;
  lo: number;
  hi: number;
  rpe: string;
  parole: string;
  usage: string;
}

export const ZONES: Zone[] = [
  { numero: 1, nom: "Récupération", lo: 0.5, hi: 0.6, rpe: "RPE 2-3",
    parole: "conversation totalement fluide", usage: "récupération active, retour au calme" },
  { numero: 2, nom: "Endurance fondamentale", lo: 0.6, hi: 0.7, rpe: "RPE 4-5",
    parole: "phrases complètes sans essoufflement", usage: "base aérobie, oxydation des graisses" },
  { numero: 3, nom: "Tempo", lo: 0.7, hi: 0.8, rpe: "RPE 6-7",
    parole: "phrases courtes seulement", usage: "endurance active, seuil aérobie" },
  { numero: 4, nom: "Seuil", lo: 0.8, hi: 0.9, rpe: "RPE 8",
    parole: "quelques mots", usage: "seuil lactique, tenir une allure élevée" },
  { numero: 5, nom: "VO2max", lo: 0.9, hi: 1.0, rpe: "RPE 9-10",
    parole: "parole impossible", usage: "puissance aérobie maximale" },
];

function fcCible(d: Derive, zone: Zone): [number, number] {
  const reserve = d.fcmax - d.fcRepos;
  return [Math.floor(d.fcRepos + zone.lo * reserve), Math.floor(d.fcRepos + zone.hi * reserve)];
}

export function tableZones(d: Derive): ZoneFc[] {
  return ZONES.map((z) => {
    const [lo, hi] = fcCible(d, z);
    return { zone: z.numero, nom: z.nom, fc: `${lo}-${hi} bpm`, rpe: z.rpe, parole: z.parole, usage: z.usage };
  });
}

/** Modalités permettant réellement d'atteindre les zones 4-5. */
const MODALITES_INTENSITE = new Set([
  "Course à pied extérieur", "Tapis de course", "Vélo d'appartement",
  "Vélo route / trajet vélo", "Rameur", "Corde à sauter", "Natation",
  "Circuit cardio poids de corps (burpees, montées genoux)",
  "Marche en côte / escaliers", "Shadow boxing / cardio sans impact",
]);

const IMPACT_FORT = new Set([
  "Course à pied extérieur", "Corde à sauter",
  "Circuit cardio poids de corps (burpees, montées genoux)",
]);

function modalitesDisponibles(p: Profil, d: Derive): Exercice[] {
  let dispo = BIBLIOTHEQUE.filter(
    (e) => e.pattern === "cardio"
      && !e.contre_ind.some((z) => (p.blessures as string[]).includes(z))
      && e.equip.every((t) => (p.equipement as string[]).includes(t)),
  );

  // Le tissu conjonctif s'adapte plus lentement que le système cardio-respiratoire.
  const eviterImpact =
    d.imc >= 30
    || blesse(p, "genou", "cheville", "hanche", "dos")
    || p.niveauSportif === "sedentaire"
    || (p.niveauSportif === "debutant" && d.imc >= 28)
    || p.age >= 65;

  if (eviterImpact) {
    const sans = dispo.filter((e) => !IMPACT_FORT.has(e.nom));
    if (sans.length) dispo = sans;
  }
  return dispo;
}

export function raisonSansImpact(p: Profil, d: Derive): string | null {
  const motifs: string[] = [];
  if (d.imc >= 30) motifs.push(`IMC ${d.imc}`);
  if (blesse(p, "genou", "cheville", "hanche", "dos")) motifs.push("articulation sensible déclarée");
  if (p.niveauSportif === "sedentaire") motifs.push("absence de base aérobie");
  if (p.age >= 65) motifs.push(`âge ${p.age} ans`);
  if (!motifs.length) return null;
  return `Modalités à impact (course, corde à sauter, pliométrie) écartées — ${motifs.join(", ")}. `
    + `À réintroduire progressivement une fois la base aérobie et la tolérance articulaire construites.`;
}

export function modalitePrincipale(p: Profil, d: Derive, pourIntervalles = false): Exercice {
  let dispo = modalitesDisponibles(p, d);
  if (pourIntervalles) {
    const intenses = dispo.filter((e) => MODALITES_INTENSITE.has(e.nom));
    if (intenses.length) dispo = intenses;
  }
  if (!dispo.length) return BIBLIOTHEQUE.find((e) => e.nom === "Marche rapide")!;

  const prio: Record<string, number> = {
    Rameur: 6, "Vélo route / trajet vélo": 5, Natation: 5, "Vélo d'appartement": 4,
    "Course à pied extérieur": 4, "Tapis de course": 3, "Corde à sauter": 3,
    "Marche en côte / escaliers": 2, "Marche rapide": 1,
  };
  if (p.objectif === "endurance") prio["Course à pied extérieur"] = 7;
  if ((p.niveauSportif === "sedentaire" || p.niveauSportif === "debutant") && !pourIntervalles) {
    prio["Marche rapide"] = 6;
    prio["Marche en côte / escaliers"] = 5;
  }
  if (pourIntervalles) {
    prio["Vélo d'appartement"] = 7;
    prio.Rameur = 7;
    prio["Marche en côte / escaliers"] = 6;
  }
  return dispo.reduce((a, b) => ((prio[a.nom] ?? 0) >= (prio[b.nom] ?? 0) ? a : b));
}

/** Socle santé de 150 min/semaine, modulé puis borné par l'agenda réel. */
export function volumeCardioCible(p: Profil, d: Derive): VolumeCardio {
  const base = {
    perte_de_gras: 210, endurance: 300, sante_mobilite: 150, recomposition: 150,
    prise_de_muscle: 90, force: 75, competition_street: 90,
  }[p.objectif];
  const fNiveau = { sedentaire: 0.5, debutant: 0.7, intermediaire: 1, avance: 1.15, athlete: 1.3 }[p.niveauSportif];
  let cible = base * fNiveau;

  const plafond = { critique: 90, forte: 150, moderee: 240, confortable: 400 }[d.pressionTemporelle];
  cible = Math.min(cible, plafond);
  if (p.age >= 60) cible = Math.min(cible, 210);
  if (!d.sommeilSuffisant) cible *= 0.85;

  return {
    minutesSemaine: rnd(cible / 5) * 5,
    repartition: "80 % en zone 1-2, 20 % en zone 4-5 (modèle polarisé)",
    plafondAgenda: plafond,
  };
}

export interface SpecCardio {
  type: "continu" | "intervalles";
  duree: number;
  zone: number;
  volumeResiduel?: number;
}

export function repartirCardio(p: Profil, minutes: number, nSeances: number): SpecCardio[] {
  if (nSeances <= 0 || minutes <= 0) return [];

  let nInt = nSeances === 1 ? 0 : nSeances <= 3 ? 1 : 2;
  if (p.niveauSportif === "sedentaire") nInt = 0;              // construire la base d'abord
  if (p.objectif === "force" || p.objectif === "prise_de_muscle") nInt = Math.min(nInt, 1);

  const nCont = nSeances - nInt;
  const minInt = nInt ? Math.floor(minutes * 0.2) : 0;
  const minCont = minutes - minInt;

  let plafond = { sedentaire: 45, debutant: 60, intermediaire: 75, avance: 90, athlete: 120 }[p.niveauSportif];
  if (p.objectif === "endurance") plafond = Math.floor(plafond * 1.3);

  const out: SpecCardio[] = [];
  for (let i = 0; i < nCont; i++) {
    out.push({
      type: "continu",
      duree: Math.min(Math.max(20, Math.floor(minCont / Math.max(1, nCont))), plafond),
      zone: 2,
    });
  }
  for (let i = 0; i < nInt; i++) {
    out.push({
      type: "intervalles",
      duree: Math.min(Math.max(18, Math.floor(minInt / Math.max(1, nInt))), 40),
      zone: p.niveauSportif === "debutant" || p.niveauSportif === "intermediaire" ? 4 : 5,
    });
  }

  const place = out.reduce((a, s) => a + s.duree, 0);
  if (place < minutes * 0.9) {
    const residuel = Math.floor(minutes - place);
    out.forEach((s) => { s.volumeResiduel = residuel; });
  }
  return out;
}

export function conseilVolumeResiduel(residuel: number): string {
  return `${residuel} min/semaine de zone 2 ne tiennent pas dans les séances planifiées. `
    + `À accumuler en activité quotidienne : environ ${Math.floor(residuel / 7)} min/jour de marche `
    + `rapide, de trajets actifs ou d'escaliers.`;
}

export function construireSeanceCardio(
  p: Profil, d: Derive, spec: SpecCardio, jour: Jour,
  debut: string, fin: string, semaine: SemaineCycle,
): Seance {
  const modalite = modalitePrincipale(p, d, spec.type === "intervalles");
  let duree = spec.duree;
  if (semaine.type === "deload") duree = Math.floor(duree * 0.6);

  const zone = ZONES[spec.zone - 1];
  const [lo, hi] = fcCible(d, zone);

  const s: Seance = {
    nom: `Endurance — ${modalite.nom}`, jour, debut, fin, dureeMin: duree,
    type: "endurance", intensite: spec.type === "intervalles" ? "elevee" : "moderee",
    blocs: [], notes: [],
  };

  const ech = Math.max(5, Math.min(12, Math.floor(duree / 6)));
  s.blocs.push({
    nom: `Échauffement progressif — ${modalite.nom}`, pattern: "cardio", series: 1,
    reps: `${ech} min`, repos: 0, rpe: "RPE 3-4", tempo: "progressif", role: "echauffement",
    unite: "temps", note: "Monter l'allure par paliers jusqu'au bas de la zone cible.",
    regression: "", progression: "",
  });

  const corps = duree - ech - 5;
  if (spec.type === "continu") {
    s.blocs.push({
      nom: `${modalite.nom} — allure continue (zone ${zone.numero}, ${zone.nom})`,
      pattern: "cardio", series: 1, reps: `${corps} min`, repos: 0, rpe: zone.rpe,
      tempo: "régulier", role: "principal", unite: "temps",
      note: `FC cible ${lo}-${hi} bpm — ${zone.parole}. Sans cardiofréquencemètre, se fier au test de la parole.`,
      regression: "", progression: "",
    });
  } else {
    let travail: number, repos: number, reps: number;
    if (p.niveauSportif === "sedentaire" || p.niveauSportif === "debutant") {
      travail = 60; repos = 90; reps = Math.max(4, Math.floor(corps / 3));
    } else if (p.niveauSportif === "intermediaire") {
      travail = 90; repos = 90; reps = Math.max(5, Math.floor(corps / 3));
    } else {
      travail = 120; repos = 90; reps = Math.max(6, Math.floor(corps / 4));
    }
    reps = Math.max(4, Math.min(12, Math.floor(reps * semaine.coefVolume)));
    s.blocs.push({
      nom: `Intervalles ${travail}s effort / ${repos}s récupération active`,
      pattern: "cardio", series: reps, reps: `${travail} s`, repos, rpe: zone.rpe,
      tempo: "explosif", role: "principal", unite: "temps",
      note: `Effort en zone ${zone.numero} (${lo}-${hi} bpm) — ${zone.parole}. `
        + `Récupération en marche ou pédalage très lent.`,
      regression: "", progression: "",
    });
  }

  s.blocs.push({
    nom: "Retour au calme + respiration nasale", pattern: "cardio", series: 1,
    reps: "5 min", repos: 0, rpe: "RPE 2", tempo: "lent", role: "retour_calme",
    unite: "temps", note: "", regression: "", progression: "",
  });

  s.notes.push(`Modalité choisie d'après le matériel disponible : ${modalite.nom}.`);
  const motif = raisonSansImpact(p, d);
  if (motif) s.notes.push(motif);
  if (spec.type === "intervalles") {
    s.notes.push("Ne pas enchaîner deux séances d'intervalles sur deux jours consécutifs.");
  }
  return s;
}

export function trajetActif(p: Profil, d: Derive): string | null {
  if (p.trajetQuotidien < 20) return null;
  if (d.pressionTemporelle === "critique" || d.pressionTemporelle === "forte") {
    return `Agenda très contraint : convertir tout ou partie des ${p.trajetQuotidien} min de trajet `
      + `quotidien en déplacement actif apporterait jusqu'à ${p.trajetQuotidien * 5} min/semaine `
      + `en zone 2, sans mobiliser de créneau supplémentaire.`;
  }
  return `Option : rendre actif une partie des ${p.trajetQuotidien} min de trajet quotidien `
    + `pour accumuler du volume en zone 2 sans y consacrer de créneau dédié.`;
}

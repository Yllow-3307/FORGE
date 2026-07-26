/**
 * force.ts — Bloc callisthénie / musculation.
 *
 * objectif + niveau + fréquence → split
 * objectif                      → séries / reps / RPE / repos
 * équipement + blessures        → exercices concrets
 * semaine du cycle              → surcharge progressive et décharge
 */

import type {
  BlocExercice, Derive, Exercice, Jour, Muscle, PatternMoteur,
  Profil, Seance, SemaineCycle,
} from "./types";
import { BIBLIOTHEQUE } from "./exercices";
import { rnd, rndTo } from "./noyau";

// ---------------------------------------------------------------------------
// Sélection d'exercices
// ---------------------------------------------------------------------------

function realisable(e: Exercice, equipement: string[], blessures: string[]): boolean {
  if (e.contre_ind.some((z) => blessures.includes(z))) return false;
  return e.equip.every((t) => equipement.includes(t));
}

/**
 * Variantes réalisables d'un pattern, triées par difficulté croissante.
 * Les exercices improvisés (serviette, table) sont écartés dès qu'une
 * alternative avec du vrai matériel existe.
 */
export function candidats(
  pattern: PatternMoteur, equipement: string[], blessures: string[], niveauMax: number,
): Exercice[] {
  let out = BIBLIOTHEQUE.filter(
    (e) => e.pattern === pattern && e.niveau <= niveauMax && realisable(e, equipement, blessures),
  );
  const vrais = out.filter((e) => !e.improvise);
  if (vrais.length) out = vrais;
  return out.sort((a, b) => a.progression - b.progression || a.niveau - b.niveau);
}

export function choisir(
  pattern: PatternMoteur, equipement: string[], blessures: string[],
  niveauMax: number, decalage = 0,
): Exercice | null {
  const c = candidats(pattern, equipement, blessures, niveauMax);
  if (!c.length) return null;
  return c[Math.max(0, Math.min(c.length - 1, c.length - 1 + decalage))];
}

export function niveauMaxPour(niveau: Profil["niveauSportif"], age: number): number {
  let base = { sedentaire: 2, debutant: 3, intermediaire: 4, avance: 5, athlete: 6 }[niveau];
  if (age >= 60) base = Math.min(base, 4);
  else if (age >= 50) base = Math.min(base, 5);
  return base;
}

// ---------------------------------------------------------------------------
// Schémas de dosage
// ---------------------------------------------------------------------------

interface Schema {
  series: [number, number];
  reps: [number, number];
  rpe: [number, number];
  repos: number;
  tempo: string;
  principaux: number;
  note: string;
}

export const SCHEMAS: Record<Profil["objectif"], Schema> = {
  force: {
    series: [4, 6], reps: [3, 6], rpe: [7, 9], repos: 180, tempo: "2-1-X-0", principaux: 2,
    note: "Charges lourdes, repos longs : la qualité d'exécution prime sur la quantité.",
  },
  prise_de_muscle: {
    series: [3, 4], reps: [8, 12], rpe: [7, 9], repos: 90, tempo: "3-0-1-0", principaux: 2,
    note: "Volume et tension mécanique : terminer chaque série proche de l'échec (RIR 1-3).",
  },
  perte_de_gras: {
    series: [3, 4], reps: [10, 15], rpe: [7, 8], repos: 60, tempo: "2-0-1-0", principaux: 2,
    note: "Densité élevée, repos courts : on préserve le muscle pendant le déficit.",
  },
  recomposition: {
    series: [3, 4], reps: [8, 12], rpe: [7, 9], repos: 75, tempo: "3-0-1-0", principaux: 2,
    note: "Compromis entre hypertrophie et densité de travail.",
  },
  endurance: {
    series: [2, 3], reps: [15, 25], rpe: [6, 8], repos: 45, tempo: "2-0-1-0", principaux: 1,
    note: "Endurance de force : séries longues, récupérations courtes.",
  },
  sante_mobilite: {
    series: [2, 3], reps: [10, 15], rpe: [5, 7], repos: 60, tempo: "3-1-1-1", principaux: 2,
    note: "Amplitude complète et contrôle du mouvement, jamais jusqu'à l'échec.",
  },
  competition_street: {
    series: [4, 6], reps: [3, 8], rpe: [7, 9], repos: 150, tempo: "X-1-2-0", principaux: 2,
    note: "Travail de skill à froid, puis force, puis accessoires.",
  },
};

// ---------------------------------------------------------------------------
// Splits
// ---------------------------------------------------------------------------

const FULL: PatternMoteur[] = [
  "traction_verticale", "poussee_horizontale", "squat", "charniere", "gainage_anterieur",
];
const FULL_B: PatternMoteur[] = [
  "traction_horizontale", "poussee_verticale", "fente", "charniere", "gainage_lateral",
];

type Split = [string, PatternMoteur[]][];

const SPLITS: Record<number, Split> = {
  1: [["Full body", [...FULL, "poussee_verticale"]]],
  2: [["Full body A", FULL], ["Full body B", FULL_B]],
  3: [
    ["Full body A", FULL],
    ["Full body B", FULL_B],
    ["Full body C", ["traction_verticale", "poussee_verticale", "squat", "anti_rotation", "gainage_posterieur"]],
  ],
  4: [
    ["Haut du corps A", ["traction_verticale", "poussee_horizontale", "traction_horizontale", "poussee_verticale", "gainage_anterieur"]],
    ["Bas du corps A", ["squat", "charniere", "fente", "mollets", "gainage_lateral"]],
    ["Haut du corps B", ["poussee_verticale", "traction_horizontale", "poussee_horizontale", "traction_verticale", "anti_rotation"]],
    ["Bas du corps B", ["charniere", "squat", "fente", "gainage_posterieur", "mollets"]],
  ],
  5: [
    ["Poussée", ["poussee_horizontale", "poussee_verticale", "poussee_horizontale", "gainage_anterieur"]],
    ["Tirage", ["traction_verticale", "traction_horizontale", "traction_verticale", "anti_rotation"]],
    ["Jambes", ["squat", "charniere", "fente", "mollets", "gainage_lateral"]],
    ["Haut du corps", ["traction_verticale", "poussee_horizontale", "poussee_verticale", "traction_horizontale", "gainage_anterieur"]],
    ["Full body / skills", ["skill", "squat", "traction_verticale", "gainage_posterieur"]],
  ],
  6: [
    ["Poussée A", ["poussee_horizontale", "poussee_verticale", "gainage_anterieur"]],
    ["Tirage A", ["traction_verticale", "traction_horizontale", "anti_rotation"]],
    ["Jambes A", ["squat", "charniere", "mollets"]],
    ["Poussée B", ["poussee_verticale", "poussee_horizontale", "gainage_lateral"]],
    ["Tirage B", ["traction_horizontale", "traction_verticale", "gainage_posterieur"]],
    ["Jambes B", ["charniere", "fente", "mollets"]],
  ],
};
SPLITS[7] = [...SPLITS[6], ["Mobilité / récupération active", ["mobilite", "gainage_anterieur"]]];

export function splitPour(p: Profil, nForce: number): Split {
  const n = Math.max(1, Math.min(7, nForce));
  let base: Split = SPLITS[n].map(([nom, pats]) => [nom, [...pats]]);

  // Un débutant progresse mieux en full-body qu'en split fractionné.
  if ((p.niveauSportif === "sedentaire" || p.niveauSportif === "debutant") && n >= 4) {
    base = SPLITS[3].map(([nom, pats]) => [nom, [...pats]]);
    while (base.length < n) base.push(base[base.length % 3]);
    base = base.slice(0, n);
  }

  if (p.objectif === "competition_street") {
    base = base.map(([nom, pats]) => [nom, ["skill", ...pats.filter((q) => q !== "skill")]]);
  }
  return base;
}

// ---------------------------------------------------------------------------
// Trame du cycle
// ---------------------------------------------------------------------------

export function semainesDuCycle(duree: number, niveau: Profil["niveauSportif"]): SemaineCycle[] {
  const freq = niveau === "avance" || niveau === "athlete" ? 4 : niveau === "intermediaire" ? 5 : 6;
  const out: SemaineCycle[] = [];
  let pos = 0;
  for (let s = 1; s <= duree; s++) {
    pos += 1;
    const deload = pos >= freq || (s === duree && duree >= 8 && pos >= 3);
    if (deload) {
      out.push({
        semaine: s, type: "deload", coefVolume: 0.55, deltaIntensite: -1.5, deltaReps: 0,
        consigne: "Décharge : mêmes exercices, moitié des séries, on s'arrête loin de l'échec (RIR 4-5).",
      });
      pos = 0;
    } else {
      out.push({
        semaine: s, type: "accumulation", coefVolume: 1 + 0.08 * (pos - 1),
        deltaIntensite: 0.5 * (pos - 1), deltaReps: pos - 1,
        consigne: `Semaine ${pos} du bloc : ajouter 1 à 2 répétitions par série, ou passer à la variante `
          + `supérieure une fois le haut de la fourchette atteint sur toutes les séries.`,
      });
    }
  }
  return out;
}

export function dureeSeanceCible(p: Profil, d: Derive): number {
  let base = {
    force: 70, prise_de_muscle: 65, perte_de_gras: 50, recomposition: 60,
    endurance: 45, sante_mobilite: 40, competition_street: 75,
  }[p.objectif];
  if (p.niveauSportif === "sedentaire" || p.niveauSportif === "debutant") base = Math.min(base, 50);
  if (d.pressionTemporelle === "critique") base = Math.min(base, 30);
  else if (d.pressionTemporelle === "forte") base = Math.min(base, 45);
  return base;
}

// ---------------------------------------------------------------------------
// Durée réelle d'une séance
// ---------------------------------------------------------------------------

const SEC_PAR_SERIE = 40;
const SEC_TRANSITION = 60;

export function dureeEstimee(seance: Seance): number {
  let total = 0;
  for (const b of seance.blocs) {
    if (b.role === "echauffement" || b.role === "retour_calme" || b.role === "finisher") {
      const v = parseFloat(String(b.reps).split(" ")[0]);
      total += (Number.isFinite(v) ? v : 5) * 60;
    } else {
      total += b.series * (SEC_PAR_SERIE + b.repos) + SEC_TRANSITION;
    }
  }
  return total / 60;
}

/** Raccourcit une séance tant qu'elle dépasse son créneau. */
export function ajusterDuree(seance: Seance): Seance {
  let garde = 0;
  while (dureeEstimee(seance) > seance.dureeMin && garde < 40) {
    garde += 1;
    const fin = seance.blocs.find((b) => b.role === "finisher");
    if (fin) {
      seance.blocs.splice(seance.blocs.indexOf(fin), 1);
      continue;
    }
    const acc = seance.blocs.filter((b) => b.role === "accessoire");
    if (acc.length > 1) {
      seance.blocs.splice(seance.blocs.indexOf(acc[acc.length - 1]), 1);
      continue;
    }
    const red = seance.blocs.filter(
      (b) => (b.role === "principal" || b.role === "accessoire") && b.series > 2,
    );
    if (red.length) {
      red.reduce((a, b) => (a.series >= b.series ? a : b)).series -= 1;
      continue;
    }
    break;
  }
  return seance;
}

function fourchette(schema: Schema, deltaReps: number, exo: Exercice): string {
  const lo = schema.reps[0] + deltaReps;
  const hi = schema.reps[1] + deltaReps;
  if (exo.unite === "temps") return `${Math.max(10, lo * 3)}–${Math.max(15, hi * 3)} s`;
  if (exo.unilateral) return `${lo}–${hi} par côté`;
  return `${lo}–${hi}`;
}

// ---------------------------------------------------------------------------
// Construction d'une séance
// ---------------------------------------------------------------------------

export function construireSeanceForce(
  p: Profil, d: Derive, nom: string, patterns: PatternMoteur[], jour: Jour,
  debut: string, fin: string, duree: number, semaine: SemaineCycle,
): Seance {
  const schema = SCHEMAS[p.objectif];
  const nmax = niveauMaxPour(p.niveauSportif, p.age);
  const coef = semaine.coefVolume;
  const dInt = semaine.deltaIntensite;
  const dReps = semaine.type === "deload" ? 0 : semaine.deltaReps;
  const eq = p.equipement as string[];
  const bl = p.blessures as string[];

  const seance: Seance = {
    nom, jour, debut, fin, dureeMin: duree, type: "force",
    intensite: ["force", "prise_de_muscle", "competition_street"].includes(p.objectif)
      ? "elevee" : "moderee",
    blocs: [], notes: [],
  };

  const dureeEch = Math.max(6, Math.min(12, Math.floor(duree / 6)));
  const mob = choisir("mobilite", eq, bl, nmax);
  seance.blocs.push({
    nom: `Élévation cardiaque (marche rapide/corde/rowing léger) puis ${mob ? mob.nom : "mobilité articulaire"}`,
    pattern: "echauffement", series: 1, reps: `${dureeEch} min`, repos: 0,
    rpe: "RPE 3-4", tempo: "continu", role: "echauffement",
    note: "Mobiliser les articulations, puis faire une série légère (50 %) du premier exercice.",
    regression: "", progression: "", unite: "temps",
  });

  const budget = duree - dureeEch - 5;
  const seriesMoy = ((schema.series[0] + schema.series[1]) / 2) * coef;
  const coutExo = (seriesMoy * (SEC_PAR_SERIE + schema.repos) + SEC_TRANSITION) / 60;
  const nExos = Math.max(2, Math.min(patterns.length, Math.floor(budget / Math.max(4, coutExo))));

  const deja = new Set<string>();
  patterns.slice(0, nExos).forEach((pat, i) => {
    // Un split peut répéter un pattern : on descend d'un cran pour varier.
    let exo: Exercice | null = null;
    for (const dec of [0, -1, -2, 1, -3]) {
      const cand = choisir(pat, eq, bl, nmax, dec);
      if (cand && !deja.has(cand.nom)) {
        exo = cand;
        break;
      }
    }
    if (!exo) return;
    deja.add(exo.nom);

    const principal = i < schema.principaux;
    const nSeries = Math.max(1, rnd((principal ? schema.series[1] : schema.series[0]) * coef));

    const ech = candidats(pat, eq, bl, 6);
    const idx = ech.findIndex((e) => e.nom === exo!.nom);
    const regression = idx > 0 ? ech[idx - 1].nom : "réduire l'amplitude ou l'inclinaison";
    const progression = idx >= 0 && idx + 1 < ech.length
      ? ech[idx + 1].nom : "ajouter du lest ou ralentir le tempo";

    const dl = semaine.type === "deload" ? 1.5 : 0;
    const rpeLo = Math.max(4, schema.rpe[0] + dInt - dl);
    const rpeHi = Math.max(5, schema.rpe[1] + dInt - dl);

    seance.blocs.push({
      nom: exo.nom, pattern: pat, series: nSeries, reps: fourchette(schema, dReps, exo),
      repos: principal ? schema.repos : Math.max(45, schema.repos - 30),
      rpe: `RPE ${rpeLo}-${rpeHi} (RIR ${10 - rpeHi}-${10 - rpeLo})`,
      tempo: exo.tempo !== "2-0-1-0" ? exo.tempo : schema.tempo,
      role: principal ? "principal" : "accessoire",
      note: exo.note, regression, progression, unite: exo.unite,
    });
  });

  if ((p.objectif === "perte_de_gras" || p.objectif === "endurance") && budget > 40) {
    seance.blocs.push({
      nom: "Finisher métabolique (circuit 3 exercices, 20 s effort / 10 s repos × 6)",
      pattern: "cardio", series: 1, reps: "3 min", repos: 0, rpe: "RPE 8",
      tempo: "rapide", role: "finisher", unite: "temps",
      note: "Optionnel : à supprimer si la récupération est déjà limite.",
      regression: "", progression: "",
    });
  }

  seance.blocs.push({
    nom: "Retour au calme : respiration nasale + étirements des chaînes sollicitées",
    pattern: "mobilite", series: 1, reps: "5 min", repos: 0, rpe: "RPE 2",
    tempo: "lent", role: "retour_calme", note: "", regression: "", progression: "", unite: "temps",
  });

  ajusterDuree(seance);
  seance.notes.push(schema.note, semaine.consigne);
  seance.notes.push(`Durée estimée : ${Math.round(dureeEstimee(seance))} min (créneau réservé : ${duree} min).`);
  if (p.blessures.length) {
    seance.notes.push(
      `Zones sensibles déclarées (${p.blessures.join(", ")}) : les exercices contre-indiqués sont `
      + `exclus automatiquement. Toute douleur vive impose l'arrêt de l'exercice.`,
    );
  }
  return seance;
}

// ---------------------------------------------------------------------------
// Volume hebdomadaire
// ---------------------------------------------------------------------------

const CIBLES_VOLUME: Record<Muscle, [number, number]> = {
  dos: [10, 22], pectoraux: [8, 20], epaules: [8, 20], biceps: [6, 18],
  triceps: [6, 18], quadriceps: [8, 20], ischios: [6, 16], fessiers: [6, 20],
  mollets: [4, 14], abdos: [6, 18], lombaires: [4, 12],
};

/**
 * Séries hebdomadaires par groupe musculaire.
 * L'agoniste principal compte 1 série, les synergistes 0,5 — sinon un squat
 * gonflerait le total fessiers autant qu'un hip thrust.
 */
export function volumeHebdomadaire(seances: Seance[]): Partial<Record<Muscle, number>> {
  const index = new Map(BIBLIOTHEQUE.map((e) => [e.nom, e]));
  const total: Partial<Record<Muscle, number>> = {};
  for (const s of seances) {
    for (const b of s.blocs) {
      if (b.role !== "principal" && b.role !== "accessoire") continue;
      const e = index.get(b.nom);
      if (!e) continue;
      e.muscles.forEach((m, i) => {
        total[m] = (total[m] ?? 0) + (i === 0 ? b.series : b.series * 0.5);
      });
    }
  }
  for (const k of Object.keys(total) as Muscle[]) total[k] = rndTo(total[k]!, 1);
  return total;
}

/** Adapte les fourchettes de volume à la fréquence, au niveau et à l'objectif. */
export function ciblesAjustees(p: Profil, nSeances: number): Record<Muscle, [number, number]> {
  const fFreq = Math.min(1.25, 0.28 + 0.18 * Math.max(1, nSeances));
  const fNiveau = { sedentaire: 0.5, debutant: 0.7, intermediaire: 1, avance: 1.15, athlete: 1.25 }[p.niveauSportif];
  const fObj = {
    force: 0.85, prise_de_muscle: 1.1, perte_de_gras: 0.9, recomposition: 1,
    endurance: 0.8, sante_mobilite: 0.6, competition_street: 1.05,
  }[p.objectif];
  const k = fFreq * fNiveau * fObj;

  const out = {} as Record<Muscle, [number, number]>;
  for (const m of Object.keys(CIBLES_VOLUME) as Muscle[]) {
    const lo = Math.max(2, rndTo(CIBLES_VOLUME[m][0] * k, 1));
    const hi = Math.max(lo + 4, rndTo(CIBLES_VOLUME[m][1] * Math.min(1.15, fFreq * fNiveau), 1));
    out[m] = [lo, hi];
  }
  return out;
}

export function auditerVolume(seances: Seance[], p: Profil, nSeances: number): string[] {
  const vol = volumeHebdomadaire(seances);
  const cibles = ciblesAjustees(p, nSeances);
  const alertes: string[] = [];
  for (const m of Object.keys(cibles) as Muscle[]) {
    const v = vol[m] ?? 0;
    const [lo, hi] = cibles[m];
    if (v === 0) alertes.push(`${m} : aucun volume direct cette semaine.`);
    else if (v < lo) alertes.push(`${m} : ${v} séries/sem, sous la zone efficace (${lo}-${hi}).`);
    else if (v > hi) alertes.push(`${m} : ${v} séries/sem, au-dessus de la zone de récupération (${lo}-${hi}).`);
  }
  return alertes;
}

function budgetAtteint(seance: Seance, marge = 4): boolean {
  return dureeEstimee(seance) + marge > seance.dureeMin;
}

/**
 * Rééquilibre le volume : élague les excès, comble les déficits dans la
 * limite du temps disponible, puis explique ce qui n'a pas pu l'être.
 */
export function equilibrer(
  p: Profil, seances: Seance[], semaine: SemaineCycle,
): { seances: Seance[]; remarques: string[] } {
  const index = new Map(BIBLIOTHEQUE.map((e) => [e.nom, e]));
  const nmax = niveauMaxPour(p.niveauSportif, p.age);
  const schema = SCHEMAS[p.objectif];
  const nForce = seances.filter((s) => s.type === "force").length;
  const cibles = ciblesAjustees(p, nForce);
  const remarques: string[] = [];

  // --- 1. Élagage des excès ---
  for (let it = 0; it < 20; it++) {
    const vol = volumeHebdomadaire(seances);
    const exces = (Object.keys(cibles) as Muscle[])
      .filter((m) => (vol[m] ?? 0) > cibles[m][1])
      .map((m) => [m, (vol[m] ?? 0) - cibles[m][1]] as [Muscle, number]);
    if (!exces.length) break;
    const muscle = exces.reduce((a, b) => (a[1] >= b[1] ? a : b))[0];

    let cibleBloc: BlocExercice | null = null;
    let cibleSeance: Seance | null = null;
    for (const s of seances) {
      for (const b of s.blocs) {
        if (b.role !== "accessoire") continue;
        const e = index.get(b.nom);
        if (e && e.muscles[0] === muscle && (!cibleBloc || b.series > cibleBloc.series)) {
          cibleBloc = b;
          cibleSeance = s;
        }
      }
    }
    if (cibleBloc && cibleSeance) {
      cibleSeance.blocs.splice(cibleSeance.blocs.indexOf(cibleBloc), 1);
      continue;
    }

    let reduit = false;
    for (const s of seances) {
      for (const b of s.blocs) {
        const e = index.get(b.nom);
        if (e && e.muscles.includes(muscle) && b.series > 2
          && (b.role === "principal" || b.role === "accessoire")) {
          b.series -= 1;
          reduit = true;
          break;
        }
      }
      if (reduit) break;
    }
    if (!reduit) break;
  }

  // --- 2. Comblement des déficits ---
  const impossibles = new Set<Muscle>();
  for (let it = 0; it < 12; it++) {
    const vol = volumeHebdomadaire(seances);
    const deficits = (Object.keys(cibles) as Muscle[])
      .filter((m) => (vol[m] ?? 0) < cibles[m][0] && !impossibles.has(m))
      .map((m) => [m, (vol[m] ?? 0) - cibles[m][0]] as [Muscle, number]);
    if (!deficits.length) break;
    const muscle = deficits.reduce((a, b) => (a[1] <= b[1] ? a : b))[0];

    const pool = BIBLIOTHEQUE
      .filter((e) => e.muscles[0] === muscle && e.niveau <= nmax
        && e.pattern !== "cardio" && e.pattern !== "mobilite"
        && realisable(e, p.equipement as string[], p.blessures as string[]) && !e.improvise)
      .sort((a, b) => b.progression - a.progression);
    if (!pool.length) {
      impossibles.add(muscle);
      continue;
    }

    const triees = seances
      .filter((s) => s.type === "force")
      .sort((a, b) =>
        a.blocs.filter((x) => x.role === "principal" || x.role === "accessoire").length
        - b.blocs.filter((x) => x.role === "principal" || x.role === "accessoire").length);

    let place = false;
    for (const sc of triees) {
      if (budgetAtteint(sc)) continue;
      const noms = new Set(sc.blocs.map((b) => b.nom));
      const exo = pool.find((e) => !noms.has(e.nom));
      if (!exo) continue;
      let pos = -1;
      sc.blocs.forEach((b, k) => {
        if (b.role === "principal" || b.role === "accessoire" || b.role === "echauffement") pos = k;
      });
      if (pos < 0) continue;
      sc.blocs.splice(pos + 1, 0, {
        nom: exo.nom, pattern: exo.pattern,
        series: Math.max(2, rnd(schema.series[0] * semaine.coefVolume)),
        reps: fourchette(schema, 0, exo), repos: Math.max(45, schema.repos - 30),
        rpe: `RPE ${schema.rpe[0]}-${schema.rpe[1]}`,
        tempo: exo.tempo !== "2-0-1-0" ? exo.tempo : schema.tempo,
        role: "accessoire", unite: exo.unite,
        note: `Ajouté par rééquilibrage automatique du volume (${muscle}).`,
        regression: "", progression: "ajouter du lest ou ralentir le tempo",
      });
      place = true;
      break;
    }

    if (!place) {
      // Pas de place pour un exercice de plus : on densifie l'existant.
      let densifie = false;
      for (const s of [...seances].sort((a, b) => dureeEstimee(a) - dureeEstimee(b))) {
        if (s.type !== "force" || budgetAtteint(s, 1)) continue;
        for (const b of s.blocs) {
          const e = index.get(b.nom);
          if (e && e.muscles.includes(muscle) && b.series < schema.series[1] + 1
            && (b.role === "principal" || b.role === "accessoire")) {
            b.series += 1;
            densifie = true;
            break;
          }
        }
        if (densifie) break;
      }
      if (densifie) continue;
      impossibles.add(muscle);
      remarques.push(
        `Volume ${muscle} sous la cible : limité par le temps disponible `
        + `(${p.seancesParSemaine} séance(s)/semaine). Ce groupe reste sollicité en synergiste, `
        + `la priorité allant aux mouvements polyarticulaires.`,
      );
    }
  }

  seances.forEach(ajusterDuree);
  if (p.seancesParSemaine <= 2) {
    remarques.push(
      `Avec ${p.seancesParSemaine} séance(s) par semaine, le programme se concentre volontairement `
      + `sur les mouvements polyarticulaires : c'est le meilleur rapport stimulus/temps. `
      + `Les petits groupes (bras, mollets) sont travaillés indirectement.`,
    );
  }
  return { seances, remarques: Array.from(new Set(remarques)).sort() };
}

/**
 * seance.ts — Consignes de séance et étirements de fin.
 *
 * Le « topo » affiché avant la séance sert à orienter l'attention : trois
 * règles suffisent, au-delà personne ne les retient. Elles sont choisies
 * selon le type de séance et l'objectif plutôt que tirées au hasard.
 */

import type { Objectif, Seance } from "@/lib/moteur/types";

export interface Etirement {
  nom: string;
  duree: number;         // secondes par côté ou au total
  zone: string;
  consigne: string;
  bilateral: boolean;    // à faire des deux côtés
}

/* ------------------------------------------------------------- Consignes */

const CONSIGNES_FORCE: Record<Objectif, string[]> = {
  force: [
    "Barre lourde, technique intacte : la première répétition doit ressembler à la dernière.",
    "Repos complets entre les séries : 3 min, montre en main. Écourter, c'est saboter la série suivante.",
    "Verrouillez le gainage avant chaque répétition, pas pendant.",
  ],
  prise_de_muscle: [
    "Cherchez la tension, pas le mouvement : c'est le muscle qui travaille, pas l'élan.",
    "Terminez chaque série à 1-3 répétitions de l'échec, jamais avant.",
    "Amplitude complète : l'étirement en bas vaut autant que la contraction en haut.",
  ],
  perte_de_gras: [
    "Respectez les temps de repos courts : c'est la densité qui fait la dépense.",
    "Qualité d'exécution malgré la fatigue : dès que la forme se dégrade, arrêtez la série.",
    "Restez actif entre les séries : marche lente plutôt qu'assis sur le banc.",
  ],
  recomposition: [
    "Charge suffisante pour stimuler, contrôle suffisant pour progresser.",
    "Notez vos performances : la recomposition se juge sur les charges, pas sur la balance.",
    "Repos moyens : 75 s, assez pour récupérer sans refroidir.",
  ],
  endurance: [
    "Séries longues : trouvez un rythme que vous pouvez tenir jusqu'à la dernière répétition.",
    "Respiration continue, jamais en apnée.",
    "Enchaînez avec des repos courts : c'est la capacité de travail qu'on développe.",
  ],
  sante_mobilite: [
    "Amplitude maximale sans douleur : c'est l'objectif principal de la séance.",
    "Jamais jusqu'à l'échec : terminez chaque série en vous sentant capable d'en faire 3 de plus.",
    "Tempo lent et contrôlé, surtout en descente.",
  ],
  competition_street: [
    "Le travail de skill se fait à froid, en début de séance, nerveusement frais.",
    "Qualité maximale sur les figures : une répétition propre vaut mieux que cinq approximatives.",
    "Échauffez longuement poignets, coudes et épaules avant les positions statiques.",
  ],
};

const CONSIGNES_CARDIO: Record<string, string[]> = {
  continu: [
    "Restez dans la zone : si vous ne pouvez plus parler par phrases, vous allez trop vite.",
    "Cadence régulière plutôt qu'accélérations : l'objectif est la durée, pas la vitesse.",
    "Respiration nasale autant que possible : c'est un excellent régulateur d'intensité.",
  ],
  intervalles: [
    "Effort réellement intense sur les fractions : c'est court, donc ça doit piquer.",
    "Récupération active et complète : ne raccourcissez pas les temps de repos.",
    "Arrêtez si la qualité des fractions chute nettement : mieux vaut 6 bonnes que 10 molles.",
  ],
};

/** Les trois consignes à afficher avant la séance. */
export function consignesSeance(seance: Seance, objectif: Objectif): string[] {
  if (seance.type === "endurance") {
    const estIntervalle = seance.blocs.some((b) => b.nom.toLowerCase().includes("intervalle"));
    return CONSIGNES_CARDIO[estIntervalle ? "intervalles" : "continu"];
  }
  return CONSIGNES_FORCE[objectif] ?? CONSIGNES_FORCE.recomposition;
}

/* ------------------------------------------------------------ Étirements */

const CATALOGUE: Record<string, Etirement[]> = {
  dos: [
    { nom: "Suspension passive à la barre", duree: 30, zone: "dos", bilateral: false,
      consigne: "Relâchez le haut du corps, laissez la colonne s'allonger." },
    { nom: "Étirement grand dorsal au mur", duree: 30, zone: "dos", bilateral: true,
      consigne: "Main au mur, hanche opposée qui s'éloigne." },
  ],
  pectoraux: [
    { nom: "Ouverture de poitrine à l'encadrement", duree: 30, zone: "pectoraux", bilateral: true,
      consigne: "Avant-bras contre le montant, rotation douce du buste." },
  ],
  epaules: [
    { nom: "Étirement postérieur d'épaule", duree: 30, zone: "épaules", bilateral: true,
      consigne: "Bras croisé devant la poitrine, coude tiré vers soi." },
    { nom: "Dislocations à l'élastique", duree: 40, zone: "épaules", bilateral: false,
      consigne: "Mouvement lent, prise large, sans forcer." },
  ],
  triceps: [
    { nom: "Étirement triceps nuque", duree: 25, zone: "triceps", bilateral: true,
      consigne: "Coude vers le plafond, main entre les omoplates." },
  ],
  biceps: [
    { nom: "Étirement biceps au mur", duree: 25, zone: "biceps", bilateral: true,
      consigne: "Bras tendu en arrière, paume au mur, rotation du buste." },
  ],
  quadriceps: [
    { nom: "Étirement quadriceps debout", duree: 30, zone: "quadriceps", bilateral: true,
      consigne: "Genoux serrés, bassin en rétroversion, talon vers la fesse." },
    { nom: "Fente basse (fléchisseurs de hanche)", duree: 40, zone: "quadriceps", bilateral: true,
      consigne: "Bassin qui avance, fessier de la jambe arrière contracté." },
  ],
  ischios: [
    { nom: "Étirement ischio-jambiers assis", duree: 40, zone: "ischio-jambiers", bilateral: true,
      consigne: "Dos droit : c'est la hanche qui bascule, pas le dos qui s'arrondit." },
  ],
  fessiers: [
    { nom: "Étirement pigeon", duree: 40, zone: "fessiers", bilateral: true,
      consigne: "Tibia devant soi, buste qui descend progressivement." },
    { nom: "Figure 4 allongé", duree: 35, zone: "fessiers", bilateral: true,
      consigne: "Cheville sur le genou opposé, on tire la cuisse vers soi." },
  ],
  mollets: [
    { nom: "Étirement mollet au mur", duree: 30, zone: "mollets", bilateral: true,
      consigne: "Talon au sol, jambe tendue, bassin qui avance." },
  ],
  lombaires: [
    { nom: "Posture de l'enfant", duree: 45, zone: "lombaires", bilateral: false,
      consigne: "Genoux écartés, bras tendus loin devant, respiration ample." },
    { nom: "Torsion allongée", duree: 35, zone: "lombaires", bilateral: true,
      consigne: "Épaules au sol, genoux qui basculent d'un côté." },
  ],
  abdos: [
    { nom: "Cobra doux", duree: 30, zone: "abdominaux", bilateral: false,
      consigne: "Bassin au sol, extension progressive sans écraser les lombaires." },
  ],
  general: [
    { nom: "Respiration diaphragmatique", duree: 60, zone: "système nerveux", bilateral: false,
      consigne: "Allongé, 4 s d'inspiration, 6 s d'expiration : fait basculer en récupération." },
  ],
};

/**
 * Étirements adaptés à la séance qui vient d'être réalisée.
 * On cible les groupes réellement sollicités plutôt qu'une routine générique.
 */
export function etirementsPour(seance: Seance, muscles: string[]): Etirement[] {
  if (seance.type === "endurance") {
    return [
      ...CATALOGUE.mollets,
      ...CATALOGUE.quadriceps.slice(0, 1),
      ...CATALOGUE.ischios,
      ...CATALOGUE.fessiers.slice(0, 1),
      ...CATALOGUE.general,
    ];
  }

  const choisis: Etirement[] = [];
  const vus = new Set<string>();
  // Les groupes les plus sollicités en premier
  for (const m of muscles) {
    for (const e of CATALOGUE[m] ?? []) {
      if (!vus.has(e.nom)) {
        vus.add(e.nom);
        choisis.push(e);
      }
    }
    if (choisis.length >= 4) break;
  }
  choisis.push(...CATALOGUE.general);
  return choisis.slice(0, 5);
}

/** Muscles sollicités par une séance, du plus au moins travaillé. */
export function musclesSollicites(seance: Seance, index: Map<string, string[]>): string[] {
  const compte = new Map<string, number>();
  for (const b of seance.blocs) {
    if (b.role !== "principal" && b.role !== "accessoire") continue;
    const muscles = index.get(b.nom) ?? [];
    muscles.forEach((m, i) => {
      compte.set(m, (compte.get(m) ?? 0) + (i === 0 ? b.series : b.series * 0.5));
    });
  }
  return [...compte.entries()].sort((a, b) => b[1] - a[1]).map(([m]) => m);
}

/* ------------------------------------------------- Échauffement générique */

export interface EtapeEchauffement {
  nom: string;
  duree: number;
  consigne: string;
}

export function echauffementPour(seance: Seance): EtapeEchauffement[] {
  if (seance.type === "endurance") {
    return [
      { nom: "Mise en route très progressive", duree: 180,
        consigne: "Allure de promenade, on laisse la fréquence cardiaque monter seule." },
      { nom: "Montées de genoux et talons-fesses", duree: 60,
        consigne: "Sur place, amplitude modérée, sans forcer." },
      { nom: "Accélérations courtes", duree: 120,
        consigne: "3 × 20 s au rythme de la séance, avec retour au calme entre chaque." },
    ];
  }
  return [
    { nom: "Élévation cardiaque", duree: 180,
      consigne: "Corde à sauter, marche rapide ou rameur léger : on cherche à avoir chaud." },
    { nom: "Mobilité articulaire", duree: 120,
      consigne: "Cercles d'épaules, rotations de hanches, flexions de chevilles." },
    { nom: "Activation spécifique", duree: 120,
      consigne: "Une série légère du premier exercice, à 50 % de l'effort." },
  ];
}

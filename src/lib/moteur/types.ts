/**
 * types.ts — Contrat de données du moteur de programmation.
 *
 * Ces types sont la source de vérité partagée entre le formulaire,
 * le moteur de calcul, l'affichage et la persistance Supabase.
 */

export const JOURS = [
  "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche",
] as const;
export type Jour = (typeof JOURS)[number];

export const SEXES = ["homme", "femme", "autre"] as const;
export type Sexe = (typeof SEXES)[number];

export const OBJECTIFS = [
  "perte_de_gras",
  "prise_de_muscle",
  "force",
  "endurance",
  "recomposition",
  "sante_mobilite",
  "competition_street",
] as const;
export type Objectif = (typeof OBJECTIFS)[number];

export const NIVEAUX_SPORTIFS = [
  "sedentaire", "debutant", "intermediaire", "avance", "athlete",
] as const;
export type NiveauSportif = (typeof NIVEAUX_SPORTIFS)[number];

export const EQUIPEMENTS = [
  "aucun", "barre_traction", "barres_paralleles", "anneaux", "elastiques",
  "halteres", "kettlebell", "barre_olympique", "banc", "rack", "machines_salle",
  "poulie", "tapis_course", "velo_appartement", "rameur", "corde_a_sauter",
  "gilet_leste", "trx", "step_escalier", "piscine", "velo_route",
] as const;
export type Equipement = (typeof EQUIPEMENTS)[number];

export const NIVEAUX_CUISINE = ["nul", "debutant", "moyen", "bon", "chef"] as const;
export type NiveauCuisine = (typeof NIVEAUX_CUISINE)[number];

export const CONTRAINTES_ALIMENTAIRES = [
  "vegetarien", "vegan", "sans_gluten", "sans_lactose", "halal", "casher",
  "sans_porc", "sans_fruits_a_coque", "sans_oeuf", "sans_poisson",
  "diabete_t2", "hypertension", "cholesterol", "syndrome_intestin_irritable",
  "petit_budget", "faible_appetit_matin",
] as const;
export type ContrainteAlimentaire = (typeof CONTRAINTES_ALIMENTAIRES)[number];

export const LIEUX_REPAS = [
  "domicile", "bureau_micro_ondes", "bureau_sans_cuisine",
  "restaurant_cantine", "exterieur_nomade", "mixte",
] as const;
export type LieuRepas = (typeof LIEUX_REPAS)[number];

export const BLESSURES = [
  "epaule", "genou", "lombaires", "poignet", "cheville", "hanche", "dos",
] as const;
export type Blessure = (typeof BLESSURES)[number];

/** Plage horaire pendant laquelle le client n'est pas disponible. */
export interface Indisponibilite {
  debut: string;   // "HH:MM"
  fin: string;     // "HH:MM"
  jours: Jour[];
  motif: string;
}

/** Les 18 paramètres d'entrée, tels que saisis dans le questionnaire. */
export interface Profil {
  nom: string;
  age: number;
  poids: number;             // kg
  taille: number;            // cm
  sexe: Sexe;
  objectif: Objectif;
  niveauSportif: NiveauSportif;
  equipement: Equipement[];
  heureReveil: string;       // "HH:MM"
  heureCoucher: string;
  heureDebutTravail: string;
  heureFinTravail: string;
  trajetQuotidien: number;   // minutes aller-retour
  indisponibilites: Indisponibilite[];
  seancesParSemaine: number;
  niveauCuisine: NiveauCuisine;
  tempsCuisine: number;      // minutes/jour
  contraintesAlimentaires: ContrainteAlimentaire[];
  lieuRepas: LieuRepas;
  // Compléments facultatifs
  joursTravailles: Jour[];
  blessures: Blessure[];
  dureeCycle: number;        // semaines
  pourcentageGras?: number | null;
  fcRepos?: number | null;   // mesurée au réveil, affine les zones
}

/** Variables calculées à partir du profil, réutilisées partout. */
export interface Derive {
  imc: number;
  classeImc: "maigreur" | "normal" | "surpoids" | "obesite_1" | "obesite_2+";
  dureeEveil: number;
  dureeSommeil: number;
  sommeilSuffisant: boolean;
  trajetAller: number;
  departDomicile: number;
  retourDomicile: number;
  fenetreMatin: number;
  fenetreSoir: number;
  tempsLibreSemaine: number;
  pressionTemporelle: "critique" | "forte" | "moderee" | "confortable";
  fcmax: number;
  fcRepos: number;
  contexteEquipement: "salle" | "home_gym" | "minimal" | "poids_de_corps";
  joursRepos: Jour[];
}

export type PatternMoteur =
  | "traction_verticale" | "traction_horizontale" | "poussee_horizontale"
  | "poussee_verticale" | "squat" | "charniere" | "fente"
  | "gainage_anterieur" | "gainage_lateral" | "gainage_posterieur"
  | "anti_rotation" | "mollets" | "isolation_bras" | "skill" | "mobilite"
  | "cardio" | "echauffement";

export type Muscle =
  | "dos" | "pectoraux" | "epaules" | "biceps" | "triceps" | "quadriceps"
  | "ischios" | "fessiers" | "mollets" | "abdos" | "lombaires";

export interface Exercice {
  nom: string;
  pattern: PatternMoteur;
  niveau: number;         // 1 à 6
  progression: number;    // rang dans l'échelle du pattern
  muscles: Muscle[];      // le premier est l'agoniste principal
  equip: Equipement[];
  contre_ind: string[];
  unite: "reps" | "temps" | "distance";
  tempo: string;
  note: string;
  unilateral: boolean;
  improvise: boolean;     // solution de dépannage (serviette, chaise...)
}

export type RoleBloc =
  | "echauffement" | "principal" | "accessoire"
  | "finisher" | "retour_calme";

export interface BlocExercice {
  nom: string;
  pattern: PatternMoteur;
  series: number;
  reps: string;
  repos: number;          // secondes
  rpe: string;
  tempo: string;
  role: RoleBloc;
  note: string;
  regression: string;
  progression: string;
  unite: "reps" | "temps" | "distance";
}

export interface Seance {
  nom: string;
  jour: Jour;
  debut: string;
  fin: string;
  dureeMin: number;
  type: "force" | "endurance";
  intensite: "moderee" | "elevee";
  blocs: BlocExercice[];
  notes: string[];
}

export type RoleRepas =
  | "demarrage" | "principal" | "appoint" | "pre_effort" | "post_effort";

export interface Repas {
  nom: string;
  heure: number;          // minutes depuis minuit
  heureTxt: string;
  duree: number;
  lieu: string;
  role: RoleRepas;
  note?: string;
  kcal: number;
  proteinesG: number;
  glucidesG: number;
  lipidesG: number;
}

export interface PointHydratation {
  heure: number;
  heureTxt: string;
  ml: number;
  moment: string;
  conseil: string;
}

export interface BesoinHydrique {
  socle: number;
  effort: number;
  correctifs: Record<string, number>;
  totalMl: number;
  plafondApplique: boolean;
  note: string;
}

export interface JourPlanifie {
  jour: Jour;
  travaille: boolean;
  seances: Seance[];
  repas: Repas[];
  minutesEffort: number;
  hydratation: {
    besoin: BesoinHydrique;
    points: PointHydratation[];
    totalPlanifie: number;
  };
}

export interface SemaineCycle {
  semaine: number;
  type: "accumulation" | "deload";
  coefVolume: number;
  deltaIntensite: number;
  deltaReps: number;
  consigne: string;
}

export interface SemainePlanifiee {
  semaine: number;
  type: "accumulation" | "deload";
  consigne: string;
  jours: JourPlanifie[];
  volumeMuscles: Partial<Record<Muscle, number>>;
  auditVolume: string[];
  cardioCible: VolumeCardio;
  alertes: string[];
}

export interface VolumeCardio {
  minutesSemaine: number;
  repartition: string;
  plafondAgenda: number;
}

export interface ZoneFc {
  zone: number;
  nom: string;
  fc: string;
  rpe: string;
  parole: string;
  usage: string;
}

export interface Macros {
  mb: number;
  facteurActivite: number;
  depenseTotale: number;
  ajustementPct: number;
  kcal: number;
  plancherApplique: boolean;
  proteinesG: number;
  proteinesGKg: number;
  lipidesG: number;
  glucidesG: number;
  fibresG: number;
  repartitionPct: { proteines: number; glucides: number; lipides: number };
}

export interface Programme {
  meta: { dureeCycle: number; moteur: string; genereLe: string };
  profil: Profil;
  derive: Derive;
  synthese: {
    seancesForce: number;
    seancesCardio: number;
    dureeSeanceForce: number;
    split: string[];
    contexteEquipement: Derive["contexteEquipement"];
    pressionTemporelle: Derive["pressionTemporelle"];
    momentEntrainement: "matin" | "midi" | "soir";
    sommeilH: number;
  };
  nutrition: Macros & {
    kcalJourEntrainement: number;
    kcalJourRepos: number;
    pratique: {
      styleCulinaire: string;
      conseils: string[];
      niveauComplexite: number;
      batchCooking: boolean;
      jourBatch: string;
      sessionBatch: number;
      cuisineParRepas: number;
      strategie: string;
    };
    aliments: {
      proteines: string[];
      glucides: string[];
      lipides: string[];
      legumes: string[];
      alertes: string[];
    };
    ajustement: string[];
  };
  hydratation: {
    besoinRepos: BesoinHydrique;
    besoinEntrainement: BesoinHydrique;
    boissons: {
      aPrivilegier: string[];
      aLimiter: string[];
      electrolytes: boolean;
    };
    reperes: string[];
  };
  endurance: {
    zonesFc: ZoneFc[];
    volume: VolumeCardio;
    modaliteContinu: string;
    modaliteIntervalles: string;
    trajetActif: string | null;
    noteImpact: string | null;
  };
  semaineType: SemainePlanifiee;
  cycle: SemainePlanifiee[];
  avertissements: string[];
}

/** Profil de départ du questionnaire : valeurs neutres et réalistes. */
export const PROFIL_DEFAUT: Profil = {
  nom: "",
  age: 30,
  poids: 75,
  taille: 175,
  sexe: "homme",
  objectif: "perte_de_gras",
  niveauSportif: "debutant",
  equipement: ["aucun"],
  heureReveil: "07:00",
  heureCoucher: "23:00",
  heureDebutTravail: "09:00",
  heureFinTravail: "18:00",
  trajetQuotidien: 40,
  indisponibilites: [],
  seancesParSemaine: 3,
  niveauCuisine: "debutant",
  tempsCuisine: 30,
  contraintesAlimentaires: [],
  lieuRepas: "domicile",
  joursTravailles: ["lundi", "mardi", "mercredi", "jeudi", "vendredi"],
  blessures: [],
  dureeCycle: 8,
  pourcentageGras: null,
  fcRepos: null,
};

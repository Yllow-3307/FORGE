/**
 * suivi.ts — État quotidien de l'utilisateur : séances réalisées, repas,
 * hydratation, progression des skills, configuration des widgets.
 *
 * Toutes les données sont stockées localement (localStorage) et synchronisées
 * vers Supabase quand les clés sont configurées — même stratégie de repli que
 * `stockage.ts`, afin que l'application reste utilisable sans compte.
 */

import { apports, alimentParId } from "./donnees/aliments";

/* ------------------------------------------------------------------ Types */

export interface EntreeRepas {
  id: string;
  alimentId: string;
  nomLibre?: string;      // saisie manuelle hors base
  grammes: number;
  repas: "petit_dejeuner" | "dejeuner" | "diner" | "collation";
  kcal: number;
  proteines: number;
  glucides: number;
  lipides: number;
}

export interface JournalJour {
  date: string;                 // AAAA-MM-JJ
  repas: EntreeRepas[];
  hydratationMl: number;
  seanceFaite: boolean;
  seanceNom?: string;
  accomplissement?: number;     // pourcentage d'exercices validés
  ressenti?: string;
  energie?: 1 | 2 | 3 | 4 | 5;
}

export interface ProgresSkill {
  skillId: string;
  etape: number;                // index de l'étape en cours
  valideeLe?: string;
  actif: boolean;               // suivi affiché dans « Toi »
}

export type TailleWidget = "petit" | "grand" | "rectangle";
export type TypeWidget =
  | "hydratation" | "macros" | "reussites" | "poids" | "lancer_seance" | "progression";

export interface Widget {
  id: string;
  type: TypeWidget;
  taille: TailleWidget;
}

export interface Reglages {
  nomUtilisateur: string;
  email: string;
  notifications: {
    seance: boolean;
    repas: boolean;
    hydratation: boolean;
    bilanHebdo: boolean;
  };
  widgets: Widget[];
}

/* ------------------------------------------------------------- Constantes */

const CLE_JOURNAL = "forge:journal";
const CLE_SKILLS = "forge:skills";
const CLE_REGLAGES = "forge:reglages";

export const WIDGETS_DEFAUT: Widget[] = [
  { id: "w1", type: "lancer_seance", taille: "rectangle" },
  { id: "w2", type: "hydratation", taille: "petit" },
  { id: "w3", type: "macros", taille: "grand" },
  { id: "w4", type: "reussites", taille: "petit" },
  { id: "w5", type: "progression", taille: "rectangle" },
];

export const REGLAGES_DEFAUT: Reglages = {
  nomUtilisateur: "",
  email: "",
  notifications: { seance: true, repas: false, hydratation: true, bilanHebdo: true },
  widgets: WIDGETS_DEFAUT,
};

/* -------------------------------------------------------------- Utilitaires */

export function aujourdhui(): string {
  return new Date().toISOString().slice(0, 10);
}

export function dateFr(iso: string): string {
  return new Date(iso + "T12:00:00").toLocaleDateString("fr-FR", {
    weekday: "short", day: "numeric", month: "short",
  });
}

function lire<T>(cle: string, defaut: T): T {
  if (typeof window === "undefined") return defaut;
  try {
    const brut = localStorage.getItem(cle);
    return brut ? (JSON.parse(brut) as T) : defaut;
  } catch {
    return defaut;
  }
}

function ecrire<T>(cle: string, valeur: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(cle, JSON.stringify(valeur));
    // Prévient les composants abonnés dans le même onglet
    window.dispatchEvent(new CustomEvent("forge:maj", { detail: cle }));
  } catch {
    // Quota dépassé ou navigation privée : on ignore silencieusement.
  }
}

function id(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/* ---------------------------------------------------------------- Journal */

export function lireJournal(): JournalJour[] {
  return lire<JournalJour[]>(CLE_JOURNAL, []);
}

export function jourCourant(date = aujourdhui()): JournalJour {
  const journal = lireJournal();
  return (
    journal.find((j) => j.date === date) ?? {
      date, repas: [], hydratationMl: 0, seanceFaite: false,
    }
  );
}

export function majJour(date: string, maj: Partial<JournalJour>): JournalJour {
  const journal = lireJournal();
  const i = journal.findIndex((j) => j.date === date);
  const base = i >= 0 ? journal[i] : { date, repas: [], hydratationMl: 0, seanceFaite: false };
  const suivant = { ...base, ...maj };
  if (i >= 0) journal[i] = suivant;
  else journal.push(suivant);
  ecrire(CLE_JOURNAL, journal);
  return suivant;
}

export function ajouterRepas(
  date: string,
  alimentId: string,
  grammes: number,
  repas: EntreeRepas["repas"],
  nomLibre?: string,
): void {
  const aliment = alimentParId(alimentId);
  const valeurs = aliment
    ? apports(aliment, grammes)
    : { kcal: 0, proteines: 0, glucides: 0, lipides: 0 };

  const jour = jourCourant(date);
  const entree: EntreeRepas = { id: id(), alimentId, nomLibre, grammes, repas, ...valeurs };
  majJour(date, { repas: [...jour.repas, entree] });
}

/** Ajoute une entrée dont les macros sont saisies à la main. */
export function ajouterRepasManuel(
  date: string,
  nom: string,
  valeurs: { kcal: number; proteines: number; glucides: number; lipides: number },
  repas: EntreeRepas["repas"],
): void {
  const jour = jourCourant(date);
  const entree: EntreeRepas = {
    id: id(), alimentId: "", nomLibre: nom, grammes: 0, repas, ...valeurs,
  };
  majJour(date, { repas: [...jour.repas, entree] });
}

export function retirerRepas(date: string, entreeId: string): void {
  const jour = jourCourant(date);
  majJour(date, { repas: jour.repas.filter((r) => r.id !== entreeId) });
}

export function ajouterEau(date: string, ml: number): void {
  const jour = jourCourant(date);
  majJour(date, { hydratationMl: Math.max(0, jour.hydratationMl + ml) });
}

/** Totaux nutritionnels consommés sur la journée. */
export function totauxJour(jour: JournalJour) {
  return jour.repas.reduce(
    (acc, r) => ({
      kcal: acc.kcal + r.kcal,
      proteines: acc.proteines + r.proteines,
      glucides: acc.glucides + r.glucides,
      lipides: acc.lipides + r.lipides,
    }),
    { kcal: 0, proteines: 0, glucides: 0, lipides: 0 },
  );
}

/**
 * Score nutritionnel : moyenne pondérée de l'atteinte de chaque macro.
 *
 * Un dépassement est pénalisé autant qu'un manque — dépasser sa cible de
 * glucides de 50 % n'est pas « mieux » que de l'atteindre. Les protéines
 * pèsent double : c'est le macro le plus structurant.
 */
export function scoreNutrition(
  jour: JournalJour,
  cibles: { kcal: number; proteinesG: number; glucidesG: number; lipidesG: number },
): number {
  const t = totauxJour(jour);
  if (t.kcal === 0) return 0;

  const atteinte = (consomme: number, cible: number) => {
    if (cible <= 0) return 1;
    const ratio = consomme / cible;
    return ratio <= 1 ? ratio : Math.max(0, 2 - ratio);   // symétrique autour de 100 %
  };

  const scoreProt = atteinte(t.proteines, cibles.proteinesG);
  const scoreGlu = atteinte(t.glucides, cibles.glucidesG);
  const scoreLip = atteinte(t.lipides, cibles.lipidesG);

  return Math.round(((scoreProt * 2 + scoreGlu + scoreLip) / 4) * 100);
}

export function scoreHydratation(jour: JournalJour, cibleMl: number): number {
  if (cibleMl <= 0) return 0;
  return Math.min(100, Math.round((jour.hydratationMl / cibleMl) * 100));
}

/**
 * Suggestions pour combler l'écart entre les macros consommées et les cibles.
 * On propose des aliments dont le profil correspond au macro le plus déficitaire.
 */
export function suggestionsComplement(
  jour: JournalJour,
  cibles: { kcal: number; proteinesG: number; glucidesG: number; lipidesG: number },
  contraintes: string[],
): { nom: string; quantite: string; apport: string; couvre: string }[] {
  const t = totauxJour(jour);
  const c = [...contraintes];
  if (c.includes("vegan")) c.push("vegetarien");

  const manques = [
    {
      macro: "protéines" as const,
      manque: Math.max(0, cibles.proteinesG - t.proteines),
      ids: ["fromage_blanc", "skyr", "poulet", "oeuf", "tofu", "lentilles", "whey"],
      cle: "proteines" as const,
    },
    {
      macro: "glucides" as const,
      manque: Math.max(0, cibles.glucidesG - t.glucides),
      ids: ["riz_complet", "patate_douce", "avoine", "pates", "banane", "pain_complet", "quinoa"],
      cle: "glucides" as const,
    },
    {
      macro: "lipides" as const,
      manque: Math.max(0, cibles.lipidesG - t.lipides),
      ids: ["amandes", "avocat", "beurre_cacahuete", "huile_olive", "graines_courge"],
      cle: "lipides" as const,
    },
  ].sort((a, b) => b.manque - a.manque);

  const suggestions: { nom: string; quantite: string; apport: string; couvre: string }[] = [];

  for (const cat of manques) {
    if (cat.manque < 5) continue;

    for (const alimentId of cat.ids) {
      const a = alimentParId(alimentId);
      if (!a || a.tags.some((tag) => c.includes(tag))) continue;

      const densite = a[cat.cle];
      if (densite < 3) continue;

      // Quantité théorique pour combler tout le déficit…
      const ideale = (cat.manque / densite) * 100;
      // …bornée à une portion réellement mangeable : au plus deux fois la
      // portion usuelle. Proposer « 380 g de poulet » ne sert personne.
      const plafond = a.portion * 2;
      const grammes = Math.max(10, Math.round(Math.min(ideale, plafond) / 10) * 10);

      const v = apports(a, grammes);
      const apporte = cat.cle === "proteines" ? v.proteines
        : cat.cle === "glucides" ? v.glucides : v.lipides;
      const part = Math.min(100, Math.round((apporte / cat.manque) * 100));

      suggestions.push({
        nom: a.nom,
        quantite: grammes >= a.portion ? `${grammes} g` : `${grammes} g (${a.portionNom})`,
        apport: `+${v.kcal} kcal · P ${v.proteines} / G ${v.glucides} / L ${v.lipides} g`,
        couvre: part >= 95
          ? `comble le manque de ${cat.macro}`
          : `couvre ${part} % du manque de ${cat.macro}`,
      });
      break;   // un seul aliment proposé par macronutriment
    }
  }
  return suggestions;
}

/* ------------------------------------------------------------ Série (streak) */

/**
 * Nombre de jours consécutifs avec une séance réalisée, en remontant depuis
 * aujourd'hui. Les jours de repos programmés ne cassent pas la série : on
 * ne compte que les jours où une séance était prévue.
 */
export function serieEnCours(joursAvecSeancePrevue: Set<string>): number {
  const journal = lireJournal();
  const parDate = new Map(journal.map((j) => [j.date, j]));
  let serie = 0;
  const curseur = new Date();

  for (let i = 0; i < 400; i++) {
    const iso = curseur.toISOString().slice(0, 10);
    const prevue = joursAvecSeancePrevue.has(iso);
    const jour = parDate.get(iso);

    if (prevue) {
      if (jour?.seanceFaite) serie += 1;
      else if (i > 0) break;   // séance prévue et non faite : la série s'arrête
      // Le jour même ne casse pas la série : la journée n'est pas finie.
    }
    curseur.setDate(curseur.getDate() - 1);
  }
  return serie;
}

export function totalSeances(): number {
  return lireJournal().filter((j) => j.seanceFaite).length;
}

/* ----------------------------------------------------------------- Skills */

export function lireSkills(): ProgresSkill[] {
  return lire<ProgresSkill[]>(CLE_SKILLS, []);
}

export function progresSkill(skillId: string): ProgresSkill {
  return lireSkills().find((s) => s.skillId === skillId)
    ?? { skillId, etape: 0, actif: false };
}

export function majSkill(skillId: string, maj: Partial<ProgresSkill>): void {
  const skills = lireSkills();
  const i = skills.findIndex((s) => s.skillId === skillId);
  const base = i >= 0 ? skills[i] : { skillId, etape: 0, actif: false };
  const suivant = { ...base, ...maj };
  if (i >= 0) skills[i] = suivant;
  else skills.push(suivant);
  ecrire(CLE_SKILLS, skills);
}

export function validerEtape(skillId: string, nbEtapes: number): void {
  const p = progresSkill(skillId);
  majSkill(skillId, {
    etape: Math.min(nbEtapes, p.etape + 1),
    valideeLe: aujourdhui(),
    actif: true,
  });
}

export function reculerEtape(skillId: string): void {
  const p = progresSkill(skillId);
  majSkill(skillId, { etape: Math.max(0, p.etape - 1) });
}

/* --------------------------------------------------------------- Réglages */

export function lireReglages(): Reglages {
  return { ...REGLAGES_DEFAUT, ...lire<Partial<Reglages>>(CLE_REGLAGES, {}) };
}

export function majReglages(maj: Partial<Reglages>): Reglages {
  const suivant = { ...lireReglages(), ...maj };
  ecrire(CLE_REGLAGES, suivant);
  return suivant;
}

/* ------------------------------------------------------ Effacement complet */

export function effacerToutesDonnees(): void {
  if (typeof window === "undefined") return;
  [CLE_JOURNAL, CLE_SKILLS, CLE_REGLAGES,
    "forge:fiches", "forge:seances", "forge:poids"]
    .forEach((c) => localStorage.removeItem(c));
  window.dispatchEvent(new CustomEvent("forge:maj", { detail: "tout" }));
}

export function exporterHistorique(): string {
  return JSON.stringify(
    {
      version: 1,
      exporteLe: new Date().toISOString(),
      journal: lireJournal(),
      skills: lireSkills(),
      reglages: lireReglages(),
    },
    null, 2,
  );
}

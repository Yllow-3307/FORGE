/**
 * noyau.ts — Utilitaires partagés : temps, arrondis, dérivations du profil.
 *
 * Les fonctions `rnd` / `rndTo` reproduisent l'arrondi « au pair le plus
 * proche » de Python (banker's rounding). Sans elles, les calories et les
 * fréquences cardiaques divergeraient du moteur de référence Python.
 */

import type { Derive, Jour, Profil } from "./types";
import { JOURS } from "./types";

export const MINUTE_JOUR = 1440;

/** Modulo mathématique : en JS, -450 % 1440 vaut -450 au lieu de 990. */
export function mod(a: number, n: number): number {
  return ((a % n) + n) % n;
}

/** Arrondi au pair le plus proche, identique à round() de Python. */
export function rnd(x: number): number {
  const f = Math.floor(x);
  const diff = x - f;
  if (Math.abs(diff - 0.5) > 1e-9) return Math.round(x);
  return f % 2 === 0 ? f : f + 1;
}

export function rndTo(x: number, decimales: number): number {
  const m = Math.pow(10, decimales);
  return rnd(x * m) / m;
}

/** "07:30" | "7h30" | 7.5 → minutes depuis minuit. */
export function toMin(valeur: string | number): number {
  if (typeof valeur === "number") {
    const h = Math.floor(valeur);
    const m = Math.round((valeur - h) * 60);
    return mod(h, 24) * 60 + Math.min(m, 59);
  }
  const s = String(valeur).trim().replace("h", ":").replace(".", ":");
  const parts = s.split(":");
  const h = parseInt(parts[0], 10) || 0;
  const m = parts.length > 1 && parts[1] !== "" ? parseInt(parts[1], 10) || 0 : 0;
  return mod(h, 24) * 60 + Math.min(m, 59);
}

/** Minutes depuis minuit → "HH:MM". */
export function fmt(minutes: number): string {
  const m = mod(Math.round(minutes), MINUTE_JOUR);
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** 95 → "1 h 35" ; 60 → "1 h" ; 45 → "45 min". */
export function dureeFmt(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h && m) return `${h} h ${String(m).padStart(2, "0")}`;
  if (h) return `${h} h`;
  return `${m} min`;
}

export function slug(s: string): string {
  return String(s)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[ \-'/]+/g, "_");
}

/** Met une chaîne en capitale initiale (affichage des jours). */
export function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Rend lisible un identifiant technique : "perte_de_gras" → "perte de gras". */
export function humaniser(s: string): string {
  return String(s).replace(/_/g, " ");
}

// ---------------------------------------------------------------------------
// Dérivations
// ---------------------------------------------------------------------------

export function derive(p: Profil): Derive {
  const imc = rndTo(p.poids / Math.pow(p.taille / 100, 2), 1);
  const classeImc: Derive["classeImc"] =
    imc < 18.5 ? "maigreur"
      : imc < 25 ? "normal"
        : imc < 30 ? "surpoids"
          : imc < 35 ? "obesite_1"
            : "obesite_2+";

  const r = toMin(p.heureReveil);
  const c = toMin(p.heureCoucher);
  const dureeEveil = mod(c - r, MINUTE_JOUR) || MINUTE_JOUR;
  const dureeSommeil = MINUTE_JOUR - dureeEveil;

  const trajetAller = Math.floor(p.trajetQuotidien / 2);
  const departDomicile = toMin(p.heureDebutTravail) - trajetAller;
  const retourDomicile = toMin(p.heureFinTravail) + trajetAller;
  const fenetreMatin = Math.max(0, departDomicile - r);
  const coucherAjuste = c > retourDomicile ? c : c + MINUTE_JOUR;
  const fenetreSoir = Math.max(0, coucherAjuste - retourDomicile);

  const nTravail = p.joursTravailles.length;
  const libreTravail = (fenetreMatin + fenetreSoir) * nTravail;
  const libreRepos = dureeEveil * (7 - nTravail);
  let indispo = 0;
  for (const i of p.indisponibilites ?? []) {
    const deb = toMin(i.debut);
    let fin = toMin(i.fin);
    if (fin <= deb) fin += MINUTE_JOUR;
    indispo += (fin - deb) * (i.jours?.length ?? 7);
  }
  const tempsLibreSemaine = Math.max(0, libreTravail + libreRepos - indispo);
  const heures = tempsLibreSemaine / 60;
  const pressionTemporelle: Derive["pressionTemporelle"] =
    heures < 10 ? "critique" : heures < 20 ? "forte" : heures < 35 ? "moderee" : "confortable";

  const aUnDe = (...tags: string[]) => tags.some((t) => p.equipement.includes(t as never));
  const contexteEquipement: Derive["contexteEquipement"] =
    aUnDe("machines_salle", "rack", "poulie", "barre_olympique")
      ? "salle"
      : aUnDe("halteres", "kettlebell", "trx", "anneaux") &&
        aUnDe("barre_traction", "barres_paralleles", "banc")
        ? "home_gym"
        : aUnDe("barre_traction", "barres_paralleles", "elastiques", "anneaux",
          "halteres", "kettlebell", "trx")
          ? "minimal"
          : "poids_de_corps";

  const fcReposBase = {
    sedentaire: 72, debutant: 68, intermediaire: 62, avance: 56, athlete: 50,
  }[p.niveauSportif];

  return {
    imc,
    classeImc,
    dureeEveil,
    dureeSommeil,
    sommeilSuffisant: dureeSommeil >= 420,
    trajetAller,
    departDomicile,
    retourDomicile,
    fenetreMatin,
    fenetreSoir,
    tempsLibreSemaine,
    pressionTemporelle,
    fcmax: rnd(208 - 0.7 * p.age),
    fcRepos: p.fcRepos ?? fcReposBase,
    contexteEquipement,
    joursRepos: JOURS.filter((j) => !p.joursTravailles.includes(j)) as Jour[],
  };
}

export function contrainte(p: Profil, ...noms: string[]): boolean {
  return noms.some((n) => (p.contraintesAlimentaires as string[]).includes(n));
}

export function blesse(p: Profil, ...zones: string[]): boolean {
  return zones.some((z) => (p.blessures as string[]).includes(z));
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export interface ErreurChamp {
  champ: string;
  message: string;
}

/**
 * Contrôle de cohérence avant génération.
 * Renvoie une liste vide si le profil est exploitable.
 */
export function valider(p: Partial<Profil>): ErreurChamp[] {
  const err: ErreurChamp[] = [];
  const age = Number(p.age);
  const poids = Number(p.poids);
  const taille = Number(p.taille);

  if (!Number.isFinite(age) || age < 10 || age > 100) {
    err.push({ champ: "age", message: "L'âge doit être compris entre 10 et 100 ans." });
  }
  if (!Number.isFinite(poids) || poids < 30 || poids > 300) {
    err.push({ champ: "poids", message: "Le poids doit être compris entre 30 et 300 kg." });
  }
  if (!Number.isFinite(taille) || taille < 120 || taille > 230) {
    err.push({ champ: "taille", message: "La taille doit être comprise entre 120 et 230 cm." });
  }
  if (Number(p.tempsCuisine) < 5) {
    err.push({ champ: "tempsCuisine", message: "Prévoyez au moins 5 minutes par jour pour les repas." });
  }
  if (p.heureReveil && p.heureCoucher) {
    const eveil = mod(toMin(p.heureCoucher) - toMin(p.heureReveil), MINUTE_JOUR);
    if (eveil < 360) {
      err.push({
        champ: "heureCoucher",
        message: "La période d'éveil doit durer au moins 6 h : vérifiez le réveil et le coucher.",
      });
    }
  }
  if (Number(p.seancesParSemaine) < 1) {
    err.push({ champ: "seancesParSemaine", message: "Prévoyez au moins une séance par semaine." });
  }
  return err;
}

/** Normalise les entrées du formulaire (types, doublons, valeurs vides). */
export function normaliser(x: Profil): Profil {
  const p: Profil = { ...x };
  p.age = Math.round(Number(p.age));
  p.poids = Number(p.poids);
  p.taille = Number(p.taille);
  p.trajetQuotidien = Math.round(Number(p.trajetQuotidien)) || 0;
  p.tempsCuisine = Math.round(Number(p.tempsCuisine)) || 30;
  p.seancesParSemaine = Math.max(1, Math.min(7, Math.round(Number(p.seancesParSemaine)) || 3));
  p.dureeCycle = Math.max(4, Math.min(16, Math.round(Number(p.dureeCycle)) || 8));

  let eq = Array.from(new Set(p.equipement ?? []));
  if (eq.length === 0) eq = ["aucun"];
  if (eq.length > 1) {
    const filtres = eq.filter((e) => e !== "aucun");
    eq = filtres.length ? filtres : ["aucun"];
  }
  p.equipement = eq;

  p.contraintesAlimentaires = Array.from(new Set(p.contraintesAlimentaires ?? []));
  p.blessures = Array.from(new Set(p.blessures ?? []));
  p.joursTravailles = (p.joursTravailles?.length
    ? p.joursTravailles
    : ["lundi", "mardi", "mercredi", "jeudi", "vendredi"]) as Jour[];
  p.nom = (p.nom || "").trim() || "Client";
  return p;
}

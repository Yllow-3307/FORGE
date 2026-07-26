/**
 * agenda.ts — Placement des séances et des repas dans la journée réelle.
 *
 * Contraintes appliquées :
 *  - pas de séance intense dans les 90 min précédant le coucher ;
 *  - marge de douche avant le départ au travail pour les séances du matin ;
 *  - délais digestifs autour des repas ;
 *  - un repas de récupération après une séance tardive.
 */

import type { Derive, Jour, Profil, Repas } from "./types";
import { JOURS } from "./types";
import { MINUTE_JOUR, contrainte, fmt, toMin } from "./noyau";

export interface Creneau {
  debut: number;
  fin: number;
  jour: Jour;
}

/** Douche + habillage après une séance matinale, avant de partir. */
export const MARGE_DOUCHE = 25;

function soustraire(creneaux: Creneau[], deb: number, fin: number): Creneau[] {
  const out: Creneau[] = [];
  for (const c of creneaux) {
    if (c.fin <= deb || fin <= c.debut) {
      out.push(c);
      continue;
    }
    if (c.debut < deb) out.push({ debut: c.debut, fin: deb, jour: c.jour });
    if (fin < c.fin) out.push({ debut: fin, fin: c.fin, jour: c.jour });
  }
  return out;
}

/** Créneaux réellement disponibles un jour donné. */
export function creneauxLibres(p: Profil, d: Derive, jour: Jour): Creneau[] {
  const reveil = toMin(p.heureReveil);
  let coucher = toMin(p.heureCoucher);
  if (coucher <= reveil) coucher += MINUTE_JOUR;

  let base: Creneau[] = [{ debut: reveil + 20, fin: coucher - 30, jour }];
  if (base[0].fin <= base[0].debut) return [];

  if (p.joursTravailles.includes(jour)) {
    let fin = d.retourDomicile;
    if (fin <= d.departDomicile) fin += MINUTE_JOUR;
    base = soustraire(base, d.departDomicile, fin);
  }

  for (const i of p.indisponibilites ?? []) {
    const jours = i.jours?.length ? i.jours : JOURS;
    if (!jours.includes(jour)) continue;
    const deb = toMin(i.debut);
    let fin = toMin(i.fin);
    if (fin <= deb) fin += MINUTE_JOUR;
    base = soustraire(base, deb, fin);
  }

  return base.filter((c) => c.fin - c.debut >= 15);
}

function scoreJour(p: Profil, d: Derive, jour: Jour, dureeCible: number): number {
  const cr = creneauxLibres(p, d, jour);
  if (!cr.length) return 0;
  const meilleur = Math.max(...cr.map((c) => c.fin - c.debut));
  if (meilleur < dureeCible * 0.6) return 0;
  const total = cr.reduce((a, c) => a + (c.fin - c.debut), 0);
  let s = Math.min(1, meilleur / dureeCible) * 60 + Math.min(total, 480) / 24;
  if (!p.joursTravailles.includes(jour)) s += 15;
  return s;
}

/** Répartitions privilégiant l'alternance effort / récupération. */
const REPARTITIONS: Record<number, Jour[]> = {
  1: ["samedi"],
  2: ["mardi", "samedi"],
  3: ["lundi", "mercredi", "vendredi"],
  4: ["lundi", "mardi", "jeudi", "vendredi"],
  5: ["lundi", "mardi", "mercredi", "vendredi", "samedi"],
  6: ["lundi", "mardi", "mercredi", "vendredi", "samedi", "dimanche"],
  7: [...JOURS],
};

export function joursEntrainement(p: Profil, d: Derive, dureeCible: number): Jour[] {
  const n = p.seancesParSemaine;
  if (n <= 0) return [];
  if (n >= 7) return [...JOURS];

  const modele = REPARTITIONS[n] ?? REPARTITIONS[3];
  const scores = Object.fromEntries(
    JOURS.map((j) => [j, scoreJour(p, d, j, dureeCible)]),
  ) as Record<Jour, number>;

  const retenus = modele.filter((j) => scores[j] > 0);
  const manquants = n - retenus.length;
  if (manquants > 0) {
    JOURS.filter((j) => !retenus.includes(j))
      .sort((a, b) => scores[b] - scores[a])
      .slice(0, manquants)
      .forEach((j) => {
        if (scores[j] > 0) retenus.push(j);
      });
  }
  return Array.from(new Set(retenus)).sort(
    (a, b) => JOURS.indexOf(a) - JOURS.indexOf(b),
  );
}

export function momentPrefere(p: Profil, d: Derive): "matin" | "midi" | "soir" {
  if (d.fenetreMatin >= 75) return "matin";
  if (d.fenetreSoir >= 75) return "soir";
  return d.fenetreMatin >= d.fenetreSoir ? "matin" : "soir";
}

export function placerSeance(
  p: Profil, d: Derive, jour: Jour, duree: number,
  intensite: "moderee" | "elevee" = "moderee",
): Creneau | null {
  let bruts = creneauxLibres(p, d, jour);

  // Réserve la marge de douche sur le créneau du matin des jours travaillés
  if (p.joursTravailles.includes(jour)) {
    bruts = bruts
      .map((c) =>
        c.fin >= d.departDomicile && d.departDomicile > c.debut
          ? { ...c, fin: d.departDomicile - MARGE_DOUCHE }
          : c,
      )
      .filter((c) => c.fin - c.debut >= 15);
  }

  const cr = bruts.filter((c) => c.fin - c.debut >= duree);
  if (!cr.length) return null;

  let coucher = toMin(p.heureCoucher);
  if (coucher <= toMin(p.heureReveil)) coucher += MINUTE_JOUR;
  const limiteIntense = coucher - 90;

  const pref = momentPrefere(p, d);
  const ancre =
    pref === "matin" ? toMin(p.heureReveil) + 60
      : pref === "midi" ? 750
        : d.retourDomicile + 30;

  let meilleur: Creneau | null = null;
  let meilleurCout: [number, number, number] | null = null;

  for (const c of cr) {
    const depart = Math.max(c.debut, Math.min(ancre, c.fin - duree));
    const fin = depart + duree;
    const pen = intensite === "elevee" && fin > limiteIntense ? fin - limiteIntense : 0;
    const cout: [number, number, number] = [pen, Math.abs(depart - ancre), -(c.fin - c.debut)];
    if (
      !meilleurCout ||
      cout[0] < meilleurCout[0] ||
      (cout[0] === meilleurCout[0] && cout[1] < meilleurCout[1]) ||
      (cout[0] === meilleurCout[0] && cout[1] === meilleurCout[1] && cout[2] < meilleurCout[2])
    ) {
      meilleurCout = cout;
      meilleur = c;
    }
  }
  if (!meilleur) return null;
  const depart = Math.max(meilleur.debut, Math.min(ancre, meilleur.fin - duree));
  return { debut: depart, fin: depart + duree, jour };
}

/** Essaie la durée idéale, puis raccourcit par paliers de 5 min. */
export function placerAvecRepli(
  p: Profil, d: Derive, jour: Jour, dureeIdeale: number,
  dureeMin: number, intensite: "moderee" | "elevee",
): { creneau: Creneau | null; duree: number } {
  let duree = dureeIdeale;
  while (duree >= dureeMin) {
    const c = placerSeance(p, d, jour, duree, intensite);
    if (c) return { creneau: c, duree };
    duree -= 5;
  }
  return { creneau: null, duree: 0 };
}

type RepasBrut = Omit<Repas, "kcal" | "proteinesG" | "glucidesG" | "lipidesG">;

/** Positionne les repas selon l'agenda et l'heure de la séance. */
export function structureRepas(
  p: Profil, d: Derive, jour: Jour, seance: Creneau | null,
): RepasBrut[] {
  const reveil = toMin(p.heureReveil);
  let coucher = toMin(p.heureCoucher);
  if (coucher <= reveil) coucher += MINUTE_JOUR;

  const travaille = p.joursTravailles.includes(jour);
  const repas: RepasBrut[] = [];

  const sautPdj = contrainte(p, "faible_appetit_matin") && d.fenetreMatin < 45;
  const seanceMatin = !!seance && seance.debut < 660;

  if (sautPdj) {
    repas.push({
      nom: "Collation matinale (nomade)", heure: reveil + 120, heureTxt: "",
      duree: 10, lieu: "nomade", role: "appoint",
      note: "Appétit faible au réveil : repoussé et allégé.",
    });
  } else {
    let hPdj = reveil + 30;
    if (travaille && hPdj + 15 > d.departDomicile) {
      hPdj = Math.max(reveil + 15, d.departDomicile - 20);
    }
    let nomPdj = "Petit-déjeuner";
    let notePdj: string | undefined;

    if (seanceMatin && seance) {
      const limite = travaille ? d.departDomicile - 10 : coucher;
      if (seance.debut - (hPdj + 20) >= 75) {
        // Digestion suffisante : on ne touche à rien.
      } else if (seance.fin + 20 <= limite) {
        // On scinde : énergie rapide avant, vrai repas après l'effort.
        repas.push({
          nom: "Pré-séance léger", heure: Math.max(reveil + 10, seance.debut - 35),
          heureTxt: "", duree: 8, lieu: "domicile", role: "pre_effort",
          note: "Séance matinale : banane ou dattes + café, digestion rapide.",
        });
        hPdj = seance.fin + 15;
      } else {
        hPdj = Math.max(reveil + 10, seance.debut - 50);
        nomPdj = "Petit-déjeuner allégé (pré-séance)";
        notePdj = "Moins de 1 h avant l'effort : glucides simples, peu de gras et de fibres. "
          + "Compléter les protéines au déjeuner.";
      }
    }

    repas.push({
      nom: nomPdj, heure: hPdj, heureTxt: "",
      duree: d.fenetreMatin < 60 ? 15 : 25,
      lieu: travaille && hPdj > d.departDomicile ? "nomade" : "domicile",
      role: "demarrage", note: notePdj,
    });
  }

  let hDej: number;
  let lieuDej: string;
  if (travaille) {
    const milieu = Math.floor((d.departDomicile + d.retourDomicile) / 2);
    hDej = Math.max(705, Math.min(810, milieu));
    lieuDej = p.lieuRepas;
  } else {
    hDej = 750;
    lieuDej = "domicile";
  }
  repas.push({ nom: "Déjeuner", heure: hDej, heureTxt: "", duree: 30, lieu: lieuDej, role: "principal" });

  let hDiner = Math.max(d.retourDomicile + 30, 1140);
  hDiner = Math.min(hDiner, coucher - 90);
  if (seance && seance.fin > hDiner - 30) {
    hDiner = Math.max(hDiner, Math.min(seance.fin + 30, coucher - 60));
  }
  repas.push({ nom: "Dîner", heure: hDiner, heureTxt: "", duree: 30, lieu: "domicile", role: "principal" });

  const ecart = hDiner - hDej;
  if (ecart > 330) {
    repas.push({
      nom: "Goûter", heure: hDej + Math.floor(ecart / 2), heureTxt: "",
      duree: 10, lieu: travaille ? "bureau" : "domicile", role: "appoint",
    });
  }

  if (seance) {
    const precedents = repas.filter((r) => r.heure <= seance.debut);
    if (precedents.length) {
      const dernier = precedents.reduce((a, b) => (a.heure > b.heure ? a : b));
      if (seance.debut - dernier.heure > 210) {
        repas.push({
          nom: "Collation pré-séance", heure: seance.debut - 60, heureTxt: "",
          duree: 8, lieu: "nomade", role: "pre_effort",
          note: "Glucides rapides, peu de fibres et de gras.",
        });
      }
    }
    const posterieurs = repas.filter((r) => r.heure >= seance.fin);
    if (!posterieurs.length && seance.fin < coucher - 45) {
      repas.push({
        nom: "Collation de récupération", heure: Math.min(seance.fin + 25, coucher - 30),
        heureTxt: "", duree: 10, lieu: "domicile", role: "post_effort",
        note: "Protéines et glucides dans les 90 min suivant l'effort.",
      });
    }
  }

  repas.sort((a, b) => a.heure - b.heure);
  return repas.map((r) => ({ ...r, heureTxt: fmt(r.heure) }));
}

export function budgetTempsCuisine(p: Profil, d: Derive) {
  const t = p.tempsCuisine;
  const batch = t < 45 || d.pressionTemporelle === "critique" || d.pressionTemporelle === "forte";
  const alaise = ["moyen", "bon", "chef"].includes(p.niveauCuisine);
  return {
    totalJour: t,
    batchCooking: batch,
    sessionBatch: batch ? (alaise ? 90 : 60) : 0,
    jourBatch: d.joursRepos.includes("dimanche") ? "dimanche" : (d.joursRepos[0] ?? "dimanche"),
    cuisineParRepas: Math.max(5, Math.floor(t / 3)),
    strategie: batch ? "batch cooking + assemblage rapide" : "cuisine quotidienne à la demande",
  };
}

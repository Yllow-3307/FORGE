/**
 * hydratation.ts — Bloc hydratation.
 *
 *   besoin = socle (ml/kg) + pertes à l'effort + correctifs contextuels
 *
 * Le plan produit un échéancier réel plutôt qu'un simple volume total :
 * c'est la répartition qui détermine l'observance, et boire deux litres
 * d'un coup le soir n'hydrate pas — cela réveille la nuit.
 */

import type {
  BesoinHydrique, Derive, PointHydratation, Profil, Repas,
} from "./types";
import type { Creneau } from "./agenda";
import { MINUTE_JOUR, contrainte, fmt, rnd, toMin } from "./noyau";

export function besoinHydrique(
  p: Profil, d: Derive, minutesEffort: number,
  climat: "tempere" | "chaud" | "froid_sec" = "tempere",
): BesoinHydrique {
  // La sensation de soif devient moins fiable avec l'âge : on structure plus.
  const socleKg = p.age >= 65 ? 30 : p.age >= 55 ? 32 : 33;
  const socle = socleKg * p.poids;

  const coefSudation = 1 + Math.max(0, (d.imc - 25) * 0.02);
  const effort = (minutesEffort / 60) * 600 * coefSudation;

  const correctifs: Record<string, number> = {};
  if (climat === "chaud") correctifs["climat chaud"] = socle * 0.15;
  else if (climat === "froid_sec") correctifs["air froid et sec"] = socle * 0.05;
  if (contrainte(p, "diabete_t2")) correctifs["diabète (surveillance glycémique)"] = 200;
  if (d.dureeEveil > 17 * 60) correctifs["journée d'éveil longue"] = 150;

  let total = socle + effort + Object.values(correctifs).reduce((a, b) => a + b, 0);

  // Le rein élimine environ 0,8 à 1 L/h : un poids élevé ne justifie pas un
  // volume proportionnel illimité.
  const plafond = 3500 + Math.min(1000, (minutesEffort / 60) * 500);
  const plafondApplique = total > plafond;
  total = Math.min(total, plafond);

  return {
    socle: Math.trunc(socle),
    effort: Math.trunc(effort),
    correctifs,
    totalMl: rnd(total / 50) * 50,
    plafondApplique,
    note: "Volume à boire, hors eau contenue dans les aliments (fruits, légumes, soupes : "
      + "environ 20 % de plus)."
      + (plafondApplique
        ? " Volume plafonné : au-delà, l'excès est simplement éliminé et peut diluer les "
          + "électrolytes. Se fier à la soif et à la couleur des urines."
        : ""),
  };
}

/** Répartit le volume sur des points d'ancrage concrets de la journée. */
export function planHydratation(
  p: Profil, d: Derive, besoinMl: number,
  seance: Creneau | null, repas: Repas[],
): PointHydratation[] {
  const reveil = toMin(p.heureReveil);
  let coucher = toMin(p.heureCoucher);
  if (coucher <= reveil) coucher += MINUTE_JOUR;

  const points: Omit<PointHydratation, "heureTxt">[] = [
    {
      heure: reveil + 5, ml: 400, moment: "Au réveil",
      conseil: "400 ml dès le lever : la nuit crée un déficit de 300 à 500 ml.",
    },
  ];

  if (seance) {
    const dureeSeance = seance.fin - seance.debut;
    const pendant = Math.trunc(500 * (dureeSeance / 60) * (1 + Math.max(0, (d.imc - 25) * 0.02)));
    points.push({
      heure: Math.max(reveil + 10, seance.debut - 90), ml: 400,
      moment: "90 min avant la séance",
      conseil: "Permet d'arriver hydraté sans gêne gastrique.",
    });
    points.push({
      heure: seance.debut + Math.floor(dureeSeance / 2), ml: pendant,
      moment: "Pendant la séance",
      conseil: `Environ ${pendant} ml par petites gorgées régulières, soit 150 à 200 ml `
        + `toutes les 15 à 20 min.`,
    });
    points.push({
      heure: seance.fin + 20, ml: 500, moment: "Après la séance",
      conseil: "Compenser 1,5 fois la masse perdue : se peser avant et après pour calibrer "
        + "(1 kg perdu équivaut à 1,5 L à boire).",
    });
  }

  for (const r of repas) {
    if (r.role === "demarrage" || r.role === "principal") {
      points.push({
        heure: r.heure - 15, ml: 250, moment: `Avant ${r.nom.toLowerCase()}`,
        conseil: "Un verre avant le repas : hydratation et satiété.",
      });
    }
  }

  // Remplissage du reste de la journée, en s'arrêtant 2 h avant le coucher.
  const deja = points.reduce((a, x) => a + x.ml, 0);
  const reste = Math.max(0, besoinMl - deja);
  const limite = coucher - 120;
  const debutRemplissage = reveil + 120;

  if (reste > 0 && limite > debutRemplissage) {
    const n = Math.max(1, Math.floor((limite - debutRemplissage) / 120));
    const parPoint = rnd(reste / n / 50) * 50;
    for (let i = 0; i < n; i++) {
      const h = debutRemplissage + i * 120;
      if (h >= limite) break;
      const contexte = h >= d.departDomicile && h <= d.retourDomicile ? "au travail" : "à la maison";
      points.push({
        heure: h, ml: parPoint, moment: `Point régulier (${contexte})`,
        conseil: "Gourde visible sur le bureau : le principal levier d'observance est la "
          + "disponibilité, pas la motivation.",
      });
    }
  }

  points.sort((a, b) => a.heure - b.heure);
  return points.map((x) => ({ ...x, heureTxt: fmt(x.heure) }));
}

export function recommandationsBoissons(p: Profil, d: Derive, minutesEffort: number) {
  const electrolytes =
    minutesEffort >= 75 || d.imc >= 30 || (p.objectif === "endurance" && minutesEffort >= 60);

  const aPrivilegier = [
    "Eau plate ou gazeuse : boisson de référence, sans limite.",
    "Thé et café comptent dans les apports (l'effet diurétique reste marginal aux doses "
    + "usuelles), mais limiter la caféine 6 h avant le coucher.",
  ];
  aPrivilegier.push(
    electrolytes
      ? "Séances longues (plus de 75 min) ou forte sudation : ajouter du sodium (300 à 700 mg/L). "
        + "Une pincée de sel et un jus de citron suffisent, inutile d'acheter des boissons spécialisées."
      : "Séances de moins de 75 min : l'eau suffit, aucune boisson de l'effort n'est nécessaire.",
  );

  const aLimiter = [
    "Sodas et jus de fruits : apports caloriques liquides, peu rassasiants.",
    "Alcool : altère la récupération, le sommeil et la synthèse protéique.",
  ];
  if (contrainte(p, "diabete_t2")) {
    aLimiter.push("Aucune boisson sucrée, y compris les jus 100 % pur fruit.");
  }
  if (contrainte(p, "hypertension")) {
    aLimiter.push("Attention aux eaux minérales riches en sodium : lire l'étiquette.");
  }

  return { aPrivilegier, aLimiter, electrolytes };
}

export const REPERES_HYDRATATION = [
  "Couleur des urines : jaune pâle indique un bon niveau ; jaune foncé, un déficit ; "
  + "totalement transparent, un excès inutile.",
  "Fréquence : 4 à 7 mictions par jour constituent un bon repère.",
  "Se peser avant et après une séance longue : chaque kilo perdu correspond à environ 1,5 L "
  + "à recompenser dans les heures qui suivent.",
  "Signes de déficit : maux de tête en fin de journée, baisse de performance inexpliquée, "
  + "crampes, bouche sèche.",
  "Ne jamais forcer très au-delà de la soif : boire plusieurs litres d'un coup expose à "
  + "l'hyponatrémie. La régularité prime sur le volume.",
];

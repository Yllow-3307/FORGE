/**
 * nutrition.ts — Bloc nutrition.
 *
 * 1. Métabolisme de base (Mifflin-St Jeor, ou Katch-McArdle si % de gras connu)
 * 2. Dépense totale = MB × facteur d'activité
 * 3. Calories = dépense ± ajustement lié à l'objectif, borné par un plancher
 * 4. Protéines et lipides fixés en priorité, glucides en solde énergétique
 * 5. Répartition sur les repas réellement planifiés
 * 6. Filtrage des aliments par contraintes, cuisine et lieu de repas
 */

import type { Derive, Macros, Profil, Repas } from "./types";
import { contrainte, rnd, rndTo } from "./noyau";

const KCAL_PROT = 4;
const KCAL_LIP = 9;
const KCAL_GLU = 4;

export function metabolismeBase(p: Profil): number {
  // Katch-McArdle : basé sur la masse maigre, plus précis quand elle est connue.
  if (p.pourcentageGras && p.pourcentageGras >= 3 && p.pourcentageGras <= 60) {
    const masseMaigre = p.poids * (1 - p.pourcentageGras / 100);
    return rnd(370 + 21.6 * masseMaigre);
  }
  let base = 10 * p.poids + 6.25 * p.taille - 5 * p.age;
  if (p.sexe === "homme") base += 5;
  else if (p.sexe === "femme") base -= 161;
  else base -= 78;
  return rnd(base);
}

/** Volontairement conservateur : la NEAT est surestimée par la plupart des calculateurs. */
export function facteurActivite(p: Profil): number {
  let f = 1.2;
  if (p.trajetQuotidien >= 60) f += 0.04;
  else if (p.trajetQuotidien >= 30) f += 0.02;
  f += Math.min(0.28, 0.045 * p.seancesParSemaine);
  f += { sedentaire: 0, debutant: 0.01, intermediaire: 0.03, avance: 0.05, athlete: 0.08 }[p.niveauSportif];
  return rndTo(Math.min(f, 1.75), 3);
}

export function macros(p: Profil, d: Derive): Macros {
  const mb = metabolismeBase(p);
  const fa = facteurActivite(p);
  const dep = rnd(mb * fa);

  let ajust = {
    perte_de_gras: -0.2, prise_de_muscle: 0.1, force: 0.05, endurance: 0,
    recomposition: -0.05, sante_mobilite: 0, competition_street: 0,
  }[p.objectif];

  // Un IMC élevé tolère un déficit plus marqué ; un IMC bas l'interdit.
  if (p.objectif === "perte_de_gras") {
    if (d.imc >= 32) ajust = -0.25;
    else if (d.imc < 22) ajust = -0.12;
  }
  if (p.objectif === "prise_de_muscle" && d.imc >= 28) ajust = 0.05;

  let cible = dep * (1 + ajust);
  const plancher = Math.max(mb, p.sexe === "homme" ? 1500 : 1200);
  const plancherApplique = cible < plancher;
  cible = Math.max(cible, plancher);
  const kcal = rnd(cible / 10) * 10;

  // --- Protéines ---
  let protKg = {
    perte_de_gras: 2.0, prise_de_muscle: 1.9, force: 1.8, recomposition: 2.0,
    endurance: 1.5, sante_mobilite: 1.4, competition_street: 1.8,
  }[p.objectif];
  if (p.age >= 60) protKg = Math.max(protKg, 1.6);      // résistance anabolique
  if (contrainte(p, "vegan")) protKg += 0.2;            // digestibilité moindre

  // En surpoids marqué, on rapporte les besoins à un poids de référence.
  let poidsRef = p.poids;
  if (d.imc >= 30) {
    const ideal = 25 * Math.pow(p.taille / 100, 2);
    poidsRef = ideal + 0.25 * (p.poids - ideal);
  }
  const proteinesG = rnd(protKg * poidsRef);

  // --- Lipides ---
  const lipKg = Math.max(p.objectif !== "perte_de_gras" ? 0.8 : 0.7, 0.6);
  const lipidesG = rnd(Math.max(lipKg * poidsRef, (kcal * 0.2) / KCAL_LIP));

  // --- Glucides : le solde énergétique ---
  const reste = kcal - proteinesG * KCAL_PROT - lipidesG * KCAL_LIP;
  const glucidesG = rnd(Math.max(reste, kcal * 0.1) / KCAL_GLU);

  return {
    mb, facteurActivite: fa, depenseTotale: dep, ajustementPct: rnd(ajust * 100),
    kcal, plancherApplique,
    proteinesG, proteinesGKg: rndTo(proteinesG / p.poids, 2),
    lipidesG, glucidesG,
    fibresG: rnd(Math.min(38, Math.max(25, (kcal / 1000) * 14))),
    repartitionPct: {
      proteines: rnd((proteinesG * KCAL_PROT * 100) / kcal),
      lipides: rnd((lipidesG * KCAL_LIP * 100) / kcal),
      glucides: rnd((glucidesG * KCAL_GLU * 100) / kcal),
    },
  };
}

/** Part de l'apport quotidien selon le rôle du repas. */
const PARTS: Record<string, number> = {
  demarrage: 0.25, principal: 0.32, appoint: 0.1, pre_effort: 0.07, post_effort: 0.12,
};

type RepasBrut = Omit<Repas, "kcal" | "proteinesG" | "glucidesG" | "lipidesG">;

/**
 * Distribue calories et macros sur les repas planifiés.
 * Les protéines sont réparties uniformément (optimise la synthèse protéique),
 * les glucides sont concentrés autour de l'effort.
 */
export function repartirMacros(repas: RepasBrut[], m: Macros): Repas[] {
  if (!repas.length) return [];

  let poids = repas.map((r) => PARTS[r.role] ?? 0.15);
  const tot = poids.reduce((a, b) => a + b, 0) || 1;
  poids = poids.map((w) => w / tot);

  const nReels = Math.max(
    1,
    repas.filter((r) => ["demarrage", "principal", "post_effort"].includes(r.role)).length,
  );

  const sortie: Repas[] = repas.map((r, i) => {
    const w = poids[i];
    const prot = ["demarrage", "principal", "post_effort"].includes(r.role)
      ? rnd(m.proteinesG / nReels)
      : rnd(m.proteinesG * w * 0.5);

    let glu: number, lip: number;
    if (r.role === "pre_effort") {
      glu = rnd(m.glucidesG * w * 1.6);
      lip = rnd(m.lipidesG * w * 0.3);
    } else if (r.role === "post_effort") {
      glu = rnd(m.glucidesG * w * 1.4);
      lip = rnd(m.lipidesG * w * 0.5);
    } else {
      glu = rnd(m.glucidesG * w);
      lip = rnd(m.lipidesG * w);
    }
    return { ...r, kcal: rnd(m.kcal * w), proteinesG: prot, glucidesG: glu, lipidesG: lip };
  });

  // Réajustement : la somme doit retomber exactement sur la cible du jour.
  ([["proteinesG", m.proteinesG], ["glucidesG", m.glucidesG], ["lipidesG", m.lipidesG]] as const)
    .forEach(([cle, cible]) => {
      const somme = sortie.reduce((a, r) => a + r[cle], 0);
      const ecart = cible - somme;
      if (ecart && sortie.length) {
        const principal = sortie.reduce((a, b) => (a.kcal >= b.kcal ? a : b));
        principal[cle] = Math.max(0, principal[cle] + ecart);
      }
    });

  for (const r of sortie) {
    r.kcal = r.proteinesG * KCAL_PROT + r.glucidesG * KCAL_GLU + r.lipidesG * KCAL_LIP;
  }
  return sortie;
}

// ---------------------------------------------------------------------------
// Aliments
// ---------------------------------------------------------------------------

const SOURCES_PROTEINES: [string, string[]][] = [
  ["Poulet ou dinde", ["vegetarien", "vegan"]],
  ["Bœuf maigre", ["vegetarien", "vegan"]],
  ["Porc ou jambon", ["vegetarien", "vegan", "halal", "casher", "sans_porc"]],
  ["Poisson blanc (cabillaud, colin)", ["vegetarien", "vegan", "sans_poisson"]],
  ["Poisson gras (saumon, maquereau, sardine)", ["vegetarien", "vegan", "sans_poisson"]],
  ["Œufs", ["vegan", "sans_oeuf"]],
  ["Fromage blanc ou skyr", ["vegan", "sans_lactose"]],
  ["Yaourt grec", ["vegan", "sans_lactose"]],
  ["Tofu ferme", []], ["Tempeh", []],
  ["Lentilles, pois chiches", []], ["Haricots rouges ou noirs", []],
  ["Protéine de pois en poudre", []],
  ["Whey", ["vegan", "sans_lactose"]],
  ["Seitan", ["sans_gluten"]], ["Edamame", []],
];

const SOURCES_GLUCIDES: [string, string[]][] = [
  ["Riz complet", []], ["Pâtes complètes", ["sans_gluten"]], ["Pain complet", ["sans_gluten"]],
  ["Pommes de terre, patate douce", []], ["Quinoa", []], ["Flocons d'avoine", []],
  ["Sarrasin", []], ["Semoule ou boulgour", ["sans_gluten"]],
  ["Fruits frais de saison", []], ["Légumineuses", []],
];

const SOURCES_LIPIDES: [string, string[]][] = [
  ["Huile d'olive", []], ["Avocat", []], ["Amandes, noix", ["sans_fruits_a_coque"]],
  ["Graines de courge ou tournesol", []], ["Beurre de cacahuète", ["sans_fruits_a_coque"]],
  ["Huile de colza", []], ["Olives", []],
];

const LEGUMES = [
  "Brocoli", "Épinards", "Courgette", "Haricots verts", "Carottes", "Poivrons",
  "Tomates", "Chou-fleur", "Salade verte", "Champignons", "Aubergine", "Poireau",
];

const LIMITATIONS: Record<string, string> = {
  diabete_t2: "Privilégier les glucides à index glycémique bas, toujours associés à des fibres "
    + "ou des protéines. Éviter les boissons sucrées et les glucides isolés.",
  hypertension: "Limiter le sel ajouté (moins de 5 g/jour), les charcuteries et les plats "
    + "industriels. Augmenter les apports en potassium (légumes, légumineuses).",
  cholesterol: "Privilégier les graisses insaturées (olive, colza, poissons gras) et limiter "
    + "les graisses saturées et les produits ultra-transformés.",
  syndrome_intestin_irritable: "Approche pauvre en FODMAPs à tester : limiter oignon, ail, blé, "
    + "légumineuses en grande quantité et édulcorants en -ol.",
  petit_budget: "Prioriser œufs, légumineuses sèches, flocons d'avoine, légumes surgelés et "
    + "poisson en conserve : le meilleur rapport protéines/prix.",
};

function filtrer(sources: [string, string[]][], p: Profil): string[] {
  const c = [...(p.contraintesAlimentaires as string[])];
  if (c.includes("vegan")) c.push("vegetarien");
  return sources.filter(([, tags]) => !tags.some((t) => c.includes(t))).map(([nom]) => nom);
}

export function profilAlimentaire(p: Profil) {
  const proteines = filtrer(SOURCES_PROTEINES, p);
  const alertes: string[] = [];

  if (contrainte(p, "vegan")) {
    alertes.push("Régime vegan : la supplémentation en vitamine B12 est indispensable. "
      + "Surveiller le fer, le zinc, l'iode et les oméga-3 (EPA/DHA d'algues).");
  }
  if (contrainte(p, "vegetarien") && !contrainte(p, "vegan")) {
    alertes.push("Régime végétarien : surveiller le fer (à associer à de la vitamine C) et la B12.");
  }
  if (contrainte(p, "sans_lactose")) {
    alertes.push("Sans lactose : compenser le calcium (boissons végétales enrichies, amandes, "
      + "sardines, légumes verts).");
  }
  if (contrainte(p, "sans_gluten")) {
    alertes.push("Sans gluten : varier les féculents (riz, sarrasin, quinoa, pomme de terre) "
      + "pour éviter la monotonie et le manque de fibres.");
  }
  if (proteines.length < 4) {
    alertes.push("Peu de sources protéiques compatibles : atteindre la cible demandera de la "
      + "poudre de protéine végétale ou une planification serrée.");
  }
  for (const c of p.contraintesAlimentaires as string[]) {
    if (LIMITATIONS[c]) alertes.push(LIMITATIONS[c]);
  }
  if (contrainte(p, "diabete_t2", "hypertension", "cholesterol")) {
    alertes.push("Pathologie déclarée : ce plan ne remplace pas un suivi médical. "
      + "Une validation par un médecin ou un diététicien est nécessaire.");
  }

  return {
    proteines,
    glucides: filtrer(SOURCES_GLUCIDES, p),
    lipides: filtrer(SOURCES_LIPIDES, p),
    legumes: LEGUMES,
    alertes,
  };
}

/** Traduit niveau de cuisine, temps et lieu en consignes applicables. */
export function strategiePratique(
  p: Profil, d: Derive,
  budget: { batchCooking: boolean; jourBatch: string; sessionBatch: number; cuisineParRepas: number; strategie: string; totalJour: number },
) {
  const cx = { nul: 1, debutant: 2, moyen: 3, bon: 4, chef: 5 }[p.niveauCuisine];
  const t = p.tempsCuisine;

  let styleCulinaire: string;
  if (cx <= 1 || t < 20) {
    styleCulinaire = "Assemblage sans cuisson : produits prêts à l'emploi, conserves, surgelés "
      + "nature, œufs durs, féculents précuits. Aucune recette à suivre.";
  } else if (cx === 2) {
    styleCulinaire = "Recettes en une poêle ou un plat au four : 3 à 4 ingrédients, cuissons "
      + "simples, assaisonnement standardisé.";
  } else if (cx === 3) {
    styleCulinaire = "Recettes classiques en 20 à 30 min, avec batch cooking des bases.";
  } else {
    styleCulinaire = "Cuisine libre : varier les techniques et les épices, batch cooking optimisé.";
  }

  const conseils: string[] = [];
  if (budget.batchCooking) {
    conseils.push(
      `Batch cooking le ${budget.jourBatch} (${budget.sessionBatch} min) : cuire en une fois les `
      + `féculents, les protéines et les légumes rôtis pour 3 à 4 jours. Le reste de la semaine se `
      + `limite à l'assemblage, soit ${budget.cuisineParRepas} min par repas.`,
    );
  }

  const parLieu: Record<string, string> = {
    bureau_micro_ondes: "Déjeuner au bureau avec micro-ondes : boîtes hermétiques préparées la "
      + "veille, réchauffage de 2 à 3 min, sauce à part pour préserver la texture.",
    bureau_sans_cuisine: "Pas de réchauffage possible : privilégier les repas froids complets "
      + "(salades de féculents, wraps, poke bowls, conserves de poisson) en sac isotherme.",
    restaurant_cantine: "Restaurant ou cantine : appliquer la règle de l'assiette — la moitié en "
      + "légumes, un quart en protéines grillées plutôt que frites, un quart en féculents. "
      + "Sauces à part, pain limité, eau comme boisson.",
    exterieur_nomade: "Repas nomades : constituer un kit fixe (fruits secs, conserves de thon, "
      + "galettes de riz, fromage blanc en gourde, fruits) pour ne jamais dépendre de l'offre.",
    mixte: "Lieux variables : garder une structure de repas identique quel que soit le lieu "
      + "(une protéine, un féculent, des légumes) ; seule la forme change.",
  };
  if (parLieu[p.lieuRepas]) conseils.push(parLieu[p.lieuRepas]);

  if (contrainte(p, "petit_budget")) {
    conseils.push("Budget contraint : acheter les protéines en gros et congeler, privilégier les "
      + "légumes surgelés et les légumineuses sèches.");
  }
  if (d.fenetreMatin < 30) {
    conseils.push("Matin très court : préparer le petit-déjeuner la veille (overnight oats, "
      + "pudding de chia, omelette froide).");
  }

  return { styleCulinaire, conseils, niveauComplexite: cx, ...budget };
}

/** Le plan initial n'est qu'une hypothèse : voici comment le corriger. */
export function reglesAjustement(p: Profil): string[] {
  const r: string[] = [
    "Se peser le matin à jeun, après passage aux toilettes, 3 à 4 fois par semaine. Ne comparer "
    + "que des moyennes hebdomadaires : les variations quotidiennes reflètent l'eau, pas la graisse.",
  ];

  if (p.objectif === "perte_de_gras") {
    r.push(
      `Rythme cible : de -${rndTo(p.poids * 0.005, 2)} à -${rndTo(p.poids * 0.01, 2)} kg par semaine `
      + `(0,5 à 1 % du poids). En cas de stagnation sur 2 semaines, retirer 150 à 200 kcal ou `
      + `ajouter 2 000 pas par jour.`,
    );
    r.push("Si la perte dépasse 1 % du poids par semaine, remonter les calories : une perte trop "
      + "rapide s'accompagne d'une fonte musculaire.");
  } else if (p.objectif === "prise_de_muscle" || p.objectif === "force") {
    r.push(
      `Rythme cible : de +${rndTo(p.poids * 0.0025, 2)} à +${rndTo(p.poids * 0.005, 2)} kg par semaine. `
      + `Au-delà, la prise devient majoritairement grasse : réduire le surplus de 150 kcal.`,
    );
    r.push("Si le poids stagne 2 semaines, ajouter 200 kcal, principalement en glucides autour "
      + "de l'entraînement.");
  } else if (p.objectif === "recomposition") {
    r.push("En recomposition, le poids peut rester stable alors que la composition change. "
      + "Suivre les mensurations (taille, bras) et les performances plutôt que la balance.");
  } else {
    r.push("Objectif non pondéral : suivre les performances (charges, allures, récupération) "
      + "plutôt que le poids.");
  }

  r.push("Signaux d'alerte : fatigue persistante, sommeil dégradé, perte de force sur 2 séances "
    + "consécutives, aménorrhée, humeur en berne. Dans ce cas, remonter les calories et consulter.");

  if (contrainte(p, "diabete_t2", "hypertension", "cholesterol")) {
    r.push("Tout changement alimentaire doit être coordonné avec le médecin traitant, en "
      + "particulier en cas de traitement en cours (les doses peuvent nécessiter un ajustement).");
  }
  return r;
}

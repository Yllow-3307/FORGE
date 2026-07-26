/**
 * aliments.ts — Base d'aliments courants pour le journal alimentaire.
 *
 * Valeurs pour 100 g (ou 100 ml pour les liquides), issues des tables de
 * composition usuelles. Ce sont des ordres de grandeur destinés au suivi
 * quotidien, pas des valeurs de laboratoire.
 */

export type CategorieAliment =
  | "proteines" | "feculents" | "legumes" | "fruits"
  | "matieres_grasses" | "produits_laitiers" | "boissons" | "en_cas";

export interface Aliment {
  id: string;
  nom: string;
  categorie: CategorieAliment;
  /** Valeurs pour 100 g / 100 ml. */
  kcal: number;
  proteines: number;
  glucides: number;
  lipides: number;
  /** Portion usuelle, pour éviter de peser systématiquement. */
  portion: number;
  portionNom: string;
  tags: string[];   // contraintes alimentaires incompatibles
}

export const ALIMENTS: Aliment[] = [
  // ------------------------------------------------------------ Protéines
  { id: "poulet", nom: "Blanc de poulet", categorie: "proteines", kcal: 165, proteines: 31, glucides: 0, lipides: 3.6, portion: 120, portionNom: "1 filet", tags: ["vegetarien", "vegan"] },
  { id: "dinde", nom: "Escalope de dinde", categorie: "proteines", kcal: 135, proteines: 29, glucides: 0, lipides: 1.9, portion: 120, portionNom: "1 escalope", tags: ["vegetarien", "vegan"] },
  { id: "boeuf", nom: "Steak de bœuf 5 %", categorie: "proteines", kcal: 158, proteines: 26, glucides: 0, lipides: 5, portion: 125, portionNom: "1 steak", tags: ["vegetarien", "vegan"] },
  { id: "porc", nom: "Filet mignon de porc", categorie: "proteines", kcal: 143, proteines: 26, glucides: 0, lipides: 4, portion: 120, portionNom: "1 portion", tags: ["vegetarien", "vegan", "halal", "casher", "sans_porc"] },
  { id: "jambon", nom: "Jambon blanc", categorie: "proteines", kcal: 110, proteines: 20, glucides: 1, lipides: 3, portion: 50, portionNom: "1 tranche", tags: ["vegetarien", "vegan", "halal", "casher", "sans_porc"] },
  { id: "saumon", nom: "Saumon", categorie: "proteines", kcal: 208, proteines: 20, glucides: 0, lipides: 13, portion: 130, portionNom: "1 pavé", tags: ["vegetarien", "vegan", "sans_poisson"] },
  { id: "cabillaud", nom: "Cabillaud", categorie: "proteines", kcal: 82, proteines: 18, glucides: 0, lipides: 0.7, portion: 130, portionNom: "1 filet", tags: ["vegetarien", "vegan", "sans_poisson"] },
  { id: "thon_conserve", nom: "Thon au naturel", categorie: "proteines", kcal: 116, proteines: 26, glucides: 0, lipides: 1, portion: 80, portionNom: "1 boîte", tags: ["vegetarien", "vegan", "sans_poisson"] },
  { id: "sardine", nom: "Sardines à l'huile", categorie: "proteines", kcal: 208, proteines: 25, glucides: 0, lipides: 11, portion: 80, portionNom: "1 boîte", tags: ["vegetarien", "vegan", "sans_poisson"] },
  { id: "oeuf", nom: "Œuf entier", categorie: "proteines", kcal: 143, proteines: 13, glucides: 1, lipides: 10, portion: 55, portionNom: "1 œuf", tags: ["vegan", "sans_oeuf"] },
  { id: "blanc_oeuf", nom: "Blanc d'œuf", categorie: "proteines", kcal: 52, proteines: 11, glucides: 0.7, lipides: 0.2, portion: 33, portionNom: "1 blanc", tags: ["vegan", "sans_oeuf"] },
  { id: "tofu", nom: "Tofu ferme", categorie: "proteines", kcal: 144, proteines: 15, glucides: 3, lipides: 8, portion: 100, portionNom: "1 portion", tags: [] },
  { id: "tempeh", nom: "Tempeh", categorie: "proteines", kcal: 192, proteines: 20, glucides: 8, lipides: 11, portion: 100, portionNom: "1 portion", tags: [] },
  { id: "lentilles", nom: "Lentilles cuites", categorie: "proteines", kcal: 116, proteines: 9, glucides: 20, lipides: 0.4, portion: 150, portionNom: "1 bol", tags: [] },
  { id: "pois_chiches", nom: "Pois chiches cuits", categorie: "proteines", kcal: 164, proteines: 9, glucides: 27, lipides: 2.6, portion: 150, portionNom: "1 bol", tags: [] },
  { id: "haricots_rouges", nom: "Haricots rouges cuits", categorie: "proteines", kcal: 127, proteines: 9, glucides: 22, lipides: 0.5, portion: 150, portionNom: "1 bol", tags: [] },
  { id: "whey", nom: "Whey en poudre", categorie: "proteines", kcal: 380, proteines: 78, glucides: 6, lipides: 5, portion: 30, portionNom: "1 dose", tags: ["vegan", "sans_lactose"] },
  { id: "proteine_pois", nom: "Protéine de pois", categorie: "proteines", kcal: 375, proteines: 80, glucides: 3, lipides: 5, portion: 30, portionNom: "1 dose", tags: [] },
  { id: "seitan", nom: "Seitan", categorie: "proteines", kcal: 143, proteines: 25, glucides: 6, lipides: 2, portion: 100, portionNom: "1 portion", tags: ["sans_gluten"] },

  // ------------------------------------------------------------ Féculents
  { id: "riz_complet", nom: "Riz complet cuit", categorie: "feculents", kcal: 123, proteines: 2.6, glucides: 26, lipides: 1, portion: 180, portionNom: "1 bol", tags: [] },
  { id: "riz_blanc", nom: "Riz blanc cuit", categorie: "feculents", kcal: 130, proteines: 2.4, glucides: 28, lipides: 0.3, portion: 180, portionNom: "1 bol", tags: [] },
  { id: "pates", nom: "Pâtes complètes cuites", categorie: "feculents", kcal: 124, proteines: 5, glucides: 25, lipides: 0.9, portion: 200, portionNom: "1 assiette", tags: ["sans_gluten"] },
  { id: "pain_complet", nom: "Pain complet", categorie: "feculents", kcal: 247, proteines: 9, glucides: 41, lipides: 3.4, portion: 50, portionNom: "2 tranches", tags: ["sans_gluten"] },
  { id: "patate_douce", nom: "Patate douce cuite", categorie: "feculents", kcal: 90, proteines: 2, glucides: 21, lipides: 0.1, portion: 200, portionNom: "1 moyenne", tags: [] },
  { id: "pomme_terre", nom: "Pomme de terre cuite", categorie: "feculents", kcal: 87, proteines: 2, glucides: 20, lipides: 0.1, portion: 200, portionNom: "2 moyennes", tags: [] },
  { id: "quinoa", nom: "Quinoa cuit", categorie: "feculents", kcal: 120, proteines: 4.4, glucides: 21, lipides: 1.9, portion: 180, portionNom: "1 bol", tags: [] },
  { id: "avoine", nom: "Flocons d'avoine", categorie: "feculents", kcal: 379, proteines: 13, glucides: 68, lipides: 7, portion: 60, portionNom: "1 bol", tags: [] },
  { id: "sarrasin", nom: "Sarrasin cuit", categorie: "feculents", kcal: 92, proteines: 3.4, glucides: 20, lipides: 0.6, portion: 180, portionNom: "1 bol", tags: [] },
  { id: "semoule", nom: "Semoule cuite", categorie: "feculents", kcal: 112, proteines: 3.8, glucides: 23, lipides: 0.2, portion: 180, portionNom: "1 bol", tags: ["sans_gluten"] },

  // -------------------------------------------------------------- Légumes
  { id: "brocoli", nom: "Brocoli", categorie: "legumes", kcal: 34, proteines: 2.8, glucides: 7, lipides: 0.4, portion: 150, portionNom: "1 portion", tags: [] },
  { id: "epinards", nom: "Épinards", categorie: "legumes", kcal: 23, proteines: 2.9, glucides: 3.6, lipides: 0.4, portion: 150, portionNom: "1 portion", tags: [] },
  { id: "courgette", nom: "Courgette", categorie: "legumes", kcal: 17, proteines: 1.2, glucides: 3.1, lipides: 0.3, portion: 200, portionNom: "1 moyenne", tags: [] },
  { id: "haricots_verts", nom: "Haricots verts", categorie: "legumes", kcal: 31, proteines: 1.8, glucides: 7, lipides: 0.1, portion: 200, portionNom: "1 portion", tags: [] },
  { id: "carotte", nom: "Carottes", categorie: "legumes", kcal: 41, proteines: 0.9, glucides: 10, lipides: 0.2, portion: 150, portionNom: "2 moyennes", tags: [] },
  { id: "tomate", nom: "Tomates", categorie: "legumes", kcal: 18, proteines: 0.9, glucides: 3.9, lipides: 0.2, portion: 150, portionNom: "2 moyennes", tags: [] },
  { id: "poivron", nom: "Poivron", categorie: "legumes", kcal: 31, proteines: 1, glucides: 6, lipides: 0.3, portion: 150, portionNom: "1 moyen", tags: [] },
  { id: "salade", nom: "Salade verte", categorie: "legumes", kcal: 15, proteines: 1.4, glucides: 2.9, lipides: 0.2, portion: 80, portionNom: "1 bol", tags: [] },
  { id: "champignons", nom: "Champignons", categorie: "legumes", kcal: 22, proteines: 3.1, glucides: 3.3, lipides: 0.3, portion: 150, portionNom: "1 portion", tags: [] },

  // --------------------------------------------------------------- Fruits
  { id: "banane", nom: "Banane", categorie: "fruits", kcal: 89, proteines: 1.1, glucides: 23, lipides: 0.3, portion: 120, portionNom: "1 moyenne", tags: [] },
  { id: "pomme", nom: "Pomme", categorie: "fruits", kcal: 52, proteines: 0.3, glucides: 14, lipides: 0.2, portion: 150, portionNom: "1 moyenne", tags: [] },
  { id: "orange", nom: "Orange", categorie: "fruits", kcal: 47, proteines: 0.9, glucides: 12, lipides: 0.1, portion: 150, portionNom: "1 moyenne", tags: [] },
  { id: "fruits_rouges", nom: "Fruits rouges", categorie: "fruits", kcal: 43, proteines: 1, glucides: 10, lipides: 0.3, portion: 125, portionNom: "1 bol", tags: [] },
  { id: "dattes", nom: "Dattes", categorie: "fruits", kcal: 282, proteines: 2.5, glucides: 75, lipides: 0.4, portion: 30, portionNom: "3 dattes", tags: [] },
  { id: "kiwi", nom: "Kiwi", categorie: "fruits", kcal: 61, proteines: 1.1, glucides: 15, lipides: 0.5, portion: 100, portionNom: "1 moyen", tags: [] },

  // ----------------------------------------------------- Matières grasses
  { id: "huile_olive", nom: "Huile d'olive", categorie: "matieres_grasses", kcal: 884, proteines: 0, glucides: 0, lipides: 100, portion: 10, portionNom: "1 c. à soupe", tags: [] },
  { id: "avocat", nom: "Avocat", categorie: "matieres_grasses", kcal: 160, proteines: 2, glucides: 9, lipides: 15, portion: 100, portionNom: "1/2 avocat", tags: [] },
  { id: "amandes", nom: "Amandes", categorie: "matieres_grasses", kcal: 579, proteines: 21, glucides: 22, lipides: 50, portion: 30, portionNom: "1 poignée", tags: ["sans_fruits_a_coque"] },
  { id: "noix", nom: "Noix", categorie: "matieres_grasses", kcal: 654, proteines: 15, glucides: 14, lipides: 65, portion: 30, portionNom: "1 poignée", tags: ["sans_fruits_a_coque"] },
  { id: "beurre_cacahuete", nom: "Beurre de cacahuète", categorie: "matieres_grasses", kcal: 588, proteines: 25, glucides: 20, lipides: 50, portion: 20, portionNom: "1 c. à soupe", tags: ["sans_fruits_a_coque"] },
  { id: "graines_courge", nom: "Graines de courge", categorie: "matieres_grasses", kcal: 559, proteines: 30, glucides: 11, lipides: 49, portion: 25, portionNom: "1 poignée", tags: [] },

  // ---------------------------------------------------- Produits laitiers
  { id: "fromage_blanc", nom: "Fromage blanc 0 %", categorie: "produits_laitiers", kcal: 47, proteines: 8, glucides: 4, lipides: 0.2, portion: 200, portionNom: "1 pot", tags: ["vegan", "sans_lactose"] },
  { id: "skyr", nom: "Skyr", categorie: "produits_laitiers", kcal: 63, proteines: 11, glucides: 4, lipides: 0.2, portion: 150, portionNom: "1 pot", tags: ["vegan", "sans_lactose"] },
  { id: "yaourt_grec", nom: "Yaourt grec", categorie: "produits_laitiers", kcal: 97, proteines: 9, glucides: 4, lipides: 5, portion: 150, portionNom: "1 pot", tags: ["vegan", "sans_lactose"] },
  { id: "lait", nom: "Lait demi-écrémé", categorie: "produits_laitiers", kcal: 46, proteines: 3.2, glucides: 4.8, lipides: 1.6, portion: 250, portionNom: "1 verre", tags: ["vegan", "sans_lactose"] },
  { id: "boisson_soja", nom: "Boisson de soja", categorie: "produits_laitiers", kcal: 43, proteines: 3.3, glucides: 2.6, lipides: 1.8, portion: 250, portionNom: "1 verre", tags: [] },
  { id: "comte", nom: "Comté", categorie: "produits_laitiers", kcal: 410, proteines: 27, glucides: 0, lipides: 34, portion: 30, portionNom: "1 portion", tags: ["vegan", "sans_lactose"] },

  // -------------------------------------------------------------- En-cas
  { id: "chocolat_noir", nom: "Chocolat noir 70 %", categorie: "en_cas", kcal: 598, proteines: 7.8, glucides: 46, lipides: 43, portion: 20, portionNom: "2 carrés", tags: [] },
  { id: "galette_riz", nom: "Galette de riz", categorie: "en_cas", kcal: 387, proteines: 8, glucides: 82, lipides: 3, portion: 20, portionNom: "2 galettes", tags: [] },
  { id: "barre_cereales", nom: "Barre de céréales", categorie: "en_cas", kcal: 400, proteines: 6, glucides: 65, lipides: 12, portion: 30, portionNom: "1 barre", tags: [] },
  { id: "houmous", nom: "Houmous", categorie: "en_cas", kcal: 166, proteines: 8, glucides: 14, lipides: 10, portion: 50, portionNom: "2 c. à soupe", tags: [] },
];

/** Filtre les aliments incompatibles avec les contraintes déclarées. */
export function alimentsCompatibles(contraintes: string[]): Aliment[] {
  const c = [...contraintes];
  if (c.includes("vegan")) c.push("vegetarien");
  return ALIMENTS.filter((a) => !a.tags.some((t) => c.includes(t)));
}

export function alimentParId(id: string): Aliment | undefined {
  return ALIMENTS.find((a) => a.id === id);
}

export const CATEGORIES: { id: CategorieAliment; nom: string; emoji: string }[] = [
  { id: "proteines", nom: "Protéines", emoji: "🍗" },
  { id: "feculents", nom: "Féculents", emoji: "🍚" },
  { id: "legumes", nom: "Légumes", emoji: "🥦" },
  { id: "fruits", nom: "Fruits", emoji: "🍎" },
  { id: "matieres_grasses", nom: "Matières grasses", emoji: "🥑" },
  { id: "produits_laitiers", nom: "Laitiers", emoji: "🥛" },
  { id: "en_cas", nom: "En-cas", emoji: "🍫" },
];

/** Calcule les apports d'une quantité donnée. */
export function apports(aliment: Aliment, grammes: number) {
  const k = grammes / 100;
  return {
    kcal: Math.round(aliment.kcal * k),
    proteines: Math.round(aliment.proteines * k * 10) / 10,
    glucides: Math.round(aliment.glucides * k * 10) / 10,
    lipides: Math.round(aliment.lipides * k * 10) / 10,
  };
}

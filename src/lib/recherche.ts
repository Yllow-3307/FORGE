/**
 * recherche.ts — Moteur de recherche approximative, générique et sans dépendance.
 *
 * Un `includes()` strict est trop rigide pour une saisie au pouce : « poule »
 * ne trouvait pas « Blanc de poulet », et la moindre lettre oubliée renvoyait
 * une liste vide. On note donc chaque candidat sur une échelle simple, du plus
 * franc (égalité exacte) au plus indulgent (sous-séquence de lettres).
 *
 * Toutes les fonctions sont PURES : aucun accès au DOM ni au localStorage.
 * Ce module est réutilisable tel quel pour les exercices, les skills, etc.
 */

/* ----------------------------------------------------------- Normalisation */

/**
 * Ligatures et apostrophes que la décomposition Unicode NFKD laisse
 * intactes : « Œuf » reste « œuf », donc « oeuf » ne le trouverait jamais.
 * On les déplie donc à la main, sinon la moitié de la base d'aliments
 * (œuf, cœur, bœuf…) resterait inaccessible au clavier.
 */
const EQUIVALENCES: Record<string, string> = {
  "œ": "oe",
  "æ": "ae",
  "ß": "ss",
  "ø": "o",
  "’": "'",
  "‘": "'",
  "\u02bc": "'",
};

/**
 * Normalise UN caractère. Le résultat peut compter plusieurs lettres
 * (« œ » → « oe ») : c'est volontaire, et `indexer()` s'en accommode pour
 * garder la correspondance avec le texte d'origine.
 */
function normaliserCaractere(caractere: string): string {
  const bas = caractere.toLowerCase();
  return EQUIVALENCES[bas] ?? bas.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * Minuscules + NFKD + suppression des diacritiques + trim + espaces réduits.
 * « Pâtes  complètes » et « PATES COMPLETES » deviennent la même chaîne.
 */
export function normaliser(s: string): string {
  let sortie = "";
  for (const caractere of s) sortie += normaliserCaractere(caractere);
  return sortie.trim().replace(/\s+/g, " ");
}

/** Découpe en mots : espaces, tirets et apostrophes. */
function mots(cible: string): string[] {
  return cible.split(/[\s\-']+/).filter(Boolean);
}

/* ------------------------------------------------------------------ Score */

/**
 * Correspondance approximative : toutes les lettres de la requête
 * apparaissent-elles dans l'ordre dans la cible ?
 *
 * Retourne un bonus de proximité dans [0, 99] — plus les lettres trouvées
 * sont resserrées, plus le bonus est élevé — ou `null` si aucune
 * sous-séquence n'existe.
 */
function bonusSousSequence(requete: string, cible: string): number | null {
  let precedent = -1;
  let ecart = 0;

  for (const lettre of requete) {
    if (lettre === " ") continue;   // les espaces ne comptent pas comme des lettres
    const position = cible.indexOf(lettre, precedent + 1);
    if (position === -1) return null;
    if (precedent >= 0) ecart += position - precedent - 1;
    precedent = position;
  }
  if (precedent === -1) return null;

  // 1 / (1 + écart) : contigu → 99, très dispersé → proche de 0.
  return Math.round(99 / (1 + ecart));
}

/**
 * Note la pertinence de `cible` pour `requete`, du plus fort au plus faible :
 *
 *   1000 — égalité exacte
 *    800 — la cible commence par la requête
 *    600 — un mot de la cible commence par la requête
 *    400 — la cible contient la requête
 *    200 — sous-séquence (+ bonus de proximité)
 *      0 — aucune correspondance
 *
 * Puis −1 point par caractère de cible : à niveau égal, le nom le plus court
 * gagne (« Œuf entier » passe devant « Œufs brouillés à la poêle »).
 */
export function score(requete: string, cible: string): number {
  const q = normaliser(requete);
  const c = normaliser(cible);
  if (!q || !c) return 0;

  let base: number;

  if (q === c) base = 1000;
  else if (c.startsWith(q)) base = 800;
  else if (mots(c).some((mot) => mot.startsWith(q))) base = 600;
  else if (c.includes(q)) base = 400;
  else {
    const bonus = bonusSousSequence(q, c);
    if (bonus === null) return 0;
    base = 200 + bonus;   // au plus 299 : jamais devant un vrai « contient »
  }

  return base - c.length;
}

/* --------------------------------------------------------------- Recherche */

/**
 * Trie `items` par pertinence décroissante sur la clé fournie.
 * Requête vide → les premiers éléments, dans leur ordre d'origine.
 */
export function rechercher<T>(
  items: T[],
  requete: string,
  cle: (t: T) => string,
  limite = 20,
): T[] {
  if (!normaliser(requete)) return items.slice(0, limite);

  return items
    .map((item) => ({ item, note: score(requete, cle(item)) }))
    .filter((x) => x.note > 0)
    // Array.prototype.sort est stable : à note égale, l'ordre de la base est conservé.
    .sort((a, b) => b.note - a.note)
    .slice(0, limite)
    .map((x) => x.item);
}

/* ------------------------------------------------------------ Surlignage */

export interface Tranche {
  /** Index de début dans le texte ORIGINAL (accents et ligatures compris). */
  debut: number;
  /** Index de fin, exclu. */
  fin: number;
}

/**
 * Table de correspondance entre le texte normalisé et le texte d'origine :
 * chaque caractère normalisé pointe vers l'intervalle qu'il occupe dans la
 * chaîne d'origine. Sans elle, surligner « oeuf » dans « Œuf entier »
 * décalerait tout le reste du nom.
 */
function indexer(texte: string): { normalise: string; positions: Tranche[] } {
  let normalise = "";
  const positions: Tranche[] = [];
  let debut = 0;

  for (const caractere of texte) {
    const fin = debut + caractere.length;
    const remplacement = normaliserCaractere(caractere);
    // Itération par unité de code : `positions` doit rester aligné sur les
    // index que renverra `indexOf` sur la chaîne normalisée.
    for (let i = 0; i < remplacement.length; i++) {
      normalise += remplacement[i];
      positions.push({ debut, fin });
    }
    debut = fin;
  }
  return { normalise, positions };
}

/** Fusionne les tranches contiguës ou qui se chevauchent. */
function fusionner(tranches: Tranche[]): Tranche[] {
  const sortie: Tranche[] = [];
  for (const t of tranches) {
    const derniere = sortie[sortie.length - 1];
    if (derniere && t.debut <= derniere.fin) derniere.fin = Math.max(derniere.fin, t.fin);
    else sortie.push({ ...t });
  }
  return sortie;
}

/**
 * Portions de `texte` (indices d'origine) correspondant à `requete`.
 *
 * D'abord la correspondance franche — la requête apparaît telle quelle —,
 * sinon les lettres retrouvées dans l'ordre. Insensible à la casse et aux
 * accents dans les deux sens : « pate » surligne « Pâte », « pâte » surligne
 * « pate ».
 */
export function tranchesCorrespondance(texte: string, requete: string): Tranche[] {
  const q = normaliser(requete);
  if (!q) return [];

  const { normalise, positions } = indexer(texte);

  const direct = normalise.indexOf(q);
  if (direct >= 0) {
    return [{ debut: positions[direct].debut, fin: positions[direct + q.length - 1].fin }];
  }

  const trouvees: Tranche[] = [];
  let curseur = -1;
  for (const lettre of q) {
    if (lettre === " ") continue;
    const position = normalise.indexOf(lettre, curseur + 1);
    if (position === -1) return [];
    trouvees.push(positions[position]);
    curseur = position;
  }
  return fusionner(trouvees);
}

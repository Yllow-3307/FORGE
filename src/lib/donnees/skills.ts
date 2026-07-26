/**
 * skills.ts — Catalogue des figures de callisthénie et de leurs paliers.
 *
 * Chaque skill est une échelle d'étapes ordonnées : on ne « travaille » pas
 * un front lever, on travaille l'étape où l'on se trouve. Le critère de
 * validation est volontairement mesurable (secondes tenues, répétitions
 * propres) pour que la progression ne dépende pas du ressenti.
 */

import type { Equipement, PatternMoteur } from "@/lib/moteur/types";

export type FamilleSkill = "tirage" | "poussee" | "gainage" | "jambes" | "equilibre";

export interface EtapeSkill {
  nom: string;
  critere: string;          // condition objective pour valider l'étape
  conseil: string;          // le point technique qui débloque la progression
}

export interface Skill {
  id: string;
  nom: string;
  emoji: string;
  famille: FamilleSkill;
  /** 1 = accessible à un débutant, 5 = figure d'expert. */
  difficulte: 1 | 2 | 3 | 4 | 5;
  materiel: Equipement[];
  patterns: PatternMoteur[];   // ce que le skill développe
  description: string;
  prerequis: string;
  etapes: EtapeSkill[];
}

export const SKILLS: Skill[] = [
  // ----------------------------------------------------------------- TIRAGE
  {
    id: "traction",
    nom: "Traction stricte",
    emoji: "🎯",
    famille: "tirage",
    difficulte: 1,
    materiel: ["barre_traction"],
    patterns: ["traction_verticale"],
    description:
      "La base de tout le haut du corps. Tant qu'elle n'est pas solide, les figures "
      + "avancées de tirage restent hors de portée.",
    prerequis: "Aucun",
    etapes: [
      {
        nom: "Suspension passive",
        critere: "Tenir 30 s suspendu, bras tendus",
        conseil: "Épaules actives : on ne pend pas dans les articulations, on garde une légère tension.",
      },
      {
        nom: "Tirage australien",
        critere: "3 × 10 répétitions, corps gainé",
        conseil: "Plus le corps est horizontal, plus c'est dur : ajustez l'angle plutôt que de tricher.",
      },
      {
        nom: "Traction négative",
        critere: "5 descentes contrôlées de 5 s",
        conseil: "La phase excentrique construit la force : ne lâchez jamais la descente.",
      },
      {
        nom: "Première traction",
        critere: "1 traction complète, menton au-dessus de la barre",
        conseil: "Démarrez par une rétraction des omoplates avant de plier les bras.",
      },
      {
        nom: "Traction maîtrisée",
        critere: "3 × 8 tractions strictes sans élan",
        conseil: "Amplitude complète : bras tendus en bas, menton franchement au-dessus en haut.",
      },
    ],
  },
  {
    id: "muscle_up",
    nom: "Muscle-up",
    emoji: "🚀",
    famille: "tirage",
    difficulte: 4,
    materiel: ["barre_traction"],
    patterns: ["traction_verticale", "poussee_verticale"],
    description:
      "Passer au-dessus de la barre en un mouvement. Combine une traction explosive "
      + "et une transition technique souvent sous-estimée.",
    prerequis: "10 tractions strictes et 10 dips",
    etapes: [
      {
        nom: "Traction explosive",
        critere: "Traction jusqu'au bas de la poitrine",
        conseil: "Le muscle-up se gagne sur la hauteur de traction, pas sur la force de bras.",
      },
      {
        nom: "Transition assistée",
        critere: "5 transitions avec élastique",
        conseil: "Le poignet bascule tôt : ne restez pas sous la barre en position de traction.",
      },
      {
        nom: "Muscle-up négatif",
        critere: "3 descentes contrôlées depuis l'appui",
        conseil: "Descendez lentement en repassant exactement par la transition.",
      },
      {
        nom: "Muscle-up avec élan",
        critere: "1 muscle-up en kipping propre",
        conseil: "L'élan aide la transition mais ne doit pas remplacer la traction.",
      },
      {
        nom: "Muscle-up strict",
        critere: "3 muscle-ups stricts consécutifs",
        conseil: "Sans élan de jambes : la force et la technique font tout le travail.",
      },
    ],
  },
  {
    id: "front_lever",
    nom: "Front lever",
    emoji: "🪂",
    famille: "gainage",
    difficulte: 5,
    materiel: ["barre_traction"],
    patterns: ["traction_horizontale", "gainage_anterieur"],
    description:
      "Corps horizontal sous la barre, face au ciel. L'un des tests de force de "
      + "tirage et de gainage les plus exigeants.",
    prerequis: "8 tractions strictes et un gainage solide",
    etapes: [
      {
        nom: "Tuck front lever",
        critere: "Tenir 15 s genoux repliés",
        conseil: "Bras tendus et dos plat : sortez la poitrine, ne vous laissez pas enrouler.",
      },
      {
        nom: "Advanced tuck",
        critere: "Tenir 12 s dos à plat, hanches ouvertes",
        conseil: "L'ouverture de hanche augmente brutalement le levier : progressez par petits degrés.",
      },
      {
        nom: "One leg front lever",
        critere: "Tenir 10 s, une jambe tendue",
        conseil: "Alternez les jambes pour éviter d'installer une asymétrie.",
      },
      {
        nom: "Straddle front lever",
        critere: "Tenir 8 s jambes écartées",
        conseil: "Plus les jambes sont écartées, plus le levier est court : élargissez au maximum.",
      },
      {
        nom: "Full front lever",
        critere: "Tenir 5 s corps totalement aligné",
        conseil: "Gainage complet : fessiers serrés, bassin en rétroversion.",
      },
    ],
  },
  {
    id: "back_lever",
    nom: "Back lever",
    emoji: "🔄",
    famille: "gainage",
    difficulte: 4,
    materiel: ["barre_traction"],
    patterns: ["gainage_posterieur", "traction_horizontale"],
    description:
      "Corps horizontal, face au sol, sous la barre. Sollicite fortement les épaules "
      + "en extension : la progression doit être prudente.",
    prerequis: "Bonne mobilité d'épaule et 8 tractions",
    etapes: [
      { nom: "Skin the cat", critere: "3 rotations complètes contrôlées",
        conseil: "Amplitude progressive : ne forcez jamais sur l'épaule en fin de rotation." },
      { nom: "Tuck back lever", critere: "Tenir 20 s genoux repliés",
        conseil: "Bras tendus en permanence, regard vers le sol." },
      { nom: "Advanced tuck", critere: "Tenir 15 s dos à plat", conseil: "Ouvrez les hanches très graduellement." },
      { nom: "Straddle back lever", critere: "Tenir 10 s jambes écartées",
        conseil: "Gardez les bras verrouillés : toute flexion fausse la position." },
      { nom: "Full back lever", critere: "Tenir 5 s corps aligné",
        conseil: "Position exigeante pour les biceps et les épaules : échauffez-les longuement." },
    ],
  },
  {
    id: "traction_un_bras",
    nom: "Traction à un bras",
    emoji: "💪",
    famille: "tirage",
    difficulte: 5,
    materiel: ["barre_traction"],
    patterns: ["traction_verticale"],
    description: "Le sommet de la force de tirage relative. Demande des années de pratique régulière.",
    prerequis: "15 tractions strictes et un poids de corps maîtrisé",
    etapes: [
      { nom: "Traction lestée", critere: "5 tractions avec 30 % du poids de corps",
        conseil: "La force absolue prépare la traction unilatérale." },
      { nom: "Traction archer", critere: "3 par côté", conseil: "Le bras tendu assiste : réduisez son aide progressivement." },
      { nom: "Traction assistée serviette", critere: "3 par côté, main sur une serviette",
        conseil: "Descendez la main d'assistance le long de la serviette au fil des semaines." },
      { nom: "Négative à un bras", critere: "3 descentes de 5 s par bras",
        conseil: "Protégez le coude : arrêtez au moindre signal douloureux." },
      { nom: "Traction à un bras", critere: "1 répétition complète par bras",
        conseil: "Gainage total du corps pour éviter la rotation." },
    ],
  },

  // ---------------------------------------------------------------- POUSSÉE
  {
    id: "pompe",
    nom: "Pompe stricte",
    emoji: "🧱",
    famille: "poussee",
    difficulte: 1,
    materiel: [],
    patterns: ["poussee_horizontale"],
    description: "Le mouvement de poussée fondamental, base de toutes les variantes avancées.",
    prerequis: "Aucun",
    etapes: [
      { nom: "Pompe au mur", critere: "3 × 15 répétitions", conseil: "Corps parfaitement gainé, sans cambrure." },
      { nom: "Pompe inclinée", critere: "3 × 12 sur un support à hauteur de hanche",
        conseil: "Descendez le support au fil des semaines." },
      { nom: "Pompe genoux", critere: "3 × 12 répétitions", conseil: "Alignement genoux-hanches-épaules constant." },
      { nom: "Pompe complète", critere: "3 × 10 poitrine au sol", conseil: "Coudes à 45°, pas écartés à 90°." },
      { nom: "Pompe maîtrisée", critere: "3 × 20 répétitions strictes", conseil: "Tempo contrôlé : 2 s de descente." },
    ],
  },
  {
    id: "handstand",
    nom: "Équilibre sur les mains",
    emoji: "🤸",
    famille: "equilibre",
    difficulte: 4,
    materiel: [],
    patterns: ["skill", "poussee_verticale"],
    description:
      "L'équilibre est autant une compétence nerveuse qu'une affaire de force : "
      + "la régularité prime largement sur l'intensité.",
    prerequis: "Épaules et poignets sans douleur",
    etapes: [
      { nom: "Gainage inversé au mur", critere: "Tenir 45 s, ventre au mur",
        conseil: "Poussez le sol, épaules aux oreilles, bassin en rétroversion." },
      { nom: "Équilibre dos au mur", critere: "Tenir 60 s", conseil: "Corrigez la cambrure : c'est l'erreur la plus fréquente." },
      { nom: "Équilibre ventre au mur", critere: "Tenir 45 s", conseil: "Position la plus proche de l'alignement réel." },
      { nom: "Équilibre libre court", critere: "Tenir 10 s sans appui", conseil: "Corrigez avec les doigts, pas avec le dos." },
      { nom: "Équilibre libre", critere: "Tenir 30 s stable", conseil: "Travaillez quotidiennement, en séries courtes." },
    ],
  },
  {
    id: "hspu",
    nom: "Handstand push-up",
    emoji: "🔻",
    famille: "poussee",
    difficulte: 5,
    materiel: [],
    patterns: ["poussee_verticale"],
    description: "Poussée verticale au poids du corps : le développé militaire de la callisthénie.",
    prerequis: "Équilibre au mur tenu 45 s et 10 pike push-ups",
    etapes: [
      { nom: "Pike push-up", critere: "3 × 10 répétitions", conseil: "Bassin haut, tête qui passe derrière les mains." },
      { nom: "Pike pieds surélevés", critere: "3 × 8 répétitions", conseil: "Plus les pieds sont hauts, plus la charge est verticale." },
      { nom: "HSPU au mur partiel", critere: "5 répétitions en demi-amplitude", conseil: "Descendez progressivement plus bas." },
      { nom: "HSPU au mur complet", critere: "5 répétitions tête au sol", conseil: "Posez un coussin pour sécuriser la descente." },
      { nom: "HSPU libre", critere: "3 répétitions sans appui", conseil: "Combine équilibre et force : les deux doivent être acquis." },
    ],
  },
  {
    id: "planche",
    nom: "Planche",
    emoji: "✈️",
    famille: "equilibre",
    difficulte: 5,
    materiel: [],
    patterns: ["skill", "poussee_horizontale"],
    description:
      "Corps horizontal en appui sur les mains. L'une des figures les plus exigeantes, "
      + "très contraignante pour les poignets et les biceps.",
    prerequis: "Équilibre solide et poignets préparés",
    etapes: [
      { nom: "Lean planche", critere: "Tenir 30 s en inclinaison avant", conseil: "Protraction des épaules : arrondissez le haut du dos." },
      { nom: "Tuck planche", critere: "Tenir 20 s genoux repliés", conseil: "Bras tendus, verrouillés : c'est non négociable." },
      { nom: "Advanced tuck planche", critere: "Tenir 15 s dos plat", conseil: "Renforcez les poignets en parallèle du travail de force." },
      { nom: "Straddle planche", critere: "Tenir 8 s jambes écartées", conseil: "Progression très lente : comptez en mois, pas en semaines." },
      { nom: "Full planche", critere: "Tenir 5 s corps aligné", conseil: "Réservée aux pratiquants très avancés." },
    ],
  },
  {
    id: "dips",
    nom: "Dips",
    emoji: "⬇️",
    famille: "poussee",
    difficulte: 2,
    materiel: ["barres_paralleles"],
    patterns: ["poussee_verticale"],
    description: "Poussée verticale vers le bas, complément indispensable de la traction.",
    prerequis: "Épaules saines",
    etapes: [
      { nom: "Dips sur banc", critere: "3 × 12 pieds au sol", conseil: "Coudes proches du corps, épaules basses." },
      { nom: "Dips assistés", critere: "3 × 8 avec élastique", conseil: "Ne descendez pas plus bas que 90° au début." },
      { nom: "Dips négatifs", critere: "5 descentes de 5 s", conseil: "Contrôle total, sans à-coup en bas." },
      { nom: "Dips complets", critere: "3 × 8 répétitions", conseil: "Buste légèrement penché pour les pectoraux, droit pour les triceps." },
      { nom: "Dips lestés", critere: "5 répétitions avec 20 % du poids", conseil: "Ajoutez la charge progressivement." },
    ],
  },

  // ----------------------------------------------------------------- CORE
  {
    id: "l_sit",
    nom: "L-sit",
    emoji: "🪑",
    famille: "gainage",
    difficulte: 3,
    materiel: [],
    patterns: ["gainage_anterieur", "skill"],
    description: "Jambes tendues à l'horizontale en appui sur les mains. Test de gainage et de compression.",
    prerequis: "Gainage de base et ischio-jambiers souples",
    etapes: [
      { nom: "Support hold", critere: "Tenir 30 s bras tendus, pieds au sol", conseil: "Épaules basses, poussez le sol." },
      { nom: "Tuck L-sit", critere: "Tenir 20 s genoux repliés", conseil: "Décollez d'abord le bassin, pas les genoux." },
      { nom: "One leg L-sit", critere: "Tenir 15 s, une jambe tendue", conseil: "Alternez les côtés à chaque série." },
      { nom: "L-sit sur supports", critere: "Tenir 15 s sur parallettes", conseil: "Les supports facilitent : ils donnent de la hauteur." },
      { nom: "L-sit au sol", critere: "Tenir 10 s jambes tendues", conseil: "Demande de la compression active des hanches." },
    ],
  },
  {
    id: "dragon_flag",
    nom: "Dragon flag",
    emoji: "🐉",
    famille: "gainage",
    difficulte: 4,
    materiel: ["banc"],
    patterns: ["gainage_anterieur"],
    description: "Corps tendu à l'horizontale, en appui sur les épaules. Gainage antérieur extrême.",
    prerequis: "Planche tenue 60 s",
    etapes: [
      { nom: "Négative genoux repliés", critere: "5 descentes contrôlées", conseil: "Le bas du dos ne doit jamais se creuser." },
      { nom: "Tuck dragon flag", critere: "Tenir 15 s", conseil: "Poussez fort sur les épaules, pas sur la nuque." },
      { nom: "Une jambe tendue", critere: "Tenir 10 s par côté", conseil: "Bassin verrouillé en rétroversion." },
      { nom: "Négative complète", critere: "5 descentes corps tendu", conseil: "Descente de 5 s minimum." },
      { nom: "Dragon flag complet", critere: "3 répétitions complètes", conseil: "Montée et descente contrôlées." },
    ],
  },

  // ---------------------------------------------------------------- JAMBES
  {
    id: "pistol",
    nom: "Pistol squat",
    emoji: "🦵",
    famille: "jambes",
    difficulte: 3,
    materiel: [],
    patterns: ["squat"],
    description:
      "Squat complet sur une jambe. Exige autant de mobilité de cheville que de force.",
    prerequis: "20 squats au poids de corps et chevilles mobiles",
    etapes: [
      { nom: "Squat sur boîte", critere: "3 × 8 par jambe sur support haut", conseil: "Descendez la hauteur du support progressivement." },
      { nom: "Pistol assisté", critere: "3 × 5 par jambe avec appui des mains", conseil: "L'appui aide l'équilibre, pas la force." },
      { nom: "Pistol négatif", critere: "5 descentes de 5 s par jambe", conseil: "Talon au sol pendant toute la descente." },
      { nom: "Pistol partiel", critere: "3 par jambe en demi-amplitude", conseil: "La mobilité de cheville limite souvent plus que la force." },
      { nom: "Pistol complet", critere: "3 × 5 par jambe, amplitude totale", conseil: "Jambe libre tendue, sans toucher le sol." },
    ],
  },
  {
    id: "nordic",
    nom: "Nordic curl",
    emoji: "🔗",
    famille: "jambes",
    difficulte: 4,
    materiel: [],
    patterns: ["charniere"],
    description:
      "Flexion de genou excentrique. L'exercice le plus protecteur contre les "
      + "lésions des ischio-jambiers.",
    prerequis: "Ischio-jambiers renforcés",
    etapes: [
      { nom: "Pont fessier une jambe", critere: "3 × 12 par jambe", conseil: "Bassin haut et stable." },
      { nom: "Nordic assisté élastique", critere: "3 × 6 répétitions", conseil: "L'élastique soutient la descente." },
      { nom: "Nordic partiel", critere: "5 descentes à 45°", conseil: "Freinez le plus longtemps possible." },
      { nom: "Nordic négatif complet", critere: "5 descentes jusqu'au sol", conseil: "Rattrapez-vous avec les mains en fin de course." },
      { nom: "Nordic complet", critere: "3 répétitions avec remontée", conseil: "Très exigeant : espacez les séances de 72 h." },
    ],
  },
  {
    id: "human_flag",
    nom: "Human flag",
    emoji: "🏴",
    famille: "gainage",
    difficulte: 5,
    materiel: ["barre_traction"],
    patterns: ["gainage_lateral", "skill"],
    description: "Corps horizontal sur un poteau vertical. Force latérale et gainage oblique extrêmes.",
    prerequis: "Gainage latéral 60 s et épaules solides",
    etapes: [
      { nom: "Support vertical", critere: "Tenir 20 s corps vertical", conseil: "Bras du bas qui pousse, bras du haut qui tire." },
      { nom: "Tuck flag", critere: "Tenir 10 s genoux repliés", conseil: "La poussée du bras bas fait 70 % du travail." },
      { nom: "Flag une jambe", critere: "Tenir 8 s", conseil: "Étendez une jambe pour allonger le levier." },
      { nom: "Straddle flag", critere: "Tenir 6 s jambes écartées", conseil: "Écartez au maximum pour raccourcir le bras de levier." },
      { nom: "Full human flag", critere: "Tenir 5 s corps aligné", conseil: "Figure emblématique : la progression prend des années." },
    ],
  },
];

/* -------------------------------------------------------------- Sélecteurs */

export const skillParId = (id: string): Skill | undefined =>
  SKILLS.find((s) => s.id === id);

/** Skills réalisables avec le matériel disponible. */
export function skillsDisponibles(equipement: string[]): Skill[] {
  return SKILLS.filter((s) => s.materiel.every((m) => equipement.includes(m)));
}

/**
 * Skills pertinents pour un objectif donné.
 * Pour les objectifs non orientés figure, on propose les fondations.
 */
export function skillsRecommandes(objectif: string, niveau: string, equipement: string[]): Skill[] {
  const dispo = skillsDisponibles(equipement);
  const plafond: Record<string, number> = {
    sedentaire: 1, debutant: 2, intermediaire: 3, avance: 4, athlete: 5,
  };
  const max = plafond[niveau] ?? 2;

  if (objectif === "competition_street") {
    return dispo.filter((s) => s.difficulte <= Math.min(5, max + 1));
  }
  return dispo.filter((s) => s.difficulte <= max);
}

/**
 * Skills réellement travaillés par un programme.
 *
 * On croise les patterns moteur présents dans les séances avec ceux que
 * chaque skill développe : un programme riche en tirage vertical entraîne
 * de fait la traction, même si l'utilisateur ne l'a pas déclaré.
 *
 * Les figures nettement au-dessus du niveau sont écartées : le programme
 * n'y prépare que de très loin.
 */
export function skillsDuProgramme(
  patternsTravailles: string[],
  niveau: string,
  equipement: string[],
): Skill[] {
  const plafond: Record<string, number> = {
    sedentaire: 2, debutant: 3, intermediaire: 4, avance: 5, athlete: 5,
  };
  const max = plafond[niveau] ?? 3;
  const presents = new Set(patternsTravailles);

  return skillsDisponibles(equipement)
    .filter((s) => s.difficulte <= max)
    .filter((s) => s.patterns.some((p) => presents.has(p)))
    .sort((a, b) => a.difficulte - b.difficulte);
}

export const FAMILLES: { id: FamilleSkill; nom: string; emoji: string }[] = [
  { id: "tirage", nom: "Tirage", emoji: "🎯" },
  { id: "poussee", nom: "Poussée", emoji: "🧱" },
  { id: "gainage", nom: "Gainage", emoji: "🔥" },
  { id: "jambes", nom: "Jambes", emoji: "🦵" },
  { id: "equilibre", nom: "Équilibre", emoji: "🤸" },
];

/**
 * illustrations.tsx — Schémas d'exécution des mouvements les plus fréquents.
 *
 * Ce fichier NE FAIT PAS partie du périmètre de parité avec le moteur Python :
 * `src/lib/moteur/exercices.ts` est généré par `python3 sync_moteur.py` et ne
 * doit jamais être édité. Les illustrations vivent donc ici, indexées par le
 * nom exact de l'exercice, et sont raccordées à la bibliothèque par simple
 * correspondance de clé (aucun couplage, aucune modification amont).
 *
 * ---------------------------------------------------------------------------
 * ÉTAPE 1 — Inventaire réel de la bibliothèque (pas de devinette).
 *
 * Comptage effectué sur src/lib/moteur/exercices.ts (135 exercices) en
 * désérialisant le littéral `BIBLIOTHEQUE` puis en regroupant par `pattern` :
 *
 *   traction_verticale 13 · poussee_horizontale 12 · charniere 12
 *   isolation_bras 12 · poussee_verticale 11 · cardio 11
 *   traction_horizontale 10 · squat 10 · skill 10 · gainage_anterieur 8
 *   mobilite 7 · fente 5 · gainage_lateral 4 · gainage_posterieur 4
 *   anti_rotation 4 · mollets 2
 *
 * Filtre retenu pour les 20 mouvements les plus susceptibles d'être servis à
 * un utilisateur : `niveau` 1 ou 2, `improvise: false`, patterns de force
 * structurants (les patterns `cardio`, `mobilite` et `skill` sont écartés :
 * marche, vélo ou natation n'ont pas besoin de schéma d'exécution).
 *
 * Les 20 noms EXACTS, copiés depuis exercices.ts (accents et parenthèses
 * compris), vérifiés un par un par grep :
 *
 *   traction_verticale
 *     1. Tirage élastique vertical assis
 *     2. Traction assistée élastique
 *   traction_horizontale
 *     3. Rowing élastique assis
 *     4. Traction australienne (pieds au sol)
 *   poussee_horizontale
 *     5. Pompes contre un mur
 *     6. Pompes sur table / rebord
 *     7. Pompes genoux au sol
 *   poussee_verticale
 *     8. Pompes inclinées mains surélevées (pike)
 *     9. Dips sur banc/chaise (pieds au sol)
 *   squat
 *    10. Squat sur chaise (assis-debout)
 *    11. Squat poids de corps
 *   charniere
 *    12. Hip thrust au sol (pont fessier)
 *    13. Good morning élastique
 *   fente
 *    14. Fente statique appui
 *    15. Fente avant alternée
 *   gainage_anterieur
 *    16. Planche sur genoux
 *    17. Planche classique
 *   gainage_lateral
 *    18. Planche latérale genoux
 *   gainage_posterieur
 *    19. Superman au sol
 *   isolation_bras
 *    20. Curl élastique
 * ---------------------------------------------------------------------------
 *
 * Règles de dessin (homogènes, sans exception) :
 *   - viewBox "0 0 240 120", position de départ à x ≈ 60, position finale à
 *     x ≈ 180 ;
 *   - corps au trait seul : fill="none" stroke="currentColor" strokeWidth={3},
 *     donc lisible en thème clair comme en thème sombre ;
 *   - silhouette bâton : tête r=9, tronc, deux bras, deux jambes ;
 *   - matériel (sol, mur, barre, banc, élastique) en var(--text-faint),
 *     strokeWidth={2}, le sol en pointillés "4 4" ;
 *   - une flèche de mouvement en var(--accent), strokeWidth={2} ;
 *   - aucun texte dans le SVG : tout le verbe passe par `points`.
 */

import type { ReactNode } from "react";

export interface Illustration {
  /** Nom exact tel qu'il apparaît dans BIBLIOTHEQUE. */
  nom: string;
  /** Schéma : silhouette au trait, 2 positions (départ + fin). */
  svg: ReactNode;
  /** 2 à 3 points techniques, une phrase chacun. */
  points: string[];
}

/* ==========================================================================
   Primitives de dessin
   ========================================================================== */

type Pt = readonly [number, number];

interface Pose {
  /** Centre du cercle de la tête. */
  tete: Pt;
  /** Base du cou : départ du tronc et des deux bras. */
  cou: Pt;
  /** Bassin : fin du tronc et départ des deux jambes. */
  bassin: Pt;
  /** [coude, main] */
  brasG: readonly [Pt, Pt];
  brasD: readonly [Pt, Pt];
  /** [genou, pied] */
  jambeG: readonly [Pt, Pt];
  jambeD: readonly [Pt, Pt];
}

const ligne = (points: readonly Pt[]) => points.map((p) => `${p[0]},${p[1]}`).join(" ");

/** Silhouette bâton : tête, tronc, deux bras, deux jambes. Rien d'autre. */
function Silhouette({ tete, cou, bassin, brasG, brasD, jambeG, jambeD }: Pose) {
  return (
    <g>
      <circle cx={tete[0]} cy={tete[1]} r={9} />
      <polyline points={ligne([cou, bassin])} />
      <polyline points={ligne([cou, ...brasG])} />
      <polyline points={ligne([cou, ...brasD])} />
      <polyline points={ligne([bassin, ...jambeG])} />
      <polyline points={ligne([bassin, ...jambeD])} />
    </g>
  );
}

/** Matériel : barre, mur, banc, élastique. Toujours en retrait visuel. */
function Materiel({ children }: { children: ReactNode }) {
  return (
    <g stroke="var(--text-faint)" strokeWidth={2}>
      {children}
    </g>
  );
}

/** Sol : ligne pointillée pleine largeur. */
function Sol({ y = 110 }: { y?: number }) {
  return (
    <line
      x1={6}
      y1={y}
      x2={234}
      y2={y}
      stroke="var(--text-faint)"
      strokeWidth={2}
      strokeDasharray="4 4"
    />
  );
}

/** Flèche de mouvement entre les deux positions. */
function Fleche({
  de,
  vers,
  courbure = 0,
}: {
  de: Pt;
  vers: Pt;
  /** Décalage perpendiculaire du point de contrôle, pour une flèche arquée. */
  courbure?: number;
}) {
  const [x1, y1] = de;
  const [x2, y2] = vers;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const norme = Math.hypot(dx, dy) || 1;
  const cx = mx - (dy / norme) * courbure;
  const cy = my + (dx / norme) * courbure;
  const angle = Math.atan2(y2 - cy, x2 - cx);
  const pointe = (delta: number): Pt => [
    x2 - 8 * Math.cos(angle - delta),
    y2 - 8 * Math.sin(angle - delta),
  ];
  const a = pointe(0.45);
  const b = pointe(-0.45);

  return (
    <g stroke="var(--accent)" strokeWidth={2}>
      <path d={`M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`} />
      <polyline points={ligne([a, [x2, y2], b])} />
    </g>
  );
}

/** Cadre commun : viewBox, trait, rôle et titre francophone. */
function Schema({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 240 120"
      role="img"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{titre}</title>
      {children}
    </svg>
  );
}

/* ==========================================================================
   Poses réutilisables
   ========================================================================== */

/** Debout, bras le long du corps. */
const debout = (o: number): Pose => ({
  tete: [o, 26],
  cou: [o, 38],
  bassin: [o, 70],
  brasG: [[o - 10, 54], [o - 12, 70]],
  brasD: [[o + 10, 54], [o + 12, 70]],
  jambeG: [[o - 6, 90], [o - 8, 110]],
  jambeD: [[o + 6, 90], [o + 8, 110]],
});

/** Assis au sol, jambes tendues devant (côté droit de l'écran). */
const assisSol = (o: number, brasG: readonly [Pt, Pt], brasD: readonly [Pt, Pt]): Pose => ({
  tete: [o - 14, 52],
  cou: [o - 12, 64],
  bassin: [o - 6, 104],
  brasG,
  brasD,
  jambeG: [[o + 14, 106], [o + 34, 108]],
  jambeD: [[o + 14, 100], [o + 34, 102]],
});

/* ==========================================================================
   Bibliothèque d'illustrations
   ========================================================================== */

export const ILLUSTRATIONS: Record<string, Illustration> = {
  /* -------------------------------------------------- traction verticale */
  "Tirage élastique vertical assis": {
    nom: "Tirage élastique vertical assis",
    svg: (
      <Schema titre="Tirage élastique vertical assis : bras tendus au-dessus de la tête, puis coudes tirés vers le bas le long du buste.">
        <Sol />
        <Materiel>
          <line x1={40} y1={12} x2={92} y2={12} />
          <line x1={62} y1={12} x2={60} y2={26} strokeDasharray="3 3" />
          <line x1={76} y1={12} x2={74} y2={30} strokeDasharray="3 3" />
          <line x1={158} y1={12} x2={210} y2={12} />
          <line x1={180} y1={12} x2={182} y2={62} strokeDasharray="3 3" />
          <line x1={194} y1={12} x2={190} y2={66} strokeDasharray="3 3" />
        </Materiel>
        <Silhouette
          {...assisSol(60, [[54, 44], [60, 26]], [[60, 50], [74, 30]])}
        />
        <Silhouette
          {...assisSol(180, [[176, 78], [182, 62]], [[182, 82], [190, 66]])}
        />
        <Fleche de={[114, 34]} vers={[130, 60]} courbure={6} />
      </Schema>
    ),
    points: [
      "Gardez le buste haut et les épaules basses : ce sont les coudes qui descendent, pas le dos qui s'affaisse.",
      "Tirez jusqu'à ce que les mains arrivent au niveau des clavicules, puis remontez lentement en contrôlant l'élastique.",
      "Expirez pendant le tirage, inspirez pendant le retour ; évitez de compenser en partant en arrière.",
    ],
  },

  "Traction assistée élastique": {
    nom: "Traction assistée élastique",
    svg: (
      <Schema titre="Traction assistée par élastique : suspension bras tendus sous la barre, puis remontée menton à hauteur de barre.">
        <Materiel>
          <line x1={20} y1={18} x2={220} y2={18} />
          <line x1={48} y1={18} x2={54} y2={70} strokeDasharray="3 3" />
          <line x1={72} y1={18} x2={66} y2={70} strokeDasharray="3 3" />
        </Materiel>
        <Silhouette
          tete={[60, 44]}
          cou={[60, 56]}
          bassin={[60, 86]}
          brasG={[[54, 36], [48, 18]]}
          brasD={[[66, 36], [72, 18]]}
          jambeG={[[54, 100], [62, 112]]}
          jambeD={[[66, 100], [74, 112]]}
        />
        <Silhouette
          tete={[180, 30]}
          cou={[180, 42]}
          bassin={[180, 72]}
          brasG={[[164, 32], [168, 18]]}
          brasD={[[196, 32], [192, 18]]}
          jambeG={[[174, 88], [182, 100]]}
          jambeD={[[186, 88], [194, 100]]}
        />
        <Fleche de={[112, 70]} vers={[128, 44]} courbure={6} />
      </Schema>
    ),
    points: [
      "Placez un pied ou un genou dans l'élastique et partez bras tendus, épaules déjà engagées vers le bas.",
      "Montez jusqu'à ce que le menton dépasse la barre, sans donner de coup de jambes.",
      "Redescendez en trois secondes jusqu'aux bras tendus : la descente contrôlée fait la moitié du travail.",
    ],
  },

  /* ------------------------------------------------ traction horizontale */
  "Rowing élastique assis": {
    nom: "Rowing élastique assis",
    svg: (
      <Schema titre="Rowing élastique assis : bras tendus devant soi, puis coudes tirés en arrière le long des côtes.">
        <Sol />
        <Materiel>
          <line x1={88} y1={78} x2={100} y2={106} strokeDasharray="3 3" />
          <line x1={88} y1={84} x2={100} y2={102} strokeDasharray="3 3" />
          <line x1={162} y1={82} x2={220} y2={106} strokeDasharray="3 3" />
          <line x1={162} y1={88} x2={220} y2={102} strokeDasharray="3 3" />
        </Materiel>
        <Silhouette
          tete={[44, 52]}
          cou={[48, 64]}
          bassin={[56, 104]}
          brasG={[[70, 72], [88, 78]]}
          brasD={[[70, 78], [88, 84]]}
          jambeG={[[80, 106], [100, 108]]}
          jambeD={[[80, 100], [100, 102]]}
        />
        <Silhouette
          tete={[164, 52]}
          cou={[168, 64]}
          bassin={[176, 104]}
          brasG={[[152, 78], [162, 82]]}
          brasD={[[152, 84], [162, 88]]}
          jambeG={[[200, 106], [220, 108]]}
          jambeD={[[200, 100], [220, 102]]}
        />
        <Fleche de={[130, 46]} vers={[110, 46]} courbure={8} />
      </Schema>
    ),
    points: [
      "Asseyez-vous jambes tendues, buste vertical, élastique passé autour des pieds.",
      "Tirez les coudes vers l'arrière en serrant les omoplates, mains le long des côtes.",
      "Ne partez pas en arrière avec le buste : seul le bras bouge, le tronc reste gainé.",
    ],
  },

  "Traction australienne (pieds au sol)": {
    nom: "Traction australienne (pieds au sol)",
    svg: (
      <Schema titre="Traction australienne : corps oblique sous une barre basse, bras tendus, puis poitrine amenée à la barre.">
        <Sol />
        <Materiel>
          <line x1={40} y1={38} x2={92} y2={38} />
          <line x1={66} y1={38} x2={66} y2={110} />
          <line x1={160} y1={38} x2={212} y2={38} />
          <line x1={186} y1={38} x2={186} y2={110} />
        </Materiel>
        <Silhouette
          tete={[42, 58]}
          cou={[52, 62]}
          bassin={[80, 80]}
          brasG={[[50, 48], [58, 38]]}
          brasD={[[54, 50], [62, 38]]}
          jambeG={[[100, 92], [116, 106]]}
          jambeD={[[100, 86], [116, 100]]}
        />
        <Silhouette
          tete={[164, 44]}
          cou={[172, 50]}
          bassin={[198, 70]}
          brasG={[[176, 36], [180, 38]]}
          brasD={[[182, 40], [188, 38]]}
          jambeG={[[216, 86], [230, 106]]}
          jambeD={[[216, 80], [230, 100]]}
        />
        <Fleche de={[130, 78]} vers={[136, 56]} courbure={5} />
      </Schema>
    ),
    points: [
      "Alignez talons, bassin et épaules : le corps forme une planche oblique du début à la fin.",
      "Tirez jusqu'à toucher la barre avec le haut de la poitrine, coudes proches du corps.",
      "Plus les pieds sont avancés, plus le mouvement est difficile : reculez-les pour alléger.",
    ],
  },

  /* ------------------------------------------------- poussée horizontale */
  "Pompes contre un mur": {
    nom: "Pompes contre un mur",
    svg: (
      <Schema titre="Pompes contre un mur : corps incliné bras tendus face au mur, puis poitrine rapprochée du mur.">
        <Sol />
        <Materiel>
          <line x1={100} y1={10} x2={100} y2={110} />
          <line x1={220} y1={10} x2={220} y2={110} />
        </Materiel>
        <Silhouette
          tete={[62, 34]}
          cou={[66, 46]}
          bassin={[54, 80]}
          brasG={[[82, 48], [100, 50]]}
          brasD={[[82, 54], [100, 56]]}
          jambeG={[[48, 96], [42, 110]]}
          jambeD={[[50, 98], [46, 110]]}
        />
        <Silhouette
          tete={[192, 34]}
          cou={[194, 46]}
          bassin={[176, 78]}
          brasG={[[200, 62], [220, 50]]}
          brasD={[[202, 66], [220, 56]]}
          jambeG={[[168, 96], [162, 110]]}
          jambeD={[[170, 98], [166, 110]]}
        />
        <Fleche de={[126, 40]} vers={[150, 40]} courbure={6} />
      </Schema>
    ),
    points: [
      "Mains à hauteur d'épaules sur le mur, corps en ligne droite de la tête aux talons.",
      "Fléchissez les coudes vers l'arrière à 45°, poitrine près du mur, puis repoussez sans creuser le bas du dos.",
      "Reculez les pieds pour durcir l'exercice, rapprochez-les pour l'alléger.",
    ],
  },

  "Pompes sur table / rebord": {
    nom: "Pompes sur table / rebord",
    svg: (
      <Schema titre="Pompes sur un rebord : appui mains sur une table, bras tendus, puis descente de la poitrine vers le rebord.">
        <Sol />
        <Materiel>
          <line x1={22} y1={56} x2={92} y2={56} />
          <line x1={88} y1={56} x2={88} y2={110} />
          <line x1={142} y1={56} x2={212} y2={56} />
          <line x1={208} y1={56} x2={208} y2={110} />
        </Materiel>
        <Silhouette
          tete={[46, 36]}
          cou={[54, 44]}
          bassin={[76, 66]}
          brasG={[[46, 50], [40, 56]]}
          brasD={[[52, 52], [46, 56]]}
          jambeG={[[96, 82], [112, 106]]}
          jambeD={[[96, 76], [112, 100]]}
        />
        <Silhouette
          tete={[166, 48]}
          cou={[174, 54]}
          bassin={[196, 72]}
          brasG={[[172, 40], [162, 56]]}
          brasD={[[178, 44], [168, 56]]}
          jambeG={[[214, 88], [228, 108]]}
          jambeD={[[214, 82], [228, 102]]}
        />
        <Fleche de={[124, 52]} vers={[130, 70]} courbure={5} />
      </Schema>
    ),
    points: [
      "Vérifiez que le meuble est stable et ne glisse pas avant de poser les mains.",
      "Descendez jusqu'à frôler le rebord avec la poitrine, coudes à 45° du buste.",
      "Serrez fessiers et abdominaux : le bassin ne doit ni monter ni s'affaisser.",
    ],
  },

  "Pompes genoux au sol": {
    nom: "Pompes genoux au sol",
    svg: (
      <Schema titre="Pompes genoux au sol : appui mains et genoux bras tendus, puis descente de la poitrine vers le sol.">
        <Sol />
        <Silhouette
          tete={[30, 56]}
          cou={[40, 60]}
          bassin={[70, 76]}
          brasG={[[42, 78], [38, 108]]}
          brasD={[[46, 80], [42, 108]]}
          jambeG={[[80, 106], [102, 100]]}
          jambeD={[[82, 102], [104, 96]]}
        />
        <Silhouette
          tete={[152, 78]}
          cou={[162, 80]}
          bassin={[192, 86]}
          brasG={[[172, 92], [158, 108]]}
          brasD={[[176, 94], [162, 108]]}
          jambeG={[[202, 108], [224, 102]]}
          jambeD={[[204, 104], [226, 98]]}
        />
        <Fleche de={[120, 62]} vers={[126, 84]} courbure={5} />
      </Schema>
    ),
    points: [
      "Mains légèrement plus larges que les épaules, genoux, bassin et épaules alignés.",
      "Descendez jusqu'à ce que la poitrine soit à un poing du sol, coudes vers l'arrière.",
      "Inspirez à la descente, expirez à la poussée ; ne laissez pas la tête partir en avant.",
    ],
  },

  /* --------------------------------------------------- poussée verticale */
  "Pompes inclinées mains surélevées (pike)": {
    nom: "Pompes inclinées mains surélevées (pike)",
    svg: (
      <Schema titre="Pompes pike : bassin haut en V renversé, mains surélevées, puis descente du sommet du crâne vers les mains.">
        <Sol />
        <Materiel>
          <line x1={20} y1={84} x2={56} y2={84} />
          <line x1={140} y1={84} x2={176} y2={84} />
        </Materiel>
        <Silhouette
          tete={[34, 58]}
          cou={[44, 62]}
          bassin={[70, 38]}
          brasG={[[34, 72], [30, 84]]}
          brasD={[[40, 74], [36, 84]]}
          jambeG={[[86, 74], [92, 108]]}
          jambeD={[[92, 76], [98, 108]]}
        />
        <Silhouette
          tete={[150, 82]}
          cou={[162, 78]}
          bassin={[190, 38]}
          brasG={[[152, 88], [150, 84]]}
          brasD={[[158, 92], [156, 84]]}
          jambeG={[[206, 74], [212, 108]]}
          jambeD={[[212, 76], [218, 108]]}
        />
        <Fleche de={[112, 52]} vers={[126, 70]} courbure={5} />
      </Schema>
    ),
    points: [
      "Bassin haut, jambes tendues ou légèrement fléchies : le buste vient à la verticale des épaules.",
      "Descendez le sommet du crâne entre les mains, coudes dirigés vers l'arrière et non sur les côtés.",
      "Plus les mains sont hautes, plus l'exercice est facile : ajustez la hauteur du support.",
    ],
  },

  "Dips sur banc/chaise (pieds au sol)": {
    nom: "Dips sur banc/chaise (pieds au sol)",
    svg: (
      <Schema titre="Dips sur banc : mains derrière soi sur le banc, bras tendus, puis descente du bassin en fléchissant les coudes.">
        <Sol />
        <Materiel>
          <line x1={16} y1={62} x2={54} y2={62} />
          <line x1={20} y1={62} x2={20} y2={110} />
          <line x1={50} y1={62} x2={50} y2={110} />
          <line x1={136} y1={62} x2={174} y2={62} />
          <line x1={140} y1={62} x2={140} y2={110} />
          <line x1={170} y1={62} x2={170} y2={110} />
        </Materiel>
        <Silhouette
          tete={[56, 30]}
          cou={[58, 42]}
          bassin={[62, 74]}
          brasG={[[48, 52], [42, 62]]}
          brasD={[[52, 54], [46, 62]]}
          jambeG={[[86, 84], [104, 110]]}
          jambeD={[[86, 78], [104, 104]]}
        />
        <Silhouette
          tete={[178, 46]}
          cou={[180, 58]}
          bassin={[182, 90]}
          brasG={[[168, 52], [162, 62]]}
          brasD={[[172, 54], [166, 62]]}
          jambeG={[[206, 96], [222, 110]]}
          jambeD={[[206, 90], [222, 104]]}
        />
        <Fleche de={[112, 46]} vers={[118, 70]} courbure={5} />
      </Schema>
    ),
    points: [
      "Mains posées au bord du siège, doigts vers l'avant, bassin qui longe le banc.",
      "Descendez jusqu'à environ 90° au coude, coudes serrés vers l'arrière, épaules basses.",
      "Rapprochez les pieds pour alléger, tendez les jambes pour rendre le mouvement plus dur.",
    ],
  },

  /* ------------------------------------------------------------- squat */
  "Squat sur chaise (assis-debout)": {
    nom: "Squat sur chaise (assis-debout)",
    svg: (
      <Schema titre="Squat sur chaise : position assise sur le bord de la chaise, puis passage en position debout.">
        <Sol />
        <Materiel>
          <line x1={40} y1={80} x2={82} y2={80} />
          <line x1={80} y1={80} x2={80} y2={110} />
          <line x1={80} y1={80} x2={80} y2={44} />
          <line x1={160} y1={80} x2={202} y2={80} />
          <line x1={200} y1={80} x2={200} y2={110} />
          <line x1={200} y1={80} x2={200} y2={44} />
        </Materiel>
        <Silhouette
          tete={[56, 40]}
          cou={[58, 52]}
          bassin={[66, 80]}
          brasG={[[48, 62], [36, 66]]}
          brasD={[[52, 66], [40, 70]]}
          jambeG={[[42, 86], [44, 110]]}
          jambeD={[[46, 88], [48, 110]]}
        />
        <Silhouette
          tete={[172, 26]}
          cou={[172, 38]}
          bassin={[172, 70]}
          brasG={[[164, 52], [152, 56]]}
          brasD={[[168, 56], [156, 60]]}
          jambeG={[[166, 90], [166, 110]]}
          jambeD={[[176, 90], [176, 110]]}
        />
        <Fleche de={[112, 66]} vers={[126, 44]} courbure={6} />
      </Schema>
    ),
    points: [
      "Pieds à largeur de bassin, poids réparti sur tout le pied, bras tendus devant pour équilibrer.",
      "Poussez dans les talons pour vous lever sans élan et sans arrondir le bas du dos.",
      "À la descente, reculez les hanches et effleurez l'assise plutôt que de vous laisser tomber.",
    ],
  },

  "Squat poids de corps": {
    nom: "Squat poids de corps",
    svg: (
      <Schema titre="Squat au poids de corps : position debout, puis descente hanches en arrière et genoux fléchis.">
        <Sol />
        <Silhouette {...debout(60)} />
        <Silhouette
          tete={[176, 44]}
          cou={[178, 56]}
          bassin={[190, 82]}
          brasG={[[172, 66], [158, 62]]}
          brasD={[[174, 70], [160, 66]]}
          jambeG={[[168, 88], [176, 110]]}
          jambeD={[[172, 92], [182, 110]]}
        />
        <Fleche de={[112, 50]} vers={[128, 70]} courbure={5} />
      </Schema>
    ),
    points: [
      "Pieds écartés à largeur d'épaules, pointes légèrement ouvertes, regard à l'horizontale.",
      "Reculez les hanches puis fléchissez les genoux dans l'axe des pieds, dos long du bassin à la nuque.",
      "Descendez aussi bas que vous pouvez garder les talons au sol, puis remontez en poussant le sol.",
    ],
  },

  /* --------------------------------------------------------- charnière */
  "Hip thrust au sol (pont fessier)": {
    nom: "Hip thrust au sol (pont fessier)",
    svg: (
      <Schema titre="Pont fessier au sol : dos au sol genoux fléchis, puis bassin monté jusqu'à l'alignement épaules-genoux.">
        <Sol />
        <Silhouette
          tete={[22, 98]}
          cou={[34, 102]}
          bassin={[66, 106]}
          brasG={[[44, 108], [58, 110]]}
          brasD={[[44, 104], [58, 106]]}
          jambeG={[[86, 84], [90, 110]]}
          jambeD={[[90, 86], [94, 110]]}
        />
        <Silhouette
          tete={[142, 98]}
          cou={[154, 100]}
          bassin={[186, 80]}
          brasG={[[164, 108], [178, 110]]}
          brasD={[[164, 104], [178, 106]]}
          jambeG={[[202, 84], [200, 110]]}
          jambeD={[[206, 86], [204, 110]]}
        />
        <Fleche de={[118, 96]} vers={[122, 74]} courbure={5} />
      </Schema>
    ),
    points: [
      "Talons proches des fessiers, bras au sol le long du corps, menton légèrement rentré.",
      "Poussez dans les talons et montez le bassin jusqu'à l'alignement genoux-hanches-épaules, sans cambrer.",
      "Marquez une seconde en haut en serrant les fessiers, puis redescendez sans poser le bassin entre les répétitions.",
    ],
  },

  "Good morning élastique": {
    nom: "Good morning élastique",
    svg: (
      <Schema titre="Good morning avec élastique : position debout, puis buste penché vers l'avant hanches reculées.">
        <Sol />
        <Materiel>
          <line x1={54} y1={40} x2={54} y2={110} strokeDasharray="3 3" />
          <line x1={66} y1={40} x2={66} y2={110} strokeDasharray="3 3" />
          <line x1={162} y1={54} x2={178} y2={110} strokeDasharray="3 3" />
          <line x1={168} y1={58} x2={186} y2={110} strokeDasharray="3 3" />
        </Materiel>
        <Silhouette {...debout(60)} />
        <Silhouette
          tete={[152, 52]}
          cou={[164, 56]}
          bassin={[194, 68]}
          brasG={[[160, 46], [168, 52]]}
          brasD={[[166, 48], [174, 54]]}
          jambeG={[[190, 90], [186, 110]]}
          jambeD={[[196, 90], [192, 110]]}
        />
        <Fleche de={[112, 46]} vers={[132, 56]} courbure={-6} />
      </Schema>
    ),
    points: [
      "Élastique sous les pieds et derrière la nuque, genoux à peine déverrouillés.",
      "Envoyez les hanches vers l'arrière en gardant le dos parfaitement droit, buste jusqu'à l'horizontale.",
      "Remontez en poussant le bassin vers l'avant ; arrêtez la descente dès que le bas du dos s'arrondit.",
    ],
  },

  /* ------------------------------------------------------------- fente */
  "Fente statique appui": {
    nom: "Fente statique appui",
    svg: (
      <Schema titre="Fente statique avec appui : position fente haute, puis descente du genou arrière vers le sol.">
        <Sol />
        <Materiel>
          <line x1={16} y1={40} x2={16} y2={110} />
          <line x1={136} y1={40} x2={136} y2={110} />
        </Materiel>
        <Silhouette
          tete={[62, 26]}
          cou={[62, 38]}
          bassin={[62, 70]}
          brasG={[[46, 46], [22, 44]]}
          brasD={[[70, 54], [72, 70]]}
          jambeG={[[46, 90], [42, 110]]}
          jambeD={[[80, 90], [84, 110]]}
        />
        <Silhouette
          tete={[182, 40]}
          cou={[182, 52]}
          bassin={[182, 82]}
          brasG={[[164, 56], [142, 46]]}
          brasD={[[190, 66], [192, 82]]}
          jambeG={[[160, 104], [148, 110]]}
          jambeD={[[204, 92], [206, 110]]}
        />
        <Fleche de={[112, 44]} vers={[118, 66]} courbure={5} />
      </Schema>
    ),
    points: [
      "Un pied devant, un pied derrière, buste vertical, une main en appui léger pour l'équilibre.",
      "Descendez à la verticale jusqu'à ce que le genou arrière frôle le sol, genou avant au-dessus du talon.",
      "Poussez dans le talon avant pour remonter, sans laisser le genou avant rentrer vers l'intérieur.",
    ],
  },

  "Fente avant alternée": {
    nom: "Fente avant alternée",
    svg: (
      <Schema titre="Fente avant alternée : position debout, puis grand pas en avant et descente du bassin.">
        <Sol />
        <Silhouette {...debout(60)} />
        <Silhouette
          tete={[180, 40]}
          cou={[180, 52]}
          bassin={[180, 82]}
          brasG={[[168, 64], [166, 80]]}
          brasD={[[192, 64], [194, 80]]}
          jambeG={[[158, 94], [156, 110]]}
          jambeD={[[204, 94], [214, 110]]}
        />
        <Fleche de={[112, 52]} vers={[132, 66]} courbure={6} />
      </Schema>
    ),
    points: [
      "Faites un grand pas en avant et posez le pied à plat, buste droit et regard devant.",
      "Descendez verticalement : le genou avant reste au-dessus de la cheville, le genou arrière frôle le sol.",
      "Repoussez avec la jambe avant pour revenir debout, puis alternez de côté à chaque répétition.",
    ],
  },

  /* -------------------------------------------------- gainage antérieur */
  "Planche sur genoux": {
    nom: "Planche sur genoux",
    svg: (
      <Schema titre="Planche sur les genoux : mise en place à quatre pattes, puis position tenue en appui avant-bras et genoux.">
        <Sol />
        <Silhouette
          tete={[24, 64]}
          cou={[36, 68]}
          bassin={[70, 70]}
          brasG={[[34, 88], [32, 110]]}
          brasD={[[40, 90], [38, 110]]}
          jambeG={[[78, 108], [100, 104]]}
          jambeD={[[82, 104], [104, 100]]}
        />
        <Silhouette
          tete={[144, 76]}
          cou={[156, 80]}
          bassin={[192, 90]}
          brasG={[[156, 100], [138, 108]]}
          brasD={[[160, 102], [142, 110]]}
          jambeG={[[208, 108], [226, 96]]}
          jambeD={[[210, 104], [228, 92]]}
        />
        <Fleche de={[112, 70]} vers={[126, 84]} courbure={5} />
      </Schema>
    ),
    points: [
      "Coudes sous les épaules, avant-bras à plat, genoux au sol écartés à largeur de bassin.",
      "Serrez fessiers et abdominaux pour aligner genoux, hanches et épaules, sans creuser le bas du dos.",
      "Respirez calmement pendant le maintien : arrêtez la série dès que le bassin s'affaisse.",
    ],
  },

  "Planche classique": {
    nom: "Planche classique",
    svg: (
      <Schema titre="Planche classique : mise en place genoux au sol sur les avant-bras, puis position tenue jambes tendues.">
        <Sol />
        <Silhouette
          tete={[24, 70]}
          cou={[36, 74]}
          bassin={[70, 82]}
          brasG={[[38, 96], [22, 108]]}
          brasD={[[42, 98], [26, 110]]}
          jambeG={[[84, 106], [104, 100]]}
          jambeD={[[86, 102], [106, 96]]}
        />
        <Silhouette
          tete={[142, 74]}
          cou={[154, 78]}
          bassin={[190, 90]}
          brasG={[[156, 96], [140, 108]]}
          brasD={[[160, 98], [144, 110]]}
          jambeG={[[210, 96], [230, 106]]}
          jambeD={[[212, 92], [232, 102]]}
        />
        <Fleche de={[112, 56]} vers={[134, 62]} courbure={6} />
      </Schema>
    ),
    points: [
      "Appui sur les avant-bras et la pointe des pieds, coudes strictement sous les épaules.",
      "Verrouillez le bassin en rentrant légèrement les fesses : le corps forme une ligne droite, nuque comprise.",
      "Tenez la durée prévue en respirant ; il vaut mieux 20 secondes bien alignées qu'une minute affaissée.",
    ],
  },

  /* ---------------------------------------------------- gainage latéral */
  "Planche latérale genoux": {
    nom: "Planche latérale genoux",
    svg: (
      <Schema titre="Planche latérale sur les genoux : allongé sur le côté en appui sur l'avant-bras, puis bassin décollé du sol.">
        <Sol />
        <Silhouette
          tete={[22, 96]}
          cou={[34, 100]}
          bassin={[68, 108]}
          brasG={[[36, 110], [22, 110]]}
          brasD={[[42, 88], [50, 78]]}
          jambeG={[[88, 98], [80, 110]]}
          jambeD={[[90, 102], [82, 110]]}
        />
        <Silhouette
          tete={[148, 66]}
          cou={[158, 72]}
          bassin={[188, 92]}
          brasG={[[152, 90], [144, 108]]}
          brasD={[[164, 56], [172, 42]]}
          jambeG={[[210, 92], [206, 110]]}
          jambeD={[[212, 96], [208, 110]]}
        />
        <Fleche de={[118, 100]} vers={[124, 80]} courbure={5} />
      </Schema>
    ),
    points: [
      "Couché sur le côté, coude sous l'épaule, genoux fléchis et empilés l'un sur l'autre.",
      "Montez le bassin jusqu'à aligner épaule, hanche et genou, sans basculer vers l'avant.",
      "Gardez la nuque dans l'axe et respirez ; changez de côté pour un temps identique.",
    ],
  },

  /* -------------------------------------------------- gainage postérieur */
  "Superman au sol": {
    nom: "Superman au sol",
    svg: (
      <Schema titre="Superman au sol : allongé sur le ventre bras tendus devant, puis bras et jambes décollés du sol.">
        <Sol />
        <Silhouette
          tete={[46, 94]}
          cou={[58, 100]}
          bassin={[86, 104]}
          brasG={[[46, 108], [28, 110]]}
          brasD={[[48, 104], [30, 106]]}
          jambeG={[[102, 108], [118, 110]]}
          jambeD={[[102, 104], [118, 106]]}
        />
        <Silhouette
          tete={[160, 90]}
          cou={[172, 94]}
          bassin={[204, 100]}
          brasG={[[158, 78], [140, 70]]}
          brasD={[[162, 74], [144, 66]]}
          jambeG={[[218, 94], [234, 84]]}
          jambeD={[[218, 98], [234, 88]]}
        />
        <Fleche de={[128, 100]} vers={[134, 76]} courbure={5} />
      </Schema>
    ),
    points: [
      "À plat ventre, bras tendus devant, front vers le sol et regard dirigé vers le tapis.",
      "Décollez simultanément bras, poitrine et jambes de quelques centimètres, sans à-coup.",
      "Expirez en montant, tenez une seconde puis reposez lentement ; inutile de monter très haut.",
    ],
  },

  /* ------------------------------------------------------ isolation bras */
  "Curl élastique": {
    nom: "Curl élastique",
    svg: (
      <Schema titre="Curl élastique : debout bras tendus le long du corps, puis avant-bras fléchis vers les épaules.">
        <Sol />
        <Materiel>
          <line x1={48} y1={70} x2={52} y2={110} strokeDasharray="3 3" />
          <line x1={72} y1={70} x2={68} y2={110} strokeDasharray="3 3" />
          <line x1={168} y1={50} x2={172} y2={110} strokeDasharray="3 3" />
          <line x1={192} y1={50} x2={188} y2={110} strokeDasharray="3 3" />
        </Materiel>
        <Silhouette {...debout(60)} />
        <Silhouette
          tete={[180, 26]}
          cou={[180, 38]}
          bassin={[180, 70]}
          brasG={[[170, 56], [168, 50]]}
          brasD={[[190, 56], [192, 50]]}
          jambeG={[[174, 90], [172, 110]]}
          jambeD={[[186, 90], [188, 110]]}
        />
        <Fleche de={[112, 62]} vers={[128, 48]} courbure={5} />
      </Schema>
    ),
    points: [
      "Pieds sur l'élastique, coudes collés aux côtes et poignets dans l'axe de l'avant-bras.",
      "Montez les mains vers les épaules sans bouger les coudes ni balancer le buste.",
      "Redescendez lentement jusqu'aux bras presque tendus : la tension ne doit jamais retomber d'un coup.",
    ],
  },
};

/* ==========================================================================
   Index normalisé (construit une seule fois, au chargement du module)
   ========================================================================== */

/** trim + minuscules + suppression des diacritiques. */
export function normaliserNom(nom: string): string {
  return nom
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
}

const INDEX: Record<string, Illustration> = Object.fromEntries(
  Object.values(ILLUSTRATIONS).map((i) => [normaliserNom(i.nom), i]),
);

/** Retourne l'illustration correspondant au nom, ou `undefined`. */
export function trouverIllustration(nom: string): Illustration | undefined {
  return INDEX[normaliserNom(nom)];
}

/** Vrai si un schéma existe pour cet exercice : conditionne l'affichage du bouton. */
export function aIllustration(nom: string): boolean {
  return trouverIllustration(nom) !== undefined;
}

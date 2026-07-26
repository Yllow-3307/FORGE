# FORGE

Générateur de programmes personnalisés : **callisthénie/musculation, endurance,
nutrition et hydratation**, calculés à partir de 18 paramètres (profil, agenda
réel, matériel disponible, contraintes alimentaires).

Interface inspirée du moodboard : verre dépoli, palette sauge, coins arrondis,
thèmes clair et sombre.

---

> **Pour tester tout de suite :** `cd webapp && npm install && npm run dev`
> Mise en ligne et comptes : voir **[DEPLOIEMENT.md](DEPLOIEMENT.md)**.
> Ce qu'il reste à faire : voir **[FEUILLE-DE-ROUTE.md](FEUILLE-DE-ROUTE.md)**.

## Démarrage

```bash
cd webapp
npm install
npm run dev          # http://localhost:3000
```

L'application **fonctionne immédiatement, sans configuration** : les données
sont stockées dans le navigateur (`localStorage`).

### Activer la synchronisation et les comptes (optionnel, gratuit)

1. Créer un projet sur [supabase.com](https://supabase.com) (offre gratuite).
2. Dans **SQL Editor**, exécuter le contenu de [`supabase/schema.sql`](supabase/schema.sql).
3. Copier les clés depuis **Project Settings → API** :

```bash
cp .env.local.example .env.local
# puis renseigner NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Le basculement est automatique : sans clés, stockage local et aucun compte
requis ; avec clés, l'écran `/compte` propose connexion, inscription, lien
magique et réinitialisation du mot de passe. La bannière d'accueil indique le
mode actif.

---

## Commandes

| Commande | Effet |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm start` | Sert le build de production |
| `npm run lint` | Analyse ESLint |
| `npx tsc --noEmit` | Vérification des types |
| `python3 sync_moteur.py` | Régénère la bibliothèque d'exercices depuis Python |

---

## Architecture

```
webapp/
├── src/
│   ├── app/
│   │   ├── globals.css        ← design tokens, thèmes clair/sombre, verre dépoli
│   │   ├── layout.tsx         ← coquille, anti-flash de thème
│   │   ├── page.tsx           ← Accueil : série + tableau de bord à widgets
│   │   ├── profil/            ← questionnaire en 5 étapes
│   │   ├── seance/            ← topo, lecteur, étirements, récapitulatif
│   │   ├── nutrition/         ← scores, journal des repas, suggestions
│   │   ├── programme/         ← cycle, phases, calendrier
│   │   ├── progres/           ← skills et paliers de progression
│   │   ├── mesures/           ← pesées et courbe d'évolution
│   │   └── parametres/        ← compte, notifications, programme
│   ├── components/
│   │   ├── ui.tsx             ← primitives : Carte, Bouton, Champ, Barre…
│   │   ├── widgets.tsx        ← tuiles du tableau de bord (3 formats)
│   │   ├── minuteur.tsx       ← compte à rebours du lecteur de séance
│   │   ├── navigation.tsx     ← en-tête (bureau) + barre basse (mobile)
│   │   ├── theme.tsx          ← bascule clair/sombre
│   │   └── apercu-hero.tsx    ← illustration animée
│   └── lib/
│       ├── donnees/
│       │   ├── skills.ts      ← 16 figures et leurs paliers
│       │   ├── aliments.ts    ← base de 60 aliments
│       │   └── seance.ts      ← consignes, échauffement, étirements
│       ├── suivi.ts           ← journal, scores, série, widgets
│       ├── store.ts           ← abonnement réactif au stockage local
│       ├── useApp.ts          ← état applicatif partagé
│       ├── moteur/            ← moteur de programmation (TypeScript)
│       │   ├── types.ts       ← contrat de données
│       │   ├── noyau.ts       ← temps, arrondis, dérivations, validation
│       │   ├── exercices.ts   ← 135 exercices (généré)
│       │   ├── agenda.ts      ← placement des séances et des repas
│       │   ├── force.ts       ← splits, volume, progression
│       │   ├── endurance.ts   ← zones cardiaques, modalités
│       │   ├── nutrition.ts   ← calories, macros, aliments
│       │   ├── hydratation.ts ← besoins et échéancier
│       │   └── index.ts       ← orchestrateur
│       └── stockage.ts        ← Supabase avec repli localStorage
└── supabase/schema.sql        ← tables et politiques de sécurité
```

### Le moteur

Le moteur TypeScript est le **portage exact** du moteur Python de référence
(`../moteur/`). Un test de parité vérifie que les deux produisent des sorties
identiques sur 157 profils, y compris les cas limites (obésité, senior, vegan,
agenda saturé, blessures multiples).

Deux pièges corrigés lors du portage, à conserver en tête :

- `Math.round` arrondit `176.5` à `177`, Python à `176`. D'où `rnd()` dans
  `noyau.ts`, qui reproduit l'arrondi au pair le plus proche.
- En JavaScript, `-450 % 1440` vaut `-450` au lieu de `990`. D'où `mod()`,
  indispensable pour les couchers après minuit.

Toute évolution des règles doit être répercutée **des deux côtés**, puis
validée par le test de parité.

### Écrans

| Écran | Contenu |
|---|---|
| **Accueil** | Série de séances consécutives, séance du jour, tableau de bord composé de widgets (grand carré, petit carré, rectangle) que l'on ajoute, déplace et redimensionne |
| **Séance** | Topo avec 3 consignes, puis lecteur plein écran : échauffement chronométré, séance (minuteur pour les blocs en temps, validation de séries sinon), étirements ciblés sur les muscles sollicités, récapitulatif avec pourcentage d'accomplissement et ressenti |
| **Nutrition** | Score bouffe et score hydra, journal des repas (base d'aliments ou saisie manuelle), suggestions chiffrées pour combler l'écart avec les cibles |
| **Programme** | Position dans le cycle, découpage en phases, calendrier navigable semaine par semaine |
| **Progrès** | Skills suivis avec l'étape en cours, catalogue complet des 16 figures et leurs paliers |
| **Mesures** | Pesée (poids, taille, énergie) et courbe avec moyenne mobile sur 7 jours |
| **Paramètres** | Compte, thème, historique, notifications, changement de programme |
| **Compte** | Connexion, inscription, lien magique, mot de passe oublié (ou explication du mode local) |

---

## Application mobile installable (PWA)

L'application s'installe sur l'écran d'accueil et fonctionne **sans connexion**.

- **Installation** : une invite apparaît après quelques minutes d'utilisation
  sur Android et Chrome. Sur iPhone, utiliser *Partager → Sur l'écran d'accueil*.
- **Hors ligne** : les pages du parcours principal sont mises en cache à
  l'installation. Les données utilisateur vivant dans `localStorage`, tout
  reste consultable et modifiable sans réseau ; un bandeau signale l'état.
- **Raccourcis** : appui long sur l'icône → *Lancer ma séance*, *Noter un
  repas*, *Me peser*.
- **Mises à jour** : une bannière propose de recharger, plutôt que
  d'interrompre une séance en cours.

### Notifications

Les rappels (séance, repas, hydratation, bilan) sont **planifiés localement**,
sans serveur ni clés VAPID — contrainte du budget nul assumée.

Conséquence, indiquée dans l'interface : ils se déclenchent lorsque
l'application est ouverte ou installée et active en arrière-plan. Un système
de notifications poussées exigerait un backend.

---

## Déploiement gratuit

**Vercel** (recommandé) :

```bash
npm i -g vercel
vercel
```

Ajouter les deux variables d'environnement dans le tableau de bord Vercel si
Supabase est utilisé.

**Netlify** : connecter le dépôt Git, commande de build `npm run build`.

---

## Avertissement

Les valeurs produites (calories, fréquences cardiaques, charges) sont des
estimations de départ, à ajuster selon les résultats observés. L'application ne
remplace pas un avis médical.

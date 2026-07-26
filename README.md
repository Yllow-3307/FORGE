# Callisthenic — application web

Générateur de programmes personnalisés : **callisthénie/musculation, endurance,
nutrition et hydratation**, calculés à partir de 18 paramètres (profil, agenda
réel, matériel disponible, contraintes alimentaires).

Interface inspirée du moodboard : verre dépoli, palette sauge, coins arrondis,
thèmes clair et sombre.

---

## Démarrage

```bash
cd webapp
npm install
npm run dev          # http://localhost:3000
```

L'application **fonctionne immédiatement, sans configuration** : les données
sont stockées dans le navigateur (`localStorage`).

### Activer la synchronisation Supabase (optionnel, gratuit)

1. Créer un projet sur [supabase.com](https://supabase.com) (offre gratuite).
2. Dans **SQL Editor**, exécuter le contenu de [`supabase/schema.sql`](supabase/schema.sql).
3. Copier les clés depuis **Project Settings → API** :

```bash
cp .env.local.example .env.local
# puis renseigner NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Le basculement est automatique : sans clés, stockage local ; avec clés,
synchronisation. La bannière d'accueil indique le mode actif.

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
│   │   ├── page.tsx           ← Accueil
│   │   ├── profil/            ← questionnaire (à venir)
│   │   ├── programme/         ← programme généré (à venir)
│   │   └── suivi/             ← suivi du poids et des séances (à venir)
│   ├── components/
│   │   ├── ui.tsx             ← primitives : Carte, Bouton, Champ, Barre…
│   │   ├── navigation.tsx     ← en-tête (bureau) + barre basse (mobile)
│   │   ├── theme.tsx          ← bascule clair/sombre
│   │   └── apercu-hero.tsx    ← illustration animée de l'accueil
│   └── lib/
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

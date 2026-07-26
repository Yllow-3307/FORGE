# Déployer FORGE — guide complet

Trois étapes, environ 25 minutes. **Coût total : 0 €.**

| Étape | Service | Durée | Nécessaire ? |
|---|---|---|---|
| 1. Tester en local | Node.js | 3 min | Oui |
| 2. Mettre en ligne | Vercel | 10 min | Oui, pour tester sur mobile |
| 3. Comptes et synchronisation | Supabase | 12 min | Non — l'app marche sans |

> **À savoir avant de commencer.** FORGE fonctionne intégralement sans backend :
> les données sont enregistrées dans le navigateur. L'étape 3 ne sert qu'à
> retrouver ses données sur plusieurs appareils. Commencez par les étapes 1 et 2.

---

## Étape 1 — Tester sur votre ordinateur

### Prérequis

- **Node.js 20 ou plus** — [nodejs.org](https://nodejs.org) (prendre la version LTS).
  Vérifier : `node -v` doit afficher `v20.x` ou plus.
- **Git** — [git-scm.com](https://git-scm.com).
- **VS Code** — [code.visualstudio.com](https://code.visualstudio.com).

### Lancement

```bash
cd webapp
npm install     # une seule fois, environ 1 min
npm run dev
```

Ouvrir **http://localhost:3000**. C'est tout : aucune clé, aucun compte.

### Tester la version installable (PWA)

Le service worker est désactivé en mode développement, volontairement : il
mettrait le code en cache et masquerait vos modifications. Pour le tester :

```bash
npm run build
npm start
```

### Commandes utiles

| Commande | Effet |
|---|---|
| `npm run dev` | Développement, rechargement à chaud |
| `npm run build` | Compilation de production |
| `npm start` | Sert la version compilée (PWA active) |
| `npm run lint` | Analyse du code |
| `npx tsc --noEmit` | Vérification des types |

---

## Étape 2 — Mettre en ligne sur Vercel

Indispensable pour tester sur téléphone : l'installation d'une PWA exige
**HTTPS**, que `localhost` ne fournit pas depuis un mobile.

### 2.1 Envoyer le code sur GitHub

1. Créer un dépôt vide sur [github.com/new](https://github.com/new), nommé
   `forge`. **Ne cochez rien** (ni README, ni .gitignore).
2. Dans le terminal :

```bash
cd webapp
git remote add origin https://github.com/VOTRE-PSEUDO/forge.git
git branch -M main
git push -u origin main
```

> Si Git demande un mot de passe : GitHub exige un *token*. Le créer sur
> [github.com/settings/tokens](https://github.com/settings/tokens) →
> *Generate new token (classic)* → cocher **repo** → copier le token et
> l'utiliser en guise de mot de passe.

### 2.2 Déployer

1. Aller sur [vercel.com](https://vercel.com) → **Continue with GitHub**.
2. **Add New → Project** → choisir le dépôt `forge` → **Import**.
3. Ne rien changer : Vercel détecte Next.js automatiquement.
4. **Deploy**. Compter deux minutes.

Vous obtenez une adresse du type `https://forge-xxxx.vercel.app`.

### 2.3 Désactiver la protection Vercel *(indispensable)*

Vercel verrouille les nouveaux projets : l'adresse renvoie vers une page de
connexion tant que ce réglage est actif. Cela bloque aussi le manifeste PWA,
donc l'installation sur téléphone.

**Settings → Deployment Protection → Vercel Authentication → Disabled → Save.**

Vérifiez ensuite **en navigation privée** : votre session Vercel masquerait
le problème.

À chaque `git push`, Vercel redéploie automatiquement.

### 2.3 Installer sur votre téléphone

Ouvrir l'adresse Vercel depuis le mobile :

- **Android / Chrome** : une invite « Installer » apparaît, ou
  menu ⋮ → *Ajouter à l'écran d'accueil*.
- **iPhone / Safari** : bouton Partager → *Sur l'écran d'accueil*.
  (Safari n'affiche jamais d'invite automatique : c'est normal.)

L'application s'ouvre alors en plein écran, sans barre d'adresse, et
fonctionne hors connexion.

---

## Étape 3 — Comptes et synchronisation (facultatif)

Sans cette étape : données locales à l'appareil, aucun compte.
Avec : connexion par e-mail et données retrouvées sur tous vos appareils.

### 3.1 Créer le projet Supabase

1. [supabase.com](https://supabase.com) → **Start your project** (connexion GitHub).
2. **New project** :
   - **Name** : `forge`
   - **Database Password** : générer et **conserver ce mot de passe**
   - **Region** : `West EU (Ireland)` ou `Central EU (Frankfurt)`
   - **Plan** : Free
3. Attendre environ deux minutes.

### 3.2 Créer les tables

1. Menu de gauche → **SQL Editor** → **New query**.
2. Copier **tout** le contenu de [`supabase/schema.sql`](supabase/schema.sql).
3. Coller, puis **Run** (ou `Ctrl+Entrée`).

Message attendu : *Success. No rows returned*.

Le script crée les tables, les index et surtout les politiques de sécurité
(*Row Level Security*) : chaque utilisateur ne peut lire que ses propres
données, y compris si quelqu'un récupérait la clé publique.

### 3.3 Récupérer les clés

**Project Settings** (roue dentée) → **API** :

| Champ dans Supabase | À copier dans |
|---|---|
| **Project URL** | `NEXT_PUBLIC_SUPABASE_URL` |
| **anon public** | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |

> La clé `anon public` est conçue pour être exposée dans le navigateur :
> c'est la sécurité au niveau des lignes qui protège les données.
> **Ne jamais utiliser la clé `service_role`** dans ce projet : elle
> contourne toutes les protections.

### 3.4 En local

```bash
cd webapp
cp .env.local.example .env.local
```

Éditer `.env.local` :

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

Redémarrer `npm run dev`. L'écran **Compte** propose maintenant connexion et
inscription.

> `.env.local` est ignoré par Git : vos clés ne partiront jamais sur GitHub.

### 3.5 Sur Vercel

**Project → Settings → Environment Variables**, ajouter les deux mêmes
variables (cocher *Production*, *Preview* et *Development*), puis
**Deployments → ⋯ → Redeploy** pour qu'elles soient prises en compte.

### 3.6 Autoriser les redirections

Supabase → **Authentication → URL Configuration** :

- **Site URL** : `https://forge-xxxx.vercel.app`
- **Redirect URLs** : ajouter `https://forge-xxxx.vercel.app/**`
  et `http://localhost:3000/**`

Sans cela, les liens de confirmation par e-mail échoueront.

> **Pour tester rapidement**, désactivez la confirmation par e-mail :
> **Authentication → Providers → Email** → décocher *Confirm email*.
> À réactiver avant une ouverture au public.

---

## Limites des offres gratuites

| Service | Gratuit | Suffisant pour |
|---|---|---|
| **Vercel** Hobby | 100 Go de trafic par mois | Plusieurs milliers de visites |
| **Supabase** Free | 500 Mo, 50 000 utilisateurs actifs | Largement, pour un usage personnel |

Attention : un projet Supabase gratuit est **mis en pause après 7 jours
sans activité**. Il se réveille en une visite, sans perte de données.

---

## En cas de problème

| Symptôme | Cause probable | Solution |
|---|---|---|
| `npm install` échoue | Node.js trop ancien | Installer Node 20 (`node -v`) |
| Build en échec sur Vercel | Erreur de types | Lancer `npm run build` en local pour voir l'erreur |
| Écran Compte : « Aucun compte nécessaire » | Variables absentes | Vérifier les deux variables sur Vercel, puis redéployer |
| Connexion refusée | Redirections non configurées | Étape 3.6 |
| Page de connexion Vercel | Protection activée par défaut | Settings → Deployment Protection → Disabled |
| Pas d'invite d'installation | HTTP, ou déjà installée | Exige HTTPS ; sur iPhone, passer par Partager |
| Modifications invisibles | Cache du service worker | Recharger avec `Ctrl+Maj+R` |
| Les rappels ne partent pas | Permission refusée | Paramètres → Autoriser ; l'app doit rester ouverte ou installée |

---

## Sauvegarder vos données

En mode local, le navigateur est **la seule copie**. Vider les données du
site les effacerait définitivement.

**Paramètres → Historique des données → Exporter (JSON)** : à faire
régulièrement, ou activer l'étape 3.

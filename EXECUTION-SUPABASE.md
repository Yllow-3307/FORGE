# EXECUTION-SUPABASE.md — Runbook pas-à-pas

> **Objectif** : créer le backend Supabase de Forge et le relier à Vercel.
> Temps estimé : 15–20 minutes.
> Aucune connaissance technique préalable n'est requise.

---

## Étape 1 — Créer un projet Supabase

1. Aller sur **<https://dashboard.supabase.com>** et se connecter (ou créer un compte).
2. Cliquer **New project**.
3. Renseigner :
   | Champ               | Valeur recommandée                          |
   |---------------------|---------------------------------------------|
   | **Organization**    | (votre organisation, ou « Personal »)       |
   | **Name**            | `forge`                                     |
   | **Database Password** | Un mot de passe fort (le noter quelque part) |
   | **Region**          | **West EU (Paris)** `eu-west-3`             |
   | **Plan**            | Free                                        |
4. Cliquer **Create new project** et attendre ~2 minutes que le projet soit prêt.

> ⚠️ **Conservez le mot de passe de la base de données** : il est irrécupérable.

---

## Étape 2 — Récupérer l'URL et la clé Anon

1. Dans le menu latéral, cliquer **Project Settings** (⚙️ en bas à gauche).
2. Cliquer **API** dans le sous-menu.
3. Copier les deux valeurs suivantes :

   | Libellé dans Supabase    | Variable d'environnement            |
   |--------------------------|-------------------------------------|
   | **Project URL**          | `NEXT_PUBLIC_SUPABASE_URL`          |
   | **anon / public** (clé)  | `NEXT_PUBLIC_SUPABASE_ANON_KEY`     |

4. Les coller dans votre fichier `.env.local` à la racine du dépôt :

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<REF-PROJET>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<VOTRE-ANON-KEY>
   ```

---

## Étape 3 — Créer les tables (SQL Editor)

1. Dans le menu latéral, cliquer **SQL Editor**.
2. Cliquer **New query** (en haut à droite).
3. Ouvrir le fichier `supabase/schema.sql` du dépôt, **copier tout son contenu**, et le coller dans l'éditeur.
4. Cliquer **Run** (▶️ en bas à droite, ou `Ctrl+Enter`).
5. Le résultat doit afficher « Success. No rows returned » — c'est normal.

### Vérification

1. Dans le menu latéral, cliquer **Table Editor**.
2. Vérifier que les **6 tables** suivantes existent dans le schéma `public` :

   | # | Table                  |
   |---|------------------------|
   | 1 | `fiches`               |
   | 2 | `seances_realisees`    |
   | 3 | `mesures_poids`        |
   | 4 | `journal`              |
   | 5 | `progres_skills`       |
   | 6 | `historique_charges`   |

> Si une table manque, retourner dans SQL Editor, vérifier qu'il n'y a pas
> d'erreur en rouge dans le panneau de résultat, et relancer.

---

## Étape 4 — Configurer l'authentification par email

1. Dans le menu latéral, cliquer **Authentication**.
2. Cliquer **Providers** (dans le sous-menu à gauche).
3. Ouvrir le provider **Email**.
4. Vérifier que **Enable Email provider** est activé (c'est le cas par défaut).
5. S'assurer que **Confirm email** est coché (plus sûr).

> 📧 En offre Free, Supabase envoie les emails via un expéditeur « no-reply »
> avec un quota de **3–4 emails par heure**. C'est suffisant pour tester.
> En production à fort trafic, il faudra configurer un SMTP personnalisé.

---

## Étape 5 — Configurer les URLs de redirection

1. Toujours dans **Authentication**, cliquer **URL Configuration** (dans le sous-menu).
2. Renseigner :

   | Champ               | Valeur                                        |
   |----------------------|-----------------------------------------------|
   | **Site URL**         | `https://forge-rgt1.vercel.app`               |
   | **Redirect URLs**   | Ajouter les deux lignes suivantes :            |
   |                      | `https://forge-rgt1.vercel.app/**`            |
   |                      | `http://localhost:3000/**`                    |

3. Cliquer **Save**.

> La première URL couvre la production (Vercel), la seconde le développement
> local. Le pattern `/**` autorise tous les sous-chemins.

---

## Étape 6 — Google OAuth (optionnel maintenant, obligatoire avant Phase 2)

> Si vous ne souhaitez pas activer Google tout de suite, passez à l'étape 7.

### 6a. Créer un OAuth Client ID sur Google Cloud

1. Aller sur **<https://console.cloud.google.com>**.
2. Sélectionner (ou créer) un projet Google Cloud.
3. Menu ☰ → **APIs & Services** → **Credentials**.
4. Cliquer **+ CREATE CREDENTIALS** → **OAuth client ID**.
5. Renseigner :

   | Champ                          | Valeur                                                        |
   |--------------------------------|---------------------------------------------------------------|
   | **Application type**           | `Application Web`                                             |
   | **Name**                       | `Forge Supabase`                                              |
   | **Authorized redirect URIs**   | `https://<REF-PROJET>.supabase.co/auth/v1/callback`           |

   > Remplacer `<REF-PROJET>` par la référence de votre projet Supabase
   > (la partie avant `.supabase.co` dans l'URL du projet).

6. Cliquer **Create**.
7. **Copier** le **Client ID** et le **Client Secret** affichés.

### 6b. Activer Google dans Supabase

1. Retourner dans **Supabase → Authentication → Providers**.
2. Ouvrir le provider **Google**.
3. Activer-le, puis coller :

   | Champ               | Valeur                      |
   |----------------------|-----------------------------|
   | **Client ID**        | (celui copié à l'étape 6a)  |
   | **Client Secret**    | (celui copié à l'étape 6a)  |

4. Cliquer **Save**.

---

## Étape 7 — Configurer Vercel

1. Aller sur **<https://vercel.com>** → ouvrir le projet **forge**.
2. Cliquer **Settings** → **Environment Variables**.
3. Ajouter les deux variables :

   | Key                              | Value                                      |
   |----------------------------------|--------------------------------------------|
   | `NEXT_PUBLIC_SUPABASE_URL`       | `https://<REF-PROJET>.supabase.co`         |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY`  | `<VOTRE-ANON-KEY>`                         |

   > Utiliser les mêmes valeurs qu'à l'étape 2.

4. Cliquer **Save** pour chaque variable.
5. Revenir dans **Deployments**, sélectionner le dernier déploiement, puis
   cliquer **⋯** → **Redeploy** (cocher « Use existing Build Cache » si proposé).
6. Attendre que le déploiement passe au vert (✔).

---

## Étape 8 — Vérification finale

Effectuer chaque vérification ci-dessous et cocher :

- [ ] **Créer un compte test** : ouvrir `https://forge-rgt1.vercel.app`,
      cliquer « S'inscrire », entrer un email valide et un mot de passe.
      Confirmer l'email reçu (vérifier les spams).
- [ ] **Vérifier dans Supabase** : aller dans **Authentication → Users** et
      confirmer que le compte test apparaît.
- [ ] **Vérifier dans Table Editor** : ouvrir la table `fiches` et confirmer
      qu'une ligne a été créée avec `utilisateur_id` correspondant au
      `uid` du compte test.
- [ ] Le site fonctionne normalement (navigation, séance, nutrition…).

---

## Informations à rapporter au développeur

Une fois toutes les étapes terminées, communiquer :

1. **URL du projet Supabase** : `https://<REF-PROJET>.supabase.co`
2. **Confirmation** : « Les 6 tables sont créées dans Table Editor » (oui/non)
3. **Confirmation** : « Les Redirect URLs sont posées dans URL Configuration » (oui/non)
4. **Confirmation** : « Vercel a été redéployé avec les variables d'environnement » (oui/non)
5. **Google OAuth** : activé maintenant / reporté à la Phase 2
6. **Éventuels messages d'erreur** rencontrés (capture d'écran bienvenue)

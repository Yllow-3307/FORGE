# Mettre FORGE en ligne — pas à pas

Tout est prêt côté code : branche `main`, 80 fichiers, aucun secret, build validé.
Il reste **deux choses à faire de votre côté**, environ 15 minutes.

---

## Étape 1 — GitHub (5 min)

### 1.1 Créer le dépôt

Aller sur **[github.com/new](https://github.com/new)** :

| Champ | Valeur |
|---|---|
| **Repository name** | `forge` |
| **Description** | Programmes d'entraînement et de nutrition personnalisés |
| **Public / Private** | Au choix — Vercel gère les deux gratuitement |
| **Add a README file** | ❌ **Ne pas cocher** |
| **Add .gitignore** | ❌ **None** |
| **Choose a license** | ❌ **None** |

> Les trois dernières cases sont importantes : elles créeraient des fichiers
> qui entreraient en conflit avec ceux du projet.

Cliquer **Create repository**.

### 1.2 Envoyer le code

GitHub affiche alors une page avec des commandes. **Ignorez-les** et utilisez
celles-ci, depuis votre terminal :

```bash
cd webapp

git remote add origin https://github.com/VOTRE-PSEUDO/forge.git
git push -u origin main
```

Remplacez `VOTRE-PSEUDO` par votre identifiant GitHub.

### 1.3 Si Git demande un mot de passe

GitHub n'accepte plus les mots de passe depuis 2021 : il faut un **token**.

1. Aller sur **[github.com/settings/tokens](https://github.com/settings/tokens)**
2. **Generate new token** → **Generate new token (classic)**
3. Remplir :
   - **Note** : `forge`
   - **Expiration** : 90 days
   - **Scopes** : cocher **`repo`** (la case principale suffit)
4. **Generate token** en bas de page
5. **Copier le token immédiatement** — il ne sera plus jamais affiché

Relancer `git push`. Quand le terminal demande :
- **Username** : votre pseudo GitHub
- **Password** : **collez le token** (rien ne s'affiche à la saisie, c'est normal)

> **Astuce** pour ne pas le retaper à chaque fois :
> `git config --global credential.helper store`
> (le token sera enregistré en clair dans votre dossier personnel)

### 1.4 Vérifier

Rechargez la page de votre dépôt : vous devez voir les dossiers `src`,
`public`, `supabase`, `moteur-python` et les fichiers Markdown.

---

## Étape 2 — Vercel (7 min)

### 2.1 Créer le compte

Aller sur **[vercel.com/signup](https://vercel.com/signup)** →
**Continue with GitHub** → autoriser.

Choisir **Hobby** (gratuit) si le plan est demandé.

### 2.2 Importer le projet

1. **Add New…** → **Project**
2. Votre dépôt `forge` apparaît dans la liste → **Import**
   *(s'il n'apparaît pas : **Adjust GitHub App Permissions** → autoriser l'accès)*
3. **Ne modifier aucun réglage.** Vercel détecte Next.js et remplit tout seul :

   | Réglage | Valeur détectée |
   |---|---|
   | Framework Preset | Next.js |
   | Build Command | `next build` |
   | Output Directory | `.next` |
   | Install Command | `npm install` |

4. **Deploy**

### 2.3 Attendre

Environ deux minutes. Vous voyez les journaux défiler, puis un écran de
félicitations avec un aperçu.

Votre adresse : **`https://forge-xxxx.vercel.app`**

### 2.4 Rendre le site public *(indispensable)*

**Vercel protège les nouveaux projets par défaut.** Tant que ce réglage est
actif, l'adresse renvoie vers une page de connexion Vercel : personne ne peut
ouvrir l'application, **pas même vous depuis votre téléphone**.

Pour le désactiver :

1. Dans votre projet Vercel → **Settings** (onglet du haut)
2. Menu de gauche → **Deployment Protection**
3. Section **Vercel Authentication** → basculer sur **Disabled**
4. **Save**

Le changement est immédiat, aucun redéploiement n'est nécessaire.

> **Est-ce risqué ?** Non. Cette protection sert aux entreprises qui
> déploient des versions de test confidentielles. Une application destinée à
> être utilisée doit être publique. Vos données restent protégées par
> ailleurs : elles vivent dans votre navigateur, ou derrière l'authentification
> Supabase si vous l'activez.

### 2.5 Vérifier

Ouvrez l'adresse **dans une fenêtre de navigation privée** — c'est le seul
moyen de voir le site comme un visiteur, puisque votre session Vercel
masquerait le problème.

Vous devez voir l'écran d'accueil FORGE avec « Bienvenue ».

À partir de maintenant, **chaque `git push` redéploie automatiquement**.

---

## Étape 3 — Installer sur votre téléphone (2 min)

Ouvrez l'adresse Vercel **depuis votre téléphone**.

### Android (Chrome)

Une bannière « Installer » apparaît en bas après quelques secondes.
Sinon : menu **⋮** → **Ajouter à l'écran d'accueil**.

### iPhone (Safari)

Safari n'affiche jamais d'invite automatique — il faut passer par le menu :

1. Bouton **Partager** (le carré avec la flèche, en bas)
2. Faire défiler → **Sur l'écran d'accueil**
3. **Ajouter**

> Cela ne fonctionne **que dans Safari**. Chrome sur iPhone ne sait pas
> installer de PWA : c'est une limitation d'Apple, pas de l'application.

### Ce que vous obtenez

- L'icône enclume sur votre écran d'accueil
- Ouverture en plein écran, sans barre d'adresse
- Fonctionnement **sans connexion** (métro, salle en sous-sol)
- Appui long sur l'icône → *Lancer ma séance*, *Noter un repas*, *Me peser*

---

## Étape 4 — Comptes et synchronisation *(facultatif)*

**À ne faire que si** vous voulez retrouver vos données sur plusieurs
appareils. Sans cela, l'application fonctionne parfaitement, mais les
données restent sur le téléphone.

La procédure complète est dans **[DEPLOIEMENT.md](DEPLOIEMENT.md)**, section 3.

En résumé :
1. Créer un projet sur [supabase.com](https://supabase.com)
2. Exécuter `supabase/schema.sql` dans le **SQL Editor**
3. Copier les deux clés dans Vercel → **Settings → Environment Variables**
4. **Redeploy** pour appliquer

---

## Problèmes courants

| Message | Cause | Solution |
|---|---|---|
| `remote origin already exists` | Remote déjà ajouté | `git remote set-url origin https://github.com/PSEUDO/forge.git` |
| `Authentication failed` | Mot de passe au lieu du token | Voir 1.3 |
| `src refspec main does not match` | Mauvaise branche | `git branch -M main` puis repousser |
| `Permission denied` | Mauvais compte | Vérifier le pseudo dans l'URL |
| Dépôt absent dans Vercel | Droits d'accès | **Adjust GitHub App Permissions** |
| Build en échec | Erreur de code | Lancer `npm run build` en local pour voir l'erreur |
| Page de connexion Vercel au lieu de l'app | Protection activée par défaut | Étape 2.4 |
| Le site marche pour moi mais pas pour les autres | Même cause | Étape 2.4, puis tester en navigation privée |
| Impossible d'installer sur le téléphone | Le manifeste est bloqué par la protection | Étape 2.4 |
| Pas d'invite d'installation | HTTP, ou déjà installée | Exige HTTPS ; sur iPhone passer par Partager |

---

## Après la mise en ligne

Pour publier une modification :

```bash
git add -A
git commit -m "Description du changement"
git push
```

Vercel redéploie en deux minutes. Chaque déploiement conserve un aperçu :
en cas de problème, **Deployments → ⋯ → Rollback** revient à la version
précédente en un clic.

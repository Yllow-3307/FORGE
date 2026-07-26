# Réparer votre dossier local

## Ce qui s'est passé

Le commit `745653c` a **supprimé 15 fichiers**, dont `package.json` — sans lui,
l'application ne peut plus démarrer ni se déployer.

**La cause vient de mon archive**, pas de vous : `forge.zip` contenait un
dossier `webapp/`. Extrait dans `D:\Dev\Projects\webapp`, il a donc créé :

```
D:\Dev\Projects\webapp\          ← votre dépôt Git est ici
└── webapp\                      ← mais les fichiers ont atterri là
    ├── package.json
    └── src\
```

Git, à la racine, n'a plus vu aucun de ses fichiers : il les a considérés
comme supprimés.

Le message `error: Could not read 22e00ae…` a la même origine : l'historique
que Git cherchait se trouvait dans le `.git` du sous-dossier.

## Bonne nouvelle

**Votre dépôt GitHub est intact.** Le commit fautif n'a jamais été envoyé :
en ligne, `package.json` est toujours là. Rien n'est perdu.

---

## La réparation — 2 minutes

Utilisez la nouvelle archive **`forge-contenu.zip`**, dont les fichiers sont
directement à la racine, sans dossier intermédiaire.

### 1. Repartir d'un dossier propre

Dans PowerShell :

```powershell
cd D:\Dev\Projects
Rename-Item webapp webapp-casse          # on garde l'ancien, au cas où
mkdir webapp
cd webapp
```

### 2. Extraire la nouvelle archive

Décompressez `forge-contenu.zip` **dans** `D:\Dev\Projects\webapp`.

En PowerShell, depuis le dossier où vous l'avez téléchargée :

```powershell
Expand-Archive -Path "$HOME\Downloads\forge-contenu.zip" -DestinationPath "D:\Dev\Projects\webapp" -Force
```

> **Important** : `Expand-Archive` conserve les dossiers cachés comme `.git`.
> Si vous préférez l'explorateur Windows, activez d'abord l'affichage des
> éléments masqués — sinon `.git` sera ignoré et le problème se répétera.

### 3. Vérifier

```powershell
cd D:\Dev\Projects\webapp
git status
```

Trois choses doivent être vraies :

- `package.json` est présent à la racine (pas dans un sous-dossier `webapp`)
- `git status` affiche **« nothing to commit, working tree clean »**
- `git log --oneline -1` affiche `8d4a124 Script d'envoi vers GitHub…`

### 4. Envoyer

```powershell
git push -u origin main
```

Cinq commits partiront. J'ai vérifié : ils **prolongent exactement** votre
dépôt GitHub, donc aucun conflit n'est possible.

---

## Si vous préférez réparer sans tout réextraire

Le commit fautif étant local, il suffit de l'annuler :

```powershell
cd D:\Dev\Projects\webapp
git reset --hard HEAD~1        # annule 745653c
```

Puis déplacez le contenu du sous-dossier vers la racine :

```powershell
Move-Item -Path .\webapp\* -Destination . -Force
Move-Item -Path .\webapp\.* -Destination . -Force -ErrorAction SilentlyContinue
Remove-Item .\webapp -Recurse -Force
git status
```

Cette voie est plus rapide mais plus délicate : en cas de doute, la
réextraction complète est plus sûre.

---

## Après le push

**Si vous utilisez Supabase**, réexécutez `supabase/schema.sql` dans le
SQL Editor : une colonne `maj_le` a été ajoutée pour la synchronisation.
Le script se rejoue sans risque.

**Vérifiez ensuite le déploiement :**

```bash
bash verifier-deploiement.sh https://forge-rgt1.vercel.app
```

Il contrôle depuis l'extérieur que le site est public, complet et installable.

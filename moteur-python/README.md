# Moteur de référence (Python)

Ce dossier contient l'implémentation **de référence** du moteur de
programmation, ainsi que ses tests. Il n'est **pas** utilisé par
l'application web : Vercel l'ignore, seul le portage TypeScript
(`src/lib/moteur/`) s'exécute dans le navigateur.

## À quoi il sert

1. **Source de vérité** des règles métier. Toute évolution se pense ici
   d'abord, où les tests sont les plus complets.
2. **Génération de la bibliothèque d'exercices** consommée par l'app :

   ```bash
   python3 sync_moteur.py     # depuis webapp/
   ```

3. **Test de parité** : garantit que Python et TypeScript produisent
   exactement le même programme pour un profil donné. Sans lui, les deux
   implémentations divergeraient silencieusement.

## Lancer les tests

```bash
cd moteur-python

# Robustesse : 250 profils aléatoires, aucune sortie absurde attendue
python3 tests/test_combinaisons.py 250

# Parité Python <-> TypeScript (nécessite Node)
python3 tests/test_parite.py
```

## Règle à respecter

Une modification des règles doit être répercutée **des deux côtés**
(`moteur-python/moteur/` et `src/lib/moteur/`), puis validée par le test
de parité. Deux pièges rencontrés lors du portage initial :

- `Math.round(176.5)` vaut `177` en JavaScript, `176` en Python : d'où la
  fonction `rnd()` dans `src/lib/moteur/noyau.ts`.
- `-450 % 1440` vaut `-450` en JavaScript, `990` en Python : d'où `mod()`,
  indispensable pour les heures de coucher après minuit.

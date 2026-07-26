# FORGE — état des lieux et suite

*Dernière mise à jour : 26 juillet 2026*

---

## Ce qui est terminé

| Domaine | État | Vérifié par |
|---|---|---|
| Moteur de programmation | ✅ | 250 profils aléatoires, 0 incohérence |
| Parité Python ↔ TypeScript | ✅ | 157 profils, 0 divergence |
| Les 9 écrans | ✅ | Testés dans un navigateur, 0 erreur console |
| Design (thèmes clair/sombre) | ✅ | Captures aux deux thèmes |
| PWA installable, hors ligne | ✅ | Coupure réseau réelle |
| Authentification | ✅ | Modes local et Supabase |
| Résistance aux pannes backend | ✅ | Backend injoignable simulé |
| Qualité du code | ✅ | `lint` et `tsc` sans erreur |

---

## Ce qu'il reste : ordre recommandé

L'ordre suit une logique simple : **d'abord ce qui vous permet de juger sur
pièces, ensuite ce qui rend l'outil fiable, enfin ce qui l'enrichit.**

---

### Phase 1 — Mettre en ligne et éprouver *(à faire en premier)*

> **Pourquoi d'abord ?** Tant que l'application n'a pas servi une vraie
> semaine d'entraînement, toute nouvelle fonctionnalité est un pari. Trois
> jours d'usage réel apprennent davantage qu'un mois de développement.

**1.1 Déployer sur Vercel** — 15 min, voir [`DEPLOIEMENT.md`](DEPLOIEMENT.md).
Nécessaire pour installer sur téléphone : la PWA exige HTTPS.

**1.2 Utiliser pendant une semaine complète.** Remplir le questionnaire avec
votre vrai profil, suivre le programme, noter les repas, se peser.

**1.3 Noter ce qui coince.** Les questions qui comptent : les séances
tombent-elles à des heures tenables ? Les portions proposées sont-elles
réalistes ? Le lecteur de séance est-il utilisable une main occupée ?

**1.4 Brancher Supabase** *(optionnel)* si vous voulez vos données sur
plusieurs appareils.

---

### Phase 2 — Fiabiliser *(après les premiers retours)*

**2.1 Synchroniser le journal et les skills** — *une demi-journée*
Le profil, les pesées et les séances vont déjà sur Supabase. Le journal
alimentaire et la progression des skills restent en local : les tables SQL
existent (`journal`, `progres_skills`), il manque le branchement.
*Sans cela : changer de téléphone fait perdre ces données.*

**2.2 Résoudre les conflits de synchronisation** — *quelques heures*
Deux appareils modifiant la même journée : aujourd'hui le dernier écrase
l'autre. Une règle « la valeur la plus récente par champ » suffirait.

**2.3 Tests automatisés de l'interface** — *une journée*
Le moteur est couvert ; les écrans ne le sont que par des vérifications
manuelles. Playwright permettrait de rejouer le parcours à chaque
modification et d'éviter les régressions.

**2.4 Accessibilité** — *une demi-journée*
Navigation au clavier, contrastes vérifiés, annonces pour lecteurs d'écran
sur le minuteur. Utile aussi pour l'usage à une main, en salle.

---

### Phase 3 — Compléter les manques fonctionnels

**3.1 Repas favoris** — *une demi-journée*
Votre spécification mentionne « repas à renseigner **OU repas favoris** ».
Seule la première branche existe. Enregistrer une combinaison d'aliments
sous un nom et la rejouer en un geste ferait gagner un temps considérable :
c'est le point qui décide de l'abandon ou non du suivi nutritionnel.

**3.2 Historique des séances** — *une demi-journée*
Les séances réalisées sont enregistrées mais jamais affichées. Un écran
listant les dernières séances, avec ressenti et taux d'accomplissement,
donnerait du sens à la série 🔥.

**3.3 Charges utilisées par exercice** — *une journée*
Le programme dit « 4 × 8 » mais ne retient pas *avec quelle charge*. Sans
cet historique, impossible d'appliquer la surcharge progressive, qui est
pourtant le moteur de tout progrès en force.

**3.4 Distance pour le cardio** — *quelques heures*
Votre spécification demande « Durée **/ Km** ». Seule la durée est gérée.
Une saisie de distance et d'allure compléterait le suivi endurance.

**3.5 Recalcul automatique du programme** — *une journée*
Après une pesée, les calories sont recalculées, mais le programme reste
figé sur le profil initial. Une progression de niveau devrait déclencher
une régénération, en conservant l'historique.

---

### Phase 4 — Enrichissements *(seulement si l'usage le justifie)*

- **Vidéos ou schémas d'exercices** — 135 exercices à illustrer : gros
  travail, fort impact sur la qualité d'exécution.
- **Notifications poussées** — nécessitent un serveur et des clés VAPID.
  Rompt la contrainte « 0 € ». Les rappels locaux couvrent l'essentiel.
- **Export PDF du programme** — utile pour un usage en coaching.
- **Mode coach multi-clients** — l'architecture le permet déjà
  (`listerFiches` renvoie une liste), l'interface est mono-profil.
- **Import de données santé** (Apple Santé, Google Fit) — pesées et pas
  quotidiens récupérés automatiquement.

---

## Ce que je ne recommande pas

**Refaire le moteur en service distant.** Il tourne dans le navigateur, donc
sans latence, sans coût serveur et hors ligne. Le déplacer n'apporterait rien.

**Ajouter une base de données d'aliments externe** (OpenFoodFacts) avant
d'avoir éprouvé la base actuelle. Soixante aliments couvrent l'essentiel des
repas courants ; une base de 800 000 références ajouterait surtout du bruit
à la recherche.

**Développer les notifications poussées maintenant.** Elles supposent un
serveur permanent : contradictoire avec le budget nul, pour un gain limité
tant que l'application n'a pas d'utilisateurs réguliers.

---

## Résumé

| Phase | Contenu | Effort | Priorité |
|---|---|---|---|
| **1** | Déployer et utiliser une semaine | 15 min + usage | 🔴 immédiat |
| **2** | Synchronisation complète, tests, accessibilité | 2-3 jours | 🟠 après retours |
| **3** | Favoris, historique, charges, distances | 3-4 jours | 🟡 selon l'usage |
| **4** | Vidéos, push, PDF, mode coach | variable | 🟢 plus tard |

**La seule action réellement urgente : déployer, puis utiliser.**
Le reste se décidera à la lumière de cette semaine d'usage.

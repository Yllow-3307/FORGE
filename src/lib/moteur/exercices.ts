/**
 * exercices.ts — Bibliothèque d'exercices (générée depuis moteur/exercices.py).
 *
 * NE PAS ÉDITER À LA MAIN : régénérer via `python3 sync_moteur.py`.
 * Le premier muscle listé est l'agoniste principal ; `improvise` marque les
 * solutions de dépannage (serviette, table) réservées aux profils sans matériel.
 */
import type { Exercice } from "./types";

export const BIBLIOTHEQUE: Exercice[] = [
 {
  "nom": "Tirage isométrique serviette (porte)",
  "pattern": "traction_verticale",
  "niveau": 1,
  "progression": 1,
  "muscles": [
   "dos",
   "biceps"
  ],
  "equip": [],
  "contre_ind": [],
  "unite": "temps",
  "tempo": "2-0-1-0",
  "note": "Serviette autour d'une poignée de porte solide, tirer 10-20 s.",
  "unilateral": false,
  "improvise": true
 },
 {
  "nom": "Pull-over au sol serviette (sliding)",
  "pattern": "traction_verticale",
  "niveau": 2,
  "progression": 2,
  "muscles": [
   "dos"
  ],
  "equip": [],
  "contre_ind": [],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "Bras tendus au sol sur serviette, tirer le corps vers l'avant.",
  "unilateral": false,
  "improvise": true
 },
 {
  "nom": "Tirage élastique vertical assis",
  "pattern": "traction_verticale",
  "niveau": 1,
  "progression": 1,
  "muscles": [
   "dos",
   "biceps"
  ],
  "equip": [
   "elastiques"
  ],
  "contre_ind": [],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Traction australienne barre haute (corps oblique)",
  "pattern": "traction_verticale",
  "niveau": 2,
  "progression": 2,
  "muscles": [
   "dos",
   "biceps"
  ],
  "equip": [
   "barre_traction"
  ],
  "contre_ind": [],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Traction assistée élastique",
  "pattern": "traction_verticale",
  "niveau": 2,
  "progression": 3,
  "muscles": [
   "dos",
   "biceps"
  ],
  "equip": [
   "barre_traction",
   "elastiques"
  ],
  "contre_ind": [],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Traction négative (descente 5 s)",
  "pattern": "traction_verticale",
  "niveau": 3,
  "progression": 4,
  "muscles": [
   "dos",
   "biceps"
  ],
  "equip": [
   "barre_traction"
  ],
  "contre_ind": [],
  "unite": "reps",
  "tempo": "X-0-5-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Traction supination (chin-up)",
  "pattern": "traction_verticale",
  "niveau": 3,
  "progression": 5,
  "muscles": [
   "dos",
   "biceps"
  ],
  "equip": [
   "barre_traction"
  ],
  "contre_ind": [],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Traction pronation stricte",
  "pattern": "traction_verticale",
  "niveau": 4,
  "progression": 6,
  "muscles": [
   "dos",
   "biceps"
  ],
  "equip": [
   "barre_traction"
  ],
  "contre_ind": [],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Traction lestée",
  "pattern": "traction_verticale",
  "niveau": 5,
  "progression": 7,
  "muscles": [
   "dos",
   "biceps"
  ],
  "equip": [
   "barre_traction",
   "gilet_leste"
  ],
  "contre_ind": [],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Traction archer",
  "pattern": "traction_verticale",
  "niveau": 5,
  "progression": 8,
  "muscles": [
   "dos",
   "biceps"
  ],
  "equip": [
   "barre_traction"
  ],
  "contre_ind": [],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": true,
  "improvise": false
 },
 {
  "nom": "Traction à un bras assistée",
  "pattern": "traction_verticale",
  "niveau": 6,
  "progression": 9,
  "muscles": [
   "dos",
   "biceps"
  ],
  "equip": [
   "barre_traction",
   "elastiques"
  ],
  "contre_ind": [],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": true,
  "improvise": false
 },
 {
  "nom": "Tirage vertical à la poulie",
  "pattern": "traction_verticale",
  "niveau": 2,
  "progression": 3,
  "muscles": [
   "dos",
   "biceps"
  ],
  "equip": [
   "poulie"
  ],
  "contre_ind": [],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Traction aux anneaux",
  "pattern": "traction_verticale",
  "niveau": 4,
  "progression": 6,
  "muscles": [
   "dos",
   "biceps"
  ],
  "equip": [
   "anneaux"
  ],
  "contre_ind": [],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Rowing élastique assis",
  "pattern": "traction_horizontale",
  "niveau": 1,
  "progression": 1,
  "muscles": [
   "dos",
   "biceps"
  ],
  "equip": [
   "elastiques"
  ],
  "contre_ind": [],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Rowing serviette (isométrique porte)",
  "pattern": "traction_horizontale",
  "niveau": 1,
  "progression": 1,
  "muscles": [
   "dos",
   "biceps"
  ],
  "equip": [],
  "contre_ind": [],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": true
 },
 {
  "nom": "Rowing sous une table solide",
  "pattern": "traction_horizontale",
  "niveau": 3,
  "progression": 3,
  "muscles": [
   "dos",
   "biceps"
  ],
  "equip": [],
  "contre_ind": [],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "Allongé sous une table, saisir le bord et tirer la poitrine vers le plateau.",
  "unilateral": false,
  "improvise": true
 },
 {
  "nom": "Rowing inversé entre deux chaises + manche à balai",
  "pattern": "traction_horizontale",
  "niveau": 3,
  "progression": 4,
  "muscles": [
   "dos",
   "biceps"
  ],
  "equip": [],
  "contre_ind": [],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "Manche solide posé sur deux dossiers de chaise lestés.",
  "unilateral": false,
  "improvise": true
 },
 {
  "nom": "Traction australienne (pieds au sol)",
  "pattern": "traction_horizontale",
  "niveau": 2,
  "progression": 2,
  "muscles": [
   "dos",
   "biceps"
  ],
  "equip": [
   "barre_traction"
  ],
  "contre_ind": [],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Rowing anneaux inclinaison moyenne",
  "pattern": "traction_horizontale",
  "niveau": 3,
  "progression": 3,
  "muscles": [
   "dos",
   "biceps"
  ],
  "equip": [
   "anneaux"
  ],
  "contre_ind": [],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Rowing haltère unilatéral",
  "pattern": "traction_horizontale",
  "niveau": 2,
  "progression": 3,
  "muscles": [
   "dos",
   "biceps"
  ],
  "equip": [
   "halteres"
  ],
  "contre_ind": [],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": true,
  "improvise": false
 },
 {
  "nom": "Rowing barre penché",
  "pattern": "traction_horizontale",
  "niveau": 3,
  "progression": 4,
  "muscles": [
   "dos",
   "biceps",
   "lombaires"
  ],
  "equip": [
   "barre_olympique"
  ],
  "contre_ind": [
   "lombaires"
  ],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Rowing TRX pieds surélevés",
  "pattern": "traction_horizontale",
  "niveau": 4,
  "progression": 5,
  "muscles": [
   "dos",
   "biceps"
  ],
  "equip": [
   "trx"
  ],
  "contre_ind": [],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Front lever row",
  "pattern": "traction_horizontale",
  "niveau": 6,
  "progression": 7,
  "muscles": [
   "dos",
   "abdos"
  ],
  "equip": [
   "barre_traction"
  ],
  "contre_ind": [],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Pompes contre un mur",
  "pattern": "poussee_horizontale",
  "niveau": 1,
  "progression": 1,
  "muscles": [
   "pectoraux",
   "triceps"
  ],
  "equip": [],
  "contre_ind": [],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Pompes sur table / rebord",
  "pattern": "poussee_horizontale",
  "niveau": 1,
  "progression": 2,
  "muscles": [
   "pectoraux",
   "triceps"
  ],
  "equip": [],
  "contre_ind": [],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Pompes genoux au sol",
  "pattern": "poussee_horizontale",
  "niveau": 2,
  "progression": 3,
  "muscles": [
   "pectoraux",
   "triceps"
  ],
  "equip": [],
  "contre_ind": [],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Pompes classiques",
  "pattern": "poussee_horizontale",
  "niveau": 3,
  "progression": 4,
  "muscles": [
   "pectoraux",
   "triceps",
   "epaules"
  ],
  "equip": [],
  "contre_ind": [],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Pompes diamant",
  "pattern": "poussee_horizontale",
  "niveau": 4,
  "progression": 5,
  "muscles": [
   "triceps",
   "pectoraux"
  ],
  "equip": [],
  "contre_ind": [],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Pompes pieds surélevés (déclinées)",
  "pattern": "poussee_horizontale",
  "niveau": 4,
  "progression": 6,
  "muscles": [
   "pectoraux",
   "epaules"
  ],
  "equip": [],
  "contre_ind": [],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Pompes aux anneaux",
  "pattern": "poussee_horizontale",
  "niveau": 5,
  "progression": 7,
  "muscles": [
   "pectoraux",
   "triceps"
  ],
  "equip": [
   "anneaux"
  ],
  "contre_ind": [],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Pompes archer",
  "pattern": "poussee_horizontale",
  "niveau": 5,
  "progression": 7,
  "muscles": [
   "pectoraux",
   "triceps"
  ],
  "equip": [],
  "contre_ind": [],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": true,
  "improvise": false
 },
 {
  "nom": "Pompes un bras (assistées)",
  "pattern": "poussee_horizontale",
  "niveau": 6,
  "progression": 8,
  "muscles": [
   "pectoraux",
   "triceps"
  ],
  "equip": [],
  "contre_ind": [],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": true,
  "improvise": false
 },
 {
  "nom": "Développé couché haltères",
  "pattern": "poussee_horizontale",
  "niveau": 3,
  "progression": 4,
  "muscles": [
   "pectoraux",
   "triceps"
  ],
  "equip": [
   "halteres",
   "banc"
  ],
  "contre_ind": [],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Développé couché barre",
  "pattern": "poussee_horizontale",
  "niveau": 4,
  "progression": 5,
  "muscles": [
   "pectoraux",
   "triceps"
  ],
  "equip": [
   "barre_olympique",
   "banc"
  ],
  "contre_ind": [
   "epaule"
  ],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Pompes lestées (gilet)",
  "pattern": "poussee_horizontale",
  "niveau": 5,
  "progression": 6,
  "muscles": [
   "pectoraux",
   "triceps"
  ],
  "equip": [
   "gilet_leste"
  ],
  "contre_ind": [],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Élévations épaules élastique",
  "pattern": "poussee_verticale",
  "niveau": 1,
  "progression": 1,
  "muscles": [
   "epaules"
  ],
  "equip": [
   "elastiques"
  ],
  "contre_ind": [],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Pompes inclinées mains surélevées (pike)",
  "pattern": "poussee_verticale",
  "niveau": 2,
  "progression": 2,
  "muscles": [
   "epaules",
   "triceps"
  ],
  "equip": [],
  "contre_ind": [],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Pike push-up au sol",
  "pattern": "poussee_verticale",
  "niveau": 3,
  "progression": 3,
  "muscles": [
   "epaules",
   "triceps"
  ],
  "equip": [],
  "contre_ind": [],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Dips sur banc/chaise (pieds au sol)",
  "pattern": "poussee_verticale",
  "niveau": 2,
  "progression": 2,
  "muscles": [
   "triceps",
   "pectoraux"
  ],
  "equip": [],
  "contre_ind": [
   "epaule"
  ],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Dips barres parallèles",
  "pattern": "poussee_verticale",
  "niveau": 4,
  "progression": 4,
  "muscles": [
   "triceps",
   "pectoraux",
   "epaules"
  ],
  "equip": [
   "barres_paralleles"
  ],
  "contre_ind": [
   "epaule"
  ],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Développé militaire haltères",
  "pattern": "poussee_verticale",
  "niveau": 3,
  "progression": 3,
  "muscles": [
   "epaules",
   "triceps"
  ],
  "equip": [
   "halteres"
  ],
  "contre_ind": [],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Pike push-up pieds surélevés",
  "pattern": "poussee_verticale",
  "niveau": 4,
  "progression": 5,
  "muscles": [
   "epaules",
   "triceps"
  ],
  "equip": [],
  "contre_ind": [],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Dips aux anneaux",
  "pattern": "poussee_verticale",
  "niveau": 5,
  "progression": 6,
  "muscles": [
   "triceps",
   "pectoraux"
  ],
  "equip": [
   "anneaux"
  ],
  "contre_ind": [
   "epaule"
  ],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Pompes en équilibre contre mur",
  "pattern": "poussee_verticale",
  "niveau": 5,
  "progression": 7,
  "muscles": [
   "epaules",
   "triceps"
  ],
  "equip": [],
  "contre_ind": [],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Handstand push-up libre",
  "pattern": "poussee_verticale",
  "niveau": 6,
  "progression": 8,
  "muscles": [
   "epaules",
   "triceps"
  ],
  "equip": [],
  "contre_ind": [
   "epaule",
   "poignet"
  ],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Dips lestés",
  "pattern": "poussee_verticale",
  "niveau": 5,
  "progression": 6,
  "muscles": [
   "triceps",
   "pectoraux"
  ],
  "equip": [
   "barres_paralleles",
   "gilet_leste"
  ],
  "contre_ind": [
   "epaule"
  ],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Squat sur chaise (assis-debout)",
  "pattern": "squat",
  "niveau": 1,
  "progression": 1,
  "muscles": [
   "quadriceps",
   "fessiers"
  ],
  "equip": [],
  "contre_ind": [],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Squat poids de corps",
  "pattern": "squat",
  "niveau": 2,
  "progression": 2,
  "muscles": [
   "quadriceps",
   "fessiers"
  ],
  "equip": [],
  "contre_ind": [],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Squat gobelet kettlebell",
  "pattern": "squat",
  "niveau": 3,
  "progression": 3,
  "muscles": [
   "quadriceps",
   "fessiers"
  ],
  "equip": [
   "kettlebell"
  ],
  "contre_ind": [],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Squat gobelet haltère",
  "pattern": "squat",
  "niveau": 3,
  "progression": 3,
  "muscles": [
   "quadriceps",
   "fessiers"
  ],
  "equip": [
   "halteres"
  ],
  "contre_ind": [],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Squat sauté",
  "pattern": "squat",
  "niveau": 4,
  "progression": 4,
  "muscles": [
   "quadriceps",
   "fessiers"
  ],
  "equip": [],
  "contre_ind": [
   "genou"
  ],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Squat bulgare",
  "pattern": "squat",
  "niveau": 4,
  "progression": 5,
  "muscles": [
   "quadriceps",
   "fessiers"
  ],
  "equip": [],
  "contre_ind": [],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": true,
  "improvise": false
 },
 {
  "nom": "Back squat barre",
  "pattern": "squat",
  "niveau": 4,
  "progression": 5,
  "muscles": [
   "quadriceps",
   "fessiers"
  ],
  "equip": [
   "barre_olympique",
   "rack"
  ],
  "contre_ind": [
   "lombaires"
  ],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Squat pistol assisté",
  "pattern": "squat",
  "niveau": 5,
  "progression": 6,
  "muscles": [
   "quadriceps",
   "fessiers"
  ],
  "equip": [],
  "contre_ind": [
   "genou"
  ],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": true,
  "improvise": false
 },
 {
  "nom": "Pistol squat complet",
  "pattern": "squat",
  "niveau": 6,
  "progression": 7,
  "muscles": [
   "quadriceps",
   "fessiers"
  ],
  "equip": [],
  "contre_ind": [
   "genou"
  ],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": true,
  "improvise": false
 },
 {
  "nom": "Presse à cuisses",
  "pattern": "squat",
  "niveau": 2,
  "progression": 3,
  "muscles": [
   "quadriceps",
   "fessiers"
  ],
  "equip": [
   "machines_salle"
  ],
  "contre_ind": [],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Hip thrust au sol (pont fessier)",
  "pattern": "charniere",
  "niveau": 1,
  "progression": 1,
  "muscles": [
   "fessiers",
   "ischios"
  ],
  "equip": [],
  "contre_ind": [],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Pont fessier une jambe",
  "pattern": "charniere",
  "niveau": 3,
  "progression": 3,
  "muscles": [
   "fessiers",
   "ischios"
  ],
  "equip": [],
  "contre_ind": [],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": true,
  "improvise": false
 },
 {
  "nom": "Good morning élastique",
  "pattern": "charniere",
  "niveau": 2,
  "progression": 2,
  "muscles": [
   "ischios",
   "lombaires"
  ],
  "equip": [
   "elastiques"
  ],
  "contre_ind": [],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Soulevé de terre roumain haltères",
  "pattern": "charniere",
  "niveau": 3,
  "progression": 4,
  "muscles": [
   "ischios",
   "fessiers"
  ],
  "equip": [
   "halteres"
  ],
  "contre_ind": [
   "lombaires"
  ],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Swing kettlebell",
  "pattern": "charniere",
  "niveau": 4,
  "progression": 5,
  "muscles": [
   "fessiers",
   "ischios"
  ],
  "equip": [
   "kettlebell"
  ],
  "contre_ind": [
   "lombaires"
  ],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Soulevé de terre barre",
  "pattern": "charniere",
  "niveau": 5,
  "progression": 6,
  "muscles": [
   "ischios",
   "fessiers",
   "lombaires"
  ],
  "equip": [
   "barre_olympique"
  ],
  "contre_ind": [
   "lombaires"
  ],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Nordic curl assisté",
  "pattern": "charniere",
  "niveau": 5,
  "progression": 6,
  "muscles": [
   "ischios"
  ],
  "equip": [],
  "contre_ind": [
   "genou"
  ],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Leg curl nordique complet",
  "pattern": "charniere",
  "niveau": 6,
  "progression": 7,
  "muscles": [
   "ischios"
  ],
  "equip": [],
  "contre_ind": [
   "genou"
  ],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Fente statique appui",
  "pattern": "fente",
  "niveau": 1,
  "progression": 1,
  "muscles": [
   "quadriceps",
   "fessiers"
  ],
  "equip": [],
  "contre_ind": [],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": true,
  "improvise": false
 },
 {
  "nom": "Fente avant alternée",
  "pattern": "fente",
  "niveau": 2,
  "progression": 2,
  "muscles": [
   "quadriceps",
   "fessiers"
  ],
  "equip": [],
  "contre_ind": [
   "genou"
  ],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": true,
  "improvise": false
 },
 {
  "nom": "Fente marchée haltères",
  "pattern": "fente",
  "niveau": 3,
  "progression": 3,
  "muscles": [
   "quadriceps",
   "fessiers"
  ],
  "equip": [
   "halteres"
  ],
  "contre_ind": [
   "genou"
  ],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": true,
  "improvise": false
 },
 {
  "nom": "Step-up sur marche",
  "pattern": "fente",
  "niveau": 2,
  "progression": 2,
  "muscles": [
   "quadriceps",
   "fessiers"
  ],
  "equip": [
   "step_escalier"
  ],
  "contre_ind": [],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": true,
  "improvise": false
 },
 {
  "nom": "Fente sautée",
  "pattern": "fente",
  "niveau": 4,
  "progression": 4,
  "muscles": [
   "quadriceps",
   "fessiers"
  ],
  "equip": [],
  "contre_ind": [
   "genou"
  ],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": true,
  "improvise": false
 },
 {
  "nom": "Planche sur genoux",
  "pattern": "gainage_anterieur",
  "niveau": 1,
  "progression": 1,
  "muscles": [
   "abdos"
  ],
  "equip": [],
  "contre_ind": [],
  "unite": "temps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Planche classique",
  "pattern": "gainage_anterieur",
  "niveau": 2,
  "progression": 2,
  "muscles": [
   "abdos"
  ],
  "equip": [],
  "contre_ind": [],
  "unite": "temps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Dead bug",
  "pattern": "gainage_anterieur",
  "niveau": 2,
  "progression": 2,
  "muscles": [
   "abdos"
  ],
  "equip": [],
  "contre_ind": [],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Hollow body hold",
  "pattern": "gainage_anterieur",
  "niveau": 3,
  "progression": 3,
  "muscles": [
   "abdos"
  ],
  "equip": [],
  "contre_ind": [],
  "unite": "temps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Relevé de jambes suspendu genoux",
  "pattern": "gainage_anterieur",
  "niveau": 3,
  "progression": 4,
  "muscles": [
   "abdos"
  ],
  "equip": [
   "barre_traction"
  ],
  "contre_ind": [],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Relevé de jambes tendues suspendu",
  "pattern": "gainage_anterieur",
  "niveau": 5,
  "progression": 5,
  "muscles": [
   "abdos"
  ],
  "equip": [
   "barre_traction"
  ],
  "contre_ind": [],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Ab wheel / roue abdominale",
  "pattern": "gainage_anterieur",
  "niveau": 5,
  "progression": 6,
  "muscles": [
   "abdos"
  ],
  "equip": [],
  "contre_ind": [
   "lombaires"
  ],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Dragon flag",
  "pattern": "gainage_anterieur",
  "niveau": 6,
  "progression": 7,
  "muscles": [
   "abdos"
  ],
  "equip": [],
  "contre_ind": [
   "lombaires"
  ],
  "unite": "temps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Planche latérale genoux",
  "pattern": "gainage_lateral",
  "niveau": 1,
  "progression": 1,
  "muscles": [
   "abdos"
  ],
  "equip": [],
  "contre_ind": [],
  "unite": "temps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": true,
  "improvise": false
 },
 {
  "nom": "Planche latérale complète",
  "pattern": "gainage_lateral",
  "niveau": 3,
  "progression": 2,
  "muscles": [
   "abdos"
  ],
  "equip": [],
  "contre_ind": [],
  "unite": "temps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": true,
  "improvise": false
 },
 {
  "nom": "Planche latérale + élévation jambe",
  "pattern": "gainage_lateral",
  "niveau": 4,
  "progression": 3,
  "muscles": [
   "abdos",
   "fessiers"
  ],
  "equip": [],
  "contre_ind": [],
  "unite": "temps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": true,
  "improvise": false
 },
 {
  "nom": "Suitcase carry",
  "pattern": "gainage_lateral",
  "niveau": 3,
  "progression": 3,
  "muscles": [
   "abdos"
  ],
  "equip": [
   "kettlebell"
  ],
  "contre_ind": [],
  "unite": "temps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": true,
  "improvise": false
 },
 {
  "nom": "Superman au sol",
  "pattern": "gainage_posterieur",
  "niveau": 1,
  "progression": 1,
  "muscles": [
   "lombaires",
   "fessiers"
  ],
  "equip": [],
  "contre_ind": [],
  "unite": "temps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Bird dog",
  "pattern": "gainage_posterieur",
  "niveau": 2,
  "progression": 2,
  "muscles": [
   "lombaires",
   "abdos"
  ],
  "equip": [],
  "contre_ind": [],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Extension lombaire (banc)",
  "pattern": "gainage_posterieur",
  "niveau": 3,
  "progression": 3,
  "muscles": [
   "lombaires"
  ],
  "equip": [
   "banc"
  ],
  "contre_ind": [],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Reverse hyperextension",
  "pattern": "gainage_posterieur",
  "niveau": 4,
  "progression": 4,
  "muscles": [
   "lombaires",
   "fessiers"
  ],
  "equip": [
   "banc"
  ],
  "contre_ind": [],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Planche avec tape d'épaule",
  "pattern": "anti_rotation",
  "niveau": 2,
  "progression": 1,
  "muscles": [
   "abdos",
   "epaules"
  ],
  "equip": [],
  "contre_ind": [],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Pallof press élastique",
  "pattern": "anti_rotation",
  "niveau": 2,
  "progression": 1,
  "muscles": [
   "abdos"
  ],
  "equip": [
   "elastiques"
  ],
  "contre_ind": [],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Planche + extension bras alternée",
  "pattern": "anti_rotation",
  "niveau": 3,
  "progression": 2,
  "muscles": [
   "abdos",
   "epaules"
  ],
  "equip": [],
  "contre_ind": [],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Renegade row",
  "pattern": "anti_rotation",
  "niveau": 4,
  "progression": 2,
  "muscles": [
   "abdos",
   "dos"
  ],
  "equip": [
   "halteres"
  ],
  "contre_ind": [],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Curl élastique",
  "pattern": "isolation_bras",
  "niveau": 1,
  "progression": 1,
  "muscles": [
   "biceps"
  ],
  "equip": [
   "elastiques"
  ],
  "contre_ind": [],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Curl haltères",
  "pattern": "isolation_bras",
  "niveau": 1,
  "progression": 2,
  "muscles": [
   "biceps"
  ],
  "equip": [
   "halteres"
  ],
  "contre_ind": [],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Curl marteau haltères",
  "pattern": "isolation_bras",
  "niveau": 2,
  "progression": 3,
  "muscles": [
   "biceps"
  ],
  "equip": [
   "halteres"
  ],
  "contre_ind": [],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Curl serviette isométrique",
  "pattern": "isolation_bras",
  "niveau": 1,
  "progression": 1,
  "muscles": [
   "biceps"
  ],
  "equip": [],
  "contre_ind": [],
  "unite": "temps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": true
 },
 {
  "nom": "Traction supination tempo lent (biceps)",
  "pattern": "isolation_bras",
  "niveau": 4,
  "progression": 4,
  "muscles": [
   "biceps",
   "dos"
  ],
  "equip": [
   "barre_traction"
  ],
  "contre_ind": [],
  "unite": "reps",
  "tempo": "3-1-3-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Curl anneaux (corps incliné)",
  "pattern": "isolation_bras",
  "niveau": 3,
  "progression": 3,
  "muscles": [
   "biceps"
  ],
  "equip": [
   "anneaux"
  ],
  "contre_ind": [],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Extension triceps élastique",
  "pattern": "isolation_bras",
  "niveau": 1,
  "progression": 1,
  "muscles": [
   "triceps"
  ],
  "equip": [
   "elastiques"
  ],
  "contre_ind": [],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Extension triceps nuque haltère",
  "pattern": "isolation_bras",
  "niveau": 2,
  "progression": 2,
  "muscles": [
   "triceps"
  ],
  "equip": [
   "halteres"
  ],
  "contre_ind": [],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Pompes diamant genoux",
  "pattern": "isolation_bras",
  "niveau": 2,
  "progression": 2,
  "muscles": [
   "triceps",
   "pectoraux"
  ],
  "equip": [],
  "contre_ind": [],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Dips sur chaise (triceps)",
  "pattern": "isolation_bras",
  "niveau": 2,
  "progression": 3,
  "muscles": [
   "triceps"
  ],
  "equip": [],
  "contre_ind": [
   "epaule"
  ],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Extension triceps aux anneaux",
  "pattern": "isolation_bras",
  "niveau": 4,
  "progression": 4,
  "muscles": [
   "triceps"
  ],
  "equip": [
   "anneaux"
  ],
  "contre_ind": [
   "epaule"
  ],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Skull crusher haltères",
  "pattern": "isolation_bras",
  "niveau": 3,
  "progression": 3,
  "muscles": [
   "triceps"
  ],
  "equip": [
   "halteres",
   "banc"
  ],
  "contre_ind": [],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Curl ischios avec serviette (glissé au sol)",
  "pattern": "charniere",
  "niveau": 2,
  "progression": 2,
  "muscles": [
   "ischios"
  ],
  "equip": [],
  "contre_ind": [],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "Talons sur serviette/chaussettes, sol lisse : glisser en contrôlant.",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Curl ischios élastique allongé",
  "pattern": "charniere",
  "niveau": 1,
  "progression": 1,
  "muscles": [
   "ischios"
  ],
  "equip": [
   "elastiques"
  ],
  "contre_ind": [],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Pont fessier talons surélevés (ischios)",
  "pattern": "charniere",
  "niveau": 2,
  "progression": 2,
  "muscles": [
   "ischios",
   "fessiers"
  ],
  "equip": [],
  "contre_ind": [],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Leg curl machine",
  "pattern": "charniere",
  "niveau": 1,
  "progression": 2,
  "muscles": [
   "ischios"
  ],
  "equip": [
   "machines_salle"
  ],
  "contre_ind": [],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Extensions mollets debout",
  "pattern": "mollets",
  "niveau": 1,
  "progression": 1,
  "muscles": [
   "mollets"
  ],
  "equip": [],
  "contre_ind": [],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Extensions mollets une jambe sur marche",
  "pattern": "mollets",
  "niveau": 3,
  "progression": 2,
  "muscles": [
   "mollets"
  ],
  "equip": [
   "step_escalier"
  ],
  "contre_ind": [],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": true,
  "improvise": false
 },
 {
  "nom": "Tuck front lever hold",
  "pattern": "skill",
  "niveau": 4,
  "progression": 1,
  "muscles": [
   "dos",
   "abdos"
  ],
  "equip": [
   "barre_traction"
  ],
  "contre_ind": [],
  "unite": "temps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Advanced tuck front lever",
  "pattern": "skill",
  "niveau": 5,
  "progression": 2,
  "muscles": [
   "dos",
   "abdos"
  ],
  "equip": [
   "barre_traction"
  ],
  "contre_ind": [],
  "unite": "temps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Straddle front lever",
  "pattern": "skill",
  "niveau": 6,
  "progression": 3,
  "muscles": [
   "dos",
   "abdos"
  ],
  "equip": [
   "barre_traction"
  ],
  "contre_ind": [],
  "unite": "temps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Tuck planche",
  "pattern": "skill",
  "niveau": 4,
  "progression": 1,
  "muscles": [
   "epaules",
   "abdos"
  ],
  "equip": [],
  "contre_ind": [
   "poignet"
  ],
  "unite": "temps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Straddle planche",
  "pattern": "skill",
  "niveau": 6,
  "progression": 3,
  "muscles": [
   "epaules",
   "abdos"
  ],
  "equip": [],
  "contre_ind": [
   "poignet"
  ],
  "unite": "temps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Équilibre contre mur (handstand)",
  "pattern": "skill",
  "niveau": 3,
  "progression": 1,
  "muscles": [
   "epaules",
   "abdos"
  ],
  "equip": [],
  "contre_ind": [
   "poignet"
  ],
  "unite": "temps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Handstand libre",
  "pattern": "skill",
  "niveau": 5,
  "progression": 2,
  "muscles": [
   "epaules",
   "abdos"
  ],
  "equip": [],
  "contre_ind": [
   "poignet"
  ],
  "unite": "temps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Muscle-up négatif",
  "pattern": "skill",
  "niveau": 5,
  "progression": 2,
  "muscles": [
   "dos",
   "triceps"
  ],
  "equip": [
   "barre_traction"
  ],
  "contre_ind": [
   "epaule"
  ],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Muscle-up strict",
  "pattern": "skill",
  "niveau": 6,
  "progression": 3,
  "muscles": [
   "dos",
   "triceps"
  ],
  "equip": [
   "barre_traction"
  ],
  "contre_ind": [
   "epaule"
  ],
  "unite": "reps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "L-sit sol",
  "pattern": "skill",
  "niveau": 4,
  "progression": 1,
  "muscles": [
   "abdos",
   "triceps"
  ],
  "equip": [],
  "contre_ind": [],
  "unite": "temps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Cat-cow",
  "pattern": "mobilite",
  "niveau": 1,
  "progression": 1,
  "muscles": [
   "lombaires"
  ],
  "equip": [],
  "contre_ind": [],
  "unite": "temps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Ouverture thoracique au mur",
  "pattern": "mobilite",
  "niveau": 1,
  "progression": 1,
  "muscles": [
   "epaules"
  ],
  "equip": [],
  "contre_ind": [],
  "unite": "temps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Étirement fléchisseurs de hanche",
  "pattern": "mobilite",
  "niveau": 1,
  "progression": 1,
  "muscles": [
   "quadriceps"
  ],
  "equip": [],
  "contre_ind": [],
  "unite": "temps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": true,
  "improvise": false
 },
 {
  "nom": "World's greatest stretch",
  "pattern": "mobilite",
  "niveau": 2,
  "progression": 2,
  "muscles": [
   "quadriceps",
   "lombaires"
  ],
  "equip": [],
  "contre_ind": [],
  "unite": "temps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": true,
  "improvise": false
 },
 {
  "nom": "Dislocations épaules bâton/élastique",
  "pattern": "mobilite",
  "niveau": 1,
  "progression": 1,
  "muscles": [
   "epaules"
  ],
  "equip": [
   "elastiques"
  ],
  "contre_ind": [],
  "unite": "temps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Squat profond tenu (deep squat hold)",
  "pattern": "mobilite",
  "niveau": 2,
  "progression": 2,
  "muscles": [
   "quadriceps"
  ],
  "equip": [],
  "contre_ind": [
   "genou"
  ],
  "unite": "temps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Jefferson curl léger",
  "pattern": "mobilite",
  "niveau": 3,
  "progression": 3,
  "muscles": [
   "lombaires",
   "ischios"
  ],
  "equip": [],
  "contre_ind": [
   "lombaires"
  ],
  "unite": "temps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Marche rapide",
  "pattern": "cardio",
  "niveau": 1,
  "progression": 1,
  "muscles": [
   "quadriceps"
  ],
  "equip": [],
  "contre_ind": [],
  "unite": "distance",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Marche en côte / escaliers",
  "pattern": "cardio",
  "niveau": 2,
  "progression": 2,
  "muscles": [
   "quadriceps",
   "fessiers"
  ],
  "equip": [
   "step_escalier"
  ],
  "contre_ind": [],
  "unite": "temps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Course à pied extérieur",
  "pattern": "cardio",
  "niveau": 3,
  "progression": 3,
  "muscles": [
   "quadriceps",
   "mollets"
  ],
  "equip": [],
  "contre_ind": [
   "genou",
   "cheville"
  ],
  "unite": "distance",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Tapis de course",
  "pattern": "cardio",
  "niveau": 3,
  "progression": 3,
  "muscles": [
   "quadriceps",
   "mollets"
  ],
  "equip": [
   "tapis_course"
  ],
  "contre_ind": [
   "genou"
  ],
  "unite": "distance",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Vélo d'appartement",
  "pattern": "cardio",
  "niveau": 2,
  "progression": 2,
  "muscles": [
   "quadriceps"
  ],
  "equip": [
   "velo_appartement"
  ],
  "contre_ind": [],
  "unite": "temps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Vélo route / trajet vélo",
  "pattern": "cardio",
  "niveau": 2,
  "progression": 2,
  "muscles": [
   "quadriceps"
  ],
  "equip": [
   "velo_route"
  ],
  "contre_ind": [],
  "unite": "temps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Rameur",
  "pattern": "cardio",
  "niveau": 3,
  "progression": 3,
  "muscles": [
   "dos",
   "quadriceps"
  ],
  "equip": [
   "rameur"
  ],
  "contre_ind": [
   "lombaires"
  ],
  "unite": "temps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Corde à sauter",
  "pattern": "cardio",
  "niveau": 3,
  "progression": 3,
  "muscles": [
   "mollets"
  ],
  "equip": [
   "corde_a_sauter"
  ],
  "contre_ind": [
   "genou",
   "cheville"
  ],
  "unite": "temps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Natation",
  "pattern": "cardio",
  "niveau": 2,
  "progression": 2,
  "muscles": [
   "dos",
   "epaules"
  ],
  "equip": [
   "piscine"
  ],
  "contre_ind": [],
  "unite": "temps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Circuit cardio poids de corps (burpees, montées genoux)",
  "pattern": "cardio",
  "niveau": 3,
  "progression": 3,
  "muscles": [
   "quadriceps",
   "abdos"
  ],
  "equip": [],
  "contre_ind": [
   "genou"
  ],
  "unite": "temps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 },
 {
  "nom": "Shadow boxing / cardio sans impact",
  "pattern": "cardio",
  "niveau": 2,
  "progression": 2,
  "muscles": [
   "epaules",
   "abdos"
  ],
  "equip": [],
  "contre_ind": [],
  "unite": "temps",
  "tempo": "2-0-1-0",
  "note": "",
  "unilateral": false,
  "improvise": false
 }
] as Exercice[];

export const NB_EXERCICES = BIBLIOTHEQUE.length;

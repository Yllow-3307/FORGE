#!/usr/bin/env python3
"""
sync_moteur.py — Régénère la bibliothèque d'exercices TypeScript à partir
du moteur Python de référence (../moteur/exercices.py).

À lancer après toute modification de la bibliothèque Python :
    python3 sync_moteur.py

Le moteur Python de référence se trouve dans `moteur-python/`.

Le fichier produit (src/lib/moteur/exercices.ts) ne doit jamais être édité
à la main : il serait écrasé au prochain lancement.
"""
import json
import sys
from pathlib import Path

RACINE = Path(__file__).resolve().parent
sys.path.insert(0, str(RACINE / "moteur-python"))

from moteur.exercices import BIBLIOTHEQUE  # noqa: E402

data = [
    {
        "nom": e.nom, "pattern": e.pattern, "niveau": e.niveau,
        "progression": e.progression, "muscles": list(e.muscles),
        "equip": list(e.equip), "contre_ind": list(e.contre_ind),
        "unite": e.unite, "tempo": e.tempo, "note": e.note,
        "unilateral": e.unilateral, "improvise": e.improvise,
    }
    for e in BIBLIOTHEQUE
]

entete = '''/**
 * exercices.ts — Bibliothèque d'exercices (générée depuis moteur/exercices.py).
 *
 * NE PAS ÉDITER À LA MAIN : régénérer via `python3 sync_moteur.py`.
 * Le premier muscle listé est l'agoniste principal ; `improvise` marque les
 * solutions de dépannage (serviette, table) réservées aux profils sans matériel.
 */
import type { Exercice } from "./types";

export const BIBLIOTHEQUE: Exercice[] = '''

sortie = RACINE / "src" / "lib" / "moteur" / "exercices.ts"
sortie.write_text(
    entete + json.dumps(data, ensure_ascii=False, indent=1)
    + " as Exercice[];\n\nexport const NB_EXERCICES = BIBLIOTHEQUE.length;\n",
    encoding="utf-8",
)
print(f"✓ {sortie.relative_to(RACINE)} — {len(data)} exercices")

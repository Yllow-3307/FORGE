"""
exercices.py — Bibliothèque d'exercices indexée par pattern moteur.

Chaque exercice porte :
  - `pattern`     : le mouvement fondamental qu'il couvre (voir PATTERNS)
  - `equip`       : tags d'équipement requis (tuple vide = rien)
  - `niveau`      : difficulté 1..6 (1 = accessible sédentaire, 6 = athlète)
  - `progression` : rang dans l'échelle de progression du pattern
  - `contre_ind`  : zones de blessure incompatibles
  - `unite`       : 'reps' | 'temps' | 'distance'

Le sélecteur remonte, pour un pattern donné, la variante la plus difficile
que le profil peut exécuter avec son matériel — puis les régressions et
progressions immédiates pour piloter la surcharge.
"""

from __future__ import annotations
from dataclasses import dataclass


PATTERNS = (
    "traction_verticale",    # tirage vertical (traction)
    "traction_horizontale",  # tirage horizontal (rowing)
    "poussee_horizontale",   # pompes, développé couché
    "poussee_verticale",     # dips, développé militaire
    "squat",                 # dominante quadriceps
    "charniere",             # hip hinge, dominante ischios/fessiers
    "fente",                 # unilatéral jambes
    "gainage_anterieur",
    "gainage_lateral",
    "gainage_posterieur",
    "anti_rotation",
    "mollets",
    "isolation_bras",
    "skill",                 # figures calisthéniques
    "mobilite",
    "cardio",
)

# Groupes musculaires, pour l'équilibrage du volume hebdomadaire
MUSCLES = ("dos", "pectoraux", "epaules", "biceps", "triceps",
           "quadriceps", "ischios", "fessiers", "mollets", "abdos", "lombaires")


@dataclass(frozen=True)
class Exercice:
    nom: str
    pattern: str
    niveau: int
    progression: int
    muscles: tuple[str, ...]
    equip: tuple[str, ...] = ()
    contre_ind: tuple[str, ...] = ()
    unite: str = "reps"
    tempo: str = "2-0-1-0"
    note: str = ""
    unilateral: bool = False
    improvise: bool = False   # solution de dépannage (mobilier, serviette...) :
                              # utilisée seulement si rien de mieux n'est dispo

    def realisable(self, equipement: tuple[str, ...], blessures: tuple[str, ...]) -> bool:
        if any(z in blessures for z in self.contre_ind):
            return False
        return all(e in equipement for e in self.equip)


def E(*a, **k) -> Exercice:  # raccourci de déclaration
    return Exercice(*a, **k)


# ==========================================================================
# BIBLIOTHÈQUE
# ==========================================================================

BIBLIOTHEQUE: tuple[Exercice, ...] = (

    # ---------------- TRACTION VERTICALE ----------------
    # Variantes "zéro matériel" indispensables : sans elles, un profil sans
    # équipement n'aurait aucun tirage et développerait un déséquilibre
    # postural poussée/tirage.
    E("Tirage isométrique serviette (porte)", "traction_verticale", 1, 1, ("dos", "biceps"),
      (), (), unite="temps", note="Serviette autour d'une poignée de porte solide, tirer 10-20 s.",
      improvise=True),
    E("Pull-over au sol serviette (sliding)", "traction_verticale", 2, 2, ("dos",),
      (), (), note="Bras tendus au sol sur serviette, tirer le corps vers l'avant.", improvise=True),
    E("Tirage élastique vertical assis", "traction_verticale", 1, 1, ("dos", "biceps"), ("elastiques",)),
    E("Traction australienne barre haute (corps oblique)", "traction_verticale", 2, 2, ("dos", "biceps"), ("barre_traction",)),
    E("Traction assistée élastique", "traction_verticale", 2, 3, ("dos", "biceps"), ("barre_traction", "elastiques")),
    E("Traction négative (descente 5 s)", "traction_verticale", 3, 4, ("dos", "biceps"), ("barre_traction",), tempo="X-0-5-0"),
    E("Traction supination (chin-up)", "traction_verticale", 3, 5, ("dos", "biceps"), ("barre_traction",)),
    E("Traction pronation stricte", "traction_verticale", 4, 6, ("dos", "biceps"), ("barre_traction",)),
    E("Traction lestée", "traction_verticale", 5, 7, ("dos", "biceps"), ("barre_traction", "gilet_leste")),
    E("Traction archer", "traction_verticale", 5, 8, ("dos", "biceps"), ("barre_traction",), unilateral=True),
    E("Traction à un bras assistée", "traction_verticale", 6, 9, ("dos", "biceps"), ("barre_traction", "elastiques"), unilateral=True),
    E("Tirage vertical à la poulie", "traction_verticale", 2, 3, ("dos", "biceps"), ("poulie",)),
    E("Traction aux anneaux", "traction_verticale", 4, 6, ("dos", "biceps"), ("anneaux",)),

    # ---------------- TRACTION HORIZONTALE ----------------
    E("Rowing élastique assis", "traction_horizontale", 1, 1, ("dos", "biceps"), ("elastiques",)),
    E("Rowing serviette (isométrique porte)", "traction_horizontale", 1, 1, ("dos", "biceps"), improvise=True),
    E("Rowing sous une table solide", "traction_horizontale", 3, 3, ("dos", "biceps"),
      (), (), note="Allongé sous une table, saisir le bord et tirer la poitrine vers le plateau.",
      improvise=True),
    E("Rowing inversé entre deux chaises + manche à balai", "traction_horizontale", 3, 4, ("dos", "biceps"),
      (), (), note="Manche solide posé sur deux dossiers de chaise lestés.", improvise=True),
    E("Traction australienne (pieds au sol)", "traction_horizontale", 2, 2, ("dos", "biceps"), ("barre_traction",)),
    E("Rowing anneaux inclinaison moyenne", "traction_horizontale", 3, 3, ("dos", "biceps"), ("anneaux",)),
    E("Rowing haltère unilatéral", "traction_horizontale", 2, 3, ("dos", "biceps"), ("halteres",), unilateral=True),
    E("Rowing barre penché", "traction_horizontale", 3, 4, ("dos", "biceps", "lombaires"), ("barre_olympique",), ("lombaires",)),
    E("Rowing TRX pieds surélevés", "traction_horizontale", 4, 5, ("dos", "biceps"), ("trx",)),
    E("Front lever row", "traction_horizontale", 6, 7, ("dos", "abdos"), ("barre_traction",)),

    # ---------------- POUSSÉE HORIZONTALE ----------------
    E("Pompes contre un mur", "poussee_horizontale", 1, 1, ("pectoraux", "triceps")),
    E("Pompes sur table / rebord", "poussee_horizontale", 1, 2, ("pectoraux", "triceps")),
    E("Pompes genoux au sol", "poussee_horizontale", 2, 3, ("pectoraux", "triceps")),
    E("Pompes classiques", "poussee_horizontale", 3, 4, ("pectoraux", "triceps", "epaules")),
    E("Pompes diamant", "poussee_horizontale", 4, 5, ("triceps", "pectoraux")),
    E("Pompes pieds surélevés (déclinées)", "poussee_horizontale", 4, 6, ("pectoraux", "epaules")),
    E("Pompes aux anneaux", "poussee_horizontale", 5, 7, ("pectoraux", "triceps"), ("anneaux",)),
    E("Pompes archer", "poussee_horizontale", 5, 7, ("pectoraux", "triceps"), unilateral=True),
    E("Pompes un bras (assistées)", "poussee_horizontale", 6, 8, ("pectoraux", "triceps"), unilateral=True),
    E("Développé couché haltères", "poussee_horizontale", 3, 4, ("pectoraux", "triceps"), ("halteres", "banc")),
    E("Développé couché barre", "poussee_horizontale", 4, 5, ("pectoraux", "triceps"), ("barre_olympique", "banc"), ("epaule",)),
    E("Pompes lestées (gilet)", "poussee_horizontale", 5, 6, ("pectoraux", "triceps"), ("gilet_leste",)),

    # ---------------- POUSSÉE VERTICALE ----------------
    E("Élévations épaules élastique", "poussee_verticale", 1, 1, ("epaules",), ("elastiques",)),
    E("Pompes inclinées mains surélevées (pike)", "poussee_verticale", 2, 2, ("epaules", "triceps")),
    E("Pike push-up au sol", "poussee_verticale", 3, 3, ("epaules", "triceps")),
    E("Dips sur banc/chaise (pieds au sol)", "poussee_verticale", 2, 2, ("triceps", "pectoraux"), (), ("epaule",)),
    E("Dips barres parallèles", "poussee_verticale", 4, 4, ("triceps", "pectoraux", "epaules"), ("barres_paralleles",), ("epaule",)),
    E("Développé militaire haltères", "poussee_verticale", 3, 3, ("epaules", "triceps"), ("halteres",)),
    E("Pike push-up pieds surélevés", "poussee_verticale", 4, 5, ("epaules", "triceps")),
    E("Dips aux anneaux", "poussee_verticale", 5, 6, ("triceps", "pectoraux"), ("anneaux",), ("epaule",)),
    E("Pompes en équilibre contre mur", "poussee_verticale", 5, 7, ("epaules", "triceps")),
    E("Handstand push-up libre", "poussee_verticale", 6, 8, ("epaules", "triceps"), (), ("epaule", "poignet")),
    E("Dips lestés", "poussee_verticale", 5, 6, ("triceps", "pectoraux"), ("barres_paralleles", "gilet_leste"), ("epaule",)),

    # ---------------- SQUAT ----------------
    E("Squat sur chaise (assis-debout)", "squat", 1, 1, ("quadriceps", "fessiers")),
    E("Squat poids de corps", "squat", 2, 2, ("quadriceps", "fessiers")),
    E("Squat gobelet kettlebell", "squat", 3, 3, ("quadriceps", "fessiers"), ("kettlebell",)),
    E("Squat gobelet haltère", "squat", 3, 3, ("quadriceps", "fessiers"), ("halteres",)),
    E("Squat sauté", "squat", 4, 4, ("quadriceps", "fessiers"), (), ("genou",)),
    E("Squat bulgare", "squat", 4, 5, ("quadriceps", "fessiers"), (), (), unilateral=True),
    E("Back squat barre", "squat", 4, 5, ("quadriceps", "fessiers"), ("barre_olympique", "rack"), ("lombaires",)),
    E("Squat pistol assisté", "squat", 5, 6, ("quadriceps", "fessiers"), (), ("genou",), unilateral=True),
    E("Pistol squat complet", "squat", 6, 7, ("quadriceps", "fessiers"), (), ("genou",), unilateral=True),
    E("Presse à cuisses", "squat", 2, 3, ("quadriceps", "fessiers"), ("machines_salle",)),

    # ---------------- CHARNIÈRE (HINGE) ----------------
    E("Hip thrust au sol (pont fessier)", "charniere", 1, 1, ("fessiers", "ischios")),
    E("Pont fessier une jambe", "charniere", 3, 3, ("fessiers", "ischios"), (), (), unilateral=True),
    E("Good morning élastique", "charniere", 2, 2, ("ischios", "lombaires"), ("elastiques",)),
    E("Soulevé de terre roumain haltères", "charniere", 3, 4, ("ischios", "fessiers"), ("halteres",), ("lombaires",)),
    E("Swing kettlebell", "charniere", 4, 5, ("fessiers", "ischios"), ("kettlebell",), ("lombaires",)),
    E("Soulevé de terre barre", "charniere", 5, 6, ("ischios", "fessiers", "lombaires"), ("barre_olympique",), ("lombaires",)),
    E("Nordic curl assisté", "charniere", 5, 6, ("ischios",), (), ("genou",)),
    E("Leg curl nordique complet", "charniere", 6, 7, ("ischios",), (), ("genou",)),

    # ---------------- FENTE ----------------
    E("Fente statique appui", "fente", 1, 1, ("quadriceps", "fessiers"), (), (), unilateral=True),
    E("Fente avant alternée", "fente", 2, 2, ("quadriceps", "fessiers"), (), ("genou",), unilateral=True),
    E("Fente marchée haltères", "fente", 3, 3, ("quadriceps", "fessiers"), ("halteres",), ("genou",), unilateral=True),
    E("Step-up sur marche", "fente", 2, 2, ("quadriceps", "fessiers"), ("step_escalier",), (), unilateral=True),
    E("Fente sautée", "fente", 4, 4, ("quadriceps", "fessiers"), (), ("genou",), unilateral=True),

    # ---------------- GAINAGE ----------------
    E("Planche sur genoux", "gainage_anterieur", 1, 1, ("abdos",), (), (), unite="temps"),
    E("Planche classique", "gainage_anterieur", 2, 2, ("abdos",), (), (), unite="temps"),
    E("Dead bug", "gainage_anterieur", 2, 2, ("abdos",)),
    E("Hollow body hold", "gainage_anterieur", 3, 3, ("abdos",), (), (), unite="temps"),
    E("Relevé de jambes suspendu genoux", "gainage_anterieur", 3, 4, ("abdos",), ("barre_traction",)),
    E("Relevé de jambes tendues suspendu", "gainage_anterieur", 5, 5, ("abdos",), ("barre_traction",)),
    E("Ab wheel / roue abdominale", "gainage_anterieur", 5, 6, ("abdos",), (), ("lombaires",)),
    E("Dragon flag", "gainage_anterieur", 6, 7, ("abdos",), (), ("lombaires",), unite="temps"),

    E("Planche latérale genoux", "gainage_lateral", 1, 1, ("abdos",), (), (), unite="temps", unilateral=True),
    E("Planche latérale complète", "gainage_lateral", 3, 2, ("abdos",), (), (), unite="temps", unilateral=True),
    E("Planche latérale + élévation jambe", "gainage_lateral", 4, 3, ("abdos", "fessiers"), (), (), unite="temps", unilateral=True),
    E("Suitcase carry", "gainage_lateral", 3, 3, ("abdos",), ("kettlebell",), (), unite="temps", unilateral=True),

    E("Superman au sol", "gainage_posterieur", 1, 1, ("lombaires", "fessiers"), (), (), unite="temps"),
    E("Bird dog", "gainage_posterieur", 2, 2, ("lombaires", "abdos")),
    E("Extension lombaire (banc)", "gainage_posterieur", 3, 3, ("lombaires",), ("banc",)),
    E("Reverse hyperextension", "gainage_posterieur", 4, 4, ("lombaires", "fessiers"), ("banc",)),

    E("Planche avec tape d'épaule", "anti_rotation", 2, 1, ("abdos", "epaules")),
    E("Pallof press élastique", "anti_rotation", 2, 1, ("abdos",), ("elastiques",)),
    E("Planche + extension bras alternée", "anti_rotation", 3, 2, ("abdos", "epaules")),
    E("Renegade row", "anti_rotation", 4, 2, ("abdos", "dos"), ("halteres",)),

    # ---------------- BRAS (isolation) ----------------
    # Sans ces entrées, aucun exercice n'a "biceps" ou "triceps" comme
    # agoniste principal : l'équilibrage du volume ne pourrait pas les cibler.
    E("Curl élastique", "isolation_bras", 1, 1, ("biceps",), ("elastiques",)),
    E("Curl haltères", "isolation_bras", 1, 2, ("biceps",), ("halteres",)),
    E("Curl marteau haltères", "isolation_bras", 2, 3, ("biceps",), ("halteres",)),
    E("Curl serviette isométrique", "isolation_bras", 1, 1, ("biceps",), (), (),
      unite="temps", improvise=True),
    E("Traction supination tempo lent (biceps)", "isolation_bras", 4, 4, ("biceps", "dos"),
      ("barre_traction",), (), tempo="3-1-3-0"),
    E("Curl anneaux (corps incliné)", "isolation_bras", 3, 3, ("biceps",), ("anneaux",)),
    E("Extension triceps élastique", "isolation_bras", 1, 1, ("triceps",), ("elastiques",)),
    E("Extension triceps nuque haltère", "isolation_bras", 2, 2, ("triceps",), ("halteres",)),
    E("Pompes diamant genoux", "isolation_bras", 2, 2, ("triceps", "pectoraux")),
    E("Dips sur chaise (triceps)", "isolation_bras", 2, 3, ("triceps",), (), ("epaule",)),
    E("Extension triceps aux anneaux", "isolation_bras", 4, 4, ("triceps",), ("anneaux",), ("epaule",)),
    E("Skull crusher haltères", "isolation_bras", 3, 3, ("triceps",), ("halteres", "banc")),

    # ---------------- ISCHIOS (isolation accessible) ----------------
    E("Curl ischios avec serviette (glissé au sol)", "charniere", 2, 2, ("ischios",), (), (),
      note="Talons sur serviette/chaussettes, sol lisse : glisser en contrôlant."),
    E("Curl ischios élastique allongé", "charniere", 1, 1, ("ischios",), ("elastiques",)),
    E("Pont fessier talons surélevés (ischios)", "charniere", 2, 2, ("ischios", "fessiers")),
    E("Leg curl machine", "charniere", 1, 2, ("ischios",), ("machines_salle",)),

    # ---------------- MOLLETS ----------------
    E("Extensions mollets debout", "mollets", 1, 1, ("mollets",)),
    E("Extensions mollets une jambe sur marche", "mollets", 3, 2, ("mollets",), ("step_escalier",), (), unilateral=True),

    # ---------------- SKILLS CALISTHÉNIE ----------------
    E("Tuck front lever hold", "skill", 4, 1, ("dos", "abdos"), ("barre_traction",), (), unite="temps"),
    E("Advanced tuck front lever", "skill", 5, 2, ("dos", "abdos"), ("barre_traction",), (), unite="temps"),
    E("Straddle front lever", "skill", 6, 3, ("dos", "abdos"), ("barre_traction",), (), unite="temps"),
    E("Tuck planche", "skill", 4, 1, ("epaules", "abdos"), (), ("poignet",), unite="temps"),
    E("Straddle planche", "skill", 6, 3, ("epaules", "abdos"), (), ("poignet",), unite="temps"),
    E("Équilibre contre mur (handstand)", "skill", 3, 1, ("epaules", "abdos"), (), ("poignet",), unite="temps"),
    E("Handstand libre", "skill", 5, 2, ("epaules", "abdos"), (), ("poignet",), unite="temps"),
    E("Muscle-up négatif", "skill", 5, 2, ("dos", "triceps"), ("barre_traction",), ("epaule",)),
    E("Muscle-up strict", "skill", 6, 3, ("dos", "triceps"), ("barre_traction",), ("epaule",)),
    E("L-sit sol", "skill", 4, 1, ("abdos", "triceps"), (), (), unite="temps"),

    # ---------------- MOBILITÉ ----------------
    E("Cat-cow", "mobilite", 1, 1, ("lombaires",), (), (), unite="temps"),
    E("Ouverture thoracique au mur", "mobilite", 1, 1, ("epaules",), (), (), unite="temps"),
    E("Étirement fléchisseurs de hanche", "mobilite", 1, 1, ("quadriceps",), (), (), unite="temps", unilateral=True),
    E("World's greatest stretch", "mobilite", 2, 2, ("quadriceps", "lombaires"), (), (), unite="temps", unilateral=True),
    E("Dislocations épaules bâton/élastique", "mobilite", 1, 1, ("epaules",), ("elastiques",), (), unite="temps"),
    E("Squat profond tenu (deep squat hold)", "mobilite", 2, 2, ("quadriceps",), (), ("genou",), unite="temps"),
    E("Jefferson curl léger", "mobilite", 3, 3, ("lombaires", "ischios"), (), ("lombaires",), unite="temps"),

    # ---------------- CARDIO (modalités) ----------------
    E("Marche rapide", "cardio", 1, 1, ("quadriceps",), (), (), unite="distance"),
    E("Marche en côte / escaliers", "cardio", 2, 2, ("quadriceps", "fessiers"), ("step_escalier",), (), unite="temps"),
    E("Course à pied extérieur", "cardio", 3, 3, ("quadriceps", "mollets"), (), ("genou", "cheville"), unite="distance"),
    E("Tapis de course", "cardio", 3, 3, ("quadriceps", "mollets"), ("tapis_course",), ("genou",), unite="distance"),
    E("Vélo d'appartement", "cardio", 2, 2, ("quadriceps",), ("velo_appartement",), (), unite="temps"),
    E("Vélo route / trajet vélo", "cardio", 2, 2, ("quadriceps",), ("velo_route",), (), unite="temps"),
    E("Rameur", "cardio", 3, 3, ("dos", "quadriceps"), ("rameur",), ("lombaires",), unite="temps"),
    E("Corde à sauter", "cardio", 3, 3, ("mollets",), ("corde_a_sauter",), ("genou", "cheville"), unite="temps"),
    E("Natation", "cardio", 2, 2, ("dos", "epaules"), ("piscine",), (), unite="temps"),
    E("Circuit cardio poids de corps (burpees, montées genoux)", "cardio", 3, 3, ("quadriceps", "abdos"),
      (), ("genou",), unite="temps"),
    E("Shadow boxing / cardio sans impact", "cardio", 2, 2, ("epaules", "abdos"), (), (), unite="temps"),
)


# ==========================================================================
# SÉLECTION
# ==========================================================================

def candidats(pattern: str, equipement, blessures, niveau_max: int) -> list[Exercice]:
    """
    Tous les exercices réalisables d'un pattern, triés par progression.

    Les variantes « improvisées » (serviette, table, chaises) ne sont
    conservées que si le pattern n'offre aucune alternative avec du vrai
    matériel : sinon un profil équipé se verrait proposer du mobilier.
    """
    out = [e for e in BIBLIOTHEQUE
           if e.pattern == pattern
           and e.niveau <= niveau_max
           and e.realisable(tuple(equipement), tuple(blessures))]
    vrais = [e for e in out if not e.improvise]
    if vrais:
        out = vrais
    return sorted(out, key=lambda e: (e.progression, e.niveau))


def choisir(pattern: str, equipement, blessures, niveau_max: int,
            decalage: int = 0) -> Exercice | None:
    """
    Renvoie la variante la plus avancée accessible, éventuellement décalée
    de `decalage` crans (négatif = régression, positif = progression).
    """
    c = candidats(pattern, equipement, blessures, niveau_max)
    if not c:
        return None
    idx = max(0, min(len(c) - 1, len(c) - 1 + decalage))
    return c[idx]


def echelle(pattern: str, equipement, blessures) -> list[Exercice]:
    """Échelle de progression complète d'un pattern (tous niveaux)."""
    return candidats(pattern, equipement, blessures, niveau_max=6)


def niveau_max_pour(niveau_sportif: str, age: int) -> int:
    """Plafond de difficulté autorisé selon le niveau déclaré et l'âge."""
    base = {"sedentaire": 2, "debutant": 3, "intermediaire": 4,
            "avance": 5, "athlete": 6}[niveau_sportif]
    if age >= 60:
        base = min(base, 4)
    elif age >= 50:
        base = min(base, 5)
    return base


def couverture(equipement, blessures, niveau_max: int) -> dict[str, int]:
    """Diagnostic : combien de variantes par pattern pour ce contexte ?"""
    return {p: len(candidats(p, equipement, blessures, niveau_max)) for p in PATTERNS}

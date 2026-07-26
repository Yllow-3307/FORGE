"""
force.py — Génération du bloc Callisthénie / Musculation.

Chaîne de décision :
  objectif + niveau + fréquence  ->  split (répartition des patterns)
  objectif + niveau              ->  schéma de séries/reps/RPE/repos
  équipement + blessures + niveau ->  choix des exercices concrets
  semaine du cycle               ->  surcharge progressive + deload

Références de dosage : recommandations de volume hebdomadaire par groupe
musculaire (10-20 séries "utiles"), autorégulation par RPE/RIR, et
progression en double progression (reps puis charge/difficulté).
"""

from __future__ import annotations
from dataclasses import dataclass, field

from .profil import Profil
from .exercices import (Exercice, choisir, echelle, candidats,
                        niveau_max_pour, PATTERNS)


# --------------------------------------------------------------------------
# Schémas d'entraînement par objectif
# --------------------------------------------------------------------------

@dataclass(frozen=True)
class Schema:
    """Paramètres de dosage d'un objectif."""
    series: tuple[int, int]        # min, max séries par exercice
    reps: tuple[int, int]          # fourchette de répétitions
    rpe: tuple[int, int]           # effort perçu cible (RIR = 10 - RPE)
    repos_s: int                   # repos entre séries
    tempo: str
    exos_principaux: int           # nb d'exercices "lourds" par séance
    exos_accessoires: int
    note: str = ""


SCHEMAS: dict[str, Schema] = {
    "force": Schema((4, 6), (3, 6), (7, 9), 180, "2-1-X-0", 2, 2,
                    "Charges lourdes, repos longs, qualité de mouvement prioritaire."),
    "prise_de_muscle": Schema((3, 4), (8, 12), (7, 9), 90, "3-0-1-0", 2, 3,
                              "Volume et tension mécanique : proche de l'échec (RIR 1-3)."),
    "perte_de_gras": Schema((3, 4), (10, 15), (7, 8), 60, "2-0-1-0", 2, 3,
                            "Densité élevée, repos courts, on préserve le muscle en déficit."),
    "recomposition": Schema((3, 4), (8, 12), (7, 9), 75, "3-0-1-0", 2, 3,
                            "Compromis hypertrophie/densité."),
    "endurance": Schema((2, 3), (15, 25), (6, 8), 45, "2-0-1-0", 1, 3,
                        "Endurance de force : séries longues, repos courts."),
    "sante_mobilite": Schema((2, 3), (10, 15), (5, 7), 60, "3-1-1-1", 2, 2,
                             "Amplitude complète, jamais à l'échec, contrôle du mouvement."),
    "competition_street": Schema((4, 6), (3, 8), (7, 9), 150, "X-1-2-0", 2, 3,
                                 "Travail de skill à froid, puis force, puis accessoires."),
}


# --------------------------------------------------------------------------
# Splits : quels patterns travailler à quelle séance
# --------------------------------------------------------------------------

FULL = ("traction_verticale", "poussee_horizontale", "squat",
        "charniere", "gainage_anterieur")
FULL_B = ("traction_horizontale", "poussee_verticale", "fente",
          "charniere", "gainage_lateral")

SPLITS: dict[int, list[tuple[str, tuple[str, ...]]]] = {
    1: [("Full body", FULL + ("poussee_verticale",))],
    2: [("Full body A", FULL), ("Full body B", FULL_B)],
    3: [("Full body A", FULL), ("Full body B", FULL_B),
        ("Full body C", ("traction_verticale", "poussee_verticale", "squat",
                         "anti_rotation", "gainage_posterieur"))],
    4: [("Haut du corps A", ("traction_verticale", "poussee_horizontale",
                             "traction_horizontale", "poussee_verticale", "gainage_anterieur")),
        ("Bas du corps A", ("squat", "charniere", "fente", "mollets", "gainage_lateral")),
        ("Haut du corps B", ("poussee_verticale", "traction_horizontale",
                             "poussee_horizontale", "traction_verticale", "anti_rotation")),
        ("Bas du corps B", ("charniere", "squat", "fente", "gainage_posterieur", "mollets"))],
    5: [("Poussée", ("poussee_horizontale", "poussee_verticale", "poussee_horizontale", "gainage_anterieur")),
        ("Tirage", ("traction_verticale", "traction_horizontale", "traction_verticale", "anti_rotation")),
        ("Jambes", ("squat", "charniere", "fente", "mollets", "gainage_lateral")),
        ("Haut du corps", ("traction_verticale", "poussee_horizontale",
                           "poussee_verticale", "traction_horizontale", "gainage_anterieur")),
        ("Full body / skills", ("skill", "squat", "traction_verticale", "gainage_posterieur"))],
    6: [("Poussée A", ("poussee_horizontale", "poussee_verticale", "gainage_anterieur")),
        ("Tirage A", ("traction_verticale", "traction_horizontale", "anti_rotation")),
        ("Jambes A", ("squat", "charniere", "mollets")),
        ("Poussée B", ("poussee_verticale", "poussee_horizontale", "gainage_lateral")),
        ("Tirage B", ("traction_horizontale", "traction_verticale", "gainage_posterieur")),
        ("Jambes B", ("charniere", "fente", "mollets"))],
}
SPLITS[7] = SPLITS[6] + [("Mobilité / récupération active", ("mobilite", "gainage_anterieur"))]


def split_pour(p: Profil, n_seances_force: int) -> list[tuple[str, tuple[str, ...]]]:
    """Choisit le split, avec adaptation à l'objectif."""
    n = max(1, min(7, n_seances_force))
    base = list(SPLITS[n])

    # Un débutant progresse mieux en full-body : on évite les splits fractionnés
    if p.niveau_sportif in ("sedentaire", "debutant") and n >= 4:
        base = list(SPLITS[3])
        while len(base) < n:
            base.append(base[len(base) % 3])
        base = base[:n]

    # Objectif skills : on injecte un pattern 'skill' en tête de chaque séance
    if p.objectif == "competition_street":
        base = [(nom, ("skill",) + tuple(x for x in pats if x != "skill"))
                for nom, pats in base]

    return base


# --------------------------------------------------------------------------
# Progression sur le cycle
# --------------------------------------------------------------------------

def semaines_du_cycle(duree: int, niveau: str) -> list[dict]:
    """
    Construit la trame d'ondulation du cycle : montée de volume/intensité
    puis semaine de décharge (deload) toutes les 4 à 6 semaines.
    """
    frequence_deload = 4 if niveau in ("avance", "athlete") else (5 if niveau == "intermediaire" else 6)
    out = []
    position = 0
    for s in range(1, duree + 1):
        position += 1
        deload = (position >= frequence_deload) or (s == duree and duree >= 8 and position >= 3)
        if deload:
            out.append({"semaine": s, "type": "deload", "coef_volume": 0.55,
                        "delta_intensite": -1.5, "delta_reps": 0,
                        "consigne": "Décharge : mêmes exercices, moitié des séries, "
                                    "on s'arrête loin de l'échec (RIR 4-5)."})
            position = 0
        else:
            out.append({"semaine": s, "type": "accumulation", "coef_volume": 1.0 + 0.08 * (position - 1),
                        "delta_intensite": 0.5 * (position - 1), "delta_reps": position - 1,
                        "consigne": f"Semaine {position} du bloc : ajouter 1-2 reps par série "
                                    f"ou passer à la variante supérieure quand le haut de "
                                    f"la fourchette est atteint sur toutes les séries."})
    return out


# --------------------------------------------------------------------------
# Construction d'une séance
# --------------------------------------------------------------------------

@dataclass
class BlocExercice:
    nom: str
    pattern: str
    series: int
    reps: str
    repos_s: int
    rpe: str
    tempo: str
    role: str = "principal"      # 'echauffement' | 'principal' | 'accessoire' | 'finisher' | 'retour_calme'
    note: str = ""
    regression: str = ""
    progression: str = ""
    unite: str = "reps"

    def to_dict(self) -> dict:
        return self.__dict__.copy()


@dataclass
class Seance:
    nom: str
    jour: str
    debut: str
    fin: str
    duree_min: int
    type: str                    # 'force' | 'endurance' | 'mixte' | 'mobilite'
    blocs: list[BlocExercice] = field(default_factory=list)
    intensite: str = "moderee"
    notes: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        d = self.__dict__.copy()
        d["blocs"] = [b.to_dict() for b in self.blocs]
        return d


def duree_seance_cible(p: Profil) -> int:
    """Durée idéale d'une séance de force selon objectif et disponibilité."""
    base = {"force": 70, "prise_de_muscle": 65, "perte_de_gras": 50,
            "recomposition": 60, "endurance": 45, "sante_mobilite": 40,
            "competition_street": 75}[p.objectif]
    if p.niveau_sportif in ("sedentaire", "debutant"):
        base = min(base, 50)
    if p.pression_temporelle == "critique":
        base = min(base, 30)
    elif p.pression_temporelle == "forte":
        base = min(base, 45)
    return base


def _fourchette(schema: Schema, delta_reps: int, exo: Exercice) -> str:
    lo, hi = schema.reps
    lo, hi = lo + delta_reps, hi + delta_reps
    if exo.unite == "temps":
        # conversion reps -> secondes de maintien
        return f"{max(10, lo * 3)}–{max(15, hi * 3)} s"
    if exo.unilateral:
        return f"{lo}–{hi} par côté"
    return f"{lo}–{hi}"


def construire_seance_force(p: Profil, nom: str, patterns: tuple[str, ...],
                            jour: str, debut: str, fin: str, duree: int,
                            semaine: dict) -> Seance:
    """Assemble une séance complète : échauffement, corps, retour au calme."""
    schema = SCHEMAS[p.objectif]
    nmax = niveau_max_pour(p.niveau_sportif, p.age)
    coef = semaine["coef_volume"]
    d_int = semaine["delta_intensite"]
    d_reps = semaine["delta_reps"] if semaine["type"] != "deload" else 0

    seance = Seance(nom=nom, jour=jour, debut=debut, fin=fin, duree_min=duree,
                    type="force",
                    intensite="elevee" if p.objectif in ("force", "prise_de_muscle",
                                                         "competition_street") else "moderee")

    # ---- Échauffement (proportionnel à la durée, minimum 6 min) ----
    duree_ech = max(6, min(12, duree // 6))
    mob = choisir("mobilite", p.equipement, p.blessures, nmax)
    seance.blocs.append(BlocExercice(
        nom=f"Élévation cardiaque (marche rapide/corde/rowing léger) puis {mob.nom if mob else 'mobilité articulaire'}",
        pattern="echauffement", series=1, reps=f"{duree_ech} min", repos_s=0,
        rpe="RPE 3-4", tempo="continu", role="echauffement",
        note="Articulations mobilisées + 1 série légère (50 %) du 1er exercice.",
        unite="temps"))

    # ---- Corps de séance ----
    # Nombre d'exercices tenable = budget réel / coût moyen d'un exercice
    budget = duree - duree_ech - 5                     # 5 min de retour au calme
    series_moy = (schema.series[0] + schema.series[1]) / 2 * coef
    cout_exo_min = (series_moy * (SEC_PAR_SERIE + schema.repos_s) + SEC_TRANSITION) / 60
    n_exos = max(2, min(len(patterns), int(budget // max(4.0, cout_exo_min))))
    retenus = list(patterns[:n_exos])

    deja: set[str] = set()
    for i, pat in enumerate(retenus):
        # Un split peut répéter un pattern dans la même séance (ex. "Poussée") :
        # on descend alors d'un cran dans l'échelle pour varier le stimulus.
        exo = None
        for d in (0, -1, -2, 1, -3):
            cand = choisir(pat, p.equipement, p.blessures, nmax, decalage=d)
            if cand and cand.nom not in deja:
                exo = cand
                break
        if exo is None:
            continue
        deja.add(exo.nom)
        principal = i < schema.exos_principaux
        s_min, s_max = schema.series
        n_series = s_max if principal else s_min
        n_series = max(1, round(n_series * coef))

        ech = echelle(pat, p.equipement, p.blessures)
        idx = ech.index(exo) if exo in ech else 0
        regression = ech[idx - 1].nom if idx > 0 else "réduire l'amplitude ou l'inclinaison"
        progression = ech[idx + 1].nom if idx + 1 < len(ech) else "ajouter du lest / ralentir le tempo"

        rpe_lo = max(4, schema.rpe[0] + d_int - (1.5 if semaine["type"] == "deload" else 0))
        rpe_hi = max(5, schema.rpe[1] + d_int - (1.5 if semaine["type"] == "deload" else 0))

        seance.blocs.append(BlocExercice(
            nom=exo.nom, pattern=pat, series=n_series,
            reps=_fourchette(schema, d_reps, exo),
            repos_s=schema.repos_s if principal else max(45, schema.repos_s - 30),
            rpe=f"RPE {rpe_lo:g}-{rpe_hi:g} (RIR {10 - rpe_hi:g}-{10 - rpe_lo:g})",
            tempo=exo.tempo if exo.tempo != "2-0-1-0" else schema.tempo,
            role="principal" if principal else "accessoire",
            note=exo.note, regression=regression, progression=progression,
            unite=exo.unite))

    # ---- Finisher conditionnel ----
    if p.objectif in ("perte_de_gras", "endurance") and budget > 40:
        seance.blocs.append(BlocExercice(
            nom="Finisher métabolique (circuit 3 exercices, 20 s effort / 10 s repos × 6)",
            pattern="cardio", series=1, reps="3 min", repos_s=0, rpe="RPE 8",
            tempo="rapide", role="finisher", unite="temps",
            note="Optionnel : à supprimer si la récupération est déjà limite."))

    # ---- Retour au calme ----
    seance.blocs.append(BlocExercice(
        nom="Retour au calme : respiration nasale + étirements des chaînes sollicitées",
        pattern="mobilite", series=1, reps="5 min", repos_s=0, rpe="RPE 2",
        tempo="lent", role="retour_calme", unite="temps"))

    # ---- Ajustement final au créneau réel ----
    ajuster_duree(seance)

    seance.notes.append(schema.note)
    seance.notes.append(semaine["consigne"])
    seance.notes.append(f"Durée estimée : {duree_estimee(seance):.0f} min "
                        f"(créneau réservé : {duree} min).")
    if p.blessures:
        seance.notes.append("Zones sensibles déclarées (" + ", ".join(p.blessures) +
                            ") : exercices contre-indiqués automatiquement exclus. "
                            "Toute douleur vive = arrêt de l'exercice.")
    return seance


# Fourchettes hebdomadaires de séries "utiles" par groupe musculaire.
# En dessous : stimulus insuffisant. Au-dessus : récupération compromise.
CIBLES_VOLUME = {
    "dos": (10, 22), "pectoraux": (8, 20), "epaules": (8, 20),
    "biceps": (6, 18), "triceps": (6, 18), "quadriceps": (8, 20),
    "ischios": (6, 16), "fessiers": (6, 20), "mollets": (4, 14),
    "abdos": (6, 18), "lombaires": (4, 12),
}


def cibles_ajustees(p: Profil, n_seances: int) -> dict[str, tuple[float, float]]:
    """
    Adapte les fourchettes de volume au contexte réel.

    Le volume atteignable dépend du nombre de séances : demander 10 séries
    de dos à quelqu'un qui s'entraîne 2 fois par semaine en full-body est
    irréaliste. On module donc les cibles par la fréquence, le niveau et
    l'objectif plutôt que d'appliquer une norme unique.
    """
    # facteur de fréquence : 2 séances -> ~0,55 ; 4 -> ~1,0 ; 6+ -> ~1,25
    f_freq = min(1.25, 0.28 + 0.18 * max(1, n_seances))
    f_niveau = {"sedentaire": 0.5, "debutant": 0.7, "intermediaire": 1.0,
                "avance": 1.15, "athlete": 1.25}[p.niveau_sportif]
    f_obj = {"force": 0.85, "prise_de_muscle": 1.1, "perte_de_gras": 0.9,
             "recomposition": 1.0, "endurance": 0.8, "sante_mobilite": 0.6,
             "competition_street": 1.05}[p.objectif]
    k = f_freq * f_niveau * f_obj

    out = {}
    for m, (lo, hi) in CIBLES_VOLUME.items():
        lo_a = max(2.0, round(lo * k, 1))
        # le plafond haut reste borné par la capacité de récupération
        hi_a = max(lo_a + 4, round(hi * min(1.15, f_freq * f_niveau), 1))
        out[m] = (lo_a, hi_a)
    return out


def auditer_volume(seances: list[Seance], objectif: str,
                   profil: Profil | None = None, n_seances: int | None = None) -> list[str]:
    """
    Contrôle qualité : signale les groupes sous-stimulés ou surchargés,
    au regard de cibles ajustées au profil quand il est fourni.
    """
    vol = volume_hebdomadaire(seances)
    n = n_seances if n_seances is not None else len([s for s in seances if s.type == "force"])
    cibles = cibles_ajustees(profil, n) if profil is not None else {
        m: (float(lo), float(hi)) for m, (lo, hi) in CIBLES_VOLUME.items()}
    alertes = []
    for muscle, (lo, hi) in cibles.items():
        v = vol.get(muscle, 0)
        if v == 0:
            alertes.append(f"⚠ {muscle} : aucun volume direct cette semaine.")
        elif v < lo:
            alertes.append(f"⚠ {muscle} : {v} séries/sem, sous la zone efficace ({lo:g}-{hi:g}).")
        elif v > hi:
            alertes.append(f"⚠ {muscle} : {v} séries/sem, au-dessus de la zone de récupération ({lo:g}-{hi:g}).")
    return alertes


SEC_PAR_SERIE = 40      # durée moyenne d'exécution d'une série (hors repos)
SEC_TRANSITION = 60     # installation/rangement entre deux exercices


def duree_estimee(seance: Seance) -> float:
    """
    Durée réelle estimée d'une séance, en minutes.

    Chaque série coûte son temps d'exécution + son repos ; on ajoute une
    transition par exercice, plus l'échauffement et le retour au calme
    déclarés en minutes.
    """
    total_s = 0.0
    for b in seance.blocs:
        if b.role in ("echauffement", "retour_calme", "finisher"):
            # ces blocs déclarent une durée en minutes dans `reps`
            try:
                total_s += float(str(b.reps).split()[0]) * 60
            except (ValueError, IndexError):
                total_s += 300
            continue
        total_s += b.series * (SEC_PAR_SERIE + b.repos_s) + SEC_TRANSITION
    return total_s / 60


def ajuster_duree(seance: Seance) -> Seance:
    """
    Raccourcit une séance tant que son estimation dépasse son créneau :
    on retire d'abord le finisher, puis les accessoires excédentaires,
    puis on réduit les séries (plancher = 2).
    """
    garde = 0
    while duree_estimee(seance) > seance.duree_min and garde < 40:
        garde += 1
        fin = [b for b in seance.blocs if b.role == "finisher"]
        if fin:
            seance.blocs.remove(fin[0])
            continue
        acc = [b for b in seance.blocs if b.role == "accessoire"]
        if len(acc) > 1:
            seance.blocs.remove(acc[-1])
            continue
        reductibles = [b for b in seance.blocs
                       if b.role in ("principal", "accessoire") and b.series > 2]
        if reductibles:
            max(reductibles, key=lambda b: b.series).series -= 1
            continue
        break
    return seance


def _budget_atteint(seance: Seance, marge_min: float = 4.0) -> bool:
    """La séance a-t-elle épuisé le temps réellement disponible ?"""
    return duree_estimee(seance) + marge_min > seance.duree_min


def equilibrer(p: Profil, seances: list[Seance], semaine: dict) -> tuple[list[Seance], list[str]]:
    """
    Rééquilibre le volume hebdomadaire par groupe musculaire.

    1. Élagage : si un groupe dépasse sa capacité de récupération, on retire
       des accessoires puis on réduit les séries (jamais en dessous de 2).
    2. Comblement : si un groupe est sous sa zone efficace, on ajoute un
       exercice dont il est l'agoniste principal — dans la limite du temps
       réellement disponible dans la séance.

    Renvoie (séances, remarques) : les remarques expliquent les déficits
    qu'il est impossible de combler (temps ou matériel insuffisants).
    """
    from .exercices import BIBLIOTHEQUE
    nmax = niveau_max_pour(p.niveau_sportif, p.age)
    schema = SCHEMAS[p.objectif]
    index = {e.nom: e for e in BIBLIOTHEQUE}
    n_force = len([s for s in seances if s.type == "force"])
    cibles = cibles_ajustees(p, n_force)
    remarques: list[str] = []

    # ---------------- 1. Élagage des excès ----------------
    for _ in range(20):
        vol = volume_hebdomadaire(seances)
        exces = [(m, vol.get(m, 0), hi) for m, (_lo, hi) in cibles.items()
                 if vol.get(m, 0) > hi]
        if not exces:
            break
        muscle, _actuel, _hi = max(exces, key=lambda t: t[1] - t[2])

        # a) retirer un accessoire redondant
        cible_bloc = cible_seance = None
        for s_ in seances:
            for b in s_.blocs:
                if b.role != "accessoire":
                    continue
                e = index.get(b.nom)
                if e and e.muscles and e.muscles[0] == muscle:
                    if cible_bloc is None or b.series > cible_bloc.series:
                        cible_bloc, cible_seance = b, s_
        if cible_bloc is not None:
            cible_seance.blocs.remove(cible_bloc)
            continue

        # b) sinon, réduire les séries des blocs concernés (plancher = 2)
        reduits = False
        for s_ in seances:
            for b in s_.blocs:
                e = index.get(b.nom)
                if (e and muscle in e.muscles and b.series > 2
                        and b.role in ("principal", "accessoire")):
                    b.series -= 1
                    reduits = True
                    break
            if reduits:
                break
        if not reduits:
            break

    # ---------------- 2. Comblement des déficits ----------------
    impossibles: set[str] = set()
    for _ in range(12):
        vol = volume_hebdomadaire(seances)
        deficits = [(m, vol.get(m, 0), lo) for m, (lo, _hi) in cibles.items()
                    if vol.get(m, 0) < lo and m not in impossibles]
        if not deficits:
            break
        muscle, _v, _lo = min(deficits, key=lambda t: t[1] - t[2])

        pool = [e for e in BIBLIOTHEQUE
                if e.muscles and e.muscles[0] == muscle
                and e.niveau <= nmax
                and e.pattern not in ("cardio", "mobilite")
                and e.realisable(tuple(p.equipement), tuple(p.blessures))
                and not e.improvise]
        if not pool:
            # Aucun exercice ne cible ce muscle en agoniste principal avec ce
            # matériel : il ne sera travaillé qu'en synergiste.
            impossibles.add(muscle)
            continue
        pool.sort(key=lambda e: -e.progression)

        seances_force = [s for s in seances if s.type == "force"]
        place = False
        for s_cible in sorted(seances_force,
                              key=lambda s: len([b for b in s.blocs
                                                 if b.role in ("principal", "accessoire")])):
            if _budget_atteint(s_cible):
                continue
            noms = {b.nom for b in s_cible.blocs}
            exo = next((e for e in pool if e.nom not in noms), None)
            if exo is None:
                continue
            positions = [i for i, b in enumerate(s_cible.blocs)
                         if b.role in ("principal", "accessoire", "echauffement")]
            if not positions:
                continue
            s_cible.blocs.insert(max(positions) + 1, BlocExercice(
                nom=exo.nom, pattern=exo.pattern,
                series=max(2, round(schema.series[0] * semaine["coef_volume"])),
                reps=_fourchette(schema, 0, exo),
                repos_s=max(45, schema.repos_s - 30),
                rpe=f"RPE {schema.rpe[0]}-{schema.rpe[1]}",
                tempo=exo.tempo if exo.tempo != "2-0-1-0" else schema.tempo,
                role="accessoire", unite=exo.unite,
                note=f"Ajouté par rééquilibrage automatique du volume ({muscle}).",
                progression="ajouter du lest / ralentir le tempo"))
            place = True
            break
        if not place:
            # Pas de place pour un exercice de plus : on densifie un bloc
            # existant qui sollicite déjà ce muscle (+1 série), à condition
            # que la séance tienne encore dans son créneau.
            densifie = False
            for s_ in sorted(seances, key=lambda x: duree_estimee(x)):
                if s_.type != "force" or _budget_atteint(s_, marge_min=1.0):
                    continue
                for b in s_.blocs:
                    e = index.get(b.nom)
                    if (e and muscle in e.muscles and b.series < schema.series[1] + 1
                            and b.role in ("principal", "accessoire")):
                        b.series += 1
                        densifie = True
                        break
                if densifie:
                    break
            if densifie:
                continue
            impossibles.add(muscle)
            remarques.append(
                f"Volume {muscle} sous la cible : limité par le temps disponible "
                f"({p.seances_par_semaine} séance(s)/sem, {int(duree_seance_cible(p))} min). "
                f"Ce groupe reste sollicité en synergiste ; priorité donnée aux "
                f"mouvements polyarticulaires.")

    # ---------------- 3. Normalisation finale ----------------
    for s_ in seances:
        ajuster_duree(s_)

    if p.seances_par_semaine <= 2:
        remarques.append(
            f"Avec {p.seances_par_semaine} séance(s)/semaine, le programme se concentre "
            f"volontairement sur les mouvements polyarticulaires : c'est le meilleur "
            f"rapport stimulus/temps. Les petits groupes (bras, mollets) sont travaillés "
            f"indirectement.")
    return seances, sorted(set(remarques))


def volume_hebdomadaire(seances: list[Seance]) -> dict[str, float]:
    """
    Compte les séries hebdomadaires par groupe musculaire.

    Le premier muscle déclaré d'un exercice est l'agoniste principal et
    compte pour 1 série ; les suivants sont des synergistes et comptent
    pour 0,5 — sinon un squat gonflerait artificiellement le total fessiers
    autant qu'un hip thrust.
    """
    from .exercices import BIBLIOTHEQUE
    index = {e.nom: e for e in BIBLIOTHEQUE}
    total: dict[str, float] = {}
    for s in seances:
        for b in s.blocs:
            if b.role not in ("principal", "accessoire"):
                continue
            exo = index.get(b.nom)
            if not exo:
                continue
            for i, m in enumerate(exo.muscles):
                total[m] = total.get(m, 0) + (b.series if i == 0 else b.series * 0.5)
    return dict(sorted(({k: round(v, 1) for k, v in total.items()}).items(),
                       key=lambda kv: -kv[1]))

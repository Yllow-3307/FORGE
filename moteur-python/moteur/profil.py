"""
profil.py — Modèle de données d'entrée du moteur.

Les 18 variables demandées sont normalisées ici en un objet `Profil`
immuable, accompagné de *variables dérivées* (IMC, MB, contraintes de temps,
créneaux libres...) réutilisées par tous les modules en aval.

Principe : aucune règle métier ici. Uniquement validation + dérivation.
"""

from __future__ import annotations

import json
import math
import unicodedata
from dataclasses import dataclass, field, asdict
from datetime import time, timedelta, datetime, date
from typing import Iterable

# --------------------------------------------------------------------------
# Vocabulaires contrôlés
# --------------------------------------------------------------------------

SEXES = ("homme", "femme", "autre")

OBJECTIFS = (
    "perte_de_gras",      # recomposition orientée déficit
    "prise_de_muscle",    # hypertrophie / surplus léger
    "force",              # force max, faible volume/haute intensité
    "endurance",          # capacité aérobie prioritaire
    "recomposition",      # muscle + gras simultané, maintenance
    "sante_mobilite",     # remise en forme, santé, mobilité
    "competition_street", # skills calisthéniques (muscle-up, planche...)
)

NIVEAUX_SPORTIFS = ("sedentaire", "debutant", "intermediaire", "avance", "athlete")

# Chaque item d'équipement est un "tag". La bibliothèque d'exercices
# déclare les tags qu'elle exige.
EQUIPEMENTS = (
    "aucun",              # poids de corps au sol uniquement
    "barre_traction",
    "barres_paralleles",  # dips / parallettes
    "anneaux",
    "elastiques",
    "halteres",
    "kettlebell",
    "barre_olympique",
    "banc",
    "rack",
    "machines_salle",
    "poulie",
    "tapis_course",
    "velo_appartement",
    "rameur",
    "corde_a_sauter",
    "gilet_leste",
    "trx",
    "step_escalier",
    "piscine",
    "velo_route",
)

NIVEAUX_CUISINE = ("nul", "debutant", "moyen", "bon", "chef")

CONTRAINTES_ALIMENTAIRES = (
    "aucune",
    "vegetarien",
    "vegan",
    "sans_gluten",
    "sans_lactose",
    "halal",
    "casher",
    "sans_porc",
    "sans_fruits_a_coque",
    "sans_oeuf",
    "sans_poisson",
    "diabete_t2",
    "hypertension",
    "cholesterol",
    "syndrome_intestin_irritable",
    "petit_budget",
    "faible_appetit_matin",
)

LIEUX_REPAS = (
    "domicile",
    "bureau_micro_ondes",
    "bureau_sans_cuisine",
    "restaurant_cantine",
    "exterieur_nomade",
    "mixte",
)


# --------------------------------------------------------------------------
# Utilitaires temps
# --------------------------------------------------------------------------

def hhmm(valeur: str | time | int | float) -> time:
    """Accepte '07:30', '7h30', '0730', 7.5, time(7,30) -> time."""
    if isinstance(valeur, time):
        return valeur
    if isinstance(valeur, (int, float)):
        h = int(valeur) % 24
        m = int(round((float(valeur) - int(valeur)) * 60))
        return time(h, m if m < 60 else 59)
    s = str(valeur).strip().lower().replace("h", ":").replace(".", ":")
    if s.endswith(":"):
        s += "00"
    if ":" not in s and len(s) in (3, 4):
        s = s[:-2] + ":" + s[-2:]
    parts = s.split(":")
    h = int(parts[0])
    m = int(parts[1]) if len(parts) > 1 and parts[1] != "" else 0
    return time(h % 24, min(m, 59))


def to_min(t: time) -> int:
    """time -> minutes depuis minuit."""
    return t.hour * 60 + t.minute


def to_time(minutes: int) -> time:
    m = int(minutes) % (24 * 60)
    return time(m // 60, m % 60)


def fmt(minutes: int | time) -> str:
    t = minutes if isinstance(minutes, time) else to_time(minutes)
    return f"{t.hour:02d}:{t.minute:02d}"


def duree_fmt(minutes: int) -> str:
    h, m = divmod(int(minutes), 60)
    if h and m:
        return f"{h}h{m:02d}"
    if h:
        return f"{h}h"
    return f"{m} min"


def _slug(s: str) -> str:
    """'Végétarien ' -> 'vegetarien'"""
    s = unicodedata.normalize("NFKD", str(s)).encode("ascii", "ignore").decode()
    s = s.strip().lower()
    for ch in " -'/":
        s = s.replace(ch, "_")
    while "__" in s:
        s = s.replace("__", "_")
    return s.strip("_")


JOURS = ("lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche")
JOURS_TRAVAIL_DEFAUT = ("lundi", "mardi", "mercredi", "jeudi", "vendredi")


# --------------------------------------------------------------------------
# Plage d'indisponibilité
# --------------------------------------------------------------------------

@dataclass(frozen=True)
class Plage:
    """Un intervalle [debut, fin[ sur un ou plusieurs jours."""
    debut: time
    fin: time
    jours: tuple[str, ...] = JOURS
    motif: str = "indisponible"

    @staticmethod
    def creer(debut, fin, jours: Iterable[str] | None = None, motif="indisponible") -> "Plage":
        js = tuple(_slug(j) for j in jours) if jours else JOURS
        js = tuple(j for j in js if j in JOURS) or JOURS
        return Plage(hhmm(debut), hhmm(fin), js, motif)

    @property
    def debut_min(self) -> int:
        return to_min(self.debut)

    @property
    def fin_min(self) -> int:
        f = to_min(self.fin)
        return f if f > self.debut_min else f + 24 * 60  # passe minuit

    def concerne(self, jour: str) -> bool:
        return _slug(jour) in self.jours

    def __str__(self) -> str:
        j = "tous les jours" if len(self.jours) == 7 else ", ".join(self.jours)
        return f"{self.motif} {fmt(self.debut)}–{fmt(self.fin)} ({j})"


# --------------------------------------------------------------------------
# Profil
# --------------------------------------------------------------------------

@dataclass
class Profil:
    # --- Anthropométrie ---
    age: int
    poids: float                      # kg
    taille: float                     # cm
    sexe: str                         # SEXES

    # --- Intention ---
    objectif: str                     # OBJECTIFS
    niveau_sportif: str               # NIVEAUX_SPORTIFS
    equipement: tuple[str, ...]       # sous-ensemble d'EQUIPEMENTS

    # --- Chronobiologie / agenda ---
    heure_reveil: time
    heure_coucher: time
    heure_debut_travail: time
    heure_fin_travail: time
    trajet_quotidien_min: int         # total aller + retour, en minutes
    indisponibilites: tuple[Plage, ...]
    seances_par_semaine: int

    # --- Nutrition ---
    niveau_cuisine: str               # NIVEAUX_CUISINE
    temps_cuisine_min: int            # minutes/jour cuisine + repas cumulés
    contraintes_alimentaires: tuple[str, ...]
    lieu_repas: str                   # LIEUX_REPAS

    # --- Optionnel (valeurs par défaut raisonnables) ---
    nom: str = "Client"
    jours_travailles: tuple[str, ...] = JOURS_TRAVAIL_DEFAUT
    duree_cycle_semaines: int = 8
    pourcentage_gras: float | None = None   # si connu, améliore le calcul MB
    blessures: tuple[str, ...] = ()         # ex: ('epaule', 'lombaires', 'genou')
    date_debut: date = field(default_factory=date.today)

    # ---------------- Construction / validation ----------------

    def __post_init__(self):
        self.sexe = _slug(self.sexe)
        self.objectif = _slug(self.objectif)
        self.niveau_sportif = _slug(self.niveau_sportif)
        self.niveau_cuisine = _slug(self.niveau_cuisine)
        self.lieu_repas = _slug(self.lieu_repas)

        self.heure_reveil = hhmm(self.heure_reveil)
        self.heure_coucher = hhmm(self.heure_coucher)
        self.heure_debut_travail = hhmm(self.heure_debut_travail)
        self.heure_fin_travail = hhmm(self.heure_fin_travail)

        eq = tuple(dict.fromkeys(_slug(e) for e in self.equipement)) or ("aucun",)
        if len(eq) > 1:
            eq = tuple(e for e in eq if e != "aucun") or ("aucun",)
        self.equipement = eq

        ca = tuple(dict.fromkeys(_slug(c) for c in self.contraintes_alimentaires))
        self.contraintes_alimentaires = tuple(c for c in ca if c != "aucune")

        self.jours_travailles = tuple(_slug(j) for j in self.jours_travailles)
        self.blessures = tuple(_slug(b) for b in self.blessures)
        self.indisponibilites = tuple(self.indisponibilites)

        self.age = int(self.age)
        self.poids = float(self.poids)
        self.taille = float(self.taille)
        self.trajet_quotidien_min = int(self.trajet_quotidien_min)
        self.temps_cuisine_min = int(self.temps_cuisine_min)
        self.seances_par_semaine = max(0, min(14, int(self.seances_par_semaine)))
        self.duree_cycle_semaines = max(4, min(16, int(self.duree_cycle_semaines)))

        self.valider()

    def valider(self) -> None:
        err = []
        if not (10 <= self.age <= 100):
            err.append(f"age hors bornes (10-100) : {self.age}")
        if not (30 <= self.poids <= 300):
            err.append(f"poids hors bornes (30-300 kg) : {self.poids}")
        if not (120 <= self.taille <= 230):
            err.append(f"taille hors bornes (120-230 cm) : {self.taille}")
        if self.sexe not in SEXES:
            err.append(f"sexe inconnu : {self.sexe} (attendu {SEXES})")
        if self.objectif not in OBJECTIFS:
            err.append(f"objectif inconnu : {self.objectif}")
        if self.niveau_sportif not in NIVEAUX_SPORTIFS:
            err.append(f"niveau sportif inconnu : {self.niveau_sportif}")
        if self.niveau_cuisine not in NIVEAUX_CUISINE:
            err.append(f"niveau cuisine inconnu : {self.niveau_cuisine}")
        if self.lieu_repas not in LIEUX_REPAS:
            err.append(f"lieu de repas inconnu : {self.lieu_repas}")
        for e in self.equipement:
            if e not in EQUIPEMENTS:
                err.append(f"équipement inconnu : {e}")
        for c in self.contraintes_alimentaires:
            if c not in CONTRAINTES_ALIMENTAIRES:
                err.append(f"contrainte alimentaire inconnue : {c}")
        if self.temps_cuisine_min < 5:
            err.append("temps de cuisine < 5 min : irréaliste")
        if err:
            raise ValueError("Profil invalide :\n  - " + "\n  - ".join(err))

    # ---------------- Variables dérivées ----------------

    @property
    def imc(self) -> float:
        return round(self.poids / (self.taille / 100) ** 2, 1)

    @property
    def classe_imc(self) -> str:
        i = self.imc
        if i < 18.5:
            return "maigreur"
        if i < 25:
            return "normal"
        if i < 30:
            return "surpoids"
        if i < 35:
            return "obesite_1"
        return "obesite_2+"

    @property
    def duree_eveil_min(self) -> int:
        """Minutes entre réveil et coucher (gère le passage de minuit)."""
        r, c = to_min(self.heure_reveil), to_min(self.heure_coucher)
        return (c - r) % (24 * 60) or 24 * 60

    @property
    def duree_sommeil_min(self) -> int:
        return 24 * 60 - self.duree_eveil_min

    @property
    def sommeil_suffisant(self) -> bool:
        return self.duree_sommeil_min >= 7 * 60

    @property
    def duree_travail_min(self) -> int:
        d, f = to_min(self.heure_debut_travail), to_min(self.heure_fin_travail)
        return (f - d) % (24 * 60)

    @property
    def trajet_aller_min(self) -> int:
        return self.trajet_quotidien_min // 2

    @property
    def depart_domicile_min(self) -> int:
        return to_min(self.heure_debut_travail) - self.trajet_aller_min

    @property
    def retour_domicile_min(self) -> int:
        return to_min(self.heure_fin_travail) + self.trajet_aller_min

    @property
    def fenetre_matin_min(self) -> int:
        """Temps libre le matin entre le réveil et le départ."""
        return max(0, self.depart_domicile_min - to_min(self.heure_reveil))

    @property
    def fenetre_soir_min(self) -> int:
        """Temps libre le soir entre le retour et le coucher."""
        c = to_min(self.heure_coucher)
        c = c if c > self.retour_domicile_min else c + 24 * 60
        return max(0, c - self.retour_domicile_min)

    @property
    def temps_libre_semaine_min(self) -> int:
        n = len(self.jours_travailles)
        libre_travail = (self.fenetre_matin_min + self.fenetre_soir_min) * n
        libre_repos = self.duree_eveil_min * (7 - n)
        indispo = sum(
            (p.fin_min - p.debut_min) * len([j for j in p.jours])
            for p in self.indisponibilites
        )
        return max(0, libre_travail + libre_repos - indispo)

    @property
    def pression_temporelle(self) -> str:
        """Classe la contrainte d'agenda : 'critique' | 'forte' | 'moderee' | 'confortable'."""
        m = self.temps_libre_semaine_min / 60
        if m < 10:
            return "critique"
        if m < 20:
            return "forte"
        if m < 35:
            return "moderee"
        return "confortable"

    @property
    def fcmax_estimee(self) -> int:
        """Formule de Tanaka (2001), plus juste que 220-âge après 40 ans."""
        return int(round(208 - 0.7 * self.age))

    @property
    def fc_reserve_base(self) -> int:
        """FC repos estimée selon le niveau (à remplacer par une mesure réelle)."""
        return {"sedentaire": 72, "debutant": 68, "intermediaire": 62,
                "avance": 56, "athlete": 50}[self.niveau_sportif]

    def a(self, *tags: str) -> bool:
        """Possède TOUS ces équipements ?"""
        return all(t in self.equipement for t in tags)

    def a_un_de(self, *tags: str) -> bool:
        """Possède AU MOINS UN de ces équipements ?"""
        return any(t in self.equipement for t in tags)

    @property
    def contexte_equipement(self) -> str:
        """'salle' | 'home_gym' | 'minimal' | 'poids_de_corps'"""
        if self.a_un_de("machines_salle", "rack", "poulie", "barre_olympique"):
            return "salle"
        if self.a_un_de("halteres", "kettlebell", "trx", "anneaux") and self.a_un_de("barre_traction", "barres_paralleles", "banc"):
            return "home_gym"
        if self.a_un_de("barre_traction", "barres_paralleles", "elastiques", "anneaux", "halteres", "kettlebell", "trx"):
            return "minimal"
        return "poids_de_corps"

    def contrainte(self, *noms: str) -> bool:
        return any(n in self.contraintes_alimentaires for n in noms)

    def blesse(self, *zones: str) -> bool:
        return any(z in self.blessures for z in zones)

    @property
    def jours_repos_semaine(self) -> tuple[str, ...]:
        return tuple(j for j in JOURS if j not in self.jours_travailles)

    # ---------------- (dé)sérialisation ----------------

    def to_dict(self) -> dict:
        d = asdict(self)
        d["heure_reveil"] = fmt(self.heure_reveil)
        d["heure_coucher"] = fmt(self.heure_coucher)
        d["heure_debut_travail"] = fmt(self.heure_debut_travail)
        d["heure_fin_travail"] = fmt(self.heure_fin_travail)
        d["date_debut"] = self.date_debut.isoformat()
        d["indisponibilites"] = [
            {"debut": fmt(p.debut), "fin": fmt(p.fin),
             "jours": list(p.jours), "motif": p.motif}
            for p in self.indisponibilites
        ]
        d["_derive"] = {
            "imc": self.imc,
            "classe_imc": self.classe_imc,
            "sommeil_h": round(self.duree_sommeil_min / 60, 1),
            "fenetre_matin_min": self.fenetre_matin_min,
            "fenetre_soir_min": self.fenetre_soir_min,
            "temps_libre_semaine_h": round(self.temps_libre_semaine_min / 60, 1),
            "pression_temporelle": self.pression_temporelle,
            "contexte_equipement": self.contexte_equipement,
            "fcmax": self.fcmax_estimee,
        }
        return d

    @staticmethod
    def from_dict(d: dict) -> "Profil":
        d = dict(d)
        d.pop("_derive", None)
        plages = []
        for p in d.get("indisponibilites", []) or []:
            if isinstance(p, Plage):
                plages.append(p)
            elif isinstance(p, dict):
                plages.append(Plage.creer(p["debut"], p["fin"],
                                          p.get("jours"), p.get("motif", "indisponible")))
            elif isinstance(p, (list, tuple)):
                plages.append(Plage.creer(*p))
        d["indisponibilites"] = tuple(plages)
        for k in ("equipement", "contraintes_alimentaires", "jours_travailles", "blessures"):
            if k in d and d[k] is not None:
                d[k] = tuple(d[k])
        if isinstance(d.get("date_debut"), str):
            d["date_debut"] = date.fromisoformat(d["date_debut"])
        champs = {f for f in Profil.__dataclass_fields__}
        return Profil(**{k: v for k, v in d.items() if k in champs})

    @staticmethod
    def from_json(chemin: str) -> "Profil":
        with open(chemin, encoding="utf-8") as f:
            return Profil.from_dict(json.load(f))

    def __str__(self) -> str:
        return (f"{self.nom} — {self.age} ans, {self.poids:.0f} kg, {self.taille:.0f} cm "
                f"(IMC {self.imc}) | {self.objectif} | {self.niveau_sportif} | "
                f"{self.seances_par_semaine} séances/sem | {self.contexte_equipement}")

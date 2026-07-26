"""
endurance.py — Génération du bloc Endurance / Cardio.

Modèle : zones de fréquence cardiaque calculées par la méthode de Karvonen
(% de la fréquence cardiaque de réserve), plus fiable qu'un simple % de FCmax.

    FC cible = FC repos + intensité × (FCmax − FC repos)

Répartition polarisée : ~80 % du volume en zone 1-2 (faible intensité,
conversationnelle), ~20 % en zone 4-5. C'est le schéma qui limite la fatigue
tout en développant le mieux la capacité aérobie.

Chaque séance propose aussi un repère RPE et un « test de la parole », pour
les clients sans cardiofréquencemètre.
"""

from __future__ import annotations
from dataclasses import dataclass

from .profil import Profil
from .exercices import BIBLIOTHEQUE, Exercice
from .force import Seance, BlocExercice


# --------------------------------------------------------------------------
# Zones d'intensité
# --------------------------------------------------------------------------

@dataclass(frozen=True)
class Zone:
    numero: int
    nom: str
    pct_lo: float          # % de la FC de réserve
    pct_hi: float
    rpe: str
    parole: str
    usage: str


ZONES = (
    Zone(1, "Récupération", 0.50, 0.60, "RPE 2-3",
         "conversation totalement fluide",
         "récupération active, retour au calme, digestion de la charge"),
    Zone(2, "Endurance fondamentale", 0.60, 0.70, "RPE 4-5",
         "phrases complètes sans essoufflement",
         "base aérobie, oxydation des graisses, volume principal"),
    Zone(3, "Tempo", 0.70, 0.80, "RPE 6-7",
         "phrases courtes seulement",
         "endurance active, seuil aérobie"),
    Zone(4, "Seuil", 0.80, 0.90, "RPE 8", "quelques mots",
         "seuil lactique, capacité à tenir une allure élevée"),
    Zone(5, "VO2max", 0.90, 1.00, "RPE 9-10", "parole impossible",
         "puissance aérobie maximale, intervalles courts"),
)


def fc_cible(p: Profil, zone: Zone, fc_repos: int | None = None) -> tuple[int, int]:
    """Bornes de FC en battements/min pour une zone (méthode de Karvonen)."""
    repos = fc_repos if fc_repos is not None else p.fc_reserve_base
    reserve = p.fcmax_estimee - repos
    return (int(repos + zone.pct_lo * reserve), int(repos + zone.pct_hi * reserve))


def table_zones(p: Profil, fc_repos: int | None = None) -> list[dict]:
    out = []
    for z in ZONES:
        lo, hi = fc_cible(p, z, fc_repos)
        out.append({"zone": z.numero, "nom": z.nom, "fc": f"{lo}-{hi} bpm",
                    "rpe": z.rpe, "parole": z.parole, "usage": z.usage})
    return out


# --------------------------------------------------------------------------
# Choix de la modalité
# --------------------------------------------------------------------------

# Contre-indications d'impact : on évite la course si genou/cheville fragiles
# ou si l'IMC est très élevé (contrainte articulaire).
def modalites_disponibles(p: Profil) -> list[Exercice]:
    dispo = [e for e in BIBLIOTHEQUE
             if e.pattern == "cardio" and e.realisable(p.equipement, p.blessures)]
    impact_fort = {"Course à pied extérieur", "Corde à sauter",
                   "Circuit cardio poids de corps (burpees, montées genoux)"}
    # Charge d'impact contre-indiquée : IMC élevé, articulation sensible, ou
    # absence de base aérobie (le tissu conjonctif s'adapte plus lentement
    # que le système cardio-respiratoire).
    eviter_impact = (p.imc >= 30
                     or p.blesse("genou", "cheville", "hanche", "dos")
                     or p.niveau_sportif == "sedentaire"
                     or (p.niveau_sportif == "debutant" and p.imc >= 28)
                     or p.age >= 65)
    if eviter_impact:
        sans_impact = [e for e in dispo if e.nom not in impact_fort]
        if sans_impact:
            dispo = sans_impact
    return dispo


def raison_sans_impact(p: Profil) -> str | None:
    """Explique au coach pourquoi les modalités à impact ont été écartées."""
    motifs = []
    if p.imc >= 30:
        motifs.append(f"IMC {p.imc}")
    if p.blesse("genou", "cheville", "hanche", "dos"):
        motifs.append("articulation sensible déclarée")
    if p.niveau_sportif == "sedentaire":
        motifs.append("absence de base aérobie")
    if p.age >= 65:
        motifs.append(f"âge {p.age} ans")
    if not motifs:
        return None
    return ("Modalités à impact (course, corde à sauter, pliométrie) écartées — "
            + ", ".join(motifs) + ". À réintroduire progressivement une fois "
            "la base aérobie et la tolérance articulaire construites.")


# Modalités permettant réellement d'atteindre les zones 4-5. La marche à
# plat n'en fait pas partie : impossible d'y produire une intensité seuil.
MODALITES_INTENSITE = {
    "Course à pied extérieur", "Tapis de course", "Vélo d'appartement",
    "Vélo route / trajet vélo", "Rameur", "Corde à sauter", "Natation",
    "Circuit cardio poids de corps (burpees, montées genoux)",
    "Marche en côte / escaliers", "Shadow boxing / cardio sans impact",
}


def modalite_principale(p: Profil, pour_intervalles: bool = False) -> Exercice:
    """
    La modalité la plus pertinente compte tenu du matériel et de l'objectif.

    Pour une séance d'intervalles, on exclut les modalités incapables de
    produire une intensité élevée (marche à plat), sinon la zone cible est
    inatteignable et la séance perd son sens.
    """
    dispo = modalites_disponibles(p)
    if pour_intervalles:
        intenses = [e for e in dispo if e.nom in MODALITES_INTENSITE]
        if intenses:
            dispo = intenses
    if not dispo:
        return next(e for e in BIBLIOTHEQUE if e.nom == "Marche rapide")
    # priorité aux modalités globales et peu traumatisantes
    priorite = {"Rameur": 6, "Vélo route / trajet vélo": 5, "Natation": 5,
                "Vélo d'appartement": 4, "Course à pied extérieur": 4,
                "Tapis de course": 3, "Corde à sauter": 3,
                "Marche en côte / escaliers": 2, "Marche rapide": 1}
    if p.objectif == "endurance":
        priorite["Course à pied extérieur"] = 7
    if p.niveau_sportif in ("sedentaire", "debutant") and not pour_intervalles:
        priorite["Marche rapide"] = 6
        priorite["Marche en côte / escaliers"] = 5
    if pour_intervalles:
        # à intensité, on privilégie le sans-impact maîtrisable
        priorite["Vélo d'appartement"] = 7
        priorite["Rameur"] = 7
        priorite["Marche en côte / escaliers"] = 6
    return max(dispo, key=lambda e: priorite.get(e.nom, 0))


# --------------------------------------------------------------------------
# Dosage hebdomadaire
# --------------------------------------------------------------------------

def volume_cardio_cible(p: Profil) -> dict:
    """
    Minutes hebdomadaires de cardio recommandées.

    Socle santé : 150 min/semaine d'intensité modérée (ou 75 min soutenue),
    modulé par l'objectif et le niveau, puis borné par le temps réellement
    disponible.
    """
    base = {"perte_de_gras": 210, "endurance": 300, "sante_mobilite": 150,
            "recomposition": 150, "prise_de_muscle": 90, "force": 75,
            "competition_street": 90}[p.objectif]

    f_niveau = {"sedentaire": 0.5, "debutant": 0.7, "intermediaire": 1.0,
                "avance": 1.15, "athlete": 1.3}[p.niveau_sportif]
    cible = base * f_niveau

    # Un agenda saturé ne permet pas de tout caser : on borne honnêtement.
    plafond = {"critique": 90, "forte": 150, "moderee": 240, "confortable": 400}[p.pression_temporelle]
    cible = min(cible, plafond)

    if p.age >= 60:
        cible = min(cible, 210)
    if not p.sommeil_suffisant:
        cible *= 0.85   # dette de sommeil = récupération dégradée

    return {
        "minutes_semaine": int(round(cible / 5) * 5),
        "repartition": "80 % en zone 1-2, 20 % en zone 4-5 (modèle polarisé)",
        "plafond_agenda": plafond,
    }


def repartir_cardio(p: Profil, minutes: int, n_seances_cardio: int) -> list[dict]:
    """
    Découpe le volume hebdomadaire en séances typées.

    Règle polarisée : la majorité du temps en zone 2 ; une seule séance
    d'intervalles si ≤ 3 séances, deux au-delà — jamais deux jours de suite.
    """
    if n_seances_cardio <= 0 or minutes <= 0:
        return []

    n_intervalles = 0 if n_seances_cardio == 1 else (1 if n_seances_cardio <= 3 else 2)
    if p.niveau_sportif == "sedentaire":
        n_intervalles = 0                    # on construit d'abord la base aérobie
    if p.objectif in ("force", "prise_de_muscle"):
        n_intervalles = min(n_intervalles, 1)  # préserver la récupération musculaire

    n_continu = n_seances_cardio - n_intervalles
    # les intervalles sont courts mais denses : ~20 % du volume
    min_intervalles = int(minutes * 0.20) if n_intervalles else 0
    min_continu = minutes - min_intervalles

    # Plafond par séance : au-delà, la séance devient irréaliste et le
    # volume doit être reporté (marche quotidienne, trajets actifs).
    plafond_seance = {"sedentaire": 45, "debutant": 60, "intermediaire": 75,
                      "avance": 90, "athlete": 120}[p.niveau_sportif]
    if p.objectif == "endurance":
        plafond_seance = int(plafond_seance * 1.3)

    seances = []
    for i in range(n_continu):
        d = max(20, int(min_continu / max(1, n_continu)))
        seances.append({"type": "continu", "duree": min(d, plafond_seance), "zone": 2})
    for i in range(n_intervalles):
        d = max(18, int(min_intervalles / max(1, n_intervalles)))
        seances.append({"type": "intervalles", "duree": min(d, 40),
                        "zone": 4 if p.niveau_sportif in ("debutant", "intermediaire") else 5})

    # Volume non casé dans les séances : à récupérer en activité quotidienne
    place = sum(s["duree"] for s in seances)
    if place < minutes * 0.9:
        for s in seances:
            s["volume_residuel"] = int(minutes - place)
    return seances


def conseil_volume_residuel(p: Profil, residuel: int) -> str:
    """Comment absorber le volume aérobie qui ne tient pas dans les séances."""
    par_jour = int(residuel / 7)
    return (f"{residuel} min/semaine de zone 2 ne tiennent pas dans les séances planifiées "
            f"(durée réaliste par séance dépassée). À accumuler en activité quotidienne : "
            f"environ {par_jour} min/jour de marche rapide, trajets actifs, escaliers. "
            f"C'est aussi efficace pour la dépense énergétique et bien plus soutenable.")


# --------------------------------------------------------------------------
# Construction d'une séance de cardio
# --------------------------------------------------------------------------

def construire_seance_cardio(p: Profil, spec: dict, jour: str, debut: str, fin: str,
                             semaine: dict, fc_repos: int | None = None) -> Seance:
    modalite = modalite_principale(p, pour_intervalles=(spec["type"] == "intervalles"))
    duree = spec["duree"]
    coef = semaine["coef_volume"]
    if semaine["type"] == "deload":
        duree = int(duree * 0.6)

    zone = ZONES[spec["zone"] - 1]
    lo, hi = fc_cible(p, zone, fc_repos)

    s = Seance(nom=f"Endurance — {modalite.nom}", jour=jour, debut=debut, fin=fin,
               duree_min=duree, type="endurance",
               intensite="elevee" if spec["type"] == "intervalles" else "moderee")

    ech = max(5, min(12, duree // 6))
    s.blocs.append(BlocExercice(
        nom=f"Échauffement progressif — {modalite.nom}", pattern="cardio", series=1,
        reps=f"{ech} min", repos_s=0, rpe="RPE 3-4", tempo="progressif",
        role="echauffement", unite="temps",
        note="Monter l'allure par paliers jusqu'au bas de la zone cible."))

    corps = duree - ech - 5

    if spec["type"] == "continu":
        s.blocs.append(BlocExercice(
            nom=f"{modalite.nom} — allure continue (zone {zone.numero}, {zone.nom})",
            pattern="cardio", series=1, reps=f"{corps} min", repos_s=0,
            rpe=zone.rpe, tempo="régulier", role="principal", unite="temps",
            note=f"FC cible {lo}-{hi} bpm — {zone.parole}. "
                 f"Sans cardio : se fier au test de la parole."))
    else:
        # Intervalles calibrés selon le niveau
        if p.niveau_sportif in ("sedentaire", "debutant"):
            travail, repos, reps = 60, 90, max(4, corps // 3)
        elif p.niveau_sportif == "intermediaire":
            travail, repos, reps = 90, 90, max(5, corps // 3)
        else:
            travail, repos, reps = 120, 90, max(6, corps // 4)
        reps = max(4, min(12, int(reps * coef)))
        s.blocs.append(BlocExercice(
            nom=f"Intervalles {travail}s effort / {repos}s récupération active",
            pattern="cardio", series=reps, reps=f"{travail} s",
            repos_s=repos, rpe=zone.rpe, tempo="explosif", role="principal",
            unite="temps",
            note=f"Effort en zone {zone.numero} ({lo}-{hi} bpm) — {zone.parole}. "
                 f"Récupération en marche/pédalage très lent."))

    s.blocs.append(BlocExercice(
        nom="Retour au calme + respiration nasale", pattern="cardio", series=1,
        reps="5 min", repos_s=0, rpe="RPE 2", tempo="lent",
        role="retour_calme", unite="temps"))

    s.notes.append(f"Modalité choisie d'après le matériel disponible : {modalite.nom}.")
    motif = raison_sans_impact(p)
    if motif:
        s.notes.append(motif)
    if spec["type"] == "intervalles":
        s.notes.append("Ne pas enchaîner deux séances d'intervalles sur deux jours consécutifs.")
    return s


def integrer_trajet_actif(p: Profil) -> str | None:
    """
    Le trajet quotidien peut devenir du volume aérobie gratuit : c'est
    souvent le seul levier pour un agenda saturé.
    """
    if p.trajet_quotidien_min < 20:
        return None
    if p.pression_temporelle in ("critique", "forte"):
        return (f"Agenda très contraint : convertir tout ou partie des "
                f"{p.trajet_quotidien_min} min de trajet quotidien en déplacement actif "
                f"(vélo, marche rapide, descendre un arrêt plus tôt) apporterait jusqu'à "
                f"{p.trajet_quotidien_min * 5} min/semaine de zone 2 sans coût de temps.")
    return (f"Option : rendre actif une partie des {p.trajet_quotidien_min} min de trajet "
            f"quotidien pour accumuler du volume en zone 2 sans mobiliser de créneau.")

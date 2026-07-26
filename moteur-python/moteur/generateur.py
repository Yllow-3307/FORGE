"""
generateur.py — Orchestrateur.

Assemble les quatre blocs (force, endurance, nutrition, hydratation) en un
programme cohérent : planning hebdomadaire heure par heure + progression sur
l'ensemble du cycle.

C'est ici que se règlent les arbitrages inter-modules :
  - répartition des séances entre force et endurance
  - interférence force/endurance le même jour
  - calories des jours d'entraînement vs jours de repos
  - hydratation calée sur les séances effectivement placées
"""

from __future__ import annotations

import json
from dataclasses import asdict
from datetime import timedelta

from .profil import Profil, JOURS, fmt, duree_fmt, to_min
from . import agenda, force, endurance, nutrition, hydratation
from .force import Seance, duree_estimee


# --------------------------------------------------------------------------
# Arbitrage force / endurance
# --------------------------------------------------------------------------

def repartir_seances(p: Profil) -> tuple[int, int]:
    """
    Combien de séances de force, combien de cardio, dans l'enveloppe
    déclarée par le client ?

    L'entraînement concourant (force + endurance) crée une interférence :
    on protège donc la modalité prioritaire selon l'objectif.
    """
    n = p.seances_par_semaine
    if n <= 0:
        return 0, 0

    parts = {
        "force": (1.00, 0.00),
        "prise_de_muscle": (0.85, 0.15),
        "competition_street": (0.85, 0.15),
        "recomposition": (0.70, 0.30),
        "perte_de_gras": (0.65, 0.35),
        "sante_mobilite": (0.60, 0.40),
        "endurance": (0.35, 0.65),
    }[p.objectif]

    n_force = max(1, round(n * parts[0]))
    n_cardio = n - n_force

    # Garde-fous : au moins 2 séances de force pour maintenir la masse maigre
    if p.objectif != "endurance" and n >= 3 and n_force < 2:
        n_force, n_cardio = 2, n - 2
    if p.objectif == "endurance" and n >= 3 and n_force < 1:
        n_force, n_cardio = 1, n - 1
    return n_force, max(0, n_cardio)


def jour_le_plus_libre(p: Profil, exclus: set[str]) -> str | None:
    dispo = [(j, sum(c.duree for c in agenda.creneaux_libres(p, j)))
             for j in JOURS if j not in exclus]
    dispo = [(j, d) for j, d in dispo if d >= 30]
    if not dispo:
        return None
    return max(dispo, key=lambda t: t[1])[0]


# --------------------------------------------------------------------------
# Génération d'une semaine
# --------------------------------------------------------------------------

def generer_semaine(p: Profil, semaine: dict, fc_repos: int | None = None) -> dict:
    """Construit une semaine complète : séances placées, repas, hydratation."""
    n_force, n_cardio = repartir_seances(p)
    duree_force = force.duree_seance_cible(p)

    # 1. Jours d'entraînement
    jours_force = agenda.jours_entrainement(p, duree_force)[:n_force]
    occupes = set(jours_force)

    jours_cardio: list[str] = []
    for _ in range(n_cardio):
        # on cherche d'abord un jour sans musculation
        j = jour_le_plus_libre(p, occupes)
        if j is None:
            # sinon on double sur un jour de force (cardio à distance)
            restants = [x for x in jours_force if x not in jours_cardio]
            j = restants[0] if restants else None
        if j is None:
            break
        jours_cardio.append(j)
        occupes.add(j)

    # 2. Split de force
    split = force.split_pour(p, max(1, len(jours_force)))

    # 3. Spécifications cardio
    vol = endurance.volume_cardio_cible(p)
    specs = endurance.repartir_cardio(p, vol["minutes_semaine"], len(jours_cardio))

    # 4. Placement et construction
    seances_par_jour: dict[str, list[Seance]] = {j: [] for j in JOURS}
    alertes: list[str] = []

    for i, j in enumerate(jours_force):
        creneau, duree_reelle = agenda.placer_avec_repli(
            p, j, duree_force, duree_min=25,
            intensite="elevee" if p.objectif in ("force", "prise_de_muscle",
                                                 "competition_street") else "moderee")
        if creneau is None:
            alertes.append(f"Aucun créneau d'au moins 25 min trouvé le {j} : séance non placée.")
            continue
        nom, patterns = split[i % len(split)]
        s = force.construire_seance_force(
            p, nom, patterns, j, fmt(creneau.debut), fmt(creneau.fin),
            duree_reelle, semaine)
        seances_par_jour[j].append(s)

    toutes_force = [s for lst in seances_par_jour.values() for s in lst if s.type == "force"]
    toutes_force, remarques_volume = force.equilibrer(p, toutes_force, semaine)
    alertes.extend(remarques_volume)

    for i, j in enumerate(jours_cardio):
        if i >= len(specs):
            break
        spec = specs[i]
        deja = seances_par_jour[j]
        creneau, duree_reelle = agenda.placer_avec_repli(
            p, j, spec["duree"], duree_min=15,
            intensite="elevee" if spec["type"] == "intervalles" else "moderee")
        if creneau is None:
            alertes.append(f"Cardio du {j} non placé (pas de créneau disponible).")
            continue
        # Musculation et cardio le même jour : signaler l'interférence
        if deja:
            alertes.append(
                f"{j.capitalize()} : musculation et cardio le même jour. Espacer les deux "
                f"d'au moins 6 h si possible ; sinon faire le cardio APRÈS la musculation "
                f"(l'ordre inverse dégrade la performance en force).")
        if spec.get("volume_residuel"):
            alertes.append(endurance.conseil_volume_residuel(p, spec["volume_residuel"]))
        spec_ajustee = dict(spec, duree=duree_reelle)
        s = endurance.construire_seance_cardio(
            p, spec_ajustee, j, fmt(creneau.debut), fmt(creneau.fin), semaine, fc_repos)
        seances_par_jour[j].append(s)

    # 5. Nutrition
    m = nutrition.macros(p)
    budget = agenda.budget_temps_cuisine(p)
    pratique = nutrition.strategie_pratique(p, budget)
    aliments = nutrition.profil_alimentaire(p)

    # 6. Journées détaillées
    jours_detail = []
    for j in JOURS:
        seances_j = sorted(seances_par_jour[j], key=lambda s: s.debut)
        principale = seances_j[0] if seances_j else None
        creneau_principal = None
        if principale:
            d = to_min(_parse(principale.debut))
            creneau_principal = agenda.Creneau(d, d + principale.duree_min, j, "entrainement")

        repas = agenda.structure_repas(p, j, creneau_principal)
        repas = nutrition.repartir_macros(p, repas, m)

        minutes_effort = sum(s.duree_min for s in seances_j)
        besoin = hydratation.besoin_hydrique(p, minutes_effort)
        points_eau = hydratation.plan_journalier(
            p, besoin["total_boissons_ml"], creneau_principal, repas)

        jours_detail.append({
            "jour": j,
            "travaille": j in p.jours_travailles,
            "seances": [s.to_dict() for s in seances_j],
            "repas": repas,
            "hydratation": {"besoin": besoin, "points": points_eau,
                            "total_planifie_ml": hydratation.total_verifie(points_eau)},
            "minutes_effort": minutes_effort,
            "alertes_digestion": agenda.conflit_digestion(repas, creneau_principal),
        })

    return {
        "semaine": semaine["semaine"],
        "type": semaine["type"],
        "consigne": semaine["consigne"],
        "jours": jours_detail,
        "volume_muscles": force.volume_hebdomadaire(toutes_force),
        "audit_volume": force.auditer_volume(toutes_force, p.objectif, p, len(jours_force)),
        "cardio_cible": vol,
        "alertes": sorted(set(alertes)),
    }


def _parse(hhmm_str: str):
    from .profil import hhmm
    return hhmm(hhmm_str)


# --------------------------------------------------------------------------
# Programme complet
# --------------------------------------------------------------------------

def generer_programme(p: Profil, fc_repos: int | None = None) -> dict:
    """
    Génère le programme complet : une semaine type détaillée + la progression
    semaine par semaine sur tout le cycle.
    """
    trame = force.semaines_du_cycle(p.duree_cycle_semaines, p.niveau_sportif)

    semaine_type = generer_semaine(p, trame[0], fc_repos)
    cycle = [generer_semaine(p, s, fc_repos) for s in trame]

    m = nutrition.macros(p)
    budget = agenda.budget_temps_cuisine(p)
    n_force, n_cardio = repartir_seances(p)

    # Calories modulées selon le type de journée
    kcal_entrainement = int(m["kcal"] * 1.05)
    kcal_repos = int(m["kcal"] * 0.93)

    programme = {
        "meta": {
            "genere_le": p.date_debut.isoformat(),
            "duree_cycle_semaines": p.duree_cycle_semaines,
            "moteur": "Moteur de programmation v1.0",
        },
        "profil": p.to_dict(),
        "synthese": {
            "resume": str(p),
            "seances_force": n_force,
            "seances_cardio": n_cardio,
            "duree_seance_force_min": force.duree_seance_cible(p),
            "split": [nom for nom, _ in force.split_pour(p, max(1, n_force))],
            "contexte_equipement": p.contexte_equipement,
            "pression_temporelle": p.pression_temporelle,
            "moment_entrainement": agenda.moment_prefere(p),
            "sommeil_h": round(p.duree_sommeil_min / 60, 1),
        },
        "nutrition": {
            **m,
            "kcal_jour_entrainement": kcal_entrainement,
            "kcal_jour_repos": kcal_repos,
            "pratique": nutrition.strategie_pratique(p, budget),
            "aliments": nutrition.profil_alimentaire(p),
            "ajustement": nutrition.regles_ajustement(p),
        },
        "hydratation": {
            "zones": None,
            "besoin_jour_repos": hydratation.besoin_hydrique(p, 0),
            "besoin_jour_entrainement": hydratation.besoin_hydrique(
                p, force.duree_seance_cible(p)),
            "boissons": hydratation.recommandations_boissons(
                p, force.duree_seance_cible(p)),
            "reperes": hydratation.reperes_controle(),
        },
        "endurance": {
            "zones_fc": endurance.table_zones(p, fc_repos),
            "volume": endurance.volume_cardio_cible(p),
            "modalite_continu": endurance.modalite_principale(p).nom,
            "modalite_intervalles": endurance.modalite_principale(p, True).nom,
            "trajet_actif": endurance.integrer_trajet_actif(p),
            "note_impact": endurance.raison_sans_impact(p),
        },
        "semaine_type": semaine_type,
        "cycle": cycle,
        "avertissements": avertissements(p),
    }
    return programme


def avertissements(p: Profil) -> list[str]:
    """Signale au coach les points de vigilance et les limites du plan."""
    a = ["Ce programme est un point de départ automatisé : il ne remplace pas "
         "l'évaluation d'un professionnel de santé. En cas de pathologie, de "
         "grossesse, de douleur persistante ou de traitement en cours, un avis "
         "médical est nécessaire avant de commencer."]

    if not p.sommeil_suffisant:
        a.append(f"Sommeil estimé à {p.duree_sommeil_min / 60:.1f} h/nuit : en dessous des "
                 f"7 h recommandées. La récupération, la perte de gras et la prise de muscle "
                 f"en seront limitées. C'est le premier levier à corriger, avant tout "
                 f"ajustement du programme.")
    if p.pression_temporelle == "critique":
        a.append("Agenda extrêmement contraint : le programme a été condensé au maximum. "
                 "Un volume aussi faible produit surtout du maintien. Envisager de libérer "
                 "un créneau supplémentaire ou d'utiliser les trajets.")
    if p.seances_par_semaine >= 6 and p.niveau_sportif in ("sedentaire", "debutant"):
        a.append(f"{p.seances_par_semaine} séances/semaine pour un niveau {p.niveau_sportif} : "
                 f"risque élevé d'abandon et de blessure. Commencer à 3-4 séances et "
                 f"augmenter progressivement donnerait de meilleurs résultats.")
    if p.age >= 60:
        a.append("Après 60 ans : privilégier la progression lente, l'échauffement long "
                 "et le travail d'équilibre. Le maintien de la masse musculaire et de la "
                 "densité osseuse devient la priorité.")
    if p.imc >= 35:
        a.append("IMC élevé : privilégier les modalités sans impact et un suivi médical. "
                 "La perte de poids doit rester progressive.")
    if p.imc < 18.5:
        a.append("IMC bas : un objectif de perte de poids serait inapproprié. "
                 "Un avis médical est recommandé avant toute restriction calorique.")
    if p.blessures:
        a.append(f"Blessures déclarées ({', '.join(p.blessures)}) : les exercices "
                 f"contre-indiqués sont exclus automatiquement, mais cela ne remplace "
                 f"pas l'avis d'un kinésithérapeute.")
    return a


# --------------------------------------------------------------------------
# Export
# --------------------------------------------------------------------------

def exporter_json(programme: dict, chemin: str) -> str:
    with open(chemin, "w", encoding="utf-8") as f:
        json.dump(programme, f, ensure_ascii=False, indent=2, default=str)
    return chemin

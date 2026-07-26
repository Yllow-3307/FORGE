"""
hydratation.py — Génération du bloc Hydratation.

Calcul du besoin quotidien :
    besoin = socle (ml/kg) + pertes liées à l'effort + correctifs contextuels

Le plan produit un échéancier réel (heure par heure) plutôt qu'un simple
volume total : c'est la répartition qui détermine l'observance, et boire
2 litres d'un coup le soir n'hydrate pas — cela réveille la nuit.
"""

from __future__ import annotations

from .profil import Profil, to_min, fmt, JOURS


# --------------------------------------------------------------------------
# Besoin quotidien
# --------------------------------------------------------------------------

def socle_ml_par_kg(p: Profil) -> float:
    """Base physiologique, ajustée à l'âge (la sensation de soif diminue)."""
    if p.age >= 65:
        return 30.0        # soif moins fiable : on structure davantage
    if p.age >= 55:
        return 32.0
    return 33.0


def besoin_hydrique(p: Profil, minutes_effort_jour: int = 0,
                    climat: str = "tempere") -> dict:
    """
    Besoin quotidien total en ml, décomposé pour être explicable au client.

    Références : ~30-35 ml/kg/jour au repos, +500 à 750 ml par heure d'effort
    modéré, davantage en climat chaud. Environ 20-30 % des apports viennent
    des aliments : le plan ne compte que les boissons.
    """
    socle = socle_ml_par_kg(p) * p.poids

    # Pertes à l'effort : ~600 ml/h, modulé par la corpulence
    coef_sudation = 1.0 + max(0.0, (p.imc - 25) * 0.02)
    effort = (minutes_effort_jour / 60) * 600 * coef_sudation

    correctifs = {}
    if climat == "chaud":
        correctifs["climat chaud"] = socle * 0.15
    elif climat == "froid_sec":
        correctifs["air froid et sec"] = socle * 0.05

    if p.contrainte("diabete_t2"):
        correctifs["diabète (surveillance glycémique)"] = 200
    if p.duree_eveil_min > 17 * 60:
        correctifs["journée d'éveil longue"] = 150

    total_boissons = socle + effort + sum(correctifs.values())

    # Plafond de sécurité : le rein élimine environ 0,8-1 L/h et les
    # recommandations dépassent rarement 4 L/j hors sport extrême. Un poids
    # très élevé ne justifie pas un volume proportionnel illimité.
    plafond = 3500 + min(1000, (minutes_effort_jour / 60) * 500)
    plafonne = total_boissons > plafond
    total_boissons = min(total_boissons, plafond)

    # Les apports alimentaires couvrent une part du besoin total
    apport_aliments = total_boissons * 0.20

    return {
        "socle_ml": int(socle),
        "effort_ml": int(effort),
        "correctifs": {k: int(v) for k, v in correctifs.items()},
        "total_boissons_ml": int(round(total_boissons / 50) * 50),
        "apport_aliments_estime_ml": int(apport_aliments),
        "plafond_applique": plafonne,
        "note": ("Volume à boire, hors eau contenue dans les aliments "
                 "(fruits, légumes, soupes : environ 20 % de plus)."
                 + (" Volume plafonné : au-delà, l'excès est simplement éliminé "
                    "et peut diluer les électrolytes. Se fier à la soif et à la "
                    "couleur des urines." if plafonne else "")),
    }


# --------------------------------------------------------------------------
# Échéancier
# --------------------------------------------------------------------------

def plan_journalier(p: Profil, besoin_ml: int, seance=None,
                    repas: list[dict] | None = None) -> list[dict]:
    """
    Répartit le volume sur la journée réelle, avec des points d'ancrage
    concrets (réveil, repas, trajets, séance) plutôt que des heures fixes.

    Règles :
      - un verre dès le réveil (déficit nocturne)
      - un volume avant/pendant/après l'effort
      - réduction marquée dans les 2 h précédant le coucher (sommeil)
    """
    reveil = to_min(p.heure_reveil)
    coucher = to_min(p.heure_coucher)
    if coucher <= reveil:
        coucher += 24 * 60

    points: list[dict] = []

    # 1. Réveil : réhydratation du jeûne nocturne
    points.append({"heure": reveil + 5, "ml": 400, "moment": "Au réveil",
                   "conseil": "400 ml d'eau dès le lever : la nuit crée un déficit de 300-500 ml."})

    # 2. Autour de la séance
    # `seance` peut être un Creneau (attribut .duree) ou une Seance (.duree_min)
    if seance is not None:
        duree_seance = getattr(seance, "duree_min", None) or getattr(seance, "duree", 45)
        duree_h = duree_seance / 60
        pendant = int(500 * duree_h * (1.0 + max(0.0, (p.imc - 25) * 0.02)))
        points.append({"heure": max(reveil + 10, seance.debut - 90), "ml": 400,
                       "moment": "90 min avant la séance",
                       "conseil": "Permet d'arriver hydraté sans gêne gastrique."})
        points.append({"heure": seance.debut + int(duree_seance) // 2, "ml": pendant,
                       "moment": "Pendant la séance",
                       "conseil": f"Environ {pendant} ml par petites gorgées régulières "
                                  f"(150-200 ml toutes les 15-20 min)."})
        points.append({"heure": seance.fin + 20, "ml": 500,
                       "moment": "Après la séance",
                       "conseil": "Compenser 1,5 fois la masse perdue : se peser avant/après "
                                  "pour calibrer (1 kg perdu = 1,5 L à boire)."})

    # 3. Autour des repas
    for r in (repas or []):
        if r["role"] in ("demarrage", "principal"):
            points.append({"heure": r["heure"] - 15, "ml": 250,
                           "moment": f"Avant {r['nom'].lower()}",
                           "conseil": "Un verre avant le repas : hydratation et satiété."})

    # 4. Remplissage du reste de la journée
    deja = sum(pt["ml"] for pt in points)
    reste = max(0, besoin_ml - deja)
    limite = coucher - 120          # on cesse 2 h avant le coucher
    debut_remplissage = reveil + 120
    if reste > 0 and limite > debut_remplissage:
        n = max(1, (limite - debut_remplissage) // 120)   # un point toutes les 2 h
        par_point = int(round(reste / n / 50) * 50)
        for i in range(int(n)):
            h = debut_remplissage + i * 120
            if h >= limite:
                break
            contexte = "au bureau" if (p.heure_debut_travail and
                                       p.depart_domicile_min <= h <= p.retour_domicile_min) else "à la maison"
            points.append({"heure": h, "ml": par_point,
                           "moment": f"Point régulier ({contexte})",
                           "conseil": "Gourde visible sur le bureau : le principal levier "
                                      "d'observance est la disponibilité, pas la motivation."})

    points.sort(key=lambda x: x["heure"])
    for pt in points:
        pt["heure_txt"] = fmt(pt["heure"])
    return points


# --------------------------------------------------------------------------
# Boissons et repères
# --------------------------------------------------------------------------

def recommandations_boissons(p: Profil, minutes_effort: int) -> dict:
    """Que boire, et quand un apport en électrolytes se justifie."""
    electrolytes = (minutes_effort >= 75
                    or p.imc >= 30
                    or p.objectif == "endurance" and minutes_effort >= 60)

    base = ["Eau plate ou gazeuse : boisson de référence, sans limite.",
            "Thé et café comptent dans les apports (l'effet diurétique est marginal "
            "aux doses usuelles), mais limiter la caféine à 6 h du coucher."]

    if electrolytes:
        base.append("Séances longues (>75 min) ou forte sudation : ajouter du sodium "
                    "(300-700 mg/L) — une pincée de sel + jus de citron suffit, "
                    "inutile d'acheter des boissons spécialisées.")
    else:
        base.append("Séances de moins de 75 min : l'eau suffit, aucune boisson "
                    "de l'effort n'est nécessaire.")

    a_limiter = ["Sodas et jus de fruits : apports caloriques liquides, peu rassasiants.",
                 "Alcool : altère la récupération, le sommeil et la synthèse protéique."]
    if p.contrainte("diabete_t2"):
        a_limiter.append("Aucune boisson sucrée, y compris jus 100 % pur fruit.")
    if p.contrainte("hypertension"):
        a_limiter.append("Attention aux eaux minérales riches en sodium (lire l'étiquette).")

    return {"a_privilegier": base, "a_limiter": a_limiter,
            "electrolytes_necessaires": electrolytes}


def reperes_controle() -> list[str]:
    """Comment savoir si l'hydratation est correcte, sans matériel."""
    return [
        "Couleur des urines : jaune pâle = correct ; jaune foncé = déficit ; "
        "totalement transparent = excès (inutile, voire contre-productif).",
        "Fréquence : 4 à 7 mictions par jour est un bon repère.",
        "Se peser avant et après une séance longue : chaque kilo perdu correspond "
        "à environ 1,5 L à recompenser dans les heures qui suivent.",
        "Signes de déficit : maux de tête en fin de journée, baisse de performance "
        "inexpliquée, crampes, sensation de bouche sèche.",
        "⚠ Ne jamais forcer au-delà de la soif de façon extrême : boire plusieurs litres "
        "d'un coup expose à l'hyponatrémie. La régularité prime sur le volume.",
    ]


def total_verifie(points: list[dict]) -> int:
    return sum(p["ml"] for p in points)

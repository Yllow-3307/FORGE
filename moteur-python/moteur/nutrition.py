"""
nutrition.py — Génération du bloc Nutrition.

Chaîne de calcul :
  1. Métabolisme de base (Mifflin-St Jeor, ou Katch-McArdle si % de gras connu)
  2. Dépense totale = MB × facteur d'activité (professionnelle + sportive)
  3. Calories cibles = dépense ± ajustement selon l'objectif
  4. Protéines / lipides fixés en priorité, glucides = solde énergétique
  5. Répartition sur les repas réels de la journée (issus d'agenda.py)
  6. Filtrage des aliments par contraintes, niveau de cuisine, lieu de repas

Toutes les valeurs sont des estimations de départ, à ajuster sur la base de
l'évolution réelle du poids et des sensations (voir `regles_ajustement`).
"""

from __future__ import annotations

from .profil import Profil

KCAL_PROT, KCAL_LIP, KCAL_GLU = 4, 9, 4


# --------------------------------------------------------------------------
# 1-2. Dépense énergétique
# --------------------------------------------------------------------------

def metabolisme_base(p: Profil) -> int:
    """
    MB en kcal/jour.

    Katch-McArdle si la masse grasse est connue (plus précis, car basé sur la
    masse maigre), sinon Mifflin-St Jeor.
    """
    if p.pourcentage_gras is not None and 3 <= p.pourcentage_gras <= 60:
        masse_maigre = p.poids * (1 - p.pourcentage_gras / 100)
        return int(round(370 + 21.6 * masse_maigre))
    base = 10 * p.poids + 6.25 * p.taille - 5 * p.age
    if p.sexe == "homme":
        base += 5
    elif p.sexe == "femme":
        base -= 161
    else:
        base -= 78          # moyenne des deux, faute de donnée spécifique
    return int(round(base))


def facteur_activite(p: Profil) -> float:
    """
    Facteur multiplicateur du MB : activité professionnelle + trajets +
    entraînements. Volontairement conservateur (la NEAT est surestimée dans
    la plupart des calculateurs grand public).
    """
    # Socle : sédentarité professionnelle supposée (travail de bureau)
    f = 1.20
    # Trajets actifs potentiels
    if p.trajet_quotidien_min >= 60:
        f += 0.04
    elif p.trajet_quotidien_min >= 30:
        f += 0.02
    # Charge d'entraînement
    f += min(0.28, 0.045 * p.seances_par_semaine)
    # Le niveau reflète la masse musculaire et l'intensité réelle du travail
    f += {"sedentaire": 0.0, "debutant": 0.01, "intermediaire": 0.03,
          "avance": 0.05, "athlete": 0.08}[p.niveau_sportif]
    return round(min(f, 1.75), 3)


def depense_totale(p: Profil) -> int:
    return int(round(metabolisme_base(p) * facteur_activite(p)))


# --------------------------------------------------------------------------
# 3. Calories cibles
# --------------------------------------------------------------------------

def calories_cibles(p: Profil) -> dict:
    """
    Ajustement calorique selon l'objectif, borné par un plancher de sécurité.

    Le déficit est proportionnel (%) et non fixe : un déficit de 500 kcal
    n'a pas le même sens à 1800 qu'à 3200 kcal de dépense.
    """
    dep = depense_totale(p)

    ajust = {
        "perte_de_gras": -0.20,
        "prise_de_muscle": +0.10,
        "force": +0.05,
        "endurance": 0.0,
        "recomposition": -0.05,
        "sante_mobilite": 0.0,
        "competition_street": 0.0,
    }[p.objectif]

    # Un IMC très élevé tolère un déficit plus marqué ; un IMC bas l'interdit.
    if p.objectif == "perte_de_gras":
        if p.imc >= 32:
            ajust = -0.25
        elif p.imc < 22:
            ajust = -0.12
    if p.objectif == "prise_de_muscle" and p.imc >= 28:
        ajust = +0.05      # surplus réduit si le taux de gras est déjà élevé

    cible = dep * (1 + ajust)

    # Plancher de sécurité : jamais sous le MB, ni sous les seuils usuels
    mb = metabolisme_base(p)
    plancher = max(mb * 1.0, 1500 if p.sexe == "homme" else 1200)
    plancher_atteint = cible < plancher
    cible = max(cible, plancher)

    return {
        "mb": mb,
        "facteur_activite": facteur_activite(p),
        "depense_totale": dep,
        "ajustement_pct": round(ajust * 100),
        "kcal": int(round(cible / 10) * 10),
        "plancher_applique": plancher_atteint,
        "note_plancher": ("Le déficit théorique passait sous le métabolisme de base : "
                          "calories relevées au plancher de sécurité. Privilégier "
                          "l'augmentation de la dépense plutôt qu'une restriction plus forte."
                          if plancher_atteint else ""),
    }


# --------------------------------------------------------------------------
# 4. Macronutriments
# --------------------------------------------------------------------------

def macros(p: Profil) -> dict:
    """
    Protéines et lipides fixés en priorité (besoins structurels et
    hormonaux), glucides en variable d'ajustement énergétique.
    """
    cal = calories_cibles(p)
    kcal = cal["kcal"]

    # --- Protéines (g/kg de poids corporel) ---
    prot_kg = {
        "perte_de_gras": 2.0,        # préservation de la masse maigre en déficit
        "prise_de_muscle": 1.9,
        "force": 1.8,
        "recomposition": 2.0,
        "endurance": 1.5,
        "sante_mobilite": 1.4,
        "competition_street": 1.8,
    }[p.objectif]
    if p.age >= 60:
        prot_kg = max(prot_kg, 1.6)     # résistance anabolique liée à l'âge
    if p.contrainte("vegan"):
        prot_kg += 0.2                  # digestibilité moindre des sources végétales

    # Chez les personnes en surpoids marqué, on rapporte les protéines à un
    # poids de référence pour ne pas surestimer le besoin.
    poids_ref = p.poids
    if p.imc >= 30:
        poids_ref = 25 * (p.taille / 100) ** 2 + 0.25 * (p.poids - 25 * (p.taille / 100) ** 2)
    prot_g = round(prot_kg * poids_ref)

    # --- Lipides ---
    lip_kg = 0.8 if p.objectif != "perte_de_gras" else 0.7
    lip_kg = max(lip_kg, 0.6)
    lip_g = round(max(lip_kg * poids_ref, kcal * 0.20 / KCAL_LIP))

    # --- Glucides : le solde ---
    reste = kcal - prot_g * KCAL_PROT - lip_g * KCAL_LIP
    glu_g = round(max(reste, kcal * 0.10) / KCAL_GLU)

    # --- Fibres et eau ---
    fibres = round(min(38, max(25, kcal / 1000 * 14)))

    return {
        **cal,
        "proteines_g": prot_g,
        "proteines_g_kg": round(prot_g / p.poids, 2),
        "lipides_g": lip_g,
        "glucides_g": glu_g,
        "fibres_g": fibres,
        "repartition_pct": {
            "proteines": round(prot_g * KCAL_PROT / kcal * 100),
            "lipides": round(lip_g * KCAL_LIP / kcal * 100),
            "glucides": round(glu_g * KCAL_GLU / kcal * 100),
        },
    }


# --------------------------------------------------------------------------
# 5. Répartition sur les repas
# --------------------------------------------------------------------------

# Part de l'apport quotidien par rôle de repas
PARTS = {
    "demarrage": 0.25,
    "principal": 0.32,
    "appoint": 0.10,
    "pre_effort": 0.07,
    "post_effort": 0.12,
}


def repartir_macros(p: Profil, repas: list[dict], m: dict) -> list[dict]:
    """
    Distribue calories et macros sur les repas réellement planifiés.

    Les protéines sont réparties le plus uniformément possible (3-4 prises
    d'au moins 0,3 g/kg), ce qui optimise la synthèse protéique ; les
    glucides sont concentrés autour de l'effort.
    """
    if not repas:
        return []

    poids_repas = [PARTS.get(r["role"], 0.15) for r in repas]
    total = sum(poids_repas) or 1
    poids_repas = [w / total for w in poids_repas]

    # Protéines : réparties plus uniformément que les calories
    n_reels = sum(1 for r in repas if r["role"] in ("demarrage", "principal", "post_effort"))
    n_reels = max(1, n_reels)

    sortie = []
    for r, w in zip(repas, poids_repas):
        kcal_r = round(m["kcal"] * w)
        if r["role"] in ("demarrage", "principal", "post_effort"):
            prot_r = round(m["proteines_g"] / n_reels)
        else:
            prot_r = round(m["proteines_g"] * w * 0.5)

        if r["role"] == "pre_effort":
            glu_r = round(m["glucides_g"] * w * 1.6)
            lip_r = round(m["lipides_g"] * w * 0.3)
        elif r["role"] == "post_effort":
            glu_r = round(m["glucides_g"] * w * 1.4)
            lip_r = round(m["lipides_g"] * w * 0.5)
        else:
            glu_r = round(m["glucides_g"] * w)
            lip_r = round(m["lipides_g"] * w)

        sortie.append({**r, "kcal": kcal_r, "proteines_g": prot_r,
                       "glucides_g": glu_r, "lipides_g": lip_r})

    # Réajustement pour que la somme colle à la cible
    for cle, total_cible in (("proteines_g", m["proteines_g"]),
                             ("glucides_g", m["glucides_g"]),
                             ("lipides_g", m["lipides_g"])):
        somme = sum(r[cle] for r in sortie)
        ecart = total_cible - somme
        if ecart and sortie:
            principal = max(sortie, key=lambda r: r["kcal"])
            principal[cle] = max(0, principal[cle] + ecart)

    for r in sortie:
        r["kcal"] = (r["proteines_g"] * KCAL_PROT + r["glucides_g"] * KCAL_GLU
                     + r["lipides_g"] * KCAL_LIP)
    return sortie


# --------------------------------------------------------------------------
# 6. Aliments et menus
# --------------------------------------------------------------------------

# Sources par macro, avec les tags d'exclusion qu'elles déclenchent.
SOURCES_PROTEINES = [
    ("Poulet / dinde", {"vegetarien", "vegan"}),
    ("Bœuf maigre", {"vegetarien", "vegan", "hindou"}),
    ("Porc / jambon", {"vegetarien", "vegan", "halal", "casher", "sans_porc"}),
    ("Poisson blanc (cabillaud, colin)", {"vegetarien", "vegan", "sans_poisson"}),
    ("Poisson gras (saumon, maquereau, sardine)", {"vegetarien", "vegan", "sans_poisson"}),
    ("Œufs", {"vegan", "sans_oeuf"}),
    ("Fromage blanc / skyr", {"vegan", "sans_lactose"}),
    ("Yaourt grec", {"vegan", "sans_lactose"}),
    ("Tofu ferme", set()),
    ("Tempeh", set()),
    ("Lentilles / pois chiches", set()),
    ("Haricots rouges / noirs", set()),
    ("Protéine de pois en poudre", set()),
    ("Whey", {"vegan", "sans_lactose"}),
    ("Seitan", {"sans_gluten"}),
    ("Edamame", set()),
]

SOURCES_GLUCIDES = [
    ("Riz complet", set()),
    ("Pâtes complètes", {"sans_gluten"}),
    ("Pain complet", {"sans_gluten"}),
    ("Pommes de terre / patate douce", set()),
    ("Quinoa", set()),
    ("Flocons d'avoine", set()),
    ("Sarrasin", set()),
    ("Semoule / boulgour", {"sans_gluten"}),
    ("Fruits frais de saison", set()),
    ("Légumineuses", set()),
]

SOURCES_LIPIDES = [
    ("Huile d'olive", set()),
    ("Avocat", set()),
    ("Amandes / noix", {"sans_fruits_a_coque"}),
    ("Graines de courge / tournesol", set()),
    ("Beurre de cacahuète", {"sans_fruits_a_coque"}),
    ("Huile de colza", set()),
    ("Olives", set()),
]

LEGUMES = ["Brocoli", "Épinards", "Courgette", "Haricots verts", "Carottes",
           "Poivrons", "Tomates", "Chou-fleur", "Salade verte", "Champignons",
           "Aubergine", "Poireau"]

# Aliments à limiter selon les contraintes de santé
LIMITATIONS = {
    "diabete_t2": "Privilégier les glucides à index glycémique bas, toujours associés "
                  "à des fibres/protéines. Éviter les boissons sucrées et les glucides isolés.",
    "hypertension": "Limiter le sel ajouté (<5 g/j), les charcuteries et plats industriels. "
                    "Augmenter les apports en potassium (légumes, légumineuses).",
    "cholesterol": "Privilégier les graisses insaturées (olive, colza, poissons gras), "
                   "limiter les graisses saturées et les produits ultra-transformés.",
    "syndrome_intestin_irritable": "Approche pauvre en FODMAPs à tester : limiter oignon, ail, "
                                   "blé, légumineuses en grande quantité, édulcorants en -ol.",
    "petit_budget": "Prioriser œufs, légumineuses sèches, flocons d'avoine, légumes surgelés, "
                    "poisson en conserve, viandes en promotion à congeler.",
}


def filtrer(sources: list[tuple[str, set]], p: Profil) -> list[str]:
    """Retire les sources incompatibles avec les contraintes déclarées."""
    contraintes = set(p.contraintes_alimentaires)
    if "vegan" in contraintes:
        contraintes.add("vegetarien")
    return [nom for nom, tags in sources if not (tags & contraintes)]


def profil_alimentaire(p: Profil) -> dict:
    prot = filtrer(SOURCES_PROTEINES, p)
    glu = filtrer(SOURCES_GLUCIDES, p)
    lip = filtrer(SOURCES_LIPIDES, p)

    alertes = []
    if p.contrainte("vegan"):
        alertes.append("Régime vegan : supplémentation en vitamine B12 indispensable. "
                       "Surveiller fer, zinc, iode, oméga-3 (EPA/DHA d'algues) et "
                       "combiner céréales + légumineuses sur la journée.")
    if p.contrainte("vegetarien") and not p.contrainte("vegan"):
        alertes.append("Régime végétarien : surveiller le fer (associer vitamine C) et la B12.")
    if p.contrainte("sans_lactose"):
        alertes.append("Sans lactose : compenser le calcium (boissons végétales enrichies, "
                       "amandes, sardines, légumes verts).")
    if p.contrainte("sans_gluten"):
        alertes.append("Sans gluten : varier les féculents (riz, sarrasin, quinoa, pomme de terre) "
                       "pour éviter la monotonie et les carences en fibres.")
    if len(prot) < 4:
        alertes.append("Peu de sources protéiques compatibles : atteindre la cible protéique "
                       "demandera de la poudre de protéine végétale ou une planification serrée.")
    for c in p.contraintes_alimentaires:
        if c in LIMITATIONS:
            alertes.append(LIMITATIONS[c])
    if any(c in p.contraintes_alimentaires for c in ("diabete_t2", "hypertension", "cholesterol")):
        alertes.append("⚕ Pathologie déclarée : ce plan ne remplace pas un suivi médical. "
                       "Validation par un médecin ou un diététicien nécessaire.")

    return {"proteines": prot, "glucides": glu, "lipides": lip,
            "legumes": LEGUMES, "alertes": alertes}


# --------------------------------------------------------------------------
# Faisabilité pratique : cuisine et lieu
# --------------------------------------------------------------------------

def strategie_pratique(p: Profil, budget: dict) -> dict:
    """
    Traduit niveau de cuisine + temps + lieu de repas en consignes concrètes.
    C'est ce qui rend le plan applicable — ou non.
    """
    complexite = {"nul": 1, "debutant": 2, "moyen": 3, "bon": 4, "chef": 5}[p.niveau_cuisine]
    t = p.temps_cuisine_min

    if complexite <= 1 or t < 20:
        style = ("Assemblage sans cuisson : produits prêts à l'emploi, conserves, "
                 "surgelés nature, œufs durs, féculents précuits. Aucune recette.")
    elif complexite == 2:
        style = ("Recettes en une poêle / un plat au four : 3-4 ingrédients, "
                 "cuissons simples, assaisonnement standardisé.")
    elif complexite == 3:
        style = "Recettes classiques en 20-30 min, batch cooking des bases."
    else:
        style = "Cuisine libre : varier techniques et épices, batch cooking optimisé."

    conseils = []
    if budget["batch_cooking"]:
        conseils.append(
            f"Batch cooking le {budget['jour_batch']} ({budget['session_batch_min']} min) : "
            f"cuire en une fois féculents, protéines et légumes rôtis pour 3-4 jours. "
            f"Le reste de la semaine se limite à l'assemblage ({budget['cuisine_par_repas_min']} min/repas).")

    lieu = p.lieu_repas
    if lieu == "bureau_micro_ondes":
        conseils.append("Déjeuner au bureau avec micro-ondes : boîtes hermétiques préparées la veille. "
                        "Réchauffage 2-3 min ; garder la sauce à part pour préserver la texture.")
    elif lieu == "bureau_sans_cuisine":
        conseils.append("Pas de réchauffage possible : privilégier les repas froids complets "
                        "(salades de féculents, wraps, poke bowls, conserves de poisson) "
                        "et transporter en sac isotherme.")
    elif lieu == "restaurant_cantine":
        conseils.append("Repas au restaurant/cantine : règle de l'assiette — la moitié en légumes, "
                        "un quart en protéines (grillé plutôt que frit), un quart en féculents. "
                        "Sauces à part, pain limité, eau comme boisson.")
    elif lieu == "exterieur_nomade":
        conseils.append("Repas nomades : constituer un kit fixe (fruits secs, conserves de thon, "
                        "galettes de riz, fromage blanc en gourde, fruits) pour ne jamais dépendre "
                        "de l'offre disponible.")
    elif lieu == "mixte":
        conseils.append("Lieux variables : garder une structure de repas identique quel que soit "
                        "le lieu (1 protéine + 1 féculent + légumes), seule la forme change.")

    if p.contrainte("petit_budget"):
        conseils.append("Budget contraint : acheter les protéines en gros et congeler, "
                        "privilégier légumes surgelés et légumineuses sèches (coût/protéine imbattable).")

    if p.fenetre_matin_min < 30:
        conseils.append("Matin très court : préparer le petit-déjeuner la veille "
                        "(overnight oats, pudding de chia, omelette froide).")

    return {"style_culinaire": style, "conseils": conseils,
            "niveau_complexite": complexite, **budget}


# --------------------------------------------------------------------------
# Suivi et ajustement
# --------------------------------------------------------------------------

def regles_ajustement(p: Profil) -> list[str]:
    """
    Le plan initial n'est qu'une hypothèse : voici comment la corriger.
    C'est la partie la plus importante du bloc nutrition.
    """
    r = ["Peser le matin à jeun, après passage aux toilettes, 3 à 4 fois par semaine. "
         "Ne comparer que des moyennes hebdomadaires : les variations quotidiennes "
         "reflètent l'eau, pas la masse grasse."]

    if p.objectif == "perte_de_gras":
        lo, hi = round(p.poids * 0.005, 2), round(p.poids * 0.01, 2)
        r.append(f"Rythme cible : -{lo} à -{hi} kg/semaine (0,5 à 1 % du poids). "
                 f"Si la moyenne stagne 2 semaines de suite : retirer 150-200 kcal "
                 f"(sur les glucides et lipides) ou ajouter 2 000 pas/jour.")
        r.append("Si la perte dépasse 1 % du poids par semaine : remonter les calories. "
                 "Une perte trop rapide s'accompagne d'une fonte musculaire.")
    elif p.objectif in ("prise_de_muscle", "force"):
        r.append(f"Rythme cible : +{round(p.poids * 0.0025, 2)} à +{round(p.poids * 0.005, 2)} kg/semaine. "
                 f"Au-delà, la prise est majoritairement grasse : réduire le surplus de 150 kcal.")
        r.append("Si le poids stagne 2 semaines : ajouter 200 kcal, principalement en glucides "
                 "autour de l'entraînement.")
    elif p.objectif == "recomposition":
        r.append("Recomposition : le poids peut rester stable alors que la composition change. "
                 "Suivre les mensurations (tour de taille, de bras) et les performances "
                 "plutôt que la balance.")
    else:
        r.append("Objectif non pondéral : suivre les performances (charges, allures, "
                 "récupération) plutôt que le poids.")

    r.append("Indicateurs d'alerte : fatigue persistante, sommeil dégradé, perte de force "
             "sur 2 séances consécutives, aménorrhée, humeur en berne → remonter les calories "
             "et consulter.")
    if p.contrainte("diabete_t2", "hypertension", "cholesterol"):
        r.append("⚕ Tout changement alimentaire doit être coordonné avec le médecin traitant, "
                 "en particulier en cas de traitement en cours (adaptation possible des doses).")
    return r

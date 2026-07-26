"""
test_combinaisons.py — Test de robustesse sur un large échantillon de profils.

Objectif : vérifier qu'aucune combinaison ne provoque d'erreur et qu'aucune
sortie n'est absurde (séance vide, calories aberrantes, hydratation nulle,
séance qui déborde du créneau, repas après le coucher...).
"""

import itertools
import random
import sys
import traceback

sys.path.insert(0, "/home/user")

from moteur.profil import Profil, Plage, to_min, hhmm
from moteur.generateur import generer_programme, generer_semaine
from moteur.force import semaines_du_cycle, duree_estimee

OBJECTIFS = ["perte_de_gras", "prise_de_muscle", "force", "endurance",
             "recomposition", "sante_mobilite", "competition_street"]
NIVEAUX = ["sedentaire", "debutant", "intermediaire", "avance", "athlete"]
EQUIPEMENTS = [
    ("aucun",),
    ("elastiques",),
    ("barre_traction",),
    ("barre_traction", "elastiques", "corde_a_sauter"),
    ("halteres", "banc", "barre_traction"),
    ("barre_olympique", "rack", "banc", "machines_salle", "poulie", "halteres",
     "barre_traction", "barres_paralleles", "velo_appartement", "rameur"),
    ("anneaux", "barres_paralleles", "barre_traction", "gilet_leste"),
    ("kettlebell", "trx", "step_escalier"),
    ("velo_appartement", "piscine"),
]
CUISINE = ["nul", "debutant", "moyen", "bon", "chef"]
CONTRAINTES = [(), ("vegetarien",), ("vegan", "sans_gluten"), ("sans_lactose",),
               ("halal", "sans_fruits_a_coque"), ("diabete_t2", "hypertension"),
               ("petit_budget", "faible_appetit_matin"),
               ("syndrome_intestin_irritable", "sans_gluten", "vegetarien")]
LIEUX = ["domicile", "bureau_micro_ondes", "bureau_sans_cuisine",
         "restaurant_cantine", "exterieur_nomade", "mixte"]

AGENDAS = [
    # (reveil, coucher, debut_travail, fin_travail, trajet, indispos)
    ("06:00", "22:00", "08:00", "17:00", 40, ()),
    ("05:00", "21:30", "07:00", "15:00", 90, ()),
    ("08:00", "00:30", "10:00", "19:00", 20, ()),
    ("07:00", "23:00", "09:00", "18:00", 120, (Plage.creer("20:00", "22:00",
                                                           ["lundi", "mardi", "mercredi", "jeudi"], "enfants"),)),
    ("06:30", "22:30", "08:30", "18:30", 60, (Plage.creer("12:00", "14:00", None, "réunion"),)),
    ("09:00", "01:00", "13:00", "21:00", 30, ()),      # horaires décalés
    ("04:30", "20:30", "06:00", "14:00", 45, ()),      # équipe du matin
]


def profil_aleatoire(rng: random.Random) -> Profil:
    ag = rng.choice(AGENDAS)
    sexe = rng.choice(["homme", "femme", "autre"])
    return Profil(
        nom="Test",
        age=rng.randint(16, 78),
        poids=round(rng.uniform(45, 145), 1),
        taille=round(rng.uniform(150, 200), 1),
        sexe=sexe,
        objectif=rng.choice(OBJECTIFS),
        niveau_sportif=rng.choice(NIVEAUX),
        equipement=rng.choice(EQUIPEMENTS),
        heure_reveil=ag[0], heure_coucher=ag[1],
        heure_debut_travail=ag[2], heure_fin_travail=ag[3],
        trajet_quotidien_min=ag[4], indisponibilites=ag[5],
        seances_par_semaine=rng.randint(1, 7),
        niveau_cuisine=rng.choice(CUISINE),
        temps_cuisine_min=rng.choice([10, 20, 30, 45, 60, 90]),
        contraintes_alimentaires=rng.choice(CONTRAINTES),
        lieu_repas=rng.choice(LIEUX),
        blessures=rng.choice([(), ("epaule",), ("genou",), ("lombaires",),
                              ("epaule", "genou"), ("poignet",)]),
        duree_cycle_semaines=rng.choice([4, 8, 12]),
    )


def verifier(p: Profil, prog: dict) -> list[str]:
    """Contrôles de cohérence sur un programme généré."""
    pbs = []
    st = prog["semaine_type"]

    n_seances = sum(len(j["seances"]) for j in st["jours"])
    if p.seances_par_semaine > 0 and n_seances == 0:
        pbs.append("aucune séance placée alors que le client en demande "
                   f"{p.seances_par_semaine}")

    for j in st["jours"]:
        coucher = to_min(p.heure_coucher)
        reveil = to_min(p.heure_reveil)
        for s in j["seances"]:
            if not s["blocs"]:
                pbs.append(f"séance vide : {s['nom']} ({j['jour']})")
            travail = [b for b in s["blocs"]
                       if b["role"] in ("principal", "accessoire")]
            if s["type"] == "force" and len(travail) < 2:
                pbs.append(f"séance de force à {len(travail)} exercice(s) : {s['nom']}")
            # débordement du créneau
            est = duree_estimee(type("S", (), {
                "blocs": [type("B", (), b)() for b in s["blocs"]],
                "duree_min": s["duree_min"]})())
            if est > s["duree_min"] + 6:
                pbs.append(f"séance {s['nom']} : {est:.0f} min estimées "
                           f"pour un créneau de {s['duree_min']} min")
            # séance hors période d'éveil
            deb = to_min(hhmm(s["debut"]))
            fin_ = deb + s["duree_min"]
            borne_h = coucher if coucher > reveil else coucher + 1440
            if deb < reveil or fin_ > borne_h + 1:
                pbs.append(f"séance hors éveil : {s['nom']} {s['debut']} ({j['jour']})")

        # repas
        if not j["repas"]:
            pbs.append(f"aucun repas planifié le {j['jour']}")
        for r in j["repas"]:
            if r["kcal"] < 0:
                pbs.append(f"repas à calories négatives : {r['nom']}")
        total_kcal = sum(r["kcal"] for r in j["repas"])
        cible = prog["nutrition"]["kcal"]
        if abs(total_kcal - cible) > cible * 0.18:
            pbs.append(f"{j['jour']} : total repas {total_kcal} kcal vs cible {cible}")

        # hydratation
        h = j["hydratation"]
        if h["total_planifie_ml"] < 800:
            pbs.append(f"{j['jour']} : hydratation planifiée trop faible "
                       f"({h['total_planifie_ml']} ml)")
        if h["total_planifie_ml"] > 6000:
            pbs.append(f"{j['jour']} : hydratation excessive ({h['total_planifie_ml']} ml)")

    # nutrition globale
    n = prog["nutrition"]
    if n["kcal"] < 1000:
        pbs.append(f"calories trop basses : {n['kcal']}")
    if n["proteines_g"] < 40:
        pbs.append(f"protéines trop basses : {n['proteines_g']} g")
    if n["glucides_g"] < 0 or n["lipides_g"] < 0:
        pbs.append("macro négative")
    somme = (n["proteines_g"] * 4 + n["lipides_g"] * 9 + n["glucides_g"] * 4)
    if abs(somme - n["kcal"]) > n["kcal"] * 0.08:
        pbs.append(f"incohérence macros/calories : {somme} vs {n['kcal']}")
    if not n["aliments"]["proteines"]:
        pbs.append("aucune source de protéines compatible")

    return pbs


def main(n_tests=400, graine=42):
    rng = random.Random(graine)
    erreurs, incoherences = [], []

    for i in range(n_tests):
        p = None
        try:
            p = profil_aleatoire(rng)
            prog = generer_programme(p)
            pbs = verifier(p, prog)
            if pbs:
                incoherences.append((str(p), pbs))
        except Exception as e:
            erreurs.append((str(p) if p else "?", f"{type(e).__name__}: {e}",
                            traceback.format_exc()))

    print(f"=== {n_tests} profils testés ===")
    print(f"Erreurs fatales : {len(erreurs)}")
    print(f"Profils avec incohérence : {len(incoherences)}")

    for prof, msg, tb in erreurs[:3]:
        print(f"\n--- ERREUR ---\n{prof}\n{msg}\n{tb[-1200:]}")

    from collections import Counter
    c = Counter()
    for prof, pbs in incoherences:
        for x in pbs:
            # normaliser pour regrouper
            cle = x.split(":")[0].split("(")[0].strip()
            cle = "".join(ch for ch in cle if not ch.isdigit())
            c[cle] += 1
    print("\n--- Incohérences par type ---")
    for k, v in c.most_common(20):
        print(f"  {v:4}  {k}")

    for prof, pbs in incoherences[:4]:
        print(f"\n--- EXEMPLE ---\n{prof}")
        for x in pbs[:6]:
            print("   ", x)

    return len(erreurs), len(incoherences)


if __name__ == "__main__":
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 400
    e, i = main(n)
    sys.exit(0 if e == 0 and i == 0 else 1)

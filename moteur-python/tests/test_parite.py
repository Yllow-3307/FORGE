"""
test_parite.py — Vérifie que le moteur JavaScript et le moteur Python
produisent exactement le même programme pour un même profil.

Sans ce test, les deux implémentations divergeraient silencieusement au fil
des évolutions et l'application web ne refléterait plus le moteur de référence.
"""

import json
import subprocess
import sys

sys.path.insert(0, "/home/user")

from moteur.profil import Profil, Plage
from moteur.generateur import generer_programme
from moteur import force, endurance, nutrition, hydratation, agenda

# --------------------------------------------------------------------------
# Jeu de profils couvrant les cas structurants
# --------------------------------------------------------------------------
PROFILS = [
    dict(nom="P1", age=34, poids=82, taille=178, sexe="homme", objectif="perte_de_gras",
         niveauSportif="debutant", equipement=["barre_traction", "elastiques"],
         heureReveil="06:30", heureCoucher="23:00", heureDebutTravail="09:00",
         heureFinTravail="18:00", trajetQuotidien=60, seancesParSemaine=4,
         niveauCuisine="debutant", tempsCuisine=30,
         contraintesAlimentaires=["sans_lactose"], lieuRepas="bureau_micro_ondes",
         indisponibilites=[], blessures=[], dureeCycle=8),
    dict(nom="P2", age=45, poids=95, taille=175, sexe="femme", objectif="prise_de_muscle",
         niveauSportif="intermediaire",
         equipement=["halteres", "banc", "barre_traction", "barres_paralleles"],
         heureReveil="05:00", heureCoucher="21:30", heureDebutTravail="07:00",
         heureFinTravail="15:00", trajetQuotidien=90, seancesParSemaine=5,
         niveauCuisine="chef", tempsCuisine=90, contraintesAlimentaires=["vegetarien"],
         lieuRepas="domicile", indisponibilites=[], blessures=["epaule"], dureeCycle=12),
    dict(nom="P3", age=62, poids=68, taille=160, sexe="femme", objectif="sante_mobilite",
         niveauSportif="sedentaire", equipement=["elastiques"],
         heureReveil="08:00", heureCoucher="00:30", heureDebutTravail="10:00",
         heureFinTravail="19:00", trajetQuotidien=20, seancesParSemaine=2,
         niveauCuisine="moyen", tempsCuisine=45,
         contraintesAlimentaires=["diabete_t2", "hypertension"],
         lieuRepas="restaurant_cantine", indisponibilites=[], blessures=["genou"],
         dureeCycle=8),
    dict(nom="P4", age=26, poids=70, taille=182, sexe="homme", objectif="competition_street",
         niveauSportif="avance",
         equipement=["barre_traction", "barres_paralleles", "anneaux", "gilet_leste"],
         heureReveil="07:00", heureCoucher="23:30", heureDebutTravail="09:00",
         heureFinTravail="18:00", trajetQuotidien=40, seancesParSemaine=6,
         niveauCuisine="bon", tempsCuisine=60, contraintesAlimentaires=[],
         lieuRepas="mixte", indisponibilites=[], blessures=[], dureeCycle=8),
    dict(nom="P5", age=52, poids=120, taille=168, sexe="femme", objectif="perte_de_gras",
         niveauSportif="sedentaire", equipement=["aucun"],
         heureReveil="07:00", heureCoucher="23:00", heureDebutTravail="09:00",
         heureFinTravail="18:00", trajetQuotidien=120, seancesParSemaine=3,
         niveauCuisine="nul", tempsCuisine=15,
         contraintesAlimentaires=["petit_budget", "faible_appetit_matin"],
         lieuRepas="bureau_sans_cuisine", indisponibilites=[], blessures=["lombaires"],
         dureeCycle=8),
    dict(nom="P6", age=30, poids=64, taille=170, sexe="autre", objectif="endurance",
         niveauSportif="athlete", equipement=["velo_appartement", "rameur", "barre_traction"],
         heureReveil="06:00", heureCoucher="22:00", heureDebutTravail="08:00",
         heureFinTravail="17:00", trajetQuotidien=40, seancesParSemaine=7,
         niveauCuisine="moyen", tempsCuisine=45, contraintesAlimentaires=["vegan", "sans_gluten"],
         lieuRepas="domicile", indisponibilites=[], blessures=[], dureeCycle=8),
    dict(nom="P7", age=40, poids=88, taille=185, sexe="homme", objectif="force",
         niveauSportif="intermediaire",
         equipement=["barre_olympique", "rack", "banc", "halteres", "barre_traction"],
         heureReveil="06:30", heureCoucher="22:30", heureDebutTravail="08:30",
         heureFinTravail="18:30", trajetQuotidien=60, seancesParSemaine=4,
         niveauCuisine="debutant", tempsCuisine=25, contraintesAlimentaires=[],
         lieuRepas="bureau_micro_ondes",
         indisponibilites=[{"debut": "20:00", "fin": "22:00",
                            "jours": ["lundi", "mardi", "mercredi", "jeudi"], "motif": "enfants"}],
         blessures=[], dureeCycle=8),
]


def vers_profil_python(d: dict) -> Profil:
    plages = tuple(Plage.creer(i["debut"], i["fin"], i.get("jours"), i.get("motif", "indisponible"))
                   for i in d.get("indisponibilites", []))
    return Profil(
        nom=d["nom"], age=d["age"], poids=d["poids"], taille=d["taille"], sexe=d["sexe"],
        objectif=d["objectif"], niveau_sportif=d["niveauSportif"],
        equipement=tuple(d["equipement"]),
        heure_reveil=d["heureReveil"], heure_coucher=d["heureCoucher"],
        heure_debut_travail=d["heureDebutTravail"], heure_fin_travail=d["heureFinTravail"],
        trajet_quotidien_min=d["trajetQuotidien"], indisponibilites=plages,
        seances_par_semaine=d["seancesParSemaine"], niveau_cuisine=d["niveauCuisine"],
        temps_cuisine_min=d["tempsCuisine"],
        contraintes_alimentaires=tuple(d["contraintesAlimentaires"]),
        lieu_repas=d["lieuRepas"], blessures=tuple(d.get("blessures", [])),
        duree_cycle_semaines=d.get("dureeCycle", 8))


def extraire_python(d: dict) -> dict:
    p = vers_profil_python(d)
    prog = generer_programme(p)
    st = prog["semaine_type"]
    return {
        "nom": d["nom"],
        "kcal": prog["nutrition"]["kcal"],
        "mb": prog["nutrition"]["mb"],
        "tdee": prog["nutrition"]["depense_totale"],
        "prot": prog["nutrition"]["proteines_g"],
        "lip": prog["nutrition"]["lipides_g"],
        "glu": prog["nutrition"]["glucides_g"],
        "fcmax": p.fcmax_estimee,
        "imc": p.imc,
        "pression": p.pression_temporelle,
        "contexte": p.contexte_equipement,
        "nForce": prog["synthese"]["seances_force"],
        "nCardio": prog["synthese"]["seances_cardio"],
        "dureeSeance": prog["synthese"]["duree_seance_force_min"],
        "split": prog["synthese"]["split"],
        "moment": prog["synthese"]["moment_entrainement"],
        "cardioMin": prog["endurance"]["volume"]["minutes_semaine"],
        "modaliteC": prog["endurance"]["modalite_continu"],
        "modaliteI": prog["endurance"]["modalite_intervalles"],
        "hydratationRepos": prog["hydratation"]["besoin_jour_repos"]["total_boissons_ml"],
        "zones": [z["fc"] for z in prog["endurance"]["zones_fc"]],
        "seances": [[{"jour": j["jour"], "nom": s["nom"], "debut": s["debut"],
                      "duree": s["duree_min"],
                      "exos": [f"{b['nom']}|{b['series']}|{b['reps']}" for b in s["blocs"]]}
                     for s in j["seances"]]
                    for j in st["jours"] if j["seances"]],
        "repas": [[f"{r['nom']}@{r['heure_txt']}={r['kcal']}" for r in j["repas"]]
                  for j in st["jours"]],
        "volume": st["volume_muscles"],
    }


def comparer(py: dict, js: dict, chemin="") -> list[str]:
    diffs = []
    if isinstance(py, dict) and isinstance(js, dict):
        for k in set(py) | set(js):
            if k not in py:
                diffs.append(f"{chemin}.{k} : absent côté Python")
            elif k not in js:
                diffs.append(f"{chemin}.{k} : absent côté JS")
            else:
                diffs += comparer(py[k], js[k], f"{chemin}.{k}")
    elif isinstance(py, list) and isinstance(js, list):
        if len(py) != len(js):
            diffs.append(f"{chemin} : longueurs différentes ({len(py)} vs {len(js)})")
        for i, (a, b) in enumerate(zip(py, js)):
            diffs += comparer(a, b, f"{chemin}[{i}]")
    else:
        if isinstance(py, float) or isinstance(js, float):
            try:
                if abs(float(py) - float(js)) > 0.051:
                    diffs.append(f"{chemin} : {py!r} (py) vs {js!r} (js)")
                return diffs
            except (TypeError, ValueError):
                pass
        if py != js:
            diffs.append(f"{chemin} : {py!r} (py) vs {js!r} (js)")
    return diffs


def main():
    with open("/tmp/profils.json", "w", encoding="utf-8") as f:
        json.dump(PROFILS, f, ensure_ascii=False)

    r = subprocess.run(["node", "/home/user/tests/parite_js.js",
                        "/tmp/profils.json", "/tmp/sortie_js.json"],
                       capture_output=True, text=True)
    if r.returncode != 0:
        print("ERREUR NODE :", r.stderr[-3000:])
        return 1
    print(r.stdout.strip())

    with open("/tmp/sortie_js.json", encoding="utf-8") as f:
        js_res = json.load(f)

    total = 0
    for d, js in zip(PROFILS, js_res):
        py = extraire_python(d)
        diffs = comparer(py, js, d["nom"])
        if diffs:
            print(f"\n=== {d['nom']} : {len(diffs)} différence(s) ===")
            for x in diffs[:12]:
                print("   ", x)
            total += len(diffs)
        else:
            print(f"{d['nom']} : ✓ identique")
    print(f"\nTotal différences : {total}")
    return 0 if total == 0 else 1


if __name__ == "__main__":
    sys.exit(main())

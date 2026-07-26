"""
rendu.py — Mise en forme du programme pour livraison au client.

Deux sorties :
  - `en_markdown` : document complet, imprimable, prêt à envoyer
  - `planning_texte` : vue compacte de la semaine type
"""

from __future__ import annotations

from .profil import Profil, JOURS, duree_fmt


def _barre(titre: str, char="=") -> str:
    return f"\n{titre}\n{char * len(titre)}\n"


def planning_texte(prog: dict) -> str:
    """Vue compacte : une ligne par événement de la semaine."""
    out = []
    for j in prog["semaine_type"]["jours"]:
        evenements = []
        for s in j["seances"]:
            evenements.append((s["debut"], f"🏋 {s['nom']} ({s['duree_min']} min)"))
        for r in j["repas"]:
            evenements.append((r["heure_txt"], f"🍽 {r['nom']} — {r['kcal']} kcal"))
        evenements.sort()
        marque = "" if j["travaille"] else "  (repos pro)"
        out.append(f"\n{j['jour'].upper()}{marque}")
        for h, txt in evenements:
            out.append(f"   {h}  {txt}")
    return "\n".join(out)


def en_markdown(prog: dict) -> str:
    """Document complet en Markdown."""
    p = prog["profil"]
    d = p["_derive"]
    s = prog["synthese"]
    n = prog["nutrition"]
    L: list[str] = []

    L.append(f"# Programme personnalisé — {p['nom']}")
    L.append(f"\n*Cycle de {prog['meta']['duree_cycle_semaines']} semaines — "
             f"généré le {prog['meta']['genere_le']}*\n")

    # ---------------- Synthèse ----------------
    L.append("## 1. Synthèse du profil\n")
    L.append("| | |")
    L.append("|---|---|")
    L.append(f"| **Profil** | {p['age']} ans, {p['poids']} kg, {p['taille']} cm — "
             f"IMC {d['imc']} ({d['classe_imc']}) |")
    L.append(f"| **Objectif** | {p['objectif'].replace('_', ' ')} |")
    L.append(f"| **Niveau** | {p['niveau_sportif']} |")
    L.append(f"| **Matériel** | {', '.join(p['equipement'])} → contexte *{d['contexte_equipement']}* |")
    L.append(f"| **Disponibilité** | {d['temps_libre_semaine_h']} h libres/semaine "
             f"→ pression *{d['pression_temporelle']}* |")
    L.append(f"| **Sommeil** | {d['sommeil_h']} h/nuit |")
    L.append(f"| **Programmation** | {s['seances_force']} séance(s) de renforcement + "
             f"{s['seances_cardio']} de cardio, {s['duree_seance_force_min']} min, "
             f"plutôt le {s['moment_entrainement']} |")
    L.append(f"| **Split** | {' / '.join(s['split'])} |")

    # ---------------- Avertissements ----------------
    if prog["avertissements"]:
        L.append("\n> **À lire avant de commencer**")
        for a in prog["avertissements"]:
            L.append(f">\n> - {a}")

    # ---------------- Semaine type ----------------
    L.append("\n## 2. Semaine type (heure par heure)\n")
    for j in prog["semaine_type"]["jours"]:
        titre = j["jour"].capitalize() + ("" if j["travaille"] else " — *repos professionnel*")
        L.append(f"\n### {titre}\n")
        evenements = []
        for sc in j["seances"]:
            evenements.append((sc["debut"], "seance", sc))
        for r in j["repas"]:
            evenements.append((r["heure_txt"], "repas", r))
        for pt in j["hydratation"]["points"]:
            evenements.append((pt["heure_txt"], "eau", pt))
        evenements.sort(key=lambda e: e[0])

        L.append("| Heure | Élément | Détail |")
        L.append("|---|---|---|")
        for h, genre, e in evenements:
            if genre == "seance":
                L.append(f"| **{h}** | 🏋 **{e['nom']}** | {e['duree_min']} min — "
                         f"intensité {e['intensite']} |")
            elif genre == "repas":
                lieu = e.get("lieu", "")
                L.append(f"| {h} | 🍽 {e['nom']} | {e['kcal']} kcal — "
                         f"P {e['proteines_g']} g / G {e['glucides_g']} g / L {e['lipides_g']} g"
                         f"{' — ' + lieu if lieu else ''} |")
            else:
                L.append(f"| {h} | 💧 Hydratation | {e['ml']} ml — {e['moment']} |")

        for sc in j["seances"]:
            L.append(f"\n**Détail — {sc['nom']}** ({sc['debut']}–{sc['fin']})\n")
            L.append("| Exercice | Séries | Reps | Repos | Intensité |")
            L.append("|---|---|---|---|---|")
            for b in sc["blocs"]:
                repos = f"{b['repos_s']} s" if b["repos_s"] else "—"
                L.append(f"| {b['nom']} | {b['series']} | {b['reps']} | {repos} | {b['rpe']} |")
            details = [b for b in sc["blocs"] if b.get("regression") or b.get("note")]
            if details:
                L.append("\n<details><summary>Régressions, progressions et remarques</summary>\n")
                for b in details:
                    ligne = f"- **{b['nom']}**"
                    if b.get("regression"):
                        ligne += f" — plus facile : *{b['regression']}*"
                    if b.get("progression"):
                        ligne += f" ; plus difficile : *{b['progression']}*"
                    if b.get("note"):
                        ligne += f" ({b['note']})"
                    L.append(ligne)
                L.append("\n</details>")
            for note in sc["notes"]:
                L.append(f"\n> {note}")

        if j["alertes_digestion"]:
            for a in j["alertes_digestion"]:
                L.append(f"\n> ⚠ {a}")
        L.append(f"\n💧 **Total hydratation du jour : "
                 f"{j['hydratation']['total_planifie_ml']} ml**")

    if prog["semaine_type"]["alertes"]:
        L.append("\n### Points de vigilance de la semaine\n")
        for a in prog["semaine_type"]["alertes"]:
            L.append(f"- {a}")

    # ---------------- Volume ----------------
    L.append("\n## 3. Contrôle du volume hebdomadaire\n")
    L.append("| Groupe musculaire | Séries/semaine |")
    L.append("|---|---|")
    for muscle, v in prog["semaine_type"]["volume_muscles"].items():
        L.append(f"| {muscle} | {v} |")
    if prog["semaine_type"]["audit_volume"]:
        L.append("\n*Écarts relevés :*\n")
        for a in prog["semaine_type"]["audit_volume"]:
            L.append(f"- {a}")

    # ---------------- Progression ----------------
    L.append("\n## 4. Progression sur le cycle\n")
    L.append("| Semaine | Type | Consigne |")
    L.append("|---|---|---|")
    for sem in prog["cycle"]:
        L.append(f"| {sem['semaine']} | {sem['type']} | {sem['consigne']} |")

    # ---------------- Endurance ----------------
    e = prog["endurance"]
    L.append("\n## 5. Endurance — zones d'intensité\n")
    L.append(f"Volume cible : **{e['volume']['minutes_semaine']} min/semaine** "
             f"({e['volume']['repartition']}).\n")
    L.append(f"Modalité principale : **{e['modalite_continu']}** ; "
             f"pour les intervalles : **{e['modalite_intervalles']}**.\n")
    L.append("| Zone | Nom | FC cible | RPE | Test de la parole | Usage |")
    L.append("|---|---|---|---|---|---|")
    for z in e["zones_fc"]:
        L.append(f"| {z['zone']} | {z['nom']} | {z['fc']} | {z['rpe']} | "
                 f"{z['parole']} | {z['usage']} |")
    L.append("\n> Les fréquences cardiaques sont estimées (formule de Tanaka et "
             "méthode de Karvonen) à partir d'une FC de repos théorique. "
             "Mesurer la FC de repos réelle au réveil pendant 3 jours affinerait ces zones.")
    if e["note_impact"]:
        L.append(f"\n> {e['note_impact']}")
    if e["trajet_actif"]:
        L.append(f"\n> 💡 {e['trajet_actif']}")

    # ---------------- Nutrition ----------------
    L.append("\n## 6. Nutrition\n")
    L.append(f"- Métabolisme de base : **{n['mb']} kcal**")
    L.append(f"- Dépense totale estimée : **{n['depense_totale']} kcal** "
             f"(facteur d'activité {n['facteur_activite']})")
    L.append(f"- **Cible : {n['kcal']} kcal/jour** ({n['ajustement_pct']:+d} % "
             f"par rapport à la dépense)")
    L.append(f"  - jours d'entraînement : **{n['kcal_jour_entrainement']} kcal**")
    L.append(f"  - jours de repos : **{n['kcal_jour_repos']} kcal**")
    if n.get("note_plancher"):
        L.append(f"\n> ⚠ {n['note_plancher']}")
    L.append(f"\n**Macronutriments quotidiens**\n")
    L.append("| Macro | Quantité | Part |")
    L.append("|---|---|---|")
    L.append(f"| Protéines | {n['proteines_g']} g ({n['proteines_g_kg']} g/kg) | "
             f"{n['repartition_pct']['proteines']} % |")
    L.append(f"| Glucides | {n['glucides_g']} g | {n['repartition_pct']['glucides']} % |")
    L.append(f"| Lipides | {n['lipides_g']} g | {n['repartition_pct']['lipides']} % |")
    L.append(f"| Fibres | {n['fibres_g']} g | — |")

    prat = n["pratique"]
    L.append(f"\n**Organisation pratique**\n")
    L.append(f"- Style adapté au niveau de cuisine : {prat['style_culinaire']}")
    L.append(f"- Stratégie : {prat['strategie']}")
    for c in prat["conseils"]:
        L.append(f"- {c}")

    al = n["aliments"]
    L.append(f"\n**Aliments compatibles avec les contraintes déclarées**\n")
    L.append(f"- *Protéines* : {', '.join(al['proteines'])}")
    L.append(f"- *Glucides* : {', '.join(al['glucides'])}")
    L.append(f"- *Lipides* : {', '.join(al['lipides'])}")
    L.append(f"- *Légumes* : {', '.join(al['legumes'])}")
    if al["alertes"]:
        L.append("\n*Points de vigilance nutritionnels :*\n")
        for a in al["alertes"]:
            L.append(f"- {a}")

    L.append("\n**Ajustement du plan dans le temps**\n")
    for r in n["ajustement"]:
        L.append(f"- {r}")

    # ---------------- Hydratation ----------------
    h = prog["hydratation"]
    L.append("\n## 7. Hydratation\n")
    L.append(f"- Jour de repos : **{h['besoin_jour_repos']['total_boissons_ml']} ml**")
    L.append(f"- Jour d'entraînement : **{h['besoin_jour_entrainement']['total_boissons_ml']} ml**")
    L.append(f"\n> {h['besoin_jour_repos']['note']}\n")
    L.append("**À privilégier**\n")
    for b in h["boissons"]["a_privilegier"]:
        L.append(f"- {b}")
    L.append("\n**À limiter**\n")
    for b in h["boissons"]["a_limiter"]:
        L.append(f"- {b}")
    L.append("\n**Comment vérifier**\n")
    for r in h["reperes"]:
        L.append(f"- {r}")

    L.append("\n---\n")
    L.append("*Document généré automatiquement à partir des 18 paramètres du profil. "
             "Les valeurs (calories, fréquences cardiaques, charges) sont des estimations "
             "de départ : elles doivent être ajustées d'après les résultats observés.*")

    return "\n".join(L)

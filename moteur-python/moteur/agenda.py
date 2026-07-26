"""
agenda.py — Placement temporel des séances et des repas.

Rôle : transformer (réveil, coucher, travail, trajet, indisponibilités) en
créneaux libres réels, puis y caser les séances d'entraînement et les repas
selon des règles de chronobiologie et de digestion.

Contraintes physiologiques appliquées :
  - pas de séance intense dans les 90 min précédant le coucher (sommeil)
  - pas de séance intense dans les 60 min suivant le réveil sans échauffement long
  - délai digestif : 2 h après un repas complet, 30-45 min après une collation
  - un repas dans les 90 min post-séance (fenêtre de récupération)
"""

from __future__ import annotations
from dataclasses import dataclass
from .profil import Profil, JOURS, to_min, to_time, fmt, duree_fmt, Plage

MINUTE_JOUR = 24 * 60


# --------------------------------------------------------------------------
# Créneaux
# --------------------------------------------------------------------------

@dataclass
class Creneau:
    debut: int          # minutes depuis minuit
    fin: int
    jour: str
    etiquette: str = "libre"

    @property
    def duree(self) -> int:
        return self.fin - self.debut

    def chevauche(self, autre: "Creneau") -> bool:
        return self.jour == autre.jour and self.debut < autre.fin and autre.debut < self.fin

    def __str__(self) -> str:
        return f"{self.jour} {fmt(self.debut)}–{fmt(self.fin)} ({duree_fmt(self.duree)}) {self.etiquette}"


def soustraire(creneaux: list[Creneau], bloc: Creneau) -> list[Creneau]:
    """Retire `bloc` d'une liste de créneaux (découpe si nécessaire)."""
    out = []
    for c in creneaux:
        if c.jour != bloc.jour or not c.chevauche(bloc):
            out.append(c)
            continue
        if c.debut < bloc.debut:
            out.append(Creneau(c.debut, bloc.debut, c.jour, c.etiquette))
        if bloc.fin < c.fin:
            out.append(Creneau(bloc.fin, c.fin, c.jour, c.etiquette))
    return out


def creneaux_libres(p: Profil, jour: str, marge_reveil=20, marge_coucher=30) -> list[Creneau]:
    """
    Créneaux réellement disponibles un jour donné, une fois retirés :
    sommeil, travail, trajets, indisponibilités déclarées, et les marges
    incompressibles (toilette matin, routine du soir).
    """
    reveil = to_min(p.heure_reveil)
    coucher = to_min(p.heure_coucher)
    if coucher <= reveil:
        coucher += MINUTE_JOUR

    base = [Creneau(reveil + marge_reveil, coucher - marge_coucher, jour, "libre")]
    if base[0].duree <= 0:
        return []

    if jour in p.jours_travailles:
        # trajet aller + travail + trajet retour = un seul bloc occupé
        bloc = Creneau(p.depart_domicile_min, p.retour_domicile_min, jour, "travail")
        if bloc.fin <= bloc.debut:
            bloc.fin += MINUTE_JOUR
        base = soustraire(base, bloc)

    for ind in p.indisponibilites:
        if ind.concerne(jour):
            base = soustraire(base, Creneau(ind.debut_min, ind.fin_min, jour, ind.motif))

    return [c for c in base if c.duree >= 15]


def tous_creneaux(p: Profil) -> dict[str, list[Creneau]]:
    return {j: creneaux_libres(p, j) for j in JOURS}


# --------------------------------------------------------------------------
# Choix des jours d'entraînement
# --------------------------------------------------------------------------

# Répartitions hebdomadaires privilégiant la récupération (jamais 3 jours
# consécutifs de force en dessous de 5 séances/semaine).
REPARTITIONS = {
    1: ["samedi"],
    2: ["mardi", "samedi"],
    3: ["lundi", "mercredi", "vendredi"],
    4: ["lundi", "mardi", "jeudi", "vendredi"],
    5: ["lundi", "mardi", "mercredi", "vendredi", "samedi"],
    6: ["lundi", "mardi", "mercredi", "vendredi", "samedi", "dimanche"],
    7: list(JOURS),
}


def score_jour(p: Profil, jour: str, duree_cible: int) -> float:
    """
    Qualité d'un jour pour s'entraîner : temps disponible, continuité du
    créneau, et bonus si c'est un jour de repos professionnel.
    """
    cr = creneaux_libres(p, jour)
    if not cr:
        return 0.0
    meilleur = max(c.duree for c in cr)
    if meilleur < duree_cible * 0.6:
        return 0.0
    total = sum(c.duree for c in cr)
    s = min(1.0, meilleur / duree_cible) * 60 + min(total, 480) / 24
    if jour not in p.jours_travailles:
        s += 15
    return s


def jours_entrainement(p: Profil, duree_cible: int) -> list[str]:
    """
    Sélectionne les N meilleurs jours en respectant, autant que possible,
    l'alternance effort/récupération.
    """
    n = p.seances_par_semaine
    if n <= 0:
        return []
    if n >= 7:
        return list(JOURS)

    modele = REPARTITIONS.get(n, REPARTITIONS[3])
    scores = {j: score_jour(p, j, duree_cible) for j in JOURS}

    # 1) on part du modèle théorique, on remplace les jours impraticables
    retenus = [j for j in modele if scores[j] > 0]
    manquants = n - len(retenus)
    if manquants > 0:
        reste = sorted((j for j in JOURS if j not in retenus),
                       key=lambda j: -scores[j])
        for j in reste[:manquants]:
            if scores[j] > 0:
                retenus.append(j)

    # 2) si toujours incomplet, l'agenda est saturé : on renvoie ce qu'on a
    return sorted(set(retenus), key=lambda j: JOURS.index(j))


# --------------------------------------------------------------------------
# Placement d'une séance dans la journée
# --------------------------------------------------------------------------

def moment_prefere(p: Profil) -> str:
    """'matin' | 'midi' | 'soir' — d'après la géométrie de l'agenda."""
    if p.fenetre_matin_min >= 75:
        return "matin"
    if p.fenetre_soir_min >= 75:
        return "soir"
    if p.fenetre_matin_min >= p.fenetre_soir_min:
        return "matin"
    return "soir"


MARGE_DOUCHE = 25   # douche + habillage après une séance, avant de partir


def placer_seance(p: Profil, jour: str, duree: int,
                  intensite: str = "moderee") -> Creneau | None:
    """
    Place une séance de `duree` minutes dans le meilleur créneau du jour.

    Règles :
      - séance intense interdite dans les 90 min avant le coucher
      - une séance du matin en jour travaillé doit laisser MARGE_DOUCHE
        minutes avant le départ au travail
      - on privilégie le créneau le plus long, puis le moment préféré
      - si aucun créneau ne tient la durée, renvoie None (l'appelant
        réduira la durée : voir `placer_avec_repli`)
    """
    bruts = creneaux_libres(p, jour)

    # Réserve de la marge douche sur le créneau du matin des jours travaillés
    if jour in p.jours_travailles:
        depart = p.depart_domicile_min
        ajustes = []
        for c in bruts:
            if c.fin >= depart > c.debut:
                c = Creneau(c.debut, depart - MARGE_DOUCHE, c.jour, c.etiquette)
            if c.duree >= 15:
                ajustes.append(c)
        bruts = ajustes

    cr = [c for c in bruts if c.duree >= duree]
    if not cr:
        return None

    coucher = to_min(p.heure_coucher)
    if coucher <= to_min(p.heure_reveil):
        coucher += MINUTE_JOUR
    limite_intense = coucher - 90

    pref = moment_prefere(p)
    ancre = {"matin": to_min(p.heure_reveil) + 60,
             "midi": 12 * 60 + 30,
             "soir": p.retour_domicile_min + 30}[pref]

    def cout(c: Creneau) -> tuple:
        # départ au plus tôt dans le créneau, mais pas avant l'ancre
        depart = max(c.debut, min(ancre, c.fin - duree))
        fin = depart + duree
        penalite_sommeil = 0
        if intensite in ("elevee", "maximale") and fin > limite_intense:
            penalite_sommeil = (fin - limite_intense)
        return (penalite_sommeil, abs(depart - ancre), -c.duree)

    meilleur = min(cr, key=cout)
    depart = max(meilleur.debut, min(ancre, meilleur.fin - duree))
    return Creneau(depart, depart + duree, jour, "entrainement")


def placer_avec_repli(p: Profil, jour: str, duree_ideale: int,
                      duree_min: int = 20, intensite="moderee") -> tuple[Creneau | None, int]:
    """
    Essaie la durée idéale, puis raccourcit par paliers de 5 min jusqu'à
    `duree_min`. Renvoie (créneau, durée retenue).
    """
    d = duree_ideale
    while d >= duree_min:
        c = placer_seance(p, jour, d, intensite)
        if c:
            return c, d
        d -= 5
    return None, 0


# --------------------------------------------------------------------------
# Repas
# --------------------------------------------------------------------------

def structure_repas(p: Profil, jour: str, seance: Creneau | None = None) -> list[dict]:
    """
    Positionne petit-déjeuner, déjeuner, dîner et collations en fonction de
    l'agenda réel et de l'heure de la séance.

    Renvoie une liste de dicts : {nom, heure, duree, lieu, role}
    """
    reveil = to_min(p.heure_reveil)
    coucher = to_min(p.heure_coucher)
    if coucher <= reveil:
        coucher += MINUTE_JOUR

    travaille = jour in p.jours_travailles
    repas: list[dict] = []

    # --- Petit-déjeuner ---
    saut_pdj = p.contrainte("faible_appetit_matin") and p.fenetre_matin_min < 45
    seance_matin = seance is not None and seance.debut < 11 * 60

    if saut_pdj:
        repas.append({"nom": "Collation matinale (nomade)", "heure": reveil + 120,
                      "duree": 10, "lieu": "nomade", "role": "appoint",
                      "note": "Appétit faible au réveil : repoussé et allégé."})
    else:
        h_pdj = reveil + 30
        if travaille and h_pdj + 15 > p.depart_domicile_min:
            h_pdj = max(reveil + 15, p.depart_domicile_min - 20)

        nom_pdj, note_pdj = "Petit-déjeuner", None

        if seance_matin:
            limite_pdj = (p.depart_domicile_min - 10) if travaille else coucher
            if seance.debut - (h_pdj + 20) >= 75:
                pass  # cas idéal : le petit-déjeuner est digéré avant l'effort
            elif seance.fin + 20 <= limite_pdj:
                # On scinde : gorgée d'énergie avant, vrai repas après l'effort.
                repas.append({"nom": "Pré-séance léger", "heure": max(reveil + 10, seance.debut - 35),
                              "duree": 8, "lieu": "domicile", "role": "pre_effort",
                              "note": "Séance matinale : banane/dattes + café, digestion rapide."})
                h_pdj = seance.fin + 15
            else:
                # Agenda trop serré pour scinder : on allège le repas sur place.
                h_pdj = max(reveil + 10, seance.debut - 50)
                nom_pdj = "Petit-déjeuner allégé (pré-séance)"
                note_pdj = ("Moins de 1 h avant l'effort : glucides simples, "
                            "peu de gras et de fibres. Compléter les protéines au déjeuner.")

        entree = {"nom": nom_pdj, "heure": h_pdj,
                  "duree": 15 if p.fenetre_matin_min < 60 else 25,
                  "lieu": "nomade" if (travaille and h_pdj > p.depart_domicile_min) else "domicile",
                  "role": "demarrage"}
        if note_pdj:
            entree["note"] = note_pdj
        repas.append(entree)

    # --- Déjeuner ---
    if travaille:
        milieu = (p.depart_domicile_min + p.retour_domicile_min) // 2
        h_dej = max(11 * 60 + 45, min(13 * 60 + 30, milieu))
        lieu_dej = p.lieu_repas if p.lieu_repas != "domicile" else "domicile"
    else:
        h_dej = 12 * 60 + 30
        lieu_dej = "domicile"
    repas.append({"nom": "Déjeuner", "heure": h_dej, "duree": 30,
                  "lieu": lieu_dej, "role": "principal"})

    # --- Dîner ---
    h_diner = max(p.retour_domicile_min + 30, 19 * 60)
    h_diner = min(h_diner, coucher - 90)          # 1h30 mini avant le coucher
    if seance and seance.fin > h_diner - 30:      # séance tardive : on décale
        h_diner = max(h_diner, min(seance.fin + 30, coucher - 60))
    repas.append({"nom": "Dîner", "heure": h_diner, "duree": 30,
                  "lieu": "domicile", "role": "principal"})

    # --- Collations conditionnelles ---
    ecart_dej_diner = h_diner - h_dej
    if ecart_dej_diner > 330:  # plus de 5h30 entre les deux
        h_col = h_dej + ecart_dej_diner // 2
        repas.append({"nom": "Goûter", "heure": h_col, "duree": 10,
                      "lieu": "bureau" if travaille else "domicile", "role": "appoint"})

    if seance:
        # collation pré-séance si le dernier repas est loin
        precedents = [r for r in repas if r["heure"] <= seance.debut]
        if precedents:
            dernier = max(precedents, key=lambda r: r["heure"])
            if seance.debut - dernier["heure"] > 210:
                repas.append({"nom": "Collation pré-séance", "heure": seance.debut - 60,
                              "duree": 8, "lieu": "nomade", "role": "pre_effort",
                              "note": "Glucides rapides, peu de fibres et de gras."})
        # repas de récupération si la séance finit tard après le dîner
        posterieurs = [r for r in repas if r["heure"] >= seance.fin]
        if not posterieurs and seance.fin < coucher - 45:
            repas.append({"nom": "Collation de récupération", "heure": min(seance.fin + 25, coucher - 30),
                          "duree": 10, "lieu": "domicile", "role": "post_effort",
                          "note": "Protéines + glucides dans les 90 min post-effort."})

    repas.sort(key=lambda r: r["heure"])
    for r in repas:
        r["heure_txt"] = fmt(r["heure"])
    return repas


def conflit_digestion(repas: list[dict], seance: Creneau | None) -> list[str]:
    """Alertes si un repas complet tombe trop près d'une séance."""
    if not seance:
        return []
    alertes = []
    for r in repas:
        if r["role"] != "principal":
            continue
        fin_repas = r["heure"] + r["duree"]
        if 0 <= seance.debut - fin_repas < 90:
            alertes.append(
                f"{r['nom']} se termine {seance.debut - fin_repas} min avant la séance : "
                f"alléger (moins de gras/fibres) ou décaler de 30 min.")
        if 0 <= r["heure"] - seance.fin < 20:
            alertes.append(f"{r['nom']} démarre juste après la séance : prévoir 15 min de retour au calme.")
    return alertes


def budget_temps_cuisine(p: Profil) -> dict:
    """
    Répartit le temps de cuisine quotidien déclaré et décide si le batch
    cooking est nécessaire.
    """
    t = p.temps_cuisine_min
    batch = t < 45 or p.pression_temporelle in ("critique", "forte")
    return {
        "total_jour_min": t,
        "batch_cooking": batch,
        "session_batch_min": 90 if batch and p.niveau_cuisine in ("moyen", "bon", "chef") else (60 if batch else 0),
        "jour_batch": "dimanche" if "dimanche" in p.jours_repos_semaine else (p.jours_repos_semaine[0] if p.jours_repos_semaine else "dimanche"),
        "cuisine_par_repas_min": max(5, t // 3),
        "strategie": ("batch cooking + assemblage rapide" if batch
                      else "cuisine quotidienne à la demande"),
    }

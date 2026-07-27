"use client";

/**
 * profil/page.tsx — Questionnaire en six étapes.
 *
 * Les 18 paramètres du moteur, regroupés par thème pour éviter le formulaire
 * fleuve. La validation est faite à chaque étape : on ne laisse pas
 * l'utilisateur arriver au bout pour lui annoncer une erreur du début.
 * La sixième étape est un récapitulatif en lecture seule : tout se relit d'un
 * coup d'œil et chaque groupe renvoie directement à l'étape à corriger.
 */

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bouton, Carte, Champ, Choix, Curseur, Encart, Liste, Pastille, Puces, Saisie, cx,
} from "@/components/ui";
import { cap, valider } from "@/lib/moteur/noyau";
import { genererProgramme } from "@/lib/moteur";
import type { Programme } from "@/lib/moteur";
import {
  JOURS, PROFIL_DEFAUT, type Blessure, type ContrainteAlimentaire,
  type Equipement, type Jour, type Profil,
} from "@/lib/moteur/types";
import { enregistrerFiche, listerFiches } from "@/lib/stockage";
import { majReglages } from "@/lib/suivi";
import { useToast } from "@/components/toast";
import { Felicitations } from "@/components/felicitations";

const ETAPES = ["Vous", "Objectif", "Matériel", "Agenda", "Cuisine", "Récap"] as const;

const OPTIONS_OBJECTIF = [
  { valeur: "perte_de_gras", libelle: "Perdre du gras", description: "Déficit maîtrisé, muscle préservé", icone: "🔥" },
  { valeur: "prise_de_muscle", libelle: "Prendre du muscle", description: "Volume et surplus léger", icone: "💪" },
  { valeur: "force", libelle: "Gagner en force", description: "Charges lourdes, peu de répétitions", icone: "🏋️" },
  { valeur: "endurance", libelle: "Développer l'endurance", description: "Capacité aérobie prioritaire", icone: "🏃" },
  { valeur: "recomposition", libelle: "Recomposition", description: "Muscle et gras simultanément", icone: "⚖️" },
  { valeur: "sante_mobilite", libelle: "Santé et mobilité", description: "Remise en forme progressive", icone: "🌿" },
  { valeur: "competition_street", libelle: "Figures callisthéniques", description: "Muscle-up, front lever, planche", icone: "🤸" },
] as const;

const OPTIONS_NIVEAU = [
  { valeur: "sedentaire", libelle: "Sédentaire", description: "Aucune pratique régulière" },
  { valeur: "debutant", libelle: "Débutant", description: "Moins d'un an de pratique" },
  { valeur: "intermediaire", libelle: "Intermédiaire", description: "1 à 3 ans, technique acquise" },
  { valeur: "avance", libelle: "Avancé", description: "Plus de 3 ans, progression fine" },
  { valeur: "athlete", libelle: "Athlète", description: "Pratique intensive structurée" },
] as const;

const OPTIONS_EQUIPEMENT: { valeur: Equipement; libelle: string }[] = [
  { valeur: "aucun", libelle: "Aucun matériel" },
  { valeur: "barre_traction", libelle: "Barre de traction" },
  { valeur: "barres_paralleles", libelle: "Barres parallèles" },
  { valeur: "anneaux", libelle: "Anneaux" },
  { valeur: "elastiques", libelle: "Élastiques" },
  { valeur: "halteres", libelle: "Haltères" },
  { valeur: "kettlebell", libelle: "Kettlebell" },
  { valeur: "barre_olympique", libelle: "Barre olympique" },
  { valeur: "banc", libelle: "Banc" },
  { valeur: "rack", libelle: "Rack" },
  { valeur: "machines_salle", libelle: "Machines de salle" },
  { valeur: "poulie", libelle: "Poulie" },
  { valeur: "tapis_course", libelle: "Tapis de course" },
  { valeur: "velo_appartement", libelle: "Vélo d'appartement" },
  { valeur: "rameur", libelle: "Rameur" },
  { valeur: "corde_a_sauter", libelle: "Corde à sauter" },
  { valeur: "gilet_leste", libelle: "Gilet lesté" },
  { valeur: "trx", libelle: "TRX" },
  { valeur: "step_escalier", libelle: "Marche ou escalier" },
  { valeur: "piscine", libelle: "Piscine" },
  { valeur: "velo_route", libelle: "Vélo de route" },
];

const OPTIONS_BLESSURES: { valeur: Blessure; libelle: string }[] = [
  { valeur: "epaule", libelle: "Épaule" }, { valeur: "genou", libelle: "Genou" },
  { valeur: "lombaires", libelle: "Lombaires" }, { valeur: "poignet", libelle: "Poignet" },
  { valeur: "cheville", libelle: "Cheville" }, { valeur: "hanche", libelle: "Hanche" },
  { valeur: "dos", libelle: "Dos" },
];

const OPTIONS_CONTRAINTES: { valeur: ContrainteAlimentaire; libelle: string }[] = [
  { valeur: "vegetarien", libelle: "Végétarien" }, { valeur: "vegan", libelle: "Vegan" },
  { valeur: "sans_gluten", libelle: "Sans gluten" }, { valeur: "sans_lactose", libelle: "Sans lactose" },
  { valeur: "halal", libelle: "Halal" }, { valeur: "casher", libelle: "Casher" },
  { valeur: "sans_porc", libelle: "Sans porc" },
  { valeur: "sans_fruits_a_coque", libelle: "Sans fruits à coque" },
  { valeur: "sans_oeuf", libelle: "Sans œuf" }, { valeur: "sans_poisson", libelle: "Sans poisson" },
  { valeur: "diabete_t2", libelle: "Diabète type 2" }, { valeur: "hypertension", libelle: "Hypertension" },
  { valeur: "cholesterol", libelle: "Cholestérol" },
  { valeur: "syndrome_intestin_irritable", libelle: "Intestin irritable" },
  { valeur: "petit_budget", libelle: "Petit budget" },
  { valeur: "faible_appetit_matin", libelle: "Peu d'appétit le matin" },
];

/* --------------------------------------------------------------------------
   Récapitulatif : libellés et briques d'affichage (lecture seule)
   -------------------------------------------------------------------------- */

const LIBELLES_SEXE: Record<Profil["sexe"], string> = {
  homme: "Homme",
  femme: "Femme",
  autre: "Autre ou non précisé",
};

const LIBELLES_CUISINE: Record<Profil["niveauCuisine"], string> = {
  nul: "Nul — aucune cuisson",
  debutant: "Débutant — recettes simples",
  moyen: "Moyen — à l'aise au quotidien",
  bon: "Bon — je varie les techniques",
  chef: "Très à l'aise",
};

const LIBELLES_LIEU_REPAS: Record<Profil["lieuRepas"], string> = {
  domicile: "À domicile",
  bureau_micro_ondes: "Au bureau, avec micro-ondes",
  bureau_sans_cuisine: "Au bureau, sans réchauffage",
  restaurant_cantine: "Restaurant ou cantine",
  exterieur_nomade: "En déplacement",
  mixte: "Cela varie",
};

/** Retrouve le libellé lisible d'une valeur technique dans une liste d'options. */
function libelleParmi(
  options: readonly { valeur: string; libelle: string }[],
  valeur: string,
): string {
  return options.find((o) => o.valeur === valeur)?.libelle ?? valeur.replace(/_/g, " ");
}

/** Jamais de `true` / `false` à l'écran. */
const ouiNon = (v: boolean) => (v ? "Oui" : "Non");

/** Un groupe du récapitulatif : en-tête cliquable + liste de définitions. */
function GroupeRecap({
  titre, onModifier, premier = false, children,
}: {
  titre: string;
  onModifier: () => void;
  premier?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={cx(!premier && "mt-4 border-t border-[var(--border)] pt-4")}>
      <button
        type="button"
        onClick={onModifier}
        aria-label={`Modifier l'étape ${titre}`}
        className="flex min-h-11 w-full items-center justify-between gap-3 text-left"
      >
        <span className="text-sm font-semibold uppercase tracking-wider text-faint">
          {titre}
        </span>
        <span className="text-xs text-[var(--accent)]">Modifier</span>
      </button>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">{children}</dl>
    </section>
  );
}

/** Une ligne libellé / valeur du récapitulatif. */
function LigneRecap({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-sm font-medium tnum">{children}</dd>
    </>
  );
}

/** Valeurs multiples en pastilles, avec un repli explicite quand la liste est vide. */
function PastillesRecap({ valeurs, vide }: { valeurs: string[]; vide: string }) {
  if (valeurs.length === 0) return <span className="font-normal text-muted">{vide}</span>;
  return (
    <span className="flex flex-wrap gap-1.5">
      {valeurs.map((v) => (
        <Pastille key={v}>{v}</Pastille>
      ))}
    </span>
  );
}

export default function PageProfil() {
  const router = useRouter();
  const { toast } = useToast();
  const [etape, setEtape] = useState(0);
  const [p, setP] = useState<Profil>(PROFIL_DEFAUT);
  const [ficheId, setFicheId] = useState<string | undefined>();
  const [erreurs, setErreurs] = useState<Record<string, string>>({});
  const [envoi, setEnvoi] = useState(false);
  const [termine, setTermine] = useState<Programme | null>(null);

  // Pré-remplissage si un profil existe déjà
  useEffect(() => {
    listerFiches()
      .then((fiches) => {
        if (fiches[0]) {
          setP(fiches[0].profil);
          setFicheId(fiches[0].id);
        }
      })
      .catch(() => {});
  }, []);

  const maj = <K extends keyof Profil>(cle: K, valeur: Profil[K]) => {
    setP((prec) => ({ ...prec, [cle]: valeur }));
    setErreurs((e) => {
      const suivant = { ...e };
      delete suivant[cle as string];
      return suivant;
    });
  };

  // Aperçu en direct : montre l'effet des réponses sur le programme
  const apercu = useMemo(() => {
    if (valider(p).length > 0) return null;
    try {
      return genererProgramme(p);
    } catch {
      return null;
    }
  }, [p]);

  const validerEtape = (): boolean => {
    const tous = valider(p);
    const parEtape: Record<number, string[]> = {
      0: ["age", "poids", "taille"],
      1: [],
      2: [],
      3: ["heureCoucher", "seancesParSemaine"],
      4: ["tempsCuisine"],
      // Récapitulatif : rien à valider ici, `terminer()` repasse sur valider(p).
      5: [],
    };
    const champs = parEtape[etape] ?? [];
    const concernees = tous.filter((e) => champs.includes(e.champ));
    if (concernees.length) {
      setErreurs(Object.fromEntries(concernees.map((e) => [e.champ, e.message])));
      return false;
    }
    return true;
  };

  const suivant = () => {
    if (!validerEtape()) return;
    if (etape < ETAPES.length - 1) setEtape((e) => e + 1);
    else terminer();
  };

  const terminer = async () => {
    const tous = valider(p);
    if (tous.length) {
      setErreurs(Object.fromEntries(tous.map((e) => [e.champ, e.message])));
      setEtape(0);
      return;
    }
    setEnvoi(true);
    try {
      const fiche = await enregistrerFiche(p, ficheId);
      majReglages({ nomUtilisateur: p.nom || "Client" });
      const prog = genererProgramme(p);
      setFicheId(fiche.id);
      setTermine(prog);
      setEnvoi(false);
    } catch {
      setEnvoi(false);
      toast("Programme enregistré, génération à recharger", "info");
      router.push("/");
    }
  };

  if (termine) {
    return (
      <Felicitations
        programme={termine}
        nom={p.nom || "Client"}
        onContinuer={() => router.push("/")}
        onRetour={() => setTermine(null)}
      />
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* --------------------------- Progression -------------------------- */}
      <div className="flex items-center gap-2 px-1">
        {ETAPES.map((nom, i) => (
          <button
            key={nom}
            onClick={() => i < etape && setEtape(i)}
            disabled={i > etape}
            className="flex flex-1 flex-col gap-1.5 text-left disabled:cursor-default"
          >
            <span
              className={cx(
                "h-1.5 rounded-pill transition-colors",
                i <= etape ? "bg-[var(--accent)]" : "bg-[var(--surface-2)]",
              )}
            />
            <span
              className={cx(
                "truncate text-[0.62rem] font-medium sm:text-[0.68rem]",
                i === etape ? "text-[var(--accent)]" : "text-faint",
              )}
            >
              {nom}
            </span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={etape}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* =========================== ÉTAPE 0 ========================== */}
          {etape === 0 && (
            <Carte className="space-y-5 p-5 sm:p-8">
              <div>
                <h1 className="text-xl font-bold">Parlons de vous</h1>
                <p className="mt-1 text-sm text-muted">
                  Ces données servent à calculer vos besoins énergétiques et vos zones d&apos;effort.
                </p>
              </div>

              <Champ label="Prénom ou pseudo">
                <Saisie
                  value={p.nom} onChange={(e) => maj("nom", e.target.value)}
                  placeholder="Comment doit-on vous appeler ?"
                />
              </Champ>

              <div className="grid gap-4 sm:grid-cols-3">
                <Champ label="Âge" erreur={erreurs.age} obligatoire>
                  <Saisie
                    type="number" min={10} max={100} value={p.age}
                    onChange={(e) => maj("age", Number(e.target.value))}
                  />
                </Champ>
                <Champ label="Poids (kg)" erreur={erreurs.poids} obligatoire>
                  <Saisie
                    type="number" step="0.5" min={30} max={300} value={p.poids}
                    onChange={(e) => maj("poids", Number(e.target.value))}
                  />
                </Champ>
                <Champ label="Taille (cm)" erreur={erreurs.taille} obligatoire>
                  <Saisie
                    type="number" min={120} max={230} value={p.taille}
                    onChange={(e) => maj("taille", Number(e.target.value))}
                  />
                </Champ>
              </div>

              <Champ label="Sexe" aide="Utilisé uniquement pour l'équation métabolique">
                <Liste
                  value={p.sexe}
                  onChange={(e) => maj("sexe", e.target.value as Profil["sexe"])}
                  options={[
                    { valeur: "homme", libelle: "Homme" },
                    { valeur: "femme", libelle: "Femme" },
                    { valeur: "autre", libelle: "Autre ou non précisé" },
                  ]}
                />
              </Champ>

              <Champ
                label="Zones sensibles ou blessures"
                aide="Les exercices contre-indiqués seront automatiquement exclus"
              >
                <Puces
                  options={OPTIONS_BLESSURES} valeurs={p.blessures}
                  onChange={(v) => maj("blessures", v)}
                />
              </Champ>
            </Carte>
          )}

          {/* =========================== ÉTAPE 1 ========================== */}
          {etape === 1 && (
            <Carte className="space-y-6 p-5 sm:p-8">
              <div>
                <h1 className="text-xl font-bold">Votre objectif</h1>
                <p className="mt-1 text-sm text-muted">
                  Il détermine le dosage, la répartition des séances et l&apos;ajustement calorique.
                </p>
              </div>

              <Champ label="Objectif principal">
                <Choix
                  options={[...OPTIONS_OBJECTIF]}
                  valeur={p.objectif}
                  onChange={(v) => maj("objectif", v)}
                />
              </Champ>

              <Champ label="Niveau sportif actuel">
                <Choix
                  options={[...OPTIONS_NIVEAU]}
                  valeur={p.niveauSportif}
                  onChange={(v) => maj("niveauSportif", v)}
                />
              </Champ>

              <Champ label="Durée du cycle" aide="8 semaines est un bon compromis pour un premier bloc">
                <Curseur
                  min={4} max={16} valeur={p.dureeCycle}
                  onChange={(v) => maj("dureeCycle", v)} suffixe="semaines"
                />
              </Champ>
            </Carte>
          )}

          {/* =========================== ÉTAPE 2 ========================== */}
          {etape === 2 && (
            <Carte className="space-y-5 p-5 sm:p-8">
              <div>
                <h1 className="text-xl font-bold">Votre matériel</h1>
                <p className="mt-1 text-sm text-muted">
                  Sélectionnez ce à quoi vous avez réellement accès. Sans matériel, le programme
                  reste complet : il s&apos;appuie sur le poids du corps.
                </p>
              </div>

              <Puces
                options={OPTIONS_EQUIPEMENT}
                valeurs={p.equipement}
                onChange={(v) => maj("equipement", v.length ? v : ["aucun"])}
              />

              {apercu && (
                <Encart>
                  Contexte détecté :{" "}
                  <strong>{apercu.derive.contexteEquipement.replace(/_/g, " ")}</strong>.
                  {" "}Modalité cardio principale : {apercu.endurance.modaliteContinu}.
                </Encart>
              )}
            </Carte>
          )}

          {/* =========================== ÉTAPE 3 ========================== */}
          {etape === 3 && (
            <Carte className="space-y-5 p-5 sm:p-8">
              <div>
                <h1 className="text-xl font-bold">Votre semaine</h1>
                <p className="mt-1 text-sm text-muted">
                  Le moteur calcule les créneaux qui vous restent, puis y place les séances.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Champ label="Heure de réveil">
                  <Saisie
                    type="time" value={p.heureReveil}
                    onChange={(e) => maj("heureReveil", e.target.value)}
                  />
                </Champ>
                <Champ label="Heure de coucher" erreur={erreurs.heureCoucher}>
                  <Saisie
                    type="time" value={p.heureCoucher}
                    onChange={(e) => maj("heureCoucher", e.target.value)}
                  />
                </Champ>
                <Champ label="Début du travail">
                  <Saisie
                    type="time" value={p.heureDebutTravail}
                    onChange={(e) => maj("heureDebutTravail", e.target.value)}
                  />
                </Champ>
                <Champ label="Fin du travail">
                  <Saisie
                    type="time" value={p.heureFinTravail}
                    onChange={(e) => maj("heureFinTravail", e.target.value)}
                  />
                </Champ>
              </div>

              <Champ label="Jours travaillés">
                <Puces
                  options={JOURS.map((j) => ({ valeur: j, libelle: j.slice(0, 3) }))}
                  valeurs={p.joursTravailles}
                  onChange={(v) => maj("joursTravailles", v as Jour[])}
                />
              </Champ>

              <Champ label="Trajet quotidien" aide="Aller et retour cumulés">
                <Curseur
                  min={0} max={180} pas={5} valeur={p.trajetQuotidien}
                  onChange={(v) => maj("trajetQuotidien", v)} suffixe="min"
                />
              </Champ>

              <Champ label="Séances possibles par semaine" erreur={erreurs.seancesParSemaine}>
                <Curseur
                  min={1} max={7} valeur={p.seancesParSemaine}
                  onChange={(v) => maj("seancesParSemaine", v)} suffixe="séances"
                />
              </Champ>

              {/* Indisponibilités */}
              <Champ
                label="Plages d'indisponibilité"
                aide="Cours, garde d'enfants, engagements réguliers"
              >
                <div className="space-y-3">
                  {p.indisponibilites.map((ind, i) => (
                    <div key={i} className="rounded-2xl bg-[var(--surface-2)] p-3">
                      <div className="grid grid-cols-3 gap-2">
                        <Saisie
                          type="time" value={ind.debut}
                          onChange={(e) => {
                            const copie = [...p.indisponibilites];
                            copie[i] = { ...ind, debut: e.target.value };
                            maj("indisponibilites", copie);
                          }}
                        />
                        <Saisie
                          type="time" value={ind.fin}
                          onChange={(e) => {
                            const copie = [...p.indisponibilites];
                            copie[i] = { ...ind, fin: e.target.value };
                            maj("indisponibilites", copie);
                          }}
                        />
                        <Saisie
                          placeholder="Motif" value={ind.motif}
                          onChange={(e) => {
                            const copie = [...p.indisponibilites];
                            copie[i] = { ...ind, motif: e.target.value };
                            maj("indisponibilites", copie);
                          }}
                        />
                      </div>
                      <div className="mt-2">
                        <Puces
                          options={JOURS.map((j) => ({ valeur: j, libelle: j.slice(0, 3) }))}
                          valeurs={ind.jours}
                          onChange={(v) => {
                            const copie = [...p.indisponibilites];
                            copie[i] = { ...ind, jours: v as Jour[] };
                            maj("indisponibilites", copie);
                          }}
                        />
                      </div>
                      <button
                        onClick={() =>
                          maj("indisponibilites", p.indisponibilites.filter((_, j) => j !== i))}
                        className="mt-2 text-xs text-[var(--danger)] underline"
                      >
                        Retirer cette plage
                      </button>
                    </div>
                  ))}
                  <Bouton
                    variante="fantome" taille="sm"
                    onClick={() =>
                      maj("indisponibilites", [
                        ...p.indisponibilites,
                        { debut: "20:00", fin: "21:30", jours: [...JOURS], motif: "" },
                      ])}
                  >
                    + Ajouter une plage
                  </Bouton>
                </div>
              </Champ>

              {apercu && (
                <Encart
                  ton={apercu.derive.pressionTemporelle === "critique" ? "warn" : "info"}
                >
                  Temps libre estimé :{" "}
                  <strong>{Math.round(apercu.derive.tempsLibreSemaine / 60)} h par semaine</strong>
                  {" "}(pression {apercu.derive.pressionTemporelle}). Séances plutôt le{" "}
                  {apercu.synthese.momentEntrainement}, environ{" "}
                  {apercu.synthese.dureeSeanceForce} min.
                </Encart>
              )}
            </Carte>
          )}

          {/* =========================== ÉTAPE 4 ========================== */}
          {etape === 4 && (
            <Carte className="space-y-5 p-5 sm:p-8">
              <div>
                <h1 className="text-xl font-bold">Votre alimentation</h1>
                <p className="mt-1 text-sm text-muted">
                  Un plan inapplicable ne sert à rien : ces réponses déterminent le niveau de
                  complexité des repas proposés.
                </p>
              </div>

              <Champ label="Niveau en cuisine">
                <Liste
                  value={p.niveauCuisine}
                  onChange={(e) => maj("niveauCuisine", e.target.value as Profil["niveauCuisine"])}
                  options={[
                    { valeur: "nul", libelle: "Nul — aucune cuisson" },
                    { valeur: "debutant", libelle: "Débutant — recettes simples" },
                    { valeur: "moyen", libelle: "Moyen — à l'aise au quotidien" },
                    { valeur: "bon", libelle: "Bon — je varie les techniques" },
                    { valeur: "chef", libelle: "Très à l'aise" },
                  ]}
                />
              </Champ>

              <Champ
                label="Temps quotidien pour cuisiner et manger"
                erreur={erreurs.tempsCuisine}
                aide="Tous repas confondus"
              >
                <Curseur
                  min={10} max={180} pas={5} valeur={p.tempsCuisine}
                  onChange={(v) => maj("tempsCuisine", v)} suffixe="min"
                />
              </Champ>

              <Champ label="Où déjeunez-vous en semaine ?">
                <Liste
                  value={p.lieuRepas}
                  onChange={(e) => maj("lieuRepas", e.target.value as Profil["lieuRepas"])}
                  options={[
                    { valeur: "domicile", libelle: "À domicile" },
                    { valeur: "bureau_micro_ondes", libelle: "Au bureau, avec micro-ondes" },
                    { valeur: "bureau_sans_cuisine", libelle: "Au bureau, sans réchauffage" },
                    { valeur: "restaurant_cantine", libelle: "Restaurant ou cantine" },
                    { valeur: "exterieur_nomade", libelle: "En déplacement" },
                    { valeur: "mixte", libelle: "Cela varie" },
                  ]}
                />
              </Champ>

              <Champ label="Contraintes alimentaires">
                <Puces
                  options={OPTIONS_CONTRAINTES}
                  valeurs={p.contraintesAlimentaires}
                  onChange={(v) => maj("contraintesAlimentaires", v)}
                />
              </Champ>

              {apercu && (
                <div className="space-y-3">
                  <Encart>
                    Cible estimée : <strong>{apercu.nutrition.kcal} kcal par jour</strong>
                    {" "}— {apercu.nutrition.proteinesG} g de protéines,{" "}
                    {apercu.nutrition.glucidesG} g de glucides,{" "}
                    {apercu.nutrition.lipidesG} g de lipides.
                  </Encart>
                  {apercu.nutrition.pratique.batchCooking && (
                    <Encart ton="warn">
                      Avec ce temps disponible, le batch cooking est recommandé :
                      une session le {apercu.nutrition.pratique.jourBatch} couvre 3 à 4 jours.
                    </Encart>
                  )}
                </div>
              )}
            </Carte>
          )}

          {/* =========================== ÉTAPE 5 ========================== */}
          {etape === 5 && (
            <Carte className="space-y-5 p-5 sm:p-8">
              <div>
                <h1 className="text-xl font-bold">Vérifiez avant de lancer</h1>
                <p className="mt-1 text-sm text-muted">
                  Un seul coup d&apos;œil : tout ce que FORGE utilisera pour calculer votre
                  programme.
                </p>
              </div>

              <div>
                {/* ----------------------- Vous ----------------------- */}
                <GroupeRecap titre={ETAPES[0]} onModifier={() => setEtape(0)} premier>
                  <LigneRecap label="Prénom ou pseudo">
                    {p.nom.trim() || <span className="font-normal text-muted">Non renseigné</span>}
                  </LigneRecap>
                  <LigneRecap label="Âge">{p.age} ans</LigneRecap>
                  <LigneRecap label="Sexe">{LIBELLES_SEXE[p.sexe]}</LigneRecap>
                  <LigneRecap label="Taille">{p.taille} cm</LigneRecap>
                  <LigneRecap label="Poids">{p.poids} kg</LigneRecap>
                  {typeof p.pourcentageGras === "number" && (
                    <LigneRecap label="Masse grasse">{p.pourcentageGras} %</LigneRecap>
                  )}
                  {typeof p.fcRepos === "number" && (
                    <LigneRecap label="FC de repos">{p.fcRepos} bpm</LigneRecap>
                  )}
                  <LigneRecap label="Zones sensibles">
                    <PastillesRecap
                      valeurs={p.blessures.map((b) => libelleParmi(OPTIONS_BLESSURES, b))}
                      vide="Aucune blessure signalée"
                    />
                  </LigneRecap>
                </GroupeRecap>

                {/* --------------------- Objectif --------------------- */}
                <GroupeRecap titre={ETAPES[1]} onModifier={() => setEtape(1)}>
                  <LigneRecap label="Objectif principal">
                    {libelleParmi(OPTIONS_OBJECTIF, p.objectif)}
                  </LigneRecap>
                  <LigneRecap label="Niveau sportif">
                    {libelleParmi(OPTIONS_NIVEAU, p.niveauSportif)}
                  </LigneRecap>
                  <LigneRecap label="Durée du cycle">{p.dureeCycle} semaines</LigneRecap>
                </GroupeRecap>

                {/* --------------------- Matériel --------------------- */}
                <GroupeRecap titre={ETAPES[2]} onModifier={() => setEtape(2)}>
                  <LigneRecap label="Équipements disponibles">
                    <PastillesRecap
                      valeurs={p.equipement
                        .filter((e) => e !== "aucun")
                        .map((e) => libelleParmi(OPTIONS_EQUIPEMENT, e))}
                      vide="Aucun matériel — programme au poids du corps"
                    />
                  </LigneRecap>
                </GroupeRecap>

                {/* ---------------------- Agenda ---------------------- */}
                <GroupeRecap titre={ETAPES[3]} onModifier={() => setEtape(3)}>
                  <LigneRecap label="Réveil">{p.heureReveil}</LigneRecap>
                  <LigneRecap label="Coucher">{p.heureCoucher}</LigneRecap>
                  <LigneRecap label="Début du travail">{p.heureDebutTravail}</LigneRecap>
                  <LigneRecap label="Fin du travail">{p.heureFinTravail}</LigneRecap>
                  <LigneRecap label="Trajet quotidien">{p.trajetQuotidien} min</LigneRecap>
                  <LigneRecap label="Séances par semaine">
                    {p.seancesParSemaine} séances
                  </LigneRecap>
                  {apercu && (
                    <>
                      <LigneRecap label="Durée de séance estimée">
                        {apercu.synthese.dureeSeanceForce} min
                      </LigneRecap>
                      <LigneRecap label="Sommeil suffisant">
                        {ouiNon(apercu.derive.sommeilSuffisant)}
                      </LigneRecap>
                    </>
                  )}
                  <LigneRecap label="Jours travaillés">
                    <PastillesRecap
                      valeurs={p.joursTravailles.map((j) => cap(j.slice(0, 3)))}
                      vide="Aucun jour travaillé"
                    />
                  </LigneRecap>
                  <LigneRecap label="Jours entièrement libres">
                    <PastillesRecap
                      valeurs={JOURS.filter((j) => !p.joursTravailles.includes(j))
                        .map((j) => cap(j.slice(0, 3)))}
                      vide="Aucun — vous travaillez tous les jours"
                    />
                  </LigneRecap>
                  <LigneRecap label="Plages d'indisponibilité">
                    {p.indisponibilites.length === 0 ? (
                      <span className="font-normal text-muted">Aucune plage</span>
                    ) : (
                      <span className="flex flex-col gap-0.5">
                        {p.indisponibilites.map((ind, i) => (
                          <span key={i}>
                            {ind.debut} – {ind.fin}
                            {" · "}
                            {ind.jours.length === 0
                              ? "aucun jour"
                              : ind.jours.map((j) => j.slice(0, 3)).join(", ")}
                            {ind.motif.trim() && ` · ${ind.motif.trim()}`}
                          </span>
                        ))}
                      </span>
                    )}
                  </LigneRecap>
                </GroupeRecap>

                {/* ---------------------- Cuisine --------------------- */}
                <GroupeRecap titre={ETAPES[4]} onModifier={() => setEtape(4)}>
                  <LigneRecap label="Niveau en cuisine">
                    {LIBELLES_CUISINE[p.niveauCuisine]}
                  </LigneRecap>
                  <LigneRecap label="Temps quotidien pour les repas">
                    {p.tempsCuisine} min
                  </LigneRecap>
                  <LigneRecap label="Déjeuner en semaine">
                    {LIBELLES_LIEU_REPAS[p.lieuRepas]}
                  </LigneRecap>
                  {apercu && (
                    <LigneRecap label="Batch cooking conseillé">
                      {ouiNon(apercu.nutrition.pratique.batchCooking)}
                    </LigneRecap>
                  )}
                  <LigneRecap label="Contraintes alimentaires">
                    <PastillesRecap
                      valeurs={p.contraintesAlimentaires.map((c) =>
                        libelleParmi(OPTIONS_CONTRAINTES, c))}
                      vide="Aucune contrainte"
                    />
                  </LigneRecap>
                </GroupeRecap>
              </div>
            </Carte>
          )}
        </motion.div>
      </AnimatePresence>

      {/* --------------------------- Navigation --------------------------- */}
      <div className="flex items-center justify-between gap-3">
        <Bouton
          variante="fantome"
          onClick={() => setEtape((e) => Math.max(0, e - 1))}
          disabled={etape === 0}
        >
          ← Retour
        </Bouton>

        <span className="text-xs text-faint tnum">
          {etape + 1} / {ETAPES.length}
        </span>

        <Bouton onClick={suivant} disabled={envoi}>
          {envoi
            ? "Génération…"
            : etape === ETAPES.length - 1
              ? "Générer mon programme"
              : "Continuer →"}
        </Bouton>
      </div>
    </div>
  );
}

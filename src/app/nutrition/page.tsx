"use client";

/**
 * nutrition/page.tsx — Écran Nutrition.
 *
 * Deux scores en tête (bouffe et hydratation), le journal des repas du jour,
 * puis des suggestions concrètes pour combler l'écart avec les cibles.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Bouton, Carte, Pastille, Saisie, Squelette, Vide, cx } from "@/components/ui";
import { Anneau } from "@/components/widgets";
import { Bouteille } from "@/components/bouteille";
import { useApp } from "@/lib/useApp";
import {
  ajouterEau, ajouterRepas, ajouterRepasManuel, aujourdhui, retirerRepas,
  suggestionsComplement, type EntreeRepas,
} from "@/lib/suivi";
import {
  alimentParId, alimentsCompatibles, apports, CATEGORIES, type Aliment,
} from "@/lib/donnees/aliments";

const REPAS: { id: EntreeRepas["repas"]; nom: string; emoji: string }[] = [
  { id: "petit_dejeuner", nom: "Petit-déjeuner", emoji: "🌅" },
  { id: "dejeuner", nom: "Déjeuner", emoji: "🍽️" },
  { id: "gouter", nom: "Goûter", emoji: "🥐" },
  { id: "diner", nom: "Dîner", emoji: "🌙" },
  { id: "collation", nom: "Collation", emoji: "🍏" },
];

export default function PageNutrition() {
  const {
    chargement, fiche, programme, jour, scores, totaux, cibleHydratation, rafraichir,
  } = useApp();

  const [ajout, setAjout] = useState<EntreeRepas["repas"] | null>(null);
  const [recherche, setRecherche] = useState("");
  const [categorie, setCategorie] = useState<string>("toutes");
  const [selection, setSelection] = useState<Aliment | null>(null);
  const [grammes, setGrammes] = useState(100);
  const [modeManuel, setModeManuel] = useState(false);
  const [manuel, setManuel] = useState({ nom: "", kcal: 0, proteines: 0, glucides: 0, lipides: 0 });

  // Mémorisé : sans cela, un nouveau tableau à chaque rendu invaliderait
  // les useMemo qui en dépendent.
  const contraintes = useMemo(
    () => (programme?.profil.contraintesAlimentaires ?? []) as string[],
    [programme],
  );

  const catalogue = useMemo(() => {
    let liste = alimentsCompatibles(contraintes);
    if (categorie !== "toutes") liste = liste.filter((a) => a.categorie === categorie);
    if (recherche.trim()) {
      const q = recherche.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
      liste = liste.filter((a) =>
        a.nom.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").includes(q));
    }
    return liste.slice(0, 40);
  }, [contraintes, categorie, recherche]);

  const suggestions = useMemo(() => {
    if (!programme) return [];
    return suggestionsComplement(
      jour,
      {
        kcal: programme.nutrition.kcal,
        proteinesG: programme.nutrition.proteinesG,
        glucidesG: programme.nutrition.glucidesG,
        lipidesG: programme.nutrition.lipidesG,
      },
      contraintes,
    );
  }, [jour, programme, contraintes]);

  if (chargement) {
    return (
      <div role="status" aria-busy="true" className="space-y-6">
        <span className="sr-only">Chargement…</span>
        <div className="flex justify-center">
          <Squelette className="h-32 w-32 rounded-full" />
        </div>
        <Squelette className="h-16" />
        <Squelette className="h-16" />
        <Squelette className="h-16" />
      </div>
    );
  }

  if (!fiche || !programme) {
    return (
      <Carte>
        <Vide
          icone="🥗" titre="Aucun programme"
          texte="Créez votre profil pour obtenir vos cibles nutritionnelles."
          action={<Link href="/profil"><Bouton>Créer mon profil</Bouton></Link>}
        />
      </Carte>
    );
  }

  const n = programme.nutrition;

  const valider = () => {
    if (modeManuel) {
      if (!manuel.nom.trim()) return;
      ajouterRepasManuel(aujourdhui(), manuel.nom, manuel, ajout!);
      setManuel({ nom: "", kcal: 0, proteines: 0, glucides: 0, lipides: 0 });
    } else {
      if (!selection) return;
      ajouterRepas(aujourdhui(), selection.id, grammes, ajout!);
      setSelection(null);
      setGrammes(100);
    }
    setAjout(null);
    setRecherche("");
    rafraichir();
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* ---------------------------- Scores ---------------------------- */}
      <section className="grid gap-3 sm:grid-cols-2">
        <Carte fort className="carte-editoriale flex items-center gap-4 p-5 sm:gap-5 sm:p-7">
          <Anneau pourcentage={scores.nutrition} taille={92}>
            <span className="chiffre text-lg leading-none">{scores.nutrition}%</span>
          </Anneau>
          <div className="min-w-0">
            <p className="etiquette">Ton score bouffe</p>
            <p className="mt-1.5 chiffre valeur-sm leading-none">
              {Math.round(totaux.kcal)}
              <span className="unite ml-1.5 text-[0.3em]">/ {n.kcal} kcal</span>
            </p>
            <p className="mt-1 text-xs text-muted text-pretty">
              {scores.nutrition >= 95
                ? "Cible atteinte, rien à ajouter."
                : scores.nutrition >= 70
                  ? "Bon équilibre, il reste un peu de marge."
                  : "Encore loin de la cible du jour."}
            </p>
          </div>
        </Carte>

        <Carte fort className="carte-editoriale flex items-center gap-4 p-5 sm:gap-5 sm:p-7">
          <Bouteille pourcentage={scores.hydratation} hauteur={124} afficherValeur={false} />
          <div className="min-w-0 flex-1">
            <p className="etiquette">Ton score hydra</p>
            <p className="mt-1.5 chiffre valeur-sm leading-none">
              {(jour.hydratationMl / 1000).toFixed(1)}
              <span className="unite ml-1.5 text-[0.3em]">
                / {(cibleHydratation / 1000).toFixed(1)} L
              </span>
            </p>
            <p className="mt-1.5 text-xs text-muted">{scores.hydratation} % de la cible</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {[250, 500].map((ml) => (
                <button
                  key={ml}
                  onClick={() => { ajouterEau(aujourdhui(), ml); rafraichir(); }}
                  className="min-h-9 rounded-pill bg-[var(--eau-soft)] px-3.5 py-1.5 text-xs font-medium
                             transition-colors duration-200 hover:bg-[var(--accent-soft)]"
                >
                  +{ml / 10} cl
                </button>
              ))}
              {jour.hydratationMl > 0 && (
                <button
                  onClick={() => { ajouterEau(aujourdhui(), -250); rafraichir(); }}
                  aria-label="Retirer 25 cl"
                  className="min-h-9 rounded-pill bg-[var(--surface-2)] px-3.5 py-1.5 text-xs text-muted
                             transition-colors duration-200 hover:bg-[var(--surface)] hover:text-ink"
                >
                  −
                </button>
              )}
            </div>
          </div>
        </Carte>
      </section>

      {/* ---------------------------- Macros ---------------------------- */}
      <Carte className="p-5 sm:p-6">
        <h2 className="mb-5 text-lg font-medium">Macros du jour</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { nom: "Protéines", val: totaux.proteines, cible: n.proteinesG, couleur: "var(--data-proteines)" },
            { nom: "Glucides", val: totaux.glucides, cible: n.glucidesG, couleur: "var(--data-glucides)" },
            { nom: "Lipides", val: totaux.lipides, cible: n.lipidesG, couleur: "var(--data-lipides)" },
          ].map((m) => (
            <div key={m.nom}>
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium">{m.nom}</span>
                <span className="text-xs tnum text-muted">
                  {Math.round(m.val)} <span className="text-faint">/ {m.cible} g</span>
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-pill bg-[var(--surface-2)]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (m.val / m.cible) * 100)}%` }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                  className="h-full rounded-pill"
                  style={{ background: m.couleur }}
                />
              </div>
            </div>
          ))}
        </div>
      </Carte>

      {/* ------------------------- Journal repas ------------------------- */}
      <section className="space-y-3">
        <h2 className="etiquette px-1">T&apos;as mangé quoi ?</h2>

        {REPAS.map((r) => {
          const entrees = jour.repas.filter((e) => e.repas === r.id);
          const kcal = entrees.reduce((a, e) => a + e.kcal, 0);
          return (
            <Carte key={r.id} className="p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">{r.emoji}</span>
                  <span className="font-semibold">{r.nom}</span>
                  {kcal > 0 && <Pastille>{kcal} kcal</Pastille>}
                </div>
                <Bouton
                  taille="sm"
                  variante={ajout === r.id ? "principal" : "doux"}
                  onClick={() => { setAjout(ajout === r.id ? null : r.id); setSelection(null); }}
                >
                  {ajout === r.id ? "Fermer" : "+ Ajouter"}
                </Bouton>
              </div>

              {entrees.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {entrees.map((e) => {
                    const a = alimentParId(e.alimentId);
                    return (
                      <li
                        key={e.id}
                        className="flex items-center justify-between gap-3 rounded-2xl bg-[var(--surface-2)] px-3.5 py-2.5 text-sm"
                      >
                        <span className="min-w-0 flex-1 truncate">
                          {a?.nom ?? e.nomLibre}
                          {e.grammes > 0 && (
                            <span className="text-muted"> · {e.grammes} g</span>
                          )}
                        </span>
                        <span className="shrink-0 text-xs tnum text-muted">
                          {e.kcal} kcal · P {Math.round(e.proteines)}
                        </span>
                        <button
                          onClick={() => { retirerRepas(aujourdhui(), e.id); rafraichir(); }}
                          aria-label={`Retirer ${a?.nom ?? e.nomLibre}`}
                          className="shrink-0 text-muted hover:text-[var(--danger)]"
                        >
                          ×
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              {/* ------------------ Panneau d'ajout ------------------ */}
              <AnimatePresence>
                {ajout === r.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-4 border-t border-[var(--border)] pt-4">
                      <div className="mb-3 flex gap-2">
                        <button
                          onClick={() => setModeManuel(false)}
                          className={cx(
                            "min-h-9 rounded-pill px-3.5 py-2 text-xs font-medium transition-colors duration-200",
                            !modeManuel ? "bg-[image:var(--accent-degrade)] text-[var(--accent-contrast)] shadow-soft"
                              : "bg-[var(--surface-2)] text-muted",
                          )}
                        >
                          Base d&apos;aliments
                        </button>
                        <button
                          onClick={() => setModeManuel(true)}
                          className={cx(
                            "min-h-9 rounded-pill px-3.5 py-2 text-xs font-medium transition-colors duration-200",
                            modeManuel ? "bg-[image:var(--accent-degrade)] text-[var(--accent-contrast)] shadow-soft"
                              : "bg-[var(--surface-2)] text-muted",
                          )}
                        >
                          Saisie manuelle
                        </button>
                      </div>

                      {modeManuel ? (
                        <div className="space-y-2.5">
                          <Saisie
                            placeholder="Nom du plat"
                            value={manuel.nom}
                            onChange={(e) => setManuel({ ...manuel, nom: e.target.value })}
                          />
                          <div className="grid grid-cols-4 gap-2">
                            {([
                              ["kcal", "kcal"], ["proteines", "P (g)"],
                              ["glucides", "G (g)"], ["lipides", "L (g)"],
                            ] as const).map(([cle, label]) => (
                              <div key={cle}>
                                <label className="mb-1 block text-[0.65rem] text-faint">{label}</label>
                                <Saisie
                                  type="number" min={0}
                                  value={manuel[cle] || ""}
                                  onChange={(e) =>
                                    setManuel({ ...manuel, [cle]: Number(e.target.value) || 0 })}
                                />
                              </div>
                            ))}
                          </div>
                          <Bouton pleineLargeur onClick={valider} disabled={!manuel.nom.trim()}>
                            Ajouter
                          </Bouton>
                        </div>
                      ) : selection ? (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="font-medium">{selection.nom}</p>
                            <button
                              onClick={() => setSelection(null)}
                              className="text-xs text-muted underline"
                            >
                              changer
                            </button>
                          </div>
                          <div className="flex items-center gap-3">
                            <Saisie
                              type="number" min={1} value={grammes}
                              onChange={(e) => setGrammes(Number(e.target.value) || 0)}
                              className="w-28"
                            />
                            <span className="text-sm text-muted">g</span>
                            <button
                              onClick={() => setGrammes(selection.portion)}
                              className="min-h-9 rounded-pill bg-[var(--surface-2)] px-3.5 py-2 text-xs transition-colors duration-200 hover:bg-[var(--surface)]"
                            >
                              {selection.portionNom} ({selection.portion} g)
                            </button>
                          </div>
                          <p className="text-xs tnum text-muted">
                            {(() => {
                              const v = apports(selection, grammes);
                              return `${v.kcal} kcal · P ${v.proteines} / G ${v.glucides} / L ${v.lipides} g`;
                            })()}
                          </p>
                          <Bouton pleineLargeur onClick={valider}>Ajouter</Bouton>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <Saisie
                            placeholder="Rechercher un aliment…"
                            value={recherche}
                            onChange={(e) => setRecherche(e.target.value)}
                          />
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              onClick={() => setCategorie("toutes")}
                              className={cx(
                                "min-h-8 rounded-pill px-3 py-1.5 text-[0.7rem] transition-colors duration-200",
                                categorie === "toutes"
                                  ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
                                  : "bg-[var(--surface-2)] text-muted",
                              )}
                            >
                              Toutes
                            </button>
                            {CATEGORIES.map((c) => (
                              <button
                                key={c.id}
                                onClick={() => setCategorie(c.id)}
                                className={cx(
                                  "min-h-8 rounded-pill px-3 py-1.5 text-[0.7rem] transition-colors duration-200",
                                  categorie === c.id
                                    ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
                                    : "bg-[var(--surface-2)] text-muted",
                                )}
                              >
                                {c.emoji} {c.nom}
                              </button>
                            ))}
                          </div>
                          <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
                            {catalogue.map((a) => (
                              <button
                                key={a.id}
                                onClick={() => { setSelection(a); setGrammes(a.portion); }}
                                className="flex min-h-11 w-full items-center justify-between gap-3 rounded-2xl bg-[var(--surface-2)] px-3.5 py-2.5 text-left text-sm transition-colors duration-200 hover:bg-[var(--accent-soft)]"
                              >
                                <span className="min-w-0 flex-1 truncate">{a.nom}</span>
                                <span className="shrink-0 text-xs tnum text-muted">
                                  {a.kcal} kcal · P {a.proteines}
                                </span>
                              </button>
                            ))}
                            {catalogue.length === 0 && (
                              <p className="py-4 text-center text-sm text-muted">
                                Aucun aliment trouvé. Utilisez la saisie manuelle.
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Carte>
          );
        })}
      </section>

      {/* -------------------------- Suggestions -------------------------- */}
      {scores.nutrition < 95 && suggestions.length > 0 && (
        <Carte className="p-5 sm:p-6">
          <h2 className="text-lg font-medium">Mange encore</h2>
          <p className="mt-1 text-sm text-muted">
            Pour atteindre tes cibles du jour, voici ce qui manque le plus.
          </p>
          <ul className="mt-4 space-y-2">
            {suggestions.map((s, i) => (
              <li
                key={i}
                className="panneau-chaud flex flex-wrap items-baseline justify-between gap-2 rounded-2xl px-4 py-3.5"
              >
                <span className="min-w-0">
                  <span className="font-medium">
                    {s.nom} <span className="text-muted">· {s.quantite}</span>
                  </span>
                  <span className="mt-0.5 block text-xs text-faint">{s.couvre}</span>
                </span>
                <span className="shrink-0 text-xs tnum text-muted">{s.apport}</span>
              </li>
            ))}
          </ul>
        </Carte>
      )}

      {scores.nutrition >= 95 && (
        <Carte className="p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl">✅</span>
            <p className="text-sm text-pretty">
              Cibles atteintes pour aujourd&apos;hui. Inutile d&apos;en rajouter :
              dépasser n&apos;est pas mieux qu&apos;atteindre.
            </p>
          </div>
        </Carte>
      )}
    </div>
  );
}

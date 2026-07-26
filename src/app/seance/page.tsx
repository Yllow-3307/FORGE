"use client";

/**
 * seance/page.tsx — Écran Séance.
 *
 * Quatre phases enchaînées dans une seule vue :
 *   topo → échauffement → séance → étirements → récapitulatif
 *
 * Le lecteur est volontairement plein écran et sans distraction : pendant
 * l'effort, on ne doit avoir qu'une information à lire et un bouton à toucher.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Bouton, Carte, Pastille, Vide, cx } from "@/components/ui";
import { CercleMinuteur, useMinuteur } from "@/components/minuteur";
import { useApp } from "@/lib/useApp";
import { majJour, aujourdhui } from "@/lib/suivi";
import { BIBLIOTHEQUE } from "@/lib/moteur/exercices";
import {
  consignesSeance, echauffementPour, etirementsPour, musclesSollicites,
} from "@/lib/donnees/seance";

type Phase = "topo" | "echauffement" | "seance" | "etirements" | "recap";

export default function PageSeance() {
  const { chargement, fiche, programme, seancesDuJour, rafraichir } = useApp();
  const [phase, setPhase] = useState<Phase>("topo");
  const [indexEchauffement, setIndexEchauffement] = useState(0);
  const [indexBloc, setIndexBloc] = useState(0);
  const [seriesFaites, setSeriesFaites] = useState<Record<number, number>>({});
  const [enRepos, setEnRepos] = useState(false);
  const [ressenti, setRessenti] = useState("");
  const [energie, setEnergie] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [enregistre, setEnregistre] = useState(false);

  const seance = seancesDuJour[0] ?? null;

  const indexMuscles = useMemo(
    () => new Map(BIBLIOTHEQUE.map((e) => [e.nom, e.muscles as string[]])),
    [],
  );

  const consignes = useMemo(
    () => (seance && programme ? consignesSeance(seance, programme.profil.objectif) : []),
    [seance, programme],
  );

  const echauffement = useMemo(() => (seance ? echauffementPour(seance) : []), [seance]);

  const etirements = useMemo(() => {
    if (!seance) return [];
    return etirementsPour(seance, musclesSollicites(seance, indexMuscles));
  }, [seance, indexMuscles]);

  // Blocs de travail uniquement : l'échauffement et le retour au calme ont
  // leur propre phase dans le lecteur.
  const blocs = useMemo(
    () => seance?.blocs.filter((b) => b.role === "principal" || b.role === "accessoire"
      || b.role === "finisher") ?? [],
    [seance],
  );

  const totalSeries = blocs.reduce((a, b) => a + b.series, 0);
  const seriesValidees = Object.values(seriesFaites).reduce((a, n) => a + n, 0);
  const accomplissement = totalSeries > 0 ? Math.round((seriesValidees / totalSeries) * 100) : 0;

  /* ------------------------------------------------------------ minuteurs */

  const etapeEch = echauffement[indexEchauffement];
  const minuteurEch = useMinuteur(etapeEch?.duree ?? 0, () => {
    if (indexEchauffement < echauffement.length - 1) {
      setIndexEchauffement((i) => i + 1);
    } else {
      setPhase("seance");
    }
  });

  const blocCourant = blocs[indexBloc];
  const minuteurRepos = useMinuteur(blocCourant?.repos ?? 60, () => setEnRepos(false));

  /**
   * Certains blocs se mesurent en temps et non en répétitions : cardio
   * continu, gainage, maintiens. Afficher « série validée » n'y a pas de
   * sens — on propose un minuteur décomptant la durée prescrite.
   */
  const dureeBloc = useMemo(() => {
    if (!blocCourant || blocCourant.unite !== "temps") return 0;
    const texte = String(blocCourant.reps);
    const nombre = parseFloat(texte.replace(",", "."));
    if (!Number.isFinite(nombre)) return 0;
    if (texte.includes("min")) return Math.round(nombre * 60);
    if (texte.includes("s")) return Math.round(nombre);
    return 0;
  }, [blocCourant]);

  const estChronometre = dureeBloc > 0;

  /* --------------------------------------------------------------- actions */

  const validerSerie = () => {
    if (!blocCourant) return;
    const faites = (seriesFaites[indexBloc] ?? 0) + 1;
    setSeriesFaites((s) => ({ ...s, [indexBloc]: faites }));

    if (faites >= blocCourant.series) {
      if (indexBloc < blocs.length - 1) {
        setIndexBloc((i) => i + 1);
        setEnRepos(false);
      } else {
        setPhase("etirements");
      }
    } else if (blocCourant.repos > 0) {
      setEnRepos(true);
      minuteurRepos.reinitialiser(blocCourant.repos);
      minuteurRepos.demarrer();
    }
  };

  // Déclaré après `validerSerie` : le minuteur peut l'appeler directement à
  // la fin du décompte, sans passer par une ref.
  const minuteurBloc = useMinuteur(dureeBloc, () => validerSerie());

  const terminerSeance = () => {
    majJour(aujourdhui(), {
      seanceFaite: true,
      seanceNom: seance?.nom,
      accomplissement,
      ressenti: ressenti.trim() || undefined,
      energie,
    });
    setEnregistre(true);
    rafraichir();
  };

  /* ----------------------------------------------------------------- vues */

  if (chargement) {
    return (
      <div className="grid min-h-[60dvh] place-items-center">
        <div
          role="status" aria-label="Chargement en cours"
          className="h-9 w-9 animate-spin rounded-full border-2 border-[var(--border-strong)] border-t-[var(--accent)]"
        />
      </div>
    );
  }

  if (!fiche || !programme) {
    return (
      <Carte>
        <Vide
          icone="⚒️" titre="Aucun programme"
          texte="Créez d'abord votre profil pour générer un programme."
          action={<Link href="/profil"><Bouton>Créer mon profil</Bouton></Link>}
        />
      </Carte>
    );
  }

  if (!seance) {
    return (
      <Carte>
        <Vide
          icone="🌙" titre="Repos aujourd'hui"
          texte="Aucune séance n'est programmée. La récupération fait partie du plan : elle permet aux adaptations de se produire."
          action={<Link href="/programme"><Bouton variante="fantome">Voir la semaine</Bouton></Link>}
        />
      </Carte>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <AnimatePresence mode="wait">
        {/* ============================ TOPO ============================ */}
        {phase === "topo" && (
          <motion.div
            key="topo"
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }} className="space-y-4"
          >
            <Carte fort className="carte-editoriale p-5 sm:p-9">
              <Pastille ton="accent">{seance.type === "force" ? "Renforcement" : "Endurance"}</Pastille>
              <h1 className="mt-4 text-2xl font-light leading-tight text-balance sm:text-4xl">
                Aujourd&apos;hui c&apos;est{" "}
                <span className="font-normal text-[var(--accent)]">{seance.nom}</span>
              </h1>
              <p className="mt-3 text-sm text-muted">
                Prévu à {seance.debut} · intensité {seance.intensite}
              </p>
            </Carte>

            <Carte className="p-5 sm:p-6">
              <h2 className="text-lg font-medium">On se concentre sur</h2>
              <ol className="mt-4 space-y-3">
                {consignes.map((c, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[image:var(--accent-degrade)] text-xs font-semibold text-[var(--accent-contrast)]">
                      {i + 1}
                    </span>
                    <p className="text-sm leading-relaxed text-pretty">{c}</p>
                  </li>
                ))}
              </ol>
            </Carte>

            <Carte className="flex flex-wrap items-center justify-between gap-4 p-6">
              <div>
                <p className="etiquette">Tout ça pendant</p>
                <p className="mt-1.5 chiffre valeur-md leading-none">
                  {seance.dureeMin}<span className="unite ml-1.5 text-[0.3em]">min</span>
                </p>
                <p className="mt-2 text-xs text-muted">
                  {blocs.length} exercice{blocs.length > 1 ? "s" : ""} · {totalSeries} séries
                </p>
              </div>
              <Bouton taille="lg" onClick={() => setPhase("echauffement")}>
                Lance la séance →
              </Bouton>
            </Carte>

            <Carte className="p-4 sm:p-5">
              <h3 className="etiquette mb-3.5">Au programme</h3>
              <ul className="space-y-1.5">
                {blocs.map((b, i) => (
                  <li key={i} className="flex items-baseline justify-between gap-3 border-b border-[var(--filet)] pb-1.5 text-sm last:border-0 last:pb-0">
                    <span className="min-w-0 flex-1 truncate">{b.nom}</span>
                    <span className="shrink-0 tnum text-muted">{b.series} × {b.reps}</span>
                  </li>
                ))}
              </ul>
            </Carte>
          </motion.div>
        )}

        {/* ======================== ÉCHAUFFEMENT ======================== */}
        {phase === "echauffement" && etapeEch && (
          <motion.div
            key="ech"
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }}
          >
            <Carte fort className="carte-editoriale flex flex-col items-center p-6 text-center sm:p-12">
              <Pastille ton="warn">
                Échauffement {indexEchauffement + 1}/{echauffement.length}
              </Pastille>
              <h2 className="mt-4 text-2xl font-light">{etapeEch.nom}</h2>
              <p className="mt-2 max-w-md text-sm text-muted text-pretty">{etapeEch.consigne}</p>

              <div className="my-8">
                <CercleMinuteur
                  restant={minuteurEch.restant}
                  total={etapeEch.duree}
                  couleur="var(--warn)"
                  libelle={minuteurEch.actif ? "en cours" : "en pause"}
                />
              </div>

              <div className="flex flex-wrap justify-center gap-3">
                <Bouton
                  onClick={minuteurEch.actif ? minuteurEch.pause : minuteurEch.demarrer}
                  taille="lg"
                >
                  {minuteurEch.actif ? "Pause" : "Démarrer"}
                </Bouton>
                <Bouton
                  variante="fantome"
                  onClick={() =>
                    indexEchauffement < echauffement.length - 1
                      ? setIndexEchauffement((i) => i + 1)
                      : setPhase("seance")
                  }
                >
                  Passer →
                </Bouton>
              </div>

              <button
                onClick={() => setPhase("seance")}
                className="mt-5 text-xs text-faint underline underline-offset-2 hover:text-muted"
              >
                Aller directement à la séance
              </button>
            </Carte>
          </motion.div>
        )}

        {/* =========================== SÉANCE =========================== */}
        {phase === "seance" && blocCourant && (
          <motion.div
            key="seance"
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }}
            className="space-y-4"
          >
            {/* Progression globale */}
            <div className="flex items-center gap-3 px-1">
              <div className="h-1.5 flex-1 overflow-hidden rounded-pill bg-[var(--surface-2)]">
                <motion.div
                  className="h-full rounded-pill bg-[image:var(--accent-degrade)]"
                  animate={{ width: `${accomplissement}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>
              <span className="shrink-0 text-xs tnum text-muted">
                {seriesValidees}/{totalSeries} séries
              </span>
            </div>

            <Carte fort className="carte-editoriale flex flex-col items-center p-6 text-center sm:p-12">
              {enRepos ? (
                <>
                  <Pastille>Récupération</Pastille>
                  <h2 className="mt-4 text-xl font-light text-muted">
                    Prochaine série : {blocCourant.nom}
                  </h2>
                  <div className="my-8">
                    <CercleMinuteur
                      restant={minuteurRepos.restant}
                      total={blocCourant.repos}
                      couleur="var(--eau)"
                      libelle="repos"
                    />
                  </div>
                  <div className="flex flex-wrap justify-center gap-3">
                    <Bouton onClick={() => setEnRepos(false)} taille="lg">
                      Reprendre maintenant
                    </Bouton>
                    <Bouton variante="fantome" onClick={() => minuteurRepos.ajouter(30)}>
                      +30 s
                    </Bouton>
                  </div>
                </>
              ) : (
                <>
                  <Pastille ton="accent">
                    Exercice {indexBloc + 1}/{blocs.length}
                  </Pastille>
                  <h2 className="mt-4 text-2xl font-light text-balance sm:text-3xl">{blocCourant.nom}</h2>

                  {estChronometre ? (
                    <>
                      <div className="my-6">
                        <CercleMinuteur
                          restant={minuteurBloc.restant}
                          total={dureeBloc}
                          libelle={minuteurBloc.actif ? "en cours" : "prêt"}
                        />
                      </div>
                      <p className="text-sm text-muted">
                        {blocCourant.series > 1
                          ? `Série ${(seriesFaites[indexBloc] ?? 0) + 1} sur ${blocCourant.series}`
                          : "Bloc unique"}
                        {" · "}{blocCourant.rpe}
                      </p>
                    </>
                  ) : (
                    <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                      <div className="rounded-2xl bg-[var(--surface-2)] px-5 py-3">
                        <p className="text-[0.65rem] uppercase tracking-wider text-faint">Série</p>
                        <p className="text-2xl font-bold tnum">
                          {(seriesFaites[indexBloc] ?? 0) + 1}
                          <span className="text-sm font-normal text-muted">/{blocCourant.series}</span>
                        </p>
                      </div>
                      <div className="rounded-2xl bg-[var(--surface-2)] px-5 py-3">
                        <p className="text-[0.65rem] uppercase tracking-wider text-faint">Objectif</p>
                        <p className="text-2xl font-bold tnum">{blocCourant.reps}</p>
                      </div>
                      <div className="rounded-2xl bg-[var(--surface-2)] px-5 py-3">
                        <p className="text-[0.65rem] uppercase tracking-wider text-faint">Intensité</p>
                        <p className="text-sm font-semibold">{blocCourant.rpe}</p>
                      </div>
                    </div>
                  )}

                  {blocCourant.tempo && (
                    <p className="mt-3 text-xs text-muted">Tempo {blocCourant.tempo}</p>
                  )}
                  {blocCourant.note && (
                    <p className="mt-3 max-w-md text-sm text-muted text-pretty">{blocCourant.note}</p>
                  )}

                  {estChronometre ? (
                    <div className="mt-8 flex w-full flex-wrap justify-center gap-3">
                      <Bouton
                        taille="lg"
                        onClick={minuteurBloc.actif ? minuteurBloc.pause : minuteurBloc.demarrer}
                      >
                        {minuteurBloc.actif ? "Pause" : "Démarrer"}
                      </Bouton>
                      <Bouton variante="fantome" onClick={validerSerie}>
                        Terminé ✓
                      </Bouton>
                    </div>
                  ) : (
                    <Bouton taille="lg" onClick={validerSerie} className="mt-8" pleineLargeur>
                      Série validée ✓
                    </Bouton>
                  )}

                  <div className="mt-4 flex flex-wrap justify-center gap-4 text-xs">
                    {blocCourant.regression && (
                      <span className="text-faint">
                        Trop dur : <span className="text-muted">{blocCourant.regression}</span>
                      </span>
                    )}
                    {blocCourant.progression && (
                      <span className="text-faint">
                        Trop facile : <span className="text-muted">{blocCourant.progression}</span>
                      </span>
                    )}
                  </div>
                </>
              )}
            </Carte>

            <div className="flex justify-between px-1">
              <button
                onClick={() => { setIndexBloc((i) => Math.max(0, i - 1)); setEnRepos(false); }}
                disabled={indexBloc === 0}
                className="text-xs text-faint underline underline-offset-2 disabled:opacity-30"
              >
                ← Exercice précédent
              </button>
              <button
                onClick={() => {
                  if (indexBloc < blocs.length - 1) {
                    setIndexBloc((i) => i + 1);
                    setEnRepos(false);
                  } else setPhase("etirements");
                }}
                className="text-xs text-faint underline underline-offset-2"
              >
                Passer l&apos;exercice →
              </button>
            </div>
          </motion.div>
        )}

        {/* ========================= ÉTIREMENTS ========================= */}
        {phase === "etirements" && (
          <motion.div
            key="etir"
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }}
            className="space-y-4"
          >
            <Carte className="p-5 sm:p-6">
              <Pastille ton="accent">Retour au calme</Pastille>
              <h2 className="mt-3 text-xl font-bold">Étirements adaptés à cette séance</h2>
              <p className="mt-1 text-sm text-muted">
                Ciblés sur les groupes que vous venez de solliciter.
              </p>
            </Carte>

            <div className="space-y-3">
              {etirements.map((e, i) => (
                <Carte key={i} className="flex items-start gap-4 p-5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--accent-soft)] text-sm font-bold text-[var(--accent)]">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="font-semibold">{e.nom}</p>
                      <Pastille>
                        {e.duree} s{e.bilateral ? " par côté" : ""}
                      </Pastille>
                    </div>
                    <p className="mt-1 text-sm text-muted text-pretty">{e.consigne}</p>
                  </div>
                </Carte>
              ))}
            </div>

            <Bouton taille="lg" pleineLargeur onClick={() => setPhase("recap")}>
              Terminer la séance
            </Bouton>
          </motion.div>
        )}

        {/* =========================== RÉCAP ============================ */}
        {phase === "recap" && (
          <motion.div
            key="recap"
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }}
            className="space-y-4"
          >
            <Carte className="p-6 text-center sm:p-10">
              <motion.span
                className="inline-block text-6xl"
                initial={{ scale: 0.6, rotate: -12 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 14 }}
              >
                {accomplissement >= 90 ? "🏆" : accomplissement >= 60 ? "💪" : "👏"}
              </motion.span>
              <h2 className="mt-4 text-2xl font-bold">
                Bravo, t&apos;as tenu{" "}
                <span className="text-[var(--accent)] tnum">{accomplissement} %</span>
              </h2>
              <p className="mt-2 text-sm text-muted">
                {seriesValidees} séries validées sur {totalSeries} prévues
              </p>

              <div className="mx-auto mt-6 h-3 max-w-sm overflow-hidden rounded-pill bg-[var(--surface-2)]">
                <motion.div
                  className="h-full rounded-pill bg-[var(--accent)]"
                  initial={{ width: 0 }} animate={{ width: `${accomplissement}%` }}
                  transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
            </Carte>

            <Carte className="p-5 sm:p-6">
              <h3 className="font-semibold">Ton ressenti post-séance</h3>

              <div className="mt-4">
                <p className="mb-2 text-sm text-muted">Niveau d&apos;énergie</p>
                <div className="flex gap-2">
                  {([1, 2, 3, 4, 5] as const).map((n) => (
                    <button
                      key={n}
                      onClick={() => setEnergie(n)}
                      aria-label={`Énergie ${n} sur 5`}
                      className={cx(
                        "h-11 flex-1 rounded-2xl border text-lg transition",
                        energie === n
                          ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                          : "border-[var(--border)] bg-[var(--surface-2)]",
                      )}
                    >
                      {["😵", "😕", "🙂", "😀", "🤩"][n - 1]}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                value={ressenti}
                onChange={(e) => setRessenti(e.target.value)}
                rows={3}
                placeholder="Sensations, douleurs, charges utilisées, ce qui a bien ou mal marché…"
                className="mt-4 w-full resize-none rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm outline-none focus:border-[var(--accent)]"
              />

              {enregistre ? (
                <div className="mt-4 space-y-3">
                  <p className="rounded-2xl bg-[var(--accent-soft)] px-4 py-3 text-sm font-medium text-[var(--accent)]">
                    Séance enregistrée. Elle compte dans votre série.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Link href="/"><Bouton variante="fantome">Retour à l&apos;accueil</Bouton></Link>
                    <Link href="/nutrition"><Bouton variante="doux">Renseigner mes repas</Bouton></Link>
                  </div>
                </div>
              ) : (
                <Bouton taille="lg" pleineLargeur onClick={terminerSeance} className="mt-4">
                  Enregistrer la séance
                </Bouton>
              )}
            </Carte>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

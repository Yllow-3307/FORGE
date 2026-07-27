"use client";

/**
 * page.tsx — Accueil : tableau de bord.
 *
 * En-tête « série + séance du jour », puis une grille de widgets que
 * l'utilisateur compose lui-même (trois formats, six types).
 */

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Bouton, Carte, SqueletteGrille, Vide, cascade, enfantCascade, cx } from "@/components/ui";
import { useSurvolCarte } from "@/hooks/useCoarsePointer";
import { CATALOGUE_WIDGETS, CLASSES_TAILLE, RendreWidget } from "@/components/widgets";
import { useApp, libelleSeance } from "@/lib/useApp";
import { majReglages, type TailleWidget, type TypeWidget, type Widget } from "@/lib/suivi";

export default function Accueil() {
  const { chargement, fiche, seancesDuJour, serie, reglages, rafraichir } = useApp();
  const survolCarte = useSurvolCarte();
  const [edition, setEdition] = useState(false);

  const widgets = reglages.widgets;
  const repos = seancesDuJour.length === 0;

  const majWidgets = (suivants: Widget[]) => {
    majReglages({ widgets: suivants });
    rafraichir();
  };

  const retirer = (id: string) => majWidgets(widgets.filter((w) => w.id !== id));

  const ajouter = (type: TypeWidget, taille: TailleWidget) => {
    // Identifiant dérivé du contenu et du rang : stable et sans appel impur
    // pendant le rendu (Date.now() est proscrit ici).
    const suffixe = widgets.reduce((n, w) => (w.type === type ? n + 1 : n), 0);
    majWidgets([...widgets, { id: `${type}-${suffixe}`, type, taille }]);
  };

  const changerTaille = (id: string) => {
    majWidgets(widgets.map((w) => {
      if (w.id !== id) return w;
      const dispo = CATALOGUE_WIDGETS.find((c) => c.type === w.type)?.tailles ?? ["petit"];
      const i = dispo.indexOf(w.taille);
      return { ...w, taille: dispo[(i + 1) % dispo.length] };
    }));
  };

  const deplacer = (id: string, sens: -1 | 1) => {
    const i = widgets.findIndex((w) => w.id === id);
    const j = i + sens;
    if (i < 0 || j < 0 || j >= widgets.length) return;
    const copie = [...widgets];
    [copie[i], copie[j]] = [copie[j], copie[i]];
    majWidgets(copie);
  };

  if (chargement) {
    return <SqueletteGrille />;
  }

  if (!fiche) {
    return (
      <motion.div
        variants={cascade}
        initial="initial"
        animate="animate"
        className="space-y-4 sm:space-y-5"
      >
        <motion.section variants={enfantCascade}>
          <Carte fort className="carte-editoriale relative overflow-hidden p-6 sm:p-9">
            {/* Halo corail diffusé dans l'angle : donne la profondeur du verre. */}
            <span
              aria-hidden
              className="pointer-events-none absolute -right-24 -top-28 h-64 w-64 rounded-full
                         bg-[radial-gradient(circle,var(--accent-soft-fort),transparent_70%)] blur-2xl"
            />

            <div className="relative space-y-6">
              <div className="text-center">
                <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent-soft)] text-3xl shadow-soft">
                  ⚒️
                </span>
                <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
                  Bienvenue
                </h1>
                <p className="mt-3 text-base leading-relaxed text-muted text-pretty">
                  18 paramètres suffisent à bâtir un programme complet, calé sur vos vrais
                  horaires et votre matériel. Voici un aperçu de ce qui vous attend.
                </p>
              </div>

              {/* Aperçu visuel des widgets simulés */}
              <div className="mx-auto max-w-3xl">
                <div
                  className="grid gap-3 sm:grid-cols-5"
                  aria-hidden
                  aria-label="Aperçu du tableau de bord"
                >
                  <motion.div
                    animate={{ y: [0, -6, 0] }}
                    transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
                    className="glass glass-sheen col-span-2 self-end rounded-xl2 px-4 py-3"
                  >
                    <p className="text-[0.68rem] font-semibold uppercase tracking-wider text-faint">
                      Zone 2
                    </p>
                    <p className="mt-0.5 text-sm font-bold tnum">132–143 bpm</p>
                    <p className="mt-0.5 text-[0.68rem] text-muted">endurance fondamentale</p>
                  </motion.div>

                  <motion.div
                    animate={{ y: [0, -6, 0] }}
                    transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 0 }}
                    className="glass-strong glass-sheen col-span-3 rounded-xl2 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[0.68rem] font-semibold uppercase tracking-wider text-faint">
                        Mardi
                      </span>
                      <span className="rounded-pill bg-[var(--accent-soft)] px-2 py-0.5 text-[0.66rem] font-medium text-[var(--accent)]">
                        50 min
                      </span>
                    </div>
                    <p className="mt-2 font-semibold">Full body A</p>
                    <div className="mt-3 space-y-1.5">
                      {[
                        ["Traction pronation", "4 × 8"],
                        ["Pompes déclinées", "4 × 10"],
                        ["Squat gobelet", "3 × 12"],
                      ].map(([nom, serie]) => (
                        <div key={nom} className="flex items-center justify-between text-[0.78rem]">
                          <span className="text-muted">{nom}</span>
                          <span className="tnum font-medium">{serie}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-pill bg-[var(--surface-2)]">
                      <div
                        className="h-full w-[68%] rounded-pill bg-[var(--accent)]"
                      />
                    </div>
                  </motion.div>

                  <motion.div
                    animate={{ y: [0, -6, 0] }}
                    transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
                    className="glass glass-sheen col-span-3 mt-3 rounded-xl2 p-4"
                  >
                    <span className="text-[0.68rem] font-semibold uppercase tracking-wider text-faint">
                      Aujourd&apos;hui
                    </span>
                    <p className="chiffre mt-1 valeur-sm leading-none">
                      2 020<span className="unite ml-1.5 text-[0.5rem]">kcal</span>
                    </p>
                    <div className="mt-3 flex h-2 overflow-hidden rounded-pill">
                      <div className="w-[32%] bg-[var(--data-proteines)]" />
                      <div className="w-[42%] bg-[var(--data-glucides)]" />
                      <div className="w-[26%] bg-[var(--data-lipides)]" />
                    </div>
                    <div className="mt-2 flex justify-between text-[0.68rem] text-muted">
                      <span>P 164 g</span>
                      <span>G 213 g</span>
                      <span>L 57 g</span>
                    </div>
                  </motion.div>

                  <motion.div
                    animate={{ y: [0, -6, 0] }}
                    transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1.8 }}
                    className="glass-strong col-span-2 mt-3 flex items-center gap-3 self-start rounded-xl2 px-4 py-3"
                  >
                    <span className="text-xl">💧</span>
                    <div>
                      <p className="text-sm font-bold tnum leading-none">2,6 L</p>
                      <p className="mt-0.5 text-[0.68rem] leading-tight text-muted">
                        réparties sur 9 points
                      </p>
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* Arguments de valeur */}
              <div className="mx-auto max-w-3xl">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4 transition hover:border-[var(--border-strong)] hover:shadow-soft">
                    <span className="text-2xl">🎯</span>
                    <h3 className="mt-2 text-sm font-bold text-ink">Objectif précis</h3>
                    <p className="mt-1 text-xs leading-relaxed text-muted">
                      Perte de gras, prise de muscle, force, endurance ou recomposition : le programme s&apos;adapte à votre objectif.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4 transition hover:border-[var(--border-strong)] hover:shadow-soft">
                    <span className="text-2xl">⏱️</span>
                    <h3 className="mt-2 text-sm font-bold text-ink">Horaires réels</h3>
                    <p className="mt-1 text-xs leading-relaxed text-muted">
                      Séances calées sur vos heures de réveil, travail et disponibilités. Le moteur trouve les créneaux qui tiennent.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4 transition hover:border-[var(--border-strong)] hover:shadow-soft">
                    <span className="text-2xl">🧩</span>
                    <h3 className="mt-2 text-sm font-bold text-ink">Tableau de bord vivant</h3>
                    <p className="mt-1 text-xs leading-relaxed text-muted">
                      Six types de widgets, trois formats. Ajoutez, retirez ou réorganisez à tout moment selon vos priorités.
                    </p>
                  </div>
                </div>
              </div>

              {/* CTA */}
              <div className="text-center">
                <Link href="/profil">
                  <Bouton taille="lg" className="shadow-soft hover:shadow-lift">
                    Créer mon programme
                  </Bouton>
                </Link>
                <p className="mt-3 text-xs text-muted">
                  Gratuit. 5 étapes. Résultat immédiat.
                </p>
              </div>
            </div>
          </Carte>
        </motion.section>
      </motion.div>
    );
  }

  return (
    <motion.div variants={cascade} initial="initial" animate="animate" className="space-y-4 sm:space-y-5">
      {/* -------------------------- En-tête série -------------------------- */}
      <motion.section variants={enfantCascade}>
        <Carte fort className="carte-editoriale relative overflow-hidden p-6 sm:p-9">
          {/* Halo corail diffusé dans l'angle : donne la profondeur du verre.
              Purement décoratif, donc insensible au pointeur. */}
          <span
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-28 h-64 w-64 rounded-full
                       bg-[radial-gradient(circle,var(--accent-soft-fort),transparent_70%)] blur-2xl"
          />

          <div className="relative flex flex-wrap items-center gap-x-7 gap-y-5">
            <div className="flex items-center gap-3.5">
              <motion.span
                className="text-4xl"
                animate={serie > 0 ? { scale: [1, 1.06, 1] } : {}}
                transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
              >
                🔥
              </motion.span>
              <div>
                <p className="chiffre valeur-md leading-none">{serie}</p>
                <p className="mt-1.5 text-xs text-muted">
                  {`séance${serie > 1 ? "s" : ""} d'affilée`}
                </p>
              </div>
            </div>

            <div className="h-14 w-px bg-[var(--border-strong)] max-sm:hidden" />

            <div className="min-w-0 flex-1">
              <p className="etiquette">Aujourd&apos;hui c&apos;est</p>
              <p className="mt-1.5 text-xl font-light leading-tight text-balance lueur-texte sm:text-3xl">
                {libelleSeance(seancesDuJour)}
              </p>
            </div>

            {!repos && (
              <Link href="/seance" className="max-sm:w-full">
                <Bouton taille="lg" pleineLargeur={true} className="sm:w-auto">
                  Lancer la séance →
                </Bouton>
              </Link>
            )}
          </div>
        </Carte>
      </motion.section>

      {/* ---------------------- Barre d'édition widgets --------------------- */}
      <motion.div
        variants={enfantCascade}
        className="flex items-center justify-between gap-3 px-1 pt-1"
      >
        <h2 className="etiquette">Tableau de bord</h2>
        <Bouton
          variante={edition ? "principal" : "fantome"}
          taille="sm"
          onClick={() => setEdition((e) => !e)}
        >
          {edition ? "Terminer" : "Personnaliser"}
        </Bouton>
      </motion.div>

      {/* ---------------------------- Grille -------------------------------- */}
      <motion.section variants={enfantCascade}>
        {widgets.length === 0 ? (
          <Carte>
            <Vide
              icone="🧩"
              titre="Tableau de bord vide"
              texte="Ajoutez les widgets qui vous sont utiles."
              action={<Bouton onClick={() => setEdition(true)}>Ajouter un widget</Bouton>}
            />
          </Carte>
        ) : (
          <div className="grid auto-rows-[minmax(132px,auto)] grid-cols-2 gap-3 sm:grid-cols-4">
            <AnimatePresence mode="popLayout">
              {widgets.map((w, i) => (
                <motion.div
                  key={w.id}
                  layout
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.94 }}
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  className={cx("relative", CLASSES_TAILLE[w.taille])}
                >
                  <div className={cx("h-full", edition && "pointer-events-none opacity-90")}>
                    <RendreWidget type={w.type} taille={w.taille} />
                  </div>

                  {edition && (
                    <div className="absolute inset-0 z-10 flex flex-col justify-between rounded-xl2 border-2 border-dashed border-[var(--accent)] bg-[var(--accent-soft-fort)] p-2 backdrop-blur-[2px]">
                      <div className="flex justify-between gap-1">
                        <button
                          onClick={() => deplacer(w.id, -1)}
                          disabled={i === 0}
                          aria-label="Déplacer vers la gauche"
                          className="grid h-8 w-8 place-items-center rounded-full bg-[var(--surface)] text-sm shadow-soft transition hover:bg-white disabled:opacity-30"
                        >
                          ←
                        </button>
                        <button
                          onClick={() => retirer(w.id)}
                          aria-label="Retirer le widget"
                          className="grid h-8 w-8 place-items-center rounded-full bg-[var(--danger)] text-sm text-white shadow-soft transition hover:brightness-110"
                        >
                          ×
                        </button>
                      </div>
                      <div className="flex justify-between gap-1">
                        <button
                          onClick={() => changerTaille(w.id)}
                          className="rounded-pill bg-[var(--surface)] px-2.5 py-1.5 text-[0.65rem] font-medium shadow-soft transition hover:bg-white"
                        >
                          ⤢ taille
                        </button>
                        <button
                          onClick={() => deplacer(w.id, 1)}
                          disabled={i === widgets.length - 1}
                          aria-label="Déplacer vers la droite"
                          className="grid h-8 w-8 place-items-center rounded-full bg-[var(--surface)] text-sm shadow-soft transition hover:bg-white disabled:opacity-30"
                        >
                          →
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.section>

      {/* ------------------------ Catalogue en édition ---------------------- */}
      <AnimatePresence>
        {edition && (
          <motion.section
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Carte className="p-4 sm:p-5">
              <h3 className="mb-1 font-semibold">Ajouter un widget</h3>
              <p className="mb-4 text-xs text-muted">
                Touchez ⤢ sur un widget pour changer son format.
              </p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {CATALOGUE_WIDGETS.map((c) => (
                  <button
                    key={c.type}
                    onClick={() => ajouter(c.type, c.tailles[0])}
                    className="flex min-h-14 items-center gap-3 rounded-2xl border border-[var(--border)]
                               bg-[var(--surface-2)] px-4 py-3 text-left
                               transition-[background-color,border-color,box-shadow] duration-200
                               hover:border-[var(--border-strong)] hover:bg-[var(--surface)] hover:shadow-soft"
                  >
                    <span className="text-xl">{c.emoji}</span>
                    <span className="flex-1 text-sm font-medium">{c.nom}</span>
                    <span className="text-lg text-[var(--accent)]">+</span>
                  </button>
                ))}
              </div>
            </Carte>
          </motion.section>
        )}
      </AnimatePresence>

      {/* --------------------------- Accès rapides -------------------------- */}
      <motion.section variants={enfantCascade} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { href: "/nutrition", emoji: "🥗", nom: "Nutrition" },
          { href: "/programme", emoji: "📆", nom: "Programme" },
          { href: "/progres", emoji: "🏆", nom: "Progrès" },
          { href: "/mesures", emoji: "⚖️", nom: "Mesures" },
        ].map((l) => (
          <Link key={l.href} href={l.href} className="rounded-xl2">
            <Carte
              {...survolCarte}
              className="flex min-h-14 items-center gap-2.5 px-4 py-3.5"
            >
              <span className="text-lg">{l.emoji}</span>
              <span className="text-sm font-medium">{l.nom}</span>
            </Carte>
          </Link>
        ))}
      </motion.section>

      {repos && (
        <motion.div variants={enfantCascade}>
          <Carte className="p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <span className="text-xl">🌙</span>
              <p className="text-sm leading-relaxed text-muted text-pretty">
                Journée de récupération : elle fait partie du programme. Marche, sommeil et
                alimentation restent vos leviers du jour.
              </p>
            </div>
          </Carte>
        </motion.div>
      )}
    </motion.div>
  );
}

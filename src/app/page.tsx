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
import { Bouton, Carte, Vide, cascade, enfantCascade, cx } from "@/components/ui";
import { CATALOGUE_WIDGETS, CLASSES_TAILLE, RendreWidget } from "@/components/widgets";
import { useApp, libelleSeance } from "@/lib/useApp";
import { majReglages, type TailleWidget, type TypeWidget, type Widget } from "@/lib/suivi";

export default function Accueil() {
  const { chargement, fiche, seancesDuJour, serie, reglages, rafraichir } = useApp();
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
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent)]" />
      </div>
    );
  }

  if (!fiche) {
    return (
      <Carte>
        <Vide
          icone="🌿"
          titre="Bienvenue"
          texte="Créez votre profil : 18 paramètres suffisent à bâtir un programme complet, calé sur vos vrais horaires et votre matériel."
          action={<Link href="/profil"><Bouton>Créer mon programme</Bouton></Link>}
        />
      </Carte>
    );
  }

  return (
    <motion.div variants={cascade} initial="initial" animate="animate" className="space-y-5">
      {/* -------------------------- En-tête série -------------------------- */}
      <motion.section variants={enfantCascade}>
        <Carte className="relative overflow-hidden p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <div className="flex items-center gap-3">
              <motion.span
                className="text-5xl"
                animate={serie > 0 ? { scale: [1, 1.12, 1] } : {}}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
              >
                🔥
              </motion.span>
              <div>
                <p className="text-4xl font-bold tnum leading-none">{serie}</p>
                <p className="text-xs text-muted">
                  {`séance${serie > 1 ? "s" : ""} d'affilée`}
                </p>
              </div>
            </div>

            <div className="h-12 w-px bg-[var(--border)] max-sm:hidden" />

            <div className="min-w-0 flex-1">
              <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-faint">
                Aujourd&apos;hui c&apos;est
              </p>
              <p className="mt-0.5 text-lg font-bold leading-tight text-balance sm:text-xl">
                {libelleSeance(seancesDuJour)}
              </p>
            </div>

            {!repos && (
              <Link href="/seance">
                <Bouton>Lancer la séance →</Bouton>
              </Link>
            )}
          </div>
        </Carte>
      </motion.section>

      {/* ---------------------- Barre d'édition widgets --------------------- */}
      <motion.div variants={enfantCascade} className="flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-faint">
          Tableau de bord
        </h2>
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
                    <div className="absolute inset-0 z-10 flex flex-col justify-between rounded-xl2 border-2 border-dashed border-[var(--accent)] bg-[var(--accent-soft)]/60 p-2">
                      <div className="flex justify-between gap-1">
                        <button
                          onClick={() => deplacer(w.id, -1)}
                          disabled={i === 0}
                          aria-label="Déplacer vers la gauche"
                          className="grid h-7 w-7 place-items-center rounded-full bg-[var(--surface)] text-sm shadow-soft disabled:opacity-30"
                        >
                          ←
                        </button>
                        <button
                          onClick={() => retirer(w.id)}
                          aria-label="Retirer le widget"
                          className="grid h-7 w-7 place-items-center rounded-full bg-[var(--danger)] text-sm text-white shadow-soft"
                        >
                          ×
                        </button>
                      </div>
                      <div className="flex justify-between gap-1">
                        <button
                          onClick={() => changerTaille(w.id)}
                          className="rounded-pill bg-[var(--surface)] px-2 py-1 text-[0.65rem] font-medium shadow-soft"
                        >
                          ⤢ taille
                        </button>
                        <button
                          onClick={() => deplacer(w.id, 1)}
                          disabled={i === widgets.length - 1}
                          aria-label="Déplacer vers la droite"
                          className="grid h-7 w-7 place-items-center rounded-full bg-[var(--surface)] text-sm shadow-soft disabled:opacity-30"
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
            <Carte className="p-5">
              <h3 className="mb-1 font-semibold">Ajouter un widget</h3>
              <p className="mb-4 text-xs text-muted">
                Touchez ⤢ sur un widget pour changer son format.
              </p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {CATALOGUE_WIDGETS.map((c) => (
                  <button
                    key={c.type}
                    onClick={() => ajouter(c.type, c.tailles[0])}
                    className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-left transition hover:border-[var(--accent)]"
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
          <Link key={l.href} href={l.href}>
            <Carte
              whileHover={{ y: -3 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
              className="flex items-center gap-2.5 px-4 py-3"
            >
              <span className="text-lg">{l.emoji}</span>
              <span className="text-sm font-medium">{l.nom}</span>
            </Carte>
          </Link>
        ))}
      </motion.section>

      {repos && (
        <motion.div variants={enfantCascade}>
          <Carte className="p-5">
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

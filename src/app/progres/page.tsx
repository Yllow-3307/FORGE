"use client";

/**
 * progres/page.tsx — Écran Progrès.
 *
 * Deux volets :
 *   « Toi »        : les skills que l'utilisateur travaille activement ;
 *   « Les skills » : le catalogue complet, avec les paliers de chaque figure.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Bouton, Carte, Pastille, Vide, cx } from "@/components/ui";
import { useApp } from "@/lib/useApp";
import {
  FAMILLES, SKILLS, skillsDuProgramme, type Skill,
} from "@/lib/donnees/skills";
import {
  lireSkills, majSkill, progresSkill, reculerEtape, validerEtape,
} from "@/lib/suivi";
import { useVersionStockage } from "@/lib/store";

function BarreEtapes({ etape, total }: { etape: number; total: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={cx(
            "h-1.5 flex-1 rounded-pill transition-colors",
            i < etape ? "bg-[var(--accent)]" : "bg-[var(--surface-2)]",
          )}
        />
      ))}
    </div>
  );
}

function CarteSkill({
  skill, ouvert, onToggle, onMaj,
}: {
  skill: Skill; ouvert: boolean; onToggle: () => void; onMaj: () => void;
}) {
  const p = progresSkill(skill.id);
  const total = skill.etapes.length;
  const maitrise = p.etape >= total;

  return (
    <Carte className="overflow-hidden">
      <button
        onClick={onToggle}
        aria-expanded={ouvert}
        className="flex w-full items-center gap-4 p-5 text-left"
      >
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[var(--surface-2)] text-2xl">
          {skill.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold">{skill.nom}</p>
            {maitrise && <Pastille ton="accent">maîtrisé</Pastille>}
            {p.actif && !maitrise && <Pastille ton="accent">en cours</Pastille>}
          </div>
          <p className="mt-0.5 text-xs text-muted">
            Étape {Math.min(p.etape + (maitrise ? 0 : 1), total)}/{total}
            {" · "}
            {"★".repeat(skill.difficulte)}
            <span className="text-faint">{"★".repeat(5 - skill.difficulte)}</span>
          </p>
          <div className="mt-2">
            <BarreEtapes etape={p.etape} total={total} />
          </div>
        </div>
        <span className={cx("shrink-0 text-muted transition-transform", ouvert && "rotate-180")}>
          ⌄
        </span>
      </button>

      <AnimatePresence>
        {ouvert && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="border-t border-[var(--border)] px-5 pb-5 pt-4">
              <p className="text-sm leading-relaxed text-muted text-pretty">
                {skill.description}
              </p>
              <p className="mt-2 text-xs text-faint">Prérequis : {skill.prerequis}</p>

              <ol className="mt-4 space-y-2">
                {skill.etapes.map((e, i) => {
                  const faite = i < p.etape;
                  const courante = i === p.etape;
                  return (
                    <li
                      key={i}
                      className={cx(
                        "flex gap-3 rounded-2xl px-3.5 py-2.5",
                        courante ? "bg-[var(--accent-soft)]"
                          : faite ? "bg-[var(--surface-2)] opacity-70" : "bg-[var(--surface-2)]",
                      )}
                    >
                      <span
                        className={cx(
                          "grid h-6 w-6 shrink-0 place-items-center rounded-full text-[0.7rem] font-bold",
                          faite ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
                            : courante ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
                              : "bg-[var(--surface)] text-muted",
                        )}
                      >
                        {faite ? "✓" : i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={cx("text-sm font-medium", faite && "line-through")}>
                          {e.nom}
                        </p>
                        <p className="text-xs text-muted">{e.critere}</p>
                        {courante && (
                          <p className="mt-1 text-xs italic text-[var(--accent)]">
                            {e.conseil}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>

              <div className="mt-4 flex flex-wrap gap-2">
                {!maitrise && (
                  <Bouton
                    taille="sm"
                    onClick={() => { validerEtape(skill.id, total); onMaj(); }}
                  >
                    Valider l&apos;étape {p.etape + 1}
                  </Bouton>
                )}
                {p.etape > 0 && (
                  <Bouton
                    taille="sm" variante="fantome"
                    onClick={() => { reculerEtape(skill.id); onMaj(); }}
                  >
                    Revenir en arrière
                  </Bouton>
                )}
                <Bouton
                  taille="sm"
                  variante={p.actif ? "danger" : "doux"}
                  onClick={() => { majSkill(skill.id, { actif: !p.actif }); onMaj(); }}
                >
                  {p.actif ? "Retirer de mon suivi" : "Suivre ce skill"}
                </Bouton>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Carte>
  );
}

export default function PageProgres() {
  const { chargement, fiche, programme, rafraichir } = useApp();
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [famille, setFamille] = useState<string>("toutes");
  const version = useVersionStockage();

  const onMaj = () => rafraichir();

  /** Patterns moteur réellement présents dans les séances du cycle. */
  const patternsTravailles = useMemo(() => {
    if (!programme) return [];
    const vus = new Set<string>();
    for (const sem of programme.cycle) {
      for (const j of sem.jours) {
        for (const seance of j.seances) {
          for (const b of seance.blocs) {
            if (b.role === "principal" || b.role === "accessoire") vus.add(b.pattern);
          }
        }
      }
    }
    return [...vus];
  }, [programme]);

  const duProgramme = useMemo(() => {
    if (!programme) return [];
    return skillsDuProgramme(
      patternsTravailles,
      programme.profil.niveauSportif,
      programme.profil.equipement as string[],
    );
  }, [programme, patternsTravailles]);

  // Les skills travaillés par le programme rejoignent le suivi sans action
  // de l'utilisateur : c'est ce qu'il entraîne déjà, autant le lui montrer.
  useEffect(() => {
    if (!duProgramme.length) return;
    const connus = new Set(lireSkills().map((s) => s.skillId));
    const nouveaux = duProgramme.filter((s) => !connus.has(s.id));
    if (!nouveaux.length) return;
    nouveaux.forEach((s) => majSkill(s.id, { actif: true, auto: true }));
  }, [duProgramme]);

  const suivis = useMemo(() => {
    void version;
    return lireSkills()
      .filter((s) => s.actif)
      .map((a) => SKILLS.find((s) => s.id === a.skillId))
      .filter((s): s is Skill => Boolean(s));
  }, [version]);

  const recommandes = useMemo(
    () => duProgramme.filter((s) => !suivis.some((x) => x.id === s.id)).slice(0, 3),
    [duProgramme, suivis],
  );

  const catalogue = useMemo(
    () => (famille === "toutes" ? SKILLS : SKILLS.filter((s) => s.famille === famille)),
    [famille],
  );

  if (chargement) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent)]" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* ------------------------------- Toi ------------------------------ */}
      <section className="space-y-3">
        <h1 className="px-1 text-sm font-semibold uppercase tracking-wider text-faint">Toi</h1>

        {suivis.length === 0 ? (
          <Carte>
            <Vide
              icone="🎯"
              titre="Aucun skill suivi"
              texte="Dès qu'un programme est généré, les figures qu'il entraîne apparaissent ici automatiquement."
            />
          </Carte>
        ) : (
          <>
            <Carte className="p-4 sm:p-5">
              <p className="text-sm font-medium">Tu travailles ça, toi</p>
              <p className="mt-0.5 text-xs text-muted text-pretty">
                Ajoutés automatiquement d&apos;après les mouvements de ton programme.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {suivis.map((s) => {
                  const p = progresSkill(s.id);
                  return (
                    <span
                      key={s.id}
                      className="flex items-center gap-2 rounded-pill bg-[var(--accent-soft)] px-3 py-1.5 text-sm"
                    >
                      <span>{s.emoji}</span>
                      <span className="font-medium">{s.nom}</span>
                      <span className="text-xs tnum text-muted">
                        {Math.min(p.etape + 1, s.etapes.length)}/{s.etapes.length}
                      </span>
                    </span>
                  );
                })}
              </div>
            </Carte>

            {suivis.map((s) => (
              <CarteSkill
                key={s.id} skill={s}
                ouvert={ouvert === s.id}
                onToggle={() => setOuvert(ouvert === s.id ? null : s.id)}
                onMaj={onMaj}
              />
            ))}
          </>
        )}
      </section>

      {/* -------------------------- Recommandés --------------------------- */}
      {recommandes.length > 0 && fiche && (
        <section className="space-y-3">
          <h2 className="px-1 text-sm font-semibold uppercase tracking-wider text-faint">
            Aussi travaillés par ton programme
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {recommandes.map((s) => (
              <Carte key={s.id} className="p-5">
                <span className="text-2xl">{s.emoji}</span>
                <p className="mt-2 font-semibold">{s.nom}</p>
                <p className="mt-1 text-xs text-muted text-pretty">{s.prerequis}</p>
                <Bouton
                  taille="sm" variante="doux" className="mt-3"
                  onClick={() => { majSkill(s.id, { actif: true }); onMaj(); }}
                >
                  Suivre
                </Bouton>
              </Carte>
            ))}
          </div>
        </section>
      )}

      {/* ---------------------------- Catalogue --------------------------- */}
      <section className="space-y-3">
        <h2 className="px-1 text-sm font-semibold uppercase tracking-wider text-faint">
          Tous les skills
        </h2>

        <div className="flex flex-wrap gap-2 px-1">
          <button
            onClick={() => setFamille("toutes")}
            className={cx(
              "rounded-pill px-3 py-1.5 text-xs font-medium transition",
              famille === "toutes"
                ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
                : "bg-[var(--surface-2)] text-muted",
            )}
          >
            Toutes
          </button>
          {FAMILLES.map((f) => (
            <button
              key={f.id}
              onClick={() => setFamille(f.id)}
              className={cx(
                "rounded-pill px-3 py-1.5 text-xs font-medium transition",
                famille === f.id
                  ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
                  : "bg-[var(--surface-2)] text-muted",
              )}
            >
              {f.emoji} {f.nom}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {catalogue.map((s) => (
            <CarteSkill
              key={s.id} skill={s}
              ouvert={ouvert === s.id}
              onToggle={() => setOuvert(ouvert === s.id ? null : s.id)}
              onMaj={onMaj}
            />
          ))}
        </div>
      </section>

      {!fiche && (
        <Carte className="p-4 sm:p-5">
          <p className="text-sm text-muted text-pretty">
            Créez votre profil pour obtenir des recommandations adaptées à votre niveau
            et à votre matériel.{" "}
            <Link href="/profil" className="font-medium text-[var(--accent)] underline">
              Créer mon profil
            </Link>
          </p>
        </Carte>
      )}
    </div>
  );
}

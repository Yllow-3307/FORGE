"use client";

/**
 * mesures/page.tsx — Écran Mesures.
 *
 * Enregistrement d'une pesée (poids, taille, énergie ressentie) et courbe
 * d'évolution. Une moyenne mobile sur 7 jours est superposée : les variations
 * quotidiennes reflètent surtout l'eau, pas la masse grasse.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Bouton, Carte, Champ, Pastille, Saisie, Vide, cx } from "@/components/ui";
import { useApp } from "@/lib/useApp";
import {
  enregistrerFiche, enregistrerPoids, listerPoids, supprimerPoids, type MesurePoids,
} from "@/lib/stockage";
import { aujourdhui, dateFr, majJour } from "@/lib/suivi";

/** Moyenne mobile centrée sur `fenetre` points. */
function moyenneMobile(valeurs: number[], fenetre = 7): number[] {
  return valeurs.map((_, i) => {
    const debut = Math.max(0, i - fenetre + 1);
    const tranche = valeurs.slice(debut, i + 1);
    return tranche.reduce((a, b) => a + b, 0) / tranche.length;
  });
}

export default function PageMesures() {
  const { chargement, fiche, profil, rafraichir } = useApp();
  const [mesures, setMesures] = useState<MesurePoids[]>([]);
  const [poids, setPoids] = useState("");
  const [taille, setTaille] = useState("");
  const [energie, setEnergie] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [enregistrement, setEnregistrement] = useState(false);
  const [message, setMessage] = useState("");
  const [aSupprimer, setASupprimer] = useState<string | null>(null);

  // Chargement de l'historique (système externe : c'est bien le rôle d'un effet).
  useEffect(() => {
    if (!fiche) return;
    let annule = false;
    listerPoids(fiche.id)
      .then((m) => { if (!annule) setMesures(m); })
      .catch(() => { if (!annule) setMesures([]); });
    return () => { annule = true; };
  }, [fiche]);

  // Pré-remplissage des champs dès que la fiche est connue : on dérive l'état
  // pendant le rendu plutôt que via un effet, qui provoquerait un rendu
  // intermédiaire avec des champs vides.
  const [ficheVue, setFicheVue] = useState<string | null>(null);
  if (fiche && ficheVue !== fiche.id) {
    setFicheVue(fiche.id);
    setPoids(String(fiche.profil.poids));
    setTaille(String(fiche.profil.taille));
  }

  const stats = useMemo(() => {
    if (mesures.length === 0) return null;
    const valeurs = mesures.map((m) => m.poids);
    const lissees = moyenneMobile(valeurs);
    const premier = valeurs[0];
    const dernier = valeurs.at(-1)!;
    const min = Math.min(...valeurs);
    const max = Math.max(...valeurs);
    const amplitude = max - min || 1;

    const point = (v: number, i: number) => ({
      x: mesures.length > 1 ? (i / (mesures.length - 1)) * 100 : 50,
      y: 100 - ((v - min) / amplitude) * 90 - 5,
    });

    const trace = (vals: number[]) =>
      vals.map((v, i) => {
        const p = point(v, i);
        return `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`;
      }).join(" ");

    return {
      delta: Math.round((dernier - premier) * 10) / 10,
      dernier, min, max,
      cheminBrut: trace(valeurs),
      cheminLisse: mesures.length >= 3 ? trace(lissees) : "",
      points: valeurs.map((v, i) => ({ ...point(v, i), valeur: v, date: mesures[i].date })),
    };
  }, [mesures]);

  const enregistrer = async () => {
    if (!fiche) return;
    const p = Number(poids);
    if (!Number.isFinite(p) || p < 30 || p > 300) {
      setMessage("Le poids doit être compris entre 30 et 300 kg.");
      return;
    }
    setEnregistrement(true);
    setMessage("");

    await enregistrerPoids({ ficheId: fiche.id, date: aujourdhui(), poids: p });

    // Le poids alimente les calculs du moteur : on met le profil à jour.
    const t = Number(taille);
    const profilMaj = {
      ...fiche.profil,
      poids: p,
      taille: Number.isFinite(t) && t >= 120 && t <= 230 ? t : fiche.profil.taille,
    };
    await enregistrerFiche(profilMaj, fiche.id);
    majJour(aujourdhui(), { energie });

    const suivantes = await listerPoids(fiche.id);
    setMesures(suivantes);
    setEnregistrement(false);
    setMessage("Pesée enregistrée. Vos cibles ont été recalculées.");
    rafraichir();
  };

  const supprimer = async (id: string) => {
    await supprimerPoids(id);
    if (fiche) setMesures(await listerPoids(fiche.id));
    setASupprimer(null);
    setMessage("Pesée supprimée.");
    rafraichir();
  };

  if (chargement) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent)]" />
      </div>
    );
  }

  if (!fiche || !profil) {
    return (
      <Carte>
        <Vide
          icone="⚖️" titre="Aucun profil"
          texte="Créez votre profil pour enregistrer vos mesures."
          action={<Link href="/profil"><Bouton>Créer mon profil</Bouton></Link>}
        />
      </Carte>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* ---------------------------- Nouvelle pesée --------------------- */}
      <Carte className="p-5 sm:p-6">
        <h1 className="text-lg font-bold">Pèse-toi</h1>
        <p className="mt-1 text-sm text-muted text-pretty">
          Idéalement le matin à jeun, après passage aux toilettes. Une seule pesée par jour
          est enregistrée : la dernière remplace la précédente.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Champ label="Poids (kg)">
            <Saisie
              type="number" step="0.1" min={30} max={300}
              value={poids} onChange={(e) => setPoids(e.target.value)}
            />
          </Champ>
          <Champ label="Taille (cm)" aide="Rarement à modifier">
            <Saisie
              type="number" min={120} max={230}
              value={taille} onChange={(e) => setTaille(e.target.value)}
            />
          </Champ>
        </div>

        <div className="mt-4">
          <p className="mb-2 text-sm font-medium text-muted">Énergie ressentie</p>
          <div className="flex gap-2">
            {([1, 2, 3, 4, 5] as const).map((n) => (
              <button
                key={n}
                onClick={() => setEnergie(n)}
                aria-label={`Énergie ${n} sur 5`}
                className={cx(
                  "h-12 flex-1 rounded-2xl border text-xl transition",
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

        {message && (
          <p
            className={cx(
              "mt-4 rounded-2xl px-4 py-3 text-sm",
              message.startsWith("Pesée")
                ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                : "bg-[var(--danger-soft)] text-[var(--danger)]",
            )}
          >
            {message}
          </p>
        )}

        <Bouton
          className="mt-4" pleineLargeur onClick={enregistrer} disabled={enregistrement}
        >
          {enregistrement ? "Enregistrement…" : "Enregistrer la pesée"}
        </Bouton>
      </Carte>

      {/* ------------------------------ Courbe --------------------------- */}
      <Carte className="p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-bold">Évolution du poids</h2>
          {stats && mesures.length > 1 && (
            <Pastille ton={stats.delta < 0 ? "accent" : stats.delta > 0 ? "warn" : "neutre"}>
              {stats.delta > 0 ? "+" : ""}{stats.delta} kg depuis le début
            </Pastille>
          )}
        </div>

        {!stats || mesures.length < 2 ? (
          <Vide
            icone="📈"
            titre={mesures.length === 1 ? "Une seule pesée" : "Aucune pesée"}
            texte="Enregistrez au moins deux pesées pour voir la tendance se dessiner."
          />
        ) : (
          <>
            <div className="relative">
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-56 w-full">
                {[0, 25, 50, 75, 100].map((y) => (
                  <line
                    key={y} x1="0" y1={y} x2="100" y2={y}
                    stroke="var(--border)" strokeWidth="0.4" vectorEffect="non-scaling-stroke"
                  />
                ))}
                {stats.cheminLisse && (
                  <path
                    d={stats.cheminLisse} fill="none" stroke="var(--accent)"
                    strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke" opacity={0.9}
                  />
                )}
                <motion.path
                  d={stats.cheminBrut} fill="none" stroke="var(--text-faint)"
                  strokeWidth="1.5" strokeDasharray="3 3" strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                  initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                  transition={{ duration: 1.1, ease: "easeOut" }}
                />
              </svg>

              <div className="pointer-events-none absolute inset-y-0 right-0 flex flex-col justify-between py-1 text-[0.65rem] tnum text-faint">
                <span>{stats.max} kg</span>
                <span>{stats.min} kg</span>
              </div>
            </div>

            <div className="mt-2 flex justify-between text-[0.65rem] text-faint">
              <span>{dateFr(mesures[0].date)}</span>
              <span>{dateFr(mesures.at(-1)!.date)}</span>
            </div>

            <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted">
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-5 bg-[var(--accent)]" /> tendance (7 j)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-5 border-t border-dashed border-[var(--text-faint)]" />
                pesées
              </span>
            </div>
          </>
        )}
      </Carte>

      {/* ---------------------------- Historique -------------------------- */}
      {mesures.length > 0 && (
        <Carte className="p-5 sm:p-6">
          <h2 className="mb-3 font-bold">Historique</h2>
          <ul className="space-y-1.5">
            {[...mesures].reverse().slice(0, 15).map((m, i, arr) => {
              const precedent = arr[i + 1];
              const delta = precedent ? Math.round((m.poids - precedent.poids) * 10) / 10 : 0;
              return (
                <li
                  key={m.id}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-[var(--surface-2)] px-4 py-2.5 text-sm"
                >
                  <span className="text-muted">{dateFr(m.date)}</span>

                  {aSupprimer === m.id ? (
                    <span className="flex items-center gap-2">
                      <span className="text-xs text-muted">Supprimer ?</span>
                      <button
                        onClick={() => supprimer(m.id)}
                        className="rounded-pill bg-[var(--danger)] px-3 py-1 text-xs font-medium text-white"
                      >
                        Oui
                      </button>
                      <button
                        onClick={() => setASupprimer(null)}
                        className="rounded-pill bg-[var(--surface)] px-3 py-1 text-xs"
                      >
                        Non
                      </button>
                    </span>
                  ) : (
                    <span className="flex items-baseline gap-3">
                      <span className="chiffre text-base">{m.poids} kg</span>
                      {precedent && (
                        <span
                          className={cx(
                            "text-xs tnum",
                            delta < 0 ? "text-[var(--accent)]"
                              : delta > 0 ? "text-[var(--warn)]" : "text-faint",
                          )}
                        >
                          {delta > 0 ? "+" : ""}{delta}
                        </span>
                      )}
                      <button
                        onClick={() => setASupprimer(m.id)}
                        aria-label={`Supprimer la pesée du ${dateFr(m.date)}`}
                        className="text-muted transition hover:text-[var(--danger)]"
                      >
                        ×
                      </button>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </Carte>
      )}
    </div>
  );
}

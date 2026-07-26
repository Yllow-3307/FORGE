"use client";

/**
 * parametres/page.tsx — Écran Paramètres.
 *
 * Trois sections : Compte, « On t'emmerde » (notifications) et Gestion du
 * programme. Les actions destructrices demandent une confirmation explicite.
 */

import { useState } from "react";
import Link from "next/link";
import { Bouton, Carte, Champ, Encart, Pastille, Saisie, cx } from "@/components/ui";
import { useTheme } from "@/components/theme";
import { useApp } from "@/lib/useApp";
import {
  effacerToutesDonnees, exporterHistorique, lireJournal, majReglages,
} from "@/lib/suivi";
import {
  enregistrerFiche, stockageDistant, supabase, supprimerFiche, telecharger,
} from "@/lib/stockage";

function Interrupteur({
  actif, onChange, label, description,
}: {
  actif: boolean; onChange: (v: boolean) => void; label: string; description?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={actif}
      onClick={() => onChange(!actif)}
      className="flex w-full items-center gap-4 rounded-2xl bg-[var(--surface-2)] px-4 py-3 text-left"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{label}</span>
        {description && (
          <span className="mt-0.5 block text-xs text-muted text-pretty">{description}</span>
        )}
      </span>
      <span
        className={cx(
          "relative h-6 w-11 shrink-0 rounded-pill transition-colors",
          actif ? "bg-[var(--accent)]" : "bg-[var(--border-strong)]",
        )}
      >
        <span
          className={cx(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all",
            actif ? "left-[1.375rem]" : "left-0.5",
          )}
        />
      </span>
    </button>
  );
}

export default function PageParametres() {
  const { fiche, reglages, programme, rafraichir } = useApp();
  const { theme, toggle } = useTheme();

  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [confirmation, setConfirmation] = useState<"aucune" | "donnees" | "compte">("aucune");
  const [message, setMessage] = useState("");
  const [nbEntrees, setNbEntrees] = useState(0);

  // On synchronise les champs sur les réglages chargés en dérivant l'état
  // pendant le rendu : un effet créerait un rendu intermédiaire avec des
  // champs vides, visible à l'écran.
  const cle = `${reglages.nomUtilisateur}|${reglages.email}|${fiche?.profil.nom ?? ""}`;
  const [cleVue, setCleVue] = useState<string | null>(null);
  if (cleVue !== cle) {
    setCleVue(cle);
    setNom(reglages.nomUtilisateur || fiche?.profil.nom || "");
    setEmail(reglages.email);
    setNbEntrees(lireJournal().length);
  }

  const sauverCompte = () => {
    majReglages({ nomUtilisateur: nom, email });
    if (fiche) enregistrerFiche({ ...fiche.profil, nom: nom || "Client" }, fiche.id);
    setMessage("Informations enregistrées.");
    rafraichir();
    setTimeout(() => setMessage(""), 3000);
  };

  const majNotif = (cle: keyof typeof reglages.notifications, valeur: boolean) => {
    majReglages({ notifications: { ...reglages.notifications, [cle]: valeur } });
    rafraichir();
  };

  const exporter = () => {
    telecharger(
      exporterHistorique(),
      `callisthenic-historique-${new Date().toISOString().slice(0, 10)}.json`,
    );
  };

  const seDeconnecter = async () => {
    const sb = supabase();
    if (sb) await sb.auth.signOut();
    window.location.href = "/";
  };

  const supprimerCompte = async () => {
    if (fiche) await supprimerFiche(fiche.id);
    effacerToutesDonnees();
    const sb = supabase();
    if (sb) await sb.auth.signOut();
    window.location.href = "/";
  };

  return (
    <div className="space-y-5">
      {/* ------------------------------ Compte ---------------------------- */}
      <section className="space-y-3">
        <h1 className="px-1 text-sm font-semibold uppercase tracking-wider text-faint">Compte</h1>

        <Carte className="space-y-4 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Champ label="Nom d'utilisateur">
              <Saisie value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Votre nom" />
            </Champ>
            <Champ
              label="Adresse e-mail"
              aide={stockageDistant() ? undefined : "Utile seulement avec la synchronisation activée"}
            >
              <Saisie
                type="email" value={email}
                onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.fr"
              />
            </Champ>
          </div>

          {message && (
            <p className="rounded-2xl bg-[var(--accent-soft)] px-4 py-2.5 text-sm text-[var(--accent)]">
              {message}
            </p>
          )}

          <Bouton onClick={sauverCompte}>Enregistrer</Bouton>
        </Carte>

        <Carte className="p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Mot de passe</p>
              <p className="mt-0.5 text-xs text-muted">
                {stockageDistant()
                  ? "Modifiable depuis votre espace de connexion."
                  : "Aucun compte n'est nécessaire : vos données restent sur cet appareil."}
              </p>
            </div>
            <Bouton variante="fantome" taille="sm" disabled={!stockageDistant()}>
              Modifier
            </Bouton>
          </div>
        </Carte>

        <Carte className="p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Apparence</p>
              <p className="mt-0.5 text-xs text-muted">
                Thème {theme === "dark" ? "sombre" : "clair"} actif
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { if (theme === "dark") toggle(); }}
                className={cx(
                  "rounded-pill px-4 py-2 text-sm font-medium transition",
                  theme === "light"
                    ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
                    : "bg-[var(--surface-2)] text-muted",
                )}
              >
                ☀️ Clair
              </button>
              <button
                onClick={() => { if (theme === "light") toggle(); }}
                className={cx(
                  "rounded-pill px-4 py-2 text-sm font-medium transition",
                  theme === "dark"
                    ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
                    : "bg-[var(--surface-2)] text-muted",
                )}
              >
                🌙 Sombre
              </button>
            </div>
          </div>
        </Carte>

        <Carte className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Historique des données</p>
              <p className="mt-0.5 text-xs text-muted">
                {nbEntrees} journée{nbEntrees > 1 ? "s" : ""} enregistrée{nbEntrees > 1 ? "s" : ""}
                {" · "}
                {stockageDistant() ? "synchronisées" : "stockées sur cet appareil"}
              </p>
            </div>
            <div className="flex gap-2">
              <Bouton variante="fantome" taille="sm" onClick={exporter}>
                Exporter (JSON)
              </Bouton>
              <Bouton
                variante="danger" taille="sm"
                onClick={() => setConfirmation(confirmation === "donnees" ? "aucune" : "donnees")}
              >
                Effacer
              </Bouton>
            </div>
          </div>

          {confirmation === "donnees" && (
            <div className="mt-4 space-y-3">
              <Encart ton="danger" titre="Effacer tout l'historique ?">
                Séances, repas, pesées et progression des skills seront définitivement perdus.
                Pensez à exporter vos données avant.
              </Encart>
              <div className="flex gap-2">
                <Bouton
                  variante="danger" taille="sm"
                  onClick={() => {
                    effacerToutesDonnees();
                    setConfirmation("aucune");
                    window.location.reload();
                  }}
                >
                  Oui, tout effacer
                </Bouton>
                <Bouton variante="fantome" taille="sm" onClick={() => setConfirmation("aucune")}>
                  Annuler
                </Bouton>
              </div>
            </div>
          )}
        </Carte>

        <Carte className="p-6">
          <div className="flex flex-wrap gap-3">
            <Bouton variante="fantome" onClick={seDeconnecter}>Se déconnecter</Bouton>
            <Bouton
              variante="danger"
              onClick={() => setConfirmation(confirmation === "compte" ? "aucune" : "compte")}
            >
              Supprimer le compte
            </Bouton>
          </div>

          {confirmation === "compte" && (
            <div className="mt-4 space-y-3">
              <Encart ton="danger" titre="Supprimer définitivement le compte ?">
                Le profil, le programme et l&apos;intégralité de l&apos;historique seront
                supprimés. Cette action est irréversible.
              </Encart>
              <div className="flex gap-2">
                <Bouton variante="danger" taille="sm" onClick={supprimerCompte}>
                  Oui, supprimer mon compte
                </Bouton>
                <Bouton variante="fantome" taille="sm" onClick={() => setConfirmation("aucune")}>
                  Annuler
                </Bouton>
              </div>
            </div>
          )}
        </Carte>
      </section>

      {/* -------------------------- Notifications ------------------------- */}
      <section className="space-y-3">
        <h2 className="px-1 text-sm font-semibold uppercase tracking-wider text-faint">
          On t&apos;emmerde
        </h2>
        <Carte className="space-y-2.5 p-6">
          <p className="mb-2 text-sm text-muted text-pretty">
            Choisissez ce dont vous voulez être averti. Tout est désactivable :
            un rappel ignoré est un rappel inutile.
          </p>
          <Interrupteur
            label="Rappel de séance"
            description="Le jour d'une séance, à l'heure du créneau planifié."
            actif={reglages.notifications.seance}
            onChange={(v) => majNotif("seance", v)}
          />
          <Interrupteur
            label="Rappel des repas"
            description="Aux heures de repas calculées par le programme."
            actif={reglages.notifications.repas}
            onChange={(v) => majNotif("repas", v)}
          />
          <Interrupteur
            label="Rappel d'hydratation"
            description="Toutes les deux heures pendant la journée d'éveil."
            actif={reglages.notifications.hydratation}
            onChange={(v) => majNotif("hydratation", v)}
          />
          <Interrupteur
            label="Bilan hebdomadaire"
            description="Un récapitulatif de la semaine, le dimanche soir."
            actif={reglages.notifications.bilanHebdo}
            onChange={(v) => majNotif("bilanHebdo", v)}
          />

          <p className="pt-2 text-xs text-faint text-pretty">
            Les notifications système nécessitent l&apos;autorisation du navigateur et ne
            fonctionnent que lorsque l&apos;application est installée sur l&apos;écran d&apos;accueil.
          </p>
        </Carte>
      </section>

      {/* ----------------------- Gestion du programme --------------------- */}
      <section className="space-y-3">
        <h2 className="px-1 text-sm font-semibold uppercase tracking-wider text-faint">
          Gestion du programme
        </h2>
        <Carte className="p-6">
          {programme ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Pastille ton="accent">
                  {programme.profil.objectif.replace(/_/g, " ")}
                </Pastille>
                <Pastille>{programme.profil.niveauSportif}</Pastille>
                <Pastille>{programme.profil.seancesParSemaine} séances/sem</Pastille>
                <Pastille>{programme.meta.dureeCycle} semaines</Pastille>
              </div>
              <p className="mt-3 text-sm text-muted text-pretty">
                Changer de programme conserve l&apos;intégralité de votre historique :
                séances réalisées, pesées et progression des skills sont préservées.
                Seul le plan d&apos;entraînement est recalculé.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link href="/profil">
                  <Bouton>Changer de programme</Bouton>
                </Link>
                <Bouton variante="fantome" onClick={exporter}>
                  Sauvegarder mes données
                </Bouton>
              </div>
            </>
          ) : (
            <div className="text-sm text-muted">
              Aucun programme actif.{" "}
              <Link href="/profil" className="font-medium text-[var(--accent)] underline">
                En créer un
              </Link>
            </div>
          )}
        </Carte>
      </section>

      {/* ------------------------------ Version --------------------------- */}
      <Carte className="p-6">
        <h2 className="font-bold">Version de l&apos;application</h2>
        <dl className="mt-3 space-y-1.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Application web</dt>
            <dd className="tnum">1.0.0</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Moteur de programmation</dt>
            <dd className="tnum">{programme?.meta.moteur ?? "—"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Stockage</dt>
            <dd>{stockageDistant() ? "Supabase (synchronisé)" : "Local (cet appareil)"}</dd>
          </div>
        </dl>
        <p className="mt-4 text-xs leading-relaxed text-faint text-pretty">
          Les valeurs produites (calories, fréquences cardiaques, charges) sont des estimations
          de départ, à ajuster selon les résultats observés. Cette application ne remplace pas
          un avis médical.
        </p>
      </Carte>
    </div>
  );
}

"use client";

/**
 * parametres/page.tsx — Écran Paramètres.
 *
 * Trois sections : Compte, « Rappels & notifications » et Gestion du
 * programme. Les actions destructrices demandent une confirmation explicite.
 */

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bouton, Carte, Champ, Encart, Pastille, Saisie, cx } from "@/components/ui";
import { useTheme } from "@/components/theme";
import { useApp } from "@/lib/useApp";
import {
  effacerToutesDonnees, exporterHistorique, lireJournal, majReglages,
} from "@/lib/suivi";
import {
  enregistrerFiche, stockageDistant, supprimerFiche, telecharger,
} from "@/lib/stockage";
import { useAuth } from "@/lib/auth";
import {
  demanderPermission, instantanePermission, instantanePermissionServeur,
  notificationTest, souscrirePermission,
} from "@/lib/notifications";
import { useModeInstalle } from "@/components/pwa";
import { derniereSynchro, synchroniser } from "@/lib/synchro";

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
  const router = useRouter();
  const { utilisateur, authDisponible, deconnexion, changerMotDePasse } = useAuth();
  const installe = useModeInstalle();

  // Source externe : instantané serveur distinct, donc pas de divergence
  // d'hydratation ni d'effet superflu.
  const permission = useSyncExternalStore(
    souscrirePermission,
    instantanePermission,
    instantanePermissionServeur,
  );
  const [nouveauMdp, setNouveauMdp] = useState("");
  const [synchroEnCours, setSynchroEnCours] = useState(false);
  const [messageSynchro, setMessageSynchro] = useState("");
  const [messageMdp, setMessageMdp] = useState("");
  const [formMdp, setFormMdp] = useState(false);

  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [confirmation, setConfirmation] = useState<"aucune" | "donnees" | "compte">("aucune");
  const [message, setMessage] = useState("");
  const [nbEntrees, setNbEntrees] = useState(0);

  // On synchronise les champs sur les réglages chargés en dérivant l'état
  // pendant le rendu : un effet créerait un rendu intermédiaire avec des
  // champs vides, visible à l'écran.
  const cle = `${reglages.nomUtilisateur}|${reglages.email}|${fiche?.profil.nom ?? ""}|${utilisateur?.email ?? ""}`;
  const [cleVue, setCleVue] = useState<string | null>(null);
  if (cleVue !== cle) {
    setCleVue(cle);
    setNom(reglages.nomUtilisateur || fiche?.profil.nom || "");
    setEmail(utilisateur?.email ?? reglages.email);
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
      `forge-historique-${new Date().toISOString().slice(0, 10)}.json`,
    );
  };

  const seDeconnecter = async () => {
    await deconnexion();
    router.push("/compte");
  };

  const activerNotifications = async () => {
    const etat = await demanderPermission();
    if (etat === "granted") await notificationTest();
  };

  const lancerSynchro = async () => {
    if (!fiche) return;
    setSynchroEnCours(true);
    setMessageSynchro("");
    const r = await synchroniser(fiche.id);
    setMessageSynchro(r.message);
    setSynchroEnCours(false);
    rafraichir();
  };

  const validerMdp = async () => {
    if (nouveauMdp.length < 8) {
      setMessageMdp("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    const { erreur } = await changerMotDePasse(nouveauMdp);
    setMessageMdp(erreur ?? "Mot de passe mis à jour.");
    if (!erreur) { setNouveauMdp(""); setFormMdp(false); }
  };

  const supprimerCompte = async () => {
    if (fiche) await supprimerFiche(fiche.id);
    effacerToutesDonnees();
    await deconnexion();
    window.location.href = "/";
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* ------------------------------ Compte ---------------------------- */}
      <section className="space-y-3">
        <h1 className="px-1 text-sm font-semibold uppercase tracking-wider text-faint">Compte</h1>

        {authDisponible && (
          <Carte className="p-5 sm:p-6">
            {utilisateur ? (
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[var(--accent-soft)] text-lg">
                    ✅
                  </span>
                  <div>
                    <p className="text-sm font-medium">Compte synchronisé</p>
                    <p className="text-xs text-muted">{utilisateur.email}</p>
                  </div>
                </div>
                <Pastille ton="accent">Données sauvegardées en ligne</Pastille>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Aucun compte connecté</p>
                  <p className="mt-0.5 text-xs text-muted">
                    Connectez-vous pour synchroniser vos données entre appareils.
                  </p>
                </div>
                <Link href="/compte"><Bouton taille="sm">Se connecter</Bouton></Link>
              </div>
            )}
          </Carte>
        )}

        {authDisponible && utilisateur && (
          <Carte className="p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">Synchronisation</p>
                <p className="mt-0.5 text-xs text-muted">
                  {(() => {
                    const d = derniereSynchro();
                    return d
                      ? `Dernière synchronisation : ${d.toLocaleString("fr-FR", {
                          dateStyle: "short", timeStyle: "short",
                        })}`
                      : "Jamais synchronisé sur cet appareil.";
                  })()}
                </p>
              </div>
              <Bouton taille="sm" onClick={lancerSynchro} disabled={synchroEnCours}>
                {synchroEnCours ? "Synchronisation…" : "Synchroniser"}
              </Bouton>
            </div>

            {messageSynchro && (
              <p
                className={cx(
                  "mt-3 rounded-2xl px-4 py-2.5 text-sm",
                  messageSynchro.startsWith("Synchronis") || messageSynchro.startsWith("Tout est")
                    ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                    : "bg-[var(--warn-soft)] text-[var(--warn)]",
                )}
              >
                {messageSynchro}
              </p>
            )}

            <p className="mt-3 text-xs text-faint text-pretty">
              Repas, hydratation, séances réalisées et progression des skills sont
              envoyés sur votre compte. En cas de modification sur deux appareils,
              la version la plus récente est conservée.
            </p>
          </Carte>
        )}

        <Carte className="space-y-4 p-5 sm:p-6">
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

        <Carte className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Mot de passe</p>
              <p className="mt-0.5 text-xs text-muted">
                {utilisateur
                  ? "Choisissez un nouveau mot de passe pour ce compte."
                  : authDisponible
                    ? "Connectez-vous pour gérer votre mot de passe."
                    : "Aucun compte nécessaire : vos données restent sur cet appareil."}
              </p>
            </div>
            <Bouton
              variante="fantome" taille="sm" disabled={!utilisateur}
              onClick={() => setFormMdp((v) => !v)}
            >
              {formMdp ? "Annuler" : "Modifier"}
            </Bouton>
          </div>

          {formMdp && utilisateur && (
            <div className="mt-4 space-y-3">
              <Champ label="Nouveau mot de passe" aide="8 caractères minimum">
                <Saisie
                  type="password" autoComplete="new-password" value={nouveauMdp}
                  onChange={(e) => setNouveauMdp(e.target.value)} placeholder="••••••••"
                />
              </Champ>
              {messageMdp && (
                <p className={cx(
                  "rounded-2xl px-4 py-2.5 text-sm",
                  messageMdp.startsWith("Mot de passe mis")
                    ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                    : "bg-[var(--danger-soft)] text-[var(--danger)]",
                )}>
                  {messageMdp}
                </p>
              )}
              <Bouton taille="sm" onClick={validerMdp}>Enregistrer le mot de passe</Bouton>
            </div>
          )}
        </Carte>

        <Carte className="p-5 sm:p-6">
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

        <Carte className="p-5 sm:p-6">
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

        <Carte className="p-5 sm:p-6">
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
          Rappels &amp; notifications
        </h2>
        <Carte className="space-y-2.5 p-5 sm:p-6">
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

          <div className="mt-4 rounded-2xl border border-[var(--border)] p-4">
            {permission === "indisponible" ? (
              <p className="text-xs text-muted text-pretty">
                Ce navigateur ne prend pas en charge les notifications.
              </p>
            ) : permission === "granted" ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Notifications autorisées</p>
                  <p className="mt-0.5 text-xs text-muted text-pretty">
                    {installe
                      ? "L’application est installée : les rappels fonctionnent en arrière-plan."
                      : "Installez l’application sur votre écran d’accueil pour recevoir les rappels même onglet fermé."}
                  </p>
                </div>
                <Bouton variante="fantome" taille="sm" onClick={notificationTest}>
                  Tester
                </Bouton>
              </div>
            ) : permission === "denied" ? (
              <p className="text-xs text-muted text-pretty">
                Les notifications ont été refusées. Réactivez-les dans les réglages de
                votre navigateur, à la ligne concernant ce site.
              </p>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted text-pretty">
                  Autorisez les notifications pour recevoir les rappels choisis ci-dessus.
                </p>
                <Bouton taille="sm" onClick={activerNotifications}>Autoriser</Bouton>
              </div>
            )}
          </div>

          <p className="pt-2 text-xs text-faint text-pretty">
            Les rappels sont planifiés localement sur votre appareil : aucun serveur
            n&apos;est utilisé, et rien ne quitte votre téléphone.
          </p>
        </Carte>
      </section>

      {/* ----------------------- Gestion du programme --------------------- */}
      <section className="space-y-3">
        <h2 className="px-1 text-sm font-semibold uppercase tracking-wider text-faint">
          Gestion du programme
        </h2>
        <Carte className="p-5 sm:p-6">
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
      <Carte className="p-5 sm:p-6">
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
          <div className="flex justify-between">
            <dt className="text-muted">Mode</dt>
            <dd>{installe ? "Application installée" : "Navigateur"}</dd>
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

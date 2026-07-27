"use client";

/**
 * parametres/page.tsx — Écran Paramètres.
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
import { BlocCompteLocal, BlocAuthentification } from "@/components/authentification";

function Section({ titre, description, id, children }: {
  titre: string; description?: string; id?: string; children: React.ReactNode;
}) {
  return (
    <section id={id} className="space-y-3 scroll-mt-24">
      <h2 className="px-1 text-sm font-semibold uppercase tracking-wider text-faint">{titre}</h2>
      {description && <p className="px-1 text-xs text-faint">{description}</p>}
      {children}
    </section>
  );
}

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
    router.push("/parametres#compte");
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
    <div className="space-y-6 sm:space-y-8">
      {/* Table des matières */}
      <nav className="hidden sm:block" aria-label="Table des matières">
        <ul className="flex flex-wrap gap-1.5">
          {[
            { id: "compte", label: "Compte" },
            { id: "apparence", label: "Apparence" },
            { id: "rappels", label: "Rappels" },
            { id: "programme", label: "Programme" },
            { id: "donnees", label: "Données" },
            { id: "apropos", label: "À propos" },
          ].map((item) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                className="rounded-pill bg-[var(--surface-2)] px-3 py-1.5 text-xs text-muted hover:text-ink"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <Section titre="Compte" description="Sauvegarde et synchronisation de vos données." id="compte">
        {authDisponible ? <BlocAuthentification /> : <BlocCompteLocal />}
        <Carte className="space-y-4 p-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Champ label="Nom d'utilisateur">
              <Saisie value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Votre nom" />
            </Champ>
            <Champ
              label="Adresse e-mail"
              aide={stockageDistant() ? undefined : "Utile seulement avec la synchronisation activée"}
            >
              <Saisie type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.fr" />
            </Champ>
          </div>
          {message && <p className="rounded-2xl bg-[var(--accent-soft)] px-4 py-2.5 text-sm text-[var(--accent)]">{message}</p>}
          <Bouton onClick={sauverCompte}>Enregistrer</Bouton>
        </Carte>
        {authDisponible && utilisateur && (
          <>
            <Carte className="p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">Synchronisation</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {(() => {
                      const d = derniereSynchro();
                      return d ? `Dernière synchronisation : ${d.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}` : "Jamais synchronisé sur cet appareil.";
                    })()}
                  </p>
                </div>
                <Bouton taille="sm" onClick={lancerSynchro} disabled={synchroEnCours}>
                  {synchroEnCours ? "Synchronisation…" : "Synchroniser"}
                </Bouton>
              </div>
              {messageSynchro && (
                <p className={cx("mt-3 rounded-2xl px-4 py-2.5 text-sm", messageSynchro.startsWith("Synchronis") || messageSynchro.startsWith("Tout est") ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "bg-[var(--warn-soft)] text-[var(--warn)]")}>
                  {messageSynchro}
                </p>
              )}
              <p className="mt-3 text-xs text-faint text-pretty">
                Repas, hydratation, séances réalisées et progression des skills sont envoyés sur votre compte.
              </p>
            </Carte>
            <Carte className="p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Mot de passe</p>
                  <p className="mt-0.5 text-xs text-muted">Choisissez un nouveau mot de passe pour ce compte.</p>
                </div>
                <Bouton variante="fantome" taille="sm" disabled={!utilisateur} onClick={() => setFormMdp((v) => !v)}>
                  {formMdp ? "Annuler" : "Modifier"}
                </Bouton>
              </div>
              {formMdp && utilisateur && (
                <div className="mt-4 space-y-3">
                  <Champ label="Nouveau mot de passe" aide="8 caractères minimum">
                    <Saisie type="password" autoComplete="new-password" value={nouveauMdp} onChange={(e) => setNouveauMdp(e.target.value)} placeholder="••••••••" />
                  </Champ>
                  {messageMdp && <p className={cx("rounded-2xl px-4 py-2.5 text-sm", messageMdp.startsWith("Mot de passe mis") ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "bg-[var(--danger-soft)] text-[var(--danger)]")}>{messageMdp}</p>}
                  <Bouton taille="sm" onClick={validerMdp}>Enregistrer le mot de passe</Bouton>
                </div>
              )}
            </Carte>
          </>
        )}
      </Section>

      <Section titre="Apparence" id="apparence">
        <Carte className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Apparence</p>
              <p className="mt-0.5 text-xs text-muted">Thème {theme === "dark" ? "sombre" : "clair"} actif</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { if (theme === "dark") toggle(); }} className={cx("rounded-pill px-4 py-2 text-sm font-medium transition", theme === "light" ? "bg-[var(--accent)] text-[var(--accent-contrast)]" : "bg-[var(--surface-2)] text-muted")}>
                ☀️ Clair
              </button>
              <button onClick={() => { if (theme === "light") toggle(); }} className={cx("rounded-pill px-4 py-2 text-sm font-medium transition", theme === "dark" ? "bg-[var(--accent)] text-[var(--accent-contrast)]" : "bg-[var(--surface-2)] text-muted")}>
                🌙 Sombre
              </button>
            </div>
          </div>
        </Carte>
      </Section>

      <Section titre="Rappels & notifications" id="rappels">
        <Carte className="space-y-2.5 p-5 sm:p-6">
          <p className="mb-2 text-sm text-muted text-pretty">Choisissez ce dont vous voulez être averti.</p>
          <Interrupteur label="Rappel de séance" description="Le jour d'une séance." actif={reglages.notifications.seance} onChange={(v) => majNotif("seance", v)} />
          <Interrupteur label="Rappel des repas" description="Aux heures de repas." actif={reglages.notifications.repas} onChange={(v) => majNotif("repas", v)} />
          <Interrupteur label="Rappel d'hydratation" description="Toutes les deux heures." actif={reglages.notifications.hydratation} onChange={(v) => majNotif("hydratation", v)} />
          <Interrupteur label="Bilan hebdomadaire" description="Le dimanche soir." actif={reglages.notifications.bilanHebdo} onChange={(v) => majNotif("bilanHebdo", v)} />
          <Interrupteur label="Bip de fin de repos" description="Trois bips quand le temps est écoulé." actif={reglages.minuteur.son} onChange={(v) => { majReglages({ minuteur: { ...reglages.minuteur, son: v } }); rafraichir(); }} />
          {typeof navigator !== "undefined" && "vibrate" in navigator && (
            <Interrupteur label="Vibration de fin de repos" description="Vibre à la fin du compte à rebours." actif={reglages.minuteur.vibration} onChange={(v) => { majReglages({ minuteur: { ...reglages.minuteur, vibration: v } }); rafraichir(); }} />
          )}
          <div className="mt-4 rounded-2xl border border-[var(--border)] p-4">
            {permission === "indisponible" ? (
              <p className="text-xs text-muted text-pretty">Ce navigateur ne prend pas en charge les notifications.</p>
            ) : permission === "granted" ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Notifications autorisées</p>
                  <p className="mt-0.5 text-xs text-muted text-pretty">{installe ? "L'application est installée." : "Installez l'application pour recevoir les rappels."}</p>
                </div>
                <Bouton variante="fantome" taille="sm" onClick={notificationTest}>Tester</Bouton>
              </div>
            ) : permission === "denied" ? (
              <p className="text-xs text-muted text-pretty">Les notifications ont été refusées.</p>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted text-pretty">Autorisez les notifications pour recevoir les rappels.</p>
                <Bouton taille="sm" onClick={activerNotifications}>Autoriser</Bouton>
              </div>
            )}
          </div>
          <p className="pt-2 text-xs text-faint text-pretty">Les rappels sont planifiés localement.</p>
        </Carte>
      </Section>

      <Section titre="Programme" id="programme">
        <Carte className="p-5 sm:p-6">
          {programme ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Pastille ton="accent">{programme.profil.objectif.replace(/_/g, " ")}</Pastille>
                <Pastille>{programme.profil.niveauSportif}</Pastille>
                <Pastille>{programme.profil.seancesParSemaine} séances/sem</Pastille>
                <Pastille>{programme.meta.dureeCycle} semaines</Pastille>
              </div>
              <p className="mt-3 text-sm text-muted text-pretty">Changer de programme conserve votre historique.</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link href="/profil"><Bouton>Changer de programme</Bouton></Link>
                <Bouton variante="fantome" onClick={exporter}>Sauvegarder mes données</Bouton>
              </div>
            </>
          ) : (
            <div className="text-sm text-muted">Aucun programme actif. <Link href="/profil" className="font-medium text-[var(--accent)] underline">En créer un</Link></div>
          )}
        </Carte>
      </Section>

      <Section titre="Données" id="donnees">
        <Carte className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Historique des données</p>
              <p className="mt-0.5 text-xs text-muted">{nbEntrees} journée{nbEntrees > 1 ? "s" : ""} enregistrée{nbEntrees > 1 ? "s" : ""} · {stockageDistant() ? "synchronisées" : "stockées sur cet appareil"}</p>
            </div>
            <div className="flex gap-2">
              <Bouton variante="fantome" taille="sm" onClick={exporter}>Exporter (JSON)</Bouton>
              <Bouton variante="danger" taille="sm" onClick={() => setConfirmation(confirmation === "donnees" ? "aucune" : "donnees")}>Effacer</Bouton>
            </div>
          </div>
          {confirmation === "donnees" && (
            <div className="mt-4 space-y-3">
              <Encart ton="danger" titre="Effacer tout l'historique ?">Séances, repas, pesées et progression des skills seront définitivement perdus.</Encart>
              <div className="flex gap-2">
                <Bouton variante="danger" taille="sm" onClick={() => { effacerToutesDonnees(); setConfirmation("aucune"); window.location.reload(); }}>Oui, tout effacer</Bouton>
                <Bouton variante="fantome" taille="sm" onClick={() => setConfirmation("aucune")}>Annuler</Bouton>
              </div>
            </div>
          )}
        </Carte>
        <Carte className="p-5 sm:p-6">
          <div className="flex flex-wrap gap-3">
            <Bouton variante="fantome" onClick={seDeconnecter}>Se déconnecter</Bouton>
            <Bouton variante="danger" onClick={() => setConfirmation(confirmation === "compte" ? "aucune" : "compte")}>Supprimer le compte</Bouton>
          </div>
          {confirmation === "compte" && (
            <div className="mt-4 space-y-3">
              <Encart ton="danger" titre="Supprimer définitivement le compte ?">Le profil, le programme et l'intégralité de l'historique seront supprimés.</Encart>
              <div className="flex gap-2">
                <Bouton variante="danger" taille="sm" onClick={supprimerCompte}>Oui, supprimer mon compte</Bouton>
                <Bouton variante="fantome" taille="sm" onClick={() => setConfirmation("aucune")}>Annuler</Bouton>
              </div>
            </div>
          )}
        </Carte>
      </Section>

      <Section titre="À propos" id="apropos">
        <Carte className="p-5 sm:p-6">
          <h2 className="font-bold">Version de l&apos;application</h2>
          <dl className="mt-3 space-y-1.5 text-sm">
            <div className="flex justify-between"><dt className="text-muted">Application web</dt><dd className="tnum">1.0.0</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Moteur de programmation</dt><dd className="tnum">{programme?.meta.moteur ?? "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Stockage</dt><dd>{stockageDistant() ? "Supabase (synchronisé)" : "Local (cet appareil)"}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Mode</dt><dd>{installe ? "Application installée" : "Navigateur"}</dd></div>
          </dl>
          <p className="mt-4 text-xs leading-relaxed text-faint text-pretty">Les valeurs produites sont des estimations de départ.</p>
        </Carte>
      </Section>
    </div>
  );
}

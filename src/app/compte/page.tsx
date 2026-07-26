"use client";

/**
 * compte/page.tsx — Connexion, inscription et récupération de mot de passe.
 *
 * En mode local (Supabase non configuré), l'écran explique la situation
 * plutôt que d'afficher un formulaire qui ne mènerait nulle part.
 */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Bouton, Carte, Champ, Encart, Saisie, cx } from "@/components/ui";
import { useAuth } from "@/lib/auth";

type Mode = "connexion" | "inscription" | "oubli";

export default function PageCompte() {
  const router = useRouter();
  const {
    authDisponible, utilisateur, connexion, inscription, lienMagique,
    motDePasseOublie, deconnexion,
  } = useAuth();

  const [mode, setMode] = useState<Mode>("connexion");
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");
  const [succes, setSucces] = useState("");

  const soumettre = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreur("");
    setSucces("");
    setEnvoi(true);

    if (mode === "connexion") {
      const { erreur: err } = await connexion(email, motDePasse);
      if (err) setErreur(err);
      else router.push("/");
    } else if (mode === "inscription") {
      const { erreur: err, confirmation } = await inscription(email, motDePasse);
      if (err) setErreur(err);
      else if (confirmation) {
        setSucces("Compte créé. Confirmez votre adresse via le lien reçu par e-mail.");
      } else router.push("/");
    } else {
      const { erreur: err } = await motDePasseOublie(email);
      if (err) setErreur(err);
      else setSucces("Si un compte existe, un lien de réinitialisation vient d'être envoyé.");
    }
    setEnvoi(false);
  };

  const envoyerLien = async () => {
    if (!email) {
      setErreur("Renseignez votre adresse e-mail.");
      return;
    }
    setEnvoi(true);
    setErreur("");
    const { erreur: err } = await lienMagique(email);
    if (err) setErreur(err);
    else setSucces("Lien de connexion envoyé : consultez votre boîte de réception.");
    setEnvoi(false);
  };

  /* ------------------------------ Mode local ----------------------------- */

  if (!authDisponible) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <Carte className="p-6 sm:p-8">
          <span className="text-3xl">📴</span>
          <h1 className="mt-3 text-xl font-bold">Aucun compte nécessaire</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted text-pretty">
            L&apos;application fonctionne sans inscription : votre profil, vos séances et
            vos mesures sont enregistrés directement sur cet appareil. Rien ne transite
            par un serveur.
          </p>

          <div className="mt-5 space-y-3">
            <Encart titre="Sauvegarder vos données">
              Depuis les paramètres, exportez régulièrement votre historique au format
              JSON : c&apos;est votre seule copie de sauvegarde en mode local.
            </Encart>
            <Encart ton="warn" titre="Activer la synchronisation">
              Pour retrouver vos données sur plusieurs appareils, renseignez les clés
              Supabase dans le fichier <code>.env.local</code>. La marche à suivre figure
              dans le README du projet.
            </Encart>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/"><Bouton>Retour à l&apos;accueil</Bouton></Link>
            <Link href="/parametres"><Bouton variante="fantome">Paramètres</Bouton></Link>
          </div>
        </Carte>
      </div>
    );
  }

  /* --------------------------- Déjà connecté ----------------------------- */

  if (utilisateur) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <Carte className="p-6 sm:p-8">
          <span className="text-3xl">✅</span>
          <h1 className="mt-3 text-xl font-bold">Vous êtes connecté</h1>
          <p className="mt-2 text-sm text-muted">{utilisateur.email}</p>
          <p className="mt-2 text-sm text-muted text-pretty">
            Vos données sont synchronisées : vous les retrouverez sur tous vos appareils.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/"><Bouton>Aller au tableau de bord</Bouton></Link>
            <Bouton
              variante="fantome"
              onClick={async () => { await deconnexion(); router.push("/compte"); }}
            >
              Se déconnecter
            </Bouton>
          </div>
        </Carte>
      </div>
    );
  }

  /* ------------------------------ Formulaire ----------------------------- */

  const titres: Record<Mode, string> = {
    connexion: "Connexion",
    inscription: "Créer un compte",
    oubli: "Mot de passe oublié",
  };

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <Carte className="p-6 sm:p-8">
        <div className="mb-5 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--accent)] text-xl">
            🌿
          </span>
          <div>
            <h1 className="text-xl font-bold">{titres[mode]}</h1>
            <p className="text-xs text-muted">
              Synchronisez vos données entre vos appareils.
            </p>
          </div>
        </div>

        {/* Onglets connexion / inscription */}
        {mode !== "oubli" && (
          <div className="mb-5 flex gap-1 rounded-pill bg-[var(--surface-2)] p-1">
            {(["connexion", "inscription"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setErreur(""); setSucces(""); }}
                className={cx(
                  "flex-1 rounded-pill px-4 py-2 text-sm font-medium transition",
                  mode === m
                    ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
                    : "text-muted hover:text-ink",
                )}
              >
                {m === "connexion" ? "Se connecter" : "S'inscrire"}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={soumettre} className="space-y-4">
          <Champ label="Adresse e-mail" obligatoire>
            <Saisie
              type="email" required autoComplete="email" value={email}
              onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.fr"
            />
          </Champ>

          <AnimatePresence initial={false}>
            {mode !== "oubli" && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <Champ
                  label="Mot de passe"
                  obligatoire
                  aide={mode === "inscription" ? "8 caractères minimum" : undefined}
                >
                  <Saisie
                    type="password" required minLength={mode === "inscription" ? 8 : undefined}
                    autoComplete={mode === "inscription" ? "new-password" : "current-password"}
                    value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)}
                    placeholder="••••••••"
                  />
                </Champ>
              </motion.div>
            )}
          </AnimatePresence>

          {erreur && (
            <p role="alert" className="rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
              {erreur}
            </p>
          )}
          {succes && (
            <p role="status" className="rounded-2xl bg-[var(--accent-soft)] px-4 py-3 text-sm text-[var(--accent)]">
              {succes}
            </p>
          )}

          <Bouton type="submit" pleineLargeur disabled={envoi}>
            {envoi
              ? "Envoi…"
              : mode === "connexion" ? "Se connecter"
                : mode === "inscription" ? "Créer mon compte"
                  : "Envoyer le lien"}
          </Bouton>
        </form>

        <div className="mt-4 space-y-2 text-center text-sm">
          {mode === "connexion" && (
            <>
              <button
                onClick={envoyerLien}
                disabled={envoi}
                className="text-[var(--accent)] underline underline-offset-2"
              >
                Recevoir un lien de connexion par e-mail
              </button>
              <p>
                <button
                  onClick={() => { setMode("oubli"); setErreur(""); setSucces(""); }}
                  className="text-muted underline underline-offset-2"
                >
                  Mot de passe oublié ?
                </button>
              </p>
            </>
          )}
          {mode === "oubli" && (
            <button
              onClick={() => { setMode("connexion"); setErreur(""); setSucces(""); }}
              className="text-muted underline underline-offset-2"
            >
              Revenir à la connexion
            </button>
          )}
        </div>
      </Carte>

      <Carte className="p-5">
        <p className="text-sm text-muted text-pretty">
          Vous pouvez aussi utiliser l&apos;application <strong>sans compte</strong> :
          vos données restent alors sur cet appareil.{" "}
          <Link href="/" className="font-medium text-[var(--accent)] underline">
            Continuer sans compte
          </Link>
        </p>
      </Carte>
    </div>
  );
}

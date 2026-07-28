"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Bouton, Carte, Champ, Encart, Saisie } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { MarqueForge } from "@/components/logo";
import { useToast } from "@/components/toast";

type Mode = "connexion" | "inscription" | "oubli" | "magique";

/** Cadre sans navigation réservé à l'authentification dédiée. */
function EcranAuthentification({ children }: { children: ReactNode }) {
  return (
    <section className="flex min-h-[100dvh] w-full flex-col px-4 py-6 sm:px-6 sm:py-8">
      <header className="flex justify-center">
        <Link
          href="/"
          aria-label="FORGE — revenir à l'accueil"
          className="rounded-pill px-3 py-2"
        >
          <MarqueForge taille={42} />
        </Link>
      </header>
      <div className="flex flex-1 items-center justify-center py-8 sm:py-10">
        {children}
      </div>
    </section>
  );
}

export function BlocCompteLocal() {
  return (
    <div className="mx-auto max-w-lg space-y-4">
      <Carte className="p-5 sm:p-8">
        <span className="text-3xl">📴</span>
        <h1 className="mt-3 text-xl font-bold">Aucun compte nécessaire</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted text-pretty">
          L&apos;application fonctionne sans inscription : ton profil, tes séances et
          tes mesures sont enregistrés directement sur cet appareil. Rien ne transite
          par un serveur.
        </p>

        <div className="mt-5 space-y-3">
          <Encart titre="Sauvegarder tes données">
            Depuis les paramètres, exporte régulièrement ton historique au format JSON :
            c&apos;est ta seule copie de sauvegarde en mode local.
          </Encart>
          <Encart ton="warn" titre="Activer la synchronisation">
            Pour retrouver tes données sur plusieurs appareils, renseigne les clés
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

/**
 * Carte de connexion. Par défaut, elle s'affiche dans l'écran immersif de
 * `/connexion`; les paramètres l'emploient en version compacte.
 */
export function BlocAuthentification({
  immersif = true,
  onConnexionDemarree,
}: {
  immersif?: boolean;
  onConnexionDemarree?: () => void;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const {
    utilisateur, authDisponible, connexion, inscription, lienMagique,
    connexionGoogle, motDePasseOublie, deconnexion,
  } = useAuth();

  const [mode, setMode] = useState<Mode>("connexion");
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");
  const [succes, setSucces] = useState("");
  const [sortie, setSortie] = useState(false);
  const minuteurRedirection = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (minuteurRedirection.current) clearTimeout(minuteurRedirection.current);
  }, []);

  const changerMode = (suivant: Mode) => {
    setMode(suivant);
    setErreur("");
    setSucces("");
  };

  /** Laisse la carte s'effacer avant de rejoindre le tableau de bord. */
  const terminerConnexion = () => {
    setSortie(true);
    minuteurRedirection.current = setTimeout(() => {
      toast("Bienvenue 👋");
      router.push("/");
    }, 260);
  };

  const soumettre = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErreur("");
    setSucces("");
    setEnvoi(true);
    if (mode === "connexion" || mode === "inscription") onConnexionDemarree?.();

    if (mode === "connexion") {
      const { erreur: err } = await connexion(email, motDePasse);
      if (err) setErreur(err);
      else terminerConnexion();
    } else if (mode === "inscription") {
      const { erreur: err, confirmation } = await inscription(email, motDePasse);
      if (err) setErreur(err);
      else if (confirmation) {
        setSucces("Compte créé. Confirme ton adresse via le lien reçu par e-mail.");
      } else {
        terminerConnexion();
      }
    } else if (mode === "magique") {
      const { erreur: err } = await lienMagique(email);
      if (err) setErreur(err);
      else setSucces("Lien de connexion envoyé : consulte ta boîte de réception.");
    } else {
      const { erreur: err } = await motDePasseOublie(email);
      if (err) setErreur(err);
      else setSucces("Si un compte existe, un lien de réinitialisation vient d'être envoyé.");
    }

    setEnvoi(false);
  };

  const continuerAvecGoogle = async () => {
    setErreur("");
    setSucces("");
    setEnvoi(true);
    onConnexionDemarree?.();
    const { erreur: err } = await connexionGoogle();
    if (err) {
      setErreur(err);
      setEnvoi(false);
      return;
    }
    // Supabase redirige immédiatement vers Google. Ce message reste utile si
    // le navigateur prend quelques instants avant de quitter la page.
    setSucces("Redirection vers Google…");
  };

  if (!authDisponible) {
    const compteLocal = <BlocCompteLocal />;
    return immersif ? <EcranAuthentification>{compteLocal}</EcranAuthentification> : compteLocal;
  }

  if (utilisateur && !sortie) {
    const compteConnecte = (
      <div className="mx-auto w-full max-w-[26.25rem]">
        <Carte fort className="p-6 sm:p-8">
          <p className="etiquette">Compte FORGE</p>
          <h1 className="mt-2 text-2xl font-bold">Tu es connecté</h1>
          <p className="mt-2 text-sm text-muted">{utilisateur.email}</p>
          <Encart titre="Synchronisation active" ton="info">
            Tes données sont prêtes à te suivre sur tous tes appareils.
          </Encart>
          <div className="mt-5 flex flex-wrap gap-3">
            <Bouton onClick={() => router.push("/")}>Aller à l&apos;accueil</Bouton>
            <Bouton
              variante="fantome"
              onClick={async () => { await deconnexion(); router.push("/connexion"); }}
            >
              Se déconnecter
            </Bouton>
          </div>
        </Carte>
      </div>
    );
    return immersif ? <EcranAuthentification>{compteConnecte}</EcranAuthentification> : compteConnecte;
  }

  const titres: Record<Mode, string> = {
    connexion: "Content de te revoir",
    inscription: "Construis ton espace",
    oubli: "Réinitialise ton mot de passe",
    magique: "Reçois ton lien magique",
  };
  const sousTitres: Record<Mode, string> = {
    connexion: "Retrouve tes données et ton programme.",
    inscription: "Garde ton programme avec toi, sur tous tes appareils.",
    oubli: "On t'envoie un lien pour choisir un nouveau mot de passe.",
    magique: "Sans mot de passe : un lien suffit pour te connecter.",
  };
  const emailSeul = mode === "oubli" || mode === "magique";

  const carte = (
    <div className="mx-auto w-full max-w-[26.25rem]">
      <AnimatePresence initial={false} mode="wait">
        {!sortie && (
          <motion.div
            key="carte-authentification"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
          >
            <Carte fort className="p-5 sm:p-7">
              <div className="text-center">
                <p className="etiquette">Compte FORGE</p>
                <h1 className="mt-2 text-2xl font-bold text-ink">{titres[mode]}</h1>
                <p className="mt-2 text-sm leading-relaxed text-muted text-pretty">
                  {sousTitres[mode]}
                </p>
              </div>

              {!emailSeul && (
                <div
                  role="tablist"
                  aria-label="Choisir une action de compte"
                  className="mt-6 grid grid-cols-2 gap-2"
                >
                  {(["connexion", "inscription"] as const).map((onglet) => (
                    <Bouton
                      key={onglet}
                      type="button"
                      variante={mode === onglet ? "principal" : "fantome"}
                      taille="sm"
                      pleineLargeur
                      role="tab"
                      aria-selected={mode === onglet}
                      onClick={() => changerMode(onglet)}
                    >
                      {onglet === "connexion" ? "Connexion" : "Inscription"}
                    </Bouton>
                  ))}
                </div>
              )}

              <form onSubmit={soumettre} className="mt-6 space-y-4">
                <Champ label="Adresse e-mail" obligatoire>
                  <Saisie
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="toi@exemple.fr"
                  />
                </Champ>

                {!emailSeul && (
                  <Champ
                    label="Mot de passe"
                    obligatoire
                    aide={mode === "inscription" ? "8 caractères minimum" : undefined}
                  >
                    <Saisie
                      type="password"
                      required
                      minLength={mode === "inscription" ? 8 : undefined}
                      autoComplete={mode === "inscription" ? "new-password" : "current-password"}
                      value={motDePasse}
                      onChange={(e) => setMotDePasse(e.target.value)}
                      placeholder="••••••••"
                    />
                  </Champ>
                )}

                <div aria-live="assertive" aria-atomic="true">
                  {erreur && (
                    <Encart ton="danger" titre="Impossible de continuer">
                      {erreur}
                    </Encart>
                  )}
                </div>
                <div aria-live="polite" aria-atomic="true">
                  {succes && <Encart titre="C&apos;est envoyé">{succes}</Encart>}
                </div>

                <Bouton type="submit" pleineLargeur disabled={envoi}>
                  {envoi
                    ? "Envoi…"
                    : mode === "connexion" ? "Se connecter"
                      : mode === "inscription" ? "Créer mon compte"
                        : mode === "magique" ? "Envoyer le lien magique"
                          : "Envoyer le lien"}
                </Bouton>
              </form>

              {mode === "connexion" && (
                <div className="mt-3 flex justify-end">
                  <Bouton
                    type="button"
                    variante="fantome"
                    taille="sm"
                    onClick={() => changerMode("oubli")}
                  >
                    Mot de passe oublié ?
                  </Bouton>
                </div>
              )}

              {!emailSeul && (
                <div className="mt-6 space-y-3">
                  <div className="flex items-center gap-3 text-xs text-faint" aria-hidden="true">
                    <span className="h-px flex-1 bg-[var(--border)]" />
                    <span>— ou —</span>
                    <span className="h-px flex-1 bg-[var(--border)]" />
                  </div>
                  <Bouton
                    type="button"
                    variante="doux"
                    pleineLargeur
                    disabled={envoi}
                    onClick={() => changerMode("magique")}
                  >
                    📩 Recevoir un lien magique
                  </Bouton>
                  <Bouton
                    type="button"
                    variante="fantome"
                    pleineLargeur
                    disabled={envoi}
                    onClick={continuerAvecGoogle}
                  >
                    Continuer avec Google
                  </Bouton>
                  <Bouton type="button" variante="fantome" pleineLargeur disabled>
                    Continuer avec Apple — bientôt
                  </Bouton>
                </div>
              )}

              {emailSeul && (
                <div className="mt-5 text-center">
                  <Bouton
                    type="button"
                    variante="fantome"
                    taille="sm"
                    onClick={() => changerMode("connexion")}
                  >
                    Revenir à la connexion
                  </Bouton>
                </div>
              )}
            </Carte>
          </motion.div>
        )}
      </AnimatePresence>

      {!sortie && (
        <p className="mt-5 text-center text-sm leading-relaxed text-muted text-pretty">
          Tu peux aussi utiliser FORGE sans compte. Tes données restent alors sur cet appareil. {" "}
          <Link href="/" className="font-medium text-[var(--accent)] underline underline-offset-2">
            Continuer sans compte
          </Link>
        </p>
      )}
    </div>
  );

  return immersif ? <EcranAuthentification>{carte}</EcranAuthentification> : carte;
}

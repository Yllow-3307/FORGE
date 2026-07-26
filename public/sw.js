/*
 * sw.js — Service worker : rend l'application utilisable hors connexion.
 *
 * Stratégies, choisies selon la nature de la ressource :
 *   - navigations (pages)   : réseau d'abord, cache en secours. On veut la
 *     version à jour quand le réseau répond, mais l'app doit s'ouvrir en
 *     salle de sport sans réseau.
 *   - ressources statiques  : cache d'abord. Elles portent une empreinte
 *     dans leur nom, donc jamais périmées.
 *   - requêtes Supabase     : jamais mises en cache (données vivantes).
 *
 * Les données utilisateur vivent dans localStorage : elles restent
 * disponibles hors ligne sans que le service worker ait à s'en occuper.
 */

const VERSION = "forge-v1";
const CACHE_COQUILLE = `${VERSION}-coquille`;
const CACHE_RESSOURCES = `${VERSION}-ressources`;

// Pages pré-chargées à l'installation : le parcours principal doit
// fonctionner hors ligne dès la première visite.
const COQUILLE = [
  "/",
  "/seance",
  "/nutrition",
  "/programme",
  "/progres",
  "/mesures",
  "/parametres",
  "/profil",
  "/manifest.webmanifest",
  "/icones/icone-192.png",
  "/icones/icone-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_COQUILLE)
      // `reload` contourne le cache HTTP du navigateur pour ne pas figer
      // une version périmée dès l'installation.
      .then((cache) =>
        cache.addAll(COQUILLE.map((url) => new Request(url, { cache: "reload" }))),
      )
      .then(() => self.skipWaiting())
      .catch(() => {
        // Une ressource absente ne doit pas faire échouer toute l'installation.
      }),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cles) =>
        Promise.all(
          cles
            .filter((c) => !c.startsWith(VERSION))
            .map((c) => caches.delete(c)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

function estRequeteDonnees(url) {
  return (
    url.pathname.startsWith("/api/") ||
    url.hostname.endsWith("supabase.co") ||
    url.pathname.includes("/auth/")
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin && !url.hostname.endsWith("supabase.co")) return;

  // Données vivantes : toujours le réseau, jamais le cache.
  if (estRequeteDonnees(url)) return;

  // Navigation : réseau d'abord, repli sur le cache puis sur l'accueil.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((reponse) => {
          const copie = reponse.clone();
          caches.open(CACHE_COQUILLE).then((c) => c.put(request, copie));
          return reponse;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_COQUILLE);
          return (await cache.match(request)) || (await cache.match("/")) ||
            new Response(
              "<!doctype html><meta charset=utf-8><title>Hors ligne</title>" +
              "<body style='font-family:system-ui;padding:2rem;text-align:center'>" +
              "<h1>Hors connexion</h1><p>Rouvrez l'application une fois le réseau revenu.</p>",
              { headers: { "Content-Type": "text/html; charset=utf-8" } },
            );
        }),
    );
    return;
  }

  // Ressources statiques : cache d'abord, réseau en complément.
  event.respondWith(
    caches.match(request).then((enCache) => {
      if (enCache) return enCache;
      return fetch(request)
        .then((reponse) => {
          if (reponse.ok && reponse.type === "basic") {
            const copie = reponse.clone();
            caches.open(CACHE_RESSOURCES).then((c) => c.put(request, copie));
          }
          return reponse;
        })
        .catch(() => enCache);
    }),
  );
});

/* ------------------------------------------------------------ Notifications */

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const cible = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((liste) => {
      // Réutilise un onglet déjà ouvert plutôt que d'en empiler un nouveau.
      for (const client of liste) {
        if (client.url.includes(cible) && "focus" in client) return client.focus();
      }
      return self.clients.openWindow(cible);
    }),
  );
});

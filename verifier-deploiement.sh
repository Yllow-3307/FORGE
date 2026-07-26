#!/usr/bin/env bash
#
# verifier-deploiement.sh — Contrôle qu'un déploiement FORGE est bien
# accessible au public, installable et complet.
#
# Usage :
#   ./verifier-deploiement.sh https://forge-xxxx.vercel.app
#
# Le script ne dépend d'aucune session : il voit le site comme un visiteur
# anonyme, ce qu'un simple test dans votre navigateur ne permet pas.

set -uo pipefail

URL="${1:-}"
if [[ -z "$URL" ]]; then
  echo "Usage : $0 https://votre-app.vercel.app"
  exit 1
fi
URL="${URL%/}"   # retire le / final éventuel

VERT=$'\e[32m'; ROUGE=$'\e[31m'; JAUNE=$'\e[33m'; GRAS=$'\e[1m'; FIN=$'\e[0m'
erreurs=0

titre() { printf '\n%s%s%s\n' "$GRAS" "$1" "$FIN"; }
ok()    { printf '  %s✓%s %s\n' "$VERT" "$FIN" "$1"; }
ko()    { printf '  %s✗%s %s\n' "$ROUGE" "$FIN" "$1"; erreurs=$((erreurs+1)); }
info()  { printf '  %s•%s %s\n' "$JAUNE" "$FIN" "$1"; }

printf '%sVérification de %s%s\n' "$GRAS" "$URL" "$FIN"

# ---------------------------------------------------------------- 1. Accès
titre "1. Accès public"
code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$URL/")

if [[ "$code" == "200" ]]; then
  ok "Le site répond directement (HTTP 200)"
elif [[ "$code" == "302" || "$code" == "307" || "$code" == "401" ]]; then
  cible=$(curl -s -o /dev/null -w '%{redirect_url}' --max-time 15 "$URL/")
  if [[ "$cible" == *"vercel.com"* ]]; then
    ko "Site protégé : redirige vers la connexion Vercel"
    echo
    echo "     Correction : Vercel → votre projet → Settings"
    echo "                  → Deployment Protection"
    echo "                  → Vercel Authentication : Disabled → Save"
    echo
    echo "     Sans cela, personne ne peut ouvrir l'application,"
    echo "     et l'installation sur téléphone est impossible."
  else
    ko "Redirection inattendue (HTTP $code) vers $cible"
  fi
else
  ko "Réponse inattendue : HTTP $code"
fi

# ------------------------------------------------------------- 2. Contenu
titre "2. Contenu de l'application"
page=$(curl -sL --max-time 20 "$URL/" 2>/dev/null)

if grep -q "FORGE" <<< "$page"; then
  ok "La page contient bien l'application FORGE"
else
  ko "L'application n'est pas servie (page Vercel ou erreur)"
fi

if grep -qi "<title>Login" <<< "$page"; then
  ko "C'est la page de connexion Vercel qui s'affiche"
fi

# ------------------------------------------------------------ 3. Les pages
titre "3. Les neuf écrans"
for route in "" seance nutrition programme progres mesures parametres compte profil; do
  c=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$URL/$route")
  nom="${route:-accueil}"
  if [[ "$c" == "200" ]]; then
    ok "/$nom"
  else
    ko "/$nom → HTTP $c"
  fi
done

# ---------------------------------------------------------------- 4. PWA
titre "4. Application installable"
c=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$URL/manifest.webmanifest")
if [[ "$c" == "200" ]]; then
  ok "Manifeste accessible"
  nom=$(curl -s --max-time 15 "$URL/manifest.webmanifest" | grep -o '"short_name"[^,]*' | head -1)
  info "${nom:-nom introuvable}"
else
  ko "Manifeste inaccessible (HTTP $c) : installation impossible"
fi

c=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$URL/sw.js")
[[ "$c" == "200" ]] && ok "Service worker accessible (mode hors ligne)" \
                    || ko "Service worker inaccessible (HTTP $c)"

c=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$URL/icones/icone-512.png")
[[ "$c" == "200" ]] && ok "Icônes accessibles" || ko "Icônes inaccessibles (HTTP $c)"

# ------------------------------------------------------------- 5. Sécurité
titre "5. Sécurité"
if [[ "$URL" == https://* ]]; then
  ok "HTTPS actif (requis pour l'installation)"
else
  ko "HTTPS absent : l'installation sera impossible"
fi

# Un 302 signifie ici « bloqué par la protection », pas « fichier exposé » :
# on ne peut conclure que si le site est réellement accessible.
c=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$URL/.env.local")
if [[ "$c" == "404" ]]; then
  ok "Aucun fichier de clés exposé"
elif [[ "$c" == "302" || "$c" == "307" || "$c" == "401" ]]; then
  info "Vérification des clés impossible tant que le site est protégé"
else
  ko "ATTENTION : /.env.local répond HTTP $c — vérifiez qu'il n'est pas publié"
fi

# ---------------------------------------------------------------- Bilan
echo
if [[ $erreurs -eq 0 ]]; then
  printf '%s%s Tout est bon : le déploiement est opérationnel.%s\n' "$GRAS" "$VERT" "$FIN"
  echo
  echo "  Ouvrez $URL sur votre téléphone pour l'installer :"
  echo "    • Android : bannière « Installer », ou menu ⋮ → Ajouter à l'écran d'accueil"
  echo "    • iPhone  : Safari → Partager → Sur l'écran d'accueil"
else
  printf '%s%s %d problème(s) détecté(s).%s\n' "$GRAS" "$ROUGE" "$erreurs" "$FIN"
  echo "  Corrigez, puis relancez ce script."
fi
exit $(( erreurs > 0 ? 1 : 0 ))

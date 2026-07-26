#!/usr/bin/env bash
#
# pousser-forge.sh — Envoie la nouvelle version de FORGE sur GitHub.
#
# À lancer depuis le dossier qui CONTIENT le dossier `webapp` extrait du zip :
#
#   cd ~/Téléchargements        # là où vous avez décompressé forge.zip
#   bash pousser-forge.sh
#
# Le script vérifie l'état du dépôt avant d'agir et s'arrête à la moindre
# anomalie plutôt que de risquer d'écraser quoi que ce soit.

set -euo pipefail

DEPOT="https://github.com/Yllow-3307/forge.git"
VERT=$'\e[32m'; ROUGE=$'\e[31m'; JAUNE=$'\e[33m'; GRAS=$'\e[1m'; FIN=$'\e[0m'

ok()   { printf '  %s✓%s %s\n' "$VERT" "$FIN" "$1"; }
ko()   { printf '  %s✗%s %s\n' "$ROUGE" "$FIN" "$1"; }
info() { printf '  %s•%s %s\n' "$JAUNE" "$FIN" "$1"; }

printf '%sEnvoi de FORGE sur GitHub%s\n\n' "$GRAS" "$FIN"

# ---------------------------------------------------------------- 1. Dossier
if [[ ! -d "webapp" ]]; then
  ko "Aucun dossier « webapp » ici."
  echo
  echo "     Placez-vous dans le dossier où vous avez décompressé forge.zip :"
  echo "       cd ~/Téléchargements"
  echo "       bash pousser-forge.sh"
  exit 1
fi
cd webapp
ok "Dossier webapp trouvé"

# ------------------------------------------------------------ 2. Dépôt sain
if [[ ! -d ".git" ]]; then
  ko "Ce dossier ne contient pas de dépôt Git (.git absent)."
  echo "     Le zip a peut-être été décompressé par un outil qui ignore les"
  echo "     dossiers cachés. Réessayez avec :  unzip forge.zip"
  exit 1
fi

if ! git rev-parse HEAD >/dev/null 2>&1; then
  ko "Dépôt illisible : « could not parse HEAD »."
  echo "     Le dossier .git est incomplet. Redécompressez l'archive dans un"
  echo "     dossier vide, puis relancez ce script."
  exit 1
fi
ok "Dépôt Git valide — $(git log --oneline -1)"

# ------------------------------------------------------------- 3. Le remote
if git remote get-url origin >/dev/null 2>&1; then
  actuel=$(git remote get-url origin)
  if [[ "$actuel" != "$DEPOT" ]]; then
    info "Remote corrigé : $actuel → $DEPOT"
    git remote set-url origin "$DEPOT"
  else
    ok "Remote déjà configuré"
  fi
else
  git remote add origin "$DEPOT"
  ok "Remote ajouté"
fi

# -------------------------------------------------------------- 4. Branche
branche=$(git rev-parse --abbrev-ref HEAD)
if [[ "$branche" != "main" ]]; then
  git branch -M main
  ok "Branche renommée en main (était : $branche)"
else
  ok "Branche main"
fi

# ------------------------------------------------- 5. Vérifier la cohérence
echo
info "Vérification de la compatibilité avec GitHub…"
if git fetch origin main --quiet 2>/dev/null; then
  if git merge-base --is-ancestor origin/main HEAD 2>/dev/null; then
    n=$(git rev-list --count origin/main..HEAD)
    ok "$n commit(s) à envoyer, sans conflit possible"
  else
    ko "Les historiques divergent : GitHub contient des commits absents ici."
    echo
    echo "     Cela arrive si vous avez modifié des fichiers directement sur"
    echo "     github.com. Deux options :"
    echo
    echo "       • Conserver la version du zip (écrase GitHub) :"
    echo "           git push --force-with-lease origin main"
    echo
    echo "       • Examiner d'abord ce qui diffère :"
    echo "           git log --oneline HEAD..origin/main"
    exit 1
  fi
else
  info "GitHub injoignable ou dépôt vide : on tente l'envoi directement"
fi

# ---------------------------------------------------------------- 6. Envoi
echo
info "Envoi en cours…"
echo
echo "  Si un identifiant est demandé :"
echo "    Username : Yllow-3307"
echo "    Password : votre token GitHub (et non votre mot de passe)"
echo "    → github.com/settings/tokens → Generate new token (classic) → cocher « repo »"
echo

if git push -u origin main; then
  echo
  printf '%s%s Envoyé.%s Vercel redéploie automatiquement (environ 2 minutes).\n' "$GRAS" "$VERT" "$FIN"
  echo
  echo "  Suivi du déploiement : https://vercel.com/dashboard"
  echo "  Application          : https://forge-rgt1.vercel.app"
  echo
  echo "  ${GRAS}Si vous utilisez Supabase :${FIN} réexécutez supabase/schema.sql dans le"
  echo "  SQL Editor. Une colonne « maj_le » a été ajoutée pour la synchronisation."
else
  echo
  ko "L'envoi a échoué — voir le message ci-dessus."
fi

/*
 * parite_js.js — Exporte les résultats du moteur JS pour comparaison
 * avec le moteur Python (voir tests/test_parite.py).
 */
const fs = require("fs");
const path = require("path");
const Moteur = require("/home/user/app/src/moteur.js");
Moteur.chargerBibliotheque(JSON.parse(
  fs.readFileSync("/home/user/app/src/exercices.json", "utf8")));

const profils = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const sortie = profils.map(function (p) {
  const prog = Moteur.genererProgramme(p);
  const st = prog.semaineType;
  return {
    nom: p.nom,
    kcal: prog.nutrition.kcal,
    mb: prog.nutrition.mb,
    tdee: prog.nutrition.depenseTotale,
    prot: prog.nutrition.proteinesG,
    lip: prog.nutrition.lipidesG,
    glu: prog.nutrition.glucidesG,
    fcmax: prog.derive.fcmax,
    imc: prog.derive.imc,
    pression: prog.derive.pressionTemporelle,
    contexte: prog.derive.contexteEquipement,
    nForce: prog.synthese.seancesForce,
    nCardio: prog.synthese.seancesCardio,
    dureeSeance: prog.synthese.dureeSeanceForce,
    split: prog.synthese.split,
    moment: prog.synthese.momentEntrainement,
    cardioMin: prog.endurance.volume.minutesSemaine,
    modaliteC: prog.endurance.modaliteContinu,
    modaliteI: prog.endurance.modaliteIntervalles,
    hydratationRepos: prog.hydratation.besoinRepos.totalMl,
    zones: prog.endurance.zonesFc.map(function (z) { return z.fc; }),
    seances: st.jours.filter(function (j) { return j.seances.length; }).map(function (j) {
      return j.seances.map(function (s) {
        return { jour: j.jour, nom: s.nom, debut: s.debut, duree: s.dureeMin,
          exos: s.blocs.map(function (b) { return b.nom + "|" + b.series + "|" + b.reps; }) };
      });
    }),
    repas: st.jours.map(function (j) {
      return j.repas.map(function (r) { return r.nom + "@" + r.heureTxt + "=" + r.kcal; });
    }),
    volume: prog.semaineType.volumeMuscles
  };
});
fs.writeFileSync(process.argv[3], JSON.stringify(sortie, null, 1), "utf8");
console.log("JS : " + sortie.length + " programmes générés");

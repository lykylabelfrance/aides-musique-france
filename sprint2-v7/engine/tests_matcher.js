/**
 * TESTS_MATCHER.JS — Suite de tests automatisés
 * Module Aides & Subventions Musicales — LYKY LABEL FRANCE
 * Version 7.0 — Avril 2026
 *
 * Lancer : node tests_matcher.js
 *
 * Principe : chaque test définit un profil complet avec ses réponses,
 * les aides qui DOIVENT matcher, celles qui NE DOIVENT PAS matcher,
 * et les conflits attendus. Tout écart = FAIL bloquant.
 *
 * RÈGLE ABSOLUE : on ne livre pas si un test échoue.
 */

'use strict';

const { match } = require('./matcher');

// ── Helpers ────────────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
const errors = [];

function test(nom, answers, attendu) {
  const { matched, conflicts, alertes_fermees } = match(answers);
  const matchedIds = matched.map(m => m.id);
  const conflictPairs = conflicts.map(c => [c.a, c.b].sort().join('|'));
  let ok = true;
  const details = [];

  // Vérifier les aides qui DOIVENT matcher
  (attendu.doit_matcher || []).forEach(id => {
    if (!matchedIds.includes(id)) {
      ok = false;
      details.push(`  ❌ Manque : ${id}`);
    }
  });

  // Vérifier les aides qui NE DOIVENT PAS matcher
  (attendu.ne_doit_pas || []).forEach(id => {
    if (matchedIds.includes(id)) {
      ok = false;
      details.push(`  ❌ Faux positif : ${id}`);
    }
  });

  // Vérifier les conflits attendus
  (attendu.conflits || []).forEach(([a, b]) => {
    const key = [a, b].sort().join('|');
    if (!conflictPairs.includes(key)) {
      ok = false;
      details.push(`  ❌ Conflit manquant : ${a} ↔ ${b}`);
    }
  });

  // Vérifier qu'il n'y a pas de conflits inattendus
  (attendu.pas_de_conflit || []).forEach(([a, b]) => {
    const key = [a, b].sort().join('|');
    if (conflictPairs.includes(key)) {
      ok = false;
      details.push(`  ❌ Conflit inattendu : ${a} ↔ ${b}`);
    }
  });

  // Vérifier les alertes fermées
  if (attendu.alerte_fermee) {
    const ids = alertes_fermees.map(a => a.id);
    attendu.alerte_fermee.forEach(id => {
      if (!ids.includes(id)) {
        ok = false;
        details.push(`  ❌ Alerte fermée manquante : ${id}`);
      }
    });
  }

  if (ok) {
    passed++;
    console.log(`✅ ${nom}`);
  } else {
    failed++;
    errors.push({ nom, details, matchedIds, conflictPairs });
    console.log(`❌ ${nom}`);
    details.forEach(d => console.log(d));
    console.log(`  Aides matchées : [${matchedIds.join(', ')}]`);
    console.log(`  Conflits : [${conflictPairs.join(', ')}]`);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// PROFILS DE TEST
// ══════════════════════════════════════════════════════════════════════════════

// ── T01 : Artiste ACI SACEM pur, pas de structure, album prévu ─────────────────
test('T01 — ACI SACEM pur / album / pas de structure', {
  aci: 'oui',
  affiliations_vous: ['sacem'],
  revenus_artiste: 'inf15k',
  has_struct: 'non',
  genre: ['ma'],
  projets: ['album'],
}, {
  doit_matcher: ['SACEM_AUTOPRODUCTION'],
  ne_doit_pas: ['CIPP','CIEM','CISV','CNM_PRODUCTION','SPPF_ALBUM','SCPP_PHONOGRAMME','CNM_BOURSE_PARCOURS'],
  conflits: [],
});

// ── T02 : ACI SACEM + ADAMI + SPEDIDAM, album + clip + export ─────────────────
test('T02 — ACI triple affiliation / album + clip + export', {
  aci: 'oui',
  affiliations_vous: ['sacem','adami','spedidam'],
  revenus_artiste: 'inf15k',
  has_struct: 'non',
  genre: ['ma'],
  projets: ['album','clip','export'],
}, {
  doit_matcher: [
    'SACEM_AUTOPRODUCTION',
    'ADAMI_365',
    'ADAMI_2D3D',
    'ADAMI_PREMIERE_PARTIE',
    'SPEDIDAM_EPK',
    'SPEDIDAM_DEPLACEMENT',
  ],
  ne_doit_pas: ['CIPP','CNM_PRODUCTION','SPPF_ALBUM','CNM_BOURSE_PARCOURS'],
  conflits: [],
  alerte_fermee: ['SACEM_TOURNEE_EXPORT_MA'],
});

// ── T03 : ACI SACEM revenus éligibles CNM Bourse ─────────────────────────────
test('T03 — ACI SACEM / revenus 15k-60k / CNM Bourse Parcours', {
  aci: 'oui',
  affiliations_vous: ['sacem'],
  revenus_artiste: '15k_60k',
  has_struct: 'non',
  genre: ['ma'],
  projets: ['ecriture'],
}, {
  doit_matcher: ['CNM_BOURSE_PARCOURS','CNM_ECRITURE_COMPOSITION'],
  ne_doit_pas: ['CIPP','SACEM_AUTOPRODUCTION'], // pas d'album
  conflits: [],
});

// ── T04 : ACI SACEM revenus trop élevés — pas de CNM Bourse ───────────────────
test('T04 — ACI SACEM / revenus sup60k / CNM Bourse inaccessible', {
  aci: 'oui',
  affiliations_vous: ['sacem'],
  revenus_artiste: 'sup60k',
  has_struct: 'non',
  genre: ['ma'],
  projets: ['album'],
}, {
  doit_matcher: ['SACEM_AUTOPRODUCTION'],
  ne_doit_pas: ['CNM_BOURSE_PARCOURS'],
  conflits: [],
});

// ── T05 : Producteur phono IS TPE SPPF, NT < 50k, album, distrib physique cosignée ─
test('T05 — Profil B classique : SASU IS TPE + SPPF + NT50k + album', {
  aci: 'non',
  has_struct: 'oui',
  forme: 'IS',
  tpe: 'oui',
  activites: ['prod_phono'],
  ca_phono_pct: 'oui',
  sacem_struct: 'non',
  adhesions_struct: 'sppf',
  distrib: 'physique_cosigne',
  franco: 'oui',
  nt: 'inf50k',
  genre: ['ma'],
  projets: ['album'],
}, {
  doit_matcher: [
    'CIPP',
    'CNM_PRODUCTION_AUTO',
    'CNM_PRODUCTION',
    'SPPF_ALBUM',
    'SPPF_GRM',
  ],
  ne_doit_pas: [
    'CIEM','CISV',
    'SCPP_PHONOGRAMME', // SPPF, pas SCPP
    'FONPEPS_APAJ',
    'CNM_BOURSE_PARCOURS',
    'SACEM_DEV_EDITORIAL_MA',
  ],
  conflits: [],
  pas_de_conflit: [['CIPP','SPPF_ALBUM']], // cumulables
});

// ── T06 : Même profil B mais NT entre 50k et 100k — pas de CNM NT ──────────────
test('T06 — Profil B / NT 50k-100k / CIPP OK mais CNM NT inaccessible', {
  aci: 'non',
  has_struct: 'oui',
  forme: 'IS',
  tpe: 'oui',
  activites: ['prod_phono'],
  ca_phono_pct: 'oui',
  adhesions_struct: 'sppf',
  distrib: 'physique_cosigne',
  franco: 'oui',
  nt: '50k_100k',
  genre: ['ma'],
  projets: ['album'],
}, {
  doit_matcher: ['CIPP','CNM_PRODUCTION_AUTO','SPPF_ALBUM'],
  ne_doit_pas: ['CNM_PRODUCTION'], // NT CNM requiert < 50k
  conflits: [],
});

// ── T07 : Producteur phono SCPP — conflit SPPF/SCPP impossible ────────────────
test('T07 — Profil B SCPP producteur / album / pas de conflit SPPF', {
  aci: 'non',
  has_struct: 'oui',
  forme: 'IS',
  tpe: 'oui',
  activites: ['prod_phono'],
  ca_phono_pct: 'oui',
  adhesions_struct: 'scpp_producteur',
  distrib: 'physique_cosigne',
  franco: 'oui',
  nt: 'inf50k',
  genre: ['ma'],
  projets: ['album'],
}, {
  doit_matcher: ['CIPP','SCPP_PHONOGRAMME','CNM_PRODUCTION_AUTO','CNM_PRODUCTION'],
  ne_doit_pas: ['SPPF_ALBUM','SPPF_GRM'], // SCPP, pas SPPF
  conflits: [], // pas de conflit car SPPF absent
});

// ── T08 : Distribution numérique seule — SPPF, SCPP, CNM Auto bloqués ─────────
test('T08 — Distrib numérique seule / SPPF + CNM Auto bloqués', {
  aci: 'non',
  has_struct: 'oui',
  forme: 'IS',
  tpe: 'oui',
  activites: ['prod_phono'],
  ca_phono_pct: 'oui',
  adhesions_struct: 'sppf',
  distrib: 'numerique_seul',
  franco: 'oui',
  nt: 'inf50k',
  genre: ['ma'],
  projets: ['album'],
}, {
  ne_doit_pas: ['SPPF_ALBUM','CNM_PRODUCTION_AUTO','CNM_PRODUCTION','SCPP_PHONOGRAMME'],
  conflits: [],
});

// ── T09 : CA phono < 50% — CIPP et CNM Production bloqués ────────────────────
test('T09 — CA phono < 50% / CIPP et CNM Production bloqués', {
  aci: 'non',
  has_struct: 'oui',
  forme: 'IS',
  tpe: 'oui',
  activites: ['prod_phono','management','booking'],
  ca_phono_pct: 'non', // < 50% CA phono
  adhesions_struct: 'sppf',
  distrib: 'physique_cosigne',
  franco: 'oui',
  nt: 'inf50k',
  genre: ['ma'],
  projets: ['album'],
}, {
  ne_doit_pas: ['CIPP','CNM_PRODUCTION_AUTO','CNM_PRODUCTION'],
  // SPPF Album reste accessible (pas de critère CA phono)
  doit_matcher: ['SPPF_ALBUM'],
  conflits: [],
});

// ── T10 : Éditeur IS TPE, droits > 5k€, MA ────────────────────────────────────
test('T10 — Profil C éditeur IS TPE / droits > 5k / CIEM + SACEM Dev Ed', {
  aci: 'non',
  has_struct: 'oui',
  forme: 'IS',
  tpe: 'oui',
  activites: ['edition'],
  sacem_struct: 'oui',
  droits_sacem_annuel: 'sup5k',
  franco: 'oui',
  genre: ['ma'],
  projets: ['album','promo'],
}, {
  doit_matcher: ['CIEM','SACEM_DEV_EDITORIAL_MA','CNM_EDITION'],
  ne_doit_pas: ['CIPP','CISV','SACEM_DEV_EDITORIAL_CONTEMP'],
  conflits: [],
});

// ── T11 : Éditeur jazz contemp — CNM Edition art.37, pas art.38 ───────────────
test('T11 — Éditeur jazz / CNM Edition Contemp art.37 / pas art.38 MA', {
  aci: 'non',
  has_struct: 'oui',
  forme: 'IS',
  tpe: 'oui',
  activites: ['edition'],
  sacem_struct: 'oui',
  droits_sacem_annuel: '1500_5k',
  franco: 'oui',
  genre: ['jazz'],
  projets: ['album'],
}, {
  doit_matcher: ['CNM_EDITION_CONTEMPORAINE_JAZZ','SACEM_DEV_EDITORIAL_CONTEMP'],
  ne_doit_pas: ['CNM_EDITION','SACEM_DEV_EDITORIAL_MA'], // art.38 MA exclu si jazz
  conflits: [],
});

// ── T12 : ESV cat2 IS TPE / tournée / CISV + FONPEPS ─────────────────────────
test('T12 — Profil D ESV cat2 IS TPE / tournée / CISV + FONPEPS', {
  aci: 'non',
  has_struct: 'oui',
  forme: 'IS',
  tpe: 'oui',
  activites: ['esv'],
  esv_details: 'cat2',
  genre: ['ma'],
  projets: ['tournee'],
}, {
  doit_matcher: ['CISV','FONPEPS_APAJ','CNM_SPECTACLE_VIVANT','CNM_DROIT_TIRAGE','CNM_CREATION_SPECTACLE'],
  ne_doit_pas: ['CIPP','CIEM','CNM_PROMOTEURS_DIFFUSEURS'],
  conflits: [],
  pas_de_conflit: [['CISV','FONPEPS_APAJ']], // cumulables
});

// ── T13 : ESV cat1 — FONPEPS inaccessible ─────────────────────────────────────
test('T13 — ESV cat1 exploitant de lieu / FONPEPS inaccessible', {
  aci: 'non',
  has_struct: 'oui',
  forme: 'IS',
  tpe: 'oui',
  activites: ['esv'],
  esv_details: 'cat1',
  genre: ['ma'],
  projets: ['tournee'],
}, {
  ne_doit_pas: ['FONPEPS_APAJ'],
  doit_matcher: ['CISV','CNM_DROIT_TIRAGE'],
  conflits: [],
});

// ── T14 : ESV cat3 / CNM Promoteurs-Diffuseurs accessible ────────────────────
test('T14 — ESV cat3 diffuseur / CNM Promoteurs-Diffuseurs accessible', {
  aci: 'non',
  has_struct: 'oui',
  forme: 'IS',
  tpe: 'oui',
  activites: ['esv'],
  esv_details: 'cat3',
  genre: ['ma'],
  projets: ['tournee'],
}, {
  doit_matcher: ['CISV','FONPEPS_APAJ','CNM_PROMOTEURS_DIFFUSEURS','CNM_DROIT_TIRAGE'],
  conflits: [],
});

// ── T15 : CIPP + CIEM + CISV simultanés — 3 conflits ─────────────────────────
test('T15 — Label multi IS TPE / prod phono + édition + ESV / 3 conflits CI', {
  aci: 'non',
  has_struct: 'oui',
  forme: 'IS',
  tpe: 'oui',
  activites: ['prod_phono','edition','esv'],
  ca_phono_pct: 'oui',
  sacem_struct: 'oui',
  droits_sacem_annuel: 'sup5k',
  adhesions_struct: 'sppf',
  distrib: 'physique_cosigne',
  franco: 'oui',
  esv_details: 'cat2',
  nt: 'inf50k',
  genre: ['ma'],
  projets: ['album','tournee'],
}, {
  doit_matcher: ['CIPP','CIEM','CISV'],
  conflits: [
    ['CIPP','CIEM'],
    ['CIPP','CISV'],
    ['CIEM','CISV'],
  ],
});

// ── T16 : SASU ACI + structure — double périmètre ────────────────────────────
test('T16 — SASU IS + ACI SACEM+ADAMI / double périmètre / album + clip', {
  aci: 'oui',
  affiliations_vous: ['sacem','adami'],
  revenus_artiste: 'inf15k',
  has_struct: 'oui',
  forme: 'IS',
  tpe: 'oui',
  activites: ['prod_phono'],
  ca_phono_pct: 'oui',
  sacem_struct: 'non',
  adhesions_struct: 'sppf',
  distrib: 'physique_cosigne',
  franco: 'oui',
  nt: 'inf50k',
  genre: ['ma'],
  projets: ['album','clip'],
}, {
  doit_matcher: [
    // périmètre VOUS
    'ADAMI_2D3D', 'ADAMI_365',
    // périmètre STRUCT
    'CIPP', 'CNM_PRODUCTION_AUTO', 'CNM_PRODUCTION', 'SPPF_ALBUM', 'SPPF_GRM', 'CNM_CLIP',
    'SPPF_VIDEO', 'SPPF_BONIFICATION_ADAMI',
  ],
  conflits: [],
});

// ── T17 : Export jazz / CNM Mobilité Jazz IMMINENT ───────────────────────────
test('T17 — Export jazz / CNM Mobilité Jazz / pas CNM Mobilité Individuelle', {
  aci: 'non',
  has_struct: 'oui',
  forme: 'IS',
  tpe: 'oui',
  activites: ['prod_phono'],
  ca_phono_pct: 'oui',
  adhesions_struct: 'sppf',
  distrib: 'physique_cosigne',
  franco: 'oui',
  nt: 'sup100k',
  genre: ['jazz'],
  projets: ['album','export'],
}, {
  doit_matcher: ['CNM_MOBILITE_JAZZ','CNM_EXPORT_MA1'],
  ne_doit_pas: ['CNM_MOBILITE_INDIVIDUELLE'], // jazz = mobilité jazz, pas individuelle
  conflits: [],
});

// ── T18 : Export budget > 20k — CNM Export MA2 accessible ────────────────────
test('T18 — Export gros budget > 20k / CNM Export MA2 + MA1', {
  aci: 'non',
  has_struct: 'oui',
  forme: 'IS',
  tpe: 'oui',
  activites: ['prod_phono'],
  ca_phono_pct: 'oui',
  adhesions_struct: 'sppf',
  distrib: 'physique_cosigne',
  franco: 'oui',
  nt: 'sup100k',
  genre: ['ma'],
  projets: ['album','export','export_gros'],
}, {
  doit_matcher: ['CNM_EXPORT_MA1','CNM_EXPORT_MA2'],
  ne_doit_pas: ['CNM_MOBILITE_JAZZ'],
  conflits: [],
});

// ── T19 : SPEDIDAM Génération — condition sélection préalable ─────────────────
test('T19 — ACI SPEDIDAM / sélectionné Génération / aide accessible', {
  aci: 'oui',
  affiliations_vous: ['spedidam'],
  has_struct: 'non',
  generation_spedidam: 'oui',
  genre: ['ma'],
  projets: ['tournee'],
}, {
  doit_matcher: ['SPEDIDAM_GENERATION'],
  ne_doit_pas: ['CIPP','CNM_PRODUCTION'],
  conflits: [],
});

// ── T20 : SPEDIDAM affilié mais PAS sélectionné Génération ───────────────────
test('T20 — ACI SPEDIDAM / NON sélectionné Génération / aide inaccessible', {
  aci: 'oui',
  affiliations_vous: ['spedidam'],
  has_struct: 'non',
  generation_spedidam: 'non',
  genre: ['ma'],
  projets: ['tournee'],
}, {
  ne_doit_pas: ['SPEDIDAM_GENERATION'],
  conflits: [],
});

// ── T21 : SCPP licencié exclusif — Marketing OK, Phonogramme NON ──────────────
test('T21 — SCPP licencié exclusif / Marketing accessible / Phonogramme inaccessible', {
  aci: 'non',
  has_struct: 'oui',
  forme: 'IS',
  tpe: 'oui',
  activites: ['prod_phono'],
  ca_phono_pct: 'oui',
  adhesions_struct: 'scpp_licencie',
  distrib: 'physique_cosigne',
  franco: 'oui',
  nt: 'sup100k',
  genre: ['ma'],
  projets: ['album','promo'],
}, {
  doit_matcher: ['SCPP_MARKETING'],
  ne_doit_pas: ['SCPP_PHONOGRAMME'], // licencié non éligible phonogramme
  conflits: [],
});

// ── T22 : Pas de structure IS — CIPP impossible ───────────────────────────────
test('T22 — AE (auto-entrepreneur) / CIPP inaccessible', {
  aci: 'oui',
  affiliations_vous: ['sacem'],
  has_struct: 'oui',
  forme: 'AE',
  activites: ['prod_phono'],
  ca_phono_pct: 'oui',
  adhesions_struct: 'sppf',
  distrib: 'physique_cosigne',
  franco: 'oui',
  nt: 'inf50k',
  genre: ['ma'],
  projets: ['album'],
}, {
  ne_doit_pas: ['CIPP','CIEM','CISV'], // IS obligatoire
  // SPPF Album aussi requiert IS
  ne_doit_pas_sppf: [], // NB : SPPF Album require IS dans aides_criteres
  doit_matcher: ['SACEM_AUTOPRODUCTION'],
  conflits: [],
});

// ── T23 : Catalogue non francophone — CIPP et CIEM bloqués ───────────────────
test('T23 — Catalogue non francophone / CIPP et CIEM bloqués', {
  aci: 'non',
  has_struct: 'oui',
  forme: 'IS',
  tpe: 'oui',
  activites: ['prod_phono','edition'],
  ca_phono_pct: 'oui',
  adhesions_struct: 'sppf',
  distrib: 'physique_cosigne',
  franco: 'non', // < 50% français
  nt: 'inf50k',
  genre: ['ma'],
  projets: ['album'],
}, {
  ne_doit_pas: ['CIPP','CIEM'],
  // SPPF Album reste accessible (pas de critère francophonie)
  doit_matcher: ['SPPF_ALBUM','CNM_PRODUCTION_AUTO','CNM_PRODUCTION'],
  conflits: [],
});

// ── T24 : CNM Dev Eco + Restructuration — conflit same exercice ───────────────
test('T24 — CNM Art.84 et Art.85 simultanés / conflit même exercice', {
  aci: 'non',
  has_struct: 'oui',
  forme: 'IS',
  tpe: 'oui',
  activites: ['prod_phono'],
  ca_phono_pct: 'oui',
  adhesions_struct: 'aucune',
  distrib: 'numerique_seul',
  franco: 'oui',
  nt: 'sup100k',
  genre: ['ma'],
  projets: ['structuration'],
}, {
  doit_matcher: ['CNM_DEV_ECONOMIQUE','CNM_RESTRUCTURATION'],
  conflits: [['CNM_DEV_ECONOMIQUE','CNM_RESTRUCTURATION']],
});

// ── T25 : Artiste SACEM + export / alerte SACEM export fermé ─────────────────
test('T25 — ACI SACEM + export / alerte SACEM Tournée Export fermée', {
  aci: 'oui',
  affiliations_vous: ['sacem'],
  has_struct: 'non',
  genre: ['ma'],
  projets: ['export'],
}, {
  alerte_fermee: ['SACEM_TOURNEE_EXPORT_MA'],
  ne_doit_pas: ['SACEM_TOURNEE_EXPORT_MA'], // ne doit pas matcher comme aide
  conflits: [],
});

// ══════════════════════════════════════════════════════════════════════════════
// BILAN
// ══════════════════════════════════════════════════════════════════════════════

console.log('\n' + '═'.repeat(60));
console.log(`BILAN : ${passed} tests passés / ${passed + failed} total`);

if (failed > 0) {
  console.log(`\n🔴 ${failed} ÉCHEC(S) — NE PAS DÉPLOYER\n`);
  errors.forEach(e => {
    console.log(`\n❌ ${e.nom}`);
    e.details.forEach(d => console.log(d));
  });
  process.exit(1);
} else {
  console.log('\n✅ TOUS LES TESTS PASSENT — OK POUR DÉPLOIEMENT\n');
  process.exit(0);
}

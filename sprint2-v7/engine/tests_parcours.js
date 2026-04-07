/**
 * TESTS_PARCOURS.JS — Simulation parcours utilisateur complets
 * Teste le comportement réel du questionnaire :
 * - Quelles étapes s'affichent dans quel ordre
 * - Que les bonnes aides ressortent à la fin
 * - Que les cas limites ne bloquent pas
 *
 * Lancer : node tests_parcours.js
 */

'use strict';

const { match } = require('./matcher');

let passed = 0;
let failed = 0;

function test(nom, parcours, attendu) {
  // Simuler le remplissage progressif des réponses
  const ans = {};
  parcours.forEach(([key, val]) => { ans[key] = val; });

  // Calculer les steps actifs avec ces réponses
  const stepsActifs = getActiveSteps(ans);
  const stepIds = stepsActifs.map(s => s.id);

  // Matcher
  const { matched, conflicts, alertes_fermees } = match(ans);
  const matchedIds = matched.map(m => m.id);
  const conflictPairs = conflicts.map(c => [c.a, c.b].sort().join('|'));

  let ok = true;
  const details = [];

  // Vérifier les steps affichés
  if (attendu.steps_affiches) {
    attendu.steps_affiches.forEach(id => {
      if (!stepIds.includes(id)) {
        ok = false;
        details.push(`  ❌ Step "${id}" devrait être affiché`);
      }
    });
  }

  // Vérifier les steps masqués
  if (attendu.steps_masques) {
    attendu.steps_masques.forEach(id => {
      if (stepIds.includes(id)) {
        ok = false;
        details.push(`  ❌ Step "${id}" ne devrait PAS être affiché`);
      }
    });
  }

  // Vérifier le nombre de steps
  if (attendu.nb_steps) {
    if (stepsActifs.length !== attendu.nb_steps) {
      ok = false;
      details.push(`  ❌ ${stepsActifs.length} steps affichés, attendu ${attendu.nb_steps}`);
    }
  }

  // Vérifier les aides
  if (attendu.doit_matcher) {
    attendu.doit_matcher.forEach(id => {
      if (!matchedIds.includes(id)) {
        ok = false;
        details.push(`  ❌ Aide manquante : ${id}`);
      }
    });
  }
  if (attendu.ne_doit_pas) {
    attendu.ne_doit_pas.forEach(id => {
      if (matchedIds.includes(id)) {
        ok = false;
        details.push(`  ❌ Faux positif : ${id}`);
      }
    });
  }

  // Vérifier les conflits
  if (attendu.conflits) {
    attendu.conflits.forEach(([a, b]) => {
      const key = [a, b].sort().join('|');
      if (!conflictPairs.includes(key)) {
        ok = false;
        details.push(`  ❌ Conflit manquant : ${a} ↔ ${b}`);
      }
    });
  }

  // Vérifier le potentiel minimal
  if (attendu.potentiel_min) {
    const total = matched.reduce((s, m) => {
      const ref = AIDES_REF[m.id];
      return s + (ref ? (ref.potentiel_min || 0) : 0);
    }, 0);
    if (total < attendu.potentiel_min) {
      ok = false;
      details.push(`  ❌ Potentiel ${total}€ < attendu ${attendu.potentiel_min}€`);
    }
  }

  if (ok) {
    passed++;
    const nb = matchedIds.length;
    console.log(`✅ ${nom} → ${nb} aide(s) [${stepIds.length} steps]`);
  } else {
    failed++;
    console.log(`❌ ${nom}`);
    details.forEach(d => console.log(d));
    console.log(`   Steps actifs (${stepIds.length}): [${stepIds.join(', ')}]`);
    console.log(`   Aides matchées (${matchedIds.length}): [${matchedIds.join(', ')}]`);
  }
}

// ── Reproduction de la logique activeSteps() du questionnaire ─────────────────
// Doit être identique à la fonction dans index.html
const { AIDES } = require('./aides_criteres');
const AIDES_REF = AIDES;

const _is  = (a, k, v) => a[k] === v;
const _has = (a, k, v) => Array.isArray(a[k]) && a[k].includes(v);

const STEPS_DEF = [
  { id:'aci',                   cond: null },
  { id:'affiliations_vous',     cond: a => _is(a,'aci','oui') },
  { id:'revenus_artiste',       cond: a => _has(a,'affiliations_vous','sacem') },
  { id:'has_struct',            cond: null },
  { id:'forme',                 cond: a => _is(a,'has_struct','oui') },
  { id:'tpe',                   cond: a => _is(a,'has_struct','oui') && _is(a,'forme','IS') },
  { id:'activites',             cond: a => _is(a,'has_struct','oui') },
  { id:'ca_phono_pct',          cond: a => _is(a,'has_struct','oui') && _has(a,'activites','prod_phono') },
  { id:'sacem_struct',          cond: a => _is(a,'has_struct','oui') && (
      _has(a,'activites','edition') || _has(a,'activites','prod_phono') || _has(a,'activites','esv')
    )
  },
  { id:'adhesions_struct',      cond: a => _is(a,'has_struct','oui') && _has(a,'activites','prod_phono') },
  { id:'distrib',               cond: a => _is(a,'has_struct','oui') && _has(a,'activites','prod_phono') },
  { id:'franco',                cond: a => _is(a,'has_struct','oui') && _is(a,'forme','IS') && (
      _has(a,'activites','prod_phono') || _has(a,'activites','edition')
    )
  },
  { id:'droits_sacem_annuel',   cond: a => _is(a,'has_struct','oui') && _has(a,'activites','edition') && _is(a,'sacem_struct','oui') },
  { id:'esv_details',           cond: a => _is(a,'has_struct','oui') && _has(a,'activites','esv') },
  { id:'nt',                    cond: a => _is(a,'has_struct','oui') && _has(a,'activites','prod_phono') && _is(a,'forme','IS') },
  { id:'genre',                 cond: a => _is(a,'aci','oui') || _is(a,'has_struct','oui') },
  { id:'projets',               cond: a => _is(a,'aci','oui') || _is(a,'has_struct','oui') },
  { id:'generation_spedidam',   cond: a => _has(a,'affiliations_vous','spedidam') },
];

function getActiveSteps(ans) {
  return STEPS_DEF.filter(s => !s.cond || s.cond(ans));
}

// ══════════════════════════════════════════════════════════════════════════════
// PARCOURS DE TEST
// ══════════════════════════════════════════════════════════════════════════════
console.log('═══ TESTS PARCOURS UTILISATEUR ═══\n');

// ── P01 : Utilisateur répond "Non" à tout ─────────────────────────────────────
test('P01 — Réponse Non à tout (aci=non, has_struct=non)', [
  ['aci',        'non'],
  ['has_struct', 'non'],
], {
  steps_affiches: ['aci', 'has_struct'],
  steps_masques:  ['affiliations_vous', 'forme', 'tpe', 'activites', 'genre', 'projets'],
  nb_steps: 2,
  doit_matcher: [],
  ne_doit_pas:  ['CIPP','CNM_BOURSE_PARCOURS','SPPF_ALBUM'],
});

// ── P02 : ACI SACEM seul, album prévu ─────────────────────────────────────────
test('P02 — ACI SACEM pur / album (parcours minimum artiste)', [
  ['aci',               'oui'],
  ['affiliations_vous', ['sacem']],
  ['revenus_artiste',   'inf15k'],
  ['has_struct',        'non'],
  ['genre',             ['ma']],
  ['projets',           ['album']],
], {
  steps_affiches: ['aci','affiliations_vous','revenus_artiste','has_struct','genre','projets'],
  steps_masques:  ['forme','tpe','activites','ca_phono_pct','adhesions_struct','generation_spedidam'],
  nb_steps: 6,
  doit_matcher:   ['SACEM_AUTOPRODUCTION'],
  ne_doit_pas:    ['CIPP','CNM_PRODUCTION','SPPF_ALBUM','CNM_BOURSE_PARCOURS'],
});

// ── P03 : ACI SACEM revenus éligibles Bourse + projet écriture ───────────────
test('P03 — ACI SACEM / revenus 15k-60k / écriture → Bourse Parcours', [
  ['aci',               'oui'],
  ['affiliations_vous', ['sacem']],
  ['revenus_artiste',   '15k_60k'],
  ['has_struct',        'non'],
  ['genre',             ['ma']],
  ['projets',           ['ecriture']],
], {
  nb_steps: 6,
  doit_matcher:   ['CNM_BOURSE_PARCOURS','CNM_ECRITURE_COMPOSITION'],
  ne_doit_pas:    ['SACEM_AUTOPRODUCTION'],
});

// ── P04 : ACI triple affiliation + SPEDIDAM Génération ───────────────────────
test('P04 — ACI SACEM+ADAMI+SPEDIDAM / sélectionné Génération', [
  ['aci',                 'oui'],
  ['affiliations_vous',   ['sacem','adami','spedidam']],
  ['revenus_artiste',     'inf15k'],
  ['generation_spedidam', 'oui'],
  ['has_struct',          'non'],
  ['genre',               ['ma']],
  ['projets',             ['album','clip','export']],
], {
  steps_affiches: ['aci','affiliations_vous','revenus_artiste','generation_spedidam','has_struct','genre','projets'],
  nb_steps: 7,
  doit_matcher:   ['SACEM_AUTOPRODUCTION','ADAMI_2D3D','SPEDIDAM_EPK','SPEDIDAM_GENERATION','SPEDIDAM_DEPLACEMENT'],
  ne_doit_pas:    ['CIPP','CNM_PRODUCTION'],
});

// ── P05 : Structure IS seule sans ACI (label sans artiste) ───────────────────
test('P05 — Structure IS seule sans ACI / prod phono / steps corrects', [
  ['aci',              'non'],
  ['has_struct',       'oui'],
  ['forme',            'IS'],
  ['tpe',              'oui'],
  ['activites',        ['prod_phono']],
  ['ca_phono_pct',     'oui'],
  ['sacem_struct',     'non'],
  ['adhesions_struct', 'sppf'],
  ['distrib',          'physique_cosigne'],
  ['franco',           'oui'],
  ['nt',               'inf50k'],
  ['genre',            ['ma']],
  ['projets',          ['album']],
], {
  steps_affiches: ['aci','has_struct','forme','tpe','activites','ca_phono_pct','sacem_struct','adhesions_struct','distrib','franco','nt','genre','projets'],
  steps_masques:  ['affiliations_vous','revenus_artiste','droits_sacem_annuel','esv_details','generation_spedidam'],
  nb_steps: 13,
  doit_matcher:   ['CIPP','CNM_PRODUCTION_AUTO','CNM_PRODUCTION','SPPF_ALBUM','SPPF_GRM'],
  ne_doit_pas:    ['CIEM','CISV','SCPP_PHONOGRAMME'],
});

// ── P06 : Parcours AE — aucun crédit d'impôt ─────────────────────────────────
test('P06 — Auto-entrepreneur / CIPP inaccessible', [
  ['aci',              'oui'],
  ['affiliations_vous',['sacem']],
  ['revenus_artiste',  'inf15k'],
  ['has_struct',       'oui'],
  ['forme',            'AE'],
  ['activites',        ['prod_phono']],
  ['ca_phono_pct',     'oui'],
  ['sacem_struct',     'non'],
  ['adhesions_struct', 'sppf'],
  ['distrib',          'physique_cosigne'],
  ['genre',            ['ma']],
  ['projets',          ['album']],
], {
  // AE → pas de step tpe, franco, nt (IS obligatoire)
  steps_masques: ['tpe','franco','nt'],
  ne_doit_pas:   ['CIPP','CIEM','CISV','SPPF_ALBUM'], // SPPF requiert IS
  doit_matcher:  ['SACEM_AUTOPRODUCTION'],
});

// ── P07 : Éditeur IS TPE jazz → CNM art.37 pas art.38 ────────────────────────
test('P07 — Éditeur IS TPE jazz / CNM Édition art.37 / pas art.38', [
  ['aci',                  'non'],
  ['has_struct',           'oui'],
  ['forme',                'IS'],
  ['tpe',                  'oui'],
  ['activites',            ['edition']],
  ['sacem_struct',         'oui'],
  ['franco',               'oui'],
  ['droits_sacem_annuel',  '1500_5k'],
  ['genre',                ['jazz']],
  ['projets',              ['album']],
], {
  steps_affiches: ['aci','has_struct','forme','tpe','activites','sacem_struct','franco','droits_sacem_annuel','genre','projets'],
  steps_masques:  ['ca_phono_pct','adhesions_struct','distrib','nt','esv_details'],
  nb_steps: 10,
  doit_matcher:   ['CIEM','CNM_EDITION_CONTEMPORAINE_JAZZ','SACEM_DEV_EDITORIAL_CONTEMP'],
  ne_doit_pas:    ['CNM_EDITION','SACEM_DEV_EDITORIAL_MA'],
});

// ── P08 : ESV cat2 IS / tournée / CISV + FONPEPS ─────────────────────────────
test('P08 — ESV cat2 IS / tournée / CISV + FONPEPS + CNM SV', [
  ['aci',         'non'],
  ['has_struct',  'oui'],
  ['forme',       'IS'],
  ['tpe',         'oui'],
  ['activites',   ['esv']],
  ['esv_details', 'cat2'],
  ['genre',       ['ma']],
  ['projets',     ['tournee']],
], {
  // sacem_struct s'affiche aussi pour ESV (une ESV peut être membre SACEM)
  steps_affiches: ['aci','has_struct','forme','tpe','activites','sacem_struct','esv_details','genre','projets'],
  steps_masques:  ['ca_phono_pct','adhesions_struct','distrib','franco','droits_sacem_annuel','nt'],
  nb_steps: 9,
  doit_matcher:   ['CISV','FONPEPS_APAJ','CNM_SPECTACLE_VIVANT','CNM_DROIT_TIRAGE','CNM_CREATION_SPECTACLE'],
  ne_doit_pas:    ['CIPP','CIEM','CNM_PROMOTEURS_DIFFUSEURS'],
  conflits:       [],
});

// ── P09 : ESV cat1 / FONPEPS inaccessible ────────────────────────────────────
test('P09 — ESV cat1 exploitant lieu fixe / FONPEPS inaccessible', [
  ['aci',         'non'],
  ['has_struct',  'oui'],
  ['forme',       'IS'],
  ['tpe',         'oui'],
  ['activites',   ['esv']],
  ['esv_details', 'cat1'],
  ['genre',       ['ma']],
  ['projets',     ['tournee']],
], {
  ne_doit_pas:  ['FONPEPS_APAJ'],
  doit_matcher: ['CISV','CNM_DROIT_TIRAGE'],
});

// ── P10 : ESV cat3 / CNM Promoteurs-Diffuseurs ───────────────────────────────
test('P10 — ESV cat3 / CNM Promoteurs-Diffuseurs accessible', [
  ['aci',         'non'],
  ['has_struct',  'oui'],
  ['forme',       'IS'],
  ['tpe',         'oui'],
  ['activites',   ['esv']],
  ['esv_details', 'cat3'],
  ['genre',       ['ma']],
  ['projets',     ['tournee']],
], {
  doit_matcher: ['CISV','FONPEPS_APAJ','CNM_PROMOTEURS_DIFFUSEURS','CNM_DROIT_TIRAGE'],
});

// ── P11 : SASU ACI + structure IS — double périmètre complet ─────────────────
test('P11 — SASU IS ACI SACEM+ADAMI / double périmètre / album+clip', [
  ['aci',              'oui'],
  ['affiliations_vous',['sacem','adami']],
  ['revenus_artiste',  'inf15k'],
  ['has_struct',       'oui'],
  ['forme',            'IS'],
  ['tpe',              'oui'],
  ['activites',        ['prod_phono']],
  ['ca_phono_pct',     'oui'],
  ['sacem_struct',     'non'],
  ['adhesions_struct', 'sppf'],
  ['distrib',          'physique_cosigne'],
  ['franco',           'oui'],
  ['nt',               'inf50k'],
  ['genre',            ['ma']],
  ['projets',          ['album','clip']],
], {
  nb_steps: 15, // tous sauf droits_sacem_annuel, esv_details, generation_spedidam
  doit_matcher: [
    'SACEM_AUTOPRODUCTION',   // périmètre vous
    'ADAMI_2D3D',             // périmètre vous
    'ADAMI_365',              // périmètre vous
    'CIPP',                   // périmètre struct
    'CNM_PRODUCTION_AUTO',    // périmètre struct
    'CNM_PRODUCTION',         // périmètre struct
    'CNM_CLIP',               // périmètre struct
    'SPPF_ALBUM',             // périmètre struct
    'SPPF_GRM',               // périmètre struct
    'SPPF_BONIFICATION_ADAMI',// périmètre struct
    'SPPF_VIDEO',             // périmètre struct
  ],
  ne_doit_pas: ['CIEM','CISV','SCPP_PHONOGRAMME'],
  potentiel_min: 50000,
});

// ── P12 : Label multi IS / prod+édition+ESV / 3 conflits CI ──────────────────
test('P12 — Label multi IS / prod+édition+ESV / 3 conflits crédits impôt', [
  ['aci',                 'non'],
  ['has_struct',          'oui'],
  ['forme',               'IS'],
  ['tpe',                 'oui'],
  ['activites',           ['prod_phono','edition','esv']],
  ['ca_phono_pct',        'oui'],
  ['sacem_struct',        'oui'],
  ['droits_sacem_annuel', 'sup5k'],
  ['adhesions_struct',    'sppf'],
  ['distrib',             'physique_cosigne'],
  ['franco',              'oui'],
  ['esv_details',         'cat2'],
  ['nt',                  'inf50k'],
  ['genre',               ['ma']],
  ['projets',             ['album','tournee']],
], {
  doit_matcher: ['CIPP','CIEM','CISV'],
  conflits: [
    ['CIPP','CIEM'],
    ['CIPP','CISV'],
    ['CIEM','CISV'],
  ],
  potentiel_min: 80000,
});

// ── P13 : Distribution numérique seule → SPPF/CNM bloqués ────────────────────
test('P13 — Distrib numérique seule / SPPF Album + CNM Auto bloqués', [
  ['aci',              'non'],
  ['has_struct',       'oui'],
  ['forme',            'IS'],
  ['tpe',              'oui'],
  ['activites',        ['prod_phono']],
  ['ca_phono_pct',     'oui'],
  ['sacem_struct',     'non'],
  ['adhesions_struct', 'sppf'],
  ['distrib',          'numerique_seul'],
  ['franco',           'oui'],
  ['nt',               'inf50k'],
  ['genre',            ['ma']],
  ['projets',          ['album']],
], {
  ne_doit_pas: ['SPPF_ALBUM','CNM_PRODUCTION_AUTO','CNM_PRODUCTION','SCPP_PHONOGRAMME'],
  // CIPP reste accessible (pas de critère distrib)
  doit_matcher: ['CIPP'],
});

// ── P14 : CA phono < 50% → CIPP + CNM Production bloqués ─────────────────────
test('P14 — CA phono < 50% / CIPP et CNM Production bloqués', [
  ['aci',              'non'],
  ['has_struct',       'oui'],
  ['forme',            'IS'],
  ['tpe',              'oui'],
  ['activites',        ['prod_phono','management']],
  ['ca_phono_pct',     'non'],
  ['sacem_struct',     'non'],
  ['adhesions_struct', 'sppf'],
  ['distrib',          'physique_cosigne'],
  ['franco',           'oui'],
  ['nt',               'inf50k'],
  ['genre',            ['ma']],
  ['projets',          ['album']],
], {
  ne_doit_pas:  ['CIPP','CNM_PRODUCTION_AUTO','CNM_PRODUCTION'],
  doit_matcher: ['SPPF_ALBUM'],
});

// ── P15 : Export jazz urgent ──────────────────────────────────────────────────
test('P15 — Export jazz / CNM Mobilité Jazz IMMINENT / pas Mobilité Indiv', [
  ['aci',              'non'],
  ['has_struct',       'oui'],
  ['forme',            'IS'],
  ['tpe',              'oui'],
  ['activites',        ['prod_phono']],
  ['ca_phono_pct',     'oui'],
  ['sacem_struct',     'non'],
  ['adhesions_struct', 'aucune'],
  ['distrib',          'physique_cosigne'],
  ['franco',           'oui'],
  ['nt',               'sup100k'],
  ['genre',            ['jazz']],
  ['projets',          ['album','export']],
], {
  doit_matcher: ['CNM_EXPORT_MA1','CNM_MOBILITE_JAZZ'],
  ne_doit_pas:  ['CNM_MOBILITE_INDIVIDUELLE'],
});

// ── P16 : Export gros budget > 20k → MA2 ─────────────────────────────────────
test('P16 — Export gros > 20k€ / CNM Export MA2 accessible', [
  ['aci',              'non'],
  ['has_struct',       'oui'],
  ['forme',            'IS'],
  ['tpe',              'oui'],
  ['activites',        ['prod_phono']],
  ['ca_phono_pct',     'oui'],
  ['sacem_struct',     'non'],
  ['adhesions_struct', 'aucune'],
  ['distrib',          'physique_cosigne'],
  ['franco',           'oui'],
  ['nt',               'sup100k'],
  ['genre',            ['ma']],
  ['projets',          ['album','export','export_gros']],
], {
  doit_matcher: ['CNM_EXPORT_MA1','CNM_EXPORT_MA2','CNM_MOBILITE_INDIVIDUELLE'],
  ne_doit_pas:  ['CNM_MOBILITE_JAZZ'],
});

// ── P17 : SCPP licencié / Marketing OK / Phonogramme NON ─────────────────────
test('P17 — SCPP licencié exclusif / Marketing accessible / Phonogramme non', [
  ['aci',              'non'],
  ['has_struct',       'oui'],
  ['forme',            'IS'],
  ['tpe',              'oui'],
  ['activites',        ['prod_phono']],
  ['ca_phono_pct',     'oui'],
  ['sacem_struct',     'non'],
  ['adhesions_struct', 'scpp_licencie'],
  ['distrib',          'physique_cosigne'],
  ['franco',           'oui'],
  ['nt',               'sup100k'],
  ['genre',            ['ma']],
  ['projets',          ['album','promo']],
], {
  doit_matcher: ['SCPP_MARKETING'],
  ne_doit_pas:  ['SCPP_PHONOGRAMME','SPPF_ALBUM'],
});

// ── P18 : Catalogue non francophone → CIPP/CIEM bloqués ──────────────────────
test('P18 — Catalogue non francophone / CIPP et CIEM inaccessibles', [
  ['aci',              'non'],
  ['has_struct',       'oui'],
  ['forme',            'IS'],
  ['tpe',              'oui'],
  ['activites',        ['prod_phono','edition']],
  ['ca_phono_pct',     'oui'],
  ['sacem_struct',     'oui'],
  ['droits_sacem_annuel','sup5k'],
  ['adhesions_struct', 'sppf'],
  ['distrib',          'physique_cosigne'],
  ['franco',           'non'], // ← < 50% français
  ['nt',               'inf50k'],
  ['genre',            ['ma']],
  ['projets',          ['album']],
], {
  ne_doit_pas:  ['CIPP','CIEM'],
  doit_matcher: ['SPPF_ALBUM','CNM_PRODUCTION_AUTO','CNM_PRODUCTION'],
});

// ── P19 : Structuration → CNM Art84 + Art85 en conflit ───────────────────────
test('P19 — Structuration IS / CNM Art.84 + Art.85 en conflit', [
  ['aci',              'non'],
  ['has_struct',       'oui'],
  ['forme',            'IS'],
  ['tpe',              'oui'],
  ['activites',        ['prod_phono']],
  ['ca_phono_pct',     'oui'],
  ['sacem_struct',     'non'],
  ['adhesions_struct', 'aucune'],
  ['distrib',          'numerique_seul'],
  ['franco',           'oui'],
  ['nt',               'sup100k'],
  ['genre',            ['ma']],
  ['projets',          ['structuration']],
], {
  doit_matcher: ['CNM_DEV_ECONOMIQUE','CNM_RESTRUCTURATION'],
  conflits:     [['CNM_DEV_ECONOMIQUE','CNM_RESTRUCTURATION']],
});

// ── P20 : Parcours complet label E maximal ───────────────────────────────────
test('P20 — Label E maximal / toutes activités / potentiel maximum', [
  ['aci',                 'oui'],
  ['affiliations_vous',   ['sacem','adami','spedidam']],
  ['revenus_artiste',     '15k_60k'],
  ['has_struct',          'oui'],
  ['forme',               'IS'],
  ['tpe',                 'oui'],
  ['activites',           ['prod_phono','edition','esv']],
  ['ca_phono_pct',        'oui'],
  ['sacem_struct',        'oui'],
  ['droits_sacem_annuel', 'sup5k'],
  ['adhesions_struct',    'sppf'],
  ['distrib',             'physique_cosigne'],
  ['franco',              'oui'],
  ['esv_details',         'cat2'],
  ['nt',                  'inf50k'],
  ['genre',               ['ma']],
  ['projets',             ['album','clip','showcase','tournee','export']],
], {
  // Minimum 15 aides attendues pour un profil E maximal
  doit_matcher: [
    'CIPP','CIEM','CISV',
    'CNM_PRODUCTION_AUTO','CNM_PRODUCTION','CNM_CLIP',
    'SPPF_ALBUM','SPPF_VIDEO','SPPF_SHOWCASE','SPPF_GRM',
    'CNM_BOURSE_PARCOURS',
    'FONPEPS_APAJ',
  ],
  conflits: [
    ['CIPP','CIEM'],
    ['CIPP','CISV'],
    ['CIEM','CISV'],
  ],
  potentiel_min: 100000,
});

// ══════════════════════════════════════════════════════════════════════════════
// BILAN
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n' + '═'.repeat(60));
console.log(`BILAN : ${passed} tests passés / ${passed + failed} total`);

if (failed > 0) {
  console.log(`\n🔴 ${failed} ÉCHEC(S) — CORRIGER AVANT DÉPLOIEMENT\n`);
  process.exit(1);
} else {
  console.log('\n✅ TOUS LES PARCOURS VALIDÉS — OK POUR DÉPLOIEMENT\n');
  process.exit(0);
}

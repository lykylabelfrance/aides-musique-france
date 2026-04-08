
/**
 * AIDES_CRITERES.JS — Source de vérité unique
 * Module Aides & Subventions Musicales — LYKY LABEL FRANCE
 * Version 7.0 — Avril 2026
 *
 * PRINCIPE : chaque aide est un objet avec ses conditions formalisées en fonctions pures.
 * Le moteur matcher.js lit ces données — il ne hardcode rien.
 * Toute modification de critère doit se faire ICI uniquement.
 *
 * STRUCTURE d'une fiche aide :
 *   id              — identifiant unique
 *   nom             — nom complet
 *   organisme       — entité gestionnaire
 *   scope           — 'vous' (personne physique) | 'struct' (structure)
 *   chip_css        — classe CSS pour l'affichage chip
 *   montant_label   — texte montant affiché
 *   source          — article de loi ou URL officielle
 *   eligible(a)     — fonction pure : retourne true si éligible, false sinon
 *   taux(a)         — fonction pure : retourne { pct, label } (optionnel)
 *   non_cumul       — liste d'IDs incompatibles sur mêmes dépenses
 *   badges(a)       — fonction pure : retourne tableau de badges { c, l }
 *   alertes         — tableau de strings — notes métier critiques
 *   potentiel_min   — estimation basse pour calcul potentiel
 *   ferme           — true si aide actuellement fermée (afficher alerte)
 */

'use strict';

// ── Helpers internes ──────────────────────────────────────────────────────────
const _has = (a, key, val) => Array.isArray(a[key]) && a[key].includes(val);
const _is  = (a, key, val) => a[key] === val;
const _IS  = a => _is(a, 'forme', 'IS');
const _TPE = a => _IS(a) && _is(a, 'tpe', 'oui');
const _phono    = a => _has(a, 'activites', 'prod_phono');
const _edition  = a => _has(a, 'activites', 'edition');
const _esv      = a => _has(a, 'activites', 'esv');
const _licESV   = a => ['cat1','cat2','cat3'].includes(a.esv_details);
const _licESV_f = a => ['cat2','cat3'].includes(a.esv_details); // FONPEPS : cat2+3 seulement
const _FRANCO   = a => _is(a, 'franco', 'oui');
const _SPPF     = a => _is(a, 'adhesions_struct', 'sppf');
const _SCPP_p   = a => _is(a, 'adhesions_struct', 'scpp_producteur');
const _SCPP_l   = a => _is(a, 'adhesions_struct', 'scpp_licencie');
const _phyC     = a => _is(a, 'distrib', 'physique_cosigne');
const _phyS     = a => _is(a, 'distrib', 'physique_seul');
const _hasPhys  = a => _phyC(a) || _phyS(a);
const _caphono  = a => _is(a, 'ca_phono_pct', 'oui') || _is(a, 'ca_phono_pct', 'seuil');
const _nt_cipp  = a => ['inf50k','50k_100k'].includes(a.nt); // < 100k pour CIPP
const _nt_cnm   = a => _is(a, 'nt', 'inf50k');               // < 50k pour CNM
const _ACI      = a => _is(a, 'aci', 'oui');
const _sacemP   = a => _has(a, 'affiliations_vous', 'sacem');
const _adamiP   = a => _has(a, 'affiliations_vous', 'adami');
const _spediP   = a => _has(a, 'affiliations_vous', 'spedidam');
const _sacemOK  = a => _sacemP(a) || _is(a, 'sacem_struct', 'oui'); // perso OU struct
const _struct   = a => _is(a, 'has_struct', 'oui');
const _jazz     = a => _has(a, 'genre', 'jazz');
const _contemp  = a => _has(a, 'genre', 'contemporain');
// Projets
const _pAlbum   = a => _has(a, 'projets', 'album');
const _pClip    = a => _has(a, 'projets', 'clip');
const _pShowcase= a => _has(a, 'projets', 'showcase');
const _pTournee = a => _has(a, 'projets', 'tournee');
const _pExport  = a => _has(a, 'projets', 'export') || _has(a, 'projets', 'export_gros');
const _pExGros  = a => _has(a, 'projets', 'export_gros');
const _pEAC     = a => _has(a, 'projets', 'eac');
const _pEcr     = a => _has(a, 'projets', 'ecriture');
const _pPromo   = a => _has(a, 'projets', 'promo');
const _pStruct  = a => _has(a, 'projets', 'structuration');
const _pSV      = a => _pTournee(a) || _pShowcase(a);

// ── Export ────────────────────────────────────────────────────────────────────
const AIDES = {

  // ════════════════════════════════════════════════════════════════
  // CRÉDITS D'IMPÔT — DGFiP
  // ════════════════════════════════════════════════════════════════

  CIPP: {
    id: 'CIPP',
    nom: 'Crédit d\'Impôt Phonographique',
    organisme: 'DGFiP',
    scope: 'struct',
    chip_css: 'ch-dgfip',
    montant_label: 'Jusqu\'à 40% des dépenses',
    source: 'art.220 octies CGI',
    // CONDITIONS : IS + prod phono principale (≥50% CA) + franco + projet album
    eligible: a =>
      _IS(a) && _struct(a) && _phono(a) && _FRANCO(a) &&
      _pAlbum(a) && _caphono(a),
    taux: a => {
      if (_TPE(a) && _nt_cipp(a)) return { pct: 40, label: '40% (TPE + NT ✅)' };
      if (_TPE(a))                 return { pct: 40, label: '40% (TPE)' };
      return                              { pct: 20, label: '20% standard' };
    },
    badges: a => {
      const b = [];
      if (_TPE(a))     b.push({ c: 'mb-tpe', l: '✓ TPE 40%' });
      if (_nt_cipp(a)) b.push({ c: 'mb-nt',  l: '★ NT < 100k (÷150)' });
      return b;
    },
    non_cumul: ['CIEM', 'CISV'],
    alertes: [
      'Non cumulable CIEM et CISV sur mêmes dépenses (art.220 septdecies IV CGI)',
      'Production phono doit être l\'activité principale : ≥ 50% CA de la structure',
      'NT CIPP : < 100 000 éq-ventes — streams ÷ 150 (≠ CNM ÷ 1 500)',
      'CIPP exclu du calcul fonds propres pour CNM Clip',
    ],
    potentiel_min: 20000,
  },

  CIEM: {
    id: 'CIEM',
    nom: 'Crédit d\'Impôt Éditeurs de Musique',
    organisme: 'DGFiP',
    scope: 'struct',
    chip_css: 'ch-dgfip',
    montant_label: 'Jusqu\'à 30% des dépenses',
    source: 'art.220 septdecies CGI',
    // CONDITIONS : IS + édition + franco + dépenses éditoriales actives
    // NT = condition d'ENTRÉE du catalogue (pas de taux supérieur)
    // Aucun seuil de droits perçus (≠ SACEM Dév. Éditorial)
    eligible: a =>
      _IS(a) && _struct(a) && _edition(a) && _FRANCO(a) &&
      (_pAlbum(a) || _pPromo(a)),
    taux: a => {
      if (_TPE(a)) return { pct: 30, label: '30% (TPE — NT condition entrée)' };
      return              { pct: 15, label: '15% standard' };
    },
    badges: a => _TPE(a) ? [{ c: 'mb-tpe', l: '✓ TPE 30%' }] : [],
    non_cumul: ['CIPP', 'CISV'],
    alertes: [
      'NT = condition d\'entrée obligatoire dans le catalogue édité — PAS de taux supérieur',
      'Aucun seuil de droits perçus (≠ SACEM Dév. Éditorial qui exige 5 000€/an)',
      'Non cumulable CIPP et CISV sur mêmes dépenses (art.220 septdecies IV CGI)',
    ],
    potentiel_min: 15000,
  },

  CISV: {
    id: 'CISV',
    nom: 'Crédit d\'Impôt Spectacle Vivant',
    organisme: 'DGFiP',
    scope: 'struct',
    chip_css: 'ch-dgfip',
    montant_label: 'Jusqu\'à 30% des dépenses',
    source: 'art.220 quindecies CGI',
    // CONDITIONS : IS + ESV + licence valide + projet spectacle actif
    eligible: a =>
      _IS(a) && _struct(a) && _esv(a) && _licESV(a) && _pSV(a),
    taux: a => {
      if (_TPE(a)) return { pct: 30, label: '30% MAX (AUCUN NT sur CISV)' };
      return              { pct: 15, label: '15% standard' };
    },
    badges: a => _TPE(a) ? [{ c: 'mb-tpe', l: '✓ TPE 30% max absolu' }] : [],
    non_cumul: ['CIPP', 'CIEM'],
    alertes: [
      'CISV = 30% MAXIMUM ABSOLU — AUCUN taux Nouveaux Talents (art.220 quindecies CGI)',
      'Non cumulable CIPP et CIEM sur mêmes dépenses',
      'Cumulable FONPEPS/APAJ',
    ],
    potentiel_min: 10000,
  },

  // ════════════════════════════════════════════════════════════════
  // SACEM
  // ════════════════════════════════════════════════════════════════

  SACEM_AUTOPRODUCTION: {
    id: 'SACEM_AUTOPRODUCTION',
    nom: 'Aide à l\'Autoproduction SACEM',
    organisme: 'SACEM',
    scope: 'vous',
    chip_css: 'ch-sacem',
    montant_label: '5 000€',
    source: 'aide-aux-projets.sacem.fr — mars 2026',
    eligible: a =>
      _ACI(a) && _sacemP(a) && _pAlbum(a) &&
      // Minimum 5 titres inédits (si renseigné — sinon on laisse passer)
      !_is(a, 'nb_titres_album', 'moins_5') &&
      // Fenêtre : pas sorti depuis > 6 mois (album_timing absent = pas encore sorti = éligible)
      !_is(a, 'album_timing', 'sorti_plus_6mois'),
    taux: () => ({ label: '5 000€ forfait fixe — 1er/2ème/3ème enregistrement' }),
    badges: () => [],
    non_cumul: [],
    alertes: [
      'Forfait fixe 5 000€ — 1er, 2ème ou 3ème enregistrement autoproduit uniquement',
      'Dépôt APRÈS la sortie intégrale du projet — jamais avant',
      'Délai maximum : 6 mois après la date de sortie',
      'Calendrier 2026 : ouverture 2 février → fermeture 30 octobre',
      'Lettre de recommandation d\'un accompagnateur professionnel OBLIGATOIRE',
      'Sortie physique seule : 250 exemplaires minimum',
      'Refus = pas de redépôt possible sur le même projet',
      'Dossier en ligne uniquement — aucun courrier accepté',
      'Incompatible si la structure IS perçoit déjà le CIPP sur le même projet',
    ],
    potentiel_min: 5000,
  },

  SACEM_DEV_EDITORIAL_MA: {
    id: 'SACEM_DEV_EDITORIAL_MA',
    nom: 'Dév. Éditorial SACEM — Musiques Actuelles',
    organisme: 'SACEM',
    scope: 'struct',
    chip_css: 'ch-sacem',
    montant_label: 'Variable',
    source: 'aide-aux-projets.sacem.fr',
    // SEUIL : moyenne droits ≥ 5 000€/an sur 2 ans (4 répartitions ÷ 2)
    eligible: a =>
      _struct(a) && _edition(a) && _sacemOK(a) &&
      _is(a, 'droits_sacem_annuel', 'sup5k'),
    taux: () => ({ label: 'Aide sélective' }),
    badges: () => [],
    non_cumul: [],
    alertes: [
      'Seuil : MOYENNE droits ≥ 5 000€/an sur 2 ans (4 répartitions SACEM ÷ 2)',
      'Distinct du CIEM — ce seuil ne s\'applique PAS au crédit d\'impôt',
    ],
    potentiel_min: 8000,
  },

  SACEM_DEV_EDITORIAL_CONTEMP: {
    id: 'SACEM_DEV_EDITORIAL_CONTEMP',
    nom: 'Dév. Éditorial SACEM — Musique Contemporaine',
    organisme: 'SACEM',
    scope: 'struct',
    chip_css: 'ch-sacem',
    montant_label: 'Variable',
    source: 'aide-aux-projets.sacem.fr',
    // SEUIL : ≥ 1 500€ sur AU MOINS 1 des 2 dernières années + genre contemporain OU jazz
    // Le SACEM Dév. Éditorial Contemporain couvre la musique contemporaine ET le jazz (comme CNM art.37)
    eligible: a =>
      _struct(a) && _edition(a) && _sacemOK(a) && (_contemp(a) || _jazz(a)) &&
      (_is(a, 'droits_sacem_annuel', 'sup5k') || _is(a, 'droits_sacem_annuel', '1500_5k')),
    taux: () => ({ label: 'Aide sélective' }),
    badges: () => [],
    non_cumul: [],
    alertes: ['Seuil : ≥ 1 500€ sur au moins 1 des 2 dernières années'],
    potentiel_min: 5000,
  },

  SACEM_CREATION_SPECTACLE: {
    id: 'SACEM_CREATION_SPECTACLE',
    nom: 'Création de Spectacle Musical SACEM',
    organisme: 'SACEM',
    scope: 'struct',
    chip_css: 'ch-sacem',
    montant_label: 'Variable',
    source: 'aide-aux-projets.sacem.fr',
    eligible: a =>
      _struct(a) && (_esv(a) || _phono(a)) && _sacemOK(a) &&
      (_pTournee(a) || _pShowcase(a) || _pAlbum(a)),
    taux: () => ({ label: 'Aide sélective' }),
    badges: () => [],
    non_cumul: [],
    alertes: ['Œuvres musicales originales requises — pas de reprise exclusive'],
    potentiel_min: 6000,
  },

  // SACEM Export MA — FERMÉ (signaler uniquement, ne pas matcher)
  SACEM_TOURNEE_EXPORT_MA: {
    id: 'SACEM_TOURNEE_EXPORT_MA',
    nom: 'Aide Tournées & Showcases Export SACEM',
    organisme: 'SACEM',
    scope: 'struct',
    chip_css: 'ch-sacem',
    montant_label: 'FERMÉ',
    source: 'aide-aux-projets.sacem.fr',
    ferme: true,
    // On ne matche JAMAIS cette aide — elle est fermée
    // Elle est listée pour que l'alerte puisse être déclenchée
    eligible: () => false,
    taux: () => ({ label: 'FERMÉ' }),
    badges: () => [{ c: 'mb-ferme', l: '⛔ Actuellement fermée' }],
    non_cumul: [],
    alertes: [
      '⛔ AIDE FERMÉE — L\'aide aux tournées et showcases à l\'international SACEM est actuellement fermée',
      'Alternatives : CNM Export MA1/MA2, SPEDIDAM Déplacement International',
    ],
    potentiel_min: 0,
  },

  // ════════════════════════════════════════════════════════════════
  // CNM
  // ════════════════════════════════════════════════════════════════

  CNM_PRODUCTION_AUTO: {
    id: 'CNM_PRODUCTION_AUTO',
    nom: 'Compte Automatique Production Phonographique CNM',
    organisme: 'CNM',
    scope: 'struct',
    chip_css: 'ch-cnm',
    montant_label: 'Plafond 350 000€ / compte',
    source: 'cnm.fr — RGA CNM — délibérations 2025-2026',
    eligible: a =>
      _struct(a) && _phono(a) && _phyC(a) && _pAlbum(a) && _caphono(a),
    taux: () => ({ label: 'Compte automatique — mobiliser EN PREMIER' }),
    badges: () => [{ c: 'mb-ca', l: '⚠ Mobiliser EN PREMIER' }],
    non_cumul: [],
    alertes: [
      'OBLIGATOIRE avant tout dépôt aide sélective CNM (depuis juillet 2025)',
      'Plafond par compte : 350 000€ (≠ les 250 000€ souvent cités)',
      'Période déclaration 2026 : 9 mars – 30 avril · Période mobilisation : 11 mai – 30 sept.',
      'Bilan N-1 à déposer avant le 28 février sinon compte bloqué',
      'Min 2 projets/an + 50 000€ d\'investissements phono en moyenne sur 2 ans',
      'Mobilisation 1 seule fois par an — avant le 30 septembre',
      'TuneCore/DistroKid = INÉLIGIBLE — contrat distributeur cosigné requis',
      'Production phono doit représenter ≥ 50% du CA de la structure',
    ],
    potentiel_min: 8000,
  },

  CNM_PRODUCTION: {
    id: 'CNM_PRODUCTION',
    nom: 'Aide Sélective Production Phonographique CNM',
    organisme: 'CNM',
    scope: 'struct',
    chip_css: 'ch-cnm',
    montant_label: 'Max 15 000€ (MA) · 20 000€ (classique)',
    source: 'cnm.fr — RGA art.46-52',
    eligible: a =>
      _struct(a) && _phono(a) && _phyC(a) && _nt_cnm(a) && _caphono(a) &&
      // Ancienneté ≥ 1 an (absent = non renseigné = on laisse passer, alerte dans notes)
      !_is(a, 'anciennete_struct', 'moins_1an') &&
      // Catalogue ≥ 3 références (absent = non renseigné = on laisse passer)
      !_is(a, 'nb_albums_produits', 'aucun') && !_is(a, 'nb_albums_produits', '1_ou_2') &&
      // CA ≥ 30k€
      !_is(a, 'ca_struct', 'inf30k'),
    taux: () => ({ label: '30% dépenses éligibles' }),
    badges: () => [
      { c: 'mb-ca', l: '⚠ CNM auto requis avant' },
      { c: 'mb-dl', l: '📅 20 mai 2026' },
    ],
    non_cumul: [],
    alertes: [
      'MA : max 15 000€/projet · Classique/contemporain : max 20 000€ · Plafond annuel : 100 000€',
      'Plafond cumulé vie (auto + sélective + clip) : 250 000€',
      'NT CNM : < 50 000 éq-ventes — streams ÷ 1 500 (≠ CIPP ÷ 150)',
      'TuneCore/DistroKid self-release = REFUS automatique',
      '50% CA phono obligatoire — piège des structures multi-activités',
      'CA structure minimum : 30 000€ OU moyenne 2 derniers exercices',
      'Ancienneté structure : 1 an minimum',
      'Catalogue min : ≥ 3 références déjà produites (chacune ≥5 phonogrammes ou >20 min)',
      'Album : ≥ 5 phonogrammes ET/OU > 20 minutes · ≥ 50% d\'œuvres inédites',
      'Affilier CNM avant le 23 avril pour la session de mai',
    ],
    potentiel_min: 8000,
  },

  CNM_CLIP: {
    id: 'CNM_CLIP',
    nom: 'Aide à la Production de Vidéomusique CNM',
    organisme: 'CNM',
    scope: 'struct',
    chip_css: 'ch-cnm',
    montant_label: 'Max 15 000€',
    source: 'cnm.fr',
    eligible: a => _struct(a) && _phono(a) && _pClip(a),
    taux: () => ({ label: '30% budget HT' }),
    badges: () => [{ c: 'mb-dl', l: '📅 3 juin 2026' }],
    non_cumul: [],
    alertes: [
      'Clip NON DIFFUSÉ avant commission — même 15 secondes privées = irrecevable',
      'RSE : +10% si ≥ 3/5 critères parité équipe',
      'CIPP exclu du calcul fonds propres',
      'Hors EEE autorisé — avantage unique CNM',
      'Cumul SCPP Vidéo + CNC autorisé',
    ],
    potentiel_min: 6000,
  },

  CNM_SPECTACLE_VIVANT: {
    id: 'CNM_SPECTACLE_VIVANT',
    nom: 'Aide Production & Diffusion Spectacle Vivant CNM',
    organisme: 'CNM',
    scope: 'struct',
    chip_css: 'ch-cnm',
    montant_label: 'Max 75 000€/projet · 300 000€/an',
    source: 'cnm.fr — RGA section 5',
    eligible: a => _struct(a) && _esv(a) && _licESV(a) && _pSV(a),
    taux: () => ({ label: 'Aide sélective diffusion' }),
    badges: () => [{ c: 'mb-ca', l: '⚠ CNM auto requis' }],
    non_cumul: [],
    alertes: [
      'Plafond : 75 000€/projet · 300 000€/bénéficiaire/an',
      'Financement public max : 50% du budget total (aide CNM incluse)',
      'Versement : 70% acompte à la décision + 30% solde sur bilan (6 mois max après fin projet)',
      'MA : min 8 représentations sur 18 mois · Classique/contemporain : 6 sur 24 mois',
      'RSE : +10% si ≥50% critères parité plateau artistique + technique',
      'AIDE INDIRECTE — c\'est le DIFFUSEUR qui dépose le dossier, pas le producteur',
      'Délai instruction : 8 semaines (≠ 4 semaines autres dispositifs CNM)',
    ],
    potentiel_min: 15000,
  },

  CNM_CREATION_SPECTACLE: {
    id: 'CNM_CREATION_SPECTACLE',
    nom: 'Aide à la Création de Spectacle CNM',
    organisme: 'CNM',
    scope: 'struct',
    chip_css: 'ch-cnm',
    montant_label: 'Max 75 000€/projet · 300 000€/an',
    source: 'cnm.fr — RGA section 5',
    eligible: a => _struct(a) && _esv(a) && _licESV(a) && _pTournee(a),
    taux: () => ({ label: 'Aide sélective création' }),
    badges: () => [{ c: 'mb-ca', l: '⚠ CNM auto requis' }],
    non_cumul: [],
    alertes: [
      'Phase finançable : CRÉATION artistique uniquement — pas la diffusion/tournée',
      'Création scénique avec mise en scène obligatoire — simple concert = refus automatique',
      'Min 8 représentations sur 18 mois (MA) · Min 5 sur 18 mois (classique/contemp)',
      'Plafond : 75 000€/projet · 300 000€/bénéficiaire/an',
      '60-70% du budget éligible doit être artistique ou technique de création',
      'Distincte de CNM_SPECTACLE_VIVANT (diffusion) — deux dispositifs différents',
    ],
    potentiel_min: 12000,
  },

  CNM_DROIT_TIRAGE: {
    id: 'CNM_DROIT_TIRAGE',
    nom: 'Droit de Tirage Spectacle Vivant CNM',
    organisme: 'CNM',
    scope: 'struct',
    chip_css: 'ch-cnm',
    montant_label: '60% taxe → votre compte',
    source: 'cnm.fr — RGA CNM',
    eligible: a => _struct(a) && _esv(a) && _licESV(a),
    taux: () => ({ label: 'Compte automatique' }),
    badges: () => [{ c: 'mb-dl', l: '⏰ Prescription N+3' }],
    non_cumul: [],
    alertes: [
      'PAS une subvention — redistribution de vos propres fonds issus de la taxe (60%)',
      'Prescription N+3 (31 déc. de la 3ème année) — perte DÉFINITIVE si non mobilisé',
      'DUERP + VHSS cadres OBLIGATOIRES depuis avril 2025 — condition bloquante',
      'Dates prévisionnelles OBLIGATOIREMENT postérieures à la date de dépôt de la demande',
      'Déclarer la taxe dans les 3 mois après chaque représentation',
    ],
    potentiel_min: 3000,
  },

  CNM_PROMOTEURS_DIFFUSEURS: {
    id: 'CNM_PROMOTEURS_DIFFUSEURS',
    nom: 'Aide Promoteurs-Diffuseurs CNM (Licence 3)',
    organisme: 'CNM',
    scope: 'struct',
    chip_css: 'ch-cnm',
    montant_label: 'Max 75 000€',
    source: 'cnm.fr',
    // Réservé licence cat.3 uniquement
    eligible: a => _struct(a) && _esv(a) && _is(a, 'esv_details', 'cat3'),
    taux: () => ({ label: 'Aide sélective' }),
    badges: () => [],
    non_cumul: [],
    alertes: [],
    potentiel_min: 20000,
  },

  CNM_EXPORT_MA1: {
    id: 'CNM_EXPORT_MA1',
    nom: 'Aide DI Musiques Actuelles 1 (D1) CNM',
    organisme: 'CNM',
    scope: 'struct',
    chip_css: 'ch-cnm',
    montant_label: 'Max 25 000€',
    source: 'cnm.fr',
    eligible: a => _struct(a) && _pExport(a),
    taux: () => ({ label: 'Aide sélective export' }),
    badges: () => [{ c: 'mb-dl', l: '📅 27 mai 2026' }],
    non_cumul: [],
    alertes: [
      'OGC (SACEM/SPEDIDAM/ADAMI) = HORS calcul des 50% fonds propres',
      'Dépenses Fiche C (promo) : max 30% du budget total — règle stricte RGA',
      'Triptyque obligatoire par action : Pays + Audience + DSP/Outil',
      'BSL (Belgique/Suisse/Lux) = +3 territoires non-francophones',
      'Session 1 passée (23 avr.) — prochaine : 27 mai 2026',
    ],
    potentiel_min: 10000,
  },

  CNM_EXPORT_MA2: {
    id: 'CNM_EXPORT_MA2',
    nom: 'Aide DI Musiques Actuelles 2 (D2) CNM',
    organisme: 'CNM',
    scope: 'struct',
    chip_css: 'ch-cnm',
    montant_label: 'Max 80 000€',
    source: 'cnm.fr',
    // Réservé budgets > 20k€ (export_gros)
    eligible: a => _struct(a) && _pExGros(a),
    taux: () => ({ label: 'Aide sélective export' }),
    badges: () => [{ c: 'mb-dl', l: '🔴 UNE session : 7 sept. 2026' }],
    non_cumul: [],
    alertes: [
      'UNE SEULE SESSION 2026 (7 sept.) — aucune autre chance cette année',
      'Cosignataires CNM à affilier dès juin',
      'BSL (Belgique/Suisse/Lux) = +3 territoires non-francophones',
    ],
    potentiel_min: 30000,
  },

  CNM_MOBILITE_INDIVIDUELLE: {
    id: 'CNM_MOBILITE_INDIVIDUELLE',
    nom: 'Mobilité Individuelle International CNM',
    organisme: 'CNM',
    scope: 'struct',
    chip_css: 'ch-cnm',
    montant_label: 'Variable',
    source: 'cnm.fr',
    // Tous profils sauf jazz (dispositif spécifique)
    eligible: a => _struct(a) && _pExport(a) && !_jazz(a),
    taux: () => ({ label: 'Aide individuelle' }),
    badges: () => [{ c: 'mb-dl', l: '📅 27 mai / 29 juin 2026' }],
    non_cumul: [],
    alertes: [
      'Sessions 2026 : 27 mai et 29 juin',
      'Tous genres musicaux sauf jazz (voir CNM_MOBILITE_JAZZ)',
    ],
    potentiel_min: 2000,
  },

  CNM_MOBILITE_JAZZ: {
    id: 'CNM_MOBILITE_JAZZ',
    nom: 'Mobilité Individuelle Jazz CNM',
    organisme: 'CNM',
    scope: 'struct',
    chip_css: 'ch-cnm',
    montant_label: 'Variable',
    source: 'cnm.fr',
    eligible: a => _struct(a) && _pExport(a) && _jazz(a),
    taux: () => ({ label: 'Aide individuelle jazz' }),
    badges: () => [{ c: 'mb-dl', l: '🔴 IMMINENT : 30 avril 2026' }],
    non_cumul: [],
    alertes: [
      'Sessions 2026 : 30 avril (URGENT — IMMINENT) puis 4 septembre',
      'Exclusivement pour projets jazz',
    ],
    potentiel_min: 2000,
  },

  CNM_EDITION: {
    id: 'CNM_EDITION',
    nom: 'Aide Dév. Éditorial CNM — Musiques Actuelles (Art.38)',
    organisme: 'CNM',
    scope: 'struct',
    chip_css: 'ch-cnm',
    montant_label: 'Variable',
    source: 'cnm.fr — art.38 RGA',
    // MA uniquement — pas jazz ni contemp (ceux-là ont art.37)
    eligible: a => _struct(a) && _edition(a) && !_jazz(a) && !_contemp(a),
    taux: () => ({ label: 'Aide sélective' }),
    badges: () => [{ c: 'mb-ca', l: '⚠ CNM auto requis' }],
    non_cumul: [],
    alertes: [],
    potentiel_min: 5000,
  },

  CNM_EDITION_CONTEMPORAINE_JAZZ: {
    id: 'CNM_EDITION_CONTEMPORAINE_JAZZ',
    nom: 'Aide Édition Contemporaine & Jazz CNM (Art.37)',
    organisme: 'CNM',
    scope: 'struct',
    chip_css: 'ch-cnm',
    montant_label: 'Variable',
    source: 'cnm.fr — art.37 RGA',
    eligible: a => _struct(a) && _edition(a) && (_jazz(a) || _contemp(a)),
    taux: () => ({ label: 'Aide sélective' }),
    badges: () => [{ c: 'mb-ca', l: '⚠ CNM auto requis' }],
    non_cumul: [],
    alertes: [
      'Spécifique jazz et musique contemporaine — article 37 du RGA CNM',
      'Distinct de l\'aide édition MA (art.38)',
    ],
    potentiel_min: 5000,
  },

  CNM_ECRITURE_COMPOSITION: {
    id: 'CNM_ECRITURE_COMPOSITION',
    nom: 'Aide Écriture & Composition CNM (Art.36)',
    organisme: 'CNM',
    scope: 'vous',
    chip_css: 'ch-cnm',
    montant_label: 'Variable',
    source: 'cnm.fr — art.36 RGA',
    // Profils A et F — auteurs-compositeurs en nom propre — projet écriture
    eligible: a => _ACI(a) && _sacemP(a) && _pEcr(a),
    taux: () => ({ label: 'Aide sélective' }),
    badges: () => [],
    non_cumul: [],
    alertes: ['Profils A et F — auteurs-compositeurs en nom propre', 'Distinct de la Bourse Parcours — pas de condition de revenus'],
    potentiel_min: 5000,
  },

  CNM_BOURSE_PARCOURS: {
    id: 'CNM_BOURSE_PARCOURS',
    nom: 'Bourse Parcours Auteurs-Compositeurs CNM',
    organisme: 'CNM',
    scope: 'vous',
    chip_css: 'ch-cnm',
    montant_label: '20 000€ forfait',
    source: 'cnm.fr',
    // PERSONNE PHYSIQUE — revenus ≥ 15k€ cumulés 3 ans + revenu global < 60k€/an
    eligible: a =>
      _ACI(a) && _sacemP(a) && _is(a, 'revenus_artiste', '15k_60k'),
    taux: () => ({ label: 'Forfait unique par carrière' }),
    badges: () => [{ c: 'mb-dl', l: '📅 Jusqu\'au 1er juil. 2026' }],
    non_cumul: [],
    alertes: [
      'PERSONNE PHYSIQUE UNIQUEMENT — une seule fois par carrière',
      'Vocabulaire CRITIQUE : "recherche artistique / langage musical" — jamais "album / marketing"',
      'Formation droits d\'auteur obligatoire 18 mois — non suivi = reversement 20 000€',
      'Revenus artistiques ≥ 15 000€ cumulés 2022+2023+2024 ET revenu global < 60 000€/an',
    ],
    potentiel_min: 20000,
  },

  CNM_DEV_ECONOMIQUE: {
    id: 'CNM_DEV_ECONOMIQUE',
    nom: 'Aide Développement Économique CNM (Art.84)',
    organisme: 'CNM',
    scope: 'struct',
    chip_css: 'ch-cnm',
    montant_label: 'Max 200 000€',
    source: 'cnm.fr — art.84 RGA',
    eligible: a => _IS(a) && _struct(a) && _pStruct(a),
    taux: () => ({ label: 'Dépôt permanent — 4 semaines instruction' }),
    badges: () => [],
    non_cumul: ['CNM_RESTRUCTURATION'], // même exercice
    alertes: ['Non cumulable CNM Restructuration sur même exercice — choisir l\'un ou l\'autre'],
    potentiel_min: 20000,
  },

  CNM_RESTRUCTURATION: {
    id: 'CNM_RESTRUCTURATION',
    nom: 'Aide Restructuration Économique CNM (Art.85)',
    organisme: 'CNM',
    scope: 'struct',
    chip_css: 'ch-cnm',
    montant_label: 'Max 200 000€',
    source: 'cnm.fr — art.85 RGA',
    eligible: a => _IS(a) && _struct(a) && _pStruct(a),
    taux: () => ({ label: 'Dépôt permanent — 6 semaines instruction' }),
    badges: () => [{ c: 'mb-ca', l: '⚠ Minimis 300k€/3ans' }],
    non_cumul: ['CNM_DEV_ECONOMIQUE'], // même exercice
    alertes: [
      'Régime minimis — max 300 000€/3 ans TOUS organismes confondus',
      'Non cumulable CNM Dév. Économique sur même exercice',
      'Narratif CRITIQUE : "transformation/structuration" — jamais "difficulté/survie"',
      'Délai instruction 6 semaines (≠ 4 semaines autres CNM)',
    ],
    potentiel_min: 20000,
  },

  // ════════════════════════════════════════════════════════════════
  // SPPF
  // ════════════════════════════════════════════════════════════════

  SPPF_ALBUM: {
    id: 'SPPF_ALBUM',
    nom: 'Aide à l\'Enregistrement d\'Album SPPF',
    organisme: 'SPPF',
    scope: 'struct',
    chip_css: 'ch-sppf',
    montant_label: '40% cadre de subvention',
    source: 'sppf.com — avril 2026',
    eligible: a =>
      _IS(a) && _struct(a) && _SPPF(a) && _hasPhys(a) && _pAlbum(a),
    taux: () => ({ label: '40% cadre de subvention' }),
    badges: () => [{ c: 'mb-ph', l: '⚠ Distrib physique obligatoire' }],
    non_cumul: ['SCPP_PHONOGRAMME'],
    alertes: [
      'IS OBLIGATOIRE — personnes physiques non admises pour cette aide',
      'Minimum 3 titres inédits (EP éligible) — lives / remixes / compilations exclus',
      'Apport ≥ 50% FONDS PROPRES uniquement — autres aides exclues du calcul',
      'GUSO non accepté — Audiens/Congés Spectacles + Urssaf obligatoire',
      'Dépôt AVANT commercialisation de l\'album — 4 semaines avant commission',
      'Distribution physique nationale OBLIGATOIRE',
      'Acompte 70% sur demande — solde dans les 18 mois après commission',
      'Annulation si budget réalisé insuffisant (aide > 40% du réalisé = annulée)',
      'Plafond annuel par structure : 70 000€',
      'Convention collective IDCC 2121 obligatoire',
    ],
    potentiel_min: 10000,
  },

  SPPF_VIDEO: {
    id: 'SPPF_VIDEO',
    nom: 'Aide Vidéomusique SPPF',
    organisme: 'SPPF',
    scope: 'struct',
    chip_css: 'ch-sppf',
    montant_label: 'Variable selon palier',
    source: 'sppf.com — avril 2026',
    eligible: a => _struct(a) && _SPPF(a) && _hasPhys(a) && _pClip(a),
    taux: () => ({ label: 'Aide sélective' }),
    badges: () => [{ c: 'mb-ph', l: '⚠ Titre extrait album requis' }],
    non_cumul: [],
    alertes: [
      'Titre doit être extrait d\'un album SPPF distribué physiquement',
      'Droits audiovisuels détenus par le demandeur obligatoire',
      'Commission AVANT diffusion OU dans les 15 jours max après la 1ère diffusion',
    ],
    potentiel_min: 3000,
  },

  SPPF_SHOWCASE: {
    id: 'SPPF_SHOWCASE',
    nom: 'Convention Showcase SPPF',
    organisme: 'SPPF',
    scope: 'struct',
    chip_css: 'ch-sppf',
    montant_label: '80% tarif convention salle',
    source: 'sppf.com',
    eligible: a => _struct(a) && _SPPF(a) && _pShowcase(a),
    taux: () => ({ label: '19 salles 2026 — tarifs fixes' }),
    badges: () => [{ c: 'mb-dl', l: '⏰ Dépôt 21j avant' }],
    non_cumul: [],
    alertes: [
      'Liste fixe 19 salles conventionnées SPPF 2026',
      'Dépôt minimum 21 jours avant la date du showcase',
      'Fenêtre : 2 mois avant / 6 mois après',
      'Albums live / remixes / compilations exclus',
    ],
    potentiel_min: 1500,
  },

  SPPF_GRM: {
    id: 'SPPF_GRM',
    nom: 'Garantie Rémunération Minimale TPE SPPF',
    organisme: 'SPPF',
    scope: 'struct',
    chip_css: 'ch-sppf',
    montant_label: 'Max 600€ bruts',
    source: 'sppf.com — avril 2026',
    eligible: a =>
      _IS(a) && _struct(a) && _SPPF(a) && _TPE(a) && _hasPhys(a) && _pAlbum(a),
    taux: () => ({ label: 'Forfait TPE' }),
    badges: () => [{ c: 'mb-tpe', l: '✓ TPE uniquement' }],
    non_cumul: [],
    alertes: [
      'Conditionnée à l\'obtention de l\'aide album SPPF en commission — si refus album, GRM annulée',
      'TPE uniquement : ≤ 10 salariés ETP ET CA ou bilan annuel ≤ 2 000 000€',
      'Contrat artiste signé ou renouvelé après le 01/07/2022',
      'Barème : avance 500-750€ → 250€ bruts · avance 750-1000€ → 412€ bruts · avance 1000€ → 600€ bruts',
      'Avance > 1 000€ bruts = non éligible',
    ],
    potentiel_min: 600,
  },

  SPPF_BONIFICATION_ADAMI: {
    id: 'SPPF_BONIFICATION_ADAMI',
    nom: 'Bonification Croisée SPPF×ADAMI +10%',
    organisme: 'SPPF',
    scope: 'struct',
    chip_css: 'ch-sppf',
    montant_label: '+10% sur aide SPPF',
    source: 'sppf.com',
    // Soutien ADAMI préalable OBLIGATOIRE + affilié ADAMI personnellement
    eligible: a => _struct(a) && _SPPF(a) && _adamiP(a),
    taux: () => ({ label: 'Bonification' }),
    badges: () => [],
    non_cumul: [],
    alertes: [
      'Soutien préalable ADAMI accordé AVANT la demande SPPF — obligatoire',
      'Demande EXPLICITE dans le formulaire SPPF — pas automatique',
      'PAS une simple double adhésion',
    ],
    potentiel_min: 1000,
  },

  // ════════════════════════════════════════════════════════════════
  // SCPP
  // ════════════════════════════════════════════════════════════════

  SCPP_PHONOGRAMME: {
    id: 'SCPP_PHONOGRAMME',
    nom: 'Aide à la Création de Phonogramme SCPP',
    organisme: 'SCPP',
    scope: 'struct',
    chip_css: 'ch-scpp',
    montant_label: 'Max 50% budget HT',
    source: 'scpp.fr',
    // PRODUCTEUR UNIQUEMENT (pas licencié exclusif) + distrib physique + album
    eligible: a =>
      _struct(a) && _SCPP_p(a) && _hasPhys(a) && _pAlbum(a),
    taux: () => ({ label: 'Aide sélective' }),
    badges: () => [{ c: 'mb-ph', l: '⚠ Distrib physique obligatoire' }],
    non_cumul: ['SPPF_ALBUM'],
    alertes: [
      'Distribution physique nationale OBLIGATOIRE — numérique seul = rejet',
      'GUSO non accepté — Audiens obligatoire',
      'Licencié exclusif NON éligible à cette aide (voir SCPP_MARKETING)',
      '1 demande/an max si droits < seuils réforme AG 28/06/2023',
    ],
    potentiel_min: 8000,
  },

  SCPP_VIDEOMUSIQUE: {
    id: 'SCPP_VIDEOMUSIQUE',
    nom: 'Aide à la Création de Vidéomusique SCPP',
    organisme: 'SCPP',
    scope: 'struct',
    chip_css: 'ch-scpp',
    montant_label: 'Max 70% budget HT',
    source: 'scpp.fr',
    eligible: a => _struct(a) && _SCPP_p(a) && _pClip(a),
    taux: () => ({ label: '70% budget HT' }),
    badges: () => [],
    non_cumul: [],
    alertes: ['Licencié non éligible', 'Cumul CNM Clip + CNC autorisé'],
    potentiel_min: 5000,
  },

  SCPP_SHOWCASE: {
    id: 'SCPP_SHOWCASE',
    nom: 'Aide aux Showcases SCPP',
    organisme: 'SCPP',
    scope: 'struct',
    chip_css: 'ch-scpp',
    montant_label: 'Variable — tarifs fixes par salle',
    source: 'scpp.fr',
    eligible: a => _struct(a) && (_SCPP_p(a) || _SCPP_l(a)) && _pShowcase(a),
    taux: () => ({ label: 'Aide sélective' }),
    badges: () => [],
    non_cumul: [],
    alertes: [
      'Salles conventionnées SCPP uniquement — liste fixe avec montants par salle',
      'Max 4 showcases/an si non plafonné',
      'Versement total APRÈS le concert',
    ],
    potentiel_min: 1000,
  },

  SCPP_MARKETING: {
    id: 'SCPP_MARKETING',
    nom: 'Aide Marketing SCPP',
    organisme: 'SCPP',
    scope: 'struct',
    chip_css: 'ch-scpp',
    montant_label: 'Max 20 000€',
    source: 'scpp.fr',
    // LICENCIÉ EXCLUSIF UNIQUEMENT — producteur direct non éligible
    eligible: a => _struct(a) && _SCPP_l(a) && _pPromo(a),
    taux: () => ({ label: 'Licencié exclusif uniquement' }),
    badges: () => [],
    non_cumul: [],
    alertes: [
      'LICENCIÉ EXCLUSIF UNIQUEMENT — producteur direct non éligible',
      'Budget marketing minimum 15 000€ HT',
      'IS obligatoire',
    ],
    potentiel_min: 8000,
  },

  SCPP_FORMATION: {
    id: 'SCPP_FORMATION',
    nom: 'Aide à la Formation d\'Artistes SCPP',
    organisme: 'SCPP',
    scope: 'struct',
    chip_css: 'ch-scpp',
    montant_label: 'Montants fixes',
    source: 'scpp.fr',
    eligible: a => _struct(a) && _SCPP_p(a) && _phono(a),
    taux: () => ({ label: '5 organismes conventionnés' }),
    badges: () => [],
    non_cumul: [],
    alertes: [
      '5 organismes conventionnés SCPP uniquement',
      'Versement total sans acompte — pas de Commission',
    ],
    potentiel_min: 800,
  },

  // ════════════════════════════════════════════════════════════════
  // ADAMI
  // ════════════════════════════════════════════════════════════════

  ADAMI_365: {
    id: 'ADAMI_365',
    nom: 'ADAMI 365 — Projet Musical Global',
    organisme: 'ADAMI',
    scope: 'vous',
    chip_css: 'ch-adami',
    montant_label: 'Variable (plafond 1/3 par volet)',
    source: 'adami.fr — oct. 2025',
    eligible: a =>
      _ACI(a) && _adamiP(a) &&
      (_pAlbum(a) || _pClip(a) || _pShowcase(a) || _pTournee(a) || _pExport(a)) &&
      // Min 2 albums en distribution pro (aucun ou 1 = inéligible si renseigné)
      !_is(a, 'nb_albums_produits', 'aucun') && !_is(a, 'nb_albums_produits', '1_ou_2'),
    taux: () => ({ label: 'Aide très sélective — contact ADAMI OBLIGATOIRE avant dépôt' }),
    badges: () => [],
    non_cumul: [],
    alertes: [
      'Contact ADAMI OBLIGATOIRE avant tout dépôt : actionartistique@adami.fr ou 01 44 63 10 00 (choix 2)',
      'Artiste très identifié sur la scène musicale — projet exceptionnel dans la carrière',
      '50% des artistes principaux doivent être associés ADAMI',
      'Min 2 albums en distribution pro (TuneCore/DistroKid/Bandcamp exclus)',
      'Min 5 000€ de rémunérations ADAMI sur 5 ans (MA) ou 300€ (classique)',
      'Min 5 concerts sur 3 ans en salle ≥ 600 places (MA) ou ≥ 300 places (jazz/classique)',
      'Max 3 aides sélectives ADAMI par structure par année civile',
      'Plafond : 1/3 des dépenses HT enregistrement · 50% dépenses HT promo · 1/3 dépenses HT image',
      'Valorisation studio propre uniquement : 250€/titre prises + 250€/titre mix',
    ],
    potentiel_min: 4000,
  },

  ADAMI_2D3D: {
    id: 'ADAMI_2D3D',
    nom: 'ADAMI 2D/3D — Enregistrement + Promotion',
    organisme: 'ADAMI',
    scope: 'vous',
    chip_css: 'ch-adami',
    montant_label: 'Variable — plafond 1/3 budget enregistrement',
    source: 'adami.fr — oct. 2025',
    // SACEM + ADAMI requis + projet album ou clip
    eligible: a => _ACI(a) && _sacemP(a) && _adamiP(a) && (_pAlbum(a) || _pClip(a)),
    taux: () => ({ label: 'Aide sélective' }),
    badges: () => [],
    non_cumul: [],
    alertes: [
      'Distribution pro obligatoire avec contrat — TuneCore/DistroKid/Bandcamp exclus',
      'Structure doit être l\'employeur direct de TOUS les artistes (y compris invités)',
      'Plafond aide enregistrement = 1/3 des dépenses HT production + post-prod (hors fab, droits méca, promo)',
      'Aide promo = 50% des dépenses HT réalisées dans les 6 mois avant sortie commerciale',
      'Cumul toutes subventions album ≤ 40% des dépenses totales HT',
      'Acompte 50% à l\'accord — solde par volet après réalisation',
    ],
    potentiel_min: 5000,
  },

  ADAMI_PREMIERE_PARTIE: {
    id: 'ADAMI_PREMIERE_PARTIE',
    nom: 'Aide Première Partie / Promotion ADAMI',
    organisme: 'ADAMI',
    scope: 'vous',
    chip_css: 'ch-adami',
    montant_label: 'Variable',
    source: 'adami.fr — oct. 2025',
    eligible: a => _ACI(a) && _adamiP(a) && (_pShowcase(a) || _pClip(a)),
    taux: () => ({ label: 'Aide sélective' }),
    badges: () => [],
    non_cumul: [],
    alertes: [
      'Concerts en première partie ou showcase dans salle prescriptrice',
      'Max 3 aides sélectives ADAMI par structure par année civile',
    ],
    potentiel_min: 2000,
  },

  ADAMI_BOURSE_PARCOURS: {
    id: 'ADAMI_BOURSE_PARCOURS',
    nom: 'Bourse Parcours Artiste ADAMI',
    organisme: 'ADAMI',
    scope: 'vous',
    chip_css: 'ch-adami',
    montant_label: 'Variable selon grille',
    source: 'adami.fr — fév. 2026',
    eligible: a =>
      _ACI(a) && _adamiP(a) && (_pAlbum(a) || _pTournee(a) || _pShowcase(a)),
    taux: () => ({ label: 'Bourse sélective' }),
    badges: () => [],
    non_cumul: [],
    alertes: [
      'Projet artistique ambitieux requis — aide aux artistes en développement',
      'Max 3 aides sélectives ADAMI par structure par année civile',
    ],
    potentiel_min: 3000,
  },

  ADAMI_SPECTACLE: {
    id: 'ADAMI_SPECTACLE',
    nom: 'Aide Spectacle de Musique ADAMI',
    organisme: 'ADAMI',
    scope: 'struct',
    chip_css: 'ch-adami',
    montant_label: 'Variable',
    source: 'adami.fr',
    eligible: a =>
      _struct(a) && _esv(a) && (_adamiP(a) || _ACI(a)) && _pSV(a),
    taux: () => ({ label: 'Aide sélective' }),
    badges: () => [],
    non_cumul: [],
    alertes: ['Artiste interprète avec droits ADAMI requis — vérifier éligibilité via adami.fr'],
    potentiel_min: 4000,
  },

  // ════════════════════════════════════════════════════════════════
  // SPEDIDAM
  // ════════════════════════════════════════════════════════════════

  SPEDIDAM_DEPLACEMENT: {
    id: 'SPEDIDAM_DEPLACEMENT',
    nom: 'Aide au Déplacement International SPEDIDAM',
    organisme: 'SPEDIDAM',
    scope: 'vous',
    chip_css: 'ch-spedidam',
    montant_label: 'Variable',
    source: 'spedidam.fr',
    eligible: a => _ACI(a) && _spediP(a) && _pExport(a),
    taux: () => ({ label: 'Max 2/an' }),
    badges: () => [],
    non_cumul: [],
    alertes: ['Maximum 2 aides déplacement par an', 'Cumulable avec aide SV'],
    potentiel_min: 1500,
  },

  SPEDIDAM_EPK: {
    id: 'SPEDIDAM_EPK',
    nom: 'Aide EPK / Promotion par l\'Image SPEDIDAM',
    organisme: 'SPEDIDAM',
    scope: 'vous',
    chip_css: 'ch-spedidam',
    montant_label: 'Variable',
    source: 'spedidam.fr',
    eligible: a => _ACI(a) && _spediP(a) && _pClip(a),
    taux: () => ({ label: 'Aide sélective' }),
    badges: () => [],
    non_cumul: [],
    alertes: [],
    potentiel_min: 2000,
  },

  SPEDIDAM_EAC: {
    id: 'SPEDIDAM_EAC',
    nom: 'Aide Éducation Artistique et Culturelle SPEDIDAM',
    organisme: 'SPEDIDAM',
    scope: 'vous',
    chip_css: 'ch-spedidam',
    montant_label: 'Variable',
    source: 'spedidam.fr',
    eligible: a => _ACI(a) && _spediP(a) && _pEAC(a),
    taux: () => ({ label: 'Aide sélective' }),
    badges: () => [],
    non_cumul: [],
    alertes: [
      'Activité EAC principale OBLIGATOIRE — pas secondaire',
      'Exclus : collectivités, État, communes',
      '1 aide/an maximum — pas de reconduction automatique',
    ],
    potentiel_min: 2000,
  },

  SPEDIDAM_GENERATION: {
    id: 'SPEDIDAM_GENERATION',
    nom: 'Programme Génération SPEDIDAM',
    organisme: 'SPEDIDAM',
    scope: 'vous',
    chip_css: 'ch-spedidam',
    montant_label: '20 000€ / 3 ans',
    source: 'spedidam.fr',
    // CONDITION BLOQUANTE : sélection préalable Génération SPEDIDAM obligatoire
    eligible: a =>
      _ACI(a) && _spediP(a) && _is(a, 'generation_spedidam', 'oui'),
    taux: () => ({ label: 'Aide 2ème niveau' }),
    badges: () => [],
    non_cumul: [],
    alertes: [
      'CONDITION BLOQUANTE : sélection préalable Génération SPEDIDAM obligatoire',
      'Enveloppe 20 000€ sur 3 ans',
      'Tarifs minima : répétition 120€/jour · représentation 175€/cachet · enregistrement 185€/cachet',
      'Pénalité -20% si logo Génération SPEDIDAM absent sur les supports',
    ],
    potentiel_min: 7000,
  },

  // ════════════════════════════════════════════════════════════════
  // FONPEPS / APAJ
  // ════════════════════════════════════════════════════════════════

  FONPEPS_APAJ: {
    id: 'FONPEPS_APAJ',
    nom: 'FONPEPS/APAJ — Aide Emploi Plateau Artistique',
    organisme: 'FONPEPS',
    scope: 'struct',
    chip_css: 'ch-fonpeps',
    montant_label: 'Forfait selon jauge',
    source: 'service-public.fr — Décret 2018-574',
    // Cat.2 et cat.3 UNIQUEMENT — cat.1 exploitant de lieu fixe non éligible
    eligible: a => _struct(a) && _esv(a) && _licESV_f(a),
    taux: () => ({ label: 'Forfait — pas un % des charges' }),
    badges: () => [],
    non_cumul: [],
    alertes: [
      'Mécanisme FORFAITAIRE — pas un % des charges salariales',
      'Licence ESV cat.2 (tournée) ou cat.3 (diffuseur) uniquement',
      'Cat.1 exploitant de lieu fixe NON éligible',
      'Cumulable avec CISV',
    ],
    potentiel_min: 2500,
  },
};

// ── Non-cumuls globaux (indépendants des fiches individuelles) ────────────────
const NON_CUMULS_GLOBAUX = [
  { a: 'CIPP',            b: 'CIEM',           note: 'Non-cumul absolu sur mêmes dépenses (art.220 septdecies IV CGI)' },
  { a: 'CIPP',            b: 'CISV',           note: 'Non-cumul absolu sur mêmes dépenses' },
  { a: 'CIEM',            b: 'CISV',           note: 'Non-cumul absolu sur mêmes dépenses' },
  { a: 'SCPP_PHONOGRAMME',b: 'SPPF_ALBUM',     note: 'SCPP et SPPF incompatibles sur même projet phonographique' },
  { a: 'CNM_DEV_ECONOMIQUE', b: 'CNM_RESTRUCTURATION', note: 'Non cumulables sur le même exercice comptable' },
];

// ── Aides fermées à signaler explicitement ────────────────────────────────────
const AIDES_FERMEES_A_SIGNALER = [
  {
    id: 'SACEM_TOURNEE_EXPORT_MA',
    trigger: a => (_pExport(a)) && _sacemOK(a),
    message: 'L\'aide SACEM aux tournées et showcases export (MA et Jazz) est actuellement FERMÉE. Alternatives : CNM Export MA1/MA2, SPEDIDAM Déplacement.',
  },
];


if(typeof module!=='undefined'&&module.exports){module.exports={AIDES,NON_CUMULS_GLOBAUX,AIDES_FERMEES_A_SIGNALER};}
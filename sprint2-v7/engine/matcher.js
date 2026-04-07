/**
 * MATCHER.JS — Moteur de matching pur
 * Module Aides & Subventions Musicales — LYKY LABEL FRANCE
 * Version 7.0 — Avril 2026
 *
 * Ce moteur NE CONTIENT AUCUN critère d'éligibilité en dur.
 * Il lit aides_criteres.js et applique les fonctions eligible() de chaque aide.
 *
 * Usage :
 *   const { match } = require('./matcher');
 *   const result = match(answers);
 *   // result = { matched: [...], conflicts: [...], alertes_fermees: [...], potentiel: N }
 */

'use strict';

const { AIDES, NON_CUMULS_GLOBAUX, AIDES_FERMEES_A_SIGNALER } = require('./aides_criteres');

/**
 * Calcule le matching pour un set de réponses
 * @param {Object} answers - Réponses du questionnaire (S.ans)
 * @returns {{ matched: Array, conflicts: Array, alertes_fermees: Array, potentiel: number }}
 */
function match(answers) {
  const a = answers;

  // 1. Calculer les aides éligibles
  const matched = Object.values(AIDES)
    .filter(aide => !aide.ferme) // exclure les aides fermées du matching
    .filter(aide => {
      try {
        return aide.eligible(a);
      } catch(e) {
        console.error(`[matcher] Erreur évaluation ${aide.id}:`, e.message);
        return false;
      }
    })
    .map(aide => ({
      ...aide,
      taux_calcule: aide.taux ? aide.taux(a) : { label: '' },
      badges_calcules: aide.badges ? aide.badges(a) : [],
    }));

  // 2. Calculer les conflits de cumul
  const matchedIds = new Set(matched.map(m => m.id));
  const conflicts = [];
  const conflitsVus = new Set();

  NON_CUMULS_GLOBAUX.forEach(({ a: idA, b: idB, note }) => {
    if (matchedIds.has(idA) && matchedIds.has(idB)) {
      const key = [idA, idB].sort().join('|');
      if (!conflitsVus.has(key)) {
        conflitsVus.add(key);
        conflicts.push({ a: idA, b: idB, note });
      }
    }
  });

  // Conflits issus des fiches individuelles (non_cumul)
  matched.forEach(aide => {
    (aide.non_cumul || []).forEach(autreId => {
      if (matchedIds.has(autreId)) {
        const key = [aide.id, autreId].sort().join('|');
        if (!conflitsVus.has(key)) {
          conflitsVus.add(key);
          const note = `${aide.id} et ${autreId} incompatibles`;
          conflicts.push({ a: aide.id, b: autreId, note });
        }
      }
    });
  });

  // 3. Alertes aides fermées à signaler
  const alertes_fermees = AIDES_FERMEES_A_SIGNALER
    .filter(alerte => {
      try { return alerte.trigger(a); }
      catch(e) { return false; }
    })
    .map(alerte => ({
      id: alerte.id,
      message: alerte.message,
      aide: AIDES[alerte.id] || null,
    }));

  // 4. Calcul potentiel estimé
  // CNM Dev Eco et Restructuration : non cumulables → prendre le max une seule fois
  const aidesPotentiel = matched.filter(m =>
    m.id !== 'CNM_RESTRUCTURATION' ||
    !matchedIds.has('CNM_DEV_ECONOMIQUE')
  );
  const potentiel = aidesPotentiel.reduce((sum, m) => sum + (m.potentiel_min || 0), 0);

  return { matched, conflicts, alertes_fermees, potentiel };
}

/**
 * Formate le potentiel en string lisible
 */
function formatPotentiel(val) {
  if (val === 0)       return '> 0 €';
  if (val >= 1000000)  return (val / 1000000).toFixed(1) + ' M€+';
  if (val >= 1000)     return (val / 1000).toFixed(0) + ' k€+';
  return val + ' €+';
}

/**
 * Retourne les aides groupées par organisme
 */
function groupByOrganisme(matched) {
  const groups = {};
  matched.forEach(aide => {
    if (!groups[aide.organisme]) groups[aide.organisme] = [];
    groups[aide.organisme].push(aide);
  });
  return groups;
}

/**
 * Retourne les aides séparées par scope
 */
function splitByScope(matched) {
  return {
    vous:   matched.filter(m => m.scope === 'vous'),
    struct: matched.filter(m => m.scope === 'struct'),
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { match, formatPotentiel, groupByOrganisme, splitByScope };
}

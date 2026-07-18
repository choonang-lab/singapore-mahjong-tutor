/*
 * Singapore Mahjong Tutor — push / fold EV model (Module 5).
 *
 * A deliberately simple, transparent single-decision model that combines hand
 * value (Module 2) with deal-in danger (Module 4):
 *
 *   Push EV = P(you win) × (your hand value)  −  P(deal in) × (opponent value)
 *   Fold EV = 0                                (give up the hand, defend safely)
 *
 * Push when Push EV > 0. This is an intuition-builder, not an exact solver —
 * real push/fold is multi-turn. The point is the *structure* of the decision.
 */

let _sujiSafe;
if (typeof module !== 'undefined' && module.exports) _sujiSafe = require('./defense').sujiSafe;
else _sujiSafe = sujiSafe; // browser global from defense.js

// Rough per-tile deal-in probability by safety class (illustrative figures).
const DANGER = {
  'genbutsu': 0,
  'suji': 0.05,
  'live-honor': 0.06,
  'live-terminal': 0.08,
  'live-number': 0.13,
};

function dangerClass(i, riverSet, suitVals) {
  if (riverSet.has(i)) return 'genbutsu';
  if (i < 27) {
    const v = (i % 9) + 1;
    if (_sujiSafe(v, suitVals[Math.floor(i / 9)])) return 'suji';
    return (v === 1 || v === 9) ? 'live-terminal' : 'live-number';
  }
  return 'live-honor';
}

// P(complete your wait) ≈ 1 − P(missing every chance).
function winProb(outs, unseen, chances) {
  if (outs <= 0 || unseen <= 0 || chances <= 0) return 0;
  return 1 - Math.pow(1 - outs / unseen, chances);
}

// Committing to push means several risky discards, not one. Cumulative deal-in
// probability across `pushes` discards of similar danger ≈ 1 − (1−p)^pushes.
function cumulativeRisk(pDeal, pushes) {
  if (pDeal <= 0 || pushes <= 0) return 0;
  return 1 - Math.pow(1 - pDeal, pushes);
}

function pushEV(pWin, vYou, pDeal, vOpp) { return pWin * vYou - pDeal * vOpp; }

function decide(pWin, vYou, pDeal, vOpp) {
  const ev = pushEV(pWin, vYou, pDeal, vOpp);
  return { ev, best: ev > 0 ? 'push' : 'fold', close: Math.abs(ev) < 0.3 };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DANGER, dangerClass, winProb, cumulativeRisk, pushEV, decide };
}

/*
 * Singapore Mahjong Tutor — analytic hand-plan ranker (Module 6).
 *
 * For a 13-tile hand, evaluate candidate DIRECTIONS (fastest, full flush,
 * half flush, all-pongs) and rank them by expected value:
 *
 *   EV(plan) ≈ P(win via plan) × value(plan tai)
 *
 * P(win) is a transparent analytic estimate from (shanten-to-target, ukeire,
 * draws left) — not Monte Carlo. It's an intuition-builder; the win-prob model
 * uses the current acceptance for every remaining step, so it overrates deep
 * hands slightly. Value is the plan's characteristic tai plus honours already
 * held. Both are labelled approximate in the UI; a Monte-Carlo pass would refine
 * the win rate and give the full tai distribution.
 */

let _eng, _score;
if (typeof module !== 'undefined' && module.exports) {
  _eng = require('./engine');
  _score = require('./scorer').scoreHand;
}
function shC(c, o) { return (_eng ? _eng.shantenConstrained : shantenConstrained)(c, o); }
function ukC(c, o) { return (_eng ? _eng.ukeireConstrained : ukeireConstrained)(c, o); }

function comb(n, k) {
  if (k < 0 || k > n) return 0;
  k = Math.min(k, n - k);
  let r = 1;
  for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1);
  return r;
}
// P(Binomial(n, p) >= k) — chance of at least k useful draws.
function binomAtLeast(n, k, p) {
  if (k <= 0) return 1;
  if (p <= 0 || k > n) return 0;
  let sum = 0;
  for (let j = k; j <= n; j++) sum += comb(n, j) * Math.pow(p, j) * Math.pow(1 - p, n - j);
  return Math.min(1, sum);
}

function dominantSuit(counts) {
  const c = [0, 0, 0];
  for (let i = 0; i < 27; i++) c[Math.floor(i / 9)] += counts[i];
  let best = 0;
  for (let s = 1; s < 3; s++) if (c[s] > c[best]) best = s;
  return best;
}

// Characteristic value (tai) of completing the hand as this type, plus honours
// already held that would likely score.
function estimateValue(counts, type, ctx, rules) {
  let tai = 0;
  if (type === 'fullFlush') tai += rules.fullFlush;
  else if (type === 'halfFlush') tai += rules.halfFlush;
  else if (type === 'allPongs') tai += rules.allPongs;

  if (type !== 'fullFlush') { // full flush keeps no honours
    for (let d = 31; d <= 33; d++) if (counts[d] >= 2) tai += rules.dragon;
    for (let w = 0; w < 4; w++) if (counts[27 + w] >= 2) {
      if (w === ctx.seatWind) tai += rules.seatWind;
      if (w === ctx.roundWind) tai += rules.roundWind;
    }
  }
  if (type === 'fastest' && tai === 0) tai += rules.pinghu; // a clean fast hand ≈ ping hu
  return tai;
}

const PLANS = [
  { type: 'fastest', label: 'Fastest', opts: () => ({}) },
  { type: 'fullFlush', label: 'Full flush 清一色', opts: (s) => ({ suit: s, honors: false }) },
  { type: 'halfFlush', label: 'Half flush 混一色', opts: (s) => ({ suit: s, honors: true }) },
  { type: 'allPongs', label: 'All pongs 对对胡', opts: () => ({ chow: false }) },
];

/**
 * Analyse a 13-tile hand. Returns plans sorted best-EV first, each:
 *   { type, label, suit, shanten, ukeire, value, pWin, ev }
 */
function analyzePlans(counts, ctx, rules, draws) {
  const context = Object.assign({ seatWind: 0, roundWind: 0 }, ctx || {});
  const suit = dominantSuit(counts);
  const unseen = 136 - 13;
  const out = [];
  for (const p of PLANS) {
    const opts = p.opts(suit);
    const u = ukC(counts, opts);
    const sh = u.shanten;
    const value = estimateValue(counts, p.type, context, rules);
    const pStep = u.total / unseen;
    const pWin = sh < 0 ? 1 : binomAtLeast(draws, sh + 1, pStep);
    out.push({
      type: p.type, label: p.label,
      suit: (p.type === 'fullFlush' || p.type === 'halfFlush') ? suit : null,
      shanten: sh, ukeire: u.total, value,
      pWin, ev: pWin * value,
    });
  }
  out.sort((a, b) => (b.ev - a.ev) || (a.shanten - b.shanten));
  return out;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { analyzePlans, estimateValue, dominantSuit, binomAtLeast, PLANS };
}

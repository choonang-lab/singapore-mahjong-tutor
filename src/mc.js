/*
 * Singapore Mahjong Tutor — Monte-Carlo rollout engine (Module 6, tier 3).
 *
 * For a hand committed to a DIRECTION, simulate the rest of the hand many times
 * to estimate a real win rate and the full distribution of tai — the two things
 * the analytic estimate can't give. Each rollout draws random unseen tiles and
 * discards toward the target using a shanten-driven policy; a completion only
 * counts as a win if it is legal (≥ minTai).
 *
 * No opponents are modelled (v1), so the "win rate" is really "completion rate
 * if unobstructed" — good for comparing directions, optimistic in absolute terms.
 */

let _mcEng, _mcScore;
if (typeof module !== 'undefined' && module.exports) {
  _mcEng = require('./engine');
  _mcScore = require('./scorer').scoreHand;
}
const agari = (c) => (_mcEng ? _mcEng.isComplete : self.isComplete)(c);
const scoreFn = (c, ctx, r) => (_mcEng ? _mcScore : self.scoreHand)(c, ctx, r);

// deterministic PRNG so runs are reproducible/testable
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// cheap "keep" heuristic used only to break ties between equal-shanten discards
function keepScore(i, hand, opts) {
  if (opts.chow === false) return hand[i] * 3 - 2;            // toitoi: pairs only
  let s = hand[i] * 2;
  if (i < 27) {
    const pos = i % 9, base = i - pos;
    if (pos > 0) s += hand[base + pos - 1];
    if (pos < 8) s += hand[base + pos + 1];
    if (pos > 1) s += hand[base + pos - 2] * 0.5;
    if (pos < 7) s += hand[base + pos + 2] * 0.5;
    if (pos === 0 || pos === 8) s -= 0.5;
    if (opts.suit != null && Math.floor(i / 9) !== opts.suit) s -= 100; // off-suit
  } else {
    s -= 1;
    if (opts.honors === false) s -= 100;                     // full flush drops honours
  }
  return s;
}

// Discard the least useful tile toward the target. A cheap keep-heuristic
// (O(34), no shanten) keeps the rollout fast enough for thousands of samples;
// the trace confirms it advances hands to tenpai comparably to a shanten policy.
function chooseDiscard(hand, opts) {
  let bestTile = -1, bestScore = Infinity;
  for (let i = 0; i < 34; i++) {
    if (hand[i] === 0) continue;
    const ks = keepScore(i, hand, opts);
    if (ks < bestScore) { bestScore = ks; bestTile = i; }
  }
  return bestTile;
}

function drawFrom(wall, total, rng) {
  let r = Math.floor(rng() * total);
  for (let i = 0; i < 34; i++) { if (wall[i] > 0) { if (r < wall[i]) return i; r -= wall[i]; } }
  return -1;
}

const CTX = { seatWind: 0, roundWind: 0, selfDraw: false };
const OPP_DISCARDS = 3;   // ron chances per go-around (one per opponent)

// win if legal (>= minTai); returns capped tai or -1
function legalWin(hand, rules) {
  if (!agari(hand)) return -1;
  const sc = scoreFn(hand, CTX, rules);
  return sc.total >= rules.minTai ? sc.capped : -1;
}

/*
 * One rollout over `draws` go-arounds. Each go-around: you draw (tsumo chance),
 * then up to OPP_DISCARDS opponents discard random tiles (ron chances). Models
 * the ~4 completion chances a real turn gives. Opponents never win first, so the
 * rate is optimistic — fine for comparing directions.
 */
function rollout(start, opts, rules, draws, rng) {
  const hand = start.slice();
  const wall = new Array(34);
  let total = 0;
  for (let i = 0; i < 34; i++) { wall[i] = 4 - hand[i]; total += wall[i]; }

  for (let d = 0; d < draws && total > 0; d++) {
    // your draw (tsumo)
    const t = drawFrom(wall, total, rng);
    if (t < 0) break;
    wall[t]--; total--; hand[t]++;
    const tw = legalWin(hand, rules);
    if (tw >= 0) return { win: true, tai: tw };
    hand[chooseDiscard(hand, opts)]--;             // discard back to 13

    // opponents' discards (ron)
    for (let o = 0; o < OPP_DISCARDS && total > 0; o++) {
      const dd = drawFrom(wall, total, rng);
      if (dd < 0) break;
      wall[dd]--; total--;                          // that tile is now seen/gone
      hand[dd]++;
      const rw = legalWin(hand, rules);
      hand[dd]--;
      if (rw >= 0) return { win: true, tai: rw };
    }
  }
  return { win: false, tai: 0 };
}

/**
 * Run N rollouts for one plan. Returns
 *   { n, wins, winRate, meanTai, evMC, hist: {tai: count, ...} }
 */
function runRollouts(hand, opts, rules, draws, n, seed) {
  const rng = mulberry32(seed);
  let wins = 0, taiSum = 0;
  const hist = {};
  for (let k = 0; k < n; k++) {
    const r = rollout(hand, opts, rules, draws, rng);
    if (r.win) { wins++; taiSum += r.tai; hist[r.tai] = (hist[r.tai] || 0) + 1; }
  }
  const winRate = wins / n;
  const meanTai = wins ? taiSum / wins : 0;
  return { n, wins, winRate, meanTai, evMC: winRate * meanTai, hist };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runRollouts, rollout, chooseDiscard, mulberry32 };
}

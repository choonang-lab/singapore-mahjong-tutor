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
 * Run N rollouts for one plan. Each rollout contributes x = tai if it wins,
 * else 0; EV is the mean of x, so its standard error is sd(x)/sqrt(N) — a
 * proper per-run confidence measure with no need for repeated seeds.
 * Returns { n, wins, winRate, meanTai, evMC, evSE, hist }.
 */
function runRollouts(hand, opts, rules, draws, n, seed) {
  const rng = mulberry32(seed);
  let wins = 0, taiSum = 0, taiSqSum = 0;
  const hist = {};
  for (let k = 0; k < n; k++) {
    const r = rollout(hand, opts, rules, draws, rng);
    if (r.win) { wins++; taiSum += r.tai; taiSqSum += r.tai * r.tai; hist[r.tai] = (hist[r.tai] || 0) + 1; }
  }
  const winRate = wins / n;
  const meanTai = wins ? taiSum / wins : 0;
  const evMC = taiSum / n;                                   // mean of x over all n rollouts
  const varX = Math.max(0, taiSqSum / n - evMC * evMC);       // 0-contributions are already in taiSqSum
  const evSE = Math.sqrt(varX / n);
  return { n, wins, winRate, meanTai, evMC, evSE, hist };
}

/* ============================================================================
 * Opponent-aware rollout (tier 3b): 3 abstracted opponents who develop, can
 * win before you (tsumo), can be dealt into when you push, and fold against an
 * obvious threat. Removes the "solo" model's optimism and its flush over-rating.
 *
 * Opponents are ABSTRACTED as (shanten, wait) rather than full 13-tile hands —
 * cheap enough for thousands of rollouts, faithful to the effects that matter.
 * Parameters below are chosen to land win rates in a realistic range (see the
 * bench); they are an informed model, not a calibrated one. Opponent-vs-opponent
 * ron and furiten are not modelled (a small further optimism).
 * ========================================================================== */
const N_OPPS = 3;
function startShanten(rng) { const r = rng(); return r < 0.15 ? 1 : r < 0.60 ? 2 : 3; }  // mid-hand mix
function pAdvance(s) { return 0.20 + 0.04 * s; }                                          // wider when further out
function foldBiasFor(opts) {                                                              // how obvious the threat is
  if (opts.suit != null && opts.honors === false) return 0.70;  // full flush — very readable
  if (opts.suit != null) return 0.50;                            // half flush
  return 0.30;                                                   // fastest / all-pongs
}
function assignWait(rng, wall) {
  const w = new Set(); const n = rng() < 0.5 ? 1 : 2; let tries = 0;
  while (w.size < n && tries < 30) { tries++; const t = Math.floor(rng() * 34); if (wall[t] > 0) w.add(t); }
  if (!w.size) w.add(Math.floor(rng() * 34));
  return w;
}
function myWaitsArr(hand) {
  const w = [];
  for (let t = 0; t < 34; t++) { if (hand[t] >= 4) continue; hand[t]++; if (agari(hand)) w.push(t); hand[t]--; }
  return w;
}
function completeValue(hand, tile, rules) {
  hand[tile]++; const sc = scoreFn(hand, CTX, rules); hand[tile]--;
  return sc.total >= rules.minTai ? sc.capped : -1;
}

function rolloutVsField(start, opts, rules, draws, rng, foldBias) {
  const hand = start.slice();
  const wall = new Array(34); let total = 0;
  for (let i = 0; i < 34; i++) { wall[i] = 4 - hand[i]; total += wall[i]; }
  const opps = [];
  for (let k = 0; k < N_OPPS; k++) opps.push({ sh: startShanten(rng), wait: null });
  let myWait = null;

  for (let go = 0; go < draws && total > 0; go++) {
    // --- my draw ---
    const t = drawFrom(wall, total, rng);
    if (t < 0) break;
    wall[t]--; total--; hand[t]++;
    if (agari(hand)) {
      const sc = scoreFn(hand, CTX, rules);
      if (sc.total >= rules.minTai) return { win: true, tai: sc.capped, how: 'tsumo' };
      hand[t]--;                                    // valueless completion — keep going
    } else {
      const d = chooseDiscard(hand, opts);
      hand[d]--;
      for (const o of opps) if (o.wait && o.wait.has(d)) return { win: false, tai: 0, how: 'dealin' }; // I dealt in
    }
    const w = myWaitsArr(hand);
    myWait = w.length ? w : null;

    // --- opponents' go-around ---
    const wLive = myWait ? myWait.reduce((s, tt) => s + wall[tt], 0) : 0;
    for (const o of opps) {
      if (total <= 0) break;
      const ot = drawFrom(wall, total, rng);
      if (ot < 0) break;
      wall[ot]--; total--;
      if (o.wait) {
        if (o.wait.has(ot)) return { win: false, tai: 0, how: 'opp-tsumo' };   // opponent won first
      } else if (rng() < pAdvance(o.sh)) {
        o.sh--; if (o.sh <= 0) o.wait = assignWait(rng, wall);
      }
      // my ron off this opponent's discard, unless they fold against my threat
      if (myWait && wLive > 0 && total > 0 && rng() >= foldBias && rng() < wLive / total) {
        let best = -1;
        for (const tt of myWait) { const v = completeValue(hand, tt, rules); if (v > best) best = v; }
        if (best >= 0) return { win: true, tai: best, how: 'ron' };
      }
    }
  }
  return { win: false, tai: 0, how: 'exhaust' };
}

function runRolloutsVsField(hand, opts, rules, draws, n, seed) {
  const rng = mulberry32(seed);
  const foldBias = foldBiasFor(opts);
  let wins = 0, taiSum = 0, taiSqSum = 0;
  const hist = {}, how = {};
  for (let k = 0; k < n; k++) {
    const r = rolloutVsField(hand, opts, rules, draws, rng, foldBias);
    how[r.how] = (how[r.how] || 0) + 1;
    if (r.win) { wins++; taiSum += r.tai; taiSqSum += r.tai * r.tai; hist[r.tai] = (hist[r.tai] || 0) + 1; }
  }
  const winRate = wins / n;
  const meanTai = wins ? taiSum / wins : 0;
  const evMC = taiSum / n;
  const varX = Math.max(0, taiSqSum / n - evMC * evMC);
  return { n, wins, winRate, meanTai, evMC, evSE: Math.sqrt(varX / n), hist, how };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runRollouts, runRolloutsVsField, rollout, rolloutVsField, chooseDiscard, mulberry32 };
}

/*
 * Singapore Mahjong Tutor — tai scorer.
 *
 * Given a completed 14-tile winning hand (34-count array), a context, and a
 * configurable rule set, decompose the hand into 4 sets + 1 pair, detect
 * scoring patterns, and return the best-scoring breakdown.
 *
 * context = {
 *   seatWind:  0..3  (E,S,W,N) — your seat,
 *   roundWind: 0..3  — the prevailing wind,
 *   selfDraw:  bool  — won by self-draw (zimo),
 *   seatFlowers: 0..2 — flowers/seasons matching your seat (animals: Module 3),
 * }
 *
 * v1 scope: standard hands only; does not distinguish concealed vs melded
 * (none of the patterns here depend on it). Ping hu uses the common simplified
 * definition (all sequences + valueless pair) — house-dependent.
 */

function suitOf(i) { return i < 27 ? Math.floor(i / 9) : -1; }   // 0=m,1=p,2=s, -1=honor
function isHonor(i) { return i >= 27; }
function isDragon(i) { return i >= 31; }

function tName(i) {
  const suit = ['Characters', 'Circles', 'Bamboo'];
  if (i < 27) return `${(i % 9) + 1} ${suit[Math.floor(i / 9)]}`;
  return ['East', 'South', 'West', 'North', 'Red Dragon', 'Green Dragon', 'White Dragon'][i - 27];
}

/**
 * Enumerate every valid (4 sets + 1 pair) decomposition of a 14-tile hand.
 * Returns [] if the hand is not a complete standard hand.
 */
function decompose(counts) {
  const t = counts.slice();
  const out = [];

  function extractSets(start, current, pair) {
    let i = start;
    while (i < 34 && t[i] === 0) i++;
    if (i === 34) {
      if (current.length === 4) out.push({ sets: current.map((s) => ({ ...s })), pair });
      return;
    }
    // pong
    if (t[i] >= 3) {
      t[i] -= 3; current.push({ type: 'pong', tile: i });
      extractSets(i, current, pair);
      current.pop(); t[i] += 3;
    }
    // chow
    if (i < 27 && (i % 9) <= 6 && t[i + 1] > 0 && t[i + 2] > 0) {
      t[i]--; t[i + 1]--; t[i + 2]--; current.push({ type: 'chow', tile: i });
      extractSets(i, current, pair);
      current.pop(); t[i]++; t[i + 1]++; t[i + 2]++;
    }
  }

  for (let p = 0; p < 34; p++) {
    if (t[p] >= 2) {
      t[p] -= 2;
      extractSets(0, [], p);
      t[p] += 2;
    }
  }
  return out;
}

function suitsPresent(counts) {
  const suits = new Set();
  for (let i = 0; i < 27; i++) if (counts[i] > 0) suits.add(Math.floor(i / 9));
  return [...suits];
}
function hasAnyHonor(counts) {
  for (let i = 27; i < 34; i++) if (counts[i] > 0) return true;
  return false;
}
function isAllHonors(counts) {
  for (let i = 0; i < 27; i++) if (counts[i] > 0) return false;
  return true;
}

/** Score a single decomposition; returns { total, items:[{name,tai}] }. */
function scoreDecomp(d, counts, ctx, rules) {
  const items = [];
  const add = (name, tai) => { if (tai) items.push({ name, tai }); };

  const suits = suitsPresent(counts);
  const honors = hasAnyHonor(counts);
  const allPong = d.sets.every((s) => s.type === 'pong');
  const allChow = d.sets.every((s) => s.type === 'chow');

  // --- flush family (mutually exclusive) ---
  if (isAllHonors(counts)) {
    add('All honours 字一色', rules.allHonors);
  } else {
    if (suits.length === 1 && !honors) add('Full flush 清一色', rules.fullFlush);
    else if (suits.length === 1 && honors) add('Half flush 混一色', rules.halfFlush);
  }

  // --- all pongs (skip if all-honors already scored the shape) ---
  if (allPong && !isAllHonors(counts)) add('All pongs 对对胡', rules.allPongs);

  // --- dragons ---
  const dragonPongs = d.sets.filter((s) => s.type === 'pong' && isDragon(s.tile));
  if (dragonPongs.length === 3) {
    add('Big three dragons 大三元', rules.bigThreeDragons);
  } else if (dragonPongs.length === 2 && isDragon(d.pair)) {
    add('Small three dragons 小三元', rules.smallThreeDragons);
    dragonPongs.forEach((s) => add(`Dragon pong (${tName(s.tile)})`, rules.dragon));
  } else {
    dragonPongs.forEach((s) => add(`Dragon pong (${tName(s.tile)})`, rules.dragon));
  }

  // --- winds ---
  d.sets.filter((s) => s.type === 'pong' && s.tile >= 27 && s.tile <= 30).forEach((s) => {
    const w = s.tile - 27;
    if (w === ctx.seatWind) add(`Seat wind pong (${tName(s.tile)})`, rules.seatWind);
    if (w === ctx.roundWind) add(`Round wind pong (${tName(s.tile)})`, rules.roundWind);
  });

  // --- ping hu (all sequences, valueless pair) ---
  const pairIsValue = isDragon(d.pair) ||
    (d.pair >= 27 && d.pair <= 30 && (d.pair - 27 === ctx.seatWind || d.pair - 27 === ctx.roundWind));
  if (allChow && !pairIsValue) add('Ping hu 平胡', rules.pinghu);

  // --- situational ---
  if (ctx.selfDraw) add('Self-draw 自摸', rules.zimo);

  // --- bonus tiles ---
  if (ctx.seatFlowers) add(`Seat flower/season ×${ctx.seatFlowers}`, rules.seatFlower * ctx.seatFlowers);

  const total = items.reduce((n, it) => n + it.tai, 0);
  return { total, items };
}

/**
 * Score a winning hand. Returns:
 *   { valid, isWin, total, capped, limit, items:[{name,tai}] }
 * `valid` = meets minTai; `isWin` = is a complete hand at all.
 */
function scoreHand(counts, ctx, rules) {
  const context = Object.assign({ seatWind: 0, roundWind: 0, selfDraw: false, seatFlowers: 0 }, ctx || {});
  const decomps = decompose(counts);
  if (!decomps.length) {
    return { isWin: false, valid: false, total: 0, capped: 0, limit: rules.limit, items: [] };
  }
  let best = null;
  for (const d of decomps) {
    const s = scoreDecomp(d, counts, context, rules);
    if (!best || s.total > best.total) best = s;
  }
  const capped = Math.min(best.total, rules.limit);
  return {
    isWin: true,
    valid: best.total >= rules.minTai,
    total: best.total,
    capped,
    limit: rules.limit,
    items: best.items,
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { scoreHand, decompose, tName };
}

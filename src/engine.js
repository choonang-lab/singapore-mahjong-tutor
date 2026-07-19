/*
 * Singapore Mahjong Tutor — core engine
 * Standard-form shanten + tile-acceptance (ukeire) calculator.
 *
 * Tile model: a 34-length count array (0..4 each).
 *   index  0..8   = Characters (man)   1..9
 *   index  9..17  = Circles    (pin)   1..9
 *   index 18..26  = Bamboo     (sou)   1..9
 *   index 27..30  = Winds  E, S, W, N
 *   index 31..33  = Dragons Red, Green, White
 *
 * Flowers / seasons / animals are bonus tiles and are NOT part of the hand,
 * so they never enter this engine.
 *
 * v1 scope: standard hands only (4 sets + 1 pair). Seven-pairs and
 * thirteen-orphans are house-dependent in Singapore and deferred.
 */

const NUM_TYPES = 34;

function isSuit(i) { return i < 27; }          // man/pin/sou form sequences
function suitPos(i) { return i % 9; }           // 0..8 within its suit

/**
 * Minimal standard-form shanten for a hand given as a 34-count array.
 * Returns -1 for a complete winning hand, 0 for tenpai, >0 otherwise.
 * The hand should total 13 or 14 tiles (14 = just drew / choosing a discard).
 */
function shanten(counts) {
  const t = counts.slice();
  let best = 8;

  // melds  = completed sets (chow/pong)
  // partials = incomplete blocks needing one tile (excludes the eyes pair)
  // hasPair = whether a pair has been reserved as the eyes
  function decompose(i, melds, partials, hasPair) {
    while (i < NUM_TYPES && t[i] === 0) i++;
    if (i === NUM_TYPES) {
      let mp = melds + partials;
      if (mp > 4) { partials -= (mp - 4); }      // at most 4 sets/partials
      const sh = 8 - 2 * melds - partials - (hasPair ? 1 : 0);
      if (sh < best) best = sh;
      return;
    }

    // 1) pong
    if (t[i] >= 3) {
      t[i] -= 3; decompose(i, melds + 1, partials, hasPair); t[i] += 3;
    }
    // 2) chow
    if (isSuit(i) && suitPos(i) <= 6 && t[i + 1] > 0 && t[i + 2] > 0) {
      t[i]--; t[i + 1]--; t[i + 2]--;
      decompose(i, melds + 1, partials, hasPair);
      t[i]++; t[i + 1]++; t[i + 2]++;
    }
    // 3) pair
    if (t[i] >= 2) {
      if (!hasPair) {                            // reserve as the eyes
        t[i] -= 2; decompose(i, melds, partials, true); t[i] += 2;
      }
      t[i] -= 2; decompose(i, melds, partials + 1, hasPair); t[i] += 2; // partial toward pong
    }
    // 4) partial sequence — adjacent (ryanmen/penchan)
    if (isSuit(i) && suitPos(i) <= 7 && t[i + 1] > 0) {
      t[i]--; t[i + 1]--; decompose(i, melds, partials + 1, hasPair); t[i]++; t[i + 1]++;
    }
    // 5) partial sequence — gap (kanchan)
    if (isSuit(i) && suitPos(i) <= 6 && t[i + 2] > 0) {
      t[i]--; t[i + 2]--; decompose(i, melds, partials + 1, hasPair); t[i]++; t[i + 2]++;
    }
    // 6) leave this tile floating
    t[i]--; decompose(i, melds, partials, hasPair); t[i]++;
  }

  decompose(0, 0, 0, false);
  return best;
}

function totalTiles(counts) {
  let n = 0;
  for (let i = 0; i < NUM_TYPES; i++) n += counts[i];
  return n;
}

/**
 * Tile acceptance (ukeire) for a 13-tile hand: which tile types would lower
 * the hand's shanten, and how many copies remain live.
 *
 * @param counts   34-array, must total 13 tiles
 * @param seen     optional 34-array of tiles already visible (this hand +
 *                 discards + melds) so remaining copies are accurate. If
 *                 omitted, only the hand itself is treated as seen.
 * @returns { shanten, tiles: [{ index, remaining }], total }
 */
function ukeire(counts, seen) {
  const base = shanten(counts);
  const visible = seen ? seen.slice() : counts.slice();
  const tiles = [];
  let total = 0;

  for (let i = 0; i < NUM_TYPES; i++) {
    if (counts[i] >= 4) continue;                // can't draw a 5th
    counts[i]++;
    const after = shanten(counts);
    counts[i]--;
    if (after < base) {
      const remaining = Math.max(0, 4 - visible[i]);
      if (remaining > 0) {
        tiles.push({ index: i, remaining });
        total += remaining;
      }
    }
  }
  return { shanten: base, tiles, total };
}

/**
 * Evaluate every possible discard from a 14-tile hand.
 * Returns discards sorted best-first (lowest resulting shanten, then highest
 * acceptance). Each entry: { discard, shanten, ukeire: {tiles,total} }.
 */
function bestDiscards(counts, seen) {
  const results = [];
  for (let i = 0; i < NUM_TYPES; i++) {
    if (counts[i] === 0) continue;
    counts[i]--;
    const u = ukeire(counts, seen);
    counts[i]++;
    results.push({ discard: i, shanten: u.shanten, tiles: u.tiles, total: u.total });
  }
  results.sort((a, b) => (a.shanten - b.shanten) || (b.total - a.total));
  return results;
}

/**
 * Fast complete-hand test: does a 14-tile hand form 4 sets + 1 pair?
 * Early-exits on the first valid decomposition (cheaper than full shanten),
 * so it is suitable for the inner loop of a Monte-Carlo rollout.
 */
function isComplete(counts) {
  const t = counts.slice();
  function rec(i, sets) {
    while (i < NUM_TYPES && t[i] === 0) i++;
    if (i === NUM_TYPES) return sets === 4;
    if (t[i] >= 3) { t[i] -= 3; if (rec(i, sets + 1)) { t[i] += 3; return true; } t[i] += 3; }
    if (i < 27 && suitPos(i) <= 6 && t[i + 1] > 0 && t[i + 2] > 0) {
      t[i]--; t[i + 1]--; t[i + 2]--;
      if (rec(i, sets + 1)) { t[i]++; t[i + 1]++; t[i + 2]++; return true; }
      t[i]++; t[i + 1]++; t[i + 2]++;
    }
    return false;
  }
  for (let p = 0; p < NUM_TYPES; p++) {
    if (t[p] >= 2) { t[p] -= 2; if (rec(0, 0)) { t[p] += 2; return true; } t[p] += 2; }
  }
  return false;
}

/**
 * Constrained shanten — how far the hand is from a winning hand of a specific
 * TYPE. Same decomposition search, but the allowed melds are pruned:
 *   opts.suit   : 0/1/2 to require that suit only (flush), or null for any suit
 *   opts.honors : whether honour tiles may form sets (false for a full flush)
 *   opts.chow   : whether sequences are allowed (false for all-pongs / 对对胡)
 * Disallowed tiles simply act as floaters to be discarded.
 * Defaults (all suits, honours, chows) reproduce plain shanten().
 */
function shantenConstrained(counts, opts) {
  const suit = (opts && opts.suit !== undefined) ? opts.suit : null;
  const honors = !opts || opts.honors !== false;
  const chow = !opts || opts.chow !== false;
  const allowed = (i) => (i >= 27 ? honors : (suit === null || Math.floor(i / 9) === suit));

  const t = counts.slice();
  let best = 8;

  function dec(i, m, part, hasPair) {
    while (i < NUM_TYPES && (t[i] === 0 || !allowed(i))) i++;   // skip empties + disallowed (floaters)
    if (i === NUM_TYPES) {
      let mp = m + part;
      if (mp > 4) part -= (mp - 4);
      const sh = 8 - 2 * m - part - (hasPair ? 1 : 0);
      if (sh < best) best = sh;
      return;
    }
    if (t[i] >= 3) { t[i] -= 3; dec(i, m + 1, part, hasPair); t[i] += 3; }
    if (chow && i < 27 && suitPos(i) <= 6 && allowed(i + 1) && allowed(i + 2) && t[i + 1] > 0 && t[i + 2] > 0) {
      t[i]--; t[i + 1]--; t[i + 2]--; dec(i, m + 1, part, hasPair); t[i]++; t[i + 1]++; t[i + 2]++;
    }
    if (t[i] >= 2) {
      if (!hasPair) { t[i] -= 2; dec(i, m, part, true); t[i] += 2; }
      t[i] -= 2; dec(i, m, part + 1, hasPair); t[i] += 2;
    }
    if (chow && i < 27 && suitPos(i) <= 7 && allowed(i + 1) && t[i + 1] > 0) {
      t[i]--; t[i + 1]--; dec(i, m, part + 1, hasPair); t[i]++; t[i + 1]++;
    }
    if (chow && i < 27 && suitPos(i) <= 6 && allowed(i + 2) && t[i + 2] > 0) {
      t[i]--; t[i + 2]--; dec(i, m, part + 1, hasPair); t[i]++; t[i + 2]++;
    }
    t[i]--; dec(i, m, part, hasPair); t[i]++;
  }

  dec(0, 0, 0, false);
  return best;
}

/** Tile acceptance toward a constrained target (see shantenConstrained). */
function ukeireConstrained(counts, opts, seen) {
  const base = shantenConstrained(counts, opts);
  const visible = seen || counts;
  const tiles = [];
  let total = 0;
  for (let i = 0; i < NUM_TYPES; i++) {
    if (counts[i] >= 4) continue;
    counts[i]++;
    const after = shantenConstrained(counts, opts);
    counts[i]--;
    if (after < base) {
      const rem = Math.max(0, 4 - visible[i]);
      if (rem > 0) { tiles.push({ index: i, remaining: rem }); total += rem; }
    }
  }
  return { shanten: base, tiles, total };
}

/**
 * Winning tiles for a 13-tile tenpai hand: every tile type that completes it.
 * Returns an array of tile indices (empty if the hand is not tenpai).
 */
function waits(counts) {
  const res = [];
  for (let i = 0; i < NUM_TYPES; i++) {
    if (counts[i] >= 4) continue;
    counts[i]++;
    if (shanten(counts) === -1) res.push(i);
    counts[i]--;
  }
  return res;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { shanten, ukeire, bestDiscards, waits, isComplete, shantenConstrained, ukeireConstrained, totalTiles, NUM_TYPES };
}

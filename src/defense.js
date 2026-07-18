/*
 * Singapore Mahjong Tutor — defensive safety logic (Module 4).
 *
 * Classifies a candidate discard against one opponent, given that opponent's
 * discard river (genbutsu) and — for grading/reveal only — their true wait.
 *
 *   genbutsu : the tile is in the opponent's discards → furiten makes it a
 *              100% safe discard against that opponent.
 *   suji     : a number tile whose ryanmen (two-sided) waits are ruled out
 *              because the connecting tile(s) are in the river. Safer, but NOT
 *              guaranteed — tanki/shanpon/kanchan waits can still hit it.
 *   dealin   : the tile is one of the opponent's actual winning tiles.
 *   live     : none of the above — unknown danger.
 */

// A middle tile's two-sided (ryanmen) waits come in suji pairs (differ by 3).
// A tile is suji-safe from ryanmen when the connecting tile(s) are discarded.
function sujiSafe(value, discarded /* Set of values 1..9 in the same suit */) {
  const has = (v) => discarded.has(v);
  switch (value) {
    case 1: return has(4);
    case 2: return has(5);
    case 3: return has(6);
    case 7: return has(4);
    case 8: return has(5);
    case 9: return has(6);
    case 4: return has(1) && has(7);
    case 5: return has(2) && has(8);
    case 6: return has(3) && has(9);
    default: return false; // honours have no suji
  }
}

// River values grouped by suit (index 0=m,1=p,2=s), each a Set of 1..9.
function riverValuesBySuit(river) {
  const suits = [new Set(), new Set(), new Set()];
  for (const i of river) if (i < 27) suits[Math.floor(i / 9)].add((i % 9) + 1);
  return suits;
}

// Priority: genbutsu > dealin > suji > live. `waitSet`/`riverSet` are Sets of indices.
function classify(i, waitSet, riverSet, suitVals) {
  if (riverSet.has(i)) return 'genbutsu';
  if (waitSet.has(i)) return 'dealin';
  if (i < 27 && sujiSafe((i % 9) + 1, suitVals[Math.floor(i / 9)])) return 'suji';
  return 'live';
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { sujiSafe, riverValuesBySuit, classify };
}

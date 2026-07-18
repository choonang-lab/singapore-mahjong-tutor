const { sujiSafe, riverValuesBySuit, classify } = require('./defense');

let pass = 0, fail = 0;
function eq(label, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}  got=${JSON.stringify(got)} want=${JSON.stringify(want)}`);
  ok ? pass++ : fail++;
}
const S = (...vals) => new Set(vals);

// ---- sujiSafe ----
eq('1 suji when 4 discarded', sujiSafe(1, S(4)), true);
eq('7 suji when 4 discarded', sujiSafe(7, S(4)), true);
eq('1 not suji without 4', sujiSafe(1, S(5, 6)), false);
eq('5 needs both 2 and 8', sujiSafe(5, S(2)), false);
eq('5 suji with 2 and 8', sujiSafe(5, S(2, 8)), true);
eq('4 needs both 1 and 7', sujiSafe(4, S(1, 7)), true);
eq('4 half-suji not enough', sujiSafe(4, S(1)), false);

// ---- classify ----
// indices: man 0..8 (=1m..9m). River has 4m (idx 3). Waits = 7m (idx 6).
const river = [3];               // discarded 4m
const riverSet = new Set(river);
const waitSet = new Set([6]);    // waiting 7m
const suitVals = riverValuesBySuit(river);
eq('4m is genbutsu', classify(3, waitSet, riverSet, suitVals), 'genbutsu');
eq('7m is dealin', classify(6, waitSet, riverSet, suitVals), 'dealin');
eq('1m is suji (4m discarded)', classify(0, waitSet, riverSet, suitVals), 'suji');
eq('2m is live', classify(1, waitSet, riverSet, suitVals), 'live');
// a genbutsu tile that is also technically a wait stays genbutsu (river wins) — but by
// construction river never contains waits; check dealin beats suji instead:
eq('dealin beats suji priority', classify(6, new Set([6]), new Set(), riverValuesBySuit([3, 9])), 'dealin');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

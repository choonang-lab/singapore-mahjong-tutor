const { runRollouts, runRolloutsVsField } = require('./mc');
const { DEFAULT_RULES: R } = require('./rules');

function toCounts(str) {
  const c = new Array(34).fill(0);
  const b = { m: 0, p: 9, s: 18 }, h = { E: 27, S: 28, W: 29, N: 30, r: 31, g: 32, w: 33 };
  for (const g of str.trim().split(/\s+/)) {
    if (/[mps]$/.test(g)) { const s = g[g.length - 1]; for (const ch of g.slice(0, -1)) c[b[s] + (+ch - 1)]++; }
    else for (const ch of g) c[h[ch]]++;
  }
  return c;
}

let pass = 0, fail = 0;
function eq(label, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}  got=${JSON.stringify(got)} want=${JSON.stringify(want)}`);
  ok ? pass++ : fail++;
}

// deterministic for a fixed seed
const a = runRollouts(toCounts('123s 456s 78s 9s 2s 5s 1m 3p'), { suit: 2, honors: false }, R, 8, 500, 42);
const b = runRollouts(toCounts('123s 456s 78s 9s 2s 5s 1m 3p'), { suit: 2, honors: false }, R, 8, 500, 42);
eq('deterministic for same seed', a, b);

// evMC == winRate * meanTai
eq('evMC consistent', Math.abs(a.evMC - a.winRate * a.meanTai) < 1e-9, true);
eq('winRate in range', a.winRate >= 0 && a.winRate <= 1, true);

// a flush tenpai wins far more often than a scattered high-shanten hand
const near = runRollouts(toCounts('123s 456s 789s 99s 23s'), { suit: 2, honors: false }, R, 8, 800, 7);
const far = runRollouts(toCounts('147m 258p 369s 159m 9p'), {}, R, 8, 800, 7);
eq('tenpai/near beats far hand', near.winRate > far.winRate, true);
eq('near-flush wins some', near.winRate > 0.1, true);

// winning flushes score at least the full-flush tai
eq('flush wins are valuable (>=4 tai mean)', near.meanTai >= 4, true);

// standard error: finite, non-negative, and shrinks ~1/sqrt(N)
const small = runRollouts(toCounts('123s 456s 78s 9s 2s 5s 1m 3p'), { suit: 2, honors: false }, R, 8, 1000, 3);
const big = runRollouts(toCounts('123s 456s 78s 9s 2s 5s 1m 3p'), { suit: 2, honors: false }, R, 8, 9000, 3);
eq('evSE finite & >= 0', Number.isFinite(small.evSE) && small.evSE >= 0, true);
eq('evSE shrinks with more rollouts', big.evSE < small.evSE, true);
eq('evSE roughly halves at ~9x N', small.evSE / big.evSE > 2 && small.evSE / big.evSE < 4, true);

// ---- opponent-aware (field) model ----
const handF = toCounts('123s 456s 78s 9s 2s 5s 1m 3p');
const solo = runRollouts(handF, { suit: 2, honors: false }, R, 8, 3000, 42);
const field = runRolloutsVsField(handF, { suit: 2, honors: false }, R, 8, 3000, 42);
eq('field win rate below solo (opponents win first / deal-ins)', field.winRate < solo.winRate, true);
eq('field reports outcome breakdown', typeof field.how === 'object' && field.how.exhaust > 0, true);
eq('field records opponent wins', (field.how['opp-tsumo'] || 0) + (field.how['dealin'] || 0) > 0, true);
eq('field evSE finite', Number.isFinite(field.evSE) && field.evSE >= 0, true);
// flush is folded against harder than fastest -> fastest relatively less penalised by the field
const fSolo = runRollouts(handF, {}, R, 8, 3000, 42);
const fField = runRolloutsVsField(handF, {}, R, 8, 3000, 42);
eq('fastest loses less win-rate to the field than full flush does',
  (fSolo.winRate - fField.winRate) < (solo.winRate - field.winRate), true);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

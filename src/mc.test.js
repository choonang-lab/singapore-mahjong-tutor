const { runRollouts } = require('./mc');
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

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

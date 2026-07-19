const { runRollouts } = require('./mc');
const { analyzePlans } = require('./plan');
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

// a suit-heavy hand where flush is competitive
const hand = toCounts('123s 456s 78s 9s 2s 5s 1m 3p');   // 13 tiles, bamboo-heavy
const ctx = { seatWind: 0, roundWind: 0 };
const draws = 8, N = 800;

const OPTS = {
  fastest: {},
  fullFlush: { suit: 2, honors: false },
  halfFlush: { suit: 2, honors: true },
  allPongs: { chow: false },
};

console.log(`hand total tiles: ${hand.reduce((a, b) => a + b, 0)}`);
console.log('analytic:');
for (const p of analyzePlans(hand, ctx, R, draws)) {
  console.log(`  ${p.type.padEnd(10)} sh=${p.shanten} uke=${p.ukeire} val=${p.value} win=${(p.pWin * 100).toFixed(0)}% ev=${p.ev.toFixed(2)}`);
}

console.log(`\nMonte Carlo (N=${N}, draws=${draws}):`);
const t0 = Date.now();
for (const [type, opts] of Object.entries(OPTS)) {
  const r = runRollouts(hand, opts, R, draws, N, 12345);
  const hist = Object.entries(r.hist).sort((a, b) => a[0] - b[0]).map(([k, v]) => `${k}tai×${v}`).join(' ');
  console.log(`  ${type.padEnd(10)} win=${(r.winRate * 100).toFixed(1)}% meanTai=${r.meanTai.toFixed(2)} ev=${r.evMC.toFixed(2)}  [${hist}]`);
}
console.log(`\ntotal MC time for 4 plans × ${N}: ${Date.now() - t0}ms`);

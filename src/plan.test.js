const { analyzePlans, dominantSuit, binomAtLeast } = require('./plan');
const { DEFAULT_RULES: R } = require('./rules');

function toCounts(str) {
  const counts = new Array(34).fill(0);
  const suitBase = { m: 0, p: 9, s: 18 };
  const honorMap = { E: 27, S: 28, W: 29, N: 30, r: 31, g: 32, w: 33 };
  for (const group of str.trim().split(/\s+/)) {
    if (/[mps]$/.test(group)) {
      const suit = group[group.length - 1];
      for (const ch of group.slice(0, -1)) counts[suitBase[suit] + (+ch - 1)]++;
    } else { for (const ch of group) counts[honorMap[ch]]++; }
  }
  return counts;
}

let pass = 0, fail = 0;
function eq(label, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}  got=${JSON.stringify(got)} want=${JSON.stringify(want)}`);
  ok ? pass++ : fail++;
}
const ctx = { seatWind: 0, roundWind: 0 };

// ---- binomAtLeast ----
eq('need 0 -> 1', binomAtLeast(6, 0, 0.1), 1);
eq('need > n -> 0', binomAtLeast(3, 5, 0.5), 0);
eq('monotone in p', binomAtLeast(6, 2, 0.3) > binomAtLeast(6, 2, 0.1), true);

// ---- dominantSuit ----
eq('dominant suit is bamboo', dominantSuit(toCounts('1s 2s 3s 4s 5s 6s 7s 1m 9p')), 2);

// ---- analyzePlans ----
// a nearly-complete bamboo hand: full flush should rank at/near the top and be worth more than fastest
let plans = analyzePlans(toCounts('123s 345s 567s 99s 2s'), ctx, R, 8);
const byType = Object.fromEntries(plans.map((p) => [p.type, p]));
eq('flush hand: full flush low shanten', byType.fullFlush.shanten <= 1, true);
eq('flush hand: full flush worth >= fastest value', byType.fullFlush.value >= byType.fastest.value, true);
eq('plans sorted by EV desc', plans.every((p, i) => i === 0 || plans[i - 1].ev >= p.ev), true);

// a scattered 3-suit hand: full flush should be far, fastest closest
plans = analyzePlans(toCounts('159m 159p 159s 27m 3p'), ctx, R, 8);
const t2 = Object.fromEntries(plans.map((p) => [p.type, p]));
eq('scattered hand: fastest no worse shanten than full flush', t2.fastest.shanten <= t2.fullFlush.shanten, true);

// all-pongs hand: 3 pairs + partial pongs -> all-pongs reachable
plans = analyzePlans(toCounts('11m 22m 33p 44p 55s 6s 9m'), ctx, R, 8);
const t3 = Object.fromEntries(plans.map((p) => [p.type, p]));
eq('pairs hand: all-pongs value = allPongs tai', t3.allPongs.value >= R.allPongs, true);

// ---- discard awareness ----
// a bamboo flush hand; if the bamboo tiles it needs are already discarded, the flush's acceptance drops
const flushHand = toCounts('123s 456s 78s 9s 2s 5s 1m 3p');
const noDisc = analyzePlans(flushHand, ctx, R, 8);
const discards = new Array(34).fill(0);
[18, 19, 20, 21, 22, 23, 24, 25, 26].forEach((i) => { discards[i] = 4 - flushHand[i]; }); // kill remaining bamboo
const withDisc = analyzePlans(flushHand, ctx, R, 8, discards);
const ff0 = noDisc.find((p) => p.type === 'fullFlush');
const ff1 = withDisc.find((p) => p.type === 'fullFlush');
eq('discards reduce full-flush acceptance', ff1.ukeire < ff0.ukeire, true);
eq('discards reduce full-flush win chance', ff1.pWin <= ff0.pWin, true);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

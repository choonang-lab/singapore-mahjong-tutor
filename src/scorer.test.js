const { scoreHand } = require('./scorer');
const { DEFAULT_RULES: R } = require('./rules');

function toCounts(str) {
  const counts = new Array(34).fill(0);
  const suitBase = { m: 0, p: 9, s: 18 };
  const honorMap = { E: 27, S: 28, W: 29, N: 30, r: 31, g: 32, w: 33 };
  for (const group of str.trim().split(/\s+/)) {
    if (/[mps]$/.test(group)) {
      const suit = group[group.length - 1];
      for (const ch of group.slice(0, -1)) counts[suitBase[suit] + (+ch - 1)]++;
    } else {
      for (const ch of group) counts[honorMap[ch]]++;
    }
  }
  return counts;
}

let pass = 0, fail = 0;
function eq(label, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}  got=${JSON.stringify(got)} want=${JSON.stringify(want)}`);
  ok ? pass++ : fail++;
}
function names(res) { return res.items.map((i) => i.name.replace(/ \(.*\)| ×\d| [一-鿿]+/g, '')).sort(); }

const ctxE = { seatWind: 0, roundWind: 0, selfDraw: false }; // East seat, East round

// 1) chicken hand: 3 chows + a non-value pong + pair, mixed suits, no value
let r = scoreHand(toCounts('123m 456m 789m 111p 99s'), ctxE, R);
eq('chicken total', r.total, 0);
eq('chicken valid (minTai 0)', r.valid, true);

// 2) all pongs, mixed suits
r = scoreHand(toCounts('111m 999m 111p 999p 55s'), ctxE, R);
eq('all pongs total', r.total, R.allPongs);
eq('all pongs breakdown', names(r), ['All pongs'].sort());

// 3) big three dragons + all pongs + half flush -> capped at limit
r = scoreHand(toCounts('rrr ggg www 111m 99m'), ctxE, R);
eq('big three dragons pre-cap', r.total, R.halfFlush + R.allPongs + R.bigThreeDragons);
eq('big three dragons capped', r.capped, R.limit);
eq('big three breakdown', names(r), ['All pongs', 'Big three dragons', 'Half flush'].sort());

// 4) seat + round wind pong (East seat & round)
r = scoreHand(toCounts('EEE 123m 456m 789m 99p'), ctxE, R);
eq('seat+round wind total', r.total, R.seatWind + R.roundWind);
eq('seat+round breakdown', names(r), ['Round wind pong', 'Seat wind pong'].sort());

// 5) full flush + ping hu + self-draw -> capped
r = scoreHand(toCounts('123s 234s 345s 456s 99s'), { seatWind: 0, roundWind: 0, selfDraw: true }, R);
eq('flush+pinghu+zimo pre-cap', r.total, R.fullFlush + R.pinghu + R.zimo);
eq('flush+pinghu+zimo capped', r.capped, R.limit);
eq('flush+pinghu breakdown', names(r), ['Full flush', 'Ping hu', 'Self-draw'].sort());

// 6) ping hu should NOT count when pair is a value tile (dragon pair)
r = scoreHand(toCounts('123m 456m 789m 123p rr'), ctxE, R);
eq('no pinghu with dragon pair', names(r).includes('Ping hu'), false);

// 7) not a winning hand
r = scoreHand(toCounts('123m 456m 789m 123p 5s'), ctxE, R); // 13 tiles, no pair complete
eq('incomplete hand isWin', r.isWin, false);

// 8) half flush (one suit + honors) with all pongs
r = scoreHand(toCounts('111m 999m EEE rrr 55m'), ctxE, R);
eq('half flush + all pongs total', r.total,
  R.halfFlush + R.allPongs + R.seatWind + R.roundWind + R.dragon);
eq('half flush breakdown', names(r),
  ['All pongs', 'Dragon pong', 'Half flush', 'Round wind pong', 'Seat wind pong'].sort());

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

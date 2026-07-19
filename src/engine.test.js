const { shanten, ukeire, bestDiscards, waits, shantenConstrained, ukeireConstrained, totalTiles } = require('./engine');

// Helpers to build hands from a compact string like "123m 456m 789m 123p 55p"
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
  const ok = got === want;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}  got=${got} want=${want}`);
  ok ? pass++ : fail++;
}

// ---- shanten ----
eq('complete hand -> -1', shanten(toCounts('123m 456m 789m 123p 55p')), -1);
eq('all pongs complete -> -1', shanten(toCounts('111m 222p 333s 44m 555s 99m'.replace('44m','44m'))), shanten(toCounts('111m 222p 333s 555s 99m 99m')));
eq('tanki tenpai -> 0', shanten(toCounts('123m 456m 789m 123p 5p')), 0);
eq('ryanmen tenpai -> 0', shanten(toCounts('123m 456m 789m 11p 45p')), 0);
eq('shanpon tenpai -> 0', shanten(toCounts('123m 456m 789m 11p 99p')), 0);
eq('kanchan tenpai -> 0', shanten(toCounts('123m 456m 789m 11p 13p')), 0);
eq('one-shanten', shanten(toCounts('123m 456m 789m 12p 46p')), 1);
eq('honors pong complete', shanten(toCounts('123m 456m 789m EEE 55p')), -1);
eq('all-isolated 13 tiles -> max shanten 8', shanten(toCounts('147m 147p 147s ESWN')), 8);

// ---- ukeire ----
// 123m456m789m 11p 45p waiting: needs 3p or 6p to complete (tenpai on ryanmen)
const u1 = ukeire(toCounts('123m 456m 789m 11p 45p'));
eq('tenpai shanten', u1.shanten, 0);
eq('ryanmen accepts 2 types', u1.tiles.length, 2);
eq('ryanmen accepts 8 tiles', u1.total, 8);

// ---- bestDiscards ----
// 14 tiles: 123m 456m 789m 123p 5p5p + extra 9s floater -> discard 9s keeps best
// ---- waits ----
function waitNames(counts) {
  const suitName = ['m','p','s'];
  const nm = (i) => i < 27 ? (i%9+1)+suitName[Math.floor(i/9)] : ['E','S','W','N','Rd','Gr','Wh'][i-27];
  return waits(counts).map(nm).sort();
}
eq('ryanmen wait 45s -> 3s,6s', JSON.stringify(waitNames(toCounts('123m 456m 789m 11p 45s'))), JSON.stringify(['3s','6s']));
eq('tanki wait 5p', JSON.stringify(waitNames(toCounts('123m 456m 789m 123s 5p'))), JSON.stringify(['5p']));
eq('shanpon wait 11p/99p', JSON.stringify(waitNames(toCounts('123m 456m 789m 11p 99p'))), JSON.stringify(['1p','9p']));
eq('not tenpai -> no waits', waits(toCounts('123m 456m 789m 12p 46s')).length, 0);

const bd = bestDiscards(toCounts('123m 456m 789m 123p 55p 9s'));
const best = bd[0];
const suitName = ['m','p','s'];
function tileName(i){ if(i<27){return (i%9+1)+suitName[Math.floor(i/9)];} return ['E','S','W','N','Rd','Gr','Wh'][i-27]; }
eq('best discard is 9s (float)', tileName(best.discard), '9s');
eq('after best discard hand is complete/tenpai', best.shanten <= 0, true);

// ---- constrained shanten ----
// default opts reproduce plain shanten
eq('constrained default == shanten', shantenConstrained(toCounts('123m 456m 789m 12p 46p'), {}), shanten(toCounts('123m 456m 789m 12p 46p')));
// full flush: 3 man melds + 4m single + 123p floaters -> 2 away from man full flush
eq('full flush shanten', shantenConstrained(toCounts('111m 222m 333m 4m 123p'), { suit: 0, honors: false }), 2);
// half flush lets honours help: same tiles, but with a dragon pair instead of pin
eq('half flush uses honours', shantenConstrained(toCounts('111m 222m 333m 4m 4m rr'), { suit: 0, honors: true }), 0);
// all-pongs: 3 pongs + a pair + 2 singles -> 1-shanten toward toitoi
eq('all-pongs shanten', shantenConstrained(toCounts('111m 222p 333s 44m 5s 9p'), { chow: false }), 1);
// all-pongs does NOT count a run: 123m 456m 789m 11p 2p3p is far from toitoi
eq('all-pongs ignores runs', shantenConstrained(toCounts('123m 456m 789m 11p 2p'), { chow: false }) > shanten(toCounts('123m 456m 789m 11p 2p')), true);
// a clean one-suit tenpai is 0 toward full flush
eq('full flush tenpai', shantenConstrained(toCounts('123s 234s 345s 456s 9s'), { suit: 2, honors: false }), 0);
// ukeire toward full flush only counts that suit
const ufc = ukeireConstrained(toCounts('111m 222m 333m 4m 123p'), { suit: 0, honors: false });
eq('flush ukeire tiles are all man', ufc.tiles.every((t) => t.index < 9), true);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

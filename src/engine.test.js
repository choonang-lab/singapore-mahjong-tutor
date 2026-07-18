const { shanten, ukeire, bestDiscards, totalTiles } = require('./engine');

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
const bd = bestDiscards(toCounts('123m 456m 789m 123p 55p 9s'));
const best = bd[0];
const suitName = ['m','p','s'];
function tileName(i){ if(i<27){return (i%9+1)+suitName[Math.floor(i/9)];} return ['E','S','W','N','Rd','Gr','Wh'][i-27]; }
eq('best discard is 9s (float)', tileName(best.discard), '9s');
eq('after best discard hand is complete/tenpai', best.shanten <= 0, true);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

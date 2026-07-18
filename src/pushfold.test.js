const { DANGER, dangerClass, winProb, cumulativeRisk, pushEV, decide } = require('./pushfold');
const { riverValuesBySuit } = require('./defense');

let pass = 0, fail = 0;
function eq(label, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}  got=${JSON.stringify(got)} want=${JSON.stringify(want)}`);
  ok ? pass++ : fail++;
}
function approx(label, got, want, tol = 1e-6) {
  const ok = Math.abs(got - want) <= tol;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}  got=${got} want≈${want}`);
  ok ? pass++ : fail++;
}

// ---- dangerClass ----  river discards 4m (idx 3)
const river = [3];
const rs = new Set(river);
const sv = riverValuesBySuit(river);
eq('4m genbutsu', dangerClass(3, rs, sv), 'genbutsu');
eq('7m suji (4 discarded)', dangerClass(6, rs, sv), 'suji');
eq('5m live-number', dangerClass(4, rs, sv), 'live-number');
eq('9m live-terminal', dangerClass(8, rs, sv), 'live-terminal');
eq('East live-honor', dangerClass(27, rs, sv), 'live-honor');

// ---- winProb ----
eq('no outs -> 0', winProb(0, 100, 6), 0);
approx('winProb basic', winProb(4, 100, 1), 0.04);
eq('more outs -> higher', winProb(8, 100, 6) > winProb(4, 100, 6), true);
eq('more chances -> higher', winProb(4, 100, 10) > winProb(4, 100, 3), true);

// ---- cumulativeRisk ----
eq('no risk stays 0', cumulativeRisk(0, 5), 0);
eq('one push = pDeal', cumulativeRisk(0.13, 1), 0.13);
approx('cumulative over 4 pushes', cumulativeRisk(0.13, 4), 1 - Math.pow(0.87, 4));
eq('more pushes -> higher', cumulativeRisk(0.13, 6) > cumulativeRisk(0.13, 3), true);

// ---- pushEV / decide ----
approx('pushEV math', pushEV(0.5, 4, 0.1, 5), 0.5 * 4 - 0.1 * 5);
eq('positive EV -> push', decide(0.5, 4, 0.1, 5).best, 'push');
eq('negative EV -> fold', decide(0.2, 2, 0.13, 5).best, 'fold');
eq('close call flagged', decide(0.13, 1, 0.02, 5).close, true);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

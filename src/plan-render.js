/* Shared plan analysis + Monte-Carlo rendering, used by the Best Plan trainer
 * (module-plan) and the Analyze screen (module-analyze). Top-level globals with
 * unique names to avoid clashes across the non-IIFE analytic scripts. */
const MC_N1 = 800, MC_N2 = 3000, MC_Z = 1.96;
const PLAN_LABELS = { fastest: 'Fastest', fullFlush: 'Full flush', halfFlush: 'Half flush', allPongs: 'All pongs' };
const PLAN_SUITTAG = ['m', 'p', 's'];
function mcHalf(r) { return MC_Z * r.evSE; }

// two-stage opponent-aware simulation for a hand (+ optional visible-elsewhere discards)
function mcTwoStage(hand, discards, rules, draws, suit) {
  const runField = (typeof runRolloutsVsField !== 'undefined') ? runRolloutsVsField : require('./mc').runRolloutsVsField;
  const specs = [
    { type: 'fastest', opts: {} },
    { type: 'fullFlush', opts: { suit, honors: false } },
    { type: 'halfFlush', opts: { suit, honors: true } },
    { type: 'allPongs', opts: { chow: false } },
  ];
  const res = {};
  for (const s of specs) res[s.type] = runField(hand, s.opts, rules, draws, MC_N1, 20240719, discards);
  const topEv = Math.max.apply(null, specs.map((s) => res[s.type].evMC));
  const leaderLow = topEv - MC_Z * Math.max.apply(null, specs.filter((s) => res[s.type].evMC === topEv).map((s) => res[s.type].evSE));
  const contenders = specs.filter((s) => res[s.type].evMC + mcHalf(res[s.type]) >= leaderLow);
  for (const s of contenders) res[s.type] = runField(hand, s.opts, rules, draws, MC_N2, 987654321, discards);
  return { res, contenders: new Set(contenders.map((c) => c.type)) };
}

// the analytic ranked table (chosenType optional — highlights the user's pick)
function planTableHTML(plans, chosenType) {
  const best = plans[0];
  let html = '<table class="plan-table"><thead><tr><th>Direction</th><th>Shanten</th><th>Accepts</th><th>≈ Value</th><th>Win%</th><th>EV</th></tr></thead><tbody>';
  for (const p of plans) {
    const cls = (p.type === best.type ? ' class="best"' : (p.type === chosenType ? ' class="chosen"' : ''));
    html += `<tr${cls}><td>${PLAN_LABELS[p.type]}${p.suit !== null ? ` <span class="suit-tag">${PLAN_SUITTAG[p.suit]}</span>` : ''}</td>` +
      `<td>${p.shanten}</td><td>${p.ukeire}</td><td>${p.value} tai</td><td>${Math.round(p.pWin * 100)}%</td><td class="ev">${p.ev.toFixed(2)}</td></tr>`;
  }
  return html + '</tbody></table>';
}

// the Monte-Carlo results block (returns an HTML string)
function mcBlockHTML(res, contenderSet, analyticBest) {
  const TYPES = ['fastest', 'fullFlush', 'halfFlush', 'allPongs'];
  const ranked = TYPES.map((t) => Object.assign({ type: t }, res[t])).sort((a, b) => b.evMC - a.evMC);
  const top = ranked[0];
  const leaders = ranked.filter((r) => (top.evMC - r.evMC) <= MC_Z * Math.sqrt(top.evSE ** 2 + r.evSE ** 2));
  const leaderSet = new Set(leaders.map((l) => l.type));
  const clear = leaders.length === 1;

  let html = '<div class="mc-block"><div class="mc-head">Monte Carlo · vs 3 opponents <span>— win rate, value spread &amp; 95% interval</span></div><div class="mc-rows">';
  for (const r of ranked) {
    html += `<div class="mc-row${leaderSet.has(r.type) ? ' best' : ''}">` +
      `<span class="mc-dir">${PLAN_LABELS[r.type]}</span>` +
      `<span class="mc-num">${Math.round(r.winRate * 100)}% win</span>` +
      `<span class="mc-num">${r.meanTai.toFixed(1)} avg tai</span>` +
      `<span class="mc-num ev">EV ${r.evMC.toFixed(2)} <span class="mc-ci">±${mcHalf(r).toFixed(2)}</span></span></div>`;
  }
  html += '</div>';

  const hist = top.hist, keys = Object.keys(hist).map(Number).sort((a, b) => a - b);
  if (keys.length) {
    const max = Math.max.apply(null, keys.map((k) => hist[k]));
    html += `<div class="mc-hist"><div class="mc-hist-label">Tai when ${PLAN_LABELS[top.type]} wins:</div>`;
    for (const k of keys) {
      html += `<div class="hbar"><span class="hbar-k">${k} tai</span>` +
        `<span class="hbar-track"><span class="hbar-fill" style="width:${(hist[k] / max) * 100}%"></span></span>` +
        `<span class="hbar-n">${hist[k]}</span></div>`;
    }
    html += '</div>';
  }

  const how = top.how || {};
  const pc = (k) => Math.round(((how[k] || 0) / top.n) * 100);
  html += `<div class="mc-outcome">When <strong>${PLAN_LABELS[top.type]}</strong> doesn't win: ` +
    `<span class="oc">${pc('opp-tsumo')}% opponent wins first</span> · ` +
    `<span class="oc">${pc('dealin')}% you deal in</span> · ` +
    `<span class="oc">${pc('exhaust')}% washes out</span>.</div>`;

  let verdict;
  const flipToSpeed = clear && top.type === 'fastest' && analyticBest !== 'fastest';
  if (clear) {
    if (flipToSpeed) verdict = `With opponents in the picture, <strong>Fastest</strong> wins — the analytic pick <strong>${PLAN_LABELS[analyticBest]}</strong> is too slow (opponents complete first) and too easily read (they fold against it). Speed beats the big hand here.`;
    else if (top.type === analyticBest) verdict = `Monte Carlo recommends <strong>${PLAN_LABELS[top.type]}</strong>, clear of the field — and it agrees with the analytic pick even once opponents are modelled.`;
    else verdict = `Monte Carlo recommends <strong>${PLAN_LABELS[top.type]}</strong>, clear of the field (the analytic pick was <strong>${PLAN_LABELS[analyticBest]}</strong>, which ignores opponents).`;
  } else {
    const names = leaders.map((l) => `<strong>${PLAN_LABELS[l.type]}</strong>`).join(', ');
    verdict = `<strong>Too close to call.</strong> ${names} are within the simulation's margin of error — any is a fine choice; let defense and what your opponents are showing decide.`;
  }
  html += `<div class="row note">${verdict}</div>`;
  html += `<div class="row note method">Screened at ${MC_N1.toLocaleString()} rollouts, contenders refined to ${MC_N2.toLocaleString()}, each vs 3 opponents who develop, win first, and fold against obvious threats. <strong>±</strong> is the 95% interval. The opponent model is informed, not calibrated — trust the comparison, not the decimals.</div></div>`;
  return html;
}

if (typeof module !== 'undefined' && module.exports) module.exports = { mcTwoStage, mcBlockHTML, planTableHTML, PLAN_LABELS };

/* Module 6 — Best Plan trainer.
 * Depends on globals: shanten (engine.js); analyzePlans (plan.js); loadRules (rules.js).
 * IIFE-wrapped to avoid global collisions. */
(function () {
  const $ = (id) => document.getElementById(id);

  function glyph(i) {
    if (i < 9)  return String.fromCodePoint(0x1F007 + i);
    if (i < 18) return String.fromCodePoint(0x1F019 + (i - 9));
    if (i < 27) return String.fromCodePoint(0x1F010 + (i - 18));
    return String.fromCodePoint([0x1F000, 0x1F001, 0x1F002, 0x1F003, 0x1F004, 0x1F005, 0x1F006][i - 27]);
  }
  function tileClass(i) { return i === 31 ? 'dragon-red' : i === 32 ? 'dragon-green' : ''; }
  const randInt = (n) => Math.floor(Math.random() * n);
  const CTX = { seatWind: 0, roundWind: 0 };
  const DRAWS = { easy: 11, medium: 8, hard: 5 };
  const LABELS = { fastest: 'Fastest', fullFlush: 'Full flush', halfFlush: 'Half flush', allPongs: 'All pongs' };

  // ---- state ----
  let hand = null, plans = null, draws = 8, answered = false, streak = 0;
  const STATS_KEY = 'sgmj-plan-stats-v1';
  const fresh = () => ({ played: 0, correct: 0, bestStreak: 0 });
  const load = () => { try { return Object.assign(fresh(), JSON.parse(localStorage.getItem(STATS_KEY)) || {}); } catch { return fresh(); } };
  const save = () => { try { localStorage.setItem(STATS_KEY, JSON.stringify(stats)); } catch { /* ignore */ } };
  let stats = load();

  function genHand(rules) {
    for (let a = 0; a < 600; a++) {
      const theme = randInt(3);
      const counts = new Array(34).fill(0);
      let n = 0;
      while (n < 13) {
        const t = Math.random() < 0.72 ? theme * 9 + randInt(9) : randInt(34);
        if (counts[t] >= 4) continue;
        counts[t]++; n++;
      }
      if (shanten(counts) < 0) continue;
      const p = analyzePlans(counts, CTX, rules, draws);
      const byType = Object.fromEntries(p.map((x) => [x.type, x]));
      const fast = byType.fastest.shanten;
      const flush = Math.min(byType.fullFlush.shanten, byType.halfFlush.shanten);
      // keep it a genuine decision: hand not too far, and a value direction is competitive
      if (fast < 1 || fast > 3) continue;
      if (flush > fast + 2) continue;
      return { counts, plans: p };
    }
    return null;
  }

  function newDeal() {
    const rules = loadRules();
    draws = DRAWS[$('pl-difficulty').value] || 8;
    let g = null;
    for (let i = 0; i < 6 && !g; i++) g = genHand(rules);
    if (!g) return;
    hand = g.counts; plans = g.plans; answered = false;
    render();
  }

  // ---- rendering ----
  function handList(counts) { const l = []; for (let i = 0; i < 34; i++) for (let x = 0; x < counts[i]; x++) l.push(i); return l; }

  function render() {
    $('pl-context').innerHTML = `<span class="chip">≈ <strong>${draws}</strong> draws left this hand</span>`;
    const handEl = $('pl-hand');
    handEl.innerHTML = '';
    handList(hand).forEach((i) => {
      const t = document.createElement('div');
      t.className = `tile ${tileClass(i)}`.trim();
      t.textContent = glyph(i);
      handEl.appendChild(t);
    });

    const box = $('pl-choices');
    box.innerHTML = '';
    ['fastest', 'fullFlush', 'halfFlush', 'allPongs'].forEach((type) => {
      const b = document.createElement('button');
      b.className = 'plan-btn';
      b.textContent = LABELS[type];
      b.dataset.type = type;
      b.addEventListener('click', () => onChoose(type, b));
      box.appendChild(b);
    });
    $('pl-feedback').hidden = true;
    renderSession();
  }

  function renderSession() {
    if (stats.played === 0) { $('pl-session').textContent = 'No hands played yet this session.'; return; }
    const pct = Math.round((stats.correct / stats.played) * 100);
    $('pl-session').innerHTML = `<strong>${pct}%</strong> right over ${stats.played} · streak <strong>${streak}</strong> · best <strong>${stats.bestStreak}</strong>`;
  }

  function onChoose(type, btn) {
    if (answered) return;
    answered = true;
    const best = plans[0];
    const chosen = plans.find((p) => p.type === type);
    // credit an exact tie on EV as correct too
    const correct = Math.abs(chosen.ev - best.ev) < 1e-9;

    stats.played++;
    if (correct) { stats.correct++; streak++; stats.bestStreak = Math.max(stats.bestStreak, streak); }
    else streak = 0;
    save();

    document.querySelectorAll('.plan-btn').forEach((b) => {
      b.classList.add('locked');
      if (b.dataset.type === best.type) b.classList.add('is-best');
    });
    if (!correct) btn.classList.add('wrong');

    renderFeedback(chosen, best, correct);
    renderSession();
  }

  function pctStr(p) { return `${Math.round(p * 100)}%`; }

  function renderFeedback(chosen, best, correct) {
    const fb = $('pl-feedback');
    fb.hidden = false;
    fb.className = 'feedback ' + (correct ? 'good' : 'bad');

    let html = `<h3>${correct ? '✓' : '✗'} Best direction: <strong>${LABELS[best.type]}</strong>${best.suit !== null ? ` (${['Characters', 'Circles', 'Bamboo'][best.suit]})` : ''}</h3>`;
    html += `<table class="plan-table"><thead><tr><th>Direction</th><th>Shanten</th><th>Accepts</th><th>≈ Value</th><th>Win%</th><th>EV</th></tr></thead><tbody>`;
    for (const p of plans) {
      const cls = (p.type === best.type ? ' class="best"' : (p.type === chosen.type ? ' class="chosen"' : ''));
      html += `<tr${cls}><td>${LABELS[p.type]}${p.suit !== null ? ` <span class="suit-tag">${['m', 'p', 's'][p.suit]}</span>` : ''}</td>` +
        `<td>${p.shanten}</td><td>${p.ukeire}</td><td>${p.value} tai</td><td>${pctStr(p.pWin)}</td><td class="ev">${p.ev.toFixed(2)}</td></tr>`;
    }
    html += `</tbody></table>`;
    html += `<div class="row note">EV ≈ win-chance × value. Win-chance comes from shanten &amp; acceptance over ~${draws} draws; value is the plan's characteristic tai plus honours you already hold. This is the analytic estimate — run the simulation below to sharpen it.</div>`;
    html += `<button id="pl-mc-btn" class="mc-run" type="button">▶ Run Monte Carlo — real win rates &amp; tai spread</button><div id="pl-mc"></div>`;
    fb.innerHTML = html;
    $('pl-mc-btn').addEventListener('click', runMC);
  }

  // ---- Monte Carlo (tier 3): fast enough (~150ms) to run inline on the main thread ----
  const N_SCREEN = 1500;    // cheap first pass over all four directions
  const N_REFINE = 6000;    // extra samples poured into the contenders only
  const Z = 1.96;           // 95% confidence
  const half = (r) => Z * r.evSE;   // 95% interval half-width on EV

  function runMC() {
    const btn = $('pl-mc-btn');
    if (!btn || btn.disabled) return;
    btn.disabled = true; btn.textContent = 'Simulating…';
    setTimeout(() => {
      const rules = loadRules();
      const suit = (plans.find((p) => p.suit != null) || {}).suit ?? 0;
      const specs = [
        { type: 'fastest', opts: {} },
        { type: 'fullFlush', opts: { suit, honors: false } },
        { type: 'halfFlush', opts: { suit, honors: true } },
        { type: 'allPongs', opts: { chow: false } },
      ];
      // stage 1 — screen all directions cheaply
      const res = {};
      for (const s of specs) res[s.type] = runRollouts(hand, s.opts, rules, draws, N_SCREEN, 20240719);
      // contenders = anything whose 95% interval reaches the leader's lower bound
      const topEv = Math.max(...specs.map((s) => res[s.type].evMC));
      const leaderLow = topEv - Z * Math.max(...specs.filter((s) => res[s.type].evMC === topEv).map((s) => res[s.type].evSE));
      const contenders = specs.filter((s) => res[s.type].evMC + half(res[s.type]) >= leaderLow);
      // stage 2 — refine only the contenders with more samples
      for (const s of contenders) res[s.type] = runRollouts(hand, s.opts, rules, draws, N_REFINE, 987654321);
      renderMC(res, specs, new Set(contenders.map((c) => c.type)));
    }, 20);
  }

  function renderMC(res, specs, contenderTypes) {
    const ranked = specs.map((s) => ({ type: s.type, ...res[s.type] })).sort((a, b) => b.evMC - a.evMC);
    const top = ranked[0];
    const analyticBest = plans[0].type;
    // co-leaders: not statistically distinguishable from the top (diff within 95% CI of the difference)
    const leaders = ranked.filter((r) => (top.evMC - r.evMC) <= Z * Math.sqrt(top.evSE ** 2 + r.evSE ** 2));
    const leaderSet = new Set(leaders.map((l) => l.type));
    const clear = leaders.length === 1;

    let html = `<div class="mc-block"><div class="mc-head">Monte Carlo <span>— real win rate, value spread &amp; 95% interval</span></div><div class="mc-rows">`;
    for (const r of ranked) {
      html += `<div class="mc-row${leaderSet.has(r.type) ? ' best' : ''}">` +
        `<span class="mc-dir">${LABELS[r.type]}</span>` +
        `<span class="mc-num">${Math.round(r.winRate * 100)}% win</span>` +
        `<span class="mc-num">${r.meanTai.toFixed(1)} avg tai</span>` +
        `<span class="mc-num ev">EV ${r.evMC.toFixed(2)} <span class="mc-ci">±${half(r).toFixed(2)}</span></span></div>`;
    }
    html += `</div>`;

    // tai histogram for the top direction
    const hist = top.hist;
    const keys = Object.keys(hist).map(Number).sort((a, b) => a - b);
    if (keys.length) {
      const max = Math.max(...keys.map((k) => hist[k]));
      html += `<div class="mc-hist"><div class="mc-hist-label">Tai when ${LABELS[top.type]} wins:</div>`;
      for (const k of keys) {
        html += `<div class="hbar"><span class="hbar-k">${k} tai</span>` +
          `<span class="hbar-track"><span class="hbar-fill" style="width:${(hist[k] / max) * 100}%"></span></span>` +
          `<span class="hbar-n">${hist[k]}</span></div>`;
      }
      html += `</div>`;
    }

    // verdict
    let verdict;
    if (clear) {
      verdict = top.type === analyticBest
        ? `Monte Carlo recommends <strong>${LABELS[top.type]}</strong>, clear of the field — and it agrees with the analytic pick.`
        : `Monte Carlo recommends <strong>${LABELS[top.type]}</strong>, clear of the field (the analytic pick was <strong>${LABELS[analyticBest]}</strong> — that model overrates wide-but-cheap hands).`;
    } else {
      const names = leaders.map((l) => `<strong>${LABELS[l.type]}</strong>`).join(', ');
      verdict = `<strong>Too close to call.</strong> ${names} are within the simulation's margin of error — any is a fine choice here; let defense and what your opponents are showing decide.`;
    }
    html += `<div class="row note">${verdict}</div>`;
    html += `<div class="row note method">Screened 4 directions at ${N_SCREEN.toLocaleString()} rollouts, refined the contenders to ${N_REFINE.toLocaleString()}. <strong>±</strong> is the 95% interval; overlapping intervals can't be separated. Absolute rates are optimistic (no opponents modelled) — trust the comparison, not the decimals.</div></div>`;

    $('pl-mc').innerHTML = html;
    const btn = $('pl-mc-btn');
    if (btn) btn.textContent = '✓ Simulated';
  }

  function resetStats() { stats = fresh(); streak = 0; save(); renderSession(); }

  // ---- wire up ----
  $('pl-newDeal').addEventListener('click', newDeal);
  $('pl-difficulty').addEventListener('change', newDeal);
  $('pl-reset').addEventListener('click', resetStats);

  document.addEventListener('keydown', (e) => {
    if ($('module-plan').hidden) return;
    if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT') return;
    if (e.key === 'n' || e.key === 'N') newDeal();
    else if ((e.key === 'Enter' || e.key === ' ') && answered) { e.preventDefault(); newDeal(); }
  });

  window.__planRefresh = newDeal;
  newDeal();
})();
